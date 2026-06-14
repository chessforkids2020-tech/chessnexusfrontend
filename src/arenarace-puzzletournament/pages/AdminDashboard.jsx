// src/pages/AdminDashboard.jsx
import React, { useEffect, useState, useRef } from "react";
import api from "../api";
import socket from "../socket";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const API = import.meta.env.VITE_API_URL;

const styles = {
  page: { padding: 18, paddingTop: 90, fontFamily: "Inter, Arial, sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  logo: { fontSize: 20, color: "#072b05", fontWeight: 800 },
  grid: { display: "grid", gridTemplateColumns: "360px 1fr 360px", gap: 14 },
  col: { background: "#f6fff6", padding: 12, borderRadius: 10 },
  colWide: { background: "#f6fff6", padding: 12, borderRadius: 10, overflow: "auto" },
  card: { background: "#fff", padding: 10, borderRadius: 10, marginBottom: 12, boxShadow: "0 8px 20px rgba(0,0,0,0.03)" },
  input: { padding: 8, borderRadius: 8, marginTop: 8, border: "1px solid #e6f1e6", width: "100%" },
  primaryBtn: { padding: "8px 12px", background: "#0b6623", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", marginTop: 8 },
  secondaryBtn: { padding: "8px 12px", background: "#f0f9f0", color: "#064f28", border: "1px solid #d6f0d6", borderRadius: 8, cursor: "pointer" },
  smallBtn: { padding: "6px 8px", background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" },
  roundCard: { background: "#fff", padding: 12, borderRadius: 10, marginBottom: 12 },
  roundCardCollapsed: { background: "#fff", padding: 12, borderRadius: 10, marginBottom: 12, cursor: "pointer", transition: "all 0.2s ease" },
  roundCardExpanded: { background: "#fff", padding: 12, borderRadius: 10, marginBottom: 12, cursor: "default", transition: "all 0.2s ease" },
  roundHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" },
  batchCard: { background: "#f8fff8", padding: 10, borderRadius: 8, border: "1px solid #eaf7ea", width: 260, cursor: "pointer", transition: "all 0.2s ease" },
  batchCardCollapsed: { background: "#f8fff8", padding: 10, borderRadius: 8, border: "1px solid #eaf7ea", minWidth: 200, cursor: "pointer", transition: "all 0.2s ease" },
  batchCardExpanded: { background: "#f8fff8", padding: 10, borderRadius: 8, border: "1px solid #eaf7ea", width: 260, cursor: "default", transition: "all 0.2s ease" },
  batchHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  batchTitle: { fontWeight: 700, flex: 1 },
  expandIcon: { fontSize: 12, color: "#64748b", marginLeft: 8 },
  userChip: { padding: "4px 8px", background: "#fff", borderRadius: 6, border: "1px solid #e6f1e6" },
  monitorWrap: { marginTop: 16, background: "#fff", padding: 12, borderRadius: 10 },
  monitor: { maxHeight: 260, overflow: "auto" },
  usersTableWrap: { 
    marginTop: 16, 
    background: "#fff", 
    padding: 16, 
    borderRadius: 10,
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
  },
  tableContainer: { 
    overflow: "auto", 
    maxHeight: "600px",
    border: "1px solid #e5e7eb",
    borderRadius: 8
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
  lichessLink: {
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: 500
  },
  dateCell: {
    display: "flex",
    flexDirection: "column"
  },
  timeCell: {
    fontSize: 11,
    color: "#6b7280"
  }
};

const roundsBackupStyles = {
  roundsBackupWrap: {
    marginTop: 32,
    background: "#fff",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
  },
  roundCardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16
  },
  roundBackupCard: {
    background: '#f8fffa',
    border: '2px solid #e6f3ea',
    borderRadius: 12,
    padding: 16,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
    }
  },
  roundCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  roundNumber: {
    background: '#064f28',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600
  },
  roundCardInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  roundStat: {
    textAlign: 'center'
  },
  statNumber: {
    display: 'block',
    fontSize: 24,
    fontWeight: 700,
    color: '#064f28'
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: 500
  },
  roundStatus: {
    fontSize: 14
  },
  roundCardDate: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center'
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20
  },
  batchCardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 16
  },
  batchBackupCard: {
    background: '#fff',
    border: '2px solid #e6f3ea',
    borderRadius: 12,
    padding: 16,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
    }
  },
  batchCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  batchCardStats: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  batchStat: {
    textAlign: 'center'
  },
  batchStatNumber: {
    display: 'block',
    fontSize: 18,
    fontWeight: 600,
    color: '#064f28'
  },
  batchStatLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: 500
  },
  batchCardUsers: {
    borderTop: '1px solid #e6f3ea',
    paddingTop: 12
  },
  miniUserChip: {
    background: '#f0f9f0',
    color: '#064f28',
    padding: '2px 6px',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 500
  },
  resultsTableWrap: {
    background: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
  }
};

// Merge styles
Object.assign(styles, roundsBackupStyles);

