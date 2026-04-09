import { type NextRequest } from 'next/server';

const API_KEY  = process.env.APIFOOTBALL_KEY ?? '425b38292167d0a0f2a3fe691abe30a0';
const BASE_URL = 'https://v3.football.api-sports.io';

// Kevyt in-memory cache (toimii yksittäisessä serverless-instanssissa)
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 10_000; // 10 s

async function fetchAPI(endpoint: string) {
  const cached = cache.get(endpoint);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const res = await fetch(BASE_URL + endpoint, {
    headers: { 'x-apisports-key': API_KEY },
    next: { revalidate: 10 },
  });
  const data = await res.json();
  cache.set(endpoint, { data, ts: Date.now() });
  return data;
}

const STATUS_MAP: Record<string, string> = {
  NS: 'Ei alkanut', TBD: 'Tarkentuu', '1H': '1. jakso', HT: 'Puoliaika',
  '2H': '2. jakso', ET: 'Jatkoaika', BT: 'Tauko', P: 'Rangaistuspotkut',
  FT: 'Lopputulos', AET: 'Lopputulos (JA)', PEN: 'Lopputulos (RP)',
  PST: 'Siirretty', CANC: 'Peruttu', ABD: 'Keskeytetty', LIVE: 'Käynnissä',
};

export async function GET(request: NextRequest) {
  const fixtureId = request.nextUrl.searchParams.get('fixture_id');
  if (!fixtureId) return Response.json({ error: 'fixture_id puuttuu' }, { status: 400 });

  const data = await fetchAPI(`/fixtures?id=${fixtureId}`) as any;
  const r    = data?.response?.[0];
  if (!r) return Response.json({ error: 'Ei dataa' }, { status: 404 });

  const statusShort = r.fixture.status.short;
  const elapsed     = r.fixture.status.elapsed;

  const statusLabel = (() => {
    const base = STATUS_MAP[statusShort] ?? statusShort;
    if (['1H', '2H', 'ET', 'LIVE'].includes(statusShort) && elapsed != null) {
      return `${base} ${elapsed}'`;
    }
    return base;
  })();

  return Response.json({
    home:        r.teams.home.name,
    away:        r.teams.away.name,
    homeScore:   r.goals.home,
    awayScore:   r.goals.away,
    statusShort,
    statusLabel,
    elapsed,
    venue:       r.fixture.venue?.name ?? null,
    isFinal:     ['FT', 'AET', 'PEN'].includes(statusShort),
    isLive:      ['1H', '2H', 'ET', 'P', 'LIVE', 'HT', 'BT'].includes(statusShort),
  });
}
