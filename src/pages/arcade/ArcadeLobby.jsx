// FILE: src/pages/arcade/ArcadeLobby.jsx
// Route: /arcade/lobby?game=ttt|bingo
// Obsidian glass design with clickable buttons only

import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import {
  T, PageWrap, GlassCard, GradHeading, Btn, ErrorBanner, SectionLabel,
  SOCKET_URL,
  SIDEBAR_OFFSET,
} from "./arcadeTheme";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../contexts/AuthContext";

const GAME_META = {
  ttt:   { icon: "⚔️", label: "Tic-Tac-Toe",  route: "/arcade/ttt", color: "#f43f5e" },
  bingo: { icon: "🎯", label: "Chess Bingo",   route: "/arcade/bingo", color: "var(--color-accent)" },
};

export default function ArcadeLobby() {
  const navigate = useNavigate();
  const [params]  = useSearchParams();
  const gameType  = params.get("game") || "ttt";
  const meta      = GAME_META[gameType] || GAME_META.ttt;

  const { user } = useAuth();
  function getGuestId() {
    let gid = sessionStorage.getItem('arcade_guest_id');
    if (!gid) { gid = 'guest_' + Math.random().toString(36).slice(2, 9); sessionStorage.setItem('arcade_guest_id', gid); }
    return gid;
  }
  const guestId  = user ? null : getGuestId();
  const userId   = user?._id || user?.id || guestId;
  const username = user?.displayName || user?.username || user?.name || ('Guest_' + (guestId || '').slice(-5));

  const socketRef = useRef(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [screen,  setScreen]  = useState("home"); // home | join | matchmaking | waiting
  const [joinCode, setJoinCode] = useState("");
  const [error,   setError]   = useState("");
  const [roomInfo, setRoomInfo] = useState(null);
  const roomInfoRef = useRef(roomInfo);
  useEffect(() => { roomInfoRef.current = roomInfo; }, [roomInfo]);
  const [readyCount, setReadyCount] = useState(0);
  const [iAmReady, setIAmReady]   = useState(false);
  const [copied, setCopied] = useState(false);
  const [hoveredOption, setHoveredOption] = useState(null);

  useEffect(() => {
    // Connecting to arcade socket (URL hidden for security)
    const socket = io(`${SOCKET_URL}/arcade`, {
      auth: { token: localStorage.getItem("authToken") || localStorage.getItem("token") || "" },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 30000,
      upgrade: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log('[ArcadeLobby] socket connected via', socket.io.engine.transport.name, socket.id);
      setSocketConnected(true);
      setError("");
    });
    socket.on("disconnect", (reason) => {
      console.warn('[ArcadeLobby] socket disconnected', reason);
      setSocketConnected(false);
    });
    socket.on("connect_error", (err) => {
      console.error("[ArcadeLobby] socket connect_error:", err?.message);
      if (!socket.active) {
        setError(`Unable to connect to game server (${err?.message || "unknown error"}). Please refresh.`);
      }
    });
    socket.on("connect_timeout", () => {
      setError("Connection timed out. Please refresh.");
    });

    socket.on("room_joined", ({ roomCode, playerNum, gameType: gt, boardSize }) => {
      setRoomInfo(prev => ({ ...prev, roomCode, playerNum, gameType: gt, boardSize }));
      setScreen("waiting");
    });

    socket.on("room_ready", ({ players, roomCode, gameType: gt, boardSize }) => {
      setRoomInfo(prev => ({ ...prev, players, roomCode, gameType: gt, boardSize }));
    });

    socket.on("join_error", ({ message }) => setError(message));

    socket.on("player_ready_update", ({ readyCount: rc }) => setReadyCount(rc));

    socket.on("game_start", ({ roomCode, gameType: gt, boardSize, firstPlayer, gameState, playerNum: pnFromServer, players: srvPlayers }) => {
      const pn = pnFromServer ?? roomInfoRef.current?.playerNum;
      navigate("/arcade/game", {
        state: {
          roomCode, gameType: gt, boardSize, firstPlayer, gameState,
          playerNum: pn,
          username, userId,
          players: srvPlayers || roomInfoRef.current?.players,
        },
      });
    });

    socket.on("opponent_disconnected", () => { setError("Opponent disconnected."); setScreen("home"); setRoomInfo(null); });

    return () => socket.disconnect();
  }, []);

  const handleJoinRoom = (e) => {
    e?.stopPropagation();
    console.log("[ArcadeLobby] handleJoinRoom", { joinCode, socketId: socketRef.current?.id, connected: socketRef.current?.connected });
    if (!joinCode.trim()) return setError("Enter a room code.");
    setError("");
    const sock = socketRef.current;
    if (!sock?.connected) {
      setError("Connecting to server... Please wait.");
      if (sock) {
        const code = joinCode.trim().toUpperCase();
        sock.once('connect', () => {
          setError("");
          sock.emit("join_room", { roomCode: code, username, userId });
        });
        sock.connect();
      } else {
        setError("Unable to connect. Please refresh the page.");
      }
      return;
    }
    sock.emit("join_room", { roomCode: joinCode.trim().toUpperCase(), username, userId });
  };

  const handleReady = async (e) => {
    e?.stopPropagation();
    let themes = [];
    try {
      const backendUrl = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${backendUrl}/api/arcade/puzzles/themes`);
      if (res.ok) themes = await res.json();
    } catch {}
    socketRef.current?.emit("player_ready", { roomCode: roomInfo?.roomCode, themes });
    setIAmReady(true);
  };

  const handleCancel = (e) => {
    e?.stopPropagation();
    socketRef.current?.emit("cancel_matchmaking", { userId });
    setScreen("home");
    setRoomInfo(null);
    setIAmReady(false);
    setReadyCount(0);
  };

  const goToSizePicker = (mode, e) => {
    e?.stopPropagation();
    if (!socketRef.current?.connected) {
      setError("Connecting to server...");
      socketRef.current?.connect();
      const checkInterval = setInterval(() => {
        if (socketRef.current?.connected) {
          clearInterval(checkInterval);
          setError("");
          navigate(meta.route, { state: { mode, username, userId, gameType } });
        }
      }, 300);
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!socketRef.current?.connected) {
          setError("Unable to connect. Please refresh and try again.");
        }
      }, 5000);
      return;
    }
    console.log("[ArcadeLobby] goToSizePicker", { mode, route: meta.route, username, userId, gameType });
    navigate(meta.route, { state: { mode, username, userId, gameType } });
  };

  const handleBackToGames = (e) => {
    e?.stopPropagation();
    navigate("/arcade");
  };

  const handleCopyCode = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(roomInfo.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        background: "radial-gradient(circle at 30% 40%, var(--color-white-a04) 0%, transparent 60%)",
        pointerEvents: "none"
      }} />

      <Sidebar />
      <div className="arc-content" style={{
        position: "relative",
        zIndex: 1
      }}>
        <PageWrap maxWidth={720} style={{ padding: "40px 30px" }}>

          {/* Header with game icon */}
          <div style={{
            background: "rgba(20, 25, 35, 0.6)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--color-white-a04)",
            borderRadius: 'var(--radius-2xl)',
            padding: "32px 28px",
            marginBottom: 28,
            textAlign: "center",
            position: "relative",
            overflow: "hidden"
          }}>
            {/* Shine effect */}
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "1px",
              background: "linear-gradient(90deg, transparent, var(--color-white-a20), transparent)"
            }} />

            <h1 style={{
              fontSize: "clamp(24px, 5vw, 32px)",
              fontWeight: 800,
              margin: "0 0 8px",
              background: `linear-gradient(135deg, var(--color-text) 0%, ${meta.color} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.02em"
            }}>
              {meta.label}
            </h1>

            <p style={{
              color: "var(--color-text-muted)",
              fontSize: 15,
              margin: 0,
              maxWidth: 400,
              marginLeft: "auto",
              marginRight: "auto"
            }}>
              Choose how you want to play
            </p>
          </div>

          <ErrorBanner message={error} onClose={() => setError("")} />

          {/* ══ HOME: pick mode ══ */}
          {screen === "home" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Quick Match */}
              <div
                onMouseEnter={() => setHoveredOption("quick")}
                onMouseLeave={() => setHoveredOption(null)}
                style={{
                  position: "relative",
                  transition: "transform 0.2s ease",
                  transform: hoveredOption === "quick" ? "translateY(-2px)" : "none"
                }}
              >
                <div className="arc-lobby-option" style={{
                  background: "rgba(20, 25, 35, 0.6)",
                  backdropFilter: "blur(20px)",
                  border: hoveredOption === "quick" 
                    ? `1px solid ${meta.color}40`
                    : "1px solid var(--color-white-a04)",
                  borderRadius: 'var(--radius-2xl)',
                  position: "relative",
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                  cursor: "default"
                }}>
                  {/* Hover glow */}
                  {hoveredOption === "quick" && (
                    <div style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: `radial-gradient(circle at 50% 50%, ${meta.color}10, transparent 70%)`,
                      pointerEvents: "none"
                    }} />
                  )}

                  {/* Icon */}
                  <div className="arc-lobby-option-icon" style={{
                    fontSize: 56,
                    flexShrink: 0,
                    filter: hoveredOption === "quick" ? `drop-shadow(0 0 15px ${meta.color})` : "none",
                    transition: "filter 0.2s ease"
                  }}>
                    🎲
                  </div>

                  {/* Content */}
                  <div className="arc-lobby-option-text" style={{ flex: 1 }}>
                    <h3 className="arc-lobby-option-title" style={{
                      color: "var(--color-text)",
                      fontSize: 20,
                      fontWeight: 700,
                      margin: "0 0 6px"
                    }}>
                      Quick Match
                    </h3>
                    <p className="arc-lobby-desc" style={{
                      color: "var(--color-text-muted)",
                      fontSize: 14,
                      margin: 0,
                      lineHeight: 1.5
                    }}>
                      Get paired with a random opponent instantly. Pick your board size first.
                    </p>
                  </div>

                  {/* Play button - ONLY CLICKABLE ELEMENT */}
                  <button
                    className="arc-lobby-cta"
                    onClick={(e) => goToSizePicker("matchmaking", e)}
                    style={{
                      background: `linear-gradient(135deg, ${meta.color} 0%, ${
                        gameType === "ttt" ? "#fb7185" : "var(--color-accent-2)"
                      } 100%)`,
                      border: "none",
                      borderRadius: 'var(--radius-2xl)',
                      padding: "14px 28px",
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--color-text)",
                      cursor: "pointer",
                      boxShadow: hoveredOption === "quick" 
                        ? `0 10px 20px -5px ${meta.color}80, 0 0 0 1px var(--color-white-a20) inset`
                        : `0 5px 15px -5px ${meta.color}40, 0 0 0 1px var(--color-white-a10) inset`,
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    <span>Play</span>
                    <span style={{ fontSize: 18 }}>→</span>
                  </button>
                </div>
              </div>

              {/* Play with Friend */}
              <div
                onMouseEnter={() => setHoveredOption("create")}
                onMouseLeave={() => setHoveredOption(null)}
                style={{
                  position: "relative",
                  transition: "transform 0.2s ease",
                  transform: hoveredOption === "create" ? "translateY(-2px)" : "none"
                }}
              >
                {/* The class was missing here, so this card alone kept the
                    desktop row layout on mobile — its title wrapped to three
                    lines and the button overflowed. */}
                <div className="arc-lobby-option" style={{
                  background: "rgba(20, 25, 35, 0.6)",
                  backdropFilter: "blur(20px)",
                  border: hoveredOption === "create" 
                    ? `1px solid ${meta.color}40`
                    : "1px solid var(--color-white-a04)",
                  borderRadius: 'var(--radius-2xl)',
                  padding: "28px 32px",
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  position: "relative",
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                  cursor: "default"
                }}>
                  {/* Hover glow */}
                  {hoveredOption === "create" && (
                    <div style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: `radial-gradient(circle at 50% 50%, ${meta.color}10, transparent 70%)`,
                      pointerEvents: "none"
                    }} />
                  )}

                  {/* Icon */}
                  <div className="arc-lobby-option-icon" style={{
                    fontSize: 56,
                    flexShrink: 0,
                    filter: hoveredOption === "create" ? `drop-shadow(0 0 15px ${meta.color})` : "none",
                    transition: "filter 0.2s ease"
                  }}>
                    🏠
                  </div>

                  {/* Content */}
                  <div className="arc-lobby-option-text" style={{ flex: 1 }}>
                    <h3 className="arc-lobby-option-title" style={{
                      color: "var(--color-text)",
                      fontSize: 20,
                      fontWeight: 700,
                      margin: "0 0 6px"
                    }}>
                      Play with Friend
                    </h3>
                    <p className="arc-lobby-desc" style={{
                      color: "var(--color-text-muted)",
                      fontSize: 14,
                      margin: 0,
                      lineHeight: 1.5
                    }}>
                      Create a private room, pick your board size, then share the code.
                    </p>
                  </div>

                  {/* Create button - ONLY CLICKABLE ELEMENT */}
                  <button
                    className="arc-lobby-cta"
                    onClick={(e) => goToSizePicker("create", e)}
                    style={{
                      background: "var(--color-white-a04)",
                      border: hoveredOption === "create" 
                        ? `1px solid ${meta.color}60`
                        : "1px solid var(--color-white-a10)",
                      borderRadius: 'var(--radius-2xl)',
                      padding: "14px 28px",
                      fontSize: 15,
                      fontWeight: 600,
                      color: hoveredOption === "create" ? meta.color : "var(--color-text-muted)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.05)";
                      e.currentTarget.style.background = "var(--color-white-a07)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.background = "var(--color-white-a04)";
                    }}
                  >
                    <span>Create</span>
                    <span style={{ fontSize: 18 }}>→</span>
                  </button>
                </div>
              </div>

              {/* Join with code */}
              <div
                onMouseEnter={() => setHoveredOption("join")}
                onMouseLeave={() => setHoveredOption(null)}
                style={{
                  position: "relative",
                  transition: "transform 0.2s ease",
                  transform: hoveredOption === "join" ? "translateY(-2px)" : "none"
                }}
              >
                <div className="arc-lobby-option" style={{
                  background: "rgba(20, 25, 35, 0.6)",
                  backdropFilter: "blur(20px)",
                  border: hoveredOption === "join" 
                    ? `1px solid ${meta.color}40`
                    : "1px solid var(--color-white-a04)",
                  borderRadius: 'var(--radius-2xl)',
                  position: "relative",
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                  cursor: "default"
                }}>
                  {/* Hover glow */}
                  {hoveredOption === "join" && (
                    <div style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: `radial-gradient(circle at 50% 50%, ${meta.color}10, transparent 70%)`,
                      pointerEvents: "none"
                    }} />
                  )}

                  {/* Icon */}
                  <div className="arc-lobby-option-icon" style={{
                    fontSize: 56,
                    flexShrink: 0,
                    filter: hoveredOption === "join" ? `drop-shadow(0 0 15px ${meta.color})` : "none",
                    transition: "filter 0.2s ease"
                  }}>
                    🔗
                  </div>

                  {/* Content */}
                  <div className="arc-lobby-option-text" style={{ flex: 1 }}>
                    <h3 className="arc-lobby-option-title" style={{
                      color: "var(--color-text)",
                      fontSize: 20,
                      fontWeight: 700,
                      margin: "0 0 6px"
                    }}>
                      Join Friend's Room
                    </h3>
                    <p className="arc-lobby-desc" style={{
                      color: "var(--color-text-muted)",
                      fontSize: 14,
                      margin: 0,
                      lineHeight: 1.5
                    }}>
                      Have a room code? Enter it here to join your friend's game.
                    </p>
                  </div>

                  {/* Join button - ONLY CLICKABLE ELEMENT */}
                  <button
                    className="arc-lobby-cta"
                    onClick={() => setScreen("join")}
                    style={{
                      background: "var(--color-white-a04)",
                      border: hoveredOption === "join" 
                        ? `1px solid ${meta.color}60`
                        : "1px solid var(--color-white-a10)",
                      borderRadius: 'var(--radius-2xl)',
                      padding: "14px 28px",
                      fontSize: 15,
                      fontWeight: 600,
                      color: hoveredOption === "join" ? meta.color : "var(--color-text-muted)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.05)";
                      e.currentTarget.style.background = "var(--color-white-a07)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.background = "var(--color-white-a04)";
                    }}
                  >
                    <span>Join</span>
                    <span style={{ fontSize: 18 }}>→</span>
                  </button>
                </div>
              </div>

              {/* Back button */}
              <button
                onClick={handleBackToGames}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--color-text-faint)",
                  fontSize: 14,
                  cursor: "pointer",
                  padding: "16px",
                  marginTop: 8,
                  transition: "color 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--color-text-muted)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--color-text-faint)";
                }}
              >
                <span>←</span>
                <span>Back to Games</span>
              </button>
            </div>
          )}

          {/* ══ JOIN: enter code ══ */}
          {screen === "join" && (
            <div style={{
              background: "rgba(20, 25, 35, 0.6)",
              backdropFilter: "blur(20px)",
              border: "1px solid var(--color-white-a04)",
              borderRadius: 'var(--radius-2xl)',
              padding: 40,
              textAlign: "center"
            }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🔗</div>
              
              <h2 style={{
                fontSize: 24,
                fontWeight: 700,
                margin: "0 0 8px",
                background: `linear-gradient(135deg, var(--color-text) 0%, ${meta.color} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}>
                Enter Room Code
              </h2>
              
              <p style={{ color: "var(--color-text-muted)", fontSize: 14, marginBottom: 28 }}>
                Your friend's 6-character code
              </p>

              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                onKeyDown={e => e.key === "Enter" && handleJoinRoom()}
                placeholder="A3F9C2"
                maxLength={6}
                autoFocus
                style={{
                  width: "100%",
                  padding: "20px 24px",
                  marginBottom: 24,
                  boxSizing: "border-box",
                  background: "var(--color-black-a35)",
                  border: `1px solid ${joinCode.length === 6 ? meta.color : "var(--color-white-a10)"}`,
                  borderRadius: 'var(--radius-2xl)',
                  color: "var(--color-text)",
                  fontSize: 32,
                  fontWeight: 700,
                  textAlign: "center",
                  letterSpacing: 12,
                  outline: "none",
                  fontFamily: "monospace",
                  transition: "all 0.2s ease"
                }}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
                <button
                  onClick={() => setScreen("home")}
                  style={{
                    background: "var(--color-white-a04)",
                    border: "1px solid var(--color-white-a10)",
                    borderRadius: 'var(--radius-2xl)',
                    padding: "16px 24px",
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--color-text-muted)",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--color-white-a07)";
                    e.currentTarget.style.borderColor = "var(--color-white-a20)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--color-white-a04)";
                    e.currentTarget.style.borderColor = "var(--color-white-a10)";
                  }}
                >
                  ← Back
                </button>
                
                <button
                  onClick={handleJoinRoom}
                  disabled={joinCode.length < 6}
                  style={{
                    background: joinCode.length === 6 
                      ? `linear-gradient(135deg, ${meta.color} 0%, ${
                          gameType === "ttt" ? "#fb7185" : "var(--color-accent-2)"
                        } 100%)`
                      : "var(--color-white-a04)",
                    border: "none",
                    borderRadius: 'var(--radius-2xl)',
                    padding: "16px 24px",
                    fontSize: 15,
                    fontWeight: 600,
                    color: joinCode.length === 6 ? "var(--color-text)" : "var(--color-text-faint)",
                    cursor: joinCode.length === 6 ? "pointer" : "not-allowed",
                    transition: "all 0.2s ease",
                    boxShadow: joinCode.length === 6 ? `0 10px 20px -10px ${meta.color}` : "none"
                  }}
                  onMouseEnter={(e) => {
                    if (joinCode.length === 6) {
                      e.currentTarget.style.transform = "scale(1.02)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (joinCode.length === 6) {
                      e.currentTarget.style.transform = "scale(1)";
                    }
                  }}
                >
                  Join Room →
                </button>
              </div>
            </div>
          )}

          {/* ══ WAITING ROOM ══ */}
          {screen === "waiting" && roomInfo && (
            <div style={{
              background: "rgba(20, 25, 35, 0.6)",
              backdropFilter: "blur(20px)",
              border: "1px solid var(--color-white-a04)",
              borderRadius: 'var(--radius-2xl)',
              padding: 40,
              position: "relative",
              overflow: "hidden"
            }}>
              {/* Shine effect */}
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "1px",
                background: "linear-gradient(90deg, transparent, var(--color-white-a20), transparent)"
              }} />

              {/* Room header */}
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🏰</div>
                <h2 style={{
                  fontSize: 28,
                  fontWeight: 700,
                  margin: "0 0 8px",
                  background: `linear-gradient(135deg, var(--color-text) 0%, ${meta.color} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}>
                  Room {roomInfo.roomCode}
                </h2>
                <p style={{ color: "var(--color-text-muted)", fontSize: 15 }}>
                  {meta.label} • {roomInfo.boardSize}×{roomInfo.boardSize}
                </p>
              </div>

              {/* Share code section - for room creator/joiner */}
              {roomInfo.playerNum && (
                <div style={{
                  background: `${meta.color}08`,
                  border: `1px solid ${meta.color}20`,
                  borderRadius: 'var(--radius-2xl)',
                  padding: "20px",
                  marginBottom: 32,
                  textAlign: "center"
                }}>
                  <p style={{
                    color: "var(--color-text-muted)",
                    fontSize: 12,
                    margin: "0 0 12px",
                    textTransform: "uppercase",
                    letterSpacing: "1px"
                  }}>
                    Room Code
                  </p>
                  <div style={{
                    fontSize: 42,
                    fontWeight: 800,
                    letterSpacing: 12,
                    color: meta.color,
                    marginBottom: 16,
                    textShadow: `0 0 20px ${meta.color}50`
                  }}>
                    {roomInfo.roomCode}
                  </div>
                  <button
                    onClick={handleCopyCode}
                    style={{
                      background: copied ? "var(--color-success-a12)" : `${meta.color}15`,
                      border: copied ? "1px solid var(--color-success-a30)" : `1px solid ${meta.color}30`,
                      borderRadius: 'var(--radius-2xl)',
                      padding: "12px 24px",
                      color: copied ? "var(--color-success)" : meta.color,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8
                    }}
                    onMouseEnter={(e) => {
                      if (!copied) {
                        e.currentTarget.style.background = `${meta.color}25`;
                        e.currentTarget.style.borderColor = `${meta.color}50`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!copied) {
                        e.currentTarget.style.background = `${meta.color}15`;
                        e.currentTarget.style.borderColor = `${meta.color}30`;
                      }
                    }}
                  >
                    {copied ? (
                      <>
                        <span>✓</span>
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <span>📋</span>
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Players grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
                marginBottom: 32
              }}>
                {[1, 2].map(num => {
                  const player = roomInfo.players?.find(p => p.playerNum === num);
                  const isMe = num === roomInfo.playerNum;
                  const isReady = readyCount >= num;

                  return (
                    <div
                      key={num}
                      style={{
                        background: player
                          ? "linear-gradient(145deg, var(--color-accent-2-a12), rgba(16,185,129,0.02))"
                          : "var(--color-white-a04)",
                        border: player
                          ? isReady
                            ? "1px solid var(--color-success-a30)"
                            : "1px solid var(--color-success-a12)"
                          : "1px solid var(--color-white-a04)",
                        borderRadius: 'var(--radius-2xl)',
                        padding: "24px 16px",
                        textAlign: "center",
                        position: "relative",
                        overflow: "hidden"
                      }}
                    >
                      {/* Player icon */}
                      <div style={{
                        fontSize: 40,
                        marginBottom: 12,
                        filter: player ? "drop-shadow(0 0 10px var(--color-success-a30))" : "none",
                        opacity: player ? 1 : 0.3
                      }}>
                        {gameType === "ttt" ? (num === 1 ? "✕" : "○") : (num === 1 ? "🎯" : "⭐")}
                      </div>

                      {/* Player name */}
                      <div style={{
                        color: player ? "var(--color-text)" : "var(--color-text-faint)",
                        fontWeight: 600,
                        fontSize: 16,
                        marginBottom: 4
                      }}>
                        {player ? (player.displayName || player.username) : "Waiting for player..."}
                      </div>

                      {/* Player tag */}
                      <div style={{
                        color: isMe ? "var(--color-text-muted)" : "var(--color-text-faint)",
                        fontSize: 12,
                        marginBottom: 8
                      }}>
                        {isMe ? "You" : `Player ${num}`}
                      </div>

                      {/* Ready status */}
                      {player && isReady && (
                        <div style={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          background: "var(--color-success)",
                          borderRadius: 'var(--radius-2xl)',
                          padding: "4px 8px",
                          fontSize: 10,
                          fontWeight: 600,
                          color: "var(--color-text)"
                        }}>
                          ✓ READY
                        </div>
                      )}

                      {/* Loading animation for empty slot */}
                      {!player && (
                        <div style={{
                          width: 30,
                          height: 30,
                          margin: "10px auto 0",
                          border: "2px solid var(--color-white-a10)",
                          borderTopColor: meta.color,
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite"
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Ready button section */}
              {roomInfo.players?.length === 2 ? (
                <div style={{ textAlign: "center" }}>
                  {!iAmReady ? (
                    <button
                      onClick={handleReady}
                      style={{
                        background: "linear-gradient(135deg, var(--color-accent-2) 0%, var(--color-accent-2) 100%)",
                        border: "none",
                        borderRadius: 'var(--radius-2xl)',
                        padding: "18px 32px",
                        fontSize: 16,
                        fontWeight: 600,
                        color: "var(--color-text)",
                        cursor: "pointer",
                        boxShadow: "0 10px 25px -5px var(--color-success-a30), 0 0 0 1px var(--color-white-a10) inset",
                        transition: "all 0.2s ease",
                        width: "100%",
                        maxWidth: 300,
                        margin: "0 auto 12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.02)";
                        e.currentTarget.style.boxShadow = "0 15px 30px -5px rgba(16,185,129,0.7), 0 0 0 1px var(--color-white-a20) inset";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow = "0 10px 25px -5px var(--color-success-a30), 0 0 0 1px var(--color-white-a10) inset";
                      }}
                    >
                      <span>✅</span>
                      <span>I'm Ready!</span>
                    </button>
                  ) : (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{
                        color: "var(--color-success)",
                        fontWeight: 600,
                        fontSize: 16,
                        marginBottom: 8
                      }}>
                        ✅ You're ready!
                      </div>
                      <div style={{
                        width: "100%",
                        height: 4,
                        background: "var(--color-white-a04)",
                        borderRadius: 2,
                        overflow: "hidden"
                      }}>
                        <div style={{
                          width: `${(readyCount / 2) * 100}%`,
                          height: "100%",
                          background: "linear-gradient(90deg, var(--color-accent-2), var(--color-accent-2))",
                          borderRadius: 2,
                          transition: "width 0.3s ease"
                        }} />
                      </div>
                    </div>
                  )}
                  <p style={{ color: "var(--color-text-faint)", fontSize: 13 }}>
                    {readyCount}/2 players ready
                  </p>
                </div>
              ) : (
                <div style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: 15 }}>
                  <div style={{ marginBottom: 16 }}>⏳ Waiting for opponent to join...</div>
                  <div style={{
                    width: 40,
                    height: 40,
                    margin: "0 auto",
                    border: `2px solid ${meta.color}20`,
                    borderTopColor: meta.color,
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }} />
                </div>
              )}

              {/* Leave button */}
              <div style={{ marginTop: 24, textAlign: "center" }}>
                <button
                  onClick={handleCancel}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--color-text-faint)",
                    fontSize: 14,
                    cursor: "pointer",
                    padding: "8px 16px",
                    transition: "color 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--color-text-muted)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--color-text-faint)";
                  }}
                >
                  ← Leave Room
                </button>
              </div>
            </div>
          )}

          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>

        </PageWrap>
      </div>
    </div>
  );
}