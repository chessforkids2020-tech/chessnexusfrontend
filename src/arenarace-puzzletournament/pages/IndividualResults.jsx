import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { io } from 'socket.io-client';
import StudyMode from '../components/StudyMode';
import { motion } from 'framer-motion';

const API = import.meta.env.VITE_API_URL;

const IndividualResults = () => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studyMode, setStudyMode] = useState(null);
  const [batchInfo, setBatchInfo] = useState(null);
  const [socket, setSocket] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Extract roundId from batchInfo or results
  const roundId = batchInfo?.round?._id || results[0]?.roundId || null;

  // Local countdown timer for smooth updates and redirect
  useEffect(() => {
    if (typeof timeRemaining === 'number') {
      if (timeRemaining <= 0) {
        setStatusMessage('⏰ Batch time has expired! Redirecting to leaderboard...');
        const timeout = setTimeout(() => {
          navigate(`/leaderboard/${batchId}`);
        }, 2000);
        return () => clearTimeout(timeout);
      }
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setStatusMessage('⏰ Batch time has expired! Redirecting to leaderboard...');
            setTimeout(() => {
              navigate(`/leaderboard/${batchId}`);
            }, 2000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining, batchId, navigate]);

  useEffect(() => {
    fetchUserResults();
    
    // Initialize socket connection with JWT auth
    const token = localStorage.getItem('authToken');
    const newSocket = io(API, { auth: { token }, transports: ['websocket', 'polling'] });
    setSocket(newSocket);
    
    // Listen for batch completion
    newSocket.on('batchCompleted', (data) => {
      if (data.batchId === batchId || data.roundId === roundId) {
        setStatusMessage('⏰ Batch time has expired! Redirecting to leaderboard...');
        setTimeout(() => {
          navigate(`/leaderboard/${batchId}`);
        }, 3000);
      }
    });
    
    // Listen for batch time updates
    newSocket.on('batchTimeUpdate', (data) => {
      if (data.batchId === batchId || data.roundId === roundId) {
        setTimeRemaining(data.timeRemaining);
        
        // Update status message based on time remaining
        if (data.timeRemaining <= 30) {
          setStatusMessage(`⚠️ Batch ending soon: ${formatTimeRemaining(data.timeRemaining)} remaining`);
        } else if (data.timeRemaining <= 0) {
          setStatusMessage('⏰ Batch time has expired! Redirecting to leaderboard...');
          setTimeout(() => {
            navigate(`/leaderboard/${batchId}`);
          }, 2000);
        } else {
          setStatusMessage(`⏱️ Batch time remaining: ${formatTimeRemaining(data.timeRemaining)}`);
        }
      }
    });

    // Listen for batch time expired events
    newSocket.on('batchTimeExpired', (data) => {
      if (data.batchId === batchId || data.roundId === roundId) {
        setStatusMessage(data.message || 'Batch time has expired! Redirecting to leaderboard...');
        setTimeout(() => {
          navigate(`/leaderboard/${batchId}`);
        }, 2000);
      }
    });

    // Listen for all participants finished event
    newSocket.on('allParticipantsFinished', (data) => {
      if (data.batchId === batchId || data.roundId === roundId) {
        setStatusMessage('🎉 All participants finished! Redirecting to final leaderboard...');
        setTimeout(() => {
          navigate(`/leaderboard/${batchId}`);
        }, 3000);
      }
    });
    
    return () => {
      newSocket.disconnect();
    };
  }, [batchId, roundId, navigate]);

  const fetchUserResults = async () => {
    try {
      setLoading(true);
      
      // Get current user info
      const userResponse = await api.get('/api/auth/me');
      setUserInfo(userResponse.data);
      
      // Get batch results for current user
      const resultsResponse = await api.get(`/api/public/batches/${batchId}/my-results`);
      const userResultsData = resultsResponse.data;
      
      // The new endpoint returns user's results directly
      const userResults = userResultsData.puzzleResults || [];
      const remainingPuzzles = userResultsData.remainingPuzzles || [];
      
      userResults.forEach((result, index) => {
      });      
      // Combine attempted results with unattempted puzzles for complete view
      const allPuzzleData = [
        ...userResults,
        ...remainingPuzzles.map(puzzle => ({
          puzzleId: puzzle.puzzleId,
          puzzle: {
            _id: puzzle.puzzleId,
            title: `Puzzle ${puzzle.puzzleId.toString().slice(-6)}`,
            fen: puzzle.fen,
            difficulty: puzzle.difficulty,
            solution: [] // Will be fetched if needed
          },
          score: 0,
          timeTakenSec: 0,
          moves: [],
          allMoves: [],
          correct: false,
          finalPosition: puzzle.fen, // Start position since no moves made
          submittedAt: null,
          isUnattempted: true // Flag to show this was not attempted
        }))
      ];
      
      setResults(allPuzzleData);
      // Check if all participants have finished
      const allParticipantsFinished = userResultsData.allParticipantsFinished || false;
      const totalParticipants = userResultsData.totalParticipants || 1;
      const finishedParticipants = userResultsData.finishedParticipants || 1;
      
      setBatchInfo({
        name: userResultsData.batchName,
        round: userResultsData.round,
        totalPuzzles: userResultsData.totalPuzzles,
        completedPuzzles: userResultsData.completedPuzzles,
        totalAttempts: userResultsData.totalAttempts, // Total submission attempts
        totalScore: userResultsData.totalScore,
        averageTimePerPuzzle: userResultsData.averageTimePerPuzzle,
        isComplete: userResultsData.isComplete,
        isActive: userResultsData.batchStatus === 'active',
        allParticipantsFinished,
        totalParticipants,
        finishedParticipants
      });
      
      // Get additional batch timing info if needed
      if (userResultsData.batchStatus === 'active') {
        try {
          const batchResponse = await api.get(`/api/public/batches/${batchId}`);
          const batch = batchResponse.data;
          // Use backend's timeRemaining for countdown
          if (batch && batch.isActive && typeof batch.timeRemaining === 'number') {
            setTimeRemaining(batch.timeRemaining);
            if (batch.timeRemaining > 0) {
              setStatusMessage(`⏱️ Batch time remaining: ${formatTimeRemaining(batch.timeRemaining)}`);
            } else {
              setStatusMessage('⏰ Batch time has expired! Redirecting to leaderboard...');
            }
          } else if (typeof batch.duration === 'number' && batch.duration > 0) {
            setTimeRemaining(batch.duration * 60);
            setStatusMessage('⏱️ Batch time remaining: ' + formatTimeRemaining(batch.duration * 60));
          } else {
            setStatusMessage('🏆 Great job completing all puzzles!');
          }
        } catch (batchErr) {
          setStatusMessage('🏆 Great job completing all puzzles!');
        }
      } else {
        // Check if all participants have finished
        if (batchInfo?.allParticipantsFinished) {
          setStatusMessage('🎉 All participants finished! Redirecting to final leaderboard...');
          setTimeout(() => {
            navigate(`/leaderboard/${batchId}`);
          }, 3000);
        } else if (batchInfo?.totalParticipants > 1) {
          setStatusMessage(`🏆 Great job completing all puzzles! Waiting for ${batchInfo.totalParticipants - batchInfo.finishedParticipants} other participant(s) to finish...`);
        } else {
          setStatusMessage('🏆 Great job completing all puzzles!');
        }
      }
      
    } catch (err) {
      setError('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = (seconds) => {
    if (seconds === null) return '';
    if (seconds <= 0) return 'Time\'s up!';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const openStudyMode = (result) => {
    setStudyMode(result);
  };

  const closeStudyMode = () => {
    setStudyMode(null);
  };

  const handleGoToDashboard = () => {
    navigate('/');
  };

  const styles = {
    container: {
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: '#0a0a0a',
      minHeight: '100vh',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    },
    background: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
      pointerEvents: 'none',
      zIndex: 0,
    },
    content: {
      maxWidth: '1400px',
      margin: '0 auto',
      position: 'relative',
      zIndex: 1,
    },
    header: {
      textAlign: 'center',
      marginBottom: '40px',
      padding: '32px 28px',
      background: 'rgba(23, 23, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    },
    title: {
      fontSize: '42px',
      fontWeight: '700',
      margin: '0 0 12px 0',
      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    batchInfo: {
      fontSize: '16px',
      margin: '0 0 20px 0',
      color: '#9ca3af',
      fontWeight: '400',
      display: 'flex',
      gap: '20px',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    batchInfoItem: {
      background: 'rgba(0, 0, 0, 0.3)',
      padding: '8px 16px',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
    },
    timerDisplay: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      marginTop: '20px',
      padding: '20px',
      background: 'rgba(6, 182, 212, 0.1)',
      borderRadius: '16px',
      border: '1px solid rgba(6, 182, 212, 0.2)',
      backdropFilter: 'blur(10px)',
    },
    timerExpired: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      marginTop: '20px',
      padding: '20px',
      background: 'rgba(239, 68, 68, 0.1)',
      borderRadius: '16px',
      border: '1px solid rgba(239, 68, 68, 0.2)',
      backdropFilter: 'blur(10px)',
    },
    timerIcon: {
      fontSize: '32px',
      color: '#06b6d4',
    },
    timerExpiredIcon: {
      fontSize: '32px',
      color: '#ef4444',
    },
    timerText: {
      textAlign: 'center',
    },
    timerValue: {
      fontSize: '32px',
      fontWeight: 'bold',
      fontFamily: 'monospace',
      color: '#ffffff',
      textShadow: '0 0 10px rgba(6, 182, 212, 0.5)',
    },
    timerExpiredValue: {
      fontSize: '32px',
      fontWeight: 'bold',
      fontFamily: 'monospace',
      color: '#ef4444',
      textShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
    },
    timerLabel: {
      fontSize: '14px',
      color: '#9ca3af',
      marginTop: '4px',
    },
    summarySection: {
      display: 'flex',
      gap: '20px',
      marginBottom: '40px',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    statCard: {
      background: 'rgba(23, 23, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      padding: '28px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      textAlign: 'center',
      minWidth: '180px',
      transition: 'all 0.3s ease',
    },
    statValue: {
      fontSize: '40px',
      fontWeight: 'bold',
      color: '#10b981',
      margin: '0',
      textShadow: '0 0 10px rgba(16, 185, 129, 0.3)',
    },
    statLabel: {
      color: '#9ca3af',
      fontSize: '14px',
      marginTop: '8px',
      textTransform: 'uppercase',
      letterSpacing: '1px',
    },
    tableSection: {
      background: 'rgba(23, 23, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      padding: '32px',
      marginBottom: '40px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      maxWidth: '1200px',
      margin: '0 auto 40px auto',
    },
    sectionTitle: {
      color: '#ffffff',
      margin: '0 0 32px 0',
      fontSize: '32px',
      fontWeight: '600',
      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    tableContainer: {
      overflowX: 'auto',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      background: 'rgba(0, 0, 0, 0.3)',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      minWidth: '900px',
    },
    headerRow: {
      background: 'rgba(0, 0, 0, 0.5)',
    },
    th: {
      padding: '20px 8px',
      textAlign: 'left',
      fontWeight: '600',
      color: '#ffffff',
      borderBottom: '2px solid rgba(255, 255, 255, 0.05)',
      fontSize: '14px',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      width: '20%',
      minWidth: '150px',
    },
    thPosition: {
      padding: '20px 8px 20px 4px',
      textAlign: 'left',
      fontWeight: '600',
      color: '#ffffff',
      borderBottom: '2px solid rgba(255, 255, 255, 0.05)',
      fontSize: '14px',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      width: '25%',
      minWidth: '200px',
    },
    row: {
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      transition: 'all 0.3s ease',
    },
    td: {
      padding: '20px 8px',
      verticalAlign: 'top',
      color: '#ffffff',
      width: '20%',
      minWidth: '150px',
    },
    tdPosition: {
      padding: '20px 8px 20px 4px',
      verticalAlign: 'top',
      color: '#ffffff',
      width: '25%',
      minWidth: '200px',
    },
    puzzleInfo: {
      minWidth: '150px',
    },
    difficulty: {
      fontSize: '12px',
      color: '#9ca3af',
      marginTop: '4px',
      background: 'rgba(0, 0, 0, 0.3)',
      padding: '4px 8px',
      borderRadius: '4px',
      display: 'inline-block',
      border: '1px solid rgba(255, 255, 255, 0.05)',
    },
    fenCell: {
      cursor: 'pointer',
      fontFamily: 'monospace',
      fontSize: '12px',
      padding: '12px',
      background: 'rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '12px',
      minWidth: '200px',
      transition: 'all 0.3s ease',
    },
    studyHint: {
      fontSize: '11px',
      color: '#06b6d4',
      marginTop: '6px',
      fontStyle: 'italic',
    },
    movesList: {
      fontFamily: 'monospace',
      fontSize: '13px',
      minWidth: '180px',
    },
    userMovesComplete: {
      marginTop: '8px',
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffffff',
    },
    expectedMoves: {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#9ca3af',
    },
    solutionMoves: {
      marginTop: '6px',
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#10b981',
      fontWeight: '600',
      padding: '8px',
      background: 'rgba(16, 185, 129, 0.1)',
      borderRadius: '8px',
      border: '1px solid rgba(16, 185, 129, 0.2)',
    },
    analysisHint: {
      fontSize: '11px',
      color: '#8b5cf6',
      marginTop: '8px',
      fontStyle: 'italic',
    },
    mistakeAnalysis: {
      marginTop: '12px',
      padding: '12px',
      background: 'rgba(245, 158, 11, 0.1)',
      borderRadius: '12px',
      border: '1px solid rgba(245, 158, 11, 0.2)',
    },
    timeoutAnalysis: {
      marginTop: '12px',
      padding: '12px',
      background: 'rgba(139, 92, 246, 0.1)',
      borderRadius: '12px',
      border: '1px solid rgba(139, 92, 246, 0.2)',
    },
    moveComparison: {
      marginTop: '8px',
    },
    comparisonLabel: {
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#f59e0b',
      marginBottom: '6px',
    },
    moveComparisonRow: {
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
      marginBottom: '4px',
      fontSize: '11px',
      fontFamily: 'monospace',
    },
    moveNumber: {
      fontWeight: 'bold',
      color: '#ffffff',
      minWidth: '70px',
    },
    moveComparisonItem: {
      padding: '4px 6px',
      borderRadius: '4px',
      background: 'rgba(0, 0, 0, 0.3)',
      minWidth: '90px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
    },
    noMovesAnalysis: {
      marginTop: '12px',
      padding: '10px',
      background: 'rgba(239, 68, 68, 0.1)',
      borderRadius: '12px',
      border: '1px solid rgba(239, 68, 68, 0.2)',
    },
    resultBadge: {
      color: '#ffffff',
      padding: '12px 16px',
      borderRadius: '12px',
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: '14px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      minWidth: '120px',
    },
    points: {
      fontSize: '13px',
      marginTop: '6px',
      opacity: '0.9',
      fontWeight: '600',
    },
    incorrectHint: {
      fontSize: '11px',
      marginTop: '6px',
      opacity: '0.8',
      fontWeight: 'normal',
    },
    unattemptedText: {
      color: '#f59e0b',
      fontStyle: 'italic',
      fontWeight: 'bold',
      background: 'rgba(245, 158, 11, 0.1)',
      padding: '6px 10px',
      borderRadius: '6px',
      border: '1px solid rgba(245, 158, 11, 0.2)',
    },
    userMovesActual: {
      marginTop: '8px',
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ef4444',
      fontWeight: 'bold',
      padding: '8px 12px',
      background: 'rgba(239, 68, 68, 0.1)',
      borderRadius: '8px',
      border: '1px solid rgba(239, 68, 68, 0.2)',
    },
    completeMoves: {
      marginTop: '10px',
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#9ca3af',
      padding: '8px 12px',
      background: 'rgba(0, 0, 0, 0.3)',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
    },
    onlyBotMoves: {
      marginTop: '8px',
    },
    noUserMoves: {
      color: '#f59e0b',
      fontStyle: 'italic',
      fontWeight: 'bold',
      display: 'block',
      marginBottom: '8px',
    },
    botHelp: {
      fontSize: '11px',
      color: '#10b981',
      marginTop: '4px',
      fontStyle: 'italic',
    },
    missedHint: {
      fontSize: '11px',
      color: '#f59e0b',
      marginTop: '8px',
      fontStyle: 'italic',
    },
    timeCell: {
      textAlign: 'center',
      fontFamily: 'monospace',
      fontWeight: 'bold',
      fontSize: '16px',
      color: '#06b6d4',
    },
    statusSection: {
      textAlign: 'center',
      marginBottom: '40px',
    },
    statusMessage: {
      background: 'rgba(6, 182, 212, 0.1)',
      color: '#ffffff',
      padding: '24px',
      borderRadius: '20px',
      fontSize: '18px',
      lineHeight: '1.6',
      border: '1px solid rgba(6, 182, 212, 0.2)',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    },
    actionSection: {
      textAlign: 'center',
      marginBottom: '40px',
    },
    dashboardButton: {
      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
      color: '#fff',
      border: 'none',
      padding: '16px 32px',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 20px rgba(6, 182, 212, 0.4)',
    },
    loadingContainer: {
      textAlign: 'center',
      padding: '60px 20px',
      background: 'rgba(23, 23, 23, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    },
    loadingIcon: {
      fontSize: '56px',
      marginBottom: '20px',
      color: '#06b6d4',
    },
    loadingTitle: {
      color: '#ffffff',
      marginBottom: '12px',
      fontSize: '24px',
      fontWeight: '600',
    },
    loadingText: {
      color: '#9ca3af',
      fontSize: '15px',
    },
    errorContainer: {
      textAlign: 'center',
      padding: '60px 40px',
      background: 'rgba(239, 68, 68, 0.15)',
      border: '1px solid rgba(239, 68, 68, 0.2)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    },
    errorTitle: {
      color: '#ef4444',
      marginBottom: '12px',
      fontSize: '24px',
      fontWeight: '600',
    },
    errorText: {
      color: '#9ca3af',
      fontSize: '15px',
      marginBottom: '24px',
    },
  };

  // Responsive styles for mobile and tablet
  const responsiveStyles = `
    /* Tablet styles (768px - 1024px) */
    @media (max-width: 1024px) and (min-width: 769px) {
      .individual-results-container {
        padding: 15px !important;
      }
      .individual-results-content {
        max-width: 100% !important;
        padding: 20px 15px !important;
      }
      .individual-results-table-section {
        padding: 20px !important;
        margin: 0 auto 30px auto !important;
        max-width: 100% !important;
      }
      .individual-results-table-container {
        border-radius: 12px !important;
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch !important;
      }
      .individual-results-table {
        min-width: 800px !important;
        font-size: 13px !important;
      }
      .individual-results-th,
      .individual-results-td {
        padding: 15px 6px !important;
      }
      .individual-results-th-position,
      .individual-results-td-position {
        min-width: 180px !important;
      }
    }

    /* Mobile styles (up to 768px) */
    @media (max-width: 768px) {
      .individual-results-container {
        padding: 10px !important;
      }
      .individual-results-content {
        max-width: 100% !important;
        padding: 15px 10px !important;
      }
      .individual-results-header {
        padding: 20px 15px !important;
        border-radius: 15px !important;
      }
      .individual-results-title {
        font-size: 28px !important;
        margin-bottom: 15px !important;
      }
      .individual-results-batch-info {
        flex-direction: column !important;
        gap: 10px !important;
        font-size: 14px !important;
      }
      .individual-results-table-section {
        padding: 15px !important;
        margin: 0 auto 20px auto !important;
        max-width: 100% !important;
        border-radius: 15px !important;
      }
      .individual-results-table-container {
        border-radius: 10px !important;
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch !important;
        scrollbar-width: thin !important;
        scrollbar-color: rgba(6, 182, 212, 0.3) rgba(255, 255, 255, 0.1) !important;
      }
      .individual-results-table-container::-webkit-scrollbar {
        height: 6px !important;
      }
      .individual-results-table-container::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1) !important;
        border-radius: 3px !important;
      }
      .individual-results-table-container::-webkit-scrollbar-thumb {
        background: rgba(6, 182, 212, 0.5) !important;
        border-radius: 3px !important;
      }
      .individual-results-table-container::-webkit-scrollbar-thumb:hover {
        background: rgba(6, 182, 212, 0.7) !important;
      }
      .individual-results-table {
        min-width: 700px !important;
        font-size: 12px !important;
      }
      .individual-results-th,
      .individual-results-td {
        padding: 12px 4px !important;
        white-space: nowrap !important;
      }
      .individual-results-th-position,
      .individual-results-td-position {
        min-width: 150px !important;
        max-width: 200px !important;
      }
      .individual-results-moves-list,
      .individual-results-expected-moves {
        max-width: 120px !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      .individual-results-stat-card {
        min-width: 140px !important;
        padding: 20px !important;
      }
      .individual-results-stat-value {
        font-size: 32px !important;
      }
      .individual-results-stat-label {
        font-size: 12px !important;
      }
      .individual-results-dashboard-button {
        width: 100% !important;
        padding: 15px !important;
        font-size: 16px !important;
      }
    }

    /* Small mobile styles (up to 480px) */
    @media (max-width: 480px) {
      .individual-results-container {
        padding: 5px !important;
      }
      .individual-results-content {
        padding: 10px 5px !important;
      }
      .individual-results-header {
        padding: 15px 10px !important;
        margin-bottom: 20px !important;
      }
      .individual-results-title {
        font-size: 24px !important;
      }
      .individual-results-table-section {
        padding: 10px !important;
      }
      .individual-results-table {
        min-width: 650px !important;
        font-size: 11px !important;
      }
      .individual-results-th,
      .individual-results-td {
        padding: 8px 3px !important;
      }
      .individual-results-th-position,
      .individual-results-td-position {
        min-width: 120px !important;
        max-width: 150px !important;
      }
      .individual-results-stat-card {
        min-width: 120px !important;
        padding: 15px !important;
      }
      .individual-results-stat-value {
        font-size: 28px !important;
      }
    }
  `;

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.background}></div>
        <div style={styles.content}>
          <div style={styles.loadingContainer}>
            <div style={styles.loadingIcon}>⏳</div>
            <h2 style={styles.loadingTitle}>Loading Your Results</h2>
            <p style={styles.loadingText}>
              Fetching your performance data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.background}></div>
        <div style={styles.content}>
          <div style={styles.errorContainer}>
            <div style={styles.loadingIcon}>⚠️</div>
            <h2 style={styles.errorTitle}>Error Loading Results</h2>
            <p style={styles.errorText}>{error}</p>
            <motion.button 
              onClick={() => fetchUserResults()} 
              style={styles.dashboardButton}
              whileHover={{ 
                y: -2,
                boxShadow: '0 6px 24px rgba(6, 182, 212, 0.5)'
              }}
              transition={{ duration: 0.2 }}
            >
              Retry
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // Use stats from batchInfo (calculated by backend) or fallback to local calculation
  const totalPuzzles = batchInfo?.totalPuzzles || results.length;
  const attemptedPuzzles = batchInfo?.completedPuzzles || results.filter(r => !r.isUnattempted).length;
  const correctPuzzles = results.filter(r => r.correct).length;
  const totalScore = batchInfo?.totalScore || results.reduce((sum, r) => sum + (r.score || 0), 0);
  const averageTime = batchInfo?.averageTimePerPuzzle || (attemptedPuzzles > 0 ? 
    Math.round(results.filter(r => !r.isUnattempted).reduce((sum, r) => sum + (r.timeTakenSec || 0), 0) / attemptedPuzzles) : 0);

  return (
    <div style={styles.container} className="individual-results-container">
      <div style={styles.background}></div>
      
      <div style={styles.content} className="individual-results-content">
        <style dangerouslySetInnerHTML={{ __html: responsiveStyles }} />
        <motion.div 
          style={styles.header}
          className="individual-results-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 style={styles.title} className="individual-results-title">Your Performance Results</h1>
          <div style={styles.batchInfo} className="individual-results-batch-info">
            <span style={styles.batchInfoItem}>
              <strong style={{color: '#ffffff'}}>Batch:</strong> {batchInfo?.name || 'Unknown'}
            </span>
            <span style={styles.batchInfoItem}>
              <strong style={{color: '#ffffff'}}>Round:</strong> {batchInfo?.round?.number || 'N/A'}
            </span>
          </div>
          
          {/* Timer Display */}
          {timeRemaining !== null && timeRemaining > 0 && (
            <motion.div 
              style={styles.timerDisplay}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div style={styles.timerIcon}>⏱️</div>
              <div style={styles.timerText}>
                <div style={styles.timerValue}>{formatTimeRemaining(timeRemaining)}</div>
                <div style={styles.timerLabel}>Time Remaining</div>
              </div>
            </motion.div>
          )}
          
          {timeRemaining !== null && timeRemaining <= 0 && (
            <motion.div 
              style={styles.timerExpired}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div style={styles.timerExpiredIcon}>⏰</div>
              <div style={styles.timerText}>
                <div style={styles.timerExpiredValue}>Time's Up!</div>
                <div style={styles.timerLabel}>Batch Ended</div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Summary Stats */}
        <motion.div 
          style={styles.summarySection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {[
            { value: `${correctPuzzles}/${attemptedPuzzles}`, label: 'Puzzles Correct' },
            { value: `${attemptedPuzzles}/${totalPuzzles}`, label: 'Puzzles Attempted' },
            { value: `${totalScore}`, label: 'Total Points' },
            { value: `${averageTime}s`, label: 'Average Time' }
          ].map((stat, index) => (
            <motion.div 
              key={index}
              style={styles.statCard}
              className="individual-results-stat-card"
              whileHover={{ 
                y: -8,
                borderColor: 'rgba(6, 182, 212, 0.2)',
                boxShadow: '0 12px 40px rgba(6, 182, 212, 0.2)'
              }}
              transition={{ duration: 0.3 }}
            >
              <div style={styles.statValue} className="individual-results-stat-value">{stat.value}</div>
              <div style={styles.statLabel} className="individual-results-stat-label">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Results Table */}
        <motion.div 
          style={styles.tableSection}
          className="individual-results-table-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <h2 style={styles.sectionTitle}>Detailed Results</h2>
          <div style={styles.tableContainer} className="individual-results-table-container">
            <table style={styles.table} className="individual-results-table">
              <thead>
                <tr style={styles.headerRow}>
                  <th style={styles.thPosition} className="individual-results-th-position">Position (FEN)</th>
                  <th style={styles.th} className="individual-results-th">Your Moves</th>
                  <th style={styles.th} className="individual-results-th">Correct Solution</th>
                  <th style={styles.th} className="individual-results-th">Result</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <motion.tr 
                    key={index} 
                    style={styles.row}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ 
                      background: 'rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <td style={styles.tdPosition} className="individual-results-td-position">
                      <motion.div 
                        style={styles.fenCell}
                        onClick={() => openStudyMode(result)}
                        title="Click to analyze position"
                        whileHover={{ 
                          borderColor: 'rgba(6, 182, 212, 0.3)',
                          background: 'rgba(6, 182, 212, 0.1)'
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        {result.finalPosition ? 
                          `${result.finalPosition.substring(0, 20)}...` : 
                          'No position'
                        }
                        <div style={styles.studyHint}>📋 Click to study</div>
                      </motion.div>
                    </td>
                    <td style={styles.td} className="individual-results-td">
                      <div style={styles.movesList} className="individual-results-moves-list">
                        <strong>Your moves:</strong> 
                        <div style={styles.userMovesComplete}>
                          {result.isUnattempted ? (
                            <span style={styles.unattemptedText}>Not attempted</span>
                          ) : result.moves?.length > 0 ? (
                            <>
                              <div style={styles.userMovesActual}>
                                <strong>Your attempts:</strong> {result.moves.join(' ')}
                              </div>
                              {result.allMoves?.length > result.moves?.length && (
                                <div style={styles.completeMoves}>
                                  <strong>Complete game:</strong> {result.allMoves.join(' ')}
                                  <div style={styles.botHelp}>
                                    ⚡ Bot completed after your moves
                                  </div>
                                </div>
                              )}
                            </>
                          ) : result.allMoves?.length > 0 ? (
                            <div style={styles.onlyBotMoves}>
                              <span style={styles.noUserMoves}>No user moves recorded</span>
                              <div style={styles.completeMoves}>
                                <strong>Game record:</strong> {result.allMoves.join(' ')}
                              </div>
                            </div>
                          ) : (
                            <span style={styles.unattemptedText}>No moves recorded</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={styles.td} className="individual-results-td">
                      <div style={styles.expectedMoves} className="individual-results-expected-moves">
                        <strong>Correct solution:</strong>
                        <div style={styles.solutionMoves}>
                          {result.puzzle?.solution?.join(' ') || (
                            result.isUnattempted ? 'Click to study and see solution' : 'Solution not available'
                          )}
                        </div>
                        {!result.correct && !result.isUnattempted && result.moves?.length > 0 && (
                          <div style={styles.mistakeAnalysis}>
                            <div style={styles.analysisHint}>
                              💡 Compare your moves with the correct solution above
                            </div>
                            {result.puzzle?.solution?.length > 0 && result.moves?.length > 0 && (
                              <div style={styles.moveComparison}>
                                <div style={styles.comparisonLabel}>Move-by-move analysis:</div>
                                {Math.max(result.moves.length, Math.ceil((result.puzzle.solution.length || 0) / 2)).toString().split('').map((_, index) => {
                                  const userMove = result.moves[index];
                                  const expectedMove = result.puzzle.solution[index * 2];
                                  return (
                                    <div key={index} style={styles.moveComparisonRow}>
                                      <span style={styles.moveNumber}>Move {index + 1}:</span>
                                      <span style={{
                                        ...styles.moveComparisonItem,
                                        color: userMove ? '#ef4444' : '#9ca3af'
                                      }}>
                                        You: {userMove || 'N/A'}
                                      </span>
                                      <span style={{
                                        ...styles.moveComparisonItem,
                                        color: '#10b981'
                                      }}>
                                        Correct: {expectedMove || 'N/A'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                        {result.timeout && result.moves?.length > 0 && (
                          <div style={styles.timeoutAnalysis}>
                            <div style={styles.analysisHint}>
                              ⏰ Time ran out! Your moves were preserved for learning.
                            </div>
                            {result.puzzle?.solution?.length > 0 && (
                              <div style={styles.moveComparison}>
                                <div style={styles.comparisonLabel}>See how you were progressing:</div>
                                {Math.max(result.moves.length, Math.ceil((result.puzzle.solution.length || 0) / 2)).toString().split('').map((_, index) => {
                                  const userMove = result.moves[index];
                                  const expectedMove = result.puzzle.solution[index * 2];
                                  return (
                                    <div key={index} style={styles.moveComparisonRow}>
                                      <span style={styles.moveNumber}>Move {index + 1}:</span>
                                      <span style={{
                                        ...styles.moveComparisonItem,
                                        color: userMove ? '#8b5cf6' : '#9ca3af'
                                      }}>
                                        You: {userMove || 'N/A'}
                                      </span>
                                      <span style={{
                                        ...styles.moveComparisonItem,
                                        color: '#10b981'
                                      }}>
                                        Correct: {expectedMove || 'N/A'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                        {!result.correct && !result.isUnattempted && (!result.moves?.length || result.moves.length === 0) && (
                          <div style={styles.noMovesAnalysis}>
                            <div style={styles.analysisHint}>
                              ⚠️ No moves were recorded for this puzzle
                            </div>
                          </div>
                        )}
                        {result.isUnattempted && (
                          <div style={styles.missedHint}>
                            ⚠️ You missed this puzzle - practice it!
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={styles.td} className="individual-results-td">
                      <div style={{
                        ...styles.resultBadge,
                        backgroundColor: result.isUnattempted ? 'rgba(245, 158, 11, 0.2)' : 
                                      (result.timeout ? 'rgba(139, 92, 246, 0.2)' : 
                                      (result.correct ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)')),
                        border: result.isUnattempted ? '1px solid rgba(245, 158, 11, 0.3)' :
                               (result.timeout ? '1px solid rgba(139, 92, 246, 0.3)' :
                               (result.correct ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'))
                      }}>
                        {result.isUnattempted ? '⏭️ Skipped' : (result.timeout ? '⏰ Timeout' : (result.correct ? '✅ Correct' : '❌ Incorrect'))}
                        <div style={styles.points}>
                          +{result.score || 0} pts
                        </div>
                        {result.timeout && (
                          <div style={styles.incorrectHint}>
                            Time ran out - moves preserved for learning!
                          </div>
                        )}
                        {!result.correct && !result.isUnattempted && !result.timeout && result.moves?.length > 0 && (
                          <div style={styles.incorrectHint}>
                            Made {result.moves.length} move(s) - Study the comparison above!
                          </div>
                        )}
                        {!result.correct && !result.isUnattempted && !result.timeout && (!result.moves?.length || result.moves.length === 0) && (
                          <div style={styles.incorrectHint}>
                            No user moves recorded - Technical issue?
                          </div>
                        )}
                        {result.isUnattempted && (
                          <div style={styles.incorrectHint}>
                            Try this puzzle!
                          </div>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Status Message */}
        <motion.div 
          style={styles.statusSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <div style={styles.statusMessage}>
            {statusMessage || (
              <>
                🏆 Great job completing all puzzles! 
                {batchInfo?.totalParticipants > 1 && !batchInfo?.allParticipantsFinished && (
                  <>
                    <br />
                    ⏳ Waiting for {batchInfo.totalParticipants - batchInfo.finishedParticipants} other participant(s) to finish...
                  </>
                )}
                {batchInfo?.allParticipantsFinished && (
                  <>
                    <br />
                    🎉 All participants finished! Redirecting to final leaderboard...
                  </>
                )}
                {(!batchInfo?.totalParticipants || batchInfo?.totalParticipants === 1) && (
                  <>
                    <br />
                    🎯 You're the only participant in this batch!
                  </>
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div 
          style={styles.actionSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <motion.button 
            style={styles.dashboardButton}
            className="individual-results-dashboard-button"
            onClick={handleGoToDashboard}
            whileHover={{ 
              y: -2,
              boxShadow: '0 6px 24px rgba(6, 182, 212, 0.5)'
            }}
            transition={{ duration: 0.2 }}
          >
            Back to Dashboard
          </motion.button>
        </motion.div>

        {/* Study Mode Modal */}
        {studyMode && (
          <StudyMode 
            result={studyMode}
            onClose={closeStudyMode}
          />
        )}
      </div>
    </div>
  );
};

export default IndividualResults;