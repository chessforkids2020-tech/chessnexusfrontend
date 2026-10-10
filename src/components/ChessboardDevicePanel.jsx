// components/ChessboardDevicePanel.jsx
// Settings → Chessboard tab. Connects a physical ChessNexus smart board to this
// account: the board shows a 6-digit code on its screen, the user types it here.
// Once connected, the board's puzzles count on this account (rating, history).
// The board isn't on sale yet, so everyone sees a "Coming soon" showcase; the
// pairing form only shows for admins and accounts that already have a board.
import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

const FEATURES = [
  ['💡', 'Lights show the way', 'Squares light up to show where pieces go and which moves to play.'],
  ['🔊', 'Talks to your child', 'A friendly voice says what to do — "White king, e one" — so kids learn without staring at a screen.'],
  ['♟', 'Feels every move', 'Sensors under each square detect your moves and check the pieces are set up right.'],
  ['🧩', 'Your ChessNexus puzzles', 'Healthy Mix, Daily puzzle, themes and rated puzzles — every solve counts on your account.'],
  ['🤖', 'Play on a real board', 'Play Stockfish at six levels, or a friend sitting across the same board.'],
  ['📱', 'Simple touch menu', 'A small built-in touchscreen to pick what to play. Connect once with a 6-digit code.'],
];

function ComingSoon() {
  return (
    <section style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <div style={{
        padding: '28px 24px 22px',
        background: 'linear-gradient(135deg, var(--color-accent-a20), transparent 70%)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <span style={{
          display: 'inline-block', padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 800,
          letterSpacing: 1.4, textTransform: 'uppercase', background: 'var(--color-accent)', color: 'var(--color-bg)',
          marginBottom: 12,
        }}>
          Coming soon
        </span>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px' }}>
          ♟ The ChessNexus Smart Chessboard
        </h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          A real chessboard that lights up, talks and senses every piece — screen-free
          chess training for kids, connected to their ChessNexus account and coach.
        </p>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, padding: 20,
      }}>
        {FEATURES.map(([icon, title, text]) => (
          <div key={title} style={{
            padding: '14px 16px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)', background: 'var(--color-white-a04)',
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: 14, marginBottom: 4 }}>{title}</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 12.5, lineHeight: 1.55 }}>{text}</div>
          </div>
        ))}
      </div>
      <p style={{ ...p, margin: 0, padding: '0 24px 22px' }}>
        We're testing the first boards now. Once it's ready, you'll connect it right here.
      </p>
    </section>
  );
}

const card = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '24px', marginBottom: 20 };
const h2 = { fontSize: 18, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 };
const p = { color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 16 };

function timeAgo(d) {
  if (!d) return 'never';
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(d).toLocaleDateString();
}

export default function ChessboardDevicePanel() {
  const { user } = useAuth();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(() => {
    api.get('/api/board/mine')
      .then(r => setBoards(r.data.boards || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const pair = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const digits = code.replace(/\D/g, '');
    if (digits.length !== 6) { setError('Enter the 6-digit code shown on the board.'); return; }
    setBusy(true);
    try {
      await api.post('/api/board/pair', { code: digits });
      setSuccess('Board connected! It is now showing your menu.');
      setCode('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not connect. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const release = async (boardId) => {
    if (!window.confirm('Disconnect this board from your account? It will show a new code.')) return;
    try {
      await api.delete(`/api/board/${boardId}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not disconnect.');
    }
  };

  const canPair = user?.role === 'admin' || boards.length > 0;
  if (!canPair) return <ComingSoon />;

  return (
    <>
      <ComingSoon />
      <section style={card}>
        <h2 style={h2}>♟ Connect your ChessNexus board</h2>
        <p style={p}>
          Switch on the board. Its screen shows a 6-digit code — type it below.
          Puzzles solved on the board then count on this account, just like on the website.
        </p>
        <form onSubmit={pair} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={code}
            onChange={e => setCode(e.target.value.replace(/[^\d ]/g, '').slice(0, 7))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123 456"
            aria-label="Board code"
            style={{
              flex: '1 1 160px', maxWidth: 220, padding: '12px 14px', fontSize: 22, letterSpacing: 4,
              fontWeight: 700, textAlign: 'center', borderRadius: 'var(--radius-md)',
              border: '2px solid var(--color-border)', background: 'var(--color-white-a04)', color: 'var(--color-text)',
            }}
          />
          <button
            type="submit"
            disabled={busy}
            style={{
              padding: '12px 22px', borderRadius: 'var(--radius-md)', border: 'none', cursor: busy ? 'default' : 'pointer',
              background: 'var(--color-accent)', color: 'var(--color-bg)', fontWeight: 700, fontSize: 15, opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? 'Connecting…' : 'Connect board'}
          </button>
        </form>
        {error && <div style={{ color: 'var(--color-danger)', fontSize: 13, marginTop: 10 }}>{error}</div>}
        {success && <div style={{ color: 'var(--color-success)', fontSize: 13, marginTop: 10 }}>{success}</div>}
      </section>

      <section style={card}>
        <h2 style={h2}>My boards</h2>
        {loading ? (
          <p style={{ ...p, marginBottom: 0 }}>Loading…</p>
        ) : boards.length === 0 ? (
          <p style={{ ...p, marginBottom: 0 }}>No board connected yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {boards.map(b => (
              <div key={b.boardId} style={{
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
              }}>
                <span title={b.online ? 'Online' : 'Offline'} style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: b.online ? 'var(--color-success)' : 'var(--color-text-faint)',
                }} />
                <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{b.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {b.boardId} · {b.online ? 'online now' : `last seen ${timeAgo(b.lastSeen)}`}{b.fw ? ` · fw ${b.fw}` : ''}
                  </div>
                </div>
                <button
                  onClick={() => release(b.boardId)}
                  style={{
                    padding: '8px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 13,
                    border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)',
                  }}
                >
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
