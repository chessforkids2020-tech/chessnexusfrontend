import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';

const styles = {
  page: {
    padding: '20px',
    fontFamily: 'Inter, Arial, sans-serif',
    backgroundColor: '#f8fafc',
    minHeight: '100vh'
  },
  header: {
    marginBottom: '30px',
    textAlign: 'center'
  },
  title: {
    color: '#1f2937',
    fontSize: '2.5rem',
    fontWeight: 'bold',
    marginBottom: '10px'
  },
  subtitle: {
    color: '#6b7280',
    fontSize: '1.1rem'
  },
  section: {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb'
  },
  sectionTitle: {
    color: '#1f2937',
    fontSize: '1.5rem',
    fontWeight: '600',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    background: '#f9fafb',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    textAlign: 'center'
  },
  statNumber: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#059669',
    display: 'block'
  },
  statLabel: {
    color: '#6b7280',
    fontSize: '0.9rem',
    marginTop: '4px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '16px',
    fontSize: '0.9rem'
  },
  tableHeader: {
    background: '#f9fafb',
    borderBottom: '2px solid #e5e7eb'
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#374151',
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  td: {
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
    verticalAlign: 'middle'
  },
  button: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '500',
    transition: 'all 0.2s',
    marginRight: '8px'
  },
  primaryBtn: {
    background: '#059669',
    color: '#fff'
  },
  primaryBtnHover: {
    background: '#047857'
  },
  secondaryBtn: {
    background: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db'
  },
  secondaryBtnHover: {
    background: '#e5e7eb'
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.9rem',
    marginRight: '8px',
    marginBottom: '8px'
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.9rem',
    marginRight: '8px',
    marginBottom: '8px'
  },
  formGroup: {
    marginBottom: '16px'
  },
  formLabel: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '4px'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    background: '#fff',
    padding: '24px',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '80vh',
    overflow: 'auto'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1f2937'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#6b7280'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px'
  },
  card: {
    background: '#fff',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  cardHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
  },
  badge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '500'
  },
  presentBadge: {
    background: '#dcfce7',
    color: '#166534'
  },
  absentBadge: {
    background: '#fee2e2',
    color: '#991b1b'
  },
  catchupBadge: {
    background: '#fef3c7',
    color: '#92400e'
  },
  paidBadge: {
    background: '#dbeafe',
    color: '#1e40af'
  },
  unpaidBadge: {
    background: '#fef2f2',
    color: '#dc2626'
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '24px'
  },
  tab: {
    padding: '12px 24px',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s',
    fontWeight: '500',
    color: '#6b7280'
  },
  activeTab: {
    color: '#059669',
    borderBottom: '2px solid #059669'
  },
  tabContent: {
    padding: '20px 0'
  },
  monthNav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  monthTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1f2937'
  },
  navBtn: {
    padding: '8px 16px',
    background: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem'
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
        kidName: '',
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

  const getMonthRange = (date) => {
    const y = date.getFullYear();
    const m = date.getMonth();
    return {
      start: new Date(Date.UTC(y, m, 1)),
      end: new Date(Date.UTC(y, m + 1, 1))
    };
  };

  const isMonthPaid = (payments) => {
    const { start, end } = getMonthRange(currentMonth);
    return payments.some(p => {
      if (p.fromDate && p.untilDate) {
        const from = new Date(p.fromDate);
        const until = new Date(p.untilDate);
        return from <= end && until >= start;
      }
      const paid = new Date(p.datePaid);
      return paid >= start && paid < end;
    });
  };

  const renderOverviewTab = () => (
    <div>
      <div style={{...styles.statsGrid, gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))'}}>
        <div style={styles.statCard}>
          <span style={styles.statNumber}>
            {attendanceData.filter(a => a.status === 'Present' || a.status === 'Catch-up').length}
          </span>
          <span style={styles.statLabel}>Classes Attended This Month</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statNumber}>
            {paymentHistory.length === 0 ? 'No Payments' : (isMonthPaid(paymentHistory) ? 'Paid' : 'Pending')}
          </span>
          <span style={styles.statLabel}>Payment Status</span>
        </div>
      </div>
      <div style={{fontSize: '0.8rem', color: '#6b7280', marginTop: '8px'}}>
        (Status above refers to {currentMonth.toLocaleDateString('en-US',{month:'long',year:'numeric'})})
      </div>

      <div style={styles.grid}>
        <div
          style={styles.card}
          onClick={() => setActiveTab('attendance')}
          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
        >
          <h3 style={{...styles.sectionTitle, fontSize: '1.25rem', marginBottom: '8px'}}>📝 Attendance</h3>
          <p style={{color: '#6b7280', fontSize: '0.9rem'}}>View your class attendance records</p>
        </div>

        <div
          style={styles.card}
          onClick={() => setActiveTab('payments')}
          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
        >
          <h3 style={{...styles.sectionTitle, fontSize: '1.25rem', marginBottom: '8px'}}>💰 Payments</h3>
          <p style={{color: '#6b7280', fontSize: '0.9rem'}}>Manage payments and view history</p>
        </div>
      </div>
    </div>
  );

  const renderAttendanceTab = () => (
    <div>
      <div style={styles.monthNav}>
        <button style={styles.navBtn} onClick={() => navigateMonth(-1)}>← Previous</button>
        <h2 style={styles.monthTitle}>
          {currentMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
        </h2>
        <button style={styles.navBtn} onClick={() => navigateMonth(1)}>Next →</button>
      </div>

      <div style={{overflowX: 'auto'}}>
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
              <tr key={idx} style={{backgroundColor: idx % 2 === 0 ? '#f9fafb' : '#fff'}}>
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
                <td colSpan="3" style={{...styles.td, textAlign: 'center', color: '#6b7280'}}>
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
      <div style={{marginBottom: '20px'}}>
        <button
          style={styles.primaryBtn}
          onClick={() => setShowPaymentForm(true)}
        >
          ➕ Submit Payment Request
        </button>
      </div>

      <div style={{overflowX: 'auto'}}>
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
              <tr key={idx} style={{backgroundColor: idx % 2 === 0 ? '#f9fafb' : '#fff'}}>
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
                <td style={styles.td}>{paymentCurrency === 'INR' ? '₹' : '$'}{payment.amount}</td>
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
                <td colSpan="4" style={{...styles.td, textAlign: 'center', color: '#6b7280'}}>
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
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div style={{ fontSize: '1.2rem', color: '#6b7280' }}>
            {loading ? 'Loading attendance data...' : 'Loading user data...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>📚 My Attendance</h1>
        <p style={styles.subtitle}>Track your class attendance and manage payments</p>
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
              <h3 style={styles.modalTitle}>Submit Payment </h3>
              <button style={styles.closeBtn} onClick={() => setShowPaymentForm(false)}>×</button>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Kid Name</label>
              <input
                type="text"
                placeholder="Enter kid's name"
                value={paymentFormData.kidName}
                onChange={(e) => setPaymentFormData({...paymentFormData, kidName: e.target.value})}
                style={styles.input}
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
            <div style={{display: 'flex', gap: '10px'}}>
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
              <label style={styles.formLabel}>Fees ($)</label>
              <input
                type="number"
                placeholder="Enter amount"
                value={paymentFormData.feesAmount}
                onChange={(e) => setPaymentFormData({...paymentFormData, feesAmount: e.target.value})}
                style={styles.input}
              />
            </div>
            <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
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
