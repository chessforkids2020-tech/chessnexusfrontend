import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import SEO from "../components/SEO";

const fmt = (d) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";

const STATUS_STYLE = {
  open: { label: "Awaiting reply", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  replied: { label: "Replied", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  closed: { label: "Closed", color: "#9ca3af", bg: "rgba(156,163,175,0.12)" },
};

export default function MyReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get("/api/reports/mine");
        const list = Array.isArray(res.data) ? res.data : [];
        if (!alive) return;
        setReports(list);
        // Mark any unread replies as read so the badge clears.
        list
          .filter((r) => r.status === "replied" && r.readByUser === false)
          .forEach((r) => api.put(`/api/reports/${r._id}/read`).catch(() => {}));
      } catch {
        if (alive) setReports([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 18px 64px", color: "#e5e7eb", fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <SEO title="My Reports — Chess Nexus" canonical="/my-reports" noIndex />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>📨 My Reports</h1>
        <Link
          to="/report"
          style={{ textDecoration: "none", color: "#67e8f9", fontWeight: 700, fontSize: 14, padding: "8px 16px", borderRadius: 12, background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.3)" }}
        >
          + New report
        </Link>
      </div>
      <p style={{ color: "#9ca3af", fontSize: 14, marginTop: 6 }}>
        Your reports and replies from the Chess Nexus team.
      </p>

      {loading ? (
        <p style={{ color: "#9ca3af", marginTop: 32 }}>Loading…</p>
      ) : reports.length === 0 ? (
        <div style={{ marginTop: 40, textAlign: "center", color: "#9ca3af" }}>
          <div style={{ fontSize: 40 }}>📭</div>
          <p>You haven't sent any reports yet.</p>
          <Link to="/report" style={{ color: "#67e8f9", fontWeight: 700 }}>Submit a report →</Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14, marginTop: 22 }}>
          {reports.map((r) => {
            const st = STATUS_STYLE[r.status] || STATUS_STYLE.open;
            return (
              <div
                key={r._id}
                style={{ padding: "18px 20px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{r.subject}</h3>
                  <span style={{ fontSize: 12, fontWeight: 700, color: st.color, background: st.bg, padding: "4px 12px", borderRadius: 999, whiteSpace: "nowrap" }}>
                    {st.label}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{fmt(r.createdAt)}</div>
                <p style={{ marginTop: 10, fontSize: 14.5, lineHeight: 1.6, color: "#d1d5db", whiteSpace: "pre-wrap" }}>{r.details}</p>

                {r.reply ? (
                  <div style={{ marginTop: 14, padding: "14px 16px", borderRadius: 12, background: "rgba(16,185,129,0.06)", borderLeft: "3px solid #10b981" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#34d399", marginBottom: 6 }}>
                      ♟️ Chess Nexus Team replied · {fmt(r.repliedAt)}
                    </div>
                    <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65, color: "#e5e7eb", whiteSpace: "pre-wrap" }}>{r.reply}</p>
                  </div>
                ) : (
                  <p style={{ marginTop: 12, fontSize: 13, color: "#9ca3af" }}>
                    The team will review this and reply here shortly.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