function AdminDashboard() {
  const nav = useNavigate();
  const { logout } = useAuth();
  const [users, setUsers] = useState([]);
  // Contact messages state
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [puzzles, setPuzzles] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRound, setSelectedRound] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const [monitorEvents, setMonitorEvents] = useState([]);
  const monitorRef = useRef([]);
  const [expandedBatches, setExpandedBatches] = useState({}); // Track which batches are expanded
  const [expandedRounds, setExpandedRounds] = useState({}); // Track which rounds are expanded
  // Signup & payment requests state
  const [pendingSignupCount, setPendingSignupCount] = useState(0);
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);
  const [forms, setForms] = useState({
    newUserName: "",
    newUserPass: "",
    newUserConfirmPass: "",
    newUserDisplay: "",
    newUserAge: "",
    newUserCountry: "",
    newUserTimeZone: "",
    newUserLichess: "",
    newUserParentEmail: "",
    puzzleTitle: "",
    puzzleFen: "",
    puzzleSolution: "",
    puzzleMoveLimit: 10,
    puzzleWhoPlayed: "",
    puzzleDifficulty: "medium",
    puzzleRating: "1200",
    roundName: "",
    roundNumber: 1,
    batchName: "",
    batchDuration: 300,
    assignUserIds: [],
    assignPuzzleIds: [],
    selectedRoundForBatch: "",
    selectedBatchForAssign: "",
    editingRound: null,
    editingBatch: null,
    editRoundName: "",
    editRoundNumber: "",
    editBatchName: "",
    editBatchDuration: "",
    editingUser: null,
    editUserName: "",
    editUserDisplay: "",
    editUserRole: "",
    editUserAge: "",
    editUserCountry: "",
    editUserTimeZone: "",
    editUserLichess: "",
    editUserPass: "",
  });

  useEffect(() => {
    fetchAll();
    fetchSignupRequestsCount();
    fetchPendingPaymentCount();

    // subscribe to socket monitor room
    socket.emit("monitor:subscribe");
    const handleMove = (m) => pushMonitor({ type: "move", payload: m, ts: Date.now() });
    const handleAuto = (m) => pushMonitor({ type: "auto-move", payload: m, ts: Date.now() });
    const handleRoundStart = (m) => pushMonitor({ type: "round-start", payload: m, ts: Date.now() });
    const handleRoundStop = (m) => pushMonitor({ type: "round-stop", payload: m, ts: Date.now() });
    const handleNewSignupRequest = () => {
      fetchSignupRequestsCount();
    };
    const handlePendingPaymentCount = (count) => {
      setPendingPaymentCount(typeof count === 'object' ? (count.count || 0) : (count || 0));
    };

    socket.on("puzzle:move", handleMove);
    socket.on("puzzle:auto-move", handleAuto);
    socket.on("round:started", handleRoundStart);
    socket.on("round:stopped", handleRoundStop);
    socket.on("newSignupRequest", handleNewSignupRequest);
    socket.on('admin:pendingPaymentCount', handlePendingPaymentCount);

    return () => {
      socket.off("puzzle:move", handleMove);
      socket.off("puzzle:auto-move", handleAuto);
      socket.off("round:started", handleRoundStart);
      socket.off("round:stopped", handleRoundStop);
      socket.off("newSignupRequest", handleNewSignupRequest);
      socket.off('admin:pendingPaymentCount', handlePendingPaymentCount);
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    fetchContactMessages();
  }, []);

  // Fetch contact messages from public API
  async function fetchContactMessages() {
    setLoadingMessages(true);
    try {
      const res = await api.get(`/api/public/contact`);
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }

  // Fetch signup & pending payment counts
  async function fetchSignupRequestsCount() {
    try {
      const res = await api.get(`/api/admin/signup-requests/count`);
      setPendingSignupCount(res.data.count || 0);
    } catch (err) {
    }
  }

  async function fetchPendingPaymentCount() {
    try {
      const res = await api.get(`/api/admin/attendance/payment-requests/count`);
      setPendingPaymentCount(res.data.count || 0);
    } catch (err) {
    }
  }

  const pushMonitor = (entry) => {
    monitorRef.current = [entry, ...monitorRef.current].slice(0, 200);
    setMonitorEvents([...monitorRef.current]);
  };

  async function fetchAll() {
    setLoading(true);
    try {
      const [uRes, pRes, rRes, aRes] = await Promise.all([
        api.get(`/api/admin/users`),
        api.get(`/api/admin/puzzles`),
        api.get(`/api/admin/rounds`),
        api.get(`/api/admin/activity`).catch(() => ({ data: [] }))
      ]);
      const usersArr = Array.isArray(uRes?.data) ? uRes.data : [];
      const puzzlesArr = Array.isArray(pRes?.data) ? pRes.data : [];
      const roundsArr = Array.isArray(rRes?.data) ? rRes.data : [];
      const activityArr = Array.isArray(aRes?.data) ? aRes.data : [];
      setUsers(usersArr);
      setPuzzles(puzzlesArr);
      setRounds(roundsArr);
      setActivity(activityArr);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        alert("Session expired. Please login again as admin.");
        nav("/login?role=admin");
      } else {
        alert("Failed to fetch admin data: " + (err.response?.data?.message || err.message));
      }
    } finally {
      setLoading(false);
    }
  }

  // ---------------- Admin actions ----------------

  async function createUser() {
    try {
      const { newUserName, newUserPass, newUserConfirmPass, newUserDisplay, newUserAge, newUserCountry, newUserTimeZone, newUserLichess, newUserParentEmail } = forms;
      if (!newUserName || !newUserPass) return alert("username + password required");
      if (newUserPass !== newUserConfirmPass) return alert("Passwords do not match");
      const res = await api.post(`/api/admin/users`, {
        username: newUserName,
        password: newUserPass,
        displayName: newUserDisplay,
        age: newUserAge,
        country: newUserCountry,
        timeZone: newUserTimeZone,
        lichessUsername: newUserLichess,
        parentEmail: newUserParentEmail
      }, { withCredentials: true });
      alert("User created: " + res.data.username + (newUserParentEmail ? "\nWelcome email sent to " + newUserParentEmail : ""));
      setForms({ 
        ...forms, 
        newUserName: "", 
        newUserPass: "", 
        newUserConfirmPass: "",
        newUserDisplay: "",
        newUserAge: "",
        newUserCountry: "",
        newUserTimeZone: "",
        newUserLichess: "",
        newUserParentEmail: ""
      });
      fetchAll();
    } catch (err) {
      alert("Create user failed: " + (err?.response?.data?.message || err.message));
    }
  }

  async function createPuzzle() {
    try {
      const { puzzleTitle, puzzleFen, puzzleSolution, puzzleMoveLimit, puzzleWhoPlayed, puzzleDifficulty, puzzleRating } = forms;
      if (!puzzleTitle) return alert("title required");
      // solution: comma separated moves
      const solution = (puzzleSolution || "").split(",").map(s => s.trim()).filter(Boolean);
      const res = await api.post(`/api/admin/puzzles`, { 
        title: puzzleTitle, 
        fen: puzzleFen, 
        solution, 
        moveLimit: puzzleMoveLimit || 10,
        whoPlayed: puzzleWhoPlayed,
        difficulty: puzzleDifficulty,
        rating: puzzleRating
      }, { withCredentials: true });
      alert("Puzzle created: " + res.data.title);
      setForms({ ...forms, puzzleTitle: "", puzzleFen: "", puzzleSolution: "", puzzleMoveLimit: 10, puzzleWhoPlayed: "", puzzleDifficulty: "medium", puzzleRating: "1200" });
      fetchAll();
    } catch (err) {
      alert("Create puzzle failed");
    }
  }

  async function createRound() {
    try {
      const { roundName, roundNumber } = forms;
      if (!roundName) return alert("round name required");
      await api.post(`/api/admin/rounds`, { name: roundName, number: parseInt(roundNumber || 1) });
      alert("Round created");
      setForms({ ...forms, roundName: "", roundNumber: 1 });
      fetchAll();
    } catch (err) {
      alert("Create round failed");
    }
  }

  async function createBatch(roundId) {
    try {
      const { batchName, batchDuration } = forms;
      if (!batchName) return alert("batch name required");
      await api.post(`/api/admin/rounds/${roundId}/batches`, { name: batchName, durationSec: parseInt(batchDuration || 5) * 60 });
      alert("Batch created");
      setForms({ ...forms, batchName: "", batchDuration: 5 });
      fetchAll();
    } catch (err) {
      alert("Create batch failed");
    }
  }

  async function assignUsersToBatch(batchId) {
    try {
      const userIds = (forms.assignUserIds || []).filter(Boolean);
      if (!userIds.length) return alert("Select at least one user to assign");
      await api.post(`/api/admin/batches/${batchId}/assign`, { userIds });
      alert("Users assigned to batch");
      setForms({ ...forms, assignUserIds: [] });
      fetchAll();
    } catch (err) {
      alert("Assign users failed");
    }
  }

  async function attachPuzzlesToBatch(batchId) {
    try {
      const puzzleIds = (forms.assignPuzzleIds || []).filter(Boolean);
      if (!puzzleIds.length) return alert("Select puzzles to attach");
      await api.post(`/api/admin/batches/${batchId}/puzzles`, { puzzleIds });
      alert("Puzzles attached");
      setForms({ ...forms, assignPuzzleIds: [] });
      fetchAll();
    } catch (err) {
      alert("Attach puzzles failed");
    }
  }

  async function startRound(roundId) {
    try {
      await api.post(`/api/admin/rounds/${roundId}/start`, {});
      alert("Round started");
      fetchAll();
    } catch (err) {
      alert("Start round failed");
    }
  }

  async function stopRound(roundId) {
    try {
      await api.post(`/api/admin/rounds/${roundId}/stop`, {});
      alert("Round stopped");
      fetchAll();
    } catch (err) {
      alert("Stop round failed");
    }
  }

  async function createRace() {
    try {
      const { raceTopic, raceTimeLimit } = forms;
      if (!raceTopic) return alert("Topic required");
      if (!raceTimeLimit || raceTimeLimit < 1) return alert("Valid time limit required");
      const res = await api.post(`/api/admin/arena`, { 
        topic: raceTopic, 
        timeLimit: parseInt(raceTimeLimit) 
      }, { withCredentials: true });
      alert("Race created: " + res.data.roomId);
      setForms({ ...forms, raceTopic: "", raceTimeLimit: 10 });
      fetchAll();
    } catch (err) {
      alert("Create race failed: " + (err?.response?.data?.error || err.message));
    }
  }

  async function startRace(roomId) {
    try {
      await api.post(`/api/admin/arena/start/${roomId}`, {});
      alert("Race started!");
      fetchAll();
    } catch (err) {
      alert("Start race failed: " + (err?.response?.data?.error || err.message));
    }
  }

  async function deleteRace(roomId) {
    if (!confirm("Are you sure you want to delete this race?")) return;
    try {
      await api.delete(`/api/admin/arena/delete/${roomId}`);
      alert("Race deleted successfully");
      fetchAll();
    } catch (err) {
      alert("Delete race failed: " + (err?.response?.data?.error || err.message));
    }
  }

  function viewLiveLeaderboard(roomId) {
    window.open(`/admin/arena/live/${roomId}`, '_blank');
  }

  function viewWaitingRoom(roomId) {
    window.open(`/admin/arena/waiting/${roomId}`, '_blank');
  }

  async function startBatch(batchId) {
    try {
      await api.post(`/api/admin/batches/${batchId}/start`, {});
      alert("Batch started");
      fetchAll();
    } catch (err) {
      alert("Start batch failed");
    }
  }

  async function stopBatch(batchId) {
    try {
      await api.post(`/api/admin/batches/${batchId}/stop`, {});
      alert("Batch stopped");
      fetchAll();
    } catch (err) {
      alert("Stop batch failed");
    }
  }

  // fetch detailed batch results (users and their puzzle scores)
  async function fetchBatchResults(batchId) {
    try {
      const res = await api.get(`/api/admin/batches/${batchId}/results`);
      setBatchResults(res.data);
    } catch (err) {
      alert("Fetch batch results failed: " + (err.response?.data?.message || err.message));
    }
  }

  async function editUser(userId) {
    try {
      const { editUserName, editUserDisplay, editUserRole, editUserAge, editUserCountry, editUserTimeZone, editUserLichess, editUserPass } = forms;
      if (!editUserName) return alert("Username required");
      await api.put(`/api/admin/users/${userId}`, {
        username: editUserName,
        displayName: editUserDisplay,
        role: editUserRole,
        age: editUserAge,
        country: editUserCountry,
        timeZone: editUserTimeZone,
        lichessUsername: editUserLichess,
        password: editUserPass || undefined
      }, { withCredentials: true });
      alert("User updated successfully");
      setForms({ ...forms, editingUser: null, editUserName: "", editUserDisplay: "", editUserRole: "", editUserAge: "", editUserCountry: "", editUserTimeZone: "", editUserLichess: "", editUserPass: "" });
      fetchAll();
    } catch (err) {
      alert("Edit user failed: " + (err?.response?.data?.message || err.message));
    }
  }

  async function deleteUser(userId) {
    if (!confirm("Are you sure you want to delete this user? This will remove all their scores and unassign them from any batches.")) return;
    try {
      await api.delete(`/api/admin/users/${userId}`);
      alert("User deleted successfully");
      fetchAll();
    } catch (err) {
      alert("Delete user failed: " + (err?.response?.data?.message || err.message));
    }
  }

  function startEditingUser(user) {
    setForms({
      ...forms,
      editingUser: user._id,
      editUserName: user.username,
      editUserDisplay: user.displayName || "",
      editUserRole: user.role || "user",
      editUserAge: user.age || "",
      editUserCountry: user.country || "",
      editUserTimeZone: user.timeZone || "",
      editUserLichess: user.lichessUsername || "",
      editUserPass: "",
    });
  }

  function cancelEditing() {
    setForms({
      ...forms,
      editingRound: null,
      editingBatch: null,
      editingUser: null,
      editRoundName: "",
      editRoundNumber: "",
      editBatchName: "",
      editBatchDuration: "",
      editUserName: "",
      editUserDisplay: "",
      editUserRole: "",
      editUserAge: "",
      editUserCountry: "",
      editUserTimeZone: "",
      editUserLichess: "",
      editUserPass: "",
    });
  }

  async function editRound(roundId) {
    try {
      const { editRoundName, editRoundNumber } = forms;
      if (!editRoundName) return alert("Round name required");
      await api.put(`/api/admin/rounds/${roundId}`, {
        name: editRoundName,
        number: parseInt(editRoundNumber)
      }, { withCredentials: true });
      alert("Round updated");
      setForms({ ...forms, editingRound: null, editRoundName: "", editRoundNumber: "" });
      fetchAll();
    } catch (err) {
      alert("Edit round failed");
    }
  }

  async function deleteRound(roundId) {
    if (!confirm("Are you sure you want to delete this round and all its batches? This will unassign all users.")) return;
    try {
      await api.delete(`/api/admin/rounds/${roundId}`);
      alert("Round deleted");
      fetchAll();
    } catch (err) {
      alert("Delete round failed");
    }
  }

  async function editBatch(batchId) {
    try {
      const { editBatchName, editBatchDuration } = forms;
      if (!editBatchName) return alert("Batch name required");
      await api.put(`/api/admin/batches/${batchId}`, {
        name: editBatchName,
        durationSec: parseInt(editBatchDuration) * 60
      }, { withCredentials: true });
      alert("Batch updated");
      setForms({ ...forms, editingBatch: null, editBatchName: "", editBatchDuration: "" });
      fetchAll();
    } catch (err) {
      alert("Edit batch failed");
    }
  }

  async function deleteBatch(batchId) {
    if (!confirm("Are you sure you want to delete this batch? This will unassign all users from it.")) return;
    try {
      await api.delete(`/api/admin/batches/${batchId}`);
      alert("Batch deleted");
      fetchAll();
    } catch (err) {
      alert("Delete batch failed");
    }
  }

  function startEditingRound(round) {
    setForms({
      ...forms,
      editingRound: round._id,
      editRoundName: round.name,
      editRoundNumber: round.number.toString()
    });
  }

  function startEditingBatch(batch) {
    setForms({
      ...forms,
      editingBatch: batch._id,
      editBatchName: batch.name,
      editBatchDuration: (batch.durationSec / 60).toString()
    });
  }

  // remove activity log, refresh
  async function refreshActivity() { fetchAll(); }

  // Toggle batch expansion
  function toggleBatchExpansion(batchId) {
    setExpandedBatches(prev => ({
      ...prev,
      [batchId]: !prev[batchId]
    }));
  }

  // Toggle round expansion
  function toggleRoundExpansion(roundId) {
    setExpandedRounds(prev => ({
      ...prev,
      [roundId]: !prev[roundId]
    }));
  }

  // ---------- UI ----------
  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.8;
              transform: scale(1.1);
            }
          }
        `}
      </style>
      <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.logo}>♛ Admin Dashboard</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button 
            style={{
              ...styles.secondaryBtn,
              position: 'relative',
              fontWeight: pendingSignupCount > 0 ? 600 : 400
            }} 
            onClick={() => nav('/admin/signup-requests')}
          >
            📬 Signup Requests
            {pendingSignupCount > 0 && (
              <span style={{
                position: 'absolute',
                top: -8,
                right: -8,
                background: '#ef4444',
                color: '#fff',
                borderRadius: '50%',
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                border: '2px solid white',
                animation: pendingSignupCount > 0 ? 'pulse 2s infinite' : 'none'
              }}>
                {pendingSignupCount}
              </span>
            )}
          </button>
          <button style={styles.secondaryBtn} onClick={async () => { await logout(); nav('/', { replace: true }); }}>Logout</button>
          <button style={styles.secondaryBtn} onClick={() => window.open('/stockfish-test', '_blank')}>🧪 Stockfish Test</button>
          <button style={styles.secondaryBtn} onClick={() => window.open('/racer', '_blank')}>🏎️ Racer</button>
          <button style={styles.secondaryBtn} onClick={() => nav('/admin/arena')}>🏁 Race Arena</button>
          <button style={styles.secondaryBtn} onClick={() => nav('/admin/studies')}>📚 Study Management</button>
          <button style={styles.secondaryBtn} onClick={() => nav('/admin/team-race')}>👥 Team Race</button>
          <button style={styles.secondaryBtn} onClick={() => nav('/chat')}>💬 Chat</button>
          <button style={styles.primaryBtn} onClick={fetchAll}>Refresh</button>
        </div>
      </div>

      <div style={styles.grid}>
        <section style={styles.col}>
          <h3 style={{ marginTop: 0 }}>Create / Manage</h3>

          <div style={styles.card}>
            <h4>New User</h4>
            <form onSubmit={(e) => { e.preventDefault(); createUser(); }}>
              <input placeholder="username" value={forms.newUserName} onChange={(e)=>setForms({...forms,newUserName:e.target.value})} style={styles.input}/>
              <input type="password" placeholder="password" value={forms.newUserPass} onChange={(e)=>setForms({...forms,newUserPass:e.target.value})} style={styles.input} autoComplete="new-password"/>
              <input type="password" placeholder="confirm password" value={forms.newUserConfirmPass} onChange={(e)=>setForms({...forms,newUserConfirmPass:e.target.value})} style={styles.input} autoComplete="new-password"/>
              <input placeholder="display name" value={forms.newUserDisplay} onChange={(e)=>setForms({...forms,newUserDisplay:e.target.value})} style={styles.input}/>
              <input type="number" placeholder="age" value={forms.newUserAge} onChange={(e)=>setForms({...forms,newUserAge:e.target.value})} style={styles.input}/>
              <input placeholder="country" value={forms.newUserCountry} onChange={(e)=>setForms({...forms,newUserCountry:e.target.value})} style={styles.input}/>
              <input placeholder="time zone (e.g., UTC+5, EST)" value={forms.newUserTimeZone} onChange={(e)=>setForms({...forms,newUserTimeZone:e.target.value})} style={styles.input}/>
              <input placeholder="lichess username" value={forms.newUserLichess} onChange={(e)=>setForms({...forms,newUserLichess:e.target.value})} style={styles.input}/>
              <input type="email" placeholder="parent/guardian email (for welcome email)" value={forms.newUserParentEmail} onChange={(e)=>setForms({...forms,newUserParentEmail:e.target.value})} style={styles.input}/>
              <div style={{ display:'flex', gap:8 }}>
                <button type="submit" style={styles.primaryBtn}>Create User</button>
              </div>
            </form>
          </div>

          <div style={styles.card}>
            <h4>New Puzzle</h4>
            <input placeholder="title" value={forms.puzzleTitle} onChange={(e)=>setForms({...forms,puzzleTitle:e.target.value})} style={styles.input}/>
            <input placeholder="fen (optional)" value={forms.puzzleFen} onChange={(e)=>setForms({...forms,puzzleFen:e.target.value})} style={styles.input}/>
            <input placeholder="solution moves (optional - leave blank for Stockfish)" value={forms.puzzleSolution} onChange={(e)=>setForms({...forms,puzzleSolution:e.target.value})} style={styles.input}/>
            <input placeholder="move limit (default: 10)" type="number" value={forms.puzzleMoveLimit || 10} onChange={(e)=>setForms({...forms,puzzleMoveLimit:parseInt(e.target.value) || 10})} style={styles.input}/>
            <input placeholder="Who played (e.g. Magnus vs Nepo)" value={forms.puzzleWhoPlayed} onChange={(e)=>setForms({...forms,puzzleWhoPlayed:e.target.value})} style={styles.input}/>
            <input 
              placeholder="Rating (800-2000+)" 
              type="number"
              value={forms.puzzleRating} 
              onChange={(e)=>setForms({...forms,puzzleRating:e.target.value})} 
              style={styles.input}
            />
            <select value={forms.puzzleDifficulty} onChange={(e)=>setForms({...forms,puzzleDifficulty:e.target.value})} style={styles.input}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <button onClick={createPuzzle} style={styles.primaryBtn}>Create Puzzle</button>
          </div>

          <div style={styles.card}>
            <h4>Create Round</h4>
            <input placeholder="Round name" value={forms.roundName} onChange={(e)=>setForms({...forms,roundName:e.target.value})} style={styles.input}/>
            <input type="number" placeholder="Round number" value={forms.roundNumber} onChange={(e)=>setForms({...forms,roundNumber:e.target.value})} style={styles.input}/>
            <button onClick={createRound} style={styles.primaryBtn}>Create Round</button>
          </div>

          <div style={styles.card}>
            <h4>Create Batch (choose round)</h4>
            <select style={styles.input} value={forms.selectedRoundForBatch} onChange={(e)=>setForms({...forms,selectedRoundForBatch:e.target.value})}>
              <option value="">Select round</option>
              {rounds.map(r => <option key={r._id} value={r._id}>{r.name} (#{r.number})</option>)}
            </select>
            <input placeholder="Batch name" value={forms.batchName} onChange={(e)=>setForms({...forms,batchName:e.target.value})} style={styles.input}/>
            <input placeholder="duration min" type="number" value={forms.batchDuration} onChange={(e)=>setForms({...forms,batchDuration:e.target.value})} style={styles.input}/>
            <button onClick={() => {
              if (!forms.selectedRoundForBatch) return alert("Choose a round first");
              createBatch(forms.selectedRoundForBatch);
            }} style={styles.primaryBtn}>Create Batch</button>
          </div>
        </section>

        <section style={styles.colWide}>
          <h3 style={{ marginTop: 0 }}>Rounds & Batches</h3>
          {loading && <div>Loading...</div>}
          {(Array.isArray(rounds) ? rounds : []).map(r => {
            const isRoundExpanded = expandedRounds[r._id];
            return (
            <div key={r._id} style={isRoundExpanded ? styles.roundCardExpanded : styles.roundCardCollapsed}>
              <div style={styles.roundHeader} onClick={() => !forms.editingRound && toggleRoundExpansion(r._id)}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={styles.expandIcon}>{isRoundExpanded ? '▼' : '▶'}</span>
                  {forms.editingRound === r._id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                      <input 
                        placeholder="Round name" 
                        value={forms.editRoundName} 
                        onChange={(e)=>setForms({...forms,editRoundName:e.target.value})} 
                        style={styles.input}
                      />
                      <input 
                        type="number" 
                        placeholder="Round number" 
                        value={forms.editRoundNumber} 
                        onChange={(e)=>setForms({...forms,editRoundNumber:e.target.value})} 
                        style={styles.input}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => editRound(r._id)} style={styles.primaryBtn}>Save</button>
                        <button onClick={cancelEditing} style={styles.secondaryBtn}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <strong>{r.name}</strong> — Round #{r.number} {r.isActive ? <span style={{ color: "#0b6623", fontWeight: 700, marginLeft: 8 }}>● active</span> : null}
                      <span style={{ fontSize: 12, color: "#64748b", marginLeft: 8 }}>({(Array.isArray(r.batches) ? r.batches : []).length} batches)</span>
                    </>
                  )}
                </div>
                {isRoundExpanded && forms.editingRound !== r._id && (
                  <div style={{ display: "flex", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => startEditingRound(r)} style={{ ...styles.smallBtn, background: "#f59e0b" }}>Edit</button>
                    <button onClick={() => deleteRound(r._id)} style={{ ...styles.smallBtn, background: "#dc2626" }}>Delete</button>
                    <button onClick={() => startRound(r._id)} style={styles.smallBtn}>Start Round</button>
                    <button onClick={() => stopRound(r._id)} style={styles.smallBtn}>Stop Round</button>
                  </div>
                )}
              </div>

              {isRoundExpanded && (
              <div style={{ marginTop: 10 }}>
                <strong>Batches:</strong>
                <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                  {(Array.isArray(r.batches) ? r.batches : []).map(b => {
                    const isExpanded = expandedBatches[b._id];
                    return (
                      <div 
                        key={b._id} 
                        style={isExpanded ? styles.batchCardExpanded : styles.batchCardCollapsed}
                      >
                        {forms.editingBatch === b._id ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                            <input 
                              placeholder="Batch name" 
                              value={forms.editBatchName} 
                              onChange={(e)=>setForms({...forms,editBatchName:e.target.value})} 
                              style={styles.input}
                            />
                            <input 
                              type="number" 
                              placeholder="Duration (min)" 
                              value={forms.editBatchDuration} 
                              onChange={(e)=>setForms({...forms,editBatchDuration:e.target.value})} 
                              style={styles.input}
                            />
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => editBatch(b._id)} style={styles.primaryBtn}>Save</button>
                              <button onClick={cancelEditing} style={styles.secondaryBtn}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={styles.batchHeader} onClick={() => toggleBatchExpansion(b._id)}>
                              <div style={styles.batchTitle}>
                                {b.name} {b.isActive ? <span style={{ color:"#0b6623" }}>●</span> : null}
                              </div>
                              <span style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
                            </div>
                            <div style={{ fontSize: 12, color: "#4b704b" }}>
                              Duration: {Math.ceil(b.durationSec / 60)} min • Users: {(b.users||[]).length} • Puzzles: {(b.puzzles||[]).length}
                            </div>
                            {isExpanded && (
                              <>
                                <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
                                  <button onClick={() => startEditingBatch(b)} style={{ ...styles.smallBtn, background: "#f59e0b" }}>Edit</button>
                                  <button onClick={() => deleteBatch(b._id)} style={{ ...styles.smallBtn, background: "#dc2626" }}>Delete</button>
                                  <button onClick={() => startBatch(b._id)} style={styles.smallBtn}>Start</button>
                                  <button onClick={() => stopBatch(b._id)} style={styles.smallBtn}>Stop</button>
                                  <button onClick={() => {
                                    // set batch to selected for assign operations
                                    setForms({...forms, selectedBatchForAssign: b._id});
                                    alert(`Selected batch ${b.name} for assignment. Use 'Assign Users' or 'Attach Puzzles' below.`);
                                  }} style={styles.smallBtn}>Select</button>
                                </div>
                                <div style={{ marginTop: 8 }}>
                                  <div style={{ fontSize: 12, color: "#374151" }}>Assigned users</div>
                                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                                    {Array.isArray(b.users) ? b.users.map(u => {
                                      const displayName = u.displayName || u.username.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                      return <div key={u._id} style={styles.userChip}>{displayName}</div>;
                                    }) : null}
                                  </div>
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    );
                  }) }
                </div>
              </div>
              )}
            </div>
          );
          })}
        </section>

        <section style={styles.col}>
          <h3 style={{ marginTop: 0 }}>Assignments</h3>

          <div style={styles.card}>
            <h4>Assign Users to Selected Batch</h4>
            <div style={{ fontSize: 13, color: "#475b47", marginBottom: 8 }}>Selected Batch ID: {forms.selectedBatchForAssign || <em>none</em>}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 500, minHeight: 300, overflow: "auto" }}>
              {(Array.isArray(users) ? users : []).map(u => (
                <label key={u._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 6, background: "#fff", borderRadius: 6 }}>
                  <div>{u.displayName || u.username.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                  <input type="checkbox" checked={(forms.assignUserIds||[]).includes(u._id)} onChange={(e) => {
                    const arr = new Set(forms.assignUserIds || []);
                    if (e.target.checked) arr.add(u._id); else arr.delete(u._id);
                    setForms({...forms, assignUserIds: [...arr]});
                  }}/>
                </label>
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              <button onClick={() => {
                if (!forms.selectedBatchForAssign) return alert("Select a batch first");
                assignUsersToBatch(forms.selectedBatchForAssign);
              }} style={styles.primaryBtn}>Assign Users</button>
            </div>
          </div>

          <div style={styles.card}>
            <h4>Attach Puzzles to Selected Batch</h4>
            <div style={{ fontSize: 13, color: "#475b47", marginBottom: 8 }}>Selected Batch ID: {forms.selectedBatchForAssign || <em>none</em>}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 500, minHeight: 300, overflow: "auto" }}>
              {(Array.isArray(puzzles) ? puzzles : []).map(p => (
                <label key={p._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 6, background: "#fff", borderRadius: 6 }}>
                  <div>{p.title}</div>
                  <input type="checkbox" checked={(forms.assignPuzzleIds||[]).includes(p._id)} onChange={(e) => {
                    const arr = new Set(forms.assignPuzzleIds || []);
                    if (e.target.checked) arr.add(p._id); else arr.delete(p._id);
                    setForms({...forms, assignPuzzleIds: [...arr]});
                  }}/>
                </label>
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              <button onClick={() => {
                if (!forms.selectedBatchForAssign) return alert("Select a batch first");
                attachPuzzlesToBatch(forms.selectedBatchForAssign);
              }} style={styles.primaryBtn}>Attach Puzzles</button>
            </div>
          </div>
        </section>
      </div>

      <div style={styles.monitorWrap}>
        <h4 style={{ marginTop: 0 }}>Live Monitor</h4>
        <div style={styles.monitor}>
          {monitorEvents.length === 0 ? <div style={{ color: "#6b7280" }}>No live events yet</div> :
            monitorEvents.map((m, i) => (
              <div key={i} style={{ padding: 8, borderBottom: "1px solid #eef7ee" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{m.type}</div>
                <pre style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>{JSON.stringify(m.payload)}</pre>
                <div style={{ fontSize: 11, color: "#9aa69a" }}>{new Date(m.ts).toLocaleString()}</div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Contact Messages Inbox - below live monitor */}
      <div style={{ ...styles.card, marginTop: 32, background: '#fffbe6', border: '1px solid #ffe58f' }}>
        <h3 style={{ margin: 0, color: '#ad8b00' }}>Contact Messages</h3>
        {loadingMessages ? (
          <div>Loading messages...</div>
        ) : messages.length === 0 ? (
          <div style={{ color: '#888', padding: 12 }}>No messages received yet.</div>
        ) : (
          <div style={{ maxHeight: 320, overflowY: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fffbe6' }}>
                  <th style={{ padding: 6, textAlign: 'left' }}>From</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>Email</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>Subject</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>Message</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>Date</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>Status</th>
                  <th style={{ padding: 6 }}></th>
                </tr>
              </thead>
              <tbody>
                {messages.map(msg => (
                  <tr key={msg._id} style={{ background: msg.read ? '#f6fff6' : '#fff1f0' }}>
                    <td style={{ padding: 6 }}>{msg.name}</td>
                    <td style={{ padding: 6 }}><a href={`mailto:${msg.email}`}>{msg.email}</a></td>
                    <td style={{ padding: 6 }}>{msg.subject || 'General'}</td>
                    <td style={{ padding: 6, maxWidth: 220, wordBreak: 'break-word' }}>{msg.message}</td>
                    <td style={{ padding: 6 }}>{new Date(msg.createdAt).toLocaleString()}</td>
                    <td style={{ padding: 6 }}>
                      {msg.read ? <span style={{ color: '#389e0d' }}>Read</span> : <span style={{ color: '#d4380d' }}>Unread</span>}
                    </td>
                    <td style={{ padding: 6 }}>
                      {!msg.read && (
                        <button onClick={() => markMessageRead(msg._id)} style={{ ...styles.smallBtn, background: '#ffe58f', color: '#ad8b00' }}>Mark Read</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{
        ...styles.card,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        marginTop: 20,
        background: "linear-gradient(135deg, #f0f9ff 0%, #dcfce7 100%)",
        border: "2px solid #0b6623"
      }}>
        <div>
          <h3 style={{ marginTop: 0, marginBottom: 4, color: "#072b05" }}>👥 User Management</h3>
          <p style={{ margin: 0, color: "#666", fontSize: 14 }}>
            Total users registered: <strong style={{ color: "#0b6623", fontSize: 16 }}>{users.length}</strong>
            {users.filter(u => u.isCurrentlyOnline).length > 0 && (
              <span style={{ marginLeft: 20, color: "#10b981" }}>
                Currently online: <strong>{users.filter(u => u.isCurrentlyOnline).length}</strong>
              </span>
            )}
          </p>
        </div>
        <button 
          onClick={() => nav('/admin/users')}
          style={{
            padding: "10px 20px",
            background: "#0b6623",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14
          }}
        >
          View All Users →
        </button>
      </div>

      <div style={{
        ...styles.card,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        marginTop: 20,
        background: "linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)",
        border: "2px solid #d97706"
      }}>
        <div>
          <h3 style={{ marginTop: 0, marginBottom: 4, color: "#92400e" }}>📚 Attendance Management</h3>
          <p style={{ margin: 0, color: "#666", fontSize: 14 }}>
            Manage student attendance and payments
          </p>
        </div>
        <button 
          onClick={() => nav('/admin/attendance')}
          style={{
            position: 'relative',
            padding: "10px 20px",
            background: "#d97706",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14
          }}
        >
          Teacher Attendance →
          {pendingPaymentCount > 0 && (
            <span style={{
              position: 'absolute',
              top: -8,
              right: -8,
              background: '#ef4444',
              color: '#fff',
              borderRadius: '50%',
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              border: '2px solid white',
              animation: pendingPaymentCount > 0 ? 'pulse 2s infinite' : 'none'
            }}>
              {pendingPaymentCount > 9 ? '9+' : pendingPaymentCount}
            </span>
          )}
        </button>
      </div>

      {/* Rounds Backup Section */}
      <div style={styles.roundsBackupWrap}>
        <h3 style={{ marginTop: 0, marginBottom: 16, color: "#072b05" }}>Rounds Backup</h3>
        
        {!selectedRound ? (
          // Round Cards View
          <div style={styles.roundCardsGrid}>
            {rounds.map(round => (
              <div 
                key={round._id} 
                style={styles.roundBackupCard}
                onClick={() => setSelectedRound(round)}
              >
                <div style={styles.roundCardHeader}>
                  <h4 style={{ margin: 0, color: "#064f28" }}>{round.name}</h4>
                  <span style={styles.roundNumber}>#{round.number}</span>
                </div>
                <div style={styles.roundCardInfo}>
                  <div style={styles.roundStat}>
                    <span style={styles.statNumber}>{round.batches?.length || 0}</span>
                    <span style={styles.statLabel}>Batches</span>
                  </div>
                  <div style={styles.roundStatus}>
                    {round.isActive ? (
                      <span style={{ color: "#059669", fontWeight: 600 }}>● Active</span>
                    ) : (
                      <span style={{ color: "#6b7280" }}>Inactive</span>
                    )}
                  </div>
                </div>
                <div style={styles.roundCardDate}>
                  Created: {new Date(round.createdAt || Date.now()).toLocaleDateString()}
                </div>
              </div>
            ))}
            {rounds.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                <div>No rounds found</div>
                <div style={{ fontSize: 12, marginTop: 8 }}>
                  Create rounds and batches, assign users and puzzles to see backup data.
                </div>
              </div>
            )}
          </div>
        ) : !selectedBatch ? (
          // Batch Selection View
          <div>
            <div style={styles.backButton}>
              <button 
                onClick={() => {
                  setSelectedRound(null);
                  setSelectedBatch(null);
                  setBatchResults([]);
                }} 
                style={styles.secondaryBtn}
              >
                ← Back to Rounds
              </button>
              <h4 style={{ margin: 0, color: "#064f28" }}>
                {selectedRound.name} - Select Batch
              </h4>
            </div>
            
            <div style={styles.batchCardsGrid}>
              {selectedRound.batches?.map(batch => (
                <div 
                  key={batch._id} 
                  style={styles.batchBackupCard}
                  onClick={() => {
                    setSelectedBatch(batch);
                    fetchBatchResults(batch._id);
                  }}
                >
                  <div style={styles.batchCardHeader}>
                    <h5 style={{ margin: 0, color: "#064f28" }}>{batch.name}</h5>
                    {batch.isActive && <span style={{ color: "#059669", fontWeight: 600 }}>●</span>}
                  </div>
                  <div style={styles.batchCardStats}>
                    <div style={styles.batchStat}>
                      <span style={styles.batchStatNumber}>{batch.users?.length || 0}</span>
                      <span style={styles.batchStatLabel}>Users</span>
                    </div>
                    <div style={styles.batchStat}>
                      <span style={styles.batchStatNumber}>{batch.puzzles?.length || 0}</span>
                      <span style={styles.batchStatLabel}>Puzzles</span>
                    </div>
                    <div style={styles.batchStat}>
                      <span style={styles.batchStatNumber}>{Math.ceil((batch.durationSec || 0) / 60)}</span>
                      <span style={styles.batchStatLabel}>Min</span>
                    </div>
                  </div>
                  <div style={styles.batchCardUsers}>
                    <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>Assigned Users:</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {batch.users?.slice(0, 3).map(user => (
                        <span key={user._id} style={styles.miniUserChip}>
                          {user.displayName || user.username}
                        </span>
                      ))}
                      {batch.users?.length > 3 && (
                        <span style={styles.miniUserChip}>+{batch.users.length - 3} more</span>
                      )}
                    </div>
                  </div>
                </div>
              )) || (
                <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                  No batches in this round
                </div>
              )}
            </div>
          </div>
        ) : (
          // Batch Results View
          <div>
            <div style={styles.backButton}>
              <button 
                onClick={() => {
                  setSelectedBatch(null);
                  setBatchResults([]);
                }} 
                style={styles.secondaryBtn}
              >
                ← Back to Batches
              </button>
              <h4 style={{ margin: 0, color: "#064f28" }}>
                {selectedRound.name} → {selectedBatch.name} - Results
              </h4>
            </div>
            
            {/* Leaderboard summary for batch */}
            <div style={{ marginBottom: 32, background: '#f8fff8', borderRadius: 10, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#064f28' }}>Batch Leaderboard</h4>
              {batchResults.length === 0 ? (
                <div style={{ color: '#6b7280', fontSize: 14 }}>No results yet for this batch.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                  <thead>
                    <tr style={{ background: '#f0f9f0' }}>
                      <th style={{ textAlign: 'left', padding: '8px 6px' }}>Rank</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px' }}>User</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px' }}>Total Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Aggregate total score per user
                      const userScores = {};
                      batchResults.forEach(r => {
                        if (!r.user || r._empty) return;
                        const uid = r.user._id;
                        if (!userScores[uid]) userScores[uid] = { user: r.user, total: 0 };
                        userScores[uid].total += r.score || 0;
                      });
                      // Convert to array and sort by total desc
                      const sorted = Object.values(userScores).sort((a, b) => b.total - a.total);
                      return sorted.map((entry, idx) => (
                        <tr key={entry.user._id} style={{ background: idx % 2 === 0 ? '#fff' : '#f6fff6' }}>
                          <td style={{ padding: '8px 6px', fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ padding: '8px 6px' }}>{entry.user.displayName || entry.user.username.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                          <td style={{ padding: '8px 6px', fontWeight: 600 }}>{entry.total}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              )}
            </div>
            <div style={styles.resultsTableWrap}>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={styles.th}>User</th>
                      <th style={styles.th}>Puzzle</th>
                      <th style={styles.th}>Moves</th>
                      <th style={styles.th}>Final Position</th>
                      <th style={styles.th}>Time</th>
                      <th style={styles.th}>Result</th>
                      <th style={styles.th}>Points</th>
                      <th style={styles.th}>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchResults.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                          <div>No results found for this batch</div>
                          <div style={{ fontSize: 12, marginTop: 8 }}>
                            Users need to attempt puzzles for data to appear here.
                            <br />
                            Check: 1) Users assigned to batch, 2) Puzzles attached to batch, 3) Users completed puzzles
                          </div>
                        </td>
                      </tr>
                    ) : (
                      batchResults.map((result, index) => (
                        <tr key={`result-${index}`} style={styles.tableRow}>
                          <td style={styles.td}>
                            <div style={{ fontWeight: 600 }}>
                              {result.user.displayName || result.user.username.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </div>

                          </td>
                          <td style={styles.td}>
                            <div style={{ fontWeight: 500 }}>
                              {result.puzzle?.title || 'N/A'}
                            </div>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>
                              {result.puzzle?.difficulty || 'normal'}
                            </div>
                          </td>
                          <td style={styles.td}>
                            <div style={{ fontFamily: 'monospace', fontSize: 13 }}>
                              {result._empty ? 'No attempt' : (
                                <div>
                                  <div><strong>Complete Game:</strong> {result.allMoves?.join(' ') || 'No complete record'}</div>
                                  <div style={{ fontSize: 11, color: '#666' }}><strong>User Only:</strong> {result.moves?.join(' ') || 'No user moves'}</div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={styles.td}>
                            <div style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>
                              {result._empty ? 'N/A' : (result.finalPosition || 'No position')}
                            </div>
                          </td>
                          <td style={styles.td}>
                            {result._empty ? 'N/A' : (result.timeTakenSec ? `${result.timeTakenSec}s` : '-')}
                          </td>
                          <td style={styles.td}>
                            {result._empty ? (
                              <span style={{
                                padding: "4px 8px",
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 500,
                                background: '#f3f4f6',
                                color: '#6b7280'
                              }}>
                                Not attempted
                              </span>
                            ) : (
                              <span style={{
                                padding: "4px 8px",
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 500,
                                background: result.correct ? '#dcfce7' : '#fee2e2',
                                color: result.correct ? '#059669' : '#dc2626'
                              }}>
                                {result.correct ? '✓ Correct' : '✗ Incorrect'}
                              </span>
                            )}
                          </td>
                          <td style={styles.td}>
                            <span style={{
                              fontWeight: 600,
                              color: result._empty ? '#6b7280' : (result.score > 0 ? '#064f28' : '#dc2626')
                            }}>
                              {result._empty ? '0' : `+${result.score}`}
                            </span>
                          </td>
                          <td style={styles.td}>
                            {result._empty ? (
                              <span style={{ color: '#6b7280', fontSize: 12 }}>Not attempted</span>
                            ) : (
                              <div style={styles.dateCell}>
                                {new Date(result.createdAt).toLocaleDateString()}
                                <div style={styles.timeCell}>
                                  {new Date(result.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

export default AdminDashboard;
