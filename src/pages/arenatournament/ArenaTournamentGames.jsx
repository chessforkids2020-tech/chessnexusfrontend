import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import Chessboard from '../../components/Chessboard';
import api from '../../api';
import './ArenaTournamentLeaderboard.css';

const DEFAULT_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const formatResult = (result) => {
  if (result === 'white_won') return 'White Won';
  if (result === 'black_won') return 'Black Won';
  if (result === 'draw') return 'Draw';
  if (result === 'aborted') return 'Aborted';
  if (result === 'pending') return 'Pending';
  return result || 'Unknown';
};

let _nodeCount = 0;
const buildAnalysisTree = (startFen, moves) => {
  const nodes = {};
  _nodeCount = 0;
  const nid = () => `n${_nodeCount++}`;
  const fen0 = startFen || DEFAULT_START_FEN;
  const rootId = nid();
  nodes[rootId] = { id: rootId, fen: fen0, san: null, parentId: null, childIds: [], mainLine: true, ply: 0 };
  const chess = new Chess(fen0);
  let parentId = rootId;
  let ply = 0;
  for (const san of (moves || [])) {
    try {
      const r = chess.move(san, { sloppy: true });
      if (!r) break;
      ply++;
      const id = nid();
      nodes[id] = { id, fen: chess.fen(), san: r.san, parentId, childIds: [], mainLine: true, ply };
      nodes[parentId].childIds.push(id);
      parentId = id;
    } catch { break; }
  }
  return { nodes, rootId };
};

