import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../../socket';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api';
import { getTopicTitle } from '../../utils/topicTitles';
import PlayerName from '../../components/PlayerName';
import './TeamSelection.css';

function TeamSelection() {
  const { raceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [race, setRace] = useState(null);
  const [teams, setTeams] = useState([]);
  const [userTeam, setUserTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    
    if (!raceId || raceId === 'undefined') {
      navigate('/dashboard');
      return;
    }

    fetchRaceDetails();
    fetchTeams();

    // Join race room for real-time updates
    socket.emit('joinTeamRace', { raceId });

    // Listen for race starting
    socket.on('teamRaceRunning', (data) => {
      if (data.raceId === raceId) {
        
        // Only redirect if user is already in a team
        const currentUserId = user?.id || user?._id;
        if (currentUserId && teams.length > 0) {
          const myTeam = teams.find(team => 
            team.players.some(p => {
              const playerId = p.userId?._id || p.userId?.id || p.userId;
              return String(playerId) === String(currentUserId);
            })
          );
          
          if (myTeam) {
            navigate(`/team-race/${raceId}/race`);
          } else {
            // Race started but user not in a team yet - update race state so they can still join
            fetchRaceDetails();
          }
        } else {
          fetchRaceDetails();
        }
      }
    });

    // Listen for player joined - update teams directly from event
    socket.on('teamPlayerJoined', (data) => {
      if (data.teams) {
        setTeams(data.teams);
      } else {
        // Fallback to API if teams not in event
        fetchTeams();
      }
    });

    // Listen for new team created - add to teams list
    socket.on('teamCreated', (data) => {
      if (data.team) {
        setTeams(prevTeams => {
          // Check if team already exists
          const exists = prevTeams.find(t => t._id === data.team._id);
          if (!exists) {
            return [...prevTeams, data.team];
          }
          return prevTeams;
        });
      }
    });

    return () => {
      socket.off('teamRaceRunning');
      socket.off('teamPlayerJoined');
      socket.off('teamCreated');
    };
  }, [raceId, user]);

  const fetchRaceDetails = async () => {
    if (!raceId || raceId === 'undefined') {
      return;
    }
    
    try {
      const response = await api.get(`/api/team-race/${raceId}`);
      setRace(response.data);
    } catch (err) {
    }
  };

  const fetchTeams = async () => {
    if (!raceId || raceId === 'undefined') {
      return;
    }
    
    try {
      const response = await api.get(`/api/team-race/${raceId}/teams`);
      const data = response.data;
      if (Array.isArray(data)) {
        setTeams(data);
        
        // Check if user is already in a team
        // Note: user object has 'id' field, not '_id'
        const currentUserId = user?.id || user?._id;
        if (currentUserId) {
          const myTeam = data.find(team => {
            return team.players.some(p => {
              const playerId = p.userId?._id || p.userId?.id || p.userId;
              return String(playerId) === String(currentUserId);
            });
          });
          setUserTeam(myTeam);
        }
      } else {
        setTeams([]);
      }
    } catch (err) {
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async (teamId) => {
    if (joining) return;
    setJoining(true);

    try {
      const response = await api.post(`/api/team-race/${raceId}/join-team`, { teamId });
      const data = response.data;
      if (race?.status === 'running') {
        // Race already running - go straight to puzzle page
        navigate(`/team-race/${raceId}/race`);
      } else {
        alert(`Successfully joined team! You are at position #${data.position}`);
        navigate(`/team-race/${raceId}/lobby`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to join team');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading teams...</div>;
  }

  if (!race) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Race not found</div>;
  }

  return (
    <div className="team-selection">
      <div className="team-selection-header">
        <h1>🏁 {race.raceName}</h1>
        <div className="race-info">
          <span>📚 {getTopicTitle(race.topic)}</span>
          <span>⏱️ {Math.floor(race.duration / 60)} min</span>
          <span>⭐ {race.pointsPerPuzzle} pts/puzzle</span>
        </div>
        <button onClick={() => navigate('/team-race')} className="btn-back">
          ← Back to Races
        </button>
        {userTeam && (
          <button onClick={() => navigate(`/team-race/${raceId}/lobby`)} className="btn-lobby" style={{ marginLeft: '10px' }}>
            🚪 Go to Lobby
          </button>
        )}
      </div>

      {race && race.status === 'running' && !userTeam && (
        <div style={{ padding: '20px', background: '#fff3cd', color: '#856404', borderRadius: '8px', margin: '20px', textAlign: 'center', fontWeight: 600 }}>
          🏃 Race is live! Join a team now to start solving puzzles.
        </div>
      )}

      {userTeam && (
        <div style={{ padding: '20px', background: '#d4edda', color: '#155724', borderRadius: '8px', margin: '20px', textAlign: 'center' }}>
          ✅ You are already in <strong>{userTeam.teamName}</strong> team!
        </div>
      )}

      <div className="team-selection-content">
        <h2>Choose Your Team</h2>
        <p className="instruction">Select a team to join the race. Players compete together to achieve the highest team score!</p>

        {teams.length === 0 ? (
          <div className="empty-state">
            <p>No teams available yet. Please wait for the admin to create teams.</p>
          </div>
        ) : (
          <div className="teams-grid">
            {(() => {
              const minPlayers = teams.length > 1
                ? Math.min(...teams.map(t => t.players.length))
                : 0;
              return teams.map(team => {
                const isFull = team.players.length >= team.maxPlayers;
                const isUserInThisTeam = userTeam && userTeam._id === team._id;
                const isTooUnbalanced = teams.length > 1 && !isUserInThisTeam && team.players.length >= minPlayers + 2;
                const cannotJoin = isFull || race.status === 'finished' || (userTeam && !isUserInThisTeam) || isTooUnbalanced;

                return (
                  <div key={team._id} className={`team-card ${isFull ? 'team-full' : ''} ${isTooUnbalanced && !isUserInThisTeam ? 'team-unbalanced' : ''}`}>
                    <div className="team-header">
                      <h3>{team.teamName}</h3>
                      <div className="player-count-badge">
                        <span className="count">{team.players.length}</span>
                        <span className="separator">/</span>
                        <span className="max">{team.maxPlayers}</span>
                      </div>
                    </div>

                    {isTooUnbalanced && !isUserInThisTeam && (
                      <div style={{ padding: '6px 10px', background: '#fff3cd', color: '#856404', borderRadius: '6px', fontSize: '12px', margin: '0 0 8px 0', textAlign: 'center' }}>
                        ⚖️ Team too large — please join a smaller team
                      </div>
                    )}

                    <div className="team-members">
                      {team.players.length === 0 ? (
                        <div className="no-members">Be the first to join!</div>
                      ) : (
                        <div className="members-list">
                          {team.players
                            .sort((a, b) => a.position - b.position)
                            .slice(0, 5)
                            .map(player => (
                              <div key={player.userId._id} className="member-item">
                                <span className="member-position">#{player.position}</span>
                                <span className="member-name">
                                  <PlayerName displayName={player.userId.displayName} username={player.userId.username} userId={player.userId._id} />
                                </span>
                              </div>
                            ))
                          }
                          {team.players.length > 5 && (
                            <div className="member-more">
                              +{team.players.length - 5} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleJoinTeam(team._id)}
                      className="btn-join-team"
                      disabled={cannotJoin || joining}
                    >
                      {isUserInThisTeam ? '✅ You are in this team'
                        : isFull ? '✓ Team Full'
                        : isTooUnbalanced ? '⚖️ Join a smaller team'
                        : joining ? 'Joining...'
                        : '➕ Join Team'}
                    </button>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

export default TeamSelection;
