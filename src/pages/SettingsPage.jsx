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
import { useT, useLanguage, LANGUAGES } from '../i18n/LanguageContext';
import './SettingsPage.css';

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
  const t = useT();
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        // 6px sides (was 10): at 3-per-row on a 360px phone the card is 77px, and
        // 10px padding left 53px for the 56px board swatch.
        padding: '14px 6px',
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
        }}>{t('DEFAULT')}</span>
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
  const t = useT();
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
        <h2 style={h2}>{t('🏃 Piece movement')}</h2>
        <p style={p}>{t('How fast pieces glide to their square. Applies to games, puzzles and studies (races always stay fast).')}</p>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, flex: '1 1 300px' }}>
            <Choice active={moveSpeed === 'slow'} onClick={() => setGamePref('moveSpeed', 'slow')} title={t('Slow')} sub={t('Easy to follow · {ms}ms', { ms: MOVE_SPEEDS.slow })} />
            <Choice active={moveSpeed === 'normal'} onClick={() => setGamePref('moveSpeed', 'normal')} title={t('Normal (default)')} sub={t('Smooth · {ms}ms', { ms: MOVE_SPEEDS.normal })} />
            <Choice active={moveSpeed === 'fast'} onClick={() => setGamePref('moveSpeed', 'fast')} title={t('Fast')} sub={t('Snappy · {ms}ms', { ms: MOVE_SPEEDS.fast })} />
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
            <div style={{ fontSize: 11, color: 'var(--color-text-faint)', textAlign: 'center', marginTop: 6 }}>{t('Preview')}</div>
          </div>
        </div>
      </section>

      <section style={card}>
        <h2 style={h2}>{t('♛ Pawn promotion')}</h2>
        <p style={p}>{t('In games only (vs friends, vs computer, arena tournaments). Puzzles always ask, since the right piece is part of the answer.')}</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Choice active={!autoQueen} onClick={() => setGamePref('autoQueen', false)} title={t('Ask every time (default)')} sub={t('Pick queen, rook, bishop or knight')} />
          <Choice active={autoQueen} onClick={() => setGamePref('autoQueen', true)} title={t('Always queen')} sub={t('Promotes instantly, no popup')} />
        </div>
      </section>
    </>
  );
}

// Settings → Language. English / Spanish; saved per account (see i18n/LanguageContext).
function LanguagePanel() {
  const t = useT();
  const { lang, setLanguage } = useLanguage();
  const card = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '24px', marginBottom: 20 };
  return (
    <section style={card} data-testid="language-panel">
      <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>{t('🌐 Language')}</h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 16 }}>
        {t('Choose the language for menus, buttons and pages. Names, chat messages and text written by coaches stay as they were written.')}
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {LANGUAGES.map(l => (
          <Choice
            key={l.code}
            active={lang === l.code}
            onClick={() => setLanguage(l.code)}
            title={l.native}
            sub={l.code === 'en' ? t('English') : t('Spanish')}
          />
        ))}
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const t = useT();
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

  // App theme first: it changes the whole interface, where the board and piece
  // settings each change one part of it.
  const TABS = [
    { id: 'app',        label: t('✨ App Theme') },
    { id: 'board',      label: t('🎨 Board Theme') },
    { id: 'pieces',     label: t('♞ Pieces') },
    { id: 'games',      label: t('♟ Games') },
    { id: 'avatar',     label: t('🖼️ Avatar') },
    { id: 'profile',    label: t('👤 Profile') },
    { id: 'member',     label: t('💬 Member') },
    { id: 'chessboard', label: t('♟ Chessboard') },
    { id: 'language',   label: t('🌐 Language') },
  ];

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
          {t('⚙️ Settings')}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 28 }}>
          {t('Your preferences are saved per account and apply everywhere across the app.')}
        </p>

        {/* Tabs */}
        <div className="settings-tabs" role="tablist">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`settings-tab${activeTab === tab.id ? ' settings-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'language' && <LanguagePanel />}

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
              {t('🎨 Chessboard Theme')}
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 24 }}>
              {t('Choose how your board looks. The theme applies to every game, puzzle, and study.')}
            </p>

            {/* Your own colours first. It used to sit at the very bottom, below
                the preset grid and the live preview, so it read as a footnote and
                was easy to miss entirely. */}
            <CustomBoardColors />

            <div style={{
              display: 'grid',
              // A fixed 140px minimum fit only ONE card per row on a phone (~292px
              // of room; two cards + gap need 296). Letting the minimum shrink to a
              // third of the row gives 3 per row on phones; desktop still uses 140px.
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(140px, calc((100% - 32px) / 3)), 1fr))',
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
              <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{t('Active theme:')}</span>
              <BoardSwatch light={activeTheme.light} dark={activeTheme.dark} size={48} />
              <div>
                <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: 14 }}>{activeTheme.name}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 2 }}>
                  {t('Light')} {activeTheme.light} · {t('Dark')} {activeTheme.dark}
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
              {t('♞ Piece Style')}
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 24 }}>
              {t('Choose your piece design. Applies to every board across the app — games, puzzles, and studies.')}
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
              <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{t('Active pieces:')}</span>
              <PieceSwatch
                pathFn={activePiece.pathFn}
                light={activeTheme.light}
                dark={activeTheme.dark}
                size={52}
              />
              <div>
                <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: 14 }}>{activePiece.name}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 2 }}>
                  {activePiece.isDefault ? t('Default MPChess pieces') : t('Piece set: {id}', { id: activePiece.id })}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

