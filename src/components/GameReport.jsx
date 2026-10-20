// GameReport.jsx — per-player report for one analysed game (/game/:type/:id).
//
// Built only from the analyzeGame rows the page already has — no extra engine
// work. Shows, for White or Black (the viewer's own side first) or both side by
// side: move quality + average centipawn loss, accuracy per game phase, and
// which piece the errors were made with.

import React, { useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { t as tr } from '../i18n/LanguageContext';
import TempoList from './TempoList';

// analyzeGame's win curve is 100 / (1 + e^(-K·cp)), so a stored win % maps back
// to the exact centipawn eval. Evals are capped at ±1000 like Lichess, so a
// mate swing counts as one big loss instead of wrecking the average.
const K = 0.00368208;
const CP_CAP = 1000;
function winToCp(w) {
  const p = Math.min(99.999, Math.max(0.001, w));
  return Math.max(-CP_CAP, Math.min(CP_CAP, -Math.log(100 / p - 1) / K));
}

// Same accuracy formula as the page's info card, so the numbers agree.
const moveAccuracy = (drop) => Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * drop) - 3.1669));

// Same phase rule as the "Analyze my games" report (gamePhaseAnalyzer.js):
// moves 1-10 opening, then endgame once queens/rooks/minors total ≤ 13.
const PHASE_MATERIAL = { q: 9, r: 5, b: 3, n: 3 };
function phaseAfter(plyIndex, chess) {
  if (Math.floor(plyIndex / 2) + 1 <= 10) return 'opening';
  let total = 0;
  for (const row of chess.board()) for (const sq of row) if (sq) total += PHASE_MATERIAL[sq.type] || 0;
  return total <= 13 ? 'endgame' : 'middlegame';
}

const PHASES = [
  { key: 'opening', label: tr('Opening'), icon: '♟' },
  { key: 'middlegame', label: tr('Middlegame'), icon: '⚔' },
  { key: 'endgame', label: tr('Endgame'), icon: '👑' },
];
// Lichess style: only the three error marks. "Best" (= exactly the engine's
// move) and "Good" (= everything else unflagged) were removed — the analysis
// no longer marks them anywhere, so counting them only confused.
const QUALITY = [
  { key: 'inaccuracy', label: tr('Inaccuracy'), mark: '?!' },
  { key: 'mistake', label: tr('Mistake'), mark: '?' },
  { key: 'blunder', label: tr('Blunder'), mark: '??' },
];
const PIECES = [
  { key: 'p', label: tr('Pawn'), glyph: '♙' },
  { key: 'n', label: tr('Knight'), glyph: '♘' },
  { key: 'b', label: tr('Bishop'), glyph: '♗' },
  { key: 'r', label: tr('Rook'), glyph: '♖' },
  { key: 'q', label: tr('Queen'), glyph: '♕' },
  { key: 'k', label: tr('King'), glyph: '♔' },
];
const ERRORS = ['inaccuracy', 'mistake', 'blunder'];

function emptySide() {
  const phase = () => ({ moves: 0, accSum: 0, cplSum: 0, inaccuracy: 0, mistake: 0, blunder: 0 });
  return {
    moves: 0, accSum: 0, cplSum: 0,
    quality: { inaccuracy: 0, mistake: 0, blunder: 0 },
    phases: { opening: phase(), middlegame: phase(), endgame: phase() },
    pieces: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
  };
}

