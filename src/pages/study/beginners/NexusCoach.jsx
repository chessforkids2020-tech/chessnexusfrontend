import React from 'react';
import './beginners.css';

// The friendly "Nexus Coach" avatar. Simple built-in art (emoji face) with an idle vs
// talking state — it bobs + the mouth animates while `speaking`. Shows the current
// spoken line in a speech bubble and offers mute + replay controls. Swap the emoji/SVG
// for real character art later without touching the lessons.
export default function NexusCoach({ speaking, line, muted, onToggleMute, onReplay, hasTTS = true, mood = '🙂' }) {
  return (
    <div className="nc-wrap">
      {/* Speech bubble */}
      <div className={`nc-bubble ${line ? '' : 'nc-bubble-empty'}`}>
        {line || 'Hi! I’m your Nexus Coach — let’s learn chess! ♟️'}
        <span className="nc-bubble-tail" />
      </div>

      {/* Avatar */}
      <div className={`nc-avatar ${speaking ? 'nc-talking' : ''}`} aria-hidden="true">
        <div className="nc-face">
          <span className="nc-eyes">{speaking ? '👀' : mood}</span>
          <span className={`nc-mouth ${speaking ? 'nc-mouth-talk' : ''}`} />
        </div>
        <div className="nc-name">Nexus Coach</div>
      </div>

      {/* Controls */}
      <div className="nc-controls">
        <button type="button" className="nc-ctl" onClick={onReplay} title="Play again">↻ Replay</button>
        <button type="button" className="nc-ctl" onClick={onToggleMute}
          title={muted ? 'Unmute the coach' : 'Mute the coach'}>
          {muted ? '🔇 Muted' : '🔊 Voice'}
        </button>
      </div>
      {!hasTTS && <div className="nc-novoice">Voice isn’t available in this browser — read along above.</div>}
    </div>
  );
}
