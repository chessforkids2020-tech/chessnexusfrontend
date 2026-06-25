// src/pages/AdminSupporters.jsx
// Admin view of "Buy Me a Coffee" supporters: who got the ☕ badge, how much
// they paid, when, the plan duration, when the badge expires, payment provider,
// and approve/reject controls. Backed by GET /api/coffee/admin/list.
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

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
  secondaryBtn: { padding: "8px 12px", background: "#f0f9f0", color: "#064f28", border: "1px solid #d6f0d6", borderRadius: 8, cursor: "pointer", fontWeight: 600 },
  primaryBtn: { padding: "8px 12px", background: "#0b6623", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 20 },
  summaryCard: { background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #e6f1e6", boxShadow: "0 6px 16px rgba(0,0,0,0.04)" },
  summaryLabel: { fontSize: 12, color: "#64748b", marginBottom: 6 },
  summaryValue: { fontSize: 24, fontWeight: 800, color: "#064f28" },
  summarySub: { fontSize: 12, color: "#94a3b8", marginTop: 4 },
  toolbar: { display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" },
  input: { padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e3d6", minWidth: 240, fontSize: 14 },
  select: { padding: "8px 12px", borderRadius: 8, border: "1px solid #d6e3d6", fontSize: 14, background: "#fff" },
  tableWrap: { background: "#fff", borderRadius: 12, border: "1px solid #e6f1e6", overflow: "auto", boxShadow: "0 6px 16px rgba(0,0,0,0.04)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "12px 10px", textAlign: "left", fontWeight: 700, color: "#374151", borderBottom: "2px solid #e5e7eb", background: "#f9fafb", whiteSpace: "nowrap", position: "sticky", top: 0 },
  td: { padding: "10px", borderBottom: "1px solid #f3f4f6", verticalAlign: "top" },
  name: { fontWeight: 700, color: "#0f172a" },
  muted: { color: "#94a3b8", fontSize: 12 },
  tag: { padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, display: "inline-block" },
  smallBtn: { padding: "5px 10px", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, marginRight: 6 },
  pager: { display: "flex", gap: 10, alignItems: "center", justifyContent: "center", marginTop: 16 },
};

export default function AdminSupporters() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState(""); // debounced/committed query
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (status !== "all") params.status = status;
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
  }, [page, status, search, nav]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 whenever the filter or search changes.
  useEffect(() => { setPage(1); }, [status, search]);

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
          <h1 style={styles.title}>☕ Coffee Supporters</h1>
          <p style={styles.subtitle}>
            Everyone who supported via Buy Me a Coffee — name, amount paid, payment date, plan duration, badge expiry and provider.
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
        <span style={styles.muted}>{total} record{total === 1 ? "" : "s"}</span>
      </div>

      {/* Table */}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Supporter</th>
              <th style={styles.th}>Amount</th>
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
              <tr><td style={styles.td} colSpan={8}>Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td style={styles.td} colSpan={8}>No supporters found.</td></tr>
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
                  <td style={styles.td}>{fmt(r.paidAt)}</td>
                  <td style={styles.td}>
                    {r.months} month{r.months === 1 ? "" : "s"}
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
