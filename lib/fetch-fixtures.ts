// lib/fetch-fixtures.ts
// Hakee ottelut API:sta Neoniin — aja: npx tsx lib/fetch-fixtures.ts
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

const API_KEY  = '425b38292167d0a0f2a3fe691abe30a0';
const BASE_URL = 'https://v3.football.api-sports.io';
const SEASONS  = [2025, 2026];

async function fetchAPI(endpoint: string) {
  const res = await fetch(BASE_URL + endpoint, {
    headers: { 'x-apisports-key': API_KEY },
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${endpoint}`);
  return res.json();
}

async function upsertFixture(fx: any) {
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

async function importPlayerFixtures() {
  const players = await sql`SELECT id, team_id FROM players WHERE team_id IS NOT NULL`;
  console.log(`Käydään läpi ${players.length} pelaajaa...`);

  for (const player of players) {
    if (!player.team_id) continue;
    process.stdout.write(`  Pelaaja ${player.id} (seura ${player.team_id})... `);

    const fixtures: any[] = [];
    for (const season of SEASONS) {
      const data = await fetchAPI(`/fixtures?team=${player.team_id}&season=${season}`);
      fixtures.push(...(data.response ?? []));
    }

    for (const fx of fixtures) {
      const fixtureId = await upsertFixture(fx);
      await sql`
        INSERT INTO fixture_players (fixture_id, player_id)
        VALUES (${fixtureId}, ${player.id})
        ON CONFLICT DO NOTHING
      `;
    }
    console.log(`${fixtures.length} ottelua`);
  }
}

async function importTeamFixtures(teamId: number, label: string) {
  console.log(`Haetaan ${label}...`);
  const fixtures: any[] = [];
  for (const season of SEASONS) {
    const data = await fetchAPI(`/fixtures?team=${teamId}&season=${season}`);
    fixtures.push(...(data.response ?? []));
  }
  for (const fx of fixtures) await upsertFixture(fx);
  console.log(`  ${fixtures.length} ottelua`);
}

async function main() {
  console.log('=== Suomipelaajat fixture-haku ===\n');
  await importPlayerFixtures();
  await importTeamFixtures(8193, 'Suomen U21');
  await importTeamFixtures(1771, 'Helmarit');
  await importTeamFixtures(1099, 'Huuhkajat');

  const count = await sql`SELECT COUNT(*) FROM fixtures`;
  console.log(`\nValmis! Tietokannassa ${count[0].count} ottelua.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
