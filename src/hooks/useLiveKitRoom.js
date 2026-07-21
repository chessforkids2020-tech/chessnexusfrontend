// hooks/useLiveKitRoom.js
// Thin wrapper around livekit-client for the Live Classroom: connect with a
// server-minted token, publish mic+camera (simulcast, 720p ceiling) and, for the
// host/controller, screen-share. Exposes participants + the active speaker so the
// page can render a Zoom-style grid with an HD pinned/active tile.
//
// livekit-client is loaded via dynamic import() so the app builds/runs even before
// the package is installed. Until it's installed, connect() rejects with a clear
// message and the rest of the classroom (waiting room, board, countdown) still works.
import { useCallback, useEffect, useRef, useState } from 'react';
import { createLightAppearanceProcessor, loadEffects, saveEffects } from '../lib/videoEffects';

// Publish ceiling. 720p HD now; change to 360p here later if bandwidth bites.
// Simulcast sends HD only to the pinned/active-speaker view, low-res thumbnails
// to the grid — the Zoom trick that keeps one box cheap.
const VIDEO_PRESET = { width: 1280, height: 720 }; // 720p ceiling
const SIMULCAST = true;

// ── Video CLARITY (the "grainy / noisy video" fix) ──────────────────────────
// LiveKit's default 720p bitrate is ~1.7 Mbps — enough to be watchable, but the
// encoder is bit-starved on detail/motion, which shows up as grain, blocking and
// "mosquito noise" (the fuzz the user sees vs. Zoom). Zoom pushes ~2.5–3.5 Mbps at
// 720p, which is why it looks clean. We raise the bitrate to ~2.6 Mbps and lock a
// smooth 30fps so the picture is crisp instead of noisy.
//   • If bandwidth becomes a problem for kids on weak wifi, adaptiveStream/dynacast
//     already scale DOWN automatically — so raising the ceiling is safe.
const VIDEO_ENCODING = {
  maxBitrate: 3_200_000, // ~3.2 Mbps — matches Zoom's clean 720p; adaptiveStream still scales DOWN on weak wifi
  maxFramerate: 30,
};

// Ask the browser to capture a specific, high-quality camera frame so we're not
// encoding an undersized source. `ideal` (not `exact`) so a weaker webcam still
// works — it just gives its best. Paired with the encoding above, this is the
// "sharp like Zoom" combination (good source in → enough bits out).
const VIDEO_CAPTURE_DEFAULTS = {
  resolution: { width: 1280, height: 720, frameRate: 30 },
};

// ── Audio quality (the Zoom-parity settings) ────────────────────────────────
// Raw mic capture = noisy, echoey, and quiet ("someone talking from kilometres
// away"). Zoom sounds good because it ALWAYS runs these three browser DSP filters:
//   • noiseSuppression  — kills fan/keyboard/background hiss
//   • echoCancellation  — stops the speaker feeding back into the mic
//   • autoGainControl   — auto-boosts quiet/soft voices to a steady loudness
//                         (this is the main cure for "too far away / not loud")
// Plus a voice-tuned mono capture and a healthy publish bitrate so speech stays
// crisp instead of thin.
const AUDIO_CAPTURE_DEFAULTS = {
  autoGainControl: true,
  echoCancellation: true,
  noiseSuppression: true,
  channelCount: 1,          // mono — voice doesn't need stereo; more bits per channel
  voiceIsolation: true,     // stronger speech focus where the browser supports it
  // Capture at 48 kHz so it matches Opus's native rate — no browser resample step,
  // which otherwise adds a subtle muddiness. Well-supported (ignored where not).
  sampleRate: 48000,
  sampleSize: 16,
};
// Voice bitrate. 32 kbps (LiveKit's speech preset) is intelligible but thin — it
// drops the higher frequencies that make speech sound crisp/present, which is why
// it wasn't "clear like Zoom". Zoom runs ~48–64 kbps for voice; 48 kbps is the
// sweet spot: noticeably clearer, still tiny bandwidth. Paired with RED (redundancy)
// + DTX below so weak-wifi resilience is unchanged.
const AUDIO_PUBLISH_BITRATE = 48000;

