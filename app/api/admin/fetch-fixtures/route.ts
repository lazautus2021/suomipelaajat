import { type NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

export const maxDuration = 10;

const API_KEY  = process.env.APIFOOTBALL_KEY ?? '425b38292167d0a0f2a3fe691abe30a0';
const BASE_URL = 'https://v3.football.api-sports.io';
function getDateRange() {
  const now    = new Date();
  const from   = now.toISOString().slice(0, 10);
  const to     = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
  const season = now.getFullYear(); // API vaatii season + from/to
  return { from, to, season };
}

function isAuthed(request: NextRequest) {
  return request.cookies.get('admin_auth')?.value === process.env.ADMIN_PASSWORD;
}

async function fetchAPI(endpoint: string) {
  const res = await fetch(BASE_URL + endpoint, {
    headers: { 'x-apisports-key': API_KEY },
    signal: AbortSignal.timeout(7000),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

async function upsertFixture(sql: ReturnType<typeof getDb>, fx: any) {
  const id = fx.fixture.id;
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

// GET: palauttaa listan kaikista haettavista kohteista (seurat + maajoukkueet)
export async function GET(request: NextRequest) {
  if (!isAuthed(request)) return Response.json({ error: 'Ei oikeuksia' }, { status: 401 });

  const sql = getDb();
  const players = await sql`SELECT id, name, team_id FROM players WHERE team_id IS NOT NULL`;
  const teams   = await sql`SELECT id, name FROM national_teams WHERE active = true`;

  // Deduplikoi seurajoukkueet
  const teamMap = new Map<number, { teamId: number; playerIds: number[]; names: string[] }>();
  for (const p of players) {
    const tid = p.team_id as number;
    if (!teamMap.has(tid)) teamMap.set(tid, { teamId: tid, playerIds: [], names: [] });
    teamMap.get(tid)!.playerIds.push(p.id as number);
    teamMap.get(tid)!.names.push(p.name as string);
  }

  const jobs = [
    ...[...teamMap.values()].map((t) => ({
      type: 'club' as const,
      teamId: t.teamId,
      playerIds: t.playerIds,
      label: t.names.join(', '),
    })),
    ...teams.map((t) => ({
      type: 'national' as const,
      teamId: t.id as number,
      playerIds: [] as number[],
      label: t.name as string,
    })),
  ];

  return Response.json({ jobs });
}

// POST: hakee yhden erän (batch) kohteita
export async function POST(request: NextRequest) {
  if (!isAuthed(request)) return Response.json({ error: 'Ei oikeuksia' }, { status: 401 });

  const { jobs } = await request.json() as {
    jobs: { type: 'club' | 'national'; teamId: number; playerIds: number[]; label: string }[]
  };

  const sql = getDb();
  const results: string[] = [];

  for (const job of jobs) {
    try {
      // Seurajoukkueet: date range + season. Maajoukkueet: next=20 (toimii ilman season)
      let fixtures: any[];
      if (job.type === 'national') {
        const data = await fetchAPI(`/fixtures?team=${job.teamId}&next=20`);
        fixtures = data.response ?? [];
      } else {
        const { from, to, season } = getDateRange();
        const [d1, d2] = await Promise.all([
          fetchAPI(`/fixtures?team=${job.teamId}&season=${season}&from=${from}&to=${to}`),
          fetchAPI(`/fixtures?team=${job.teamId}&season=${season - 1}&from=${from}&to=${to}`),
        ]);
        const seen = new Set<number>();
        fixtures = [...(d1.response ?? []), ...(d2.response ?? [])].filter((fx: any) => {
          if (seen.has(fx.fixture.id)) return false;
          seen.add(fx.fixture.id);
          return true;
        });
      }
      for (const fx of fixtures) {
        const fixtureId = await upsertFixture(sql, fx);
        for (const pid of job.playerIds) {
          await sql`INSERT INTO fixture_players (fixture_id, player_id) VALUES (${fixtureId}, ${pid}) ON CONFLICT DO NOTHING`;
        }
      }
      results.push(`✓ ${job.label}: ${fixtures.length} ottelua`);
    } catch (e: any) {
      results.push(`⚠ ${job.label}: ohitetaan`);
    }
  }

  return Response.json({ results });
}
