import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import StudentAssignments from '../components/StudentAssignments';
import StudentCourses from '../components/StudentCourses';
import CoachChat from '../components/coach/CoachChat';
import AskCoachPanel from '../components/AskCoachPanel';
import { DAY_NAMES, DAY_FULL, localTimeLabel, localDow, soonestClass, classesOnLocalDate } from '../utils/istSchedule';
import './MyCoachPortal.css';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function curSym(c) { return c === 'USD' ? '$' : c === 'EUR' ? '€' : '₹'; }


export default function MyCoachPortal() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [coaches, setCoaches] = useState([]);
  const [attendance, setAttendance] = useState({ records: [], stats: null });
  const [payments, setPayments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [holidays, setHolidays] = useState([]); // [{ date:"YYYY-MM-DD", labels:[] }]
  const [cursor, setCursor] = useState(new Date());
  // Month shown in the Schedule tab calendar (independent of attendance cursor).
  const [schedMonth, setSchedMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  // Day whose classes/holiday are shown in the calendar popover (or null).
  const [dayDetail, setDayDetail] = useState(null); // { dateLabel, classes:[{cls,time}], holiday }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Unread coach messages — badged on the Messages tab so the student notices.
  const [msgUnread, setMsgUnread] = useState(0);
  // Coach activities (private races) + unseen count for the Activities tab badge.
  const [activities, setActivities] = useState([]);
  const [activityUnseen, setActivityUnseen] = useState(0);

  // Class Payment request form (targets the student's coach via the link).
  const [payForm, setPayForm] = useState({ paidDate: '', fromDate: '', untilDate: '', amount: '' });
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payNotice, setPayNotice] = useState('');
  const [payError, setPayError] = useState('');

  const submitFees = async (coach) => {
    setPayError(''); setPayNotice('');
    if (!payForm.amount || Number(payForm.amount) <= 0) { setPayError('Enter the amount you paid.'); return; }
    setPaySubmitting(true);
    try {
      await api.post('/api/coach-attendance/requests', {
        coachId: coach.coachId,
        amount: Number(payForm.amount),
        currency: coach.currency || 'INR',
        forMonth: payForm.fromDate ? new Date(payForm.fromDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '',
        paidDate: payForm.paidDate || undefined,
        fromDate: payForm.fromDate || undefined,
        untilDate: payForm.untilDate || undefined,
      });
      setPayNotice(`Sent to ${coach.coachName}. Your coach will review it.`);
      setPayForm({ paidDate: '', fromDate: '', untilDate: '', amount: '' });
    } catch (e) {
      setPayError(e.response?.data?.error || 'Could not submit your fees. Try again.');
    } finally {
      setPaySubmitting(false);
    }
  };

  // Initial load: coaches + payments (don't depend on month)
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [coachesRes, paymentsRes, assignmentsRes, scheduleRes] = await Promise.all([
          api.get('/api/coach-attendance/my/coaches'),
          api.get('/api/coach-attendance/my/payments'),
          api.get('/api/coach/my-assignments'),
          api.get('/api/coach-schedule/my').catch(() => ({ data: { classes: [], holidays: [] } })),
        ]);
        if (!alive) return;
        // Exclude the ADMIN coach here — admin-added students manage their
        // classes (attendance/fees/assignments) in the Student Portal, not here.
        // My Coach is only for PRIVATE coaches.
        setCoaches((coachesRes.data || []).filter(c => !c.isAdmin));
        setPayments(paymentsRes.data?.payments || []);
        setAssignments(assignmentsRes.data?.assignments || []);
        setClasses(scheduleRes.data?.classes || []);
        setHolidays(scheduleRes.data?.holidays || []);
        setError(null);
      } catch {
        if (alive) setError('Could not load your coach records.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Poll unread coach-message count for the Messages tab badge.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await api.get('/api/chat/coach/unread-count');
        if (alive) setMsgUnread(res.data?.count || 0);
      } catch { /* ignore */ }
    };
    load();
    const id = setInterval(load, 30000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Poll coach activities (private races) for the Activities tab + its badge.
  const loadActivities = async () => {
    try {
      const res = await api.get('/api/coach-arena/my');
      setActivities(res.data?.activities || []);
      setActivityUnseen(res.data?.unseen || 0);
    } catch { /* ignore */ }
  };
  useEffect(() => {
    let alive = true;
    const run = async () => { if (alive) await loadActivities(); };
    run();
    const id = setInterval(run, 30000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Opening the Messages tab marks threads read → clear the badge.
  useEffect(() => {
    if (tab === 'messages') setMsgUnread(0);
  }, [tab]);

  // Opening the Activities tab marks them seen → clear the badge.
  useEffect(() => {
    if (tab === 'activities' && activityUnseen > 0) {
      api.post('/api/coach-arena/my/seen').then(() => setActivityUnseen(0)).catch(() => {});
    }
  }, [tab]); // eslint-disable-line

  // Close the calendar day popover on tab or month change, and on Escape.
  useEffect(() => { setDayDetail(null); }, [tab, schedMonth]);
  useEffect(() => {
    if (!dayDetail) return;
    const onKey = (e) => { if (e.key === 'Escape') setDayDetail(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dayDetail]);

  // Attendance reloads whenever the month cursor changes
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const year = cursor.getFullYear();
        const month = cursor.getMonth() + 1;
        const res = await api.get(`/api/coach-attendance/my/attendance?year=${year}&month=${month}`);
        if (alive) setAttendance({ records: res.data?.records || [], stats: res.data?.stats || null });
      } catch {
        if (alive) setAttendance({ records: [], stats: null });
      }
    })();
    return () => { alive = false; };
  }, [cursor]);

  const shiftMonth = (d) => {
    const n = new Date(cursor);
    n.setMonth(n.getMonth() + d);
    setCursor(n);
  };

  const fmtDate = (s) => new Date(s).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: 'numeric',
  });

  // When the coach actually recorded this entry — mirrors the coach's own
  // "Marked entries" table. `updatedAt` wins so an edited status shows the edit
  // time. Records predate `slot`/timestamps in a few cases, hence the guards.
  const fmtEntryTime = (r) => {
    // joinedAt (the real "walked into class" moment) wins when the record came
    // from a live class; otherwise fall back to when the coach marked it.
    const t = r.joinedAt || r.updatedAt || r.createdAt;
    if (!t) return '—';
    return new Date(t).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short',
      hour: 'numeric', minute: '2-digit',
    });
  };

  // Soonest upcoming class, skipping any that land on a holiday date.
  const holidaySet = new Set(holidays.map(h => h.date));
  const nextClass = () => {
    const pad = (n) => String(n).padStart(2, '0');
    let from = Date.now();
    // Advance past holiday-day matches (bounded to avoid an infinite loop).
    for (let guard = 0; guard < 60; guard++) {
      const s = soonestClass(classes, from);
      if (!s) return null;
      const iso = `${s.when.getFullYear()}-${pad(s.when.getMonth() + 1)}-${pad(s.when.getDate())}`;
      if (!holidaySet.has(iso)) return s;
      // Advance past this occurrence AND the 60s "happening now" tolerance in
      // nextOccurrence, else we'd re-match the same instant and loop.
      from = s.when.getTime() + 2 * 60000; // skip this occurrence, look further
    }
    return null;
  };

  const statusClass = (st) =>
    st === 'Present' ? 'mcp-badge mcp-present'
    : st === 'Absent' ? 'mcp-badge mcp-absent'
    : 'mcp-badge mcp-catchup';

  // ── No coach linked ──
  if (!loading && coaches.length === 0) {
    return (
      <div className="mcp-page">
        <div className="mcp-empty">
          <div className="mcp-empty-icon">🎓</div>
          <h2 className="mcp-empty-title">No coach linked yet</h2>
          <p className="mcp-empty-desc">
            When your coach adds you and marks your attendance, it will appear here.
          </p>
          {/* Until now this was a dead end: it named the outcome but gave the
              student no way to reach it. They can now ask their coach directly. */}
          <AskCoachPanel />
          <Link to="/dashboard" className="mcp-empty-btn">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mcp-page">
        <div className="mcp-loading">Loading your coach records…</div>
      </div>
    );
  }

  return (
    <div className="mcp-page">
      <div className="mcp-bg" />

      <div className="mcp-header">
        <h1 className="mcp-title">🎓 My Coach</h1>
        <p className="mcp-subtitle">Attendance & payments recorded by your coach</p>
      </div>

      {error && <div className="mcp-error">{error}</div>}

      <div className="mcp-tabs">
        {[
          { id: 'overview',    icon: '📊', text: 'Overview' },
          { id: 'schedule',    icon: '📅', text: 'Schedule' },
          { id: 'activities',  icon: '🎯', text: 'Activities' },
          { id: 'messages',    icon: '💬', text: 'Messages' },
          { id: 'courses',     icon: '📚', text: 'My Syllabus' },
          { id: 'assignments', icon: '📋', text: 'Assignments' },
          { id: 'player',      icon: '👤', text: 'Player' },
          { id: 'attendance',  icon: '📝', text: 'Attendance' },
          { id: 'payments',    icon: '💰', text: 'Payments' },
        ].map(t => (
          <button
            key={t.id}
            className={`mcp-tab ${tab === t.id ? 'mcp-tab-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="mcp-tab-icon">{t.icon}</span>
            <span className="mcp-tab-text">{t.text}</span>
            {t.id === 'messages' && msgUnread > 0 && (
              <span className="mcp-tab-badge">{msgUnread > 99 ? '99+' : msgUnread}</span>
            )}
            {t.id === 'activities' && activityUnseen > 0 && (
              <span className="mcp-tab-badge">{activityUnseen > 99 ? '99+' : activityUnseen}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Activities (private coach races) ── */}
      {tab === 'activities' && (
        <div className="mcp-section">
          {activities.length === 0 ? (
            <div className="mcp-empty" style={{ padding: '32px 20px' }}>
              <div className="mcp-empty-icon">🎯</div>
              <h2 className="mcp-empty-title">No activities right now</h2>
              <p className="mcp-empty-desc">When your coach starts a class race, it shows up here for you to join.</p>
            </div>
          ) : (
            <div className="mcp-class-grid">
              {activities.map(a => {
                const isTournament = a.type === 'arena_tournament';
                const live = a.status === 'active' || a.status === 'pairing_stopped';
                const joinTournament = async () => {
                  try {
                    await api.post('/api/arenatournament/join', { tournamentId: a._id });
                    navigate(`/arenatournament/live/${a._id}`);
                  } catch (err) {
                    alert(err.response?.data?.error || 'Could not join this tournament.');
                  }
                };
                const joinRace = async () => {
                  try {
                    await api.post('/api/arena/join', { roomId: a.roomId });
                    navigate(`/arena/waiting/${a.roomId}`);
                  } catch (err) {
                    alert(err.response?.data?.error || 'Could not join this race.');
                  }
                };
                return (
                  <div key={a._id} className="mcp-class-card">
                    <div className="mcp-class-title">{isTournament ? '🏆' : '🏁'} {a.name || (isTournament ? 'Class Tournament' : 'Class Race')}</div>
                    <div className="mcp-class-coach">{isTournament ? 'Arena Tournament' : `${a.topic} · ${a.timeLimit} min`}</div>
                    <div className="mcp-class-time" style={{ marginTop: 6 }}>
                      {live
                        ? <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}>🔴 Live now</span>
                        : <span style={{ color: 'var(--color-warning)', fontWeight: 700 }}>⏳ Waiting to start</span>}
                      {!a.seen && <span className="mcp-class-daychip" style={{ marginLeft: 8 }}>NEW</span>}
                    </div>
                    <button
                      className="mcp-join-btn"
                      style={{ marginTop: 10 }}
                      onClick={isTournament ? joinTournament : joinRace}
                    >
                      {live ? 'Join now' : 'Enter lobby'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Schedule (coach's weekly class calendar) ── */}
      {tab === 'schedule' && (
        <div className="mcp-section">
          {classes.length === 0 && holidays.length === 0 ? (
            <div className="mcp-empty" style={{ padding: '32px 20px' }}>
              <div className="mcp-empty-icon">📅</div>
              <h2 className="mcp-empty-title">No classes scheduled yet</h2>
              <p className="mcp-empty-desc">When your coach sets your class days and times, they'll show up here.</p>
            </div>
          ) : (
            <>
              {(() => {
                const next = nextClass();
                if (!next) return null;
                const when = next.when.toLocaleString([], { weekday: 'long', hour: 'numeric', minute: '2-digit' });
                return (
                  <div className="mcp-nextclass">
                    <div>
                      <div className="mcp-nextclass-label">⏰ Next class</div>
                      <div className="mcp-nextclass-when">{when} — {next.item.title} · {next.item.coachName}</div>
                    </div>
                    {next.item.meetingLink && (
                      <a href={next.item.meetingLink} target="_blank" rel="noopener noreferrer" className="mcp-join-btn">
                        Join
                      </a>
                    )}
                  </div>
                );
              })()}

              {/* Monthly calendar — class days glow brighter; holidays are marked */}
              {(() => {
                const y = schedMonth.getFullYear();
                const m = schedMonth.getMonth();
                const first = new Date(y, m, 1);
                const daysInMonth = new Date(y, m + 1, 0).getDate();
                const lead = first.getDay(); // blank cells before day 1
                const today = new Date();
                const isToday = (d) => today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
                const pad = (n) => String(n).padStart(2, '0');
                const holidayMap = {};
                for (const h of holidays) holidayMap[h.date] = h;
                const cells = [];
                for (let i = 0; i < lead; i++) cells.push(null);
                for (let d = 1; d <= daysInMonth; d++) cells.push(d);
                return (
                  <div className="mcp-cal">
                    <div className="mcp-cal-head">
                      <button className="mcp-cal-nav" onClick={() => setSchedMonth(new Date(y, m - 1, 1))} aria-label="Previous month">‹</button>
                      <div className="mcp-cal-title">{MONTHS[m]} {y}</div>
                      <button className="mcp-cal-nav" onClick={() => setSchedMonth(new Date(y, m + 1, 1))} aria-label="Next month">›</button>
                    </div>
                    <div className="mcp-cal-grid">
                      {DAY_NAMES.map(dn => <div key={dn} className="mcp-cal-dow">{dn}</div>)}
                      {cells.map((d, i) => {
                        if (d === null) return <div key={`b${i}`} className="mcp-cal-cell mcp-cal-empty" />;
                        const iso = `${y}-${pad(m + 1)}-${pad(d)}`;
                        const holiday = holidayMap[iso];
                        // On a holiday, the academy is closed — suppress class markers.
                        const dayClasses = holiday ? [] : classesOnLocalDate(classes, new Date(y, m, d));
                        const has = dayClasses.length > 0;
                        const clickable = !!holiday || has;
                        const cls = `mcp-cal-cell ${holiday ? 'mcp-cal-holiday' : has ? 'mcp-cal-has' : ''} ${isToday(d) ? 'mcp-cal-today' : ''} ${clickable ? 'mcp-cal-clickable' : ''}`;
                        const dateLabel = new Date(y, m, d).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
                        const openDetail = () => setDayDetail({ dateLabel, classes: dayClasses, holiday });
                        const inner = (
                          <>
                            <div className="mcp-cal-date">{d}</div>
                            {holiday ? (
                              <div className="mcp-cal-holtag">🎉 Holiday</div>
                            ) : (
                              <>
                                {dayClasses.slice(0, 2).map((dc, j) => (
                                  <div key={j} className="mcp-cal-class">{dc.time}</div>
                                ))}
                                {dayClasses.length > 2 && <div className="mcp-cal-more">+{dayClasses.length - 2}</div>}
                              </>
                            )}
                          </>
                        );
                        return clickable ? (
                          <button key={d} type="button" className={cls} onClick={openDetail} aria-label={`${dateLabel}${holiday ? ' — holiday' : `, ${dayClasses.length} class${dayClasses.length === 1 ? '' : 'es'}`}`}>
                            {inner}
                          </button>
                        ) : (
                          <div key={d} className={cls}>{inner}</div>
                        );
                      })}
                    </div>
                    <div className="mcp-cal-legend">
                      <span className="mcp-cal-legend-item"><span className="mcp-cal-swatch mcp-cal-swatch-class" /> Class day</span>
                      <span className="mcp-cal-legend-item"><span className="mcp-cal-swatch mcp-cal-swatch-holiday" /> Holiday (no class)</span>
                    </div>
                  </div>
                );
              })()}

              {/* Day detail popover — opens when a class/holiday day is tapped */}
              {dayDetail && (
                <div className="mcp-daypop-overlay" onClick={() => setDayDetail(null)}>
                  <div className="mcp-daypop" onClick={e => e.stopPropagation()}>
                    <div className="mcp-daypop-head">
                      <div className="mcp-daypop-date">{dayDetail.dateLabel}</div>
                      <button className="mcp-daypop-x" onClick={() => setDayDetail(null)} aria-label="Close">✕</button>
                    </div>
                    {dayDetail.holiday ? (
                      <div className="mcp-daypop-holiday">
                        <div className="mcp-daypop-holicon">🎉</div>
                        <div className="mcp-daypop-holtitle">Holiday — no class</div>
                        {(dayDetail.holiday.labels || []).length > 0 && (
                          <div className="mcp-daypop-hollabels">
                            {dayDetail.holiday.labels.map((l, j) => <div key={j}>{l}</div>)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mcp-daypop-list">
                        {dayDetail.classes.map((dc, j) => (
                          <div key={j} className="mcp-daypop-class">
                            <div className="mcp-daypop-class-main">
                              <div className="mcp-daypop-class-title">{dc.cls.title}</div>
                              <div className="mcp-daypop-class-meta">
                                {dc.cls.coachName} · 🕒 {dc.time} · {dc.cls.durationMinutes} min
                              </div>
                            </div>
                            {dc.cls.meetingLink ? (
                              <a href={dc.cls.meetingLink} target="_blank" rel="noopener noreferrer" className="mcp-join-btn">
                                Join
                              </a>
                            ) : (
                              <span className="mcp-daypop-nolink">No link</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mcp-class-grid">
                {classes.map(c => (
                  <div key={c._id} className="mcp-class-card">
                    <div className="mcp-class-title">{c.title}</div>
                    <div className="mcp-class-coach">{c.coachName}</div>
                    <div className="mcp-class-days">
                      {[...new Set((c.days || []).map(d => localDow(d, c.timeUTC)))].map(ld => (
                        <span key={ld} className="mcp-class-daychip" title={DAY_FULL[ld]}>{DAY_NAMES[ld]}</span>
                      ))}
                    </div>
                    <div className="mcp-class-time">
                      🕒 {localTimeLabel((c.days || [])[0] ?? 1, c.timeUTC)} <span className="mcp-class-tz">your time</span>
                      <span className="mcp-class-dur"> · {c.durationMinutes} min</span>
                    </div>
                    {c.meetingLink ? (
                      <a href={c.meetingLink} target="_blank" rel="noopener noreferrer" className="mcp-join-btn" style={{ marginTop: 10 }}>
                        🔗 Join class
                      </a>
                    ) : (
                      <div className="mcp-class-nolink">No meeting link yet</div>
                    )}
                  </div>
                ))}
              </div>
              <p className="mcp-class-foot">All times shown in your local timezone.</p>
            </>
          )}
        </div>
      )}

      {/* ── Messages (coach ↔ student chat, read + reply only) ── */}
      {tab === 'messages' && (
        <div className="mcp-section">
          <CoachChat mode="student" />
        </div>
      )}

      {/* ── Player (enrollment profile) ── */}
      {tab === 'player' && (
        <div className="mcp-section">
          {coaches.map(c => (
            <div key={c.linkId} className="mcp-player-card">
              {/* Hero */}
              <div className="mcp-player-hero">
                <div className="mcp-player-avatar">👨‍🏫</div>
                <div className="mcp-player-hero-text">
                  <div className="mcp-player-coach">{c.coachName}</div>
                  <div className="mcp-player-sub">
                    {c.studentName || 'Student'}
                    {c.onBreak && <span className="mcp-break-tag" style={{ marginLeft: 8 }}>On Break</span>}
                  </div>
                </div>
                <div className="mcp-player-code">
                  <span className="mcp-player-code-label">CODE</span>
                  <span className="mcp-player-code-val">{c.coachCode || '—'}</span>
                </div>
              </div>

              {/* Detail rows */}
              <div className="mcp-player-rows">
                <div className="mcp-player-row">
                  <span className="mcp-player-row-ic">📅</span>
                  <span className="mcp-player-row-label">Classes / month</span>
                  <span className="mcp-player-row-val">{c.classesPerMonth || 0}</span>
                </div>
                <div className="mcp-player-row">
                  <span className="mcp-player-row-ic">💸</span>
                  <span className="mcp-player-row-label">Monthly fees</span>
                  <span className="mcp-player-row-val">{curSym(c.currency)}{c.fees || 0}</span>
                </div>
                <div className="mcp-player-row">
                  <span className="mcp-player-row-ic">👥</span>
                  <span className="mcp-player-row-label">Class type</span>
                  <span className="mcp-player-row-val">{c.classType || 'Private'}</span>
                </div>
                <div className="mcp-player-row">
                  <span className="mcp-player-row-ic">🗓️</span>
                  <span className="mcp-player-row-label">Joined</span>
                  <span className="mcp-player-row-val">{c.enrollmentDate ? fmtDate(c.enrollmentDate) : '—'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Courses ── */}
      {tab === 'courses' && (
        <div className="mcp-section">
          <StudentCourses />
        </div>
      )}

      {/* ── Assignments ── */}
      {tab === 'assignments' && (
        <div className="mcp-section">
          <StudentAssignments only="private" onLoaded={setAssignments} />
        </div>
      )}

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="mcp-section">
          {/* Next class hint (from the coach's schedule) */}
          {(() => {
            const next = nextClass();
            if (!next) return null;
            const when = next.when.toLocaleString([], { weekday: 'long', hour: 'numeric', minute: '2-digit' });
            return (
              <div className="mcp-nextclass" style={{ marginBottom: 20 }}>
                <div>
                  <div className="mcp-nextclass-label">⏰ Next class</div>
                  <div className="mcp-nextclass-when">{when} — {next.item.title} · {next.item.coachName}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {next.item.meetingLink && (
                    <a href={next.item.meetingLink} target="_blank" rel="noopener noreferrer" className="mcp-join-btn">Join</a>
                  )}
                  <button className="mcp-join-btn" style={{ background: 'transparent', border: '1px solid rgba(139,92,246,0.5)', color: 'var(--color-accent-2)' }} onClick={() => setTab('schedule')}>
                    Full schedule
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Assignment stats for the selected month */}
          {(() => {
            const inCursorMonth = (d) => {
              if (!d) return false;
              const dt = new Date(d);
              return dt.getMonth() === cursor.getMonth() && dt.getFullYear() === cursor.getFullYear();
            };
            const finishedThisMonth = assignments.filter(
              a => a.status === 'completed' && inCursorMonth(a.completedAt)
            ).length;
            const pending = assignments.filter(a => a.status !== 'completed').length;
            // Average accuracy across assignments that have an accuracy value
            // (puzzle assignments report accuracy; blunder/test don't).
            const withAcc = assignments.filter(a => (a.accuracy || 0) > 0);
            const avgAccuracy = withAcc.length
              ? Math.round(withAcc.reduce((s, a) => s + (a.accuracy || 0), 0) / withAcc.length)
              : 0;
            return (
              <div className="mcp-stat-row" style={{ marginBottom: 20 }}>
                <div className="mcp-stat">
                  <span className="mcp-stat-num">📋 {finishedThisMonth}</span>
                  <span className="mcp-stat-label">Assignments finished ({MONTHS[cursor.getMonth()]})</span>
                </div>
                <div className="mcp-stat">
                  <span className="mcp-stat-num">⏳ {pending}</span>
                  <span className="mcp-stat-label">Pending assignments</span>
                </div>
                <div className="mcp-stat">
                  <span className="mcp-stat-num">🎯 {avgAccuracy}%</span>
                  <span className="mcp-stat-label">Accuracy</span>
                </div>
              </div>
            );
          })()}

          {/* Assignments — NEW (not-yet-started) first, then in-progress. Finished
              assignments are NOT shown here (see the Assignments tab for those). */}
          {(() => {
            const rank = (s) => (s === 'pending' ? 0 : s === 'in_progress' ? 1 : 2);
            const sorted = [...assignments]
              .filter(a => a.status !== 'completed')
              .sort((a, b) => rank(a.status) - rank(b.status));
            const top = sorted.slice(0, 3); // show the most relevant few on Overview
            if (top.length === 0) return null;
            return (
              <div style={{ marginBottom: 20 }}>
                {top.map(a => {
                  const isNew = a.status === 'pending';
                  const isPgn = a.assignmentType === 'custom' && a.pgnTask;
                  const isTest = a.assignmentType === 'study_chapter';
                  const isRush = a.assignmentType === 'puzzle_rush';
                  const isArena = a.assignmentType === 'arena_tournament';
                  const cur = isPgn ? (a.foundCount || 0) : (a.progress || 0);
                  const tot = isPgn ? (a.pgnTask.findTarget || 0) : (a.targetCount || 0);
                  const pct = tot > 0 ? Math.min(100, Math.round((cur / tot) * 100)) : 0;
                  const canStart = (a.assignmentType === 'puzzle_topic' || a.assignmentType === 'custom' || isTest || isRush || isArena) && a.status !== 'completed';
                  return (
                    <div key={a._id} className={`mcp-current-assign ${isNew ? 'mcp-assign-new' : ''}`}>
                      <div className="mcp-current-assign-label">
                        {isNew ? '🆕 New assignment' : a.status === 'completed' ? '✓ Assignment' : '📋 Current assignment'}
                      </div>
                      <div className="mcp-current-assign-title">{a.title}</div>
                      <div className="mcp-current-assign-row">
                        {isTest
                          ? <span>Timed test{a.targetGrade > 0 ? <> · goal <strong>{a.targetGrade}%</strong></> : null}</span>
                          : isRush
                            ? <span>⚡ {a.rushTopicLabel || a.rushTopic || 'Mixed'} · {a.rushMinutes || 5} min{a.rushTargetSolved > 0 ? <> · goal <strong>{a.rushTargetSolved}</strong></> : null}</span>
                            : isArena
                              ? <span>🏆 Arena tournament{a.arenaTournamentCode ? <> · code <strong>{a.arenaTournamentCode}</strong></> : null}</span>
                              : <span>Your progress: <strong>{cur}/{tot}{isPgn ? ' found' : ''}</strong></span>}
                        <span>Students done: <strong>{a.completedStudents}/{a.totalStudents}</strong></span>
                      </div>
                      {!isTest && !isRush && !isArena && <div className="mcp-assign-bar" style={{ marginTop: 8 }}><div style={{ width: `${pct}%` }} /></div>}
                      {canStart && (
                        <button className="mcp-assign-btn" style={{ marginTop: 12 }} onClick={() => setTab('assignments')}>
                          {a.assignmentType === 'custom'
                            ? (a.status === 'in_progress' ? 'Continue finding →' : 'Find the blunders →')
                            : isTest
                              ? (a.status === 'in_progress' ? 'Continue test →' : 'Take the test →')
                              : isRush
                                ? (a.status === 'in_progress' ? 'Race again →' : 'Start race →')
                                : isArena
                                  ? 'Join tournament →'
                                  : (a.status === 'in_progress' ? 'Continue assignment →' : 'Do assignment →')}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          <div className="mcp-stat-row">
            <div className="mcp-stat">
              <span className="mcp-stat-num">
                ✅ {attendance.stats ? attendance.stats.present + attendance.stats.catchUp : 0}
              </span>
              <span className="mcp-stat-label">Classes attended ({MONTHS[cursor.getMonth()]})</span>
            </div>
            <div className="mcp-stat">
              <span className="mcp-stat-num">💰 {payments.length}</span>
              <span className="mcp-stat-label">Payment records</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Attendance ── */}
      {tab === 'attendance' && (
        <div className="mcp-section">
          <div className="mcp-month-nav">
            <button className="mcp-nav-btn" onClick={() => shiftMonth(-1)}>← Prev</button>
            <span className="mcp-month-label">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</span>
            <button className="mcp-nav-btn" onClick={() => shiftMonth(1)}>Next →</button>
          </div>

          <div className="mcp-table-wrap">
            <table className="mcp-table">
              <thead>
                <tr><th>Date</th><th>Coach</th><th>Class</th><th>Status</th><th>Marked</th></tr>
              </thead>
              <tbody>
                {attendance.records.map((r, i) => (
                  <tr key={r._id || i}>
                    <td>{fmtDate(r.date)}</td>
                    <td>{r.coachName}</td>
                    <td>Class {r.slot || 1}</td>
                    <td><span className={statusClass(r.status)}>{r.status}</span></td>
                    <td className="mcp-muted">{fmtEntryTime(r)}</td>
                  </tr>
                ))}
                {attendance.records.length === 0 && (
                  <tr><td colSpan="5" className="mcp-empty-row">No attendance recorded for this month</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Payments ── */}
      {tab === 'payments' && (
        <div className="mcp-section">
          {/* Class Payment request form */}
          {coaches.map(c => (
            <div key={c.linkId} className="mcp-coach-card" style={{ display: 'block', marginBottom: 18 }}>
              <div style={{ fontWeight: 700, color: 'var(--color-text)', marginBottom: 10 }}>💰 Class Payment — {c.coachName}</div>
              {payNotice && <div className="mcp-ok" style={{ color: 'var(--color-success)', marginBottom: 8 }}>✓ {payNotice}</div>}
              {payError && <div className="mcp-error" style={{ marginBottom: 8 }}>{payError}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                <label className="mcp-pay-field">
                  <span>Student name</span>
                  <input type="text" value={c.studentName || ''} readOnly style={{ opacity: 0.7 }} />
                </label>
                <label className="mcp-pay-field">
                  <span>Paid date</span>
                  <input type="date" value={payForm.paidDate} onChange={e => setPayForm(f => ({ ...f, paidDate: e.target.value }))} />
                </label>
                <label className="mcp-pay-field">
                  <span>Payment from</span>
                  <input type="date" value={payForm.fromDate} onChange={e => setPayForm(f => ({ ...f, fromDate: e.target.value }))} />
                </label>
                <label className="mcp-pay-field">
                  <span>Payment till</span>
                  <input type="date" value={payForm.untilDate} onChange={e => setPayForm(f => ({ ...f, untilDate: e.target.value }))} />
                </label>
                <label className="mcp-pay-field">
                  <span>Amount ({curSym(c.currency)})</span>
                  <input type="number" min="1" value={payForm.amount} placeholder={String(c.fees || '')} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
                </label>
              </div>
              <button
                className="mcp-tab mcp-tab-active"
                style={{ marginTop: 12, cursor: paySubmitting ? 'wait' : 'pointer' }}
                disabled={paySubmitting}
                onClick={() => submitFees(c)}
              >
                {paySubmitting ? 'Submitting…' : 'Submit my fees'}
              </button>
            </div>
          ))}

          <div className="mcp-table-wrap">
            <table className="mcp-table">
              <thead>
                <tr><th>Period</th><th>Coach</th><th>Amount</th><th>Paid On</th></tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={p._id || i}>
                    <td>{fmtDate(p.fromDate)} – {fmtDate(p.untilDate)}</td>
                    <td>{p.coachName}</td>
                    <td>{curSym(p.currency)}{p.amount}</td>
                    <td>{fmtDate(p.datePaid)}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr><td colSpan="4" className="mcp-empty-row">No payment records yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
