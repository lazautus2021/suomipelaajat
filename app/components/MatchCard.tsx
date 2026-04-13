'use client';

import { useState } from 'react';
import LiveScore from './LiveScore';
import MatchModal from './MatchModal';
import { type Broadcaster } from '@/lib/broadcasters';

interface Player {
  name: string;
  team: string;
}

interface Fixture {
  id: number;
  api_fixture_id: number;
  date: string;
  home: string;
  away: string;
  homeicon: string;
  awayicon: string;
  competition: string;
  players: Player[] | null;
}

interface Props {
  fixture: Fixture;
  isToday: boolean;
  isPast: boolean;
  broadcasters: Broadcaster[];
  scorers: string[]; // normalisoituja maalintekijöiden nimiä
}

// Poistaa skandit vertailua varten: Håkans → hakans
function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Tarkistaa onko pelaaja tehnyt maalin sukunimen perusteella
function didScore(playerName: string, scorers: string[]): boolean {
  if (scorers.length === 0) return false;
  const lastName = normalizeName(playerName.split(' ').at(-1) ?? playerName);
  if (lastName.length < 3) return false;
  return scorers.some((s) => s.includes(lastName) || lastName.includes(s.split(' ').at(-1) ?? s));
}

function PlayerList({ players, scorers }: { players: Player[]; scorers: string[] }) {
  if (players.length === 0) return null;
  return (
    <div className="team-players">
      {players.map((p) => (
        <span key={p.name}>
          🇫🇮 {p.name}{didScore(p.name, scorers) ? ' ⚽' : ''}
        </span>
      ))}
    </div>
  );
}

export default function MatchCard({ fixture, isToday, isPast, broadcasters, scorers }: Props) {
  const [showModal, setShowModal] = useState(false);

  const kickoff = new Date(fixture.date);
  const timeStr = kickoff.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Helsinki' });
  const dateStr = kickoff.toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric', timeZone: 'Europe/Helsinki' });

  const homePlayers = fixture.players?.filter((p) => p.team === fixture.home) ?? [];
  const awayPlayers = fixture.players?.filter((p) => p.team === fixture.away) ?? [];
  const isNational  = !fixture.players || fixture.players.length === 0;

  // Näytä LiveScore tänään tai menneille matseille (joista haetaan lopputulos)
  const showLive = fixture.api_fixture_id && (isToday || isPast);

  return (
    <>
      <div className={`match-card${isNational ? ' match-card--national' : ''}`} data-competition={fixture.competition}>
        {/* Yläpalkki */}
        <div className="match-meta">
          <span className="match-time">
            {isToday ? <><span className="today-badge">Tänään</span> {dateStr}</> : dateStr} {timeStr}
          </span>
          <span className="match-competition">{fixture.competition}</span>
        </div>

        {/* Joukkueet */}
        <div className="match-teams">
          <div className="team home">
            {fixture.homeicon && (
              <img src={fixture.homeicon} alt={fixture.home} className="team-icon" width={32} height={32} />
            )}
            <div className="team-info">
              <span className="team-name">{fixture.home}</span>
              <PlayerList players={homePlayers} scorers={scorers} />
            </div>
          </div>

          <div className="match-center">
            {showLive ? (
              <LiveScore fixtureId={fixture.api_fixture_id} matchDate={fixture.date} />
            ) : (
              <span className="vs">vs</span>
            )}
          </div>

          <div className="team away">
            <div className="team-info">
              <span className="team-name">{fixture.away}</span>
              <PlayerList players={awayPlayers} scorers={scorers} />
            </div>
            {fixture.awayicon && (
              <img src={fixture.awayicon} alt={fixture.away} className="team-icon" width={32} height={32} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="match-footer">
          <button className="info-btn" onClick={() => setShowModal(true)}>
            Lisätietoa pelistä
          </button>
          {broadcasters.length > 0 && (
            <div className="broadcasters">
              {broadcasters.map((b) =>
                b.url ? (
                  <a key={b.name} href={b.url} target="_blank" rel="noopener noreferrer" className="broadcast-link">
                    {b.name}
                  </a>
                ) : (
                  <span key={b.name} className="broadcast-name">{b.name}</span>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {showModal && fixture.api_fixture_id && (
        <MatchModal
          fixtureId={fixture.api_fixture_id}
          home={fixture.home}
          away={fixture.away}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
