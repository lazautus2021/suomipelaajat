import { type NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

const API_KEY  = process.env.APIFOOTBALL_KEY ?? '425b38292167d0a0f2a3fe691abe30a0';
const BASE_URL = 'https://v3.football.api-sports.io';

const CACHE_SECONDS = 90; // maaleja ei tehdä joka minuutti

export async function GET(request: NextRequest) {
  const sql       = getDb();
  const fixtureId = request.nextUrl.searchParams.get('fixture_id');
  if (!fixtureId) return Response.json({ goals: [], finnishPlayers: [] });

  try {
    const rows = await sql`
      SELECT p.name
      FROM players p
      JOIN fixture_players fp ON p.id = fp.player_id
      JOIN fixtures f ON fp.fixture_id = f.id
      WHERE f.api_fixture_id = ${parseInt(fixtureId)}
    `;
    const finnishPlayers = rows.map((r) => r.name.toLowerCase());

    if (finnishPlayers.length === 0) {
      return Response.json({ goals: [], finnishPlayers: [] });
    }

    // next: { revalidate } → kaikki käyttäjät saavat saman cachatun vastauksen
    const res = await fetch(`${BASE_URL}/fixtures/events?fixture=${fixtureId}`, {
      headers: { 'x-apisports-key': API_KEY },
      next: { revalidate: CACHE_SECONDS },
    });

    if (!res.ok) return Response.json({ goals: [], finnishPlayers: [] });
    const data   = await res.json();
    if (data?.errors) return Response.json({ goals: [], finnishPlayers: [] });

    const events = data?.response ?? [];
    const goals: any[] = [];

    for (const ev of events) {
      if (ev.type !== 'Goal' || ev.detail === 'Missed Penalty') continue;
      const scorerName = ev.player?.name ?? '';
      const scorerLow  = scorerName.toLowerCase();
      const isFinnish  = finnishPlayers.some((fp) => {
        const fpParts     = fp.split(' ').filter((p: string) => p.length >= 3);
        const scorerParts = scorerLow.split(' ').filter((p: string) => p.length >= 3);
        return fpParts.some((part: string) => scorerLow.includes(part)) ||
               scorerParts.some((part: string) => fp.includes(part));
      });
      if (isFinnish) goals.push({
        player:    scorerName,
        team:      ev.team?.name ?? '',
        minute:    ev.time?.elapsed ?? null,
        detail:    ev.detail,
        fixtureId: parseInt(fixtureId),
        eventKey:  `${fixtureId}_${ev.time?.elapsed ?? 0}_${scorerLow.replace(/\s/g, '')}`,
      });
    }

    const body = JSON.stringify({ goals, finnishPlayers });
    return new Response(body, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `s-maxage=${CACHE_SECONDS}, stale-while-revalidate=30`,
      },
    });
  } catch {
    return Response.json({ goals: [], finnishPlayers: [] });
  }
}
