// pages/AdminBlunderLibrary.jsx
// Admin curates the "find the blunders" library: named sets, each with one or
// more games (PGN + blunder answers). Coaches load a whole set into a blunder
// assignment. Admin-only (routed behind requiredRole="admin").
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const blankBlunder = () => ({ move: '', betterMove: '', explanation: '' });
const blankGame = () => ({ title: '', pgn: '', blunders: [blankBlunder()] });
const blankForm = () => ({ name: '', description: '', tag: '', premium: false, games: [blankGame()] });

export default function AdminBlunderLibrary() {
  const navigate = useNavigate();
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(blankForm());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/api/blunder-library');
      setSets(r.data?.sets || []);
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load library.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const reset = () => { setForm(blankForm()); setEditingId(null); setFormErr(''); };

  const startEdit = (s) => {
    setEditingId(s._id);
    setForm({
      name: s.name || '', description: s.description || '', tag: s.tag || '', premium: !!s.premium,
      games: (s.games || []).length ? s.games.map(g => ({
        title: g.title || '', pgn: g.pgn || '',
        blunders: (g.blunders || []).length ? g.blunders.map(b => ({ move: b.move || '', betterMove: b.betterMove || '', explanation: b.explanation || '' })) : [blankBlunder()]
      })) : [blankGame()],
    });
    setFormErr('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── game/blunder editing ──
  const setGames = (games) => setForm(f => ({ ...f, games }));
  const addGame = () => setGames([...form.games, blankGame()]);
  const removeGame = (gi) => setGames(form.games.filter((_, i) => i !== gi));
  const updateGame = (gi, field, val) => setGames(form.games.map((g, i) => i === gi ? { ...g, [field]: val } : g));
  const addBlunder = (gi) => setGames(form.games.map((g, i) => i === gi ? { ...g, blunders: [...g.blunders, blankBlunder()] } : g));
  const removeBlunder = (gi, bi) => setGames(form.games.map((g, i) => i === gi ? { ...g, blunders: g.blunders.filter((_, j) => j !== bi) } : g));
  const updateBlunder = (gi, bi, field, val) => setGames(form.games.map((g, i) => i === gi ? { ...g, blunders: g.blunders.map((b, j) => j === bi ? { ...b, [field]: val } : b) } : g));

  const save = async (e) => {
    e.preventDefault();
    setFormErr('');
    if (!form.name.trim()) { setFormErr('Give the set a name.'); return; }
    const games = form.games
      .map(g => ({ title: g.title.trim(), pgn: g.pgn.trim(), blunders: g.blunders.filter(b => b.move.trim()).map(b => ({ move: b.move.trim(), betterMove: b.betterMove.trim(), explanation: b.explanation.trim() })) }))
      .filter(g => g.pgn && g.blunders.length > 0);
    if (games.length === 0) { setFormErr('Add at least one game with a PGN and a blunder answer.'); return; }
    setSaving(true);
    try {
      const body = { name: form.name, description: form.description, tag: form.tag, premium: form.premium, games };
      if (editingId) await api.put(`/api/blunder-library/${editingId}`, body);
      else await api.post('/api/blunder-library', body);
      reset();
      await load();
    } catch (err) {
      setFormErr(err.response?.data?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s) => {
    if (!window.confirm(`Delete "${s.name}"? Coaches will no longer see it.`)) return;
    try { await api.delete(`/api/blunder-library/${s._id}`); await load(); if (editingId === s._id) reset(); }
    catch (err) { alert(err.response?.data?.message || 'Could not delete.'); }
  };

  const toggleActive = async (s) => {
    try { await api.put(`/api/blunder-library/${s._id}`, { active: !s.active }); await load(); }
    catch (err) { alert(err.response?.data?.message || 'Could not update.'); }
  };

  const st = styles;
  return (
    <div style={st.page}>
      <div style={st.header}>
        <div>
          <h1 style={st.h1}>🔎 Blunder Library</h1>
          <p style={st.sub}>Named sets of games with blunder answers. Coaches load these into assignments.</p>
        </div>
        <button style={st.ghost} onClick={() => navigate('/admin')}>← Admin</button>
      </div>

      {error && <div style={st.err}>{error}</div>}

      {/* ── Create / edit form ── */}
      <form onSubmit={save} style={st.card}>
        <h2 style={st.h2}>{editingId ? 'Edit set' : 'New set'}</h2>
        <div style={st.row}>
          <label style={{ ...st.field, flex: 2 }}>
            <span style={st.label}>Set name *</span>
            <input style={st.input} value={form.name} maxLength={200}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Classic opening traps" />
          </label>
          <label style={{ ...st.field, flex: 1 }}>
            <span style={st.label}>Tag / level (optional)</span>
            <input style={st.input} value={form.tag} maxLength={80}
              onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
              placeholder="Beginner, Tactics…" />
          </label>
        </div>
        <label style={st.field}>
          <span style={st.label}>Description (optional)</span>
          <input style={st.input} value={form.description} maxLength={2000}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </label>

        {/* Access tier: free (all coaches) vs premium (subscribed coaches only) */}
        <div style={st.field}>
          <span style={st.label}>Access</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button"
              style={{ ...st.ghost, ...(!form.premium ? { borderColor: '#10b981', color: '#6ee7b7' } : {}) }}
              onClick={() => setForm(f => ({ ...f, premium: false }))}>🆓 Free — any coach</button>
            <button type="button"
              style={{ ...st.ghost, ...(form.premium ? { borderColor: '#fbbf24', color: '#fcd34d' } : {}) }}
              onClick={() => setForm(f => ({ ...f, premium: true }))}>💎 Premium — subscribed only</button>
          </div>
        </div>

        {form.games.map((g, gi) => (
          <div key={gi} style={st.game}>
            <div style={st.gameHead}>
              <strong>Game {gi + 1}</strong>
              {form.games.length > 1 && <button type="button" style={st.linkDanger} onClick={() => removeGame(gi)}>Remove game</button>}
            </div>
            <label style={st.field}>
              <span style={st.label}>Game label (optional — else "White vs Black")</span>
              <input style={st.input} value={g.title} onChange={e => updateGame(gi, 'title', e.target.value)} placeholder="e.g. Légal's Mate" />
            </label>
            <label style={st.field}>
              <span style={st.label}>PGN</span>
              <textarea style={{ ...st.input, minHeight: 60 }} value={g.pgn} onChange={e => updateGame(gi, 'pgn', e.target.value)} placeholder="1. e4 e5 2. Nf3 Nc6 ..." />
            </label>
            <div style={st.label}>Blunder answers (moves students must spot)</div>
            {g.blunders.map((b, bi) => (
              <div key={bi} style={st.blunderRow}>
                <input style={st.input} placeholder="Blunder move e.g. Qh5??" value={b.move} onChange={e => updateBlunder(gi, bi, 'move', e.target.value)} />
                <input style={st.input} placeholder="Better move (opt.)" value={b.betterMove} onChange={e => updateBlunder(gi, bi, 'betterMove', e.target.value)} />
                <input style={st.input} placeholder="Why (opt.)" value={b.explanation} onChange={e => updateBlunder(gi, bi, 'explanation', e.target.value)} />
                {g.blunders.length > 1 && <button type="button" style={st.linkDanger} onClick={() => removeBlunder(gi, bi)}>✕</button>}
              </div>
            ))}
            <button type="button" style={st.linkAdd} onClick={() => addBlunder(gi)}>+ Add blunder</button>
          </div>
        ))}
        <button type="button" style={st.linkAdd} onClick={addGame}>+ Add another game</button>

        {formErr && <div style={st.err}>{formErr}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button type="submit" style={st.primary} disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : '＋ Create set'}</button>
          {editingId && <button type="button" style={st.ghost} onClick={reset}>Cancel edit</button>}
        </div>
      </form>

      {/* ── Existing sets ── */}
      <h2 style={st.h2}>Library sets</h2>
      {loading ? <p style={st.sub}>Loading…</p> : sets.length === 0 ? (
        <p style={st.sub}>No sets yet. Create your first above.</p>
      ) : (
        <div style={st.list}>
          {sets.map(s => {
            const blunders = (s.games || []).reduce((n, g) => n + (g.blunders || []).filter(b => b && b.move).length, 0);
            return (
              <div key={s._id} style={{ ...st.setCard, opacity: s.active ? 1 : 0.55 }}>
                <div style={{ flex: 1 }}>
                  <div style={st.setName}>
                    {s.name}
                    {s.tag ? <span style={st.tag}>{s.tag}</span> : null}
                    <span style={s.premium ? st.premiumTag : st.freeTag}>{s.premium ? '💎 Premium' : '🆓 Free'}</span>
                  </div>
                  <div style={st.setMeta}>{(s.games || []).length} game{(s.games || []).length === 1 ? '' : 's'} · {blunders} blunder{blunders === 1 ? '' : 's'}{!s.active && ' · hidden'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={st.ghost} onClick={() => startEdit(s)}>Edit</button>
                  <button style={st.ghost} onClick={() => toggleActive(s)}>{s.active ? 'Hide' : 'Show'}</button>
                  <button style={{ ...st.ghost, color: '#f87171' }} onClick={() => remove(s)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { maxWidth: 900, margin: '0 auto', padding: '90px 20px 60px', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20, flexWrap: 'wrap' },
  h1: { margin: 0, fontSize: 24, background: 'linear-gradient(135deg,#06b6d4,#10b981)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  h2: { fontSize: 18, color: '#f1f5f9', margin: '24px 0 12px' },
  sub: { color: 'rgba(226,232,240,0.6)', fontSize: 14, margin: '4px 0 0' },
  card: { background: 'rgba(20,20,30,0.6)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 'var(--radius-lg)', padding: 18 },
  row: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  field: { display: 'block', marginBottom: 12, flex: 1, minWidth: 180 },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 },
  input: { width: '100%', boxSizing: 'border-box', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 'var(--radius-md)', padding: '9px 11px', color: '#e2e8f0', fontSize: 14 },
  game: { background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)', padding: 12, margin: '10px 0' },
  gameHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  blunderRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 6, marginBottom: 6, alignItems: 'center' },
  linkAdd: { background: 'none', border: 'none', color: '#67e8f9', cursor: 'pointer', fontSize: 13, padding: '4px 0' },
  linkDanger: { background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 13 },
  primary: { background: 'linear-gradient(135deg,#06b6d4,#10b981)', color: '#0a0a0a', border: 'none', borderRadius: 'var(--radius-md)', padding: '10px 18px', fontWeight: 700, cursor: 'pointer' },
  ghost: { background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 'var(--radius-md)', padding: '8px 14px', cursor: 'pointer', fontSize: 13 },
  err: { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', borderRadius: 'var(--radius-md)', padding: '10px 12px', margin: '10px 0', fontSize: 14 },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  setCard: { display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(20,20,30,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-lg)', padding: '12px 16px' },
  setName: { fontWeight: 700, color: '#f1f5f9', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 },
  setMeta: { fontSize: 12.5, color: 'rgba(226,232,240,0.6)', marginTop: 3 },
  tag: { fontSize: 11, fontWeight: 700, color: '#c4b5fd', background: 'rgba(139,92,246,0.18)', borderRadius: 'var(--radius-sm)', padding: '2px 7px' },
  freeTag: { fontSize: 11, fontWeight: 700, color: '#6ee7b7', background: 'rgba(16,185,129,0.15)', borderRadius: 'var(--radius-sm)', padding: '2px 7px', marginLeft: 6 },
  premiumTag: { fontSize: 11, fontWeight: 700, color: '#fcd34d', background: 'rgba(251,191,36,0.15)', borderRadius: 'var(--radius-sm)', padding: '2px 7px', marginLeft: 6 },
};
