'use client';

import { useState } from 'react';

export default function FetchFixturesButton() {
  const [loading, setLoading] = useState(false);
  const [log, setLog]         = useState<string[]>([]);
  const [error, setError]     = useState<string | null>(null);

  async function handleFetch() {
    setLoading(true);
    setLog([]);
    setError(null);

    try {
      const res = await fetch('/api/admin/fetch-fixtures', { method: 'POST' });
      if (!res.ok || !res.body) {
        setError('Pyyntö epäonnistui');
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const { msg } = JSON.parse(line.slice(6));
              setLog((prev) => [...prev, msg]);
            } catch {}
          }
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fetch-fixtures-wrap">
      <button className="fetch-fixtures-btn" onClick={handleFetch} disabled={loading}>
        {loading ? 'Haetaan...' : 'Hae ottelut API:sta'}
      </button>
      {log.length > 0 && (
        <pre className="fetch-fixtures-log">
          {log.join('\n')}
        </pre>
      )}
      {error && <p className="fetch-fixtures-error">Virhe: {error}</p>}
    </div>
  );
}
