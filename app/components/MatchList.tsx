'use client';

import { useMemo, useState, useEffect } from 'react';
import MatchCard from './MatchCard';
import GoalNotification from './GoalNotification';
import { type Broadcaster } from '@/lib/broadcasters';

interface Fixture {
  id: number;
  api_fixture_id: number;
  date: string;
  home: string;
  away: string;
  homeicon: string;
  awayicon: string;
  competition: string;
  players: { name: string; team: string }[] | null;
}

interface Props {
  fixtures: Fixture[];
  broadcasterMap: Record<string, Broadcaster[]>;
}

const COOKIE = 'selectedCompetitions';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}
function setCookie(name: string, value: string, days = 30) {
  const exp = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${exp}; path=/`;
}

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export default function MatchList({ fixtures, broadcasterMap }: Props) {
  const { clubComps, nationalComps } = useMemo(() => {
    const compHasPlayers = new Map<string, boolean>();
    for (const f of fixtures) {
      if (!compHasPlayers.has(f.competition)) compHasPlayers.set(f.competition, false);
      if (f.players && f.players.length > 0) compHasPlayers.set(f.competition, true);
    }
    const club     = [...compHasPlayers.entries()].filter(([, v]) => v).map(([k]) => k);
    const national = [...compHasPlayers.entries()].filter(([, v]) => !v).map(([k]) => k);
    return { clubComps: club, nationalComps: national };
  }, [fixtures]);

  const competitions = useMemo(() => [...clubComps, ...nationalComps], [clubComps, nationalComps]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set(competitions));

  // Lataa cookiesta
  useEffect(() => {
    const saved = getCookie(COOKIE);
    if (saved) {
      try { setSelected(new Set(JSON.parse(saved))); } catch {}
    }
  }, []);

  const toggle = (comp: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(comp) ? next.delete(comp) : next.add(comp);
      setCookie(COOKIE, JSON.stringify([...next]));
      return next;
    });
  };

  const selectAll  = () => { setSelected(new Set(competitions)); setCookie(COOKIE, JSON.stringify(competitions)); };
  const clearAll   = () => { setSelected(new Set()); setCookie(COOKIE, '[]'); };

  const visible = fixtures.filter((f) => selected.has(f.competition));

  // Tänään pelattavien fixture ID:t maalihälytyksiin
  const todayFixtureIds = useMemo(
    () => fixtures.filter((f) => isToday(f.date) && f.api_fixture_id).map((f) => f.api_fixture_id),
    [fixtures]
  );

  return (
    <>
      <GoalNotification fixtureIds={todayFixtureIds} />

      {/* Filtterit */}
      <div className="filters">
        <h3>Valitse kilpailut:</h3>
        <p className="filters-hint">Selain muistaa valintasi</p>
        <div className="filter-actions">
          <button onClick={selectAll}>Valitse kaikki</button>
          <button onClick={clearAll}>Tyhjennä kaikki</button>
          <span className="filter-count">{selected.size}/{competitions.length} valittuna</span>
        </div>
        {clubComps.length > 0 && (
          <>
            <p className="filter-group-label">Seurajoukkueet</p>
            <div className="filter-list">
              {clubComps.map((comp) => (
                <label key={comp} className="filter-label">
                  <input type="checkbox" checked={selected.has(comp)} onChange={() => toggle(comp)} />
                  {comp}
                </label>
              ))}
            </div>
          </>
        )}
        {nationalComps.length > 0 && (
          <>
            <p className="filter-group-label">Maajoukkueet</p>
            <div className="filter-list">
              {nationalComps.map((comp) => (
                <label key={comp} className="filter-label">
                  <input type="checkbox" checked={selected.has(comp)} onChange={() => toggle(comp)} />
                  {comp}
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Ottelulista */}
      <div className="match-list">
        {visible.length === 0 ? (
          <p className="empty">Ei otteluita valituilla kilpailuilla.</p>
        ) : (
          visible.map((f) => (
            <MatchCard key={f.id} fixture={f} isToday={isToday(f.date)} broadcasters={broadcasterMap[f.competition] ?? []} />
          ))
        )}
      </div>
    </>
  );
}
