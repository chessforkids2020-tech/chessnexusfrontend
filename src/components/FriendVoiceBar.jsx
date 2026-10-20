import React, { useEffect, useRef, useState } from 'react';
import api from '../api';
import useVoiceCall from '../hooks/useVoiceCall';
import { t as tr } from '../i18n/LanguageContext';

export const GUEST_VOICE_MSG = 'Voice call is only for logged-in players. Log in to call and talk with your friend.';

const box = {
  borderRadius: 10, padding: '10px 12px', marginTop: 10,
  background: 'var(--color-white-a04)', border: '1px solid var(--color-border)',
  color: 'var(--color-text)', fontSize: 13,
};
const btn = (kind) => ({
  height: 28, padding: '0 10px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap',
  border: '1px solid var(--color-border)',
  background: kind === 'go' ? 'var(--color-accent)' : kind === 'stop' ? 'rgba(239,68,68,0.18)' : 'var(--color-white-a07)',
  color: kind === 'go' ? 'var(--color-bg)' : kind === 'stop' ? '#fca5a5' : 'var(--color-text)',
});
const dot = (on, speaking) => ({
  width: 9, height: 9, borderRadius: '50%', flex: 'none',
  background: on ? '#22c55e' : 'var(--color-text-faint)',
  boxShadow: speaking ? '0 0 0 4px rgba(34,197,94,0.35)' : 'none',
});

// A short two-tone "ring" made in the browser (no audio file). Browsers only
// allow sound after the page has been used, which a player mid-game has; if it
// is still blocked we just stay silent — the banner below is the main signal.
function playRing() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [[0, 880], [0.25, 660], [0.7, 880], [0.95, 660]].forEach(([t, f]) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = f; o.type = 'sine';
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.22);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.24);
    });
    setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, 1600);
  } catch { /* sound is a bonus, never an error */ }
}

// How the two players learn about each other's call:
//   • each side sends `voice_state` when it joins/leaves the call;
//   • it RE-SENDS on every `room_ready` / `opponentReconnected` — before, the
//     state went out once, so a friend who opened the game a moment later or
//     reloaded never heard that a call was waiting;
//   • while in a call it repeats every 20 s, and the friend treats silence for
//     50 s as "left" — a crashed tab can't leave a stale "in the call".
const HEARTBEAT_MS = 20000;
const STALE_MS = 50000;

