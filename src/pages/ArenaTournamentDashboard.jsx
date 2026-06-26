import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { Chess } from "chess.js";
import api from "../api";
import SEO from "../components/SEO";
import UserAvatar from "../components/UserAvatar";
import Chessboard from "../components/Chessboard";
import { useAuth } from "../contexts/AuthContext";
import "./arenatournament/ArenaTournamentLeaderboard.css";
import "./UserGamesPage.css";

const DEFAULT_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const TYPE_LABELS = {
  standard: "Standard",
  chess960: "Chess960",
  bullet_blitz_marathon: "Bullet Blitz",
  team_battle: "Team Battle",
};
const TYPE_ICON = {
  standard: "♞",
  chess960: "960",
  bullet_blitz_marathon: "⚡",
  team_battle: "🛡️",
};
const TYPE_COLOR = {
  standard:              { bg: "rgba(16,185,129,0.22)", color: "#34d399", border: "rgba(16,185,129,0.4)" },
  chess960:              { bg: "rgba(139,92,246,0.22)", color: "#a78bfa", border: "rgba(139,92,246,0.4)" },
  bullet_blitz_marathon: { bg: "rgba(245,158,11,0.22)", color: "#fbbf24", border: "rgba(245,158,11,0.4)" },
  team_battle:           { bg: "rgba(99,102,241,0.22)", color: "#818cf8", border: "rgba(99,102,241,0.4)" },
};
const typeLabel = (t) => TYPE_LABELS[t] || "Standard";
const typeColor = (t) => TYPE_COLOR[t] || TYPE_COLOR.standard;

const CROWN = {
  none:     { label: "None",     color: "#6b7280", filter: "grayscale(1) brightness(0.6)" },
  bronze:   { label: "Bronze",   color: "#c08457", filter: "sepia(1) saturate(2.4) brightness(0.78) hue-rotate(-12deg) drop-shadow(0 0 14px rgba(176,110,58,0.7))" },
  silver:   { label: "Silver",   color: "#e5e7eb", filter: "grayscale(1) brightness(1.35) drop-shadow(0 0 12px rgba(226,232,240,0.5))" },
  gold:     { label: "Gold",     color: "#fbbf24", filter: "drop-shadow(0 0 16px rgba(251,191,36,0.7))" },
  platinum: { label: "Platinum", color: "#f8fafc", filter: "grayscale(1) brightness(1.65) drop-shadow(0 0 16px rgba(226,232,240,0.8))" },
  gem:      { label: "Gem",      color: "#60a5fa", filter: "hue-rotate(200deg) saturate(2.4) brightness(1.05) drop-shadow(0 0 16px rgba(59,130,246,0.9))" },
};
const TIER_ORDER = ["none", "bronze", "silver", "gold", "platinum", "gem"];

// Marathon podium trophies (no crown progression). Ordered best → worst.
const MARATHON_PLACES = [
  { key: "first",  img: "marathonfirst",  label: "1st", color: "#fbbf24", glow: "rgba(251,191,36,0.75)" },
  { key: "second", img: "marathonsecond", label: "2nd", color: "#e5e7eb", glow: "rgba(226,232,240,0.6)" },
  { key: "third",  img: "marathonthird",  label: "3rd", color: "#c08457", glow: "rgba(176,110,58,0.65)" },
];

const Crown = ({ tier = "gold", size = 28 }) => {
  if (!tier || tier === "none") {
    return <span style={{ fontSize: size, lineHeight: 1, filter: CROWN.none.filter, opacity: 0.45 }}>👑</span>;
  }
  return (
    <img
      src={`/arenadashboardcrowns/${tier}crown.png`}
      alt={`${CROWN[tier]?.label || tier} Crown`}
      style={{ width: size, height: size, objectFit: "contain", display: "inline-block", verticalAlign: "middle" }}
    />
  );
};

