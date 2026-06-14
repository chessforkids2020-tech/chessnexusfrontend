import React, { useState, useEffect, useRef } from 'react';

function LuxuryGoldResults() {
  const canvasRef = useRef(null);
  const [showConfetti, setShowConfetti] = useState(true);
  
  const teams = [
    { _id: '1', teamName: 'Golden Eagles', totalScore: 950, players: ['p1', 'p2', 'p3'], completionTime: new Date().toISOString() },
    { _id: '2', teamName: 'Royal Knights', totalScore: 880, players: ['p4', 'p5'], completionTime: new Date().toISOString() },
    { _id: '3', teamName: 'Diamond Squad', totalScore: 750, players: ['p6', 'p7', 'p8'], completionTime: new Date().toISOString() }
  ];

  const results = [
    { _id: 'r1', teamId: { _id: '1' }, userId: { displayName: 'Alex', username: 'alex' }, totalScore: 350, position: 1, correctPuzzles: 17, puzzles: Array(50).fill(null) },
    { _id: 'r2', teamId: { _id: '1' }, userId: { displayName: 'Sam', username: 'sam' }, totalScore: 320, position: 2, correctPuzzles: 16, puzzles: Array(50).fill(null) },
    { _id: 'r3', teamId: { _id: '1' }, userId: { displayName: 'Jordan', username: 'jordan' }, totalScore: 280, position: 3, correctPuzzles: 14, puzzles: Array(50).fill(null) },
    { _id: 'r4', teamId: { _id: '2' }, userId: { displayName: 'Taylor', username: 'taylor' }, totalScore: 450, position: 1, correctPuzzles: 22, puzzles: Array(50).fill(null) },
    { _id: 'r5', teamId: { _id: '2' }, userId: { displayName: 'Morgan', username: 'morgan' }, totalScore: 430, position: 2, correctPuzzles: 21, puzzles: Array(50).fill(null) },
    { _id: 'r6', teamId: { _id: '3' }, userId: { displayName: 'Casey', username: 'casey' }, totalScore: 280, position: 1, correctPuzzles: 14, puzzles: Array(50).fill(null) },
    { _id: 'r7', teamId: { _id: '3' }, userId: { displayName: 'Riley', username: 'riley' }, totalScore: 250, position: 2, correctPuzzles: 12, puzzles: Array(50).fill(null) },
    { _id: 'r8', teamId: { _id: '3' }, userId: { displayName: 'Drew', username: 'drew' }, totalScore: 220, position: 3, correctPuzzles: 11, puzzles: Array(50).fill(null) }
  ];

  const race = { raceName: 'Grand Prix Finals 2024' };

  const getTeamPlayers = (teamId) => {
    return results.filter(r => String(r.teamId?._id || r.teamId) === String(teamId));
  };

  useEffect(() => {
    if (!showConfetti || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const confettiPieces = [];
    const confettiCount = 150;
    const colors = ['#FFD700', '#FFA500', '#FF6347', '#FFFF00', '#FFB6C1', '#87CEEB'];

    class ConfettiPiece {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height - canvas.height;
        this.size = Math.random() * 8 + 4;
        this.speedY = Math.random() * 3 + 2;
        this.speedX = Math.random() * 2 - 1;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 10 - 5;
      }

      update() {
        this.y += this.speedY;
        this.x += this.speedX;
        this.rotation += this.rotationSpeed;
        if (this.y > canvas.height) {
          this.y = -10;
          this.x = Math.random() * canvas.width;
        }
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();
      }
    }

    for (let i = 0; i < confettiCount; i++) {
      confettiPieces.push(new ConfettiPiece());
    }

    let animationId;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      confettiPieces.forEach(piece => {
        piece.update();
        piece.draw();
      });
      animationId = requestAnimationFrame(animate);
    };

    animate();

    const timeout = setTimeout(() => {
      setShowConfetti(false);
      cancelAnimationFrame(animationId);
    }, 20000);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      clearTimeout(timeout);
      window.removeEventListener('resize', handleResize);
    };
  }, [showConfetti]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      padding: '60px 20px',
      fontFamily: '"Playfair Display", serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {showConfetti && (
        <canvas ref={canvasRef} style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          pointerEvents: 'none', zIndex: 9999
        }} />
      )}

      {/* Elegant pattern overlay */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255, 215, 0, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 215, 0, 0.1) 0%, transparent 50%)',
        opacity: 0.3
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', margin: '0 auto' }}>
        {/* Luxury Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '80px',
          animation: 'fadeInDown 1s ease-out'
        }}>
          <div style={{
            width: '120px',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
            margin: '0 auto 30px'
          }} />
          
          <div style={{
            fontSize: '72px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '20px',
            letterSpacing: '3px',
            textShadow: '0 0 40px rgba(255, 215, 0, 0.3)'
          }}>
            HALL OF FAME
          </div>

          <div style={{
            fontSize: '24px',
            color: '#C0C0C0',
            letterSpacing: '4px',
            textTransform: 'uppercase',
            fontFamily: 'sans-serif',
            fontWeight: '300'
          }}>
            {race.raceName}
          </div>

          <div style={{
            width: '120px',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
            margin: '30px auto 0'
          }} />
        </div>

        {/* Trophy Podium */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          gap: '40px',
          marginBottom: '100px',
          flexWrap: 'wrap'
        }}>
          {[teams[1], teams[0], teams[2]].map((team, idx) => {
            const actualRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
            const heights = { 1: '350px', 2: '280px', 3: '220px' };
            const colors = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };
            const crowns = { 1: '👑', 2: '🥈', 3: '🥉' };
            
            return (
              <div key={team._id} style={{
                width: '280px',
                animation: `riseUp 1s ease-out ${idx * 0.2}s both`
              }}>
                {actualRank === 1 && (
                  <div style={{
                    fontSize: '60px',
                    textAlign: 'center',
                    marginBottom: '20px',
                    animation: 'float 3s ease-in-out infinite',
                    filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))'
                  }}>
                    👑
                  </div>
                )}
                
                <div style={{
                  height: heights[actualRank],
                  background: `linear-gradient(180deg, ${colors[actualRank]}22 0%, ${colors[actualRank]}11 100%)`,
                  border: `3px solid ${colors[actualRank]}`,
                  borderRadius: '25px 25px 0 0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '30px 25px',
                  position: 'relative',
                  boxShadow: `0 0 50px ${colors[actualRank]}44, inset 0 -50px 50px ${colors[actualRank]}11`,
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = `0 0 70px ${colors[actualRank]}66, inset 0 -50px 50px ${colors[actualRank]}22`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = `0 0 50px ${colors[actualRank]}44, inset 0 -50px 50px ${colors[actualRank]}11`;
                }}>
                  {/* Ornamental top border */}
                  <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '80%',
                    height: '3px',
                    background: `linear-gradient(90deg, transparent, ${colors[actualRank]}, transparent)`
                  }} />

                  <div>
                    <div style={{
                      fontSize: '48px',
                      textAlign: 'center',
                      marginBottom: '15px'
                    }}>
                      {crowns[actualRank]}
                    </div>
                    
                    <div style={{
                      fontSize: actualRank === 1 ? '26px' : '22px',
                      fontWeight: 'bold',
                      color: colors[actualRank],
                      textAlign: 'center',
                      marginBottom: '10px',
                      textShadow: `0 0 20px ${colors[actualRank]}66`
                    }}>
                      {team.teamName}
                    </div>

                    <div style={{
                      textAlign: 'center',
                      color: '#888',
                      fontSize: '13px',
                      textTransform: 'uppercase',
                      letterSpacing: '2px',
                      fontFamily: 'sans-serif'
                    }}>
                      Rank #{actualRank}
                    </div>
                  </div>

                  <div>
                    <div style={{
                      fontSize: actualRank === 1 ? '56px' : '48px',
                      fontWeight: 'bold',
                      color: colors[actualRank],
                      textAlign: 'center',
                      textShadow: `0 0 30px ${colors[actualRank]}99`,
                      marginBottom: '10px'
                    }}>
                      {team.totalScore}
                    </div>
                    <div style={{
                      textAlign: 'center',
                      color: '#666',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '2px',
                      fontFamily: 'sans-serif'
                    }}>
                      Total Points
                    </div>
                  </div>

                  <div style={{
                    textAlign: 'center',
                    padding: '10px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <div style={{
                      fontSize: '13px',
                      color: '#999',
                      fontFamily: 'sans-serif'
                    }}>
                      👥 {team.players.length} Members
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Team Cards */}
        {teams.map((team, index) => {
          const teamPlayers = getTeamPlayers(team._id);
          const borderColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
          const borderColor = borderColors[index] || '#666';
          
          return (
            <div key={team._id} style={{
              background: 'linear-gradient(135deg, rgba(255,215,0,0.05) 0%, rgba(0,0,0,0.3) 100%)',
              border: `2px solid ${borderColor}44`,
              borderRadius: '20px',
              padding: '40px',
              marginBottom: '40px',
              position: 'relative',
              overflow: 'hidden',
              animation: `slideIn 0.8s ease-out ${index * 0.15}s both`,
              boxShadow: `0 10px 40px rgba(0,0,0,0.5), inset 0 0 60px ${borderColor}11`
            }}>
              {/* Decorative corner */}
              <div style={{
                position: 'absolute',
                top: '0',
                right: '0',
                width: '150px',
                height: '150px',
                background: `radial-gradient(circle at top right, ${borderColor}22 0%, transparent 70%)`
              }} />

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '40px',
                position: 'relative',
                flexWrap: 'wrap',
                gap: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    background: `linear-gradient(135deg, ${borderColor} 0%, ${borderColor}88 100%)`,
                    borderRadius: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '36px',
                    fontWeight: 'bold',
                    color: '#000',
                    boxShadow: `0 10px 30px ${borderColor}66`,
                    transform: 'rotate(5deg)'
                  }}>
                    {index + 1}
                  </div>
                  
                  <div>
                    <div style={{
                      fontSize: '36px',
                      fontWeight: 'bold',
                      color: borderColor,
                      marginBottom: '5px',
                      textShadow: `0 0 20px ${borderColor}66`
                    }}>
                      {team.teamName}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#888',
                      textTransform: 'uppercase',
                      letterSpacing: '2px',
                      fontFamily: 'sans-serif'
                    }}>
                      {team.players.length} Elite Members
                    </div>
                  </div>
                </div>

                <div style={{
                  fontSize: '52px',
                  fontWeight: 'bold',
                  color: borderColor,
                  textShadow: `0 0 30px ${borderColor}99`
                }}>
                  {team.totalScore}
                </div>
              </div>

              {/* Player Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px'
              }}>
                {teamPlayers.sort((a, b) => b.totalScore - a.totalScore).map((result, idx) => (
                  <div key={result._id} style={{
                    background: idx === 0 
                      ? `linear-gradient(90deg, ${borderColor}22 0%, rgba(255,255,255,0.05) 100%)`
                      : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${idx === 0 ? borderColor + '44' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '15px',
                    padding: '25px',
                    transition: 'all 0.3s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `linear-gradient(90deg, ${borderColor}33 0%, rgba(255,255,255,0.08) 100%)`;
                    e.currentTarget.style.transform = 'translateX(5px)';
                    e.currentTarget.style.boxShadow = `0 5px 20px ${borderColor}33`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = idx === 0 
                      ? `linear-gradient(90deg, ${borderColor}22 0%, rgba(255,255,255,0.05) 100%)`
                      : 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '15px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{
                          width: '50px',
                          height: '50px',
                          background: idx === 0 ? borderColor : 'rgba(255,255,255,0.1)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          fontWeight: 'bold',
                          color: idx === 0 ? '#000' : '#fff',
                          boxShadow: idx === 0 ? `0 0 20px ${borderColor}66` : 'none'
                        }}>
                          {idx + 1}
                        </div>
                        <div>
                          <div style={{
                            fontSize: '20px',
                            fontWeight: '600',
                            color: '#fff',
                            fontFamily: 'sans-serif'
                          }}>
                            {result.userId.displayName}
                          </div>

                        </div>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        color: borderColor,
                        textShadow: `0 0 15px ${borderColor}66`
                      }}>
                        {result.totalScore}
                      </div>
                      <div style={{
                        background: 'rgba(255,255,255,0.1)',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        fontSize: '14px',
                        color: '#ddd',
                        fontFamily: 'sans-serif',
                        border: '1px solid rgba(255,255,255,0.2)'
                      }}>
                        ✓ {result.correctPuzzles}/{result.puzzles.length}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes riseUp {
          from { opacity: 0; transform: translateY(100px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}

export default LuxuryGoldResults;