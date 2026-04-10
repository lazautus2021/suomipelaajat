import MatchList from './components/MatchList';
import InfoModal from './components/InfoModal';
import { getAllBroadcasters } from '@/lib/broadcasters';
import { getDb } from '@/lib/db';

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
      json_agg(json_build_object('name', p.name, 'team', p.team) ORDER BY p.name) FILTER (WHERE p.name IS NOT NULL) AS players
    FROM fixtures f
    LEFT JOIN fixture_players fp ON f.id = fp.fixture_id
    LEFT JOIN players p ON fp.player_id = p.id
    WHERE f.date >= NOW()
      AND f.date < NOW() + INTERVAL '60 days'
    GROUP BY f.id
    ORDER BY f.date ASC
  `;
}

export default async function Home() {
  const [fixtures, broadcasterMap] = await Promise.all([getFixtures(), getAllBroadcasters()]);

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
        <h2>Tulevat ottelut</h2>
        {fixtures.length === 0 ? (
          <p>Ei tulevia otteluita tietokannassa. Aja ensin: <code>npx tsx lib/fetch-fixtures.ts</code></p>
        ) : (
          <MatchList fixtures={fixtures as any} broadcasterMap={broadcasterMap} />
        )}
      </div>
    </main>
  );
}
