import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';
import './UserDashboard.css'; // Import the dashboard CSS for consistent styling

const styles = {
  page: {
    padding: '24px',
    fontFamily: 'Inter, Arial, sans-serif',
    background: '#0a0a0a',
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
    color: '#ffffff'
  },
  pageBackground: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
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
    color: '#ffffff',
    fontSize: '34px',
    fontWeight: '700',
    marginBottom: '8px',
    background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: '18px',
    fontStyle: 'italic'
  },
  section: {
    background: 'rgba(23, 23, 23, 0.7)',
    borderRadius: '20px',
    padding: '28px',
    marginBottom: '24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    position: 'relative',
    zIndex: 1
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    background: 'rgba(0, 0, 0, 0.3)',
    padding: '24px',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    textAlign: 'center',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  },
  statCardHover: {
    transform: 'translateY(-4px)',
    borderColor: 'rgba(6, 182, 212, 0.2)',
    boxShadow: '0 8px 32px rgba(6, 182, 212, 0.3)'
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#06b6d4',
    display: 'block',
    marginBottom: '8px'
  },
  statLabel: {
    color: '#9ca3af',
    fontSize: '14px',
    fontWeight: '500'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '16px',
    fontSize: '14px'
  },
  tableHeader: {
    background: 'rgba(0, 0, 0, 0.4)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#67e8f9',
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  td: {
    padding: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    verticalAlign: 'middle',
    color: '#ffffff'
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
    background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
    color: '#ffffff',
    boxShadow: '0 4px 16px rgba(6, 182, 212, 0.4)'
  },
  primaryBtnHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 24px rgba(6, 182, 212, 0.5)'
  },
  secondaryBtn: {
    background: 'rgba(6, 182, 212, 0.15)',
    color: '#06b6d4',
    border: '1px solid rgba(6, 182, 212, 0.3)'
  },
  secondaryBtnHover: {
    background: 'rgba(6, 182, 212, 0.25)',
    transform: 'translateY(-2px)'
  },
  input: {
    padding: '12px 16px',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    fontSize: '14px',
    color: '#ffffff',
    transition: 'all 0.3s ease'
  },
  inputFocus: {
    outline: 'none',
    borderColor: '#06b6d4',
    boxShadow: '0 0 0 2px rgba(6, 182, 212, 0.2)'
  },
  select: {
    padding: '12px 16px',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    fontSize: '14px',
    color: '#ffffff'
  },
  formGroup: {
    marginBottom: '20px'
  },
  formLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#67e8f9',
    marginBottom: '8px'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(5px)',
    WebkitBackdropFilter: 'blur(5px)'
  },
  modalContent: {
    background: 'rgba(23, 23, 23, 0.9)',
    padding: '32px',
    borderRadius: '20px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '80vh',
    overflow: 'auto',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
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
    color: '#ffffff',
    background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#9ca3af',
    transition: 'all 0.3s ease',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px'
  },
  closeBtnHover: {
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    transform: 'rotate(90deg)'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px'
  },
  card: {
    background: 'rgba(23, 23, 23, 0.7)',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
    cursor: 'pointer',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden'
  },
  cardHover: {
    transform: 'translateY(-8px) scale(1.02)',
    boxShadow: '0 12px 40px rgba(6, 182, 212, 0.3)',
    borderColor: 'rgba(6, 182, 212, 0.2)'
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
    background: 'rgba(16, 185, 129, 0.2)',
    color: '#10b981',
    border: '1px solid rgba(16, 185, 129, 0.3)'
  },
  absentBadge: {
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.3)'
  },
  catchupBadge: {
    background: 'rgba(245, 158, 11, 0.2)',
    color: '#f59e0b',
    border: '1px solid rgba(245, 158, 11, 0.3)'
  },
  paidBadge: {
    background: 'rgba(59, 130, 246, 0.2)',
    color: '#3b82f6',
    border: '1px solid rgba(59, 130, 246, 0.3)'
  },
  unpaidBadge: {
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.3)'
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    marginBottom: '32px',
    gap: '4px'
  },
  tab: {
    padding: '16px 32px',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'all 0.3s ease',
    fontWeight: '600',
    color: '#9ca3af',
    fontSize: '15px',
    position: 'relative'
  },
  activeTab: {
    color: '#ffffff',
    borderBottom: '2px solid #06b6d4'
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
    color: '#ffffff',
    background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  navBtn: {
    padding: '12px 20px',
    background: 'rgba(6, 182, 212, 0.15)',
    border: '1px solid rgba(6, 182, 212, 0.3)',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#06b6d4',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  navBtnHover: {
    background: 'rgba(6, 182, 212, 0.25)',
    transform: 'translateY(-2px)'
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px'
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: '16px',
    textAlign: 'center'
  }
};

const UserAttendancePage = () => {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [attendanceData, setAttendanceData] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentCurrency, setPaymentCurrency] = useState('INR');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [loading, setLoading] = useState(true);
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
          fetchPaymentHistory()
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

  const renderOverviewTab = () => (
    <div>
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
      <div style={{fontSize: '0.8rem', color: '#6b7280', marginTop: '8px'}}>
        (Status above refers to {currentMonth.toLocaleDateString('en-US',{month:'long',year:'numeric'})})
      </div>

      <div style={styles.grid}>
        <div
          style={{
            ...styles.card,
            ...(hoverStates.statCards[2] ? styles.cardHover : {})
          }}
          onClick={() => setActiveTab('attendance')}
          onMouseEnter={() => setHoverStates(prev => ({ ...prev, statCards: { ...prev.statCards, 2: true } }))}
          onMouseLeave={() => setHoverStates(prev => ({ ...prev, statCards: { ...prev.statCards, 2: false } }))}
        >
          <h3 style={{...styles.sectionTitle, fontSize: '20px', marginBottom: '12px'}}>📝 Attendance Records</h3>
          <p style={{color: '#9ca3af', fontSize: '14px', lineHeight: '1.6'}}>View detailed class attendance records and track your participation</p>
        </div>

        <div
          style={{
            ...styles.card,
            ...(hoverStates.statCards[3] ? styles.cardHover : {})
          }}
          onClick={() => setActiveTab('payments')}
          onMouseEnter={() => setHoverStates(prev => ({ ...prev, statCards: { ...prev.statCards, 3: true } }))}
          onMouseLeave={() => setHoverStates(prev => ({ ...prev, statCards: { ...prev.statCards, 3: false } }))}
        >
          <h3 style={{...styles.sectionTitle, fontSize: '20px', marginBottom: '12px'}}>💰 Payment Management</h3>
          <p style={{color: '#9ca3af', fontSize: '14px', lineHeight: '1.6'}}>Manage payments, view history, and submit payment requests</p>
        </div>
      </div>
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

      <div style={{overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)'}}>
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
              <tr key={idx} style={{backgroundColor: idx % 2 === 0 ? 'rgba(0, 0, 0, 0.2)' : 'transparent'}}>
                <td style={styles.td}>
                  {new Date(record.date).toLocaleDateString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </td>
                <td style={styles.td}>
                  {record.createdAt ? formatTimeIST(record.createdAt) : 'N/A'}
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
                <td colSpan="3" style={{...styles.td, textAlign: 'center', color: '#9ca3af', padding: '40px'}}>
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

      <div style={{overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)'}}>
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
              <tr key={idx} style={{backgroundColor: idx % 2 === 0 ? 'rgba(0, 0, 0, 0.2)' : 'transparent'}}>
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
                <td colSpan="4" style={{...styles.td, textAlign: 'center', color: '#9ca3af', padding: '40px'}}>
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
