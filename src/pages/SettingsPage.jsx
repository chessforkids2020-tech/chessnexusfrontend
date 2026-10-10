import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Chessboard from '../components/Chessboard';
import { useGamePrefs, MOVE_SPEEDS } from '../contexts/GamePrefsContext';
import CustomBoardColors from '../components/CustomBoardColors';
import { BOARD_THEMES, useBoardTheme } from '../contexts/BoardThemeContext';
import AppThemePanel from '../components/AppThemePanel';
import { PIECE_THEMES, usePieceTheme } from '../contexts/PieceThemeContext';
import AvatarStudio from '../components/AvatarStudio';
import ProfilePanel from '../components/ProfilePanel';
import MemberPanel from '../components/MemberPanel';
import ChessboardDevicePanel from '../components/ChessboardDevicePanel';

// Mini 4-square swatch to preview each board theme
function BoardSwatch({ light, dark, size = 44 }) {
  const half = size / 2;
  return (
    <div style={{
      width: size, height: size,
      borderRadius: 'var(--radius-sm)',
      overflow: 'hidden',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr 1fr',
      boxShadow: '0 2px 8px var(--color-black-a35)',
      flexShrink: 0,
    }}>
      <div style={{ background: light, width: half, height: half }} />
      <div style={{ background: dark,  width: half, height: half }} />
      <div style={{ background: dark,  width: half, height: half }} />
      <div style={{ background: light, width: half, height: half }} />
    </div>
  );
}

// Mini piece preview — shows a knight SVG on a 2x2 square board background
function PieceSwatch({ pathFn, light, dark, size = 56 }) {
  const half = size / 2;
  return (
    <div style={{
      width: size, height: size,
      borderRadius: 'var(--radius-sm)',
      overflow: 'hidden',
      position: 'relative',
      boxShadow: '0 2px 8px var(--color-black-a35)',
      flexShrink: 0,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr 1fr',
    }}>
      {/* 2×2 board squares */}
      <div style={{ background: light }} />
      <div style={{ background: dark }} />
      <div style={{ background: dark }} />
      <div style={{ background: light }} />
      {/* Knight overlaid in centre */}
      <img
        src={pathFn('wN')}
        alt="piece preview"
        style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80%', height: '80%',
          objectFit: 'contain',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
        draggable={false}
      />
    </div>
  );
}

// Shared card button
function OptionCard({ isActive, onClick, defaultBadge, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        padding: '14px 10px',
        background: isActive ? 'var(--color-accent-a15)' : 'var(--color-white-a04)',
        border: isActive ? '2px solid var(--color-accent)' : '2px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer',
        transition: 'all var(--dur-fast)',
        position: 'relative',
        outline: 'none',
        width: '100%',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.border = '2px solid var(--color-accent-a40)';
          e.currentTarget.style.background = 'var(--color-accent-a08)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.border = '2px solid var(--color-border)';
          e.currentTarget.style.background = 'var(--color-white-a04)';
        }
      }}
    >
      {defaultBadge && (
        <span style={{
          position: 'absolute', top: 6, right: 6,
          background: 'var(--color-surface-2)', color: 'var(--color-text-muted)',
          fontSize: 9, fontWeight: 600,
          padding: '1px 5px', borderRadius: 'var(--radius-sm)',
          letterSpacing: '0.5px', textTransform: 'uppercase',
        }}>DEFAULT</span>
      )}
      {children}
      {isActive && (
        <span style={{
          position: 'absolute', bottom: 7, right: 7,
          width: 18, height: 18,
          background: 'var(--color-accent)', borderRadius: 'var(--radius-circle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Tick drawn in the page background colour so it reads on any accent. */}
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="var(--color-bg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      )}
    </button>
  );
}

const PREVIEW_FENS = [
  '8/8/8/8/8/2N5/8/8 w - - 0 1',
  '8/8/8/3N4/8/8/8/8 w - - 0 1',
];

function Choice({ active, onClick, title, sub }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: '1 1 140px', textAlign: 'left', padding: '12px 14px', cursor: 'pointer',
        borderRadius: 'var(--radius-md)',
        border: active ? '2px solid var(--color-accent)' : '2px solid var(--color-border)',
        background: active ? 'var(--color-accent-a15)' : 'var(--color-white-a04)',
        color: 'var(--color-text)',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14, color: active ? 'var(--color-accent)' : 'var(--color-text)' }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{sub}</div>
    </button>
  );
}

