import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import Chessboard from '../../components/Chessboard';
import api from '../../api';
import studySparringSocket from '../../services/studySparringSocket';
import { parseSolutionMoves, getBookMove, isOnBookLine } from '../../utils/studyPracticeUtils';
import { getMoveQuality, calculateAccuracy, QUALITY_COLORS, QUALITY_SYMBOLS } from '../../utils/moveQuality';
import { motion } from 'framer-motion';

export default function CoachingRoomStudent() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [chess, setChess] = useState(new Chess());
  const [boardWidth, setBoardWidth] = useState(400);
  const [teacherArrows, setTeacherArrows] = useState([]);
  const [userMoves, setUserMoves] = useState([]);
  const [qualities, setQualities] = useState([]);
  const [solutionMoves, setSolutionMoves] = useState([]);
  const [qualityBadge, setQualityBadge] = useState(null);
  const [teacherWatching, setTeacherWatching] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [joined, setJoined] = useState(false);
  const chessRef = useRef(new Chess());
  const userMovesRef = useRef([]);

  useEffect(() => {
    const handle = () => {
      const w = window.innerWidth;
      if (w <= 480) setBoardWidth(Math.min(300, w - 40));
      else if (w <= 768) setBoardWidth(Math.min(380, w - 60));
      else setBoardWidth(440);
    };
    handle();
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  useEffect(() => {
    // Load room info
    api.get(`/api/studysparring/join/${roomCode}`).then(async res => {
      const r = res.data;
      if (r.customFen) {
        const c = new Chess(r.customFen);
        setChess(c);
        chessRef.current = c;
      } else if (r.chapterId) {
        try {
          const puz = await api.get(`/api/study/chapters/${r.chapterId}/puzzles`);
          const p = puz.data?.[0];
          if (p) {
            const c = new Chess(p.puzzleFen);
            setChess(c);
            chessRef.current = c;
            const sol = p.puzzleSolutions?.[0]?.pgn || '';
            setSolutionMoves(parseSolutionMoves(sol));
          }
        } catch {}
      }
    }).catch(() => {});

    studySparringSocket.connect();
    studySparringSocket.emit('joinSparring', { roomCode });

    studySparringSocket.on('sparringJoined', ({ players }) => {
      setJoined(true);
      // If a teacher joined (first player usually) → set watching indicator
      if (players?.length > 1) setTeacherWatching(true);
    });

    studySparringSocket.on('teacherAnnotation', ({ arrows: arr }) => {
      setTeacherArrows(arr || []);
      setTeacherWatching(true);
    });

    studySparringSocket.on('playerDisconnected', () => {
      setTeacherWatching(false);
    });

    studySparringSocket.on('sessionEnded', () => {
      setSessionEnded(true);
    });

    studySparringSocket.on('sparringError', ({ message }) => console.warn(message));

    return () => {
      ['sparringJoined','teacherAnnotation','playerDisconnected','sessionEnded','sparringError'].forEach(e => studySparringSocket.off(e));
      studySparringSocket.emit('leaveSparring', { roomCode });
    };
  }, [roomCode]);

  function handleMove(src, tgt, promo) {
    try {
      const newChess = new Chess(chess.fen());
      const m = newChess.move({ from: src, to: tgt, promotion: promo || 'q' });
      if (!m) return false;

      const expectedBook = solutionMoves[userMovesRef.current.length];
      const quality = getMoveQuality(m.san, expectedBook || null);
      const newMoves = [...userMovesRef.current, m.san];
      const newQualities = [...qualities, quality];
      userMovesRef.current = newMoves;
      setUserMoves(newMoves);
      setQualities(newQualities);
      setQualityBadge({ quality, key: Date.now() });
      setTimeout(() => setQualityBadge(null), 1600);

      setChess(newChess);
      chessRef.current = newChess;

      // Emit board update to teacher
      studySparringSocket.emit('studentBoardUpdate', {
        roomCode,
        fen: newChess.fen(),
        lastMove: { from: src, to: tgt },
      });

      return true;
    } catch {
      return false;
    }
  }

  const cardStyle = {
    background: 'rgba(15,15,15,0.7)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    backdropFilter: 'blur(20px)',
    padding: 20,
  };

  const accuracy = calculateAccuracy(qualities);

  if (sessionEnded) {
    return (
      <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif", color: '#fff' }}>
        <div style={{ ...cardStyle, textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48 }}>🎓</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#34d399', marginTop: 12 }}>Session Ended</div>
          <div style={{ color: '#6b7280', marginTop: 8, marginBottom: 20 }}>Your teacher has ended the coaching session.</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#a5b4fc', marginBottom: 20 }}>{accuracy}% accuracy</div>
          <button onClick={() => navigate(-1)} style={{ padding: '12px 32px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', padding: 20, fontFamily: "'Segoe UI', sans-serif", color: '#fff' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(circle at 30% 50%, rgba(34,197,94,0.07) 0%, transparent 50%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ maxWidth: 960, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <button onClick={() => navigate(-1)} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>← Leave</button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#34d399' }}>🎓 Coaching Room: {roomCode}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{joined ? 'Connected' : 'Joining...'}</div>
          </div>
          {teacherWatching && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', animation: 'pulse 2s infinite' }} />
              <span style={{ color: '#34d399', fontSize: 12, fontWeight: 600 }}>Teacher is watching</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: '0 0 auto' }}>
            <div style={cardStyle}>
              <Chessboard
                position={chess.fen()}
                onDrop={handleMove}
                orientation="white"
                boardWidth={boardWidth}
                draggable={chess.turn() === 'w'}
              />
            </div>
            {/* Accuracy bar */}
            <div style={{ marginTop: 10, padding: '10px 16px', background: 'rgba(0,0,0,0.4)', borderRadius: '0 0 12px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#9ca3af', fontSize: 12, fontWeight: 600 }}>Accuracy</span>
              <span style={{ color: '#a5b4fc', fontWeight: 800, fontSize: 16 }}>{accuracy}%</span>
            </div>
          </div>

          {/* Side panel */}
          <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 14, minWidth: 200 }}>
            {/* Teacher annotations badge */}
            {teacherArrows.length > 0 && (
              <div style={{ ...cardStyle, borderColor: 'rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.06)' }}>
                <div style={{ color: '#34d399', fontWeight: 700, fontSize: 13 }}>📋 Teacher annotation pushed</div>
                <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>{teacherArrows.length} arrow{teacherArrows.length !== 1 ? 's' : ''} on board</div>
              </div>
            )}

            {/* Quality badge */}
            {qualityBadge && (
              <motion.div
                key={qualityBadge.key}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{ ...cardStyle, textAlign: 'center', borderColor: QUALITY_COLORS[qualityBadge.quality] + '60', background: QUALITY_COLORS[qualityBadge.quality] + '12' }}
              >
                <div style={{ fontSize: 34, fontWeight: 900, color: QUALITY_COLORS[qualityBadge.quality] }}>{QUALITY_SYMBOLS[qualityBadge.quality]}</div>
                <div style={{ textTransform: 'capitalize', fontWeight: 700, color: QUALITY_COLORS[qualityBadge.quality], marginTop: 4, fontSize: 14 }}>{qualityBadge.quality}</div>
              </motion.div>
            )}

            {/* Move list */}
            {userMoves.length > 0 && (
              <div style={cardStyle}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase' }}>Moves</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {userMoves.map((m, i) => (
                    <span key={i} style={{ padding: '3px 8px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace', background: QUALITY_COLORS[qualities[i]] + '20', color: QUALITY_COLORS[qualities[i]], border: `1px solid ${QUALITY_COLORS[qualities[i]]}40` }}>
                      {m}{QUALITY_SYMBOLS[qualities[i]]}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
