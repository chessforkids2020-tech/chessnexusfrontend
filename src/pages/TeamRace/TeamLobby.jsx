import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api';
import { getTopicTitle } from '../../utils/topicTitles';
import PlayerName from '../../components/PlayerName';
import './TeamLobby.css';

function TeamLobby() {
  const { raceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [race, setRace] = useState(null);
  const [teams, setTeams] = useState([]);
  const [userTeam, setUserTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [raceStarted, setRaceStarted] = useState(false);
  const teamsRef = useRef(teams);
  const userTeamRef = useRef(userTeam);
  const raceRef = useRef(race);
  const navigatedRef = useRef(false);
  const [liveLeaderboard, setLiveLeaderboard] = useState([]);
  const [playerLeaderboard, setPlayerLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [playersPage, setPlayersPage] = useState(0);
  const PLAYERS_PER_PAGE = 20;
  const [countdown, setCountdown] = useState(null);
  const [playerLbPage, setPlayerLbPage] = useState(0);
  // ===== TEAM RACE DEBUG LOGGING =====
  // 🔍 - User team checking and redirection logic
  // 🚀 - Component lifecycle and socket setup
  // 📡 - API calls and data fetching
  // ✅ - Successful operations
  // ❌ - Errors and failures
  // 🔄 - State changes and retries
  // 🏁 - Race start events
  // 👥 - Team and player operations
  // 📋 - Race status and data
  // 🐛 - Debug panel output

  useEffect(() => {
    
    if (!raceId || raceId === 'undefined') {
      navigate('/dashboard');
      return;
    }

    const API = import.meta.env.VITE_API_URL || window.location.origin;
    const token = localStorage.getItem('authToken');
    const newSocket = io(API, { auth: { token }, transports: ['websocket', 'polling'] });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      // Join race-specific socket room to receive events
      newSocket.emit('joinTeamRace', { raceId });
    });

    newSocket.on('connect_error', (error) => {
    });

    fetchRaceDetails();
    fetchTeams();

    // Socket listeners
    newSocket.on('teamRaceStarted', (data) => {
      if (data.raceId === raceId) {
        setRaceStarted(true);
        // Update refs
        raceRef.current = { ...race, status: 'running', startTime: data.startTime };

        // Update race status
        const updatedRace = { ...race, status: 'running', startTime: data.startTime };
        setRace(updatedRace);

        // Fetch initial leaderboard
        fetchLobbyLeaderboard();

        // Compute whether user is in a team using latest teams ref or state
        const currentUserId = user?.id || user?._id;
        const latestTeams = teamsRef.current || teams;
        const myTeamFromTeams = latestTeams.find(team => (team.players || []).some(p => String((p.userId && (p.userId._id || p.userId.id)) || p.userId) === String(currentUserId)));

        // set the user team if found
        if (myTeamFromTeams && !userTeamRef.current) {
          setUserTeam(myTeamFromTeams);
          userTeamRef.current = myTeamFromTeams;
        }

        // Now redirect if user is in a team
        if ((myTeamFromTeams || userTeamRef.current) && !navigatedRef.current) {
          navigatedRef.current = true;
          navigate(`/team-race/${raceId}/race`);
        } else if (navigatedRef.current) {
        } else {
          // Try to fetch teams (in case the client doesn't have them yet) so the userTeam will be set if possible
          fetchTeams();
        }
      } else {
      }
    });

    // Listen for race running event (when admin clicks "Begin Race" -> "Run Race")
    newSocket.on('teamRaceRunning', (data) => {
      if (data.raceId === raceId) {
        setRaceStarted(true);
        // Update refs
        raceRef.current = { ...race, status: 'running', startTime: data.startTime };

        // Update race status
        const updatedRace = { ...race, status: 'running', startTime: data.startTime };
        setRace(updatedRace);

        // Fetch initial leaderboard
        fetchLobbyLeaderboard();

        // Compute whether user is in a team using latest teams ref or state
        const currentUserId = user?.id || user?._id;
        const latestTeams = teamsRef.current || teams;
        const myTeamFromTeams = latestTeams.find(team => (team.players || []).some(p => String((p.userId && (p.userId._id || p.userId.id)) || p.userId) === String(currentUserId)));

        // set the user team if found
        if (myTeamFromTeams && !userTeamRef.current) {
          setUserTeam(myTeamFromTeams);
          userTeamRef.current = myTeamFromTeams;
        }

        // Now redirect if user is in a team
        if ((myTeamFromTeams || userTeamRef.current) && !navigatedRef.current) {
          navigatedRef.current = true;
          navigate(`/team-race/${raceId}/race`);
        } else if (navigatedRef.current) {
        } else {
          // Try to fetch teams (in case the client doesn't have them yet) so the userTeam will be set if possible
          fetchTeams();
        }
      }
    });

    newSocket.on('teamPlayerJoined', (data) => {
      if (data.teams) {
        setTeams(data.teams || []);
        // update ref immediately
        teamsRef.current = data.teams || [];

        // Also check if the current user was added to a team and update userTeam
        const currentUserId = user?.id || user?._id;
        if (currentUserId) {
          const myTeam = data.teams.find(team => (team.players || []).some(p => String((p.userId && (p.userId._id || p.userId.id)) || p.userId) === String(currentUserId)));
          if (myTeam) {
            setUserTeam(myTeam);
            userTeamRef.current = myTeam;
            // If race is running, redirect
            if (race?.status === 'running' || raceRef.current?.status === 'running') {
              navigate(`/team-race/${raceId}/race`);
            }
          }
        }
      } else {
        // Fallback to API if teams not in event
        fetchTeams();
      }
    });

    // Listen for live leaderboard updates
    newSocket.on('teamLeaderboardUpdate', (data) => {
      if (data.raceId === raceId) {
        setLiveLeaderboard(data.leaderboard || []);
        setPlayerLeaderboard(data.playerLeaderboard || []);
        // Auto-show leaderboard when race starts
        if (data.leaderboard && data.leaderboard.length > 0 && race?.status === 'running') {
          setShowLeaderboard(true);
        }
      }
    });

    // Listen for race countdown
    newSocket.on('raceCountdown', (data) => {
      // Could show countdown timer here
    });

    return () => {
      newSocket.disconnect();
    };
  }, [raceId, user]); // Add user as dependency

  // Keep refs updated whenever related state changes
  useEffect(() => { teamsRef.current = teams; }, [teams]);
  useEffect(() => { userTeamRef.current = userTeam; }, [userTeam]);
  useEffect(() => { raceRef.current = race; }, [race]);

  // Live countdown to scheduledStartTime
  useEffect(() => {
    if (!race || race.status !== 'waiting' || !race.scheduledStartTime) {
      setCountdown(null);
      return;
    }
    const tick = () => {
      const diff = Math.max(0, new Date(race.scheduledStartTime).getTime() - Date.now());
      setCountdown(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [race?.scheduledStartTime, race?.status]);

  // Check for redirect when race and teams are both loaded
  useEffect(() => {
    // When race is running and user is on a team, redirect (raceStarted flag not required)
    if (race && race.status === 'running' && user && userTeam) {
      checkUserTeamAndRedirect();
    }
  }, [race, user, raceStarted, userTeam]);

  const debugRaceState = () => {

    teams.forEach((team, index) => {
      (team.players || []).forEach(player => {
        const playerId = player.userId?._id || player.userId?.id || player.userId;
        const isCurrentUser = String(playerId) === String(user?.id || user?._id);
      });
    });

  };

  // Add debug function to window for easy access
  useEffect(() => {
    window.debugTeamRace = debugRaceState;
  }, [raceId, race, teams, user, raceStarted, socket, loading]);  const fetchTeams = async () => {
    try {
      const response = await api.get(`/api/team-race/${raceId}/teams`);
      const data = response.data;
      (data || []).forEach(team => {
      });
      setTeams(data || []);
      teamsRef.current = data || [];

      // Find user's team using AuthContext user
      // Note: user object has 'id' field, not '_id'
      const currentUserId = user?.id || user?._id;
      
      if (currentUserId) {
        const myTeam = data.find(team => {
          const found = (team.players || []).some(p => {
            const playerUserId = p.userId?._id || p.userId?.id || p.userId;
            return String(playerUserId) === String(currentUserId);
          });
          return found;
        });
        setUserTeam(myTeam);
        userTeamRef.current = myTeam;

        // If race is currently running, redirect immediately
        if (myTeam && race?.status === 'running') {
          navigate(`/team-race/${raceId}/race`);
        }
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const fetchRaceDetails = async () => {
    try {
      const response = await api.get(`/api/team-race/${raceId}`);
      setRace(response.data);
    } catch (err) {
    }
  };

  const fetchLobbyLeaderboard = async () => {
    try {
      const response = await api.get(`/api/team-race/${raceId}/leaderboard`);
      const data = response.data;
      setLiveLeaderboard(data.leaderboard || []);
      setPlayerLeaderboard(data.playerLeaderboard || []);
      if (data.leaderboard && data.leaderboard.length > 0) {
        setShowLeaderboard(true);
      }
    } catch (err) {
    }
  };

  const getUserId = () => {
    return user?.id || user?._id || null;
  };

  const getAllPlayers = () => {
    const allPlayers = [];
    teams.forEach(team => {
      (team.players || []).forEach(player => {
        allPlayers.push({
          ...player,
          teamName: team.teamName,
          teamId: team._id
        });
      });
    });
    return allPlayers.sort((a, b) => a.position - b.position);
  };

  const checkUserTeamAndRedirect = () => {

    if (!userTeam) {
      return;
    }

    if (race && race.status === 'running') {
      navigate(`/team-race/${raceId}/race`);
    } else {
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading lobby...</div>;
  }

  if (!race) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Unable to load race</h2>
        <button onClick={() => navigate('/team-race')} className="btn-back">
          ← Back to Races
        </button>
      </div>
    );
  }

  if (!userTeam) {
    // Redirect to team selection so user can join (even during running race)
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>You haven't joined a team yet</h2>
        <p>
          {race && race.status === 'running'
            ? 'The race is already running — you can still join a team and start playing!'
            : 'Please select a team first'}
        </p>
        <button onClick={() => navigate(`/team-race/${raceId}/select-team`)} className="btn-back">
          {race && race.status === 'running' ? '➕ Join a Team Now' : '← Select Team'}
        </button>
        <button onClick={() => navigate('/team-race')} className="btn-back" style={{ marginLeft: '10px' }}>
          ← Back to Races
        </button>
      </div>
    );
  }

  return (
    <div className="team-lobby">
      <div className="lobby-header">
        <h1>🏁 {race.raceName} - Lobby</h1>
        <div className="race-status-banner">
          {race.status === 'waiting' ? (
            <div className="status-waiting">
              {countdown !== null && countdown > 0 ? (
                <>
                  🕐 Race starts in{' '}
                  <span className="countdown-timer">
                    {String(Math.floor(countdown / 3600000)).padStart(2, '0')}:
                    {String(Math.floor((countdown % 3600000) / 60000)).padStart(2, '0')}:
                    {String(Math.floor((countdown % 60000) / 1000)).padStart(2, '0')}
                  </span>
                </>
              ) : countdown === 0 ? (
                <>⚡ Starting now...</>
              ) : (
                <>⏳ Waiting for admin to start the race...</>
              )}
            </div>
          ) : race.status === 'running' ? (
            <div className="status-running">
              🏃 Race is running! Redirecting to puzzles...
            </div>
          ) : (
            <div className="status-ready">
              🏃 Race is about to begin!
            </div>
          )}
        </div>
        <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
          {liveLeaderboard.length > 0 && (
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              style={{
                padding: '8px 16px',
                backgroundColor: showLeaderboard ? '#dc3545' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {showLeaderboard ? '📊 Hide Leaderboard' : '📊 Show Leaderboard'}
            </button>
          )}
        </div>
      </div>

      <div className="lobby-content">
        {/* Left Section: All Teams Overview */}
        <div className="teams-overview">
          <h2>📊 Teams Overview</h2>
          <div className="teams-list">
            {teams.map(team => (
              <div 
                key={team._id} 
                className={`team-summary ${team._id === userTeam._id ? 'my-team' : ''}`}
              >
                <div className="team-summary-header">
                  <h3>{team.teamName}</h3>
                  {team._id === userTeam._id && (
                    <span className="my-team-badge">Your Team</span>
                  )}
                </div>
                <div className="team-stats">
                  <div className="stat">
                    <span className="stat-icon">👥</span>
                    <span className="stat-value">{(team.players || []).length}/{team.maxPlayers}</span>
                    <span className="stat-label">Players</span>
                  </div>
                </div>
                <div className="team-mini-players">
                  {(team.players || []).slice(0, 3).map(player => (
                    <div key={player.userId._id} className="mini-player">
                      <PlayerName displayName={player.userId.displayName} username={player.userId.username} userId={player.userId._id} />
                    </div>
                  ))}
                  {(team.players || []).length > 3 && (
                    <div className="mini-player-more">
                      +{(team.players || []).length - 3} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Section: All Players List */}
        <div className="all-players-section">
          {(() => {
            const allPlayers = getAllPlayers();
            const totalPages = Math.max(1, Math.ceil(allPlayers.length / PLAYERS_PER_PAGE));
            const safePage = Math.min(playersPage, totalPages - 1);
            const pagePlayers = allPlayers.slice(safePage * PLAYERS_PER_PAGE, safePage * PLAYERS_PER_PAGE + PLAYERS_PER_PAGE);
            return (
              <>
                <div className="players-section-header">
                  <h2>👥 All Participants ({allPlayers.length})</h2>
                  <span className="players-page-info">
                    Page {safePage + 1} / {totalPages}
                  </span>
                </div>
                <div className="players-table">
                  <div className="players-table-header">
                    <div className="header-position">#</div>
                    <div className="header-player">Player</div>
                    <div className="header-team">Team</div>
                  </div>
                  <div className="players-table-body">
                    {pagePlayers.map((player) => (
                      <div key={`${player.teamId}-${player.userId._id}`} className="player-row">
                        <div className="player-position">
                          <span className="position-badge">#{player.position}</span>
                        </div>
                        <div className="player-name">
                          <PlayerName displayName={player.userId.displayName} username={player.userId.username} userId={player.userId._id} />
                        </div>
                        <div className="player-team">
                          <span className="team-badge" style={{
                            background: getTeamColor(player.teamId)
                          }}>
                            {player.teamName}
                          </span>
                        </div>
                      </div>
                    ))}
                    {pagePlayers.length === 0 && (
                      <div className="players-empty">No participants yet</div>
                    )}
                  </div>
                </div>
                {totalPages > 1 && (
                  <div className="players-pagination">
                    <button
                      className="pagination-btn"
                      onClick={() => setPlayersPage(p => Math.max(0, p - 1))}
                      disabled={safePage === 0}
                    >
                      ← Prev
                    </button>
                    <div className="pagination-dots">
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          className={`pagination-dot ${i === safePage ? 'active' : ''}`}
                          onClick={() => setPlayersPage(i)}
                        />
                      ))}
                    </div>
                    <button
                      className="pagination-btn"
                      onClick={() => setPlayersPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={safePage === totalPages - 1}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Live Leaderboard */}
      {showLeaderboard && (liveLeaderboard.length > 0 || playerLeaderboard.length > 0) && (
        <div className="live-leaderboard-section">
          <div className="lb-tables-wrap">
            {/* Team Standings Table */}
            <div className="lb-table-block">
              <h3>🏆 Team Standings</h3>
              <table className="lb-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Team</th>
                    <th>Score</th>
                    <th>Players</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...liveLeaderboard]
                    .sort((a, b) => b.totalScore - a.totalScore)
                    .map((team, index) => (
                      <tr
                        key={team.teamId}
                        className={String(team.teamId) === String(userTeam?._id) ? 'lb-my-row' : ''}
                      >
                        <td className="lb-rank">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </td>
                        <td className="lb-name">{team.teamName}</td>
                        <td className="lb-score">{team.totalScore}</td>
                        <td className="lb-players">{team.activePlayers}/{team.totalPlayers}</td>
                        <td><span className={`status-badge ${team.status}`}>{team.status}</span></td>
                      </tr>
                    ))}
                  {liveLeaderboard.length === 0 && (
                    <tr><td colSpan="5" className="lb-empty">Race hasn't started yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Top Players Table */}
            <div className="lb-table-block">
              {(() => {
                const PL_PER_PAGE = 10;
                const plTotal = Math.max(1, Math.ceil(playerLeaderboard.length / PL_PER_PAGE));
                const safePlPage = Math.min(playerLbPage, plTotal - 1);
                const pagePlayers = playerLeaderboard.slice(safePlPage * PL_PER_PAGE, safePlPage * PL_PER_PAGE + PL_PER_PAGE);
                const myId = String(user?.id || user?._id);
                const myRankIdx = playerLeaderboard.findIndex(p => String(p.userId) === myId);
                const myOnPage = pagePlayers.some(p => String(p.userId) === myId);
                const myPlayer = myRankIdx >= 0 ? playerLeaderboard[myRankIdx] : null;
                return (
                  <>
                    <h3>🎯 Top Players{playerLeaderboard.length > 0 ? ` (${playerLeaderboard.length})` : ''}</h3>
                    <table className="lb-table">
                      <thead>
                        <tr><th>#</th><th>Player</th><th>Score</th></tr>
                      </thead>
                      <tbody>
                        {pagePlayers.map((player, i) => {
                          const abs = safePlPage * PL_PER_PAGE + i;
                          return (
                            <tr key={player.userId} className={String(player.userId) === myId ? 'lb-my-row' : ''}>
                              <td className="lb-rank">{abs === 0 ? '🥇' : abs === 1 ? '🥈' : abs === 2 ? '🥉' : `#${abs + 1}`}</td>
                              <td className="lb-name"><PlayerName displayName={player.displayName} username={player.username} userId={player.userId} /></td>
                              <td className="lb-score">{player.totalScore}</td>
                            </tr>
                          );
                        })}
                        {myPlayer && !myOnPage && (
                          <tr className="lb-my-row lb-pinned-row">
                            <td className="lb-rank">{myRankIdx === 0 ? '🥇' : myRankIdx === 1 ? '🥈' : myRankIdx === 2 ? '🥉' : `#${myRankIdx + 1}`}</td>
                            <td className="lb-name">📍 <PlayerName displayName={myPlayer.displayName} username={myPlayer.username} userId={myPlayer.userId} /></td>
                            <td className="lb-score">{myPlayer.totalScore}</td>
                          </tr>
                        )}
                        {playerLeaderboard.length === 0 && (
                          <tr><td colSpan="3" className="lb-empty">No player data yet</td></tr>
                        )}
                      </tbody>
                    </table>
                    {plTotal > 1 && (
                      <div className="lb-pagination">
                        <button className="lb-page-btn" onClick={() => setPlayerLbPage(p => Math.max(0, p - 1))} disabled={safePlPage === 0}>‹ Prev</button>
                        <span className="lb-page-info">{safePlPage + 1} / {plTotal}</span>
                        <button className="lb-page-btn" onClick={() => setPlayerLbPage(p => Math.min(plTotal - 1, p + 1))} disabled={safePlPage === plTotal - 1}>Next ›</button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <div className="lobby-info">
        <div className="info-card">
          <h3>📋 Race Information</h3>
          <div className="info-details">
            <div className="info-item">
              <strong>Topic:</strong> {getTopicTitle(race.topic)}
            </div>
            <div className="info-item">
              <strong>Duration:</strong> {Math.floor(race.duration / 60)} minutes
            </div>
            <div className="info-item">
              <strong>Points per Puzzle:</strong> {race.pointsPerPuzzle}
            </div>
          </div>
        </div>

        <div className="info-card">
          <h3>🎯 How It Works</h3>
          <ul className="rules-list">
            <li>Each team competes simultaneously</li>
            <li>Players at the same position get the same puzzles</li>
            <li>Your position: <strong>#{(userTeam.players || []).find(p => getUserId() && p.userId._id === getUserId())?.position || '?'}</strong></li>
            <li>Team score = Sum of all player scores</li>
            <li>Get ready when the admin starts the race!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Helper function to generate consistent team colors
function getTeamColor(teamId) {
  const colors = [
    '#667eea',
    '#28a745',
    '#ffc107',
    '#dc3545',
    '#17a2b8',
    '#6f42c1',
    '#fd7e14',
    '#20c997'
  ];
  const hash = teamId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export default TeamLobby;