function buildReport(rows, startFen) {
  const chess = startFen ? new Chess(startFen) : new Chess();
  const out = { w: emptySide(), b: emptySide() };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    let mv;
    try { mv = chess.move(r.san); } catch { mv = null; }
    if (!mv) break;
    const s = out[mv.color];
    const sign = mv.color === 'w' ? 1 : -1;
    const cpl = Math.max(0, sign * (winToCp(r.winBefore) - winToCp(r.winAfter)));
    const acc = moveAccuracy(r.drop || 0);
    const quality = ERRORS.includes(r.classification) ? r.classification : null;
    const ph = s.phases[phaseAfter(i, chess)];

    s.moves++; s.accSum += acc; s.cplSum += cpl;
    ph.moves++; ph.accSum += acc; ph.cplSum += cpl;
    if (quality) { s.quality[quality]++; ph[quality]++; s.pieces[mv.piece]++; }
  }
  const finish = (s) => ({
    moves: s.moves,
    accuracy: s.moves ? Math.round(s.accSum / s.moves) : null,
    acpl: s.moves ? Math.round(s.cplSum / s.moves) : null,
    quality: s.quality,
    phases: Object.fromEntries(Object.entries(s.phases).map(([k, p]) => [k, {
      moves: p.moves,
      accuracy: p.moves ? Math.round(p.accSum / p.moves) : null,
      acpl: p.moves ? Math.round(p.cplSum / p.moves) : null,
      inaccuracy: p.inaccuracy, mistake: p.mistake, blunder: p.blunder,
    }])),
    pieces: s.pieces,
  });
  return { white: finish(out.w), black: finish(out.b) };
}

const accTone = (a) => (a == null ? '' : a >= 85 ? 'good' : a >= 65 ? 'ok' : 'bad');

function ErrorChips({ p }) {
  if (!p.inaccuracy && !p.mistake && !p.blunder) return <span className="sgr-clean">clean</span>;
  return (
    <span className="sgr-chips">
      {p.inaccuracy > 0 && <span className="sgr-chip q-inaccuracy">{p.inaccuracy} ?!</span>}
      {p.mistake > 0 && <span className="sgr-chip q-mistake">{p.mistake} ?</span>}
      {p.blunder > 0 && <span className="sgr-chip q-blunder">{p.blunder} ??</span>}
    </span>
  );
}

// "⏱ Tempo lost" value for one side: a number, or "…45%" while still checking.
// `tempo` = { status: 'running'|'done'|'error', progress?, events? } from the page.
function tempoCount(tempo, side) {
  if (!tempo || tempo.status === 'error') return null;
  if (tempo.status === 'running') return null;
  return tempo.events.filter(e => e.side === side).reduce((n, e) => n + e.tempi, 0);
}

