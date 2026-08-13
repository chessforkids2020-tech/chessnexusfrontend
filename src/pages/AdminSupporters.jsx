// src/pages/AdminSupporters.jsx
// Admin view of ChessNexus supporters: who holds which title, how much they
// paid, when, the plan duration, when the badge expires, payment provider, and
// approve/reject controls. Backed by GET /api/coffee/admin/list.
//
// The API path and the CoffeeSupporter model still say "coffee" — the feature
// began as Buy Me a Coffee. Only the user-facing wording has moved on;
// renaming the route and collection is a migration, not a copy change.
//
// PAID TITLES ARE NOT ASSIGNED HERE. NS and NX are derived from the tier a
// supporter bought (espresso -> NS, latte -> NX) by CoffeeSupporter.titleFor.
// Admin-added records are deliberately written with month-based tiers so that
// comping someone a badge never hands out a paid title.
//
// NC (Nexus Coach) is the exception and IS granted here, via the checkbox on
// the add form: it is earned by helping ChessNexus grow, no tier sells it, and
// no payment path can set it.
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api";
import { useAuth } from "../contexts/AuthContext";
import { markIdsSeen } from "../utils/adminCoachSeen";

// What title a record confers. Mirrors titleFor() in
// backend/models/CoffeeSupporter.js: the nexusCoach FLAG wins over the tier,
// because NC is granted for helping rather than bought — so a Nexus Coach who
// also bought Cafe Latte shows NC here, exactly as their name renders in the app.
//
// Split into code and name so the table can lead with the letters (what an
// admin scans for) and keep the full name as the secondary line.
const TITLE_CODE = (row) => {
  if (row?.nexusCoach) return "🎓 NC";
  const t = String(row?.tier || "").toLowerCase();
  if (t === "espresso") return "⚔ NS";
  if (t === "latte") return "👑 NX";
  return "♞ Knight";
};

const TITLE_NAME = (row) => {
  if (row?.nexusCoach) return "Nexus Coach";
  const t = String(row?.tier || "").toLowerCase();
  if (t === "espresso") return "Nexus Supporter";
  if (t === "latte") return "Nexus Expert";
  return "no title";
};

const fmt = (d) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";

const money = (amount, currency) => {
  const sym = currency === "INR" ? "₹" : currency === "USD" ? "$" : "";
  const val = typeof amount === "number" ? amount.toLocaleString() : amount;
  return `${sym}${val}`;
};

const STATUS_STYLE = {
  active: { label: "Active", color: "#047857", bg: "rgba(16,185,129,0.14)" },
  pending: { label: "Pending", color: "#b45309", bg: "rgba(245,158,11,0.14)" },
  rejected: { label: "Rejected", color: "#b91c1c", bg: "rgba(239,68,68,0.12)" },
};

const PROVIDER_LABEL = {
  razorpay: "Razorpay",
  paypal: "PayPal",
  upi: "UPI",
  bank: "Bank transfer",
  manual: "Manual",
};

