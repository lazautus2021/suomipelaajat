// lib/broadcasters.ts
// Data on siirretty tietokantaan — hallinnoi /admin/broadcasters -sivulla.

import { neon } from '@neondatabase/serverless';

export interface Broadcaster { name: string; url?: string; }

const sql = neon(process.env.DATABASE_URL!);

// Haetaan kaikki kerralla ja cachataan moduulitasolla (revalidoituu deploylla)
let cache: Record<string, Broadcaster[]> | null = null;

export async function getAllBroadcasters(): Promise<Record<string, Broadcaster[]>> {
  if (cache) return cache;
  const rows = await sql`SELECT competition, channels FROM broadcasters`;
  cache = Object.fromEntries(rows.map((r) => [r.competition, r.channels as Broadcaster[]]));
  return cache!;
}

export function getBroadcasters(
  map: Record<string, Broadcaster[]>,
  competition: string
): Broadcaster[] {
  return map[competition] ?? [];
}
