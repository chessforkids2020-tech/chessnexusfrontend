import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TIME_CONTROL_PRESETS } from './friendIdentity';
import './FriendGame.css';

/**
 * "Play with a Friend" — Join / Create modal.
 * Opens over the Games page. Create navigates to /friend/new (the room page's
 * own socket creates the room); Join navigates to /friend/:code.
 */
export default function FriendGameSetup({ onClose }) {
  const navigate = useNavigate();

  const [tab, setTab] = useState('home'); // 'home' | 'create' | 'join'

  // Create form state
  const [tc, setTc] = useState(TIME_CONTROL_PRESETS[5]); // default 10+0
  const [custom, setCustom] = useState(false);
  const [customBase, setCustomBase] = useState(10);
  const [customInc, setCustomInc] = useState(0);
  const [variant, setVariant] = useState('standard');
  const [chatEnabled, setChatEnabled] = useState(true);
  const [isRated, setIsRated] = useState(false); // default casual (current behavior)

  // Join form state
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const resolvedTc = custom
    ? { base: Math.min(180, Math.max(1, parseInt(customBase, 10) || 1)),
        increment: Math.min(60, Math.max(0, parseInt(customInc, 10) || 0)) }
    : { base: tc.base, increment: tc.increment };

  const handleCreate = () => {
    setError('');
    setBusy(true);
    // Navigate to the room page and let ITS socket create the room — so the
    // creator stays connected on the same socket that owns the player slot.
    navigate('/friend/new', {
      state: {
        create: true,
        variant,
        timeControl: resolvedTc,
        chatEnabled,
        // Chess960 is always casual (mirrors the arena rule).
        isRated: isRated && variant === 'standard',
      },
    });
  };

  const handleJoin = () => {
    const code = joinCode.toUpperCase().trim().replace(/.*\/friend\//, '');
    if (!code) { setError('Enter a code or paste an invite link.'); return; }
    // Validation happens on the room page's own join; just navigate.
    navigate(`/friend/${code}`);
  };

  return (
    <div className="fg-overlay" onClick={onClose}>
      <div className="fg-modal" onClick={(e) => e.stopPropagation()}>
        <button className="fg-close" onClick={onClose} aria-label="Close">✕</button>

        {tab === 'home' && (
          <div className="fg-home">
            <h2 className="fg-title">♟️ Play with a Friend</h2>
            <p className="fg-sub">Create a private game and share the code — even as a guest.</p>
            <div className="fg-home-actions">
              <button className="fg-big-btn fg-create" onClick={() => setTab('create')}>
                <span className="fg-big-icon">➕</span>
                <span>Create a game</span>
              </button>
              <button className="fg-big-btn fg-join" onClick={() => setTab('join')}>
                <span className="fg-big-icon">🔗</span>
                <span>Join with a code</span>
              </button>
            </div>
          </div>
        )}

        {tab === 'create' && (
          <div className="fg-create-view">
            <h2 className="fg-title">Create a game</h2>
            <div className="fg-create-grid">
              {/* LEFT: time controls */}
              <div className="fg-col">
                <h3 className="fg-col-title">⏱️ Time control</h3>
                <div className="fg-tc-grid">
                  {TIME_CONTROL_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      className={`fg-tc ${!custom && tc.label === p.label ? 'active' : ''}`}
                      onClick={() => { setCustom(false); setTc(p); }}
                    >
                      {p.label}
                    </button>
                  ))}
                  <button
                    className={`fg-tc ${custom ? 'active' : ''}`}
                    onClick={() => setCustom(true)}
                  >
                    Custom
                  </button>
                </div>
                {custom && (
                  <div className="fg-custom">
                    <label>
                      Minutes (1–180)
                      <input type="number" min="1" max="180" value={customBase}
                        onChange={(e) => setCustomBase(e.target.value)} />
                    </label>
                    <label>
                      Increment (sec)
                      <input type="number" min="0" max="60" value={customInc}
                        onChange={(e) => setCustomInc(e.target.value)} />
                    </label>
                  </div>
                )}
                <p className="fg-tc-note">
                  {resolvedTc.base} min + {resolvedTc.increment}s / move
                </p>
              </div>

              {/* RIGHT: variant + options */}
              <div className="fg-col">
                <h3 className="fg-col-title">♜ Variant</h3>
                <div className="fg-variant">
                  <button className={`fg-var ${variant === 'standard' ? 'active' : ''}`}
                    onClick={() => setVariant('standard')}>
                    Standard
                  </button>
                  <button className={`fg-var ${variant === 'chess960' ? 'active' : ''}`}
                    onClick={() => setVariant('chess960')}>
                    Chess960
                  </button>
                </div>
                {variant === 'chess960' && (
                  <p className="fg-tc-note">A random starting position is generated for both players.</p>
                )}

                <h3 className="fg-col-title" style={{ marginTop: 18 }}>⚡ Mode</h3>
                <div className="fg-variant">
                  <button
                    className={`fg-var ${isRated && variant === 'standard' ? 'active' : ''}`}
                    onClick={() => setIsRated(true)}
                    disabled={variant === 'chess960'}
                    title={variant === 'chess960' ? 'Chess960 games are always casual' : 'Win/loss changes your rating'}
                  >
                    Rated
                  </button>
                  <button
                    className={`fg-var ${!isRated || variant === 'chess960' ? 'active' : ''}`}
                    onClick={() => setIsRated(false)}
                  >
                    Unrated
                  </button>
                </div>
                <p className="fg-tc-note">
                  {variant === 'chess960'
                    ? 'Chess960 games are always casual — no rating change.'
                    : (isRated
                        ? 'Rated: both players’ ratings go up/down on win or loss. Both must be logged in.'
                        : 'Unrated: just for fun — no rating change.')}
                </p>

                <h3 className="fg-col-title" style={{ marginTop: 18 }}>Options</h3>
                <label className="fg-check">
                  <input type="checkbox" checked={chatEnabled}
                    onChange={(e) => setChatEnabled(e.target.checked)} />
                  Enable chat
                </label>
                <label className="fg-check fg-disabled" title="Coming soon">
                  <input type="checkbox" disabled />
                  Voice call <span className="fg-soon">(coming soon)</span>
                </label>
              </div>
            </div>

            {error && <p className="fg-error">{error}</p>}
            <div className="fg-create-footer">
              <button className="fg-secondary" onClick={() => setTab('home')}>← Back</button>
              <button className="fg-primary" onClick={handleCreate} disabled={busy}>
                {busy ? 'Creating…' : 'Create & get code →'}
              </button>
            </div>
          </div>
        )}

        {tab === 'join' && (
          <div className="fg-join-view">
            <h2 className="fg-title">Join a game</h2>
            <p className="fg-sub">Paste the code (or invite link) your friend sent you.</p>
            <input
              className="fg-code-input"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="e.g. A3F2B1"
              autoFocus
            />
            {error && <p className="fg-error">{error}</p>}
            <div className="fg-create-footer">
              <button className="fg-secondary" onClick={() => setTab('home')}>← Back</button>
              <button className="fg-primary" onClick={handleJoin}>Join →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
