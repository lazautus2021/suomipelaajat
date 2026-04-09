import { type NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

export const maxDuration = 60;

const API_KEY  = process.env.APIFOOTBALL_KEY ?? '425b38292167d0a0f2a3fe691abe30a0';
const BASE_URL = 'https://v3.football.api-sports.io';
const SEASON   = 2025;

function isAuthed(request: NextRequest) {
  return request.cookies.get('admin_auth')?.value === process.env.ADMIN_PASSWORD;
}

async function fetchAPI(endpoint: string) {
  const res = await fetch(BASE_URL + endpoint, {
    headers: { 'x-apisports-key': API_KEY },
    signal: AbortSignal.timeout(8000), // 8s timeout per request
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${endpoint}`);
  return res.json();
}

async function upsertFixture(sql: ReturnType<typeof getDb>, fx: any) {
  const id          = fx.fixture.id;
  await sql`
    INSERT INTO fixtures (id, api_fixture_id, date, home, away, homeicon, awayicon, competition)
    VALUES (${id}, ${id}, ${fx.fixture.date}, ${fx.teams.home.name}, ${fx.teams.away.name},
            ${fx.teams.home.logo}, ${fx.teams.away.logo}, ${fx.league.name})
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

// Hakee yhden pelaajan ottelut ja palauttaa tuloksen
async function fetchPlayerFixtures(sql: ReturnType<typeof getDb>, player: { id: number; name: string; team_id: number }) {
  try {
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
    return `✓ ${player.name}: ${fixtures.length} ottelua`;
  } catch (e: any) {
    return `⚠ ${player.name}: virhe (${e.message})`;
  }
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

        // Pelaajat — haetaan 5 rinnakkain
        const players = await sql`SELECT id, name, team_id FROM players WHERE team_id IS NOT NULL`;
        send(`👤 Pelaajia: ${players.length} (haetaan 5 kerrallaan...)`);

        const CHUNK = 5;
        for (let i = 0; i < players.length; i += CHUNK) {
          const batch   = players.slice(i, i + CHUNK);
          const results = await Promise.all(batch.map((p) => fetchPlayerFixtures(sql, p as any)));
          results.forEach(send);
        }

        // Maajoukkueet — haetaan rinnakkain
        const teams = await sql`SELECT id, name FROM national_teams WHERE active = true`;
        send(`🏳️ Maajoukkueita: ${teams.length}`);

        const teamResults = await Promise.all(teams.map(async (team) => {
          try {
            const data     = await fetchAPI(`/fixtures?team=${team.id}&season=${SEASON}`);
            const fixtures = data.response ?? [];
            for (const fx of fixtures) await upsertFixture(sql, fx);
            return `✓ ${team.name}: ${fixtures.length} ottelua`;
          } catch (e: any) {
            return `⚠ ${team.name}: virhe (${e.message})`;
          }
        }));
        teamResults.forEach(send);

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
