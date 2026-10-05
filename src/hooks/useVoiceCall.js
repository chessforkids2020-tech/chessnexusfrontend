// hooks/useVoiceCall.js
// Audio-only LiveKit call (friend-game voice). Mic in, remote voices out.
import { useCallback, useEffect, useRef, useState } from 'react';

const AUDIO_CAPTURE = { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 };

export default function useVoiceCall() {
  const roomRef = useRef(null);
  const leavingRef = useRef(false);
  const audioElsRef = useRef(new Map());
  // idle | connecting | connected | reconnecting | dropped | error
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const [micOn, setMicOn] = useState(false);
  const [peerIn, setPeerIn] = useState(false);
  const [peerSpeaking, setPeerSpeaking] = useState(false);
  const [meSpeaking, setMeSpeaking] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const removeAudio = () => {
    audioElsRef.current.forEach(el => { try { el.remove(); } catch { /* */ } });
    audioElsRef.current.clear();
  };

  const join = useCallback(async ({ url, token }) => {
    leavingRef.current = false;
    setError('');
    setState('connecting');
    let LK;
    try { LK = await import('livekit-client'); } catch {
      setError('Voice is not available.'); setState('error'); return false;
    }
    const { Room, RoomEvent, Track } = LK;
    if (roomRef.current) { leavingRef.current = true; try { await roomRef.current.disconnect(); } catch { /* */ } leavingRef.current = false; }

    const r = new Room({
      audioCaptureDefaults: AUDIO_CAPTURE,
      publishDefaults: { dtx: true, red: true },
    });
    roomRef.current = r;
    const syncPeers = () => setPeerIn(r.remoteParticipants.size > 0);

    r.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind !== Track.Kind.Audio) return;
      const el = track.attach();
      el.style.display = 'none';
      document.body.appendChild(el);
      audioElsRef.current.set(track.sid, el);
    })
      .on(RoomEvent.TrackUnsubscribed, (track) => {
        try { track.detach().forEach(el => el.remove()); } catch { /* */ }
        audioElsRef.current.delete(track.sid);
      })
      .on(RoomEvent.ParticipantConnected, syncPeers)
      .on(RoomEvent.ParticipantDisconnected, syncPeers)
      .on(RoomEvent.ActiveSpeakersChanged, (sp) => {
        setPeerSpeaking(sp.some(p => !p.isLocal));
        setMeSpeaking(sp.some(p => p.isLocal));
      })
      .on(RoomEvent.Reconnecting, () => setState('reconnecting'))
      .on(RoomEvent.Reconnected, () => setState('connected'))
      .on(RoomEvent.AudioPlaybackStatusChanged, () => setAudioBlocked(!r.canPlaybackAudio))
      .on(RoomEvent.Disconnected, () => {
        if (roomRef.current !== r) return;
        roomRef.current = null;
        removeAudio();
        setPeerIn(false); setPeerSpeaking(false); setMeSpeaking(false); setMicOn(false);
        // Not our own Leave → the call dropped; offer a rejoin instead of going silent.
        setState(leavingRef.current ? 'idle' : 'dropped');
      });

    try {
      await r.connect(url, token);
    } catch {
      roomRef.current = null;
      setError('Could not connect to voice. Check your internet and try again.');
      setState('error');
      return false;
    }
    try { await r.startAudio(); } catch { /* shown via audioBlocked */ }
    setAudioBlocked(!r.canPlaybackAudio);
    syncPeers();
    setState('connected');
    try {
      await r.localParticipant.setMicrophoneEnabled(true);
      setMicOn(true);
    } catch (e) {
      // Stay in the call listen-only rather than failing the whole thing.
      setMicOn(false);
      setError(e?.name === 'NotAllowedError'
        ? 'Microphone blocked — allow it in your browser. You can still hear your friend.'
        : 'Microphone unavailable — you can still hear your friend.');
    }
    return true;
  }, []);

  const leave = useCallback(async () => {
    leavingRef.current = true;
    const r = roomRef.current;
    if (r) { try { await r.disconnect(); } catch { /* */ } }
    roomRef.current = null;
    removeAudio();
    setPeerIn(false); setPeerSpeaking(false); setMeSpeaking(false); setMicOn(false);
    setState('idle');
    setError('');
  }, []);

  const toggleMic = useCallback(async () => {
    const r = roomRef.current;
    if (!r) return;
    const next = !r.localParticipant.isMicrophoneEnabled;
    try {
      await r.localParticipant.setMicrophoneEnabled(next);
      setMicOn(r.localParticipant.isMicrophoneEnabled);
      setError('');
    } catch {
      setError('Microphone blocked — allow it in your browser.');
    }
  }, []);

  const enableAudio = useCallback(async () => {
    const r = roomRef.current;
    if (!r) return;
    try { await r.startAudio(); } catch { /* */ }
    setAudioBlocked(!r.canPlaybackAudio);
  }, []);

  useEffect(() => () => {
    leavingRef.current = true;
    roomRef.current?.disconnect().catch(() => {});
    removeAudio();
  }, []);

  return { state, error, micOn, peerIn, peerSpeaking, meSpeaking, audioBlocked, join, leave, toggleMic, enableAudio };
}
