import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api';

export default function ArenaTournamentJoin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const codeFromUrl = searchParams.get('code') || '';
  
  const [joinCode, setJoinCode] = useState(codeFromUrl);
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    return () => {
    };
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    
    setError('');
    setLoading(true);
    setTournament(null);

    try {
      const response = await api.get(`/api/arenatournament/by-code/${joinCode.trim().toUpperCase()}`);
      setTournament(response.data.tournament);
    } catch (err) {
      setError(err.response?.data?.error || 'Tournament not found');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    
    setError('');
    setJoining(true);

    try {
      const response = await api.post('/api/arenatournament/join', {
        tournamentId: tournament._id
      });

      if (response.data.success) {
        navigate(`/arenatournament/lobby/${tournament._id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join tournament');
    } finally {
      setJoining(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
      fontFamily: 'Inter, Arial, sans-serif'
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        background: '#fff',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '800',
          color: '#1a1a1a',
          marginBottom: '10px',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Join Arena Tournament
        </h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>
          Enter the tournament code to join
        </p>

        {error && (
          <div style={{
            background: '#fee',
            color: '#c33',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSearch} style={{ marginBottom: '30px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
              Tournament Code
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              required
              placeholder="XXXXXXXX"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '18px',
                fontFamily: 'monospace',
                textAlign: 'center',
                letterSpacing: '2px',
                textTransform: 'uppercase'
              }}
              maxLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !joinCode.trim()}
            style={{
              width: '100%',
              padding: '14px',
              background: loading || !joinCode.trim() ? '#ccc' : 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading || !joinCode.trim() ? 'not-allowed' : 'pointer',
              marginBottom: '20px'
            }}
          >
            {loading ? 'Searching...' : 'Find Tournament'}
          </button>
        </form>

        {tournament && (
          <div style={{
            background: '#f8f9fa',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '20px'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#333', marginBottom: '16px' }}>
              {tournament.name}
            </h2>
            
            <div style={{ marginBottom: '12px' }}>
              <strong style={{ color: '#555' }}>Created by:</strong>{' '}
              <span style={{ color: '#333' }}>{tournament.creatorDisplayName || tournament.creatorUsername}</span>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <strong style={{ color: '#555' }}>Time Control:</strong>{' '}
              <span style={{ color: '#333' }}>
                {tournament.timeControl.minutes}+{tournament.timeControl.increment || 0}
              </span>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <strong style={{ color: '#555' }}>Duration:</strong>{' '}
              <span style={{ color: '#333' }}>
                {tournament.tournamentDuration.hours > 0 && `${tournament.tournamentDuration.hours}h `}
                {tournament.tournamentDuration.minutes}min
              </span>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <strong style={{ color: '#555' }}>Starts:</strong>{' '}
              <span style={{ color: '#333' }}>{formatDate(tournament.scheduledStartTime)}</span>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <strong style={{ color: '#555' }}>Status:</strong>{' '}
              <span style={{
                color: tournament.status === 'scheduled' ? '#0a0' : 
                       tournament.status === 'active' ? '#00a' : '#666',
                fontWeight: '600'
              }}>
                {tournament.status.toUpperCase()}
              </span>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <strong style={{ color: '#555' }}>Participants:</strong>{' '}
              <span style={{ color: '#333' }}>{tournament.participantCount}</span>
            </div>

            {tournament.description && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #ddd' }}>
                <strong style={{ color: '#555', display: 'block', marginBottom: '8px' }}>Description:</strong>
                <p style={{ color: '#333', lineHeight: '1.6', margin: 0 }}>
                  {tournament.description}
                </p>
              </div>
            )}

            {tournament.status !== 'finished' && (
              <button
                onClick={handleJoin}
                disabled={joining}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: joining ? '#ccc' : 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: joining ? 'not-allowed' : 'pointer',
                  marginTop: '20px'
                }}
              >
                {joining ? 'Joining...' : 'Join Tournament'}
              </button>
            )}
          </div>
        )}

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
            cursor: 'pointer'
          }}
        >
          ← Back to Tournaments
        </button>
      </div>
    </div>
  );
}
