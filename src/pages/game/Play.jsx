import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { motion } from 'framer-motion';
import './Play.css';

const timeControlGroups = [
  {
    id: 'bullet',
    name: '⚡ BULLET',
    description: 'Less than 3 minutes',
    color: '#FF6B6B',
    gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF9E7D 100%)',
    timeControls: [
      { label: '1+0', value: '1+0' },
      { label: '1+1', value: '1+1' },
      { label: '2+0', value: '2+0' }
    ]
  },
  {
    id: 'blitz',
    name: '🔥 BLITZ',
    description: '3 to 5 minutes',
    color: '#FFD166',
    gradient: 'linear-gradient(135deg, #FFD166 0%, #FFE99C 100%)',
    timeControls: [
      { label: '3+0', value: '3+0' },
      { label: '3+2', value: '3+2' },
      { label: '5+0', value: '5+0' }
    ]
  },
  {
    id: 'rapid',
    name: '🏃 RAPID',
    description: '10 to 15 minutes',
    color: '#06D6A0',
    gradient: 'linear-gradient(135deg, #06D6A0 0%, #4ECDC4 100%)',
    timeControls: [
      { label: '10+0', value: '10+0' },
      { label: '10+5', value: '10+5' },
      { label: '15+10', value: '15+10' }
    ]
  },
  {
    id: 'classical',
    name: '👑 CLASSICAL',
    description: 'Over 30 minutes',
    color: '#118AB2',
    gradient: 'linear-gradient(135deg, #118AB2 0%, #06B6D4 100%)',
    timeControls: [
      { label: '20+0', value: '20+0' },
      { label: '20+5', value: '20+5' },
      { label: '30+0', value: '30+0' }
    ]
  }
];

const playerStats = {
  rapid: { wins: 12, losses: 8, draws: 3 },
  blitz: { wins: 25, losses: 15, draws: 5 },
  bullet: { wins: 42, losses: 38, draws: 10 }
};

