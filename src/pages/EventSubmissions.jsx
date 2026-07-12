// src/pages/EventSubmissions.jsx
import React, { useEffect, useState } from "react";
import api from '../api';
import { useNavigate } from "react-router-dom";

const s = {
  page: {
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    background: '#0a0a0a',
    minHeight: '100vh',
    padding: '36px 24px 60px',
    position: 'relative',
    overflow: 'hidden',
  },
  blob1: {
    position: 'fixed', borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
    width: 700, height: 700, top: -150, left: -200,
    background: 'radial-gradient(circle, rgba(16,185,129,0.09) 0%, transparent 70%)',
  },
  blob2: {
    position: 'fixed', borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
    width: 600, height: 600, bottom: -120, right: -160,
    background: 'radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 70%)',
  },
  content: {
    maxWidth: 1200,
    margin: '0 auto',
    position: 'relative',
    zIndex: 1,
  },

  /* ── Header ── */
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 36,
    background: 'rgba(23,23,23,0.72)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: '22px 28px',
    backdropFilter: 'blur(18px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
  },
  titleWrap: { display: 'flex', alignItems: 'center', gap: 12 },
  titleIcon: { fontSize: 28 },
  title: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 28,
    fontWeight: 800,
    margin: 0,
    letterSpacing: '-0.5px',
    background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  countBadge: {
    background: 'rgba(6,182,212,0.12)',
    border: '1px solid rgba(6,182,212,0.22)',
    color: '#06b6d4',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.6px',
    padding: '4px 12px',
    borderRadius: 999,
    marginLeft: 4,
  },
  backBtn: {
    background: 'rgba(0,0,0,0.4)',
    color: '#9ca3af',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: '10px 20px',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  /* ── Grid ── */
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 20,
  },

  /* ── Card ── */
  card: {
    background: 'rgba(23,23,23,0.72)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: '24px 22px 20px',
    backdropFilter: 'blur(18px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    position: 'relative',
    overflow: 'hidden',
    animation: 'cardReveal 0.45s cubic-bezier(0.22,1,0.36,1) both',
  },
  cardAccent: {
    position: 'absolute',
    top: 0, left: '10%', right: '10%',
    height: 1,
    background: 'linear-gradient(90deg, transparent, #06b6d4, transparent)',
    borderRadius: 999,
    opacity: 0.5,
  },

  /* ── Field rows ── */
  field: { display: 'flex', flexDirection: 'column', gap: 3 },
  label: {
    fontSize: 10,
    color: '#6b7280',
    textTransform: 'uppercase',
    fontWeight: 600,
    letterSpacing: '0.8px',
  },
  value: {
    fontSize: 14,
    color: '#f0f0f0',
    fontWeight: 500,
    wordBreak: 'break-word',
  },
  lichessBadge: {
    display: 'inline-block',
    background: 'rgba(16,185,129,0.12)',
    border: '1px solid rgba(16,185,129,0.22)',
    color: '#10b981',
    fontSize: 13,
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: 8,
  },
  cardDivider: {
    height: 1,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 999,
  },
  timestamp: {
    fontSize: 11,
    color: '#4b5563',
    fontWeight: 500,
  },

  /* ── Empty / Loading states ── */
  stateBox: {
    textAlign: 'center',
    padding: '70px 20px',
    background: 'rgba(23,23,23,0.72)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 20,
    backdropFilter: 'blur(18px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  stateIcon: { fontSize: 52, marginBottom: 16 },
  stateTitle: {
    fontFamily: "'Syne', sans-serif",
    color: '#f0f0f0',
    fontSize: 22,
    fontWeight: 700,
    margin: '0 0 8px',
  },
  stateText: { color: '#6b7280', fontSize: 14, margin: 0 },

  /* ── Spinner ── */
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid rgba(255,255,255,0.06)',
    borderTop: '3px solid #06b6d4',
    borderRadius: '50%',
    margin: '0 auto 20px',
    animation: 'spin 0.8s linear infinite',
  },
};

