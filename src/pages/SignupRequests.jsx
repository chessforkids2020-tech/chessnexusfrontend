// src/pages/SignupRequests.jsx
import React, { useEffect, useState } from "react";
import api from '../api';
import { useNavigate } from "react-router-dom";
import socket from "../socket";

const styles = {
  page: {
    padding: 24,
    fontFamily: "Inter, Arial, sans-serif",
    maxWidth: 1400,
    margin: "0 auto"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    color: "#064f28",
    margin: 0
  },
  filters: {
    display: "flex",
    gap: 12,
    marginBottom: 24,
    flexWrap: "wrap"
  },
  filterBtn: {
    padding: "10px 20px",
    border: "2px solid #e5e7eb",
    borderRadius: 8,
    background: "#fff",
    cursor: "pointer",
    fontWeight: 500,
    transition: "all 0.2s"
  },
  filterBtnActive: {
    background: "#0b6623",
    color: "#fff",
    border: "2px solid #0b6623"
  },
  requestsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
    gap: 20
  },
  requestCard: {
    background: "#fff",
    border: "2px solid #e5e7eb",
    borderRadius: 12,
    padding: 20,
    transition: "all 0.3s ease",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
  },
  requestHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    marginBottom: 16
  },
  userInfo: {
    flex: 1
  },
  displayName: {
    fontSize: 20,
    fontWeight: 700,
    color: "#064f28",
    marginBottom: 4
  },
  username: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 2
  },
  statusBadge: {
    padding: "6px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase"
  },
  statusPending: {
    background: "#fef3c7",
    color: "#d97706"
  },
  statusApproved: {
    background: "#d1fae5",
    color: "#059669"
  },
  statusRejected: {
    background: "#fee2e2",
    color: "#dc2626"
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginBottom: 16
  },
  infoItem: {
    display: "flex",
    flexDirection: "column",
    gap: 4
  },
  infoLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: 500,
    textTransform: "uppercase"
  },
  infoValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: 500
  },
  chessInfo: {
    background: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  chessLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: 500,
    marginBottom: 6
  },
  chessValue: {
    fontSize: 14,
    color: "#374151"
  },
  actions: {
    display: "flex",
    gap: 8,
    marginTop: 16
  },
  approveBtn: {
    flex: 1,
    padding: "10px 16px",
    background: "#059669",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s"
  },
  rejectBtn: {
    flex: 1,
    padding: "10px 16px",
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s"
  },
  deleteBtn: {
    padding: "10px 16px",
    background: "#6b7280",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s"
  },
  backBtn: {
    padding: "10px 20px",
    background: "#f0f9f0",
    color: "#064f28",
    border: "2px solid #d6f0d6",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s"
  },
  emptyState: {
    textAlign: "center",
    padding: 60,
    color: "#6b7280"
  },
  loading: {
    textAlign: "center",
    padding: 40,
    fontSize: 18,
    color: "#6b7280"
  },
  submittedDate: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 8
  }
};

