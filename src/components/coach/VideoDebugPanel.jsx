import React, { useEffect, useRef, useState } from 'react';
import {
  createSampler, collectLocal, collectRemotes,
  evalLocal, evalRemote, evalStudentReport, worst, formatDebugText,
  diagnoseSender, diagnoseStudentView, diagnoseIncoming, diagnoseSummary,
} from '../../lib/videoDebug';
import { copyText } from '../../utils/clipboard';

const COLOR = { bad: '#f87171', warn: '#fbbf24', ok: '#34d399' };
const BG = { bad: 'rgba(239,68,68,0.12)', warn: 'rgba(245,158,11,0.10)', ok: 'rgba(16,185,129,0.06)' };

function Issues({ issues }) {
  if (!issues.length) return <div style={{ color: COLOR.ok, fontSize: 11.5 }}>✓ OK</div>;
  return issues.map((i, k) => (
    <div key={k} style={{ color: COLOR[i.level], fontSize: 11.5, fontWeight: 600 }}>
      {i.level === 'bad' ? '✗' : '!'} {i.msg}
    </div>
  ));
}

function Verdict({ v }) {
  if (!v) return null;
  const mine = v.side === 'you';
  return (
    <div style={{ marginTop: 5, padding: '5px 7px', borderRadius: 5, background: mine ? 'rgba(239,68,68,0.22)' : 'rgba(0,0,0,0.35)', border: `1px solid ${mine ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.12)'}` }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, color: mine ? '#fca5a5' : '#fde68a' }}>
        Broken at: {v.label}
      </div>
      <div style={{ fontSize: 11.5, color: '#e2e8f0' }}>{v.why}</div>
      <div style={{ fontSize: 11.5, color: '#67e8f9', fontWeight: 600 }}>Fix: {v.fix}</div>
    </div>
  );
}

