'use client';

import { useState } from 'react';

const BATCH_SIZE = 3; // max 3 seuraa per kutsu, mahtuu 10s ikkunaan

export default function FetchFixturesButton() {
  const [loading, setLoading] = useState(false);
  const [log, setLog]         = useState<string[]>([]);
  const [error, setError]     = useState<string | null>(null);

  function addLog(msg: string) {
    setLog((prev) => [...prev, msg]);
  }

  async function handleFetch() {
    setLoading(true);
    setLog([]);
    setError(null);

    try {
      // 1. Hae lista kaikista haettavista kohteista
      const res  = await fetch('/api/admin/fetch-fixtures');
      const { jobs } = await res.json();
      addLog(`Haetaan ${jobs.length} kohdetta erissä...`);

      // 2. Käy erissä läpi
      for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
        const batch = jobs.slice(i, i + BATCH_SIZE);
        const r = await fetch('/api/admin/fetch-fixtures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobs: batch }),
        });
        if (!r.ok) {
          const text = await r.text();
          addLog(`❌ Erä ${i / BATCH_SIZE + 1} epäonnistui (${r.status}): ${text.slice(0, 100)}`);
          continue;
        }
        const { results } = await r.json();
        results.forEach(addLog);
      }

      // 3. Valmis
      addLog('✅ Kaikki haettu!');
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
