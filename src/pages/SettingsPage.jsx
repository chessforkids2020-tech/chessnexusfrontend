import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CustomBoardColors from '../components/CustomBoardColors';
import { BOARD_THEMES, useBoardTheme } from '../contexts/BoardThemeContext';
import { useUiTheme } from '../contexts/UiThemeContext';
import { PIECE_THEMES, usePieceTheme } from '../contexts/PieceThemeContext';
import AvatarStudio from '../components/AvatarStudio';
import ProfilePanel from '../components/ProfilePanel';
import MemberPanel from '../components/MemberPanel';

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
      borderRadius: 6,
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
          padding: '1px 5px', borderRadius: 4,
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

export default function SettingsPage() {
  const { theme: activeTheme, setThemeById } = useBoardTheme();
  const { pieceTheme: activePiece, setPieceThemeById } = usePieceTheme();
  const { themeId: uiThemeId, themes: uiThemes, setThemeId: setUiThemeId } = useUiTheme();
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
          <button style={TAB_STYLE('avatar')} onClick={() => setActiveTab('avatar')}>
            🖼️ Avatar
          </button>
          <button style={TAB_STYLE('profile')} onClick={() => setActiveTab('profile')}>
            👤 Profile
          </button>
          <button style={TAB_STYLE('member')} onClick={() => setActiveTab('member')}>
            💬 Member
          </button>
        </div>

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

        {/* ── App Theme Tab ── */}
        {activeTab === 'app' && (
          <section style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '28px 24px',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
              ✨ App Theme
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 24 }}>
              Changes the colours of the whole app. Sizes and layout stay the same —
              only the palette changes. Your choice is saved to this account.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 16,
            }}>
              {uiThemes.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setUiThemeId(t.id)}
                  aria-pressed={t.id === uiThemeId}
                  style={{
                    textAlign: 'left',
                    cursor: 'pointer',
                    padding: 0,
                    overflow: 'hidden',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--color-surface-2)',
                    border: t.id === uiThemeId
                      ? '2px solid var(--color-accent)'
                      : '2px solid var(--color-border)',
                    boxShadow: t.id === uiThemeId ? 'var(--accent-glow)' : 'none',
                    transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)',
                  }}
                >
                  {/* Swatch: a miniature of the theme drawn in its OWN colours,
                      not the active ones, so all six previews are comparable at
                      a glance without switching to each in turn. */}
                  <div style={{
                    background: t.swatch.bg,
                    padding: '16px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}>
                    <span style={{
                      width: 34, height: 34, flex: 'none',
                      borderRadius: 'var(--radius-md)',
                      background: t.swatch.surface,
                      border: `1px solid ${t.swatch.accent}55`,
                    }} />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                      <span style={{ height: 7, width: '75%', borderRadius: 4, background: t.swatch.text, opacity: 0.85 }} />
                      <span style={{ height: 7, width: '45%', borderRadius: 4, background: t.swatch.accent }} />
                    </span>
                  </div>

                  <div style={{ padding: '10px 14px 13px' }}>
                    <div style={{
                      fontSize: 13.5, fontWeight: 700,
                      color: t.id === uiThemeId ? 'var(--color-accent)' : 'var(--color-text)',
                      marginBottom: 2,
                    }}>
                      {t.name}{t.id === uiThemeId ? ' ✓' : ''}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
                      {t.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

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
              borderRadius: 10,
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
              borderRadius: 10,
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

