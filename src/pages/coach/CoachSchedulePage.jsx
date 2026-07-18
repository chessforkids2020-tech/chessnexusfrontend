// pages/coach/CoachSchedulePage.jsx
// Coach class calendar: set weekly recurring class slots per batch (CoachGroup)
// or all students — days, time, duration, and a Zoom/Meet link. The coach picks
// the time in THEIR OWN local timezone; it's stored in UTC and shown to each
// student in the student's local time. Students get an auto chat notice on change.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { buildJoinLink } from './MyMeetingsPage';
import { DAY_NAMES, localToUtc, localDow, localTimeValue, localTimeLabel, localDayLabel, classesOnLocalDate } from '../../utils/istSchedule';
import './CoachDashboard.css';
import '../MyCoachPortal.css'; // reuse the monthly calendar styles (mcp-cal-*)

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Local timezone label for the coach, e.g. "Asia/Kolkata" / "Europe/London".
const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local time';

// The form holds the coach's LOCAL day set + LOCAL "HH:MM".
const BLANK = { groupId: '', title: '', days: [], time: '18:00', durationMinutes: 60, meetingLink: '' };

// Convert a stored slot (UTC days + timeUTC) into the coach's local form shape.
function slotToLocalForm(slot) {
  const time = localTimeValue((slot.days || [])[0] ?? slot.days?.[0] ?? 1, slot.timeUTC);
  const days = [...new Set((slot.days || []).map(d => localDow(d, slot.timeUTC)))].sort();
  return { days, time };
}

// Convert the coach's local form (days + time) into UTC { days:[], timeUTC }.
function localFormToUtc(localDays, localTime) {
  const utcDays = [];
  let timeUTC = null;
  for (const d of localDays) {
    const u = localToUtc(d, localTime);
    if (u) { utcDays.push(u.day); timeUTC = u.time; }
  }
  return { days: [...new Set(utcDays)].sort(), timeUTC };
}