export default function Play() {
  const [waiting, setWaiting] = useState(false);
  const [selectedTimeControl, setSelectedTimeControl] = useState(null);
  const [socket, setSocket] = useState(null);
  const [searchTime, setSearchTime] = useState(0);
  const [foundPlayers, setFoundPlayers] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize socket connection
    const token = localStorage.getItem('authToken');
    const newSocket = io(window.location.origin.replace('5173', '5000'), {
      auth: { token }
    });

    newSocket.on('game_start', (gameData) => {
      navigate(`/game/live/${gameData.gameId}`);
    });

    newSocket.on('matchmaking_update', (data) => {
      setFoundPlayers(data.playersInQueue || Math.floor(Math.random() * 5));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [navigate]);

  useEffect(() => {
    let interval;
    if (waiting) {
      interval = setInterval(() => {
        setSearchTime(prev => prev + 1);
        // Simulate finding players
        setFoundPlayers(prev => Math.min(prev + Math.floor(Math.random() * 2), 10));
      }, 1000);
    } else {
      setSearchTime(0);
      setFoundPlayers(0);
    }
    return () => clearInterval(interval);
  }, [waiting]);

  const handleTimeControlClick = (timeControl) => {
    if (waiting) return;
    
    setSelectedTimeControl(timeControl);
    setWaiting(true);
    
    if (socket) {
      socket.emit('find_game', { 
        timeControl: timeControl,
        gameMode: 'rated'
      });
    }
    
    // Add visual feedback
    const button = document.querySelector(`[data-time-control="${timeControl}"]`);
    if (button) {
      button.classList.add('clicked');
      setTimeout(() => button.classList.remove('clicked'), 300);
    }
  };

  const cancelSearch = () => {
    if (socket && selectedTimeControl) {
      socket.emit('cancel_search', { timeControl: selectedTimeControl });
    }
    setWaiting(false);
    setSelectedTimeControl(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentGameType = () => {
    if (!selectedTimeControl) return null;
    for (const group of timeControlGroups) {
      const found = group.timeControls.find(tc => tc.value === selectedTimeControl);
      if (found) return group;
    }
    return null;
  };

  return (
    <div className="play-container">
      {/* Background Effects */}
      <div className="background-effects">
        <div className="gradient-overlay"></div>
        <div className="floating-chess-pieces">
          {['♔', '♕', '♖', '♗', '♘', '♙'].map((piece, i) => (
            <div 
              key={i}
              className="floating-piece"
              style={{
                animationDelay: `${i * 0.5}s`,
                left: `${Math.random() * 90 + 5}%`,
                top: `${Math.random() * 90 + 5}%`
              }}
            >
              {piece}
            </div>
          ))}
        </div>
      </div>

      <div className="play-content">
        {/* Header */}
        <motion.div 
          className="main-header"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="header-content">
            <div className="chess-icons">
              <span className="chess-piece">♔</span>
              <h1 className="main-title">Chess Games Arena</h1>
              <span className="chess-piece">♕</span>
            </div>
            
            {/* Game Mode Selector - REMOVED */}
            {/* <div className="game-mode-selector">
              {gameModes.map((mode) => (
                <button
                  key={mode.id}
                  className={`game-mode-btn ${selectedGameMode === mode.id ? 'active' : ''}`}
                  data-mode={mode.id}
                  onClick={() => handleGameModeSelect(mode.id)}
                  style={{ '--mode-color': mode.color }}
                >
                  <span className="mode-icon">{mode.icon}</span>
                  <span className="mode-name">{mode.name}</span>
                  <span className="mode-description">{mode.description}</span>
                </button>
              ))}
            </div> */}

            {/* Live Stats - REMOVED */}
            {/* <div className="live-stats">
              <div className="stat-badge">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <div className="stat-value">{onlinePlayers}</div>
                  <div className="stat-label">Online Players</div>
                </div>
                <div className="pulse-dot"></div>
              </div>
              <div className="stat-badge">
                <div className="stat-icon">⚡</div>
                <div className="stat-content">
                  <div className="stat-value">{liveGames}</div>
                  <div className="stat-label">Live Games</div>
                </div>
                <div className="pulse-dot"></div>
              </div>
              <div className="stat-badge">
                <div className="stat-icon">⏱️</div>
                <div className="stat-content">
                  <div className="stat-value">{waiting ? formatTime(searchTime) : '--:--'}</div>
                  <div className="stat-label">Search Time</div>
                </div>
                <div className="pulse-dot"></div>
              </div>
            </div> */}
          </div>
        </motion.div>

        {/* Time Controls Grid */}
        <div className="time-controls-section">
          
          <div className="time-controls-grid">
            {timeControlGroups.map((group, groupIndex) => (
              <motion.div
                key={group.id}
                className="time-control-group"
                style={{ '--group-color': group.color }}
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: groupIndex * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className="group-header">
                  <div className="group-icon">{group.id === 'bullet' ? '⚡' : 
                                              group.id === 'blitz' ? '🔥' : 
                                              group.id === 'rapid' ? '🏃' : 
                                              group.id === 'classical' ? '👑' : '📧'}</div>
                  <div>
                    <h3 className="group-name">{group.name}</h3>
                    <p className="group-description">{group.description}</p>
                  </div>
                </div>
                
                <div className="time-buttons-grid">
                  {group.timeControls.map((tc, index) => (
                    <motion.button
                      key={tc.value}
                      className={`time-button ${waiting ? 'disabled' : ''}`}
                      data-time-control={tc.value}
                      onClick={() => handleTimeControlClick(tc.value)}
                      disabled={waiting}
                      whileHover={!waiting ? { scale: 1.05, y: -2 } : {}}
                      whileTap={!waiting ? { scale: 0.95 } : {}}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                    >
                      {tc.label}
                      <div className="button-glow"></div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Statistics Section */}
        <motion.div 
          className="statistics-section"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h2 className="section-title">
            <span className="section-icon">📈</span>
            Your Statistics
          </h2>
          
          <div className="stats-grid">
            {Object.entries(playerStats).map(([gameType, stats], index) => (
              <motion.div
                key={gameType}
                className="stat-card"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <h3 className="stat-title">{gameType.toUpperCase()}</h3>
                <div className="stat-numbers">
                  <div className="stat-row">
                    <span className="stat-label">Wins:</span>
                    <span className="stat-value win">{stats.wins}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Losses:</span>
                    <span className="stat-value loss">{stats.losses}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Draws:</span>
                    <span className="stat-value draw">{stats.draws}</span>
                  </div>
                </div>
                <div className="stat-total">
                  Total: {stats.wins + stats.losses + stats.draws} games
                </div>
                <div className="stat-progress">
                  <div 
                    className="progress-bar win-bar"
                    style={{ width: `${(stats.wins / (stats.wins + stats.losses + stats.draws)) * 100}%` }}
                  ></div>
                  <div 
                    className="progress-bar loss-bar"
                    style={{ width: `${(stats.losses / (stats.wins + stats.losses + stats.draws)) * 100}%` }}
                  ></div>
                  <div 
                    className="progress-bar draw-bar"
                    style={{ width: `${(stats.draws / (stats.wins + stats.losses + stats.draws)) * 100}%` }}
                  ></div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Matchmaking Overlay */}
        {waiting && (
          <motion.div 
            className="matchmaking-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            onClick={cancelSearch}
          >
            <motion.div 
              className="matchmaking-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, type: "spring" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-content">
                <h2 className="modal-title">Finding Opponent...</h2>
                
                <div className="selected-control-display">
                  <div className="control-icon">
                    {getCurrentGameType()?.id === 'bullet' ? '⚡' : 
                     getCurrentGameType()?.id === 'blitz' ? '🔥' : 
                     getCurrentGameType()?.id === 'rapid' ? '🏃' : 
                     getCurrentGameType()?.id === 'classical' ? '👑' : '📧'}
                  </div>
                  <div className="control-info">
                    <div className="control-type">{getCurrentGameType()?.name}</div>
                    <div className="control-time">{selectedTimeControl}</div>
                  </div>
                </div>

                <div className="matchmaking-stats">
                  <div className="match-stat">
                    <div className="stat-icon">⏱️</div>
                    <div className="stat-content">
                      <div className="stat-value">{formatTime(searchTime)}</div>
                      <div className="stat-label">Search Time</div>
                    </div>
                  </div>
                  <div className="match-stat">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                      <div className="stat-value">{foundPlayers}</div>
                      <div className="stat-label">In Queue</div>
                    </div>
                  </div>
                </div>

                {/* Chessboard Animation */}
                <div className="chessboard-animation">
                  <div className="chessboard-loader">
                    {Array(64).fill(0).map((_, i) => (
                      <div key={i} className="loader-square"></div>
                    ))}
                  </div>
                  <div className="searching-text">Searching for opponent...</div>
                </div>

                {/* Opponent Animation */}
                <div className="opponent-animation">
                  <div className="player-you">
                    <div className="player-avatar">
                      <div className="avatar-pulse"></div>
                      <div className="avatar-icon">♔</div>
                    </div>
                    <div className="player-label">You</div>
                  </div>
                  
                  <div className="vs-container">
                    <div className="vs-text">VS</div>
                    <div className="searching-pieces">
                      {['♔', '♕', '♖', '♗', '♘'].map((piece, i) => (
                        <div 
                          key={i}
                          className="searching-piece"
                          style={{ animationDelay: `${i * 0.2}s` }}
                        >
                          {piece}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="player-opponent">
                    <div className="player-avatar opponent">
                      <div className="avatar-pulse"></div>
                      <div className="avatar-icon">♚</div>
                    </div>
                    <div className="player-label">Finding...</div>
                  </div>
                </div>

                <motion.button 
                  className="cancel-search-btn"
                  onClick={cancelSearch}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Cancel Search
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}