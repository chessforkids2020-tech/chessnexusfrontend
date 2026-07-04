// pages/coach/CourseBuilder.jsx
// Coach Course / Curriculum Builder ("syllabus"). A course is an ordered list of
// lessons; each lesson is one of the coach's own studies (UserStudy — public OR
// private). Enrolled students get read access to private course studies and walk
// them in order, marking each "studied" to unlock the next. See routes/courses.js.
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api';
import './CoachDashboard.css';
import './CourseBuilder.css';

export default function CourseBuilder() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [myStudies, setMyStudies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newCourse, setNewCourse] = useState({ title: '', description: '' });
  const [creating, setCreating] = useState(false);

  const [selected, setSelected] = useState(null);
  const [lessonMode, setLessonMode] = useState('study'); // 'study' | 'video'
  const [pickStudyId, setPickStudyId] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [addingLesson, setAddingLesson] = useState(false);
  const [lessonErr, setLessonErr] = useState('');

  const [enrollGroupId, setEnrollGroupId] = useState('');
  const [enrollMsg, setEnrollMsg] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  // Real named groups (multi-group; a student can be in many).
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState(null); // group object being edited (member checklist)

  // A student's user-id + display name from the roster.
  const studentId = (s) => String(s.studentId?._id || s.studentId || '');
  const studentLabel = (s) => s.studentName || s.studentId?.displayName || s.studentId?.username || 'Student';

  const loadAll = async () => {
    setLoading(true);
    try {
      const [c, s, st, g] = await Promise.all([
        api.get('/api/coach/courses'),
        api.get('/api/coach/students'),
        api.get('/api/coach/courses-my-studies'),
        api.get('/api/coach/groups'),
      ]);
      setCourses(c.data?.courses || []);
      setStudents(s.data?.students || []);
      setMyStudies(st.data?.studies || []);
      setGroups(g.data?.groups || []);
      setError('');
    } catch (err) {
      if (err.response?.status === 402) { navigate('/coach/subscription?expired=1'); return; }
      setError(err.response?.data?.message || 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadAll(); }, []); // eslint-disable-line

  const openCourse = async (courseId) => {
    setLessonErr(''); setEnrollMsg(''); setPickStudyId(''); setEnrollGroupId('');
    try {
      const r = await api.get(`/api/coach/courses/${courseId}`);
      setSelected(r.data?.course || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not open course.');
    }
  };

  const createCourse = async (e) => {
    e.preventDefault();
    if (!newCourse.title.trim()) return;
    setCreating(true);
    try {
      const r = await api.post('/api/coach/courses', newCourse);
      setNewCourse({ title: '', description: '' });
      await loadAll();
      if (r.data?.course?._id) openCourse(r.data.course._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create course.');
    } finally {
      setCreating(false);
    }
  };

  const addLesson = async () => {
    if (!pickStudyId) return;
    setLessonErr('');
    setAddingLesson(true);
    try {
      await api.post(`/api/coach/courses/${selected._id}/lessons`, { studyId: pickStudyId });
      setPickStudyId('');
      await openCourse(selected._id);
      await loadAll();
    } catch (err) {
      setLessonErr(err.response?.data?.message || 'Could not add lesson.');
    } finally {
      setAddingLesson(false);
    }
  };

  const addVideoLesson = async () => {
    if (!videoUrl.trim()) return;
    setLessonErr('');
    setAddingLesson(true);
    try {
      await api.post(`/api/coach/courses/${selected._id}/lessons/video`, {
        videoUrl: videoUrl.trim(), title: videoTitle.trim(),
      });
      setVideoUrl(''); setVideoTitle('');
      await openCourse(selected._id);
      await loadAll();
    } catch (err) {
      setLessonErr(err.response?.data?.message || 'Could not add video.');
    } finally {
      setAddingLesson(false);
    }
  };

  const deleteLesson = async (lessonIndex) => {
    if (!window.confirm('Remove this lesson from the course?')) return;
    try {
      await api.delete(`/api/coach/courses/${selected._id}/lessons/${lessonIndex}`);
      await openCourse(selected._id);
      await loadAll();
    } catch (err) {
      setLessonErr(err.response?.data?.message || 'Could not remove lesson.');
    }
  };

  const moveLesson = async (lessonIndex, dir) => {
    const lessons = [...(selected.lessons || [])].sort((a, b) => a.lessonIndex - b.lessonIndex);
    const pos = lessons.findIndex(l => l.lessonIndex === lessonIndex);
    const swap = pos + dir;
    if (swap < 0 || swap >= lessons.length) return;
    [lessons[pos], lessons[swap]] = [lessons[swap], lessons[pos]];
    const order = lessons.map(l => l._id);
    try {
      await api.patch(`/api/coach/courses/${selected._id}/lessons/reorder`, { order });
      await openCourse(selected._id);
    } catch (err) {
      setLessonErr(err.response?.data?.message || 'Could not reorder.');
    }
  };

  const enroll = async () => {
    setEnrollMsg('');
    try {
      const r = await api.post(`/api/coach/courses/${selected._id}/enroll`, { groupId: enrollGroupId });
      setEnrollMsg(`Enrolled ${r.data.enrolled} student(s) (${r.data.newlyEnrolled} new).`);
      await loadAll();
    } catch (err) {
      setEnrollMsg(err.response?.data?.message || 'Could not enroll.');
    }
  };

  // ── Group management (multi-group: a student can be in many groups) ──
  const createGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    try {
      await api.post('/api/coach/groups', { name });
      setNewGroupName('');
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create group.');
    }
  };

  const deleteGroup = async (groupId) => {
    if (!window.confirm('Delete this group? (Students and their enrollments are unaffected.)')) return;
    try {
      await api.delete(`/api/coach/groups/${groupId}`);
      if (editingGroup?._id === groupId) setEditingGroup(null);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete group.');
    }
  };

  // Toggle a student in the group currently being edited (optimistic local state).
  const toggleMember = (sid) => {
    setEditingGroup(g => {
      const has = g.studentIds.some(x => String(x) === sid);
      return { ...g, studentIds: has ? g.studentIds.filter(x => String(x) !== sid) : [...g.studentIds, sid] };
    });
  };

  const saveGroupMembers = async () => {
    try {
      await api.patch(`/api/coach/groups/${editingGroup._id}`, { studentIds: editingGroup.studentIds.map(String) });
      setEditingGroup(null);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save group.');
    }
  };

  if (loading) return <div className="coach-dash"><p>Loading…</p></div>;

  const sortedLessons = (selected?.lessons || []).slice().sort((a, b) => a.lessonIndex - b.lessonIndex);
  // Studies not already in the course (so you can't add a duplicate).
  const usedStudyIds = new Set(sortedLessons.map(l => String(l.studyId)));
  const availableStudies = myStudies.filter(s => !usedStudyIds.has(String(s._id)));

  return (
    <div className="coach-dash">
      <div className="coach-dash-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            📚 Courses
            <button type="button" className="cb-help-btn"
              aria-label="How courses work"
              title="How courses work"
              onClick={() => setShowHelp(h => !h)}>?</button>
          </h1>
          <p className="coach-dash-sub">Build a syllabus from your studies. Students work through them in order.</p>
        </div>
        <Link to="/coach/dashboard" className="btn-ghost">← Dashboard</Link>
      </div>

      {error && <div className="cb-error">{error}</div>}

      {/* How groups + enrollment work — toggled by the ? next to the header */}
      {showHelp && (
        <div className="cb-help">
          <div className="cb-help-head">
            <span>💡 How students join a course</span>
            <button type="button" className="cb-help-toggle" onClick={() => setShowHelp(false)}>Close ✕</button>
          </div>
          <ol className="cb-help-steps">
            <li>
              <strong>Make a group.</strong> In the <strong>Groups</strong> panel below, create a group
              (e.g. <em>Batch A</em>) and tick the students who belong to it. A student can be in
              <strong> several groups</strong> at once.
            </li>
            <li>
              <strong>Build the course</strong> — add your studies and YouTube videos as lessons, in order.
            </li>
            <li>
              <strong>Enroll a group.</strong> Open the course → pick a group → <strong>Enroll group</strong>.
              This is what actually gives those students access.
            </li>
            <li>
              Students then see it under <strong>My Coach → 📚 My Syllabus</strong> and work through the
              lessons one by one. Private studies are visible <strong>only</strong> to enrolled students.
            </li>
          </ol>
        </div>
      )}

      <div className="cb-layout">
        {/* LEFT: create + course list */}
        <div className="cb-col-left">
          <form onSubmit={createCourse} className="cb-card">
            <h3>➕ New course</h3>
            <input className="cb-input" placeholder="Course title (e.g. Beginner → 1200)"
              value={newCourse.title} onChange={e => setNewCourse({ ...newCourse, title: e.target.value })} />
            <textarea className="cb-textarea" placeholder="Description (optional)" rows={2}
              value={newCourse.description} onChange={e => setNewCourse({ ...newCourse, description: e.target.value })} />
            <button className="btn-primary" disabled={creating || !newCourse.title.trim()}>
              {creating ? 'Creating…' : 'Create course'}
            </button>
          </form>

          <div className="cb-card">
            <h3>Your courses</h3>
            {courses.length === 0 && <p className="cb-muted">No courses yet.</p>}
            {courses.map(c => (
              <div key={c._id}
                className={`cb-course-row ${selected?._id === c._id ? 'active' : ''}`}
                onClick={() => openCourse(c._id)}>
                <div className="cb-course-title">{c.title}</div>
                <div className="cb-course-meta">
                  {c.lessonCount} lesson{c.lessonCount === 1 ? '' : 's'} · {c.enrollmentCount} student{c.enrollmentCount === 1 ? '' : 's'}
                </div>
              </div>
            ))}
          </div>

          {/* Groups panel — create groups + manage members (a student can be in many) */}
          <div className="cb-card">
            <h3>👥 Groups</h3>
            <div className="cb-row" style={{ alignItems: 'center' }}>
              <input className="cb-input" style={{ marginBottom: 0 }} placeholder="New group name (e.g. Batch A)"
                value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createGroup(); }} />
              <button className="btn-primary" onClick={createGroup} disabled={!newGroupName.trim()} style={{ flex: '0 0 auto' }}>Add</button>
            </div>

            {students.length === 0 && <p className="cb-muted" style={{ marginTop: 8 }}>Add students on the <Link to="/coach/dashboard">Coach Dashboard</Link> first.</p>}
            {groups.length === 0 && <p className="cb-muted" style={{ marginTop: 8 }}>No groups yet.</p>}

            {groups.map(g => (
              <div key={g._id} className="cb-group">
                <div className="cb-group-head">
                  <span className="cb-group-name">{g.name}</span>
                  <span className="cb-group-count">{g.memberCount} student{g.memberCount === 1 ? '' : 's'}</span>
                  <button className="cb-icon-btn" onClick={() => setEditingGroup(editingGroup?._id === g._id ? null : { ...g, studentIds: (g.studentIds || []).map(String) })}>
                    {editingGroup?._id === g._id ? 'Done' : 'Edit'}
                  </button>
                  <button className="cb-icon-btn" onClick={() => deleteGroup(g._id)}>✕</button>
                </div>

                {editingGroup?._id === g._id && (
                  <div className="cb-group-members">
                    {students.map(s => {
                      const sid = studentId(s);
                      const checked = editingGroup.studentIds.some(x => String(x) === sid);
                      return (
                        <label key={sid} className="cb-check">
                          <input type="checkbox" checked={checked} onChange={() => toggleMember(sid)} />
                          {studentLabel(s)}
                        </label>
                      );
                    })}
                    <button className="btn-primary" style={{ marginTop: 8 }} onClick={saveGroupMembers}>Save members</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: selected course */}
        <div className="cb-col-right">
          {!selected && <div className="cb-card"><p className="cb-muted">Select or create a course to add lessons.</p></div>}
          {selected && (
            <>
              <div className="cb-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2>{selected.title}</h2>
                  <Link className="btn-ghost" to={`/coach/courses/${selected._id}/progress`}>📊 Progress</Link>
                </div>
                {selected.description && <p className="cb-muted">{selected.description}</p>}
                <div className="cb-row" style={{ marginTop: 8, alignItems: 'center' }}>
                  <select className="cb-select" style={{ marginBottom: 0 }} value={enrollGroupId} onChange={e => setEnrollGroupId(e.target.value)}>
                    <option value="">Pick a group…</option>
                    {groups.map(g => <option key={g._id} value={g._id}>{g.name} ({g.memberCount})</option>)}
                  </select>
                  <button className="btn-primary" onClick={enroll} disabled={!enrollGroupId} style={{ flex: '0 0 auto' }}>Enroll group</button>
                </div>
                {groups.length === 0 && (
                  <p className="cb-muted" style={{ marginTop: 6, fontSize: 12 }}>
                    No groups yet — create one in the <strong>👥 Groups</strong> panel and add students, then enroll it here.
                  </p>
                )}
                {enrollMsg && <p className="cb-muted" style={{ marginTop: 6 }}>{enrollMsg}</p>}
              </div>

              <div className="cb-card">
                <h3>Lessons (your studies, in order)</h3>
                {sortedLessons.length === 0 && <p className="cb-muted">No lessons yet — add a study below.</p>}
                {sortedLessons.map((l, i) => (
                  <div key={l.lessonIndex} className="cb-lesson-row">
                    <span className="cb-lesson-idx">{l.lessonIndex}</span>
                    <div className="cb-lesson-main">
                      <div className="t">{l.kind === 'video' ? '🎥' : '📖'} {l.title}</div>
                    </div>
                    <button className="cb-icon-btn" disabled={i === 0} onClick={() => moveLesson(l.lessonIndex, -1)}>↑</button>
                    <button className="cb-icon-btn" disabled={i === sortedLessons.length - 1} onClick={() => moveLesson(l.lessonIndex, 1)}>↓</button>
                    <button className="cb-icon-btn" onClick={() => deleteLesson(l.lessonIndex)}>✕</button>
                  </div>
                ))}
              </div>

              <div className="cb-card">
                <h3>➕ Add a lesson</h3>
                {lessonErr && <div className="cb-error">{lessonErr}</div>}

                {/* Study vs Video toggle */}
                <div className="cb-row" style={{ marginBottom: 10 }}>
                  <button type="button"
                    className={lessonMode === 'study' ? 'btn-primary' : 'btn-ghost'}
                    onClick={() => { setLessonMode('study'); setLessonErr(''); }}>📖 Study</button>
                  <button type="button"
                    className={lessonMode === 'video' ? 'btn-primary' : 'btn-ghost'}
                    onClick={() => { setLessonMode('video'); setLessonErr(''); }}>🎥 Video</button>
                </div>

                {lessonMode === 'study' && (
                  <>
                    {myStudies.length === 0 ? (
                      <p className="cb-muted">
                        You have no studies yet. <Link to="/my-studies">Create a study</Link> first, then add it here.
                      </p>
                    ) : availableStudies.length === 0 ? (
                      <p className="cb-muted">All your studies are already in this course.</p>
                    ) : (
                      <div className="cb-row" style={{ alignItems: 'center' }}>
                        <select className="cb-select" style={{ marginBottom: 0 }} value={pickStudyId}
                          onChange={e => setPickStudyId(e.target.value)}>
                          <option value="">Pick a study…</option>
                          {availableStudies.map(s => (
                            <option key={s._id} value={s._id}>
                              {s.name}{s.isPublic ? '' : ' (private)'}
                            </option>
                          ))}
                        </select>
                        <button className="btn-primary" onClick={addLesson} disabled={!pickStudyId || addingLesson} style={{ flex: '0 0 auto' }}>
                          {addingLesson ? 'Adding…' : 'Add study'}
                        </button>
                      </div>
                    )}
                    <p className="cb-muted" style={{ marginTop: 8, fontSize: 12 }}>
                      Private studies you add are automatically visible to students enrolled in this course.
                    </p>
                  </>
                )}

                {lessonMode === 'video' && (
                  <>
                    <input className="cb-input" placeholder="Video title (e.g. How pins work)"
                      value={videoTitle} onChange={e => setVideoTitle(e.target.value)} />
                    <div className="cb-row" style={{ alignItems: 'center' }}>
                      <input className="cb-input" style={{ marginBottom: 0 }}
                        placeholder="YouTube link (https://youtu.be/… )"
                        value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
                      <button className="btn-primary" onClick={addVideoLesson} disabled={!videoUrl.trim() || addingLesson} style={{ flex: '0 0 auto' }}>
                        {addingLesson ? 'Adding…' : 'Add video'}
                      </button>
                    </div>
                    <p className="cb-muted" style={{ marginTop: 8, fontSize: 12 }}>
                      Paste a YouTube link — the video plays embedded inside the student's syllabus.
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
