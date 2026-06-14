import React, { useEffect, useState } from "react";
import api from '../api';
import { useNavigate } from "react-router-dom";

const styles = {
  page: { 
    padding: 20, 
    fontFamily: "Inter, Arial, sans-serif",
    minHeight: "100vh",
    background: "#f6fff6"
  },
  header: { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 15
  },
  title: { 
    fontSize: 28, 
    fontWeight: 800, 
    color: "#072b05",
    margin: 0
  },
  backBtn: {
    padding: "10px 16px",
    background: "#6c757d",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600
  },
  searchContainer: {
    marginBottom: 20,
    display: "flex",
    gap: 10,
    flexWrap: "wrap"
  },
  searchInput: {
    flex: 1,
    minWidth: "200px",
    padding: "12px 16px",
    borderRadius: 8,
    border: "1px solid #d6f0d6",
    fontSize: 14,
    fontFamily: "Inter, Arial, sans-serif"
  },
  tableContainer: {
    background: "#fff",
    padding: 16,
    borderRadius: 10,
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    overflowX: "auto"
  },
  table: { 
    width: "100%", 
    borderCollapse: "collapse",
    fontSize: 14
  },
  tableHeader: { 
    background: "#f9fafb",
    position: "sticky",
    top: 0,
    zIndex: 1
  },
  th: { 
    padding: "12px 8px", 
    textAlign: "left", 
    fontWeight: 600,
    color: "#374151",
    borderBottom: "2px solid #e5e7eb",
    fontSize: 13
  },
  tableRow: { 
    borderBottom: "1px solid #f3f4f6",
    transition: "background-color 0.2s"
  },
  tableRowHover: {
    background: "#f9fafb"
  },
  td: { 
    padding: "12px 8px", 
    verticalAlign: "middle",
    fontSize: 13
  },
  usernameCell: {
    display: "flex",
    alignItems: "center",
    gap: 6
  },
  onlineIndicator: {
    color: "#10b981",
    fontSize: 8
  },
  roleTag: {
    padding: "4px 8px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 500
  },
  statusTag: {
    padding: "4px 8px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 500
  },
  assignmentTag: {
    padding: "4px 8px",
    background: "#fef3c7",
    color: "#d97706",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 500
  },
  smallBtn: { 
    padding: "6px 8px", 
    background: "#0ea5e9", 
    color: "#fff", 
    border: "none", 
    borderRadius: 6, 
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500
  },
  input: { 
    padding: 8, 
    borderRadius: 8, 
    marginTop: 8, 
    border: "1px solid #e6f1e6", 
    width: "100%",
    fontFamily: "Inter, Arial, sans-serif"
  },
  primaryBtn: { 
    padding: "8px 12px", 
    background: "#0b6623", 
    color: "#fff", 
    border: "none", 
    borderRadius: 8, 
    cursor: "pointer", 
    marginTop: 8,
    fontWeight: 600
  },
  secondaryBtn: { 
    padding: "8px 12px", 
    background: "#f0f9f0", 
    color: "#064f28", 
    border: "1px solid #d6f0d6", 
    borderRadius: 8, 
    cursor: "pointer",
    fontWeight: 600
  },
  loading: {
    textAlign: "center",
    padding: 40,
    fontSize: 16,
    color: "#666"
  },
  noResults: {
    textAlign: "center",
    padding: 30,
    color: "#888"
  },
  statCard: {
    display: "flex",
    gap: 20,
    marginBottom: 20,
    flexWrap: "wrap"
  },
  stat: {
    background: "#fff",
    padding: 16,
    borderRadius: 10,
    flex: 1,
    minWidth: 200,
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 800,
    color: "#0b6623"
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5
  }
};

