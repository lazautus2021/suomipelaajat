import MatchList from './components/MatchList';
import InfoModal from './components/InfoModal';
import { getAllBroadcasters } from '@/lib/broadcasters';
import { getDb } from '@/lib/db';

const API_KEY  = process.env.APIFOOTBALL_KEY ?? '425b38292167d0a0f2a3fe691abe30a0';
const BASE_URL = 'https://v3.football.api-sports.io';

// Poistaa skandit ja muut erikoismerkit nimestä vertailua varten
function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Hakee ottelut tietokannasta (tänään + eilen + tulevat 60 pv)
async function getFixtures() {
  const sql = getDb();
  return sql`
    SELECT
      f.id,
      f.api_fixture_id,
      f.date,
      f.home,
      f.away,
      f.homeicon,
      f.awayicon,
      f.competition,
      json_agg(json_build_object('name', p.name, 'team', p.team) ORDER BY p.name)
        FILTER (WHERE p.name IS NOT NULL AND (p.team = f.home OR p.team = f.away)) AS players
    FROM fixtures f
    LEFT JOIN fixture_players fp ON f.id = fp.fixture_id
    LEFT JOIN players p ON fp.player_id = p.id
    WHERE f.date >= NOW() - INTERVAL '6 months'
      AND f.date < NOW() + INTERVAL '60 days'
    GROUP BY f.id
    ORDER BY f.date ASC
  `;
}

// Hakee maalintekijät menneistä matseista (viikon sisällä)
async function getRecentScorers(fixtures: any[]): Promise<Record<number, string[]>> {
  const now = Date.now();
  const recentPast = fixtures.filter((f) => {
    const ms = new Date(f.date).getTime();
    return ms < now && ms > now - 7 * 24 * 60 * 60 * 1000 && f.api_fixture_id;
  });

  if (recentPast.length === 0) return {};

  const results = await Promise.all(
    recentPast.map(async (f) => {
      try {
        const res = await fetch(
          `${BASE_URL}/fixtures/events?fixture=${f.api_fixture_id}`,
          {
            headers: { 'x-apisports-key': API_KEY },
            next: { revalidate: 3600 }, // 1h cache — menneet matsit ei muutu
          }
        );
        if (!res.ok) return { id: f.api_fixture_id, scorers: [] as string[] };
        const data = await res.json();
        const scorers: string[] = (data?.response ?? [])
          .filter((e: any) => e.type === 'Goal' && e.detail !== 'Missed Penalty')
          .map((e: any) => normalizeName(e.player?.name ?? ''));
        return { id: f.api_fixture_id, scorers };
      } catch {
        return { id: f.api_fixture_id, scorers: [] as string[] };
      }
    })
  );

  return Object.fromEntries(results.map((r) => [r.id, r.scorers]));
}

export default async function Home() {
  const fixtures = await getFixtures();
  const [broadcasterMap, scorersMap] = await Promise.all([
    getAllBroadcasters(),
    getRecentScorers(fixtures),
  ]);

  return (
    <main>
      <header className="site-header">
        <div className="header-inner">
          <img src="/suomipelaajat.png" alt="" className="header-logo" width={48} height={48} />
          <div>
            <h1>Suomalaiset pelaajat maailmalla</h1>
            <p className="header-sub">
              Automaattinen listaus suomalaisten futareiden matseista maailmalta.
            </p>
          </div>
          <InfoModal />
        </div>
      </header>

      <div className="container">
        <h2>Ottelut</h2>
        {fixtures.length === 0 ? (
          <p>Ei otteluita tietokannassa.</p>
        ) : (
          <MatchList fixtures={fixtures as any} broadcasterMap={broadcasterMap} scorersMap={scorersMap} />
        )}
      </div>
    </main>
  );
}
