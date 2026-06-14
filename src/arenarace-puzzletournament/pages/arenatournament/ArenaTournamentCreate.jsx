import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

export default function ArenaTournamentCreate() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    timeControlMinutes: 5,
    timeControlIncrement: 0,
    tournamentDurationHours: 0,
    tournamentDurationMinutes: 30,
    scheduledStartDate: '',
    scheduledStartTime: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
    };
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (loading) {
      return;
    }
    
    
    setError('');
    setLoading(true);

    try {
      // Always treat input as IST (UTC+5:30), explicitly convert to UTC
      const [sdY, sdM, sdD] = formData.scheduledStartDate.split('-').map(Number);
      const [stH, stMin] = formData.scheduledStartTime.split(':').map(Number);
      const scheduledDateTime = new Date(Date.UTC(sdY, sdM - 1, sdD, stH - 5, stMin - 30));
      
      const payload = {
        name: formData.name,
        timeControlMinutes: parseInt(formData.timeControlMinutes),
        timeControlIncrement: parseInt(formData.timeControlIncrement),
        tournamentDurationHours: parseInt(formData.tournamentDurationHours),
        tournamentDurationMinutes: parseInt(formData.tournamentDurationMinutes),
        scheduledStartTime: scheduledDateTime.toISOString(),
        description: formData.description,
        createdInTimezone: 'Asia/Kolkata'
      };
      
      const response = await api.post('/api/arenatournament/create', payload);

      if (response.data.success) {
        alert(`Tournament created! Join code: ${response.data.tournament.joinCode}`);
        navigate('/arenatournament');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create tournament');
    } finally {
      setLoading(false);
    }
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
          Create Arena Tournament
        </h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>
          Set up your tournament and share the code with participants
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

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
              Tournament Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'inherit'
              }}
              placeholder="My Arena Tournament"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
              Time Control (Minutes) *
            </label>
            <select
              name="timeControlMinutes"
              value={formData.timeControlMinutes}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'inherit'
              }}
            >
              <option value="1">1 min</option>
              <option value="3">3 min</option>
              <option value="5">5 min</option>
              <option value="10">10 min</option>
              <option value="15">15 min</option>
              <option value="20">20 min</option>
              <option value="30">30 min</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
              Increment (seconds/move)
            </label>
            <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#888' }}>
              Seconds added to your clock after each move (0 = no increment)
            </p>
            <input
              type="number"
              name="timeControlIncrement"
              value={formData.timeControlIncrement}
              onChange={handleChange}
              min="0"
              max="30"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
              Tournament Duration
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#666' }}>
                  Hours
                </label>
                <input
                  type="number"
                  name="tournamentDurationHours"
                  value={formData.tournamentDurationHours}
                  onChange={handleChange}
                  min="0"
                  max="12"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#666' }}>
                  Minutes *
                </label>
                <input
                  type="number"
                  name="tournamentDurationMinutes"
                  value={formData.tournamentDurationMinutes}
                  onChange={handleChange}
                  min="10"
                  max="59"
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
              Scheduled Start Date *
            </label>
            <input
              type="date"
              name="scheduledStartDate"
              value={formData.scheduledStartDate}
              onChange={handleChange}
              required
              min={new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0]}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
              Scheduled Start Time *
            </label>
            <input
              type="time"
              name="scheduledStartTime"
              value={formData.scheduledStartTime}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'inherit'
              }}
            />
            <small style={{ color: '#666', fontSize: '14px' }}>
              Your timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </small>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
              placeholder="Describe your tournament..."
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => navigate('/arenatournament')}
              style={{
                flex: 1,
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '14px',
                background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Creating...' : 'Create Tournament'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
