import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';
import StudentAssignments from '../components/StudentAssignments';
import CoachChat from '../components/coach/CoachChat';
import { soonestClass, localDayLabel, localTimeLabel, DAY_NAMES } from '../utils/istSchedule';
import './UserDashboard.css'; // Import the dashboard CSS for consistent styling
import './MyCoachPortal.css'; // reuse the Player-card (mcp-*) styles

const curSym = (c) => (c === 'USD' ? '$' : c === 'EUR' ? '€' : '₹');
const fmtEnrollDate = (s) => s ? new Date(s).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const styles = {
  page: {
    padding: '24px',
    fontFamily: 'Inter, Arial, sans-serif',
    background: 'var(--color-bg)',
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
    color: 'var(--color-text)'
  },
  pageBackground: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at 20% 50%, var(--color-success-a12) 0%, transparent 50%), radial-gradient(circle at 80% 80%, var(--color-accent-2-a15) 0%, transparent 50%)',
    pointerEvents: 'none',
    zIndex: 0
  },
  header: {
    marginBottom: '40px',
    textAlign: 'left',
    position: 'relative',
    zIndex: 1
  },
  title: {
    color: 'var(--color-text)',
    fontSize: '34px',
    fontWeight: '700',
    marginBottom: '8px',
    background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-success) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  subtitle: {
    color: 'var(--color-text-muted)',
    fontSize: '18px',
    fontStyle: 'italic'
  },
  section: {
    background: 'var(--color-surface)',
    borderRadius: '20px',
    padding: '28px',
    marginBottom: '24px',
    boxShadow: '0 8px 32px var(--color-black-a50)',
    border: '1px solid var(--color-white-a04)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    position: 'relative',
    zIndex: 1
  },
  sectionTitle: {
    color: 'var(--color-text)',
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '20px'
  },
  statCard: {
    background: 'var(--color-black-a35)',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid var(--color-white-a04)',
    textAlign: 'center',
    transition: 'all 0.2s ease',
    cursor: 'default'
  },
  statCardHover: {
    borderColor: 'var(--color-accent-a20)'
  },
  statNumber: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: 'var(--color-accent)',
    display: 'block',
    marginBottom: '4px'
  },
  statLabel: {
    color: 'var(--color-text-muted)',
    fontSize: '12px',
    fontWeight: '500'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '16px',
    fontSize: '14px'
  },
  tableHeader: {
    background: 'var(--color-black-a35)',
    borderBottom: '1px solid var(--color-white-a10)'
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    fontWeight: '600',
    color: 'var(--color-accent)',
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  td: {
    padding: '16px',
    borderBottom: '1px solid var(--color-white-a04)',
    verticalAlign: 'middle',
    color: 'var(--color-text)'
  },
  button: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  primaryBtn: {
    background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-success) 100%)',
    color: 'var(--color-text)',
    boxShadow: '0 4px 16px var(--color-accent-a40)'
  },
  primaryBtnHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 24px var(--color-accent-a40)'
  },
  secondaryBtn: {
    background: 'var(--color-accent-a15)',
    color: 'var(--color-accent)',
    border: '1px solid var(--color-accent-a30)'
  },
  secondaryBtnHover: {
    background: 'var(--color-accent-a20)',
    transform: 'translateY(-2px)'
  },
  input: {
    padding: '12px 16px',
    background: 'var(--color-black-a35)',
    border: '1px solid var(--color-white-a10)',
    borderRadius: '12px',
    fontSize: '14px',
    color: 'var(--color-text)',
    transition: 'all 0.3s ease'
  },
  inputFocus: {
    outline: 'none',
    borderColor: 'var(--color-accent)',
    boxShadow: '0 0 0 2px var(--color-accent-a20)'
  },
  select: {
    padding: '12px 16px',
    background: 'var(--color-black-a35)',
    border: '1px solid var(--color-white-a10)',
    borderRadius: '12px',
    fontSize: '14px',
    color: 'var(--color-text)'
  },
  formGroup: {
    marginBottom: '20px'
  },
  formLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--color-accent)',
    marginBottom: '8px'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'var(--color-black-a65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(5px)',
    WebkitBackdropFilter: 'blur(5px)'
  },
  modalContent: {
    background: 'var(--color-surface)',
    padding: '32px',
    borderRadius: '20px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '80vh',
    overflow: 'auto',
    border: '1px solid var(--color-white-a10)',
    boxShadow: '0 20px 60px var(--color-black-a50)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: 'var(--color-text)',
    background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-success) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
    transition: 'all 0.3s ease',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px'
  },
  closeBtnHover: {
    background: 'var(--color-danger-a20)',
    color: 'var(--color-danger)',
    transform: 'rotate(90deg)'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px'
  },
  card: {
    background: 'var(--color-surface)',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid var(--color-white-a04)',
    boxShadow: '0 4px 16px var(--color-black-a35)',
    cursor: 'pointer',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden'
  },
  cardHover: {
    transform: 'translateY(-8px) scale(1.02)',
    boxShadow: '0 12px 40px var(--color-accent-a30)',
    borderColor: 'var(--color-accent-a20)'
  },
  badge: {
    padding: '6px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px'
  },
  presentBadge: {
    background: 'var(--color-success-a20)',
    color: 'var(--color-success)',
    border: '1px solid var(--color-success-a30)'
  },
  absentBadge: {
    background: 'var(--color-danger-a20)',
    color: 'var(--color-danger)',
    border: '1px solid var(--color-danger-a30)'
  },
  catchupBadge: {
    background: 'var(--color-warning-a20)',
    color: 'var(--color-warning)',
    border: '1px solid var(--color-warning-a30)'
  },
  paidBadge: {
    background: 'var(--color-accent-2-a15)',
    color: 'var(--color-accent-2)',
    border: '1px solid var(--color-accent-2-a30)'
  },
  unpaidBadge: {
    background: 'var(--color-danger-a20)',
    color: 'var(--color-danger)',
    border: '1px solid var(--color-danger-a30)'
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid var(--color-white-a10)',
    marginBottom: '32px',
    gap: '4px'
  },
  tab: {
    padding: '16px 32px',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'all 0.3s ease',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    fontSize: '15px',
    position: 'relative'
  },
  activeTab: {
    color: 'var(--color-text)',
    borderBottom: '2px solid var(--color-accent)'
  },
  tabContent: {
    padding: '24px 0',
    animation: 'slideInUp 0.6s ease-out'
  },
  monthNav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  monthTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: 'var(--color-text)',
    background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-success) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  navBtn: {
    padding: '12px 20px',
    background: 'var(--color-accent-a15)',
    border: '1px solid var(--color-accent-a30)',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--color-accent)',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  navBtnHover: {
    background: 'var(--color-accent-a20)',
    transform: 'translateY(-2px)'
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px'
  },
  loadingText: {
    color: 'var(--color-text-muted)',
    fontSize: '16px',
    textAlign: 'center'
  }
};

