// pages/coach/CoachBatches.jsx
// Dedicated coach page to create and manage BATCHES (named groups of students,
// CoachGroup). A student can be in many batches. Batches are used elsewhere to
// enroll a whole cohort into a course or assign homework in one click.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import './CoachDashboard.css';
import './CourseBuilder.css'; // reuse cb-* styles (cb-card, cb-group, cb-check…)

export default function CoachBatches() {
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [editing, setEditing] = useState(null); // batch being edited (member checklist)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const studentId = (s) => String(s.studentId?._id || s.studentId || '');
  const studentLabel = (s) => s.studentName || s.studentId?.displayName || s.studentId?.username || tr('Student');

  // Names of the students in a batch. The batch card used to show only a count,
  // so a coach had to open Edit and read a checkbox list to remember who was
  // actually in it — which is the one thing they look at a batch to find out.
  // No extra request: /api/coach/groups already returns studentIds, and the
  // roster is loaded alongside it.
  const memberNames = React.useMemo(() => {
    const byId = new Map(students.map(s => [studentId(s), studentLabel(s)]));
    const out = {};
    for (const g of groups) {
      out[g._id] = (g.studentIds || [])
        .map(id => byId.get(String(id)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
    }
    return out;
  }, [groups, students]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, g] = await Promise.all([
        api.get('/api/coach/students'),
        api.get('/api/coach/groups'),
      ]);
      setStudents(s.data?.students || []);
      setGroups(g.data?.groups || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load batches.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadAll(); }, []);

  const createGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    try {
      await api.post('/api/coach/groups', { name });
      setNewGroupName('');
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create batch.');
    }
  };

  const deleteGroup = async (groupId) => {
    if (!window.confirm(tr('Delete this batch? (Students and their enrollments are unaffected.)'))) return;
    try {
      await api.delete(`/api/coach/groups/${groupId}`);
      if (editing?._id === groupId) setEditing(null);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete batch.');
    }
  };

  const toggleMember = (sid) => {
    setEditing(g => {
      const has = g.studentIds.some(x => String(x) === sid);
      return { ...g, studentIds: has ? g.studentIds.filter(x => String(x) !== sid) : [...g.studentIds, sid] };
    });
  };

  const saveMembers = async () => {
    try {
      await api.patch(`/api/coach/groups/${editing._id}`, { studentIds: editing.studentIds.map(String) });
      setEditing(null);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save batch.');
    }
  };

  if (loading) return <div className="coach-dash"><p>{tr("Loading…")}</p></div>;

  return (
    <div className="coach-dash">
      <div className="coach-dash-header">
        <div>
          <h1>{tr("👥 Batches")}</h1>
          <p className="coach-dash-sub">{tr("Group your students into batches. Use them to enroll a whole batch into a course or assign homework in one click.")}</p>
        </div>
        <Link to="/coach/dashboard" className="btn-ghost">{tr("← Dashboard")}</Link>
      </div>

      {error && <div className="cb-error">{error}</div>}

      <div className="cb-card">
        <h3>{tr("➕ New batch")}</h3>
        <div className="cb-row" style={{ alignItems: 'center' }}>
          <input className="cb-input" style={{ marginBottom: 0 }} placeholder={tr("Batch name (e.g. Beginners · Batch A)")}
            value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createGroup(); }} />
          <button className="btn-primary" onClick={createGroup} disabled={!newGroupName.trim()} style={{ flex: '0 0 auto' }}>{tr("Add batch")}</button>
        </div>
        {students.length === 0 && (
          <p className="cb-muted" style={{ marginTop: 8 }}>
            {tr("Add students on the")} <Link to="/coach/dashboard">{tr("Coach Dashboard")}</Link> {tr("first, then group them here.")}
          </p>
        )}
      </div>

      <div className="cb-card">
        <h3>{tr("Your batches")}</h3>
        {groups.length === 0 ? (
          <p className="cb-muted">{tr("No batches yet. Create your first above.")}</p>
        ) : groups.map(g => (
          <div key={g._id} className="cb-group">
            <div className="cb-group-head">
              <span className="cb-group-name">{g.name}</span>
              <span className="cb-group-count">{g.memberCount} {tr("student")}{g.memberCount === 1 ? '' : 's'}</span>
              <button className="cb-icon-btn" onClick={() => setEditing(editing?._id === g._id ? null : { ...g, studentIds: (g.studentIds || []).map(String) })}>
                {editing?._id === g._id ? 'Done' : 'Edit'}
              </button>
              <button className="cb-icon-btn" onClick={() => deleteGroup(g._id)}>✕</button>
            </div>

            {/* Who is in this batch, at a glance. Hidden while editing — the
                checkbox list below is showing the same thing. */}
            {editing?._id !== g._id && (
              (memberNames[g._id] || []).length > 0 ? (
                <div className="cb-group-names">
                  {memberNames[g._id].map((n, i) => (
                    <span key={i} className="cb-name-chip">{n}</span>
                  ))}
                </div>
              ) : (
                <p className="cb-muted cb-group-empty">
                  {tr("No students yet — press")} <strong>{tr("Edit")}</strong> {tr("to add some.")}
                </p>
              )
            )}

            {editing?._id === g._id && (
              <div className="cb-group-members">
                {students.length === 0 ? (
                  <p className="cb-muted">{tr("No students to add yet.")}</p>
                ) : students.map(s => {
                  const sid = studentId(s);
                  const checked = editing.studentIds.some(x => String(x) === sid);
                  return (
                    <label key={sid} className="cb-check">
                      <input type="checkbox" checked={checked} onChange={() => toggleMember(sid)} />
                      {studentLabel(s)}
                    </label>
                  );
                })}
                <button className="btn-primary" style={{ marginTop: 8 }} onClick={saveMembers}>{tr("Save members")}</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import { t as tr } from '../../i18n/LanguageContext';