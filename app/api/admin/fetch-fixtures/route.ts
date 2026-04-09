import { type NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

export const maxDuration = 60; // Vercel Pro: max 60s

const API_KEY  = process.env.APIFOOTBALL_KEY ?? '425b38292167d0a0f2a3fe691abe30a0';
const BASE_URL = 'https://v3.football.api-sports.io';
const SEASON   = 2025;

function isAuthed(request: NextRequest) {
  return request.cookies.get('admin_auth')?.value === process.env.ADMIN_PASSWORD;
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

export async function POST(request: NextRequest) {
  if (!isAuthed(request)) return Response.json({ error: 'Ei oikeuksia' }, { status: 401 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (msg: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ msg })}\n\n`));
      };

      try {
        const sql = getDb();

        const players = await sql`SELECT id, name, team_id FROM players WHERE team_id IS NOT NULL`;
        send(`👤 Pelaajia: ${players.length}`);

        for (const player of players) {
          const data     = await fetchAPI(`/fixtures?team=${player.team_id}&season=${SEASON}`);
          const fixtures = data.response ?? [];
          for (const fx of fixtures) {
            const fixtureId = await upsertFixture(sql, fx);
            await sql`
              INSERT INTO fixture_players (fixture_id, player_id)
              VALUES (${fixtureId}, ${player.id})
              ON CONFLICT DO NOTHING
            `;
          }
          send(`  ✓ ${player.name}: ${fixtures.length} ottelua`);
        }

        const teams = await sql`SELECT id, name FROM national_teams WHERE active = true`;
        send(`🏳️ Maajoukkueita: ${teams.length}`);

        for (const team of teams) {
          const data     = await fetchAPI(`/fixtures?team=${team.id}&season=${SEASON}`);
          const fixtures = data.response ?? [];
          for (const fx of fixtures) await upsertFixture(sql, fx);
          send(`  ✓ ${team.name}: ${fixtures.length} ottelua`);
        }

        const [{ count }] = await sql`SELECT COUNT(*) FROM fixtures`;
        send(`✅ Valmis! Tietokannassa yhteensä ${count} ottelua.`);
      } catch (e: any) {
        send(`❌ Virhe: ${e.message}`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
