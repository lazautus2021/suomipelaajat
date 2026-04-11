import { type NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

const API_KEY  = process.env.APIFOOTBALL_KEY ?? '';
const BASE_URL = 'https://v3.football.api-sports.io';

function isAuthed(request: NextRequest) {
  return request.cookies.get('admin_auth')?.value === process.env.ADMIN_PASSWORD;
}

// Hae pelaajan nykyinen joukkue API:sta nimen perusteella
async function fetchPlayerTeam(playerId: number, playerName: string): Promise<string | null> {
  // Käytetään pelaajan omaa ID:tä jos löytyy (nopein)
  const res = await fetch(
    `${BASE_URL}/players?id=${playerId}&season=2025`,
    { headers: { 'x-apisports-key': API_KEY }, cache: 'no-store' }
  );
  if (!res.ok) return null;
  const data = await res.json();

  if (data?.errors && Object.keys(data.errors).length > 0) {
    throw new Error('API quota täynnä');
  }

  const player = data?.response?.[0];
  if (!player) {
    // Kokeile nimihaulla jos ID ei löydy
    const lastName = playerName.split(' ').slice(-1)[0];
    const res2 = await fetch(
      `${BASE_URL}/players?search=${encodeURIComponent(lastName)}&season=2025`,
      { headers: { 'x-apisports-key': API_KEY }, cache: 'no-store' }
    );
    if (!res2.ok) return null;
    const data2 = await res2.json();
    if (data2?.errors && Object.keys(data2.errors).length > 0) throw new Error('API quota täynnä');

    // Etsi paras osuma nimellä
    const nameLow = playerName.toLowerCase();
    const match = data2?.response?.find((r: any) => {
      const apiName = `${r.player.firstname} ${r.player.lastname}`.toLowerCase();
      return apiName === nameLow || r.player.lastname.toLowerCase() === lastName.toLowerCase();
    });
    if (!match) return null;
    return match.statistics?.[0]?.team?.name ?? null;
  }

  return player.statistics?.[0]?.team?.name ?? null;
}

// GET – palauttaa kaikki pelaajat tarkistusta varten
export async function GET(request: NextRequest) {
  if (!isAuthed(request)) return Response.json({ error: 'Ei oikeuksia' }, { status: 401 });
  const sql = getDb();
  const players = await sql`SELECT id, name, team FROM players ORDER BY name ASC`;
  return Response.json(players);
}

// POST – tarkistaa batch pelaajia ({ playerIds: number[] })
export async function POST(request: NextRequest) {
  if (!isAuthed(request)) return Response.json({ error: 'Ei oikeuksia' }, { status: 401 });

  const { players } = await request.json() as {
    players: { id: number; name: string; team: string }[];
  };

  const results = [];

  for (const p of players) {
    try {
      const apiTeam = await fetchPlayerTeam(p.id, p.name);
      results.push({
        id:          p.id,
        name:        p.name,
        currentTeam: p.team,
        apiTeam:     apiTeam ?? null,
        changed:     apiTeam !== null && apiTeam !== p.team,
        error:       null,
      });
    } catch (err: any) {
      results.push({ id: p.id, name: p.name, currentTeam: p.team, apiTeam: null, changed: false, error: err.message });
    }
  }

  return Response.json(results);
}
