// src/pages/Scoreboard.jsx - SUNSET GRADIENT THEME
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Scoreboard() {
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleRoundClick = (roundNumber) => {
    navigate(`/scoreboard/round/${roundNumber}`);
  };

  const rounds = [1, 2, 3, 4, 5];

  return (
    <div style={{
      background: "linear-gradient(135deg, #db5555ff 0%, #8d5b0bff 50%, #cf6028ff 100%)",
      padding: 20,
      borderRadius: 12,
      marginTop: 20,
      boxShadow: '0 8px 20px rgba(255, 107, 107, 0.3)'
    }}>
      <h3 style={{ marginTop: 0, color: "#4a1504" }}>Scoreboard</h3>
      <p style={{ color: "#6b2e0a", marginBottom: 30 }}>
        {isAdmin
          ? "Select a round to manage player points for that round."
          : "Select a round to view the scoreboard for that round."
        }
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: 30
      }}>
        {rounds.map(roundNum => (
          <div
            key={roundNum}
            onClick={() => handleRoundClick(roundNum)}
            style={{
              background: 'linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)',
              borderRadius: '12px',
              padding: '30px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              boxShadow: '0 6px 12px rgba(255, 126, 95, 0.4)',
              border: '2px solid rgba(255, 255, 255, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 12px 25px rgba(255, 126, 95, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(255, 126, 95, 0.4)';
            }}
          >
            <h2 style={{
              margin: '0 0 10px 0',
              color: '#fff',
              fontSize: '2.5rem',
              fontWeight: 'bold',
              textShadow: '2px 2px 6px rgba(74, 21, 4, 0.4)'
            }}>
              Round {roundNum}
            </h2>
            <p style={{
              margin: 0,
              color: '#fff',
              fontSize: '1rem',
              opacity: 0.95,
              textShadow: '1px 1px 3px rgba(0, 0, 0, 0.2)'
            }}>
              {isAdmin ? 'Manage Points' : 'View Scores'}
            </p>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 20,
        padding: 12,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderRadius: 8,
        border: "2px solid rgba(254, 180, 123, 0.5)",
        boxShadow: '0 2px 8px rgba(255, 107, 107, 0.2)'
      }}>
        <h4 style={{ margin: 0, color: "#4a1504" }}>How it works</h4>
        <ul style={{ margin: 8, paddingLeft: 20, color: "#6b2e0a" }}>
          {isAdmin ? (
            <>
              <li>Click on any round card to manage points for that round</li>
              <li>You can set manual points for each player in that round</li>
              <li>Points are specific to each round and don't carry over</li>
              <li>Players will see their points for each round separately</li>
            </>
          ) : (
            <>
              <li>Click on any round card to view the scoreboard for that round</li>
              <li>See your ranking, points, and other players' scores</li>
              <li>Each round has its own separate scoreboard</li>
              <li>Points are awarded by administrators for each round</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}