// ── Krisp AI noise filter — LICENSING GATE ──────────────────────────────────
// The Krisp filter is a PROPRIETARY LiveKit component under LiveKit's commercial
// Terms of Service (https://livekit.io/legal/terms-of-service) — it is NOT covered
// by the free Apache-2.0 licence that the self-hosted LiveKit *server* uses.
// For a SELF-HOSTED deployment (ours), using it in production may require a paid /
// commercial arrangement with LiveKit. It is OFF by default until that's confirmed.
//   → When licensing is cleared, set VITE_ENABLE_KRISP=true in the frontend env.
//   → While OFF, the free built-in browser DSP (noiseSuppression + echoCancellation
//     + autoGainControl, set in AUDIO_CAPTURE_DEFAULTS) still runs — audio is already
//     a big upgrade over raw capture; Krisp is only the extra "pro" layer.
const KRISP_ENABLED = import.meta.env?.VITE_ENABLE_KRISP === 'true';

// Attach the Krisp AI noise filter to the local microphone track (when enabled).
// Loaded lazily and wrapped in try/catch so a missing/unsupported plugin never
// takes the mic (or the whole classroom) down — we just fall back to the browser DSP.
async function applyKrisp(r) {
  if (!KRISP_ENABLED) return; // licensing gate — see note above
  try {
    const mic = r?.localParticipant?.getTrackPublication?.('microphone');
    const track = mic?.audioTrack || mic?.track;
    if (!track || typeof track.setProcessor !== 'function') return;
    const { KrispNoiseFilter, isKrispNoiseFilterSupported } = await import('@livekit/krisp-noise-filter');
    if (typeof isKrispNoiseFilterSupported === 'function' && !isKrispNoiseFilterSupported()) return;
    await track.setProcessor(KrispNoiseFilter());
  } catch { /* plugin unavailable/unsupported — built-in noiseSuppression still applies */ }
}

// Attach (or remove) the FREE RNNoise AI noise suppressor to the mic track. This is
// the open-source, no-license, no-cost path to Zoom-grade noise removal. Best-effort:
// any failure falls back silently to the browser's built-in noiseSuppression, so the
// mic never breaks. `on=false` removes it (back to the raw/browser-DSP mic).
async function applyNoiseSuppression(r, on) {
  try {
    const mic = r?.localParticipant?.getTrackPublication?.('microphone');
    const track = mic?.audioTrack || mic?.track;
    if (!track || typeof track.setProcessor !== 'function') return;
    if (on) {
      const { createNoiseSuppressionProcessor } = await import('../lib/noiseSuppression');
      await track.setProcessor(createNoiseSuppressionProcessor());
    } else if (typeof track.stopProcessor === 'function') {
      await track.stopProcessor();
    }
  } catch { /* unsupported/blocked — built-in noiseSuppression still applies */ }
}

// Set the WebRTC contentHint on the local camera's raw track. 'detail' tells the
// encoder to preserve sharpness (text/faces) rather than sacrificing it to keep
// motion fluid — the crispness knob Zoom-style apps use. No-op where unsupported.
function applyContentHint(r) {
  try {
    const pub = r?.localParticipant?.getTrackPublication?.('camera');
    const raw = (pub?.videoTrack || pub?.track)?.mediaStreamTrack;
    if (raw && 'contentHint' in raw) raw.contentHint = 'detail';
  } catch { /* unsupported — ignore */ }
}

