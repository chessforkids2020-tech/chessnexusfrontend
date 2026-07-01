import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import stockfishService from '../services/stockfishService';
import './EnginePanel.css';

// ── Shared live Stockfish panel ───────────────────────────────────────────────
// This is the SAME engine panel the Quick Analyze / game-replay board uses, so any
// place that wants a live "top-N lines" Stockfish readout (opening study, masters
// game study, endgame studies) behaves identically and reliably. Extracted from
// GameReplay so there's one battle-tested implementation instead of several.
//
// Props:
//   fen       current position FEN (updates as the user moves)
//   numLines  MultiPV count (default 3)
//   enabled   engine on/off (off = stops thinking, shows nothing)
//   onToggle  flips the on/off switch (optional; hides the switch if omitted)
//   depth     search depth (default 18)

export const ENGINE_LABEL = 'Stockfish 18';
export const ENGINE_DEPTH = 18;
export const ENGINE_LINES = 3;

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Engine line (score is relative to the side to move) → White-perspective string.
function formatEval(line, sideToMove) {
  const sign = sideToMove === 'w' ? 1 : -1;
  if (line.scoreType === 'mate') {
    const m = line.score * sign;
    return (m > 0 ? '+' : '') + 'M' + Math.abs(m);
  }
  const cp = (line.score * sign) / 100;
  return (cp > 0 ? '+' : '') + cp.toFixed(2);
}

// UCI principal variation → readable SAN with move numbers, from `fen`. Never
// emits raw UCI: if a move can't be converted we stop at the SAN we have.
function pvToSan(fen, pv, maxPlies = 8) {
  const out = [];
  try {
    const c = new Chess(!fen || fen === 'start' || fen === 'startpos' ? START_FEN : fen);
    for (let i = 0; i < Math.min(pv.length, maxPlies); i++) {
      const uci = pv[i];
      if (!uci || uci.length < 4) break;
      const moveNo = c.moveNumber();
      const whiteToMove = c.turn() === 'w';
      let mv = null;
      try {
        mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
      } catch { mv = null; }
      if (!mv) break;
      if (whiteToMove) out.push(`${moveNo}.${mv.san}`);
      else if (out.length === 0) out.push(`${moveNo}...${mv.san}`);
      else out.push(mv.san);
    }
  } catch { /* return whatever we managed */ }
  return out.join(' ');
}

export default function EnginePanel({ fen, numLines = ENGINE_LINES, enabled = true, onToggle, depth: maxDepth = ENGINE_DEPTH }) {
  // Keep the lines together with the EXACT fen they were computed for so we never
  // render a PV against a newer position.
  const [result, setResult] = useState({ fen: null, lines: [] });
  const [depth, setDepth] = useState(0);
  const [status, setStatus] = useState('init'); // init | thinking | done | error
  const reqIdRef = useRef(0);

  const lines = result.fen === fen ? result.lines : [];
  const sideToMove = (fen || '').split(' ')[1] === 'b' ? 'b' : 'w';

  useEffect(() => {
    let cancelled = false;
    const myReq = ++reqIdRef.current;

    if (!enabled) {
      stockfishService.stop();
      setResult({ fen: null, lines: [] });
      setDepth(0);
      setStatus('off');
      return () => { cancelled = true; };
    }

    async function run() {
      try {
        if (!stockfishService.isReady()) {
          setStatus('init');
          await stockfishService.init();
        }
        if (cancelled || myReq !== reqIdRef.current) return;
        // Small debounce so StrictMode double-mounts and rapid move-stepping collapse
        // to a single analysis. Without it, the first run's cleanup stop() would kill
        // the second run (shared singleton engine), leaving it stuck on "Analysing…".
        await new Promise((r) => setTimeout(r, 60));
        if (cancelled || myReq !== reqIdRef.current) return;
        setResult({ fen, lines: [] });
        setDepth(0);
        setStatus('thinking');
        await stockfishService.analyzePosition(fen, {
          depth: maxDepth,
          multipv: numLines,
          onUpdate: ({ depth: d, lines: ls }) => {
            if (cancelled || myReq !== reqIdRef.current) return;
            setDepth(d);
            setResult({ fen, lines: ls });
          },
        });
        if (cancelled || myReq !== reqIdRef.current) return;
        setStatus('done');
      } catch {
        if (!cancelled && myReq === reqIdRef.current) setStatus('error');
      }
    }
    run();

    return () => {
      cancelled = true;
      // Only stop if no newer request superseded us — a stale cleanup must NOT stop
      // the engine that a newer run just started.
      if (myReq === reqIdRef.current) stockfishService.stop();
    };
  }, [fen, numLines, enabled, maxDepth]);

  return (
    <div className={`gr-engine${enabled ? '' : ' gr-engine-off'}`}>
      <div className="gr-engine-head">
        <span className="gr-engine-name">🐟 {ENGINE_LABEL}</span>
        <div className="gr-engine-head-right">
          {enabled && (
            <span className="gr-engine-depth">
              {status === 'error' ? 'unavailable'
                : status === 'init' ? 'loading…'
                : `depth ${depth}/${maxDepth}`}
            </span>
          )}
          {onToggle && (
            <button
              type="button"
              className={`gr-engine-toggle${enabled ? ' on' : ''}`}
              onClick={onToggle}
              title={enabled ? 'Turn the engine off' : 'Turn the engine on'}
              aria-pressed={enabled}
            >
              <span className="gr-engine-toggle-knob" />
              <span className="gr-engine-toggle-text">{enabled ? 'On' : 'Off'}</span>
            </button>
          )}
        </div>
      </div>
      {!enabled ? (
        <div className="gr-engine-empty">Engine off — turn it on to see Stockfish lines.</div>
      ) : status === 'error' ? (
        <div className="gr-engine-empty">Engine could not start in this browser.</div>
      ) : lines.length === 0 ? (
        <div className="gr-engine-empty">Analysing…</div>
      ) : (
        <table className="gr-engine-table">
          <tbody>
            {lines.slice(0, numLines).map((ln) => {
              const ev = formatEval(ln, sideToMove);
              const positive = !ev.startsWith('-');
              return (
                <tr key={ln.k} className="gr-engine-tr">
                  <td className={`gr-engine-eval ${positive ? 'pos' : 'neg'}`}>{ev}</td>
                  <td className="gr-engine-pv">{pvToSan(fen, ln.pv)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
