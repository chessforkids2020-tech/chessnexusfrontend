// pages/coach/LiveClassroomPage.jsx
// The live classroom: Zoom-style video grid + pinned screen-share + synced chess
// board + live countdown + (host) waiting-room panel with Present/Catch up/Remove.
// Used by both the host (via MyMeetings "Start") and admitted students (via join link).
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import api from '../../api';
import socket from '../../socket';
import { useAuth } from '../../contexts/AuthContext';
import Chessboard from '../../components/Chessboard';
import useLiveKitRoom from '../../hooks/useLiveKitRoom';
import LiveClassChat from '../../components/LiveClassChat';
import { buildTreeFromPgn, nodeAtPath, addMove, getMainlinePath } from '../../components/gameTree';
import EditableBoard from '../../components/PositionEditor/EditableBoard';
import PieceSelector from '../../components/PositionEditor/PieceSelector';
import EnginePanel from '../../components/EnginePanel';
import { renderFrame } from '../../lib/videoEffects';
import CoachArenaLive from './CoachArenaLive';

// ── Zoom-style mic / camera icons ─────────────────────────────────────────────
// The icon IS the mic/camera shape; "off" draws a diagonal slash across the SAME
// icon (like Zoom / Meet) instead of swapping in a separate ✗/🚫 glyph. The slash
// has a tiny background-coloured underlay so it reads cleanly over the shape.
function SlashOverlay({ color }) {
  // A short diagonal line across the icon (Zoom-style "off" indicator).
  return <line x1="3" y1="3" x2="21" y2="21" stroke={color} strokeWidth="3.4" strokeLinecap="round" opacity="0.9" />;
}
function MicIcon({ off = false, size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: 'block' }}>
      <rect x="9" y="3" width="6" height="11" rx="3" fill={color} />
      <path d="M6 11a6 6 0 0 0 12 0" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12" y2="21" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="21" x2="16" y2="21" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {off && <SlashOverlay color={color} />}
    </svg>
  );
}
function CamIcon({ off = false, size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: 'block' }}>
      <rect x="2.5" y="6.5" width="12.5" height="11" rx="2.5" fill={color} />
      <path d="M15 10.5 L21 7.5 V16.5 L15 13.5 Z" fill={color} />
      {off && <SlashOverlay color={color} />}
    </svg>
  );
}

// Big initial-letter circle (used when there's no camera and no profile photo).
function AvatarFallback({ name, speaking }) {
  const letter = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <div style={{
      width: 64, height: 64, borderRadius: '50%', display: 'grid', placeItems: 'center',
      fontSize: 26, fontWeight: 800, color: '#04211d',
      background: 'linear-gradient(135deg,#06b6d4,#10b981)',
      boxShadow: speaking ? '0 0 0 3px #22c55e' : 'none',
    }}>{letter}</div>
  );
}

// One participant tile: video when the camera is on; otherwise their profile
// photo / avatar (like Zoom). Also plays the participant's audio (remote only —
// Live self-preview for the Video-effects panel. Grabs its OWN camera stream and
// applies the effects as a live CSS filter, so the user SEES the change while they
// drag the sliders (like Zoom). Uses a fresh getUserMedia stream (not the published
// track) so the CSS filter isn't double-applied on top of the baked-in processor.
function FxPreview({ effects, blurOn, deviceId }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const effectsRef = useRef(effects);
  effectsRef.current = effects; // read live so dragging a slider updates instantly
  useEffect(() => {
    let stream, raf, cancelled = false;
    const video = document.createElement('video');
    video.autoplay = true; video.playsInline = true; video.muted = true;
    videoRef.current = video;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: deviceId ? { deviceId: { ideal: deviceId } } : true, audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        video.srcObject = stream;
        await video.play().catch(() => {});
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d', { alpha: false });
        const loop = () => {
          if (cancelled || !ctx) return;
          const w = video.videoWidth || 640, h = video.videoHeight || 480;
          if (canvas.width !== w) canvas.width = w;
          if (canvas.height !== h) canvas.height = h;
          // Renders the SAME pipeline as the published track — so touch-up (skin
          // smoothing) is visible here exactly as others will see it.
          renderFrame(ctx, video, w, h, effectsRef.current);
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch { /* camera busy/denied — preview stays black */ }
    })();
    return () => { cancelled = true; if (raf) cancelAnimationFrame(raf); try { stream?.getTracks().forEach(t => t.stop()); } catch { /* */ } };
  }, [deviceId]);
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden', background: '#000', marginBottom: 14 }}>
      {/* Canvas mirrored like a self-view; shows the real processed frame incl. smoothing. */}
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
      <span style={{ position: 'absolute', left: 8, bottom: 8, fontSize: 11, fontWeight: 700, background: 'rgba(0,0,0,0.55)', padding: '2px 8px', borderRadius: 6 }}>
        Live preview — you
      </span>
      {blurOn && (
        <span style={{ position: 'absolute', right: 8, bottom: 8, fontSize: 11, background: 'rgba(6,182,212,0.85)', color: '#04222a', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
          🌫️ Blur active in the call
        </span>
      )}
    </div>
  );
}

// never your own, to avoid echo).
// `local` marks YOUR own tile: we render the RAW camera MediaStreamTrack directly
// (bypassing the encode/simulcast path) so the self-view is instant and full-res —
// exactly how Zoom shows your own preview. Remote tiles still attach the LiveKit track.
function MediaTile({ track, audioTrack, muted, label, isScreen, avatarUrl, speaking, ratio, local }) {
  const ref = useRef(null);
  const audioRef = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !track) return;
    // Self-view: attach the underlying raw camera track straight to the <video> via a
    // dedicated MediaStream — no SFU round-trip, no ~1s encode lag, no down-scaled
    // simulcast layer. `mediaStreamTrack` is the raw browser track LiveKit wraps.
    if (local) {
      const raw = track.mediaStreamTrack;
      if (raw) {
        const stream = new MediaStream([raw]);
        el.srcObject = stream;
        return () => { try { el.srcObject = null; } catch { /* */ } };
      }
    }
    track.attach(el);
    return () => { try { track.detach(el); } catch { /* */ } };
  }, [track, local]);
  useEffect(() => {
    const el = audioRef.current;
    if (el && audioTrack && !muted) { audioTrack.attach(el); return () => { try { audioTrack.detach(el); } catch { /* */ } }; }
  }, [audioTrack, muted]);
  return (
    <div style={{
      position: 'relative', background: '#111', borderRadius: isScreen ? 10 : 12, overflow: 'hidden',
      aspectRatio: isScreen ? '16/9' : (ratio || '4/3'),
      outline: speaking && !isScreen ? '2px solid #22c55e' : 'none',
    }}>
      {track
        ? <video ref={ref} autoPlay playsInline muted={muted} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: (local && !isScreen) ? 'scaleX(-1)' : 'none' }} />
        : (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
            {avatarUrl
              ? <img src={avatarUrl} alt={label} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', boxShadow: speaking ? '0 0 0 3px #22c55e' : 'none' }} />
              : <AvatarFallback name={label} speaking={speaking} />}
          </div>
        )}
      {/* Remote audio playback (invisible). Local audio is never played back. */}
      {audioTrack && !muted && <audio ref={audioRef} autoPlay />}
      {label && <div style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 12, color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: 6 }}>{label}</div>}
    </div>
  );
}

function Countdown({ endsAt, onExpire }) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(endsAt) - Date.now()));
  useEffect(() => {
    const id = setInterval(() => {
      const ms = Math.max(0, new Date(endsAt) - Date.now());
      setLeft(ms);
      if (ms <= 0) { clearInterval(id); onExpire && onExpire(); }
    }, 1000);
    return () => clearInterval(id);
  }, [endsAt, onExpire]);
  const m = Math.floor(left / 60000), sec = Math.floor((left % 60000) / 1000);
  const low = left <= 60000;
  return <span style={{ fontWeight: 800, color: low ? '#ef4444' : '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
    {m}:{String(sec).padStart(2, '0')}
  </span>;
}

// Fun animated waiting-room screen — floating chess pieces, a bobbing avatar, a
// live "getting things ready" indicator, and rotating chess tips so kids aren't
// staring at a blank page.
const CHESS_TIPS = [
  // Opening principles
  'Control the center — it gives your pieces more room to move.',
  'Develop your knights and bishops before bringing out the queen.',
  'Castle early to keep your king safe and connect your rooks.',
  'Try not to move the same piece twice in the opening.',
  'A knight on the rim is dim — keep your knights near the center.',
  'Don’t bring your queen out too early — it can get chased around.',
  'Move a few pawns, then get your pieces out — don’t push only pawns.',
  'Every piece wants a job. Get them all into the game.',
  // Good habits
  'Before every move ask: “Is it safe? What is my opponent threatening?”',
  'Always look for checks, captures, and threats — yours and theirs.',
  'When you see a good move, look for a better one.',
  'Never rush. Take your time and think before you move.',
  'If your opponent makes a move, ask “Why did they do that?”',
  'Count your attackers and defenders before you trade.',
  'Don’t leave pieces hanging — a piece with no defender can be taken free.',
  'Play with a plan, not just one move at a time.',
  // Tactics
  'A fork attacks two pieces at once — knights love forking!',
  'A pin stops a piece from moving because something better is behind it.',
  'A skewer is like a pin, but the big piece is in front.',
  'Look for pieces lined up — they might be pinned or skewered.',
  'A discovered attack can be very powerful — move one piece, reveal another.',
  'If you can win material for free, usually take it!',
  // Endgame
  'In the endgame, bring your king out — it becomes a strong piece.',
  'Passed pawns want to run — push them toward promotion.',
  'Rooks belong on open files where they can attack.',
  'When you’re ahead in material, trade pieces — not pawns.',
  'Two rooks or a queen can checkmate a lonely king — practice it!',
  'Keep your rook active behind passed pawns.',
  // Mindset / fun
  'Losing is part of learning — every master lost thousands of games.',
  'Mistakes are okay. Learn one thing from each game.',
  'Have fun! Chess is a game — enjoy the puzzles on the board.',

  // ── Intermediate tips (for stronger kids) ──
  'Doubled pawns can be weak — but they open a file for your rook.',
  'A bishop pair is strong in open positions with room to move.',
  'Trade your bad bishop (stuck behind its own pawns) when you can.',
  'Knights are strong in closed positions; bishops love open ones.',
  'Put your rook on the 7th rank — it attacks pawns and traps the king.',
  'Don’t trade a good piece for a bad one just to “make a move”.',
  'Create a passed pawn and it becomes a long-term winning weapon.',
  'Opposite-colored bishops often make the endgame a draw.',
  'Improve your worst-placed piece — that’s often the best move.',
  'Prophylaxis means stopping your opponent’s plan before your own.',
  'A strong outpost is a square your knight can sit on, safe from pawns.',
  'In king-and-pawn endings, “the opposition” wins key squares.',
  'Overprotect an important central pawn so pieces defend from behind it.',
  'Two weaknesses win: stretch the defense across the board.',
  'Don’t release central tension too early — keep options open.',
  'Rooks belong behind passed pawns — yours to push, theirs to stop.',
  'Calculate forcing lines (checks and captures) to the very end.',
  'A pawn majority on the wing away from the kings can create a passer.',
  'When attacking the king, bring more pieces than the defenders.',
  'Trade pieces when ahead in material; keep pieces when attacking.',
];
const FLOATERS = ['♟', '♞', '♝', '♜', '♛', '♚', '♙', '♘'];

// SAN notation panel with variations, rendered from the shared game tree.
// Clicking a move jumps everyone to it (host/controller drives). Read-only for
// students without control (they just follow the highlight).
function MoveTreeNotation({ tree, path, onJump, canNavigate, height, collapsed, onToggle }) {
  const curId = path.length ? path[path.length - 1] : 'root';

  // Render a chain of moves; branch (children[1..]) shown as indented variations.
  const renderLine = (node, basePath, startPly) => {
    const out = [];
    let cur = node;
    let p = basePath;
    let ply = startPly;
    while (cur.children.length > 0) {
      const main = cur.children[0];
      const mainPath = [...p, main.id];
      const moveNo = Math.floor(ply / 2) + 1;
      const white = ply % 2 === 0;
      // Move number label (white: "1.", black after variation: "1...").
      if (white) out.push(<span key={`n${main.id}`} style={nt.num}>{moveNo}.</span>);
      out.push(
        <span key={main.id}
          onClick={() => canNavigate && onJump(mainPath)}
          style={{ ...nt.mv, ...(String(main.id) === String(curId) ? nt.mvOn : {}), cursor: canNavigate ? 'pointer' : 'default' }}
        >{main.san}</span>
      );
      // Sibling variations (children[1..]) branch off the CURRENT node `cur`.
      cur.children.slice(1).forEach((sib, i) => {
        out.push(
          <div key={`v${sib.id}-${i}`} style={nt.variation}>
            ({renderLine({ children: [sib] }, p, ply)})
          </div>
        );
      });
      cur = main; p = mainPath; ply += 1;
    }
    return out;
  };

  const hasMoves = tree && tree.children && tree.children.length > 0;
  return (
    <div style={{ ...nt.wrap, width: collapsed ? 150 : 300, height: collapsed ? 'auto' : (height || 420) }}>
      <div style={{ ...nt.title, cursor: onToggle ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        onClick={onToggle} title={onToggle ? (collapsed ? 'Expand moves' : 'Collapse moves — more room for videos') : ''}>
        <span>📝 Moves</span>
        {onToggle && <span style={{ fontSize: 13 }}>{collapsed ? '▸' : '▾'}</span>}
      </div>
      {!collapsed && (
        <div style={nt.body}>
          {hasMoves ? renderLine(tree, [], 0, false)
            : <div style={{ color: '#6b7280', fontSize: 12 }}>No moves yet. {canNavigate ? 'Make a move on the board.' : ''}</div>}
        </div>
      )}
    </div>
  );
}
const nt = {
  wrap: { width: 300, flexShrink: 0, maxHeight: '70vh', display: 'flex', flexDirection: 'column',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' },
  title: { flexShrink: 0, padding: '9px 12px', fontSize: 12, fontWeight: 800, color: '#67e8f9', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  // flex:1 + minHeight:0 makes the moves area fill the whole card height and scroll
  // WITHIN it. overflowX:hidden + wordBreak keep moves WRAPPING to new lines and
  // scrolling VERTICALLY only — never widening the card or scrolling sideways.
  body: { flex: 1, minWidth: 0, minHeight: 0, padding: 10, overflowY: 'auto', overflowX: 'hidden',
    lineHeight: 1.9, fontSize: 13.5, wordBreak: 'break-word', overflowWrap: 'anywhere' },
  num: { color: '#6b7280', marginRight: 3, marginLeft: 4 },
  mv: { color: '#e2e8f0', padding: '1px 5px', borderRadius: 5, marginRight: 2 },
  mvOn: { background: 'rgba(6,182,212,0.3)', color: '#fff', fontWeight: 700 },
  variation: { color: '#9ca3af', fontSize: 12, margin: '2px 0 2px 12px', borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: 6 },
};

const MEDALS = ['🥇', '🥈', '🥉'];

function WaitingRoom({ note, user, joinCode }) {
  const [tip, setTip] = useState(0);
  const [board, setBoard] = useState(null); // { top:[], me, totalStudents }
  useEffect(() => {
    // Slow rotation — kids need time to read each tip (9s per tip).
    const id = setInterval(() => setTip(t => (t + 1) % CHESS_TIPS.length), 9000);
    return () => clearInterval(id);
  }, []);
  // Fetch the "star students" leaderboard (host's students by activity XP).
  useEffect(() => {
    if (!joinCode) return;
    let alive = true;
    const load = () => api.get(`/api/coach-live/join/${joinCode}/leaderboard`)
      .then(r => { if (alive) setBoard(r.data); })
      .catch(() => {});
    load();
    const id = setInterval(load, 30000); // refresh while waiting
    return () => { alive = false; clearInterval(id); };
  }, [joinCode]);
  const name = user?.displayName || user?.username || 'there';
  const avatar = user?.profilePhotoUrl;

  return (
    <div style={wr.wrap}>
      <style>{`
        @keyframes wrFloat { 0%{transform:translateY(0) rotate(0)} 50%{transform:translateY(-26px) rotate(8deg)} 100%{transform:translateY(0) rotate(0)} }
        @keyframes wrBob   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes wrPulse { 0%{box-shadow:0 0 0 0 rgba(16,185,129,0.45)} 70%{box-shadow:0 0 0 22px rgba(16,185,129,0)} 100%{box-shadow:0 0 0 0 rgba(16,185,129,0)} }
        @keyframes wrDot   { 0%,80%,100%{opacity:.2;transform:translateY(0)} 40%{opacity:1;transform:translateY(-5px)} }
        @keyframes wrFade  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes wrShine { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
      `}</style>

      {/* Floating chess pieces in the background */}
      <div style={wr.floaters} aria-hidden>
        {FLOATERS.map((p, i) => {
          // Alternate teal/green tints so pieces are clearly visible (not near-invisible).
          const tint = ['rgba(103,232,249,0.28)', 'rgba(52,211,153,0.26)', 'rgba(255,255,255,0.20)'][i % 3];
          return (
            <span key={i} style={{
              position: 'absolute',
              left: `${(i * 12 + 6) % 92}%`,
              top: `${(i * 27 + 10) % 80}%`,
              fontSize: 40 + (i % 3) * 18,
              color: tint,
              textShadow: '0 2px 12px rgba(16,185,129,0.25)',
              animation: `wrFloat ${5 + (i % 4)}s ease-in-out ${i * 0.4}s infinite`,
            }}>{p}</span>
          );
        })}
      </div>

      <div style={wr.row}>
        {/* Main waiting card */}
        <div style={wr.card}>
          {/* Bobbing avatar with a pulsing ring */}
          <div style={{ animation: 'wrBob 3s ease-in-out infinite', marginBottom: 18 }}>
            <div style={{ ...wr.avatarRing, animation: 'wrPulse 2.4s infinite' }}>
              {avatar
                ? <img src={avatar} alt="" style={{ width: 76, height: 76, borderRadius: '50%', objectFit: 'cover' }} />
                : <img src="/logo.png" alt="Chess Nexus" style={{ width: 60, height: 60, objectFit: 'contain' }} />}
            </div>
          </div>

          {/* Live status pill — makes the "you're in the lobby" state explicit (Zoom-style). */}
          <div style={wr.statusPill}>
            <span style={wr.statusDot} />Waiting to be admitted
          </div>

          <h1 style={wr.hi}>Hi {name}! 👋</h1>
          <p style={wr.sub}>{note || 'Your coach will let you in any moment now.'}</p>

          {/* Animated "getting ready" dots */}
          <div style={{ display: 'flex', gap: 7, margin: '18px 0 6px', justifyContent: 'center' }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', animation: `wrDot 1.4s ${i * 0.2}s infinite` }} />
            ))}
          </div>

          {/* Rotating chess tip */}
          <div style={wr.tipBox}>
            <div style={wr.tipLabel}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 5 }}>
                <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2.5h6c0-1.3.3-1.8 1-2.5A6 6 0 0 0 12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              While you wait
            </div>
            <div key={tip} style={{ ...wr.tipText, animation: 'wrFade 1.2s ease' }}>{CHESS_TIPS[tip]}</div>
          </div>
        </div>

        {/* Star students leaderboard — SIDE panel (right of the card, wraps below on mobile). */}
        {board && board.top && board.top.length > 0 && (
          <div style={wr.lbBox}>
            <div style={wr.lbTitle}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: '-3px', marginRight: 6 }}>
                <path d="M7 4h10v3a5 5 0 0 1-10 0V4ZM7 6H4.5A2.5 2.5 0 0 0 7 10.5M17 6h2.5A2.5 2.5 0 0 1 17 10.5M9.5 14.5h5M12 12v2.5M8 20h8M10 17h4v3h-4z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Star Students
            </div>
            {board.top.map(r => (
              <div key={r.id} style={{ ...wr.lbRow, ...(r.isMe ? wr.lbMe : {}) }}>
                <span style={wr.lbRank}>{r.rank <= 3 ? MEDALS[r.rank - 1] : r.rank}</span>
                {r.avatar
                  ? <img src={r.avatar} alt="" style={wr.lbAvatar} />
                  : <span style={{ ...wr.lbAvatar, ...wr.lbAvatarFallback }}>{(r.name || '?').charAt(0).toUpperCase()}</span>}
                <span style={wr.lbName}>{r.name}{r.isMe ? ' (you)' : ''}</span>
                <span style={wr.lbXp}>{r.xp} XP</span>
              </div>
            ))}
            {board.me && (
              <>
                <div style={wr.lbDots}>⋯</div>
                <div style={{ ...wr.lbRow, ...wr.lbMe }}>
                  <span style={wr.lbRank}>{board.me.rank}</span>
                  {board.me.avatar
                    ? <img src={board.me.avatar} alt="" style={wr.lbAvatar} />
                    : <span style={{ ...wr.lbAvatar, ...wr.lbAvatarFallback }}>{(board.me.name || '?').charAt(0).toUpperCase()}</span>}
                  <span style={wr.lbName}>{board.me.name} (you)</span>
                  <span style={wr.lbXp}>{board.me.xp} XP</span>
                </div>
              </>
            )}
            <div style={wr.lbHint}>Play games, solve puzzles & finish assignments to climb! 🚀</div>
          </div>
        )}
      </div>
    </div>
  );
}

