'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push('/admin');
    } else {
      setError('Väärä salasana');
      setLoading(false);
    }
  };

  return (
    <div className="admin-login">
      <div className="admin-login-box">
        <h1>🔒 Admin</h1>
        <form onSubmit={submit}>
          <input
            type="password"
            placeholder="Salasana"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && <p className="admin-error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Kirjaudutaan...' : 'Kirjaudu'}
          </button>
        </form>
      </div>
    </div>
  );
}
