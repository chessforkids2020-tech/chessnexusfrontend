// src/pages/AdminBoardGuess.jsx
// Admin view of the "guess the price" game on /chessboard: every guess, and the
// reveal that sets the real prices AND the offer, then scores everyone.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const C = {
  bg: '#0a0a0a',
  panel: 'rgba(23,23,23,0.72)',
  border: 'rgba(255,255,255,0.08)',
  text: '#f0f0f0',
  dim: 'rgba(240,240,240,0.6)',
  faint: 'rgba(240,240,240,0.4)',
  cyan: '#06b6d4',
  green: '#10b981',
  amber: '#f59e0b',
};

const SYMBOL = { INR: '₹', USD: '$' };
const money = (n, cur = 'INR') => `${SYMBOL[cur] || '₹'}${Number(n).toLocaleString(cur === 'USD' ? 'en-US' : 'en-IN')}`;

// How the person was signed in when they sent it.
const sentAs = (g) =>
  g.accountType === 'account'
    ? `👤 ${g.displayName || g.username}${g.username && g.username !== g.displayName ? ` (@${g.username})` : ''}`
    : g.accountType === 'guest-account'
      ? `🎭 Guest account${g.displayName ? `: ${g.displayName}` : ''}`
      : '🌐 Visitor (not signed in)';

// Starting point for the offer; the admin edits it freely before revealing.
const DEFAULT_TIERS = [
  { withinPct: '2', discountPct: '20' },
  { withinPct: '5', discountPct: '15' },
  { withinPct: '10', discountPct: '10' },
  { withinPct: '20', discountPct: '5' },
];

const input = { padding: '9px 12px', fontSize: 14, borderRadius: 'var(--radius-md)', border: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.4)', color: C.text };

