// src/pages/UserDashboard.jsx
import React, { useEffect, useState, useRef } from "react";
import api from '../../api';
import { Link, useNavigate } from "react-router-dom";
import './UserDashboard.css';
import PerformanceMonitor from "../../components/PerformanceMonitor";
import BestRacers from "../../components/BestRacers";

export default function UserDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showSessionDebug, setShowSessionDebug] = useState(false);
  const [sessionDebug, setSessionDebug] = useState(null);
  const [keepOnExpiry, setKeepOnExpiry] = useState(localStorage.getItem('sessionDebugKeepOnExpiry') === 'true');
  const [animatedCards, setAnimatedCards] = useState(new Set());
  const navigate = useNavigate();
  const cardRefs = useRef([]);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cardIndex = parseInt(entry.target.dataset.cardIndex);
            setAnimatedCards(prev => new Set([...prev, cardIndex]));
          }
        });
      },
      {
        threshold: 0.3,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    cardRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchData = async (retryCount = 0) => {
      setLoading(true);
      try {
        // Fetch user info
        const userRes = await api.get('/api/auth/me', {
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
            timeout: 10000 // 10 second timeout for mobile
          });
        
        
        if (userRes.data && userRes.data.user) {
          setUser(userRes.data.user);
        } else {
          throw new Error('Invalid user data structure');
        }
        setErr(null); // Clear any previous errors
      } catch (e) {
        
        // Retry logic for auth issues and network issues
        if (retryCount < 2 && (e.code === 'NETWORK_ERROR' || e.response?.status >= 500 || e.response?.status === 401)) {
          setTimeout(() => fetchData(retryCount + 1), retryCount === 0 ? 800 : 2000);
          return;
        }
        
        // Handle different error types after retries exhausted
        if (e.response?.status === 401) {
          setErr('Session expired. Please log in again.');
          // Redirect to login after a delay
          setTimeout(() => navigate('/login'), 3000);
        } else if (e.code === 'NETWORK_ERROR' || !navigator.onLine) {
          setErr('Network connection issue. Please check your internet and try again.');
        } else {
          setErr(e?.response?.data?.message || e.message || 'Failed to load dashboard');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate, keepOnExpiry]);

  const [debugData, setDebugData] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [testResults, setTestResults] = useState(null);  return (
    <div className="dashboard-container">
      <style>
        {`
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% {
              transform: translateY(0);
            }
            40% {
              transform: translateY(-10px);
            }
            60% {
              transform: translateY(-5px);
            }
          }
          
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}
      </style>

      {/* ? Main Content */}
      <div className="main-content">
        {/* ? Welcome Section */}
      {user && (
        <div className="welcome-section">
          <div className="welcome-text">
            <h1 className="welcome-title">Welcome, {user.displayName}!</h1>
            <p className="welcome-quote">"When you see a good move, look for a better one." � Emanuel Lasker</p>
          </div>
         
        </div>
      )}

      {/* ? User Info Cards moved to Profile Modal */}

      {/* ?? Performance Monitor */}
      {user && <PerformanceMonitor user={user} />}

      {/* ?? Best Racers */}
      <BestRacers />

      {/* ?? Attendance Card for Enrolled Students */}
      {user && user.enrolled && (
        <div className="attendance-section">
          <div 
            ref={(el) => cardRefs.current[3] = el}
            data-card-index="3"
            className={`racing-mode-card attendance-card ${animatedCards.has(3) ? 'scroll-animated' : ''} ${hoveredCard === 3 ? 'racing-mode-card-hover' : ''}`}
            onMouseEnter={() => setHoveredCard(3)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="racing-mode-icon">??</div>
            <h3 className="racing-mode-title">Student Attendance</h3>
            <p className="racing-mode-description">View your attendance records and manage payments.</p>
            <Link to="/attendance" style={{ textDecoration: 'none' }}>
              <button className="racing-mode-button">View Attendance</button>
            </Link>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-card">
          <div className="loading-icon">?</div>
          Loading dashboard... Please wait.
          <div className="loading-subtitle">
            If this takes too long, check your internet connection.
          </div>
        </div>
      )}
      {err && (
        <div className="error-card">
          <div className="error-message">{err}</div>
          <button 
            onClick={() => {
              window.location.reload();
            }}
            className="retry-button"
          >
            ?? Retry
          </button>
        </div>
      )}

      </div>


    </div>
  );
}

