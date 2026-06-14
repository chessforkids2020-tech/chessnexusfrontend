import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKLY_ACTIVITIES = [
  { key: 'arena_race',       label: '🏁 Arena Race',       color: '#06b6d4' },
  { key: 'team_race',        label: '👥 Team Race',        color: '#10b981' },
  { key: 'arena_tournament', label: '🏆 Arena Tournament / Marathon / Chess960 / Team Battle', color: '#f59e0b' },
];

function WeeklyScheduleTable() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/api/schedule/weekly-summary');
      setData(res.data);
    } catch {
      setError('Failed to load weekly summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const thStyle = (color) => ({
    padding: '8px 10px', background: '#1a1a2e', color: color || '#fff',
    fontWeight: 700, fontSize: 12, textAlign: 'center', border: '1px solid #2d3748',
  });
  const tdStyle = {
    padding: '8px 10px', border: '1px solid #e2e8f0', fontSize: 12,
    verticalAlign: 'top', minWidth: 120,
  };

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e' }}>📆 Weekly Regular Schedule — Activity Timings</div>
        <button onClick={load} style={{ background: '#e2e8f0', color: '#1a1a2e', border: 'none', borderRadius: 8, padding: '5px 14px', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
          🔄 Refresh
        </button>
      </div>

      {loading && <div style={{ color: '#94a3b8', fontSize: 13, padding: '16px 0' }}>Loading…</div>}
      {error   && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 8 }}>{error}</div>}

      {!loading && data && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', minWidth: 560 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle(), textAlign: 'left', paddingLeft: 14, minWidth: 100 }}>Day</th>
                {WEEKLY_ACTIVITIES.map(a => (
                  <th key={a.key} style={thStyle(a.color)}>{a.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day, i) => {
                const row = data[day] || {};
                const isEmpty = WEEKLY_ACTIVITIES.every(a => !(row[a.key]?.length));
                return (
                  <tr key={day} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#1a1a2e', background: 'inherit' }}>{day}</td>
                    {WEEKLY_ACTIVITIES.map(a => {
                      const entries = row[a.key] || [];
                      return (
                        <td key={a.key} style={{ ...tdStyle, background: 'inherit' }}>
                          {entries.length === 0 ? (
                            <span style={{ color: '#cbd5e1', fontSize: 11 }}>—</span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {entries.map((e, idx) => (
                                <div key={idx} style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 5,
                                  background: `${a.color}18`, border: `1px solid ${a.color}44`,
                                  borderRadius: 6, padding: '3px 8px',
                                }}>
                                  <span style={{ fontWeight: 800, color: a.color, fontSize: 13 }}>{e.time}</span>
                                  <span style={{ color: '#475569', fontSize: 11, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.label}>{e.label}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
            Times in IST. Sourced from Schedule Items, Team Races, Arena Tournaments, and scheduled Arena Races.
          </div>
        </div>
      )}
    </div>
  );
}
const ADM_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const ADM_DAY_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const ACTIVITY_TYPES = [
  { value: 'puzzle_content',       label: '🧩 Puzzle Content' },
  { value: 'monthly_focus',        label: '🎯 Monthly Focus Challenge' },
  { value: 'arena_race',           label: '🏁 Arena Race' },
  { value: 'team_race',            label: '👥 Team Race' },
  { value: 'arena_tournament',     label: '🏆 Arena Tournament' },
  { value: 'team_tournament',      label: '🥇 Team Tournament' },
  { value: 'bullet_blitz_marathon',label: '⚡ Bullet Blitz Marathon' },
  { value: 'chess960',             label: '🔀 Chess 960' },
  { value: '3d_arena_tournament',  label: '🎮 3D Arena Tournament' },
];

const PRESET_COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6'];

const EMPTY_FORM = {
  title: '',
  activityType: 'arena_race',
  dates: [],
  timeUTC: '10:00',
  durationMinutes: 60,
  description: '',
  color: '#06b6d4',
  link: '',
  isActive: true,
  sortOrder: 0,
};

const s = {
  page: { padding: 24, paddingTop: 80, minHeight: '100vh', background: '#f5f5dc', fontFamily: 'Poppins, sans-serif' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 800, color: '#1a1a2e' },
  primaryBtn: { background: '#0b6623', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  dangerBtn:  { background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 600, cursor: 'pointer', fontSize: 12 },
  secondaryBtn: { background: '#e2e8f0', color: '#1a1a2e', border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 600, cursor: 'pointer', fontSize: 12 },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  th: { background: '#1a1a2e', color: '#fff', padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700 },
  td: { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontSize: 13, color: '#334155' },
  // Modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modal: { background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' },
  label: { display: 'block', fontWeight: 600, fontSize: 13, color: '#334155', marginBottom: 4, marginTop: 14 },
  input: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, outline: 'none' },
  select: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13 },
};

// ── Inline date picker for admin modal ──────────────────────────────────────
function AdminDatePicker({ selected, onChange }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [...Array(firstDow).fill(null)];
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prevM = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextM = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };
  const toDateStr = (day) => `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const toggleDate = (day) => {
    if (!day) return;
    const ds = toDateStr(day);
    onChange(selected.includes(ds) ? selected.filter(d => d !== ds) : [...selected, ds].sort());
  };
  const isSel = (day) => day && selected.includes(toDateStr(day));
  const isToday = (day) => day && viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate();

  return (
    <div style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: 12, marginTop: 4, background: '#fafafa' }}>
      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button type="button" onClick={prevM} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#64748b', padding: '0 6px' }}>&#8249;</button>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{ADM_MONTHS[viewMonth]} {viewYear}</span>
        <button type="button" onClick={nextM} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#64748b', padding: '0 6px' }}>&#8250;</button>
      </div>
      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {ADM_DAY_SHORT.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>{d}</div>
        ))}
      </div>
      {/* Calendar cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {cells.map((day, i) => (
          <div
            key={i}
            onClick={() => toggleDate(day)}
            style={{
              height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 6, fontSize: 12,
              fontWeight: isSel(day) ? 700 : 400,
              cursor: day ? 'pointer' : 'default',
              background: isSel(day) ? '#0b6623' : isToday(day) ? '#dcfce7' : 'transparent',
              color: isSel(day) ? '#fff' : isToday(day) ? '#166534' : day ? '#334155' : 'transparent',
              border: isToday(day) && !isSel(day) ? '1px solid #16a34a' : '1px solid transparent',
              userSelect: 'none',
            }}
          >{day || ''}</div>
        ))}
      </div>
      {/* Selected date chips */}
      {selected.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {selected.map(ds => (
            <span key={ds} style={{ background: '#dcfce7', color: '#166534', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              {ds}
              <span onClick={() => onChange(selected.filter(d => d !== ds))} style={{ cursor: 'pointer', fontWeight: 800, fontSize: 13, lineHeight: 1 }}>×</span>
            </span>
          ))}
        </div>
      )}
      {selected.length === 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>Click dates above to select them</div>
      )}
    </div>
  );
}

export default function AdminSchedulePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null); // null = create, else item._id
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/schedule/all');
      setItems(res.data);
    } catch {
      setError('Failed to load schedule items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
    setError('');
  };

  const openEdit = (item) => {
    setEditing(item._id);
    setForm({
      title: item.title,
      activityType: item.activityType,
      dates: Array.isArray(item.dates) ? [...item.dates] : [],
      timeUTC: item.timeUTC,
      durationMinutes: item.durationMinutes,
      description: item.description || '',
      color: item.color || '#06b6d4',
      link: item.link || '',
      isActive: item.isActive !== false,
      sortOrder: item.sortOrder || 0,
    });
    setShowModal(true);
    setError('');
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.dates || form.dates.length === 0) { setError('Please select at least one date.'); return; }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await api.put(`/api/schedule/${editing}`, form);
      } else {
        await api.post('/api/schedule', form);
      }
      setShowModal(false);
      loadItems();
    } catch (e) {
      setError(e?.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/schedule/${id}`);
      setConfirmDelete(null);
      loadItems();
    } catch {
      setError('Delete failed.');
    }
  };

  const toggleActive = async (item) => {
    try {
      await api.put(`/api/schedule/${item._id}`, { isActive: !item.isActive });
      loadItems();
    } catch { /* noop */ }
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={s.secondaryBtn} onClick={() => navigate('/admin')}>← Admin Dashboard</button>
          <div style={s.title}>📅 Activity Schedule</div>
        </div>
        <button style={s.primaryBtn} onClick={openCreate}>+ Add Activity</button>
      </div>

      {error && <div style={{ color: '#dc2626', marginBottom: 12, fontSize: 13 }}>{error}</div>}

      <WeeklyScheduleTable />

      {loading ? (
        <div style={{ color: '#94a3b8', padding: 40, textAlign: 'center' }}>Loading…</div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Title</th>
              <th style={s.th}>Type</th>
              <th style={s.th}>Dates</th>
              <th style={s.th}>Time (IST)</th>
              <th style={s.th}>Duration</th>
              <th style={s.th}>Link</th>
              <th style={s.th}>Active</th>
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={8} style={{ ...s.td, textAlign: 'center', color: '#94a3b8' }}>No activities yet. Click "+ Add Activity" to create one.</td></tr>
            )}
            {items.map(item => (
              <tr key={item._id}>
                <td style={s.td}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: item.color || '#06b6d4', marginRight: 6, verticalAlign: 'middle' }} />
                  {item.title}
                </td>
                <td style={s.td}>{ACTIVITY_TYPES.find(t => t.value === item.activityType)?.label || item.activityType}</td>
                <td style={s.td}>
                  {Array.isArray(item.dates) && item.dates.length > 0
                    ? <>{item.dates.slice(0, 2).join(', ')}{item.dates.length > 2 ? ` +${item.dates.length - 2} more` : ''}</>
                    : '—'}
                </td>
                <td style={s.td}>{item.timeUTC}</td>
                <td style={s.td}>{item.durationMinutes} min</td>
                <td style={{ ...s.td, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.link || '—'}</td>
                <td style={s.td}>
                  <button
                    style={{ ...s.secondaryBtn, background: item.isActive ? '#dcfce7' : '#fee2e2', color: item.isActive ? '#166534' : '#991b1b' }}
                    onClick={() => toggleActive(item)}
                  >
                    {item.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td style={s.td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={s.secondaryBtn} onClick={() => openEdit(item)}>Edit</button>
                    <button style={s.dangerBtn} onClick={() => setConfirmDelete(item)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={s.modal}>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, color: '#1a1a2e' }}>{editing ? 'Edit Activity' : 'Add Activity'}</h2>
            {error && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 8 }}>{error}</div>}

            <label style={s.label}>Title *</label>
            <input style={s.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Saturday Arena Tournament" />

            <label style={s.label}>Activity Type *</label>
            <select style={s.select} value={form.activityType} onChange={e => setForm(f => ({ ...f, activityType: e.target.value }))}>
              {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>

            <label style={s.label}>Select Dates * <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 12 }}>(click to toggle, can pick multiple)</span></label>
            <AdminDatePicker selected={form.dates} onChange={dates => setForm(f => ({ ...f, dates }))} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={s.label}>Start Time (IST) *</label>
                <input style={s.input} type="time" value={form.timeUTC} onChange={e => setForm(f => ({ ...f, timeUTC: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Duration (minutes) *</label>
                <input style={s.input} type="number" min={1} value={form.durationMinutes} onChange={e => setForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))} />
              </div>
            </div>

            <label style={s.label}>Description</label>
            <input style={s.input} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description shown on the card" />

            <label style={s.label}>Link (frontend path)</label>
            <input style={s.input} value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} placeholder="/race  or  /arenatournament" />

            <label style={s.label}>Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              {PRESET_COLORS.map(c => (
                <div
                  key={c}
                  style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? '3px solid #000' : '2px solid transparent', transition: 'border 0.1s' }}
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                />
              ))}
              <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ width: 28, height: 28, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }} />
            </div>

            <label style={s.label}>Sort Order</label>
            <input style={s.input} type="number" min={0} value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
              <input type="checkbox" id="isActiveChk" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
              <label htmlFor="isActiveChk" style={{ fontSize: 13, color: '#334155', cursor: 'pointer' }}>Active (visible on public schedule)</label>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button style={s.secondaryBtn} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={s.primaryBtn} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : (editing ? 'Save Changes' : 'Add Activity')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null); }}>
          <div style={{ ...s.modal, maxWidth: 360 }}>
            <h3 style={{ color: '#dc2626', margin: '0 0 12px' }}>Delete Activity?</h3>
            <p style={{ fontSize: 14, color: '#334155' }}>
              Are you sure you want to delete <strong>{confirmDelete.title}</strong>? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={s.secondaryBtn} onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button style={s.dangerBtn} onClick={() => handleDelete(confirmDelete._id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
