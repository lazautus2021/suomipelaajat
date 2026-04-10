'use client';

import { useEffect, useState } from 'react';

interface LiveData {
  homeScore: number | null;
  awayScore: number | null;
  statusShort: string;
  statusLabel: string;
  isFinal: boolean;
  isLive: boolean;
}

interface Props {
  fixtureId: number;
  matchDate: string; // ISO date string
}

const FINAL   = ['FT', 'AET', 'PEN', 'CANC', 'PST', 'ABD'];
const LIVE    = ['1H', '2H', 'ET', 'P', 'LIVE', 'HT', 'BT'];
const POLL_LIVE    = 60_000;  // 1 min kun ottelu käynnissä
const POLL_PENDING = 3 * 60_000; // 3 min kun ei vielä alkanut

export default function LiveScore({ fixtureId, matchDate }: Props) {
  const [data, setData] = useState<LiveData | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      if (document.hidden) {
        // Sivu taustalla — tarkista uudestaan 3min päästä
        timer = setTimeout(tick, POLL_PENDING);
        return;
      }

      // Jos matsi on yli 2h tulevaisuudessa, ei kannata pollata vielä
      const msToKickoff = new Date(matchDate).getTime() - Date.now();
      if (msToKickoff > 2 * 60 * 60 * 1000) {
        timer = setTimeout(tick, POLL_PENDING);
        return;
      }

      try {
        const res  = await fetch(`/api/live?fixture_id=${fixtureId}`);
        const json = await res.json() as LiveData;
        setData(json);

        if (FINAL.includes(json.statusShort)) return; // Loppu — ei enää pollata
        const interval = LIVE.includes(json.statusShort) ? POLL_LIVE : POLL_PENDING;
        timer = setTimeout(tick, interval);
      } catch {
        timer = setTimeout(tick, POLL_PENDING);
      }
    };

    tick();
    return () => clearTimeout(timer);
  }, [fixtureId, matchDate]);

  if (!data) return null;

  const score =
    data.homeScore != null && data.awayScore != null
      ? `${data.homeScore} – ${data.awayScore}`
      : '– –';

  return (
    <div className="live-score">
      <span className={`score ${data.isLive ? 'live' : ''}`}>{score}</span>
      <span className={`status-pill ${data.isFinal ? 'final' : data.isLive ? 'live' : ''}`}>
        {data.isLive && !data.isFinal && <span className="dot" />}
        {data.statusLabel}
      </span>
    </div>
  );
}
