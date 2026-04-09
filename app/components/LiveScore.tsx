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
}

const FINAL = ['FT', 'AET', 'PEN', 'CANC', 'PST'];

export default function LiveScore({ fixtureId }: Props) {
  const [data, setData] = useState<LiveData | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    const tick = async () => {
      if (document.hidden) return;
      try {
        const res  = await fetch(`/api/live?fixture_id=${fixtureId}`);
        const json = await res.json() as LiveData;
        setData(json);
        if (FINAL.includes(json.statusShort)) clearInterval(timer);
      } catch {}
    };

    tick();
    timer = setInterval(tick, 20_000);
    return () => clearInterval(timer);
  }, [fixtureId]);

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