function GamesPanel() {
  const { moveSpeed, autoQueen, setGamePref } = useGamePrefs();
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI(v => (v + 1) % 2), 1400);
    return () => clearInterval(id);
  }, []);

  const card = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '24px', marginBottom: 20 };
  const h2 = { fontSize: 18, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 };
  const p = { color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 16 };

  return (
    <>
      <section style={card}>
        <h2 style={h2}>🏃 Piece movement</h2>
        <p style={p}>How fast pieces glide to their square. Applies to games, puzzles and studies (races always stay fast).</p>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, flex: '1 1 300px' }}>
            <Choice active={moveSpeed === 'slow'} onClick={() => setGamePref('moveSpeed', 'slow')} title="Slow" sub={`Easy to follow · ${MOVE_SPEEDS.slow}ms`} />
            <Choice active={moveSpeed === 'normal'} onClick={() => setGamePref('moveSpeed', 'normal')} title="Normal (default)" sub={`Smooth · ${MOVE_SPEEDS.normal}ms`} />
            <Choice active={moveSpeed === 'fast'} onClick={() => setGamePref('moveSpeed', 'fast')} title="Fast" sub={`Snappy · ${MOVE_SPEEDS.fast}ms`} />
          </div>
          <div style={{ flex: 'none' }}>
            <Chessboard
              position={PREVIEW_FENS[i]}
              boardWidth={200}
              draggable={false}
              resizable={false}
              showCoordinates={false}
              mute
            />
            <div style={{ fontSize: 11, color: 'var(--color-text-faint)', textAlign: 'center', marginTop: 6 }}>Preview</div>
          </div>
        </div>
      </section>

      <section style={card}>
        <h2 style={h2}>♛ Pawn promotion</h2>
        <p style={p}>In games only (vs friends, vs computer, arena tournaments). Puzzles always ask, since the right piece is part of the answer.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Choice active={!autoQueen} onClick={() => setGamePref('autoQueen', false)} title="Ask every time (default)" sub="Pick queen, rook, bishop or knight" />
          <Choice active={autoQueen} onClick={() => setGamePref('autoQueen', true)} title="Always queen" sub="Promotes instantly, no popup" />
        </div>
      </section>
    </>
  );
}

