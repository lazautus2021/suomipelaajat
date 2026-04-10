import { type NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

function isAuthed(request: NextRequest) {
  return request.cookies.get('admin_auth')?.value === process.env.ADMIN_PASSWORD;
}

export async function GET(request: NextRequest) {
  if (!isAuthed(request)) return Response.json({ error: 'Ei oikeuksia' }, { status: 401 });
  const sql  = getDb();
  const rows = await sql`SELECT key, value FROM site_content`;
  return Response.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
}

export async function POST(request: NextRequest) {
  if (!isAuthed(request)) return Response.json({ error: 'Ei oikeuksia' }, { status: 401 });
  const sql = getDb();
  const { key, value } = await request.json();
  await sql`
    INSERT INTO site_content (key, value) VALUES (${key}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;
  return Response.json({ ok: true });
}
