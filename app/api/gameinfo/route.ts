import { type NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

const API_KEY  = process.env.APIFOOTBALL_KEY ?? '';
const BASE_URL = 'https://v3.football.api-sports.io';

const cache = new Map<string, { data: unknown; ts: number }>();

async function fetchAPI(endpoint: string, ttl = 30_000) {
  const cached = cache.get(endpoint);
  if (cached && Date.now() - cached.ts < ttl) return cached.data;

  try {
    const res = await fetch(BASE_URL + endpoint, {
      headers: { 'x-apisports-key': API_KEY },
    });

    if (!res.ok) {
      console.warn('[API ERROR]', endpoint, res.status);
      return null; // 🔥 EI kaaduta
    }

    const data = await res.json();

    if (data?.errors) {
      console.warn('[API QUOTA]', data.errors);
      return null;
    }

    cache.set(endpoint, { data, ts: Date.now() });
    return data;

  } catch (err) {
    console.error('[FETCH FAIL]', endpoint, err);
    return null;
  }
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

    const [fxData, lineupData] = await Promise.all([
      fetchAPI(`/fixtures?id=${fixtureId}`, 20_000),
      fetchAPI(`/fixtures/lineups?fixture=${fixtureId}`, 60_000),
    ]);

    const fx = fxData?.response?.[0];

    // 🔥 jos API failaa → ei crash
    if (!fx) {
      return Response.json({
        fixture: {
  venue: null,
  city: null,
  referee: null,
  statusShort: 'NS',
  homeScore: null,
  awayScore: null,
  home: '',
  away: '',
  homeLogo: '',
  awayLogo: '',
  league: '',
},
        lineups: [],
        finnishPlayers: rows.map((r) => r.name),
      }, { status: 200 });
    }

    const lineups = (lineupData?.response ?? []).map((team: any) => {
      const markFinnish = (players: any[]) =>
        players.map((p) => ({
          number: p.player.number,
          name:   p.player.name,
          pos:    p.player.pos,
          isFinnish: [...finnishNames].some((fn) => {
            const pLow = p.player.name.toLowerCase();
            return fn.split(' ').some((part: string) => part.length >= 3 && pLow.includes(part)) ||
                   pLow.split(' ').some((part: string) => part.length >= 3 && fn.includes(part));
          }),
        }));

      return {
        team:        team.team.name,
        logo:        team.team.logo,
        formation:   team.formation,
        startXI:     markFinnish(team.startXI ?? []),
        substitutes: markFinnish(team.substitutes ?? []),
      };
    });

    return Response.json({
      fixture: {
        id:          fx.fixture.id,
        date:        fx.fixture.date,
        venue:       fx.fixture.venue?.name ?? null,
        city:        fx.fixture.venue?.city ?? null,
        referee:     fx.fixture.referee ?? null,
        statusShort: fx.fixture.status.short,
        elapsed:     fx.fixture.status.elapsed,
        homeScore:   fx.goals.home,
        awayScore:   fx.goals.away,
        home:        fx.teams.home.name,
        away:        fx.teams.away.name,
        homeLogo:    fx.teams.home.logo,
        awayLogo:    fx.teams.away.logo,
        league:      fx.league.name,
        country:     fx.league.country,
      },
      lineups,
      finnishPlayers: rows.map((r) => r.name),
    });

  } catch (err) {
    console.error('[LIVE API ERROR]', err);

    // 🔥 EI koskaan 500
    return Response.json({
      fixture: {
  venue: null,
  city: null,
  referee: null,
  statusShort: 'NS',
  homeScore: null,
  awayScore: null,
  home: '',
  away: '',
  homeLogo: '',
  awayLogo: '',
  league: '',
},
      lineups: [],
      finnishPlayers: [],
    }, { status: 200 });
  }
}