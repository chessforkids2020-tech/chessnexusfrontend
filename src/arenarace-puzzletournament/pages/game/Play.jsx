import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const timeControls = [
  {
    category: 'Bullet',
    icon: '⚡',
    options: ['1+0', '1+2', '2+0']
  },
  {
    category: 'Blitz',
    icon: '🔥',
    options: ['3+0', '3+2', '5+0']
  },
  {
    category: 'Rapid',
    icon: '🐇',
    options: ['10+0', '10+5', '15+10']
  },
  {
    category: 'Classical',
    icon: '🐢',
    options: ['20+0', '20+5', '30+0']
  }
];

export default function Play() {
  const [waiting, setWaiting] = useState(false);
  const [selectedControl, setSelectedControl] = useState(null);
  const [socket, setSocket] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const newSocket = io(window.location.origin.replace('5173', '5000'), {
      auth: { token }
    });

    newSocket.on('game_start', (gameData) => {
      navigate(`/game/live/${gameData.gameId}`);
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, [navigate]);

  const handleSelect = (control) => {
    setSelectedControl(control);
    setWaiting(true);
    if (socket) {
      socket.emit('find_game', { timeControl: control });
    }
  };

  const cancelSearch = () => {
    if (socket && selectedControl) {
      socket.emit('cancel_search', { timeControl: selectedControl });
    }
    setWaiting(false);
    setSelectedControl(null);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>🎯 New Game</h1>
      
      {waiting ? (
        <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#f0f0f0', borderRadius: '15px' }}>
          <h2>Searching for opponent...</h2>
          <p>Time Control: <strong>{selectedControl}</strong></p>
          <div className="loader" style={{ margin: '20px auto', width: '50px', height: '50px', border: '5px solid #ccc', borderTop: '5px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <button 
            onClick={cancelSearch}
            style={{ padding: '10px 20px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <style>{`
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}</style>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          {timeControls.map((group) => (
            <div key={group.category} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: '1px solid #eee' }}>
              <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>{group.icon}</span> {group.category}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                {group.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleSelect(option)}
                    style={{
                      padding: '12px',
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#e9ecef'; e.currentTarget.style.borderColor = '#adb5bd'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f8f9fa'; e.currentTarget.style.borderColor = '#ddd'; }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
