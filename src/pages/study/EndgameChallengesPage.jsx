// src/pages/study/EndgameChallengesPage.jsx
//
// Dedicated page for the curated "Endgame Challenges" — the play-out-vs-engine
// positions an admin picks (/api/endgame-trainer/*). These used to render as a
// band inside the Endgames browser; they now live on their own page so the
// browse-by-type grid and the curated challenges don't compete for the same
// screen. The Endgames page links here with a card.
import React from "react";
import { useNavigate } from "react-router-dom";
import EndgameTrainer from "../../components/EndgameTrainer";

export default function EndgameChallengesPage() {
  const navigate = useNavigate();

  return (
    <div style={styles.shell}>
      <div style={styles.bgGlow} />
      <div style={styles.page}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>👑 Endgame Challenges</h1>
            <p style={styles.subtitle}>
              Hand-picked endgames to play out against the engine. Convert the win —
              or hold the draw — to master each one.
            </p>
          </div>
          <button style={styles.secondaryBtn} onClick={() => navigate("/study/endgames")}>
            ← Back to Endgames
          </button>
        </div>

        {/* Renders its own family list / board. On its own page an empty state
            must say something — a blank screen reads as broken. */}
        <EndgameTrainer
          emptyFallback={
            <div style={styles.empty}>
              <div style={{ fontSize: 34, marginBottom: 10 }}>👑</div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>No challenges yet</div>
              <div style={{ color: "var(--color-text-muted)", fontSize: 13.5, lineHeight: 1.6 }}>
                Your coach hasn't added any endgame challenges. In the meantime you can
                browse thousands of real endgames by type.
              </div>
              <button style={{ ...styles.secondaryBtn, marginTop: 16 }} onClick={() => navigate("/study/endgames")}>
                Browse endgames →
              </button>
            </div>
          }
        />
      </div>
    </div>
  );
}

const styles = {
  shell: { position: "relative", minHeight: "100vh", background: "#05060a", color: "#e6e8ee" },
  bgGlow: {
    position: "absolute", inset: 0, pointerEvents: "none",
    background:
      "radial-gradient(900px 500px at 15% -10%, var(--color-warning-a12), transparent 60%)," +
      "radial-gradient(700px 500px at 100% 0%, rgba(167,139,250,0.08), transparent 55%)",
  },
  page: { position: "relative", maxWidth: 1200, margin: "0 auto", padding: "28px 20px 80px" },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 8, flexWrap: "wrap" },
  title: { fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.3 },
  subtitle: { color: "var(--color-text-muted)", fontSize: 14, margin: "8px 0 18px", maxWidth: 620, lineHeight: 1.6 },
  secondaryBtn: {
    flex: "0 0 auto", padding: "9px 16px", borderRadius: 'var(--radius-md)',
    border: "1px solid var(--color-white-a13)", background: "var(--color-white-a04)",
    color: "var(--color-text-muted)", cursor: "pointer", fontSize: 13, fontWeight: 700,
  },
  empty: {
    maxWidth: 460, margin: "40px auto", padding: "32px 28px", textAlign: "center",
    borderRadius: 'var(--radius-xl)', border: "1px solid var(--color-white-a07)",
    background: "var(--color-white-a04)",
  },
};