// ── Zoom-style AUTO camera adjustment (the "flat / overexposed" fix) ──────────
// WebRTC hands you the camera in a NEUTRAL capture mode, so the picture looks flat
// and often a touch overexposed vs. Zoom — which drives the sensor's own continuous
// auto-exposure / auto-white-balance / auto-focus. We ask the CAMERA HARDWARE to do
// the same via applyConstraints. This is the ideal fix: the sensor's ISP does the
// tone/exposure/WB work (no canvas, no softening) — exactly what your analysis called
// for. Everything is capability-gated, so a webcam that lacks a knob just skips it.
async function applyCameraAutoAdjust(r, onInfo) {
  try {
    const pub = r?.localParticipant?.getTrackPublication?.('camera');
    const raw = (pub?.videoTrack || pub?.track)?.mediaStreamTrack;
    if (!raw || typeof raw.getCapabilities !== 'function') {
      onInfo?.({ settings: raw?.getSettings?.() || null, autoApplied: [], supports: {} });
      return;
    }
    const caps = raw.getCapabilities();
    const advanced = [];
    // SAFE-ONLY: request the sensor's own CONTINUOUS auto modes, and ONLY when the
    // device advertises them. These just say "keep auto-adjusting" (what Zoom relies
    // on) — they never force a fixed exposure/brightness value that could over- or
    // under-expose. A camera missing a knob simply skips it; nothing degrades.
    if (caps.exposureMode?.includes('continuous'))     advanced.push({ exposureMode: 'continuous' });
    if (caps.whiteBalanceMode?.includes('continuous')) advanced.push({ whiteBalanceMode: 'continuous' });
    if (caps.focusMode?.includes('continuous'))        advanced.push({ focusMode: 'continuous' });
    if (advanced.length) {
      await raw.applyConstraints({ advanced }).catch(() => {});
    }
    onInfo?.({
      settings: raw.getSettings?.() || null,
      autoApplied: advanced.map(a => Object.keys(a)[0]),
      supports: {
        exposureMode: caps.exposureMode || [],
        whiteBalanceMode: caps.whiteBalanceMode || [],
        focusMode: caps.focusMode || [],
      },
    });
  } catch { /* unsupported — ignore, raw camera still fine */ }
}