function Card({ title, sub, issues, verdict, children }) {
  const lvl = verdict ? 'bad' : worst(issues);
  return (
    <div style={{ borderLeft: `3px solid ${COLOR[lvl]}`, background: BG[lvl], borderRadius: 6, padding: '6px 8px', marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12.5, fontWeight: 700, color: '#e2e8f0' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        {sub && <span style={{ color: '#94a3b8', fontWeight: 500, flex: 'none' }}>{sub}</span>}
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0', fontFamily: 'ui-monospace, Consolas, monospace' }}>{children}</div>
      <Issues issues={issues} />
      <Verdict v={verdict} />
    </div>
  );
}

const cam = (c) => !c ? 'camera not published'
  : c.muted ? 'camera off'
  : `${c.w}×${c.h} · ${c.fps ?? '…'}fps · ${c.kbps ?? '…'}kbps · loss ${c.lossPct ?? '…'}%${c.subscribed ? '' : ' · NOT SUBSCRIBED'}`;

export default function VideoDebugPanel({ getRoom, coachName, reports, onClose }) {
  const samplerRef = useRef(createSampler());
  const openedAtRef = useRef(Date.now());
  const [snap, setSnap] = useState(null);
  const [min, setMin] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const room = getRoom();
      if (!room) { if (alive) setSnap({ at: Date.now(), roomState: 'not connected', local: null, remotes: [] }); return; }
      try {
        const local = await collectLocal(room, samplerRef.current);
        const remotes = await collectRemotes(room, samplerRef.current);
        if (alive) setSnap({ at: Date.now(), roomState: room.state || '?', local, remotes });
      } catch { /* debug must never break the class */ }
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => { alive = false; clearInterval(id); };
  }, [getRoom]);

  const now = Date.now();
  const local = snap?.local || null;
  const remotes = snap?.remotes || [];
  const localIssues = snap ? evalLocal(local, snap.roomState) : [];
  const ids = Array.from(new Set([...remotes.map(r => r.id), ...Object.keys(reports)]));
  // First reports need a few seconds to arrive — don't blame students for that.
  const grace = now - openedAtRef.current < 8000;
  const roomState = snap?.roomState;
  const studentRows = ids.map(id => {
    const entry = reports[id];
    const rep = entry?.report || null;
    const waiting = !rep && grace;
    return {
      id, name: remotes.find(r => r.id === id)?.name || entry?.name || id, rep, waiting,
      issues: waiting ? [] : evalStudentReport(rep, now),
      verdict: waiting || !snap ? null : diagnoseStudentView(local, roomState, rep, now),
    };
  });
  const recvIssues = remotes.map(e => evalRemote(e));
  const recvVerdicts = remotes.map(e => (snap ? diagnoseIncoming(e, reports[e.id]?.report || null, roomState) : null));
  const senderVerdict = snap ? diagnoseSender(local, roomState) : null;
  const summaryIds = studentRows.filter(r => !r.waiting).map(r => r.id);
  const summary = snap ? diagnoseSummary(local, roomState, summaryIds,
    Object.fromEntries(summaryIds.map(id => [id, reports[id]?.report || null])), now) : null;
  const verdicts = [senderVerdict, ...recvVerdicts, ...studentRows.map(r => r.verdict)];
  const all = [localIssues, ...recvIssues, ...studentRows.map(r => r.issues)];
  const overall = verdicts.some(Boolean) ? 'bad' : worst(all.flat());
  const badCount = verdicts.filter(Boolean).length;

  const onCopy = async () => {
    if (!snap) return;
    const text = formatDebugText({ ...snap, at: Date.now(), reports, coachName });
    const ok = await copyText(text);
    setCopied(ok ? 'Copied ✓' : 'Copy failed');
    setTimeout(() => setCopied(''), 2000);
  };

  const btn = { height: 24, padding: '0 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', cursor: 'pointer', fontSize: 12, fontWeight: 600 };
  const head = { fontSize: 11, fontWeight: 800, letterSpacing: 0.4, color: '#67e8f9', textTransform: 'uppercase', margin: '8px 0 4px' };

  return (
    <div style={{
      position: 'fixed', left: 12, bottom: 12, zIndex: 150, width: 'min(440px, calc(100vw - 24px))',
      maxHeight: min ? 'none' : '72vh', display: 'flex', flexDirection: 'column',
      background: 'rgba(10,15,25,0.97)', border: `1.5px solid ${COLOR[overall]}`, borderRadius: 10,
      boxShadow: '0 12px 32px rgba(0,0,0,0.55)', color: '#e2e8f0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderBottom: min ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLOR[overall], flex: 'none' }} />
        <span style={{ fontWeight: 800, fontSize: 13 }}>🐞 Video debug</span>
        {badCount > 0 && <span style={{ color: COLOR.bad, fontSize: 12, fontWeight: 700 }}>{badCount} problem{badCount > 1 ? 's' : ''}</span>}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button style={btn} onClick={onCopy} title="Copy the full debug report">{copied || '📋 Copy'}</button>
          <button style={btn} onClick={() => setMin(m => !m)} title={min ? 'Expand' : 'Minimize'}>{min ? '▴' : '▾'}</button>
          <button style={{ ...btn, color: '#fca5a5' }} onClick={onClose} title="Turn debug off">Off</button>
        </span>
      </div>

      {!min && (
        <div style={{ overflowY: 'auto', padding: '2px 10px 10px' }}>
          {!snap ? <div style={{ fontSize: 12, color: '#94a3b8', padding: 8 }}>Collecting…</div> : (
            <>
              {summary && (
                <div style={{
                  margin: '8px 0 2px', padding: '8px 10px', borderRadius: 7, fontSize: 12.5, fontWeight: 700, lineHeight: 1.4,
                  background: summary.level === 'ok' ? 'rgba(16,185,129,0.14)' : 'rgba(239,68,68,0.16)',
                  border: `1px solid ${summary.level === 'ok' ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.55)'}`,
                  color: summary.level === 'ok' ? '#6ee7b7' : '#fecaca',
                }}>
                  {summary.level === 'ok' ? '✓ ' : '⚠ '}{summary.text}
                  {grace && <div style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8' }}>Collecting student reports…</div>}
                </div>
              )}
              <div style={head}>My video — sending</div>
              <Card title="Coach camera" sub={`room: ${snap.roomState}`} issues={localIssues} verdict={senderVerdict}>
                {local ? (
                  <>
                    {local.capture || 'no capture'} · {local.codec || '?'} · rtt {local.rttMs ?? '…'}ms · upload {local.availOutKbps ?? '…'}kbps<br />
                    {local.layers.length ? local.layers.map(l => (
                      <span key={l.rid} style={{ display: 'block', opacity: l.active ? 1 : 0.55 }}>
                        layer {l.rid}: {l.w}×{l.h} · {l.fps ?? '…'}fps · {l.kbps ?? '…'}kbps{l.active ? '' : ' (paused)'}{l.limit !== 'none' ? ` · limited by ${l.limit}` : ''}
                      </span>
                    )) : 'no outgoing video layers'}
                  </>
                ) : 'not connected'}
              </Card>

              <div style={head}>Students' video — on my screen ({remotes.length})</div>
              {!remotes.length && <div style={{ fontSize: 12, color: '#94a3b8' }}>No students in the video room.</div>}
              {remotes.map((e, k) => (
                <Card key={e.id} title={e.name} sub={`net: ${e.quality}`} issues={recvIssues[k]} verdict={recvVerdicts[k]}>
                  {cam(e.cam)}<br />
                  tile: {e.tile ? `${e.tile.w}px${e.tile.black ? ' BLACK' : ''}` : 'not on screen'} · mic: {e.mic ? (e.mic.muted ? 'muted' : 'on') : 'none'}
                </Card>
              ))}

              <div style={head}>My video — on each student's screen</div>
              {!studentRows.length && <div style={{ fontSize: 12, color: '#94a3b8' }}>Waiting for student reports…</div>}
              {studentRows.map(r => (
                <Card key={r.id} title={r.name} sub={r.rep ? `${r.rep.browser} · ${Math.round((now - r.rep.at) / 1000)}s ago` : (r.waiting ? 'waiting…' : 'no report')} issues={r.issues} verdict={r.verdict}>
                  {r.rep ? (
                    <>
                      sees you: {cam(r.rep.coach?.cam)}<br />
                      your tile there: {r.rep.coach?.tile ? `${r.rep.coach.tile.w}px${r.rep.coach.tile.black ? ' BLACK' : ''}` : 'not on screen'} · their net: {r.rep.quality}<br />
                      their camera: {(() => {
                        if (!r.rep.local?.camEnabled) return 'off';
                        const l = r.rep.local.layers.find(x => x.active) || r.rep.local.layers[0];
                        return l ? `${l.w}×${l.h} · ${l.fps ?? '…'}fps` : 'no layers';
                      })()}
                    </>
                  ) : '—'}
                </Card>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
