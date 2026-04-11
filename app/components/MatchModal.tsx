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

interface SquadPlayer {
  number: number | null;
  name: string;
  pos: string | null;
  nationality: string | null;
  flag: string;
  isFinnish: boolean;
}

interface SquadTeam {
  team: string;
  logo: string;
  players: SquadPlayer[];
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
  squads: SquadTeam[];
  finnishPlayers: string[];
}

interface Props {
  fixtureId: number;
  home: string;
  away: string;
  onClose: () => void;
}

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE']);
const DONE_STATUSES = new Set(['FT', 'AET', 'PEN', 'AWD', 'WO']);

const POS_ORDER: Record<string, number> = { G: 0, D: 1, M: 2, F: 3 };

function sortByPos(players: Player[] = []) {
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
  const [data, setData] = useState<GameInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔥 FIXATTU FETCH
  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/gameinfo?fixture_id=${fixtureId}`)
      .then(async (r) => {
        const text = await r.text();
        try {
          return JSON.parse(text);
        } catch {
          throw new Error('API ei vastannut oikein (mahdollisesti raja täynnä)');
        }
      })
      .then((d) => {
        if (d?.error) throw new Error(d.error);
        setData({ ...d, lineups: d?.lineups || [], squads: d?.squads || [], finnishPlayers: d?.finnishPlayers || [] });
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Tietojen haku epäonnistui');
        setLoading(false);
      });
  }, [fixtureId]);

  // Escape sulku
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const fx = data?.fixture;

  const hasScore =
    fx &&
    fx.homeScore != null &&
    fx.awayScore != null &&
    !['NS', 'TBD'].includes(fx.statusShort);

  const lineups = data?.lineups || [];
  const squads  = data?.squads  || [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        {/* HEADER */}
        <div className="modal-header">
          <div className="modal-teams">
            {fx?.homeLogo && <img src={fx.homeLogo} width={28} height={28} />}
            <span>{fx?.home ?? home}</span>

            {hasScore ? (
              <span className="modal-score">
                {fx!.homeScore} – {fx!.awayScore}
              </span>
            ) : (
              <span className="modal-vs">vs</span>
            )}

            <span>{fx?.away ?? away}</span>
            {fx?.awayLogo && <img src={fx.awayLogo} width={28} height={28} />}
          </div>

          {fx && (
            <div className="modal-meta">
              {fx.venue && (
                <span>📍 {fx.venue}{fx.city ? `, ${fx.city}` : ''}</span>
              )}
              {fx.referee && <span>🟨 {fx.referee}</span>}
            </div>
          )}
        </div>

        {/* BODY */}
        <div className="modal-body">
          {loading && <p>Ladataan...</p>}
          {error && <p className="modal-error">{error}</p>}

          {!loading && lineups.length === 0 && (() => {
            const status = data?.fixture?.statusShort ?? 'NS';
            if (DONE_STATUSES.has(status)) return <p>Ottelu päättynyt. Kokoonpanot eivät enää saatavilla.</p>;
            if (LIVE_STATUSES.has(status)) return <p>Kokoonpanoja ei saatu – kokeile hetken päästä uudelleen.</p>;
            if (squads.length > 0) return (
              <div className="squads">
                <p className="squad-note">Viralliset kokoonpanot julkaistaan n. tunti ennen ottelua. Alla joukkueiden pelaajalistat:</p>
                {squads.map((squad) => (
                  <div key={squad.team} className="lineup-team">
                    <div className="lineup-header">
                      {squad.logo && <img src={squad.logo} width={22} height={22} />}
                      <strong>{squad.team}</strong>
                    </div>
                    {squad.players.map((p) => (
                      <div key={p.name} className={`player-row ${p.isFinnish ? 'finnish' : ''}`}>
                        {p.number != null && <span className="player-num">{p.number}</span>}
                        <span className="player-name">
                          {p.flag && <span>{p.flag} </span>}
                          {p.name}
                        </span>
                        {p.pos && <span className="player-pos">{p.pos?.charAt(0)}</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
            return <p>Kokoonpanot julkaistaan noin tunti ennen ottelun alkua.</p>;
          })()}

          {lineups.length > 0 && (
            <div className="lineups">
              {lineups.map((team) => (
                <div key={team.team} className="lineup-team">
                  <div className="lineup-header">
                    {team.logo && <img src={team.logo} width={22} height={22} />}
                    <strong>{team.team}</strong>
                    {team.formation && (
                      <span className="formation">{team.formation}</span>
                    )}
                  </div>

                  <div>Avaus</div>
                  {sortByPos(team.startXI).map((p) => (
                    <PlayerRow key={p.name} player={p} />
                  ))}

                  {team.substitutes?.length > 0 && (
                    <>
                      <div>Vaihtopenkki</div>
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