const styles = {
  page: { padding: 18, paddingTop: 90, fontFamily: "Inter, Arial, sans-serif", maxWidth: 1200, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 },
  title: { fontSize: 22, color: "#072b05", fontWeight: 800, margin: 0 },
  subtitle: { margin: "4px 0 0", color: "#64748b", fontSize: 13 },
  secondaryBtn: { padding: "8px 12px", background: "#f0f9f0", color: "#064f28", border: "1px solid #d6f0d6", borderRadius: 'var(--radius-md)', cursor: "pointer", fontWeight: 600 },
  primaryBtn: { padding: "8px 12px", background: "#0b6623", color: "#fff", border: "none", borderRadius: 'var(--radius-md)', cursor: "pointer", fontWeight: 600 },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 20 },
  summaryCard: { background: "#fff", padding: 16, borderRadius: 'var(--radius-lg)', border: "1px solid #e6f1e6", boxShadow: "0 6px 16px rgba(0,0,0,0.04)" },
  summaryLabel: { fontSize: 12, color: "#64748b", marginBottom: 6 },
  summaryValue: { fontSize: 24, fontWeight: 800, color: "#064f28" },
  summarySub: { fontSize: 12, color: "#94a3b8", marginTop: 4 },
  toolbar: { display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" },
  input: { padding: "8px 12px", borderRadius: 'var(--radius-md)', border: "1px solid #d6e3d6", minWidth: 240, fontSize: 14 },
  select: { padding: "8px 12px", borderRadius: 'var(--radius-md)', border: "1px solid #d6e3d6", fontSize: 14, background: "#fff" },
  tableWrap: { background: "#fff", borderRadius: 'var(--radius-lg)', border: "1px solid #e6f1e6", overflow: "auto", boxShadow: "0 6px 16px rgba(0,0,0,0.04)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "12px 10px", textAlign: "left", fontWeight: 700, color: "#374151", borderBottom: "2px solid #e5e7eb", background: "#f9fafb", whiteSpace: "nowrap", position: "sticky", top: 0 },
  td: { padding: "10px", borderBottom: "1px solid #f3f4f6", verticalAlign: "top" },
  name: { fontWeight: 700, color: "#0f172a" },
  muted: { color: "#94a3b8", fontSize: 12 },
  tag: { padding: "3px 10px", borderRadius: 'var(--radius-lg)', fontSize: 11, fontWeight: 700, display: "inline-block" },
  smallBtn: { padding: "5px 10px", border: "none", borderRadius: 'var(--radius-sm)', cursor: "pointer", fontSize: 12, fontWeight: 600, marginRight: 6 },
  pager: { display: "flex", gap: 10, alignItems: "center", justifyContent: "center", marginTop: 16 },
};

export default function AdminSupporters() {
  const nav = useNavigate();
  const { user } = useAuth();

  // Landing on this page = the admin is reviewing supporters, so dismiss the ☕
  // "pending supporters" pip for the ones that currently need attention. The pip
  // re-appears only when a brand-new pending supporter shows up.
  useEffect(() => {
    api.get("/api/admin/badge-counts")
      .then(r => {
        const ids = Array.isArray(r.data?.supporterIds) ? r.data.supporterIds : [];
        if (ids.length) markIdsSeen('supporters', user?.id, ids);
      })
      .catch(() => {});
  }, [user?.id]);

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  // Filter by the title a supporter holds. Titles are derived from the tier
  // they bought (espresso -> NS, latte -> NX); "knight" is everyone with no
  // title — the Black Coffee tier plus admin-comped records, which are written
  // with month-based tiers precisely so they never confer a paid title.
  const [title, setTitle] = useState("all");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState(""); // debounced/committed query
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState(null);

  // ── Manually add a supporter ────────────────────────────────────────────────
  // For people who supported outside checkout: a streamer or blogger who featured
  // the app, a bank-transfer sponsor, a partner. Amount may be 0 — they're credited
  // for the promotion, not a payment. The ☕ badge runs for `months`; the name stays
  // on the public wall permanently. (Handler lives below `load`, which it calls.)
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ username: "", amount: "", currency: "INR", months: 1, note: "", nexusCoach: false });
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (status !== "all") params.status = status;
      if (title !== "all") params.title = title;
      if (search.trim()) params.q = search.trim();
      const res = await api.get("/api/coffee/admin/list", { params });
      setRows(Array.isArray(res.data?.supporters) ? res.data.supporters : []);
      setSummary(Array.isArray(res.data?.summary) ? res.data.summary : []);
      setTotalPages(res.data?.totalPages || 1);
      setTotal(res.data?.total || 0);
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        alert("Admin access required.");
        nav("/login?role=admin");
      }
      setRows([]);
      setSummary([]);
    } finally {
      setLoading(false);
    }
  }, [page, status, title, search, nav]);

  useEffect(() => { load(); }, [load]);

  const submitAdd = async (e) => {
    e.preventDefault();
    if (!addForm.username.trim()) return alert("Enter the supporter's username.");
    setAdding(true);
    try {
      const res = await api.post("/api/coffee/admin/add", {
        username: addForm.username.trim(),
        amount: addForm.amount === "" ? 0 : Number(addForm.amount),
        currency: addForm.currency,
        months: Number(addForm.months),
        note: addForm.note.trim(),
        nexusCoach: !!addForm.nexusCoach,
      });
      const u = res.data?.user;
      alert(`Added ${u?.displayName || u?.username} as a supporter.`);
      setAddForm({ username: "", amount: "", currency: "INR", months: 1, note: "", nexusCoach: false });
      setShowAdd(false);
      await load();
    } catch (err) {
      alert("Could not add: " + (err?.response?.data?.message || err.message));
    } finally {
      setAdding(false);
    }
  };

  // Reset to page 1 whenever the filter or search changes.
  // Any filter change returns to page 1 — staying on page 4 of a narrower
  // result set shows an empty table that looks like "no supporters".
  useEffect(() => { setPage(1); }, [status, title, search]);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(q);
  };

  const setStatusFor = async (id, action) => {
    setBusyId(id);
    try {
      await api.post(`/api/coffee/admin/${id}/${action}`);
      await load();
    } catch (err) {
      alert(`Failed to ${action}: ` + (err?.response?.data?.message || err.message));
    } finally {
      setBusyId(null);
    }
  };

  // Build per-currency revenue cards from the summary aggregate.
  const summaryCards = summary.map((s) => ({
    currency: s._id,
    activeAmount: s.activeAmount,
    totalAmount: s.totalAmount,
    activeCount: s.activeCount,
    count: s.count,
  }));

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🛡️ Supporters</h1>
          <p style={styles.subtitle}>
            Everyone who supports ChessNexus — name, title, amount paid, payment
            date, plan duration, badge expiry and provider.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={styles.secondaryBtn} onClick={() => nav("/admin")}>← Admin</button>
          <button style={styles.primaryBtn} onClick={load}>Refresh</button>
        </div>
      </div>

      {/* Revenue summary (per currency, across the current filter) */}
      <div style={styles.summaryGrid}>
        {summaryCards.length === 0 && (
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Confirmed revenue</div>
            <div style={styles.summaryValue}>—</div>
            <div style={styles.summarySub}>No supporters match this filter yet.</div>
          </div>
        )}
        {summaryCards.map((c) => (
          <div key={c.currency} style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Confirmed revenue ({c.currency})</div>
            <div style={styles.summaryValue}>{money(c.activeAmount, c.currency)}</div>
            <div style={styles.summarySub}>
              {c.activeCount} active · {money(c.totalAmount, c.currency)} across {c.count} record{c.count === 1 ? "" : "s"} (incl. pending/rejected)
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={styles.toolbar}>
        <form onSubmit={onSearchSubmit} style={{ display: "flex", gap: 8 }}>
          <input
            style={styles.input}
            placeholder="Search name, username or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit" style={styles.secondaryBtn}>Search</button>
          {search && (
            <button type="button" style={styles.secondaryBtn} onClick={() => { setQ(""); setSearch(""); }}>Clear</button>
          )}
        </form>
        <select style={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
        {/* Title filter. Names and emoji match the public tier list in
            BuyMeACoffee.jsx, not the internal tier keys (simple/espresso/latte)
            which mean nothing outside the code. */}
        <select style={styles.select} value={title} onChange={(e) => setTitle(e.target.value)}>
          <option value="all">All titles</option>
          <option value="knight">♞ Knight (no title)</option>
          <option value="NS">⚔ NS — Nexus Supporter</option>
          <option value="NX">👑 NX — Nexus Expert</option>
          <option value="NC">🎓 NC — Nexus Coach (granted)</option>
        </select>
        <span style={styles.muted}>{total} record{total === 1 ? "" : "s"}</span>
        <button
          type="button"
          style={{ ...styles.primaryBtn, marginLeft: "auto" }}
          onClick={() => setShowAdd(v => !v)}
        >
          {showAdd ? "Cancel" : "➕ Add supporter"}
        </button>
      </div>

      {/* Manual add — streamers, bloggers, bank transfers, partners. */}
      {showAdd && (
        <form
          onSubmit={submitAdd}
          style={{
            background: "#fff", border: "1px solid #e6f1e6", borderRadius: 'var(--radius-lg)',
            padding: 16, marginBottom: 16, boxShadow: "0 6px 16px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ fontWeight: 800, color: "#064f28", marginBottom: 4 }}>
            Add a supporter manually
          </div>
          <div style={{ ...styles.muted, marginBottom: 12 }}>
            For someone who supported outside checkout — a streamer or blogger who
            featured the app, a bank transfer, a partner. Leave the amount empty (or 0)
            if they're credited for promotion rather than a payment. The ☕ badge lasts
            for the months you pick; their name stays on the public page permanently.
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              style={styles.input}
              placeholder="Username or display name *"
              value={addForm.username}
              onChange={(e) => setAddForm(f => ({ ...f, username: e.target.value }))}
            />
            <input
              style={{ ...styles.input, minWidth: 120 }}
              type="number"
              min="0"
              placeholder="Amount (0 = promo)"
              value={addForm.amount}
              onChange={(e) => setAddForm(f => ({ ...f, amount: e.target.value }))}
            />
            <select
              style={styles.select}
              value={addForm.currency}
              onChange={(e) => setAddForm(f => ({ ...f, currency: e.target.value }))}
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
            </select>
            <select
              style={styles.select}
              value={addForm.months}
              onChange={(e) => setAddForm(f => ({ ...f, months: e.target.value }))}
            >
              <option value={1}>Badge: 1 month</option>
              <option value={3}>Badge: 3 months</option>
              <option value={6}>Badge: 6 months</option>
              <option value={12}>Badge: 12 months</option>
            </select>
            <input
              style={{ ...styles.input, minWidth: 220 }}
              placeholder="Note (e.g. YouTube feature) — internal"
              value={addForm.note}
              onChange={(e) => setAddForm(f => ({ ...f, note: e.target.value }))}
            />
            {/* NC. The only place the title can be granted — no tier sells it
                and no payment path sets it. Permanent until revoked, so it does
                not lapse with the months chosen above. */}
            <label
              style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}
              title="Nexus Coach — for coaches, streamers and creators who help ChessNexus grow. Cannot be bought."
            >
              <input
                type="checkbox"
                checked={addForm.nexusCoach}
                onChange={(e) => setAddForm(f => ({ ...f, nexusCoach: e.target.checked }))}
              />
              <span>🎓 Nexus Coach (NC)</span>
            </label>
            <button type="submit" style={styles.primaryBtn} disabled={adding}>
              {adding ? "Adding…" : "Add supporter"}
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Supporter</th>
              <th style={styles.th}>Amount</th>
              {/* Title in its own column, next to who and what they paid.
                  It used to be tucked under Duration, where a title has no
                  business being — duration is how long the badge runs. */}
              <th style={styles.th}>Title</th>
              <th style={styles.th}>Paid on</th>
              <th style={styles.th}>Duration</th>
              <th style={styles.th}>Badge expires</th>
              <th style={styles.th}>Provider</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td style={styles.td} colSpan={9}>Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td style={styles.td} colSpan={9}>No supporters found.</td></tr>
            )}
            {!loading && rows.map((r) => {
              const u = r.userId || {};
              const st = STATUS_STYLE[r.status] || STATUS_STYLE.pending;
              const expired = r.expiresAt && new Date(r.expiresAt) < new Date();
              return (
                <tr key={r._id}>
                  <td style={styles.td}>
                    <div style={styles.name}>{u.displayName || u.username || "Anonymous"}</div>
                    {u.username && <div style={styles.muted}>@{u.username}</div>}
                    {u.email && <div style={styles.muted}>{u.email}</div>}
                  </td>
                  <td style={styles.td}>
                    <strong>{money(r.amount, r.currency)}</strong>
                  </td>
                  {/* TITLE. The letters are what the admin scans for, so they
                      lead; the full name sits under them for anyone who does
                      not have NS/NX/NC memorised. */}
                  <td style={styles.td}>
                    <div style={{ ...styles.name, whiteSpace: "nowrap" }}>{TITLE_CODE(r)}</div>
                    <div style={styles.muted}>{TITLE_NAME(r)}</div>
                  </td>
                  <td style={styles.td}>{fmt(r.paidAt)}</td>
                  <td style={styles.td}>
                    {r.months} month{r.months === 1 ? "" : "s"}
                    {/* The raw tier, kept for support queries — "which tier did
                        this person actually buy?" is a different question from
                        "what title do they hold", and the answers differ for a
                        Nexus Coach. The title has its own column now. */}
                    <div style={styles.muted}>{r.tier}</div>
                  </td>
                  <td style={styles.td}>
                    {fmtDate(r.expiresAt)}
                    {r.status === "active" && (
                      <div style={{ ...styles.muted, color: expired ? "#b91c1c" : "#16a34a" }}>
                        {expired ? "expired" : "active"}
                      </div>
                    )}
                  </td>
                  <td style={styles.td}>
                    {PROVIDER_LABEL[r.provider] || r.provider}
                    {r.providerRef && <div style={styles.muted} title={r.providerRef}>{r.providerRef}</div>}
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.tag, color: st.color, background: st.bg }}>{st.label}</span>
                  </td>
                  <td style={styles.td}>
                    {r.status !== "active" && (
                      <button
                        style={{ ...styles.smallBtn, background: "#0b6623", color: "#fff", opacity: busyId === r._id ? 0.6 : 1 }}
                        disabled={busyId === r._id}
                        onClick={() => setStatusFor(r._id, "approve")}
                      >
                        Approve
                      </button>
                    )}
                    {r.status !== "rejected" && (
                      <button
                        style={{ ...styles.smallBtn, background: "#fee2e2", color: "#b91c1c", opacity: busyId === r._id ? 0.6 : 1 }}
                        disabled={busyId === r._id}
                        onClick={() => setStatusFor(r._id, "reject")}
                      >
                        Reject
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pager}>
          <button
            style={styles.secondaryBtn}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Prev
          </button>
          <span style={styles.muted}>Page {page} of {totalPages}</span>
          <button
            style={styles.secondaryBtn}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
