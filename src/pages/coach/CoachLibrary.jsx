// pages/coach/CoachLibrary.jsx
// The coach's reusable library in one place. Build an assignment or course once,
// keep it here, and reuse it any time. Three tabs:
//   • Templates       — reusable find-blunder / play-vs-Stockfish packs (create here)
//   • Courses          — the coach's courses (reuse = open in the builder to enroll)
//   • Blunder library  — read-only admin-authored blunder sets (free + premium)
// "Reuse" navigates to the relevant create page prefilled (via router state).
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import InlineBoardEditor from '../../components/PositionEditor/InlineBoardEditor';
import './CoachDashboard.css';
import './CoachAssignments.css'; // shared form + .ca-link-add styles for the pack builder

export default function CoachLibrary() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('templates'); // templates | courses | blunder
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [templates, setTemplates] = useState([]);
  const [templateMax, setTemplateMax] = useState(10);
  const [courses, setCourses] = useState([]);
  const [library, setLibrary] = useState([]);   // admin blunder sets
  const [subscribed, setSubscribed] = useState(true);
  const [showPack, setShowPack] = useState(false); // create-pack modal

  const load = async () => {
    setLoading(true);
    try {
      const [tpl, crs, lib] = await Promise.all([
        api.get('/api/coach/assignment-templates').catch(() => ({ data: { templates: [] } })),
        api.get('/api/coach/courses').catch(() => ({ data: { courses: [] } })),
        api.get('/api/coach/blunder-library').catch(() => ({ data: { library: [] } })),
      ]);
      setTemplates(tpl.data?.templates || []);
      setTemplateMax(tpl.data?.max || 10);
      setCourses(crs.data?.courses || []);
      setLibrary(lib.data?.library || []);
      setSubscribed(!!tpl.data?.subscribed);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load your library.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  // ── Reuse handlers — prefill the relevant create flow via router state ──
  const reuseTemplate = (tpl) =>
    navigate('/coach/assignments', { state: { reuse: { kind: 'template', template: tpl } } });
  const reuseBlunderSet = (item) => {
    if (item.locked) return;
    navigate('/coach/assignments', { state: { reuse: { kind: 'library', item } } });
  };

  const del = async (url, after) => {
    try { await api.delete(url); after(); }
    catch (err) { setError(err.response?.data?.message || 'Delete failed.'); }
  };

  if (loading) return <div className="coach-loading">Loading library…</div>;

  const TABS = [
    { id: 'templates', label: `📝 Assignment templates${templates.length ? ` (${templates.length})` : ''}` },
    { id: 'courses', label: `📚 Courses${courses.length ? ` (${courses.length})` : ''}` },
    { id: 'blunder', label: `🔎 Blunder library${library.length ? ` (${library.length})` : ''}` },
  ];

  const typeLabel = (t) => t === 'custom' ? 'Find the blunders' : t === 'fen_solution' ? 'Play vs Stockfish' : t;

  return (
    <div className="coach-dash">
      <div className="coach-dash-header">
        <div>
          <h1>📖 Coach Library</h1>
          <p className="coach-dash-sub">Build assignments and courses once — reuse them any time. Everything reusable lives here.</p>
        </div>
        <Link to="/coach/dashboard" className="btn-ghost">← Dashboard</Link>
      </div>

      {error && <div className="coach-error">⚠️ {error}</div>}

      <div className="coach-act-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`coach-act-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Assignment templates ── */}
      {tab === 'templates' && (
        <>
          <div className="coach-lib-bar">
            <span className="coach-dash-sub">{templates.length}/{templateMax} saved</span>
            <button className="btn-primary" onClick={() => setShowPack(true)} disabled={templates.length >= templateMax}>
              + Create a pack
            </button>
          </div>
          {templates.length === 0 ? (
            <div className="coach-empty">
              No packs yet. Click <strong>Create a pack</strong> to build a “find the blunders” or “play vs Stockfish” set with a title —
              then reuse it any time you create an assignment.
            </div>
          ) : (
            <div className="coach-students-grid">
              {templates.map(t => (
                <div key={t._id} className="coach-student-card">
                  <div className="coach-student-name">{t.title}</div>
                  <div style={{ fontSize: 13, color: '#a78bfa', margin: '6px 0' }}>{typeLabel(t.assignmentType)}</div>
                  {t.description && <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.6)', marginBottom: 10 }}>{t.description}</div>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-primary" onClick={() => reuseTemplate(t)}>Reuse</button>
                    <button className="btn-ghost" onClick={() => del(`/api/coach/assignment-templates/${t._id}`, () => setTemplates(v => v.filter(x => x._id !== t._id)))}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Courses ── */}
      {tab === 'courses' && (
        <>
          <div className="coach-lib-bar">
            <span className="coach-dash-sub">{courses.length} course{courses.length === 1 ? '' : 's'}</span>
            <Link to="/coach/courses" className="btn-primary">+ Build a course</Link>
          </div>
          {courses.length === 0 ? (
            <div className="coach-empty">No courses yet. Head to the <strong>Course Builder</strong> to create one.</div>
          ) : (
            <div className="coach-students-grid">
              {courses.map(c => (
                <div key={c._id} className="coach-student-card">
                  <div className="coach-student-name">{c.title}</div>
                  <div style={{ fontSize: 13, color: '#a78bfa', margin: '6px 0' }}>
                    {(c.lessonCount ?? (c.lessons || []).length)} lessons · {c.enrollmentCount || 0} enrolled
                  </div>
                  <Link to="/coach/courses" className="btn-primary" style={{ display: 'inline-block' }}>Open / reuse</Link>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Admin blunder library ── */}
      {tab === 'blunder' && (
        library.length === 0 ? (
          <div className="coach-empty">No built-in blunder sets available yet.</div>
        ) : (
          <div className="coach-students-grid">
            {library.map(item => (
              <div key={item._id} className="coach-student-card">
                <div className="coach-student-name">{item.title}{item.premium ? ' 💎' : ''}</div>
                <div style={{ fontSize: 13, color: '#a78bfa', margin: '6px 0' }}>
                  {item.gameCount || (item.games || []).length} games · {item.blunderCount || 0} blunders
                </div>
                {item.locked ? (
                  <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.6)' }}>
                    🔒 Premium — <Link to="/coach/subscription">subscribe</Link> to use.
                  </div>
                ) : (
                  <button className="btn-primary" onClick={() => reuseBlunderSet(item)}>Reuse</button>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {showPack && (
        <PackBuilderModal
          subscribed={subscribed}
          onClose={() => setShowPack(false)}
          onSaved={() => { setShowPack(false); load(); }}
        />
      )}
    </div>
  );
}

// ── Create-pack modal ──────────────────────────────────────────────────────
// A self-contained builder for the two reusable assignment types. Saves to the
// coach's template library (POST /assignment-templates) — the SAME store the
// assignment form loads from — so a saved pack is instantly reusable there.
const FREE_MAX_BLUNDER_GAMES = 3;
function PackBuilderModal({ subscribed, onClose, onSaved }) {
  const [type, setType] = useState('custom'); // 'custom' | 'fen_solution'
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // find-the-blunders games
  const [findTarget, setFindTarget] = useState(2);
  const [games, setGames] = useState([{ pgn: '', blunders: [{ move: '', betterMove: '', explanation: '' }] }]);
  // play-vs-Stockfish positions
  const [tolerance, setTolerance] = useState(80);
  const [positions, setPositions] = useState([{ fen: '', solution: '', userMoveCount: 1, tag: '' }]);

  // blunder builder
  const addGame = () => setGames([...games, { pgn: '', blunders: [{ move: '', betterMove: '', explanation: '' }] }]);
  const removeGame = (gi) => setGames(games.filter((_, i) => i !== gi));
  const setGamePgn = (gi, pgn) => setGames(games.map((g, i) => i === gi ? { ...g, pgn } : g));
  const addBlunder = (gi) => setGames(games.map((g, i) => i === gi ? { ...g, blunders: [...g.blunders, { move: '', betterMove: '', explanation: '' }] } : g));
  const removeBlunder = (gi, bi) => setGames(games.map((g, i) => i === gi ? { ...g, blunders: g.blunders.filter((_, j) => j !== bi) } : g));
  const setBlunder = (gi, bi, field, val) => setGames(games.map((g, i) => i === gi ? { ...g, blunders: g.blunders.map((b, j) => j === bi ? { ...b, [field]: val } : b) } : g));
  // fen builder
  // Index of the position whose visual board editor is open (null = none).
  const [fenEditorOpen, setFenEditorOpen] = useState(null);
  const addPos = () => setPositions([...positions, { fen: '', solution: '', userMoveCount: 1, tag: '' }]);
  const removePos = (i) => setPositions(positions.filter((_, j) => j !== i));
  const setPos = (i, field, val) => setPositions(positions.map((p, j) => j === i ? { ...p, [field]: val } : p));

  const save = async () => {
    setErr('');
    if (!title.trim()) return setErr('Give your pack a title.');
    let payload;
    if (type === 'custom') {
      const clean = games.map(g => ({
        pgn: g.pgn.trim(),
        blunders: (g.blunders || []).filter(b => b.move.trim()).map(b => ({ move: b.move.trim(), betterMove: b.betterMove.trim(), explanation: b.explanation.trim() }))
      })).filter(g => g.pgn && g.blunders.length > 0);
      if (clean.length === 0) return setErr('Add at least one PGN with a blunder move.');
      if (!subscribed && clean.length > FREE_MAX_BLUNDER_GAMES) return setErr(`Free plan allows up to ${FREE_MAX_BLUNDER_GAMES} games per pack. Subscribe to add more.`);
      payload = { assignmentType: 'custom', title, description, pgnTask: { findTarget: Number(findTarget) || 1, games: clean } };
    } else {
      const clean = positions.map(p => ({
        fen: (p.fen || '').trim(), solution: (p.solution || '').trim(),
        userMoveCount: Math.max(1, Number(p.userMoveCount) || 1), tag: (p.tag || '').trim()
      })).filter(p => p.fen);
      if (clean.length === 0) return setErr('Add at least one position (FEN).');
      payload = { assignmentType: 'fen_solution', title, description, fenTask: { engineToleranceCp: Number(tolerance) || 80, engineDepth: 12, positions: clean } };
    }
    setSaving(true);
    try {
      await api.post('/api/coach/assignment-templates', payload);
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not save the pack.');
    } finally { setSaving(false); }
  };

  return (
    <div className="coach-modal-overlay" onClick={onClose}>
      <div className="coach-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <h2 style={{ marginTop: 0 }}>📦 Create a reusable pack</h2>
        <p className="coach-dash-sub" style={{ marginTop: -4 }}>
          Build it once with a title. It’s saved to your library and ready to pick when you create an assignment.
        </p>
        {err && <div className="coach-error">⚠️ {err}</div>}

        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <button className={type === 'custom' ? 'btn-primary' : 'btn-ghost'} onClick={() => setType('custom')}>🔎 Find the blunders</button>
          <button className={type === 'fen_solution' ? 'btn-primary' : 'btn-ghost'} onClick={() => setType('fen_solution')}>♟ Play vs Stockfish</button>
        </div>

        <label className="field"><span>Pack title *</span>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Opening blunders — week 1" />
        </label>
        <label className="field"><span>Description (optional)</span>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Shown to you only" />
        </label>

        {type === 'custom' && (
          <div style={{ marginTop: 8 }}>
            <label className="field" style={{ maxWidth: 260 }}><span>Blunders the student must find</span>
              <input type="number" min="1" value={findTarget} onChange={e => setFindTarget(e.target.value)} />
            </label>
            {games.map((g, gi) => (
              <div key={gi} className="coach-pack-block">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <strong>Game {gi + 1}</strong>
                  {games.length > 1 && <button className="btn-ghost" onClick={() => removeGame(gi)}>Remove</button>}
                </div>
                <label className="field"><span>PGN *</span>
                  <textarea rows={3} value={g.pgn} onChange={e => setGamePgn(gi, e.target.value)} placeholder="1. e4 e5 2. Nf3 …" />
                </label>
                {g.blunders.map((b, bi) => (
                  <div key={bi} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                    <input style={{ flex: 1, minWidth: 90 }} value={b.move} onChange={e => setBlunder(gi, bi, 'move', e.target.value)} placeholder="Blunder move (e.g. Qh5)" />
                    <input style={{ flex: 1, minWidth: 90 }} value={b.betterMove} onChange={e => setBlunder(gi, bi, 'betterMove', e.target.value)} placeholder="Better move (optional)" />
                    <input style={{ flex: 2, minWidth: 120 }} value={b.explanation} onChange={e => setBlunder(gi, bi, 'explanation', e.target.value)} placeholder="Why (optional)" />
                    {g.blunders.length > 1 && <button className="btn-ghost" onClick={() => removeBlunder(gi, bi)}>✕</button>}
                  </div>
                ))}
                <button className="ca-link-add" onClick={() => addBlunder(gi)}>+ Add blunder</button>
              </div>
            ))}
            {subscribed || games.length < FREE_MAX_BLUNDER_GAMES ? (
              <button className="ca-link-add" onClick={addGame}>+ Add another game</button>
            ) : (
              <p className="coach-dash-sub" style={{ fontSize: 12 }}>Free plan allows up to {FREE_MAX_BLUNDER_GAMES} games per pack. <Link to="/coach/subscription">Subscribe</Link> to add more.</p>
            )}
          </div>
        )}

        {type === 'fen_solution' && (
          <div style={{ marginTop: 8 }}>
            <label className="field" style={{ maxWidth: 320 }}><span>Move tolerance</span>
              <select value={tolerance} onChange={e => setTolerance(e.target.value)}>
                <option value={40}>Strict (40cp)</option>
                <option value={80}>Normal (80cp)</option>
                <option value={150}>Lenient (150cp)</option>
              </select>
            </label>
            {positions.map((p, i) => (
              <div key={i} className="coach-pack-block">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <strong>Position {i + 1}</strong>
                  {positions.length > 1 && <button className="btn-ghost" onClick={() => removePos(i)}>Remove</button>}
                </div>
                <label className="field"><span>FEN *</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                    <input style={{ flex: 1 }} value={p.fen} onChange={e => setPos(i, 'fen', e.target.value)} placeholder="r1bqkb1r/pppp1ppp/… w KQkq - 0 1" />
                    <button
                      type="button"
                      onClick={() => setFenEditorOpen(fenEditorOpen === i ? null : i)}
                      title="Set up the position on a board instead of typing a FEN"
                      style={{
                        whiteSpace: 'nowrap', padding: '0 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                        background: fenEditorOpen === i ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.15)',
                        border: `1px solid ${fenEditorOpen === i ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.4)'}`,
                        color: fenEditorOpen === i ? '#f87171' : '#a5b4fc',
                      }}
                    >
                      {fenEditorOpen === i ? '✕ Close editor' : '🎨 Board editor'}
                    </button>
                  </div>
                </label>
                {fenEditorOpen === i && (
                  <InlineBoardEditor
                    initialFen={p.fen}
                    onApply={fen => { setPos(i, 'fen', fen); setFenEditorOpen(null); }}
                    onCancel={() => setFenEditorOpen(null)}
                  />
                )}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <label className="field" style={{ flex: 1, minWidth: 120 }}><span>Good moves required</span>
                    <input type="number" min="1" max="12" value={p.userMoveCount} onChange={e => setPos(i, 'userMoveCount', e.target.value)} />
                  </label>
                  <label className="field" style={{ flex: 2, minWidth: 140 }}><span>Label (optional)</span>
                    <input value={p.tag} onChange={e => setPos(i, 'tag', e.target.value)} placeholder="e.g. Win the queen" />
                  </label>
                </div>
                <label className="field"><span>Solution line (optional — your reference)</span>
                  <input value={p.solution} onChange={e => setPos(i, 'solution', e.target.value)} placeholder="e.g. Nxf7+ Rxf7 Qxc3" />
                </label>
              </div>
            ))}
            <button className="ca-link-add" onClick={addPos}>+ Add another position</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save pack'}</button>
          <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
