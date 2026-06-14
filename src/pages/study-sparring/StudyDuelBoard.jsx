import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import Chessboard from '../../components/Chessboard';
import api from '../../api';
import studySparringSocket from '../../services/studySparringSocket';
import { parseSolutionMoves, isOnBookLine } from '../../utils/studyPracticeUtils';
import { getMoveQuality, calculateAccuracy, QUALITY_COLORS, QUALITY_SYMBOLS } from '../../utils/moveQuality';
import { motion } from 'framer-motion';

export default function StudyDuelBoard() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [chess, setChess] = useState(new Chess());
  const [myColor, setMyColor] = useState('white');
  const [orientation, setOrientation] = useState('white');
  const [boardWidth, setBoardWidth] = useState(440);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [players, setPlayers] = useState([]);
  const [userMoves, setUserMoves] = useState([]);
  const [opponentMoves, setOpponentMoves] = useState([]);
  const [myQualities, setMyQualities] = useState([]);
  const [solutionMoves, setSolutionMoves] = useState([]);
  const [deviationMsg, setDeviationMsg] = useState('');
  const [qualityBadge, setQualityBadge] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [results, setResults] = useState(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const startFenRef = useRef('');

  useEffect(() => {
    const handle = () => {
      const w = window.innerWidth;
      if (w <= 480) setBoardWidth(Math.min(320, w - 40));
      else if (w <= 768) setBoardWidth(Math.min(420, w - 60));
      else setBoardWidth(Math.min(500, Math.floor(w * 0.4)));
    };
    handle();
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  useEffect(() => {
    // Fetch room info
    api.get(`/api/studysparring/join/${roomCode}`)
      .then(async res => {
        const r = res.data;
        setPlayers(r.players || []);
        const me = r.players.find(p => p.userId === undefined ? false : true); // color is set by server
        // We'll get myColor from sparringJoined
        if (r.customFen) {
          const c = new Chess(r.customFen);
          setChess(c);
          startFenRef.current = r.customFen;
        } else if (r.chapterId) {
          const puz = await api.get(`/api/study/chapters/${r.chapterId}/puzzles`);
          const p = puz.data?.[0];
          if (p) {
            const c = new Chess(p.puzzleFen);
            setChess(c);
            startFenRef.current = p.puzzleFen;
            const sol = p.puzzleSolutions?.[0]?.pgn || '';
            setSolutionMoves(parseSolutionMoves(sol));
          }
        }
      })
      .catch(() => navigate(-1));

    studySparringSocket.connect();
    studySparringSocket.emit('joinSparring', { roomCode });

    studySparringSocket.on('sparringJoined', ({ myColor: mc, players: p, customFen }) => {
      setMyColor(mc || 'white');
      setOrientation(mc || 'white');
      setPlayers(p || []);
      if (customFen && !startFenRef.current) {
        const c = new Chess(customFen);
        setChess(c);
        startFenRef.current = customFen;
      }
      // 2nd player joining means opponent is connected
      if ((p || []).length >= 2) setOpponentConnected(true);
    });

    studySparringSocket.on('sparringRoomUpdate', ({ players: p, status }) => {
      setPlayers(p || []);
      if ((p || []).length >= 2) setOpponentConnected(true);
    });

    studySparringSocket.on('opponentMove', ({ uci, fen, san }) => {
      setWaitingForOpponent(false);
      if (fen) {
        try {
          const c = new Chess(fen);
          setChess(c);
          setOpponentMoves(prev => [...prev, san || uci]);
        } catch {}
      }
    });

    studySparringSocket.on('deviationDetected', ({ byUsername, playedSan, bookSan }) => {
      setDeviationMsg(`${byUsername} deviated! Played ${playedSan} (book: ${bookSan || '?'})`);
      setTimeout(() => setDeviationMsg(''), 5000);
    });

    studySparringSocket.on('sparringResult', ({ players: p, finished }) => {
      if (finished) {
        setGameOver(true);
        setResults(p);
      }
    });

    studySparringSocket.on('playerDisconnected', ({ username }) => {
      setOpponentDisconnected(true);
    });

    studySparringSocket.on('sparringError', ({ message }) => console.warn('Sparring error:', message));

    return () => {
      ['sparringJoined','sparringRoomUpdate','opponentMove','deviationDetected','sparringResult','playerDisconnected','sparringError'].forEach(e => studySparringSocket.off(e));
    };
  }, [roomCode, navigate]);

  function handleMove(src, tgt, promo) {
    if (waitingForOpponent || !opponentConnected || gameOver) return false;
    // Only allow user to move their own pieces
    if (chess.turn() !== myColor[0]) return false;

    try {
      const newChess = new Chess(chess.fen());
      const m = newChess.move({ from: src, to: tgt, promotion: promo || 'q' });
      if (!m) return false;

      // Quality vs book
      const expectedBook = solutionMoves[userMoves.length];
      const quality = getMoveQuality(m.san, expectedBook || null);
      const newUserMoves = [...userMoves, m.san];
      const newQualities = [...myQualities, quality];
      setUserMoves(newUserMoves);
      setMyQualities(newQualities);
      setQualityBadge({ quality, key: Date.now() });
      setTimeout(() => setQualityBadge(null), 1600);

      // Check deviation
      if (!isOnBookLine(newUserMoves, solutionMoves) && solutionMoves.length > 0) {
        studySparringSocket.emit('sparringDeviation', {
          roomCode,
          moveIndex: userMoves.length,
          playedSan: m.san,
          bookSan: expectedBook || null,
        });
      }

      setChess(newChess);
      setWaitingForOpponent(true);

      // Emit move to opponent
      studySparringSocket.emit('sparringMove', {
        roomCode,
        uci: src + tgt + (promo || ''),
        fen: newChess.fen(),
        san: m.san,
        moveIndex: userMoves.length,
      });

      // If game over, send result
      if (newChess.isGameOver() || newUserMoves.length >= solutionMoves.length) {
        const accuracy = calculateAccuracy(newQualities);
        studySparringSocket.emit('sparringFinished', {
          roomCode,
          accuracy,
          score: newQualities.filter(q => q === 'brilliant').length * 3,
          timeMs: 0,
        });
      }

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

  const myAccuracy = calculateAccuracy(myQualities);
  const isMyTurn = chess.turn() === myColor[0] && opponentConnected && !gameOver;

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', padding: 20, fontFamily: "'Segoe UI', sans-serif", color: '#fff' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(circle at 70% 30%, rgba(251,191,36,0.08) 0%, transparent 50%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <button onClick={() => navigate(-1)} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            ← Leave
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fbbf24' }}>⚔ Study Duel</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Room: {roomCode} • You play as {myColor}</div>
          </div>
          {/* Turn indicator */}
          <div style={{
            padding: '8px 16px',
            background: isMyTurn ? 'rgba(16,185,129,0.15)' : 'rgba(251,191,36,0.1)',
            border: `1px solid ${isMyTurn ? 'rgba(16,185,129,0.4)' : 'rgba(251,191,36,0.3)'}`,
            borderRadius: 10,
            color: isMyTurn ? '#34d399' : '#fbbf24',
            fontWeight: 700,
            fontSize: 13,
          }}>
            {!opponentConnected ? '⏳ Waiting for opponent...' : isMyTurn ? '🟢 Your Turn' : '⏳ Opponent thinking...'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Board */}
          <div style={{ flex: '0 0 auto' }}>
            {/* Opponent label */}
            {players.find(p => p.color !== myColor) && (
              <div style={{ padding: '8px 16px', background: 'rgba(0,0,0,0.4)', borderRadius: '10px 10px 0 0', display: 'flex', gap: 10, alignItems: 'center', marginBottom: -2 }}>
                <span style={{ fontSize: 16 }}>{myColor === 'white' ? '♚' : '♔'}</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{players.find(p => p.color !== myColor)?.username || 'Opponent'}</span>
              </div>
            )}
            <div style={cardStyle}>
              <Chessboard
                position={chess.fen()}
                onDrop={handleMove}
                orientation={orientation}
                boardWidth={boardWidth}
                draggable={isMyTurn}
                allowMovePiece={(piece) => {
                  const isWhitePiece = piece === piece.toUpperCase();
                  return myColor === 'white' ? isWhitePiece : !isWhitePiece;
                }}
              />
            </div>
            {/* My label */}
            <div style={{ padding: '8px 16px', background: 'rgba(251,191,36,0.08)', borderRadius: '0 0 10px 10px', display: 'flex', gap: 10, alignItems: 'center', marginTop: -2 }}>
              <span style={{ fontSize: 16 }}>{myColor === 'white' ? '♔' : '♚'}</span>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{players.find(p => p.color === myColor)?.username || 'You'}</span>
              <span style={{ marginLeft: 'auto', color: '#a5b4fc', fontWeight: 700, fontSize: 14 }}>{myAccuracy}%</span>
            </div>
          </div>

          {/* Side panel */}
          <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 14, minWidth: 240 }}>
            {/* Deviation */}
            {deviationMsg && (
              <div style={{ ...cardStyle, borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)' }}>
                <div style={{ color: '#f87171', fontSize: 13 }}>📉 {deviationMsg}</div>
              </div>
            )}

            {/* Quality badge */}
            {qualityBadge && (
              <motion.div
                key={qualityBadge.key}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ ...cardStyle, textAlign: 'center', borderColor: QUALITY_COLORS[qualityBadge.quality] + '60', background: QUALITY_COLORS[qualityBadge.quality] + '12' }}
              >
                <div style={{ fontSize: 32, fontWeight: 900, color: QUALITY_COLORS[qualityBadge.quality] }}>{QUALITY_SYMBOLS[qualityBadge.quality]}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: QUALITY_COLORS[qualityBadge.quality], textTransform: 'capitalize', marginTop: 4 }}>{qualityBadge.quality}</div>
              </motion.div>
            )}

            {/* Moves */}
            {userMoves.length > 0 && (
              <div style={cardStyle}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#9ca3af', marginBottom: 10, textTransform: 'uppercase' }}>My Moves</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {userMoves.map((m, i) => (
                    <span key={i} style={{
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontSize: 13,
                      fontFamily: 'monospace',
                      background: QUALITY_COLORS[myQualities[i]] + '20',
                      color: QUALITY_COLORS[myQualities[i]],
                      border: `1px solid ${QUALITY_COLORS[myQualities[i]]}40`,
                    }}>
                      {m}{QUALITY_SYMBOLS[myQualities[i]]}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Opponent disconnected */}
            {opponentDisconnected && !gameOver && (
              <div style={{ ...cardStyle, borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)' }}>
                <div style={{ color: '#f87171', fontWeight: 700 }}>⚠ Opponent disconnected</div>
              </div>
            )}

            {/* Game over */}
            {gameOver && results && (
              <div style={{ ...cardStyle, borderColor: 'rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.08)' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#a5b4fc', marginBottom: 16 }}>🏁 Duel Complete!</div>
                {results.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: 8, marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, color: '#fff' }}>{p.username}</span>
                    <span style={{ color: '#a5b4fc', fontWeight: 700 }}>{p.accuracy}% accuracy</span>
                  </div>
                ))}
                {results.length >= 2 && (
                  <div style={{ textAlign: 'center', marginTop: 12, color: '#fbbf24', fontWeight: 800, fontSize: 16 }}>
                    🏆 Winner: {results.sort((a, b) => b.accuracy - a.accuracy)[0]?.username}
                  </div>
                )}
                <button
                  onClick={() => navigate('/study/sparring/duel/create')}
                  style={{ width: '100%', marginTop: 16, padding: '12px 0', background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', borderRadius: 10, color: '#fbbf24', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
                >
                  ⚔ New Duel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
