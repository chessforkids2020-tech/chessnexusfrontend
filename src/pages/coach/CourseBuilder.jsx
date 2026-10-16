// pages/coach/CourseBuilder.jsx
// Coach Course / Curriculum Builder ("syllabus"). A course is an ordered list of
// lessons; each lesson is one of the coach's own studies (UserStudy — public OR
// private). Enrolled students get read access to private course studies and walk
// them in order, marking each "studied" to unlock the next. See routes/courses.js.
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import './CoachDashboard.css';
import './CourseBuilder.css';
import { t as tr } from '../../i18n/LanguageContext';

export default function CourseBuilder() {
  const [courses, setCourses] = useState([]);
  const [limits, setLimits] = useState({ subscribed: true, maxCourses: null, maxLessons: null });
  const [students, setStudents] = useState([]);
  const [myStudies, setMyStudies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newCourse, setNewCourse] = useState({ title: '', description: '' });
  const [creating, setCreating] = useState(false);

  const [selected, setSelected] = useState(null);
  const [editingCourse, setEditingCourse] = useState(false);   // course-header edit form
  const [courseForm, setCourseForm] = useState({ title: '', description: '' });
  const [savingCourse, setSavingCourse] = useState(false);
  const [lessonMode, setLessonMode] = useState('study'); // 'study' | 'video' | 'masterGame' | 'endgame'
  const [pickStudyId, setPickStudyId] = useState('');
  const [pickChapterId, setPickChapterId] = useState(''); // '' = whole study
  const [studySource, setStudySource] = useState('mine');  // 'mine' | 'public' | 'nexus'
  const [studySearch, setStudySearch] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [addingLesson, setAddingLesson] = useState(false);
  const [lessonErr, setLessonErr] = useState('');

  // Master game picker (searches the public master-games API).
  //
  // Searching by player name only was too blunt for building a course: a coach
  // teaching the Sicilian wants Sicilian games, not to remember which players
  // played it. The API already supported family + opening filters — the same
  // two-level pair the Master Games page uses — they were simply never offered
  // here.
  const [mgQuery, setMgQuery] = useState('');
  const [mgResults, setMgResults] = useState([]);
  const [mgSearching, setMgSearching] = useState(false);
  const [mgFamilies, setMgFamilies] = useState([]);     // major openings
  const [mgFamily, setMgFamily] = useState('');
  const [mgVariations, setMgVariations] = useState([]); // variations within one
  const [mgOpening, setMgOpening] = useState('');
  const [mgSearched, setMgSearched] = useState(false);  // so "no results" only shows after a search

  // Load the opening list once, when the coach first opens this tab.
  useEffect(() => {
    if (lessonMode !== 'masterGame' || mgFamilies.length) return;
    api.get('/api/master-games/filters')
      .then(r => setMgFamilies(r.data?.families || []))
      .catch(() => {});
  }, [lessonMode, mgFamilies.length]);

  // Variations belong to a family, so reload them whenever the family changes.
  useEffect(() => {
    setMgOpening('');
    if (!mgFamily) { setMgVariations([]); return; }
    api.get(`/api/master-games/variations?family=${encodeURIComponent(mgFamily)}`)
      .then(r => setMgVariations(r.data?.variations || []))
      .catch(() => setMgVariations([]));
  }, [mgFamily]);
  // Endgame picker. Source 'free' = public endgames collection; source 'premium'
  // = admin premium endgame trainer picks (subscribed coaches only, free for their
  // enrolled students within the course).
  const [egSource, setEgSource] = useState('free'); // 'free' | 'premium'
  const [egFamilies, setEgFamilies] = useState([]);   // [{key,label}]
  const [egFamily, setEgFamily] = useState('');
  const [egPositions, setEgPositions] = useState([]); // positions in the chosen family
  const [egLoading, setEgLoading] = useState(false);
  const [egPremium, setEgPremium] = useState(null); // { fam: [picks] } cache for premium picks

  const [enrollGroupIds, setEnrollGroupIds] = useState([]); // batches selected to enroll
  const [enrollMsg, setEnrollMsg] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Real named batches (multi-group; a student can be in many). Created/managed
  // on the dedicated Batches page (/coach/batches); here they're only used to
  // enroll a whole batch into a course.
  const [groups, setGroups] = useState([]);

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
      if (c.data?.limits) setLimits(c.data.limits);
      setStudents(s.data?.students || []);
      setMyStudies(st.data?.studies || []);
      setGroups(g.data?.groups || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadAll(); }, []); // eslint-disable-line

  const openCourse = async (courseId) => {
    setLessonErr(''); setEnrollMsg(''); setPickStudyId(''); setEnrollGroupIds([]);
    setEditingCourse(false);
    try {
      const r = await api.get(`/api/coach/courses/${courseId}`);
      setSelected(r.data?.course || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not open course.');
    }
  };

  const startEditCourse = () => {
    setCourseForm({ title: selected.title || '', description: selected.description || '' });
    setEditingCourse(true);
  };

  const saveCourse = async () => {
    if (!courseForm.title.trim()) return;
    setSavingCourse(true);
    try {
      const r = await api.patch(`/api/coach/courses/${selected._id}`, {
        title: courseForm.title.trim(),
        description: courseForm.description,
      });
      setSelected(r.data?.course || selected);
      setEditingCourse(false);
      await loadAll();  // refresh the list so the renamed title shows there too
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save course.');
    } finally {
      setSavingCourse(false);
    }
  };

  const deleteCourse = async () => {
    if (!window.confirm(
      tr("Delete \"{title}\"?\\n\\n", { title: selected.title }) +
      `It disappears from your courses and from students' syllabus. ` +
      `Enrollment and progress records are kept.`
    )) return;
    try {
      await api.delete(`/api/coach/courses/${selected._id}`);
      setSelected(null);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete course.');
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

  // Load studies for the picker by source (mine | nexus) + optional search.
  const loadStudies = async (source = studySource, search = studySearch) => {
    try {
      const r = await api.get('/api/coach/courses-my-studies', { params: { source, search } });
      setMyStudies(r.data?.studies || []);
    } catch { setMyStudies([]); }
    setPickStudyId(''); setPickChapterId('');
  };

  const addLesson = async () => {
    if (!pickStudyId) return;
    // A Nexus (official) study is always added one chapter at a time.
    if (studySource === 'nexus' && !pickChapterId) return;
    setLessonErr('');
    setAddingLesson(true);
    try {
      await api.post(`/api/coach/courses/${selected._id}/lessons`, {
        studyId: pickStudyId,
        source: studySource,
        ...(pickChapterId ? { chapterId: pickChapterId } : {})
      });
      setPickStudyId(''); setPickChapterId('');
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

  // ── Master game lesson ──
  const searchMasterGames = async () => {
    // Any ONE filter is enough — player, opening, or a specific variation. A
    // coach building an opening course should not have to name a player.
    if (!mgQuery.trim() && !mgFamily && !mgOpening) return;
    setMgSearching(true);
    try {
      const qs = new URLSearchParams({ limit: '20' });
      if (mgQuery.trim()) qs.set('player', mgQuery.trim());
      if (mgFamily) qs.set('family', mgFamily);
      // `opening` is the variation; it already implies the family, but sending
      // both keeps the query specific if the same variation name appears twice.
      if (mgOpening) qs.set('opening', mgOpening);
      const r = await api.get(`/api/master-games/?${qs.toString()}`);
      setMgResults(r.data?.games || []);
    } catch { setMgResults([]); } finally { setMgSearching(false); setMgSearched(true); }
  };
  const addMasterGameLesson = async (masterGameId) => {
    setLessonErr('');
    setAddingLesson(true);
    try {
      await api.post(`/api/coach/courses/${selected._id}/lessons/master-game`, { masterGameId });
      setMgQuery(''); setMgResults([]);
      await openCourse(selected._id);
      await loadAll();
    } catch (err) {
      setLessonErr(err.response?.data?.message || 'Could not add game.');
    } finally { setAddingLesson(false); }
  };

  // ── Free endgame lesson ──
  const API_BASE = import.meta.env.VITE_API_URL || '';
  // Load the FREE public endgames collection families.
  const loadFreeEndgameFamilies = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/public/endgames/index.json`).then(x => x.json());
      // index.json shape: array of families or {families:[...]}. Normalize to {key,label}.
      const fams = Array.isArray(r) ? r : (r.families || []);
      return fams.map(f => (typeof f === 'string' ? { key: f, label: f } : { key: f.key || f.family || f.id, label: f.label || f.name || f.key || f.family }));
    } catch { return []; }
  };
  // Load the PREMIUM admin endgame trainer picks (subscribed coaches only),
  // grouped into families the same shape as the free source.
  const loadPremiumEndgames = async () => {
    if (egPremium) return egPremium;
    try {
      const r = await api.get('/api/endgame-trainer/positions');
      const fams = r.data?.families || {};
      setEgPremium(fams);
      return fams;
    } catch { setEgPremium({}); return {}; }
  };
  const loadEndgameFamilies = async () => {
    if (egFamilies.length > 0) return;
    setEgFamilies(await loadFreeEndgameFamilies());
  };
  // Switch source; reload the family list for that source.
  const switchEgSource = async (src) => {
    setEgSource(src);
    setEgFamily('');
    setEgPositions([]);
    if (src === 'premium') {
      const fams = await loadPremiumEndgames();
      const FAM_LABEL = { pawn: tr('Pawn'), knight: tr('Knight'), bishop: tr('Bishop'), bishop_knight: tr('Bishop + Knight'), rook: tr('Rook'), queen: tr('Queen'), queen_rook: tr('Queen + Rook'), other_mixed: tr('Mixed') };
      setEgFamilies(Object.keys(fams).map(k => ({ key: k, label: FAM_LABEL[k] || k })));
    } else {
      setEgFamilies(await loadFreeEndgameFamilies());
    }
  };
  const loadEndgamePositions = async (family) => {
    setEgFamily(family);
    setEgPositions([]);
    if (!family) return;
    if (egSource === 'premium') {
      const fams = egPremium || await loadPremiumEndgames();
      setEgPositions((fams[family] || []).filter(p => p && p.fen).slice(0, 200));
      return;
    }
    setEgLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/public/endgames/${encodeURIComponent(family)}.json`).then(x => x.json());
      const list = Array.isArray(r) ? r : (r.positions || r.items || []);
      setEgPositions(list.filter(p => p && p.fen).slice(0, 200));
    } catch { setEgPositions([]); } finally { setEgLoading(false); }
  };
  const addEndgameLesson = async (pos) => {
    setLessonErr('');
    setAddingLesson(true);
    try {
      const title = pos.white || pos.black
        ? `${pos.white || tr('White')} vs ${pos.black || tr('Black')}${pos.year ? ` (${pos.year})` : ''}`
        : (pos.title || 'Endgame position');
      // Premium picks are added by id (server trusts its stored FEN + gates to paid).
      const body = egSource === 'premium'
        ? { pickId: pos._id, family: egFamily, title }
        : { fen: pos.fen, family: egFamily, title };
      await api.post(`/api/coach/courses/${selected._id}/lessons/endgame`, body);
      await openCourse(selected._id);
      await loadAll();
    } catch (err) {
      setLessonErr(err.response?.data?.message || 'Could not add position.');
    } finally { setAddingLesson(false); }
  };

  const deleteLesson = async (lessonIndex) => {
    if (!window.confirm(tr('Remove this lesson from the course?'))) return;
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

  const toggleEnrollGroup = (id) =>
    setEnrollGroupIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // Enroll every selected batch into the course. Each batch is enrolled via the
  // existing (idempotent) endpoint, so a course can hold students from many batches.
  const enroll = async () => {
    if (enrollGroupIds.length === 0) return;
    setEnrollMsg('');
    setEnrolling(true);
    try {
      let totalStudents = 0, totalNew = 0, batches = 0;
      for (const gid of enrollGroupIds) {
        const r = await api.post(`/api/coach/courses/${selected._id}/enroll`, { groupId: gid });
        totalStudents += r.data.enrolled || 0;
        totalNew += r.data.newlyEnrolled || 0;
        batches += 1;
      }
      setEnrollMsg(tr("Enrolled {batches} batch{v1} · {totalStudents} student(s) ({totalNew} new).", { batches: batches, v1: batches === 1 ? '' : 'es', totalStudents: totalStudents, totalNew: totalNew }));
      setEnrollGroupIds([]);
      await loadAll();
    } catch (err) {
      setEnrollMsg(err.response?.data?.message || 'Could not enroll.');
    } finally {
      setEnrolling(false);
    }
  };

  // ── Group management (multi-group: a student can be in many groups) ──
  if (loading) return <div className="coach-dash"><p>{tr("Loading…")}</p></div>;

  const sortedLessons = (selected?.lessons || []).slice().sort((a, b) => a.lessonIndex - b.lessonIndex);
  // Nexus (official) studies must be added one chapter at a time — no "whole study".
  const isNexus = studySource === 'nexus';

  return (
    <div className="coach-dash">
      <div className="coach-dash-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {tr("📚 Courses")}
            <button type="button" className="cb-help-btn"
              aria-label={tr("How courses work")}
              title={tr("How courses work")}
              onClick={() => setShowHelp(h => !h)}>?</button>
          </h1>
          <p className="coach-dash-sub">{tr("Build a syllabus from your studies. Students work through them in order.")}</p>
        </div>
        <Link to="/coach/dashboard" className="btn-ghost">{tr("← Dashboard")}</Link>
      </div>

      {error && <div className="cb-error">{error}</div>}

      {/* How groups + enrollment work — toggled by the ? next to the header */}
      {showHelp && (
        <div className="cb-help">
          <div className="cb-help-head">
            <span>{tr("💡 How students join a course")}</span>
            <button type="button" className="cb-help-toggle" onClick={() => setShowHelp(false)}>{tr("Close ✕")}</button>
          </div>
          <ol className="cb-help-steps">
            <li>
              <strong>{tr("Make a batch.")}</strong> {tr("On the")} <Link to="/coach/batches"><strong>{tr("Batches")}</strong></Link> {tr("page,")}
              {tr("create a batch (e.g.")} <em>{tr("Batch A")}</em>{tr(") and tick the students who belong to it. A student can be in")}
              <strong> {tr("several batches")}</strong> {tr("at once.")}
            </li>
            <li>
              <strong>{tr("Build the course")}</strong> {tr("— add your studies and YouTube videos as lessons, in order.")}
            </li>
            <li>
              <strong>{tr("Enroll batches.")}</strong> {tr("Open the course → tick")} <strong>{tr("one or more batches")}</strong> →
              <strong> {tr("Enroll selected batches")}</strong>{tr(". You can add more batches to the same course any time.")}
              This is what actually gives those students access.
            </li>
            <li>
              {tr("Students then see it under")} <strong>{tr("My Coach → 📚 My Syllabus")}</strong> {tr("and work through the")}
              {tr("lessons one by one. Private studies are visible")} <strong>{tr("only")}</strong> {tr("to enrolled students.")}
            </li>
          </ol>
        </div>
      )}

      <div className="cb-layout">
        {/* LEFT: create + course list */}
        <div className="cb-col-left">
          {(() => {
            const atCourseCap = limits.maxCourses != null && courses.length >= limits.maxCourses;
            return (
              <form onSubmit={createCourse} className="cb-card">
                <h3>{tr("➕ New course")}
                  {limits.maxCourses != null && (
                    <span className="cb-muted" style={{ fontSize: 12, fontWeight: 400, marginLeft: 8 }}>
                      {courses.length}/{limits.maxCourses}
                    </span>
                  )}
                </h3>
                {atCourseCap ? (
                  <p className="cb-muted" style={{ margin: 0 }}>
                    {tr("You've reached the free limit of")} {limits.maxCourses} {tr("courses.")}{' '}
                    <Link to="/coach/subscription">{tr("Subscribe")}</Link> {tr("for unlimited courses.")}
                  </p>
                ) : (
                  <>
                    <input className="cb-input" placeholder={tr("Course title (e.g. Beginner → 1200)")}
                      value={newCourse.title} onChange={e => setNewCourse({ ...newCourse, title: e.target.value })} />
                    <textarea className="cb-textarea" placeholder={tr("Description (optional)")} rows={2}
                      value={newCourse.description} onChange={e => setNewCourse({ ...newCourse, description: e.target.value })} />
                    <button className="btn-primary" disabled={creating || !newCourse.title.trim()}>
                      {creating ? tr('Creating…') : tr('Create course')}
                    </button>
                  </>
                )}
              </form>
            );
          })()}

          <div className="cb-card">
            <h3>{tr("Your courses")}</h3>
            {courses.length === 0 && <p className="cb-muted">{tr("No courses yet.")}</p>}
            {courses.map(c => (
              <div key={c._id}
                className={`cb-course-row ${selected?._id === c._id ? 'active' : ''}`}
                onClick={() => openCourse(c._id)}>
                <div className="cb-course-title">{c.title}</div>
                <div className="cb-course-meta">
                  {c.lessonCount} {tr("lesson")}{c.lessonCount === 1 ? '' : 's'} · {c.enrollmentCount} {tr("student")}{c.enrollmentCount === 1 ? '' : 's'}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* RIGHT: selected course */}
        <div className="cb-col-right">
          {!selected && <div className="cb-card"><p className="cb-muted">{tr("Select or create a course to add lessons.")}</p></div>}
          {selected && (
            <>
              <div className="cb-card">
                {editingCourse ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    <input
                      className="cb-input"
                      value={courseForm.title}
                      onChange={e => setCourseForm(f => ({ ...f, title: e.target.value }))}
                      placeholder={tr("Course title")}
                      maxLength={200}
                    />
                    <textarea
                      className="cb-input"
                      rows={3}
                      value={courseForm.description}
                      onChange={e => setCourseForm(f => ({ ...f, description: e.target.value }))}
                      placeholder={tr("Description (optional)")}
                      maxLength={2000}
                      style={{ resize: 'vertical' }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-primary" onClick={saveCourse}
                        disabled={savingCourse || !courseForm.title.trim()}>
                        {savingCourse ? tr('Saving…') : tr('Save')}
                      </button>
                      <button className="btn-ghost" onClick={() => setEditingCourse(false)} disabled={savingCourse}>
                        {tr("Cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h2 style={{ margin: 0 }}>{selected.title}</h2>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Link className="btn-ghost" to={`/coach/courses/${selected._id}/progress`}>{tr("📊 Progress")}</Link>
                        <button className="btn-ghost" onClick={startEditCourse}>{tr("✏️ Edit")}</button>
                        <button className="btn-ghost" onClick={deleteCourse}
                          style={{ color: '#f87171', borderColor: 'rgba(248,113,113,0.4)' }}>{tr("🗑 Delete")}</button>
                      </div>
                    </div>
                    {selected.description && <p className="cb-muted">{selected.description}</p>}
                  </>
                )}
                {groups.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div className="cb-muted" style={{ fontSize: 12, marginBottom: 6 }}>{tr("Enroll one or more batches into this course:")}</div>
                    <div className="cb-batch-picker">
                      {groups.map(g => (
                        <label key={g._id} className={`cb-batch-chip ${enrollGroupIds.includes(g._id) ? 'on' : ''}`}>
                          <input
                            type="checkbox"
                            checked={enrollGroupIds.includes(g._id)}
                            onChange={() => toggleEnrollGroup(g._id)}
                          />
                          <span>{g.name} ({g.memberCount})</span>
                        </label>
                      ))}
                    </div>
                    <button
                      className="btn-primary"
                      onClick={enroll}
                      disabled={enrollGroupIds.length === 0 || enrolling}
                      style={{ marginTop: 8 }}
                    >
                      {enrolling
                        ? 'Enrolling…'
                        : enrollGroupIds.length <= 1
                          ? 'Enroll selected batch'
                          : tr("Enroll {length} selected batches", { length: enrollGroupIds.length })}
                    </button>
                  </div>
                )}
                {groups.length === 0 && (
                  <p className="cb-muted" style={{ marginTop: 6, fontSize: 12 }}>
                    {tr("No batches yet — create one on the")} <Link to="/coach/batches"><strong>{tr("Batches")}</strong></Link> {tr("page, then enroll it here.")}
                  </p>
                )}
                {enrollMsg && <p className="cb-muted" style={{ marginTop: 6 }}>{enrollMsg}</p>}
              </div>

              <div className="cb-card">
                <h3>{tr("Lessons (your studies, in order)")}
                  {limits.maxLessons != null && (
                    <span className="cb-muted" style={{ fontSize: 12, fontWeight: 400, marginLeft: 8 }}>
                      {sortedLessons.length}/{limits.maxLessons}
                    </span>
                  )}
                </h3>
                {sortedLessons.length === 0 && <p className="cb-muted">{tr("No lessons yet — add a study below.")}</p>}
                {sortedLessons.map((l, i) => (
                  <div key={l.lessonIndex} className="cb-lesson-row">
                    <span className="cb-lesson-idx">{l.lessonIndex}</span>
                    <div className="cb-lesson-main">
                      <div className="t">{l.kind === 'video' ? '🎥' : l.kind === 'masterGame' ? '♟' : l.kind === 'endgame' ? '🏁' : '📖'} {l.title}</div>
                    </div>
                    <button className="cb-icon-btn" disabled={i === 0} onClick={() => moveLesson(l.lessonIndex, -1)}>↑</button>
                    <button className="cb-icon-btn" disabled={i === sortedLessons.length - 1} onClick={() => moveLesson(l.lessonIndex, 1)}>↓</button>
                    <button className="cb-icon-btn" onClick={() => deleteLesson(l.lessonIndex)}>✕</button>
                  </div>
                ))}
              </div>

              {limits.maxLessons != null && sortedLessons.length >= limits.maxLessons ? (
                <div className="cb-card">
                  <h3>{tr("➕ Add a lesson")}</h3>
                  <p className="cb-muted" style={{ margin: 0 }}>
                    {tr("This course has reached the free limit of")} {limits.maxLessons} {tr("lessons.")}{' '}
                    <Link to="/coach/subscription">{tr("Subscribe")}</Link> {tr("for unlimited lessons per course.")}
                  </p>
                </div>
              ) : (
              <div className="cb-card">
                <h3>{tr("➕ Add a lesson")}</h3>
                {lessonErr && <div className="cb-error">{lessonErr}</div>}

                {/* Lesson type toggle */}
                <div className="cb-row" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
                  <button type="button"
                    className={lessonMode === 'study' ? 'btn-primary' : 'btn-ghost'}
                    onClick={() => { setLessonMode('study'); setLessonErr(''); }}>{tr("📖 Study")}</button>
                  <button type="button"
                    className={lessonMode === 'video' ? 'btn-primary' : 'btn-ghost'}
                    onClick={() => { setLessonMode('video'); setLessonErr(''); }}>{tr("🎥 Video")}</button>
                  <button type="button"
                    className={lessonMode === 'masterGame' ? 'btn-primary' : 'btn-ghost'}
                    onClick={() => { setLessonMode('masterGame'); setLessonErr(''); }}>{tr("♟ Master Game")}</button>
                  <button type="button"
                    className={lessonMode === 'endgame' ? 'btn-primary' : 'btn-ghost'}
                    onClick={() => { setLessonMode('endgame'); setLessonErr(''); loadEndgameFamilies(); }}>{tr("🏁 Endgame")}</button>
                </div>

                {lessonMode === 'study' && (
                  <>
                    {/* Source: my studies · any public study · the official Nexus studies */}
                    <div className="cb-row" style={{ marginBottom: 8 }}>
                      <button type="button"
                        className={studySource === 'mine' ? 'btn-primary' : 'btn-ghost'}
                        onClick={() => { setStudySource('mine'); loadStudies('mine', studySearch); }}>{tr("My studies")}</button>
                      <button type="button"
                        className={studySource === 'public' ? 'btn-primary' : 'btn-ghost'}
                        onClick={() => { setStudySource('public'); loadStudies('public', studySearch); }}>{tr("🌐 Public studies")}</button>
                      <button type="button"
                        className={studySource === 'nexus' ? 'btn-primary' : 'btn-ghost'}
                        onClick={() => { setStudySource('nexus'); loadStudies('nexus', studySearch); }}>{tr("✦ Nexus studies")}</button>
                    </div>
                    <input className="cb-input" placeholder={tr("Search studies by name…")}
                      value={studySearch}
                      onChange={e => setStudySearch(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') loadStudies(studySource, studySearch); }} />

                    {myStudies.length === 0 ? (
                      <p className="cb-muted">
                        {studySource === 'nexus' ? 'No Nexus studies found.'
                          : studySource === 'public' ? 'No public studies found.'
                          : <>{tr("You have no studies yet.")} <Link to="/my-studies">{tr("Create a study")}</Link> first.</>}
                      </p>
                    ) : (
                      <>
                        <select className="cb-select" value={pickStudyId}
                          onChange={e => { setPickStudyId(e.target.value); setPickChapterId(''); }}>
                          <option value="">{tr("Pick a study…")}</option>
                          {myStudies.map(s => (
                            <option key={s._id} value={s._id}>
                              {s.name}{s.isPublic ? '' : ' (private)'}
                              {studySource === 'public' && s.username ? tr(" · by {username}", { username: s.username }) : ''}
                              {' · '}{s.chapters?.length || 0} {tr("ch.")}
                            </option>
                          ))}
                        </select>

                        {/* Whole study OR a single chapter. Nexus studies are always
                            one chapter — their puzzles live on the Chapter doc. */}
                        {pickStudyId && (() => {
                          const st = myStudies.find(s => s._id === pickStudyId);
                          const chs = st?.chapters || [];
                          return (
                            <select className="cb-select" value={pickChapterId} onChange={e => setPickChapterId(e.target.value)}>
                              <option value="">
                                {isNexus ? tr('— Pick a chapter —') : tr("📚 Whole study ({length} chapters)", { length: chs.length })}
                              </option>
                              {chs.map(c => (
                                <option key={c._id} value={c._id}>
                                  — {c.name}{c.puzzleCount != null ? ` (${c.puzzleCount} positions)` : ''}
                                </option>
                              ))}
                            </select>
                          );
                        })()}

                        {isNexus && pickStudyId && !pickChapterId && (
                          <p className="cb-muted">{tr("Pick a chapter to add it as a lesson.")}</p>
                        )}

                        <button className="btn-primary"
                          onClick={addLesson}
                          disabled={!pickStudyId || (isNexus && !pickChapterId) || addingLesson}>
                          {addingLesson ? tr('Adding…') : pickChapterId ? tr('Add chapter') : tr('Add study')}
                        </button>
                      </>
                    )}
                    <p className="cb-muted" style={{ marginTop: 8, fontSize: 12 }}>
                      {tr("Add a whole study or a single chapter. Your private studies become visible to enrolled students automatically.")}
                    </p>
                  </>
                )}

                {lessonMode === 'video' && (
                  <>
                    <input className="cb-input" placeholder={tr("Video title (e.g. How pins work)")}
                      value={videoTitle} onChange={e => setVideoTitle(e.target.value)} />
                    <div className="cb-row" style={{ alignItems: 'center' }}>
                      <input className="cb-input" style={{ marginBottom: 0 }}
                        placeholder={tr("YouTube link (https://youtu.be/… )")}
                        value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
                      <button className="btn-primary" onClick={addVideoLesson} disabled={!videoUrl.trim() || addingLesson} style={{ flex: '0 0 auto' }}>
                        {addingLesson ? tr('Adding…') : tr('Add video')}
                      </button>
                    </div>
                    <p className="cb-muted" style={{ marginTop: 8, fontSize: 12 }}>
                      {tr("Paste a YouTube link — the video plays embedded inside the student's syllabus.")}
                    </p>
                  </>
                )}

                {lessonMode === 'masterGame' && (
                  <>
                    {/* Opening filters. Two levels, same as the Master Games
                        page: pick a major opening, then narrow to a variation.
                        Either can be used on its own, with or without a player. */}
                    <div className="cb-row" style={{ marginBottom: 8, gap: 8 }}>
                      <select
                        className="cb-input"
                        style={{ marginBottom: 0 }}
                        value={mgFamily}
                        onChange={e => setMgFamily(e.target.value)}
                      >
                        <option value="">{tr("All openings")}</option>
                        {mgFamilies.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                      <select
                        className="cb-input"
                        style={{ marginBottom: 0 }}
                        value={mgOpening}
                        onChange={e => setMgOpening(e.target.value)}
                        disabled={!mgFamily || mgVariations.length === 0}
                        title={mgFamily ? tr('Narrow to one variation') : tr('Choose an opening first')}
                      >
                        <option value="">
                          {mgFamily ? tr("All {mgFamily} variations", { mgFamily: mgFamily }) : tr('All variations')}
                        </option>
                        {mgVariations.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>

                    <div className="cb-row" style={{ alignItems: 'center' }}>
                      <input className="cb-input" style={{ marginBottom: 0 }}
                        placeholder={tr("Player name (optional, e.g. Kasparov)")}
                        value={mgQuery}
                        onChange={e => setMgQuery(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') searchMasterGames(); }} />
                      <button
                        className="btn-primary"
                        onClick={searchMasterGames}
                        disabled={(!mgQuery.trim() && !mgFamily && !mgOpening) || mgSearching}
                        style={{ flex: '0 0 auto' }}
                      >
                        {mgSearching ? tr('Searching…') : tr('Search')}
                      </button>
                    </div>
                    {mgResults.length > 0 && (
                      <div className="cb-mg-results" style={{ marginTop: 8, maxHeight: 260, overflowY: 'auto' }}>
                        {mgResults.map(g => (
                          <div key={g._id} className="cb-row" style={{ alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <span style={{ fontSize: 13 }}>
                              {g.white} vs {g.black}{g.year ? ` · ${g.year}` : ''}{g.result ? ` · ${g.result}` : ''}
                            </span>
                            <button className="btn-ghost" disabled={addingLesson} onClick={() => addMasterGameLesson(g._id)} style={{ flex: '0 0 auto' }}>{tr("Add")}</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {mgSearched && !mgSearching && mgResults.length === 0 && (
                      <p className="cb-muted" style={{ marginTop: 8, fontSize: 12 }}>
                        {tr("No games matched. Try a broader opening, or clear the player name.")}
                      </p>
                    )}
                    <p className="cb-muted" style={{ marginTop: 8, fontSize: 12 }}>
                      Master games are free professional games — students replay them move by move.
                      Filter by opening to build a themed course, or search a player for their classics.
                    </p>
                  </>
                )}

                {lessonMode === 'endgame' && (
                  <>
                    {/* Source: free public collection vs premium admin trainer (paid coaches) */}
                    <div className="cb-row" style={{ marginBottom: 8 }}>
                      <button type="button"
                        className={egSource === 'free' ? 'btn-primary' : 'btn-ghost'}
                        onClick={() => switchEgSource('free')}>{tr("Free collection")}</button>
                      {limits.subscribed ? (
                        <button type="button"
                          className={egSource === 'premium' ? 'btn-primary' : 'btn-ghost'}
                          onClick={() => switchEgSource('premium')}>{tr("⭐ Premium endgames")}</button>
                      ) : (
                        <button type="button" className="btn-ghost" disabled
                          title={tr("Subscribe to add premium endgames")}
                          style={{ opacity: 0.55 }}>{tr("🔒 Premium endgames")}</button>
                      )}
                    </div>
                    <select className="cb-select" value={egFamily} onChange={e => loadEndgamePositions(e.target.value)}>
                      <option value="">{tr("Pick an endgame type…")}</option>
                      {egFamilies.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>
                    {egLoading ? (
                      <p className="cb-muted">{tr("Loading positions…")}</p>
                    ) : egPositions.length > 0 ? (
                      <div className="cb-eg-results" style={{ maxHeight: 260, overflowY: 'auto' }}>
                        {egPositions.map((p, i) => (
                          <div key={i} className="cb-row" style={{ alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <span style={{ fontSize: 13 }}>
                              {p.white || p.black ? tr("{v0} vs {v1}", { v0: p.white || tr('White'), v1: p.black || tr('Black') }) : (p.title || tr('Position'))}
                              {p.year ? ` · ${p.year}` : ''}{p.result ? ` · ${p.result}` : ''}
                            </span>
                            <button className="btn-ghost" disabled={addingLesson} onClick={() => addEndgameLesson(p)} style={{ flex: '0 0 auto' }}>{tr("Add")}</button>
                          </div>
                        ))}
                      </div>
                    ) : egFamily ? (
                      <p className="cb-muted">{tr("No positions in this type.")}</p>
                    ) : null}
                    <p className="cb-muted" style={{ marginTop: 8, fontSize: 12 }}>
                      {egSource === 'premium'
                        ? 'Premium endgames from the trainer — free for your enrolled students inside this course (no XP needed).'
                        : 'Free endgame positions from the collection — students study & replay them (no XP needed).'}
                    </p>
                  </>
                )}
              </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
