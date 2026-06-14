// FILE: src/pages/arcade/ArcadeHome.jsx
// Route: /arcade
// Two game cards with obsidian glass design - buttons only are clickable

import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { T, PageWrap, GlassCard, GradHeading, SIDEBAR_OFFSET } from "./arcadeTheme";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../contexts/AuthContext";

const GAMES = [
  {
    id: "ttt",
    icon: "⚔️",
    title: "Tic-Tac-Toe",
    tag: "Strategy",
    tagColor: T.p1,
    gradient: "linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)",
    desc: "Solve chess puzzles to claim squares. First to complete a line wins!",
    bullets: ["Solve a puzzle → pick any empty square", "Wrong answer? Turn passes to opponent", "First line of marks wins"],
    stats: { players: "2.4k", difficulty: "Medium" }
  },
  {
    id: "bingo",
    icon: "🎯",
    title: "Chess Bingo",
    tag: "Knowledge",
    tagColor: T.p2,
    gradient: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
    desc: "Identify puzzle themes to mark your bingo card. First to complete a line wins!",
    bullets: ["Solve puzzle → name the tactic theme", "Correct → mark it on your card", "First full line = BINGO!"],
    stats: { players: "1.8k", difficulty: "Easy" }
  },
];

export default function ArcadeHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hoveredCard, setHoveredCard] = useState(null);
  
  const username = user?.displayName || user?.name || "Guest";
  
  const handlePlayClick = (gameId, e) => {
    e.stopPropagation();
    navigate(`/arcade/lobby?game=${gameId}`);
  };

  return (
    <div className="arc-shell" style={{ 
      background: "radial-gradient(circle at 50% 50%, #1a1f2e 0%, #0f1219 100%)",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Obsidian glass overlay */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "radial-gradient(circle at 30% 40%, rgba(255,255,255,0.03) 0%, transparent 60%)",
        pointerEvents: "none"
      }} />
      
      <Sidebar />
      <div className="arc-content" style={{ 
        position: "relative",
        zIndex: 1
      }}>
        <PageWrap maxWidth={900} style={{ padding: "40px 30px" }}>

          {/* Welcome Header */}
          <div style={{
            marginBottom: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 20
          }}>
            <div>
              <h1 style={{
                fontSize: "clamp(32px, 5vw, 48px)",
                fontWeight: 800,
                margin: 0,
                color: "#fff",
                letterSpacing: "-0.02em"
              }}>
                Welcome back, {username}
              </h1>
            </div>
          </div>

          {/* Game cards grid */}
          <div className="arc-home-cards">
            {GAMES.map(({ id, icon, title, desc, tag, tagColor, bullets, stats, gradient }) => (
              <div
                key={id}
                onMouseEnter={() => setHoveredCard(id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  position: "relative",
                  transition: "transform 0.3s ease",
                  transform: hoveredCard === id ? "translateY(-8px)" : "none"
                }}
              >
                {/* Obsidian glass card */}
                <div style={{
                  background: "rgba(20, 25, 35, 0.6)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 32,
                  padding: 32,
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  boxShadow: hoveredCard === id 
                    ? "0 30px 50px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.1), inset 0 0 30px rgba(6,182,212,0.1)"
                    : "0 20px 30px -15px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)",
                  transition: "all 0.3s ease",
                  position: "relative",
                  overflow: "hidden"
                }}>
                  {/* Glass shine effect */}
                  <div style={{
                    position: "absolute",
                    top: 0,
                    left: "-100%",
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)",
                    transition: "left 0.7s ease",
                    ...(hoveredCard === id && { left: "100%" })
                  }} />
                  
                  {/* Icon with glow */}
                  <div style={{ 
                    fontSize: 64, 
                    marginBottom: 20,
                    filter: "drop-shadow(0 0 20px rgba(6,182,212,0.3))",
                    transform: hoveredCard === id ? "scale(1.1)" : "scale(1)",
                    transition: "transform 0.3s ease",
                    display: "inline-block",
                    width: "fit-content"
                  }}>
                    <span style={{ color: "#fff" }}>{icon}</span>
                  </div>

                  {/* Title and tag row */}
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 12, 
                    marginBottom: 16,
                    flexWrap: "wrap"
                  }}>
                    <h2 style={{ 
                      color: "#fff", 
                      fontSize: 24, 
                      fontWeight: 700,
                      margin: 0,
                      letterSpacing: "-0.01em"
                    }}>
                      {title}
                    </h2>
                    <span style={{ 
                      padding: "4px 12px", 
                      borderRadius: 20, 
                      fontSize: 11, 
                      fontWeight: 600, 
                      textTransform: "uppercase", 
                      letterSpacing: "0.5px", 
                      background: `${tagColor}15`, 
                      color: tagColor, 
                      border: `1px solid ${tagColor}30`,
                      backdropFilter: "blur(4px)"
                    }}>
                      {tag}
                    </span>
                  </div>

                  {/* Description */}
                  <p style={{ 
                    color: "rgba(255,255,255,0.6)", 
                    fontSize: 14, 
                    lineHeight: 1.6, 
                    margin: "0 0 20px",
                    borderLeft: `2px solid ${tagColor}`,
                    paddingLeft: 16
                  }}>
                    {desc}
                  </p>

                  {/* Bullet points */}
                  <div style={{ 
                    display: "flex", 
                    flexDirection: "column", 
                    gap: 10, 
                    marginBottom: 28 
                  }}>
                    {bullets.map((b, i) => (
                      <div key={i} style={{ 
                        display: "flex", 
                        gap: 10, 
                        color: "rgba(255,255,255,0.5)", 
                        fontSize: 13,
                        alignItems: "flex-start"
                      }}>
                        <span style={{ 
                          color: tagColor, 
                          flexShrink: 0,
                          fontSize: 16,
                          lineHeight: 1
                        }}>•</span>
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>

                  {/* Play Button - ONLY CLICKABLE ELEMENT */}
                  <button
                    onClick={(e) => handlePlayClick(id, e)}
                    style={{
                      marginTop: "auto",
                      background: gradient,
                      border: "none",
                      borderRadius: 16,
                      padding: "16px 24px",
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#fff",
                      cursor: "pointer",
                      boxShadow: `0 8px 20px -5px ${tagColor}80, 0 0 0 1px rgba(255,255,255,0.1) inset`,
                      transition: "all 0.2s ease",
                      width: "100%",
                      textAlign: "center",
                      letterSpacing: "0.3px",
                      position: "relative",
                      zIndex: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.02)";
                      e.currentTarget.style.boxShadow = `0 12px 30px -5px ${tagColor}, 0 0 0 1px rgba(255,255,255,0.2) inset`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.boxShadow = `0 8px 20px -5px ${tagColor}80, 0 0 0 1px rgba(255,255,255,0.1) inset`;
                    }}
                  >
                    <span>Play {title}</span>
                    <span style={{ 
                      fontSize: 18,
                      transition: "transform 0.2s ease",
                      display: "inline-block"
                    }}>→</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

        </PageWrap>
      </div>
    </div>
  );
}