// src/pages/RoundScoreboard.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from '../api';
import { useAuth } from "../contexts/AuthContext";

export default function RoundScoreboard() {
  const { roundNumber } = useParams();
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editPoints, setEditPoints] = useState(0);

  useEffect(() => {
    fetchRoundScores();
  }, [roundNumber]);

  const fetchRoundScores = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/public/rounds/points/${roundNumber}`);
      setUsers(res.data || []);
    } catch (err) {
      alert('Failed to load round scores');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (user) => {
    setEditingUser(user._id);
    setEditPoints(user.points || 0);
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setEditPoints(0);
  };

  const savePoints = async () => {
    try {
      await api.put(`/api/admin/rounds/${roundNumber}/users/${editingUser}/points`,
        { points: editPoints }
      );

      await fetchRoundScores();
      setEditingUser(null);
      alert('Points updated successfully!');
    } catch (err) {
      alert('Failed to update points');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      savePoints();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const styles = {
    pageWrapper: {
      minHeight: '100vh',
      background: '#0a0a0a',
      position: 'relative',
      overflow: 'hidden',
      padding: '20px',
    },
    background: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
      pointerEvents: 'none',
      zIndex: 0,
    },
    container: {
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: 'rgba(23, 23, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      padding: '28px',
      marginTop: '20px',
      position: 'relative',
      zIndex: 1,
      maxWidth: '1200px',
      margin: '20px auto',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '28px',
      gap: '20px',
    },
    backButton: {
      padding: '10px 20px',
      background: 'rgba(0, 0, 0, 0.4)',
      color: '#9ca3af',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.3s ease',
    },
    headerContent: {
      flex: 1,
    },
    title: {
      margin: 0,
      fontSize: '28px',
      fontWeight: '700',
      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    subtitle: {
      margin: '8px 0 0 0',
      color: '#9ca3af',
      fontSize: '14px',
    },
    loadingContainer: {
      textAlign: 'center',
      padding: '60px 20px',
      color: '#9ca3af',
    },
    tableWrapper: {
      overflowX: 'auto',
      background: 'rgba(0, 0, 0, 0.3)',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
    },
    thead: {
      backgroundColor: 'rgba(6, 182, 212, 0.1)',
      borderBottom: '1px solid rgba(6, 182, 212, 0.2)',
    },
    th: {
      padding: '16px',
      fontWeight: '600',
      color: '#06b6d4',
      textAlign: 'left',
      fontSize: '13px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    tr: {
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      transition: 'background 0.2s ease',
    },
    td: {
      padding: '16px',
      color: '#ffffff',
    },
    playerName: {
      fontWeight: '500',
      color: '#ffffff',
      fontSize: '15px',
    },
    username: {
      fontSize: '12px',
      color: '#9ca3af',
      marginTop: '4px',
    },
    pointsDisplay: {
      fontWeight: '700',
      color: '#10b981',
      fontSize: '16px',
    },
    pointsInput: {
      width: '80px',
      padding: '8px 12px',
      border: '2px solid #06b6d4',
      borderRadius: '8px',
      fontSize: '14px',
      textAlign: 'center',
      background: 'rgba(0, 0, 0, 0.5)',
      color: '#ffffff',
      fontWeight: '600',
    },
    buttonGroup: {
      display: 'flex',
      gap: '8px',
    },
    saveButton: {
      padding: '8px 14px',
      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '600',
      transition: 'all 0.3s ease',
      boxShadow: '0 2px 8px rgba(6, 182, 212, 0.3)',
    },
    cancelButton: {
      padding: '8px 14px',
      background: 'rgba(0, 0, 0, 0.4)',
      color: '#9ca3af',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '600',
      transition: 'all 0.3s ease',
    },
    editButton: {
      padding: '8px 14px',
      background: 'rgba(6, 182, 212, 0.15)',
      color: '#06b6d4',
      border: '1px solid rgba(6, 182, 212, 0.2)',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '600',
      transition: 'all 0.3s ease',
    },
    infoBox: {
      marginTop: '28px',
      padding: '20px',
      backgroundColor: 'rgba(6, 182, 212, 0.05)',
      borderRadius: '12px',
      border: '1px solid rgba(6, 182, 212, 0.1)',
    },
    infoTitle: {
      margin: '0 0 12px 0',
      color: '#06b6d4',
      fontSize: '16px',
      fontWeight: '600',
    },
    infoList: {
      margin: '8px 0',
      paddingLeft: '20px',
      color: '#9ca3af',
      fontSize: '14px',
      lineHeight: '1.8',
    },
    emptyState: {
      padding: '40px 20px',
      textAlign: 'center',
      color: '#9ca3af',
      fontSize: '15px',
    },
    rankBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      background: 'rgba(6, 182, 212, 0.15)',
      color: '#06b6d4',
      fontWeight: '700',
      fontSize: '14px',
      border: '1px solid rgba(6, 182, 212, 0.2)',
    },
  };

  if (loading) {
    return (
      <div style={styles.pageWrapper}>
        <div style={styles.background}></div>
        <div style={styles.container}>
          <div style={styles.loadingContainer}>
            Loading Round {roundNumber} scores...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.background}></div>
      <div style={styles.container}>
      <div style={styles.header}>
        <button
          onClick={() => navigate('/scoreboard')}
          style={styles.backButton}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          ← Back to Rounds
        </button>
        <div style={styles.headerContent}>
          <h3 style={styles.title}>Round {roundNumber} Scoreboard</h3>
          <p style={styles.subtitle}>
            {isAdmin
              ? "Manage points for players in this round."
              : "View scores for Round " + roundNumber + "."
            }
          </p>
        </div>
      </div>

      {users.length === 0 ? (
        <div style={styles.emptyState}>
          No users found.
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Player</th>
                <th style={styles.th}>Country</th>
                <th style={styles.th}>Points</th>
                {isAdmin && <th style={styles.th}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => (
                <tr 
                  key={user._id} 
                  style={styles.tr}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(6, 182, 212, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td style={styles.td}>
                    <div style={styles.rankBadge}>{idx + 1}</div>
                  </td>
                  <td style={styles.td}>
                    <div>
                      <div style={styles.playerName}>
                        {user.displayName || user.username.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>{user.country || 'N/A'}</td>
                  <td style={styles.td}>
                    {editingUser === user._id ? (
                      <input
                        type="number"
                        min="0"
                        value={editPoints}
                        onChange={(e) => setEditPoints(parseInt(e.target.value) || 0)}
                        onKeyDown={handleKeyPress}
                        style={styles.pointsInput}
                        autoFocus
                      />
                    ) : (
                      <span style={styles.pointsDisplay}>{user.points || 0}</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td style={styles.td}>
                      {editingUser === user._id ? (
                        <div style={styles.buttonGroup}>
                          <button 
                            onClick={savePoints} 
                            style={styles.saveButton}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(6, 182, 212, 0.5)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(6, 182, 212, 0.3)';
                            }}
                          >
                            Save
                          </button>
                          <button 
                            onClick={cancelEditing} 
                            style={styles.cancelButton}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => startEditing(user)} 
                          style={styles.editButton}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(6, 182, 212, 0.25)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(6, 182, 212, 0.15)';
                          }}
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={styles.infoBox}>
        <h4 style={styles.infoTitle}>Round {roundNumber} Instructions</h4>
        <ul style={styles.infoList}>
          {isAdmin ? (
            <>
              <li>Click Edit next to any player to change their points for this round</li>
              <li>Use the input field to set new points (must be 0 or greater)</li>
              <li>Press Enter to save or Escape to cancel</li>
              <li>Points are specific to Round {roundNumber} only</li>
            </>
          ) : (
            <>
              <li>This shows your points for Round {roundNumber}</li>
              <li>Points are awarded by administrators</li>
              <li>Check back later for updates</li>
            </>
          )}
        </ul>
      </div>
    </div>
    </div>
  );
}