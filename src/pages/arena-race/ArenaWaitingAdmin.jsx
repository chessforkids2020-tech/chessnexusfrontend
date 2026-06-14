import React, { useState, useEffect } from 'react';
import PlayerName from '../../components/PlayerName';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';

const API = import.meta.env.VITE_API_URL;

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    fontFamily: 'Inter, Arial, sans-serif',
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    background: '#fff',
    borderRadius: '20px',
    padding: '30px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: '10px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  roomCode: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#667eea',
    letterSpacing: '2px',
    marginBottom: '20px',
  },
  info: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  infoItem: {
    textAlign: 'center',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '12px',
    border: '1px solid #e9ecef',
  },
  infoLabel: {
    fontSize: '12px',
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: '0.5px',
    marginBottom: '5px',
  },
  infoValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1a1a1a',
  },
  playersSection: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  playersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '15px',
  },
  playerCard: {
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '12px',
    border: '1px solid #e9ecef',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  playerAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: '700',
    fontSize: '16px',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '2px',
  },
  playerUsername: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '2px',
  },
  playerCountry: {
    fontSize: '12px',
    color: '#666',
  },
  playerJoined: {
    fontSize: '11px',
    color: '#999',
  },
  status: {
    textAlign: 'center',
    padding: '20px',
    background: '#f8f9fa',
    borderRadius: '12px',
    marginBottom: '20px',
  },
  statusText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '10px',
  },
  statusSubtext: {
    fontSize: '14px',
    color: '#666',
  },
  actions: {
    textAlign: 'center',
    padding: '20px',
    background: '#f8f9fa',
    borderRadius: '12px',
  },
  startButton: {
    background: 'linear-gradient(135deg, #28a745, #20c997)',
    color: '#fff',
    border: 'none',
    padding: '15px 30px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginRight: '10px',
  },
  refreshButton: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    color: '#e74c3c',
  },
  backButton: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    background: '#6c757d',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    textDecoration: 'none',
    fontSize: '14px',
  },
};

export default function ArenaWaitingAdmin() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRoomData();
    // Refresh every 10 seconds
    const interval = setInterval(fetchRoomData, 10000);
    return () => clearInterval(interval);
  }, [roomId]);

  const fetchRoomData = async () => {
    try {
      const response = await api.get(`/api/admin/arena/waiting/${roomId}`);
      setRoomData(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load room data');
      setLoading(false);
    }
  };

  const startRace = async () => {
    try {
      await api.post(`/api/admin/arena/start/${roomId}`, {});
      // Navigate to admin live view
      navigate(`/admin/arena/live/${roomId}`);
    } catch (err) {
      alert('Failed to start race: ' + (err?.response?.data?.error || err.message));
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loading}>Loading waiting room...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.error}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <button onClick={() => navigate('/admin/arena')} style={styles.backButton}>← Back to Arena Admin</button>
      
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.title}>🏁 Race Waiting Room</div>
          <div style={styles.roomCode}>{roomData.roomId}</div>
        </div>

        <div style={styles.info}>
          <div style={styles.infoItem}>
            <div style={styles.infoLabel}>Topic</div>
            <div style={styles.infoValue}>{roomData.topic}</div>
          </div>
          <div style={styles.infoItem}>
            <div style={styles.infoLabel}>Time Limit</div>
            <div style={styles.infoValue}>{roomData.timeLimit} min</div>
          </div>
          <div style={styles.infoItem}>
            <div style={styles.infoLabel}>Players</div>
            <div style={styles.infoValue}>{roomData.players.length}</div>
          </div>
          <div style={styles.infoItem}>
            <div style={styles.infoLabel}>Status</div>
            <div style={styles.infoValue}>{roomData.status}</div>
          </div>
        </div>

        <div style={styles.playersSection}>
          <div style={styles.sectionTitle}>
            👥 Joined Players ({roomData.players.length})
          </div>
          
          {roomData.players.length === 0 ? (
            <div style={styles.status}>
              <div style={styles.statusText}>No players yet</div>
              <div style={styles.statusSubtext}>Waiting for players to join...</div>
            </div>
          ) : (
            <div style={styles.playersGrid}>
              {roomData.players.map((player, index) => (
                <div key={player.username} style={styles.playerCard}>
                  <div style={styles.playerAvatar}>
                    {(player.displayName || player.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div style={styles.playerInfo}>
                    <div style={styles.playerName}><PlayerName displayName={player.displayName} username={player.username} /></div>
                    <div style={styles.playerCountry}>📍 {player.country || 'Unknown'}</div>
                    <div style={styles.playerJoined}>
                      Joined: {new Date(player.joinedAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.actions}>
          {roomData.status === 'waiting' && roomData.players.length >= 2 && (
            <button onClick={startRace} style={styles.startButton}>
              🚀 Start Race Now
            </button>
          )}
          {roomData.status === 'waiting' && roomData.players.length === 0 && (
            <div style={styles.status}>
              <div style={styles.statusText}>Waiting for players</div>
              <div style={styles.statusSubtext}>At least 2 players must join before starting</div>
            </div>
          )}
          {roomData.status === 'waiting' && roomData.players.length === 1 && (
            <div style={styles.status}>
              <div style={{ ...styles.statusText, color: '#e74c3c' }}>⚠️ Only 1 player joined</div>
              <div style={styles.statusSubtext}>Arena Race can't run with one user. Need at least 2 players to start.</div>
            </div>
          )}
          {roomData.status === 'active' && (
            <div style={styles.status}>
              <div style={styles.statusText}>Race in Progress</div>
              <div style={styles.statusSubtext}>The race has already started</div>
            </div>
          )}
          <button onClick={fetchRoomData} style={styles.refreshButton}>
            🔄 Refresh
          </button>
        </div>
      </div>
    </div>
  );
}