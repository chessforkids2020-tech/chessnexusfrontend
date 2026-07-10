// components/StudentCourses.jsx
// Student "My Syllabus" view — the courses a student is enrolled in, shown as an
// ordered list of study lessons. The current lesson opens the study (at
// /my-studies/:studyId, which now grants read access to enrolled students even for
// the coach's private studies); later lessons are locked (🔒). After studying, the
// student clicks "Mark as studied" to unlock the next lesson.
// Data: GET /api/coach/my-courses  +  POST .../lessons/:idx/studied.
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import GameAnalysisModal from './masterGames/GameAnalysisModal';
import '../pages/MyCoachPortal.css';

export default function StudentCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState('');
  const [openGameId, setOpenGameId] = useState(null); // master-game lesson modal

  const reload = useCallback(async () => {
    try {
      const c = await api.get('/api/coach/my-courses');
      setCourses(c.data?.courses || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => { setLoading(true); await reload(); if (alive) setLoading(false); })();
    return () => { alive = false; };
  }, [reload]);

  // A UserStudy lesson. Its chapters are embedded subdocs, so a single chapter
  // opens at /my-studies/:id/chapter/:chapterId — NOT /study/chapter/..., which
  // reads the separate admin Study/Chapter collections (see openNexusStudy).
  const openStudy = (studyId, chapterId) =>
    navigate(chapterId ? `/my-studies/${studyId}/chapter/${chapterId}` : `/my-studies/${studyId}`);

  // An official Nexus study (Admin → Study Management): Study + Chapter models,
  // always one chapter, served by the existing /study/chapter viewer.
  const openNexusStudy = (studyId, chapterId) =>
    navigate(`/study/chapter/${studyId}/${chapterId}`);

  const markStudied = async (courseId, lessonIndex) => {
    setMarking(`${courseId}:${lessonIndex}`);
    try {
      await api.post(`/api/coach/my-courses/${courseId}/lessons/${lessonIndex}/studied`);
      await reload();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not update.');
    } finally {
      setMarking('');
    }
  };

  if (loading) return null;
  if (courses.length === 0) {
    return <div className="mcp-empty">No syllabus yet. Your coach will enroll you in a course.</div>;
  }

  return (
    <>
      {courses.map(course => (
        <div key={course.courseId} className="mcp-course-card">
          <div className="mcp-course-head">
            <div>
              <div className="mcp-course-title">📚 {course.title}</div>
              <div className="mcp-course-sub">{course.coachName}
                {course.status === 'completed' ? ' · Completed 🎉' : ` · On lesson ${course.currentLessonIndex}`}</div>
            </div>
          </div>
          {course.description && <p className="mcp-course-desc">{course.description}</p>}

          <div className="mcp-lesson-list">
            {course.lessons.map(l => {
              const isVideo = l.kind === 'video';
              const isMaster = l.kind === 'masterGame';
              const isEndgame = l.kind === 'endgame';
              const isNexus = l.kind === 'nexusStudy';
              const icon = isVideo ? '🎥' : isMaster ? '♟' : isEndgame ? '🏁' : isNexus ? '✦' : '📖';
              const markLabel = isVideo ? '✓ Mark as watched' : (isMaster || isEndgame) ? '✓ Mark as reviewed' : '✓ Mark as studied';
              // Open the lesson content by kind.
              const open = () => {
                if (isMaster) setOpenGameId(l.masterGameId);
                else if (isEndgame) navigate('/study/endgames');
                else if (isNexus) openNexusStudy(l.nexusStudyId, l.nexusChapterId);
                else openStudy(l.studyId, l.chapterId);
              };
              return (
              <div key={l.lessonIndex} className={`mcp-lesson mcp-lesson-${l.state}`} style={isVideo && (l.state === 'current' || l.state === 'done') ? { flexWrap: 'wrap' } : undefined}>
                <span className="mcp-lesson-idx">{l.lessonIndex}</span>
                <span className="mcp-lesson-title">{icon} {l.title}</span>
                <span className="mcp-lesson-action">
                  {l.state === 'done' && (
                    <>
                      {isVideo
                        ? <a className="mcp-lesson-review" href={`https://youtu.be/${l.videoId}`} target="_blank" rel="noreferrer">Rewatch ↗</a>
                        : <button className="mcp-lesson-review" onClick={open}>Review</button>}
                      <span className="mcp-lesson-done-tag">✓ studied</span>
                    </>
                  )}
                  {l.state === 'current' && (
                    <>
                      {!isVideo && <button className="mcp-lesson-play" onClick={open}>▶ Open</button>}
                      <button className="mcp-lesson-mark"
                        disabled={marking === `${course.courseId}:${l.lessonIndex}`}
                        onClick={() => markStudied(course.courseId, l.lessonIndex)}>
                        {marking === `${course.courseId}:${l.lessonIndex}` ? '…' : markLabel}
                      </button>
                    </>
                  )}
                  {l.state === 'locked' && <span className="mcp-lesson-locked">🔒</span>}
                </span>

                {/* Inline embedded player for the current video lesson */}
                {isVideo && l.state === 'current' && l.videoId && (
                  <div className="mcp-video-embed">
                    <iframe
                      src={`https://www.youtube.com/embed/${l.videoId}`}
                      title={l.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>
      ))}
      {openGameId && <GameAnalysisModal gameId={openGameId} onClose={() => setOpenGameId(null)} />}
    </>
  );
}
