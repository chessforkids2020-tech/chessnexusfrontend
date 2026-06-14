import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from '../api';

const styles = {
  page: {
    padding: 20,
    minHeight: "100vh",
    fontFamily: "Inter, Arial, sans-serif",
    background: "#f6fff6"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 12
  },
  title: {
    margin: 0,
    fontSize: 32,
    fontWeight: 800,
    color: "#072b05"
  },
  backBtn: {
    padding: "10px 16px",
    background: "#0b6623",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '360px 1fr 360px',
    gap: 14
  },
  col: {
    background: '#f6fff6',
    padding: 12,
    borderRadius: 10
  },
  colWide: {
    background: '#f6fff6',
    padding: 12,
    borderRadius: 10,
    overflow: 'auto'
  },
  card: {
    background: '#fff',
    padding: 16,
    borderRadius: 12,
    boxShadow: '0 8px 20px rgba(0,0,0,0.05)',
    marginBottom: 14
  },
  input: {
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    border: '1px solid #e6f1e6',
    width: '100%'
  },
  primaryBtn: {
    padding: '8px 12px',
    background: '#0b6623',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    marginTop: 8,
    fontWeight: 600
  },
  secondaryBtn: {
    padding: '8px 12px',
    background: '#f0f9f0',
    color: '#064f28',
    border: '1px solid #d6f0d6',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600
  },
  smallBtn: {
    padding: '6px 8px',
    background: '#0ea5e9',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500
  },
  roundHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer'
  },
  batchHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  batchTitle: {
    fontWeight: 700
  },
  expandIcon: {
    fontSize: 12,
    color: '#64748b'
  },
  userChip: {
    padding: '4px 8px',
    background: '#fff',
    borderRadius: 6,
    border: '1px solid #e6f1e6'
  },
  roundCardCollapsed: {
    background: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  roundCardExpanded: {
    background: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    cursor: 'default',
    transition: 'all 0.2s ease'
  },
  batchCardCollapsed: {
    background: '#f8fff8',
    padding: 10,
    borderRadius: 8,
    border: '1px solid #e6f3ea',
    minWidth: 200,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  batchCardExpanded: {
    background: '#f8fff8',
    padding: 10,
    borderRadius: 8,
    border: '1px solid #e6f3ea',
    width: 260,
    cursor: 'default',
    transition: 'all 0.2s ease'
  }
};

export default function AdminContestPage() {
  const nav = useNavigate();
  const [users, setUsers] = useState([]);
  const [puzzles, setPuzzles] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRounds, setExpandedRounds] = useState({});
  const [expandedBatches, setExpandedBatches] = useState({});
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const [forms, setForms] = useState({
    puzzleTitle: '',
    puzzleFen: '',
    puzzleSolution: '',
    puzzleMoveLimit: 10,
    puzzleWhoPlayed: '',
    puzzleDifficulty: 'medium',
    puzzleRating: '1200',
    roundName: '',
    roundNumber: 1,
    selectedRoundForBatch: '',
    batchName: '',
    batchDuration: 300,
    selectedBatchForAssign: '',
    assignUserIds: [],
    assignPuzzleIds: [],
    puzzleSearch: '',
    puzzleLimit: 200,
    editingRound: null,
    editRoundName: '',
    editRoundNumber: '',
    editingBatch: null,
    editBatchName: '',
    editBatchDuration: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, pRes, rRes] = await Promise.all([
        api.get('/api/admin/users'),
        api.get('/api/admin/puzzles'),
        api.get('/api/admin/rounds')
      ]);
      setUsers(Array.isArray(uRes.data) ? uRes.data : []);
      setPuzzles(Array.isArray(pRes.data) ? pRes.data : []);
      setRounds(Array.isArray(rRes.data) ? rRes.data : []);
    } catch (err) {
      alert('Failed to load contest data: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const toggleRoundExpansion = (roundId) => {
    setExpandedRounds(prev => ({ ...prev, [roundId]: !prev[roundId] }));
  };

  const toggleBatchExpansion = (batchId) => {
    setExpandedBatches(prev => ({ ...prev, [batchId]: !prev[batchId] }));
  };

  async function createPuzzle() {
    try {
      const { puzzleTitle, puzzleFen, puzzleSolution, puzzleMoveLimit, puzzleWhoPlayed, puzzleDifficulty, puzzleRating } = forms;
      if (!puzzleTitle) return alert('title required');
      const solution = (puzzleSolution || '').split(',').map(s => s.trim()).filter(Boolean);
      const res = await api.post('/api/admin/puzzles', {
        title: puzzleTitle,
        fen: puzzleFen,
        solution,
        moveLimit: puzzleMoveLimit || 10,
        whoPlayed: puzzleWhoPlayed,
        difficulty: puzzleDifficulty,
        rating: puzzleRating
      });
      alert('Puzzle created: ' + res.data.title);
      setForms({ ...forms, puzzleTitle: '', puzzleFen: '', puzzleSolution: '', puzzleMoveLimit: 10, puzzleWhoPlayed: '', puzzleDifficulty: 'medium', puzzleRating: '1200' });
      fetchData();
    } catch (err) {
      alert('Create puzzle failed');
    }
  }

  async function createRound() {
    try {
      const { roundName, roundNumber } = forms;
      if (!roundName) return alert('round name required');
      await api.post('/api/admin/rounds', { name: roundName, number: parseInt(roundNumber || 1) });
      alert('Round created');
      setForms({ ...forms, roundName: '', roundNumber: 1 });
      fetchData();
    } catch (err) {
      alert('Create round failed');
    }
  }

  async function createBatch(roundId) {
    try {
      const { batchName, batchDuration } = forms;
      if (!batchName) return alert('batch name required');
      await api.post(`/api/admin/rounds/${roundId}/batches`, { name: batchName, durationSec: parseInt(batchDuration || 5) * 60 });
      alert('Batch created');
      setForms({ ...forms, batchName: '', batchDuration: 300 });
      fetchData();
    } catch (err) {
      alert('Create batch failed');
    }
  }

  async function assignUsersToBatch(batchId) {
    try {
      const userIds = (forms.assignUserIds || []).filter(Boolean);
      if (!userIds.length) return alert('Select at least one user to assign');
      await api.post(`/api/admin/batches/${batchId}/assign`, { userIds });
      alert('Users assigned to batch');
      setForms({ ...forms, assignUserIds: [] });
      fetchData();
    } catch (err) {
      alert('Assign users failed');
    }
  }

  async function attachPuzzlesToBatch(batchId) {
    try {
      const puzzleIds = (forms.assignPuzzleIds || []).filter(Boolean);
      if (!puzzleIds.length) return alert('Select puzzles to attach');
      await api.post(`/api/admin/batches/${batchId}/puzzles`, { puzzleIds });
      alert('Puzzles attached');
      setForms({ ...forms, assignPuzzleIds: [] });
      fetchData();
    } catch (err) {
      alert('Attach puzzles failed');
    }
  }

  async function startRound(roundId) {
    try {
      await api.post(`/api/admin/rounds/${roundId}/start`, {});
      alert('Round started');
      fetchData();
    } catch (err) {
      alert('Start round failed');
    }
  }

  async function stopRound(roundId) {
    try {
      await api.post(`/api/admin/rounds/${roundId}/stop`, {});
      alert('Round stopped');
      fetchData();
    } catch (err) {
      alert('Stop round failed');
    }
  }

  async function editRound(roundId) {
    try {
      const { editRoundName, editRoundNumber } = forms;
      if (!editRoundName) return alert('Round name required');
      await api.put(`/api/admin/rounds/${roundId}`, {
        name: editRoundName,
        number: parseInt(editRoundNumber)
      });
      alert('Round updated');
      setForms({ ...forms, editingRound: null, editRoundName: '', editRoundNumber: '' });
      fetchData();
    } catch (err) {
      alert('Edit round failed');
    }
  }

  async function deleteRound(roundId) {
    if (!confirm('Are you sure you want to delete this round and all its batches? This will unassign all users.')) return;
    try {
      await api.delete(`/api/admin/rounds/${roundId}`);
      alert('Round deleted');
      fetchData();
    } catch (err) {
      alert('Delete round failed');
    }
  }

  async function editBatch(batchId) {
    try {
      const { editBatchName, editBatchDuration } = forms;
      if (!editBatchName) return alert('Batch name required');
      await api.put(`/api/admin/batches/${batchId}`, {
        name: editBatchName,
        durationSec: parseInt(editBatchDuration) * 60
      });
      alert('Batch updated');
      setForms({ ...forms, editingBatch: null, editBatchName: '', editBatchDuration: '' });
      fetchData();
    } catch (err) {
      alert('Edit batch failed');
    }
  }

  async function deleteBatch(batchId) {
    if (!confirm('Are you sure you want to delete this batch? This will unassign all users from it.')) return;
    try {
      await api.delete(`/api/admin/batches/${batchId}`);
      alert('Batch deleted');
      fetchData();
    } catch (err) {
      alert('Delete batch failed');
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

  async function fetchBatchResults(batchId) {
    try {
      const res = await api.get(`/api/admin/batches/${batchId}/results`);
      setBatchResults(res.data);
    } catch (err) {
      alert('Fetch batch results failed: ' + (err.response?.data?.message || err.message));
    }
  }

  function cancelEditing() {
    setForms({
      ...forms,
      editingRound: null,
      editingBatch: null,
      editRoundName: '',
      editRoundNumber: '',
      editBatchName: '',
      editBatchDuration: ''
    });
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>🏆 Contest</h1>
        <button style={styles.backBtn} onClick={() => nav('/admin')}>
          ← Back to Dashboard
        </button>
      </div>

      <div style={styles.grid}>
        <section style={styles.col}>
          <h3 style={{ marginTop: 0 }}>Create / Manage</h3>

          <div style={styles.card}>
            <h4 style={{ marginTop: 0 }}>New Puzzle</h4>
            <input placeholder="title" value={forms.puzzleTitle} onChange={(e)=>setForms({...forms,puzzleTitle:e.target.value})} style={styles.input}/>
            <input placeholder="fen (optional)" value={forms.puzzleFen} onChange={(e)=>setForms({...forms,puzzleFen:e.target.value})} style={styles.input}/>
            <input placeholder="solution moves (optional - leave blank for Stockfish)" value={forms.puzzleSolution} onChange={(e)=>setForms({...forms,puzzleSolution:e.target.value})} style={styles.input}/>
            <input placeholder="move limit (default: 10)" type="number" value={forms.puzzleMoveLimit || 10} onChange={(e)=>setForms({...forms,puzzleMoveLimit:parseInt(e.target.value) || 10})} style={styles.input}/>
            <input placeholder="Who played (e.g. Magnus vs Nepo)" value={forms.puzzleWhoPlayed} onChange={(e)=>setForms({...forms,puzzleWhoPlayed:e.target.value})} style={styles.input}/>
            <input placeholder="Rating (800-2000+)" type="number" value={forms.puzzleRating} onChange={(e)=>setForms({...forms,puzzleRating:e.target.value})} style={styles.input}/>
            <select value={forms.puzzleDifficulty} onChange={(e)=>setForms({...forms,puzzleDifficulty:e.target.value})} style={styles.input}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <button onClick={createPuzzle} style={styles.primaryBtn}>Create Puzzle</button>
          </div>

          <div style={styles.card}>
            <h4 style={{ marginTop: 0 }}>Create Round</h4>
            <input placeholder="Round name" value={forms.roundName} onChange={(e)=>setForms({...forms,roundName:e.target.value})} style={styles.input}/>
            <input type="number" placeholder="Round number" value={forms.roundNumber} onChange={(e)=>setForms({...forms,roundNumber:e.target.value})} style={styles.input}/>
            <button onClick={createRound} style={styles.primaryBtn}>Create Round</button>
          </div>

          <div style={styles.card}>
            <h4 style={{ marginTop: 0 }}>Create Batch (choose round)</h4>
            <select style={styles.input} value={forms.selectedRoundForBatch} onChange={(e)=>setForms({...forms,selectedRoundForBatch:e.target.value})}>
              <option value="">Select round</option>
              {rounds.map(r => <option key={r._id} value={r._id}>{r.name} (#{r.number})</option>)}
            </select>
            <input placeholder="Batch name" value={forms.batchName} onChange={(e)=>setForms({...forms,batchName:e.target.value})} style={styles.input}/>
            <input placeholder="duration min" type="number" value={forms.batchDuration} onChange={(e)=>setForms({...forms,batchDuration:e.target.value})} style={styles.input}/>
            <button onClick={() => {
              if (!forms.selectedRoundForBatch) return alert('Choose a round first');
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={styles.expandIcon}>{isRoundExpanded ? '▼' : '▶'}</span>
                    {forms.editingRound === r._id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                        <input placeholder="Round name" value={forms.editRoundName} onChange={(e)=>setForms({...forms,editRoundName:e.target.value})} style={styles.input}/>
                        <input type="number" placeholder="Round number" value={forms.editRoundNumber} onChange={(e)=>setForms({...forms,editRoundNumber:e.target.value})} style={styles.input}/>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => editRound(r._id)} style={styles.primaryBtn}>Save</button>
                          <button onClick={cancelEditing} style={styles.secondaryBtn}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <strong>{r.name}</strong> — Round #{r.number} {r.isActive ? <span style={{ color: '#0b6623', fontWeight: 700, marginLeft: 8 }}>● active</span> : null}
                        <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>({(Array.isArray(r.batches) ? r.batches : []).length} batches)</span>
                      </>
                    )}
                  </div>
                  {isRoundExpanded && forms.editingRound !== r._id && (
                    <div style={{ display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => startEditingRound(r)} style={{ ...styles.smallBtn, background: '#f59e0b' }}>Edit</button>
                      <button onClick={() => deleteRound(r._id)} style={{ ...styles.smallBtn, background: '#dc2626' }}>Delete</button>
                      <button onClick={() => startRound(r._id)} style={styles.smallBtn}>Start Round</button>
                      <button onClick={() => stopRound(r._id)} style={styles.smallBtn}>Stop Round</button>
                    </div>
                  )}
                </div>

                {isRoundExpanded && (
                  <div style={{ marginTop: 10 }}>
                    <strong>Batches:</strong>
                    <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                      {(Array.isArray(r.batches) ? r.batches : []).map(b => {
                        const isExpanded = expandedBatches[b._id];
                        return (
                          <div key={b._id} style={isExpanded ? styles.batchCardExpanded : styles.batchCardCollapsed}>
                            {forms.editingBatch === b._id ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                                <input placeholder="Batch name" value={forms.editBatchName} onChange={(e)=>setForms({...forms,editBatchName:e.target.value})} style={styles.input}/>
                                <input type="number" placeholder="Duration (min)" value={forms.editBatchDuration} onChange={(e)=>setForms({...forms,editBatchDuration:e.target.value})} style={styles.input}/>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button onClick={() => editBatch(b._id)} style={styles.primaryBtn}>Save</button>
                                  <button onClick={cancelEditing} style={styles.secondaryBtn}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div style={styles.batchHeader} onClick={() => toggleBatchExpansion(b._id)}>
                                  <div style={styles.batchTitle}>{b.name} {b.isActive ? <span style={{ color: '#0b6623' }}>●</span> : null}</div>
                                  <span style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
                                </div>
                                <div style={{ fontSize: 12, color: '#4b704b' }}>
                                  Duration: {Math.ceil(b.durationSec / 60)} min • Users: {(b.users||[]).length} • Puzzles: {(b.puzzles||[]).length}
                                </div>
                                {isExpanded && (
                                  <>
                                    <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                                      <button onClick={() => startEditingBatch(b)} style={{ ...styles.smallBtn, background: '#f59e0b' }}>Edit</button>
                                      <button onClick={() => deleteBatch(b._id)} style={{ ...styles.smallBtn, background: '#dc2626' }}>Delete</button>
                                      <button onClick={() => startBatch(b._id)} style={styles.smallBtn}>Start</button>
                                      <button onClick={() => stopBatch(b._id)} style={styles.smallBtn}>Stop</button>
                                      <button onClick={() => {
                                        setForms({...forms, selectedBatchForAssign: b._id});
                                        alert(`Selected batch ${b.name} for assignment. Use 'Assign Users' or 'Attach Puzzles' below.`);
                                      }} style={styles.smallBtn}>Select</button>
                                    </div>
                                    <div style={{ marginTop: 8 }}>
                                      <div style={{ fontSize: 12, color: '#374151' }}>Assigned users</div>
                                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
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
                      })}
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
            <h4 style={{ marginTop: 0 }}>Assign Users to Selected Batch</h4>
            <div style={{ fontSize: 13, color: '#475b47', marginBottom: 8 }}>Selected Batch ID: {forms.selectedBatchForAssign || <em>none</em>}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 500, minHeight: 300, overflow: 'auto' }}>
              {(Array.isArray(users) ? users : []).map(u => (
                <label key={u._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 6, background: '#fff', borderRadius: 6 }}>
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
                if (!forms.selectedBatchForAssign) return alert('Select a batch first');
                assignUsersToBatch(forms.selectedBatchForAssign);
              }} style={styles.primaryBtn}>Assign Users</button>
            </div>
          </div>

          <div style={styles.card}>
            <h4 style={{ marginTop: 0 }}>Attach Puzzles to Selected Batch</h4>
            <div style={{ fontSize: 13, color: '#475b47', marginBottom: 8 }}>Selected Batch ID: {forms.selectedBatchForAssign || <em>none</em>}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 500, minHeight: 300, overflow: 'auto' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <input placeholder="Search puzzles by title" value={forms.puzzleSearch || ''} onChange={(e) => setForms({...forms, puzzleSearch: e.target.value})} style={{ ...styles.input, padding: '6px 8px', width: 300 }} />
                <div style={{ fontSize: 12, color: '#666' }}>Showing <strong>{Math.min((forms.puzzleLimit||200), (Array.isArray(puzzles) ? puzzles.filter(p=>p.title && p.title.toLowerCase().includes((forms.puzzleSearch||'').toLowerCase())).length : 0))}</strong> of <strong>{puzzles.length}</strong> puzzles</div>
                <button style={styles.secondaryBtn} onClick={() => setForms({...forms, puzzleLimit: Math.min((forms.puzzleLimit||200) + 200, puzzles.length) })}>Load more</button>
              </div>
              {(Array.isArray(puzzles) ? puzzles : []).filter(p => {
                const q = (forms.puzzleSearch || '').trim().toLowerCase();
                if (!q) return true;
                return (p.title || '').toLowerCase().includes(q) || (p._id || '').toLowerCase().includes(q);
              }).slice(0, forms.puzzleLimit || 200).map(p => (
                <label key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 6, background: '#fff', borderRadius: 6 }}>
                  <div style={{ maxWidth: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
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
                if (!forms.selectedBatchForAssign) return alert('Select a batch first');
                attachPuzzlesToBatch(forms.selectedBatchForAssign);
              }} style={styles.primaryBtn}>Attach Puzzles</button>
            </div>
          </div>
        </section>
      </div>

      <div style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Contest helper</h3>
        <p style={{ color: '#475569', margin: 0 }}>Use the controls above to create puzzles, rounds, batches, and assign users or puzzles. Data refreshes automatically after changes.</p>
      </div>
    </div>
  );
}
