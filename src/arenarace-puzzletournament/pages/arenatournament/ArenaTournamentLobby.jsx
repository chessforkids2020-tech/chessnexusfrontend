import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../../socket-jwt';
import api from '../../api';
import TournamentChat from '../../components/TournamentChat';
import { AuthContext } from '../../contexts/AuthContext';
import '../../../pages/arenatournament/ArenaTournamentLobby.css';

export default function ArenaTournamentLobby() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const user = auth?.user || null;
  
  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [myParticipant, setMyParticipant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeUntilStart, setTimeUntilStart] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const [starting, setStarting] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  useEffect(() => {
    
    if (!socket.connected) {
      socket.connect();
    } else {
    }

    loadTournamentData();

    socket.emit('joinArenaTournamentLobby', { tournamentId });

    socket.on('tournamentLobbyJoined', (data) => {
      
      setTournament(data.tournament);
      setParticipants(data.participants);
      setMyParticipant(data.myParticipant);
      setOnlineUserIds(data.onlineUserIds || []);
      
      const userId = user?.id || user?._id;
      const isCreatorUser = data.tournament.creatorId === userId;
      setIsCreator(isCreatorUser);
      
      setLoading(false);
    });

    socket.on('participantJoined', (data) => {
      loadTournamentData();
    });

    socket.on('tournamentStarted', (data) => {
      navigate(`/arenatournament/live/${tournamentId}`);
    });

    socket.on('tournamentError', (data) => {
      setError(data.message);
      setLoading(false);
    });

    socket.on('tournamentOnlineStatus', (data) => {
      setOnlineUserIds(data.onlineUserIds || []);
    });

    const interval = setInterval(() => {
      if (tournament?.scheduledStartTime) {
        const now = Date.now();
        const start = new Date(tournament.scheduledStartTime).getTime();
        const diff = start - now;

        if (diff <= 0) {
          setTimeUntilStart('Starting soon...');
          // Auto-start if time has passed and tournament is still scheduled
          if (tournament.status === 'scheduled' && isCreator && !starting) {
            handleStartTournament();
          }
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeUntilStart(`${hours}h ${minutes}m ${seconds}s`);
        }
      }
    }, 1000);

    // Periodic check for tournament status changes (every 30 seconds)
    const statusCheckInterval = setInterval(() => {
      loadTournamentData();
    }, 30000);

    return () => {
      socket.emit('leaveArenaTournamentLobby', { tournamentId });
      socket.off('tournamentLobbyJoined');
      socket.off('participantJoined');
      socket.off('tournamentStarted');
      socket.off('tournamentError');
      socket.off('tournamentOnlineStatus');
      clearInterval(interval);
      clearInterval(statusCheckInterval);
    };
  }, [tournamentId, tournament?.scheduledStartTime]);

  const loadTournamentData = async () => {
    try {
      const response = await api.get(`/api/arenatournament/details/${tournamentId}`);
      
      setTournament(response.data.tournament);
      setParticipants(response.data.participants);
      
      const userId = user?.id || user?._id;
      const myP = response.data.participants.find(p => String(p.userId) === String(userId));
      setMyParticipant(myP);
      setIsCreator(response.data.tournament.creatorId === userId);

      // Auto-start tournament if scheduled time has passed and it's still scheduled
      const tournament = response.data.tournament;
      if (tournament.status === 'scheduled' && new Date(tournament.scheduledStartTime) < new Date()) {
        if (tournament.creatorId === userId) {
          // Only the creator can start it
          handleStartTournament();
        }
      }

      // If tournament is already active and user is joined, don't auto-redirect
      // They can choose to go to live page via button
      // Only auto-redirect if tournament just started while they were here
      
      // If tournament is finished, redirect to leaderboard
      if (tournament.status === 'finished') {
        navigate(`/arenatournament/leaderboard/${tournamentId}`);
        return;
      }

      // If tournament end time has passed, consider it finished and redirect to leaderboard
      if (tournament.endTime && new Date(tournament.endTime) < new Date()) {
        navigate(`/arenatournament/leaderboard/${tournamentId}`);
        return;
      }
    } catch (err) {
      setError('Failed to load tournament');
    }
  };

  const handleStartTournament = () => {
    setStarting(true);
    socket.emit('startArenaTournament', { tournamentId });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, Arial, sans-serif'
      }}>
        <div style={{ color: 'white', fontSize: '24px', fontWeight: '600' }}>
          Loading tournament...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, Arial, sans-serif'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '40px',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#c33', marginBottom: '20px' }}>Error</h2>
          <p style={{ color: '#666', marginBottom: '30px' }}>{error}</p>
          <button
            onClick={() => navigate('/arenatournament')}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Back to Tournaments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="at-lobby-page">
      <div className="at-lobby-bg" />
      <div className="at-lobby-inner">
        <div className="at-lobby-header">
          <h1 className="at-lobby-title">
            {tournament?.name}
          </h1>
          
          <div style={{
            background: '#f8f9fa',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <strong style={{ color: '#555', display: 'block', fontSize: '14px' }}>Time Control</strong>
                <span style={{ color: '#333', fontSize: '18px', fontWeight: '600' }}>
                  {tournament?.timeControl.minutes}+{tournament?.timeControl.increment || 0}
                </span>
              </div>
              <div>
                <strong style={{ color: '#555', display: 'block', fontSize: '14px' }}>Duration</strong>
                <span style={{ color: '#333', fontSize: '18px', fontWeight: '600' }}>
                  {tournament?.tournamentDuration.hours > 0 && `${tournament?.tournamentDuration.hours}h `}
                  {tournament?.tournamentDuration.minutes}min
                </span>
              </div>
              <div>
                <strong style={{ color: '#555', display: 'block', fontSize: '14px' }}>Participants</strong>
                <span style={{ color: '#333', fontSize: '18px', fontWeight: '600' }}>
                  {participants.length}
                </span>
              </div>
              <div>
                <strong style={{ color: '#555', display: 'block', fontSize: '14px' }}>Join Code</strong>
                <span style={{ color: '#667eea', fontSize: '18px', fontWeight: '700', fontFamily: 'monospace' }}>
                  {tournament?.joinCode}
                </span>
              </div>
            </div>
          </div>

          {tournament?.status === 'scheduled' && (
            <div style={{
              background: '#fff3cd',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <strong style={{ color: '#856404', display: 'block', fontSize: '14px', marginBottom: '8px' }}>
                Tournament starts in
              </strong>
              <div style={{ color: '#856404', fontSize: '24px', fontWeight: '700' }}>
                {timeUntilStart}
              </div>
              <div style={{ color: '#856404', fontSize: '14px', marginTop: '8px' }}>
                {formatDate(tournament?.scheduledStartTime)}
              </div>
            </div>
          )}

          {isCreator && !tournament?.isAutoScheduled && (tournament?.status === 'scheduled' || tournament?.status === 'lobby' || (tournament?.status === 'active' && !tournament?.actualStartTime)) && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                padding: '12px',
                background: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '8px',
                marginBottom: '12px',
                textAlign: 'center'
              }}>
                <strong style={{ color: '#856404' }}>
                  {tournament?.status === 'lobby' 
                    ? 'Tournament is ready to start! Click to begin the tournament.' 
                    : tournament?.status === 'active' 
                      ? 'Tournament is active but hasn\'t started yet. Click to start now.' 
                      : new Date(tournament?.scheduledStartTime) < new Date() 
                        ? 'The tournament should have started automatically. If it hasn\'t, you can start it manually.' 
                        : 'The tournament will start automatically at the scheduled time, or you can start it early.'}
                </strong>
              </div>
              <button
                onClick={handleStartTournament}
                disabled={starting}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: starting ? '#ccc' : 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '18px',
                  fontWeight: '700',
                  cursor: starting ? 'not-allowed' : 'pointer'
                }}
              >
                {starting ? 'Starting...' : 'Start Tournament Now'}
              </button>
            </div>
          )}

          {tournament?.status === 'active' && myParticipant && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                padding: '12px',
                background: '#d4edda',
                border: '1px solid #c3e6cb',
                borderRadius: '8px',
                marginBottom: '12px',
                textAlign: 'center'
              }}>
                <strong style={{ color: '#155724' }}>
                  🏆 Tournament is live! Click below to join the action.
                </strong>
              </div>
              <button
                onClick={() => navigate(`/arenatournament/live/${tournamentId}`)}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #28a745, #20c997)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '18px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                🎯 Go to Live Tournament
              </button>
            </div>
          )}

          {tournament?.description && (
            <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '20px' }}>
              <strong style={{ color: '#555', display: 'block', marginBottom: '8px' }}>Description</strong>
              <p style={{ color: '#333', lineHeight: '1.6', margin: 0 }}>
                {tournament.description}
              </p>
            </div>
          )}
        </div>

        <div className="at-lobby-grid">
          <div className="at-lobby-participants">
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#333', marginBottom: '24px' }}>
              Participants ({participants.length})
            </h2>
          
          {participants.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '40px 0' }}>
              No participants yet
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {participants.map((p, index) => (
                <div
                  key={p._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    background: p.userId === myParticipant?.userId ? '#e8f5e9' : '#f8f9fa',
                    borderRadius: '8px',
                    border: p.userId === myParticipant?.userId ? '2px solid #4caf50' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '700'
                    }}>
                      {index + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {onlineUserIds.includes(p.userId) && (
                          <span style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: '#4caf50',
                            display: 'inline-block',
                            boxShadow: '0 0 4px #4caf50'
                          }} title="Online" />
                        )}
                        {p.displayName || p.username}
                        {p.userId === myParticipant?.userId && (
                          <span style={{ color: '#4caf50', marginLeft: '8px', fontSize: '14px' }}>
                            (You)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>

          {participants.length > 0 && (
            <div className="at-lobby-chat">
              <TournamentChat tournamentId={tournamentId} />
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/arenatournament')}
          style={{
            width: '100%',
            padding: '14px',
            background: '#f0f0f0',
            color: '#333',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          ← Leave Lobby
        </button>
      </div>
    </div>
  );
}
