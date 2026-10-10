import React, { useEffect, useState } from 'react';
import api from '../api';
import useVoiceCall from '../hooks/useVoiceCall';

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

export default function FriendVoiceBar({ socket, roomCode, isGuest, friendName }) {
  const v = useVoiceCall();
  const [friendInCall, setFriendInCall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (!socket) return undefined;
    const onVoice = ({ inCall }) => setFriendInCall(!!inCall);
    socket.on('opponent_voice', onVoice);
    return () => socket.off('opponent_voice', onVoice);
  }, [socket]);

  const inCall = v.state === 'connected' || v.state === 'reconnecting';
  useEffect(() => {
    if (socket && roomCode) socket.emit('voice_state', { roomCode, inCall });
  }, [socket, roomCode, inCall]);

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
        >🔑 Log in for voice call</a>
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

  const name = friendName || 'Your friend';
  const peerHere = inCall ? v.peerIn : friendInCall;
  const err = apiError || v.error;

  return (
    <div style={box}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 800 }}>🎙️ Voice</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)' }}>
          <span style={dot(peerHere, inCall && v.peerSpeaking)} />
          {peerHere ? `${name} is in the call` : `${name} is not in the call`}
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {!inCall && v.state !== 'connecting' && (
            <button style={btn('go')} onClick={join} disabled={busy}>
              {busy ? 'Joining…' : v.state === 'dropped' ? 'Rejoin voice' : peerHere ? 'Join call' : 'Start call'}
            </button>
          )}
          {v.state === 'connecting' && <button style={btn()} disabled>Connecting…</button>}
          {inCall && (
            <>
              <button style={btn()} onClick={v.toggleMic} title={v.micOn ? 'Mute' : 'Unmute'}>
                {v.micOn ? '🎤 Mute' : '🔇 Unmute'}
              </button>
              <button style={btn('stop')} onClick={v.leave}>Leave</button>
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
      {v.state === 'dropped' && <div style={{ marginTop: 6, color: '#fbbf24', fontSize: 12 }}>The call dropped. Tap “Rejoin voice”.</div>}
      {inCall && v.audioBlocked && (
        <button style={{ ...btn(), marginTop: 6 }} onClick={v.enableAudio}>🔊 Tap to hear your friend</button>
      )}
      {err && <div style={{ marginTop: 6, color: '#fca5a5', fontSize: 12 }}>{err}</div>}
    </div>
  );
}
