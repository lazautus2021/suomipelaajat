import { type NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

const API_KEY  = process.env.APIFOOTBALL_KEY ?? '425b38292167d0a0f2a3fe691abe30a0';
const BASE_URL = 'https://v3.football.api-sports.io';
const SEASONSS  = [2025, 2026];

function isAuthed(request: NextRequest) {
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

async function fetchAPI(endpoint: string) {
  const res = await fetch(BASE_URL + endpoint, {
    headers: { 'x-apisports-key': API_KEY },
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${endpoint}`);
  return res.json();
}

async function upsertFixture(sql: ReturnType<typeof getDb>, fx: any) {
  const id          = fx.fixture.id;
  const date        = fx.fixture.date;
  const home        = fx.teams.home.name;
  const away        = fx.teams.away.name;
  const homeicon    = fx.teams.home.logo;
  const awayicon    = fx.teams.away.logo;
  const competition = fx.league.name;

  await sql`
    INSERT INTO fixtures (id, api_fixture_id, date, home, away, homeicon, awayicon, competition)
    VALUES (${id}, ${id}, ${date}, ${home}, ${away}, ${homeicon}, ${awayicon}, ${competition})
    ON CONFLICT (id) DO UPDATE SET
      date        = EXCLUDED.date,
      home        = EXCLUDED.home,
      away        = EXCLUDED.away,
      homeicon    = EXCLUDED.homeicon,
      awayicon    = EXCLUDED.awayicon,
      competition = EXCLUDED.competition
  `;
  return id;
}

export async function GET(request: NextRequest) {
  if (!isAuthed(request)) {
    return Response.json({ error: 'Ei oikeuksia' }, { status: 401 });
  }

  const sql = getDb();
  const log: string[] = [];

  try {
    // Pelaajien ottelut
    const players = await sql`SELECT id, name, team_id FROM players WHERE team_id IS NOT NULL`;
    log.push(`Pelaajia: ${players.length}`);
    for (const player of players) {
      const fixtures: any[] = [];
      for (const season of SEASONS) {
        const data = await fetchAPI(`/fixtures?team=${player.team_id}&season=${season}`);
        fixtures.push(...(data.response ?? []));
      }
      for (const fx of fixtures) {
        const fixtureId = await upsertFixture(sql, fx);
        await sql`
          INSERT INTO fixture_players (fixture_id, player_id)
          VALUES (${fixtureId}, ${player.id})
          ON CONFLICT DO NOTHING
        `;
      }
      log.push(`${player.name}: ${fixtures.length} ottelua`);
    }

    // Maajoukkueet tietokannasta
    const teams = await sql`SELECT id, name FROM national_teams WHERE active = true`;
    log.push(`Maajoukkueita: ${teams.length}`);
    for (const team of teams) {
      const fixtures: any[] = [];
      for (const season of SEASONS) {
        const data = await fetchAPI(`/fixtures?team=${team.id}&season=${season}`);
        fixtures.push(...(data.response ?? []));
      }
      for (const fx of fixtures) await upsertFixture(sql, fx);
      log.push(`${team.name}: ${fixtures.length} ottelua`);
    }

    const [{ count }] = await sql`SELECT COUNT(*) FROM fixtures`;
    log.push(`Valmis. Yhteensä ${count} ottelua.`);

    console.log('[cron/fetch-fixtures]', log.join(' | '));
    return Response.json({ ok: true, log });
  } catch (e: any) {
    console.error('[cron/fetch-fixtures] virhe:', e.message);
    return Response.json({ ok: false, error: e.message, log }, { status: 500 });
  }
}