function SideView({ s, side, tempo, onSeek }) {
  const tempoN = tempoCount(tempo, side);
  const errorTotal = PIECES.reduce((n, pc) => n + s.pieces[pc.key], 0);
  const maxPiece = Math.max(1, ...PIECES.map(pc => s.pieces[pc.key]));
  const worst = errorTotal ? PIECES.reduce((a, b) => (s.pieces[b.key] > s.pieces[a.key] ? b : a)) : null;
  return (
    <div className="sgr-grid">
      <section className="sgr-card sgr-card--wide">
        <h4 className="sgr-card-title">{tr("🎯 Move quality")}</h4>
        <div className="sgr-mq-row">
          <div className="sgr-big-row">
            <div className="sgr-big">
              <span className="sgr-big-num">{s.acpl}</span>
              <span className="sgr-big-label">{tr("avg centipawn loss")}</span>
            </div>
            <div className="sgr-big">
              <span className={`sgr-big-num tone-${accTone(s.accuracy)}`}>{s.accuracy}%</span>
              <span className="sgr-big-label">{tr("accuracy")}</span>
            </div>
          </div>
          <div className="sgr-qlist">
            {QUALITY.map(q => (
              <div key={q.key} className="sgr-qitem">
                <span className={`sgr-qmark q-${q.key}`}>{q.mark}</span>
                <span className="sgr-qlabel">{q.label}</span>
                <b>{s.quality[q.key]}</b>
              </div>
            ))}
            {/* Middlegame tempo (utils/tempoAnalysis) — runs after the review. */}
            {tempo && tempo.status !== 'error' && (
              <div className="sgr-qitem">
                <span className="sgr-qmark q-tempo">⏱</span>
                <span className="sgr-qlabel">{tr("Tempo lost")}</span>
                {tempo.status === 'running'
                  ? <span className="sgr-qpending">{tr("checking… {p}%", { p: tempo.progress || 0 })}</span>
                  : <b>{tempoN}</b>}
              </div>
            )}
          </div>
        </div>
        {tempo?.status === 'done' && (
          <TempoList events={tempo.events.filter(e => e.side === side)} onSeek={onSeek} />
        )}
        <p className="sgr-note">Centipawn loss = how much each move gave away vs the engine&apos;s best (100 = one pawn). Lower is better.</p>
      </section>

      <section className="sgr-card">
        <h4 className="sgr-card-title">{tr("📊 Game phases")}</h4>
        {PHASES.map(ph => {
          const p = s.phases[ph.key];
          return (
            <div key={ph.key} className="sgr-phase">
              <span className="sgr-phase-name"><span className="sgr-phase-icon">{ph.icon}</span>{ph.label}</span>
              {p.moves ? (
                <>
                  <div className="sgr-phase-bar"><div className={`tone-${accTone(p.accuracy)}`} style={{ width: `${p.accuracy}%` }} /></div>
                  <span className={`sgr-phase-acc tone-${accTone(p.accuracy)}`}>{p.accuracy}%</span>
                  <span className="sgr-phase-sub">
                    {p.moves} {tr("moves ·")} {p.acpl} {tr("cpl ·")} <ErrorChips p={p} />
                  </span>
                </>
              ) : (
                <span className="sgr-phase-none">{tr("not reached")}</span>
              )}
            </div>
          );
        })}
      </section>

      <section className="sgr-card">
        <h4 className="sgr-card-title">{tr("♟ Piece-Level Mistake Map")}</h4>
        {worst ? (
          <>
            <div className="sgr-worst">{tr("Most errors with the")} <b>{worst.label}</b> ({s.pieces[worst.key]})</div>
            {PIECES.map(pc => (
              <div key={pc.key} className="sgr-piece">
                <span className="sgr-piece-name"><span className="sgr-piece-glyph">{pc.glyph}</span>{pc.label}</span>
                <div className="sgr-piece-bar"><div style={{ width: `${(s.pieces[pc.key] / maxPiece) * 100}%` }} /></div>
                <b className="sgr-piece-count">{s.pieces[pc.key]}</b>
              </div>
            ))}
            <p className="sgr-note">{tr("Counts every ?!, ? and ?? by the piece that moved.")}</p>
          </>
        ) : (
          <div className="sgr-clean-big">{tr("No inaccuracies, mistakes or blunders with any piece 🎉")}</div>
        )}
      </section>
    </div>
  );
}

// One compare row: label, then the two values; the better one is highlighted
// (never for `neutral` rows, where more isn't better or worse).
function CmpRow({ label, a, b, fmt = (v) => v, lower = false, neutral = false, sub = false }) {
  const has = !neutral && a != null && b != null;
  const aWins = has && (lower ? a < b : a > b);
  const bWins = has && (lower ? b < a : b > a);
  return (
    <div className={`sgr-cmp-row${sub ? ' sub' : ''}`}>
      <span className="sgr-cmp-label">{label}</span>
      <span className={`sgr-cmp-val${aWins ? ' win' : ''}`}>{a == null ? '—' : fmt(a)}</span>
      <span className={`sgr-cmp-val${bWins ? ' win' : ''}`}>{b == null ? '—' : fmt(b)}</span>
    </div>
  );
}