export default function useLiveKitRoom() {
  const [room, setRoom] = useState(null);
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState([]); // [{ identity, name, isLocal, isSpeaking, videoTrack, audioTrack, screenTrack }]
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [error, setError] = useState('');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  // Multi-webcam support: available cameras + the one currently publishing.
  const [cameras, setCameras] = useState([]);
  const [activeCameraId, setActiveCameraId] = useState('');
  // Camera capabilities + live settings, for the host "video info" readout so we can
  // SEE (in production) what the sensor actually supports and is publishing.
  const [camInfo, setCamInfo] = useState(null); // { settings, autoApplied: [...], supports: {...} }
  // Multi-mic support (external mic / headset): available mics + the one publishing.
  const [mics, setMics] = useState([]);
  const [activeMicId, setActiveMicId] = useState('');
  // ── Video effects (Zoom-style, free) ──
  // light/appearance settings (persisted) + background-blur toggle. The effects
  // object is read live by the canvas processor via a ref so changing a slider
  // updates the published video instantly without re-creating the track.
  const [effects, setEffects] = useState(() => loadEffects());
  const [blurOn, setBlurOn] = useState(false);
  // Free AI noise suppression (RNNoise). Persisted so "set once, always used".
  // Default OFF until the coach turns it on and confirms it sounds good.
  const [noiseSuppression, setNoiseSuppressionState] = useState(() => {
    try { return localStorage.getItem('cn_noise_suppression') === 'on'; } catch { return false; }
  });
  const noiseSuppressionRef = useRef(noiseSuppression);
  noiseSuppressionRef.current = noiseSuppression;
  const effectsRef = useRef(effects);
  effectsRef.current = effects;
  const blurRef = useRef(false);     // desired blur on/off (read inside callbacks)
  const lightProcRef = useRef(null); // our canvas light/appearance processor
  const blurProcRef = useRef(null);  // @livekit/track-processors BackgroundBlur
  const applyVideoRef = useRef(() => {}); // latest applyVideoProcessor (avoids ordering issues)
  const roomRef = useRef(null);

  const loadCameras = useCallback(async () => {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      setCameras(devs.filter((d) => d.kind === 'videoinput'));
      setMics(devs.filter((d) => d.kind === 'audioinput'));
    } catch { /* permissions not granted yet */ }
  }, []);

  // Keep the camera list fresh when devices are (un)plugged.
  useEffect(() => {
    const onChange = () => loadCameras();
    navigator.mediaDevices?.addEventListener?.('devicechange', onChange);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', onChange);
  }, [loadCameras]);

  const refresh = useCallback((r) => {
    if (!r) return;
    const list = [];
    const pack = (p, isLocal) => {
      let videoTrack = null, audioTrack = null, screenTrack = null;
      p.trackPublications?.forEach((pub) => {
        const isScreen = pub.source === 'screen_share' || pub.source === 'screen_share_audio';
        // Ensure remote screen-share tracks are actually subscribed. With
        // adaptiveStream, a remote track may stay unsubscribed until requested,
        // so the host would never receive the student's screen. Force it.
        if (!isLocal && isScreen && pub.isSubscribed === false && typeof pub.setSubscribed === 'function') {
          try { pub.setSubscribed(true); } catch { /* ignore */ }
        }
        const t = pub.track;
        if (!t) return;
        if (isScreen) { if (pub.kind !== 'audio') screenTrack = t; }
        // A muted camera counts as "no video" so the UI can show the avatar tile.
        else if (pub.kind === 'video') videoTrack = pub.isMuted ? null : t;
        else if (pub.kind === 'audio') audioTrack = pub.isMuted ? null : t;
      });
      // Token metadata carries { avatar } — the profile photo to show when the
      // camera is off.
      let avatar = null;
      try { avatar = p.metadata ? (JSON.parse(p.metadata).avatar || null) : null; } catch { /* ignore */ }
      list.push({ identity: p.identity, name: p.name || p.identity, isLocal, isSpeaking: p.isSpeaking, videoTrack, audioTrack, screenTrack, avatar });
    };
    if (r.localParticipant) pack(r.localParticipant, true);
    r.remoteParticipants?.forEach((p) => pack(p, false));
    setParticipants(list);
  }, []);

  const connect = useCallback(async ({ url, token }) => {
    setError('');
    let LK;
    try {
      LK = await import('livekit-client');
    } catch (e) {
      setError('Video library not installed (livekit-client).');
      throw e;
    }
    const { Room, RoomEvent, Track } = LK;
    // If we're already connected (e.g. reconnecting with a fresh token after a
    // control change), tear down the old room first to avoid a dangling
    // connection / duplicate participant.
    if (roomRef.current) { try { await roomRef.current.disconnect(); } catch { /* */ } roomRef.current = null; }
    const r = new Room({
      adaptiveStream: true,
      dynacast: true,
      // Apply the Zoom-parity mic DSP (noise suppression / echo cancel / auto gain)
      // to every mic we capture, and publish voice at a clear bitrate.
      audioCaptureDefaults: AUDIO_CAPTURE_DEFAULTS,
      // Capture a full 720p30 source so the encoder isn't upscaling a small frame.
      videoCaptureDefaults: VIDEO_CAPTURE_DEFAULTS,
      publishDefaults: {
        simulcast: SIMULCAST,
        videoResolution: VIDEO_PRESET,
        // Higher video bitrate = clean picture instead of grainy/noisy compression.
        videoEncoding: VIDEO_ENCODING,
        // Prefer VP9: noticeably cleaner image at the same bitrate than the older VP8
        // default. backupCodec lets browsers that can't do VP9 fall back to VP8 so
        // nobody fails to publish (e.g. some Safari/older devices).
        videoCodec: 'vp9',
        backupCodec: true,
        audioPreset: { maxBitrate: AUDIO_PUBLISH_BITRATE },
        // Discontinuous transmission + forward error correction: cleaner speech on
        // lossy connections (kids on home wifi), less garble.
        dtx: true,
        red: true,
      },
    });
    roomRef.current = r;

    const onChange = () => refresh(r);
    // Keep the mic/cam button state in sync with reality (e.g. the device being
    // lost to another app flips the published track to muted).
    const syncLocal = () => {
      setMicOn(r.localParticipant.isMicrophoneEnabled);
      setCamOn(r.localParticipant.isCameraEnabled);
      refresh(r);
    };
    r.on(RoomEvent.ParticipantConnected, onChange)
      .on(RoomEvent.ParticipantDisconnected, onChange)
      .on(RoomEvent.TrackSubscribed, onChange)
      .on(RoomEvent.TrackUnsubscribed, onChange)
      // A remote track being PUBLISHED (before subscription) — needed so we notice
      // a student's screen share and force-subscribe it.
      .on(RoomEvent.TrackPublished, onChange)
      .on(RoomEvent.TrackUnpublished, onChange)
      .on(RoomEvent.TrackMuted, syncLocal)
      .on(RoomEvent.TrackUnmuted, syncLocal)
      .on(RoomEvent.LocalTrackPublished, syncLocal)
      .on(RoomEvent.LocalTrackUnpublished, syncLocal)
      .on(RoomEvent.ParticipantMetadataChanged, onChange)
      .on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        setActiveSpeaker(speakers?.[0]?.identity || null);
        onChange();
      })
      .on(RoomEvent.Disconnected, () => { setConnected(false); });

    await r.connect(url, token);

    // ── FAST PATH: get the coach INTO the room ASAP ──────────────────────────────
    // Enable mic + camera in PARALLEL (not serially), then immediately mark connected
    // and render the UI. The old code awaited mic → Krisp → RNNoise → camera →
    // auto-adjust → video-effects one after another before showing anything, which
    // took ~20-30s (RNNoise WASM + canvas processor setup are slow). None of those
    // "polish" steps are needed to SEE the room, so they now run in the BACKGROUND.
    await Promise.all([
      r.localParticipant.setMicrophoneEnabled(true, AUDIO_CAPTURE_DEFAULTS).catch(() => {}),
      r.localParticipant.setCameraEnabled(true).catch(() => {}),
    ]);
    setRoom(r);
    setConnected(true);   // UI + waiting room show now — no waiting on the polish steps
    refresh(r);

    // ── BACKGROUND: apply the heavy/optional enhancements after the UI is live. ──
    // A failure in any of these must never block or break the classroom.
    (async () => {
      try {
        // Camera sensor auto-exposure / white-balance / focus (quick, hardware).
        applyContentHint(r);
        await applyCameraAutoAdjust(r, setCamInfo);
        // Saved video effects (canvas processor) — visual polish, can lag a beat.
        try { await applyVideoRef.current(); } catch { /* effects optional */ }
        // AI noise filters — the SLOWEST (WASM + AudioWorklet), so last + non-blocking.
        await applyKrisp(r);
        if (!KRISP_ENABLED && noiseSuppressionRef.current) await applyNoiseSuppression(r, true);
      } catch { /* best-effort enhancements */ }
    })();

    // Device labels (available once permissions granted). Also background.
    (async () => {
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        setCameras(devs.filter((d) => d.kind === 'videoinput'));
        setMics(devs.filter((d) => d.kind === 'audioinput'));
        if (typeof r.getActiveDevice === 'function') {
          const activeCam = r.getActiveDevice('videoinput');
          if (activeCam && typeof activeCam === 'string') setActiveCameraId(activeCam);
          const activeMic = r.getActiveDevice('audioinput');
          if (activeMic && typeof activeMic === 'string') setActiveMicId(activeMic);
        }
      } catch { /* ignore */ }
    })();
    return r;
  }, [refresh]);

  // Switch which webcam is publishing (live, no reconnect).
  const switchCamera = useCallback(async (deviceId) => {
    const r = roomRef.current; if (!r || !deviceId) return;
    try {
      await r.switchActiveDevice('videoinput', deviceId);
      setActiveCameraId(deviceId);
      applyContentHint(r);              // new track → re-set the sharpness hint
      await applyCameraAutoAdjust(r, setCamInfo);   // new sensor → drive its continuous auto modes
      await applyVideoRef.current();    // re-apply effects to the new camera track
      refresh(r);
    } catch {
      setError('Could not switch camera.');
    }
  }, [refresh]);

  // Switch which microphone is publishing (live, no reconnect). Re-applies the
  // Krisp filter to the new mic track so noise removal follows the device choice.
  const switchMic = useCallback(async (deviceId) => {
    const r = roomRef.current; if (!r || !deviceId) return;
    try {
      await r.switchActiveDevice('audioinput', deviceId);
      setActiveMicId(deviceId);
      await applyKrisp(r);
      refresh(r);
    } catch {
      setError('Could not switch microphone.');
    }
  }, [refresh]);

  // ── Video effects: light/appearance canvas OR background blur (one at a time) ──
  // LiveKit allows a single processor per video track, so we swap between our free
  // canvas light/appearance processor and the (also-free, Apache-2.0) background
  // blur processor. Called whenever effects/blur change or the camera (re)starts.
  const applyVideoProcessor = useCallback(async () => {
    const r = roomRef.current; if (!r) return;
    const pub = r.localParticipant.getTrackPublication?.('camera');
    const camTrack = pub?.videoTrack || pub?.track;
    if (!camTrack || typeof camTrack.setProcessor !== 'function') return;

    const wantBlur = blurRef.current;
    const wantLight = effectsRef.current?.enabled;
    try {
      if (wantBlur) {
        // Background blur wins if enabled (mutually exclusive with light/appearance).
        const { BackgroundBlur } = await import('@livekit/track-processors');
        // Only (re)create if blur isn't already the active processor. We track this
        // via our own ref rather than the processor's `.name` — in @livekit/track-
        // processors the BackgroundBlur processor is named "background-processor",
        // NOT "background-blur", so the old `.name !== 'background-blur'` guard was
        // always true and could re-attach on every call. Ref-presence is exact.
        if (!blurProcRef.current) {
          // Self-host the MediaPipe segmentation assets. By default the library
          // fetches the WASM from cdn.jsdelivr.net and the model from
          // storage.googleapis.com — if EITHER external request is blocked (ad-
          // blocker, CSP, school/office network, offline, CDN down) the segmenter
          // silently fails to init and blur never appears. Pointing at files we
          // ship in /public/mediapipe makes blur work everywhere, no CDN needed.
          const base = import.meta.env.BASE_URL || '/';
          // Signature: BackgroundBlur(blurRadius, segmenterOptions, onFrameProcessed,
          // processorOptions). assetPaths lives in the 4th arg (processorOptions).
          blurProcRef.current = BackgroundBlur(12, undefined, undefined, {
            assetPaths: {
              tasksVisionFileSet: `${base}mediapipe/wasm`,
              modelAssetPath: `${base}mediapipe/selfie_segmenter.tflite`,
            },
          });
          await camTrack.setProcessor(blurProcRef.current);
        }
        lightProcRef.current = null;
      } else if (wantLight) {
        if (blurProcRef.current) { blurProcRef.current = null; }
        if (!lightProcRef.current) {
          lightProcRef.current = createLightAppearanceProcessor(() => effectsRef.current);
          await camTrack.setProcessor(lightProcRef.current);
        }
        // Slider changes are read live via the getter — no re-attach needed.
      } else {
        // Nothing enabled → remove any processor (raw camera).
        blurProcRef.current = null; lightProcRef.current = null;
        if (typeof camTrack.stopProcessor === 'function') await camTrack.stopProcessor();
      }
    } catch (err) {
      // Blur/light failed — drop the ref so a retry can re-create cleanly, log the
      // real reason (silent failure was why "changing it never worked"), and tell
      // the user accurately.
      blurProcRef.current = null; lightProcRef.current = null;
      // eslint-disable-next-line no-console
      console.error('[LiveClassroom] video processor failed:', err);
      setError('Video effect unavailable on this device — using the plain camera.');
    }
  }, []);
  applyVideoRef.current = applyVideoProcessor;

  // Update light/appearance settings (persisted; applied live).
  const updateEffects = useCallback((patch) => {
    setEffects(prev => {
      const next = { ...prev, ...patch };
      effectsRef.current = next;
      saveEffects(next);
      return next;
    });
    // If turning light on/off, (re)apply the processor.
    if ('enabled' in patch) setTimeout(() => applyVideoProcessor(), 0);
  }, [applyVideoProcessor]);

  const toggleBlur = useCallback(async (on) => {
    const next = typeof on === 'boolean' ? on : !blurRef.current;
    blurRef.current = next;
    setBlurOn(next);
    await applyVideoProcessor();
  }, [applyVideoProcessor]);

  // Toggle the free RNNoise AI noise suppression on the mic (persisted). Applied live
  // to the current mic track. If Krisp is licensed/enabled it owns the mic instead.
  const toggleNoiseSuppression = useCallback(async (on) => {
    const next = typeof on === 'boolean' ? on : !noiseSuppressionRef.current;
    noiseSuppressionRef.current = next;
    setNoiseSuppressionState(next);
    try { localStorage.setItem('cn_noise_suppression', next ? 'on' : 'off'); } catch { /* */ }
    const r = roomRef.current;
    if (r && !KRISP_ENABLED) await applyNoiseSuppression(r, next);
  }, []);

  const disconnect = useCallback(async () => {
    try { await roomRef.current?.disconnect(); } catch { /* ignore */ }
    roomRef.current = null;
    setRoom(null); setConnected(false); setParticipants([]); setScreenOn(false);
  }, []);

  const toggleMic = useCallback(async () => {
    const r = roomRef.current; if (!r) return;
    // Derive the target from the ACTUAL published state, not our cached flag —
    // another app (or a device change) can desync the two.
    const isOn = r.localParticipant.isMicrophoneEnabled;
    try {
      // Re-apply the audio DSP options when turning the mic back on.
      await r.localParticipant.setMicrophoneEnabled(!isOn, isOn ? undefined : AUDIO_CAPTURE_DEFAULTS);
      setMicOn(r.localParticipant.isMicrophoneEnabled);
      // Turning ON creates a fresh track — re-attach the noise filter to it.
      if (!isOn) {
        await applyKrisp(r);
        if (!KRISP_ENABLED && noiseSuppressionRef.current) await applyNoiseSuppression(r, true);
      }
    } catch {
      setError('Could not toggle microphone.');
    }
    refresh(r);
  }, [refresh]);

  const toggleCam = useCallback(async () => {
    const r = roomRef.current; if (!r) return;
    const isOn = r.localParticipant.isCameraEnabled;
    try {
      if (isOn) {
        await r.localParticipant.setCameraEnabled(false);
      } else {
        // Turning ON: another app (e.g. Zoom) may have grabbed the webcam while
        // we were away, leaving a dead track. Force a fresh acquisition, and if
        // the preferred device is busy, fall back to any available camera.
        const opts = activeCameraId ? { deviceId: activeCameraId } : undefined;
        try {
          await r.localParticipant.setCameraEnabled(true, opts);
        } catch {
          await r.localParticipant.setCameraEnabled(true); // default device
        }
      }
      setCamOn(r.localParticipant.isCameraEnabled);
      // Turning the camera back on creates a fresh track — re-apply hint + auto-adjust + effects.
      if (!isOn && r.localParticipant.isCameraEnabled) { applyContentHint(r); await applyCameraAutoAdjust(r, setCamInfo); await applyVideoRef.current(); }
      if (!r.localParticipant.isCameraEnabled && !isOn) {
        setError('Camera is in use by another app. Close it (e.g. Zoom) and try again.');
      } else {
        setError('');
      }
    } catch {
      setError('Camera is in use by another app. Close it (e.g. Zoom) and try again.');
    }
    refresh(r);
  }, [refresh, activeCameraId]);

  // Host/controller only (server also enforces via token grants).
  const toggleScreen = useCallback(async () => {
    const r = roomRef.current; if (!r) return;
    const next = !screenOn;
    try {
      await r.localParticipant.setScreenShareEnabled(next);
      setScreenOn(next); refresh(r);
    } catch {
      setError('Screen share not permitted or was cancelled.');
    }
  }, [screenOn, refresh]);

  useEffect(() => () => { roomRef.current?.disconnect().catch(() => {}); }, []);

  return {
    room, connected, participants, activeSpeaker, error,
    micOn, camOn, screenOn,
    cameras, activeCameraId, switchCamera,
    mics, activeMicId, switchMic,
    effects, updateEffects, blurOn, toggleBlur,
    noiseSuppression, toggleNoiseSuppression,
    connect, disconnect, toggleMic, toggleCam, toggleScreen,
    camInfo,
  };
}
