import React, { useRef, useState, useEffect, useCallback } from 'react';

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ffffff'];
const MIN_FONT = 14;
const MAX_FONT = 48;
// Every viewer's board is a different size, so marks are stored board-relative:
// positions as 0–1 fractions, pen/font sizes as px on a REF-px board, plus the
// orientation (`o`) they were drawn in so a student who flipped their own board
// still sees the mark on the same square. Items without `n` are the old raw-pixel
// format (a coach on a stale tab) and are drawn as-is.
const REF = 600;

// Toolbar sizing, derived from the board width so the whole bar fits on ONE row
// across the board (5 buttons + 6 swatches + slider ≈ 14.5 units + padding).
const barUnit = (w) => Math.max(16, Math.min(28, Math.floor((w - 40) / 15)));
// Height the bar occupies above the board — the page reserves this much room.
export const wbToolbarSpace = (w) => barUnit(w) + 14;

export default function WhiteboardOverlay({ width, height, isHost, orientation, active: parentActive, strokes, texts, onUpdate }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState(null); // null | 'pen' | 'eraser' | 'text'
  const [color, setColor] = useState('#ef4444');
  const [penSize, setPenSize] = useState(3);
  const [localStrokes, setLocalStrokes] = useState(strokes || []);
  const [localTexts, setLocalTexts] = useState(texts || []);
  const [drawing, setDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState(null);
  const [editingText, setEditingText] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragStart, setDragStart] = useState(null);

  useEffect(() => { if (!isHost) { setLocalStrokes(strokes || []); setLocalTexts(texts || []); } }, [strokes, texts, isHost]);
  useEffect(() => { if (parentActive && !tool) setTool('pen'); if (!parentActive) setTool(null); }, [parentActive]);

  const scale = width / REF;
  const mirrored = (o) => !!(o && orientation && o !== orientation);
  // Stored (board-relative) → this screen's px, and back. The flip is its own inverse.
  const toPx = (item, x, y) => {
    if (!item.n) return [x, y];
    return mirrored(item.o) ? [(1 - x) * width, (1 - y) * height] : [x * width, y * height];
  };
  const fromPx = (item, px, py) => {
    if (!item.n) return [px, py];
    return mirrored(item.o) ? [1 - px / width, 1 - py / height] : [px / width, py / height];
  };
  const sized = (item, v) => (item.n ? v * scale : v);

  const redraw = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    const allStrokes = isHost ? localStrokes : (strokes || []);
    for (const s of allStrokes) {
      if (s.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = sized(s, s.size);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = s.eraser ? 'destination-out' : 'source-over';
      const [x0, y0] = toPx(s, s.points[0][0], s.points[0][1]);
      ctx.moveTo(x0, y0);
      for (let i = 1; i < s.points.length; i++) {
        const [x, y] = toPx(s, s.points[i][0], s.points[i][1]);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStrokes, strokes, isHost, width, height, orientation]);

  useEffect(() => { redraw(); }, [redraw]);

  const broadcast = useCallback((s, t) => {
    if (isHost && onUpdate) onUpdate(s, t);
  }, [isHost, onUpdate]);

  const getPos = (e) => {
    const cvs = canvasRef.current;
    if (!cvs) return [0, 0];
    const r = cvs.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return [clientX - r.left, clientY - r.top];
  };

  const onPointerDown = (e) => {
    if (!isHost || !tool) return;
    if (tool === 'text') {
      const [px, py] = getPos(e);
      const base = { n: 1, o: orientation };
      const [x, y] = fromPx(base, px, py);
      const newText = { ...base, id: Date.now(), x, y, text: '', color, fontSize: 20, bold: false };
      const next = [...localTexts, newText];
      setLocalTexts(next);
      setEditingText(newText.id);
      return;
    }
    const [x, y] = getPos(e);
    const isEraser = tool === 'eraser';
    setDrawing(true);
    // Points stay in screen px while drawing; onPointerUp converts them for storage.
    setCurrentPath({ points: [[x, y]], color: isEraser ? '#000' : color, size: isEraser ? 20 : penSize, eraser: isEraser });
  };

  const onPointerMove = (e) => {
    if (!drawing || !currentPath) return;
    e.preventDefault();
    const [x, y] = getPos(e);
    const updated = { ...currentPath, points: [...currentPath.points, [x, y]] };
    setCurrentPath(updated);
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const pts = updated.points;
    ctx.beginPath();
    ctx.strokeStyle = updated.color;
    ctx.lineWidth = updated.size * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = updated.eraser ? 'destination-out' : 'source-over';
    const p1 = pts[pts.length - 2], p2 = pts[pts.length - 1];
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  };

  const onPointerUp = () => {
    if (!drawing || !currentPath) return;
    setDrawing(false);
    if (currentPath.points.length >= 2) {
      const base = { n: 1, o: orientation };
      const stroke = { ...currentPath, ...base, points: currentPath.points.map(([px, py]) => fromPx(base, px, py)) };
      const next = [...localStrokes, stroke];
      setLocalStrokes(next);
      broadcast(next, localTexts);
    }
    setCurrentPath(null);
  };

  const updateText = (id, changes) => {
    const next = localTexts.map(t => t.id === id ? { ...t, ...changes } : t);
    setLocalTexts(next);
    broadcast(localStrokes, next);
  };

  const deleteText = (id) => {
    const next = localTexts.filter(t => t.id !== id);
    setLocalTexts(next);
    setEditingText(null);
    broadcast(localStrokes, next);
  };

  const clearAll = () => {
    setLocalStrokes([]);
    setLocalTexts([]);
    setEditingText(null);
    broadcast([], []);
  };

  const undoStroke = () => {
    const next = localStrokes.slice(0, -1);
    setLocalStrokes(next);
    broadcast(next, localTexts);
  };

  const onTextDragStart = (e, id) => {
    if (!isHost) return;
    e.stopPropagation();
    const t = localTexts.find(tx => tx.id === id);
    if (!t) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const [ox, oy] = toPx(t, t.x, t.y);
    setDragging(id);
    setDragStart({ cx: clientX, cy: clientY, ox, oy });
  };

  const onTextDragMove = useCallback((e) => {
    if (!dragging || !dragStart) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = clientX - dragStart.cx;
    const dy = clientY - dragStart.cy;
    setLocalTexts(prev => prev.map(t => {
      if (t.id !== dragging) return t;
      const [x, y] = fromPx(t, dragStart.ox + dx, dragStart.oy + dy);
      return { ...t, x, y };
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, dragStart, width, height, orientation]);

  const onTextDragEnd = useCallback(() => {
    if (dragging) { broadcast(localStrokes, localTexts); }
    setDragging(null);
    setDragStart(null);
  }, [dragging, localStrokes, localTexts, broadcast]);

  useEffect(() => {
    if (!dragging) return;
    const move = (e) => onTextDragMove(e);
    const up = () => onTextDragEnd();
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up); };
  }, [dragging, onTextDragMove, onTextDragEnd]);

  const toolActive = isHost && parentActive;
  const hasContent = (isHost ? localStrokes : (strokes || [])).length > 0 || (isHost ? localTexts : (texts || [])).length > 0;

  if (!toolActive && !hasContent) return null;

  // Buttons here must zero the global `button` padding/min-size (index.css), or it
  // stretches the colour swatches into ovals and pushes the bar onto two rows.
  const u = barUnit(width);
  const sw = Math.round(u * 0.72);
  const reset = { padding: 0, margin: 0, minWidth: 0, minHeight: 0, boxSizing: 'border-box', flex: 'none' };
  const tb = {
    bar: { display: 'flex', alignItems: 'center', gap: Math.max(2, Math.round(u * 0.14)), padding: '4px 6px', borderRadius: 8, background: 'rgba(15,23,42,0.92)', border: '1px solid rgba(255,255,255,0.12)', position: 'absolute', top: -wbToolbarSpace(width), left: 0, width, boxSizing: 'border-box', zIndex: 12, flexWrap: 'nowrap', overflow: 'hidden', lineHeight: 1 },
    btn: (on) => ({ ...reset, width: u, height: u, borderRadius: 6, border: on ? '1.5px solid #06b6d4' : '1px solid rgba(255,255,255,0.14)', background: on ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.06)', color: on ? '#67e8f9' : '#e2e8f0', cursor: 'pointer', fontSize: Math.round(u * 0.5), lineHeight: 1, display: 'inline-grid', placeItems: 'center' }),
    swatch: (c, on) => ({ ...reset, width: sw, height: sw, borderRadius: '50%', background: c, border: on ? '2px solid #fff' : '2px solid rgba(255,255,255,0.2)', cursor: 'pointer' }),
    sep: { width: 1, height: Math.round(u * 0.75), background: 'rgba(255,255,255,0.12)', margin: '0 2px', flex: 'none' },
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width, height, zIndex: 10, pointerEvents: toolActive ? 'auto' : 'none' }}>
      {toolActive && (
        <div style={tb.bar}>
          <button style={tb.btn(tool === 'pen')} onClick={() => setTool(t => t === 'pen' ? null : 'pen')} title="Pencil">✏️</button>
          <button style={tb.btn(tool === 'eraser')} onClick={() => setTool(t => t === 'eraser' ? null : 'eraser')} title="Eraser">🧹</button>
          <button style={tb.btn(tool === 'text')} onClick={() => setTool(t => t === 'text' ? null : 'text')} title="Text">T</button>
          <div style={tb.sep} />
          {tool === 'pen' && COLORS.map(c => (
            <button key={c} style={tb.swatch(c, color === c)} onClick={() => setColor(c)} title={c} />
          ))}
          {tool === 'pen' && (
            <>
              <div style={tb.sep} />
              <input type="range" min={1} max={10} value={penSize} onChange={e => setPenSize(+e.target.value)}
                style={{ width: Math.round(u * 2.2), minWidth: 30, flex: '0 1 auto', margin: 0, accentColor: '#06b6d4' }} title={`Size: ${penSize}`} />
            </>
          )}
          {tool === 'text' && COLORS.map(c => (
            <button key={c} style={tb.swatch(c, color === c)} onClick={() => setColor(c)} title={c} />
          ))}
          <div style={tb.sep} />
          <button style={tb.btn(false)} onClick={undoStroke} title="Undo last stroke">↩</button>
          <button style={tb.btn(false)} onClick={clearAll} title="Clear all">🗑️</button>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ position: 'absolute', top: 0, left: 0, width, height, cursor: tool === 'pen' ? 'crosshair' : tool === 'eraser' ? 'cell' : tool === 'text' ? 'text' : 'default', touchAction: 'none' }}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
      />

      {/* Text labels rendered as HTML for editability */}
      {(isHost ? localTexts : (texts || [])).map(t => {
        const [left, top] = toPx(t, t.x, t.y);
        const fontSize = sized(t, t.fontSize);
        return (
        <div key={t.id} style={{
          position: 'absolute', left, top, zIndex: 11,
          cursor: isHost ? 'move' : 'default', userSelect: 'none',
        }}
          onMouseDown={isHost ? (e) => onTextDragStart(e, t.id) : undefined}
          onTouchStart={isHost ? (e) => onTextDragStart(e, t.id) : undefined}
        >
          {editingText === t.id && isHost ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <textarea
                autoFocus
                value={t.text}
                onChange={e => updateText(t.id, { text: e.target.value })}
                onMouseDown={e => e.stopPropagation()}
                style={{
                  background: 'rgba(0,0,0,0.7)', color: t.color, border: '1.5px solid #06b6d4',
                  borderRadius: 6, padding: '4px 6px', fontSize, fontWeight: t.bold ? 700 : 400,
                  fontFamily: 'sans-serif', resize: 'both', minWidth: 80, minHeight: 30, outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                <button style={tb.btn(t.bold)} onClick={() => updateText(t.id, { bold: !t.bold })} title="Bold">B</button>
                <button style={tb.btn(false)} onClick={() => updateText(t.id, { fontSize: Math.max(MIN_FONT, t.fontSize - 2) })} title="Smaller">A-</button>
                <button style={tb.btn(false)} onClick={() => updateText(t.id, { fontSize: Math.min(MAX_FONT, t.fontSize + 2) })} title="Bigger">A+</button>
                {COLORS.map(c => (
                  <button key={c} style={tb.swatch(c, t.color === c)} onClick={() => updateText(t.id, { color: c })} />
                ))}
                <div style={tb.sep} />
                <button style={tb.btn(false)} onClick={() => setEditingText(null)} title="Done">✓</button>
                <button style={{ ...tb.btn(false), color: '#fca5a5' }} onClick={() => deleteText(t.id)} title="Delete">✗</button>
              </div>
            </div>
          ) : (
            <div
              onClick={isHost ? (e) => { e.stopPropagation(); setEditingText(t.id); } : undefined}
              style={{
                fontSize, fontWeight: t.bold ? 700 : 400, color: t.color,
                fontFamily: 'sans-serif', whiteSpace: 'pre-wrap', textShadow: '0 1px 4px rgba(0,0,0,0.7)',
                pointerEvents: isHost ? 'auto' : 'none', lineHeight: 1.25,
              }}
            >
              {t.text || (isHost ? '(click to type)' : '')}
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}
