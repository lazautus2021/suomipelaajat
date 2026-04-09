import { neon } from '@neondatabase/serverless';
import { type NextRequest } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  const days = parseInt(request.nextUrl.searchParams.get('days') ?? '60');

  const fixtures = await sql`
    SELECT
      f.id,
      f.api_fixture_id,
      f.date,
      f.home,
      f.away,
      f.homeicon,
      f.awayicon,
      f.competition,
      array_agg(p.name ORDER BY p.name) FILTER (WHERE p.name IS NOT NULL) AS players
    FROM fixtures f
    LEFT JOIN fixture_players fp ON f.id = fp.fixture_id
    LEFT JOIN players p ON fp.player_id = p.id
    WHERE f.date >= NOW()
      AND f.date < NOW() + (${days} || ' days')::interval
    GROUP BY f.id
    ORDER BY f.date ASC
  `;

  return Response.json(fixtures);
}
