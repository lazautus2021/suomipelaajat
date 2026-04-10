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
  matchDate: string;
}

const FINAL = ['FT', 'AET', 'PEN', 'CANC', 'PST', 'ABD'];
const LIVE  = ['1H', '2H', 'ET', 'P', 'LIVE', 'HT', 'BT'];

const POLL_LIVE    = 180_000;      // 🔥 3 min live-peleille
const POLL_PENDING = 10 * 60_000;  // 🔥 10 min muulloin

export default function LiveScore({ fixtureId, matchDate }: Props) {
  const [data, setData] = useState<LiveData | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let isMounted = true;

    if (process.env.NEXT_PUBLIC_DISABLE_LIVE === '1') return;

    const tick = async () => {
      if (!isMounted) return;

      // 💤 1. EI yöllä (00–07)
      const hour = new Date().getHours();
      if (hour >= 0 && hour < 7) {
        timer = setTimeout(tick, POLL_PENDING);
        return;
      }

      // 🏁 2. jos jo final → stop
      if (data && FINAL.includes(data.statusShort)) return;

      // 🕶️ 3. jos tabi ei aktiivinen
      if (document.hidden) {
        timer = setTimeout(tick, POLL_PENDING);
        return;
      }

      // ⏳ 4. älä pollaa liian aikaisin (vasta 30min ennen)
      const msToKickoff = new Date(matchDate).getTime() - Date.now();
      if (msToKickoff > 30 * 60 * 1000) {
        timer = setTimeout(tick, POLL_PENDING);
        return;
      }

      try {
        const res = await fetch(`/api/live?fixture_id=${fixtureId}`);

        if (!res.ok) {
          timer = setTimeout(tick, POLL_PENDING);
          return;
        }

        const json = await res.json() as LiveData;

        if (!isMounted) return;

        setData(json);

        // 🚫 5. ei live → harvempi polling
        if (!LIVE.includes(json.statusShort) && !FINAL.includes(json.statusShort)) {
          timer = setTimeout(tick, POLL_PENDING);
          return;
        }

        // 🏁 6. final → stop kokonaan
        if (FINAL.includes(json.statusShort)) return;

        // ⚡ 7. live → nopeampi polling
        const interval = LIVE.includes(json.statusShort)
          ? POLL_LIVE
          : POLL_PENDING;

        timer = setTimeout(tick, interval);

      } catch {
        timer = setTimeout(tick, POLL_PENDING);
      }
    };

    tick();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
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