const UserAttendancePage = () => {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  // Unread coach messages — badged on the Messages tab. Admin-added students
  // live on this page (My Coach hides admin coaches), so without this tab they
  // had no way to read or reply to anything their coach sent them.
  const [msgUnread, setMsgUnread] = useState(0);
  // Weekly class slots + academy-closed holidays. Same source as My Coach
  // (/api/coach-schedule/my) — it already includes admin coaches, this page just
  // never asked for it. Times are stored UTC; utils/istSchedule renders them in
  // the viewer's own timezone.
  const [classes, setClasses] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentCurrency, setPaymentCurrency] = useState('INR');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminCoaches, setAdminCoaches] = useState([]); // admin enrollment info for the Player tab
  const [adminAssignments, setAdminAssignments] = useState([]); // admin assignments (for Overview stats)
  const [paymentFormData, setPaymentFormData] = useState({
    kidName: '',
    paidDate: '',
    fromDate: '',
    toDate: '',
    feesAmount: ''
  });

  const [hoverStates, setHoverStates] = useState({
    statCards: [false, false],
    navButtons: { prev: false, next: false },
    closeBtn: false,
    paymentBtn: false
  });

  useEffect(() => {
    // Reset state when component mounts or location changes
    setUser(null);
    setAttendanceData([]);
    setPaymentHistory([]);
    setPaymentCurrency('INR');
    setActiveTab('overview');
    setLoading(true);
  }, [location.pathname]);

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

  // Opening the Messages tab marks threads read → clear the badge.
  useEffect(() => {
    if (activeTab === 'messages') setMsgUnread(0);
  }, [activeTab]);

  // Class schedule + holidays across this student's coaches (admin included).
  useEffect(() => {
    let alive = true;
    api.get('/api/coach-schedule/my')
      .then(r => {
        if (!alive) return;
        setClasses(r.data?.classes || []);
        setHolidays(r.data?.holidays || []);
      })
      .catch(() => { if (alive) { setClasses([]); setHolidays([]); } });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    // Load user data on component mount
    const loadUserAndData = async () => {
      setLoading(true);
      try {
        // First load user data
        const res = await api.get('/api/auth/me');
        setUser(res.data.user);
        
        // Then load attendance and payment data
        await Promise.all([
          fetchAttendanceData(),
          fetchPaymentHistory(),
          // Admin coach enrollment info for the Player tab (admin coach only).
          api.get('/api/coach-attendance/my/coaches')
            .then(r => setAdminCoaches((r.data || []).filter(c => c.isAdmin)))
            .catch(() => setAdminCoaches([])),
          // Admin assignments for the Overview stats (finished/pending/accuracy).
          api.get('/api/coach/my-assignments')
            .then(r => setAdminAssignments((r.data?.assignments || []).filter(a => a.coachIsAdmin)))
            .catch(() => setAdminAssignments([])),
        ]);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserAndData();
  }, []); // Only run on mount

  useEffect(() => {
    if (user) {
      fetchAttendanceData();
    }
  }, [currentMonth]);

  const fetchUserData = async () => {
    try {
      const res = await api.get('/api/auth/me');
      setUser(res.data.user);
    } catch (err) {
      setUser(null);
    }
  };

  const fetchAttendanceData = async () => {
    try {
      const res = await api.get(`/api/user/attendance?month=${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`);
      setAttendanceData(res.data);
    } catch (err) {
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const res = await api.get('/api/user/payments');
      setPaymentHistory(res.data.payments || res.data);
      if (res.data.currency) setPaymentCurrency(res.data.currency);
    } catch (err) {
    }
  };

  const handlePaymentSubmit = async () => {
    try {
      await api.post('/api/user/payment-request', paymentFormData);
      setShowPaymentForm(false);
      setPaymentFormData({
        kidName: user?.username || '',
        paidDate: '',
        fromDate: '',
        toDate: '',
        feesAmount: ''
      });
      alert('Payment request submitted successfully! Admin will review it.');
    } catch (err) {
      alert('Failed to submit payment request');
    }
  };

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const formatIST = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeIST = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // utility to compute UTC boundaries for a given currentMonth
  const getMonthRange = (date) => {
    const y = date.getFullYear();
    const m = date.getMonth();
    return {
      start: new Date(Date.UTC(y, m, 1)),
      end: new Date(Date.UTC(y, m + 1, 1))
    };
  };

  // determine whether any payment record covers the selected month
  const isMonthPaid = (payments) => {
    const { start, end } = getMonthRange(currentMonth);
    return payments.some(p => {
      if (p.fromDate && p.untilDate) {
        const from = new Date(p.fromDate);
        const until = new Date(p.untilDate);
        return from <= end && until >= start;
      }
      // fallback to datePaid only if no range exists
      const paid = new Date(p.datePaid);
      return paid >= start && paid < end;
    });
  };

  // Soonest upcoming class, skipping any that lands on a holiday (mirrors the
  // My Coach logic). Bounded so a fully-holiday schedule can't loop forever.
  const holidaySet = new Set(holidays.map(h => h.date));
  const nextClass = () => {
    const pad = (n) => String(n).padStart(2, '0');
    let from = Date.now();
    for (let guard = 0; guard < 60; guard++) {
      const s = soonestClass(classes, from);
      if (!s) return null;
      const iso = `${s.when.getFullYear()}-${pad(s.when.getMonth() + 1)}-${pad(s.when.getDate())}`;
      if (!holidaySet.has(iso)) return s;
      from = s.when.getTime() + 2 * 60000; // skip this occurrence, look further
    }
    return null;
  };

  // Schedule tab — weekly class times and academy-closed days, in the student's
  // own timezone (slots are stored as UTC weekday + HH:MM).
  const renderScheduleTab = () => {
    const next = nextClass();
    const todayIso = new Date().toISOString().slice(0, 10);
    const upcomingHolidays = holidays.filter(h => h.date >= todayIso).slice(0, 8);

    if (classes.length === 0 && holidays.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>📅</div>
          <h3 style={{ color: 'var(--color-text)', margin: '0 0 6px' }}>No classes scheduled yet</h3>
          <p style={{ margin: 0 }}>When your coach sets your class days and times, they'll show up here.</p>
        </div>
      );
    }

    return (
      <div>
        {next && (
          <div style={{
            background: 'var(--color-accent-a12)', border: '1px solid var(--color-accent-a30)',
            borderRadius: 12, padding: '14px 18px', marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 14, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ color: 'var(--color-accent)', fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>⏰ NEXT CLASS</div>
              <div style={{ color: 'var(--color-text)', fontSize: 16, fontWeight: 600, marginTop: 3 }}>
                {next.when.toLocaleString([], { weekday: 'long', hour: 'numeric', minute: '2-digit' })}
                {' — '}{next.item.title} · {next.item.coachName}
              </div>
            </div>
            {next.item.meetingLink && (
              <a href={next.item.meetingLink} target="_blank" rel="noopener noreferrer"
                 style={{ padding: '8px 18px', borderRadius: 8, background: 'var(--color-accent)',
                          color: 'var(--color-bg)', fontWeight: 700, textDecoration: 'none' }}>
                Join
              </a>
            )}
          </div>
        )}

        {classes.length > 0 && (
          <>
            <h3 style={{ color: 'var(--color-text)', margin: '0 0 12px' }}>Weekly classes</h3>
            <div style={{ display: 'grid', gap: 12, marginBottom: 26 }}>
              {classes.map(c => (
                <div key={c._id} style={{
                  background: 'var(--color-white-a04)', border: '1px solid var(--color-white-a07)',
                  borderRadius: 10, padding: '14px 16px',
                }}>
                  <div style={{ color: 'var(--color-text)', fontWeight: 600 }}>{c.title}</div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>{c.coachName}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '10px 0 6px' }}>
                    {(c.days || []).map(d => (
                      <span key={d} style={{
                        padding: '3px 9px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                        background: 'var(--color-accent-a15)', color: 'var(--color-accent)',
                      }}>{localDayLabel(d, c.timeUTC) || DAY_NAMES[d]}</span>
                    ))}
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                    🕐 {(c.days || []).length > 0 ? localTimeLabel(c.days[0], c.timeUTC) : ''}
                    {c.durationMinutes ? ` · ${c.durationMinutes} min` : ''}
                  </div>
                  {c.meetingLink && (
                    <a href={c.meetingLink} target="_blank" rel="noopener noreferrer"
                       style={{ color: 'var(--color-accent)', fontSize: 13, marginTop: 8, display: 'inline-block' }}>
                      Join link ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {upcomingHolidays.length > 0 && (
          <>
            <h3 style={{ color: 'var(--color-text)', margin: '0 0 12px' }}>Upcoming holidays</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {upcomingHolidays.map(h => (
                <div key={h.date} style={{
                  background: 'var(--color-danger-a12)', border: '1px solid var(--color-danger-a20)',
                  borderRadius: 8, padding: '10px 14px',
                  display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
                }}>
                  <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>{fmtEnrollDate(h.date)}</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{h.labels.join(' · ')}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  // Player tab — the student's enrollment profile with the admin (their "class").
  // Reuses the My Coach player-card layout (mcp-* classes).
  const renderPlayerTab = () => (
    <div>
      {adminCoaches.length === 0 ? (
        <div style={{ ...styles.section, textAlign: 'center', color: palette.muted }}>
          No enrollment details yet.
        </div>
      ) : (
        adminCoaches.map(c => (
          <div key={c.linkId} className="mcp-player-card">
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
                <span className="mcp-player-row-val">{fmtEnrollDate(c.enrollmentDate)}</span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // Assignment stats for the Overview (finished this month / pending / accuracy).
  const inThisMonth = (d) => {
    if (!d) return false;
    const dt = new Date(d);
    return dt.getMonth() === currentMonth.getMonth() && dt.getFullYear() === currentMonth.getFullYear();
  };
  const finishedAssignments = adminAssignments.filter(a => a.status === 'completed' && inThisMonth(a.completedAt)).length;
  const pendingAssignments = adminAssignments.filter(a => a.status !== 'completed').length;
  const withAcc = adminAssignments.filter(a => (a.accuracy || 0) > 0);
  const avgAccuracy = withAcc.length ? Math.round(withAcc.reduce((s, a) => s + (a.accuracy || 0), 0) / withAcc.length) : 0;

  const renderOverviewTab = () => (
    <div>
      {/* Next class hint, from the coach's schedule (mirrors My Coach). */}
      {(() => {
        const next = nextClass();
        if (!next) return null;
        return (
          <div style={{
            background: 'var(--color-accent-a12)', border: '1px solid var(--color-accent-a30)',
            borderRadius: 12, padding: '14px 18px', marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 14, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ color: 'var(--color-accent)', fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>⏰ NEXT CLASS</div>
              <div style={{ color: 'var(--color-text)', fontSize: 16, fontWeight: 600, marginTop: 3 }}>
                {next.when.toLocaleString([], { weekday: 'long', hour: 'numeric', minute: '2-digit' })}
                {' — '}{next.item.title} · {next.item.coachName}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {next.item.meetingLink && (
                <a href={next.item.meetingLink} target="_blank" rel="noopener noreferrer"
                   style={{ padding: '8px 18px', borderRadius: 8, background: 'var(--color-accent)',
                            color: 'var(--color-bg)', fontWeight: 700, textDecoration: 'none' }}>
                  Join
                </a>
              )}
              <button onClick={() => setActiveTab('schedule')}
                style={{ padding: '8px 18px', borderRadius: 8, cursor: 'pointer',
                         background: 'transparent', border: '1px solid var(--color-accent-a40)',
                         color: 'var(--color-accent)', fontWeight: 600 }}>
                Full schedule
              </button>
            </div>
          </div>
        );
      })()}

      <div style={styles.statsGrid}>
        {[
          {
            number: attendanceData.filter(a => a.status === 'Present' || a.status === 'Catch-up').length,
            label: 'Classes Attended This Month',
            icon: '✅'
          },
          {
            number: paymentHistory.length === 0 ? 'No Payments' : (isMonthPaid(paymentHistory) ? 'Paid' : 'Pending'),
            label: 'Payment Status',
            icon: '💰'
          },
          {
            number: finishedAssignments,
            label: `Assignments Finished (${currentMonth.toLocaleDateString('en-US', { month: 'long' })})`,
            icon: '📋'
          },
          {
            number: pendingAssignments,
            label: 'Pending Assignments',
            icon: '⏳'
          },
          {
            number: `${avgAccuracy}%`,
            label: 'Accuracy',
            icon: '🎯'
          }
        ].map((stat, idx) => (
          <div
            key={idx}
            style={{
              ...styles.statCard,
              ...(hoverStates.statCards[idx] ? styles.statCardHover : {})
            }}
            onMouseEnter={() => setHoverStates(prev => ({ ...prev, statCards: { ...prev.statCards, [idx]: true } }))}
            onMouseLeave={() => setHoverStates(prev => ({ ...prev, statCards: { ...prev.statCards, [idx]: false } }))}
          >
            <span style={styles.statNumber}>{stat.icon} {stat.number}</span>
            <span style={styles.statLabel}>{stat.label}</span>
          </div>
        ))}
      </div>

      {/* New / current assignments — same card model as My Coach (mcp-*). Opens the
          Assignments tab to launch. */}
      {(() => {
        const rank = (s) => (s === 'pending' ? 0 : s === 'in_progress' ? 1 : 2);
        const top = adminAssignments
          .filter(a => a.status !== 'completed')
          .sort((a, b) => rank(a.status) - rank(b.status))
          .slice(0, 3);
        if (top.length === 0) return null;
        return (
          <div style={{ marginTop: 4, marginBottom: 20 }}>
            {top.map(a => {
              const isNew = a.status === 'pending';
              const isPgn = a.assignmentType === 'custom' && a.pgnTask;
              const isTest = a.assignmentType === 'study_chapter';
              const isRush = a.assignmentType === 'puzzle_rush';
              const isArena = a.assignmentType === 'arena_tournament';
              const cur = isPgn ? (a.foundCount || 0) : (a.progress || 0);
              const tot = isPgn ? (a.pgnTask.findTarget || 0) : (a.targetCount || 0);
              const pct = tot > 0 ? Math.min(100, Math.round((cur / tot) * 100)) : 0;
              return (
                <div key={a._id} className={`mcp-current-assign ${isNew ? 'mcp-assign-new' : ''}`}>
                  <div className="mcp-current-assign-label">
                    {isNew ? '🆕 New assignment' : '📋 Current assignment'}
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
                    {a.totalStudents > 0 && <span>Students done: <strong>{a.completedStudents}/{a.totalStudents}</strong></span>}
                  </div>
                  {!isTest && !isRush && !isArena && <div className="mcp-assign-bar" style={{ marginTop: 8 }}><div style={{ width: `${pct}%` }} /></div>}
                  <div style={{ marginTop: 10, fontSize: '13px', color: 'var(--color-text-muted)' }}>
                    Open the <strong style={{ color: '#e7eaf0' }}>Assignments</strong> tab to do this.
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );

  const renderAttendanceTab = () => (
    <div>
      <div style={styles.monthNav}>
        <button
          style={{
            ...styles.navBtn,
            ...(hoverStates.navButtons.prev ? styles.navBtnHover : {})
          }}
          onClick={() => navigateMonth(-1)}
          onMouseEnter={() => setHoverStates(prev => ({ ...prev, navButtons: { ...prev.navButtons, prev: true } }))}
          onMouseLeave={() => setHoverStates(prev => ({ ...prev, navButtons: { ...prev.navButtons, prev: false } }))}
        >
          ← Previous Month
        </button>
        <h2 style={styles.monthTitle}>
          {currentMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
        </h2>
        <button
          style={{
            ...styles.navBtn,
            ...(hoverStates.navButtons.next ? styles.navBtnHover : {})
          }}
          onClick={() => navigateMonth(1)}
          onMouseEnter={() => setHoverStates(prev => ({ ...prev, navButtons: { ...prev.navButtons, next: true } }))}
          onMouseLeave={() => setHoverStates(prev => ({ ...prev, navButtons: { ...prev.navButtons, next: false } }))}
        >
          Next Month →
        </button>
      </div>

      <div style={{overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--color-white-a04)'}}>
        <table style={styles.table}>
          <thead style={styles.tableHeader}>
            <tr>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Time (IST)</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {attendanceData.map((record, idx) => (
              <tr key={idx} style={{backgroundColor: idx % 2 === 0 ? 'var(--color-black-a20)' : 'transparent'}}>
                <td style={styles.td}>
                  {new Date(record.date).toLocaleDateString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </td>
                <td style={styles.td}>
                  {/* joinedAt = when the student actually walked into the live class.
                      createdAt is only when the row was written, which is the
                      same thing for a live class but NOT when a coach marks the
                      register hours later. Prefer the real join time. */}
                  {record.joinedAt ? formatTimeIST(record.joinedAt)
                    : record.createdAt ? formatTimeIST(record.createdAt) : 'N/A'}
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.badge,
                    ...(record.status === 'Present' ? styles.presentBadge :
                       record.status === 'Absent' ? styles.absentBadge :
                       styles.catchupBadge)
                  }}>
                    {record.status}
                  </span>
                </td>
              </tr>
            ))}
            {attendanceData.length === 0 && (
              <tr>
                <td colSpan="3" style={{...styles.td, textAlign: 'center', color: 'var(--color-text-muted)', padding: '40px'}}>
                  No attendance records for this month
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPaymentsTab = () => (
    <div>
      <div style={{marginBottom: '24px'}}>
        <button
          style={{
            ...styles.button,
            ...styles.primaryBtn,
            ...(hoverStates.paymentBtn ? styles.primaryBtnHover : {})
          }}
          onClick={() => {
            setPaymentFormData(prev => ({ ...prev, kidName: user?.username || '' }));
            setShowPaymentForm(true);
          }}
          onMouseEnter={() => setHoverStates(prev => ({ ...prev, paymentBtn: true }))}
          onMouseLeave={() => setHoverStates(prev => ({ ...prev, paymentBtn: false }))}
        >
          ➕ Submit Payment Request
        </button>
      </div>

      <div style={{overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--color-white-a04)'}}>
        <table style={styles.table}>
          <thead style={styles.tableHeader}>
            <tr>
              <th style={styles.th}>Period (From - To)</th>
              <th style={styles.th}>Fees</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Submitted Date</th>
            </tr>
          </thead>
          <tbody>
            {paymentHistory.map((payment, idx) => (
              <tr key={idx} style={{backgroundColor: idx % 2 === 0 ? 'var(--color-black-a20)' : 'transparent'}}>
                <td style={styles.td}>
                  {payment.fromDate ? new Date(payment.fromDate).toLocaleDateString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  }) : 'N/A'} - {payment.untilDate ? new Date(payment.untilDate).toLocaleDateString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  }) : 'N/A'}
                </td>
                <td style={styles.td}>
                  {paymentCurrency === 'INR' ? '₹' : '$'}{payment.amount}
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.badge,
                    ...(payment.status === 'Paid' ? styles.paidBadge : styles.unpaidBadge)
                  }}>
                    {payment.status}
                  </span>
                </td>
                <td style={styles.td}>
                  {new Date(payment.createdAt).toLocaleDateString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </td>
              </tr>
            ))}
            {paymentHistory.length === 0 && (
              <tr>
                <td colSpan="4" style={{...styles.td, textAlign: 'center', color: 'var(--color-text-muted)', padding: '40px'}}>
                  No payment records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading || !user) {
    return (
      <div style={styles.page}>
        <div style={styles.pageBackground} />
        <div style={styles.loadingContainer}>
          <div style={styles.loadingText}>
            {loading ? 'Loading attendance data...' : 'Loading user data...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.pageBackground} />
      <div style={styles.header}>
        <h1 style={styles.title}>📚 Student Portal</h1>
        <p style={styles.subtitle}>Track your attendance, manage payments, and monitor your academic progress</p>
      </div>

      <div style={styles.tabs}>
        <div
          style={{...styles.tab, ...(activeTab === 'overview' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </div>
        <div
          style={{...styles.tab, ...(activeTab === 'assignments' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('assignments')}
        >
          📋 Assignments
        </div>
        <div
          style={{...styles.tab, ...(activeTab === 'schedule' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('schedule')}
        >
          📅 Schedule
        </div>
        <div
          style={{...styles.tab, ...(activeTab === 'messages' ? styles.activeTab : {}), position: 'relative'}}
          onClick={() => setActiveTab('messages')}
        >
          💬 Messages
          {msgUnread > 0 && (
            <span style={{
              marginLeft: 6, minWidth: 18, height: 18, padding: '0 5px',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, lineHeight: 1,
              color: 'var(--color-text)', background: 'var(--color-danger)', borderRadius: 999,
            }}>{msgUnread > 99 ? '99+' : msgUnread}</span>
          )}
        </div>
        <div
          style={{...styles.tab, ...(activeTab === 'player' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('player')}
        >
          👤 Player
        </div>
        <div
          style={{...styles.tab, ...(activeTab === 'attendance' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('attendance')}
        >
          📝 Attendance
        </div>
        <div
          style={{...styles.tab, ...(activeTab === 'payments' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('payments')}
        >
          💰 Payments
        </div>
      </div>

      <div style={styles.tabContent}>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'assignments' && <StudentAssignments only="admin" />}
        {activeTab === 'schedule' && renderScheduleTab()}
        {/* Read + reply only — mode="student" hides all thread-creation controls. */}
        {activeTab === 'messages' && <CoachChat mode="student" />}
        {activeTab === 'player' && renderPlayerTab()}
        {activeTab === 'attendance' && renderAttendanceTab()}
        {activeTab === 'payments' && renderPaymentsTab()}
      </div>

      {/* Payment Request Form Modal */}
      {showPaymentForm && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Submit Payment Request</h3>
              <button
                style={{
                  ...styles.closeBtn,
                  ...(hoverStates.closeBtn ? styles.closeBtnHover : {})
                }}
                onClick={() => setShowPaymentForm(false)}
                onMouseEnter={() => setHoverStates(prev => ({ ...prev, closeBtn: true }))}
                onMouseLeave={() => setHoverStates(prev => ({ ...prev, closeBtn: false }))}
              >
                ×
              </button>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Kid Name</label>
              <input
                type="text"
                value={paymentFormData.kidName}
                readOnly
                style={{ ...styles.input, cursor: 'default', opacity: 0.8 }}
                onFocus={(e) => e.target.style.outline = 'none'}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Paid Date</label>
              <input
                type="date"
                value={paymentFormData.paidDate}
                onChange={(e) => setPaymentFormData({...paymentFormData, paidDate: e.target.value})}
                style={styles.input}
              />
            </div>
            <div style={{display: 'flex', gap: '16px'}}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>From Date</label>
                <input
                  type="date"
                  value={paymentFormData.fromDate}
                  onChange={(e) => setPaymentFormData({...paymentFormData, fromDate: e.target.value})}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>To Date</label>
                <input
                  type="date"
                  value={paymentFormData.toDate}
                  onChange={(e) => setPaymentFormData({...paymentFormData, toDate: e.target.value})}
                  style={styles.input}
                />
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Fees ({paymentCurrency === 'INR' ? '₹' : '$'})
              </label>
              <input
                type="number"
                placeholder="Enter amount"
                value={paymentFormData.feesAmount}
                onChange={(e) => setPaymentFormData({...paymentFormData, feesAmount: e.target.value})}
                style={styles.input}
              />
            </div>
            <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end'}}>
              <button
                style={styles.secondaryBtn}
                onClick={() => setShowPaymentForm(false)}
              >
                Cancel
              </button>
              <button
                style={styles.primaryBtn}
                onClick={handlePaymentSubmit}
              >
                Submit Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAttendancePage;