export default function SettingsPage() {
  const { theme: activeTheme, setThemeById } = useBoardTheme();
  const { pieceTheme: activePiece, setPieceThemeById } = usePieceTheme();
  // Theme state now lives in <AppThemePanel>, which also owns unlock status.
  // ?tab=profile opens the Profile tab directly, so anything that needs a user
  // to fill in their Chess.com / Lichess usernames can link straight there
  // instead of dropping them on Board themes to go hunting.
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    searchParams.get('tab') || 'board'   // 'board' | 'pieces' | 'profile' | …
  );

  const TAB_STYLE = (id) => ({
    padding: '10px 24px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    transition: 'all var(--dur-fast)',
    background: activeTab === id ? 'var(--color-accent-a20)' : 'transparent',
    color: activeTab === id ? 'var(--color-accent)' : 'var(--color-text-muted)',
    borderBottom: activeTab === id
      ? '2px solid var(--color-accent)'
      : '2px solid transparent',
  });

  return (
    <div style={{
      minHeight: '100vh',
      // Themed: this is the page that demonstrates the themes, so it has to
      // respond to them or picking one appears to do nothing.
      background: 'var(--color-bg)',
      color: 'var(--color-text)',
      fontFamily: "'Poppins', 'Segoe UI', sans-serif",
      padding: '40px 24px',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Header */}
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-accent)', marginBottom: 6, letterSpacing: '-0.3px' }}>
          ⚙️ Settings
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 28 }}>
          Your preferences are saved per account and apply everywhere across the app.
        </p>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          marginBottom: 28,
          borderBottom: '1px solid var(--color-border)',
        }}>
          {/* App theme first: it changes the whole interface, where the board and
              piece settings each change one part of it. */}
          <button style={TAB_STYLE('app')} onClick={() => setActiveTab('app')}>
            ✨ App Theme
          </button>
          <button style={TAB_STYLE('board')} onClick={() => setActiveTab('board')}>
            🎨 Board Theme
          </button>
          <button style={TAB_STYLE('pieces')} onClick={() => setActiveTab('pieces')}>
            ♞ Pieces
          </button>
          <button style={TAB_STYLE('games')} onClick={() => setActiveTab('games')}>
            ♟ Games
          </button>
          <button style={TAB_STYLE('avatar')} onClick={() => setActiveTab('avatar')}>
            🖼️ Avatar
          </button>
          <button style={TAB_STYLE('profile')} onClick={() => setActiveTab('profile')}>
            👤 Profile
          </button>
          <button style={TAB_STYLE('member')} onClick={() => setActiveTab('member')}>
            💬 Member
          </button>
          <button style={TAB_STYLE('chessboard')} onClick={() => setActiveTab('chessboard')}>
            ♟ Chessboard
          </button>
        </div>

        {/* ── Smart chessboard pairing (?tab=chessboard) ── */}
        {activeTab === 'chessboard' && <ChessboardDevicePanel />}

        {/* ── Member Tab ── */}
        {activeTab === 'member' && (
          <MemberPanel />
        )}

        {/* ── Avatar Tab ── */}
        {activeTab === 'avatar' && (
          <AvatarStudio />
        )}

        {/* ── Profile Tab ── */}
        {activeTab === 'profile' && (
          <ProfilePanel />
        )}

        {activeTab === 'games' && <GamesPanel />}

        {/* ── App Theme Tab ── */}
        {activeTab === 'app' && <AppThemePanel />}

        {/* ── Board Theme Tab ── */}
        {activeTab === 'board' && (
          <section style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '28px 24px',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
              🎨 Chessboard Theme
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 24 }}>
              Choose how your board looks. The theme applies to every game, puzzle, and study.
            </p>

            {/* Your own colours first. It used to sit at the very bottom, below
                the preset grid and the live preview, so it read as a footnote and
                was easy to miss entirely. */}
            <CustomBoardColors />

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 16,
            }}>
              {BOARD_THEMES.map((t, i) => (
                <OptionCard
                  key={t.id}
                  isActive={t.id === activeTheme.id}
                  onClick={() => setThemeById(t.id)}
                  defaultBadge={i === 0}
                >
                  <BoardSwatch light={t.light} dark={t.dark} size={56} />
                  <span style={{
                    fontSize: 12,
                    fontWeight: t.id === activeTheme.id ? 600 : 400,
                    color: t.id === activeTheme.id ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    textAlign: 'center',
                    lineHeight: 1.3,
                  }}>
                    {t.name}
                  </span>
                </OptionCard>
              ))}
            </div>

            {/* Live preview */}
            <div style={{
              marginTop: 28,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '14px 18px',
              background: 'var(--color-black-a20)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-white-a07)',
            }}>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Active theme:</span>
              <BoardSwatch light={activeTheme.light} dark={activeTheme.dark} size={48} />
              <div>
                <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: 14 }}>{activeTheme.name}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 2 }}>
                  Light {activeTheme.light} · Dark {activeTheme.dark}
                </div>
              </div>
            </div>

          </section>
        )}

        {/* ── Pieces Tab ── */}
        {activeTab === 'pieces' && (
          <section style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '28px 24px',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
              ♞ Piece Style
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 24 }}>
              Choose your piece design. Applies to every board across the app — games, puzzles, and studies.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: 16,
            }}>
              {PIECE_THEMES.map((pt, i) => (
                <OptionCard
                  key={pt.id}
                  isActive={pt.id === activePiece.id}
                  onClick={() => setPieceThemeById(pt.id)}
                  defaultBadge={i === 0}
                >
                  <PieceSwatch
                    pathFn={pt.pathFn}
                    light={activeTheme.light}
                    dark={activeTheme.dark}
                    size={64}
                  />
                  <span style={{
                    fontSize: 12,
                    fontWeight: pt.id === activePiece.id ? 600 : 400,
                    color: pt.id === activePiece.id ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    textAlign: 'center',
                    lineHeight: 1.3,
                  }}>
                    {pt.name}
                  </span>
                </OptionCard>
              ))}
            </div>

            {/* Live preview */}
            <div style={{
              marginTop: 28,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '14px 18px',
              background: 'var(--color-black-a20)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-white-a07)',
            }}>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Active pieces:</span>
              <PieceSwatch
                pathFn={activePiece.pathFn}
                light={activeTheme.light}
                dark={activeTheme.dark}
                size={52}
              />
              <div>
                <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: 14 }}>{activePiece.name}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 2 }}>
                  {activePiece.isDefault ? 'Default MPChess pieces' : `Piece set: ${activePiece.id}`}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

