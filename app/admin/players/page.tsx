'use client';

import { useEffect, useState } from 'react';

interface Player {
  id: number;
  name: string;
  nationality: string;
  team: string;
  team_id: number;
}

interface CheckResult {
  id: number;
  name: string;
  currentTeam: string;
  apiTeam: string | null;
  isLoan: boolean;
  changed: boolean;
  error: string | null;
}

const EMPTY: Omit<Player, 'id'> & { id: string } = { id: '', name: '', nationality: 'Finland', team: '', team_id: 0 };
const BATCH = 3;

export default function PlayersAdmin() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [editing, setEditing] = useState<Player | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY });
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [checking, setChecking] = useState(false);
  const [checkProgress, setCheckProgress] = useState('');
  const [checkResults, setCheckResults] = useState<CheckResult[]>([]);

  const load = () =>
    fetch('/api/admin/players').then((r) => r.json()).then(setPlayers);

  useEffect(() => { load(); }, []);

  const flash = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 3000); };

  const save = async () => {
    setSaving(true);
    const method = adding ? 'POST' : 'PUT';
    await fetch('/api/admin/players', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, id: Number(form.id), team_id: Number(form.team_id) }),
    });
    await load();
    setEditing(null);
    setAdding(false);
    setSaving(false);
    flash(adding ? 'Pelaaja lisätty!' : 'Tallennettu!');
  };

  const remove = async (p: Player) => {
    if (!confirm(`Poistetaanko ${p.name}?`)) return;
    await fetch('/api/admin/players', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id }),
    });
    await load();
    flash('Pelaaja poistettu.');
  };

  const startEdit = (p: Player) => {
    setAdding(false);
    setEditing(p);
    setForm({ ...p, id: String(p.id) } as any);
  };

  const startAdd = () => {
    setEditing(null);
    setAdding(true);
    setForm({ ...EMPTY });
  };


  const checkTeams = async () => {
    setChecking(true);
    setCheckResults([]);
    setCheckProgress('Haetaan pelaajat...');

    const allPlayers = await fetch('/api/admin/check-player-teams').then((r) => r.json()) as { id: number; name: string; team: string }[];
    const allResults: CheckResult[] = [];

    for (let i = 0; i < allPlayers.length; i += BATCH) {
      const batch = allPlayers.slice(i, i + BATCH);
      setCheckProgress(`Tarkistetaan ${i + 1}–${Math.min(i + BATCH, allPlayers.length)} / ${allPlayers.length}...`);
      try {
        const res = await fetch('/api/admin/check-player-teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ players: batch }),
        });
        const results: CheckResult[] = await res.json();
        allResults.push(...results);
        setCheckResults([...allResults]);

        if (results.some((r) => r.error?.includes('quota'))) {
          setCheckProgress('API quota täynnä, keskeytetään.');
          break;
        }
      } catch {
        setCheckProgress('Virhe haussa, keskeytetään.');
        break;
      }
    }

    const changed = allResults.filter((r) => r.changed).length;
    setCheckProgress(`Valmis. ${changed} muutosta löytyi.`);
    setChecking(false);
  };

  const filtered = players.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.team.toLowerCase().includes(search.toLowerCase())
  );

  const changedResults = checkResults.filter((r) => r.changed);
  const loanResults   = checkResults.filter((r) => r.isLoan && r.apiTeam !== r.currentTeam);
  const okResults     = checkResults.filter((r) => !r.changed && !r.error && !r.isLoan || (r.isLoan && r.apiTeam === r.currentTeam));
  const errorResults  = checkResults.filter((r) => r.error);

  return (
    <div>
      <div className="admin-page-header">
        <h1>Pelaajat ({players.length})</h1>
        <button className="admin-btn primary" onClick={startAdd}>+ Lisää pelaaja</button>
      </div>

      {msg && <div className="admin-flash">{msg}</div>}

      {/* 🔥 EDIT / ADD FORM */}
{(editing || adding) && (
  <div className="admin-form-box">
    <h2>{adding ? 'Lisää pelaaja' : `Muokkaa: ${editing?.name}`}</h2>

    <div className="admin-form-grid">
      {adding && (
        <label>
          API ID
          <input
            value={form.id}
            onChange={(e) => setForm({ ...form, id: e.target.value })}
          />
        </label>
      )}

      <label>
        Nimi
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </label>

      <label>
        Joukkue
        <input
          value={form.team}
          onChange={(e) => setForm({ ...form, team: e.target.value })}
        />
      </label>

      <label>
        Joukkue ID
        <input
          value={form.team_id}
          onChange={(e) =>
            setForm({ ...form, team_id: Number(e.target.value) })
          }
        />
      </label>

      <label>
        Kansalaisuus
        <input
          value={form.nationality}
          onChange={(e) =>
            setForm({ ...form, nationality: e.target.value })
          }
        />
      </label>
    </div>

    <div className="admin-form-actions">
      <button className="admin-btn primary" onClick={save} disabled={saving}>
        {saving ? 'Tallennetaan...' : 'Tallenna'}
      </button>

      <button
        className="admin-btn"
        onClick={() => {
          setEditing(null);
          setAdding(false);
        }}
      >
        Peruuta
      </button>
    </div>
  </div>
)}
      
      {/* Tarkistus */}
      <div className="admin-form-box" style={{ marginBottom: 24 }}>
        <h2>Tarkista joukkueet API:sta</h2>

        <button className="admin-btn primary" onClick={checkTeams} disabled={checking}>
          {checking ? 'Tarkistetaan...' : '🔄 Tarkista'}
        </button>

        {checkProgress && <p style={{ fontSize: 13, marginTop: 10 }}>{checkProgress}</p>}

        {checkResults.length > 0 && (
          <div style={{ marginTop: 20, fontSize: 13 }}>
            <p style={{ color: '#888', fontStyle: 'italic', margin: '0 0 12px' }}>
              Tulokset ovat suuntaa-antavia — päivitä muutokset manuaalisesti taulukosta jos API-ehdotus vaikuttaa oikealta.
            </p>

            {changedResults.length > 0 && (
              <>
                <h4>🔄 Mahdolliset muutokset ({changedResults.length})</h4>
                {changedResults.map((r) => (
                  <div key={r.id} className="check-result-row changed">
                    <span className="check-name">{r.name}</span>
                    <span className="check-old">{r.currentTeam}</span>
                    <span className="check-arrow">→</span>
                    <span className="check-new">{r.apiTeam}</span>
                  </div>
                ))}
              </>
            )}

            {loanResults.length > 0 && (
              <>
                <h4 style={{ marginTop: 16 }}>🔄 Lainalla ({loanResults.length})</h4>
                {loanResults.map((r) => (
                  <div key={r.id} className="check-result-row">
                    <span className="check-name">{r.name}</span>
                    <span>{r.currentTeam}</span>
                    <span className="check-arrow">→</span>
                    <span style={{ color: '#888' }}>{r.apiTeam} (laina)</span>
                  </div>
                ))}
              </>
            )}

            {changedResults.length === 0 && loanResults.length === 0 && (
              <p style={{ color: '#4caf50' }}>✅ Kaikki näyttää ajan tasalta!</p>
            )}
          </div>
        )}
      </div>

      {/* Haku */}
      <input
        className="admin-search"
        placeholder="Hae..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Taulukko */}
  <div className="admin-table-wrap">
  <table className="admin-table">
    <thead>
      <tr>
        <th>ID</th>
        <th>Nimi</th>
        <th>Joukkue</th>
        <th>Joukkue ID</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {filtered.map((p) => (
        <tr key={p.id} className={editing?.id === p.id ? 'active-row' : ''}>
          <td className="muted">{p.id}</td>
          <td>{p.name}</td>
          <td>{p.team}</td>
          <td className="muted">{p.team_id}</td>
          <td className="admin-row-actions">
            <button onClick={() => startEdit(p)}>Muokkaa</button>
            <button className="danger" onClick={() => remove(p)}>Poista</button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
    </div>
  );
}