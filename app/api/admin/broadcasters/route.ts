import { type NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

function isAuthed(request: NextRequest) {
  return request.cookies.get('admin_auth')?.value === process.env.ADMIN_PASSWORD;
}

export async function GET(request: NextRequest) {
  if (!isAuthed(request)) return Response.json({ error: 'Ei oikeuksia' }, { status: 401 });
  const sql = getDb();
  const rows = await sql`SELECT * FROM broadcasters ORDER BY competition ASC`;
  return Response.json(rows);
}

export async function POST(request: NextRequest) {
  if (!isAuthed(request)) return Response.json({ error: 'Ei oikeuksia' }, { status: 401 });
  const sql = getDb();
  const { competition, channels } = await request.json();
  await sql`
    INSERT INTO broadcasters (competition, channels)
    VALUES (${competition}, ${JSON.stringify(channels)})
    ON CONFLICT (competition) DO UPDATE SET channels = EXCLUDED.channels
  `;
  return Response.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!isAuthed(request)) return Response.json({ error: 'Ei oikeuksia' }, { status: 401 });
  const sql = getDb();
  const { id } = await request.json();
  await sql`DELETE FROM broadcasters WHERE id=${id}`;
  return Response.json({ ok: true });
}