export default function ArenaTournamentGames() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [analysisNodes, setAnalysisNodes] = useState({});
  const [currentNodeId, setCurrentNodeId] = useState(null);
  const [analysisRoot, setAnalysisRoot] = useState(null);
  const [modalBoardWidth, setModalBoardWidth] = useState(480);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const updateModalBoardWidth = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      // Compact: board takes ~55% of modal width, modal ~80vw, max 600px board
      const modalW = Math.min(width * 0.82, 1000);
      const boardFromWidth = Math.floor(modalW * 0.58);
      const boardFromHeight = Math.floor(height * 0.80);
      setModalBoardWidth(Math.max(280, Math.min(boardFromWidth, boardFromHeight, 560)));
    };
    updateModalBoardWidth();
    window.addEventListener('resize', updateModalBoardWidth);
    return () => window.removeEventListener('resize', updateModalBoardWidth);
  }, []);

  useEffect(() => {
    // Track page view (works for guests and logged-in users)
    api.post(`/api/arenatournament/${tournamentId}/track-games-view`).catch(() => {});
  }, [tournamentId]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [detailsResponse, gamesResponse] = await Promise.all([
          api.get(`/api/arenatournament/details/${tournamentId}`),
          api.get(`/api/arenatournament/${tournamentId}/games`)
        ]);
        setTournament(detailsResponse.data.tournament || null);
        setGames(gamesResponse.data.games || []);
      } catch (err) {
        console.error('Failed to load arena tournament games:', err);
        setError('Unable to load tournament games.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tournamentId]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  };

  const openGameModal = (game) => {
    const { nodes, rootId } = buildAnalysisTree(game.startFen, game.moves);
    setSelectedGame(game);
    setAnalysisNodes(nodes);
    setAnalysisRoot(rootId);
    let nodeId = rootId;
    while (nodes[nodeId].childIds.length > 0) nodeId = nodes[nodeId].childIds[0];
    setCurrentNodeId(nodeId);
  };

  const closeGameModal = () => {
    setSelectedGame(null);
    setAnalysisNodes({});
    setCurrentNodeId(null);
    setAnalysisRoot(null);
  };

  const navStart = () => setCurrentNodeId(analysisRoot);
  const navEnd = () => {
    let nodeId = analysisRoot;
    while (analysisNodes[nodeId]?.childIds.length > 0) nodeId = analysisNodes[nodeId].childIds[0];
    setCurrentNodeId(nodeId);
  };
  const navPrev = () => {
    const node = analysisNodes[currentNodeId];
    if (node?.parentId) setCurrentNodeId(node.parentId);
  };
  const navNext = () => {
    const node = analysisNodes[currentNodeId];
    if (node?.childIds.length > 0) setCurrentNodeId(node.childIds[0]);
  };

  const handlePieceDrop = (sourceSquare, targetSquare) => {
    const node = analysisNodes[currentNodeId];
    if (!node) return false;
    const chess = new Chess(node.fen);
    let result;
    try { result = chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' }); }
    catch { return false; }
    if (!result) return false;
    for (const cId of node.childIds) {
      if (analysisNodes[cId]?.san === result.san) { setCurrentNodeId(cId); return true; }
    }
    const newId = `v${Date.now()}`;
    const newNode = { id: newId, fen: chess.fen(), san: result.san, parentId: currentNodeId, childIds: [], mainLine: false, ply: node.ply + 1 };
    setAnalysisNodes(prev => ({
      ...prev,
      [newId]: newNode,
      [currentNodeId]: { ...prev[currentNodeId], childIds: [...prev[currentNodeId].childIds, newId] },
    }));
    setCurrentNodeId(newId);
    return true;
  };

  // Keyboard navigation
  useEffect(() => {
    if (!selectedGame) return;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); navPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); navNext(); }
      else if (e.key === 'Escape') closeGameModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedGame, currentNodeId, analysisNodes]);

  // Auto-scroll active move into view
  useEffect(() => {
    if (!currentNodeId) return;
    const el = document.querySelector(`[data-nid="${currentNodeId}"]`);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentNodeId]);

  if (loading) {
    return (
      <div className="atg-loading">
        <div className="atg-loading-orb" />
        <div className="atg-loading-text">Loading Games...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="atg-error-screen">
        <div className="atg-error-card">
          <div className="atg-error-icon">⚠</div>
          <h2>Failed to Load</h2>
          <p>{error}</p>
          <button onClick={() => navigate(`/arenatournament/leaderboard/${tournamentId}`)} className="atg-error-back">
            ← Back to Results
          </button>
        </div>
      </div>
    );
  }

  const currentNode = analysisNodes[currentNodeId] || null;
  const activePosition = currentNode?.fen || DEFAULT_START_FEN;

  const renderMoves = (startNodeId, depth = 0) => {
    if (!startNodeId || !analysisNodes[startNodeId]) return [];
    const elems = [];
    let nodeId = startNodeId;
    let prevHadVariation = false;
    while (nodeId) {
      const nid = nodeId; // capture per-iteration for stable closures
      const nd = analysisNodes[nid];
      if (!nd || !nd.san) break;
      const isWhite = nd.ply % 2 === 1;
      const moveNum = Math.ceil(nd.ply / 2);
      const isActive = nid === currentNodeId;
      if (isWhite || prevHadVariation) {
        elems.push(
          <span key={`num-${nid}`} className="atg-var-num">
            {moveNum}{isWhite ? '.' : '...'}
          </span>
        );
      }
      elems.push(
        <button
          key={`mv-${nid}`}
          data-nid={nid}
          className={`atg-analysis-btn${isActive ? ' atg-analysis-btn--active' : ''}${!nd.mainLine ? ' atg-analysis-btn--var' : ''}`}
          onClick={() => setCurrentNodeId(nid)}
        >
          {nd.san}
        </button>
      );
      const variations = nd.childIds.slice(1);
      prevHadVariation = variations.length > 0;
      for (const varId of variations) {
        elems.push(
          <div key={`var-${varId}`} className={`atg-sideline${depth > 0 ? ' atg-sideline--nested' : ''}`}>
            {renderMoves(varId, depth + 1)}
          </div>
        );
      }
      nodeId = nd.childIds[0] || null;
    }
    return elems;
  };

  const filteredGames = searchQuery.trim()
    ? games.filter((g) => {
        const q = searchQuery.trim().toLowerCase();
        return (
          (g.whitePlayerDisplayName || '').toLowerCase().includes(q) ||
          (g.whitePlayerUsername || '').toLowerCase().includes(q) ||
          (g.blackPlayerDisplayName || '').toLowerCase().includes(q) ||
          (g.blackPlayerUsername || '').toLowerCase().includes(q)
        );
      })
    : games;

  return (
    <div className="atg-container">
      {/* Ambient background blobs */}
      <div className="atg-bg-blob atg-bg-blob-1" />
      <div className="atg-bg-blob atg-bg-blob-2" />
      <div className="atg-bg-blob atg-bg-blob-3" />

      {/* Top bar */}
      <header className="atg-topbar">
        <button
          className="atg-back-btn"
          onClick={() => navigate(`/arenatournament/leaderboard/${tournamentId}`)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Results
        </button>

        <div className="atg-topbar-title">
          <span className="atg-topbar-name">{tournament?.name || 'Arena Tournament'}</span>
          <span className="atg-topbar-sep">·</span>
          <span className="atg-topbar-sub">Games</span>
        </div>

        <div className="atg-topbar-meta">
          <span className={`atg-status-chip atg-status-${tournament?.status}`}>
            {tournament?.status?.toUpperCase()}
          </span>
          <span className="atg-game-count">{games.length} games</span>
        </div>
      </header>

      {/* Main body */}
      <main className="atg-main">
        <div className="atg-games-section atg-games-section--full">
          {/* Search bar */}
          <div className="atg-search-bar">
            <div className="atg-search-input-wrap">
              <svg className="atg-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="atg-search-input"
                placeholder="Search by player name…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button type="button" className="atg-search-clear" onClick={() => setSearchQuery('')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
            {searchQuery.trim() && (
              <span className="atg-search-results-count">
                {filteredGames.length} {filteredGames.length === 1 ? 'game' : 'games'} found
              </span>
            )}
          </div>

          {filteredGames.length === 0 ? (
            <div className="atg-empty">
              <div className="atg-empty-icon">♟</div>
              <p>{searchQuery.trim() ? `No games found for "${searchQuery}"` : 'No finished games yet for this tournament.'}</p>
            </div>
          ) : (
            <div className="atg-games-grid">
              {filteredGames.map((game) => (
                <button
                  type="button"
                  key={String(game._id)}
                  className="atg-game-card"
                  onClick={() => openGameModal(game)}
                >
                  {/* Top player (White) */}
                  <div className="atg-card-player atg-card-player--white">
                    <span className="atg-card-color-dot atg-dot-white" />
                    <span>{game.whitePlayerDisplayName || game.whitePlayerUsername}</span>
                  </div>

                  {/* Mini board */}
                  <div className="atg-card-board-wrap">
                    <Chessboard
                      position={game.fen || DEFAULT_START_FEN}
                      boardWidth={200}
                      draggable={false}
                      orientation="white"
                    />
                    <div className={`atg-result-badge atg-result-${game.result || 'unknown'}`}>
                      {formatResult(game.result)}
                    </div>
                  </div>

                  {/* Bottom player (Black) */}
                  <div className="atg-card-player atg-card-player--black">
                    <span className="atg-card-color-dot atg-dot-black" />
                    <span>{game.blackPlayerDisplayName || game.blackPlayerUsername}</span>
                  </div>

                  {/* Meta */}
                  <div className="atg-card-meta">
                    <span>{game.moves?.length ?? 0} moves</span>
                    <span>{game.startedAt ? new Date(game.startedAt).toLocaleDateString() : '—'}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ===== GAME MODAL ===== */}
      {selectedGame && (
        <div className="atg-modal-overlay" onClick={closeGameModal}>
          <div className="atg-modal" onClick={(e) => e.stopPropagation()}>

            {/* Modal body */}
            <div className="atg-modal-body">
              {/* Board — no controls here, fills the full column */}
              <div className="atg-modal-board-col">
                <div className="atg-modal-board-wrap">
                  <Chessboard
                    position={activePosition}
                    boardWidth={modalBoardWidth}
                    draggable={true}
                    onDrop={handlePieceDrop}
                    orientation="white"
                  />
                </div>
              </div>

              {/* Move list + controls on the right */}
              <div className="atg-modal-notation-col">

                {/* Title: players + result + close — moved here from the top strip */}
                <div className="atg-modal-header">
                  <div className="atg-modal-players">
                    <span className="atg-modal-player atg-modal-player--white">
                      <span className="atg-modal-color-dot atg-dot-white" />
                      {selectedGame.whitePlayerDisplayName || selectedGame.whitePlayerUsername}
                    </span>
                    <span className="atg-modal-vs">vs</span>
                    <span className="atg-modal-player atg-modal-player--black">
                      <span className="atg-modal-color-dot atg-dot-black" />
                      {selectedGame.blackPlayerDisplayName || selectedGame.blackPlayerUsername}
                    </span>
                  </div>
                  <div className={`atg-modal-result atg-result-${selectedGame.result || 'unknown'}`}>
                    {formatResult(selectedGame.result)}
                  </div>
                  <button type="button" className="atg-modal-close" onClick={closeGameModal}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="atg-notation-panel">
                  {/* Scrollable analysis move tree — no fixed header */}
                  <div className="atg-notation-scroll">
                    {!analysisRoot || !analysisNodes[analysisRoot]?.childIds.length ? (
                      <div className="atg-notation-empty">No moves recorded</div>
                    ) : (
                      <div className="atg-analysis-moves">
                        {renderMoves(analysisNodes[analysisRoot]?.childIds[0])}
                      </div>
                    )}
                  </div>
                </div>

                {/* Controls — navigation + analysis hint */}
                <div className="atg-controls">
                  <button type="button" className="atg-ctrl-btn" onClick={navStart} title="Start">⏮</button>
                  <button type="button" className="atg-ctrl-btn" onClick={navPrev} title="Previous">◀</button>
                  <div className="atg-ctrl-counter">
                    <span className="atg-ctrl-cur">{currentNode?.ply ?? 0}</span>
                    <span className="atg-ctrl-sep">/</span>
                    <span className="atg-ctrl-tot">{selectedGame.moves?.length ?? 0}</span>
                  </div>
                  <button type="button" className="atg-ctrl-btn" onClick={navNext} title="Next">▶</button>
                  <button type="button" className="atg-ctrl-btn" onClick={navEnd} title="End">⏭</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}