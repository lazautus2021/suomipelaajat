import { type NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

const API_KEY  = process.env.APIFOOTBALL_KEY ?? '';
const BASE_URL = 'https://v3.football.api-sports.io';

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE']);
const DONE_STATUSES = new Set(['FT', 'AET', 'PEN', 'AWD', 'WO']);

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

// Maa → lippu-emoji
function countryFlag(nationality: string): string {
  const map: Record<string, string> = {
    'Finland': '🇫🇮', 'Sweden': '🇸🇪', 'Norway': '🇳🇴', 'Denmark': '🇩🇰',
    'Germany': '🇩🇪', 'France': '🇫🇷', 'Spain': '🇪🇸', 'Italy': '🇮🇹',
    'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Netherlands': '🇳🇱', 'Portugal': '🇵🇹', 'Belgium': '🇧🇪',
    'Brazil': '🇧🇷', 'Argentina': '🇦🇷', 'Croatia': '🇭🇷', 'Poland': '🇵🇱',
    'Czech Republic': '🇨🇿', 'Austria': '🇦🇹', 'Switzerland': '🇨🇭',
    'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Ireland': '🇮🇪', 'Serbia': '🇷🇸',
    'Turkey': '🇹🇷', 'Greece': '🇬🇷', 'Hungary': '🇭🇺', 'Slovakia': '🇸🇰',
    'Romania': '🇷🇴', 'Ukraine': '🇺🇦', 'Russia': '🇷🇺', 'USA': '🇺🇸',
    'Canada': '🇨🇦', 'Mexico': '🇲🇽', 'Colombia': '🇨🇴', 'Uruguay': '🇺🇾',
    'Japan': '🇯🇵', 'South Korea': '🇰🇷', 'Australia': '🇦🇺', 'Morocco': '🇲🇦',
    'Nigeria': '🇳🇬', 'Senegal': '🇸🇳', 'Ghana': '🇬🇭', 'Ivory Coast': '🇨🇮',
    'Iceland': '🇮🇸', 'Estonia': '🇪🇪', 'Latvia': '🇱🇻', 'Lithuania': '🇱🇹',
    'Slovenia': '🇸🇮', 'Bulgaria': '🇧🇬', 'Albania': '🇦🇱', 'Kosovo': '🇽🇰',
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

    // Haetaan fixture-tiedot (30s cache)
    const fxData = await fetchAPI(`/fixtures?id=${fixtureId}`, 30);
    const fx = fxData?.response?.[0];

    if (!fx) {
      return Response.json({
        fixture: { venue: null, city: null, referee: null, statusShort: 'NS', homeScore: null, awayScore: null, home: '', away: '', homeLogo: '', awayLogy: '', league: '' },
        lineups: [],
        squads: [],
        finnishPlayers: rows.map((r) => r.name),
      }, { status: 200 });
    }

    const statusShort = fx.fixture.status.short;
    const isLive = LIVE_STATUSES.has(statusShort);
    const isDone = DONE_STATUSES.has(statusShort);
    const isUpcoming = !isLive && !isDone;

    // Lineup-cache: live = ei cachea, tulossa = 60s, päättynyt = 10min
    const lineupRevalidate: number | false = isLive ? false : isDone ? 600 : 60;
    const lineupData = await fetchAPI(`/fixtures/lineups?fixture=${fixtureId}`, lineupRevalidate);

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

    // Jos ei kokoonpanoja ja peli ei ole alkanut → hae joukkueen pelaajalista
    let squads: any[] = [];
    if (lineups.length === 0 && isUpcoming) {
      const homeId = fx.teams.home.id;
      const awayId = fx.teams.away.id;

      const [homeSquadData, awaySquadData] = await Promise.all([
        fetchAPI(`/players/squads?team=${homeId}`, 3600),  // 1h cache
        fetchAPI(`/players/squads?team=${awayId}`, 3600),
      ]);

      const formatSquad = (squadData: any, teamName: string, teamLogo: string) => {
        const players = squadData?.response?.[0]?.players ?? [];
        return {
          team: teamName,
          logo: teamLogo,
          players: players.map((p: any) => {
            const nameLow = p.name.toLowerCase();
            const isFinnish = [...finnishNames].some((fn) =>
              fn.split(' ').some((part: string) => part.length >= 3 && nameLow.includes(part)) ||
              nameLow.split(' ').some((part: string) => part.length >= 3 && fn.includes(part))
            );
            return {
              number:      p.number ?? null,
              name:        p.name,
              pos:         p.position ?? null,
              nationality: p.nationality ?? null,
              flag:        countryFlag(p.nationality ?? ''),
              isFinnish,
            };
          }),
        };
      };

      squads = [
        formatSquad(homeSquadData, fx.teams.home.name, fx.teams.home.logo),
        formatSquad(awaySquadData, fx.teams.away.name, fx.teams.away.logo),
      ];
    }

    const cc = isLive ? 'no-store' : 's-maxage=30, stale-while-revalidate=10';

    return Response.json({
      fixture: {
        id:          fx.fixture.id,
        date:        fx.fixture.date,
        venue:       fx.fixture.venue?.name ?? null,
        city:        fx.fixture.venue?.city ?? null,
        referee:     fx.fixture.referee ?? null,
        statusShort,
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
      squads,
      finnishPlayers: rows.map((r) => r.name),
    }, {
      headers: { 'Cache-Control': cc },
    });

  } catch (err) {
    console.error('[LIVE API ERROR]', err);
    return Response.json({
      fixture: { venue: null, city: null, referee: null, statusShort: 'NS', homeScore: null, awayScore: null, home: '', away: '', homeLogo: '', awayLogo: '', league: '' },
      lineups: [],
      squads: [],
      finnishPlayers: [],
    }, { status: 200 });
  }
}
