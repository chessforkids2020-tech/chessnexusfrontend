import React, { useState } from 'react';
import { BOARD_THEMES, useBoardTheme } from '../contexts/BoardThemeContext';
import { PIECE_THEMES, usePieceTheme } from '../contexts/PieceThemeContext';
import AvatarStudio from '../components/AvatarStudio';
import ProfilePanel from '../components/ProfilePanel';

// Mini 4-square swatch to preview each board theme
function BoardSwatch({ light, dark, size = 44 }) {
  const half = size / 2;
  return (
    <div style={{
      width: size, height: size,
      borderRadius: 6,
      overflow: 'hidden',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr 1fr',
      boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
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
      borderRadius: 6,
      overflow: 'hidden',
      position: 'relative',
      boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
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
        background: isActive ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.04)',
        border: isActive ? '2px solid #06b6d4' : '2px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        cursor: 'pointer',
        transition: 'all 0.18s',
        position: 'relative',
        outline: 'none',
        width: '100%',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.border = '2px solid rgba(6,182,212,0.45)';
          e.currentTarget.style.background = 'rgba(6,182,212,0.07)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.border = '2px solid rgba(255,255,255,0.08)';
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
        }
      }}
    >
      {defaultBadge && (
        <span style={{
          position: 'absolute', top: 6, right: 6,
          background: '#1e293b', color: '#94a3b8',
          fontSize: 9, fontWeight: 600,
          padding: '1px 5px', borderRadius: 4,
          letterSpacing: '0.5px', textTransform: 'uppercase',
        }}>DEFAULT</span>
      )}
      {children}
      {isActive && (
        <span style={{
          position: 'absolute', bottom: 7, right: 7,
          width: 18, height: 18,
          background: '#06b6d4', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      )}
    </button>
  );
}

export default function SettingsPage() {
  const { theme: activeTheme, setThemeById } = useBoardTheme();
  const { pieceTheme: activePiece, setPieceThemeById } = usePieceTheme();
  const [activeTab, setActiveTab] = useState('board'); // 'board' | 'pieces'

  const TAB_STYLE = (id) => ({
    padding: '10px 24px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    transition: 'all 0.15s',
    background: activeTab === id ? 'rgba(6,182,212,0.18)' : 'transparent',
    color: activeTab === id ? '#06b6d4' : '#64748b',
    borderBottom: activeTab === id ? '2px solid #06b6d4' : '2px solid transparent',
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#f1f5f9',
      fontFamily: "'Poppins', 'Segoe UI', sans-serif",
      padding: '40px 24px',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Header */}
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#06b6d4', marginBottom: 6, letterSpacing: '-0.3px' }}>
          ⚙️ Settings
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 28 }}>
          Your preferences are saved per account and apply everywhere across the app.
        </p>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 4,
          marginBottom: 28,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <button style={TAB_STYLE('board')} onClick={() => setActiveTab('board')}>
            🎨 Board Theme
          </button>
          <button style={TAB_STYLE('pieces')} onClick={() => setActiveTab('pieces')}>
            ♞ Pieces
          </button>
          <button style={TAB_STYLE('avatar')} onClick={() => setActiveTab('avatar')}>
            🖼️ Avatar
          </button>
          <button style={TAB_STYLE('profile')} onClick={() => setActiveTab('profile')}>
            👤 Profile
          </button>
        </div>

        {/* ── Avatar Tab ── */}
        {activeTab === 'avatar' && (
          <AvatarStudio />
        )}

        {/* ── Profile Tab ── */}
        {activeTab === 'profile' && (
          <ProfilePanel />
        )}

        {/* ── Board Theme Tab ── */}
        {activeTab === 'board' && (
          <section style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '28px 24px',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>
              🎨 Chessboard Theme
            </h2>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>
              Choose how your board looks. The theme applies to every game, puzzle, and study.
            </p>

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
                    color: t.id === activeTheme.id ? '#06b6d4' : '#cbd5e1',
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
              background: 'rgba(0,0,0,0.25)',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>Active theme:</span>
              <BoardSwatch light={activeTheme.light} dark={activeTheme.dark} size={48} />
              <div>
                <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{activeTheme.name}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  Light {activeTheme.light} · Dark {activeTheme.dark}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Pieces Tab ── */}
        {activeTab === 'pieces' && (
          <section style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '28px 24px',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>
              ♞ Piece Style
            </h2>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>
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
                    color: pt.id === activePiece.id ? '#06b6d4' : '#cbd5e1',
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
              background: 'rgba(0,0,0,0.25)',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>Active pieces:</span>
              <PieceSwatch
                pathFn={activePiece.pathFn}
                light={activeTheme.light}
                dark={activeTheme.dark}
                size={52}
              />
              <div>
                <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{activePiece.name}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
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

