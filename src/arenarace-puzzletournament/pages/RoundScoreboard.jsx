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

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        Loading Round {roundNumber} scores...
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", padding: 20, borderRadius: 12, marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <button
          onClick={() => navigate('/scoreboard')}
          style={{
            padding: '8px 16px',
            background: '#6b7280',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            marginRight: 20
          }}
        >
          ← Back to Rounds
        </button>
        <div>
          <h3 style={{ margin: 0, color: "#064f28" }}>Round {roundNumber} Scoreboard</h3>
          <p style={{ margin: 5, color: "#666" }}>
            {isAdmin
              ? "Manage points for players in this round."
              : "View scores for Round " + roundNumber + "."
            }
          </p>
        </div>
      </div>

      {users.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
          No users found.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fffa", textAlign: "left", borderBottom: "2px solid #e6f3ea" }}>
                <th style={{ padding: 12, fontWeight: 600 }}>#</th>
                <th style={{ padding: 12, fontWeight: 600 }}>Player</th>
                <th style={{ padding: 12, fontWeight: 600 }}>Country</th>
                <th style={{ padding: 12, fontWeight: 600 }}>Points</th>
                {isAdmin && <th style={{ padding: 12, fontWeight: 600 }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => (
                <tr key={user._id} style={{ borderBottom: "1px solid #f1f6f1" }}>
                  <td style={{ padding: 12 }}>{idx + 1}</td>
                  <td style={{ padding: 12 }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{user.displayName || user.username.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                    </div>
                  </td>
                  <td style={{ padding: 12 }}>{user.country || 'N/A'}</td>
                  <td style={{ padding: 12 }}>
                    {editingUser === user._id ? (
                      <input
                        type="number"
                        min="0"
                        value={editPoints}
                        onChange={(e) => setEditPoints(parseInt(e.target.value) || 0)}
                        onKeyDown={handleKeyPress}
                        style={{ width: 80, padding: "6px 8px", border: "2px solid #10b981", borderRadius: 4, fontSize: 14, textAlign: "center" }}
                        autoFocus
                      />
                    ) : (
                      <span style={{ fontWeight: 700, color: '#064f28' }}>{user.points || 0}</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td style={{ padding: 12 }}>
                      {editingUser === user._id ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={savePoints} style={{ padding: '6px 10px', background:'#059669', color:'#fff', border:'none', borderRadius:4 }}>Save</button>
                          <button onClick={cancelEditing} style={{ padding: '6px 10px', background:'#6b7280', color:'#fff', border:'none', borderRadius:4 }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => startEditing(user)} style={{ padding: '6px 10px', background:'#0ea5e9', color:'#fff', border:'none', borderRadius:4 }}>Edit</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 20, padding: 12, backgroundColor: "#f8fffa", borderRadius: 8, border: "1px solid #e6f3ea" }}>
        <h4 style={{ margin: 0, color: "#064f28" }}>Round {roundNumber} Instructions</h4>
        <ul style={{ margin: 8, paddingLeft: 20, color: "#666" }}>
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
  );
}