'use client';

import { useEffect, useState } from 'react';

interface Channel { name: string; url?: string; }
interface Broadcaster { id: number; competition: string; channels: Channel[]; }

export default function BroadcastersAdmin() {
  const [rows, setRows]       = useState<Broadcaster[]>([]);
  const [editing, setEditing] = useState<Broadcaster | null>(null);
  const [adding, setAdding]   = useState(false);
  const [comp, setComp]       = useState('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState('');
  const [search, setSearch]   = useState('');

  const load = () =>
    fetch('/api/admin/broadcasters').then((r) => r.json()).then(setRows);

  useEffect(() => { load(); }, []);

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(''), 3000); };

  const startEdit = (r: Broadcaster) => {
    setAdding(false);
    setEditing(r);
    setComp(r.competition);
    setChannels(r.channels.length ? r.channels : [{ name: '', url: '' }]);
  };

  const startAdd = () => {
    setEditing(null);
    setAdding(true);
    setComp('');
    setChannels([{ name: '', url: '' }]);
  };

  const save = async () => {
    setSaving(true);
    const clean = channels.filter((c) => c.name.trim());
    await fetch('/api/admin/broadcasters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competition: comp, channels: clean }),
    });
    await load();
    setEditing(null);
    setAdding(false);
    setSaving(false);
    flash('Tallennettu!');
  };

  const remove = async (r: Broadcaster) => {
    if (!confirm(`Poistetaanko ${r.competition}?`)) return;
    await fetch('/api/admin/broadcasters', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: r.id }),
    });
    await load();
    flash('Poistettu.');
  };

  const setChannel = (i: number, field: keyof Channel, val: string) => {
    setChannels((prev) => prev.map((c, idx) => idx === i ? { ...c, [field]: val } : c));
  };

  const filtered = rows.filter((r) =>
    r.competition.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="admin-page-header">
        <h1>Lähetyskanavat <span className="admin-count">({rows.length})</span></h1>
        <button className="admin-btn primary" onClick={startAdd}>+ Lisää sarja</button>
      </div>

      {msg && <div className="admin-flash">{msg}</div>}

      {(editing || adding) && (
        <div className="admin-form-box">
          <h2>{adding ? 'Lisää sarja' : `Muokkaa: ${editing?.competition}`}</h2>
          <label>
            Sarjan nimi (täsmälleen kuten API palauttaa)
            <input
              value={comp}
              onChange={(e) => setComp(e.target.value)}
              placeholder="esim. La Liga"
              disabled={!!editing}
            />
          </label>
          <div style={{ marginTop: 14 }}>
            <div className="admin-label">Kanavat</div>
            {channels.map((ch, i) => (
              <div key={i} className="admin-channel-row">
                <input
                  value={ch.name}
                  onChange={(e) => setChannel(i, 'name', e.target.value)}
                  placeholder="esim. V Sport"
                  style={{ flex: 1 }}
                />
                <input
                  value={ch.url ?? ''}
                  onChange={(e) => setChannel(i, 'url', e.target.value)}
                  placeholder="https://viaplay.fi"
                  style={{ flex: 2 }}
                />
                <button
                  className="admin-btn danger-sm"
                  onClick={() => setChannels((prev) => prev.filter((_, idx) => idx !== i))}
                >✕</button>
              </div>
            ))}
            <button
              className="admin-btn"
              style={{ marginTop: 6 }}
              onClick={() => setChannels((prev) => [...prev, { name: '', url: '' }])}
            >+ Lisää kanava</button>
          </div>
          <div className="admin-form-actions" style={{ marginTop: 16 }}>
            <button className="admin-btn primary" onClick={save} disabled={saving}>
              {saving ? 'Tallennetaan...' : 'Tallenna'}
            </button>
            <button className="admin-btn" onClick={() => { setEditing(null); setAdding(false); }}>
              Peruuta
            </button>
          </div>
        </div>
      )}

      <input
        className="admin-search"
        placeholder="Hae sarjan nimellä..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Sarja</th>
              <th>Kanavat</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className={editing?.id === r.id ? 'active-row' : ''}>
                <td>{r.competition}</td>
                <td>
                  {r.channels.length === 0
                    ? <span className="muted">—</span>
                    : r.channels.map((c) => (
                        <span key={c.name} className="channel-badge">{c.name}</span>
                      ))}
                </td>
                <td className="admin-row-actions">
                  <button onClick={() => startEdit(r)}>Muokkaa</button>
                  <button className="danger" onClick={() => remove(r)}>Poista</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
