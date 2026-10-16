import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import Chessboard from '../components/Chessboard';
import StudyMovesCard from '../components/StudyMovesCard';
import { useMomentFreePlay } from '../hooks/useMomentFreePlay';
import EnginePanel from '../components/EnginePanel';
import api from '../api';
import './MyMoments.css';
import { t as tr } from '../i18n/LanguageContext';

// The kinds of mistake a moment can be. Mirrors CATEGORIES in
// backend/services/momentCategories.js — the SERVER decides which moments match
// (the rules mix phase, theme, line length and eval), so this list only supplies
// the labels and their order. Adding a bucket means adding it there first.
const MOMENT_CATEGORIES = [
  { key: 'tactics',     icon: '⚔',  label: tr('Tactics') },
  { key: 'defence',     icon: '🛡', label: tr('Defence') },
  { key: 'calculation', icon: '🧠', label: tr('Calculation') },
  // Phase buckets. 'middlegame' must be listed here or the weekly report's
  // "Review your middlegame mistakes" link filters correctly but shows no
  // matching chip, so the student cannot tell what they are looking at.
  { key: 'middlegame',  icon: '🧩', label: tr('Middlegame') },
  { key: 'endgames',    icon: '♟',  label: tr('Endgames') },
  { key: 'opening',     icon: '📖', label: tr('Opening') },
];

// Friendly labels for the extractor's snake_case themes (mirrors GameInsightsPanel).
const THEME_LABEL = {
  mate: '🏁 Checkmate', fork: '⑂ Fork', pin: '📌 Pin', skewer: '🍢 Skewer',
  hanging_piece: '🪝 Hanging Piece', queen_win: '👑 Win the Queen',
  discovered_attack: '💥 Discovered Attack', sacrifice: '🎯 Sacrifice',
  long_combination: '🧩 Combination', tactic: '♟️ Tactic',
};
const themeLabel = (t) => THEME_LABEL[t] || tr('♟️ Tactic');

/**
 * MY MOMENTS — a standalone training destination showing the user's OWN mistakes
 * (blunder-moments) from their real games as a personal collection of puzzles.
 * Fed by the same UserGamePuzzle store as Nexus Guide; solving is RATING-NEUTRAL
 * (the /api/game-insights/:id/solve endpoint never touches liveRating).
 */