export default function AdminUsersPage() {
  const nav = useNavigate();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    country: "",
    lichessUsername: "",
    chessComUsername: "",
    email: ""
  });
  const [showCreateUser, setShowCreateUser] = useState(false);
  // Column sorting. key = user field, direction = 'asc' | 'desc'.
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers(searchTerm);
  }, [users, searchTerm]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/users');
      const usersArr = Array.isArray(res?.data) ? res.data : [];
      setUsers(usersArr);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        nav("/login?role=admin");
      } else {
        alert("Failed to fetch users: " + (err.response?.data?.message || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = (term) => {
    if (!term.trim()) {
      setFilteredUsers(users);
      return;
    }
    const lowerTerm = term.toLowerCase();
    const filtered = users.filter(user =>
      user.username?.toLowerCase().includes(lowerTerm) ||
      user.displayName?.toLowerCase().includes(lowerTerm) ||
      user.email?.toLowerCase().includes(lowerTerm) ||
      user.country?.toLowerCase().includes(lowerTerm) ||
      user.lichessUsername?.toLowerCase().includes(lowerTerm) ||
      user.chessComUsername?.toLowerCase().includes(lowerTerm)
    );
    setFilteredUsers(filtered);
  };

  const startEditingUser = (user) => {
    setEditingUser(user._id);
    setEditingData({
      username: user.username,
      displayName: user.displayName || "",
      role: user.role || "user",
      age: user.age || "",
      country: user.country || "",
      timeZone: user.timeZone || "",
      lichessUsername: user.lichessUsername || "",
      chessComUsername: user.chessComUsername || "",
      password: ""
    });
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setEditingData({});
  };

  const editUser = async (userId) => {
    try {
      if (!editingData.username) return alert("Username required");
      await api.put(`/api/admin/users/${userId}`, {
        username: editingData.username,
        displayName: editingData.displayName,
        role: editingData.role,
        age: editingData.age,
        country: editingData.country,
        timeZone: editingData.timeZone,
        lichessUsername: editingData.lichessUsername,
        chessComUsername: editingData.chessComUsername,
        password: editingData.password || undefined
      });
      alert("User updated successfully");
      setEditingUser(null);
      setEditingData({});
      fetchUsers();
    } catch (err) {
      alert("Edit user failed: " + (err?.response?.data?.message || err.message));
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await api.delete(`/api/admin/users/${userId}`);
      alert("User deleted successfully");
      fetchUsers();
    } catch (err) {
      alert("Delete user failed: " + (err?.response?.data?.message || err.message));
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    try {
      const {
        username,
        password,
        confirmPassword,
        displayName,
        country,
        lichessUsername,
        chessComUsername,
        email
      } = newUser;
      if (!username || !password) return alert("Username and password are required.");
      if (password !== confirmPassword) return alert("Passwords do not match.");
      const res = await api.post(`/api/admin/users`, {
        username,
        password,
        displayName,
        country,
        lichessUsername,
        chessComUsername,
        email: email || undefined
      });
      alert("User created: " + res.data.username);
      setNewUser({
        username: "",
        password: "",
        confirmPassword: "",
        displayName: "",
        age: "",
        country: "",
        lichessUsername: "",
        chessComUsername: "",
        email: ""
      });
      fetchUsers();
    } catch (err) {
      alert("Create user failed: " + (err?.response?.data?.message || err.message));
    }
  };

  const isGuestUser = (u) => u.role === 'guest';

  const onlineCount = users.filter(u => u.isCurrentlyOnline).length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const eliteCount = users.filter(u => u.role === 'elite').length;
  const guestCount = users.filter(isGuestUser).length;

  // ── Sorting ────────────────────────────────────────────────────────────────
  const requestSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      // First click: Status defaults to online-first; everything else ascending.
      return { key, direction: key === 'isCurrentlyOnline' ? 'desc' : 'asc' };
    });
  };

  const sortUsers = (list) => {
    if (!sortConfig.key) return list;
    const { key, direction } = sortConfig;
    const dir = direction === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      if (key === 'isCurrentlyOnline') {
        const an = a.isCurrentlyOnline ? 1 : 0;
        const bn = b.isCurrentlyOnline ? 1 : 0;
        return direction === 'desc' ? bn - an : an - bn; // desc = online first
      }
      if (key === 'createdAt') {
        return (new Date(a.createdAt || 0) - new Date(b.createdAt || 0)) * dir;
      }
      if (key === 'age') {
        return ((Number(a.age) || 0) - (Number(b.age) || 0)) * dir;
      }
      const av = (a[key] ?? '').toString().toLowerCase();
      const bv = (b[key] ?? '').toString().toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  };

  const sortArrow = (key) =>
    sortConfig.key === key ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : '';

  const sortableTh = (label, key) => (
    <th
      style={{ ...styles.th, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
      onClick={() => requestSort(key)}
      title="Click to sort"
    >
      {label}{sortArrow(key)}
    </th>
  );

  const renderHeaderRow = () => (
    <tr style={styles.tableHeader}>
      {sortableTh('Username', 'username')}
      {sortableTh('Display Name', 'displayName')}
      {sortableTh('Role', 'role')}
      {sortableTh('Age', 'age')}
      {sortableTh('Country', 'country')}
      {sortableTh('Time Zone', 'timeZone')}
      {sortableTh('Lichess', 'lichessUsername')}
      {sortableTh('Chess.com', 'chessComUsername')}
      {sortableTh('Status', 'isCurrentlyOnline')}
      <th style={styles.th}>Assigned Round</th>
      <th style={styles.th}>Assigned Batch</th>
      {sortableTh('Created', 'createdAt')}
      <th style={styles.th}>Actions</th>
    </tr>
  );

  const renderUserRow = (user) => (
    <tr key={user._id} style={styles.tableRow}>
      <td style={styles.td}>
        {editingUser === user._id ? (
          <input
            value={editingData.username}
            onChange={(e) => setEditingData({...editingData, username: e.target.value})}
            style={{ ...styles.input, width: "100%", marginTop: 0 }}
          />
        ) : (
          <div style={styles.usernameCell}>
            <strong>{user.username}</strong>
            {user.isCurrentlyOnline && <span style={styles.onlineIndicator}>●</span>}
          </div>
        )}
      </td>
      <td style={styles.td}>
        {editingUser === user._id ? (
          <input
            value={editingData.displayName}
            onChange={(e) => setEditingData({...editingData, displayName: e.target.value})}
            style={{ ...styles.input, width: "100%", marginTop: 0 }}
          />
        ) : (
          user.displayName || '-'
        )}
      </td>
      <td style={styles.td}>
        {editingUser === user._id ? (
          <select
            value={editingData.role}
            onChange={(e) => setEditingData({...editingData, role: e.target.value})}
            style={{ ...styles.input, width: "100%", marginTop: 0 }}
          >
            <option value="user">user</option>
            <option value="elite">elite</option>
            <option value="admin">admin</option>
            <option value="guest">guest</option>
          </select>
        ) : (
          <span style={{
            ...styles.roleTag,
            background: user.role === 'admin' ? '#fee2e2' : user.role === 'elite' ? '#fefce8' : user.role === 'guest' ? '#ede9fe' : '#f0f9ff',
            color: user.role === 'admin' ? '#dc2626' : user.role === 'elite' ? '#d97706' : user.role === 'guest' ? '#7c3aed' : '#2563eb'
          }}>
            {user.role}
          </span>
        )}
      </td>
      <td style={styles.td}>
        {editingUser === user._id ? (
          <input
            type="number"
            value={editingData.age}
            onChange={(e) => setEditingData({...editingData, age: e.target.value})}
            style={{ ...styles.input, width: "100%", marginTop: 0 }}
          />
        ) : (
          user.age || '-'
        )}
      </td>
      <td style={styles.td}>
        {editingUser === user._id ? (
          <input
            value={editingData.country}
            onChange={(e) => setEditingData({...editingData, country: e.target.value})}
            style={{ ...styles.input, width: "100%", marginTop: 0 }}
          />
        ) : (
          user.country || '-'
        )}
      </td>
      <td style={styles.td}>
        {editingUser === user._id ? (
          <input
            value={editingData.timeZone}
            onChange={(e) => setEditingData({...editingData, timeZone: e.target.value})}
            style={{ ...styles.input, width: "100%", marginTop: 0 }}
          />
        ) : (
          user.timeZone || '-'
        )}
      </td>
      <td style={styles.td}>
        {editingUser === user._id ? (
          <input
            value={editingData.lichessUsername}
            onChange={(e) => setEditingData({...editingData, lichessUsername: e.target.value})}
            style={{ ...styles.input, width: "100%", marginTop: 0 }}
          />
        ) : (
          user.lichessUsername ? (
            <a
              href={`https://lichess.org/@/${user.lichessUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0ea5e9' }}
            >
              {user.lichessUsername}
            </a>
          ) : '-'
        )}
      </td>
      <td style={styles.td}>
        {editingUser === user._id ? (
          <input
            value={editingData.chessComUsername}
            onChange={(e) => setEditingData({...editingData, chessComUsername: e.target.value})}
            style={{ ...styles.input, width: "100%", marginTop: 0 }}
          />
        ) : (
          user.chessComUsername ? (
            <a
              href={`https://chess.com/member/${user.chessComUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#10b981' }}
            >
              {user.chessComUsername}
            </a>
          ) : '-'
        )}
      </td>
      <td style={styles.td}>
        <span style={{
          ...styles.statusTag,
          background: user.isCurrentlyOnline ? '#dcfce7' : '#f3f4f6',
          color: user.isCurrentlyOnline ? '#059669' : '#6b7280'
        }}>
          {user.isCurrentlyOnline ? 'Online' : 'Offline'}
        </span>
      </td>
      <td style={styles.td}>
        {user.assignedRounds && user.assignedRounds.length > 0 ? (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {user.assignedRounds.map((roundId, idx) => (
              <span key={idx} style={styles.assignmentTag}>
                Round {idx + 1}
              </span>
            ))}
          </div>
        ) : '-'}
      </td>
      <td style={styles.td}>
        {user.assignedBatch ? (
          <span style={styles.assignmentTag}>Batch {user.assignedBatch}</span>
        ) : '-'}
      </td>
      <td style={styles.td}>
        <div style={{ fontSize: 12 }}>
          {new Date(user.createdAt).toLocaleDateString()}
          <div style={{ color: '#888', fontSize: 11 }}>
            {new Date(user.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </td>
      <td style={styles.td}>
        {editingUser === user._id ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input
              type="password"
              placeholder="New password (optional)"
              value={editingData.password}
              onChange={(e) => setEditingData({...editingData, password: e.target.value})}
              style={{ ...styles.input, width: "100%", marginTop: 0 }}
            />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => editUser(user._id)} style={styles.primaryBtn}>Save</button>
              <button onClick={cancelEditing} style={styles.secondaryBtn}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              onClick={() => startEditingUser(user)}
              style={{ ...styles.smallBtn, background: "#f59e0b" }}
            >
              Edit
            </button>
            <button
              onClick={() => deleteUser(user._id)}
              style={{ ...styles.smallBtn, background: "#dc2626" }}
            >
              Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  );

  const renderTable = (list, emptyMsg) => (
    list.length === 0 ? (
      <div style={styles.noResults}>{emptyMsg}</div>
    ) : (
      <table style={styles.table}>
        <thead>{renderHeaderRow()}</thead>
        <tbody>{list.map(renderUserRow)}</tbody>
      </table>
    )
  );

  const registeredUsers = sortUsers(filteredUsers.filter(u => !isGuestUser(u)));
  const guestUsers = sortUsers(filteredUsers.filter(isGuestUser));

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>👥 User Management</h1>
        <button onClick={() => nav('/admin')} style={styles.backBtn}>← Back to Dashboard</button>
      </div>

      <div style={styles.statCard}>
        <div style={styles.stat}>
          <div style={styles.statNumber}>{users.length}</div>
          <div style={styles.statLabel}>Total Users</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statNumber}>{onlineCount}</div>
          <div style={styles.statLabel}>Online Now</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statNumber}>{adminCount}</div>
          <div style={styles.statLabel}>Admins</div>
        </div>
        <div style={styles.stat}>
          <div style={{ ...styles.statNumber, color: '#d97706' }}>{eliteCount}</div>
          <div style={styles.statLabel}>Elite</div>
        </div>
        <div style={styles.stat}>
          <div style={{ ...styles.statNumber, color: '#7c3aed' }}>{guestCount}</div>
          <div style={styles.statLabel}>Guests</div>
        </div>
      </div>

      <div style={{ marginBottom: 20, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <h2 style={{ marginTop: 0, marginBottom: 0, color: '#0f172a' }}>Create New User</h2>
          <button
            type="button"
            onClick={() => setShowCreateUser(prev => !prev)}
            style={{
              ...styles.secondaryBtn,
              background: showCreateUser ? '#f8fafc' : '#0b6623',
              color: showCreateUser ? '#064f28' : '#fff',
              border: showCreateUser ? '1px solid #d6f0d6' : 'none'
            }}
          >
            {showCreateUser ? 'Collapse' : 'Expand'}
          </button>
        </div>
        {showCreateUser ? (
          <form onSubmit={createUser} style={{ display: 'grid', gap: 12 }}>
            <input
            placeholder="username"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            style={styles.input}
          />
          <input
            type="password"
            placeholder="password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            style={styles.input}
            autoComplete="new-password"
          />
          <input
            type="password"
            placeholder="confirm password"
            value={newUser.confirmPassword}
            onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
            style={styles.input}
            autoComplete="new-password"
          />
          <input
            placeholder="display name"
            value={newUser.displayName}
            onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
            style={styles.input}
          />
          <input
            placeholder="country"
            value={newUser.country}
            onChange={(e) => setNewUser({ ...newUser, country: e.target.value })}
            style={styles.input}
          />
          <input
            placeholder="lichess username"
            value={newUser.lichessUsername}
            onChange={(e) => setNewUser({ ...newUser, lichessUsername: e.target.value })}
            style={styles.input}
          />
          <input
            placeholder="chess.com username"
            value={newUser.chessComUsername}
            onChange={(e) => setNewUser({ ...newUser, chessComUsername: e.target.value })}
            style={styles.input}
          />
          <input
            type="email"
            placeholder="user email (optional)"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            style={styles.input}
          />
          <button type="submit" style={styles.primaryBtn}>Create User</button>
          </form>
        ) : (
          <div style={{ color: '#64748b', fontSize: 14, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
            Create user form is collapsed. Click expand to add a new user.
          </div>
        )}
      </div>
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search by username, name, email, country, or Lichess username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {loading ? (
        <div style={styles.tableContainer}>
          <div style={styles.loading}>Loading users...</div>
        </div>
      ) : (
      <>
      {/* Registered users */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 10px' }}>
        <h2 style={{ ...styles.title, fontSize: 20, margin: 0 }}>Registered Users</h2>
        <span style={{ color: '#64748b', fontSize: 13 }}>({registeredUsers.length})</span>
      </div>
      <div style={styles.tableContainer}>
        {registeredUsers.length === 0 ? (
          <div style={styles.noResults}>
            {searchTerm ? "No registered users match your search" : "No registered users found"}
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              {renderHeaderRow()}
            </thead>
            <tbody>
              {registeredUsers.map(user => (
                <tr key={user._id} style={styles.tableRow}>
                  <td style={styles.td}>
                    {editingUser === user._id ? (
                      <input 
                        value={editingData.username} 
                        onChange={(e) => setEditingData({...editingData, username: e.target.value})} 
                        style={{ ...styles.input, width: "100%", marginTop: 0 }}
                      />
                    ) : (
                      <div style={styles.usernameCell}>
                        <strong>{user.username}</strong>
                        {user.isCurrentlyOnline && <span style={styles.onlineIndicator}>●</span>}
                      </div>
                    )}
                  </td>
                  <td style={styles.td}>
                    {editingUser === user._id ? (
                      <input 
                        value={editingData.displayName} 
                        onChange={(e) => setEditingData({...editingData, displayName: e.target.value})} 
                        style={{ ...styles.input, width: "100%", marginTop: 0 }}
                      />
                    ) : (
                      user.displayName || '-'
                    )}
                  </td>
                  <td style={styles.td}>
                    {editingUser === user._id ? (
                      <select 
                        value={editingData.role} 
                        onChange={(e) => setEditingData({...editingData, role: e.target.value})} 
                        style={{ ...styles.input, width: "100%", marginTop: 0 }}
                      >
                        <option value="user">user</option>
                        <option value="elite">elite</option>
                        <option value="admin">admin</option>
                      </select>
                    ) : (
                      <span style={{
                        ...styles.roleTag,
                        background: user.role === 'admin' ? '#fee2e2' : user.role === 'elite' ? '#fefce8' : '#f0f9ff',
                        color: user.role === 'admin' ? '#dc2626' : user.role === 'elite' ? '#d97706' : '#2563eb'
                      }}>
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>
                    {editingUser === user._id ? (
                      <input 
                        type="number"
                        value={editingData.age} 
                        onChange={(e) => setEditingData({...editingData, age: e.target.value})} 
                        style={{ ...styles.input, width: "100%", marginTop: 0 }}
                      />
                    ) : (
                      user.age || '-'
                    )}
                  </td>
                  <td style={styles.td}>
                    {editingUser === user._id ? (
                      <input 
                        value={editingData.country} 
                        onChange={(e) => setEditingData({...editingData, country: e.target.value})} 
                        style={{ ...styles.input, width: "100%", marginTop: 0 }}
                      />
                    ) : (
                      user.country || '-'
                    )}
                  </td>
                  <td style={styles.td}>
                    {editingUser === user._id ? (
                      <input 
                        value={editingData.timeZone} 
                        onChange={(e) => setEditingData({...editingData, timeZone: e.target.value})} 
                        style={{ ...styles.input, width: "100%", marginTop: 0 }}
                      />
                    ) : (
                      user.timeZone || '-'
                    )}
                  </td>
                  <td style={styles.td}>
                    {editingUser === user._id ? (
                      <input 
                        value={editingData.lichessUsername} 
                        onChange={(e) => setEditingData({...editingData, lichessUsername: e.target.value})} 
                        style={{ ...styles.input, width: "100%", marginTop: 0 }}
                      />
                    ) : (
                      user.lichessUsername ? (
                        <a 
                          href={`https://lichess.org/@/${user.lichessUsername}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: '#0ea5e9' }}
                        >
                          {user.lichessUsername}
                        </a>
                      ) : '-'
                    )}
                  </td>
                  <td style={styles.td}>
                    {editingUser === user._id ? (
                      <input 
                        value={editingData.chessComUsername} 
                        onChange={(e) => setEditingData({...editingData, chessComUsername: e.target.value})} 
                        style={{ ...styles.input, width: "100%", marginTop: 0 }}
                      />
                    ) : (
                      user.chessComUsername ? (
                        <a 
                          href={`https://chess.com/member/${user.chessComUsername}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: '#10b981' }}
                        >
                          {user.chessComUsername}
                        </a>
                      ) : '-'
                    )}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusTag,
                      background: user.isCurrentlyOnline ? '#dcfce7' : '#f3f4f6',
                      color: user.isCurrentlyOnline ? '#059669' : '#6b7280'
                    }}>
                      {user.isCurrentlyOnline ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {user.assignedRounds && user.assignedRounds.length > 0 ? (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {user.assignedRounds.map((roundId, idx) => (
                          <span key={idx} style={styles.assignmentTag}>
                            Round {idx + 1}
                          </span>
                        ))}
                      </div>
                    ) : '-'}
                  </td>
                  <td style={styles.td}>
                    {user.assignedBatch ? (
                      <span style={styles.assignmentTag}>Batch {user.assignedBatch}</span>
                    ) : '-'}
                  </td>
                  <td style={styles.td}>
                    <div style={{ fontSize: 12 }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                      <div style={{ color: '#888', fontSize: 11 }}>
                        {new Date(user.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    {editingUser === user._id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <input 
                          type="password"
                          placeholder="New password (optional)"
                          value={editingData.password} 
                          onChange={(e) => setEditingData({...editingData, password: e.target.value})} 
                          style={{ ...styles.input, width: "100%", marginTop: 0 }}
                        />
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button onClick={() => editUser(user._id)} style={styles.primaryBtn}>Save</button>
                          <button onClick={cancelEditing} style={styles.secondaryBtn}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button 
                          onClick={() => startEditingUser(user)} 
                          style={{ ...styles.smallBtn, background: "#f59e0b" }}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => deleteUser(user._id)} 
                          style={{ ...styles.smallBtn, background: "#dc2626" }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Guest users */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 10px' }}>
        <h2 style={{ ...styles.title, fontSize: 20, margin: 0 }}>Guest Users</h2>
        <span style={{ color: '#64748b', fontSize: 13 }}>({guestUsers.length})</span>
      </div>
      <div style={styles.tableContainer}>
        {renderTable(guestUsers, searchTerm ? 'No guest users match your search' : 'No guest users found')}
      </div>
      </>
      )}
    </div>
  );
}
