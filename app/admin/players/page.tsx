'use client';

import { useEffect, useState } from 'react';

interface Player {
  id: number;
  name: string;
  nationality: string;
  team: string;
  team_id: number;
}

const EMPTY: Omit<Player, 'id'> & { id: string } = { id: '', name: '', nationality: 'Finland', team: '', team_id: 0 };

export default function PlayersAdmin() {
  const [players, setPlayers]   = useState<Player[]>([]);
  const [editing, setEditing]   = useState<Player | null>(null);
  const [adding, setAdding]     = useState(false);
  const [form, setForm]         = useState<typeof EMPTY>({ ...EMPTY });
  const [search, setSearch]     = useState('');
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState('');

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

  const filtered = players.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.team.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="admin-page-header">
        <h1>Pelaajat <span className="admin-count">({players.length})</span></h1>
        <button className="admin-btn primary" onClick={startAdd}>+ Lisää pelaaja</button>
      </div>

      {msg && <div className="admin-flash">{msg}</div>}

      {/* Lisää / muokkaa -lomake */}
      {(editing || adding) && (
        <div className="admin-form-box">
          <h2>{adding ? 'Lisää pelaaja' : `Muokkaa: ${editing?.name}`}</h2>
          <div className="admin-form-grid">
            {adding && (
              <label>
                API ID
                <input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="esim. 963" />
              </label>
            )}
            <label>
              Nimi
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="L. Hrádecký" />
            </label>
            <label>
              Joukkue
              <input value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} placeholder="Monaco" />
            </label>
            <label>
              Joukkue ID (API)
              <input value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value as any })} placeholder="91" />
            </label>
            <label>
              Kansalaisuus
              <input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
            </label>
          </div>
          <div className="admin-form-actions">
            <button className="admin-btn primary" onClick={save} disabled={saving}>
              {saving ? 'Tallennetaan...' : 'Tallenna'}
            </button>
            <button className="admin-btn" onClick={() => { setEditing(null); setAdding(false); }}>
              Peruuta
            </button>
          </div>
        </div>
      )}

      {/* Haku */}
      <input
        className="admin-search"
        placeholder="Hae nimellä tai joukkueella..."
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
