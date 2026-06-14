import React, { useState, useEffect } from 'react';
import api from '../api';
import socket from '../socket';

const palette = {
  primary: "#ff69b4", // Pink
  secondary: "#ffd700", // Gold
  accent: "#7ed957", // Light Green
  bg: "#fff0f6", // Light Pink Background
  card: "#fff", // White Card
  text: "#222", // Darker text for better contrast
  gray: "#eee", // Light Grey
  error: "#d32f2f", // Brighter error for better contrast
  success: "#4caf50", // Green
  warning: "#ff9800", // Orange
  info: "#2196f3", // Blue
};

// Helper functions
const getToday = () => {
  return new Date().toISOString().split('T')[0];
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', { 
    month: '2-digit', 
    day: '2-digit', 
    year: 'numeric' 
  });
};

const styles = {
  page: { 
    padding: '20px', 
    fontFamily: 'Inter, Arial, sans-serif',
    backgroundColor: palette.bg,
    minHeight: '100vh',
    color: palette.text
  },
  header: { 
    marginBottom: '30px',
    textAlign: 'center'
  },
  title: { 
    color: palette.text, 
    fontSize: '2.5rem', 
    fontWeight: 'bold',
    marginBottom: '10px'
  },
  subtitle: { 
    color: '#6b7280', 
    fontSize: '1.1rem' 
  },
  backButton: {
    display: 'inline-block',
    marginBottom: '12px',
    color: '#374151',
    textDecoration: 'none',
    fontWeight: '600'
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
    color: palette.text, 
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
    background: palette.card, 
    padding: '16px', 
    borderRadius: '12px', 
    border: '1px solid #e5e7eb',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  },
  statNumber: { 
    fontSize: '2rem', 
    fontWeight: 'bold', 
    color: palette.primary,
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
    background: palette.secondary,
    borderBottom: '2px solid #e5e7eb'
  },
  th: { 
    padding: '12px 16px', 
    textAlign: 'left', 
    fontWeight: '600',
    color: palette.text,
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  td: { 
    padding: '12px 16px', 
    borderBottom: '1px solid #e5e7eb',
    verticalAlign: 'middle'
  },
  tableRow: { 
    transition: 'background-color 0.2s'
  },
  tableRowHover: { 
    backgroundColor: '#f9fafb'
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
    background: palette.primary, 
    color: '#fff' 
  },
  primaryBtnHover: { 
    background: '#047857' 
  },
  secondaryBtn: { 
    background: palette.gray, 
    color: palette.text,
    border: '1px solid #d1d5db'
  },
  secondaryBtnHover: { 
    background: '#e5e7eb' 
  },
  dangerBtn: { 
    background: '#dc2626', 
    color: '#fff' 
  },
  dangerBtnHover: { 
    background: '#b91c1c' 
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
    color: palette.text,
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
    background: palette.card, 
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
    color: palette.text
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
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
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
    background: '#dcfce7', 
    color: '#166534' 
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
    borderBottomWidth: '2px',
    borderBottomStyle: 'solid',
    borderBottomColor: 'transparent',
    transition: 'all 0.2s',
    fontWeight: '500',
    color: '#6b7280'
  },
  activeTab: {
    color: palette.primary,
    borderBottomColor: palette.primary
  },
  tabContent: {
    padding: '20px 0'
  },
  buttonStyle: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    marginRight: '8px'
  },
  cardStyle: {
    background: palette.card,
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  inputStyle: {
    padding: '8px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.9rem'
  }
};

const AdminAttendancePage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState({});
  const [students, setStudents] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedHistoryStudent, setSelectedHistoryStudent] = useState(null);
  const [studentAttendanceHistory, setStudentAttendanceHistory] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [selectedPaymentStudent, setSelectedPaymentStudent] = useState(null);
  const [allPayments, setAllPayments] = useState([]);
  const [breakPayments, setBreakPayments] = useState([]);
  const [breakStudents, setBreakStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month
  const [monthlySummaryData, setMonthlySummaryData] = useState(null); // Store monthly summary for selected month
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // For attendance date selection
  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [paymentFormData, setPaymentFormData] = useState({
    studentId: '',
    amount: '',
    datePaid: new Date().toISOString().split('T')[0],
    fromDate: '',
    untilDate: ''
  });
  const [editingPayment, setEditingPayment] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    classesPerMonth: '',
    fees: '',
    classType: 'Group',
    enrollmentDate: ''
  });

  // Fetch monthly summary when monthOffset changes
  useEffect(() => {
    fetchMonthlySummary();
  }, [monthOffset]);

  const fetchMonthlySummary = async () => {
    try {
      const viewedMonthDate = new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset, 1);
      const year = viewedMonthDate.getFullYear();
      const month = viewedMonthDate.getMonth() + 1; // API expects 1-indexed month
      const res = await api.get(`/api/admin/attendance/monthly-summary?year=${year}&month=${month}`);
      setMonthlySummaryData(res.data);
    } catch (err) {
      console.error('Error fetching monthly summary:', err);
      setMonthlySummaryData(null);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchStudents();
    fetchTodayAttendance();
    fetchAllPayments();
    fetchBreakPayments();
    fetchBreakStudents();
    fetchPaymentRequests();
    fetchAttendanceForDate(selectedDate);

    // refresh payment requests in real-time when new requests arrive
    socket.on('admin:pendingPaymentCount', fetchPaymentRequests);
    return () => {
      socket.off('admin:pendingPaymentCount', fetchPaymentRequests);
    };
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/api/admin/attendance/dashboard');
      setDashboard(res.data);
    } catch (err) {
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/api/admin/attendance/students');
      setStudents(res.data);
    } catch (err) {
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const res = await api.get('/api/admin/attendance/today');
      setTodayAttendance(res.data);
    } catch (err) {
    }
  };

  const fetchAttendanceHistory = async (studentId) => {
    try {
      const res = await api.get(`/api/admin/attendance/history/${studentId}`);
      setAttendanceHistory(res.data);
    } catch (err) {
    }
  };

  const fetchPaymentHistory = async (studentId) => {
    try {
      const res = await api.get(`/api/admin/attendance/payments/${studentId}`);
      setPaymentHistory(res.data);
      const student = students.find(s => s._id === studentId);
      setSelectedPaymentStudent(student);
    } catch (err) {
    }
  };

  const fetchAllPayments = async () => {
    try {
      const res = await api.get('/api/admin/attendance/payments');
      setAllPayments(res.data);
    } catch (err) {
    }
  };

  const fetchBreakPayments = async () => {
    try {
      const res = await api.get('/api/admin/attendance/payments/break');
      setBreakPayments(res.data);
    } catch (err) {
    }
  };

  const fetchBreakStudents = async () => {
    try {
      const res = await api.get('/api/admin/attendance/break-students');
      setBreakStudents(res.data);
    } catch (err) {
    }
  };

  const fetchPaymentRequests = async () => {
    try {
      const res = await api.get('/api/admin/attendance/payment-requests');
      setPaymentRequests(res.data);
    } catch (err) {
    }
  };

  const handleAddStudent = async () => {
    try {
      if (isEditMode && editingStudent) {
        // Update existing student
        await api.put(`/api/admin/attendance/students/${editingStudent._id}`, formData);
      } else {
        // Add new student
        await api.post('/api/admin/attendance/students', formData);
      }
      fetchStudents();
      setShowAddForm(false);
      setIsEditMode(false);
      setEditingStudent(null);
      setFormData({ userId: '', classesPerMonth: '', fees: '', classType: 'Group', enrollmentDate: '' });
    } catch (err) {
    }
  };

  const handleEdit = (student) => {
    setIsEditMode(true);
    setEditingStudent(student);
    setFormData({
      userId: student.displayName || student.username, // Use displayName for display
      classesPerMonth: student.classesPerMonth || '',
      fees: student.fees || '',
      classType: student.classType || 'Group',
      enrollmentDate: student.enrollmentDate ? new Date(student.enrollmentDate).toISOString().split('T')[0] : ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this student from attendance?')) return;
    try {
      await api.delete(`/api/admin/attendance/students/${id}`);
      fetchStudents();
    } catch (err) {
    }
  };

  const handleBreak = async (id) => {
    try {
      await api.put(`/api/admin/attendance/students/${id}/break`);
      fetchStudents();
      fetchBreakStudents();
    } catch (err) {
    }
  };

  const handleRejoin = async (id) => {
    try {
      await api.put(`/api/admin/attendance/students/${id}/rejoin`);
      fetchStudents();
      fetchBreakStudents();
    } catch (err) {
    }
  };

  const handleMarkAttendance = async (studentId, status, date = new Date().toISOString().split('T')[0]) => {
    try {
      await api.post('/api/admin/attendance/mark', { studentId, date, status });
      fetchTodayAttendance();
      fetchDashboard(); // Refresh dashboard data after marking attendance
      // Always refresh attendance history for the selected date
      fetchAttendanceForDate(selectedDate);
    } catch (err) {
    }
  };

  const fetchAttendanceForDate = async (date) => {
    try {
      const res = await api.get(`/api/admin/attendance/date/${date}`);
      setAttendanceHistory(res.data.records || []);
    } catch (err) {
      setAttendanceHistory([]);
    }
  };

  const handleDeleteAttendance = async (studentId, date, attendanceId) => {
    if (!confirm('Are you sure you want to delete this attendance record?')) return;
    try {
      const response = await api.delete(`/api/admin/attendance/${studentId}/${date}/${attendanceId}`);
      fetchTodayAttendance();
      fetchDashboard(); // Refresh dashboard data after deleting attendance
      // Always refresh attendance history for the selected date
      fetchAttendanceForDate(selectedDate);
    } catch (err) {
    }
  };

  const handleUndoLastAttendance = async (studentId, date) => {
    if (!confirm('Are you sure you want to undo the last attendance record for this student?')) return;
    try {
      // Find the most recent attendance record for this student on this date
      const studentRecords = attendanceHistory.filter(att => 
        att.studentId && (att.studentId._id || att.studentId) === studentId
      );
      
      if (studentRecords.length === 0) {
        alert('No attendance records found for this student on this date.');
        return;
      }
      
      // Get the most recent record (assuming they're sorted by time)
      const lastRecord = studentRecords[studentRecords.length - 1];
      
      await api.delete(`/api/admin/attendance/${studentId}/${date}/${lastRecord._id}`);
      fetchTodayAttendance();
      // Always refresh attendance history for the selected date
      fetchAttendanceForDate(selectedDate);
      alert('Last attendance record undone successfully.');
    } catch (err) {
      alert('Error undoing last attendance record.');
    }
  };

  const handleMarkPayment = async () => {
    try {
      const { studentId, amount, datePaid, fromDate, untilDate } = paymentFormData;
      
      if (!studentId || !amount || !datePaid || !fromDate || !untilDate) {
        alert('Please fill in all payment fields');
        return;
      }
      if (new Date(datePaid) < new Date(fromDate) || new Date(datePaid) > new Date(untilDate)) {
        alert('Paid date must fall within the selected period');
        return;
      }
      
      await api.post('/api/admin/attendance/payments', {
        studentId,
        amount: parseFloat(amount),
        datePaid,
        fromDate,
        untilDate
      });
      
      // Reset form
      setPaymentFormData({
        studentId: '',
        amount: '',
        datePaid: new Date().toISOString().split('T')[0],
        fromDate: '',
        untilDate: ''
      });
      
      // Refresh data
      fetchAllPayments();
      alert('Payment marked successfully!');
    } catch (err) {
      alert('Error marking payment. Please try again.');
    }
  };

  const handlePaymentRequest = async (requestId, action) => {
    if (!confirm(`Are you sure you want to ${action} this payment request?`)) return;
    try {
      await api.put(`/api/admin/attendance/payment-requests/${requestId}`, { action });
      fetchPaymentRequests();
      alert(`Payment request ${action}d successfully.`);
    } catch (err) {
      alert(`Error ${action}ing payment request. Please try again.`);
    }
  };

  const handleEditPayment = (payment) => {
    setEditingPayment(payment);
    setPaymentFormData({
      studentId: payment.studentId || '',
      amount: payment.amount || '',
      datePaid: payment.datePaid || new Date().toISOString().split('T')[0],
      fromDate: payment.from || '',
      untilDate: payment.until || ''
    });
    setShowPaymentModal(true);
  };

  const handleDeletePayment = async (paymentId) => {
    if (!confirm('Are you sure you want to delete this payment record?')) return;
    try {
      await api.delete(`/api/admin/attendance/payments/${paymentId}`);
      fetchAllPayments();
      // Also refresh payment history if a student is selected
      if (selectedPaymentStudent) {
        fetchPaymentHistory(selectedPaymentStudent._id);
      }
      alert('Payment deleted successfully.');
    } catch (err) {
      alert('Error deleting payment. Please try again.');
    }
  };

  const handleUpdatePayment = async () => {
    try {
      const { studentId, amount, datePaid, fromDate, untilDate } = paymentFormData;

      if (!studentId || !amount || !datePaid || !fromDate || !untilDate) {
        alert('Please fill in all payment fields');
        return;
      }
      if (new Date(datePaid) < new Date(fromDate) || new Date(datePaid) > new Date(untilDate)) {
        alert('Paid date must fall within the selected period');
        return;
      }

      await api.put(`/api/admin/attendance/payments/${editingPayment._id}`, {
        studentId,
        amount: parseFloat(amount),
        datePaid,
        fromDate,
        untilDate
      });

      // Reset form
      setPaymentFormData({
        studentId: '',
        amount: '',
        datePaid: new Date().toISOString().split('T')[0],
        fromDate: '',
        untilDate: ''
      });

      setEditingPayment(null);
      setShowPaymentModal(false);

      // Refresh data
      fetchAllPayments();
      // Also refresh payment history if the edited payment belongs to the selected student
      if (selectedPaymentStudent && editingPayment.studentId === selectedPaymentStudent._id) {
        fetchPaymentHistory(selectedPaymentStudent._id);
      }
      alert('Payment updated successfully!');
    } catch (err) {
      alert('Error updating payment. Please try again.');
    }
  };

  const filteredStudents = students.filter(s => (s.displayName || s.username).toLowerCase().includes(searchTerm.toLowerCase()));

  const renderDashboardTab = () => {
    // Month navigation
    const viewedMonthDate = new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset, 1);

    // Use monthly summary data from API
    let studentMonthlySummary;
    if (monthlySummaryData && monthlySummaryData.monthlySummary) {
      // Use fetched data for any month
      studentMonthlySummary = monthlySummaryData.monthlySummary.map(item => ({
        student: item.student,
        classesAttended: item.classesAttended,
        remainingClasses: item.remainingClasses,
        paymentStatus: item.paymentStatus,
        percentageInCycle: item.attendancePercent,
        onBreak: item.onBreak
      }));
    } else if (monthOffset === 0 && dashboard.monthlySummary) {
      // Fallback to dashboard data for current month
      studentMonthlySummary = dashboard.monthlySummary.map(item => ({
        student: item.student,
        classesAttended: item.classesAttended,
        remainingClasses: item.classesPerCycle - item.classesAttended,
        paymentStatus: item.paymentStatus,
        percentageInCycle: item.attendancePercent,
      }));
    } else {
      // Loading state
      studentMonthlySummary = [];
    }

    const requestSort = (key) => {
      let direction = 'ascending';
      if (sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
      }
      setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
      if (sortConfig.key === key) {
        return sortConfig.direction === 'ascending' ? ' ⬆️' : ' ⬇️';
      }
      return '';
    };

    const sortedMonthlySummary = [...studentMonthlySummary].sort((a, b) => {
      if (sortConfig.key) {
        let aValue;
        let bValue;

        if (sortConfig.key === 'student') {
          aValue = a.student;
          bValue = b.student;
          return sortConfig.direction === 'ascending' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        } else if (sortConfig.key === 'paymentStatus') {
          aValue = a.paymentStatus;
          bValue = b.paymentStatus;
          return sortConfig.direction === 'ascending' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        } else if (sortConfig.key === 'percentageInCycle') {
          aValue = parseFloat(a.percentageInCycle);
          bValue = parseFloat(b.percentageInCycle);
          return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
        } else if (sortConfig.key === 'classesAttended' || sortConfig.key === 'remainingClasses') {
          aValue = Number(a[sortConfig.key]);
          bValue = Number(b[sortConfig.key]);
          return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
        }
      }
      return 0;
    });

    return (
      <div>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <span style={styles.statNumber}>{dashboard.totalStudents || 0}</span>
            <span style={styles.statLabel}>Total Students</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statNumber}>{dashboard.overduePayments || 0}</span>
            <span style={styles.statLabel}>Overdue Payments</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statNumber}>{dashboard.classesMarkedToday || 0}</span>
            <span style={styles.statLabel}>Classes Marked Today</span>
          </div>
        </div>
        
        <div style={{...styles.section, padding: '16px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
            <h3 style={{...styles.sectionTitle, fontSize: '1.25rem', margin: 0}}>📅 Monthly Cycle Summary</h3>
            <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
              <button 
                style={{...styles.button, background: palette.primary, color: '#fff'}} 
                onClick={() => setMonthOffset(monthOffset - 1)}
              >
                ◀️ Previous
              </button>
              <span style={{fontWeight: 'bold', color: palette.text}}>
                {viewedMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button 
                style={{...styles.button, background: palette.primary, color: '#fff'}} 
                onClick={() => setMonthOffset(monthOffset + 1)}
                disabled={monthOffset >= 0}
              >
                Next ▶️
              </button>
            </div>
          </div>
          
          <div style={{overflowX: 'auto'}}>
            <table style={styles.table}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={{...styles.th, cursor: 'pointer'}} onClick={() => requestSort('student')}>
                    Student {getSortIndicator('student')}
                  </th>
                  <th style={{...styles.th, cursor: 'pointer'}} onClick={() => requestSort('classesAttended')}>
                    Classes Attended {getSortIndicator('classesAttended')}
                  </th>
                  <th style={{...styles.th, cursor: 'pointer'}} onClick={() => requestSort('remainingClasses')}>
                    Remaining Classes {getSortIndicator('remainingClasses')}
                  </th>
                  <th style={{...styles.th, cursor: 'pointer'}} onClick={() => requestSort('paymentStatus')}>
                    Payment Status {getSortIndicator('paymentStatus')}
                  </th>
                  <th style={{...styles.th, cursor: 'pointer'}} onClick={() => requestSort('percentageInCycle')}>
                    Attendance % {getSortIndicator('percentageInCycle')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedMonthlySummary.map((item, idx) => (
                  <tr key={idx} style={styles.tableRow}>
                    <td style={styles.td}>{item.student}</td>
                    <td style={styles.td}>{item.classesAttended}</td>
                    <td style={styles.td}>{item.remainingClasses}</td>
                    <td style={styles.td}>
                      <span style={{...styles.badge, ...(item.paymentStatus === 'Paid' ? styles.paidBadge : styles.unpaidBadge)}}>
                        {item.paymentStatus}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{...styles.badge, background: item.percentageInCycle.includes('100') ? '#dcfce7' : item.percentageInCycle.includes('80') ? '#fef3c7' : '#fee2e2', color: item.percentageInCycle.includes('100') ? '#166534' : item.percentageInCycle.includes('80') ? '#92400e' : '#991b1b'}}>
                        {item.percentageInCycle}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderStudentsTab = () => (
    <div>
      <div style={{display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap'}}>
        <button 
          style={styles.primaryBtn} 
          onClick={() => setShowAddForm(true)}
          onMouseOver={(e) => e.target.style.background = styles.primaryBtnHover.background}
          onMouseOut={(e) => e.target.style.background = styles.primaryBtn.background}
        >
          ➕ Add Student
        </button>
        <input
          type="text"
          placeholder="🔍 Search students..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{...styles.input, flex: '1', minWidth: '200px'}}
        />
      </div>
      
      <div style={{overflowX: 'auto'}}>
        <table style={styles.table}>
          <thead style={styles.tableHeader}>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Classes/Month</th>
              <th style={styles.th}>Fees</th>
              <th style={styles.th}>Class Type</th>
              <th style={styles.th}>Enrollment Date</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr key={student._id} style={styles.tableRow}>
                <td style={styles.td}>{student.displayName || student.username}</td>
                <td style={styles.td}>{student.classesPerMonth}</td>
                <td style={styles.td}>${student.fees}</td>
                <td style={styles.td}>
                  <span style={{...styles.badge, background: student.classType === 'Group' ? '#dbeafe' : '#f3e8ff', color: student.classType === 'Group' ? '#1e40af' : '#7c3aed'}}>
                    {student.classType}
                  </span>
                </td>
                <td style={styles.td}>{student.enrollmentDate ? new Date(student.enrollmentDate).toLocaleDateString() : ''}</td>
                <td style={styles.td}>
                  <button 
                    style={{...styles.secondaryBtn, fontSize: '0.8rem', padding: '4px 8px'}} 
                    onClick={() => handleEdit(student)}
                  >
                    Edit
                  </button>
                  <button 
                    style={{...styles.dangerBtn, fontSize: '0.8rem', padding: '4px 8px'}} 
                    onClick={() => handleDelete(student._id)}
                  >
                    Delete
                  </button>
                  <button 
                    style={{...styles.button, background: '#f59e0b', color: '#fff', fontSize: '0.8rem', padding: '4px 8px'}} 
                    onClick={() => handleBreak(student._id)}
                  >
                    Break
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAttendanceTab = () => {

    const sortedStudents = [...students].sort((a, b) => {
      if (sortConfig.key === 'name') {
        return sortConfig.direction === 'ascending' ? (a.displayName || a.username).localeCompare(b.displayName || b.username) : (b.displayName || b.username).localeCompare(a.displayName || a.username);
      }
      return 0;
    });

    const requestSort = (key) => {
      let direction = 'ascending';
      if (sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
      }
      setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
      if (sortConfig.key === key) {
        return sortConfig.direction === 'ascending' ? ' ⬆️' : ' ⬇️';
      }
      return '';
    };

    // Handle toggle attendance - now using buttons
    const handleToggleAttendance = (studentId, status) => {
      handleMarkAttendance(studentId, status, selectedDate);
    };

    return (
      <div>
        {/* Section 1: Mark Daily Attendance */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📝 Mark Attendance</h2>
          <h3 style={{ color: '#333', marginTop: "1rem" }}>Today's Attendance ({new Date(selectedDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })})</h3>
          <div style={{marginBottom: '16px'}}>
            <label style={styles.formLabel}>Select Date: </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                fetchAttendanceForDate(e.target.value);
              }}
              style={styles.input}
            />
          </div>
          <div style={{overflowX: 'auto'}}>
            <table style={styles.table}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={{ ...styles.th, cursor: 'pointer' }} onClick={() => requestSort('name')}>Student Name {getSortIndicator('name')}</th>
                  <th style={styles.th}>Mark Attendance</th>
                  <th style={styles.th}>Today's Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((s, index) => {
                  // Find all attendance entries for selected date
                  const studentAttendances = attendanceHistory.filter(att =>
                    att.studentId && (att.studentId._id || att.studentId) === s._id
                  );

                  return (
                    <tr key={s._id} style={styles.tableRow}>
                      <td style={styles.td}>
                        <span
                          style={{ color: '#ff69b4', cursor: "pointer", textDecoration: "underline" }}
                          onClick={() => {/* setProfileStudent functionality can be added later */}}
                        >
                          {s.displayName || s.username}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                          <div style={{display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px'}}>
                            <button
                              style={{
                                ...styles.button,
                                background: '#4caf50',
                                color: '#fff',
                                fontSize: '0.8rem',
                                padding: '4px 8px'
                              }}
                              onClick={() => handleToggleAttendance(s._id, 'Present')}
                            >
                              + Present
                            </button>
                            <button
                              style={{
                                ...styles.button,
                                background: '#f44336',
                                color: '#fff',
                                fontSize: '0.8rem',
                                padding: '4px 8px'
                              }}
                              onClick={() => handleToggleAttendance(s._id, 'Absent')}
                            >
                              + Absent
                            </button>
                            <button
                              style={{
                                ...styles.button,
                                background: '#2196f3',
                                color: '#fff',
                                fontSize: '0.8rem',
                                padding: '4px 8px'
                              }}
                              onClick={() => handleToggleAttendance(s._id, 'Catch-up')}
                            >
                              + Catch-up
                            </button>
                          </div>
                          {studentAttendances.length > 0 && (
                            <div style={{fontSize: '0.8rem', color: '#666', marginTop: '8px'}}>
                              <div style={{fontWeight: 'bold', marginBottom: '4px'}}>Today's entries:</div>
                              <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                                {studentAttendances.map((att, idx) => (
                                  <div key={att._id || idx} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: '#f8f9fa',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid #e9ecef'
                                  }}>
                                    <span style={{
                                      ...styles.badge,
                                      ...(att.status === 'Present' ? styles.presentBadge :
                                         att.status === 'Absent' ? styles.absentBadge : styles.catchupBadge),
                                      fontSize: '0.7rem',
                                      marginRight: '4px',
                                      padding: '1px 4px'
                                    }}>
                                      {att.status}
                                    </span>
                                    <span style={{color: '#666', fontSize: '0.7rem'}}>
                                      {new Date(att.createdAt || att.date).toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                    <button
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#dc2626',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        marginLeft: '4px',
                                        padding: '0',
                                        lineHeight: 1
                                      }}
                                      onClick={() => handleDeleteAttendance(att.studentId._id || att.studentId, selectedDate, att._id)}
                                      title="Delete this entry"
                                    >
                                      Ã—
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        {studentAttendances.length > 0 ? (
                          <div>
                            <span style={{
                              ...styles.badge,
                              ...(studentAttendances[studentAttendances.length - 1].status === 'Present' ? styles.presentBadge :
                                 studentAttendances[studentAttendances.length - 1].status === 'Absent' ? styles.absentBadge : styles.catchupBadge)
                            }}>
                              {studentAttendances[studentAttendances.length - 1].status}
                            </span>
                            {studentAttendances.length > 1 && (
                              <div style={{fontSize: '0.7rem', color: '#666', marginTop: '2px'}}>
                                ({studentAttendances.length} entries)
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{color: '#6b7280', fontStyle: 'italic'}}>No entries</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Attendance History */}
        <div style={{ ...styles.section, marginTop: "2rem" }}>
          <h2 style={styles.sectionTitle}>📋 Attendance History</h2>
          {attendanceHistory.length > 0 ? (
            <div style={{overflowX: 'auto'}}>
              <table style={styles.table}>
                <thead style={styles.tableHeader}>
                  <tr>
                    <th style={{ ...styles.th, cursor: 'pointer' }} onClick={() => requestSort('name')}>Student Name {getSortIndicator('name')}</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Time</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceHistory
                    .sort((a, b) => {
                      const sA = students.find(s => a.studentId && (s._id === a.studentId._id || s._id === a.studentId));
                      const studentA = sA?.displayName || sA?.username || '';
                      const sB = students.find(s => b.studentId && (s._id === b.studentId._id || s._id === b.studentId));
                      const studentB = sB?.displayName || sB?.username || '';
                      return sortConfig.direction === 'ascending' ? studentA.localeCompare(studentB) : studentB.localeCompare(studentA);
                    })
                    .map((att, idx) => {
                      const student = students.find(s => att.studentId && (s._id === att.studentId._id || s._id === att.studentId));
                      const studentName = student ? (student.displayName || student.username) : (att.studentId && (att.studentId.displayName || att.studentId.username) ? (att.studentId.displayName || att.studentId.username) : 'Unknown Student');

                      return (
                        <tr key={att._id || idx} style={styles.tableRow}>
                          <td style={styles.td}>
                            <span
                              style={{ color: '#ff69b4', cursor: "pointer", textDecoration: "underline" }}
                              onClick={() => {/* setProfileStudent functionality can be added later */}}
                            >
                              {studentName}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <span style={{...styles.badge, ...(att.status === 'Present' ? styles.presentBadge : att.status === 'Absent' ? styles.absentBadge : styles.catchupBadge)}}>
                              {att.status.toLowerCase()}
                            </span>
                          </td>
                          <td style={styles.td}>
                            {new Date(att.createdAt || att.date).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td style={styles.td}>
                            <div style={{display: 'flex', gap: '4px'}}>
                              {att.studentId && (
                                <button
                                  style={{...styles.button, ...styles.dangerBtn, fontSize: '0.7rem', padding: '2px 6px'}}
                                  onClick={() => handleDeleteAttendance(att.studentId._id || att.studentId, selectedDate, att._id)}
                                >
                                  Delete
                                </button>
                              )}
                              <button
                                style={{...styles.button, background: '#f59e0b', color: '#fff', fontSize: '0.7rem', padding: '2px 6px'}}
                                onClick={() => handleUndoLastAttendance(att.studentId._id || att.studentId, selectedDate)}
                              >
                                Undo Last
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#6b7280' }}>No attendance recorded for {new Date(selectedDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}.</p>
          )}
        </div>
      </div>
    );
  };

  const renderPaymentsTab = () => (
    <div>
      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={{...styles.sectionTitle, fontSize: '1.25rem'}}>💰 Mark Payment</h3>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Select Student</label>
            <select 
              style={styles.select}
              value={paymentFormData.studentId}
              onChange={(e) => setPaymentFormData({...paymentFormData, studentId: e.target.value})}
            >
              <option value="">Select a Student</option>
              {students.map(s => <option key={s._id} value={s._id}>{s.displayName || s.username}</option>)}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Amount ($)</label>
            <input 
              type="number"
              step="0.01"
              placeholder="Enter amount"
              value={paymentFormData.amount}
              onChange={(e) => setPaymentFormData({...paymentFormData, amount: e.target.value})}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Date Paid</label>
            <input 
              type="date"
              value={paymentFormData.datePaid}
              onChange={(e) => setPaymentFormData({...paymentFormData, datePaid: e.target.value})}
              style={styles.input}
            />
          </div>
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
            <label style={styles.formLabel}>Until Date</label>
            <input 
              type="date"
              value={paymentFormData.untilDate}
              onChange={(e) => setPaymentFormData({...paymentFormData, untilDate: e.target.value})}
              style={styles.input}
            />
          </div>
          <button 
            style={styles.primaryBtn}
            onClick={handleMarkPayment}
          >
            Mark Payment
          </button>
        </div>

        <div style={styles.card}>
          <h3 style={{...styles.sectionTitle, fontSize: '1.25rem'}}>
            📈 Payment History {selectedPaymentStudent ? `for ${selectedPaymentStudent.displayName || selectedPaymentStudent.username}` : ''}
          </h3>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Select Student</label>
            <select 
              onChange={(e) => {
                if (e.target.value) {
                  fetchPaymentHistory(e.target.value);
                } else {
                  setSelectedPaymentStudent(null);
                  setPaymentHistory([]);
                }
              }}
              style={styles.select}
            >
              <option value="">Select a student</option>
              {students.map(s => <option key={s._id} value={s._id}>{s.displayName || s.username}</option>)}
            </select>
          </div>
          <div style={{overflowX: 'auto'}}>
            {paymentHistory.length > 0 ? (
              <table style={styles.table}>
                <thead style={styles.tableHeader}>
                  <tr>
                    <th style={styles.th}>From</th>
                    <th style={styles.th}>Until</th>
                    <th style={styles.th}>Date Paid</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((p, idx) => (
                    <tr key={idx} style={styles.tableRow}>
                      <td style={styles.td}>{p.fromDate ? new Date(p.fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</td>
                      <td style={styles.td}>{p.untilDate ? new Date(p.untilDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</td>
                      <td style={styles.td}>{p.datePaid ? new Date(p.datePaid).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</td>
                      <td style={styles.td}>₹{p.amount}</td>
                      <td style={styles.td}>
                        <button 
                          style={{...styles.secondaryBtn, fontSize: '0.8rem', padding: '4px 8px', marginRight: '4px'}} 
                          onClick={() => handleEditPayment(p)}
                        >
                          Edit
                        </button>
                        <button 
                          style={{...styles.dangerBtn, fontSize: '0.8rem', padding: '4px 8px'}} 
                          onClick={() => handleDeletePayment(p._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{color: '#6b7280', fontStyle: 'italic'}}>No payment records found.</p>
            )}
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>💳 All Student Payments</h2>
        <div style={{overflowX: 'auto'}}>
          <table style={styles.table}>
            <thead style={styles.tableHeader}>
              <tr>
                <th style={styles.th}>Student</th>
                <th style={styles.th}>From</th>
                <th style={styles.th}>Until</th>
                <th style={styles.th}>Date Paid</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {allPayments.map((p, idx) => (
                <tr key={idx} style={styles.tableRow}>
                  <td style={styles.td}>{p.student}</td>
                  <td style={styles.td}>{p.from}</td>
                  <td style={styles.td}>{p.until}</td>
                  <td style={styles.td}>{p.datePaid}</td>
                  <td style={styles.td}>${p.amount}</td>
                  <td style={styles.td}>
                    <button 
                      style={{...styles.secondaryBtn, fontSize: '0.8rem', padding: '4px 8px', marginRight: '4px'}} 
                      onClick={() => handleEditPayment(p)}
                    >
                      Edit
                    </button>
                    <button 
                      style={{...styles.dangerBtn, fontSize: '0.8rem', padding: '4px 8px'}} 
                      onClick={() => handleDeletePayment(p._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={{...styles.sectionTitle, fontSize: '1.25rem'}}>🏖️ Payments for Kids on Break</h3>
          <div style={{maxHeight: '150px', overflowY: 'auto'}}>
            {breakPayments.length > 0 ? (
              <ul style={{listStyle: 'none', padding: 0}}>
                {breakPayments.map((p, idx) => (
                  <li key={idx} style={{padding: '8px 0', borderBottom: '1px solid #e5e7eb'}}>
                    <strong>{p.studentId.displayName || p.studentId.username}</strong>: ${p.amount} ({new Date(p.datePaid).toLocaleDateString()})
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{color: '#6b7280', fontStyle: 'italic'}}>No break payments found.</p>
            )}
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={{...styles.sectionTitle, fontSize: '1.25rem'}}>😴 On Break Students</h3>
          <div style={{maxHeight: '150px', overflowY: 'auto'}}>
            {breakStudents.length > 0 ? (
              <ul style={{listStyle: 'none', padding: 0}}>
                {breakStudents.map((s, idx) => (
                  <li key={idx} style={{padding: '8px 0', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <span>{s.displayName || s.username}</span>
                    <button 
                      style={{...styles.primaryBtn, fontSize: '0.7rem', padding: '2px 6px'}} 
                      onClick={() => handleRejoin(s._id)}
                    >
                      Rejoin
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{color: '#6b7280', fontStyle: 'italic'}}>No students on break.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPaymentRequestsTab = () => (
    <div>
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📋 Pending Payment Requests</h2>
        <div style={{overflowX: 'auto'}}>
          <table style={styles.table}>
            <thead style={styles.tableHeader}>
              <tr>
                <th style={styles.th}>Student</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>Request Date</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paymentRequests.length > 0 ? paymentRequests.map((request, idx) => (
                <tr key={idx} style={styles.tableRow}>
                  <td style={styles.td}>{request.studentId?.displayName || request.studentId?.username || 'Unknown'}</td>
                  <td style={styles.td}>${request.amount}</td>
                  <td style={styles.td}>{request.description}</td>
                  <td style={styles.td}>{new Date(request.date).toLocaleDateString()}</td>
                  <td style={styles.td}>
                    <button 
                      style={{...styles.primaryBtn, fontSize: '0.8rem', padding: '4px 8px', marginRight: '4px'}}
                      onClick={() => handlePaymentRequest(request._id, 'approve')}
                    >
                      ✅ Approve
                    </button>
                    <button 
                      style={{...styles.dangerBtn, fontSize: '0.8rem', padding: '4px 8px'}}
                      onClick={() => handlePaymentRequest(request._id, 'reject')}
                    >
                      ❌ Reject
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" style={{...styles.td, textAlign: 'center', color: '#6b7280', fontStyle: 'italic'}}>
                    No pending payment requests
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderHistoryTab = () => {
    const handleStudentSelect = async (student) => {
      setSelectedHistoryStudent(student);
      if (student) {
        try {
          const res = await api.get(`/api/admin/attendance/history/${student._id}`);
          setStudentAttendanceHistory(res.data);
        } catch (error) {
          setStudentAttendanceHistory([]);
        }
      } else {
        setStudentAttendanceHistory([]);
      }
    };

    return (
      <div>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📚 Student Attendance History</h2>
          
          <div style={{marginBottom: '20px'}}>
            <label style={styles.formLabel}>Select Student:</label>
            <select
              value={selectedHistoryStudent?._id || ''}
              onChange={(e) => {
                const studentId = e.target.value;
                const student = students.find(s => s._id === studentId);
                handleStudentSelect(student || null);
              }}
              style={{...styles.input, marginLeft: '10px'}}
            >
              <option value="">Choose a student...</option>
              {students.map(student => (
                <option key={student._id} value={student._id}>
                  {student.username}
                </option>
              ))}
            </select>
          </div>

          {selectedHistoryStudent && (
            <div>
              <h3 style={{color: '#333', marginBottom: '16px'}}>
                Attendance History for {selectedHistoryStudent.username}
              </h3>
              
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
                    {studentAttendanceHistory.map((record, idx) => (
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
                          {record.createdAt ? new Date(record.createdAt).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'N/A'}
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
                    {studentAttendanceHistory.length === 0 && (
                      <tr>
                        <td colSpan="3" style={{...styles.td, textAlign: 'center', color: '#6b7280'}}>
                          No attendance records found for this student
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.page}>
      <a href="/admin" style={styles.backButton}>← Back to Admin Dashboard</a>
      <div style={styles.header}>
        <h1 style={styles.title}>👨‍🏫 Teacher Attendance</h1>
        <p style={styles.subtitle}>Manage student attendance, payments, and enrollment</p>
      </div>

      <div style={styles.tabs}>
        <div 
          style={{...styles.tab, ...(activeTab === 'dashboard' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </div>
        <div 
          style={{...styles.tab, ...(activeTab === 'students' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('students')}
        >
          👥 Students
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
        <div 
          style={{...styles.tab, ...(activeTab === 'requests' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('requests')}
        >
          📋 Requests
        </div>
        <div 
          style={{...styles.tab, ...(activeTab === 'history' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('history')}
        >
          📚 History
        </div>
      </div>

      <div style={styles.tabContent}>
        {activeTab === 'dashboard' && renderDashboardTab()}
        {activeTab === 'students' && renderStudentsTab()}
        {activeTab === 'attendance' && renderAttendanceTab()}
        {activeTab === 'payments' && renderPaymentsTab()}
        {activeTab === 'requests' && renderPaymentRequestsTab()}
        {activeTab === 'history' && renderHistoryTab()}
      </div>

      {/* Add Student Modal */}
      {showAddForm && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{isEditMode ? 'Edit Student' : 'Add New Student'}</h3>
              <button style={styles.closeBtn} onClick={() => {
                setShowAddForm(false);
                setIsEditMode(false);
                setEditingStudent(null);
                setFormData({ userId: '', classesPerMonth: '', fees: '', classType: 'Group', enrollmentDate: '' });
              }}>Ã—</button>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Username or User ID</label>
              <input 
                placeholder="Enter username or user ID" 
                value={formData.userId} 
                onChange={(e) => setFormData({...formData, userId: e.target.value})} 
                style={styles.input}
                disabled={isEditMode}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Classes per Month</label>
              <input 
                type="number"
                placeholder="Enter number of classes" 
                value={formData.classesPerMonth} 
                onChange={(e) => setFormData({...formData, classesPerMonth: e.target.value})} 
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Fees ($)</label>
              <input 
                type="number"
                placeholder="Enter monthly fees" 
                value={formData.fees} 
                onChange={(e) => setFormData({...formData, fees: e.target.value})} 
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Class Type</label>
              <select 
                value={formData.classType} 
                onChange={(e) => setFormData({...formData, classType: e.target.value})} 
                style={styles.select}
              >
                <option value="Group">Group</option>
                <option value="Individual">Individual</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Enrollment Date</label>
              <input 
                type="date" 
                value={formData.enrollmentDate} 
                onChange={(e) => setFormData({...formData, enrollmentDate: e.target.value})} 
                style={styles.input}
              />
            </div>
            <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
              <button 
                style={styles.secondaryBtn} 
                onClick={() => {
                  setShowAddForm(false);
                  setIsEditMode(false);
                  setEditingStudent(null);
                  setFormData({ userId: '', classesPerMonth: '', fees: '', classType: 'Group', enrollmentDate: '' });
                }}
              >
                Cancel
              </button>
              <button 
                style={styles.primaryBtn} 
                onClick={handleAddStudent}
              >
                {isEditMode ? 'Update Student' : 'Add Student'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Edit Payment</h3>
              <button 
                style={styles.closeBtn} 
                onClick={() => {
                  setShowPaymentModal(false);
                  setEditingPayment(null);
                  setPaymentFormData({
                    studentId: '',
                    amount: '',
                    datePaid: new Date().toISOString().split('T')[0],
                    fromDate: '',
                    untilDate: ''
                  });
                }}
              >
                Ã—
              </button>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Student</label>
              <select 
                value={paymentFormData.studentId} 
                onChange={(e) => setPaymentFormData({...paymentFormData, studentId: e.target.value})} 
                style={styles.select}
              >
                <option value="">Select a Student</option>
                {students.map(s => (
                  <option key={s._id} value={s._id}>{s.username}</option>
                ))}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Amount ($)</label>
              <input 
                type="number" 
                step="0.01"
                value={paymentFormData.amount} 
                onChange={(e) => setPaymentFormData({...paymentFormData, amount: e.target.value})} 
                style={styles.input}
                placeholder="Enter amount"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Date Paid</label>
              <input 
                type="date" 
                value={paymentFormData.datePaid} 
                onChange={(e) => setPaymentFormData({...paymentFormData, datePaid: e.target.value})} 
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
                <label style={styles.formLabel}>Until Date</label>
                <input 
                  type="date" 
                  value={paymentFormData.untilDate} 
                  onChange={(e) => setPaymentFormData({...paymentFormData, untilDate: e.target.value})} 
                  style={styles.input}
                />
              </div>
            </div>
            <p style={{fontSize: '0.8rem', color: '#6b7280', marginTop: '6px'}}>
              Coverage period determines which month will be treated as paid; the “Date Paid” field
              is informational and is ignored by the monthly summary when from/until dates are set.
            </p>
            <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
              <button 
                style={styles.secondaryBtn} 
                onClick={() => {
                  setShowPaymentModal(false);
                  setEditingPayment(null);
                  setPaymentFormData({
                    studentId: '',
                    amount: '',
                    datePaid: new Date().toISOString().split('T')[0],
                    fromDate: '',
                    untilDate: ''
                  });
                }}
              >
                Cancel
              </button>
              <button 
                style={styles.primaryBtn} 
                onClick={handleUpdatePayment}
              >
                Update Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttendancePage;
