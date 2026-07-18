// src/pages/AdminCoaches.jsx
// Admin view of coach subscriptions — like the supporters page, but for coaches:
// who paid, which plan, how long, until when, lifetime spend, student count and
// current status. Backed by GET /api/coach-subscription/admin/coaches.
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import api from "../api";
import { useAuth } from "../contexts/AuthContext";
import { markIdsSeen } from "../utils/adminCoachSeen";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";

// Payment amounts are stored in the currency's MINOR unit (paise/cents) → /100.
const money = (minor, currency) => {
  if (minor == null) return "—";
  const sym = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "";
  return `${sym}${(minor / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

const totalsLabel = (byCurrency) => {
  const entries = Object.entries(byCurrency || {});
  if (!entries.length) return "—";
  return entries.map(([cur, minor]) => money(minor, cur)).join(" · ");
};

const PLAN_LABEL = {
  free: "Free", trial: "Trial (legacy)", elite_free: "Elite (free)", coach: "Coach",
  starter: "Starter", pro: "Pro", pro_plus: "Pro+", academy: "Academy",
};

const STATUS_STYLE = {
  active: { label: "Active", color: "#047857", bg: "rgba(16,185,129,0.14)" },
  expired: { label: "Expired", color: "#b91c1c", bg: "rgba(239,68,68,0.12)" },
  cancelled: { label: "Cancelled", color: "#b45309", bg: "rgba(245,158,11,0.14)" },
};

const styles = {
  page: { padding: 18, paddingTop: 90, fontFamily: "Inter, Arial, sans-serif", maxWidth: 1200, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 },
  title: { fontSize: 22, color: "#072b05", fontWeight: 800, margin: 0 },
  subtitle: { margin: "4px 0 0", color: "#64748b", fontSize: 13 },
  secondaryBtn: { padding: "8px 12px", background: "#f0f9f0", color: "#064f28", border: "1px solid #d6f0d6", borderRadius: 8, cursor: "pointer", fontWeight: 600 },
  primaryBtn: { padding: "8px 12px", background: "#0b6623", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 },
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
  pager: { display: "flex", gap: 10, alignItems: "center", justifyContent: "center", marginTop: 16 },
};

export default function AdminCoaches() {
  const nav = useNavigate();
  const { user } = useAuth();

  // Landing on this page = the admin is reviewing coaches, so dismiss the 🎓
  // "unverified coaches" pip for the ones that currently need attention. The pip
  // re-appears only when a brand-new unverified coach signs up.
  useEffect(() => {
    api.get("/api/admin/badge-counts")
      .then(r => {
        const ids = Array.isArray(r.data?.coachIds) ? r.data.coachIds : [];
        if (ids.length) markIdsSeen('coaches', user?.id, ids);
      })
      .catch(() => {});
  }, [user?.id]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("all");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Coach overview (analytics + verify list) — moved here from the admin dashboard.
  const [coachAnalytics, setCoachAnalytics] = useState(null);
  const [coachList, setCoachList] = useState(null);
  const [coachListLoading, setCoachListLoading] = useState(false);
  // Admin "Grant plan" (comp collaborators / YouTubers) modal state.
  const [grantFor, setGrantFor] = useState(null);     // the coach row being granted
  const [grantPlan, setGrantPlan] = useState('live3');
  const [grantMonths, setGrantMonths] = useState('never');
  const [grantReason, setGrantReason] = useState('');
  const [grantBusy, setGrantBusy] = useState(false);

  useEffect(() => {
    api.get("/api/admin/coach-analytics").then(r => setCoachAnalytics(r.data || null)).catch(() => setCoachAnalytics(null));
  }, []);

  const loadCoaches = async () => {
    setCoachListLoading(true);
    try {
      const res = await api.get("/api/admin/coaches");
      setCoachList(res.data?.coaches || []);
    } catch {
      setCoachList([]);
    } finally {
      setCoachListLoading(false);
    }
  };

  const verifyCoach = async (id, verified) => {
    try {
      await api.post(`/api/admin/coaches/${id}/verify`, { verified });
      setCoachList(list => (list || []).map(c => c.id === id ? { ...c, verified } : c));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update coach");
    }
  };

  // ── Grant a plan free (comp collaborators / YouTubers) ──
  const submitGrant = async () => {
    if (!grantFor) return;
    setGrantBusy(true);
    try {
      await api.post("/api/coach-subscription/admin/grant", {
        userId: grantFor.id,
        plan: grantPlan,
        months: grantMonths === 'never' ? 'never' : Number(grantMonths),
        reason: grantReason,
      });
      setCoachList(list => (list || []).map(c => c.id === grantFor.id
        ? { ...c, plan: grantPlan, comped: true } : c));
      setGrantFor(null); setGrantReason('');
    } catch (err) {
      alert(err.response?.data?.message || "Failed to grant plan");
    } finally { setGrantBusy(false); }
  };

  const revokeGrant = async (c) => {
    if (!window.confirm(`Revoke ${c.username}'s comped plan → back to Free?`)) return;
    try {
      await api.post("/api/coach-subscription/admin/revoke", { userId: c.id });
      setCoachList(list => (list || []).map(x => x.id === c.id
        ? { ...x, plan: 'free', comped: false } : x));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to revoke");
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (status !== "all") params.status = status;
      if (plan !== "all") params.plan = plan;
      if (search.trim()) params.q = search.trim();
      const res = await api.get("/api/coach-subscription/admin/coaches", { params });
      setRows(Array.isArray(res.data?.coaches) ? res.data.coaches : []);
      setTotalPages(res.data?.totalPages || 1);
      setTotal(res.data?.total || 0);
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        alert("Admin access required.");
        nav("/login?role=admin");
      }
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, status, plan, search, nav]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status, plan, search]);

  const onSearchSubmit = (e) => { e.preventDefault(); setSearch(q); };

  // Quick summary: how many paying / trial / expired in the current page-set total.
  const payingCount = rows.filter(r => r.hasPaid && r.status === "active" && !r.expired).length;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🎓 Coaches</h1>
          <p style={styles.subtitle}>
            Every coach — plan, whether they paid, amount, duration, when access ends, lifetime spend and student count.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={styles.secondaryBtn} onClick={() => nav("/admin")}>← Admin</button>
          <button style={styles.primaryBtn} onClick={load}>Refresh</button>
        </div>
      </div>

      {/* ── Coach Overview (analytics + verify) — moved from the admin dashboard ── */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ color: "#072b05", marginBottom: 16 }}>👨‍🏫 Coach Overview</h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Applications", value: coachAnalytics?.totalApplicants ?? "—", color: "#3b82f6" },
            { label: "Active Coaches", value: coachAnalytics?.totalCoaches ?? "—", color: "#10b981" },
            { label: "Active Subscribers", value: coachAnalytics?.activeSubscribers ?? "—", color: "#8b5cf6" },
            { label: "Total Students", value: coachAnalytics?.totalStudents ?? "—", color: "#f59e0b" },
            { label: "Paid Payments", value: coachAnalytics?.paidCount ?? "—", color: "#ef4444" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>

        {coachAnalytics && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <h4 style={{ margin: "0 0 14px", color: "#072b05", fontSize: 14 }}>Coaches by Plan</h4>
              <Bar
                data={{
                  labels: ["Starter", "Pro", "Pro Plus", "Academy", "None"],
                  datasets: [{
                    label: "Coaches",
                    data: ["starter", "pro", "pro_plus", "academy", null].map(plan =>
                      coachAnalytics.planBreakdown.find(p => p._id === plan)?.count || 0
                    ),
                    backgroundColor: ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#94a3b8"],
                    borderRadius: 5,
                  }]
                }}
                options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }}
              />
            </div>

            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <h4 style={{ margin: "0 0 14px", color: "#072b05", fontSize: 14 }}>Monthly Payments (Last 6 Months)</h4>
              <Line
                data={{
                  labels: coachAnalytics.monthlyTrend.map(m => {
                    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    return `${months[m._id.month - 1]} ${m._id.year}`;
                  }),
                  datasets: [
                    { label: "Revenue (₹)", data: coachAnalytics.monthlyTrend.map(m => Math.round(m.revenue / 100)), borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.1)", tension: 0.4, yAxisID: "y" },
                    { label: "Payments", data: coachAnalytics.monthlyTrend.map(m => m.count), borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.1)", tension: 0.4, yAxisID: "y1" },
                  ]
                }}
                options={{
                  responsive: true,
                  interaction: { mode: "index", intersect: false },
                  plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } },
                  scales: {
                    y: { beginAtZero: true, position: "left", title: { display: true, text: "₹ Revenue" } },
                    y1: { beginAtZero: true, position: "right", grid: { drawOnChartArea: false }, title: { display: true, text: "Count" } }
                  }
                }}
              />
            </div>
          </div>
        )}
        {!coachAnalytics && <p style={{ color: "#94a3b8", fontSize: 13 }}>Coach analytics unavailable</p>}

        {/* Coach list: who they are, status, payments, verify */}
        <div style={{ marginTop: 24, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 18, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h4 style={{ margin: 0, color: "#072b05", fontSize: 14 }}>Coaches &amp; Applicants — verify here</h4>
            <button onClick={loadCoaches} disabled={coachListLoading}
              style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #10b981", background: "#10b981", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {coachListLoading ? "Loading…" : (coachList ? "↻ Refresh" : "Load coaches")}
            </button>
          </div>

          {coachList === null ? (
            <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>Click “Load coaches” to see the full list with verify controls.</p>
          ) : coachList.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>No coaches or applicants yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#6b7280", borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "8px 10px" }}>Coach</th>
                    <th style={{ padding: "8px 10px" }}>Type</th>
                    <th style={{ padding: "8px 10px" }}>Plan</th>
                    <th style={{ padding: "8px 10px" }}>Students</th>
                    <th style={{ padding: "8px 10px" }}>Applied</th>
                    <th style={{ padding: "8px 10px" }}>Last paid</th>
                    <th style={{ padding: "8px 10px" }}>Total paid</th>
                    <th style={{ padding: "8px 10px" }}>Status</th>
                    <th style={{ padding: "8px 10px" }}>Verify</th>
                  </tr>
                </thead>
                <tbody>
                  {coachList.map(c => (
                    <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9", color: "#1f2937" }}>
                      <td style={{ padding: "8px 10px" }}>
                        <div style={{ fontWeight: 700 }}>{c.coachName || c.displayName}</div>
                        <div style={{ color: "#94a3b8", fontSize: 11 }}>@{c.username}{c.email ? ` · ${c.email}` : ""}</div>
                      </td>
                      <td style={{ padding: "8px 10px" }}>{c.coachType === "academy" ? `🏫 ${c.academyName || "Academy"}` : "👤 Individual"}</td>
                      <td style={{ padding: "8px 10px" }}>
                        {c.plan || "—"}{c.subStatus ? ` (${c.subStatus})` : ""}
                        {c.comped && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: "#7c3aed", background: "#f3e8ff", padding: "1px 6px", borderRadius: 6 }}>🎁 Comped</span>}
                      </td>
                      <td style={{ padding: "8px 10px" }}>{c.studentsCount}</td>
                      <td style={{ padding: "8px 10px" }}>{fmtDate(c.appliedAt)}</td>
                      <td style={{ padding: "8px 10px" }}>{fmtDate(c.lastPaidAt)}</td>
                      <td style={{ padding: "8px 10px" }}>{c.totalPaid ? `₹${Math.round(c.totalPaid / 100)}` : "—"}</td>
                      <td style={{ padding: "8px 10px" }}>
                        {c.verified
                          ? <span style={{ color: "#10b981", fontWeight: 700 }}>✓ Verified</span>
                          : c.isCoach
                            ? <span style={{ color: "#f59e0b", fontWeight: 700 }}>Unverified</span>
                            : <span style={{ color: "#94a3b8" }}>Applicant</span>}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {c.isCoach && (
                            <button onClick={() => verifyCoach(c.id, !c.verified)}
                              style={{
                                padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer",
                                border: `1px solid ${c.verified ? "#ef4444" : "#10b981"}`,
                                background: c.verified ? "#fff" : "#10b981",
                                color: c.verified ? "#ef4444" : "#fff",
                              }}>
                              {c.verified ? "Unverify" : "Verify"}
                            </button>
                          )}
                          <button onClick={() => { setGrantFor(c); setGrantPlan('live3'); setGrantMonths('never'); }}
                            style={{ padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "1px solid #7c3aed", background: "#fff", color: "#7c3aed" }}>
                            🎁 Grant
                          </button>
                          {c.comped && (
                            <button onClick={() => revokeGrant(c)}
                              style={{ padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "1px solid #ef4444", background: "#fff", color: "#ef4444" }}>
                              Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <h3 style={{ color: "#072b05", marginBottom: 12 }}>💳 Subscriptions</h3>
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Total coaches</div>
          <div style={styles.summaryValue}>{total}</div>
          <div style={styles.summarySub}>matching this filter</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Paying (active) on this page</div>
          <div style={styles.summaryValue}>{payingCount}</div>
          <div style={styles.summarySub}>have a paid, non-expired plan</div>
        </div>
      </div>

      <div style={styles.toolbar}>
        <form onSubmit={onSearchSubmit} style={{ display: "flex", gap: 8 }}>
          <input style={styles.input} placeholder="Search name, username or email…"
            value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="submit" style={styles.secondaryBtn}>Search</button>
          {search && <button type="button" style={styles.secondaryBtn} onClick={() => { setQ(""); setSearch(""); }}>Clear</button>}
        </form>
        <select style={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select style={styles.select} value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="all">All plans</option>
          <option value="free">Free</option>
          <option value="trial">Trial (legacy)</option>
          <option value="coach">Coach (paid)</option>
          <option value="elite_free">Elite (free)</option>
        </select>
        <span style={styles.muted}>{total} coach{total === 1 ? "" : "es"}</span>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Coach</th>
              <th style={styles.th}>Plan</th>
              <th style={styles.th}>Paid?</th>
              <th style={styles.th}>Last payment</th>
              <th style={styles.th}>Duration</th>
              <th style={styles.th}>Access until</th>
              <th style={styles.th}>Lifetime spend</th>
              <th style={styles.th}>Students</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td style={styles.td} colSpan={9}>Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td style={styles.td} colSpan={9}>No coaches found.</td></tr>}
            {!loading && rows.map((r) => {
              const st = STATUS_STYLE[r.status] || STATUS_STYLE.active;
              const lp = r.lastPayment;
              return (
                <tr key={r._id}>
                  <td style={styles.td}>
                    <div style={styles.name}>
                      {r.name}
                      {r.isAdmin && <span style={{ ...styles.tag, marginLeft: 6, color: "#7c3aed", background: "rgba(139,92,246,0.14)" }}>Admin</span>}
                      {r.isElite && !r.isAdmin && <span style={{ ...styles.tag, marginLeft: 6, color: "#7c3aed", background: "rgba(139,92,246,0.14)" }}>Elite</span>}
                    </div>
                    {r.username && <div style={styles.muted}>@{r.username}</div>}
                    {r.email && <div style={styles.muted}>{r.email}</div>}
                  </td>
                  <td style={styles.td}>{PLAN_LABEL[r.plan] || r.plan}</td>
                  <td style={styles.td}>
                    {r.hasPaid
                      ? <span style={{ ...styles.tag, color: "#047857", background: "rgba(16,185,129,0.14)" }}>Paid</span>
                      : r.plan === "elite_free"
                        ? <span style={styles.muted}>Free (Elite)</span>
                        : <span style={styles.muted}>{(r.plan === "trial" || r.plan === "free") ? "Free" : "No"}</span>}
                  </td>
                  <td style={styles.td}>
                    {lp ? <><strong>{money(lp.amount, lp.currency)}</strong><div style={styles.muted}>{fmtDate(lp.paidAt)}</div></> : "—"}
                  </td>
                  <td style={styles.td}>{lp ? `${lp.months} month${lp.months === 1 ? "" : "s"}` : "—"}</td>
                  <td style={styles.td}>
                    {fmtDate(r.periodEnd)}
                    {r.periodEnd && (
                      <div style={{ ...styles.muted, color: r.expired ? "#b91c1c" : "#16a34a" }}>
                        {r.expired ? "expired" : "active"}
                      </div>
                    )}
                  </td>
                  <td style={styles.td}>
                    {totalsLabel(r.totalPaidByCurrency)}
                    {r.paymentCount > 0 && <div style={styles.muted}>{r.paymentCount} payment{r.paymentCount === 1 ? "" : "s"}</div>}
                  </td>
                  <td style={styles.td}>{r.studentsCount}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.tag, color: st.color, background: st.bg }}>{st.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={styles.pager}>
          <button style={styles.secondaryBtn} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Prev</button>
          <span style={styles.muted}>Page {page} of {totalPages}</span>
          <button style={styles.secondaryBtn} disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next →</button>
        </div>
      )}

      {/* ── Grant plan modal (comp collaborators / YouTubers) ── */}
      {grantFor && (
        <div onClick={() => setGrantFor(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center", zIndex: 2000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 14, padding: 22, width: "min(420px, 94vw)", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
            <h3 style={{ margin: "0 0 4px", color: "#1f2937" }}>🎁 Grant a plan free</h3>
            <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: 13 }}>
              Give <b>@{grantFor.username}</b> free access (e.g. a collaborator / YouTuber).
              No payment; marked as comped and revocable.
            </p>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 4 }}>Plan</label>
            <select value={grantPlan} onChange={e => setGrantPlan(e.target.value)}
              style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #d1d5db", marginBottom: 14 }}>
              <optgroup label="Without live classes">
                <option value="pro">Pro — 70 students</option>
                <option value="coach">Coach — 150 students</option>
              </optgroup>
              <optgroup label="With live classes">
                <option value="live1">Live Basic — 50 students · 5 classes/day</option>
                <option value="live2">Live Pro — 100 students · unlimited · elite</option>
                <option value="live3">Live Coach — 150 students · unlimited · elite</option>
              </optgroup>
            </select>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 4 }}>Duration</label>
            <select value={grantMonths} onChange={e => setGrantMonths(e.target.value)}
              style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #d1d5db", marginBottom: 14 }}>
              <option value="never">Never expires</option>
              <option value="1">1 month</option>
              <option value="3">3 months</option>
              <option value="6">6 months</option>
              <option value="12">12 months</option>
            </select>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 4 }}>Reason (optional)</label>
            <input value={grantReason} onChange={e => setGrantReason(e.target.value)}
              placeholder="e.g. YouTube collaboration"
              style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #d1d5db", marginBottom: 18, boxSizing: "border-box" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setGrantFor(null)} disabled={grantBusy}
                style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={submitGrant} disabled={grantBusy}
                style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#7c3aed", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                {grantBusy ? "Granting…" : "Grant plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