export default function FriendVoiceBar({ socket, roomCode, isGuest, friendName }) {
  const v = useVoiceCall();
  const [friendInCall, setFriendInCall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState('');
  const lastHeardRef = useRef(0);

  const inCall = v.state === 'connected' || v.state === 'reconnecting';
  const inCallRef = useRef(inCall);
  inCallRef.current = inCall;

  useEffect(() => {
    if (!socket) return undefined;
    const onVoice = ({ inCall: theyAre }) => {
      lastHeardRef.current = Date.now();
      setFriendInCall(!!theyAre);
    };
    // The other player (re)joined: tell them where we are.
    const resend = () => { if (roomCode) socket.emit('voice_state', { roomCode, inCall: inCallRef.current }); };
    socket.on('opponent_voice', onVoice);
    socket.on('room_ready', resend);
    socket.on('opponentReconnected', resend);
    return () => {
      socket.off('opponent_voice', onVoice);
      socket.off('room_ready', resend);
      socket.off('opponentReconnected', resend);
    };
  }, [socket, roomCode]);

  // Announce changes at once, then keep repeating while in the call.
  useEffect(() => {
    if (!socket || !roomCode) return undefined;
    socket.emit('voice_state', { roomCode, inCall });
    if (!inCall) return undefined;
    const id = setInterval(() => socket.emit('voice_state', { roomCode, inCall: true }), HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [socket, roomCode, inCall]);

  // No word from a friend who said "in the call" for too long → they're gone.
  useEffect(() => {
    if (!friendInCall) return undefined;
    const id = setInterval(() => {
      if (Date.now() - lastHeardRef.current > STALE_MS) setFriendInCall(false);
    }, 5000);
    return () => clearInterval(id);
  }, [friendInCall]);

  // Incoming call: ring once and, if this tab is in the background, flash its title.
  const ringing = friendInCall && !inCall && v.state !== 'connecting';
  useEffect(() => {
    if (!ringing || isGuest) return undefined;
    playRing();
    const original = document.title;
    let on = false;
    const id = setInterval(() => {
      if (!document.hidden) { if (on) { document.title = original; on = false; } return; }
      on = !on;
      document.title = on ? `📞 ${tr('Incoming call')}` : original;
    }, 1000);
    return () => { clearInterval(id); document.title = original; };
  }, [ringing, isGuest]);

  if (isGuest) {
    // Login opens in a NEW TAB: the seat in this room belongs to the guest id,
    // so logging in here would swap identities and drop the player's game.
    return (
      <div style={{ ...box, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ flex: '1 1 180px' }}>🎙️ {GUEST_VOICE_MSG}</span>
        <a
          href="/login"
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...btn('go'), display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
        >{tr("🔑 Log in for voice call")}</a>
      </div>
    );
  }

  const join = async () => {
    setApiError('');
    setBusy(true);
    try {
      const { data } = await api.post(`/api/friend-game/${roomCode}/voice-token`);
      await v.join(data);
    } catch (e) {
      setApiError(e?.response?.data?.message || 'Could not start voice call.');
    } finally {
      setBusy(false);
    }
  };

  const name = friendName || tr('Your friend');
  const peerHere = inCall ? v.peerIn : friendInCall;
  const err = apiError || v.error;

  // Incoming call — impossible to miss: highlighted, pulsing, one big button.
  if (ringing) {
    return (
      <div className="fvb-ringing" style={{ ...box, borderColor: 'var(--color-accent)', background: 'var(--color-accent-a15, rgba(6,182,212,0.15))', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <style>{'@keyframes fvbPulse{0%,100%{box-shadow:0 0 0 0 rgba(6,182,212,.55)}50%{box-shadow:0 0 0 8px rgba(6,182,212,0)}}.fvb-ringing{animation:fvbPulse 1.4s ease-in-out infinite}@media (prefers-reduced-motion: reduce){.fvb-ringing{animation:none}}'}</style>
        <span style={{ fontSize: 22 }} aria-hidden="true">📞</span>
        <span style={{ flex: '1 1 160px', fontWeight: 700 }} role="status">
          {tr("{name} is calling you", { name })}
        </span>
        <button style={{ ...btn('go'), height: 32, padding: '0 14px' }} onClick={join} disabled={busy}>
          {busy ? tr('Joining…') : tr('Join call')}
        </button>
        {err && <div style={{ flexBasis: '100%', color: '#fca5a5', fontSize: 12 }}>{err}</div>}
      </div>
    );
  }

  return (
    <div style={box}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 800 }}>{tr("🎙️ Voice")}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)' }}>
          <span style={dot(peerHere, inCall && v.peerSpeaking)} />
          {peerHere
            ? tr("{name} is in the call", { name: name })
            : inCall
              // We're in, they're not yet: it's ringing on their side.
              ? tr("📞 Calling {name}… waiting for them to join", { name: name })
              : tr("{name} is not in the call", { name: name })}
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {!inCall && v.state !== 'connecting' && (
            <button style={btn('go')} onClick={join} disabled={busy}>
              {busy ? 'Joining…' : v.state === 'dropped' ? 'Rejoin voice' : peerHere ? 'Join call' : 'Start call'}
            </button>
          )}
          {v.state === 'connecting' && <button style={btn()} disabled>{tr("Connecting…")}</button>}
          {inCall && (
            <>
              <button style={btn()} onClick={v.toggleMic} title={v.micOn ? 'Mute' : 'Unmute'}>
                {v.micOn ? tr('🎤 Mute') : tr('🔇 Unmute')}
              </button>
              <button style={btn('stop')} onClick={v.leave}>{tr("Leave")}</button>
            </>
          )}
        </span>
      </div>
      {inCall && (
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)', fontSize: 12 }}>
          <span style={dot(v.micOn, v.meSpeaking)} />
          {v.state === 'reconnecting' ? 'Reconnecting…' : v.micOn ? 'You are live' : 'You are muted'}
        </div>
      )}
      {v.state === 'dropped' && <div style={{ marginTop: 6, color: '#fbbf24', fontSize: 12 }}>{tr("The call dropped. Tap “Rejoin voice”.")}</div>}
      {inCall && v.audioBlocked && (
        <button style={{ ...btn(), marginTop: 6 }} onClick={v.enableAudio}>{tr("🔊 Tap to hear your friend")}</button>
      )}
      {err && <div style={{ marginTop: 6, color: '#fca5a5', fontSize: 12 }}>{err}</div>}
    </div>
  );
}