const timeAgo = (d) => {
  if (!d) return "";
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
const startsIn = (d) => {
  if (!d) return "";
  const s = Math.floor((new Date(d) - Date.now()) / 1000);
  if (s <= 0) return "Starting…";
  const days = Math.floor(s / 86400), hrs = Math.floor((s % 86400) / 3600), mins = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days}d ${hrs}h`;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};
const fmtTime = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

function nextCrownInfo(tier, streak) {
  if (tier === "gem") return null;
  if (tier === "platinum") return { next: "gem",      need: Math.max(1, 5 - streak), have: streak, of: 5 };
  if (tier === "gold")     return { next: "platinum", need: Math.max(1, 3 - streak), have: streak, of: 3 };
  return { next: "gold", need: 1, have: 0, of: 1 };
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ArenaTournamentDashboard() {
  const { displayName: routeDisplayName } = useParams();
  const { user } = useAuth();
  const isPublic = Boolean(routeDisplayName);

  const [data,     setData]     = useState(null);
  const [profile,  setProfile]  = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState("overview");
  const [showAllTrophies, setShowAllTrophies] = useState(false);

  const ownerName = data?.displayName || routeDisplayName || user?.displayName || user?.username || "";

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const url = isPublic
          ? `/api/public/player-tournaments/${encodeURIComponent(routeDisplayName)}`
          : "/api/arenatournament/my-tournaments";
        const res = await api.get(url);
        if (alive) setData(res.data || null);
      } catch { if (alive) setData(null); }
      finally  { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [isPublic, routeDisplayName]);

  useEffect(() => {
    if (!ownerName) return;
    let alive = true;
    api.get(`/api/public/profile/${encodeURIComponent(ownerName)}`)
      .then((r) => { if (alive) setProfile(r.data || null); })
      .catch(() => {});
    return () => { alive = false; };
  }, [ownerName]);

  useEffect(() => {
    let alive = true;
    api.get("/api/arenatournament/list")
      .then((res) => {
        const up = (res.data?.tournaments || [])
          .filter((t) => t.status !== "finished")
          .sort((a, b) => new Date(a.scheduledStartTime) - new Date(b.scheduledStartTime))
          .slice(0, 4);
        if (alive) setUpcoming(up);
      }).catch(() => {});
    return () => { alive = false; };
  }, [isPublic]);

  const summary    = data?.summary || {};
  const tournaments = data?.tournaments || [];
  const tier       = summary.arenaCrownTier || "none";
  const streak     = summary.arenaConsecutiveWins || 0;
  const perf       = summary.performance || { wins: 0, top3: 0, winRate: 0, totalPoints: 0 };
  const lf         = summary.lastFinish;
  const finished   = tournaments.filter((t) => t.status === "finished");
  const podiums    = finished.filter((t) => t.myRank <= 3);
  const next       = nextCrownInfo(tier, streak);

  const teamBattleTrophies = summary.teamBattleTrophies || 0;

  // ── Marathon podium trophies (best earned shown biggest, in center) ───────
  const marathonCounts = summary.marathonTrophies || { first: 0, second: 0, third: 0 };
  const marathonTotal  = marathonCounts.first + marathonCounts.second + marathonCounts.third;
  const bestMarathon   = ["first", "second", "third"].find((k) => marathonCounts[k] > 0) || null;

  // ── Per-type performance breakdown (from the user's finished tournaments) ──
  const perfByType = ["standard", "chess960", "bullet_blitz_marathon", "team_battle"].map((type) => {
    const list = finished.filter((t) => (t.tournamentType || "standard") === type);
    const played = list.length;
    const wins = list.filter((t) => t.myRank === 1).length;
    const top3 = list.filter((t) => t.myRank <= 3).length;
    const points = list.reduce((s, t) => s + (t.myScore || 0), 0);
    const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;
    return { type, played, wins, top3, points, winRate };
  });

  // ── Unified trophy list ──────────────────────────────────────────────────
  // Each podium finish is one trophy; each team-battle win is one trophy.
  // marathon → marathon image · standard/chess960 → crown · team_battle → teambattle image
  const crownTrophies = [];
  const marathonTrophyList = [];
  podiums.forEach((t) => {
    const date = new Date(t.endTime || t.scheduledStartTime || 0).getTime();
    const item = {
      id: t._id,
      type: t.tournamentType,
      rank: t.myRank,
      date,
      title: `#${t.myRank} · ${t.name}`,
    };
    if (t.tournamentType === "bullet_blitz_marathon") marathonTrophyList.push(item);
    else if (t.tournamentType !== "team_battle") crownTrophies.push(item);
  });
  const teamBattleList = Array.from({ length: teamBattleTrophies }, (_, i) => ({
    id: `tb-${i}`,
    type: "team_battle",
    rank: 1,
    date: 0,
    title: "Team Battle Champion",
  }));
  // Flat list, newest first, for the showcase (latest 5)
  const allTrophies = [...crownTrophies, ...marathonTrophyList, ...teamBattleList]
    .sort((a, b) => b.date - a.date);
  const totalTrophies = allTrophies.length;

  const trophies   = profile?.badges?.length ?? (perf.wins + perf.top3);
  const memberYear = profile?.memberSince ? new Date(profile.memberSince).getFullYear() : null;
  const dayStreak  = profile?.activity?.stats?.currentStreak || 0;
  const verified   = ["elite", "admin"].includes(profile?.role);
  // Avatar source: the viewed profile when available, else the logged-in user's
  // own fields (private view). Passed to the shared <UserAvatar> (3D shown frozen).
  const avatarUser = {
    profilePhotoUrl: profile?.profilePhotoUrl || (!isPublic ? user?.profilePhotoUrl : null) || null,
    activeAvatarUrl: profile?.activeAvatarUrl || (!isPublic ? user?.activeAvatarUrl : null) || null,
    active3dModel:   profile?.active3dModel   || (!isPublic ? user?.active3dModel : null) || null,
  };

  return (
    <div style={S.page}>
      {/* obsidian background glows */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "50%", height: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: "40%", height: "40%", background: "radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)", borderRadius: "50%" }} />
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>
      <SEO title={`${isPublic ? `${ownerName}'s ` : ""}Arena Tournament Dashboard — Chess Nexus`} noIndex />

      {loading ? (
          <p style={{ color: "#9ca3af", marginTop: 24 }}>Loading…</p>
        ) : tab === "games" ? (
          <GamesPanel name={ownerName} onBack={() => setTab("overview")} />
        ) : (
          <div style={S.cols}>

            {/* ════════════════ MAIN (LEFT) COLUMN ════════════════ */}
            <div style={S.colMain}>

              {/* ── PROFILE HEADER ── */}
              <div style={S.card}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 18 }}>

                  {/* LEFT — avatar + name + trophies chip */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 16, minWidth: 0 }}>
                    <div style={S.avatar}>
                      <UserAvatar user={avatarUser} displayName={ownerName} size={68} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 22, fontWeight: 800 }}>
                        {ownerName}
                        {verified && <span style={S.verified}>✓</span>}
                      </div>
                      {memberYear && (
                        <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>Member since {memberYear}</div>
                      )}
                      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        <Chip icon="🏆" color="#fbbf24">{trophies} Trophies</Chip>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT — Trophy Case: latest 5 (crowns, marathon & team battle). View All for more. */}
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    {totalTrophies === 0
                      ? <span style={{ color: "#6b7280", fontSize: 13 }}>No trophies yet</span>
                      : (
                        <>
                          {allTrophies.slice(0, 5).map((t) => (
                            <TrophyIcon key={t.id} rank={t.rank} type={t.type} title={t.title} />
                          ))}
                          {totalTrophies > 5 && (
                            <button onClick={() => setShowAllTrophies(true)} style={S.viewAllTrophiesBtn}>
                              View All ({totalTrophies})
                            </button>
                          )}
                        </>
                      )}
                  </div>

                </div>
              </div>

              {/* ── TITLE ROW ── */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Arena Tournaments</h1>
                  <p style={{ color: "#9ca3af", fontSize: 12, margin: "3px 0 0" }}>Learn. Compete. Be the Champion.</p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => setTab(tab === "games" ? "overview" : "games")} style={S.ghostBtn}>
                    {tab === "games" ? "← Overview" : "🎮 Tournament Games"}
                  </button>
                  <Link to={isPublic ? `/player/${encodeURIComponent(routeDisplayName)}` : "/dashboard"} style={S.ghostBtn}>
                    ← Profile
                  </Link>
                </div>
              </div>

              {/* Crown card — 3 columns: small | medium | large */}
              <Card style={{
                padding: "10px 16px",
                background: `linear-gradient(180deg, ${
                  tier === "none"     ? "rgba(140,60,60,0.07)"    :
                  tier === "bronze"   ? "rgba(160,70,50,0.09)"    :
                  tier === "silver"   ? "rgba(150,60,60,0.08)"    :
                  tier === "gold"     ? "rgba(160,80,40,0.09)"    :
                  tier === "platinum" ? "rgba(150,60,70,0.08)"    :
                                        "rgba(120,50,100,0.09)"
                } 0%, rgba(23,23,23,0.7) 50%)`,
                borderTop: `1px solid ${
                  tier === "none"     ? "rgba(140,60,60,0.18)"    :
                  tier === "bronze"   ? "rgba(160,70,50,0.28)"    :
                  tier === "silver"   ? "rgba(150,60,60,0.22)"    :
                  tier === "gold"     ? "rgba(160,80,40,0.28)"    :
                  tier === "platinum" ? "rgba(150,60,70,0.22)"    :
                                        "rgba(120,50,100,0.25)"
                }`,
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "22% 28% 1fr", gap: 18, alignItems: "start" }}>

                  {/* LEFT — small: Crown status */}
                  <div style={{ textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.07)", paddingRight: 16 }}>
                    <SectionLabel center style={{ color: "#b8860b", fontSize: 13 }}>Crown Status</SectionLabel>
                    <div style={{ marginTop: 10, position: "relative", width: 110, height: 110, margin: "10px auto 0", overflow: "visible" }}>
                      {/* sparkle burst behind crown — very dim */}
                      <img
                        src="/arenadashboardcrowns/goldsparkle.svg"
                        alt=""
                        aria-hidden="true"
                        style={{
                          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                          width: "280%", height: "280%",
                          objectFit: "contain", pointerEvents: "none",
                          opacity: tier === "none" ? 0.08 : 0.28,
                          filter: tier === "silver" || tier === "platinum"
                            ? "grayscale(1) brightness(1.8)"
                            : tier === "gem"
                            ? "hue-rotate(200deg) saturate(2)"
                            : tier === "bronze"
                            ? "sepia(1) saturate(1.8) brightness(0.85)"
                            : "none",
                        }}
                      />
                      {tier === "none" ? (
                        <img
                          src="/arenadashboardcrowns/goldcrown.png"
                          alt="No Crown"
                          style={{ width: 110, height: 110, objectFit: "contain", opacity: 0.15, filter: "grayscale(1)", position: "relative", zIndex: 1 }}
                        />
                      ) : (
                        <img
                          src={`/arenadashboardcrowns/${tier}crown.png`}
                          alt={`${CROWN[tier].label} Crown`}
                          style={{ width: 110, height: 110, objectFit: "contain", position: "relative", zIndex: 1 }}
                        />
                      )}
                    </div>
                    <div style={{ marginTop: -8, fontSize: 13.5, fontWeight: 800, color: tier === "none" ? "#6b7280" : (CROWN[tier] || CROWN.gold).color, textAlign: "center" }}>
                      {tier === "none" ? "No Crown" : `${CROWN[tier]?.label} Crown`}
                    </div>
                  </div>

                  {/* MIDDLE — medium: To next crown */}
                  <div style={{ textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.07)", paddingRight: 16 }}>
                    <SectionLabel center>To Next Crown</SectionLabel>
                    {next ? (
                      <>
                        <div style={{ marginTop: 8 }}><Crown tier={next.next} size={38} /></div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 7 }}>
                          {next.need === 1 ? "Win 1 more tournament" : `Win ${next.need} more tournaments`}
                        </div>
                        <div style={S.progressTrack}>
                          <div style={{ ...S.progressFill, width: `${Math.min(100, (next.have / next.of) * 100)}%` }} />
                        </div>
                        <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 5 }}>
                          {next.have} / {next.of} · Get {CROWN[next.next].label} Crown
                        </div>
                      </>
                    ) : (
                      <div style={{ marginTop: 24, fontSize: 13.5, fontWeight: 700, color: "#60a5fa" }}>
                        💎 Highest crown reached!
                      </div>
                    )}
                  </div>

                  {/* RIGHT — bigger: Crown guide */}
                  <div>
                    <SectionLabel>Crown Guide</SectionLabel>
                    <p style={{ fontSize: 12.5, color: "#9ca3af", margin: "8px 0 14px", lineHeight: 1.6 }}>
                      Road to next crown
                    </p>
                    {/* Crown tier progress path */}
                    <div style={{ position: "relative" }}>
                      {/* crowns row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        {TIER_ORDER.map((t) => {
                          const tierIdx    = TIER_ORDER.indexOf(t);
                          const currentIdx = TIER_ORDER.indexOf(tier);
                          const isActive   = t === tier;
                          const isPast     = tierIdx <= currentIdx;
                          return (
                            <div key={t} style={{ textAlign: "center", flex: 1, opacity: isPast ? 1 : 0.38 }}>
                              <Crown tier={t} size={36} />
                              <div style={{ fontSize: 10, fontWeight: 700, marginTop: 4, color: isActive ? CROWN[t].color : "#6b7280", whiteSpace: "nowrap" }}>
                                {CROWN[t].label}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* dot + line row — sits between crowns and labels */}
                      <div style={{ position: "relative", height: 14, margin: "4px 0" }}>
                        {/* full grey track through all dots */}
                        <div style={{
                          position: "absolute", top: "50%", transform: "translateY(-50%)",
                          left: `${100 / 12}%`, right: `${100 / 12}%`,
                          height: 3, borderRadius: 999, background: "rgba(255,255,255,0.10)",
                        }} />
                        {/* filled track up to active tier */}
                        <div style={{
                          position: "absolute", top: "50%", transform: "translateY(-50%)",
                          left: `${100 / 12}%`,
                          height: 3, borderRadius: 999,
                          background: tier === "none" ? "transparent"
                            : tier === "bronze"   ? "#c08457"
                            : tier === "silver"   ? "linear-gradient(90deg,#c08457,#e5e7eb)"
                            : tier === "gold"     ? "linear-gradient(90deg,#c08457,#fbbf24)"
                            : tier === "platinum" ? "linear-gradient(90deg,#c08457,#f8fafc)"
                            :                       "linear-gradient(90deg,#c08457,#60a5fa)",
                          width: tier === "none"     ? "0%"
                            : tier === "bronze"   ? `${(1/5)*100*(4/5)}%`
                            : tier === "silver"   ? `${(2/5)*100*(4/5)}%`
                            : tier === "gold"     ? `${(3/5)*100*(4/5)}%`
                            : tier === "platinum" ? `${(4/5)*100*(4/5)}%`
                            :                       `${(4/5)*100}%`,
                          transition: "width 0.4s ease",
                        }} />
                        {/* dots, one per tier, evenly spaced */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: "100%", position: "relative", zIndex: 1 }}>
                          {TIER_ORDER.map((t) => {
                            const tierIdx    = TIER_ORDER.indexOf(t);
                            const currentIdx = TIER_ORDER.indexOf(tier);
                            const isActive   = t === tier;
                            const isPast     = tierIdx <= currentIdx;
                            return (
                              <div key={t} style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                                <div style={{
                                  width:  isActive ? 11 : 7,
                                  height: isActive ? 11 : 7,
                                  borderRadius: "50%",
                                  background: isActive
                                    ? (CROWN[tier]?.color || "#fbbf24")
                                    : isPast ? "rgba(255,255,255,0.40)" : "rgba(255,255,255,0.12)",
                                  boxShadow: isActive ? `0 0 10px ${CROWN[tier]?.color || "#fbbf24"}, 0 0 4px ${CROWN[tier]?.color || "#fbbf24"}` : "none",
                                  transition: "all 0.3s",
                                }} />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              </Card>

              {/* Boost + How to win */}
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 10, alignItems: "start" }}>
                <Card style={{ background: "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(10,10,20,0.98) 100%)", border: "1px solid rgba(99,102,241,0.18)", minWidth: 0 }}>
                  <SectionLabel>Boost Your Points</SectionLabel>
                  <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "stretch" }}>
                    <Boost icon="⚡" title="Play 3 Tournaments" sub="Carry Bonus"    pts="+2 Points" color="#fbbf24" />
                    <Boost icon="🐦" title="Join Early"         sub="Early Bird Bonus" pts="+3 Points" color="#34d399" />
                  </div>
                </Card>

                <Card style={{ padding: 0, overflow: "hidden", position: "relative", background: "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(10,10,20,0.98) 100%)", border: "1px solid rgba(99,102,241,0.18)" }}>
                  {/* image layer — pinned to right, full card height */}
                  <img
                    src="/arenadashboardcrowns/howtowin.png"
                    alt=""
                    aria-hidden="true"
                    style={{ position: "absolute", top: 0, right: 0, height: "100%", width: 140, objectFit: "cover", objectPosition: "center", opacity: 0.22, pointerEvents: "none", zIndex: 0 }}
                  />
                  {/* text layer — full width on top */}
                  <div style={{ position: "relative", zIndex: 1, padding: "16px 18px", width: "100%" }}>
                    <SectionLabel>How to Win Next Time</SectionLabel>
                    <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "grid", gap: 7 }}>
                      {[
                        "Start early and be consistent from the first round.",
                        "Focus on accuracy, not just speed.",
                        "Control the center and watch for tactics.",
                        "Practice endgames — they decide close games.",
                      ].map((tip) => (
                        <li key={tip} style={{ display: "flex", gap: 7, fontSize: 11.5, color: "#cbd5e1", lineHeight: 1.5 }}>
                          <span style={{ color: "#10b981", flexShrink: 0 }}>✓</span>{tip}
                        </li>
                      ))}
                    </ul>
                    <Link to="/puzzles-hub" style={{ ...S.ghostBtn, display: "inline-block", marginTop: 12, fontSize: 11.5, padding: "6px 12px" }}>
                      💡 View daily Tips
                    </Link>
                  </div>
                </Card>
              </div>

              {/* Upcoming + Recent */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  <Card>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <SectionLabel>Upcoming Tournaments</SectionLabel>
                      <Link to="/schedule" style={S.linkSmall}>View Calendar</Link>
                    </div>
                    {upcoming.length === 0
                      ? <Empty text="No tournaments available." />
                      : upcoming.map((t) => {
                          const tc = typeColor(t.tournamentType);
                          return (
                            <div key={t._id} style={S.upcomingRow}>
                              {/* PART 1 — icon + tournament name */}
                              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                                <div style={{ ...S.typeIconBox, background: tc.bg, border: `1px solid ${tc.border}`, color: tc.color, flexShrink: 0 }}>
                                  {TYPE_ICON[t.tournamentType] || "♞"}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: tc.color, background: tc.bg, borderRadius: 6, padding: "1px 7px", display: "inline-block", marginTop: 3 }}>
                                    {typeLabel(t.tournamentType)}
                                  </span>
                                </div>
                              </div>
                              {/* PART 2 — starts in */}
                              <div style={{ textAlign: "center", flexShrink: 0, padding: "0 12px" }}>
                                <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>Starts in</div>
                                <div style={{ fontSize: 13, color: "#06b6d4", fontWeight: 800, marginTop: 2 }}>{startsIn(t.scheduledStartTime)}</div>
                              </div>
                              {/* PART 3 — join button */}
                              <div style={{ flexShrink: 0 }}>
                                <Link to="/arenatournament" style={S.joinBtn}>
                                  {t.status === "active" ? "🔴 Live" : t.status === "lobby" ? "Join Now" : "Join"}
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                    <Link to="/arenatournament" style={S.footerBtn}>🏆 View All Tournaments</Link>
                  </Card>

                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <SectionLabel>Recent Tournaments</SectionLabel>
                    <Link to="/arenatournament" style={S.linkSmall}>View All</Link>
                  </div>
                  {finished.length === 0
                    ? <Empty text="No recently played tournaments." />
                    : finished.slice(0, 4).map((t) => (
                      <div key={t._id} style={S.recentRow}>
                        {/* Circular rank medal */}
                        <RankCircle rank={t.myRank} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                          <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>{typeLabel(t.tournamentType)}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>{timeAgo(t.endTime || t.scheduledStartTime)}</div>
                          <div style={{ fontWeight: 800, fontSize: 15, color: t.myRank === 1 ? "#fbbf24" : "#e5e7eb" }}>#{t.myRank}</div>
                          <div style={{ color: "#34d399", fontSize: 12.5, fontWeight: 700 }}>{t.myScore} pts</div>
                        </div>
                      </div>
                    ))}
                  <button onClick={() => setTab("games")} style={{ ...S.footerBtn, border: "none", cursor: "pointer", width: "100%" }}>
                    🎮 Tournament Games
                  </button>
                </Card>
              </div>

            </div>
            {/* ════════════════ END MAIN COLUMN ════════════════ */}

            {/* ════════════════ RIGHT SIDEBAR ════════════════ */}
            <div style={S.colSide}>

              {/* Team Battle Status */}
              <Card>
                <SectionLabel>Team Battle Status</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginTop: 14 }}>
                  <img
                    src="/arenadashboardcrowns/teambattle.png"
                    alt="Team Battle Trophy"
                    style={{
                      width: 210, height: 210, objectFit: "contain",
                      filter: teamBattleTrophies > 0 ? "none" : "grayscale(1) brightness(0.6)",
                      opacity: teamBattleTrophies > 0 ? 1 : 0.35,
                    }}
                  />
                  {teamBattleTrophies > 0 ? (
                    <>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#818cf8", marginTop: 8 }}>
                        Team Battle Champion
                      </div>
                      <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600, marginTop: 2 }}>
                        {teamBattleTrophies} {teamBattleTrophies === 1 ? "trophy" : "trophies"} won
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#6b7280", marginTop: 8 }}>
                        No Trophy Yet
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginTop: 2 }}>
                        Win a team battle to get one
                      </div>
                    </>
                  )}
                </div>
              </Card>

              {/* Congratulations card (last tournament was a win) */}
              {lf && lf.rank === 1 && (
                <Card highlight>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ fontSize: 40, lineHeight: 1 }}>🏆</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: "#34d399" }}>Congratulations!</div>
                      <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 2 }}>You won your last tournament!</div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Marathon Trophies — podium hero (best earned biggest, in center) */}
              <Card>
                <SectionLabel>Marathon Trophies</SectionLabel>
                <MarathonPodiumCard counts={marathonCounts} best={bestMarathon} />
                {marathonTotal === 0 && (
                  <div style={{ textAlign: "center", fontSize: 12, color: "#6b7280", marginTop: 8 }}>
                    No marathon trophies yet — finish top 3 in a marathon to earn one.
                  </div>
                )}
              </Card>

              {/* Blunder DNA (own profile) — replaces the old Performance Overview card.
                  Public profiles keep the per-type Performance Overview instead. */}
              {!isPublic ? (
                <BlunderDnaCard />
              ) : (
                <Card>
                  <SectionLabel>Performance Overview</SectionLabel>
                  <div style={{ marginTop: 14, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
                    {/* header row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1.6fr 0.7fr 0.7fr 0.7fr 0.8fr 0.9fr", background: "rgba(255,255,255,0.04)", padding: "8px 10px" }}>
                      {["Type", "Played", "Wins", "Top 3", "Win %", "Points"].map((h, i) => (
                        <div key={h} style={{ fontSize: 9.5, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em", textAlign: i === 0 ? "left" : "center" }}>{h}</div>
                      ))}
                    </div>
                    {/* per-type rows */}
                    {perfByType.map((row) => {
                      const tc = typeColor(row.type);
                      const dim = row.played === 0;
                      return (
                        <div key={row.type} style={{ display: "grid", gridTemplateColumns: "1.6fr 0.7fr 0.7fr 0.7fr 0.8fr 0.9fr", padding: "9px 10px", borderTop: "1px solid rgba(255,255,255,0.05)", alignItems: "center", opacity: dim ? 0.4 : 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                            <span style={{ width: 22, height: 22, borderRadius: 6, background: tc.bg, border: `1px solid ${tc.border}`, color: tc.color, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {TYPE_ICON[row.type] || "♞"}
                            </span>
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#e5e7eb", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{typeLabel(row.type)}</span>
                          </div>
                          <div style={{ textAlign: "center", fontSize: 13, fontWeight: 800, color: "#e5e7eb" }}>{row.played}</div>
                          <div style={{ textAlign: "center", fontSize: 13, fontWeight: 800, color: "#34d399" }}>{row.wins}</div>
                          <div style={{ textAlign: "center", fontSize: 13, fontWeight: 800, color: "#fbbf24" }}>{row.top3}</div>
                          <div style={{ textAlign: "center", fontSize: 13, fontWeight: 800, color: "#06b6d4" }}>{row.winRate}%</div>
                          <div style={{ textAlign: "center", fontSize: 13, fontWeight: 800, color: "#a78bfa" }}>{row.points}</div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

            </div>
            {/* ════════════════ END RIGHT SIDEBAR ════════════════ */}

            {/* ════════════════ FULL-WIDTH MONTH COMPARISON + LIFETIME ════════════════ */}
            <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <MonthStatsCard
                title="This Month"
                rows={summary.performanceThisMonth || []}
                compareRows={summary.performanceLastMonth || []}
                showArrows
              />
              <MonthStatsCard
                title="Last Month"
                rows={summary.performanceLastMonth || []}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <LifetimeStatsCard rows={summary.performanceByType || []} />
            </div>

          </div>
        )}

        {/* ── All Trophies popup ── */}
        {showAllTrophies && (
          <AllTrophiesModal
            crowns={crownTrophies}
            marathons={marathonTrophyList}
            teamBattles={teamBattleList}
            onClose={() => setShowAllTrophies(false)}
          />
        )}
      </div>
    </div>
  );
}

// ── All Trophies modal — grouped by type, one row each, tightly packed ────────
function AllTrophiesModal({ crowns, marathons, teamBattles, onClose }) {
  const rows = [
    { key: "crown",    label: "Crowns",              items: crowns },
    { key: "marathon", label: "Marathon Trophies",   items: marathons },
    { key: "team",     label: "Team Battle Trophies", items: teamBattles },
  ].filter((r) => r.items.length > 0);

  return (
    <div style={S.trophyOverlay} onClick={onClose}>
      <div style={S.trophyModal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>All Trophies</h2>
          <button onClick={onClose} style={S.trophyCloseBtn}>✕</button>
        </div>
        <div style={{ display: "grid", gap: 20 }}>
          {rows.map((row) => (
            <div key={row.key}>
              <SectionLabel>{row.label} · {row.items.length}</SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: 8 }}>
                {row.items.map((t) => (
                  <TrophyIcon key={t.id} rank={t.rank} type={t.type} title={t.title} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Month comparison card — per-type win/lose/draw rate + total games ─────────
// `showArrows` (This Month) compares each rate to the same type's previous-month value.
function MonthStatsCard({ title, rows, compareRows = [], showArrows = false }) {
  const TYPE_ROWS = ["standard", "chess960", "bullet_blitz_marathon", "team_battle"];
  const byType = Object.fromEntries((rows || []).map((r) => [r.type, r]));
  const cmpByType = Object.fromEntries((compareRows || []).map((r) => [r.type, r]));
  const blank = { games: 0, winRate: 0, loseRate: 0, drawRate: 0 };
  const data = TYPE_ROWS.map((type) => ({ type, ...blank, ...byType[type] }));

  const COLS = "1.4fr 1fr 1fr 1fr 0.9fr";
  const HEADERS = ["Type", "Win %", "Lose %", "Draw %", "Games"];

  // arrow: kind 'good' → up is green; 'bad' → up is red; 'neutral' → grey
  const Delta = ({ cur, prev, kind }) => {
    if (!showArrows || prev == null) return null;
    const d = cur - prev;
    if (d === 0) return <span style={{ fontSize: 10, color: "#6b7280", marginLeft: 3 }}>＝</span>;
    const up = d > 0;
    const good = kind === "bad" ? !up : up;
    const color = kind === "neutral" ? "#9ca3af" : good ? "#34d399" : "#f87171";
    return (
      <span title={`${up ? "+" : ""}${d}% vs last month`} style={{ fontSize: 10.5, fontWeight: 800, color, marginLeft: 3 }}>
        {up ? "▲" : "▼"}{Math.abs(d)}
      </span>
    );
  };

  return (
    <Card>
      <SectionLabel>{title} · By Type</SectionLabel>
      <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", marginTop: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: COLS, background: "rgba(255,255,255,0.04)", padding: "9px 12px" }}>
          {HEADERS.map((h, i) => (
            <div key={h} style={{ fontSize: 9.5, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em", textAlign: i === 0 ? "left" : "center" }}>{h}</div>
          ))}
        </div>
        {data.map((r) => {
          const tc = typeColor(r.type);
          const cmp = cmpByType[r.type] || blank;
          const dim = r.games === 0;
          return (
            <div key={r.type} style={{ display: "grid", gridTemplateColumns: COLS, padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.05)", alignItems: "center", opacity: dim ? 0.4 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, background: tc.bg, border: `1px solid ${tc.border}`, color: tc.color, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {TYPE_ICON[r.type] || "♞"}
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "#e5e7eb", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{typeLabel(r.type)}</span>
              </div>
              <div style={{ textAlign: "center", fontSize: 12.5, fontWeight: 800, color: "#ffffff" }}>
                {r.winRate}%<Delta cur={r.winRate} prev={cmp.winRate} kind="good" />
              </div>
              <div style={{ textAlign: "center", fontSize: 12.5, fontWeight: 800, color: "#ffffff" }}>
                {r.loseRate}%<Delta cur={r.loseRate} prev={cmp.loseRate} kind="bad" />
              </div>
              <div style={{ textAlign: "center", fontSize: 12.5, fontWeight: 800, color: "#ffffff" }}>
                {r.drawRate}%<Delta cur={r.drawRate} prev={cmp.drawRate} kind="neutral" />
              </div>
              <div style={{ textAlign: "center", fontSize: 12.5, fontWeight: 800, color: "#e5e7eb" }}>{r.games}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Lifetime stats table — full width, all tournament types, from join to today ──
function LifetimeStatsCard({ rows }) {
  const TYPE_ROWS = ["standard", "chess960", "bullet_blitz_marathon", "team_battle"];
  const byType = Object.fromEntries((rows || []).map((r) => [r.type, r]));
  const data = TYPE_ROWS.map((type) => byType[type] || {
    type, played: 0, first: 0, top3: 0, gamesWon: 0, gamesLost: 0, gamesDrawn: 0,
    points: 0, games: 0, winRate: 0, loseRate: 0, drawRate: 0,
  });

  // Totals row across all types
  const tot = data.reduce((a, r) => ({
    played: a.played + r.played, first: a.first + r.first, top3: a.top3 + r.top3,
    gamesWon: a.gamesWon + r.gamesWon, gamesLost: a.gamesLost + r.gamesLost,
    gamesDrawn: a.gamesDrawn + r.gamesDrawn, points: a.points + r.points,
  }), { played: 0, first: 0, top3: 0, gamesWon: 0, gamesLost: 0, gamesDrawn: 0, points: 0 });
  const totGames = tot.gamesWon + tot.gamesLost + tot.gamesDrawn;
  const totPct = (n) => (totGames > 0 ? Math.round((n / totGames) * 100) : 0);

  const COLS = "1.4fr 0.8fr 0.7fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 0.9fr";
  const HEADERS = ["Type", "Played", "1st", "Top 3", "Win", "Lose", "Draw", "Win %", "Lose %", "Draw %", "Points"];

  return (
    <Card>
      <SectionLabel>Lifetime Tournament Stats · All Types</SectionLabel>
      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3, marginBottom: 12 }}>
        Every finished tournament since you joined. Win / Lose / Draw count individual games.
      </div>
      <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
        {/* header */}
        <div style={{ display: "grid", gridTemplateColumns: COLS, background: "rgba(255,255,255,0.04)", padding: "9px 12px" }}>
          {HEADERS.map((h, i) => (
            <div key={h} style={{ fontSize: 9.5, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em", textAlign: i === 0 ? "left" : "center" }}>{h}</div>
          ))}
        </div>
        {/* per-type rows */}
        {data.map((r) => {
          const tc = typeColor(r.type);
          const dim = r.played === 0;
          return (
            <div key={r.type} style={{ display: "grid", gridTemplateColumns: COLS, padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.05)", alignItems: "center", opacity: dim ? 0.4 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{ width: 24, height: 24, borderRadius: 6, background: tc.bg, border: `1px solid ${tc.border}`, color: tc.color, fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {TYPE_ICON[r.type] || "♞"}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#e5e7eb", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{typeLabel(r.type)}</span>
              </div>
              <StatCell value={r.played} color="#e5e7eb" />
              <StatCell value={r.first} color="#fbbf24" />
              <StatCell value={r.top3} color="#fbbf24" />
              <StatCell value={r.gamesWon} color="#34d399" />
              <StatCell value={r.gamesLost} color="#f87171" />
              <StatCell value={r.gamesDrawn} color="#9ca3af" />
              <StatCell value={`${r.winRate}%`} color="#34d399" />
              <StatCell value={`${r.loseRate}%`} color="#f87171" />
              <StatCell value={`${r.drawRate}%`} color="#9ca3af" />
              <StatCell value={r.points} color="#a78bfa" />
            </div>
          );
        })}
        {/* totals */}
        <div style={{ display: "grid", gridTemplateColumns: COLS, padding: "11px 12px", borderTop: "2px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)", alignItems: "center" }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: "#ffffff" }}>Total</div>
          <StatCell value={tot.played} color="#ffffff" bold />
          <StatCell value={tot.first} color="#fbbf24" bold />
          <StatCell value={tot.top3} color="#fbbf24" bold />
          <StatCell value={tot.gamesWon} color="#34d399" bold />
          <StatCell value={tot.gamesLost} color="#f87171" bold />
          <StatCell value={tot.gamesDrawn} color="#9ca3af" bold />
          <StatCell value={`${totPct(tot.gamesWon)}%`} color="#34d399" bold />
          <StatCell value={`${totPct(tot.gamesLost)}%`} color="#f87171" bold />
          <StatCell value={`${totPct(tot.gamesDrawn)}%`} color="#9ca3af" bold />
          <StatCell value={tot.points} color="#a78bfa" bold />
        </div>
      </div>
    </Card>
  );
}
const StatCell = ({ value, color, bold }) => (
  <div style={{ textAlign: "center", fontSize: 13, fontWeight: bold ? 800 : 700, color }}>{value}</div>
);

// ── Embedded Tournament Games — same experience as UserGamesPage ──────────────
const buildTree = (startFen, moves) => {
  const nodes = {};
  let n = 0;
  const nid = () => `n${n++}`;
  const fen0 = startFen || DEFAULT_FEN;
  const rootId = nid();
  nodes[rootId] = { id: rootId, fen: fen0, san: null, parentId: null, childIds: [], mainLine: true, ply: 0 };
  const chess = new Chess(fen0);
  let parentId = rootId;
  let ply = 0;
  for (const san of (moves || [])) {
    try {
      const r = chess.move(san, { sloppy: true });
      if (!r) break;
      ply++;
      const id = nid();
      nodes[id] = { id, fen: chess.fen(), san: r.san, parentId, childIds: [], mainLine: true, ply };
      nodes[parentId].childIds.push(id);
      parentId = id;
    } catch { break; }
  }
  return { nodes, rootId };
};

const formatResult = (result) => {
  if (result === "white_won") return "White Won";
  if (result === "black_won") return "Black Won";
  if (result === "draw") return "Draw";
  if (result === "aborted") return "Aborted";
  return result || "—";
};

function GamesPanel({ name, onBack }) {
  const [games,        setGames]        = useState([]);
  const [info,         setInfo]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [selectedGame, setSelectedGame] = useState(null);
  const [nodes,        setNodes]        = useState({});
  const [rootId,       setRootId]       = useState(null);
  const [currentId,    setCurrentId]    = useState(null);
  const [boardWidth,   setBoardWidth]   = useState(480);

  useEffect(() => {
    if (!name) return;
    const API_URL = import.meta.env.VITE_API_URL || "";
    setLoading(true);
    fetch(`${API_URL}/api/public/player-games/${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(data => {
        if (data && !data.message) {
          setInfo({ totalCount: data.totalCount || 0, lastPlayedAt: data.lastPlayedAt });
          setGames(data.games || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [name]);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth, h = window.innerHeight;
      const modalW = Math.min(w * 0.82, 1000);
      setBoardWidth(Math.max(280, Math.min(Math.floor(modalW * 0.58), Math.floor(h * 0.80), 560)));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const openGame = (game) => {
    const { nodes: ns, rootId: rid } = buildTree(game.startFen, game.moves);
    setSelectedGame(game);
    setNodes(ns);
    setRootId(rid);
    let id = rid;
    while (ns[id]?.childIds.length > 0) id = ns[id].childIds[0];
    setCurrentId(id);
  };
  const closeGame = useCallback(() => {
    setSelectedGame(null); setNodes({}); setRootId(null); setCurrentId(null);
  }, []);

  const navStart = () => setCurrentId(rootId);
  const navEnd   = () => { let id = rootId; while (nodes[id]?.childIds.length > 0) id = nodes[id].childIds[0]; setCurrentId(id); };
  const navPrev  = () => { const nd = nodes[currentId]; if (nd?.parentId) setCurrentId(nd.parentId); };
  const navNext  = () => { const nd = nodes[currentId]; if (nd?.childIds.length > 0) setCurrentId(nd.childIds[0]); };

  useEffect(() => {
    if (!selectedGame) return;
    const onKey = (e) => {
      if (e.key === "ArrowLeft")  { e.preventDefault(); navPrev(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); navNext(); }
      else if (e.key === "Escape") closeGame();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedGame, currentId, nodes, closeGame]);

  useEffect(() => {
    if (currentId) document.querySelector(`[data-nid="${currentId}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentId]);

  const handleDrop = (from, to) => {
    const nd = nodes[currentId];
    if (!nd) return false;
    const chess = new Chess(nd.fen);
    let r;
    try { r = chess.move({ from, to, promotion: "q" }); } catch { return false; }
    if (!r) return false;
    for (const cId of nd.childIds) { if (nodes[cId]?.san === r.san) { setCurrentId(cId); return true; } }
    const newId = `v${Date.now()}`;
    setNodes(prev => ({
      ...prev,
      [newId]: { id: newId, fen: chess.fen(), san: r.san, parentId: currentId, childIds: [], mainLine: false, ply: nd.ply + 1 },
      [currentId]: { ...prev[currentId], childIds: [...prev[currentId].childIds, newId] },
    }));
    setCurrentId(newId);
    return true;
  };

  const renderMoves = (startId, depth = 0) => {
    if (!startId || !nodes[startId]) return [];
    const elems = [];
    let id = startId;
    let prevHadVar = false;
    while (id) {
      const nodeId = id;
      const nd = nodes[nodeId];
      if (!nd || !nd.san) break;
      const isWhite = nd.ply % 2 === 1;
      const moveNum = Math.ceil(nd.ply / 2);
      const isActive = nodeId === currentId;
      if (isWhite || prevHadVar) {
        elems.push(<span key={`num-${nodeId}`} className="atg-var-num">{moveNum}{isWhite ? "." : "..."}</span>);
      }
      elems.push(
        <button key={`mv-${nodeId}`} data-nid={nodeId}
          className={`atg-analysis-btn${isActive ? " atg-analysis-btn--active" : ""}${!nd.mainLine ? " atg-analysis-btn--var" : ""}`}
          onClick={() => setCurrentId(nodeId)}>
          {nd.san}
        </button>
      );
      const vars = nd.childIds.slice(1);
      prevHadVar = vars.length > 0;
      for (const vId of vars) {
        elems.push(
          <div key={`var-${vId}`} className={`atg-sideline${depth > 0 ? " atg-sideline--nested" : ""}`}>
            {renderMoves(vId, depth + 1)}
          </div>
        );
      }
      id = nd.childIds[0] || null;
    }
    return elems;
  };

  const filtered = search.trim()
    ? games.filter(g => {
        const q = search.toLowerCase();
        return (g.whitePlayerDisplayName || "").toLowerCase().includes(q)
          || (g.whitePlayerUsername || "").toLowerCase().includes(q)
          || (g.blackPlayerDisplayName || "").toLowerCase().includes(q)
          || (g.blackPlayerUsername || "").toLowerCase().includes(q);
      })
    : games;

  const currentNode = nodes[currentId] || null;
  const position    = currentNode?.fen || DEFAULT_FEN;

  if (loading) return (
    <div className="atg-loading">
      <div className="atg-loading-orb" />
      <div className="atg-loading-text">Loading Games…</div>
    </div>
  );

  return (
    <div className="atg-container upg-container" style={{ minHeight: "unset", padding: "0" }}>
      {/* Top bar */}
      <header className="atg-topbar">
        <button className="atg-back-btn" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Dashboard
        </button>
        <div className="atg-topbar-title">
          <span className="atg-topbar-name">{name}</span>
          <span className="atg-topbar-sep">·</span>
          <span className="atg-topbar-sub">Tournament Games</span>
        </div>
        <div className="atg-topbar-meta upg-meta">
          <span className="upg-meta-total">{info?.totalCount ?? 0} total games</span>
        </div>
      </header>

      <main className="atg-main">
        <div className="atg-games-section atg-games-section--full">
          {/* Analysis tip banner */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, background: "linear-gradient(135deg, rgba(6,182,212,0.1), rgba(16,185,129,0.1))", border: "1px solid rgba(6,182,212,0.25)", borderRadius: 12, padding: "12px 18px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>🔍</span>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "#cbd5e1", lineHeight: 1.4 }}>
                Analyze your games in the <strong style={{ color: "#06b6d4" }}>Analysis page</strong> — find blunders, mistakes and inaccuracies.
              </span>
            </div>
            <Link to="/game-analysis" style={{ flexShrink: 0, textDecoration: "none", color: "#022c22", background: "linear-gradient(135deg,#06b6d4,#10b981)", borderRadius: 9, padding: "7px 16px", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>
              Analyze my game →
            </Link>
          </div>

          {/* Search */}
          <div className="atg-search-bar">
            <div className="atg-search-input-wrap">
              <svg className="atg-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input type="text" className="atg-search-input" placeholder="Search by opponent name…"
                value={search} onChange={e => setSearch(e.target.value)} />
              {search && (
                <button type="button" className="atg-search-clear" onClick={() => setSearch("")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
            {search.trim() && (
              <span className="atg-search-results-count">{filtered.length} {filtered.length === 1 ? "game" : "games"} found</span>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="atg-empty">
              <div className="atg-empty-icon">♟</div>
              <p>{search.trim() ? `No games found for "${search}"` : "No finished games yet."}</p>
            </div>
          ) : (
            <div className="atg-games-grid">
              {filtered.map(game => (
                <button type="button" key={String(game._id)} className="atg-game-card" onClick={() => openGame(game)}>
                  <div className="atg-card-player atg-card-player--white">
                    <span className="atg-card-color-dot atg-dot-white" />
                    <span>{game.whitePlayerDisplayName || game.whitePlayerUsername}</span>
                  </div>
                  <div className="atg-card-board-wrap">
                    <Chessboard position={game.fen || DEFAULT_FEN} boardWidth={200} draggable={false} orientation="white" />
                    <div className={`atg-result-badge atg-result-${game.result || "unknown"}`}>
                      {formatResult(game.result)}
                    </div>
                  </div>
                  <div className="atg-card-player atg-card-player--black">
                    <span className="atg-card-color-dot atg-dot-black" />
                    <span>{game.blackPlayerDisplayName || game.blackPlayerUsername}</span>
                  </div>
                  <div className="atg-card-meta">
                    <span>{game.moves?.length ?? 0} moves</span>
                    <span>{game.finishedAt ? new Date(game.finishedAt).toLocaleDateString() : "—"}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Game Modal */}
      {selectedGame && (
        <div className="atg-modal-overlay" onClick={closeGame}>
          <div className="atg-modal" onClick={e => e.stopPropagation()}>
            <div className="atg-modal-body">
              <div className="atg-modal-board-col">
                <div className="atg-modal-board-wrap">
                  <Chessboard position={position} boardWidth={boardWidth} draggable={true} onDrop={handleDrop} orientation="white" />
                </div>
              </div>
              <div className="atg-modal-notation-col">
                <div className="atg-modal-header">
                  <div className="atg-modal-players">
                    <span className="atg-modal-player atg-modal-player--white">
                      <span className="atg-modal-color-dot atg-dot-white" />
                      {selectedGame.whitePlayerDisplayName || selectedGame.whitePlayerUsername}
                    </span>
                    <span className="atg-modal-vs">vs</span>
                    <span className="atg-modal-player atg-modal-player--black">
                      <span className="atg-modal-color-dot atg-dot-black" />
                      {selectedGame.blackPlayerDisplayName || selectedGame.blackPlayerUsername}
                    </span>
                  </div>
                  <div className={`atg-modal-result atg-result-${selectedGame.result || "unknown"}`}>
                    {formatResult(selectedGame.result)}
                  </div>
                  <button type="button" className="atg-modal-close" onClick={closeGame}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="atg-notation-panel">
                  <div className="atg-notation-scroll">
                    {!rootId || !nodes[rootId]?.childIds.length ? (
                      <div className="atg-notation-empty">No moves recorded</div>
                    ) : (
                      <div className="atg-analysis-moves">{renderMoves(nodes[rootId]?.childIds[0])}</div>
                    )}
                  </div>
                </div>
                <div className="atg-controls">
                  <button type="button" className="atg-ctrl-btn" onClick={navStart} title="Start">⏮</button>
                  <button type="button" className="atg-ctrl-btn" onClick={navPrev}  title="Previous">◀</button>
                  <div className="atg-ctrl-counter">
                    <span className="atg-ctrl-cur">{currentNode?.ply ?? 0}</span>
                    <span className="atg-ctrl-sep">/</span>
                    <span className="atg-ctrl-tot">{selectedGame.moves?.length ?? 0}</span>
                  </div>
                  <button type="button" className="atg-ctrl-btn" onClick={navNext} title="Next">▶</button>
                  <button type="button" className="atg-ctrl-btn" onClick={navEnd}  title="End">⏭</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
// ── Blunder DNA card — your mistake profile across ALL analyzed games ─────────
// Reads /api/game-insights/dna (whole-history, not just one run). Own profile only.
const DNA_COLORS = { tactics: "#22d3ee", loose: "#fbbf24", endgame: "#a78bfa" };
function BlunderDnaCard() {
  const [dna, setDna]   = React.useState(null);
  const [loaded, setLd] = React.useState(false);
  React.useEffect(() => {
    let alive = true;
    api.get("/api/game-insights/dna")
      .then((res) => { if (alive) setDna(res.data?.hasData ? res.data : null); })
      .catch(() => {})
      .finally(() => { if (alive) setLd(true); });
    return () => { alive = false; };
  }, []);

  return (
    <Card>
      <SectionLabel>🧬 Your Blunder DNA</SectionLabel>
      {!loaded ? (
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 12 }}>Loading…</div>
      ) : !dna ? (
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 12, lineHeight: 1.6 }}>
          No mistakes analyzed yet. Open the <strong style={{ color: "#9ca3af" }}>Nexus Guide</strong> on your
          dashboard and click <strong style={{ color: "#9ca3af" }}>Analyze my games</strong> to build your profile.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6, marginBottom: 12 }}>
            From {dna.total} mistakes across your games
          </div>
          {dna.dna.map((d) => (
            <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 10, margin: "9px 0" }}>
              <span style={{ flex: "0 0 42px", textAlign: "right", fontSize: 14, fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{d.pct}%</span>
              <span style={{ flex: "0 0 108px", fontSize: 12.5, color: "#cbd5e1" }}>{d.label}</span>
              <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${d.pct}%`, height: "100%", borderRadius: 999, background: DNA_COLORS[d.key] || "#22d3ee", transition: "width .5s ease" }} />
              </div>
            </div>
          ))}
        </>
      )}
    </Card>
  );
}

const Card       = ({ children, highlight, style: extra }) => (
  <div style={{ ...S.card, ...(highlight ? S.cardHighlight : {}), ...extra }}>{children}</div>
);
const SectionLabel = ({ children, center, style: extra }) => (
  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9ca3af", textAlign: center ? "center" : "left", ...extra }}>
    {children}
  </div>
);
const Chip = ({ icon, children, color }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999, padding: "4px 12px" }}>
    <span style={{ display: "inline-flex" }}>{icon}</span>{children}
  </span>
);
const MiniStat = ({ label, value }) => (
  <div style={{ textAlign: "center" }}>
    <div style={{ fontSize: 17, fontWeight: 800, color: "#ffffff" }}>{value}</div>
    <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, marginTop: 2 }}>{label}</div>
  </div>
);
const Boost = ({ icon, title, sub, pts, color }) => (
  <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 90 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 12.5, color: "#ffffff" }}>{title}</div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>{sub}</div>
      </div>
    </div>
    <div style={{ color: color || "#10b981", fontWeight: 800, fontSize: 18, marginTop: 10 }}>{pts}</div>
  </div>
);
const Empty = ({ text }) => (
  <div style={{ textAlign: "center", color: "#9ca3af", padding: "24px 0", fontSize: 13 }}>{text}</div>
);

/* Rank medal — ribbon image for 1st/2nd/3rd, plain circle otherwise */
const RIBBON = { 1: "firstribbon", 2: "secondribbon", 3: "thirdribbon" };
const RankCircle = ({ rank }) => {
  if (rank >= 1 && rank <= 3) {
    return (
      <img
        src={`/arenadashboardcrowns/${RIBBON[rank]}.png`}
        alt={`Rank ${rank}`}
        style={{ width: 40, height: 40, objectFit: "contain", flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "#9ca3af", flexShrink: 0 }}>
      {rank}
    </div>
  );
};

/* Marathon podium — best earned trophy shown biggest in the center,
   other earned trophies glow but smaller, unearned trophies dim. */
const MARATHON_LABEL = { first: "1st Place", second: "2nd Place", third: "3rd Place" };
const MARATHON_SIZE = { big: 172, mid: 96, dim: 80 };
const MarathonPodiumCard = ({ counts, best }) => {
  // tier per place: best earned → big, other earned → mid, unearned → dim
  const slots = MARATHON_PLACES.map((p) => {
    const count = counts[p.key] || 0;
    const earned = count > 0;
    const tier = p.key === best ? "big" : earned ? "mid" : "dim";
    return { ...p, count, earned, tier };
  });

  // Arrange so the best earned (big) sits in the CENTER; others flank it.
  // When nothing is earned, fall back to fixed 2nd · 1st · 3rd podium order.
  let arranged;
  if (best) {
    const center = slots.find((s) => s.key === best);
    const rest = slots.filter((s) => s.key !== best);
    arranged = [rest[0], center, rest[1]];
  } else {
    const byKey = Object.fromEntries(slots.map((s) => [s.key, s]));
    arranged = [byKey.second, byKey.first, byKey.third];
  }

  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 10, marginTop: 14, minHeight: 195 }}>
      {arranged.map((s) => {
        const size = MARATHON_SIZE[s.tier];
        return (
          <div key={s.key} style={{ textAlign: "center", flexShrink: 0 }}>
            <div
              title={`${MARATHON_LABEL[s.key]}${s.count > 1 ? ` ×${s.count}` : ""}`}
              style={{ position: "relative", display: "inline-flex", alignItems: "flex-end" }}
            >
              <img
                src={`/arenadashboardcrowns/${s.img}.png`}
                alt={MARATHON_LABEL[s.key]}
                style={{
                  width: size, height: size, objectFit: "contain", display: "block",
                  filter: s.earned ? `drop-shadow(0 0 ${s.tier === "big" ? 16 : 12}px ${s.glow})` : "grayscale(1) brightness(0.55)",
                  opacity: s.earned ? 1 : 0.4,
                  transition: "all 0.25s ease",
                }}
              />
              {s.count > 1 && (
                <span style={{
                  position: "absolute", bottom: 2, right: -4,
                  minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999,
                  background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.18)",
                  color: s.color, fontSize: 11, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
                }}>
                  ×{s.count}
                </span>
              )}
            </div>
            <div style={{
              fontSize: s.tier === "big" ? 12 : 10.5, fontWeight: 800, marginTop: 4,
              color: s.earned ? s.color : "#6b7280",
            }}>
              {s.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* Trophy icon for trophy case.
   Marathon → marathon image · Team Battle → teambattle image · Standard/Chess960 → crown. */
const RANK_TIER = { 1: "gold", 2: "silver", 3: "bronze" };
const RANK_MARATHON = { 1: "first", 2: "second", 3: "third" };
const TrophyIcon = ({ rank, type, title }) => {
  if (type === "team_battle") {
    return (
      <img
        src="/arenadashboardcrowns/teambattle.png"
        alt={title}
        title={title}
        style={{ width: 80, height: 80, objectFit: "contain", display: "inline-block", verticalAlign: "middle" }}
      />
    );
  }
  if (type === "bullet_blitz_marathon") {
    const place = RANK_MARATHON[rank];
    if (!place) return null;
    return (
      <img
        src={`/arenadashboardcrowns/marathon${place}.png`}
        alt={title}
        title={title}
        style={{ width: 80, height: 80, objectFit: "contain", display: "inline-block", verticalAlign: "middle" }}
      />
    );
  }
  const t = RANK_TIER[rank] || "bronze";
  return (
    <span title={title} style={{ display: "inline-flex" }}>
      <Crown tier={t} size={64} />
    </span>
  );
};

const Ring = ({ value, total, center }) => {
  const pct = Math.max(0, Math.min(1, total ? value / total : 0));
  const R = 26, C = 2 * Math.PI * R;
  return (
    <svg width="72" height="72" style={{ margin: "6px auto", display: "block" }}>
      <circle cx="36" cy="36" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
      <circle cx="36" cy="36" r={R} fill="none" stroke="#10b981" strokeWidth="6" strokeLinecap="round"
        strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 36 36)" />
      <text x="36" y="41" textAnchor="middle" fontSize="19" fontWeight="800" fill="#e5e7eb">{center}</text>
    </svg>
  );
};
const Ribbon = ({ rank }) => {
  if (rank >= 1 && rank <= 3) {
    return (
      <img
        src={`/arenadashboardcrowns/${RIBBON[rank]}.png`}
        alt={`Rank ${rank}`}
        style={{ display: "block", margin: "2px auto", width: 72, height: 72, objectFit: "contain" }}
      />
    );
  }
  return (
    <div style={{ margin: "6px auto", width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
      background: rank ? "linear-gradient(135deg,#fbbf24,#f59e0b)" : "rgba(0,0,0,0.3)",
      color: rank ? "#3a2a00" : "#9ca3af", fontSize: 18, fontWeight: 800,
      boxShadow: rank ? "0 0 18px rgba(251,191,36,0.45)" : "none",
      border: rank ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
    {rank ? `#${rank}` : "—"}
    </div>
  );
};
// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  // ── Page & layout ──────────────────────────────────────────────────────────
  page:        { minHeight: "100vh", background: "#0a0a0a", color: "#ffffff", fontFamily: "'Poppins', system-ui, sans-serif", padding: "28px clamp(14px,4vw,40px) 72px", maxWidth: 1300, margin: "0 auto", position: "relative" },
  inner:       { maxWidth: 1200, margin: "0 auto" },
  cols:        { display: "grid", gridTemplateColumns: "70% 30%", gap: 18, alignItems: "flex-start" },
  colMain:     { display: "grid", gap: 18, minWidth: 0 },
  colSide:     { display: "grid", gap: 16, minWidth: 0 },

  // ── Cards — obsidian glass ─────────────────────────────────────────────────
  card:        { background: "rgba(23,23,23,0.7)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 18, padding: "18px 20px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", WebkitBackdropFilter: "blur(10px)", backdropFilter: "blur(10px)", position: "relative", overflow: "hidden" },
  cardHighlight: { background: "linear-gradient(135deg, rgba(6,182,212,0.1) 0%, rgba(16,185,129,0.1) 100%)", border: "1px solid rgba(6,182,212,0.3)", boxShadow: "0 8px 32px rgba(6,182,212,0.1)" },

  // ── Avatar ─────────────────────────────────────────────────────────────────
  avatar:      { width: 72, height: 72, borderRadius: "50%", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, overflow: "hidden", flexShrink: 0, border: "2px solid rgba(6,182,212,0.45)", boxShadow: "0 0 22px rgba(6,182,212,0.3)" },
  verified:    { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: "50%", background: "#06b6d4", color: "#fff", fontSize: 11, fontWeight: 800 },

  // ── Stat tile ─────────────────────────────────────────────────────────────
  tile:        { background: "rgba(0,0,0,0.3)", border: "1px solid rgba(6,182,212,0.15)", borderRadius: 12, padding: "12px 10px", textAlign: "center" },

  // ── Buttons ────────────────────────────────────────────────────────────────
  ghostBtn:    { textDecoration: "none", color: "#ffffff", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  joinBtn:     { display: "inline-block", textDecoration: "none", textAlign: "center", color: "#022c22", background: "linear-gradient(135deg,#06b6d4,#10b981)", borderRadius: 9, padding: "5px 13px", fontSize: 12, fontWeight: 700, marginTop: 5, whiteSpace: "nowrap" },
  footerBtn:   { display: "block", textAlign: "center", textDecoration: "none", color: "rgba(255,255,255,0.7)", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 600, marginTop: 14, fontFamily: "inherit" },

  // ── Links & badges ────────────────────────────────────────────────────────
  linkSmall:   { color: "#06b6d4", textDecoration: "none", fontSize: 12.5, fontWeight: 700 },
  earlyBirdBadge: { fontSize: 9.5, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 6, padding: "2px 6px", lineHeight: 1.4, display: "inline-block", textAlign: "center", marginBottom: 4 },
  winnerBadge: { fontSize: 11, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,#f59e0b,#ef4444)", borderRadius: 6, padding: "2px 10px", letterSpacing: "0.04em" },

  // ── Progress bar ──────────────────────────────────────────────────────────
  progressTrack: { height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", marginTop: 12, overflow: "hidden" },
  progressFill:  { height: "100%", background: "linear-gradient(90deg,#06b6d4,#10b981)", borderRadius: 999 },

  // ── List rows ─────────────────────────────────────────────────────────────
  upcomingRow: { display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  recentRow:   { display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  typeIconBox: { width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800 },

  // ── Trophy showcase "View All" + modal ─────────────────────────────────────
  viewAllTrophiesBtn: { color: "#06b6d4", background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.3)", borderRadius: 999, padding: "3px 9px", fontSize: 10.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", alignSelf: "center" },
  trophyOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 },
  trophyModal: { background: "rgba(23,23,23,0.98)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "22px 24px", maxWidth: 720, width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" },
  trophyCloseBtn: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e5e7eb", width: 32, height: 32, fontSize: 15, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center" },
};