function CompareView({ left, right, tempo }) {
  const A = left.s, B = right.s;
  const pct = (v) => `${v}%`;
  return (
    <section className="sgr-card">
      <div className="sgr-cmp-row sgr-cmp-head">
        <span />
        <span className="sgr-cmp-who"><span className={`sga-dot sga-dot-${left.side}`} />{left.name}</span>
        <span className="sgr-cmp-who"><span className={`sga-dot sga-dot-${right.side}`} />{right.name}</span>
      </div>

      <div className="sgr-cmp-group">{tr("🎯 Move quality")}</div>
      <CmpRow label={tr("Avg centipawn loss")} a={A.acpl} b={B.acpl} lower />
      <CmpRow label={tr("Accuracy")} a={A.accuracy} b={B.accuracy} fmt={pct} />
      {QUALITY.map(q => (
        <CmpRow key={q.key} label={`${q.label} ${q.mark}`} a={A.quality[q.key]} b={B.quality[q.key]}
          lower />
      ))}
      {tempo && tempo.status !== 'error' && (
        <CmpRow
          label={tempo.status === 'running'
            ? tr("Tempo lost ⏱ (checking… {p}%)", { p: tempo.progress || 0 })
            : tr("Tempo lost ⏱")}
          a={tempoCount(tempo, left.side)} b={tempoCount(tempo, right.side)} lower />
      )}

      <div className="sgr-cmp-group">{tr("📊 Game phases")}</div>
      {PHASES.map(ph => (
        <React.Fragment key={ph.key}>
          <CmpRow label={tr("{icon} {label} accuracy", { icon: ph.icon, label: ph.label })} a={A.phases[ph.key].accuracy} b={B.phases[ph.key].accuracy} fmt={pct} />
          <CmpRow label={tr("centipawn loss")} a={A.phases[ph.key].acpl} b={B.phases[ph.key].acpl} lower sub />
        </React.Fragment>
      ))}

      <div className="sgr-cmp-group">{tr("♟ Errors by piece")}</div>
      {PIECES.map(pc => (
        <CmpRow key={pc.key} label={`${pc.glyph} ${pc.label}`} a={A.pieces[pc.key]} b={B.pieces[pc.key]} lower />
      ))}
      <p className="sgr-note">{tr("Highlighted = the better of the two.")}</p>
    </section>
  );
}

/**
 * @param rows       analyzeGame rows ({san, side, classification, bestUci, winBefore, winAfter, drop})
 * @param startFen   game start position (null = standard)
 * @param names      { white, black } display names
 * @param mySide     'white' | 'black' — shown first
 * @param isMe       true when the viewer actually played mySide (adds "You")
 */
// `sideStats` = the page's { white, black } stats; their `accuracy` is the
// Lichess game accuracy, so the report shows the SAME number as the header.
// Phase accuracy stays a plain average of per-move accuracy (Lichess has no
// per-phase figure).
// `tempo` = middlegame tempo check from the page ({ status, progress, events });
// shown as a ⏱ row in Move quality and the Compare table. `onSeek(ply)` jumps
// the board to a flagged move.
export default function GameReport({ rows, startFen, names, mySide = 'white', isMe = false, sideStats, tempo, onSeek }) {
  const report = useMemo(() => {
    const r = buildReport(rows, startFen);
    for (const side of ['white', 'black']) {
      const acc = sideStats?.[side]?.accuracy;
      if (acc != null && r[side].moves) r[side].accuracy = Math.round(acc);
    }
    return r;
  }, [rows, startFen, sideStats]);
  const other = mySide === 'white' ? 'black' : 'white';
  const [view, setView] = useState(mySide);
  if (!report.white.moves && !report.black.moves) return null;

  const label = (side) => `${names[side] || (side === 'white' ? 'White' : 'Black')}${isMe && side === mySide ? ' (You)' : ''}`;
  const tabs = [
    { key: mySide, text: label(mySide), dot: mySide },
    { key: other, text: label(other), dot: other },
    { key: 'compare', text: tr('⚖ Compare') },
  ];

  return (
    <div className="sgr">
      <div className="sgr-head">
        <h3 className="sgr-title">{tr("📋 Game report")}</h3>
        <div className="sgr-tabs" role="tablist">
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={view === t.key}
              className={`sgr-tab${view === t.key ? ' active' : ''}`}
              onClick={() => setView(t.key)}
            >
              {t.dot && <span className={`sga-dot sga-dot-${t.dot}`} />}
              <span className="sgr-tab-text">{t.text}</span>
            </button>
          ))}
        </div>
      </div>
      {view === 'compare' ? (
        <CompareView
          left={{ side: mySide, name: label(mySide), s: report[mySide] }}
          right={{ side: other, name: label(other), s: report[other] }}
          tempo={tempo}
        />
      ) : (
        report[view].moves
          ? <SideView s={report[view]} side={view} tempo={tempo} onSeek={onSeek} />
          : <div className="sgr-card sgr-clean-big">{tr("No moves for this side.")}</div>
      )}
    </div>
  );
}
