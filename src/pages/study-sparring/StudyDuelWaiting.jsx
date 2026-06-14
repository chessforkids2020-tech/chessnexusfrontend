import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import studySparringSocket from '../../services/studySparringSocket';
import { motion } from 'framer-motion';

export default function StudyDuelWaiting() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Load room info
    api.get(`/api/studysparring/join/${roomCode}`)
      .then(res => {
        setRoom(res.data);
        setPlayers(res.data.players || []);
      })
      .catch(() => setError('Room not found'));

    // Connect socket
    studySparringSocket.connect();
    studySparringSocket.emit('joinSparring', { roomCode });

    studySparringSocket.on('sparringRoomUpdate', ({ players: p, status, roomCode: rc }) => {
      if (rc !== roomCode) return;
      setPlayers(p || []);
      if (status === 'active') {
        navigate(`/study/sparring/duel/${roomCode}`);
      }
    });

    studySparringSocket.on('sparringJoined', ({ players: p }) => {
      setPlayers(p || []);
    });

    studySparringSocket.on('sparringStarted', ({ roomCode: rc }) => {
      if (rc === roomCode) navigate(`/study/sparring/duel/${roomCode}`);
    });

    studySparringSocket.on('sparringError', ({ message }) => setError(message));

    return () => {
      studySparringSocket.off('sparringRoomUpdate');
      studySparringSocket.off('sparringJoined');
      studySparringSocket.off('sparringStarted');
      studySparringSocket.off('sparringError');
    };
  }, [roomCode, navigate]);

  function handleReady() {
    studySparringSocket.emit('sparringReady', { roomCode });
  }

  function handleCopy() {
    navigator.clipboard.writeText(`${window.location.origin}/study/sparring/duel/wait/${roomCode}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const cardStyle = {
    background: 'rgba(15,15,15,0.7)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    backdropFilter: 'blur(20px)',
    padding: 24,
  };

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif", color: '#fff' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(circle at 50% 30%, rgba(251,191,36,0.1) 0%, transparent 50%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ maxWidth: 480, width: '100%', padding: 24, position: 'relative', zIndex: 1 }}>
        <button onClick={() => navigate(-1)} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 32 }}>
          ← Back
        </button>

        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚔</div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fbbf24', marginBottom: 8 }}>Waiting for Opponent</h2>

          {/* Room code */}
          <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>ROOM CODE</div>
            <div style={{ fontSize: 36, fontWeight: 900, fontFamily: 'monospace', color: '#fbbf24', letterSpacing: 8 }}>{roomCode}</div>
          </div>

          {/* Share button */}
          <button
            onClick={handleCopy}
            style={{ width: '100%', padding: '12px 0', background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${copied ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, color: copied ? '#34d399' : '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 20 }}
          >
            {copied ? '✅ Link Copied!' : '📋 Copy Invite Link'}
          </button>

          {/* Players */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Players ({players.length}/2)</div>
            {[0, 1].map(i => {
              const p = players[i];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    background: p ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${p ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: 10,
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontSize: 20 }}>{p ? (p.color === 'white' ? '♔' : '♚') : '⏳'}</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, color: p ? '#fff' : '#4b5563', fontSize: 14 }}>
                      {p ? p.username : 'Waiting...'}
                    </div>
                    {p && <div style={{ fontSize: 12, color: '#9ca3af' }}>{p.color === 'white' ? 'White (moves first)' : 'Black'}</div>}
                  </div>
                  {p?.ready && <span style={{ marginLeft: 'auto', color: '#34d399', fontSize: 12, fontWeight: 700 }}>✓ Ready</span>}
                </motion.div>
              );
            })}
          </div>

          {error && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 16 }}>⚠ {error}</div>}

          <button
            onClick={handleReady}
            disabled={players.length < 2}
            style={{
              width: '100%',
              padding: '14px 0',
              background: players.length >= 2 ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
              border: `2px solid ${players.length >= 2 ? '#fbbf24' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 12,
              color: players.length >= 2 ? '#fbbf24' : '#4b5563',
              cursor: players.length >= 2 ? 'pointer' : 'not-allowed',
              fontSize: 15,
              fontWeight: 800,
            }}
          >
            {players.length >= 2 ? '✓ I\'m Ready — Start!' : 'Waiting for 2nd player...'}
          </button>
        </div>
      </div>
    </div>
  );
}
