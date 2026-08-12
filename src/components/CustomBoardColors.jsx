// src/components/CustomBoardColors.jsx
//
// Paid custom board colours: pick your own light and dark squares instead of
// choosing from the 16 free presets.
//
// Bought ONCE with XP, then the colours can be changed as often as the user
// likes — charging per change would punish someone for adjusting a shade, which
// is the entire point of owning a picker.
//
// The purchase and the chosen hexes live SERVER-side (User.customBoardUnlocked
// / customBoardLight / customBoardDark). The free presets are localStorage-only,
// which is fine while they cost nothing, but a paid feature kept there could be
// granted from DevTools and would vanish on a cache clear or another device.
import React, { useEffect, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import api from '../api';
import { useBoardTheme, CUSTOM_THEME_ID } from '../contexts/BoardThemeContext';

// Small 2x2 board preview, matching the swatches used for the presets.
function Swatch({ light, dark, size = 56 }) {
  const cell = { width: size / 2, height: size / 2 };
  return (
    <div style={{ width: size, height: size, display: 'grid', gridTemplateColumns: '1fr 1fr', borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ ...cell, background: light }} />
      <div style={{ ...cell, background: dark }} />
      <div style={{ ...cell, background: dark }} />
      <div style={{ ...cell, background: light }} />
    </div>
  );
}

export default function CustomBoardColors() {
  const { theme, setCustomTheme, setThemeById } = useBoardTheme();

  const [state, setState] = useState(null);      // { unlocked, light, dark, walletXp, price }
  const [light, setLight] = useState('#EEEED2');
  const [dark, setDark] = useState('#769656');
  const [editing, setEditing] = useState(null);  // 'light' | 'dark' | null
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/api/auth/board-colors')
      .then(res => {
        setState(res.data);
        if (res.data?.light) setLight(res.data.light);
        if (res.data?.dark) setDark(res.data.dark);
      })
      .catch(() => setState({ unlocked: false, walletXp: 0, price: 250 }));
  }, []);

  const unlock = async () => {
    if (busy) return;
    setBusy(true); setErr('');
    try {
      const res = await api.post('/api/auth/board-colors/unlock');
      setState(s => ({ ...s, unlocked: true, walletXp: res.data.walletXp }));
    } catch (e) {
      const d = e.response?.data;
      setErr(d?.shortfall ? `Not enough XP — you need ${d.shortfall} more.` : (d?.message || 'Could not unlock.'));
    } finally { setBusy(false); }
  };

  const save = async () => {
    if (busy) return;
    setBusy(true); setErr(''); setSaved(false);
    try {
      const res = await api.put('/api/auth/board-colors', { light, dark });
      // Push into the provider so every board on screen updates immediately.
      setCustomTheme({ light: res.data.light, dark: res.data.dark });
      setSaved(true);
      setEditing(null);
      setTimeout(() => setSaved(false), 2200);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not save colours.');
    } finally { setBusy(false); }
  };

  if (!state) return null;

  const S = {
    wrap: {
      // Sits ABOVE the preset grid in Settings, so the spacing goes below it.
      // Kept on the component (not the parent) because this whole panel renders
      // null while state is loading — a parent margin would leave a gap there.
      marginBottom: 28, padding: '18px 20px',
      background: 'rgba(0,0,0,0.25)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 'var(--radius-lg)',
    },
    head: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
    title: { fontSize: 15, fontWeight: 700, color: '#e2e8f0' },
    sub: { fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 1.5 },
    btn: {
      background: '#f59e0b', color: '#111', border: 'none', borderRadius: 'var(--radius-md)',
      padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
    },
    ghost: {
      background: 'rgba(255,255,255,0.06)', color: '#e2e8f0',
      border: '1px solid rgba(255,255,255,0.16)', borderRadius: 'var(--radius-md)',
      padding: '8px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
    },
    swatchBtn: (active) => ({
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${active ? '#f59e0b' : 'rgba(255,255,255,0.14)'}`,
      borderRadius: 'var(--radius-md)', padding: '8px 12px', cursor: 'pointer', color: '#e2e8f0',
    }),
    chip: (c) => ({ width: 26, height: 26, borderRadius: 'var(--radius-sm)', background: c, border: '1px solid rgba(255,255,255,0.2)' }),
    hex: { fontFamily: 'monospace', fontSize: 12.5 },
    err: { color: '#f87171', fontSize: 12.5, marginTop: 10 },
    ok: { color: '#34d399', fontSize: 12.5, marginTop: 10, fontWeight: 600 },
  };

  // ── Locked: show the offer ──
  if (!state.unlocked) {
    const canAfford = (state.walletXp || 0) >= state.price;
    return (
      <div style={S.wrap}>
        <div style={S.head}>
          <Swatch light={light} dark={dark} size={48} />
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={S.title}>🎨 Your own board colours</div>
            <div style={S.sub}>
              Pick any light and dark squares you like. Unlock once — after that you can
              change them as often as you want, free.
            </div>
          </div>
          <button
            type="button"
            style={{ ...S.btn, opacity: canAfford ? 1 : 0.5, cursor: canAfford ? 'pointer' : 'not-allowed' }}
            onClick={unlock}
            disabled={busy || !canAfford}
          >
            {busy ? 'Unlocking…'
              : canAfford ? `👛 Unlock for ${state.price} XP`
              : `Need ${state.price - (state.walletXp || 0)} more XP`}
          </button>
        </div>
        {err && <div style={S.err}>{err}</div>}
      </div>
    );
  }

  // ── Unlocked: the picker ──
  const isActive = theme.id === CUSTOM_THEME_ID;
  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <Swatch light={light} dark={dark} size={48} />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={S.title}>🎨 Your own board colours</div>
          <div style={S.sub}>Tap a square to change its colour, then save.</div>
        </div>
        {!isActive && (
          <button type="button" style={S.ghost} onClick={() => setThemeById(CUSTOM_THEME_ID)}>
            Use my colours
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        <button type="button" style={S.swatchBtn(editing === 'light')} onClick={() => setEditing(editing === 'light' ? null : 'light')}>
          <span style={S.chip(light)} />
          <span>Light <span style={S.hex}>{light}</span></span>
        </button>
        <button type="button" style={S.swatchBtn(editing === 'dark')} onClick={() => setEditing(editing === 'dark' ? null : 'dark')}>
          <span style={S.chip(dark)} />
          <span>Dark <span style={S.hex}>{dark}</span></span>
        </button>
      </div>

      {editing && (
        <div style={{ marginTop: 14 }}>
          <HexColorPicker
            color={editing === 'light' ? light : dark}
            onChange={editing === 'light' ? setLight : setDark}
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" style={S.btn} onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save colours'}
        </button>
        {saved && <span style={S.ok}>✓ Saved</span>}
      </div>

      {err && <div style={S.err}>{err}</div>}
    </div>
  );
}
