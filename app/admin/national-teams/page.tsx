'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface NationalTeam {
  id: number;
  name: string;
  active: boolean;
}

export default function NationalTeamsAdmin() {
  const [teams, setTeams]     = useState<NationalTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [newId, setNewId]     = useState('');
  const [newName, setNewName] = useState('');
  const [saving, setSaving]   = useState(false);
  const [flash, setFlash]     = useState('');

  async function load() {
    const res  = await fetch('/api/admin/national-teams');
    const data = await res.json();
    setTeams(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(''), 2500);
  }

  async function toggleActive(team: NationalTeam) {
    await fetch('/api/admin/national-teams', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...team, active: !team.active }),
    });
    await load();
    showFlash(`${team.name} ${!team.active ? 'aktivoitu' : 'poistettu käytöstä'}`);
  }

  async function deleteTeam(team: NationalTeam) {
    if (!confirm(`Poistetaanko ${team.name}?`)) return;
    await fetch('/api/admin/national-teams', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: team.id }),
    });
    await load();
    showFlash(`${team.name} poistettu`);
  }

  async function addTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!newId || !newName) return;
    setSaving(true);
    await fetch('/api/admin/national-teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: parseInt(newId), name: newName }),
    });
    setNewId('');
    setNewName('');
    await load();
    setSaving(false);
    showFlash(`${newName} lisätty`);
  }

  return (
    <div>
      <div className="admin-back"><Link href="/admin">← Takaisin</Link></div>
      <h1>Maajoukkueet</h1>
      {flash && <div className="admin-flash">{flash}</div>}

      {loading ? (
        <p>Ladataan...</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Joukkue</th>
              <th>Aktiivinen</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id} className={team.active ? '' : 'admin-row-inactive'}>
                <td className="admin-id">{team.id}</td>
                <td>{team.name}</td>
                <td>
                  <button
                    className={`admin-toggle ${team.active ? 'active' : 'inactive'}`}
                    onClick={() => toggleActive(team)}
                  >
                    {team.active ? 'Kyllä' : 'Ei'}
                  </button>
                </td>
                <td>
                  <button className="admin-delete" onClick={() => deleteTeam(team)}>Poista</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Lisää joukkue</h2>
      <form className="admin-form" onSubmit={addTeam}>
        <input
          type="number"
          placeholder="Team ID (API:sta)"
          value={newId}
          onChange={(e) => setNewId(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Nimi (esim. Finland U23)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          required
        />
        <button type="submit" disabled={saving}>
          {saving ? 'Lisätään...' : 'Lisää'}
        </button>
      </form>
    </div>
  );
}
