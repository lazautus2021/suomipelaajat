import { type NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

function isAuthed(request: NextRequest) {
  return request.cookies.get('admin_auth')?.value === process.env.ADMIN_PASSWORD;
}

export async function GET(request: NextRequest) {
  if (!isAuthed(request)) return Response.json({ error: 'Ei oikeuksia' }, { status: 401 });
  const sql = getDb();
  const rows = await sql`SELECT * FROM national_teams ORDER BY name ASC`;
  return Response.json(rows);
}

export async function POST(request: NextRequest) {
  if (!isAuthed(request)) return Response.json({ error: 'Ei oikeuksia' }, { status: 401 });
  const sql = getDb();
  const { id, name } = await request.json();
  await sql`
    INSERT INTO national_teams (id, name, active)
    VALUES (${id}, ${name}, true)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
  `;
  return Response.json({ ok: true });
}

export async function PUT(request: NextRequest) {
  if (!isAuthed(request)) return Response.json({ error: 'Ei oikeuksia' }, { status: 401 });
  const sql = getDb();
  const { id, name, active } = await request.json();
  await sql`UPDATE national_teams SET name = ${name}, active = ${active} WHERE id = ${id}`;
  return Response.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!isAuthed(request)) return Response.json({ error: 'Ei oikeuksia' }, { status: 401 });
  const sql = getDb();
  const { id } = await request.json();
  await sql`DELETE FROM national_teams WHERE id = ${id}`;
  return Response.json({ ok: true });
}
