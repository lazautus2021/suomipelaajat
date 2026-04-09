'use client';

import { useEffect, useState } from 'react';

interface Player {
  number: number;
  name: string;
  pos: string;
  isFinnish: boolean;
}

interface LineupTeam {
  team: string;
  logo: string;
  formation: string;
  startXI: Player[];
  substitutes: Player[];
}

interface GameInfo {
  fixture: {
    venue: string | null;
    city: string | null;
    referee: string | null;
    statusShort: string;
    homeScore: number | null;
    awayScore: number | null;
    home: string;
    away: string;
    homeLogo: string;
    awayLogo: string;
    league: string;
  };
  lineups: LineupTeam[];
  finnishPlayers: string[];
}

interface Props {
  fixtureId: number;
  home: string;
  away: string;
  onClose: () => void;
}

const POS_ORDER: Record<string, number> = { G: 0, D: 1, M: 2, F: 3 };

function sortByPos(players: Player[]) {
  return [...players].sort((a, b) => (POS_ORDER[a.pos] ?? 9) - (POS_ORDER[b.pos] ?? 9));
}

function PlayerRow({ player }: { player: Player }) {
  return (
    <div className={`player-row ${player.isFinnish ? 'finnish' : ''}`}>
      <span className="player-num">{player.number}</span>
      <span className="player-name">
        {player.isFinnish && '🇫🇮 '}
        {player.name}
      </span>
      <span className="player-pos">{player.pos}</span>
    </div>
  );
}

export default function MatchModal({ fixtureId, home, away, onClose }: Props) {
  const [data, setData]     = useState<GameInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/gameinfo?fixture_id=${fixtureId}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError('Tietojen haku epäonnistui'); setLoading(false); });
  }, [fixtureId]);

  // Sulje Escape-näppäimellä
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const fx = data?.fixture;
  const hasScore = fx && fx.homeScore != null && fx.awayScore != null &&
                   !['NS', 'TBD'].includes(fx.statusShort);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Sulje">✕</button>

        {/* Otsikko */}
        <div className="modal-header">
          <div className="modal-teams">
            {fx?.homeLogo && <img src={fx.homeLogo} alt="" width={28} height={28} />}
            <span>{fx?.home ?? home}</span>
            {hasScore && (
              <span className="modal-score">{fx!.homeScore} – {fx!.awayScore}</span>
            )}
            {!hasScore && <span className="modal-vs">vs</span>}
            <span>{fx?.away ?? away}</span>
            {fx?.awayLogo && <img src={fx.awayLogo} alt="" width={28} height={28} />}
          </div>
          {fx && (
            <div className="modal-meta">
              {fx.venue && <span>📍 {fx.venue}{fx.city ? `, ${fx.city}` : ''}</span>}
              {fx.referee && <span>🟨 {fx.referee}</span>}
            </div>
          )}
        </div>

        <div className="modal-body">
          {loading && <p className="modal-loading">Ladataan tietoja...</p>}
          {error   && <p className="modal-error">{error}</p>}

          {data && data.lineups.length === 0 && !loading && (
            <p className="modal-empty">Kokoonpanoja ei vielä saatavilla.</p>
          )}

          {data && data.lineups.length > 0 && (
            <div className="lineups">
              {data.lineups.map((team) => (
                <div key={team.team} className="lineup-team">
                  <div className="lineup-header">
                    <img src={team.logo} alt="" width={22} height={22} />
                    <strong>{team.team}</strong>
                    {team.formation && (
                      <span className="formation">{team.formation}</span>
                    )}
                  </div>

                  <div className="lineup-section-label">Avauskokoonpano</div>
                  {sortByPos(team.startXI).map((p) => (
                    <PlayerRow key={p.name} player={p} />
                  ))}

                  {team.substitutes.length > 0 && (
                    <>
                      <div className="lineup-section-label subs">Vaihtopenkki</div>
                      {team.substitutes.map((p) => (
                        <PlayerRow key={p.name} player={p} />
                      ))}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
