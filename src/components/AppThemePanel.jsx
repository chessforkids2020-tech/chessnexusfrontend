// AppThemePanel — the App Theme picker in Settings.
//
// THREE FREE, THREE EARNED. Obsidian Glass, Midnight Cyan and Deep Ember are
// free for everyone — one pure black, one cool, one warm, so a user who never
// spends XP still has a real choice. The other three cost XP.
//
// The split is 3/3 rather than 1/5 because all six shipped free and users are
// already choosing them: locking five would take a theme away from most of the
// people who had picked one. Three leaves a genuine free choice while still
// giving XP something worth earning.
//
// Admins, elites and active supporters see every theme unlocked, matching the
// server rule in backend/helpers/privileged.js.
import React, { useCallback, useEffect, useState } from 'react';
import api from '../api';
import { useUiTheme } from '../contexts/UiThemeContext';

// Mirrors FREE_THEME_IDS in backend/models/ThemeUnlock.js. Only used when the
// server cannot be reached — the real list comes from GET /api/auth/themes, and
// the server re-checks every unlock regardless.
const FREE_FALLBACK = ['obsidianGlass', 'midnightCyan', 'deepEmber'];

export default function AppThemePanel() {
  const { themeId: activeId, themes, setThemeId } = useUiTheme();

  const [owned, setOwned] = useState(null);      // Set of ids, null while loading
  const [price, setPrice] = useState(1000);
  const [walletXp, setWalletXp] = useState(0);
  const [privileged, setPrivileged] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/auth/themes');
      const d = res.data || {};
      setOwned(new Set(d.unlocked || []));
      setPrice(d.price ?? 1000);
      setWalletXp(d.walletXp || 0);
      setPrivileged(!!d.privileged);
    } catch {
      // Never leave the picker unusable because a lookup failed — fall back to
      // "only the free theme is owned", which is the safe assumption.
      setOwned(new Set(FREE_FALLBACK));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const unlock = async (id, name) => {
    if (busyId) return;
    setBusyId(id); setError('');
    try {
      await api.post('/api/auth/themes/unlock', { themeId: id });
      await load();
      setThemeId(id);          // apply what they just bought, immediately
    } catch (e) {
      const d = e?.response?.data;
      setError(
        d?.shortfall
          ? `${name} costs ${d.price} XP — you need ${d.shortfall} more.`
          : (d?.message || 'Could not unlock that theme.')
      );
    } finally {
      setBusyId(null);
    }
  };

  // GRANDFATHERING. All six themes shipped free, so somebody may already be
  // using one that now costs XP. Their choice is honoured: the theme they are
  // ALREADY ON counts as owned, and they are never asked to buy back something
  // they were using before the price existed.
  //
  // It is also the honest thing to render. The active theme is applied from
  // localStorage on page load regardless of this panel, so showing it as locked
  // while the whole app is painted in it would just look broken.
  const isOwned = (id) =>
    privileged
    || id === activeId
    || (owned ? owned.has(id) : FREE_FALLBACK.includes(id));

  return (
    <section style={S.card}>
      <div style={S.head}>
        <div>
          <h2 style={S.h2}>✨ App Theme</h2>
          <p style={S.sub}>
            Changes the colours of the whole app. Sizes and layout stay the same —
            only the palette changes. Your choice is saved to this account.
          </p>
        </div>
        {!privileged && owned && (
          <div style={S.wallet} title="Earn XP from puzzles, games and streaks">
            <span style={S.walletNum}>{walletXp.toLocaleString()}</span>
            <span style={S.walletLabel}>XP</span>
          </div>
        )}
      </div>

      {error && <div style={S.error}>{error}</div>}

      <div style={S.grid}>
        {themes.map(t => {
          const unlocked = isOwned(t.id);
          const active = t.id === activeId;
          const busy = busyId === t.id;
          const affordable = walletXp >= price;

          return (
            <div key={t.id} style={{
              ...S.tile,
              borderColor: active ? 'var(--color-accent)' : 'var(--color-border)',
              boxShadow: active ? 'var(--accent-glow)' : 'none',
            }}>
              {/* Swatch: a miniature drawn in the theme's OWN colours, not the
                  active ones, so all six are comparable without switching to
                  each in turn. Dimmed while locked. */}
              <button
                type="button"
                onClick={() => unlocked && setThemeId(t.id)}
                disabled={!unlocked}
                aria-pressed={active}
                style={{
                  ...S.swatchBtn,
                  background: t.swatch.bg,
                  cursor: unlocked ? 'pointer' : 'default',
                  opacity: unlocked ? 1 : 0.45,
                  filter: unlocked ? 'none' : 'grayscale(0.5)',
                }}
              >
                <span style={{
                  width: 34, height: 34, flex: 'none',
                  borderRadius: 'var(--radius-md)',
                  background: t.swatch.surface,
                  border: `1px solid ${t.swatch.accent}55`,
                }} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                  <span style={{ height: 7, width: '75%', borderRadius: 'var(--radius-sm)', background: t.swatch.text, opacity: 0.85 }} />
                  <span style={{ height: 7, width: '45%', borderRadius: 'var(--radius-sm)', background: t.swatch.accent }} />
                </span>
                {!unlocked && <span style={S.lock} aria-hidden="true">🔒</span>}
              </button>

              <div style={S.body}>
                <div style={{
                  ...S.name,
                  color: active ? 'var(--color-accent)' : 'var(--color-text)',
                }}>
                  {t.name}{active ? ' ✓' : ''}
                </div>
                <div style={S.desc}>{t.description}</div>

                {unlocked ? (
                  FREE_FALLBACK.includes(t.id) && !privileged
                    ? <div style={S.freeTag}>Free for everyone</div>
                    : null
                ) : (
                  <button
                    type="button"
                    onClick={() => unlock(t.id, t.name)}
                    disabled={busy || !affordable}
                    style={{
                      ...S.buyBtn,
                      opacity: (busy || !affordable) ? 0.55 : 1,
                      cursor: (busy || !affordable) ? 'not-allowed' : 'pointer',
                    }}
                    title={affordable ? `Unlock for ${price} XP` : `You need ${price - walletXp} more XP`}
                  >
                    {busy ? 'Unlocking…' : `🔓 ${price.toLocaleString()} XP`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!privileged && (
        <p style={S.foot}>
          Earn XP from puzzles, games, streaks and studies. Each theme unlocks
          permanently — {price.toLocaleString()} XP once, then it is yours.
        </p>
      )}
    </section>
  );
}

const S = {
  card: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-xl)',
    padding: '28px 24px',
  },
  head: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  h2: { fontSize: 18, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 4px' },
  sub: { color: 'var(--color-text-muted)', fontSize: 13, margin: '0 0 24px', maxWidth: '58ch' },
  wallet: {
    display: 'inline-flex', alignItems: 'baseline', gap: 5,
    padding: '6px 12px', borderRadius: 'var(--radius-pill)',
    background: 'var(--color-accent-a12)', border: '1px solid var(--color-accent-a30)',
    flex: 'none',
  },
  walletNum: { color: 'var(--color-accent)', fontWeight: 800, fontSize: 15 },
  walletLabel: { color: 'var(--color-text-muted)', fontSize: 11, fontWeight: 700 },
  error: {
    marginBottom: 14, padding: '9px 12px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-danger-a12)', border: '1px solid var(--color-danger-a30)',
    color: 'var(--color-danger)', fontSize: 13, fontWeight: 600,
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16 },
  tile: {
    borderRadius: 'var(--radius-lg)',
    background: 'var(--color-surface-2)',
    border: '2px solid var(--color-border)',
    overflow: 'hidden',
    transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)',
  },
  swatchBtn: {
    position: 'relative', width: '100%',
    padding: '16px 14px', border: 'none',
    display: 'flex', alignItems: 'center', gap: 10,
  },
  lock: { position: 'absolute', top: 8, right: 10, fontSize: 15 },
  body: { padding: '10px 14px 13px' },
  name: { fontSize: 13.5, fontWeight: 700, marginBottom: 2 },
  desc: { fontSize: 11.5, color: 'var(--color-text-muted)', lineHeight: 1.45 },
  freeTag: { marginTop: 8, fontSize: 11, fontWeight: 700, color: 'var(--color-success)' },
  buyBtn: {
    marginTop: 10, width: '100%',
    padding: '7px 10px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-accent-a30)',
    background: 'var(--color-accent-a12)',
    color: 'var(--color-accent)',
    fontSize: 12.5, fontWeight: 800, fontFamily: 'inherit',
  },
  foot: {
    margin: '18px 0 0', paddingTop: 14,
    borderTop: '1px solid var(--color-border)',
    color: 'var(--color-text-faint)', fontSize: 12.5, lineHeight: 1.6,
  },
};
