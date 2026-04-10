import Link from 'next/link';
import { getDb } from '@/lib/db';
import FetchFixturesButton from './FetchFixturesButton';

export default async function AdminHome() {
  const sql = getDb();
  const [{ count: playerCount }]      = await sql`SELECT COUNT(*) FROM players`;
  const [{ count: fixtureCount }]     = await sql`SELECT COUNT(*) FROM fixtures`;
  const [{ count: broadcasterCount }] = await sql`SELECT COUNT(*) FROM broadcasters`;
  const [{ count: teamCount }]        = await sql`SELECT COUNT(*) FROM national_teams`;

  return (
    <div>
      <h1>Admin-paneeli</h1>
      <div className="admin-cards">
        <Link href="/admin/players" className="admin-card">
          <div className="admin-card-num">{playerCount}</div>
          <div className="admin-card-label">Pelaajaa</div>
        </Link>
        <Link href="/admin/broadcasters" className="admin-card">
          <div className="admin-card-num">{broadcasterCount}</div>
          <div className="admin-card-label">Sarjaa / kanava</div>
        </Link>
        <Link href="/admin/national-teams" className="admin-card">
          <div className="admin-card-num">{teamCount}</div>
          <div className="admin-card-label">Maajoukkuetta</div>
        </Link>
        <div className="admin-card muted">
          <div className="admin-card-num">{fixtureCount}</div>
          <div className="admin-card-label">Ottelua tietokannassa</div>
        </div>
      </div>
      <Link href="/admin/site-content" className="admin-card" style={{ marginTop: 8 }}>
        <div className="admin-card-label" style={{ fontSize: 15, fontWeight: 600 }}>✏️ Muokkaa "Tietoa palvelusta"</div>
      </Link>
      <FetchFixturesButton />
    </div>
  );
}
