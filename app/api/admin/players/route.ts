import { type NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

function isAuthed(request: NextRequest) {
  return request.cookies.get('admin_auth')?.value === process.env.ADMIN_PASSWORD;
}

export async function GET(request: NextRequest) {
  if (!isAuthed(request)) return Response.json({ error: 'Ei oikeuksia' }, { status: 401 });
  const sql = getDb();
  const players = await sql`SELECT * FROM players ORDER BY name ASC`;
  return Response.json(players);
}

export async function POST(request: NextRequest) {
  if (!isAuthed(request)) return Response.json({ error: 'Ei oikeuksia' }, { status: 401 });
  const sql = getDb();
  const { id, name, nationality, team, team_id } = await request.json();
  await sql`
    INSERT INTO players (id, name, nationality, team, team_id)
    VALUES (${id}, ${name}, ${nationality ?? 'Finland'}, ${team}, ${team_id})
    ON CONFLICT (id) DO UPDATE SET
      name        = EXCLUDED.name,
      nationality = EXCLUDED.nationality,
      team        = EXCLUDED.team,
      team_id     = EXCLUDED.team_id
  `;
  return Response.json({ ok: true });
}

export async function PUT(request: NextRequest) {
  if (!isAuthed(request)) return Response.json({ error: 'Ei oikeuksia' }, { status: 401 });
  const sql = getDb();
  const { id, name, nationality, team, team_id } = await request.json();
  await sql`
    UPDATE players SET name=${name}, nationality=${nationality}, team=${team}, team_id=${team_id}
    WHERE id=${id}
  `;
  return Response.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!isAuthed(request)) return Response.json({ error: 'Ei oikeuksia' }, { status: 401 });
  const sql = getDb();
  const { id } = await request.json();
  await sql`DELETE FROM fixture_players WHERE player_id=${id}`;
  await sql`DELETE FROM players WHERE id=${id}`;
  return Response.json({ ok: true });
}