const wr = {
  wrap: { position: 'relative', minHeight: '100vh', overflow: 'hidden', display: 'grid', placeItems: 'center',
    background: 'radial-gradient(1100px 560px at 15% -10%, rgba(6,182,212,0.12), transparent 60%), radial-gradient(1000px 560px at 85% 0%, rgba(16,185,129,0.12), transparent 60%), #0b0f14',
    color: '#eef2f6', fontFamily: "'Poppins',sans-serif" },
  statusPill: { display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 4, padding: '5px 13px', borderRadius: 999,
    fontSize: 11.5, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase',
    color: '#6ee7b7', background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(52,211,153,0.28)' },
  statusDot: { width: 7, height: 7, borderRadius: '50%', background: '#10b981', animation: 'wrDot 1.4s infinite' },
  floaters: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  // Card + leaderboard sit side by side (wrap to stacked on narrow screens).
  row: { position: 'relative', zIndex: 1, display: 'flex', gap: 16, alignItems: 'stretch',
    justifyContent: 'center', flexWrap: 'wrap', width: '94%', maxWidth: 860, maxHeight: '94vh' },
  card: { flex: '1 1 380px', textAlign: 'center', padding: '30px 26px', maxWidth: 480,
    background: 'rgba(18,26,38,0.7)', border: '1px solid rgba(16,185,129,0.22)', borderRadius: 22,
    backdropFilter: 'blur(10px)', boxShadow: '0 24px 70px -30px rgba(0,0,0,0.8)' },
  avatarRing: { width: 92, height: 92, margin: '0 auto', borderRadius: '50%', display: 'grid', placeItems: 'center',
    background: 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(16,185,129,0.25))', border: '2px solid rgba(16,185,129,0.5)' },
  hi: { margin: '0 0 6px', fontSize: 26, fontWeight: 800,
    background: 'linear-gradient(90deg,#67e8f9,#34d399,#67e8f9)', backgroundSize: '200% auto',
    WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
    animation: 'wrShine 4s linear infinite' },
  sub: { margin: 0, color: '#9fb4c4', fontSize: 14.5, lineHeight: 1.6 },
  tipBox: { marginTop: 16, padding: '14px 16px', borderRadius: 14, background: 'rgba(6,182,212,0.08)',
    border: '1px solid rgba(6,182,212,0.2)', textAlign: 'left' },
  tipLabel: { display: 'flex', alignItems: 'center', fontSize: 11, fontWeight: 800, letterSpacing: 1, color: '#67e8f9', marginBottom: 6, textTransform: 'uppercase' },
  tipText: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.5, minHeight: 42 },
  // Leaderboard — side panel
  lbBox: { flex: '1 1 300px', maxWidth: 360, alignSelf: 'stretch', overflowY: 'auto',
    padding: '18px 16px 14px', borderRadius: 18, background: 'rgba(245,158,11,0.06)',
    border: '1px solid rgba(245,158,11,0.22)', textAlign: 'left', backdropFilter: 'blur(10px)' },
  lbTitle: { display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fcd34d', marginBottom: 14, textAlign: 'center' },
  lbRow: { display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px', borderRadius: 10 },
  lbMe: { background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.3)' },
  lbRank: { width: 22, textAlign: 'center', fontWeight: 800, fontSize: 14, color: '#e2e8f0', flexShrink: 0 },
  lbAvatar: { width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  lbAvatarFallback: { background: 'linear-gradient(135deg,#06b6d4,#10b981)', color: '#04211d', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800 },
  lbName: { flex: 1, fontSize: 13.5, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  lbXp: { fontSize: 12.5, fontWeight: 800, color: '#34d399', flexShrink: 0 },
  lbDots: { textAlign: 'center', color: '#6b7280', fontSize: 16, lineHeight: 1 },
  lbHint: { marginTop: 8, fontSize: 11.5, color: '#9fb4c4', textAlign: 'center' },
};

// Activities view shown ON the class stage (host-only). Lists the coach's races +
// tournaments with live status; "Watch"/"Results" opens the leaderboard EMBEDDED here
// (no navigation, class video keeps running). Only "Create new" opens a new tab.
function ActivitiesStage({ races, tournaments, loading, onReload, onClose }) {
  const [watch, setWatch] = useState(null); // { kind:'race'|'tournament', roomId, id }
  const chip = (s) => {
    const m = {
      waiting: ['⏳ Waiting', '#fcd34d'], active: ['🔴 Live', '#f87171'],
      completed: ['✅ Done', '#6ee7b7'], cancelled: ['✖ Cancelled', '#94a3b8'],
      scheduled: ['⏳ Scheduled', '#fcd34d'], lobby: ['⏳ Lobby', '#fcd34d'],
      pairing_stopped: ['🔴 Live', '#f87171'], finished: ['✅ Done', '#6ee7b7'],
    };
    const [label, color] = m[s] || [s, '#e2e8f0'];
    return <span style={{ color, fontWeight: 700, fontSize: 12.5 }}>{label}</span>;
  };

  // Embedded leaderboard view (race). Tournaments deep-link out for now (their live
  // view is a bigger component) — races cover the common case.
  if (watch?.kind === 'race') {
    return (
      <div style={as.wrap}>
        <CoachArenaLive roomId={watch.roomId} embedded onBack={() => setWatch(null)} />
      </div>
    );
  }

  return (
    <div style={as.wrap}>
      <div style={as.head}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>🎯 Class activities</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={as.ghost} onClick={onReload}>↻ Refresh</button>
          {/* Only CREATE leaves the class (new tab) — everything else stays here. */}
          <a style={as.create} href="/arena/create?coach=1" target="_blank" rel="noopener noreferrer">＋ Create Race ↗</a>
          <a style={as.create} href="/arenatournament/create?coach=1" target="_blank" rel="noopener noreferrer">＋ Tournament ↗</a>
          <button style={as.ghost} onClick={onClose}>✕ Close</button>
        </div>
      </div>

      {loading ? (
        <div style={as.empty}>Loading your activities…</div>
      ) : (races.length === 0 && tournaments.length === 0) ? (
        <div style={as.empty}>No activities yet. Click <b>＋ Create Race</b> — it opens in a new tab; once created it shows here.</div>
      ) : (
        <div style={as.grid}>
          {races.map(r => (
            <div key={r._id} style={as.card}>
              <div style={as.cardName}>🏁 {r.name || 'Race'}</div>
              <div style={as.cardMeta}>{r.topic} · {r.timeLimit} min · {chip(r.status)}</div>
              <div style={as.cardSub}>{r.joined ?? 0}/{r.invited ?? 0} students joined</div>
              <button style={as.watch} onClick={() => setWatch({ kind: 'race', roomId: r.roomId })}>
                {r.status === 'completed' ? '📊 Results' : '👀 Watch live'}
              </button>
            </div>
          ))}
          {tournaments.map(t => (
            <div key={t._id} style={as.card}>
              <div style={as.cardName}>🏆 {t.name || 'Tournament'}</div>
              <div style={as.cardMeta}>{chip(t.status)} · {t.participantCount || 0} joined</div>
              {/* Tournament live view stays a route for now — opens in a new tab. */}
              <a style={as.watch} href={`/coach/arena-tournament/${t._id}`} target="_blank" rel="noopener noreferrer">
                {t.status === 'finished' ? '📊 Results ↗' : '👀 Watch ↗'}
              </a>
            </div>
          ))}
        </div>
      )}
      <div style={as.foot}>Students join from the link you share in class chat — they stay in this class in their own tab.</div>
    </div>
  );
}

const as = {
  wrap: { flex: 1, minWidth: 0, background: 'rgba(20,20,30,0.5)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16, overflowY: 'auto', maxHeight: 'calc(100vh - 120px)' },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 },
  ghost: { padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', cursor: 'pointer', fontSize: 13, textDecoration: 'none' },
  create: { padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(6,182,212,0.4)', background: 'rgba(6,182,212,0.12)', color: '#67e8f9', cursor: 'pointer', fontSize: 13, fontWeight: 700, textDecoration: 'none' },
  empty: { padding: 30, textAlign: 'center', color: 'rgba(226,232,240,0.6)', fontSize: 14, border: '1px dashed rgba(255,255,255,0.14)', borderRadius: 12 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 },
  card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14 },
  cardName: { fontSize: 15, fontWeight: 700, color: '#f1f5f9' },
  cardMeta: { fontSize: 12.5, color: '#a78bfa', margin: '6px 0' },
  cardSub: { fontSize: 12, color: 'rgba(226,232,240,0.6)', marginBottom: 10 },
  watch: { display: 'inline-block', padding: '7px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#06b6d4,#10b981)', color: '#04211d', fontWeight: 700, fontSize: 13, cursor: 'pointer', textDecoration: 'none' },
  foot: { marginTop: 14, fontSize: 12, color: '#6b7280', textAlign: 'center' },
};

export default function LiveClassroomPage({ mode = 'host' }) {
  // mode 'host' → :sessionId param (started from MyMeetings).
  // mode 'join' → :joinCode param (student via shareable link).
  const params = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const lk = useLiveKitRoom();

  const [session, setSession] = useState(null);
  const [isHost, setIsHost] = useState(mode === 'host');
  const [phase, setPhase] = useState('loading'); // loading | waiting | live | ended | error
  const phaseRef = useRef('loading');
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  const [note, setNote] = useState('');
  const [waiting, setWaiting] = useState([]); // host panel
  // Shared STUDY tree (move tree with variations) + current path. The board
  // position is derived from nodeAtPath(tree, path).fen. Everyone stays in sync.
  const [tree, setTree] = useState(() => buildTreeFromPgn(''));
  const [treePath, setTreePath] = useState([]);
  // Drawn arrows + square highlights on the board, synced to everyone.
  const [drawArrows, setDrawArrows] = useState([]);       // [{ from, to, color }]
  const [drawHighlights, setDrawHighlights] = useState({}); // { square: color }
  const [controllerId, setControllerId] = useState(null);     // board-move control
  const [screenSharerId, setScreenSharerId] = useState(null); // screen-share control
  // Board size — a single state the coach resizes by dragging the corner (like
  // the study/analysis board). No auto-fit fighting it. The INITIAL size scales
  // with the screen so it's not a tiny 440px board on a 32" monitor (was the
  // "nothing fits big screens" complaint); the coach can still drag to override.
  const [boardWidth, setBoardWidth] = useState(() => {
    if (typeof window === 'undefined') return 440;
    // ~40% of viewport width, clamped to a sensible board range. Big screen → big
    // board; laptop → the familiar ~440–520px.
    return Math.round(Math.max(420, Math.min(720, window.innerWidth * 0.4)));
  });
  const resizeStartX = useRef(0);
  const resizeStartW = useRef(500);
  const resizingRef = useRef(false);
  // Video-first layout (like Zoom): the stage shows the video grid by default;
  // the chessboard is a toggle. Screen share always takes the stage when active.
  const [showBoard, setShowBoard] = useState(false);
  // Zoom-style Participants panel (one-click list with per-person controls).
  const [showParticipants, setShowParticipants] = useState(false);
  const [waitingCollapsed, setWaitingCollapsed] = useState(false); // waiting room collapse
  const [movesCollapsed, setMovesCollapsed] = useState(false);     // collapse Moves → more room for videos
  const [sharePrompt, setSharePrompt] = useState(false);           // dark "share screen" pre-prompt
  // Where the class videos live. HOST chooses — the tracks never unmount, only
  // move: 'dock' (in the right rail), 'float' (draggable box over the board),
  // 'hidden' (off — a "Show video" pill brings them back), 'pop' (own window).
  // Videos are NEVER tied to what's on the stage, so screen-share keeps faces up.
  const [videoMode, setVideoMode] = useState('dock');
  const [floatPos, setFloatPos] = useState({ x: null, y: 96 });    // floating box position
  const [floatSize, setFloatSize] = useState({ w: 300, h: 250 });  // floating box size
  // Which inline device menu is open: 'mic' | 'cam' | null (the ˅ next to each icon).
  const [devMenu, setDevMenu] = useState(null);
  // Video-effects panel (light / touch-up / blur) open state.
  const [fxOpen, setFxOpen] = useState(false);
  const [camInfoOpen, setCamInfoOpen] = useState(false); // host camera diagnostics modal
  // "Activities" as a STAGE VIEW (host-only): like the teaching board, the coach can
  // put the activities list on the stage — create (new tab), watch live leaderboards,
  // open finished results — all inside the class, video keeps running. Not broadcast
  // to students; only the host sees it.
  const [showActivities, setShowActivities] = useState(false);
  const [actRaces, setActRaces] = useState([]);
  const [actTournaments, setActTournaments] = useState([]);
  const [actLoading, setActLoading] = useState(false);
  const loadActivities = async () => {
    setActLoading(true);
    try {
      const [rc, tr] = await Promise.all([
        api.get('/api/coach-arena/races').catch(() => ({ data: { races: [] } })),
        api.get('/api/coach-arena/tournaments').catch(() => ({ data: { tournaments: [] } })),
      ]);
      setActRaces(rc.data?.races || []);
      setActTournaments(tr.data?.tournaments || []);
    } finally { setActLoading(false); }
  };
  // Training puzzles in the classroom (practice, no ratings written).
  const [puzzle, setPuzzle] = useState(null);        // { id, fen, solution:[SAN] } (host only)
  const [puzzleStep, setPuzzleStep] = useState(0);   // index into solution (solver moves at even steps)
  const [puzzleStatus, setPuzzleStatus] = useState(''); // '', 'correct', 'wrong', 'solved'
  const [puzzleMode, setPuzzleMode] = useState(null);   // 'healthymix' | 'theme' | 'pieces' | 'rating'
  const [puzzleTheme, setPuzzleTheme] = useState('');
  const [puzzlePieces, setPuzzlePieces] = useState('');
  const [puzzleThemes, setPuzzleThemes] = useState([]);
  const [ratingMin, setRatingMin] = useState(400);
  const [ratingMax, setRatingMax] = useState(800);
  // Board editor (reused PositionEditor pieces) — set up any position by dragging.
  // Host-only in-browser Stockfish (top 3 lines) — private to the host, never
  // broadcast to students, nothing saved. Off by default.
  const [engineOn, setEngineOn] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorChess, setEditorChess] = useState(() => new Chess());
  const [editorPiece, setEditorPiece] = useState(undefined); // undefined=drag, null=erase, string=place
  // Host: load a position/game onto the shared board (paste FEN or PGN, like Quick Analyze).
  const [loadText, setLoadText] = useState('');
  const [loadErr, setLoadErr] = useState('');
  // Host: content source — studies / courses / library / puzzles / games / paste.
  const [contentTab, setContentTab] = useState('studies');
  // Games importer (review a student's recent Lichess / Chess.com games on the board).
  const [gamePlatform, setGamePlatform] = useState('lichess'); // 'lichess' | 'chesscom'
  const [gameUser, setGameUser] = useState('');
  const [gameMax, setGameMax] = useState(5);
  const [fetchedGames, setFetchedGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [gamesErr, setGamesErr] = useState('');
  // Studies picker (source → study → chapter → positions list beside the board).
  const [studySource, setStudySource] = useState('mine'); // mine | public | nexus
  const [studies, setStudies] = useState([]);
  const [pickStudy, setPickStudy] = useState('');
  const [pickChapter, setPickChapter] = useState('');
  const [positions, setPositions] = useState([]); // [{ fen, title }]
  const [posLoading, setPosLoading] = useState(false);
  // Courses + Library
  const [courses, setCourses] = useState([]);
  const [pickCourse, setPickCourse] = useState('');
  const [libraryItems, setLibraryItems] = useState([]);

  const myId = user && (user.id || user._id);
  const iControl = isHost || (controllerId && String(controllerId) === String(myId));   // can move the board
  const iCanShare = isHost || (screenSharerId && String(screenSharerId) === String(myId)); // can share screen

  // Current position derived from the shared tree + path.
  const curNode = nodeAtPath(tree, treePath);
  const curFen = curNode?.fen || new Chess().fen();
  const lastMove = curNode && curNode.from ? { from: curNode.from, to: curNode.to } : null;

  // Broadcast the current tree + path to the class (host/controller only).
  const broadcastTree = (t, p) => {
    if (session) socket.emit('liveclass:tree', { sessionId: session.id, tree: t, path: p });
  };

  // Coach/controller drew arrows or highlighted squares → broadcast to everyone.
  const onBoardDrawing = ({ arrows, highlights }) => {
    if (!iControl) return;
    setDrawArrows(arrows); setDrawHighlights(highlights);
    if (session) socket.emit('liveclass:draw', { sessionId: session.id, arrows, highlights });
  };

  // Keep a stable handle to the LiveKit connect fn so callbacks/effects don't
  // depend on the hook's return object (which is a new reference every render —
  // depending on it caused a re-render loop / screen blinking).
  const lkConnectRef = useRef(lk.connect);
  useEffect(() => { lkConnectRef.current = lk.connect; }, [lk.connect]);

  // ── Enter the LiveKit room with a server-minted token ────────────────────────
  // Stable identity (empty deps) — reads the live connect fn via the ref.
  // The classroom (board + waiting room + countdown) works WITHOUT LiveKit; only
  // audio/video needs the SFU. So a 503 (SFU not configured yet) must NOT drop the
  // user out of the class — it just shows a "no video" note.
  const enterRoom = useCallback(async (joinCode) => {
    let r;
    try {
      r = await api.post(`/api/coach-live/join/${joinCode}/token`);
    } catch (e) {
      const status = e.response?.status;
      if (status === 403) { setPhase('waiting'); setNote('Waiting for the coach to let you in…'); return; }
      if (status === 503) {
        // SFU not set up yet — stay in the class, just no A/V.
        setPhase('live');
        setNote('Video/audio is off — the meeting server isn\'t configured yet. The board and class still work.');
        return;
      }
      setPhase('error'); setNote(e.response?.data?.message || 'Could not join.');
      return;
    }
    const { token, url, session: sess, isHost: host } = r.data;
    if (sess) { setSession(sess); setIsHost(host); setControllerId(sess.controllerId || null); setScreenSharerId(sess.screenSharerId || null);
      // The current study tree arrives via the socket join (liveclass:tree).
      socket.emit('liveclass:join', { sessionId: sess.id }); }
    setPhase('live');
    setNote('');  // clear any "waiting for the coach…" text now that we're in
    if (url && token) {
      try { await lkConnectRef.current({ url, token }); }
      catch { setNote('Video unavailable right now. The board and class still work.'); }
    }
  }, []);

  // Student: announce myself to the waiting room. If the class hasn't started yet
  // (409), stay on the waiting screen — the socket signal + poll retry when it does.
  const tryJoinWaiting = useCallback(async () => {
    try {
      await api.post(`/api/coach-live/join/${params.joinCode}/wait`);
      setPhase('waiting'); setNote('Waiting for the coach to let you in…');
      return true;
    } catch (e) {
      if (e.response?.status === 409) {
        setPhase('waiting'); setNote('Class hasn\'t started yet — hang tight, you\'ll join automatically.');
        return false;
      }
      setPhase('error'); setNote(e.response?.data?.message || 'Could not join this class.');
      return false;
    }
  }, [params.joinCode]);

  // ── Bootstrap by mode ────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      if (mode === 'host') {
        try {
          const r = await api.get(`/api/coach-live/sessions/${params.sessionId}`);
          if (!alive) return;
          const sess = r.data.session;
          setSession(sess); setIsHost(true); setControllerId(sess.controllerId || null); setScreenSharerId(sess.screenSharerId || null);
          // The current study tree arrives via the socket join (liveclass:tree).
          // Host enters via the meeting's joinCode → need it: derive from token endpoint by roomName? Simpler: host uses a dedicated token call by session.
          setPhase('live');
          socket.emit('liveclass:join', { sessionId: sess.id });
          // Host token: reuse join token via the meeting joinCode is not known here,
          // so the host token is minted through the same endpoint keyed by joinCode.
          // MyMeetings passes us here after /start; fetch the meeting's joinCode:
          const mr = await api.get(`/api/coach-live/meetings`);
          const meeting = (mr.data || []).find(m => String(m.id) === String(sess.meetingId));
          if (meeting) await enterRoom(meeting.joinCode);
        } catch (e) {
          if (alive) { setPhase('error'); setNote(e.response?.data?.message || 'Could not open the classroom.'); }
        }
      } else {
        // Student via link: resolve. If not started yet, sit on the waiting screen
        // and let the socket signal + poll (below) announce us once it goes live.
        try {
          const r = await api.get(`/api/coach-live/join/${params.joinCode}`);
          if (!alive) return;
          if (r.data.isHost) { await enterRoom(params.joinCode); return; }
          await tryJoinWaiting();
        } catch (e) {
          if (alive) { setPhase('error'); setNote(e.response?.data?.message || 'Could not join this class.'); }
        }
      }
    })();
    return () => { alive = false; };
  }, [mode, params.sessionId, params.joinCode, enterRoom, tryJoinWaiting]);

  // Student stuck on "not started yet": jump in the instant the coach starts.
  // (a) immediate socket signal for THIS meeting, (b) a slow poll as a safety net.
  useEffect(() => {
    if (mode !== 'join') return;
    const onStarted = ({ joinCode }) => {
      if (String(joinCode) === String(params.joinCode) && phaseRef.current === 'waiting') {
        tryJoinWaiting();
      }
    };
    socket.on('liveclass:started', onStarted);
    const id = setInterval(() => {
      if (phaseRef.current !== 'waiting') return;
      api.get(`/api/coach-live/join/${params.joinCode}`)
        .then(r => { if (r.data?.live) tryJoinWaiting(); })
        .catch(() => {});
    }, 5000);
    return () => { socket.off('liveclass:started', onStarted); clearInterval(id); };
  }, [mode, params.joinCode, tryJoinWaiting]);

  // ── Socket wiring: board sync, control, admit/remove, ended ──────────────────
  // Subscribe ONCE (stable deps). Handlers reach live values via refs so this
  // effect never re-runs on state changes (which would thrash socket listeners).
  const lkDisconnectRef = useRef(lk.disconnect);
  useEffect(() => { lkDisconnectRef.current = lk.disconnect; }, [lk.disconnect]);
  const hostStateRef = useRef({ isHost, session });
  useEffect(() => { hostStateRef.current = { isHost, session }; }, [isHost, session]);
  const refreshWaitingRef = useRef(null);
  // Stable refs so the (once-subscribed) socket handlers see live control/id values.
  const controllerRef = useRef(controllerId);
  useEffect(() => { controllerRef.current = controllerId; }, [controllerId]);
  const screenSharerRef = useRef(screenSharerId);
  useEffect(() => { screenSharerRef.current = screenSharerId; }, [screenSharerId]);
  const myIdRef = useRef(myId);
  useEffect(() => { myIdRef.current = myId; }, [myId]);

  useEffect(() => {
    // The shared study tree + current path — everyone follows the host/controller.
    const onTree = ({ tree: t, path: p }) => { if (t) { setTree(t); setTreePath(Array.isArray(p) ? p : []); } };
    // Coach's drawn arrows + square highlights — everyone follows.
    const onDraw = ({ arrows, highlights }) => {
      if (hostStateRef.current.isHost) return; // host has the source of truth
      setDrawArrows(Array.isArray(arrows) ? arrows : []);
      setDrawHighlights(highlights && typeof highlights === 'object' ? highlights : {});
    };
    // Board control — no token change needed (board moves are gated client-side
    // + via the board-sync socket, not the LiveKit token).
    const onControl = ({ controllerId: cid }) => setControllerId(cid);
    // Screen-share control — this IS in the LiveKit token, so when MY screen-share
    // permission changes, re-fetch the token & reconnect to apply the new grant.
    const onScreenShare = ({ screenSharerId: sid }) => {
      const prev = screenSharerRef.current;
      setScreenSharerId(sid);
      if (!hostStateRef.current.isHost && mode === 'join') {
        const meNow = String(sid || '') === String(myIdRef.current);
        const meWas = String(prev || '') === String(myIdRef.current);
        if (meNow !== meWas) enterRoom(params.joinCode);
      }
    };
    const onAdmitted = () => { if (mode === 'join') enterRoom(params.joinCode); };
    const onRemoved = () => { setPhase('error'); setNote('The coach didn\'t admit you to this class.'); };
    const onEnded = () => { setPhase('ended'); lkDisconnectRef.current?.(); };
    const onWaiting = () => { const { isHost: h, session: se } = hostStateRef.current; if (h && se) refreshWaitingRef.current?.(); };
    // The coach controls the stage — students follow whether the teaching board is shown.
    const onStage = ({ boardShown }) => { if (!hostStateRef.current.isHost) setShowBoard(!!boardShown); };
    socket.on('liveclass:tree', onTree);
    socket.on('liveclass:draw', onDraw);
    socket.on('liveclass:control', onControl);
    socket.on('liveclass:screenshare', onScreenShare);
    socket.on('liveclass:admitted', onAdmitted);
    socket.on('liveclass:removed', onRemoved);
    socket.on('liveclass:ended', onEnded);
    socket.on('liveclass:waiting-updated', onWaiting);
    socket.on('liveclass:stage', onStage);
    return () => {
      socket.off('liveclass:tree', onTree); socket.off('liveclass:draw', onDraw); socket.off('liveclass:control', onControl);
      socket.off('liveclass:screenshare', onScreenShare);
      socket.off('liveclass:admitted', onAdmitted); socket.off('liveclass:removed', onRemoved);
      socket.off('liveclass:ended', onEnded); socket.off('liveclass:waiting-updated', onWaiting);
      socket.off('liveclass:stage', onStage);
    };
  }, [mode, params.joinCode, enterRoom]);

  // ── Socket reconnect recovery ────────────────────────────────────────────────
  // When the socket drops (e.g. host/student internet blip) it leaves all rooms.
  // On reconnect we must re-join the session's socket room and, for the host,
  // re-fetch the waiting list + participants — otherwise the host rejoins "blind"
  // and can't see students. Admitted students simply re-join their room and stay
  // in the class (they are never bounced to waiting).
  useEffect(() => {
    const onReconnect = () => {
      const { isHost: h, session: se } = hostStateRef.current;
      if (!se) return;
      socket.emit('liveclass:join', { sessionId: se.id });
      if (h) refreshWaitingRef.current?.();
    };
    socket.on('connect', onReconnect);
    socket.io.on('reconnect', onReconnect);
    return () => { socket.off('connect', onReconnect); socket.io.off('reconnect', onReconnect); };
  }, []);

  // ── Host: poll/refresh the waiting list ──────────────────────────────────────
  const refreshWaiting = useCallback(async () => {
    if (!session) return;
    try { const r = await api.get(`/api/coach-live/sessions/${session.id}/waiting`); setWaiting(r.data.participants || []); }
    catch { /* */ }
  }, [session]);
  useEffect(() => { refreshWaitingRef.current = refreshWaiting; }, [refreshWaiting]);
  useEffect(() => {
    if (!isHost || !session) return;
    refreshWaiting();
    const id = setInterval(refreshWaiting, 8000);
    return () => clearInterval(id);
  }, [isHost, session, refreshWaiting]);

  // ── Host: load studies for the chosen source (mine / public / nexus) ─────────
  useEffect(() => {
    if (!isHost) return;
    let alive = true;
    setPickStudy(''); setPickChapter(''); setPositions([]);
    api.get(`/api/coach-live/studies?source=${studySource}`)
      .then(r => { if (alive) setStudies(r.data?.studies || []); })
      .catch(() => { if (alive) setStudies([]); });
    return () => { alive = false; };
  }, [isHost, studySource]);

  // When a study+chapter is chosen, load that chapter's positions.
  useEffect(() => {
    if (!isHost || !pickStudy || !pickChapter) { setPositions([]); return; }
    let alive = true;
    setPosLoading(true);
    api.get(`/api/coach-live/studies/${studySource}/${pickStudy}/${pickChapter}/positions`)
      .then(r => { if (alive) setPositions(r.data?.positions || []); })
      .catch(() => { if (alive) setPositions([]); })
      .finally(() => { if (alive) setPosLoading(false); });
    return () => { alive = false; };
  }, [isHost, studySource, pickStudy, pickChapter]);

  // Load courses / library on demand when their tab opens.
  useEffect(() => {
    if (!isHost || contentTab !== 'courses' || courses.length) return;
    api.get('/api/coach-live/courses').then(r => setCourses(r.data?.courses || [])).catch(() => {});
  }, [isHost, contentTab, courses.length]);
  useEffect(() => {
    if (!isHost || contentTab !== 'library' || libraryItems.length) return;
    api.get('/api/coach-live/library').then(r => setLibraryItems(r.data?.items || [])).catch(() => {});
  }, [isHost, contentTab, libraryItems.length]);
  useEffect(() => {
    if (!isHost || contentTab !== 'puzzles' || puzzleThemes.length) return;
    api.get('/api/coach-live/puzzle/themes').then(r => setPuzzleThemes(r.data?.themes || [])).catch(() => {});
  }, [isHost, contentTab, puzzleThemes.length]);


  // ── Board resize (drag the corner triangle) — same as the study/analysis board ──
  // Track viewport height so we can auto-grow the board in fullscreen for viewers.
  const [vpH, setVpH] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  const [vpW, setVpW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffect(() => {
    const onR = () => { setVpH(window.innerHeight); setVpW(window.innerWidth); };
    window.addEventListener('resize', onR);
    document.addEventListener('fullscreenchange', onR);
    return () => { window.removeEventListener('resize', onR); document.removeEventListener('fullscreenchange', onR); };
  }, []);
  // On narrow screens the stage + rail can't sit side by side, so let them stack
  // (wrap) instead of forcing the video rail off-screen.
  const isNarrow = vpW < 1000;
  // The host/controller keeps their draggable size. A VIEWER (student) can't drag,
  // so their board AUTO-FITS the available height — and grows big in fullscreen.
  const viewerFit = Math.max(320, Math.min(vpH - 170, window.innerWidth - 360, 820));
  const shownBoardW = iControl ? boardWidth : viewerFit;
  // The Chessboard reserves a 32px coordinate gutter each side, but we crop the
  // empty top+right gutter (see the wrapper's negative margins), so the board's
  // effective on-screen box is ~boardWidth + one gutter. Use this for the column
  // width and the Moves-panel height so everything lines up.
  const boardBoxSize = shownBoardW + 34;
  const onResizeMove = useCallback((e) => {
    if (!resizingRef.current) return;
    e.preventDefault();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const max = Math.min(820, window.innerWidth - 100);
    setBoardWidth(Math.max(320, Math.min(max, resizeStartW.current + (x - resizeStartX.current))));
  }, []);
  const onResizeEnd = useCallback(() => {
    resizingRef.current = false;
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeEnd);
    document.removeEventListener('touchmove', onResizeMove);
    document.removeEventListener('touchend', onResizeEnd);
    document.body.style.cursor = 'default';
  }, [onResizeMove]);
  const onResizeStart = useCallback((e) => {
    e.preventDefault();
    resizingRef.current = true;
    resizeStartX.current = e.touches ? e.touches[0].clientX : e.clientX;
    resizeStartW.current = boardWidth;
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeEnd);
    document.addEventListener('touchmove', onResizeMove, { passive: false });
    document.addEventListener('touchend', onResizeEnd);
    document.body.style.cursor = 'nwse-resize';
  }, [boardWidth, onResizeMove, onResizeEnd]);

  // Apply a new tree+path locally and broadcast to the class.
  const applyTree = (t, p) => { setTree(t); setTreePath(p); broadcastTree(t, p); clearDrawings(); };
  // Clear drawn arrows/highlights (on a move or navigation) and tell everyone.
  const clearDrawings = () => {
    setDrawArrows([]); setDrawHighlights({});
    if (session) socket.emit('liveclass:draw', { sessionId: session.id, arrows: [], highlights: {} });
  };

  // Normalize SAN for comparison (strip check/mate marks, lowercase).
  const normSan = (s) => String(s || '').replace(/[+#]/g, '').toLowerCase();

  // Load a training puzzle onto the board (host only). Loads its FEN as a fresh
  // tree and enters "puzzle mode" so moves are checked against the solution.
  const loadPuzzle = async (mode) => {
    if (!isHost) return;
    setPuzzleStatus(''); setPuzzleStep(0);
    const params = new URLSearchParams({ min: String(ratingMin), max: String(ratingMax) });
    if (mode === 'theme' && puzzleTheme) params.set('theme', puzzleTheme);
    if (mode === 'pieces' && puzzlePieces) params.set('pieces', puzzlePieces);
    if (puzzle?.id) params.set('exclude', puzzle.id); // avoid repeating the last one
    try {
      const r = await api.get(`/api/coach-live/puzzle/next?${params.toString()}`);
      const pz = r.data?.puzzle;
      if (!pz?.fen) { setPuzzleStatus('none'); return; }
      setPuzzle(pz); setPuzzleMode(mode); setPuzzleStep(0); setPuzzleStatus('');
      // Load the position as a fresh tree; the board goes to the solver's turn.
      applyTree(buildTreeFromPgn(`[FEN "${pz.fen}"]\n\n*`), []);
      if (!showBoard) toggleBoard();
    } catch { setPuzzleStatus('none'); }
  };

  // Exit puzzle mode back to free study.
  const exitPuzzle = () => { setPuzzle(null); setPuzzleMode(null); setPuzzleStatus(''); setPuzzleStep(0); };

  // ── Host/controller move ─────────────────────────────────────────────────────
  // In PUZZLE mode: check the move against the solution, auto-play the reply, show
  // right/wrong. Otherwise: free-style move that branches into the shared tree.
  const onDrop = (from, to, promotion) => {
    if (!iControl) return false;
    const c = new Chess(curFen);
    let mv;
    try { mv = c.move({ from, to, promotion: promotion || 'q' }); } catch { return false; }
    if (!mv) return false;

    // Puzzle checking (only when a puzzle is loaded and we have its solution).
    if (puzzle && puzzle.solution && puzzle.solution.length) {
      const expected = puzzle.solution[puzzleStep];
      const isRightMove = normSan(mv.san) === normSan(expected) || c.isCheckmate();
      if (!isRightMove) {
        // Wrong — flash red, don't commit the move (board stays at the puzzle pos).
        setPuzzleStatus('wrong');
        setTimeout(() => setPuzzleStatus(''), 1200);
        return false;
      }
      // Correct solver move — commit it, then auto-play the opponent's reply.
      let stepAfter = puzzleStep + 1;
      let node = { san: mv.san, fen: c.fen(), from: mv.from, to: mv.to };
      let cloned = JSON.parse(JSON.stringify(tree));
      let res = addMove(cloned, treePath, node);
      // Opponent reply (next solution move), if the line continues.
      if (stepAfter < puzzle.solution.length && !c.isCheckmate()) {
        const reply = puzzle.solution[stepAfter];
        try {
          const rmv = c.move(reply);
          if (rmv) {
            res = addMove(res.root, res.path, { san: rmv.san, fen: c.fen(), from: rmv.from, to: rmv.to });
            stepAfter += 1;
          }
        } catch { /* no reply */ }
      }
      setPuzzleStep(stepAfter);
      applyTree(res.root, res.path);
      setPuzzleStatus(stepAfter >= puzzle.solution.length || c.isCheckmate() ? 'solved' : 'correct');
      if (!(stepAfter >= puzzle.solution.length || c.isCheckmate())) setTimeout(() => setPuzzleStatus(''), 900);
      return true;
    }

    // Free-style: branch into the shared study tree.
    const cloned = JSON.parse(JSON.stringify(tree));
    const { root, path } = addMove(cloned, treePath, { san: mv.san, fen: c.fen(), from: mv.from, to: mv.to });
    applyTree(root, path);
    return true;
  };

  // Jump to any node (clicking the SAN notation) — syncs to everyone.
  const goToPath = (p) => { setTreePath(p); broadcastTree(tree, p); clearDrawings(); };
  const stepBack = () => { if (treePath.length) goToPath(treePath.slice(0, -1)); };
  const stepFwd = () => {
    const n = nodeAtPath(tree, treePath);
    if (n && n.children.length) goToPath([...treePath, n.children[0].id]);
  };
  const goStart = () => goToPath([]);
  const goEnd = () => goToPath(getMainlinePath(tree));

  // Host-only: show/hide the teaching board for EVERYONE (broadcast via socket).
  const toggleBoard = () => {
    const next = !showBoard;
    setShowBoard(next);
    if (session) socket.emit('liveclass:stage', { sessionId: session.id, boardShown: next });
  };

  // Load a PGN (a game) as a fresh study tree — coach can then free-style/branch.
  const loadPgnIntoTree = (pgn) => {
    const t = buildTreeFromPgn(pgn || '');
    applyTree(t, []); // start at the initial position; step forward through the game
    if (!showBoard) toggleBoard();
  };
  // Load a single FEN position as a fresh tree rooted at that position.
  const setBoardFen = (fen) => {
    let start;
    try { start = new Chess(fen).fen(); } catch { return false; }
    // A one-node tree whose root IS the position; moves branch from here.
    const t = buildTreeFromPgn(`[FEN "${start}"]\n\n*`);
    applyTree(t, []);
    if (!showBoard) toggleBoard();
    return true;
  };

  const loadMasterGame = async (id) => {
    try {
      const r = await api.get(`/api/coach-live/master-game/${id}/pgn`);
      if (r.data?.pgn) loadPgnIntoTree(r.data.pgn);
    } catch { /* ignore */ }
  };

  // Fetch a student's recent Lichess / Chess.com games (raw, no analysis).
  const fetchStudentGames = async () => {
    const u = gameUser.trim();
    if (!u) return;
    setGamesLoading(true); setGamesErr(''); setFetchedGames([]);
    try {
      const r = await api.get('/api/coach-live/import-games', {
        params: { platform: gamePlatform, username: u, max: gameMax },
      });
      setFetchedGames(Array.isArray(r.data?.games) ? r.data.games : []);
    } catch (e) {
      setGamesErr(e.response?.data?.message || 'Could not fetch games.');
    } finally { setGamesLoading(false); }
  };

  // Load a fetched game onto the live board (syncs to all students via applyTree).
  const loadFetchedGame = (g) => {
    if (g?.pgn) loadPgnIntoTree(g.pgn);
  };

  // Smart-load a course lesson / library item by its kind.
  const loadItem = async (item) => {
    if (!item) return;
    if (item.kind === 'position' && item.fen) { setBoardFen(item.fen); return; }
    if (item.kind === 'game' && item.masterGameId) { await loadMasterGame(item.masterGameId); return; }
    if (item.kind === 'study' && item.studyId && item.chapterId) {
      try {
        const r = await api.get(`/api/coach-live/studies/${item.source || 'mine'}/${item.studyId}/${item.chapterId}/positions`);
        setPositions(r.data?.positions || []);
        if (!showBoard) toggleBoard();
      } catch { /* ignore */ }
    }
  };

  // Host loads pasted FEN or PGN.
  const loadPosition = () => {
    setLoadErr('');
    const text = loadText.trim();
    if (!text) return;
    const looksFen = /\//.test(text) && !/\d+\.\s/.test(text) && text.split(/\s+/).length <= 8;
    if (looksFen) {
      if (!setBoardFen(text)) setLoadErr('That doesn’t look like a valid FEN.');
      return;
    }
    try {
      const c = new Chess(); c.loadPgn(text); // validate
      loadPgnIntoTree(c.pgn());
    } catch {
      setLoadErr('Could not read that FEN/PGN. Check and try again.');
    }
  };

  const resetBoard = () => { applyTree(buildTreeFromPgn(''), []); };

  // ── Board editor (reused PositionEditor pieces) ──────────────────────────────
  const openEditor = () => {
    // Seed the editor from the current board position.
    try { setEditorChess(new Chess(curFen, { skipValidation: true })); } catch { setEditorChess(new Chess()); }
    setEditorPiece(undefined);
    setEditorOpen(true);
  };
  const editorFenChange = (fen) => {
    try { setEditorChess(new Chess(fen, { skipValidation: true })); } catch { /* */ }
  };
  const editorClear = () => setEditorChess(new Chess('8/8/8/8/8/8/8/8 w - - 0 1', { skipValidation: true }));
  const editorStart = () => setEditorChess(new Chess());
  // Push the edited position to the live board (validate king count first).
  const editorLoad = () => {
    const b = editorChess.board(); let wk = 0, bk = 0;
    for (const row of b) for (const sq of row) { if (sq?.type === 'k') { sq.color === 'w' ? wk++ : bk++; } }
    if (wk !== 1 || bk !== 1) { setLoadErr('Each side needs exactly one king.'); return; }
    setLoadErr('');
    setBoardFen(editorChess.fen());
    setEditorOpen(false);
  };

  // ── Host actions ─────────────────────────────────────────────────────────────
  const admit = async (studentId, outcome) => {
    try { await api.post(`/api/coach-live/sessions/${session.id}/admit`, { studentId, outcome }); refreshWaiting(); }
    catch (e) { alert(e.response?.data?.message || 'Could not admit.'); }
  };
  const removeStu = async (studentId) => {
    try { await api.post(`/api/coach-live/sessions/${session.id}/remove`, { studentId }); refreshWaiting(); }
    catch { /* */ }
  };
  const grant = async (studentId) => { try { await api.post(`/api/coach-live/sessions/${session.id}/grant-control`, { studentId }); } catch { /* */ } };
  const revoke = async () => { try { await api.post(`/api/coach-live/sessions/${session.id}/revoke-control`); } catch { /* */ } };
  const grantShare = async (studentId) => { try { await api.post(`/api/coach-live/sessions/${session.id}/grant-screenshare`, { studentId }); } catch { /* */ } };
  const revokeShare = async () => { try { await api.post(`/api/coach-live/sessions/${session.id}/revoke-screenshare`); } catch { /* */ } };
  const endClass = async () => {
    if (!window.confirm('End the class for everyone?')) return;
    try { await api.post(`/api/coach-live/sessions/${session.id}/end`); } catch { /* */ }
    setPhase('ended'); lk.disconnect();
  };
  const autoEnd = useCallback(async () => {
    if (isHost && session) { try { await api.post(`/api/coach-live/sessions/${session.id}/end`); } catch { /* */ } }
    setPhase('ended'); lk.disconnect();
  }, [isHost, session, lk]);

  // Am I currently the one screen-sharing? (computed before hooks that need it)
  const iAmSharing = !!lk.participants.find(p => p.screenTrack && p.isLocal);

  // Fullscreen toggle (the whole classroom). Browsers need a user click to enter.
  const [isFs, setIsFs] = useState(false);
  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) { document.exitFullscreen?.(); }
    else { document.documentElement.requestFullscreen?.().catch(() => {}); }
  };

  // In-PAGE fullscreen. Unlike the detached PiP window — where Chromium blocks both
  // real fullscreen AND large resizing — the main tab's Fullscreen API works. When the
  // video grid is on the stage we fullscreen JUST the grid (edge-to-edge faces); when a
  // board/screen is on the stage instead, we fullscreen the whole class page. Either
  // way the ⛶ button always does something useful and is always reachable.
  const videoGridRef = useRef(null);
  const toggleVideoFullscreen = () => {
    if (document.fullscreenElement) { document.exitFullscreen?.(); return; }
    const el = videoGridRef.current || document.documentElement;
    el.requestFullscreen?.().catch(() => {});
  };

  // ── Floating control bar while sharing (Document Picture-in-Picture) ──────────
  // A website can't draw over other windows, but Chrome/Edge's Document PiP lets us
  // pop a small always-on-top window with the class controls, so the presenter can
  // mute / toggle camera / stop share / open participants without tabbing back —
  // the Zoom-style floating bar. No-ops gracefully where the API isn't supported.
  const pipWinRef = useRef(null);
  // Live handles so the PiP buttons always call the latest functions/state.
  const pipApi = useRef({});
  pipApi.current = {
    micOn: lk.micOn, camOn: lk.camOn,
    toggleMic: lk.toggleMic, toggleCam: lk.toggleCam, toggleScreen: lk.toggleScreen,
    openParticipants: () => setShowParticipants(true),
  };

  useEffect(() => {
    const dpip = window.documentPictureInPicture;
    // Close the PiP as soon as sharing stops (or on unmount).
    const closePip = () => { try { pipWinRef.current?.close(); } catch { /* */ } pipWinRef.current = null; };
    if (!iAmSharing || !dpip) { closePip(); return; }

    let cancelled = false;
    (async () => {
      try {
        const pip = await dpip.requestWindow({ width: 260, height: 92 });
        if (cancelled) { try { pip.close(); } catch { /* */ } return; }
        pipWinRef.current = pip;

        const doc = pip.document;
        doc.body.style.cssText = 'margin:0;background:#0f141c;font-family:Poppins,Segoe UI,sans-serif;color:#e2e8f0;';
        doc.body.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:6px;padding:10px 12px">
            <div style="font-size:12px;color:#a7f3d0;font-weight:700">🔴 You’re sharing — class controls</div>
            <div style="display:flex;gap:8px">
              <button id="p-mic" style="flex:1"></button>
              <button id="p-cam" style="flex:1"></button>
              <button id="p-people" style="flex:1">👥</button>
              <button id="p-stop" style="flex:1;background:#dc2626;color:#fff">Stop</button>
            </div>
          </div>`;
        const btnCss = 'padding:7px 6px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);color:#e2e8f0;font-size:14px;cursor:pointer';
        doc.querySelectorAll('button').forEach(b => { b.style.cssText += btnCss; });

        const mic = doc.getElementById('p-mic');
        const cam = doc.getElementById('p-cam');
        // Zoom-style inline-SVG icons (raw DOM here — can't use the React components).
        const slash = '<line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" opacity="0.9"/>';
        const micSvg = (off) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:-3px"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M6 11a6 6 0 0 0 12 0" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>${off ? slash : ''}</svg>`;
        const camSvg = (off) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:-3px"><rect x="2.5" y="6.5" width="12.5" height="11" rx="2.5" fill="currentColor"/><path d="M15 10.5 L21 7.5 V16.5 L15 13.5 Z" fill="currentColor"/>${off ? slash : ''}</svg>`;
        const paint = () => {
          mic.style.color = pipApi.current.micOn ? '#e2e8f0' : '#f87171';
          cam.style.color = pipApi.current.camOn ? '#e2e8f0' : '#f87171';
          mic.innerHTML = `${micSvg(!pipApi.current.micOn)} ${pipApi.current.micOn ? 'Mic' : 'Muted'}`;
          cam.innerHTML = `${camSvg(!pipApi.current.camOn)} ${pipApi.current.camOn ? 'Cam' : 'Off'}`;
        };
        paint();
        mic.onclick = async () => { await pipApi.current.toggleMic(); paint(); };
        cam.onclick = async () => { await pipApi.current.toggleCam(); paint(); };
        doc.getElementById('p-people').onclick = () => pipApi.current.openParticipants();
        doc.getElementById('p-stop').onclick = () => pipApi.current.toggleScreen();
        // Keep icons fresh if state changes elsewhere.
        const iv = setInterval(paint, 1000);
        pip.addEventListener('pagehide', () => clearInterval(iv));
      } catch { /* PiP blocked/unsupported — fall back to the in-page banner */ }
    })();
    return () => { cancelled = true; closePip(); };
  }, [iAmSharing]);

  // ── POP-OUT class video (host chose ⧉ Pop out) ──────────────────────────────
  // Opens a REAL separate window and attaches each participant's live LiveKit video
  // track to a <video> inside it — so the host can drag it to a 2nd monitor while the
  // board fills the main screen. Closing the window pins the videos back into the page.
  const popWinRef = useRef(null);
  useEffect(() => {
    if (!isHost || videoMode !== 'pop') { try { popWinRef.current?.close(); } catch { /* */ } popWinRef.current = null; return; }
    const dpip = window.documentPictureInPicture;
    if (!dpip) { setNote('Pop-out needs a Chromium browser (Chrome/Edge). Videos kept in the page.'); setVideoMode('dock'); return; }

    // Derive the people directly from LiveKit here (this hook runs before `tiles` is
    // defined, so we must NOT reference it — that caused a "before initialization" crash).
    const popTiles = (lk.connected && lk.participants.length > 0)
      ? lk.participants
      : [{ identity: '__me__', isLocal: true, name: (user?.displayName || user?.username || 'You'), videoTrack: null, avatar: user?.profilePhotoUrl || null }];

    let cancelled = false;
    const attached = []; // [{track, el}] to detach on teardown
    (async () => {
      try {
        // Open as large as the screen allows. The browser still caps how tall a PiP
        // window can be dragged — the reliable way to truly fill the screen is the
        // Fullscreen button below (requestFullscreen), NOT dragging/maximizing.
        const w = Math.round((window.screen?.availWidth || 1280) * 0.95);
        const h = Math.round((window.screen?.availHeight || 800) * 0.95);
        const pip = await dpip.requestWindow({ width: w, height: h });
        if (cancelled) { try { pip.close(); } catch { /* */ } return; }
        popWinRef.current = pip;
        const doc = pip.document;
        doc.body.style.cssText = 'margin:0;background:#0a0a0a;font-family:Poppins,Segoe UI,sans-serif;color:#e2e8f0;display:flex;flex-direction:column';

        // NOTE: a detached PiP window CANNOT be made fullscreen or script-resized to
        // fill the screen — Chromium blocks both. So this pop-out is for dragging to a
        // SECOND MONITOR (its real purpose). For big edge-to-edge video on THIS screen,
        // the host uses the "⛶ Fullscreen" button on the in-page (docked) video grid,
        // which uses the main tab's Fullscreen API and actually works.
        const cols = popTiles.length <= 1 ? 1 : popTiles.length <= 4 ? 2 : 3;
        const rows = Math.ceil(popTiles.length / cols);
        const grid = doc.createElement('div');
        grid.style.cssText = `flex:1 1 auto;display:grid;gap:8px;padding:10px;grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr);box-sizing:border-box;overflow:hidden;min-height:0`;
        doc.body.appendChild(grid);

        popTiles.forEach(p => {
          const cell = doc.createElement('div');
          // aspect-ratio:4/3 keeps each tile a proper BOX (not a wide letterbox) even
          // when one person is in a wide window; justify/align-self center it in its cell.
          cell.style.cssText = 'position:relative;justify-self:center;align-self:center;max-width:100%;max-height:100%;aspect-ratio:4/3;background:linear-gradient(135deg,#141a24,#0f141c);border-radius:9px;overflow:hidden;display:grid;place-items:center';
          if (p.videoTrack) {
            const v = doc.createElement('video');
            v.autoplay = true; v.playsInline = true; v.muted = true;
            v.style.cssText = 'width:100%;height:100%;object-fit:cover';
            try { p.videoTrack.attach(v); attached.push({ track: p.videoTrack, el: v }); } catch { /* */ }
            cell.appendChild(v);
          } else {
            // Camera-off avatar — scale it to the tile (min of width/height) so it's a
            // big readable circle, not a lost 44px dot in a large cell.
            const av = doc.createElement('div');
            av.style.cssText = 'width:min(28vw,28vh);height:min(28vw,28vh);max-width:180px;max-height:180px;border-radius:50%;background:linear-gradient(135deg,#06b6d4,#10b981);color:#04211d;display:grid;place-items:center;font-weight:800;font-size:min(12vw,12vh);line-height:1';
            av.textContent = (p.name || '?').charAt(0).toUpperCase();
            cell.appendChild(av);
          }
          const nm = doc.createElement('span');
          nm.textContent = p.name + (p.isLocal ? ' (you)' : '');
          nm.style.cssText = 'position:absolute;left:10px;bottom:10px;font-size:min(2.4vw,15px);font-weight:600;background:rgba(0,0,0,0.6);padding:4px 11px;border-radius:8px;max-width:calc(100% - 40px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
          cell.appendChild(nm);
          grid.appendChild(cell);
        });

        // Closing the pop-out window pins the videos back into the page.
        pip.addEventListener('pagehide', () => { if (!cancelled) setVideoMode('dock'); });
      } catch { setVideoMode('dock'); }
    })();
    return () => {
      cancelled = true;
      attached.forEach(({ track, el }) => { try { track.detach(el); } catch { /* */ } });
      try { popWinRef.current?.close(); } catch { /* */ }
      popWinRef.current = null;
    };
    // Rebuild only when the pop-out opens/closes or the SET of people (or their video
    // tracks) changes — not on every render, which would flicker the window.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, videoMode, lk.connected, lk.participants.map(p => `${p.identity}:${p.videoTrack?.sid || 'none'}`).join('|')]);

  // ── Render ───────────────────────────────────────────────────────────────────
  if (phase === 'loading') return <div style={s.center}>Loading classroom…</div>;
  if (phase === 'error') return <div style={s.center}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 40 }}>🚫</div><p style={{ fontSize: 15, color: 'rgba(226,232,240,0.85)' }}>{note}</p><button style={s.ghost} onClick={() => nav(-1)}>Back</button></div></div>;
  if (phase === 'ended') return <div style={s.center}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 40 }}>👋</div><h2 style={{ fontSize: 20, fontWeight: 700, margin: '6px 0 14px' }}>Meeting ended</h2><button style={s.ghost} onClick={() => nav('/coach/live')}>Back to meetings</button></div></div>;
  if (phase === 'waiting') return <WaitingRoom note={note} user={user} joinCode={mode === 'join' ? params.joinCode : null} />;

  // live
  const screenSharer = lk.participants.find(p => p.screenTrack);
  // iAmSharing is computed above (before the hooks that need it). Only show the
  // shared screen big when SOMEONE ELSE shares — I keep my normal view + controls.
  const remoteScreen = screenSharer && !screenSharer.isLocal ? screenSharer : null;

  // The people to show. Before video connects, show ME as an avatar tile so the
  // stage never looks empty or broken.
  const tiles = (lk.connected && lk.participants.length > 0)
    ? lk.participants
    : [{
        identity: '__me__', isLocal: true, name: (user?.displayName || user?.username || 'You'),
        videoTrack: null, audioTrack: null, avatar: user?.profilePhotoUrl || null,
      }];

  // Zoom-style stage columns: 1 person fills the stage; 2 split; up to 4 → 2×2; more → 3 across.
  const stageCols = tiles.length <= 1 ? 1 : tiles.length <= 4 ? 2 : 3;
  // Activities view wins the stage when the host opened it (host-only; a remote screen
  // still takes priority so screen-share isn't hidden).
  const activitiesOnStage = isHost && showActivities && !remoteScreen;
  const boardOnStage = showBoard && !remoteScreen && !activitiesOnStage;

  // ── Video placement (host only) ─────────────────────────────────────────────
  // videoMode moves the class videos without unmounting the tracks. Students always
  // use 'dock' (they don't get the placement control). Only the host can float/pop/hide.
  const vMode = isHost ? videoMode : 'dock';
  const videosDocked = vMode === 'dock';     // thumbnails live in the right rail
  const videosFloat  = vMode === 'float';    // draggable box over the board
  const videosHidden = vMode === 'hidden';   // off — a pill brings them back
  const videosPopped = vMode === 'pop';      // in their own window
  // When videos are floated/popped/hidden, the big Zoom grid must NOT own the stage —
  // the board (or a placeholder) takes it so faces never eat the whole page.
  const videoOnStage = videosDocked && !boardOnStage && !remoteScreen && !activitiesOnStage;

  // Does the RIGHT RAIL actually have anything to show? It holds two things: the
  // docked video thumbnails (only when videos are docked AND a board/screen is on
  // stage) and the Participants panel (only when opened). If NEITHER is present, the
  // rail is empty — so we must NOT reserve its 300–380px, otherwise the board can't
  // expand into that blank gutter (the "board won't take the whole page" bug when
  // videos are detached). When videos are re-attached, the rail fills again and the
  // board reflows around it — which is exactly the behaviour that already worked.
  const railHasThumbs = videosDocked && (boardOnStage || remoteScreen);
  const railHasContent = railHasThumbs || showParticipants;

  const renderTile = (p, { small = false } = {}) => (
    // minWidth:0 + width:100% keep the tile inside its grid cell. Without minWidth:0 a
    // <video>'s intrinsic width can exceed the column and push tiles into a sideways
    // scroll ("videos running left to right"). This pins each tile to its cell.
    <div key={p.identity} style={{ minWidth: 0, width: '100%' }}>
      <MediaTile
        track={p.videoTrack}
        local={p.isLocal}
        audioTrack={p.audioTrack}
        muted={p.isLocal}
        label={p.name + (p.isLocal ? ' (you)' : '')}
        avatarUrl={p.avatar || (p.isLocal ? user?.profilePhotoUrl : null)}
        speaking={p.isSpeaking || String(lk.activeSpeaker) === String(p.identity)}
        ratio={small ? '4/3' : '16/9'}
      />
      {isHost && !p.isLocal && (
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          {String(controllerId) === String(p.identity)
            ? <button style={s.tiny} onClick={revoke}>Take back control</button>
            : <button style={s.tiny} onClick={() => grant(p.identity)}>Give control</button>}
        </div>
      )}
    </div>
  );

  const waitingNow = waiting.filter(w => w.state === 'waiting');

  return (
    <div style={s.wrap}>
      {/* Top bar */}
      <div style={s.topbar}>
        <span style={{ fontWeight: 700 }}>🔴 Live class</span>
        {session && <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af' }}>
          Ends in <Countdown endsAt={session.endsAt} onExpire={autoEnd} />
        </span>}
        {/* Teaching board is HOST-only: the coach decides what everyone sees.
            Toggling it broadcasts to all students so they follow along. */}
        {isHost && (
          <button
            style={{ ...s.iconBtn, ...(boardOnStage ? { borderColor: 'rgba(6,182,212,0.5)', color: '#67e8f9' } : {}) }}
            title={showBoard ? 'Back to video for everyone' : 'Show the teaching board to everyone'}
            onClick={toggleBoard}
          >♟ {showBoard ? 'Video' : 'Teach on board'}</button>
        )}
        {/* HOST: "Activities" stage view — like the teaching board, puts the coach's
            activities (live leaderboards, finished results) on the stage IN class.
            Only CREATE opens a new tab; watching/results all show here. */}
        {isHost && (
          <button
            style={{ ...s.iconBtn, ...(showActivities ? { borderColor: 'rgba(6,182,212,0.5)', color: '#67e8f9' } : {}) }}
            title={showActivities ? 'Back to the class' : 'Show class activities & leaderboards'}
            onClick={() => { const next = !showActivities; setShowActivities(next); if (next) loadActivities(); }}
          >🎯 {showActivities ? 'Close' : 'Activities'}</button>
        )}
        {iCanShare && (
          <button
            style={{ ...s.screenBtn, ...(lk.connected ? {} : s.btnOff) }}
            disabled={!lk.connected}
            title={lk.connected ? 'Share your screen' : 'Available once the video server is connected'}
            onClick={() => lk.screenOn ? lk.toggleScreen() : setSharePrompt(true)}
          >{lk.screenOn ? '🛑 Stop share' : '🖥️ Share screen'}</button>
        )}
        {/* Mic button + inline device picker (the ˅ opens a mic chooser, Zoom-style). */}
        <div style={s.mediaWrap}>
          <button
            style={{ ...s.mediaBtn, ...(lk.micOn ? s.mediaOn : s.mediaOff), ...(lk.connected ? {} : s.btnOff) }}
            disabled={!lk.connected}
            title={lk.connected ? (lk.micOn ? 'Mute microphone' : 'Unmute microphone') : 'Available once the video server is connected'}
            onClick={lk.toggleMic}
          ><MicIcon off={!lk.micOn} size={18} /><span>{lk.micOn ? 'Mic' : 'Muted'}</span></button>
          {lk.connected && (
            <button
              style={{ ...s.devCaret, ...(devMenu === 'mic' ? s.devCaretOn : {}) }}
              title="Choose microphone"
              onClick={() => setDevMenu(m => m === 'mic' ? null : 'mic')}
            >⌄</button>
          )}
          {devMenu === 'mic' && (
            <>
              <div style={s.devBackdrop} onClick={() => setDevMenu(null)} />
              <div style={s.devMenu}>
                <div style={s.devMenuHead}>Select a microphone</div>
                {lk.mics.length === 0 && <div style={s.devMenuEmpty}>No microphones found</div>}
                {lk.mics.map(d => (
                  <button
                    key={d.deviceId}
                    style={{ ...s.devItem, ...(d.deviceId === lk.activeMicId ? s.devItemOn : {}) }}
                    onClick={() => { lk.switchMic(d.deviceId); setDevMenu(null); }}
                  >
                    <span style={s.devCheck}>{d.deviceId === lk.activeMicId ? '✓' : ''}</span>
                    <span style={s.devLabel}>{d.label || 'Microphone'}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Camera button + inline device picker (the ˅ opens a camera chooser). */}
        <div style={s.mediaWrap}>
          <button
            style={{ ...s.mediaBtn, ...(lk.camOn ? s.mediaOn : s.mediaOff), ...(lk.connected ? {} : s.btnOff) }}
            disabled={!lk.connected}
            title={lk.connected ? (lk.camOn ? 'Turn camera off' : 'Turn camera on') : 'Available once the video server is connected'}
            onClick={lk.toggleCam}
          ><CamIcon off={!lk.camOn} size={18} /><span>{lk.camOn ? 'Camera' : 'Off'}</span></button>
          {lk.connected && (
            <button
              style={{ ...s.devCaret, ...(devMenu === 'cam' ? s.devCaretOn : {}) }}
              title="Choose camera"
              onClick={() => setDevMenu(m => m === 'cam' ? null : 'cam')}
            >⌄</button>
          )}
          {devMenu === 'cam' && (
            <>
              <div style={s.devBackdrop} onClick={() => setDevMenu(null)} />
              <div style={s.devMenu}>
                {/* Video effects launcher — light adjustment, touch-up, blur. */}
                <button
                  style={{ ...s.devItem, fontWeight: 700, color: '#67e8f9' }}
                  onClick={() => { setFxOpen(true); setDevMenu(null); }}
                >
                  <span style={s.devCheck}>✨</span>
                  <span style={s.devLabel}>Video effects…</span>
                </button>
                {/* Host-only camera diagnostics: what the sensor supports & is publishing. */}
                {isHost && (
                  <button
                    style={{ ...s.devItem, color: '#9ca3af' }}
                    onClick={() => { setCamInfoOpen(true); setDevMenu(null); }}
                  >
                    <span style={s.devCheck}>ℹ️</span>
                    <span style={s.devLabel}>Video info (diagnostics)…</span>
                  </button>
                )}
                <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
                <div style={s.devMenuHead}>Select a camera</div>
                {lk.cameras.length === 0 && <div style={s.devMenuEmpty}>No cameras found</div>}
                {lk.cameras.map(d => (
                  <button
                    key={d.deviceId}
                    style={{ ...s.devItem, ...(d.deviceId === lk.activeCameraId ? s.devItemOn : {}) }}
                    onClick={() => { lk.switchCamera(d.deviceId); setDevMenu(null); }}
                  >
                    <span style={s.devCheck}>{d.deviceId === lk.activeCameraId ? '✓' : ''}</span>
                    <span style={s.devLabel}>{d.label || 'Camera'}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {/* One-click Participants panel (Zoom-style). Shows a count badge. */}
        <button
          style={{ ...s.iconBtn, ...(showParticipants ? { borderColor: 'rgba(6,182,212,0.5)', color: '#67e8f9' } : {}), position: 'relative' }}
          title="Participants"
          onClick={() => setShowParticipants(v => !v)}
        >
          👥 {tiles.length}
          {isHost && waitingNow.length > 0 && (
            <span style={{ position: 'absolute', top: -6, right: -6, background: '#f59e0b', color: '#241a05', borderRadius: 999, fontSize: 10, fontWeight: 800, minWidth: 16, height: 16, display: 'grid', placeItems: 'center', padding: '0 4px' }}>{waitingNow.length}</span>
          )}
        </button>
        {/* HOST video placement — where the class videos live. Dock (in the rail) /
            Float (draggable box over the board) / Pop out (own window) / Hide.
            The tracks never unmount; only their container changes, so students'
            faces stay up even during screen share. */}
        {isHost && (
          <div style={s.vmodeGroup} title="Where the class videos appear">
            {[['dock', '📌', 'Pin videos in the panel'],
              ['float', '🗗', 'Float videos over the board (drag/resize)'],
              ['pop', '⧉', 'Pop videos out to their own window (drag to a 2nd monitor)'],
              ['hidden', '🚫', 'Hide videos (board gets full space)']].map(([m, icon, tip]) => (
              <button
                key={m}
                style={{ ...s.vmodeBtn, ...(videoMode === m ? s.vmodeBtnOn : {}) }}
                title={tip}
                onClick={() => setVideoMode(m)}
              >{icon}</button>
            ))}
          </div>
        )}
        <button style={s.iconBtn} title={isFs ? 'Exit fullscreen' : 'Fullscreen (video if shown, else the class)'} onClick={toggleVideoFullscreen}>
          {isFs ? '🡼' : '⛶'}
        </button>
        {isHost && <button style={s.endBtn} onClick={endClass}>End</button>}
      </div>
      {note && (
        <div style={s.noteBar}>
          <span style={{ flex: 1 }}>{note}</span>
          <button style={s.noteClose} title="Dismiss" aria-label="Dismiss" onClick={() => setNote('')}>✕</button>
        </div>
      )}

      {/* When I'm the presenter, a slim banner confirms I'm sharing — my controls
          stay right above it (Zoom-style), instead of my screen taking over. */}
      {iAmSharing && (
        <div style={s.shareBanner}>
          🖥️ You’re sharing your screen — students can see it.
          <button style={s.shareStop} onClick={lk.toggleScreen}>Stop sharing</button>
        </div>
      )}

      <div style={{ ...s.body, flexWrap: isNarrow ? 'wrap' : 'nowrap' }}>
        {/* ── STAGE: a REMOTE screen wins; else board (if toggled); else big Zoom grid ── */}
        <div style={s.stage}>
          {activitiesOnStage ? (
            <ActivitiesStage
              races={actRaces}
              tournaments={actTournaments}
              loading={actLoading}
              onReload={loadActivities}
              onClose={() => setShowActivities(false)}
            />
          ) : remoteScreen ? (
            <MediaTile track={remoteScreen.screenTrack} muted label={`${remoteScreen.name}'s screen`} isScreen />
          ) : boardOnStage ? (
            // nowrap on wide screens keeps [positions | board | moves+engine] as three
            // fixed columns so collapsing Moves never drops the card to the bottom of the
            // page. On narrow screens we still allow wrap so it stacks gracefully.
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: isNarrow ? 'wrap' : 'nowrap', width: '100%', justifyContent: 'center' }}>
              {/* LEFT of the board (host-only): the clickable list — course lessons,
                  library items, or study positions depending on the active tab. */}
              {isHost && (() => {
                // Course tab with a course chosen → its lessons.
                const course = contentTab === 'courses' ? courses.find(c => c.id === pickCourse) : null;
                if (course) {
                  return (
                    <div style={s.posList}>
                      <div style={s.posListTitle}>Lessons ({course.lessons.length})</div>
                      {course.lessons.map((l, i) => (
                        <button key={i} style={s.posItem} title={l.name} onClick={() => loadItem(l)}>
                          <b>{i + 1}.</b> {l.name}{l.kind === 'game' ? ' ♟' : l.kind === 'study' ? ' 📖' : ''}
                        </button>
                      ))}
                    </div>
                  );
                }
                // Library tab → saved items.
                if (contentTab === 'library' && libraryItems.length > 0) {
                  return (
                    <div style={s.posList}>
                      <div style={s.posListTitle}>Saved ({libraryItems.length})</div>
                      {libraryItems.map((it, i) => (
                        <button key={i} style={s.posItem} title={it.name} onClick={() => loadItem(it)}>
                          <b>{i + 1}.</b> {it.name}{it.kind === 'game' ? ' ♟' : ''}
                        </button>
                      ))}
                    </div>
                  );
                }
                // Study positions — ONLY on the Studies tab. Guarding on contentTab
                // means switching to Puzzles/Courses/Library/Games hides this list
                // (the positions state is kept, so returning to Studies restores it).
                if (contentTab === 'studies' && positions.length > 0) {
                  return (
                    <div style={s.posList}>
                      <div style={s.posListTitle}>Positions ({positions.length})</div>
                      {posLoading ? <div style={{ color: '#9ca3af', fontSize: 12 }}>Loading…</div> :
                        positions.map((p, i) => (
                          <button key={i} style={s.posItem} title={p.title} onClick={() => setBoardFen(p.fen)}>
                            <b>{i + 1}.</b> {p.title || `Position ${i + 1}`}
                          </button>
                        ))
                      }
                    </div>
                  );
                }
                return null;
              })()}

              {/* Board column — the board + the load panel below, both board-width. */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: isHost ? Math.max(boardBoxSize, 560) : boardBoxSize }}>
                {/* Relative wrapper (inline-block so it hugs the board) for the resize handle.
                    The board component reserves a ~32px coordinate gutter on every side;
                    coordinates are only on bottom+left, so we crop the EMPTY top+right
                    gutter with negative margins to remove the space above the board. */}
                <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0, marginTop: -30, marginRight: -30, marginBottom: -6 }}>
                  <Chessboard position={curFen} lastMove={lastMove} boardWidth={shownBoardW} draggable={!!iControl} onDrop={onDrop}
                    // Controller draws locally (its own arrows) and broadcasts them;
                    // everyone else renders the synced arrows/highlights as props.
                    arrows={iControl ? [] : drawArrows}
                    highlightSquares={iControl ? undefined : drawHighlights}
                    onDrawingChange={iControl ? onBoardDrawing : undefined}
                    showCoordinates coordinateSides={['bottom', 'left']} />
                  {/* Blue corner triangle — drag to resize (same as the study board). */}
                  {iControl && (
                    <div
                      onMouseDown={onResizeStart}
                      onTouchStart={onResizeStart}
                      title="Drag to resize the board"
                      style={{ position: 'absolute', bottom: 0, right: 0, width: 0, height: 0,
                        borderStyle: 'solid', borderWidth: '0 0 28px 28px',
                        borderColor: 'transparent transparent #3b82f6 transparent',
                        cursor: 'nwse-resize', zIndex: 100, opacity: 0.85, touchAction: 'none' }}
                    />
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  <span style={{ color: '#9ca3af', fontSize: 12 }}>
                    {isHost ? 'You’re teaching — everyone follows'
                      : iControl ? 'Your coach gave you control — make your move'
                      : 'Your coach is teaching'}
                  </span>
                  {/* Move navigation (host/controller drives; syncs to all). */}
                  {iControl && (
                    <span style={{ display: 'flex', gap: 4 }}>
                      <button style={s.zoomBtn} title="Start" onClick={goStart}>⏮</button>
                      <button style={s.zoomBtn} title="Back" onClick={stepBack}>◀</button>
                      <button style={s.zoomBtn} title="Forward" onClick={stepFwd}>▶</button>
                      <button style={s.zoomBtn} title="End" onClick={goEnd}>⏭</button>
                    </span>
                  )}
                </div>

                {/* Host-only: load from studies / courses / library, or paste a FEN/PGN. */}
                {isHost && (
                  <div style={{ ...s.loadPanel, width: '100%' }}>
                    {/* Top-level content tabs */}
                    <div style={s.srcTabs}>
                      {[['studies', '📚 Studies'], ['courses', '🎓 Courses'], ['library', '📁 Library'], ['puzzles', '🧩 Puzzles'], ['games', '♟ Games']].map(([v, label]) => (
                        <button key={v}
                          style={{ ...s.srcTab, ...(contentTab === v ? s.srcTabOn : {}) }}
                          onClick={() => setContentTab(v)}>{label}</button>
                      ))}
                    </div>

                    {/* STUDIES: source → study → chapter */}
                    {contentTab === 'studies' && (
                      <>
                        <div style={s.srcTabs}>
                          {[['mine', 'My studies'], ['public', 'Public'], ['nexus', 'Nexus']].map(([v, label]) => (
                            <button key={v}
                              style={{ ...s.srcTab, ...(studySource === v ? s.srcTabOn : {}) }}
                              onClick={() => setStudySource(v)}>{label}</button>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <select style={{ ...s.loadInput, flex: 1, fontFamily: 'inherit' }} value={pickStudy}
                            onChange={e => { setPickStudy(e.target.value); setPickChapter(''); }}>
                            <option value="">Choose a study…</option>
                            {studies.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                          </select>
                          <select style={{ ...s.loadInput, flex: 1, fontFamily: 'inherit' }} value={pickChapter}
                            disabled={!pickStudy}
                            onChange={e => setPickChapter(e.target.value)}>
                            <option value="">Choose a chapter…</option>
                            {(studies.find(st => st.id === pickStudy)?.chapters || []).map(ch => (
                              <option key={ch.id} value={ch.id}>{ch.name}{ch.count != null ? ` (${ch.count})` : ''}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {/* COURSES: pick a course → its lessons become the left list */}
                    {contentTab === 'courses' && (
                      <select style={{ ...s.loadInput, fontFamily: 'inherit' }} value={pickCourse}
                        onChange={e => setPickCourse(e.target.value)}>
                        <option value="">{courses.length ? 'Choose a course…' : 'No courses yet'}</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title} ({c.lessons.length})</option>)}
                      </select>
                    )}

                    {/* LIBRARY: saved positions/games become the left list */}
                    {contentTab === 'library' && (
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>
                        {libraryItems.length ? `${libraryItems.length} saved item(s) — click one on the left to load.` : 'No saved positions/games yet.'}
                      </div>
                    )}

                    {/* PUZZLES: 4 mode cards + rating-range picker (practice, no ratings) */}
                    {contentTab === 'puzzles' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {/* Rating range for the whole class */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, color: '#9ca3af' }}>Puzzle level:</span>
                          <select style={{ ...s.loadInput, width: 'auto', fontFamily: 'inherit' }}
                            value={`${ratingMin}-${ratingMax}`}
                            onChange={e => { const [a, b] = e.target.value.split('-').map(Number); setRatingMin(a); setRatingMax(b); }}>
                            {[[400,800],[801,1000],[1001,1200],[1201,1400],[1401,1600],[1601,1800],[1801,2000],[2001,2400],[2401,3000]].map(([a,b]) => (
                              <option key={a} value={`${a}-${b}`}>{a}–{b}</option>
                            ))}
                          </select>
                        </div>
                        {/* 4 mode cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                          <button style={s.puzCard} onClick={() => loadPuzzle('healthymix')}>🥗 Healthy Mix</button>
                          <button style={{ ...s.puzCard, ...(puzzleMode === 'pieces' ? s.srcTabOn : {}) }} onClick={() => { setContentTab('puzzles'); loadPuzzle('pieces'); }} disabled={!puzzlePieces} title={!puzzlePieces ? 'Pick a piece count first' : ''}>♟ Pieces</button>
                          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 6 }}>
                            <select style={{ ...s.loadInput, flex: 1, fontFamily: 'inherit' }} value={puzzleTheme}
                              onChange={e => setPuzzleTheme(e.target.value)}>
                              <option value="">🎯 Themes — pick one…</option>
                              {puzzleThemes.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                            </select>
                            <button style={s.loadBtn} disabled={!puzzleTheme} onClick={() => loadPuzzle('theme')}>Load theme</button>
                          </div>
                          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: '#9ca3af' }}>♟ Pieces on board:</span>
                            <select style={{ ...s.loadInput, width: 'auto', fontFamily: 'inherit' }} value={puzzlePieces}
                              onChange={e => setPuzzlePieces(e.target.value)}>
                              <option value="">any</option>
                              {[3,4,5,6,7,8,10,12,16,20,24,32].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                            <button style={s.ghostSm} disabled={!puzzlePieces} onClick={() => loadPuzzle('pieces')}>Load pieces</button>
                          </div>
                        </div>
                        {/* Active-puzzle status + Next/Exit now live in a compact bar
                            directly below the Moves card (no scrolling). */}
                        {puzzle && (
                          <div style={{ fontSize: 12, color: '#9ca3af' }}>
                            Puzzle loaded — use <b>Next ▶</b> / <b>Exit</b> below the Moves card.
                          </div>
                        )}
                        {puzzleStatus === 'none' && <div style={{ color: '#fca5a5', fontSize: 12 }}>No puzzle found for that level/topic — try a wider range.</div>}
                      </div>
                    )}

                    {/* GAMES: fetch a student's recent Lichess / Chess.com games and
                        load one onto the board to review (raw game, no analysis). */}
                    {contentTab === 'games' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={s.srcTabs}>
                          {[['lichess', 'Lichess'], ['chesscom', 'Chess.com']].map(([v, label]) => (
                            <button key={v}
                              style={{ ...s.srcTab, ...(gamePlatform === v ? s.srcTabOn : {}) }}
                              onClick={() => setGamePlatform(v)}>{label}</button>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <input
                            style={{ ...s.loadInput, flex: 1, fontFamily: 'inherit', minWidth: 120 }}
                            placeholder={gamePlatform === 'lichess' ? 'Lichess username' : 'Chess.com username'}
                            value={gameUser}
                            onChange={e => setGameUser(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') fetchStudentGames(); }}
                          />
                          <select style={{ ...s.loadInput, width: 'auto', fontFamily: 'inherit' }}
                            value={gameMax} onChange={e => setGameMax(Number(e.target.value))}>
                            <option value={5}>Last 5</option>
                            <option value={10}>Last 10</option>
                          </select>
                          <button style={s.loadBtn} onClick={fetchStudentGames} disabled={gamesLoading || !gameUser.trim()}>
                            {gamesLoading ? 'Fetching…' : 'Fetch'}
                          </button>
                        </div>
                        {gamesErr && <div style={{ color: '#fca5a5', fontSize: 12 }}>{gamesErr}</div>}
                        {fetchedGames.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 200, overflowY: 'auto' }}>
                            {fetchedGames.map((g, i) => {
                              const rc = g.result === 'win' ? '#34d399' : g.result === 'loss' ? '#f87171' : '#fbbf24';
                              const rl = g.result === 'win' ? 'Won' : g.result === 'loss' ? 'Lost' : 'Draw';
                              return (
                                <div key={i} style={s.gameRow}>
                                  <span style={{ ...s.gameResult, color: rc, borderColor: rc }}>{rl}</span>
                                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5 }}>
                                    <b style={{ textTransform: 'capitalize' }}>{g.playerSide}</b> · {g.opening}
                                    {g.timeClass && g.timeClass !== 'unknown' ? ` · ${g.timeClass}` : ''}
                                  </span>
                                  <button style={s.tiny} onClick={() => loadFetchedGame(g)}>Load</button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {contentTab !== 'puzzles' && contentTab !== 'games' && (<>
                      <textarea
                        style={s.loadInput}
                        rows={2}
                        placeholder="…or paste a FEN (a position) or PGN (a game)"
                        value={loadText}
                        onChange={e => setLoadText(e.target.value)}
                      />
                      {loadErr && <div style={{ color: '#fca5a5', fontSize: 12 }}>{loadErr}</div>}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button style={s.loadBtn} onClick={loadPosition}>Load onto board</button>
                        <button style={s.ghostSm} onClick={resetBoard}>Reset board</button>
                        <button style={s.ghostSm} onClick={openEditor}>🎨 Edit position</button>
                      </div>

                    </>)}
                  </div>
                )}
              </div>

              {/* SAN notation (right of the board) — shared study tree with variations.
                  The host-only Stockfish card sits ABOVE the Moves card and keeps its
                  own fixed width even when Moves is collapsed. A puzzle's Next/Exit bar
                  sits right below the Moves card so the host needn't scroll. */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Host-only Stockfish (browser WASM) — top 3 lines, on/off.
                    Private to the host; not shared with students, not saved. */}
                {isHost && (
                  <div style={{ width: 340 }}>
                    <EnginePanel fen={curFen} numLines={3} enabled={engineOn} onToggle={() => setEngineOn(v => !v)} />
                  </div>
                )}
                <MoveTreeNotation tree={tree} path={treePath} onJump={goToPath} canNavigate={iControl} height={boardBoxSize}
                  collapsed={movesCollapsed} onToggle={() => setMovesCollapsed(c => !c)} />
                {isHost && puzzle && contentTab === 'puzzles' && (
                  <div style={s.puzBar}>
                    <span style={{ fontSize: 12.5, fontWeight: 700,
                      color: puzzleStatus === 'wrong' ? '#fca5a5' : puzzleStatus === 'solved' ? '#6ee7b7' : puzzleStatus === 'correct' ? '#67e8f9' : '#9ca3af' }}>
                      {puzzleStatus === 'wrong' ? '✗ Try again' : puzzleStatus === 'solved' ? '✓ Solved!' : puzzleStatus === 'correct' ? '✓ Keep going' : '🧩 Best move?'}
                    </span>
                    <button style={{ ...s.loadBtn, flex: '0 0 auto', marginLeft: 'auto' }} onClick={() => loadPuzzle(puzzleMode)}>Next ▶</button>
                    <button style={s.ghostSm} onClick={exitPuzzle}>Exit</button>
                  </div>
                )}
              </div>
            </div>
          ) : videoOnStage ? (
            <div ref={videoGridRef} style={{ ...s.videoGrid, gridTemplateColumns: `repeat(${stageCols}, 1fr)`, ...(isFs ? s.videoGridFs : {}) }}>
              {tiles.map(p => renderTile(p))}
            </div>
          ) : (
            // Host moved the videos out (float / pop / hidden) and there's no board up —
            // the stage invites teaching instead of sitting empty.
            <div style={s.stagePlaceholder}>
              <div style={{ fontSize: 42 }}>♟</div>
              <div style={{ fontWeight: 700, marginTop: 8 }}>Ready to teach</div>
              <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4, maxWidth: 320, textAlign: 'center' }}>
                Tap <b style={{ color: '#67e8f9' }}>♟ Teach on board</b> above, or load a study / puzzle from below.
                Your students’ videos are {videosHidden ? 'hidden' : videosPopped ? 'in their own window' : 'floating'} — bring them back any time with the video buttons.
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT RAIL: participants panel + video thumbnails + waiting room ──
            When Moves is collapsed, the rail widens so the coach sees kids bigger.
            Rendered ONLY when it has content (docked thumbnails or an open Participants
            panel). When videos are detached AND the panel is closed the rail is omitted
            entirely, so the board + moves flex to the FULL page width. */}
        {railHasContent && (
        <div style={{ ...s.side, flexShrink: 0, ...(movesCollapsed
          ? { flexBasis: 380, width: 380 }   // collapsed → wider rail, videos get bigger (2 per row)
          : { flexBasis: 300, width: 300 }) }}>
          {/* Zoom-style single panel: WAITING ROOM (top) + IN THE CLASS (below),
              in ONE card. Shown ONLY when the coach opens Participants — it does NOT
              sit permanently beside the shared board. New arrivals are still flagged by
              the amber badge on the Participants toolbar button, so nothing is missed. */}
          {showParticipants && (
            <div style={{ ...s.waitCard, ...(isHost && waitingNow.length > 0 ? s.waitCardHot : {}) }}>

              {/* ── Waiting-room section (host only) — sits at the TOP like Zoom ── */}
              {isHost && (
                <div style={{ marginBottom: 12 }}>
                  <div
                    onClick={() => setWaitingCollapsed(c => !c)}
                    style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: waitingCollapsed ? 0 : 8 }}
                  >
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>{waitingCollapsed ? '▸' : '▾'}</span>
                    ⏳ Waiting room
                    {waitingNow.length > 0 && <span style={s.waitBadge}>{waitingNow.length}</span>}
                  </div>

                  {!waitingCollapsed && (<>
                    {waitingNow.length === 0
                      ? <div style={{ color: '#6b7280', fontSize: 13 }}>No one waiting.</div>
                      : waitingNow.map(w => (
                        <div key={w.studentId} style={s.waitRow}>
                          <span style={{ flex: 1, fontSize: 14 }}>{w.name || w.username || 'Student'}</span>
                          <button style={s.present} onClick={() => admit(w.studentId, 'Present')}>Present</button>
                          <button style={s.catchup} onClick={() => admit(w.studentId, 'Catch-up')}>Catch up</button>
                          <button style={s.remove} onClick={() => removeStu(w.studentId)}>Remove</button>
                        </div>
                      ))
                    }
                  </>)}

                  {/* Collapsed but someone is waiting → show up to 2 names so the coach
                      notices and can admit without expanding. */}
                  {waitingCollapsed && waitingNow.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {waitingNow.slice(0, 2).map(w => (
                        <div key={w.studentId} style={s.waitRow}>
                          <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name || w.username || 'Student'}</span>
                          <button style={s.present} onClick={() => admit(w.studentId, 'Present')}>Present</button>
                          <button style={s.catchup} onClick={() => admit(w.studentId, 'Catch-up')}>Catch up</button>
                        </div>
                      ))}
                      {waitingNow.length > 2 && (
                        <div style={{ fontSize: 12, color: '#9ca3af', cursor: 'pointer' }} onClick={() => setWaitingCollapsed(false)}>
                          +{waitingNow.length - 2} more — expand
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Divider between the two sections (host sees both; student sees only this). */}
              {isHost && <div style={s.panelDivider} />}

              {/* ── In-the-class section (the admitted participants) ── */}
              {(
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    👥 In the class <span style={s.waitBadge}>{tiles.length}</span>
                  </div>
                  {tiles.map(p => {
                    const controlling = String(controllerId) === String(p.identity);
                    const sharing = String(screenSharerId) === String(p.identity);
                    return (
                      <div key={p.identity} style={s.partRow}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                          {p.avatar
                            ? <img src={p.avatar} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                            : <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#06b6d4,#10b981)', color: '#04211d', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800 }}>{(p.name || '?').charAt(0).toUpperCase()}</span>}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                            {p.name}{p.isLocal ? ' (you)' : ''}{controlling ? ' • presenting' : ''}
                          </span>
                        </span>
                        {/* mic / cam status icons */}
                        <span title={p.audioTrack ? 'Mic on' : 'Muted'} style={{ display: 'inline-flex', color: p.audioTrack ? '#9ca3af' : '#f87171' }}>
                          <MicIcon off={!p.audioTrack} size={16} />
                        </span>
                        <span title={p.videoTrack ? 'Camera on' : 'Camera off'} style={{ display: 'inline-flex', color: p.videoTrack ? '#9ca3af' : '#f87171' }}>
                          <CamIcon off={!p.videoTrack} size={16} />
                        </span>
                        {/* host: two SEPARATE grants — board control (moves) and screen share */}
                        {isHost && !p.isLocal && (
                          <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {controlling
                              ? <button style={s.tiny} onClick={revoke} title="Take back board control">🎯 Take board</button>
                              : <button style={s.tiny} onClick={() => grant(p.identity)} title="Let this student move the board">🎯 Give board</button>}
                            {sharing
                              ? <button style={s.tiny} onClick={revokeShare} title="Stop this student sharing">🖥️ Take share</button>
                              : <button style={s.tiny} onClick={() => grantShare(p.identity)} title="Let this student share their screen">🖥️ Give share</button>}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Docked video thumbnails — only when the host keeps videos docked AND the
              stage is showing the board/screen (so faces sit beside the teaching view).
              Floated / popped / hidden videos render elsewhere, not here. */}
          {railHasThumbs && (
            // Wider rail (Moves collapsed) OR >5 people → 2 per line; else 1 (bigger).
            <div style={{ ...s.thumbCol, gridTemplateColumns: (movesCollapsed || tiles.length > 5) ? '1fr 1fr' : '1fr' }}>
              {tiles.map(p => renderTile(p, { small: true }))}
            </div>
          )}
        </div>
        )}
      </div>

      {/* Floating class chat (transient — not saved, gone when the class ends). */}
      {session && <LiveClassChat sessionId={session.id} isHost={isHost} />}

      {/* Dark "Share your screen" pre-prompt (Zoom-style framing). The browser's
          own picker (which window/screen/tab) opens after — that native chooser
          can't be restyled by a web page for security reasons. */}
      {sharePrompt && (
        <div style={s.shareOverlay} onMouseDown={(e) => { if (e.target === e.currentTarget) setSharePrompt(false); }}>
          <div style={s.shareModal}>
            <div style={{ fontSize: 40, marginBottom: 6 }}>🖥️</div>
            <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800 }}>Share your screen</h2>
            <p style={{ margin: '0 0 18px', color: '#9fb4c4', fontSize: 14, lineHeight: 1.5 }}>
              You’ll be asked to pick a <b>window</b>, a <b>tab</b>, or your <b>whole screen</b>.
              Everyone in the class will see it.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button style={s.shareCancel} onClick={() => setSharePrompt(false)}>Cancel</button>
              <button style={s.shareGo} onClick={() => { setSharePrompt(false); lk.toggleScreen(); }}>Choose what to share</button>
            </div>
          </div>
        </div>
      )}

      {/* Board editor — pop-up modal (host-only). Drag pieces to set up any
          position, then load it onto the shared class board. */}
      {editorOpen && (
        <div style={s.editorOverlay} onMouseDown={(e) => { if (e.target === e.currentTarget) setEditorOpen(false); }}>
          <div style={s.editorModal}>
            <div style={s.editorHead}>
              <span>🎨 Set up a position — drag pieces, then load it onto the class board.</span>
              <button style={s.editorX} onClick={() => setEditorOpen(false)} title="Close">✕</button>
            </div>
            <div style={s.editorBody}>
              <div style={{ flexShrink: 0 }}>
                <EditableBoard
                  chess={editorChess}
                  selectedPiece={editorPiece}
                  onFenChange={editorFenChange}
                  orientation="white"
                  boardWidth={320}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <PieceSelector selectedPiece={editorPiece} onSelectPiece={setEditorPiece} />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button style={s.ghostSm} onClick={editorStart}>Start position</button>
                  <button style={s.ghostSm} onClick={editorClear}>Clear board</button>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button style={s.loadBtn} onClick={editorLoad}>Load onto board</button>
              <button style={s.ghostSm} onClick={() => setEditorOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── FLOATING video box (host chose 🗗 Float) — drag by the header, resize
          from the corner. Sits OVER the board so faces stay up during screen share. */}
      {isHost && videosFloat && (
        <div
          style={{
            ...s.vFloat,
            width: floatSize.w, height: floatSize.h,
            top: floatPos.y,
            ...(floatPos.x == null ? { right: 24 } : { left: floatPos.x }),
          }}
        >
          <div
            style={s.vFloatHead}
            onPointerDown={(e) => {
              if (e.target.closest('button')) return;
              const startX = e.clientX, startY = e.clientY;
              const box = e.currentTarget.parentElement.getBoundingClientRect();
              const ox = box.left, oy = box.top;
              e.currentTarget.setPointerCapture(e.pointerId);
              const move = (ev) => setFloatPos({
                x: Math.max(4, Math.min(window.innerWidth - floatSize.w - 4, ox + (ev.clientX - startX))),
                y: Math.max(56, Math.min(window.innerHeight - 60, oy + (ev.clientY - startY))),
              });
              const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
              window.addEventListener('pointermove', move);
              window.addEventListener('pointerup', up);
            }}
          >
            <span style={s.vFloatTitle}>📹 Class video <span style={{ color: '#6b7280', fontWeight: 600 }}>· {tiles.length}</span></span>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              <button style={s.vfBtn} title="Pin videos back into the panel" onClick={() => setVideoMode('dock')}>📌</button>
              <button style={s.vfBtn} title="Pop out to its own window" onClick={() => setVideoMode('pop')}>⧉</button>
              <button style={s.vfBtn} title="Hide videos" onClick={() => setVideoMode('hidden')}>✕</button>
            </span>
          </div>
          <div style={{ ...s.vFloatBody, gridTemplateColumns: `repeat(${floatSize.w < 220 ? 1 : floatSize.w < 360 ? 2 : 3}, 1fr)` }}>
            {tiles.map(p => renderTile(p, { small: true }))}
          </div>
          <div
            style={s.vFloatResize}
            onPointerDown={(e) => {
              e.stopPropagation();
              const sx = e.clientX, sy = e.clientY, sw = floatSize.w, sh = floatSize.h;
              e.currentTarget.setPointerCapture(e.pointerId);
              const move = (ev) => setFloatSize({
                w: Math.max(160, sw + (ev.clientX - sx)),
                h: Math.max(130, sh + (ev.clientY - sy)),
              });
              const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
              window.addEventListener('pointermove', move);
              window.addEventListener('pointerup', up);
            }}
          >⤡</div>
        </div>
      )}

      {/* "Show video" pill — appears when the host hid the videos, one tap restores. */}
      {isHost && videosHidden && (
        <button style={s.showVideoPill} title="Bring the class videos back" onClick={() => setVideoMode('dock')}>
          📹 Show video ({tiles.length})
        </button>
      )}

      {/* ── Video effects panel (free, Zoom-style: light / touch-up / blur) ── */}
      {camInfoOpen && (() => {
        const ci = lk.camInfo;
        const st = ci?.settings || {};
        const supported = (arr) => Array.isArray(arr) && arr.includes('continuous');
        const Row = ({ label, ok, detail }) => (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 13 }}>
            <span style={{ color: '#9ca3af' }}>{label}</span>
            <span style={{ color: ok ? '#34d399' : '#f87171', fontWeight: 600 }}>{detail}</span>
          </div>
        );
        return (
          <div style={s.fxOverlay} onMouseDown={(e) => { if (e.target === e.currentTarget) setCamInfoOpen(false); }}>
            <div style={s.fxPanel}>
              <div style={s.fxHead}>
                <span>ℹ️ Video info (diagnostics)</span>
                <button style={s.editorX} onClick={() => setCamInfoOpen(false)} title="Close">✕</button>
              </div>
              <p style={s.fxNote}>
                What your camera reports it supports, and what it's publishing now. The
                “continuous” auto modes are what keep the picture clear and well-lit —
                if a row shows “not supported”, this camera lacks that hardware control.
              </p>
              {!ci ? (
                <div style={{ color: '#9ca3af', fontSize: 13, padding: '10px 0' }}>Turn the camera on to read its capabilities…</div>
              ) : (
                <div>
                  <Row label="Resolution" ok={(st.width || 0) >= 1280} detail={st.width ? `${st.width}×${st.height} @ ${Math.round(st.frameRate || 0)}fps` : '—'} />
                  <Row label="Auto exposure (continuous)"      ok={supported(ci.supports?.exposureMode)}     detail={supported(ci.supports?.exposureMode) ? 'supported ✓' : 'not supported'} />
                  <Row label="Auto white balance (continuous)" ok={supported(ci.supports?.whiteBalanceMode)} detail={supported(ci.supports?.whiteBalanceMode) ? 'supported ✓' : 'not supported'} />
                  <Row label="Auto focus (continuous)"         ok={supported(ci.supports?.focusMode)}        detail={supported(ci.supports?.focusMode) ? 'supported ✓' : 'not supported'} />
                  <Row label="Auto modes applied" ok={(ci.autoApplied || []).length > 0} detail={(ci.autoApplied || []).length ? ci.autoApplied.join(', ') : 'none'} />
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {fxOpen && (
        <div style={s.fxOverlay} onMouseDown={(e) => { if (e.target === e.currentTarget) setFxOpen(false); }}>
          <div style={s.fxPanel}>
            <div style={s.fxHead}>
              <span>✨ Video effects</span>
              <button style={s.editorX} onClick={() => setFxOpen(false)} title="Close">✕</button>
            </div>
            <p style={s.fxNote}>Adjust while watching the live preview — changes save and apply every class. Everyone sees your adjusted video.</p>

            {/* Live self-preview — see the effect as you drag the sliders (Zoom-style). */}
            <FxPreview effects={lk.effects} blurOn={lk.blurOn} deviceId={lk.activeCameraId} />

            {/* Master enhance on/off. OFF by default now — the raw camera is sharpest
                (Zoom-crisp). This is an opt-in for anyone who wants extra brightness/
                colour or skin touch-up; it re-processes the frame so it's slightly softer. */}
            <label style={s.fxRow}>
              <span style={s.fxLabel}>💡 Natural enhance (light &amp; colour) — optional</span>
              <input
                type="checkbox"
                checked={lk.effects.enabled}
                onChange={e => lk.updateEffects({ enabled: e.target.checked })}
              />
            </label>

            {lk.effects.enabled && (
              <div style={s.fxSliders}>
                <div style={s.fxSlider}>
                  <span>Brightness (low-light boost)</span>
                  <input type="range" min="0.6" max="1.8" step="0.02"
                    value={lk.effects.brightness}
                    onChange={e => lk.updateEffects({ brightness: parseFloat(e.target.value) })} />
                </div>
                <div style={s.fxSlider}>
                  <span>☀️ White light (bright clean look)</span>
                  <input type="range" min="0" max="0.4" step="0.02"
                    value={lk.effects.whiten ?? 0}
                    onChange={e => lk.updateEffects({ whiten: parseFloat(e.target.value) })} />
                </div>
                <div style={s.fxSlider}>
                  <span>Contrast</span>
                  <input type="range" min="0.8" max="1.3" step="0.02"
                    value={lk.effects.contrast}
                    onChange={e => lk.updateEffects({ contrast: parseFloat(e.target.value) })} />
                </div>
                <div style={s.fxSlider}>
                  <span>Colour richness</span>
                  <input type="range" min="0.8" max="1.4" step="0.02"
                    value={lk.effects.saturation ?? 1}
                    onChange={e => lk.updateEffects({ saturation: parseFloat(e.target.value) })} />
                </div>
                <div style={s.fxSlider}>
                  <span>Warmth</span>
                  <input type="range" min="-20" max="20" step="1"
                    value={lk.effects.warmth}
                    onChange={e => lk.updateEffects({ warmth: parseInt(e.target.value, 10) })} />
                </div>
                <div style={s.fxSlider}>
                  <span>✨ Touch up my appearance (smooth skin)</span>
                  <input type="range" min="0" max="1" step="0.05"
                    value={lk.effects.touchUp}
                    onChange={e => lk.updateEffects({ touchUp: parseFloat(e.target.value) })} />
                  <span style={{ fontSize: 11, color: '#6b7280' }}>Evens out skin — watch the preview above as you drag.</span>
                </div>
                <button
                  style={{ ...s.ghostSm, alignSelf: 'flex-start', marginTop: 2 }}
                  onClick={() => lk.updateEffects({ brightness: 1.14, contrast: 1.06, saturation: 1.08, whiten: 0.12, warmth: 0, touchUp: 0 })}
                >↺ Reset to recommended</button>
              </div>
            )}

            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '14px 0' }} />

            {/* Background blur — mutually exclusive with light/appearance (one processor per track). */}
            <label style={s.fxRow}>
              <span style={s.fxLabel}>🌫️ Blur background</span>
              <input
                type="checkbox"
                checked={lk.blurOn}
                onChange={e => {
                  const on = e.target.checked;
                  lk.toggleBlur(on);
                  if (on && lk.effects.enabled) lk.updateEffects({ enabled: false }); // blur wins
                }}
              />
            </label>
            <p style={s.fxHint}>
              Blur uses your device’s AI — great on a laptop, but if your video gets choppy or your device
              heats up (older phones), turn it off. Light adjustment and blur can’t run at the same time.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <button style={s.loadBtn} onClick={() => setFxOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  // Root: match the rest of the coach app — #0b0f14 bg, #e2e8f0 text, 15px base font
  // (so any untagged text inherits the app scale instead of the browser's 16px default).
  wrap: { minHeight: '100vh', background: '#0b0f14', color: '#e2e8f0', fontFamily: "'Poppins',sans-serif", fontSize: 15 },
  center: { minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0b0f14', color: '#e2e8f0', fontFamily: "'Poppins',sans-serif", fontSize: 15 },
  topbar: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap' },
  noteBar: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', background: 'rgba(245,158,11,0.12)', color: '#fcd34d', fontSize: 13 },
  noteClose: { flex: '0 0 auto', width: 24, height: 24, borderRadius: 6, border: '1px solid rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.12)', color: '#fcd34d', cursor: 'pointer', fontSize: 12, lineHeight: 1, display: 'grid', placeItems: 'center' },
  body: { display: 'flex', gap: 16, padding: '12px 16px 16px', flexWrap: 'nowrap', alignItems: 'flex-start', justifyContent: 'flex-start', minHeight: 'calc(100vh - 62px)' },
  // Positions list beside the board (from a chosen study/chapter).
  posList: { width: 180, flexShrink: 0, maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5,
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 10 },
  posListTitle: { flexShrink: 0, fontSize: 12, fontWeight: 800, color: '#67e8f9', marginBottom: 2 },
  // flexShrink:0 is REQUIRED: without it, a long list (e.g. 23 positions) in the
  // flex-column posList gets vertically SQUISHED to fit maxHeight, smearing the text.
  // With it, each row keeps its height and the container scrolls instead.
  posItem: { flexShrink: 0, textAlign: 'left', padding: '7px 9px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', cursor: 'pointer', fontSize: 12.5, lineHeight: 1.3,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  srcTabs: { display: 'flex', gap: 6 },
  srcTab: { flex: 1, padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.04)', color: '#9ca3af', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 },
  srcTabOn: { background: 'rgba(6,182,212,0.15)', color: '#67e8f9', borderColor: 'rgba(6,182,212,0.4)' },
  // Host load-position panel under the board.
  loadPanel: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8,
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 10 },
  stepRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' },
  stepBtn: { padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', cursor: 'pointer', fontSize: 12.5 },
  loadInput: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', fontSize: 12.5, resize: 'vertical', fontFamily: 'monospace' },
  loadBtn: { flex: 1, padding: '7px 12px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#06b6d4,#10b981)', color: '#04211d', fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  ghostSm: { padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', cursor: 'pointer', fontSize: 13 },
  editorOverlay: { position: 'fixed', inset: 0, background: 'rgba(3,7,12,0.72)', backdropFilter: 'blur(3px)',
    display: 'grid', placeItems: 'center', zIndex: 9500, padding: 16 },
  editorModal: { background: 'rgba(15,20,28,0.98)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16,
    padding: 18, width: 'min(94vw, 720px)', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 70px rgba(0,0,0,0.6)' },
  editorHead: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 14, lineHeight: 1.4 },
  editorX: { flex: '0 0 auto', width: 24, height: 24, borderRadius: 6, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', cursor: 'pointer', fontSize: 12, lineHeight: 1 },
  editorBody: { display: 'flex', gap: 16, alignItems: 'flex-start' },
  puzBar: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' },
  puzCard: { padding: '10px 8px', borderRadius: 10, border: '1px solid rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.1)', color: '#a5f3fc', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  // Banner shown to the presenter while they share (keeps their controls usable).
  shareBanner: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
    padding: '8px 16px', background: 'rgba(16,185,129,0.14)', color: '#a7f3d0',
    borderBottom: '1px solid rgba(16,185,129,0.3)', fontSize: 13.5, fontWeight: 600 },
  shareStop: { padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)',
    background: 'rgba(239,68,68,0.15)', color: '#fca5a5', fontWeight: 700, cursor: 'pointer', fontSize: 12.5 },
  // Main stage — fills the width; the right rail sits beside it.
  // Stage takes the remaining width and may shrink; its wide inner row (positions +
  // board + moves) scrolls horizontally if cramped so the video rail beside it is
  // NEVER pushed off-screen / to the page bottom.
  stage: { flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'stretch', overflowX: 'auto' },
  // Zoom-style grid of BIG tiles (1 = full stage, 2 = split, 4 = 2×2, more = 3-wide).
  videoGrid: { position: 'relative', display: 'grid', gap: 10, alignContent: 'center', width: '100%', minWidth: 0 },
  // When the grid itself is fullscreened, fill the screen with a solid backdrop.
  videoGridFs: { background: '#0a0a0a', padding: 16, boxSizing: 'border-box', height: '100%', alignContent: 'center' },
  // Empty-stage prompt shown when the host moved videos out and no board is up.
  stagePlaceholder: { flex: 1, minHeight: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 14, border: '1px dashed rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.02)' },
  // Right rail: thumbnails (when the stage shows board/screen) + waiting room.
  // Right rail. On a laptop this is ~320px; on a big monitor it GROWS (clamp scales
  // it with viewport width) so the docked coach video isn't an ant on a 32" screen.
  side: { flex: '0 1 clamp(320px, 24vw, 560px)', minWidth: 260, display: 'flex', flexDirection: 'column', gap: 12 },
  thumbCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%', minWidth: 0 },
  camSelect: { padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: '#151a22', color: '#e2e8f0', fontSize: 12, maxWidth: 170, cursor: 'pointer' },
  waitCard: { background: 'rgba(23,23,23,0.72)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 12 },
  waitCardHot: { border: '1px solid rgba(245,158,11,0.45)', boxShadow: '0 0 14px rgba(245,158,11,0.15)' },
  panelDivider: { height: 1, background: 'rgba(255,255,255,0.08)', margin: '2px 0 12px' },
  gameRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' },
  gameResult: { flex: 'none', width: 42, textAlign: 'center', fontSize: 11, fontWeight: 800, padding: '2px 0', borderRadius: 6, border: '1px solid' },
  waitBadge: { background: '#f59e0b', color: '#241a05', borderRadius: 999, fontSize: 12, fontWeight: 800, padding: '1px 8px' },
  waitRow: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', borderTop: '1px solid rgba(255,255,255,0.05)' },
  partRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: '1px solid rgba(255,255,255,0.05)' },
  present: { padding: '5px 10px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 12 },
  catchup: { padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.14)', color: '#fcd34d', fontWeight: 700, cursor: 'pointer', fontSize: 12 },
  remove: { padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.12)', color: '#fca5a5', fontWeight: 600, cursor: 'pointer', fontSize: 12 },
  tiny: { padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', cursor: 'pointer', fontSize: 11 },
  iconBtn: { padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', fontSize: 15 },
  // Host video-placement segmented control (dock / float / pop / hide).
  vmodeGroup: { display: 'inline-flex', gap: 2, padding: 2, borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' },
  vmodeBtn: { width: 30, height: 28, borderRadius: 7, border: 'none', background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: 14, display: 'grid', placeItems: 'center', lineHeight: 1 },
  vmodeBtnOn: { background: 'rgba(6,182,212,0.18)', color: '#67e8f9', boxShadow: 'inset 0 0 0 1px rgba(6,182,212,0.4)' },
  // Floating video box (Zoom-style) — sits over the board, host drags/resizes it.
  vFloat: { position: 'fixed', zIndex: 80, background: 'rgba(13,16,22,0.94)', backdropFilter: 'blur(14px)', border: '1px solid rgba(6,182,212,0.35)', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none' },
  vFloatHead: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'grab', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  vFloatTitle: { fontSize: 12, fontWeight: 700, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 },
  vFloatBody: { flex: 1, minHeight: 0, minWidth: 0, width: '100%', overflow: 'auto', padding: 8, display: 'grid', gap: 6 },
  vFloatResize: { position: 'absolute', right: 3, bottom: 3, width: 16, height: 16, cursor: 'nwse-resize', color: '#6b7280', display: 'grid', placeItems: 'center', fontSize: 11, touchAction: 'none' },
  vfBtn: { width: 26, height: 22, borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', cursor: 'pointer', fontSize: 11, display: 'grid', placeItems: 'center' },
  // "Show video" pill shown when videos are hidden.
  showVideoPill: { position: 'fixed', bottom: 20, right: 20, zIndex: 80, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#06b6d4,#10b981)', color: '#04211d', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 12px 30px rgba(0,0,0,0.5)' },
  // ── Video effects panel ──
  fxOverlay: { position: 'fixed', inset: 0, zIndex: 9600, background: 'rgba(3,7,12,0.78)', display: 'grid', placeItems: 'center', padding: 16 },
  fxPanel: { width: 'min(440px, 94vw)', background: 'rgba(15,20,28,0.98)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 20, boxShadow: '0 24px 70px rgba(0,0,0,0.6)', maxHeight: '90vh', overflowY: 'auto' },
  fxHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 17, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 },
  fxNote: { fontSize: 12.5, color: '#9ca3af', margin: '0 0 16px', lineHeight: 1.5 },
  fxRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 0', cursor: 'pointer' },
  fxLabel: { fontSize: 14, fontWeight: 600, color: '#e2e8f0' },
  fxSliders: { display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0 4px' },
  fxSlider: { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12.5, color: '#9ca3af' },
  fxHint: { fontSize: 11.5, color: '#6b7280', margin: '8px 0 0', lineHeight: 1.5 },
  zoomBtn: { minWidth: 26, height: 26, padding: '0 6px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', cursor: 'pointer', fontSize: 12, lineHeight: 1, display: 'inline-grid', placeItems: 'center' },
  // Drag-to-resize corner, matching the Analyze board's diagonal grip.
  resizeHandle: {
    position: 'absolute', right: 6, bottom: 6, width: 18, height: 18, zIndex: 6,
    cursor: 'nwse-resize', touchAction: 'none', opacity: 0.85,
    background: 'linear-gradient(135deg, transparent 0%, transparent 45%, rgba(6,182,212,0.95) 45%, rgba(6,182,212,0.95) 55%, transparent 55%, transparent 70%, rgba(6,182,212,0.95) 70%, rgba(6,182,212,0.95) 80%, transparent 80%)',
  },
  btnOff: { opacity: 0.4, cursor: 'not-allowed' },
  // Dark "share your screen" pre-prompt.
  shareOverlay: { position: 'fixed', inset: 0, zIndex: 9500, display: 'grid', placeItems: 'center',
    background: 'rgba(3,6,10,0.72)', backdropFilter: 'blur(6px)' },
  shareModal: { width: 'min(420px, 92%)', textAlign: 'center', padding: '28px 26px', borderRadius: 20,
    background: 'linear-gradient(180deg, rgba(18,26,38,0.98), rgba(10,15,23,0.99))',
    border: '1px solid rgba(52,211,153,0.22)', boxShadow: '0 30px 90px -30px rgba(0,0,0,0.85)', color: '#f0f4ff' },
  shareCancel: { padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: 'transparent', color: '#cbd5e1', fontWeight: 700, cursor: 'pointer' },
  shareGo: { padding: '10px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#06b6d4,#10b981)', color: '#04211d', fontWeight: 800, cursor: 'pointer' },
  // Zoom-style mic/camera buttons: icon + word, green when on, red when off.
  mediaBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, minWidth: 56,
    padding: '5px 8px', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 700, lineHeight: 1.1 },
  mediaOn: { background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#6ee7b7' },
  mediaOff: { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' },
  // Mic/Camera button + inline device-picker caret (Zoom-style ˅ next to the icon).
  mediaWrap: { position: 'relative', display: 'inline-flex', alignItems: 'stretch', gap: 2 },
  devCaret: { width: 18, padding: 0, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#9ca3af', cursor: 'pointer', fontSize: 13, lineHeight: 1, display: 'grid', placeItems: 'center' },
  devCaretOn: { borderColor: 'rgba(6,182,212,0.5)', color: '#67e8f9', background: 'rgba(6,182,212,0.12)' },
  devBackdrop: { position: 'fixed', inset: 0, zIndex: 60 },
  devMenu: { position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 61, minWidth: 220, maxWidth: 300,
    background: '#161a24', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10, padding: 6,
    boxShadow: '0 14px 40px rgba(0,0,0,0.5)' },
  devMenuHead: { fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 8px 6px' },
  devMenuEmpty: { fontSize: 12.5, color: '#9ca3af', padding: '6px 8px' },
  devItem: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', background: 'transparent',
    border: 'none', color: '#e2e8f0', padding: '8px 8px', borderRadius: 7, cursor: 'pointer', fontSize: 13 },
  devItemOn: { background: 'rgba(6,182,212,0.14)', color: '#67e8f9' },
  devCheck: { width: 14, flexShrink: 0, color: '#67e8f9', fontWeight: 800 },
  devLabel: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  screenBtn: { padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(6,182,212,0.4)', background: 'rgba(6,182,212,0.12)', color: '#67e8f9', cursor: 'pointer', fontWeight: 600 },
  endBtn: { padding: '6px 14px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  ghost: { padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', cursor: 'pointer', marginTop: 12 },
};
