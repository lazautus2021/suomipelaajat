import { getDb } from '@/lib/db';

export async function GET() {
  const sql  = getDb();
  const rows = await sql`SELECT key, value FROM site_content`;
  const map  = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return Response.json(map);
}