export default function AdminBoardGuess() {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [inr, setInr] = useState('');
  const [usd, setUsd] = useState('');
  const [tiers, setTiers] = useState(DEFAULT_TIERS);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [codeSearch, setCodeSearch] = useState('');
  const [who, setWho] = useState('all'); // all | account | guest-account | visitor
  const [tab, setTab] = useState('signups'); // signups | names

  async function load() {
    try {
      const res = await api.get('/api/board-guess/admin/summary');
      setData(res.data);
      if (res.data.actualPrice) setInr(String(res.data.actualPrice));
      if (res.data.actualPriceUsd) setUsd(String(res.data.actualPriceUsd));
      if (res.data.tiers?.length) {
        setTiers(res.data.tiers.map(t => ({ withinPct: String(t.withinPct), discountPct: String(t.discountPct) })));
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) nav('/login?role=admin');
    }
  }
  useEffect(() => { load(); }, []);

  const setTier = (i, key, value) =>
    setTiers(list => list.map((t, idx) => (idx === i ? { ...t, [key]: value.replace(/[^\d.]/g, '') } : t)));

  async function reveal() {
    const actual = Number(inr.replace(/\D/g, ''));
    if (!actual) { setMsg('Enter the real price in rupees first.'); return; }
    const actualUsd = usd.replace(/[^\d.]/g, '');
    const offer = tiers.filter(t => t.withinPct || t.discountPct).map(t => `${t.discountPct}% off within ${t.withinPct}%`).join(', ');
    const verb = data?.revealed ? 'Re-score everyone with' : 'Reveal and score everyone against';
    if (!window.confirm(`${verb} ${money(actual)}${actualUsd ? ` / ${money(actualUsd, 'USD')}` : ''}?\n\nOffer: ${offer || '(none)'}\n\nPlayers can see their result right away.`)) return;
    setBusy(true); setMsg('');
    try {
      const res = await api.post('/api/board-guess/admin/reveal', {
        actualPrice: actual,
        actualPriceUsd: actualUsd,
        tiers,
      });
      setMsg(`Scored ${res.data.scored} guesses.`);
      await load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to reveal.');
    } finally { setBusy(false); }
  }

  const signups = data?.signups || [];
  const guesses = signups.filter(g => g.guess);   // the sign-ups that also entered the price guess
  const names = data?.names || [];
  const nameEntries = names.reduce((n, x) => n + x.count, 0);
  // Filter chips: by how they were signed in, or by their price guess.
  const matchesFilter = (id) => (g) =>
    id === 'all' ? true
    : id === 'guessed' ? !!g.guess
    : id === 'winners' ? g.guess?.discountPct > 0
    : g.accountType === id;
  const shownSignups = signups.filter(matchesFilter(who));
  const winners = guesses.filter(g => g.guess.discountPct > 0);
  const th = { textAlign: 'left', padding: '8px 10px', fontSize: 12, color: C.faint, fontWeight: 700, borderBottom: `1px solid ${C.border}` };
  const td = { padding: '9px 10px', fontSize: 13.5, borderBottom: `1px solid ${C.border}` };
  const label = { fontSize: 12, fontWeight: 700, color: C.cyan, letterSpacing: 0.3, marginBottom: 8 };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, padding: '32px 24px 60px', fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24 }}>🏁 Chessboard launch</h1>
            <p style={{ margin: '6px 0 0', color: C.dim, fontSize: 14 }}>
              {signups.length} sign-ups ({guesses.length} with a price guess) · {nameEntries} name ideas · guessing {data?.revealed ? 'revealed' : data?.open ? 'open' : 'closed (waiting for reveal)'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={load} style={{ background: 'rgba(255,255,255,0.06)', color: C.text, border: `1px solid ${C.border}`, borderRadius: 'var(--radius-md)', padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>↻ Refresh</button>
            <button onClick={() => nav('/admin')} style={{ background: 'rgba(255,255,255,0.06)', color: C.text, border: `1px solid ${C.border}`, borderRadius: 'var(--radius-md)', padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>← Dashboard</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {[
            ['signups', `📬 Notify me (${signups.length}) · 🎯 ${guesses.length} guessed`],
            ['names', `🏷️ Name ideas (${nameEntries})`],
          ].map(([id, text]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              background: tab === id ? 'rgba(6,182,212,0.18)' : 'rgba(255,255,255,0.04)', color: tab === id ? C.cyan : C.dim,
              border: `1px solid ${tab === id ? 'rgba(6,182,212,0.4)' : C.border}`, borderRadius: 'var(--radius-pill)',
              padding: '8px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>{text}</button>
          ))}
        </div>

        {tab === 'signups' && (
        <>
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 'var(--radius-lg)', padding: '18px 20px', marginBottom: 20 }}>
          <div style={label}>REAL PRICE</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
            <label style={{ display: 'grid', gap: 4, fontSize: 12, color: C.dim }}>
              In rupees (₹)
              <input value={inr} onChange={e => setInr(e.target.value.replace(/[^\d,]/g, ''))} placeholder="e.g. 24999" style={{ ...input, width: 170 }} />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 12, color: C.dim }}>
              In US dollars ($)
              <input value={usd} onChange={e => setUsd(e.target.value.replace(/[^\d.]/g, ''))} placeholder="e.g. 299" style={{ ...input, width: 170 }} />
            </label>
          </div>

          <div style={label}>THE OFFER — you decide</div>
          <div style={{ display: 'grid', gap: 8, marginBottom: 6 }}>
            {tiers.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 14 }}>
                <span style={{ color: C.dim }}>Within</span>
                <input value={t.withinPct} onChange={e => setTier(i, 'withinPct', e.target.value)} placeholder="2" style={{ ...input, width: 70 }} />
                <span style={{ color: C.dim }}>% of the real price →</span>
                <input value={t.discountPct} onChange={e => setTier(i, 'discountPct', e.target.value)} placeholder="20" style={{ ...input, width: 70 }} />
                <span style={{ color: C.dim }}>% off</span>
              </div>
            ))}
          </div>
          <p style={{ margin: '8px 0 16px', color: C.dim, fontSize: 13, lineHeight: 1.6 }}>
            Leave a row empty to skip it. A guess earns the first row it fits (rows are sorted tightest first). Dollar guesses are scored against the dollar price, rupee guesses against the rupee price.
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={reveal}
              disabled={busy}
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: busy ? 'wait' : 'pointer' }}
            >
              {data?.revealed ? 'Re-score with these values' : 'Reveal price and score everyone'}
            </button>
            {msg && <span style={{ color: C.amber, fontSize: 13 }}>{msg}</span>}
          </div>
          <p style={{ margin: '12px 0 0', color: C.dim, fontSize: 13, lineHeight: 1.6 }}>
            Guessing closes at launch or when you reveal. Revealing lets players see their result; send each winner their code by email or WhatsApp.
          </p>
        </div>

        {data?.revealed && (
          <p style={{ color: C.dim, fontSize: 14, margin: '0 0 14px' }}>
            Real price <b style={{ color: C.text }}>{money(data.actualPrice)}</b>
            {data.actualPriceUsd ? <> / <b style={{ color: C.text }}>{money(data.actualPriceUsd, 'USD')}</b></> : null}
            {' '}· {winners.length} of {guesses.length} guesses earn a discount.
          </p>
        )}

        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 'var(--radius-lg)', padding: '18px 20px', marginBottom: 20 }}>
          <div style={label}>NOTIFY ME FORM · {signups.length} sign-ups · each row includes the person's price guess</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {[['all', 'All'], ['account', '👤 Accounts'], ['guest-account', '🎭 Guest accounts'], ['visitor', '🌐 Visitors'], ['guessed', '🎯 Guessed'], ['winners', '🏆 Winners']].map(([id, text]) => (
              <button key={id} onClick={() => setWho(id)} style={{
                background: who === id ? 'rgba(6,182,212,0.18)' : 'rgba(255,255,255,0.04)', color: who === id ? C.cyan : C.dim,
                border: `1px solid ${who === id ? 'rgba(6,182,212,0.4)' : C.border}`, borderRadius: 'var(--radius-pill)', padding: '5px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              }}>
                {text} ({signups.filter(matchesFilter(id)).length})
              </button>
            ))}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
              <thead>
                <tr>
                  <th style={th}>Name</th><th style={th}>Email</th><th style={th}>WhatsApp</th>
                  <th style={th}>Wants</th><th style={th}>Sent as</th>
                  <th style={th}>Price guess</th><th style={th}>Off by</th><th style={th}>Discount</th><th style={th}>Code</th>
                  <th style={th}>When</th>
                </tr>
              </thead>
              <tbody>
                {shownSignups.length === 0 ? (
                  <tr><td colSpan={10} style={{ ...td, textAlign: 'center', color: C.dim, padding: 30 }}>No sign-ups yet.</td></tr>
                ) : shownSignups.map(g => (
                  <tr key={g._id}>
                    <td style={td}>{g.name}</td>
                    <td style={td}>{g.email}</td>
                    <td style={td}>{g.whatsapp || '—'}</td>
                    <td style={td}>{g.board}</td>
                    <td style={td}>{sentAs(g)}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{g.guess ? money(g.guess.amount, g.guess.currency) : <span style={{ color: C.faint, fontWeight: 400 }}>—</span>}</td>
                    <td style={td}>{g.guess?.offByPct == null ? '—' : `${g.guess.offByPct}%`}</td>
                    <td style={{ ...td, color: g.guess?.discountPct > 0 ? C.green : C.faint, fontWeight: 700 }}>{g.guess?.discountPct == null ? '—' : `${g.guess.discountPct}%`}</td>
                    <td style={{ ...td, fontFamily: 'monospace' }}>{g.guess?.code || '—'}</td>
                    <td style={{ ...td, color: C.faint, whiteSpace: 'nowrap' }}>{new Date(g.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        </>
        )}

        {tab === 'names' && (
        <>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 'var(--radius-lg)', padding: '18px 20px', marginBottom: 20 }}>
            <div style={label}>NAME IDEAS · anonymous · most suggested first</div>
            {names.length === 0 && <p style={{ margin: '0 0 12px', color: C.dim, fontSize: 14 }}>No ideas yet. They show up here as visitors enter the naming challenge on /chessboard.</p>}
            <input
              value={codeSearch}
              onChange={e => setCodeSearch(e.target.value.toUpperCase())}
              placeholder="Find a winner by secret code, e.g. NM-7K4P2M"
              style={{ ...input, width: '100%', maxWidth: 380, marginBottom: 14, fontFamily: 'monospace' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              {[['electronic', '💡 Electronic board'], ['robotic', '🤖 Robotic board']].map(([board, title]) => {
                const rows = names
                  .filter(n => n.board === board)
                  .filter(n => !codeSearch || n.codes.some(c => c.includes(codeSearch.trim())));
                return (
                  <div key={board}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>{title} <span style={{ color: C.faint, fontWeight: 400 }}>· {rows.length} {rows.length === 1 ? 'idea' : 'ideas'}</span></div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {rows.length === 0 && <div style={{ color: C.faint, fontSize: 13 }}>None yet.</div>}
                      {rows.map(n => (
                        <details key={n.suggestion} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
                          <summary style={{ cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
                            {n.suggestion} <span style={{ color: C.amber, fontWeight: 600, fontSize: 13 }}>× {n.count}</span>
                          </summary>
                          <div style={{ marginTop: 8, fontSize: 12.5, color: C.dim, fontFamily: 'monospace', lineHeight: 1.7 }}>
                            {n.codes.map((c, i) => <div key={i}>{c}</div>)}
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={{ margin: '12px 0 0', color: C.faint, fontSize: 12, lineHeight: 1.6 }}>
              Nobody's name or email is stored. When you pick a winning name, the person proves it by showing their secret code; search it above. Check the name for trademark clashes before you choose it.
            </p>
          </div>
        </>


        )}
      </div>
    </div>
  );
}
