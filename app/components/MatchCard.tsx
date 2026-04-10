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
  broadcasters: Broadcaster[];
}

function PlayerList({ players }: { players: Player[] }) {
  if (players.length === 0) return null;
  return (
    <div className="team-players">
      {players.map((p) => (
        <span key={p.name}>🇫🇮 {p.name}</span>
      ))}
    </div>
  );
}

export default function MatchCard({ fixture, isToday, broadcasters }: Props) {
  const [showModal, setShowModal] = useState(false);

  const kickoff = new Date(fixture.date);
  const timeStr = kickoff.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Helsinki' });
  const dateStr = kickoff.toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric', timeZone: 'Europe/Helsinki' });

  const homePlayers = fixture.players?.filter((p) => p.team === fixture.home) ?? [];
  const awayPlayers = fixture.players?.filter((p) => p.team === fixture.away) ?? [];
  const isNational  = !fixture.players || fixture.players.length === 0;

  return (
    <>
      <div className={`match-card${isNational ? ' match-card--national' : ''}`} data-competition={fixture.competition}>
        {/* Yläpalkki */}
        <div className="match-meta">
          <span className="match-time">
            {isToday ? <span className="today-badge">Tänään</span> : dateStr} {timeStr}
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
              <PlayerList players={homePlayers} />
            </div>
          </div>

          <div className="match-center">
            {isToday && fixture.api_fixture_id ? (
              <LiveScore fixtureId={fixture.api_fixture_id} matchDate={fixture.date} />
            ) : (
              <span className="vs">vs</span>
            )}
          </div>

          <div className="team away">
            <div className="team-info">
              <span className="team-name">{fixture.away}</span>
              <PlayerList players={awayPlayers} />
            </div>
            {fixture.awayicon && (
              <img src={fixture.awayicon} alt={fixture.away} className="team-icon" width={32} height={32} />
            )}
          </div>
        </div>

        {/* Footer: lähetystieto + lisätiedot */}
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
