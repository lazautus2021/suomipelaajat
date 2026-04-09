'use client';

import { useEffect, useRef, useState } from 'react';

interface Goal {
  player: string;
  team: string;
  minute: number | null;
  detail: string;
  eventKey: string;
}

interface Props {
  fixtureIds: number[];
}

const STORAGE_KEY = 'sp_notified_goals';
const POLL_MS     = 22_000;

const TEST_GOALS: Goal[] = [
  { player: 'Teemu Pukki',    team: 'Norwich City',     minute: 33, detail: 'Normal Goal', eventKey: '' },
  { player: 'Jere Uronen',    team: 'Real Betis',       minute: 71, detail: 'Normal Goal', eventKey: '' },
  { player: 'Fredrik Jensen', team: 'Wolfsburg',        minute: 12, detail: 'Penalty',     eventKey: '' },
  { player: 'Robin Lod',      team: 'Minnesota United', minute: 88, detail: 'Normal Goal', eventKey: '' },
];

function getNotified(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')); }
  catch { return new Set(); }
}
function saveNotified(set: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set].slice(-200)));
}

function playGoalSound() {
  try {
    const ctx    = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    [
      { freq: 523, start: 0.0,  dur: 0.15 },
      { freq: 659, start: 0.18, dur: 0.15 },
      { freq: 784, start: 0.36, dur: 0.6  },
    ].forEach(({ freq, start, dur }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.7, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {}
}

function goalTitle(goal: Goal) {
  const min    = goal.minute ? `${goal.minute}'` : '';
  const detail = goal.detail === 'Own Goal' ? ' (omaan maaliin)' :
                 goal.detail === 'Penalty'  ? ' (rp)' : '';
  return `⚽ Maali${detail}${min ? ' ' + min : ''}!`;
}

export default function GoalNotification({ fixtureIds }: Props) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [banner, setBanner]         = useState<{ title: string; body: string } | null>(null);
  const [testing, setTesting]       = useState(false);
  const [countdown, setCountdown]   = useState(0);
  const bannerTimer                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof Notification !== 'undefined') setPermission(Notification.permission);
  }, []);

  const notify = (goal: Goal) => {
    const title = goalTitle(goal);
    const body  = `${goal.player} — ${goal.team}`;
    playGoalSound();
    if (permission === 'granted') {
      const n = new Notification(title, { body, icon: '/suomipelaajat.png', tag: goal.eventKey });
      n.onclick = () => { window.focus(); n.close(); };
    }
    setBanner({ title, body });
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 8000);
  };

  // Pollaa maaleja kaikille tänään pelaaville
  useEffect(() => {
    if (fixtureIds.length === 0) return;
    const timers: ReturnType<typeof setInterval>[] = [];

    fixtureIds.forEach((fid, i) => {
      const poll = async () => {
        try {
          const res  = await fetch(`/api/goals?fixture_id=${fid}`);
          const data = await res.json();
          if (!data.goals?.length) return;
          const notified = getNotified();
          let changed = false;
          for (const goal of data.goals) {
            if (!notified.has(goal.eventKey)) {
              notified.add(goal.eventKey);
              changed = true;
              notify(goal);
            }
          }
          if (changed) saveNotified(notified);
        } catch {}
      };

      const jitter = i * 3000;
      const t = setTimeout(() => {
        poll();
        timers.push(setInterval(poll, POLL_MS));
      }, jitter);
      timers.push(t as any);
    });

    return () => timers.forEach(clearInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixtureIds.join(','), permission]);

  const requestPermission = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      new Notification('🔔 Maalihälytykset aktivoitu!', {
        body: 'Saat ilmoituksen kun suomalainen tekee maalin.',
        icon: '/suomipelaajat.png',
      });
    }
  };

  const testNotification = () => {
    setTesting(true);
    setCountdown(3);
    let secs = 3;
    const t = setInterval(() => {
      secs--;
      setCountdown(secs);
      if (secs === 0) {
        clearInterval(t);
        setTesting(false);
        const g = { ...TEST_GOALS[Math.floor(Math.random() * TEST_GOALS.length)], eventKey: `test_${Date.now()}` };
        notify(g);
      }
    }, 1000);
  };

  return (
    <>
      {/* Notifikaatio-kontrollit */}
      <div className="notif-controls">
        {permission === 'granted' ? (
          <>
            <button className="notif-btn active" onClick={() => {}}>
              🔔 Maalihälytykset päällä
            </button>
            <button className="notif-test-btn" onClick={testNotification} disabled={testing}>
              {testing ? `Vaihda välilehti... ${countdown}s` : '⚽ Testaa notifikaatio'}
            </button>
          </>
        ) : permission === 'denied' ? (
          <button className="notif-btn denied" disabled>
            🔕 Ilmoitukset estetty — salli selaimen asetuksista
          </button>
        ) : (
          <button className="notif-btn" onClick={requestPermission}>
            🔔 Ilmoita maaleista
          </button>
        )}
      </div>

      {/* Flash-banneri */}
      {banner && (
        <div className="goal-banner" onClick={() => setBanner(null)}>
          <div className="goal-banner-title">{banner.title}</div>
          <div className="goal-banner-body">{banner.body}</div>
        </div>
      )}
    </>
  );
}
