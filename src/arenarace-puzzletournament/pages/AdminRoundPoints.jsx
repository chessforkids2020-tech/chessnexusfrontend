// src/pages/AdminRoundPoints.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from '../api';
import { useAuth } from "../contexts/AuthContext";

export default function AdminRoundPoints() {
  const { roundNumber } = useParams();
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bulkPoints, setBulkPoints] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState(new Set());

  useEffect(() => {
    if (!isAdmin) {
      navigate('/scoreboard');
      return;
    }
    fetchRoundUsers();
  }, [roundNumber, isAdmin]);

  const fetchRoundUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/admin/rounds/${roundNumber}/leaderboard`);
      setUsers(res.data || []);
    } catch (err) {
      alert('Failed to load round users');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userId) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const selectAll = () => {
    setSelectedUsers(new Set(users.map(u => u._id)));
  };

  const deselectAll = () => {
    setSelectedUsers(new Set());
  };

  const applyBulkPoints = async () => {
    if (selectedUsers.size === 0) {
      alert('Please select at least one user');
      return;
    }

    try {
      await api.put(`/api/admin/rounds/${roundNumber}/bulk-points`,
        { userIds: Array.from(selectedUsers), points: bulkPoints }
      );

      await fetchRoundUsers();
      setSelectedUsers(new Set());
      alert(`Applied ${bulkPoints} points to ${selectedUsers.size} users`);
    } catch (err) {
      alert('Failed to update points');
    }
  };

  const updateUserPoints = async (userId, points) => {
    try {
      await api.put(`/api/admin/rounds/${roundNumber}/users/${userId}/points`,
        { points }
      );

      await fetchRoundUsers();
      alert('Points updated successfully!');
    } catch (err) {
      alert('Failed to update points');
    }
  };

  if (!isAdmin) {
    return null; // Will redirect in useEffect
  }

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        Loading Round {roundNumber} users...
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
          <h3 style={{ margin: 0, color: "#064f28" }}>Admin: Round {roundNumber} Points</h3>
          <p style={{ margin: 5, color: "#666" }}>
            Manage manual points for players assigned to Round {roundNumber}.
          </p>
          <p style={{ margin: 5, color: "#888", fontSize: 14 }}>
            <strong>Note:</strong> Only users assigned to batches in this round are shown here. 
            To assign users to rounds, go to Admin Dashboard → create batches → assign users to batches.
          </p>
        </div>
      </div>

      {/* Bulk Actions */}
      <div style={{ marginBottom: 20, padding: 16, backgroundColor: "#f8fffa", borderRadius: 8, border: "1px solid #e6f3ea" }}>
        <h4 style={{ margin: 0, color: "#064f28" }}>Bulk Actions</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <button onClick={selectAll} style={{ padding: '6px 12px', background:'#0ea5e9', color:'#fff', border:'none', borderRadius:4 }}>Select All</button>
          <button onClick={deselectAll} style={{ padding: '6px 12px', background:'#6b7280', color:'#fff', border:'none', borderRadius:4 }}>Deselect All</button>
          <span style={{ color: '#666' }}>{selectedUsers.size} users selected</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <label style={{ fontWeight: 500 }}>Set points to:</label>
          <input
            type="number"
            min="0"
            value={bulkPoints}
            onChange={(e) => setBulkPoints(parseInt(e.target.value) || 0)}
            style={{ width: 80, padding: "6px 8px", border: "2px solid #10b981", borderRadius: 4, fontSize: 14, textAlign: "center" }}
          />
          <button onClick={applyBulkPoints} style={{ padding: '6px 12px', background:'#059669', color:'#fff', border:'none', borderRadius:4 }}>Apply to Selected</button>
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
                <th style={{ padding: 12, fontWeight: 600, width: 40 }}>
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === users.length && users.length > 0}
                    onChange={(e) => e.target.checked ? selectAll() : deselectAll()}
                  />
                </th>
                <th style={{ padding: 12, fontWeight: 600 }}>#</th>
                <th style={{ padding: 12, fontWeight: 600 }}>Player</th>
                <th style={{ padding: 12, fontWeight: 600 }}>Batch</th>
                <th style={{ padding: 12, fontWeight: 600 }}>Country</th>
                <th style={{ padding: 12, fontWeight: 600 }}>Current Points</th>
                <th style={{ padding: 12, fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => (
                <tr key={user._id} style={{ borderBottom: "1px solid #f1f6f1" }}>
                  <td style={{ padding: 12 }}>
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user._id)}
                      onChange={() => toggleUserSelection(user._id)}
                    />
                  </td>
                  <td style={{ padding: 12 }}>{idx + 1}</td>
                  <td style={{ padding: 12 }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{user.displayName || user.username.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                    </div>
                  </td>
                  <td style={{ padding: 12 }}>
                    {user.assignedBatch ? (
                      <span style={{ fontWeight: 500, color: '#064f28' }}>{user.assignedBatch.name}</span>
                    ) : (
                      <span style={{ color: '#999' }}>No batch</span>
                    )}
                  </td>
                  <td style={{ padding: 12 }}>{user.country || 'N/A'}</td>
                  <td style={{ padding: 12 }}>
                    <span style={{ fontWeight: 700, color: '#064f28' }}>{user.points || 0}</span>
                  </td>
                  <td style={{ padding: 12 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => updateUserPoints(user._id, (user.points || 0) + 1)} style={{ padding: '4px 8px', background:'#10b981', color:'#fff', border:'none', borderRadius:4, fontSize:12 }}>+1</button>
                      <button onClick={() => updateUserPoints(user._id, (user.points || 0) - 1)} style={{ padding: '4px 8px', background:'#ef4444', color:'#fff', border:'none', borderRadius:4, fontSize:12 }}>-1</button>
                      <button onClick={() => updateUserPoints(user._id, 0)} style={{ padding: '4px 8px', background:'#6b7280', color:'#fff', border:'none', borderRadius:4, fontSize:12 }}>Reset</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 20, padding: 12, backgroundColor: "#f8fffa", borderRadius: 8, border: "1px solid #e6f3ea" }}>
        <h4 style={{ margin: 0, color: "#064f28" }}>Admin Instructions</h4>
        <ul style={{ margin: 8, paddingLeft: 20, color: "#666" }}>
          <li><strong>User Assignment:</strong> Users appear here automatically when assigned to batches in this round</li>
          <li><strong>To assign users:</strong> Go to Admin Dashboard → create round → create batches → assign users to batches</li>
          <li><strong>Point Management:</strong> Use checkboxes to select multiple users for bulk actions</li>
          <li><strong>Bulk Actions:</strong> Set bulk points value and apply to all selected users</li>
          <li><strong>Quick Adjustments:</strong> Use +1/-1 buttons for individual point changes</li>
          <li><strong>Reset:</strong> Reset button sets points to 0</li>
          <li><strong>Auto-save:</strong> All changes are saved immediately</li>
        </ul>
      </div>
    </div>
  );
}