import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const fmt = (d) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";

const STATUS_STYLE = {
  open: { label: "Open", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  replied: { label: "Replied", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  closed: { label: "Closed", color: "#9ca3af", bg: "rgba(156,163,175,0.12)" },
};

export default function AdminReports() {
  const nav = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | open | replied
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/reports/admin/all");
      setReports(Array.isArray(res.data) ? res.data : []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sendReply = async (id) => {
    if (!replyText.trim()) return alert("Please type a reply first");
    setSending(true);
    try {
      await api.post(`/api/reports/admin/${id}/reply`, { replyText });
      setReports((prev) =>
        prev.map((r) =>
          r._id === id
            ? { ...r, reply: replyText.trim(), status: "replied", repliedAt: new Date().toISOString(), readByAdmin: true }
            : r
        )
      );
      setReplyingTo(null);
      setReplyText("");
    } catch (err) {
      alert("Failed to send reply: " + (err?.response?.data?.message || err.message));
    } finally {
      setSending(false);
    }
  };

  const shown = reports.filter((r) => (filter === "all" ? true : r.status === filter));
  const openCount = reports.filter((r) => r.status === "open").length;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e5e7eb", fontFamily: "'Poppins', system-ui, sans-serif", padding: "28px 20px 64px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>
            🚩 User Reports{" "}
            {openCount > 0 && (
              <span style={{ fontSize: 13, color: "#f59e0b", background: "rgba(245,158,11,0.12)", padding: "3px 10px", borderRadius: 999, marginLeft: 8 }}>
                {openCount} open
              </span>
            )}
          </h1>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={load} style={btnGhost}>Refresh</button>
            <button onClick={() => nav("/admin")} style={btnGhost}>← Dashboard</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          {["all", "open", "replied"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{ ...btnGhost, ...(filter === f ? { background: "rgba(6,182,212,0.18)", borderColor: "rgba(6,182,212,0.5)", color: "#67e8f9" } : {}) }}
            >
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: "#9ca3af", marginTop: 32 }}>Loading…</p>
        ) : shown.length === 0 ? (
          <p style={{ color: "#9ca3af", marginTop: 32 }}>No reports.</p>
        ) : (
          <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
            {shown.map((r) => {
              const st = STATUS_STYLE[r.status] || STATUS_STYLE.open;
              const who = r.user
                ? `${r.user.displayName || r.user.username} (member)`
                : `${r.email || "guest"} (guest)`;
              return (
                <div key={r._id} style={{ padding: "18px 20px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{r.subject}</h3>
                    <span style={{ fontSize: 12, fontWeight: 700, color: st.color, background: st.bg, padding: "4px 12px", borderRadius: 999, whiteSpace: "nowrap" }}>{st.label}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "#9ca3af", marginTop: 4 }}>
                    {who} · {fmt(r.createdAt)}
                  </div>
                  <p style={{ marginTop: 10, fontSize: 14.5, lineHeight: 1.6, color: "#d1d5db", whiteSpace: "pre-wrap" }}>{r.details}</p>

                  {r.reply && (
                    <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 12, background: "rgba(16,185,129,0.06)", borderLeft: "3px solid #10b981" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#34d399", marginBottom: 4 }}>Your reply · {fmt(r.repliedAt)}</div>
                      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{r.reply}</p>
                    </div>
                  )}

                  {replyingTo === r._id ? (
                    <div style={{ marginTop: 14 }}>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={4}
                        placeholder={r.user ? "Reply — appears in the member's inbox…" : "Reply — emailed to the guest…"}
                        style={{ width: "100%", boxSizing: "border-box", background: "#111827", color: "#e5e7eb", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: 12, fontSize: 14, fontFamily: "inherit", resize: "vertical" }}
                      />
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button onClick={() => sendReply(r._id)} disabled={sending} style={btnPrimary}>
                          {sending ? "Sending…" : "Send reply"}
                        </button>
                        <button onClick={() => { setReplyingTo(null); setReplyText(""); }} style={btnGhost}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setReplyingTo(r._id); setReplyText(r.reply || ""); }}
                      style={{ ...btnGhost, marginTop: 12 }}
                    >
                      {r.reply ? "Edit / resend reply" : "Reply"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const btnGhost = {
  background: "rgba(255,255,255,0.05)",
  color: "#e5e7eb",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 10,
  padding: "8px 16px",
  fontSize: 13.5,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const btnPrimary = {
  background: "linear-gradient(135deg, #06b6d4, #10b981)",
  color: "#04201f",
  border: "none",
  borderRadius: 10,
  padding: "9px 20px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};