function SignupRequests() {
  const nav = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    fetchRequests();
    
    // Listen for new signup requests
    const handleNewSignupRequest = () => {
      fetchRequests();
    };
    
    socket.on('newSignupRequest', handleNewSignupRequest);
    
    return () => {
      socket.off('newSignupRequest', handleNewSignupRequest);
    };
  }, [filter]);

  async function fetchRequests() {
    setLoading(true);
    try {
      const res = await api.get(`/api/admin/signup-requests?status=${filter}`);
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (err.response?.status === 401) {
        alert('Session expired. Please login again.');
        nav('/login?role=admin');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id) {
    if (!confirm('Are you sure you want to approve this signup request?')) return;
    
    try {
      await api.post(`/api/admin/signup-requests/${id}/approve`, {});
      alert('Signup request approved successfully!');
      fetchRequests();
    } catch (err) {
      alert('Failed to approve: ' + (err.response?.data?.message || err.message));
    }
  }

  async function handleReject(id) {
    const reason = prompt('Rejection reason (optional):');
    if (reason === null) return; // User cancelled
    
    try {
      await api.post(`/api/admin/signup-requests/${id}/reject`, {
        reason
      });
      alert('Signup request rejected.');
      fetchRequests();
    } catch (err) {
      alert('Failed to reject: ' + (err.response?.data?.message || err.message));
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this signup request? This cannot be undone.')) return;
    
    try {
      await api.delete(`/api/admin/signup-requests/${id}`);
      alert('Signup request deleted.');
      fetchRequests();
    } catch (err) {
      alert('Failed to delete: ' + (err.response?.data?.message || err.message));
    }
  }

  function getStatusStyle(status) {
    switch (status) {
      case 'pending': return { ...styles.statusBadge, ...styles.statusPending };
      case 'approved': return { ...styles.statusBadge, ...styles.statusApproved };
      case 'rejected': return { ...styles.statusBadge, ...styles.statusRejected };
      default: return styles.statusBadge;
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>📬 Signup Requests</h1>
        <button style={styles.backBtn} onClick={() => nav('/admin')}>
          ← Back to Dashboard
        </button>
      </div>

      <div style={styles.filters}>
        <button
          style={filter === 'pending' ? { ...styles.filterBtn, ...styles.filterBtnActive } : styles.filterBtn}
          onClick={() => setFilter('pending')}
        >
          Pending
        </button>
        <button
          style={filter === 'approved' ? { ...styles.filterBtn, ...styles.filterBtnActive } : styles.filterBtn}
          onClick={() => setFilter('approved')}
        >
          Approved
        </button>
        <button
          style={filter === 'rejected' ? { ...styles.filterBtn, ...styles.filterBtnActive } : styles.filterBtn}
          onClick={() => setFilter('rejected')}
        >
          Rejected
        </button>
        <button
          style={filter === 'all' ? { ...styles.filterBtn, ...styles.filterBtnActive } : styles.filterBtn}
          onClick={() => setFilter('all')}
        >
          All
        </button>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading...</div>
      ) : requests.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={{ fontSize: 48, margin: 0 }}>📭</p>
          <p style={{ fontSize: 18, marginTop: 16 }}>No {filter !== 'all' ? filter : ''} signup requests</p>
        </div>
      ) : (
        <div style={styles.requestsGrid}>
          {requests.map((request) => (
            <div key={request._id} style={styles.requestCard}>
              <div style={styles.requestHeader}>
                <div style={styles.userInfo}>
                  <div style={styles.displayName}>{request.displayName}</div>
                  <div style={styles.username}>{request.realName}</div>
                </div>
                <div style={getStatusStyle(request.status)}>
                  {request.status}
                </div>
              </div>

              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Country</span>
                  <span style={styles.infoValue}>{request.country}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Email</span>
                  <span style={styles.infoValue}>{request.email}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Experience</span>
                  <span style={styles.infoValue}>{request.chessExperience}</span>
                </div>
              </div>

              {(request.lichessUsername || request.chessComUsername) && (
                <div style={styles.chessInfo}>
                  <div style={styles.chessLabel}>Chess Accounts</div>
                  {request.lichessUsername && (
                    <div style={styles.chessValue}>Lichess: {request.lichessUsername}</div>
                  )}
                  {request.chessComUsername && (
                    <div style={styles.chessValue}>Chess.com: {request.chessComUsername}</div>
                  )}
                </div>
              )}

              <div style={styles.submittedDate}>
                Submitted: {formatDate(request.submittedAt)}
              </div>

              {request.status === 'rejected' && request.rejectionReason && (
                <div style={{ ...styles.chessInfo, background: '#fee2e2', marginTop: 12 }}>
                  <div style={styles.chessLabel}>Rejection Reason</div>
                  <div style={styles.chessValue}>{request.rejectionReason}</div>
                </div>
              )}

              {request.status === 'pending' && (
                <div style={styles.actions}>
                  <button
                    style={styles.approveBtn}
                    onClick={() => handleApprove(request._id)}
                    onMouseOver={(e) => e.target.style.background = '#047857'}
                    onMouseOut={(e) => e.target.style.background = '#059669'}
                  >
                    ✓ Approve
                  </button>
                  <button
                    style={styles.rejectBtn}
                    onClick={() => handleReject(request._id)}
                    onMouseOver={(e) => e.target.style.background = '#b91c1c'}
                    onMouseOut={(e) => e.target.style.background = '#dc2626'}
                  >
                    ✗ Reject
                  </button>
                </div>
              )}

              {request.status !== 'pending' && (
                <div style={styles.actions}>
                  <button
                    style={styles.deleteBtn}
                    onClick={() => handleDelete(request._id)}
                    onMouseOver={(e) => e.target.style.background = '#4b5563'}
                    onMouseOut={(e) => e.target.style.background = '#6b7280'}
                  >
                    🗑️ Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SignupRequests;