export default function MyMoments() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('false'); // 'false' unsolved | 'true' solved | 'all'

  // Which kind of mistake to show. The weekly report's study plan links straight
  // in with ?category=defence, so "you collapsed in 7 of 13 difficult positions"
  // opens exactly those positions instead of every moment the student has.
  const [searchParams, setSearchParams] = useSearchParams();
  // LAND ON "ALL KINDS", even when the report links in with ?category=…
  //
  // Arriving pre-filtered is how students hit an empty page: if that one bucket
  // happens to be empty for them, the first thing they ever see is a blank box
  // with a number above it, and they conclude the feature is broken rather than
  // that they picked a narrow filter. Showing everything first means there is
  // always something on screen; the chip below is highlighted so the category
  // they came for is one click away, not lost.
  const [category, setCategory] = useState('');
  // The category the report wanted, kept only to draw attention to that chip.
  const suggestedCategory = searchParams.get('category') || '';
  // Only shown once the server has told us what a category is called — the
  // buckets are defined in one place (services/momentCategories.js) so the tab
  // labels and the report's counts can never disagree.
  const [catInfo, setCatInfo] = useState(null);
  // The solving board was hardcoded at 420px, which is wider than a phone —
  // so it was clipped mid-board (files a-f visible, the rest cut off). Size it
  // to the viewport instead, still capped at 420 on desktop.
  const [modalBoard, setModalBoard] = useState(420);
  useEffect(() => {
    const fit = () => {
      const vw = document.documentElement.clientWidth || window.innerWidth;
      const vh = window.innerHeight;
      const mobile = vw <= 1024;
      // Mobile: full-screen sheet with an edge-to-edge board (see
      // .mm-modal-board's 100dvw breakout), so take the WHOLE viewport width.
      // Desktop: the panel's own padding is the limit, capped at 420.
      // Desktop: Prev/Next sit in the right-hand column (not under the board),
      // so the board can use nearly the full panel height — up to 560px.
      const byWidth = mobile ? vw : vw - 48;
      const byHeight = mobile ? Math.floor(vh * 0.6) : vh - 150;
      const cap = mobile ? Infinity : 560;
      setModalBoard(Math.max(240, Math.min(byWidth, byHeight, cap)));
    };
    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', fit);
    return () => {
      window.removeEventListener('resize', fit);
      window.removeEventListener('orientationchange', fit);
    };
  }, []);
  const [puzzles, setPuzzles] = useState([]);
  const [counts, setCounts] = useState({ total: 0, unsolved: 0, totalAllKinds: 0 });
  const [loading, setLoading] = useState(true);

  const [active, setActive] = useState(null);
  // A FROZEN copy of the list taken when the student opens their first moment.
  // Solving reloads the grid (a solved moment leaves the "To practise" tab), so
  // walking `puzzles` directly would make Next skip the neighbour of whatever
  // just vanished. The session list keeps the running order stable until the
  // student closes the modal.
  const [session, setSession] = useState([]);
  const [fen, setFen] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [playedMove, setPlayedMove] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [explainText, setExplainText] = useState('');
  const [explainAI, setExplainAI] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const reloadRef = useRef(null);

  const load = async (which = filter, cat = category) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ solved: which });
      if (cat) qs.set('category', cat);
      // Scope to one report's period when the link carries it, so "your
      // middlegame mistakes" means THIS week's, not every one ever recorded.
      const since = searchParams.get('since');
      const until = searchParams.get('until');
      if (since) qs.set('since', since);
      if (until) qs.set('until', until);

      const res = await api.get(`/api/game-insights/puzzles?${qs.toString()}`);
      setPuzzles(res.data.puzzles || []);
      setCounts({
        total: res.data.total || 0,
        unsolved: res.data.unsolved || 0,
        totalAllKinds: res.data.totalAllKinds ?? res.data.total ?? 0,
      });
      setCatInfo(res.data.category || null);
    } catch (e) {
      setPuzzles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filter, category); /* eslint-disable-next-line */ }, [filter, category]);
  useEffect(() => () => clearTimeout(reloadRef.current), []);

  // Reset every scrap of solving state. Shared by "open from the grid" and
  // "step to the next moment" so a revealed answer or a wrong-move flash can
  // never bleed from one position into the next.
  const showPuzzle = (p) => {
    setActive(p); setFen(p.fen); setFeedback(null); setPlayedMove(null); setRevealed(false);
    setExplainText(p.explanation || ''); setExplainAI(!!p.explanationIsAI); setExplaining(false);
  };
  const openPuzzle = (p) => {
    // Freeze the order the student sees at the moment they start solving.
    setSession(puzzles);
    showPuzzle(p);
  };
  const closePuzzle = () => {
    // Anything solved during the session was only marked in place, so bring the
    // grid back in line with the server now that the student is done with it.
    const solvedAny = session.some(p => p.solved) || revealed;
    setActive(null); setSession([]); setFen(null); setFeedback(null); setPlayedMove(null); setRevealed(false);
    setExplainText(''); setExplainAI(false); setExplaining(false);
    if (solvedAny) load(filter, category);
  };

  // Where the open moment sits in the frozen list, and its neighbours.
  const sessionIndex = active && session.length
    ? session.findIndex(p => p._id === active._id) : -1;
  const prevPuzzle = sessionIndex > 0 ? session[sessionIndex - 1] : null;
  const nextPuzzle = sessionIndex >= 0 && sessionIndex < session.length - 1
    ? session[sessionIndex + 1] : null;

  // Stepping away cancels the pending grid reload from a solve: letting it fire
  // mid-session would swap the list out from under the student while they are
  // still working, which is the very thing the frozen session prevents.
  const goToPuzzle = (p) => {
    if (!p) return;
    clearTimeout(reloadRef.current);
    showPuzzle(p);
  };

  // Arrow keys and Escape. A student working through 50 moments should be able
  // to keep both hands where they are; Escape is the expected way out of a
  // modal. Bound only while one is open so the grid keeps normal key handling.
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { closePuzzle(); return; }
      // Never steal the arrows from a text field or a native control.
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
      if (e.key === 'ArrowRight' && nextPuzzle) { e.preventDefault(); goToPuzzle(nextPuzzle); }
      if (e.key === 'ArrowLeft' && prevPuzzle) { e.preventDefault(); goToPuzzle(prevPuzzle); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    /* eslint-disable-next-line */
  }, [active, nextPuzzle, prevPuzzle]);

  const explainMore = async () => {
    if (!active || explaining || explainAI) return;
    setExplaining(true);
    try {
      const res = await api.post(`/api/game-insights/${active._id}/explain`);
      if (res.data?.explanation) {
        setExplainText(res.data.explanation);
        setExplainAI(!!res.data.ai);
      }
    } catch (e) { /* keep rule-based text */ }
    finally { setExplaining(false); }
  };

  const handleDrop = (from, to) => {
    if (!active || feedback === 'correct') return false;
    const chess = new Chess(active.fen);
    let move;
    try {
      const piece = chess.get(from);
      const promotion = piece && piece.type === 'p' && (to[1] === '8' || to[1] === '1') ? 'q' : undefined;
      move = chess.move({ from, to, promotion });
    } catch (e) { return false; }
    if (!move) return false;

    const accepted = (active.acceptableMoves && active.acceptableMoves.length)
      ? active.acceptableMoves : [active.bestMove];
    const correct = accepted.includes(move.san);
    setFen(chess.fen());
    setFeedback(correct ? 'correct' : 'wrong');
    if (correct) setPlayedMove(move.san);
    // Rating-neutral solve — this endpoint never changes liveRating.
    api.post(`/api/game-insights/${active._id}/solve`, { solved: correct }).catch(() => {});

    // Mark it solved IN PLACE rather than refetching. Reloading with the
    // default solved=false filter deleted the card the student had just solved
    // — the grid visibly lost a tile under their hand, and the frozen session
    // was the only reason Next still worked at all. The grid now refreshes when
    // the modal closes (see closePuzzle), so the list only changes between
    // sessions, never during one.
    if (correct) {
      setRevealed(true);
      setPuzzles(list => list.map(x => x._id === active._id ? { ...x, solved: true } : x));
      setSession(list => list.map(x => x._id === active._id ? { ...x, solved: true } : x));
      setCounts(c => ({ ...c, unsolved: Math.max(0, (c.unsolved || 0) - 1) }));
    }
    else { setTimeout(() => setFen(active.fen), 700); }
    return true;
  };

  const showBestMove = () => {
    if (!active) return;
    try {
      const chess = new Chess(active.fen);
      const moved = chess.move(active.bestMove, { sloppy: true });
      if (moved) setFen(chess.fen());
    } catch (e) { /* keep fen */ }
    setRevealed(true);
    setFeedback('wrong');
    api.post(`/api/game-insights/${active._id}/solve`, { solved: false }).catch(() => {});
  };

  // Once answered (solved or best move shown) the board is a free analysis
  // board — solution as the mainline, any move a sideline, engine on demand.
  // Same as Healthy Mix after a puzzle; see hooks/useMomentFreePlay.js.
  const done = !!active && (feedback === 'correct' || revealed);
  const fp = useMomentFreePlay(active, done, playedMove);

  return (
    <div className="mm-page">
      <div className="mm-header">
        <div className="mm-header-icon">🎯</div>
        <div style={{ flex: 1 }}>
          <h1 className="mm-title">{tr("My Moments")}</h1>
          <p className="mm-subtitle">
            {tr("The exact mistakes from your own games — solve them to lock in the lesson.")}
            <strong> {tr("Practice only: no rating change.")}</strong>
          </p>
        </div>
      </div>

      {/* MOBILE: the same choices as a native <select>. Eight chips wrapped to
          three rows on a phone and pushed the actual moments off screen; a
          dropdown is one row. CSS shows exactly one of these two controls, so
          the desktop chip row is untouched. */}
      <div className="mm-cats-select">
        <label className="mm-cats-select-label" htmlFor="mm-kind">{tr("Kind")}</label>
        <select
          id="mm-kind"
          value={category || ''}
          onChange={(e) => {
            const v = e.target.value;
            setCategory(v);
            const next = new URLSearchParams(searchParams);
            if (v) next.set('category', v); else next.delete('category');
            setSearchParams(next, { replace: true });
          }}
        >
          <option value="">{tr("All kinds")}</option>
          {MOMENT_CATEGORIES.map(c => (
            <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
          ))}
        </select>
      </div>

      {/* Category chips. Kept ABOVE the solved/unsolved tabs because they answer
          a different question — "which kind of mistake" vs "have I done it yet". */}
      <div className="mm-cats">
        <button
          className={`mm-cat${!category ? ' active' : ''}`}
          onClick={() => {
            setCategory('');
            // Drop only the category. setSearchParams({}) also threw away
            // since/until, so clearing the kind silently widened the view to
            // every mistake the student had ever made.
            const next = new URLSearchParams(searchParams);
            next.delete('category');
            setSearchParams(next, { replace: true });
          }}
        >
          {tr("All kinds")}
        </button>
        {MOMENT_CATEGORIES.map(c => (
          <button
            key={c.key}
            className={`mm-cat${category === c.key ? ' active' : ''}${
              !category && suggestedCategory === c.key ? ' suggested' : ''}`}
            onClick={() => {
              setCategory(c.key);
              // Keep the URL honest so the view can be shared or reloaded, and
              // KEEP since/until — dropping them silently widened the view from
              // "this report's mistakes" to "every mistake ever" the moment a
              // student touched a chip.
              const next = new URLSearchParams(searchParams);
              next.set('category', c.key);
              setSearchParams(next, { replace: true });
            }}
          >
            <span aria-hidden="true">{c.icon}</span> {c.label}
          </button>
        ))}
      </div>

      {category && catInfo?.blurb && (
        <p className="mm-cat-blurb">{catInfo.blurb}</p>
      )}

      <div className="mm-tabs">
        <button className={`mm-tab${filter === 'false' ? ' active' : ''}`} onClick={() => setFilter('false')}>
          To practise{counts.unsolved ? ` (${counts.unsolved})` : ''}
        </button>
        <button className={`mm-tab${filter === 'true' ? ' active' : ''}`} onClick={() => setFilter('true')}>
          {tr("Solved")}
        </button>
        <button className={`mm-tab${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>
          All{counts.total ? ` (${counts.total})` : ''}
        </button>
      </div>

      {loading ? (
        <div className="mm-empty">{tr("Loading your moments…")}</div>
      ) : puzzles.length === 0 ? (
        <div className="mm-empty">
          {counts.totalAllKinds === 0 ? (
            <>
              <p>{tr("You haven't collected any moments yet.")}</p>
              <p className="mm-empty-sub">{tr("Analyse your games and the Nexus Guide will turn your mistakes into puzzles here.")}</p>
              <button className="mm-cta" onClick={() => navigate('/game-analysis')}>{tr("🔎 Analyse my games")}</button>
            </>
          ) : category ? (
            /* The student HAS moments, just none of this kind. Say so plainly and
               offer the way out — "Nothing here, try another tab" left them to
               guess which tab, and reading it as "the app is broken" was the
               fairer interpretation. */
            <>
              <p>No {catInfo?.label?.toLowerCase() || tr('moments of this kind')} to practise here.</p>
              <p className="mm-empty-sub">
                You have {counts.totalAllKinds} moment{counts.totalAllKinds === 1 ? '' : 's'} in total.
              </p>
              <button className="mm-cta" onClick={() => { setCategory(''); const n = new URLSearchParams(searchParams); n.delete('category'); setSearchParams(n, { replace: true }); }}>
                {tr("Show all kinds")}
              </button>
            </>
          ) : filter === 'false' ? (
            <>
              <p>{tr("Nothing left to practise — you have solved them all.")}</p>
              <button className="mm-cta" onClick={() => setFilter('all')}>{tr("Review the solved ones")}</button>
            </>
          ) : (
            <p>{tr("Nothing here in this view. Try another tab.")}</p>
          )}
        </div>
      ) : (
        <div className="mm-grid">
          {puzzles.map((p) => (
            <button key={p._id} className={`mm-card${p.solved ? ' solved' : ''}`} onClick={() => openPuzzle(p)}>
              <div className="mm-card-board">
                <Chessboard position={p.fen} boardWidth={160} draggable={false} resizable={false} orientation={p.sideToMove} />
              </div>
              <div className="mm-card-info">
                <span className="mm-card-theme">{themeLabel(p.theme)}</span>
                <span className="mm-card-meta">
                  {p.opponentName ? `vs ${p.opponentName} · ` : ''}move {p.moveNumber}
                </span>
                <span className="mm-card-cta">{p.solved ? '✓ Solved · review' : 'Find the better move →'}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Solving modal (mirrors GameInsightsPanel) */}
      {active && (() => {
        // Moment-to-moment navigation. Desktop: top of the right-hand column, so
        // the board gets the panel's full height. Mobile: footer under the board.
        // Either way it is never below the explanation, where students missed it.
        const nav = (
          <>
            <button
              className="mm-nav-btn"
              onClick={() => goToPuzzle(prevPuzzle)}
              disabled={!prevPuzzle}
              aria-label={tr("Previous moment")}
            >{tr("← Prev")}</button>
            <span className="mm-nav-count">
              {sessionIndex >= 0 ? `${sessionIndex + 1} of ${session.length}` : ''}
            </span>
            <button
              className="mm-nav-btn mm-nav-next"
              onClick={() => nextPuzzle ? goToPuzzle(nextPuzzle) : closePuzzle()}
              aria-label={nextPuzzle ? tr('Next moment') : tr('Finish')}
            >{nextPuzzle ? tr('Next moment →') : tr('Done')}</button>
          </>
        );
        return (
        <div className="mm-modal-overlay" onClick={closePuzzle}>
          <div className="mm-modal" onClick={(e) => e.stopPropagation()}>
            <button className="mm-modal-close" onClick={closePuzzle}>✕</button>
            <div className="mm-modal-body">
              <div className="mm-modal-board">
                <Chessboard position={done ? fp.fen : fen} boardWidth={modalBoard}
                  draggable={done || feedback !== 'correct'}
                  onDrop={done ? fp.onDrop : handleDrop} orientation={active.sideToMove} />
              </div>
              <div className="mm-modal-side">
                <div className="mm-nav mm-nav-side">{nav}</div>
                <h3>{themeLabel(active.theme)}</h3>
                <p className="mm-modal-context">
                  {active.opponentName ? `vs ${active.opponentName} · ` : ''}move {active.moveNumber}
                </p>
                <p className="mm-modal-prompt">
                  You played <strong className="mm-bad">{active.blunderMove}</strong> here.
                  <br />Can you find a better move? ({active.sideToMove} to move)
                </p>

                {feedback === 'wrong' && <div className="mm-fb mm-fb-wrong">{tr("Not quite — try again.")}</div>}
                {feedback === 'correct' && (
                  <div className="mm-fb mm-fb-correct">
                    ✓ Yes! <strong>{playedMove || active.bestMove}</strong> is a great move.
                    {playedMove && playedMove !== active.bestMove && (
                      <span className="mm-alt"> (engine's top pick was {active.bestMove})</span>
                    )}
                  </div>
                )}

                {!revealed && feedback !== 'correct' && (
                  <button className="mm-reveal" onClick={showBestMove}>{tr("💡 Show best move")}</button>
                )}

                {revealed && (
                  <div className="mm-answer">
                    {explainText && (
                      <div className="mm-why">
                        <span className="mm-why-avatar">🧙</span>
                        <div>
                          <p className="mm-why-text">{explainText}</p>
                          {!explainAI && (
                            <button className="mm-explain-more" onClick={explainMore} disabled={explaining}>
                              {explaining ? tr('Thinking…') : tr('💡 Explain in more detail')}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    <p>{tr("You should have played:")}</p>
                    <div className="mm-line">
                      {active.solution.map((m, i) => (
                        <span key={i} className={`mm-move ${i === 0 ? 'mm-move-best' : ''}`}>{m}</span>
                      ))}
                    </div>
                    <p className="mm-swing">
                      Your move lost about <strong>{Math.abs(active.evalSwing)}</strong> points of advantage.
                    </p>
                  </div>
                )}

                {done && (
                  <div className="mm-free" data-testid="mm-free">
                    <p className="mm-free-hint">{tr("Free board — play any move for either side to see what happens.")}</p>
                    <StudyMovesCard
                      compact
                      tree={fp.tree} currentId={fp.currentId}
                      onSelect={fp.goTo}
                      onFirst={fp.toStart} onPrev={fp.back} onNext={fp.forward} onLast={fp.toEnd}
                      emptyText=""
                    />
                    <EnginePanel fen={fp.fen} enabled={fp.engineOn} onToggle={fp.toggleEngine} numLines={3} />
                  </div>
                )}


              </div>
            </div>

            <div className="mm-nav mm-nav-foot">{nav}</div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
