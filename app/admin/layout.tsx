import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-wrap">
      <nav className="admin-nav">
        <Link href="/admin" className="admin-nav-logo">⚽ Admin</Link>
        <Link href="/admin/players">Pelaajat</Link>
        <Link href="/admin/broadcasters">Kanavat</Link>
        <Link href="/" className="admin-nav-back">← Etusivulle</Link>
      </nav>
      <div className="admin-content">{children}</div>
    </div>
  );
}
