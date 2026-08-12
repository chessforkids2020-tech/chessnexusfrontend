// pages/academy/AcademyCoaches.jsx — /academy/coaches
// The coach roster: join link to share, pending join-request approvals, and a
// per-coach table (students, joined, classes, plan) with roster drill-down.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import CoachChatFab from '../../components/coach/CoachChatFab';
import './AcademyDashboard.css';

const CURRENCY_SYMBOL = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AUD: 'A$', CAD: 'C$', AED: 'د.إ', SGD: 'S$' };

// Fees a coach RECEIVED this calendar month, as two fixed compartments — INR
// and USD — so the column lines up down the table instead of shifting with
// whatever currencies each coach happens to use. Never summed: ₹ and $ cannot
// be added into one honest figure.
//
// Anything outside those two (a coach billing in EUR, say) still appears, on
// its own line — dropping real money to keep the layout tidy would be worse
// than an occasional third row.
const FEE_COLUMNS = ['INR', 'USD'];

function fmtFees(c) {
  const by = c.feesByCurrency || {};
  const others = Object.keys(by).filter(k => !FEE_COLUMNS.includes(k) && by[k] > 0);
  const nothing = FEE_COLUMNS.every(k => !by[k]) && others.length === 0;
  if (nothing) return <span className="acad-muted">—</span>;

  return (
    <div className="acad-fee-cells" title={`${c.feesCount} approved payment${c.feesCount === 1 ? '' : 's'} this month`}>
      {FEE_COLUMNS.map(code => (
        <div key={code} className={`acad-fee-cell ${by[code] ? '' : 'acad-fee-cell--empty'}`}>
          <span className="acad-fee-cell-cur">{code}</span>
          <span className="acad-fee-cell-amt">
            {by[code] ? `${CURRENCY_SYMBOL[code]}${by[code].toLocaleString()}` : '—'}
          </span>
        </div>
      ))}
      {others.map(code => (
        <div key={code} className="acad-fee-cell">
          <span className="acad-fee-cell-cur">{code}</span>
          <span className="acad-fee-cell-amt">
            {CURRENCY_SYMBOL[code] || ''}{by[code].toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AcademyCoaches() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const [openCoach, setOpenCoach] = useState(null);
  const [roster, setRoster] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);

  // "Add coach" — invite an EXISTING account by username. Deliberately not open
  // to guests/strangers: we attach the invite to a real user, so there has to be
  // an account already.
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteErr, setInviteErr] = useState('');
  const [invites, setInvites] = useState([]);

  const loadInvites = async () => {
    try {
      const r = await api.get('/api/academy/invites');
      setInvites(r.data?.invites || []);
    } catch { setInvites([]); }
  };

  const sendInvite = async () => {
    const u = inviteName.trim();
    if (!u) return;
    setInviteBusy(true); setInviteErr('');
    try {
      const r = await api.post('/api/academy/invite', { username: u });
      setMsg(r.data?.message || 'Invitation sent.');
      setInviteName(''); setShowInvite(false);
      loadInvites();
    } catch (e) {
      setInviteErr(e.response?.data?.message || 'Could not send the invitation.');
    } finally { setInviteBusy(false); }
  };

  const withdrawInvite = async (id, name) => {
    if (!window.confirm(`Withdraw the invitation to ${name}?`)) return;
    try { await api.delete(`/api/academy/invites/${id}`); loadInvites(); }
    catch (e) { setErr(e.response?.data?.message || 'Could not withdraw the invitation.'); }
  };

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const res = await api.get('/api/academy/overview'); // reuses overview (default period)
      setData(res.data);
      if (res.data?.isOwner) {
        api.get('/api/academy/requests').then(r => setRequests(r.data?.requests || [])).catch(() => setRequests([]));
        loadInvites();
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <h1 style={{ color: 'var(--color-text)', margin: 0 }}>👨‍🏫 Coaches</h1>
        {isOwner && (
          <button className="btn-primary" onClick={() => { setShowInvite(true); setInviteErr(''); }}>
            + Add coach
          </button>
        )}
      </div>
      {msg && <div className="acad-msg">{msg}</div>}
      {err && <div className="acad-error">⚠️ {err}</div>}

      {/* ── Invite a coach by username ── */}
      {showInvite && (
        <div
          onClick={() => setShowInvite(false)}
          style={{ position: 'fixed', inset: 0, background: 'var(--color-black-a50)', display: 'grid', placeItems: 'center', zIndex: 2000, padding: 16 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#141a2a', border: '1px solid var(--color-white-a10)', borderRadius: 14, padding: 22, width: 'min(420px, 94vw)', boxShadow: '0 24px 60px var(--color-black-a35)' }}
          >
            <h3 style={{ margin: '0 0 4px', color: 'var(--color-text)' }}>➕ Add a coach</h3>
            <p style={{ margin: '0 0 16px', color: '#9aa4bf', fontSize: 13, lineHeight: 1.5 }}>
              Enter the coach's <b>Chess Nexus username</b>. They'll get an invitation
              in their notifications and join once they accept.
              <br />
              <span style={{ color: '#7c8aa8' }}>
                They need an account already — ask them to sign up first if they don't have one.
              </span>
            </p>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
              Coach username
            </label>
            <input
              value={inviteName}
              onChange={e => setInviteName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !inviteBusy) sendInvite(); }}
              placeholder="e.g. coachqueen"
              autoFocus
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-white-a13)', background: 'var(--color-white-a04)', color: 'var(--color-text)', marginBottom: 12, boxSizing: 'border-box' }}
            />
            {inviteErr && <div className="acad-error" style={{ marginBottom: 12 }}>⚠️ {inviteErr}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-ghost" onClick={() => setShowInvite(false)} disabled={inviteBusy}>Cancel</button>
              <button className="btn-primary" onClick={sendInvite} disabled={inviteBusy || !inviteName.trim()}>
                {inviteBusy ? 'Sending…' : 'Send invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

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

          {invites.length > 0 && (
            <div className="acad-req">
              <h3>✉️ {invites.length} invitation{invites.length === 1 ? '' : 's'} waiting to be accepted</h3>
              {invites.map(i => (
                <div key={i.id} className="acad-req-row">
                  <span>
                    {i.name}{i.username ? ` · @${i.username}` : ''}
                    {!i.isCoach && (
                      <span style={{ color: 'var(--color-warning)', marginLeft: 8, fontSize: 12 }}>
                        · will onboard as a coach when they accept
                      </span>
                    )}
                  </span>
                  <div className="acad-req-btns">
                    <button className="acad-req-decline" onClick={() => withdrawInvite(i.id, i.name)}>Withdraw</button>
                  </div>
                </div>
              ))}
            </div>
          )}

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
                <th>Students</th><th>Joined (period)</th>
                {/* Fees RECEIVED this calendar month (approved requests only) —
                    what the coach actually collected, not what was asked for. */}
                <th>Fees this month</th>
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
                    <td>{fmtFees(c)}</td>
                    {isOwner && (
                      <td>
                        <div className="acad-req-btns">
                          {/* Full drill-down: profile, calendars, roster, fees. */}
                          <button className="acad-msg-btn" onClick={() => navigate(`/academy/coaches/${c.coachId}`)}>
                            📊 View
                          </button>
                          {c.role !== 'head' && (
                            <>
                              <button className="acad-msg-btn" onClick={() => messageCoach(c.coachId, c.name)}>💬 Message</button>
                              <button className="acad-remove" onClick={() => removeCoach(c.coachId, c.name)}>Remove</button>
                            </>
                          )}
                        </div>
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
