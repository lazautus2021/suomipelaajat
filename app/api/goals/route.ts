import { neon } from '@neondatabase/serverless';
import { type NextRequest } from 'next/server';

const sql    = neon(process.env.DATABASE_URL!);
const API_KEY  = process.env.APIFOOTBALL_KEY ?? '425b38292167d0a0f2a3fe691abe30a0';
const BASE_URL = 'https://v3.football.api-sports.io';

const cache = new Map<string, { data: unknown; ts: number }>();

async function fetchEvents(fixtureId: string) {
  const cached = cache.get(fixtureId);
  if (cached && Date.now() - cached.ts < 15_000) return cached.data as any[];

  const res  = await fetch(`${BASE_URL}/fixtures/events?fixture=${fixtureId}`, {
    headers: { 'x-apisports-key': API_KEY },
  });
  const data = await res.json();
  const events = data?.response ?? [];
  cache.set(fixtureId, { data: events, ts: Date.now() });
  return events as any[];
}

export async function GET(request: NextRequest) {
  const fixtureId = request.nextUrl.searchParams.get('fixture_id');
  if (!fixtureId) return Response.json({ error: 'fixture_id puuttuu' }, { status: 400 });

  // Hae suomalaiset pelaajat tähän otteluun
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

  const events = await fetchEvents(fixtureId);
  const goals: any[] = [];

  for (const ev of events) {
    if (ev.type !== 'Goal' || ev.detail === 'Missed Penalty') continue;

    const scorerName = ev.player?.name ?? '';
    const scorerLow  = scorerName.toLowerCase();

    const isFinnish = finnishPlayers.some((fp) => {
      const fpParts     = fp.split(' ').filter((p: string) => p.length >= 3);
      const scorerParts = scorerLow.split(' ').filter((p: string) => p.length >= 3);
      return fpParts.some((part: string) => scorerLow.includes(part)) ||
             scorerParts.some((part: string) => fp.includes(part));
    });

    if (isFinnish) {
      goals.push({
        player:      scorerName,
        team:        ev.team?.name ?? '',
        minute:      ev.time?.elapsed ?? null,
        minuteExtra: ev.time?.extra ?? null,
        detail:      ev.detail,
        fixtureId:   parseInt(fixtureId),
        eventKey:    `${fixtureId}_${ev.time?.elapsed ?? 0}_${scorerLow.replace(/\s/g, '')}`,
      });
    }
  }

  return Response.json({ goals, finnishPlayers });
}
