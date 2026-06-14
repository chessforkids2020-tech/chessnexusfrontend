// Test page to debug Stockfish integration and move validation
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import Chessboard from "../components/Chessboard";
import stockfishService from "../services/stockfishService";

export default function StockfishTest() {
  const navigate = useNavigate();
  const [chess, setChess] = useState(new Chess());
  const [stockfishReady, setStockfishReady] = useState(false);
  const [gameMode, setGameMode] = useState('human-vs-stockfish'); // human-vs-stockfish or stockfish-vs-stockfish
  const [isHumanTurn, setIsHumanTurn] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [lastMove, setLastMove] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [statusMessage, setStatusMessage] = useState("Initializing Stockfish...");
  const [analysis, setAnalysis] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [currentTest, setCurrentTest] = useState("");
  const [boardSize, setBoardSize] = useState(600);

  // Initialize Stockfish
  useEffect(() => {
    const initStockfish = async () => {
      try {
        setCurrentTest("Initializing Stockfish engine...");
        await stockfishService.init();
        setStockfishReady(true);
        setStatusMessage("Stockfish ready! Make your move.");
        addTestResult("✅ Stockfish initialization", "SUCCESS", "Engine loaded successfully");
      } catch (error) {
        setStatusMessage("❌ Stockfish failed to initialize: " + error.message);
        addTestResult("❌ Stockfish initialization", "FAILED", error.message);
      }
    };

    initStockfish();

    return () => {
      try {
        stockfishService.quit();
      } catch (error) {
      }
    };
  }, []);

  const addTestResult = (test, status, details) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, { timestamp, test, status, details }]);
  };

  const resetGame = () => {
    const newChess = new Chess();
    setChess(newChess);
    setMoveHistory([]);
    setLastMove(null);
    setIsHumanTurn(true);
    setIsThinking(false);
    setAnalysis(null);
    setStatusMessage(stockfishReady ? "Game reset! Your move." : "Stockfish not ready");
  };

  const makeStockfishMove = async () => {
    if (!stockfishReady || isThinking) return;

    setIsThinking(true);
    setCurrentTest(`Stockfish analyzing position: ${chess.fen()}`);
    setStatusMessage("Stockfish is thinking...");

    try {
      const startTime = Date.now();
      
      // Test Stockfish analysis
      const result = await stockfishService.getBestMove(chess.fen(), { depth: 15, moveTime: 2000 });
      
      const analysisTime = Date.now() - startTime;
      addTestResult("🧠 Stockfish Analysis", "SUCCESS", 
        `Best move: ${result.bestMove} | Evaluation: ${result.evaluation?.type === 'cp' ? 
          `${(result.evaluation.value / 100).toFixed(2)} pawns` : 
          `Mate in ${result.evaluation?.value || 'unknown'}`} | Time: ${analysisTime}ms`);

      setAnalysis(result);

      if (result.bestMove && result.bestMove !== '(none)') {
        // Apply the move
        const moveObj = chess.move(result.bestMove);
        if (moveObj) {
          setChess(new Chess(chess.fen()));
          setMoveHistory(prev => [...prev, `Stockfish: ${moveObj.san} (${result.bestMove})`]);
          setLastMove({ from: moveObj.from, to: moveObj.to });
          
          addTestResult("🤖 Stockfish Move", "SUCCESS", 
            `Move: ${moveObj.san} (UCI: ${result.bestMove}) | From: ${moveObj.from} → To: ${moveObj.to}`);

          if (gameMode === 'human-vs-stockfish') {
            setIsHumanTurn(true);
            setStatusMessage("Your turn!");
          } else {
            // Stockfish vs Stockfish - continue automatically
            setTimeout(() => makeStockfishMove(), 1000);
          }
        } else {
          throw new Error(`Invalid move from Stockfish: ${result.bestMove}`);
        }
      } else {
        setStatusMessage("Game over - Stockfish has no moves");
        addTestResult("🏁 Game End", "INFO", "Stockfish has no legal moves");
      }
    } catch (error) {
      setStatusMessage("❌ Stockfish error: " + error.message);
      addTestResult("❌ Stockfish Error", "FAILED", error.message);
    } finally {
      setIsThinking(false);
    }
  };

  const onPieceDrop = (sourceSquare, targetSquare) => {
    if (!isHumanTurn || isThinking) {
      setStatusMessage("Wait for Stockfish!");
      return false;
    }

    // Test move validation
    const moveAttempt = { from: sourceSquare, to: targetSquare, promotion: "q" };
    const moveObj = chess.move(moveAttempt);
    
    if (!moveObj) {
      setStatusMessage("❌ Illegal move!");
      addTestResult("❌ Human Move", "ILLEGAL", `${sourceSquare} → ${targetSquare} is not legal`);
      return false;
    }

    // Valid move
    const uciMove = `${sourceSquare}${targetSquare}${moveObj.promotion || ''}`;
    setChess(new Chess(chess.fen()));
    setMoveHistory(prev => [...prev, `You: ${moveObj.san} (${uciMove})`]);
    setLastMove({ from: sourceSquare, to: targetSquare });
    
    addTestResult("✅ Human Move", "SUCCESS", 
      `Move: ${moveObj.san} (UCI: ${uciMove}) | From: ${sourceSquare} → To: ${targetSquare} | Piece: ${moveObj.piece}`);

    if (gameMode === 'human-vs-stockfish') {
      setIsHumanTurn(false);
      setTimeout(() => makeStockfishMove(), 500);
    } else {
      setStatusMessage("Manual mode - make another move");
    }

    return true;
  };

  const testSpecificPosition = async (fen, testName) => {
    try {
      setCurrentTest(`Testing position: ${testName}`);
      const testChess = new Chess(fen);
      setChess(testChess);
      setMoveHistory([`Testing: ${testName}`]);
      
      if (stockfishReady) {
        const result = await stockfishService.getBestMove(fen, { depth: 15, moveTime: 2000 });
        addTestResult(`🧪 Position Test: ${testName}`, "SUCCESS", 
          `FEN: ${fen} | Best: ${result.bestMove} | Eval: ${result.evaluation?.type === 'cp' ? 
            (result.evaluation.value / 100).toFixed(2) + ' pawns' : 
            'Mate ' + result.evaluation?.value}`);
        setAnalysis(result);
      }
    } catch (error) {
      addTestResult(`❌ Position Test: ${testName}`, "FAILED", error.message);
    }
  };

  const runStockfishTests = async () => {
    if (!stockfishReady) {
      addTestResult("❌ Test Suite", "FAILED", "Stockfish not ready");
      return;
    }

    // Test various positions
    const testPositions = [
      { 
        name: "Starting Position", 
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" 
      },
      { 
        name: "Mate in 1", 
        fen: "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3" 
      },
      { 
        name: "Tactical Shot", 
        fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4" 
      }
    ];

    for (const pos of testPositions) {
      await testSpecificPosition(pos.fen, pos.name);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait between tests
    }
  };


  // Simple fallback render to test if the page loads
  if (!stockfishReady) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>🧪 Stockfish Test Laboratory</h2>
        <p>Loading Stockfish... {statusMessage}</p>
        <div style={{ marginTop: '20px' }}>
          <button onClick={() => navigate('/')} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2>🧪 Stockfish Test Laboratory</h2>
        <button onClick={() => navigate('/')} style={styles.backBtn}>
          ← Back to Dashboard
        </button>
      </div>

      <div style={styles.layout}>
        {/* Left Panel - Controls */}
        <div style={styles.leftPanel}>
          <div style={styles.card}>
            <h3>🎮 Game Controls</h3>
            <div style={styles.statusBox}>
              <div style={styles.statusTitle}>Status</div>
              <div style={stockfishReady ? styles.statusReady : styles.statusError}>
                {stockfishReady ? "✅ Stockfish Ready" : "❌ Stockfish Not Ready"}
              </div>
              <div style={styles.statusMessage}>{statusMessage}</div>
            </div>
            
            <div style={styles.buttonGroup}>
              <button onClick={resetGame} style={styles.btn}>🔄 Reset Game</button>
              <button 
                onClick={() => {
                  const newMode = gameMode === 'human-vs-stockfish' ? 'manual' : 'human-vs-stockfish';
                  setGameMode(newMode);
                  setIsHumanTurn(true);
                  setStatusMessage(newMode === 'manual' ? "Manual mode" : "Your turn!");
                }} 
                style={styles.btn}
              >
                {gameMode === 'human-vs-stockfish' ? '👤 Manual Mode' : '🤖 vs Stockfish'}
              </button>
              <button 
                onClick={runStockfishTests} 
                style={styles.testBtn}
                disabled={!stockfishReady}
              >
                🧪 Run Tests
              </button>
            </div>

            <div style={styles.modeInfo}>
              <strong>Mode:</strong> {gameMode === 'human-vs-stockfish' ? 'Human vs Stockfish' : 'Manual Play'}
              <br />
              <strong>Turn:</strong> {isHumanTurn ? 'Your turn' : 'Stockfish thinking...'}
              {isThinking && <span style={styles.thinking}> 🤔</span>}
            </div>
          </div>

          {/* Analysis Panel */}
          {analysis && (
            <div style={styles.card}>
              <h3>📊 Current Analysis</h3>
              <div style={styles.analysisInfo}>
                <div><strong>Best Move:</strong> {analysis.bestMove}</div>
                <div><strong>Evaluation:</strong> {
                  analysis.evaluation?.type === 'cp' 
                    ? `${(analysis.evaluation.value / 100).toFixed(2)} pawns`
                    : analysis.evaluation?.type === 'mate'
                    ? `Mate in ${analysis.evaluation.value}`
                    : 'Unknown'
                }</div>
                {analysis.ponderMove && (
                  <div><strong>Ponder:</strong> {analysis.ponderMove}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Center - Chessboard */}
        <div style={styles.centerPanel}>
          <div style={styles.boardContainer}>
            {(() => {
              try {
                return (
                  <Chessboard
                    position={chess.fen()}
                    onDrop={onPieceDrop}
                    boardWidth={boardSize}
                    boardStyle={{
                      borderRadius: "8px",
                      boxShadow: "0 6px 12px rgba(0,0,0,0.15)",
                      border: "2px solid #8B4513"
                    }}
                    orientation="white"
                    draggable={true}
                    transitionDuration={200}
                    lightSquareStyle={{ backgroundColor: '#EEEED2' }}
                    darkSquareStyle={{ backgroundColor: '#769656' }}
                    lastMove={lastMove}
                  />
                );
              } catch (error) {
                return (
                  <div style={{ 
                    width: boardSize, 
                    height: boardSize, 
                    backgroundColor: '#f0f0f0', 
                    border: '2px solid red',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    color: 'red'
                  }}>
                    Chessboard Error: {error.message}
                  </div>
                );
              }
            })()}
            
            <div style={styles.boardControls}>
              <input
                type="range"
                min="400"
                max="800"
                value={boardSize}
                onChange={(e) => setBoardSize(parseInt(e.target.value))}
                style={styles.sizeSlider}
              />
              <span style={styles.sizeLabel}>Board Size: {boardSize}px</span>
            </div>
          </div>
        </div>

        {/* Right Panel - History & Tests */}
        <div style={styles.rightPanel}>
          <div style={styles.card}>
            <h3>📝 Move History</h3>
            <div style={styles.historyBox}>
              {moveHistory.length === 0 ? (
                <div style={styles.noMoves}>No moves yet</div>
              ) : (
                moveHistory.map((move, i) => (
                  <div key={i} style={styles.moveItem}>
                    <span style={styles.moveNumber}>{Math.floor(i/2) + 1}.</span>
                    <span style={styles.moveText}>{move}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={styles.card}>
            <h3>🔬 Test Results</h3>
            <div style={styles.testBox}>
              {currentTest && (
                <div style={styles.currentTest}>🔄 {currentTest}</div>
              )}
              <div style={styles.testList}>
                {testResults.slice(-10).reverse().map((result, i) => (
                  <div key={i} style={styles.testItem}>
                    <div style={styles.testHeader}>
                      <span style={result.status === 'SUCCESS' ? styles.testSuccess : 
                                   result.status === 'FAILED' ? styles.testError : styles.testInfo}>
                        {result.test}
                      </span>
                      <span style={styles.testTime}>{result.timestamp}</span>
                    </div>
                    <div style={styles.testDetails}>{result.details}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    padding: "20px",
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
    fontFamily: "Arial, sans-serif"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    padding: "0 10px"
  },
  backBtn: {
    padding: "8px 16px",
    backgroundColor: "#6366f1",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px"
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "300px 1fr 350px",
    gap: "20px",
    height: "calc(100vh - 100px)"
  },
  leftPanel: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  centerPanel: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center"
  },
  rightPanel: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  card: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "16px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    border: "1px solid #e5e7eb"
  },
  statusBox: {
    padding: "12px",
    backgroundColor: "#f9fafb",
    borderRadius: "6px",
    marginBottom: "16px"
  },
  statusTitle: {
    fontSize: "14px",
    fontWeight: "600",
    marginBottom: "8px"
  },
  statusReady: {
    color: "#059669",
    fontWeight: "600",
    marginBottom: "4px"
  },
  statusError: {
    color: "#dc2626",
    fontWeight: "600",
    marginBottom: "4px"
  },
  statusMessage: {
    fontSize: "12px",
    color: "#6b7280"
  },
  buttonGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "16px"
  },
  btn: {
    padding: "8px 12px",
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px"
  },
  testBtn: {
    padding: "8px 12px",
    backgroundColor: "#f59e0b",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px"
  },
  modeInfo: {
    fontSize: "12px",
    color: "#4b5563",
    backgroundColor: "#f3f4f6",
    padding: "8px",
    borderRadius: "4px"
  },
  thinking: {
    animation: "pulse 1s infinite"
  },
  boardContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px"
  },
  boardControls: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  sizeSlider: {
    width: "200px"
  },
  sizeLabel: {
    fontSize: "12px",
    color: "#6b7280"
  },
  historyBox: {
    maxHeight: "200px",
    overflowY: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: "4px",
    padding: "8px"
  },
  noMoves: {
    textAlign: "center",
    color: "#9ca3af",
    fontStyle: "italic",
    padding: "20px"
  },
  moveItem: {
    display: "flex",
    alignItems: "center",
    padding: "2px 0",
    fontSize: "13px"
  },
  moveNumber: {
    minWidth: "30px",
    color: "#6b7280"
  },
  moveText: {
    fontFamily: "monospace",
    flex: 1
  },
  testBox: {
    maxHeight: "400px",
    overflowY: "auto"
  },
  currentTest: {
    padding: "8px",
    backgroundColor: "#fef3c7",
    borderRadius: "4px",
    fontSize: "12px",
    marginBottom: "8px",
    color: "#92400e"
  },
  testList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  testItem: {
    padding: "8px",
    border: "1px solid #e5e7eb",
    borderRadius: "4px",
    fontSize: "11px"
  },
  testHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px"
  },
  testSuccess: {
    color: "#059669",
    fontWeight: "600"
  },
  testError: {
    color: "#dc2626",
    fontWeight: "600"
  },
  testInfo: {
    color: "#3b82f6",
    fontWeight: "600"
  },
  testTime: {
    color: "#9ca3af",
    fontSize: "10px"
  },
  testDetails: {
    color: "#4b5563",
    fontSize: "10px",
    wordBreak: "break-word"
  },
  analysisInfo: {
    fontSize: "13px",
    color: "#374151",
    lineHeight: "1.5"
  }
};