import Link from 'next/link';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export default async function AdminHome() {
  const [{ count: playerCount }]      = await sql`SELECT COUNT(*) FROM players`;
  const [{ count: fixtureCount }]     = await sql`SELECT COUNT(*) FROM fixtures`;
  const [{ count: broadcasterCount }] = await sql`SELECT COUNT(*) FROM broadcasters`;

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
        <div className="admin-card muted">
          <div className="admin-card-num">{fixtureCount}</div>
          <div className="admin-card-label">Ottelua tietokannassa</div>
        </div>
      </div>
    </div>
  );
}
