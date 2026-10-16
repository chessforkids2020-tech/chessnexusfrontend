import WhiteboardOverlay, { wbToolbarSpace } from './WhiteboardOverlay';
import { t as tr } from '../../i18n/LanguageContext';
import { WB_PANEL_SIZES, wbPanelWidth } from './whiteboardPanelSizes';

/**
 * A blank whiteboard beside the teaching board (live classroom).
 *
 * Same tools as the on-board whiteboard (WhiteboardOverlay is reused as-is), on
 * an empty "chalkboard" instead of over the pieces. Orientation is pinned to
 * 'white' so marks never mirror when a student flips their board — a page of
 * notes has no "side".
 *
 * Coach: draws, picks the size (S/M/L), moves it left/right, closes it.
 * Students: read-only, same side and size (shrunk to fit a phone).
 */
export default function WhiteboardPanel({
  isHost, size, side, vpW, strokes, texts, onUpdate, onSize, onSide, onClose,
}) {
  const w = wbPanelWidth(size, vpW);
  const h = w; // square, like the board beside it; marks are stored as fractions

  const pill = (on) => ({
    padding: '2px 8px', minWidth: 0, minHeight: 0, borderRadius: 6, fontSize: 12, fontWeight: 700,
    cursor: 'pointer', lineHeight: 1.4,
    border: on ? '1.5px solid #06b6d4' : '1px solid rgba(255,255,255,0.14)',
    background: on ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.06)',
    color: on ? '#67e8f9' : '#e2e8f0',
  });

  return (
    <div style={{ width: w, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>
        <span style={{ marginRight: 'auto' }}>📋 {tr("Whiteboard")}</span>
        {isHost && (
          <>
            {Object.keys(WB_PANEL_SIZES).map(k => (
              <button key={k} type="button" style={pill(size === k)} onClick={() => onSize(k)}
                title={tr("Whiteboard size")}>{k}</button>
            ))}
            <button type="button" style={pill(false)} onClick={onSide}
              title={side === 'left' ? tr("Move whiteboard to the right") : tr("Move whiteboard to the left")}>⇄</button>
            <button type="button" style={pill(false)} onClick={onClose} title={tr("Close whiteboard")}>✕</button>
          </>
        )}
      </div>
      {/* The toolbar floats ABOVE the drawing area (absolute, top: -space), so
          reserve that room for the coach or it would cover the header. */}
      <div style={{
        position: 'relative', width: w, height: h, marginTop: isHost ? wbToolbarSpace(w) : 0,
        background: '#111827', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
        boxSizing: 'content-box', lineHeight: 0,
      }}>
        <WhiteboardOverlay
          width={w} height={h}
          isHost={isHost} orientation="white" active={isHost}
          strokes={strokes} texts={texts}
          onUpdate={onUpdate}
        />
      </div>
    </div>
  );
}
