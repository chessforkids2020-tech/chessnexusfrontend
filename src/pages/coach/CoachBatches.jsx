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
  const studentLabel = (s) => s.studentName || s.studentId?.displayName || s.studentId?.username || 'Student';

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
    if (!window.confirm('Delete this batch? (Students and their enrollments are unaffected.)')) return;
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

  if (loading) return <div className="coach-dash"><p>Loading…</p></div>;

  return (
    <div className="coach-dash">
      <div className="coach-dash-header">
        <div>
          <h1>👥 Batches</h1>
          <p className="coach-dash-sub">Group your students into batches. Use them to enroll a whole batch into a course or assign homework in one click.</p>
        </div>
        <Link to="/coach/dashboard" className="btn-ghost">← Dashboard</Link>
      </div>

      {error && <div className="cb-error">{error}</div>}

      <div className="cb-card">
        <h3>➕ New batch</h3>
        <div className="cb-row" style={{ alignItems: 'center' }}>
          <input className="cb-input" style={{ marginBottom: 0 }} placeholder="Batch name (e.g. Beginners · Batch A)"
            value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createGroup(); }} />
          <button className="btn-primary" onClick={createGroup} disabled={!newGroupName.trim()} style={{ flex: '0 0 auto' }}>Add batch</button>
        </div>
        {students.length === 0 && (
          <p className="cb-muted" style={{ marginTop: 8 }}>
            Add students on the <Link to="/coach/dashboard">Coach Dashboard</Link> first, then group them here.
          </p>
        )}
      </div>

      <div className="cb-card">
        <h3>Your batches</h3>
        {groups.length === 0 ? (
          <p className="cb-muted">No batches yet. Create your first above.</p>
        ) : groups.map(g => (
          <div key={g._id} className="cb-group">
            <div className="cb-group-head">
              <span className="cb-group-name">{g.name}</span>
              <span className="cb-group-count">{g.memberCount} student{g.memberCount === 1 ? '' : 's'}</span>
              <button className="cb-icon-btn" onClick={() => setEditing(editing?._id === g._id ? null : { ...g, studentIds: (g.studentIds || []).map(String) })}>
                {editing?._id === g._id ? 'Done' : 'Edit'}
              </button>
              <button className="cb-icon-btn" onClick={() => deleteGroup(g._id)}>✕</button>
            </div>

            {editing?._id === g._id && (
              <div className="cb-group-members">
                {students.length === 0 ? (
                  <p className="cb-muted">No students to add yet.</p>
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
                <button className="btn-primary" style={{ marginTop: 8 }} onClick={saveMembers}>Save members</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
