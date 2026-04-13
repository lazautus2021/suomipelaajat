import { type NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

const API_KEY = process.env.APIFOOTBALL_KEY ?? '';
const BASE_URL = 'https://v3.football.api-sports.io';

let lastRateRemaining = 999;

function isAuthed(request: NextRequest) {
  return request.cookies.get('admin_auth')?.value === process.env.ADMIN_PASSWORD;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -------------------- ERROR --------------------

function getApiErrorMessage(data: any): string | null {
  if (!data?.errors) return null;

  const values = Object.values(data.errors).filter(Boolean);
  if (values.length === 0) return null;

  const first = values[0];
  if (typeof first === 'string') return first;

  try {
    return JSON.stringify(first);
  } catch {
    return 'Tuntematon API-virhe';
  }
}

// -------------------- HELPERS --------------------

function isNationalTeamName(name: string) {
  const lower = name.toLowerCase();

  return (
    lower.includes('finland') ||
    lower.includes('suomi') ||
    lower.includes('u21') ||
    lower.includes('u20') ||
    lower.includes('u19') ||
    lower.includes('u18') ||
    lower.includes('u17')
  );
}

function parseDate(value: any): number {
  const t = Date.parse(String(value ?? ''));
  return Number.isFinite(t) ? t : 0;
}

// -------------------- FETCH --------------------

async function fetchJson(url: string) {
  const res = await fetch(url, {
    headers: { 'x-apisports-key': API_KEY },
    cache: 'no-store',
  });

  const remaining = Number(res.headers.get('x-ratelimit-remaining'));
  if (!isNaN(remaining)) {
    lastRateRemaining = remaining;
  }

  let data: any = null;

  try {
    data = await res.json();
  } catch {
    throw new Error(`Bad JSON (${res.status})`);
  }

  if (!res.ok) {
    throw new Error(getApiErrorMessage(data) || `API error ${res.status}`);
  }

  const apiError = getApiErrorMessage(data);
  if (apiError) {
    throw new Error(apiError);
  }

  return data;
}

async function throttle() {
  if (lastRateRemaining <= 3) {
    await sleep(10000);
  } else if (lastRateRemaining <= 10) {
    await sleep(3000);
  }
}

// -------------------- CORE --------------------

// 🔥 1. TRANSFERS (ensisijainen)
function pickFromTransfers(response: any[]): { name: string; isLoan: boolean } | null {
  if (!Array.isArray(response)) return null;

  // API palauttaa: response[0].transfers = [...siirrot]
  const transfers = response?.[0]?.transfers;
  if (!Array.isArray(transfers)) return null;

  const now = Date.now();

  const rows = transfers
    .filter((r) => {
      const name = r?.teams?.in?.name;
      return name && !isNationalTeamName(name);
    })
    .map((r) => ({
      name:   r.teams.in.name,
      date:   parseDate(r.date),
      isLoan: typeof r.type === 'string' && r.type.toLowerCase().includes('loan'),
    }))
    .sort((a, b) => b.date - a.date);

  if (rows.length === 0) return null;

  // Etsi viimeisin aktiivinen laina (alle 12kk sitten alkanut)
  const activeLoan = rows.find(
    (r) => r.isLoan && now - r.date < 365 * 24 * 60 * 60 * 1000
  );
  if (activeLoan) return { name: activeLoan.name, isLoan: true };

  // Muuten uusin transfer
  return { name: rows[0].name, isLoan: false };
}

// 🔥 2. TEAMS fallback (yksinkertainen ja vakaa)
function pickFromTeams(response: any[]): string | null {
  if (!Array.isArray(response)) return null;

  const clubs = response.filter((item) => {
    const name = item?.team?.name;
    return typeof name === 'string' && !isNationalTeamName(name);
  });

  const valid = clubs.filter(
    (item) => Array.isArray(item?.seasons) && item.seasons.length > 0
  );

  if (valid.length === 0) return null;

  const ranked = valid
    .map((item) => {
      const seasons = item.seasons.map((s: any) => Number(s)).filter(Number.isFinite);
      const latest = seasons.length ? Math.max(...seasons) : -1;

      return {
        name: item.team.name,
        latest,
      };
    })
    .sort((a, b) => b.latest - a.latest);

  return ranked[0]?.name ?? null;
}

// 🔥 hae yhdellä ID:llä
async function getTeamByPlayerId(playerId: number): Promise<{ name: string; isLoan: boolean } | null> {
  await throttle();
  const transfers = await fetchJson(`${BASE_URL}/transfers?player=${playerId}`);
  const t = pickFromTransfers(transfers?.response);
  if (t) return t;

  await throttle();
  const teams = await fetchJson(`${BASE_URL}/players/teams?player=${playerId}`);
  const name = pickFromTeams(teams?.response);
  return name ? { name, isLoan: false } : null;
}

// 🔥 nimi fallback
async function searchPlayerId(name: string): Promise<number | null> {
  const lastName = name.split(' ').slice(-1)[0];
  const data = await fetchJson(
    `${BASE_URL}/players?search=${encodeURIComponent(lastName)}&season=2025`
  );
  const match = data?.response?.find((r: any) => {
    const apiName = `${r.player.firstname} ${r.player.lastname}`.toLowerCase();
    return apiName === name.toLowerCase();
  });
  return match?.player?.id ?? null;
}

async function fetchPlayerTeam(id: number, name: string): Promise<{ name: string; isLoan: boolean }> {
  let result = await getTeamByPlayerId(id);
  if (result) return result;

  const newId = await searchPlayerId(name);
  if (!newId) throw new Error('Player not found');

  result = await getTeamByPlayerId(newId);
  if (!result) throw new Error('Team not found');

  return result;
}

// -------------------- API --------------------

export async function GET(request: NextRequest) {
  if (!isAuthed(request)) {
    return Response.json({ error: 'Ei oikeuksia' }, { status: 401 });
  }

  const sql = getDb();
  const players = await sql`
    SELECT id, name, team
    FROM players
    ORDER BY name ASC
  `;

  return Response.json(players);
}

export async function POST(request: NextRequest) {
  if (!isAuthed(request)) {
    return Response.json({ error: 'Ei oikeuksia' }, { status: 401 });
  }

  const { players } = await request.json();

  const results = [];

  for (const p of players) {
    try {
      const { name: apiTeam, isLoan } = await fetchPlayerTeam(p.id, p.name);

      // Hylkää tulos jos apiTeam näyttää henkilönnimeltä (sisältää etunimen)
      const looksLikeName = /^[A-ZÄÖÅ][a-zäöå]+ [A-ZÄÖÅ][a-zäöå]+$/.test(apiTeam) &&
        apiTeam.split(' ').some((part: string) => part.length <= 8);

      results.push({
        id: p.id,
        name: p.name,
        currentTeam: p.team,
        apiTeam: looksLikeName ? null : apiTeam,
        isLoan: looksLikeName ? false : isLoan,
        changed: !looksLikeName && !isLoan && apiTeam !== p.team,
        error: looksLikeName ? 'Epäluotettava tulos, tarkista manuaalisesti' : null,
      });
    } catch (err: any) {
      results.push({
        id: p.id,
        name: p.name,
        currentTeam: p.team,
        apiTeam: null,
        changed: false,
        error: err.message || 'Error',
      });
    }

    // 🔥 estää rate limit burstin
    await sleep(1000);
  }

  return Response.json(results);
}