export default function CoachSchedulePage() {
  const { canHostLiveClassroom } = useAuth();
  const [slots, setSlots] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  // Host-only: the host's reusable Live Class meetings, to auto-fill the link.
  const [liveMeetings, setLiveMeetings] = useState([]);

  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState(null); // null = creating
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');

  // Holidays (academy-closed days).
  const [holidays, setHolidays] = useState([]);
  const [holForm, setHolForm] = useState({ date: '', end: '', label: '' });
  const [holMode, setHolMode] = useState('single'); // 'single' | 'range'
  const [holSaving, setHolSaving] = useState(false);
  const [holErr, setHolErr] = useState('');

  // Collapsible monthly calendar preview (classes + holidays, coach's local time).
  const [calOpen, setCalOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, g, h] = await Promise.all([
        api.get('/api/coach-schedule'),
        api.get('/api/coach/groups').catch(() => ({ data: { groups: [] } })),
        api.get('/api/coach-schedule/holidays').catch(() => ({ data: { holidays: [] } })),
      ]);
      setSlots(s.data?.slots || []);
      setGroups(g.data?.groups || []);
      setHolidays(h.data?.holidays || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your schedule.');
    } finally {
      setLoading(false);
    }
  };

  const addHoliday = async (e) => {
    e.preventDefault();
    setHolErr('');
    if (!holForm.date) { setHolErr('Pick a date.'); return; }
    if (holMode === 'range') {
      if (!holForm.end) { setHolErr('Pick an end date.'); return; }
      if (holForm.end < holForm.date) { setHolErr('End date must be on or after the start date.'); return; }
    }
    setHolSaving(true);
    try {
      if (holMode === 'range') {
        const r = await api.post('/api/coach-schedule/holidays/range', {
          start: holForm.date, end: holForm.end, label: holForm.label,
        });
        const { created = 0, skipped = 0 } = r.data || {};
        setMsg(`${created} holiday${created === 1 ? '' : 's'} added${skipped ? ` · ${skipped} skipped (already marked)` : ''} — students notified.`);
      } else {
        await api.post('/api/coach-schedule/holidays', { date: holForm.date, label: holForm.label });
        setMsg('Holiday added — students notified.');
      }
      setHolForm({ date: '', end: '', label: '' });
      await loadAll();
    } catch (err) {
      setHolErr(err.response?.data?.message || 'Could not add holiday.');
    } finally {
      setHolSaving(false);
    }
  };

  const removeHoliday = async (h) => {
    if (!window.confirm('Remove this holiday?')) return;
    try {
      await api.delete(`/api/coach-schedule/holidays/${h._id}`);
      await loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not remove holiday.');
    }
  };

  const fmtHolidayDate = (d) =>
    new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  useEffect(() => { loadAll(); }, []); // eslint-disable-line

  // Host-only: load the host's reusable Live Class meetings for the dropdown.
  useEffect(() => {
    if (!canHostLiveClassroom) return;
    let alive = true;
    api.get('/api/coach-live/meetings')
      .then(r => { if (alive) setLiveMeetings(Array.isArray(r.data) ? r.data : []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [canHostLiveClassroom]);

  const resetForm = () => { setForm(BLANK); setEditingId(null); setFormErr(''); };

  const startEdit = (slot) => {
    setEditingId(slot._id);
    const local = slotToLocalForm(slot);
    setForm({
      groupId: slot.groupId || '',
      title: slot.title || '',
      days: local.days,
      time: local.time || '18:00',
      durationMinutes: slot.durationMinutes || 60,
      meetingLink: slot.meetingLink || '',
    });
    setFormErr('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleDay = (d) => {
    setForm(f => ({
      ...f,
      days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d].sort(),
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    setFormErr('');
    if (form.days.length === 0) { setFormErr('Pick at least one day.'); return; }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.time)) { setFormErr('Enter a valid time.'); return; }
    if (form.meetingLink && !/^https?:\/\/\S+$/i.test(form.meetingLink)) {
      setFormErr('Meeting link must start with http:// or https://'); return;
    }
    const { days, timeUTC } = localFormToUtc(form.days, form.time);
    if (!timeUTC || days.length === 0) { setFormErr('Enter a valid time.'); return; }
    setSaving(true);
    try {
      const body = {
        groupId: form.groupId || null,
        title: form.title,
        days,
        timeUTC,
        durationMinutes: Number(form.durationMinutes) || 60,
        meetingLink: form.meetingLink,
      };
      if (editingId) await api.patch(`/api/coach-schedule/${editingId}`, body);
      else await api.post('/api/coach-schedule', body);
      setMsg(editingId ? 'Class updated — students notified.' : 'Class added — students notified.');
      resetForm();
      await loadAll();
    } catch (err) {
      setFormErr(err.response?.data?.message || 'Could not save class.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (slot) => {
    if (!window.confirm('Delete this class from the schedule? Students will be notified.')) return;
    try {
      await api.delete(`/api/coach-schedule/${slot._id}`);
      setMsg('Class removed — students notified.');
      if (editingId === slot._id) resetForm();
      await loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not delete class.');
    }
  };

  const batchLabel = (slot) =>
    slot.title || slot.groupName || 'All students';

  // Slots reshaped for classesOnLocalDate() (same fields the student calendar uses).
  const calClasses = slots
    .filter(s => s.active !== false)
    .map(s => ({ ...s, title: batchLabel(s), coachName: 'You' }));
  const holidayByDate = {};
  for (const h of holidays) holidayByDate[h.date] = h;

  if (loading) return <div className="coach-loading">Loading your class schedule…</div>;

  return (
    <div className="coach-dash">
      <div className="coach-dash-header">
        <div>
          <h1>📅 Class Schedule</h1>
          <p className="coach-dash-sub">
            Set your weekly class days, times and meeting link. Students see it on their My Coach page.
          </p>
        </div>
        <Link to="/coach/dashboard" className="btn-ghost">← Back to dashboard</Link>
      </div>

      {error && <div className="coach-error">⚠️ {error}</div>}
      {msg && (
        <div className="coach-empty" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✅ {msg}</span>
          <button onClick={() => setMsg('')} style={{ background: 'none', border: 'none', color: '#6ee7b7', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
      )}

      {/* ── Monthly calendar preview (expand/collapse) ── */}
      <div className="coach-section">
        <div className="coach-section-head">
          <h2>🗓️ Monthly view</h2>
          <button className="btn-ghost" onClick={() => setCalOpen(o => !o)} aria-expanded={calOpen}>
            {calOpen ? 'Collapse ▲' : 'Expand ▼'}
          </button>
        </div>
        {calOpen && (() => {
          const y = calMonth.getFullYear();
          const m = calMonth.getMonth();
          const daysInMonth = new Date(y, m + 1, 0).getDate();
          const lead = new Date(y, m, 1).getDay();
          const today = new Date();
          const isToday = (d) => today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
          const pad = (n) => String(n).padStart(2, '0');
          const cells = [];
          for (let i = 0; i < lead; i++) cells.push(null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(d);
          return (
            <div className="mcp-cal">
              <div className="mcp-cal-head">
                <button className="mcp-cal-nav" onClick={() => setCalMonth(new Date(y, m - 1, 1))} aria-label="Previous month">‹</button>
                <div className="mcp-cal-title">{MONTHS[m]} {y}</div>
                <button className="mcp-cal-nav" onClick={() => setCalMonth(new Date(y, m + 1, 1))} aria-label="Next month">›</button>
              </div>
              <div className="mcp-cal-grid">
                {DAY_NAMES.map(dn => <div key={dn} className="mcp-cal-dow">{dn}</div>)}
                {cells.map((d, i) => {
                  if (d === null) return <div key={`b${i}`} className="mcp-cal-cell mcp-cal-empty" />;
                  const iso = `${y}-${pad(m + 1)}-${pad(d)}`;
                  const holiday = holidayByDate[iso];
                  const dayClasses = holiday ? [] : classesOnLocalDate(calClasses, new Date(y, m, d));
                  const has = dayClasses.length > 0;
                  const cls = `mcp-cal-cell ${holiday ? 'mcp-cal-holiday' : has ? 'mcp-cal-has' : ''} ${isToday(d) ? 'mcp-cal-today' : ''}`;
                  return (
                    <div key={d} className={cls} title={holiday ? (holiday.label || 'Holiday') : (has ? dayClasses.map(dc => `${dc.cls.title} · ${dc.time}`).join('\n') : undefined)}>
                      <div className="mcp-cal-date">{d}</div>
                      {holiday ? (
                        <div className="mcp-cal-holtag">🎉 {holiday.label || 'Holiday'}</div>
                      ) : (
                        <>
                          {dayClasses.slice(0, 2).map((dc, j) => (
                            <div key={j} className="mcp-cal-class">{dc.time}</div>
                          ))}
                          {dayClasses.length > 2 && <div className="mcp-cal-more">+{dayClasses.length - 2}</div>}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mcp-cal-legend">
                <span className="mcp-cal-legend-item"><span className="mcp-cal-swatch mcp-cal-swatch-class" /> Class day</span>
                <span className="mcp-cal-legend-item"><span className="mcp-cal-swatch mcp-cal-swatch-holiday" /> Holiday</span>
                <span style={{ color: 'rgba(226,232,240,0.5)' }}>Times in your local zone ({LOCAL_TZ})</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Add / edit form ── */}
      <div className="coach-section">
        <div className="coach-section-head">
          <h2>{editingId ? 'Edit class' : 'Add a class'}</h2>
          {editingId && <button className="btn-ghost" onClick={resetForm}>Cancel edit</button>}
        </div>

        <form onSubmit={save} className="coach-schedule-form" style={{ display: 'grid', gap: 14, maxWidth: 620 }}>
          <label>
            <div className="csf-label">Batch</div>
            <select value={form.groupId} onChange={e => setForm(f => ({ ...f, groupId: e.target.value }))} className="csf-input">
              <option value="">All my students</option>
              {groups.map(g => (
                <option key={g._id} value={g._id}>{g.name} ({g.memberCount})</option>
              ))}
            </select>
            {groups.length === 0 && (
              <div className="csf-hint">
                Tip: create named batches in <Link to="/coach/courses">Courses</Link> to schedule different timings per batch.
              </div>
            )}
          </label>

          <label>
            <div className="csf-label">Label (optional)</div>
            <input
              className="csf-input"
              type="text"
              placeholder="e.g. Beginners · Advanced group"
              value={form.title}
              maxLength={80}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </label>

          <div>
            <div className="csf-label">Days</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DAY_NAMES.map((name, d) => (
                <button
                  type="button"
                  key={d}
                  className={form.days.includes(d) ? 'btn-primary' : 'btn-ghost'}
                  style={{ padding: '7px 12px', fontSize: 13 }}
                  onClick={() => toggleDay(d)}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <label style={{ flex: 1, minWidth: 140 }}>
              <div className="csf-label">Time (your local time)</div>
              <input
                className="csf-input"
                type="time"
                value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              />
              <div className="csf-hint">Your timezone: {LOCAL_TZ}. Students see this in their own local time.</div>
            </label>
            <label style={{ flex: 1, minWidth: 140 }}>
              <div className="csf-label">Duration (min)</div>
              <input
                className="csf-input"
                type="number"
                min={5}
                max={600}
                value={form.durationMinutes}
                onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))}
              />
            </label>
          </div>

          {canHostLiveClassroom && liveMeetings.length > 0 && (
            <label>
              <div className="csf-label">Use one of my Live Class meetings (in-app video)</div>
              <select
                className="csf-input"
                value=""
                onChange={e => {
                  const m = liveMeetings.find(x => String(x.id) === e.target.value);
                  if (m) setForm(f => ({ ...f, meetingLink: buildJoinLink(m.joinCode) }));
                }}
              >
                <option value="">— pick a meeting to fill the link —</option>
                {liveMeetings.map(m => (
                  <option key={m.id} value={m.id}>{(m.title || 'Meeting')} · {m.durationMinutes} min</option>
                ))}
              </select>
            </label>
          )}

          <label>
            <div className="csf-label">Meeting link (in-app Live Class, Zoom / Meet — optional)</div>
            <input
              className="csf-input"
              type="url"
              placeholder="https://zoom.us/j/…"
              value={form.meetingLink}
              onChange={e => setForm(f => ({ ...f, meetingLink: e.target.value }))}
            />
          </label>

          {formErr && <div className="form-error">{formErr}</div>}

          <div>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : '＋ Add class'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Existing slots ── */}
      <div className="coach-section">
        <div className="coach-section-head"><h2>Your classes</h2></div>
        {slots.length === 0 ? (
          <div className="coach-empty">No classes scheduled yet. Add your first class above.</div>
        ) : (
          <div className="coach-students-grid">
            {slots.map(slot => (
              <div key={slot._id} className="coach-student-card" style={{ opacity: slot.active ? 1 : 0.55 }}>
                <div className="coach-student-name">{batchLabel(slot)}</div>
                <div style={{ fontSize: 13, color: '#a78bfa', margin: '6px 0' }}>
                  {[...new Set((slot.days || []).map(d => localDayLabel(d, slot.timeUTC)))].join(', ')}
                  {' · '}
                  {localTimeLabel((slot.days || [])[0] ?? 1, slot.timeUTC)}
                  <span style={{ color: 'rgba(226,232,240,0.55)' }}> (your time)</span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.6)', marginBottom: 8 }}>
                  {slot.durationMinutes} min
                  {slot.memberCount != null ? ` · ${slot.memberCount} in batch` : ''}
                </div>
                {slot.meetingLink && (
                  <a href={slot.meetingLink} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ display: 'inline-block', marginBottom: 8 }}>
                    🔗 Open link
                  </a>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-ghost" onClick={() => startEdit(slot)}>Edit</button>
                  <button className="btn-ghost" style={{ color: '#f87171' }} onClick={() => remove(slot)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Holidays (academy closed — no classes) ── */}
      <div className="coach-section">
        <div className="coach-section-head"><h2>🎉 Holidays</h2></div>
        <p className="csf-hint" style={{ margin: '-4px 0 12px' }}>
          Mark days your academy is closed. Students see them on their schedule and no class shows on those days.
        </p>

        {/* Single day vs a whole date range (e.g. a Diwali week). */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <button type="button"
            className={holMode === 'single' ? 'btn-primary' : 'btn-ghost'}
            onClick={() => { setHolMode('single'); setHolErr(''); }}>Single day</button>
          <button type="button"
            className={holMode === 'range' ? 'btn-primary' : 'btn-ghost'}
            onClick={() => { setHolMode('range'); setHolErr(''); }}>Date range</button>
        </div>

        <form onSubmit={addHoliday} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
          <label style={{ minWidth: 150 }}>
            <div className="csf-label">{holMode === 'range' ? 'From' : 'Date'}</div>
            <input
              className="csf-input"
              type="date"
              value={holForm.date}
              onChange={e => setHolForm(f => ({ ...f, date: e.target.value }))}
            />
          </label>
          {holMode === 'range' && (
            <label style={{ minWidth: 150 }}>
              <div className="csf-label">To</div>
              <input
                className="csf-input"
                type="date"
                value={holForm.end}
                min={holForm.date || undefined}
                onChange={e => setHolForm(f => ({ ...f, end: e.target.value }))}
              />
            </label>
          )}
          <label style={{ flex: 1, minWidth: 180 }}>
            <div className="csf-label">Reason (optional)</div>
            <input
              className="csf-input"
              type="text"
              placeholder="e.g. Diwali, Public holiday"
              value={holForm.label}
              maxLength={80}
              onChange={e => setHolForm(f => ({ ...f, label: e.target.value }))}
            />
          </label>
          <button type="submit" className="btn-primary" disabled={holSaving}>
            {holSaving ? 'Adding…' : (holMode === 'range' ? '＋ Add holidays' : '＋ Add holiday')}
          </button>
        </form>
        {holErr && <div className="form-error" style={{ marginBottom: 12 }}>{holErr}</div>}

        {holidays.length === 0 ? (
          <div className="coach-empty">No holidays marked yet.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {holidays.map(h => (
              <div key={h._id} className="coach-holiday-chip">
                <span className="coach-holiday-date">{fmtHolidayDate(h.date)}</span>
                {h.label && <span className="coach-holiday-label">{h.label}</span>}
                <button className="coach-holiday-x" onClick={() => removeHoliday(h)} title="Remove">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
