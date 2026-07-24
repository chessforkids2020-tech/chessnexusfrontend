// pages/academy/AcademyCoaches.jsx — /academy/coaches
// The coach roster: join link to share, pending join-request approvals, and a
// per-coach table (students, joined, classes, plan) with roster drill-down.
import React, { useEffect, useState } from 'react';
import api from '../../api';
import CoachChatFab from '../../components/coach/CoachChatFab';
import './AcademyDashboard.css';

export default function AcademyCoaches() {
  const [data, setData] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const [openCoach, setOpenCoach] = useState(null);
  const [roster, setRoster] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const res = await api.get('/api/academy/overview'); // reuses overview (default period)
      setData(res.data);
      if (res.data?.isOwner) {
        api.get('/api/academy/requests').then(r => setRequests(r.data?.requests || [])).catch(() => setRequests([]));
      }
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not load coaches.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const approveRequest = async (id, name) => {
    try { await api.post(`/api/academy/requests/${id}/approve`); setMsg(`${name} approved.`); load(); }
    catch (e) { setErr(e.response?.data?.message || 'Could not approve.'); }
  };
  const messageCoach = async (coachId, name) => {
    try {
      await api.post(`/api/academy/chat/${coachId}/start`);
      setMsg(`💬 Chat with ${name} opened — find it in your coach messages (💬 button).`);
    } catch (e) {
      setErr(e.response?.data?.message || 'Could not open chat.');
    }
  };
  const declineRequest = async (id) => {
    try { await api.post(`/api/academy/requests/${id}/decline`); setRequests(rs => rs.filter(r => r.id !== id)); }
    catch (e) { setErr(e.response?.data?.message || 'Could not decline.'); }
  };
  const removeCoach = async (coachId, name) => {
    if (!window.confirm(`Remove ${name} from the academy? Their own students and data stay with them.`)) return;
    try {
      await api.delete(`/api/academy/members/${coachId}`);
      setMsg(`${name} removed.`);
      if (openCoach === coachId) { setOpenCoach(null); setRoster(null); }
      load();
    } catch (e) { setErr(e.response?.data?.message || 'Could not remove the coach.'); }
  };
  const toggleRoster = async (coachId) => {
    if (openCoach === coachId) { setOpenCoach(null); setRoster(null); return; }
    setOpenCoach(coachId); setRoster(null); setRosterLoading(true);
    try { const res = await api.get(`/api/academy/coach/${coachId}/students`); setRoster(res.data?.students || []); }
    catch { setRoster([]); }
    finally { setRosterLoading(false); }
  };

  if (loading && !data) return <div className="acad-wrap"><div className="acad-empty">Loading coaches…</div></div>;
  if (err && !data) return <div className="acad-wrap"><div className="acad-error">⚠️ {err}</div></div>;
  if (!data) return null;

  const { academy, isOwner, coaches } = data;
  const joinLink = `${window.location.origin}/join-academy/${academy.academyCode}`;

  return (
    <div className="acad-wrap">
      <h1 style={{ color: '#fff', marginBottom: 14 }}>👨‍🏫 Coaches</h1>
      {msg && <div className="acad-msg">{msg}</div>}
      {err && <div className="acad-error">⚠️ {err}</div>}

      {isOwner && (
        <>
          <div className="acad-joinlink">
            <div>
              <div className="acad-joinlink-label">Share this link — coaches use it to join your academy</div>
              <div className="acad-joinlink-url">{joinLink}</div>
            </div>
            <button onClick={() => { navigator.clipboard?.writeText(joinLink).then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }); }}>
              {linkCopied ? '✓ Copied' : 'Copy link'}
            </button>
          </div>

          {requests.length > 0 && (
            <div className="acad-req">
              <h3>🔔 {requests.length} coach{requests.length === 1 ? '' : 'es'} requesting to join</h3>
              {requests.map(r => (
                <div key={r.id} className="acad-req-row">
                  <span>{r.name}{r.username ? ` · @${r.username}` : ''}{r.country ? ` · ${r.country}` : ''}</span>
                  <div className="acad-req-btns">
                    <button className="acad-req-approve" onClick={() => approveRequest(r.id, r.name)}>Approve</button>
                    <button className="acad-req-decline" onClick={() => declineRequest(r.id)}>Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {coaches.length === 0 ? (
        <p className="acad-empty-inline">No coaches yet. Share your join link above.</p>
      ) : (
        <div className="acad-table-wrap">
          <table className="acad-table">
            <thead>
              <tr>
                <th>Coach</th><th>Role</th><th>Plan</th>
                <th>Students</th><th>Joined (period)</th><th>Classes</th>
                {isOwner && <th></th>}
              </tr>
            </thead>
            <tbody>
              {coaches.map(c => (
                <React.Fragment key={c.coachId}>
                  <tr>
                    <td><button className="acad-coach-name" onClick={() => toggleRoster(c.coachId)}>{openCoach === c.coachId ? '▾' : '▸'} {c.name}</button></td>
                    <td><span className={`acad-role acad-role-${c.role}`}>{c.role}</span></td>
                    <td>{c.plan}{c.sponsored && <span className="acad-role acad-role-coach" style={{ marginLeft: 6 }}>sponsored</span>}</td>
                    <td><strong>{c.students}</strong></td>
                    <td>{c.joinedInPeriod}</td>
                    <td>{c.classesTotal}</td>
                    {isOwner && (
                      <td>
                        {c.role !== 'head' && (
                          <div className="acad-req-btns">
                            <button className="acad-msg-btn" onClick={() => messageCoach(c.coachId, c.name)}>💬 Message</button>
                            <button className="acad-remove" onClick={() => removeCoach(c.coachId, c.name)}>Remove</button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                  {openCoach === c.coachId && (
                    <tr>
                      <td colSpan={isOwner ? 7 : 6} className="acad-roster-cell">
                        {rosterLoading ? <span className="acad-muted">Loading students…</span>
                          : !roster?.length ? <span className="acad-muted">No students yet.</span>
                          : (
                            <div className="acad-roster">
                              <div className="acad-roster-title">{c.name}'s students ({roster.length})</div>
                              {roster.map(s => (
                                <div key={s.id} className="acad-roster-row">
                                  <span>{s.name}{s.username ? ` · @${s.username}` : ''}{s.country ? ` · ${s.country}` : ''}</span>
                                  <span className="acad-muted">joined {new Date(s.joinedAt).toLocaleDateString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CoachChatFab />
    </div>
  );
}
