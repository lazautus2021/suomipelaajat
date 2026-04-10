import { type NextRequest } from 'next/server';

const API_KEY  = process.env.APIFOOTBALL_KEY ?? '425b38292167d0a0f2a3fe691abe30a0';
const BASE_URL = 'https://v3.football.api-sports.io';

const STATUS_MAP: Record<string, string> = {
  NS: 'Ei alkanut', TBD: 'Tarkentuu', '1H': '1. jakso', HT: 'Puoliaika',
  '2H': '2. jakso', ET: 'Jatkoaika', BT: 'Tauko', P: 'Rangaistuspotkut',
  FT: 'Lopputulos', AET: 'Lopputulos (JA)', PEN: 'Lopputulos (RP)',
  PST: 'Siirretty', CANC: 'Peruttu', ABD: 'Keskeytetty', LIVE: 'Käynnissä',
};

const CACHE_SECONDS = 60;

export async function GET(request: NextRequest) {
  const fixtureId = request.nextUrl.searchParams.get('fixture_id');
  if (!fixtureId) return Response.json({ error: 'fixture_id puuttuu' }, { status: 400 });

  // next: { revalidate } cachettaa tämän kutsun Next.js Data Cacheen
  // → 1000 käyttäjää samassa minuutissa = silti 1 kutsu football-apiin
  const res = await fetch(`${BASE_URL}/fixtures?id=${fixtureId}`, {
    headers: { 'x-apisports-key': API_KEY },
    next: { revalidate: CACHE_SECONDS },
  });
  const data = await res.json() as any;
  const r    = data?.response?.[0];
  if (!r) return Response.json({ error: 'Ei dataa' }, { status: 404 });

  const statusShort = r.fixture.status.short;
  const elapsed     = r.fixture.status.elapsed;
  const statusLabel = (() => {
    const base = STATUS_MAP[statusShort] ?? statusShort;
    return ['1H', '2H', 'ET', 'LIVE'].includes(statusShort) && elapsed != null
      ? `${base} ${elapsed}'` : base;
  })();

  const body = JSON.stringify({
    home:      r.teams.home.name,
    away:      r.teams.away.name,
    homeScore: r.goals.home,
    awayScore: r.goals.away,
    statusShort, statusLabel, elapsed,
    venue:     r.fixture.venue?.name ?? null,
    isFinal:   ['FT', 'AET', 'PEN'].includes(statusShort),
    isLive:    ['1H', '2H', 'ET', 'P', 'LIVE', 'HT', 'BT'].includes(statusShort),
  });

  // s-maxage kertoo Vercelin CDN:lle cachettaa vastaus — kaikki käyttäjät saavat saman
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `s-maxage=${CACHE_SECONDS}, stale-while-revalidate=30`,
    },
  });
}
