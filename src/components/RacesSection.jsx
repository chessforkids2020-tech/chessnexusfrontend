import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { t as tr } from '../i18n/LanguageContext';

// The three race modes plus the "Upcoming Races" strip. This used to be the
// whole of the Race Hub page (/race); it now lives inside the Puzzles Hub,
// since a race is a puzzle mode. /race redirects to /puzzles-hub.

function getCountdown(dateStr) {
  if (!dateStr) return 'Open now';
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'Open now';
  const totalMinutes = Math.floor(diff / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

function RaceCard({ race, onJoin }) {
  const [countdown, setCountdown] = useState(() =>
    getCountdown(race.scheduledStartTime || race.plannedStartTime)
  );

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(getCountdown(race.scheduledStartTime || race.plannedStartTime));
    }, 30000);
    return () => clearInterval(t);
  }, [race.scheduledStartTime, race.plannedStartTime]);

  const isArena = race.type === 'arena';
  const title = race.name || race.raceName || tr('Untitled Race');
  const isOpen = countdown === 'Open now';

  return (
    <div style={{
      background: 'var(--color-black-a35)',
      border: `1px solid ${isArena ? 'var(--color-warning-a20)' : 'var(--color-accent-2-a15)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: 'inline-block', fontSize: 11, fontWeight: 700,
            background: isArena ? 'var(--color-warning-a20)' : 'var(--color-accent-2-a15)',
            color: isArena ? 'var(--color-warning)' : 'var(--color-accent-2)',
            padding: '2px 9px', borderRadius: 'var(--radius-2xl)', marginBottom: 6,
          }}>
            {isArena ? tr('👑 Arena Race') : tr('👥 Team Race')}
          </span>
          <div style={{
            color: 'var(--color-text)', fontWeight: 700, fontSize: 15,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {title.length > 24 ? title.slice(0, 24) + '…' : title}
          </div>
        </div>
        <button
          onClick={() => onJoin(race)}
          style={{
            marginLeft: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-2) 100%)',
            color: 'var(--color-text)', border: 'none', borderRadius: 'var(--radius-md)',
            padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}
        >
          {tr("Join")}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <div style={{ background: 'var(--color-white-a04)', borderRadius: 'var(--radius-md)', padding: '6px 8px' }}>
          <div style={{ fontSize: 10, color: 'var(--color-text-faint)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>{tr("Topic")}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {race.topic || '—'}
          </div>
        </div>
        <div style={{ background: 'var(--color-white-a04)', borderRadius: 'var(--radius-md)', padding: '6px 8px' }}>
          <div style={{ fontSize: 10, color: 'var(--color-text-faint)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>{tr("Players")}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text)', fontWeight: 600 }}>
            {race.playerCount !== undefined ? race.playerCount : '—'}
          </div>
        </div>
        <div style={{ background: 'var(--color-white-a04)', borderRadius: 'var(--radius-md)', padding: '6px 8px' }}>
          <div style={{ fontSize: 10, color: 'var(--color-text-faint)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>{tr("Starts in")}</div>
          <div style={{ fontSize: 12, color: isOpen ? 'var(--color-success)' : 'var(--color-warning)', fontWeight: 700 }}>
            {countdown}
          </div>
        </div>
      </div>
    </div>
  );
}

const MODES = [
  { to: '/choose-topic', icon: '⚡', cls: 'hub-mini--puzzles', tag: tr('Solo'),  title: tr('Timed Race'), desc: tr('Timed puzzles with topic selection') },
  { to: '/arena',        icon: '👑', cls: 'hub-mini--blunder', tag: tr('Live'),  title: tr('Arena Race'), desc: tr('Join competitive arena matches') },
  { to: '/team-race',    icon: '👥', cls: 'hub-mini--team',    tag: tr('Teams'), title: tr('Team Race'),  desc: tr('Compete with your team') },
];

export default function RacesSection() {
  const navigate = useNavigate();
  const [races, setRaces] = useState([]);

  async function fetchRaces() {
    try {
      const [arenaRes, teamRes] = await Promise.all([
        api.get('/api/arena/public'),
        api.get('/api/team-race/upcoming'),
      ]);
      const arenaRaces = (arenaRes.data?.races || []).map(r => ({ ...r, type: 'arena' }));
      const teamRaces = Array.isArray(teamRes.data) ? teamRes.data : [];
      const combined = [...arenaRaces, ...teamRaces].sort((a, b) => {
        const aTime = a.plannedStartTime || a.scheduledStartTime;
        const bTime = b.plannedStartTime || b.scheduledStartTime;
        if (!aTime && !bTime) return 0;
        if (!aTime) return 1;
        if (!bTime) return -1;
        return new Date(aTime) - new Date(bTime);
      });
      setRaces(combined.slice(0, 4));
    } catch {
      // The mode cards still work without the list, so a failed fetch just
      // hides the "Upcoming" strip.
      setRaces([]);
    }
  }

  useEffect(() => {
    fetchRaces();
    const interval = setInterval(fetchRaces, 60000);
    return () => clearInterval(interval);
  }, []);

  async function handleJoin(race) {
    if (race.type === 'arena') {
      try {
        const res = await api.post('/api/arena/join', { roomId: race.roomId });
        const status = res.data.status || race.status;
        navigate(status === 'active' ? `/arena/race/${race.roomId}` : `/arena/waiting/${race.roomId}`);
      } catch {
        // fallback: use the race status we already know
        navigate(race.status === 'active' ? `/arena/race/${race.roomId}` : `/arena/waiting/${race.roomId}`);
      }
    } else {
      navigate(`/team-race/${race._id}/teams`);
    }
  }

  return (
    <section className="hub-races">
      <h2 className="hub-section-title">{tr("🏁 Races")}</h2>
      <div className="hub-bottom-row hub-races-row">
        {MODES.map(m => (
          <Link key={m.to} to={m.to} className={`hub-mini-card ${m.cls}`}>
            <div className="hub-mini-icon">{m.icon}</div>
            <div className="hub-mini-body">
              <span className="hub-mini-tag">{m.tag}</span>
              <h3 className="hub-mini-title">{m.title}</h3>
              <p className="hub-mini-desc">{m.desc}</p>
            </div>
            <span className="hub-mini-arrow">→</span>
          </Link>
        ))}
      </div>

      {races.length > 0 && (
        <div className="hub-upcoming">
          <h3 className="hub-upcoming-title">{tr("Upcoming Races")}</h3>
          <div className="hub-upcoming-grid">
            {races.map(race => (
              <RaceCard key={race._id || race.roomId} race={race} onJoin={handleJoin} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
