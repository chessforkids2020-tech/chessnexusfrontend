// FILE: src/pages/arcade/BingoChoose.jsx
// Route: /arcade/bingo
// Obsidian glass design with clickable buttons only

import { useState, useEffect, useRef } from "react";
import PlayerName from "../../components/PlayerName";
import { useNavigate, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import {
  T, PageWrap, GlassCard, GradHeading, Btn, ErrorBanner, SectionLabel,
  SOCKET_URL, BOARD_SIZES, API_BASE,
  SIDEBAR_OFFSET,
} from "./arcadeTheme";
import { useAuth } from "../../contexts/AuthContext";
import Sidebar from "../../components/Sidebar";

export default function BingoChoose() {
  const navigate = useNavigate();
  const { state } = useLocation();
  console.log("[BingoChoose] location.state", state);
  const { user } = useAuth();
  function getGuestId() {
    let gid = sessionStorage.getItem('arcade_guest_id');
    if (!gid) { gid = 'guest_' + Math.random().toString(36).slice(2, 9); sessionStorage.setItem('arcade_guest_id', gid); }
    return gid;
  }
  const guestId  = user ? null : getGuestId();
  const username = state?.username || user?.displayName || user?.username || user?.name || ('Guest_' + (guestId || '').slice(-5));
  const userId   = state?.userId   || user?._id || user?.id || guestId;
  const mode = state?.mode || "matchmaking";

  const socketRef = useRef(null);
  const [boardSize, setBoardSize] = useState(3);
  const [screen, setScreen] = useState("pick");
  const [error, setError] = useState("");
  const [roomInfo, setRoomInfo] = useState(null);
  const roomInfoRef = useRef(roomInfo);
  useEffect(() => { roomInfoRef.current = roomInfo; }, [roomInfo]);
  const [readyCount, setReadyCount] = useState(0);
  const [iAmReady, setIAmReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hoveredSize, setHoveredSize] = useState(null);

  useEffect(() => {
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
    socket.on('connect', () => { console.log('[BingoChoose] socket connected via', socket.io.engine.transport.name, socket.id); });
    socket.on("connect_error", (err) => {
      console.error("[BingoChoose] socket connect_error:", err);
      setError(`Connection error: ${err?.message || String(err)}. Retrying...`);
    });
    socket.on("connect_timeout", () => {
      console.error("[BingoChoose] socket connect_timeout");
      setError("Connection timed out. Please refresh.");
    });

    socket.on("room_created", ({ roomCode, playerNum, boardSize: bs }) => {
      setRoomInfo({ roomCode, playerNum, boardSize: bs, gameType: "bingo", players: [{ username, playerNum }] });
      setScreen("waiting");
    });

    socket.on("match_found", ({ roomCode, boardSize: bs, players }) => {
      setRoomInfo(prev => ({ ...prev, roomCode, boardSize: bs, gameType: "bingo", players }));
      setScreen("waiting");
    });

    socket.on("your_player_num", ({ playerNum }) => {
      setRoomInfo(prev => ({ ...prev, playerNum }));
    });

    socket.on("matchmaking_waiting", () => setScreen("matchmaking"));

    socket.on("matchmaking_cancelled", () => setScreen("pick"));

    socket.on("room_ready", ({ players, roomCode, boardSize: bs }) => {
      setRoomInfo(prev => ({ ...prev, players, roomCode, boardSize: bs }));
    });

    socket.on("player_ready_update", ({ readyCount: rc }) => setReadyCount(rc));

    socket.on("join_error", ({ message }) => setError(message));

    socket.on("game_start", ({ roomCode, boardSize: bs, firstPlayer, gameState, playerNum: pnFromServer, players: srvPlayers }) => {
      const pn = pnFromServer ?? roomInfoRef.current?.playerNum;
      navigate("/arcade/game", {
        state: {
          roomCode, gameType: "bingo", boardSize: bs,
          firstPlayer, gameState,
          playerNum: pn,
          username, userId,
          players: srvPlayers || roomInfoRef.current?.players,
        },
      });
    });

    socket.on("opponent_disconnected", () => { setError("Opponent disconnected."); setScreen("pick"); setRoomInfo(null); });

    return () => socket.disconnect();
  }, []);

  const handleStart = (e) => {
    e.stopPropagation();
    console.log("[BingoChoose] handleStart", { mode, boardSize, username, userId });
    const sock = socketRef.current;
    if (!sock?.connected) {
      setError("Connecting to server...");
      if (sock) {
        sock.once('connect', () => {
          setError("");
          if (mode === "matchmaking") {
            sock.emit("join_matchmaking", { gameType: "bingo", boardSize, username, userId });
          } else {
            sock.emit("create_room", { gameType: "bingo", boardSize, username, userId });
          }
        });
        sock.connect();
      }
      return;
    }
    if (mode === "matchmaking") {
      sock.emit("join_matchmaking", { gameType: "bingo", boardSize, username, userId });
    } else {
      sock.emit("create_room", { gameType: "bingo", boardSize, username, userId });
    }
  };

  const handleReady = (e) => {
    e.stopPropagation();
    // Server now fetches themes directly from DB hints - no client fetch needed
    socketRef.current?.emit("player_ready", { roomCode: roomInfo?.roomCode, themes: [] });
    setIAmReady(true);
  };

  const handleCancel = (e) => {
    e?.stopPropagation();
    socketRef.current?.emit("cancel_matchmaking", { userId });
    setScreen("pick");
    setRoomInfo(null);
    setIAmReady(false);
    setReadyCount(0);
  };

  const handleCopyCode = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(roomInfo.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBack = (e) => {
    e.stopPropagation();
    navigate("/arcade/lobby?game=bingo");
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
        <PageWrap maxWidth={720} style={{ padding: "40px 30px" }}>

          {/* Header with game icon */}
          <div style={{
            background: "rgba(20, 25, 35, 0.6)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 40,
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
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)"
            }} />

            <h1 style={{
              fontSize: "clamp(24px, 5vw, 32px)",
              fontWeight: 800,
              margin: "0 0 8px",
              background: "linear-gradient(135deg, #fff 0%, #06b6d4 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.02em",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12
            }}>
              <span style={{ fontSize: "1.2em", color: "#fff" }}>🎯</span>
              Chess Bingo
            </h1>

            <p style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 15,
              margin: 0,
              maxWidth: 400,
              marginLeft: "auto",
              marginRight: "auto"
            }}>
              {mode === "matchmaking"
                ? "Quick Match — Test your puzzle knowledge and mark your card"
                : "Create Private Room — Challenge a friend to bingo"}
            </p>
          </div>

          <ErrorBanner message={error} onClose={() => setError("")} />

          {/* ══ PICK SIZE ══ */}
          {screen === "pick" && (
            <>
              {/* Board size selection */}
              <div style={{
                background: "rgba(20, 25, 35, 0.6)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 40,
                padding: 32,
                marginBottom: 20
              }}>
                <h3 style={{
                  color: "#fff",
                  fontSize: 18,
                  fontWeight: 600,
                  margin: "0 0 20px",
                  letterSpacing: "-0.01em"
                }}>
                  Choose Your Bingo Card Size
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                  {BOARD_SIZES.map(({ s, label, tag, color }) => (
                    <div
                      key={s}
                      onMouseEnter={() => setHoveredSize(s)}
                      onMouseLeave={() => setHoveredSize(null)}
                      style={{
                        position: "relative",
                        transition: "transform 0.2s ease",
                        transform: hoveredSize === s ? "translateY(-4px)" : "none"
                      }}
                    >
                      {/* Visual card only - not clickable */}
                      <div
                        style={{
                          padding: "24px 16px",
                          borderRadius: 24,
                          textAlign: "center",
                          background: boardSize === s
                            ? `linear-gradient(145deg, ${color}15, ${color}05)`
                            : "rgba(255,255,255,0.02)",
                          border: boardSize === s
                            ? `1px solid ${color}40`
                            : "1px solid rgba(255,255,255,0.05)",
                          backdropFilter: "blur(10px)",
                          transition: "all 0.2s ease",
                          cursor: "default",
                          boxShadow: boardSize === s
                            ? `0 10px 20px -10px ${color}`
                            : "none"
                        }}
                      >
                        <div style={{
                          color: boardSize === s ? color : "rgba(255,255,255,0.7)",
                          fontWeight: 700,
                          fontSize: 26,
                          marginBottom: 8
                        }}>
                          {label}
                        </div>

                        <span style={{
                          display: "inline-block",
                          padding: "4px 12px",
                          borderRadius: 20,
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          background: `${color}15`,
                          color: color,
                          border: `1px solid ${color}30`,
                          letterSpacing: "0.5px"
                        }}>
                          {tag}
                        </span>

                        {/* Bingo card preview with "FREE" center for odd sizes */}
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: `repeat(${s},1fr)`,
                          gap: 4,
                          marginTop: 20,
                          padding: "0 8px"
                        }}>
                          {Array.from({ length: s * s }).map((_, i) => {
                            const isCenter = s % 2 === 1 && i === Math.floor(s * s / 2);
                            return (
                              <div
                                key={i}
                                style={{
                                  aspectRatio: "1",
                                  background: boardSize === s ? `${color}40` : "rgba(255,255,255,0.1)",
                                  borderRadius: 4,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: isCenter ? 8 : undefined,
                                  color: isCenter ? "#fff" : undefined,
                                  fontWeight: isCenter ? 600 : undefined
                                }}
                              >
                                {isCenter && "★"}
                              </div>
                            );
                          })}
                        </div>

                        {/* Select button - ONLY CLICKABLE ELEMENT */}
                        <button
                          onClick={() => setBoardSize(s)}
                          style={{
                            marginTop: 20,
                            background: boardSize === s ? color : "rgba(255,255,255,0.05)",
                            borderRadius: 40,
                            padding: "10px 20px",
                            width: "100%",
                            color: boardSize === s ? "#fff" : "rgba(255,255,255,0.5)",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            border: boardSize === s ? "none" : "1px solid rgba(255,255,255,0.1)"
                          }}
                          onMouseEnter={(e) => {
                            if (boardSize !== s) {
                              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (boardSize !== s) {
                              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                            }
                          }}
                        >
                          {boardSize === s ? "✓ Selected" : "Select"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <button
                  onClick={handleStart}
                  style={{
                    background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
                    border: "none",
                    borderRadius: 40,
                    padding: "18px 24px",
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#fff",
                    cursor: "pointer",
                    boxShadow: "0 10px 25px -5px rgba(6,182,212,0.5), 0 0 0 1px rgba(255,255,255,0.1) inset",
                    transition: "all 0.2s ease",
                    width: "100%",
                    letterSpacing: "0.3px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.02)";
                    e.currentTarget.style.boxShadow = "0 15px 30px -5px rgba(6,182,212,0.7), 0 0 0 1px rgba(255,255,255,0.2) inset";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "0 10px 25px -5px rgba(6,182,212,0.5), 0 0 0 1px rgba(255,255,255,0.1) inset";
                  }}
                >
                  <span>{mode === "matchmaking" ? "🎲 Find Opponent" : "🏠 Create Room"}</span>
                  <span style={{ fontSize: 18 }}>→</span>
                </button>

                <button
                  onClick={handleBack}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 40,
                    padding: "14px 24px",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.6)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    width: "100%"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                  }}
                >
                  ← Back to Game Selection
                </button>
              </div>
            </>
          )}

          {/* ══ MATCHMAKING ══ */}
          {screen === "matchmaking" && (
            <div style={{
              background: "rgba(20, 25, 35, 0.6)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 40,
              padding: 48,
              textAlign: "center"
            }}>
              <div style={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                margin: "0 auto 24px",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                {/* Animated rings */}
                <div style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  border: "2px solid rgba(6,182,212,0.3)",
                  animation: "ripple 1.5s ease-out infinite"
                }} />
                <div style={{
                  position: "absolute",
                  width: "80%",
                  height: "80%",
                  borderRadius: "50%",
                  border: "2px solid rgba(6,182,212,0.2)",
                  animation: "ripple 1.5s ease-out infinite 0.5s"
                }} />
                <span style={{ fontSize: 48, position: "relative", zIndex: 1, color: "#fff" }}>🎯</span>
              </div>

              <h2 style={{
                fontSize: 24,
                fontWeight: 700,
                margin: "0 0 8px",
                background: "linear-gradient(135deg, #fff 0%, #06b6d4 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}>
                Finding Opponent...
              </h2>

              <p style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 15,
                margin: "0 0 4px"
              }}>
                🎯 Chess Bingo • {boardSize}×{boardSize}
              </p>

              <p style={{
                color: "rgba(255,255,255,0.3)",
                fontSize: 13,
                marginBottom: 32
              }}>
                Matching with someone on the same board size
              </p>

              <button
                onClick={handleCancel}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 40,
                  padding: "14px 32px",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  margin: "0 auto"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                }}
              >
                Cancel Search
              </button>

              <style>{`
                @keyframes ripple {
                  0% { transform: scale(0.8); opacity: 1; }
                  100% { transform: scale(1.5); opacity: 0; }
                }
                @keyframes float {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-10px); }
                }
              `}</style>
            </div>
          )}

          {/* ══ WAITING ROOM ══ */}
          {screen === "waiting" && roomInfo && (
            <div style={{
              background: "rgba(20, 25, 35, 0.6)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 40,
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
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)"
              }} />

              {/* Room header */}
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🏰</div>
                <h2 style={{
                  fontSize: 28,
                  fontWeight: 700,
                  margin: "0 0 8px",
                  background: "linear-gradient(135deg, #fff 0%, #06b6d4 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}>
                  Room {roomInfo.roomCode}
                </h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15 }}>
                  🎯 Chess Bingo • {roomInfo.boardSize}×{roomInfo.boardSize}
                </p>
              </div>

              {/* Share code section - for room creator */}
              {roomInfo.playerNum === 1 && (
                <div style={{
                  background: "rgba(6,182,212,0.08)",
                  border: "1px solid rgba(6,182,212,0.2)",
                  borderRadius: 24,
                  padding: "20px",
                  marginBottom: 32,
                  textAlign: "center"
                }}>
                  <p style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 12,
                    margin: "0 0 12px",
                    textTransform: "uppercase",
                    letterSpacing: "1px"
                  }}>
                    Share this code with your friend
                  </p>
                  <div style={{
                    fontSize: 42,
                    fontWeight: 800,
                    letterSpacing: 12,
                    color: "#06b6d4",
                    marginBottom: 16,
                    textShadow: "0 0 20px rgba(6,182,212,0.5)"
                  }}>
                    {roomInfo.roomCode}
                  </div>
                  <button
                    onClick={handleCopyCode}
                    style={{
                      background: copied ? "rgba(16,185,129,0.15)" : "rgba(6,182,212,0.15)",
                      border: copied ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(6,182,212,0.3)",
                      borderRadius: 40,
                      padding: "12px 24px",
                      color: copied ? "#10b981" : "#06b6d4",
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
                        e.currentTarget.style.background = "rgba(6,182,212,0.25)";
                        e.currentTarget.style.borderColor = "rgba(6,182,212,0.5)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!copied) {
                        e.currentTarget.style.background = "rgba(6,182,212,0.15)";
                        e.currentTarget.style.borderColor = "rgba(6,182,212,0.3)";
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
                        <span>Copy Room Code</span>
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
                  const p = roomInfo.players?.find(p => p.playerNum === num);
                  const isMe = num === roomInfo.playerNum;
                  const isReady = readyCount >= num;

                  return (
                    <div
                      key={num}
                      style={{
                        background: p
                          ? "linear-gradient(145deg, rgba(16,185,129,0.1), rgba(16,185,129,0.02))"
                          : "rgba(255,255,255,0.02)",
                        border: p
                          ? isReady
                            ? "1px solid rgba(16,185,129,0.3)"
                            : "1px solid rgba(16,185,129,0.15)"
                          : "1px solid rgba(255,255,255,0.05)",
                        borderRadius: 24,
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
                        filter: p ? "drop-shadow(0 0 10px rgba(16,185,129,0.5))" : "none",
                        opacity: p ? 1 : 0.3
                      }}>
                        {num === 1 ? "🎯" : "⭐"}
                      </div>

                      {/* Player name */}
                      <div style={{
                        color: p ? "#fff" : "rgba(255,255,255,0.3)",
                        fontWeight: 600,
                        fontSize: 16,
                        marginBottom: 4
                      }}>
                        {p ? <PlayerName displayName={p.displayName} username={p.username} /> : "Waiting for player..."}
                      </div>

                      {/* Player tag */}
                      <div style={{
                        color: isMe ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.3)",
                        fontSize: 12,
                        marginBottom: 8
                      }}>
                        {isMe ? "You" : `Player ${num}`}
                      </div>

                      {/* Ready status */}
                      {p && isReady && (
                        <div style={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          background: "#10b981",
                          borderRadius: 20,
                          padding: "4px 8px",
                          fontSize: 10,
                          fontWeight: 600,
                          color: "#fff"
                        }}>
                          ✓ READY
                        </div>
                      )}

                      {/* Loading animation for empty slot */}
                      {!p && (
                        <div style={{
                          width: 30,
                          height: 30,
                          margin: "10px auto 0",
                          border: "2px solid rgba(255,255,255,0.1)",
                          borderTopColor: "#06b6d4",
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
                        background: "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
                        border: "none",
                        borderRadius: 40,
                        padding: "18px 32px",
                        fontSize: 16,
                        fontWeight: 600,
                        color: "#fff",
                        cursor: "pointer",
                        boxShadow: "0 10px 25px -5px rgba(16,185,129,0.5), 0 0 0 1px rgba(255,255,255,0.1) inset",
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
                        e.currentTarget.style.boxShadow = "0 15px 30px -5px rgba(16,185,129,0.7), 0 0 0 1px rgba(255,255,255,0.2) inset";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow = "0 10px 25px -5px rgba(16,185,129,0.5), 0 0 0 1px rgba(255,255,255,0.1) inset";
                      }}
                    >
                      <span>✅</span>
                      <span>I'm Ready!</span>
                    </button>
                  ) : (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{
                        color: "#10b981",
                        fontWeight: 600,
                        fontSize: 16,
                        marginBottom: 8
                      }}>
                        ✅ You're ready!
                      </div>
                      <div style={{
                        width: "100%",
                        height: 4,
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: 2,
                        overflow: "hidden"
                      }}>
                        <div style={{
                          width: `${(readyCount / 2) * 100}%`,
                          height: "100%",
                          background: "linear-gradient(90deg, #10b981, #34d399)",
                          borderRadius: 2,
                          transition: "width 0.3s ease"
                        }} />
                      </div>
                    </div>
                  )}
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                    {readyCount}/2 players ready
                  </p>
                </div>
              ) : (
                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 15 }}>
                  <div style={{ marginBottom: 16 }}>⏳ Waiting for opponent to join...</div>
                  <div style={{
                    width: 40,
                    height: 40,
                    margin: "0 auto",
                    border: "2px solid rgba(6,182,212,0.2)",
                    borderTopColor: "#06b6d4",
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
                    color: "rgba(255,255,255,0.3)",
                    fontSize: 14,
                    cursor: "pointer",
                    padding: "8px 16px",
                    transition: "color 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "rgba(255,255,255,0.3)";
                  }}
                >
                  ← Leave Room
                </button>
              </div>

              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          )}

        </PageWrap>
      </div>
    </div>
  );
}