const keyframes = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
  @keyframes cardReveal {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

function EventSubmissions() {
  const nav = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  // assignment feature removed, events stored on submissions

  // Demo confirmation form: which submission is open + its field values.
  const [confirmId, setConfirmId] = useState(null);
  const [confirmForm, setConfirmForm] = useState({ day: '', time: '', zoomLink: '', note: '' });
  const [confirmSending, setConfirmSending] = useState(false);

  function openConfirm(sub) {
    const first = Array.isArray(sub.preferredSlots) && sub.preferredSlots[0];
    setConfirmForm({ day: first?.day || '', time: first?.time || '', zoomLink: '', note: '' });
    setConfirmId(sub._id);
  }

  async function sendConfirm(id) {
    if (!confirmForm.day || !confirmForm.time || !confirmForm.zoomLink.trim()) {
      alert('Please fill day, time and Zoom link.');
      return;
    }
    setConfirmSending(true);
    try {
      const res = await api.post(`/api/admin/event-submissions/${id}/confirm-demo`, {
        day: confirmForm.day,
        time: confirmForm.time,
        zoomLink: confirmForm.zoomLink.trim(),
        note: confirmForm.note.trim(),
      });
      alert(res.data?.message || 'Confirmation sent.');
      setConfirmId(null);
      fetchSubmissions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send confirmation email.');
    } finally {
      setConfirmSending(false);
    }
  }

  // delete all entries for a given eventId
  async function deleteEventGroup(eventId, eventName) {
    if (!window.confirm('Delete all submissions for this event? This action cannot be undone.')) return;
    try {
      const url = `/api/admin/event-submissions/event/${encodeURIComponent(eventId || '')}`;
      const opts = {};
      if (!eventId && eventName) {
        opts.params = { name: eventName };
      } else if (eventName) {
        opts.params = { name: eventName };
      }
      await api.delete(url, opts);
      fetchSubmissions();
    } catch (err) {
      console.error('failed to delete event group', err);
      alert('Failed to delete event submissions');
    }
  }

  useEffect(() => {
    fetchSubmissions();
    const interval = setInterval(fetchSubmissions, 15000);
    return () => clearInterval(interval);
  }, []);

  async function fetchSubmissions() {
    setLoading(true);
    try {
      const res = await api.get('/api/public/event-submissions');
      setSubmissions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (err.response?.status === 401) {
        alert('Session expired. Please login again.');
        nav('/login?role=admin');
      }
    } finally {
      setLoading(false);
    }
  }


  return (
    <>
      <style>{keyframes}</style>
      <div style={s.page}>
        {/* Ambient glows */}
        <div style={s.blob1} />
        <div style={s.blob2} />

        <div style={s.content}>
          {/* Header */}
          <div style={s.header}>
            <div style={s.titleWrap}>
              <span style={s.titleIcon}>📅</span>
              <h1 style={s.title}>Event Submissions</h1>
              {!loading && (
                <span style={s.countBadge}>{submissions.length} entries</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{ ...s.backBtn, borderColor: 'rgba(6,182,212,0.3)', color: '#06b6d4' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#06b6d4'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                onClick={fetchSubmissions}
                disabled={loading}
              >
                {loading ? '…' : '🔄 Refresh'}
              </button>
              <button
                style={s.backBtn}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
                  e.currentTarget.style.color = '#f0f0f0';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = '#9ca3af';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                onClick={() => nav('/admin')}
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>

          {/* States */}
          {loading ? (
            <div style={s.stateBox}>
              <div style={s.spinner} />
              <p style={s.stateTitle}>Loading Submissions</p>
              <p style={s.stateText}>Fetching event registrations…</p>
            </div>
          ) : submissions.length === 0 ? (
            <div style={s.stateBox}>
              <div style={s.stateIcon}>📭</div>
              <p style={s.stateTitle}>No Submissions Yet</p>
              <p style={s.stateText}>Event registrations will appear here once people sign up.</p>
            </div>
          ) : (
            // group by event name
            (() => {
              const grouped = submissions.reduce((acc, s) => {
                // if the event fields are missing we categorize them separately
                const key = s.eventName || s.eventId || 'Unspecified event';
                if (!acc[key]) acc[key] = [];
                acc[key].push(s);
                return acc;
              }, {});

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
                  {Object.entries(grouped).map(([evt, items]) => (
                    <div key={evt}>
                      <h2 style={{ color: '#10b981', marginBottom: 12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <span>{evt}</span>
                        {evt !== 'Unspecified event' && (
                          <button
                            onClick={() => deleteEventGroup(items[0].eventId, evt)}
                            style={{
                              background: '#ef4444',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              padding: '4px 8px',
                              fontSize: 12,
                              cursor: 'pointer'
                            }}
                          >Delete Event</button>
                        )}
                      </h2>
                      {items[0].eventId === 'collaborate-request' ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(23,23,23,0.72)', color: '#f0f0f0' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>Name</th>
                            <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>Email</th>
                            <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>Streamer?</th>
                            <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>Platform / Link</th>
                            <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>WhatsApp</th>
                            <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>Submitted</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map(sub => (
                            <tr key={sub._id}>
                              <td style={{ padding: '8px 12px' }}>{sub.name}</td>
                              <td style={{ padding: '8px 12px' }}>
                                {sub.email ? <a href={`mailto:${sub.email}`} style={{ color: '#34d399' }}>{sub.email}</a> : <span style={{ color: '#6b7280' }}>—</span>}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                {sub.isStreamer === true ? <span style={{ color: '#a78bfa', fontWeight: 600 }}>🎬 Yes</span>
                                  : sub.isStreamer === false ? <span style={{ color: '#9ca3af' }}>No</span>
                                  : <span style={{ color: '#6b7280' }}>—</span>}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                {sub.isStreamer
                                  ? <span>{sub.streamPlatform ? <b style={{ color: '#e5e7eb' }}>{sub.streamPlatform}: </b> : null}
                                      {sub.streamLink
                                        ? (/^https?:\/\//.test(sub.streamLink)
                                            ? <a href={sub.streamLink} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>{sub.streamLink}</a>
                                            : sub.streamLink)
                                        : <span style={{ color: '#6b7280' }}>—</span>}
                                    </span>
                                  : <span style={{ color: '#6b7280' }}>—</span>}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                {sub.whatsappNumber ? <span style={{ color: '#25d366', fontWeight: 600 }}>📱 {sub.whatsappNumber}</span> : <span style={{ color: '#6b7280' }}>—</span>}
                              </td>
                              <td style={{ padding: '8px 12px' }}>{new Date(sub.submittedAt).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      ) : items[0].eventId === 'coach-demo-booking' ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(23,23,23,0.72)', color: '#f0f0f0' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>Name</th>
                            <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>Email</th>
                            <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>Academy</th>
                            <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>Country</th>
                            <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>Preferred slots (IST)</th>
                            <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>Submitted</th>
                            <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map(sub => (
                            <React.Fragment key={sub._id}>
                            <tr>
                              <td style={{ padding: '8px 12px' }}>{sub.name}</td>
                              <td style={{ padding: '8px 12px' }}>
                                {sub.email
                                  ? <a href={`mailto:${sub.email}`} style={{ color: '#34d399' }}>{sub.email}</a>
                                  : <span style={{ color: '#6b7280' }}>—</span>}
                              </td>
                              <td style={{ padding: '8px 12px' }}>{sub.academyName || <span style={{ color: '#6b7280' }}>—</span>}</td>
                              <td style={{ padding: '8px 12px' }}>{sub.country || <span style={{ color: '#6b7280' }}>—</span>}</td>
                              <td style={{ padding: '8px 12px' }}>
                                {Array.isArray(sub.preferredSlots) && sub.preferredSlots.length > 0
                                  ? <ol style={{ margin: 0, paddingLeft: 18 }}>
                                      {sub.preferredSlots.map((sl, i) => (
                                        <li key={i} style={{ padding: '1px 0' }}>{sl.day} · {sl.time}</li>
                                      ))}
                                    </ol>
                                  : <span style={{ color: '#6b7280' }}>—</span>}
                              </td>
                              <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                                {sub.state && sub.state.startsWith('Confirmed')
                                  ? <span style={{ color: '#34d399', fontSize: 12, fontWeight: 600 }}>✅ {sub.state.replace('Confirmed: ', '')}</span>
                                  : <span style={{ color: '#6b7280', fontSize: 12 }}>—</span>}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <button
                                  onClick={() => (confirmId === sub._id ? setConfirmId(null) : openConfirm(sub))}
                                  disabled={!sub.email}
                                  title={!sub.email ? 'No email on this submission' : 'Send confirmation email'}
                                  style={{
                                    background: confirmId === sub._id ? '#334155' : 'linear-gradient(135deg,#10b981,#059669)',
                                    color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px',
                                    fontSize: 12, fontWeight: 600, cursor: sub.email ? 'pointer' : 'not-allowed',
                                    opacity: sub.email ? 1 : 0.5,
                                  }}
                                >{confirmId === sub._id ? 'Cancel' : '✉️ Send confirmation'}</button>
                              </td>
                            </tr>
                            {confirmId === sub._id && (
                              <tr>
                                <td colSpan={7} style={{ padding: '4px 12px 16px', background: 'rgba(16,185,129,0.05)' }}>
                                  <div style={{ display: 'grid', gap: 10, maxWidth: 640 }}>
                                    <div style={{ color: '#94a3b8', fontSize: 12 }}>
                                      Sending to <strong style={{ color: '#34d399' }}>{sub.email}</strong> — pick the confirmed day &amp; time and paste your Zoom link.
                                    </div>
                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                      <input value={confirmForm.day} onChange={e => setConfirmForm({ ...confirmForm, day: e.target.value })}
                                        placeholder="Day (e.g. Monday)"
                                        style={{ flex: '1 1 160px', padding: '9px 11px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f0f0f0', fontSize: 13 }} />
                                      <input value={confirmForm.time} onChange={e => setConfirmForm({ ...confirmForm, time: e.target.value })}
                                        placeholder="Time IST (e.g. 4 – 6 PM)"
                                        style={{ flex: '1 1 160px', padding: '9px 11px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f0f0f0', fontSize: 13 }} />
                                    </div>
                                    <input value={confirmForm.zoomLink} onChange={e => setConfirmForm({ ...confirmForm, zoomLink: e.target.value })}
                                      placeholder="Zoom link (https://zoom.us/j/…)"
                                      style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f0f0f0', fontSize: 13 }} />
                                    <textarea value={confirmForm.note} onChange={e => setConfirmForm({ ...confirmForm, note: e.target.value })}
                                      placeholder="Optional note to include in the email…" rows={2}
                                      style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f0f0f0', fontSize: 13, resize: 'vertical' }} />
                                    <div style={{ display: 'flex', gap: 10 }}>
                                      <button onClick={() => sendConfirm(sub._id)} disabled={confirmSending}
                                        style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: confirmSending ? 0.6 : 1 }}>
                                        {confirmSending ? 'Sending…' : '📧 Send confirmation email'}
                                      </button>
                                      <button onClick={() => setConfirmId(null)} disabled={confirmSending}
                                        style={{ background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, cursor: 'pointer' }}>
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                      ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(23,23,23,0.72)', color: '#f0f0f0' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>Name</th>
                            <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>Age</th>
                            <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>FIDE</th>
                            <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>WhatsApp</th>
                            <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>State</th>
                            <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>WA Group?</th>
                            <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>Submitted</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map(sub => (
                            <tr key={sub._id}>
                              <td style={{ padding: '8px 12px' }}>{sub.name}</td>
                              <td style={{ padding: '8px 12px' }}>{sub.age}</td>
                              <td style={{ padding: '8px 12px' }}>
                                {sub.hasFide === true
                                  ? <span style={{ color: '#f59e0b', fontWeight: 700 }}>✅ Yes — {sub.fideRating ?? '?'}</span>
                                  : sub.hasFide === false
                                    ? <span style={{ color: '#9ca3af' }}>❌ No</span>
                                    : <span style={{ color: '#6b7280' }}>—</span>}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                {sub.whatsappNumber
                                  ? <span style={{ color: '#25d366', fontWeight: 600 }}>📱 {sub.whatsappNumber}</span>
                                  : <span style={{ color: '#6b7280' }}>—</span>}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                {sub.state
                                  ? <span style={{ color: '#f0f0f0' }}>{sub.state}</span>
                                  : <span style={{ color: '#6b7280' }}>—</span>}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                {sub.joinWhatsapp === true
                                  ? <span style={{ color: '#25d366', fontWeight: 700 }}>✅ Yes</span>
                                  : sub.joinWhatsapp === false
                                    ? <span style={{ color: '#ef4444' }}>❌ No</span>
                                    : <span style={{ color: '#6b7280' }}>—</span>}
                              </td>
                              <td style={{ padding: '8px 12px' }}>{new Date(sub.submittedAt).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>
      </div>
    </>
  );
}

export default EventSubmissions;