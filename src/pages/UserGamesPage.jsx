import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import Chessboard from '../components/Chessboard';
// Reuse the arena games CSS — all .atg-* classes live there
import './arenatournament/ArenaTournamentLeaderboard.css';
import './UserGamesPage.css';

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const formatResult = (result) => {
  if (result === 'white_won') return 'White Won';
  if (result === 'black_won') return 'Black Won';
  if (result === 'draw') return 'Draw';
  if (result === 'aborted') return 'Aborted';
  return result || '—';
};

const buildTree = (startFen, moves) => {
  const nodes = {};
  let n = 0;
  const nid = () => `n${n++}`;
  const fen0 = startFen || DEFAULT_FEN;
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

export default function UserGamesPage() {
  const { displayName } = useParams();
  const navigate = useNavigate();

  const [info, setInfo] = useState(null);   // { displayName, totalCount, lastPlayedAt }
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Modal state
  const [selectedGame, setSelectedGame] = useState(null);
  const [nodes, setNodes] = useState({});
  const [rootId, setRootId] = useState(null);
  const [currentId, setCurrentId] = useState(null);
  const [boardWidth, setBoardWidth] = useState(480);

  /* ── fetch ── */
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || '';
    setLoading(true);
    fetch(`${API_URL}/api/public/player-games/${encodeURIComponent(displayName)}`)
      .then(r => r.json())
      .then(data => {
        if (data.message) { setError(data.message); return; }
        setInfo({ displayName: data.displayName, totalCount: data.totalCount, lastPlayedAt: data.lastPlayedAt });
        setGames(data.games || []);
      })
      .catch(() => setError('Failed to load games.'))
      .finally(() => setLoading(false));
  }, [displayName]);

  /* ── board width ── */
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth, h = window.innerHeight;
      const modalW = Math.min(w * 0.82, 1000);
      const fromW = Math.floor(modalW * 0.58);
      const fromH = Math.floor(h * 0.80);
      setBoardWidth(Math.max(280, Math.min(fromW, fromH, 560)));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  /* ── open/close modal ── */
  const openGame = (game) => {
    const { nodes: ns, rootId: rid } = buildTree(game.startFen, game.moves);
    setSelectedGame(game);
    setNodes(ns);
    setRootId(rid);
    let id = rid;
    while (ns[id]?.childIds.length > 0) id = ns[id].childIds[0];
    setCurrentId(id);
  };
  const closeGame = useCallback(() => {
    setSelectedGame(null);
    setNodes({});
    setRootId(null);
    setCurrentId(null);
  }, []);

  /* ── navigation ── */
  const navStart = () => setCurrentId(rootId);
  const navEnd = () => {
    let id = rootId;
    while (nodes[id]?.childIds.length > 0) id = nodes[id].childIds[0];
    setCurrentId(id);
  };
  const navPrev = () => { const nd = nodes[currentId]; if (nd?.parentId) setCurrentId(nd.parentId); };
  const navNext = () => { const nd = nodes[currentId]; if (nd?.childIds.length > 0) setCurrentId(nd.childIds[0]); };

  /* ── keyboard ── */
  useEffect(() => {
    if (!selectedGame) return;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); navPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); navNext(); }
      else if (e.key === 'Escape') closeGame();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedGame, currentId, nodes, closeGame]);

  /* ── auto-scroll active move ── */
  useEffect(() => {
    if (!currentId) return;
    document.querySelector(`[data-nid="${currentId}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentId]);

  /* ── analysis drop ── */
  const handleDrop = (from, to) => {
    const nd = nodes[currentId];
    if (!nd) return false;
    const chess = new Chess(nd.fen);
    let r;
    try { r = chess.move({ from, to, promotion: 'q' }); } catch { return false; }
    if (!r) return false;
    for (const cId of nd.childIds) {
      if (nodes[cId]?.san === r.san) { setCurrentId(cId); return true; }
    }
    const newId = `v${Date.now()}`;
    setNodes(prev => ({
      ...prev,
      [newId]: { id: newId, fen: chess.fen(), san: r.san, parentId: currentId, childIds: [], mainLine: false, ply: nd.ply + 1 },
      [currentId]: { ...prev[currentId], childIds: [...prev[currentId].childIds, newId] },
    }));
    setCurrentId(newId);
    return true;
  };

  /* ── render move tree ── */
  const renderMoves = (startId, depth = 0) => {
    if (!startId || !nodes[startId]) return [];
    const elems = [];
    let id = startId;
    let prevHadVar = false;
    while (id) {
      const nodeId = id; // capture per-iteration for stable closures
      const nd = nodes[nodeId];
      if (!nd || !nd.san) break;
      const isWhite = nd.ply % 2 === 1;
      const moveNum = Math.ceil(nd.ply / 2);
      const isActive = nodeId === currentId;
      if (isWhite || prevHadVar) {
        elems.push(<span key={`num-${nodeId}`} className="atg-var-num">{moveNum}{isWhite ? '.' : '...'}</span>);
      }
      elems.push(
        <button key={`mv-${nodeId}`} data-nid={nodeId}
          className={`atg-analysis-btn${isActive ? ' atg-analysis-btn--active' : ''}${!nd.mainLine ? ' atg-analysis-btn--var' : ''}`}
          onClick={() => setCurrentId(nodeId)}>
          {nd.san}
        </button>
      );
      const vars = nd.childIds.slice(1);
      prevHadVar = vars.length > 0;
      for (const vId of vars) {
        elems.push(
          <div key={`var-${vId}`} className={`atg-sideline${depth > 0 ? ' atg-sideline--nested' : ''}`}>
            {renderMoves(vId, depth + 1)}
          </div>
        );
      }
      id = nd.childIds[0] || null;
    }
    return elems;
  };

  /* ── filtered games ── */
  const filtered = search.trim()
    ? games.filter(g => {
        const q = search.toLowerCase();
        return (g.whitePlayerDisplayName || '').toLowerCase().includes(q)
          || (g.whitePlayerUsername || '').toLowerCase().includes(q)
          || (g.blackPlayerDisplayName || '').toLowerCase().includes(q)
          || (g.blackPlayerUsername || '').toLowerCase().includes(q);
      })
    : games;

  /* ── render ── */
  if (loading) {
    return (
      <div className="atg-loading">
        <div className="atg-loading-orb" />
        <div className="atg-loading-text">Loading Games…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="atg-error-screen">
        <div className="atg-error-card">
          <div className="atg-error-icon">⚠</div>
          <h2>Could not load games</h2>
          <p>{error}</p>
          <button className="atg-error-back" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </div>
    );
  }

  const currentNode = nodes[currentId] || null;
  const position = currentNode?.fen || DEFAULT_FEN;

  const lastPlayed = info?.lastPlayedAt
    ? new Date(info.lastPlayedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="atg-container upg-container">
      <div className="atg-bg-blob atg-bg-blob-1" />
      <div className="atg-bg-blob atg-bg-blob-2" />
      <div className="atg-bg-blob atg-bg-blob-3" />

      {/* Top bar */}
      <header className="atg-topbar">
        <button className="atg-back-btn" onClick={() => navigate(`/player/${encodeURIComponent(info?.displayName || displayName)}`)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Profile
        </button>

        <div className="atg-topbar-title">
          <span className="atg-topbar-name">{info?.displayName || displayName}</span>
          <span className="atg-topbar-sep">·</span>
          <span className="atg-topbar-sub">Games</span>
        </div>

        <div className="atg-topbar-meta upg-meta">
          <span className="upg-meta-total">{info?.totalCount ?? 0} total games</span>
          {lastPlayed && <span className="upg-meta-last">Last played: {lastPlayed}</span>}
        </div>
      </header>

      <main className="atg-main">
        <div className="atg-games-section atg-games-section--full">

          {/* Search */}
          <div className="atg-search-bar">
            <div className="atg-search-input-wrap">
              <svg className="atg-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input type="text" className="atg-search-input" placeholder="Search by opponent name…"
                value={search} onChange={e => setSearch(e.target.value)} />
              {search && (
                <button type="button" className="atg-search-clear" onClick={() => setSearch('')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
            {search.trim() && (
              <span className="atg-search-results-count">
                {filtered.length} {filtered.length === 1 ? 'game' : 'games'} found
              </span>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="atg-empty">
              <div className="atg-empty-icon">♟</div>
              <p>{search.trim() ? `No games found for "${search}"` : 'No finished games yet.'}</p>
            </div>
          ) : (
            <div className="atg-games-grid">
              {filtered.map(game => (
                <button type="button" key={String(game._id)} className="atg-game-card" onClick={() => openGame(game)}>
                  <div className="atg-card-player atg-card-player--white">
                    <span className="atg-card-color-dot atg-dot-white" />
                    <span>{game.whitePlayerDisplayName || game.whitePlayerUsername}</span>
                  </div>
                  <div className="atg-card-board-wrap">
                    <Chessboard position={game.fen || DEFAULT_FEN} boardWidth={200} draggable={false} orientation="white" />
                    <div className={`atg-result-badge atg-result-${game.result || 'unknown'}`}>
                      {formatResult(game.result)}
                    </div>
                  </div>
                  <div className="atg-card-player atg-card-player--black">
                    <span className="atg-card-color-dot atg-dot-black" />
                    <span>{game.blackPlayerDisplayName || game.blackPlayerUsername}</span>
                  </div>
                  <div className="atg-card-meta">
                    <span>{game.moves?.length ?? 0} moves</span>
                    <span>{game.finishedAt ? new Date(game.finishedAt).toLocaleDateString() : '—'}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ===== GAME MODAL ===== */}
      {selectedGame && (
        <div className="atg-modal-overlay" onClick={closeGame}>
          <div className="atg-modal" onClick={e => e.stopPropagation()}>
            <div className="atg-modal-body">
              <div className="atg-modal-board-col">
                <div className="atg-modal-board-wrap">
                  <Chessboard position={position} boardWidth={boardWidth} draggable={true} onDrop={handleDrop} orientation="white" />
                </div>
              </div>
              <div className="atg-modal-notation-col">
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
                  <button type="button" className="atg-modal-close" onClick={closeGame}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="atg-notation-panel">
                  <div className="atg-notation-scroll">
                    {!rootId || !nodes[rootId]?.childIds.length ? (
                      <div className="atg-notation-empty">No moves recorded</div>
                    ) : (
                      <div className="atg-analysis-moves">
                        {renderMoves(nodes[rootId]?.childIds[0])}
                      </div>
                    )}
                  </div>
                </div>
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
