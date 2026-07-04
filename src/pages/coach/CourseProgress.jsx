// pages/coach/CourseProgress.jsx
// The coach payoff screen for a course: a grid of students × lessons showing each
// student's position through the syllabus (✓ done · ● current · 🔒 locked).
// Data from GET /api/coach/courses/:courseId/progress.
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api';
import './CoachDashboard.css';
import './CourseBuilder.css';

const CELL = {
  done: { icon: '✓', bg: 'rgba(34,197,94,0.18)', title: 'Completed' },
  current: { icon: '●', bg: 'rgba(99,102,241,0.25)', title: 'On this lesson' },
  locked: { icon: '🔒', bg: 'rgba(255,255,255,0.04)', title: 'Locked' },
};

export default function CourseProgress() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get(`/api/coach/courses/${courseId}/progress`);
        setData(r.data);
      } catch (err) {
        if (err.response?.status === 402) { navigate('/coach/subscription?expired=1'); return; }
        setError(err.response?.data?.message || 'Could not load progress.');
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, navigate]);

  if (loading) return <div className="coach-dash"><p>Loading…</p></div>;
  if (error) return <div className="coach-dash"><div className="cb-error">{error}</div></div>;
  if (!data) return null;

  const { course, lessons, rows } = data;

  return (
    <div className="coach-dash">
      <div className="coach-dash-header">
        <div>
          <h1>📊 {course.title}</h1>
          <p className="coach-dash-sub">Each student's progress through the syllabus.</p>
        </div>
        <Link to="/coach/courses" className="btn-ghost">← Courses</Link>
      </div>

      {rows.length === 0 && <div className="cb-card"><p className="cb-muted">No students enrolled yet. Enroll a group from the course page.</p></div>}

      {rows.length > 0 && (
        <div className="cb-card" style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 480 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 12px', position: 'sticky', left: 0 }}>Student</th>
                {lessons.map(l => (
                  <th key={l.lessonIndex} style={{ padding: '8px 6px', fontSize: 12, fontWeight: 600, textAlign: 'center' }}
                    title={l.title}>
                    L{l.lessonIndex}
                  </th>
                ))}
                <th style={{ padding: '8px 6px', fontSize: 12, textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={String(row.studentId)} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600, whiteSpace: 'nowrap' }}>{row.studentName}</td>
                  {row.lessons.map(cell => {
                    const c = CELL[cell.state] || CELL.locked;
                    return (
                      <td key={cell.lessonIndex} style={{ padding: 4, textAlign: 'center' }}>
                        <div title={c.title}
                          style={{ background: c.bg, borderRadius: 6, padding: '6px 0', fontSize: 15 }}>
                          {c.icon}
                        </div>
                      </td>
                    );
                  })}
                  <td style={{ padding: '8px 6px', textAlign: 'center', fontSize: 12 }}>
                    {row.status === 'completed'
                      ? <span style={{ color: '#22c55e' }}>Done 🎉</span>
                      : <span className="cb-muted">Lesson {row.currentLessonIndex}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="cb-muted" style={{ marginTop: 10, fontSize: 12 }}>
            ✓ completed &nbsp;·&nbsp; ● on this lesson &nbsp;·&nbsp; 🔒 locked
          </div>
        </div>
      )}
    </div>
  );
}
