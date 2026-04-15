import { type NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name') ?? '';
  const team = req.nextUrl.searchParams.get('team') ?? '';

  const sql = getDb();

  // Hae pelaaja nimellä
  const players = name
    ? await sql`SELECT id, name, team FROM players WHERE name ILIKE ${'%' + name + '%'}`
    : [];

  // Hae fixture joukkueella
  const fixtures = team
    ? await sql`
        SELECT id, api_fixture_id, date, home, away
        FROM fixtures
        WHERE home ILIKE ${'%' + team + '%'} OR away ILIKE ${'%' + team + '%'}
        ORDER BY date DESC LIMIT 10`
    : [];

  // Jos molemmat annettu, tarkista linkitys
  const links = (name && team)
    ? await sql`
        SELECT p.name, p.team, f.home, f.away, f.date,
               (p.team = f.home OR p.team = f.away) as team_matches
        FROM players p
        JOIN fixture_players fp ON fp.player_id = p.id
        JOIN fixtures f ON fp.fixture_id = f.id
        WHERE p.name ILIKE ${'%' + name + '%'}
          AND (f.home ILIKE ${'%' + team + '%'} OR f.away ILIKE ${'%' + team + '%'})
        ORDER BY f.date DESC LIMIT 10`
    : [];

  return NextResponse.json({ players, fixtures, links });
}
