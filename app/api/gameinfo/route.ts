import { type NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

const API_KEY  = process.env.APIFOOTBALL_KEY ?? 'YOUR_KEY';
const BASE_URL = 'https://v3.football.api-sports.io';

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE']);
const DONE_STATUSES = new Set(['FT', 'AET', 'PEN', 'AWD', 'WO']);

function normalizeName(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

async function fetchAPI(endpoint: string, revalidate: number | false = 30) {
  try {
    const res = await fetch(BASE_URL + endpoint, {
      headers: { 'x-apisports-key': API_KEY },
      ...(revalidate === false
        ? { cache: 'no-store' }
        : { next: { revalidate } }),
    });

    if (!res.ok) {
      console.warn('[API ERROR]', endpoint, res.status);
      return null;
    }

    const data = await res.json();

    if (data?.errors && Object.keys(data.errors).length > 0) {
      console.warn('[API QUOTA]', data.errors);
      return null;
    }

    return data;

  } catch (err) {
    console.error('[FETCH FAIL]', endpoint, err);
    return null;
  }
}

function countryFlag(nationality: string): string {
  const map: Record<string, string> = {
    'Finland': '🇫🇮',
  };
  return map[nationality] ?? '';
}

export async function GET(request: NextRequest) {
  const sql = getDb();
  const fixtureId = request.nextUrl.searchParams.get('fixture_id');

  if (!fixtureId) {
    return Response.json({ error: 'fixture_id puuttuu' }, { status: 400 });
  }

  try {
    const rows = await sql`
      SELECT p.name, p.team
      FROM players p
      JOIN fixture_players fp ON p.id = fp.player_id
      JOIN fixtures f ON fp.fixture_id = f.id
      WHERE f.api_fixture_id = ${parseInt(fixtureId)}
    `;

    const finnishNames = new Set(rows.map((r) => r.name.toLowerCase()));

    // FIXTURE
    const fxData = await fetchAPI(`/fixtures?id=${fixtureId}`, false);
    const fx = fxData?.response?.[0];

    if (!fx) {
      return Response.json({
        fixture: {},
        lineups: [],
        squads: [],
        scorers: { home: [], away: [] },
        finnishPlayers: rows.map((r) => r.name),
      }, { status: 200 });
    }

    const statusShort = fx.fixture.status.short;
    const isLive = LIVE_STATUSES.has(statusShort);
    const isDone = DONE_STATUSES.has(statusShort);
    const isUpcoming = !isLive && !isDone;

    // 🔥 EVENTS → MAALIT
    const eventsData = await fetchAPI(`/fixtures/events?fixture=${fixtureId}`, false);

    const goalEvents = (eventsData?.response ?? []).filter(
      (e: any) => e.type === 'Goal'
    );

    const isFinnishPlayer = (name: string) => {
      const pNorm = normalizeName(name);
      return [...finnishNames].some((fn) => {
        const fnNorm = normalizeName(fn);
        // Vertaa sukunimiä: API palauttaa usein "D. Hakans" kun DB:ssä "Daniel Håkans"
        const pLast = pNorm.split(' ').at(-1) ?? '';
        const fnLast = fnNorm.split(' ').at(-1) ?? '';
        if (pLast.length >= 3 && fnLast.length >= 3 && pLast === fnLast) return true;
        // Laajempi osuma: joku osa nimestä löytyy toisesta
        return (
          fnNorm.split(' ').some((part) => part.length >= 3 && pNorm.includes(part)) ||
          pNorm.split(' ').some((part) => part.length >= 3 && fnNorm.includes(part))
        );
      });
    };

    const scorers = {
      home: [] as any[],
      away: [] as any[],
    };

    goalEvents.forEach((e: any) => {
      const name = e.player?.name ?? 'Unknown';
      const teamId = e.team?.id;

      const scorer = {
        name,
        minute: e.time?.elapsed,
        extra: e.time?.extra,
        isFinnish: isFinnishPlayer(name),
        isPenalty: e.detail === 'Penalty',
        isOwnGoal: e.detail === 'Own Goal',
      };

      if (teamId === fx.teams.home.id) {
        scorers.home.push(scorer);
      } else {
        scorers.away.push(scorer);
      }
    });

    // LINEUPS
    const lineupData = await fetchAPI(`/fixtures/lineups?fixture=${fixtureId}`, isLive ? false : 60);

    const lineups = (lineupData?.response ?? []).map((team: any) => {
      const markFinnish = (players: any[]) =>
        players.map((p) => ({
          number: p.player.number,
          name:   p.player.name,
          pos:    p.player.pos,
          isFinnish: isFinnishPlayer(p.player.name),
        }));

      return {
        team:        team.team.name,
        logo:        team.team.logo,
        formation:   team.formation,
        startXI:     markFinnish(team.startXI ?? []),
        substitutes: markFinnish(team.substitutes ?? []),
      };
    });

    // SQUADS fallback
    let squads: any[] = [];
    if (lineups.length === 0 && isUpcoming) {
      const [homeSquadData, awaySquadData] = await Promise.all([
        fetchAPI(`/players/squads?team=${fx.teams.home.id}`, 3600),
        fetchAPI(`/players/squads?team=${fx.teams.away.id}`, 3600),
      ]);

      const formatSquad = (data: any, teamName: string, logo: string) => ({
        team: teamName,
        logo,
        players: (data?.response?.[0]?.players ?? []).map((p: any) => ({
          number: p.number ?? null,
          name: p.name,
          pos: p.position ?? null,
          nationality: p.nationality ?? null,
          flag: countryFlag(p.nationality ?? ''),
          isFinnish: isFinnishPlayer(p.name),
        })),
      });

      squads = [
        formatSquad(homeSquadData, fx.teams.home.name, fx.teams.home.logo),
        formatSquad(awaySquadData, fx.teams.away.name, fx.teams.away.logo),
      ];
    }

    const cc = isLive ? 'no-store' : 's-maxage=30, stale-while-revalidate=10';

    return Response.json({
      fixture: {
        id: fx.fixture.id,
        date: fx.fixture.date,
        venue: fx.fixture.venue?.name ?? null,
        city: fx.fixture.venue?.city ?? null,
        referee: fx.fixture.referee ?? null,
        statusShort,
        elapsed: fx.fixture.status.elapsed,
        homeScore: fx.goals.home,
        awayScore: fx.goals.away,
        home: fx.teams.home.name,
        away: fx.teams.away.name,
        homeLogo: fx.teams.home.logo,
        awayLogo: fx.teams.away.logo,
        league: fx.league.name,
        country: fx.league.country,
      },
      lineups,
      squads,
      scorers, // 👈 TÄRKEIN LISÄYS
      finnishPlayers: rows.map((r) => r.name),
    }, {
      headers: { 'Cache-Control': cc },
    });

  } catch (err) {
    console.error('[LIVE API ERROR]', err);
    return Response.json({
      fixture: {},
      lineups: [],
      squads: [],
      scorers: { home: [], away: [] },
      finnishPlayers: [],
    }, { status: 200 });
  }
}