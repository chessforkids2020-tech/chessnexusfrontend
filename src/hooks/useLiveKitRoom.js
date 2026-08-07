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

// Classify a getUserMedia/LiveKit device error into something we can show a human.
// The names are the standard DOMException names browsers throw; LiveKit wraps them
// but preserves `name`, and some browsers only set `message`, so we check both.
function classifyDeviceError(err) {
  const name = err?.name || '';
  const msg = String(err?.message || '');
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' ||
      /permission|denied|dismissed/i.test(msg)) return 'blocked';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' ||
      /not ?found|no device/i.test(msg)) return 'missing';
  if (name === 'NotReadableError' || name === 'TrackStartError' ||
      /in use|could not start|busy/i.test(msg)) return 'busy';
  return 'failed';
}

export default function useLiveKitRoom() {
  const [room, setRoom] = useState(null);
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState([]); // [{ identity, name, isLocal, isSpeaking, videoTrack, audioTrack, screenTrack }]
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [error, setError] = useState('');
  // Browsers block audio playback until the page has had a real user gesture.
  // LiveKit reports this via canPlaybackAudio / AudioPlaybackStatusChanged and
  // unblocks with room.startAudio(). Without it, EVERY remote voice is silent
  // with no error and no clue — the coach just hears nothing.
  const [audioBlocked, setAudioBlocked] = useState(false);
  // Why the camera/mic failed to start, if they did. The join path deliberately does
  // NOT block on device setup (see the fast path in connect()), so without this the
  // failure was swallowed entirely and the student sat in a dead, silent class with
  // nothing on screen explaining it.
  //   kind: 'blocked'  — browser/OS denied permission (cannot be re-prompted from JS)
  //         'missing'  — no camera/mic attached
  //         'busy'     — device held by another app (Zoom/Teams)
  //         'failed'   — anything else
  const [deviceIssue, setDeviceIssue] = useState(null); // { mic, cam, kind } | null
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
  // Defaults ON: this is the only thing standing between a class and a student's
  // kitchen/TV/sibling noise, and nobody thinks to switch it on before joining —
  // it was previously opt-in, so in practice it was off for everyone. Anyone who
  // dislikes it can still turn it off, and that choice is remembered ('off').
  const [noiseSuppression, setNoiseSuppressionState] = useState(() => {
    try { return localStorage.getItem('cn_noise_suppression') !== 'off'; } catch { return true; }
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
  // Interval that re-requests any still-unsubscribed remote publication.
  const resubTimerRef = useRef(null);

  const loadCameras = useCallback(async () => {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      const cams = devs.filter((d) => d.kind === 'videoinput');
      setCameras(cams);
      setMics(devs.filter((d) => d.kind === 'audioinput'));

      // Re-sync WHICH device is active, not just the list.
      //
      // activeCameraId was previously read once at join and never again, so
      // after a camera was toggled off (LiveKit releases the device) the
      // dropdown showed NOTHING selected — the exact symptom seen in a real
      // class — and toggleCam then retried with an id that could be stale.
      const r = roomRef.current;
      if (r && typeof r.getActiveDevice === 'function') {
        try {
          const cam = r.getActiveDevice('videoinput');
          if (typeof cam === 'string' && cam) setActiveCameraId(cam);
          const mic = r.getActiveDevice('audioinput');
          if (typeof mic === 'string' && mic) setActiveMicId(mic);
        } catch { /* not connected yet */ }
      }
      // Drop a remembered id that no longer matches any real device, so the
      // next camera start asks for the default rather than a ghost.
      setActiveCameraId(prev => (prev && !cams.some(c => c.deviceId === prev) ? '' : prev));
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
      // The camera track even while MUTED — see the note where it is set.
      let videoTrackRaw = null, audioTrackRaw = null;
      // Is a camera PUBLISHED and unmuted, regardless of whether we have
      // subscribed to it yet? A remote publication exists (and reports its mute
      // state) well before `pub.track` is populated, so this is the only honest
      // answer to "is this student's camera on?" during the subscribe window.
      let camPublished = false;
      p.trackPublications?.forEach((pub) => {
        const isScreen = pub.source === 'screen_share' || pub.source === 'screen_share_audio';
        // Force-subscribe EVERY remote track, not just screen share. With
        // adaptiveStream, LiveKit leaves a track unsubscribed until its video
        // element is actually visible — so a student whose tile isn't rendered
        // (videos floated/popped/hidden, board on stage, tile scrolled out of the
        // rail) never gets subscribed, and the coach sees "camera on" but no
        // picture and hears nothing. Audio must ALWAYS be subscribed: it has no
        // video element to become visible, so adaptiveStream can otherwise leave
        // a talking student permanently silent.
        if (!isLocal && pub.isSubscribed === false && typeof pub.setSubscribed === 'function') {
          try { pub.setSubscribed(true); } catch { /* ignore */ }
        }
        // Record "camera is publishing" BEFORE the `!t` bail below. A remote
        // publication reports kind/source/isMuted immediately, but `pub.track`
        // stays null until TrackSubscribed lands. Bailing out first made a
        // student whose subscription was still in flight — or never completed —
        // indistinguishable from one who had switched their camera off: the
        // coach saw a black tile and the "ask them to turn the camera on"
        // button for a child whose camera was in fact on the whole time.
        if (!isLocal && !isScreen && pub.kind === 'video' && !pub.isMuted) camPublished = true;
        const t = pub.track;
        if (!t) return;
        if (isScreen) { if (pub.kind !== 'audio') screenTrack = t; }
        // A muted camera counts as "no video" so the UI can show the avatar tile.
        //
        // We ALSO keep the track itself in `videoTrackRaw`. Nulling it was the
        // whole cause of "student turns camera off and on, tile stays black":
        // the tile unmounted its <video>, and because LiveKit hands back the
        // SAME track object on unmute, React saw unchanged props and never
        // re-attached. Exposing the raw track lets the tile stay subscribed to
        // that track's own mute/unmute events across the whole cycle.
        else if (pub.kind === 'video') { videoTrackRaw = t; videoTrack = pub.isMuted ? null : t; }
        // Same reasoning as video above: keep the track even while muted so the
        // player can listen for ITS unmute and re-attach. A student reported
        // "mic allowed but I can't hear the coach", fixed only by rejoining —
        // the same stale-attach bug, on the audio path.
        else if (pub.kind === 'audio') { audioTrackRaw = t; audioTrack = pub.isMuted ? null : t; }
      });
      // Token metadata carries { avatar } — the profile photo to show when the
      // camera is off.
      let avatar = null;
      try { avatar = p.metadata ? (JSON.parse(p.metadata).avatar || null) : null; } catch { /* ignore */ }
      list.push({ identity: p.identity, name: p.name || p.identity, isLocal, isSpeaking: p.isSpeaking, videoTrack, videoTrackRaw, audioTrack, audioTrackRaw, screenTrack, avatar, camPublished });
    };
    if (r.localParticipant) pack(r.localParticipant, true);
    r.remoteParticipants?.forEach((p) => pack(p, false));
    // Only publish a NEW array when something a tile actually renders has
    // changed. refresh() runs on ActiveSpeakersChanged — i.e. every time anyone
    // speaks — and previously handed React a brand-new array of brand-new
    // objects each time, re-rendering every tile in the class for nothing.
    // Speaking state is compared too (it draws the green ring), but track
    // identity is what matters: an unchanged list must stay referentially equal
    // so the video elements are left alone.
    setParticipants((prev) => {
      if (prev.length === list.length) {
        const same = list.every((n, i) => {
          const o = prev[i];
          return o
            && o.identity === n.identity
            && o.isSpeaking === n.isSpeaking
            && o.camPublished === n.camPublished
            && o.videoTrack === n.videoTrack
            && o.videoTrackRaw === n.videoTrackRaw
            && o.audioTrack === n.audioTrack
            && o.audioTrackRaw === n.audioTrackRaw
            && o.screenTrack === n.screenTrack
            && o.name === n.name
            && o.avatar === n.avatar;
        });
        if (same) return prev;      // nothing to re-render
      }
      return list;
    });
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
      // Mute/unmute must run the FULL refresh, not just syncLocal.
      //
      // Turning a camera off MUTES the publication (the track object survives);
      // turning it back on unmutes the SAME object. buildParticipants maps a
      // muted video publication to `videoTrack: null`, so on unmute the list has
      // to be rebuilt or the tile keeps its stale null and stays black. syncLocal
      // only touches the local mic/cam state, so a REMOTE student's unmute never
      // reached the participant list at all.
      .on(RoomEvent.TrackMuted, onChange)
      .on(RoomEvent.TrackUnmuted, onChange)
      .on(RoomEvent.LocalTrackPublished, syncLocal)
      .on(RoomEvent.LocalTrackUnpublished, syncLocal)
      .on(RoomEvent.ParticipantMetadataChanged, onChange)
      .on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        setActiveSpeaker(speakers?.[0]?.identity || null);
        onChange();
      })
      .on(RoomEvent.Disconnected, () => { setConnected(false); })
      // Autoplay policy: fires when the browser blocks (or later allows) audio.
      .on(RoomEvent.AudioPlaybackStatusChanged, () => {
        setAudioBlocked(!r.canPlaybackAudio);
      });

    await r.connect(url, token);

    // SUBSCRIPTION REPAIR SWEEP.
    //
    // Force-subscribing once on TrackPublished is not enough in practice: the
    // request can be dropped, deferred by adaptiveStream, or lost across a brief
    // reconnect, and nothing retries it. The symptom in class is a student whose
    // camera is genuinely on but whose tile stays black for everyone — and a
    // coach cannot tell a child to reload mid-lesson.
    //
    // So every few seconds, re-request any remote publication that is still
    // unsubscribed. It is a no-op once everything is subscribed (the common
    // case), and it is what makes recovery automatic rather than manual.
    if (resubTimerRef.current) clearInterval(resubTimerRef.current);
    resubTimerRef.current = setInterval(() => {
      const room = roomRef.current;
      if (!room) return;
      let repaired = false;
      room.remoteParticipants?.forEach((p) => {
        p.trackPublications?.forEach((pub) => {
          if (pub.isSubscribed === false && typeof pub.setSubscribed === 'function') {
            try { pub.setSubscribed(true); repaired = true; } catch { /* ignore */ }
          }
        });
      });
      // Only re-render when we actually asked for something new.
      if (repaired) refresh(room);
    }, 4000);

    // Unblock audio as early as possible. Joining the class is itself a user
    // gesture in most flows, so this usually succeeds silently; if the browser
    // still refuses, `audioBlocked` drives a "tap to enable sound" prompt.
    try {
      await r.startAudio();
      setAudioBlocked(false);
    } catch {
      setAudioBlocked(!r.canPlaybackAudio);
    }

    // ── FAST PATH: get the coach INTO the room ASAP ──────────────────────────────
    // Enable mic + camera in PARALLEL (not serially), then immediately mark connected
    // and render the UI. The old code awaited mic → Krisp → RNNoise → camera →
    // auto-adjust → video-effects one after another before showing anything, which
    // took ~20-30s (RNNoise WASM + canvas processor setup are slow). None of those
    // "polish" steps are needed to SEE the room, so they now run in the BACKGROUND.
    // Failures are RECORDED, not swallowed: entering the room must never be blocked by
    // a dead device, but the user still has to be told why they're silent/invisible.
    const [micRes, camRes] = await Promise.all([
      r.localParticipant.setMicrophoneEnabled(true, AUDIO_CAPTURE_DEFAULTS)
        .then(() => null).catch((e) => e),
      r.localParticipant.setCameraEnabled(true).then(() => null).catch((e) => e),
    ]);
    // ONE RETRY for the camera, on its own.
    //
    // Mic and camera are requested in PARALLEL above (for speed), and some
    // machines cannot serve both getUserMedia calls at once — the camera loses
    // the race and comes back NotReadableError/TrackStartError even though the
    // permission was granted and the device is perfectly fine. That is the
    // "browser says camera is allowed and available, but the classroom cannot
    // open it" case, and it hits ONE student on ONE machine while everyone else
    // is fine, which is exactly the reported symptom.
    //
    // Retrying alone, after the mic has finished, costs nothing when the first
    // attempt worked (this block does not run) and rescues that student.
    let camFinal = camRes;
    if (camRes) {
      await new Promise(res => setTimeout(res, 500));
      camFinal = await r.localParticipant.setCameraEnabled(true)
        .then(() => null).catch((e) => e);
    }

    if (micRes || camFinal) {
      // Permission is asked for both at once, so a block usually fails both. Report the
      // most actionable cause: a hard block outranks a missing/busy device.
      const kinds = [micRes && classifyDeviceError(micRes), camFinal && classifyDeviceError(camFinal)].filter(Boolean);
      setDeviceIssue({
        mic: !!micRes,
        cam: !!camFinal,
        kind: kinds.includes('blocked') ? 'blocked' : kinds[0],
      });
    } else {
      setDeviceIssue(null);
    }
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

  // Re-attempt camera + mic after the user has fixed their browser/OS permission, so
  // they don't have to leave and rejoin the class. Safe to call any time.
  const retryDevices = useCallback(async () => {
    const r = roomRef.current;
    if (!r) return false;
    const [micRes, camRes] = await Promise.all([
      r.localParticipant.setMicrophoneEnabled(true, AUDIO_CAPTURE_DEFAULTS)
        .then(() => null).catch((e) => e),
      r.localParticipant.setCameraEnabled(true).then(() => null).catch((e) => e),
    ]);
    if (micRes || camRes) {
      const kinds = [micRes && classifyDeviceError(micRes), camRes && classifyDeviceError(camRes)].filter(Boolean);
      setDeviceIssue({ mic: !!micRes, cam: !!camRes, kind: kinds.includes('blocked') ? 'blocked' : kinds[0] });
      refresh(r);
      return false;
    }
    // Working again — clear the warning and re-apply the optional polish.
    setDeviceIssue(null);
    setMicOn(r.localParticipant.isMicrophoneEnabled);
    setCamOn(r.localParticipant.isCameraEnabled);
    try {
      applyContentHint(r);
      await applyCameraAutoAdjust(r, setCamInfo);
      await applyVideoRef.current();
    } catch { /* effects are optional */ }
    loadCameras();
    refresh(r);
    return true;
  }, [refresh, loadCameras]);

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

  // Call from a real user gesture (click/tap) to satisfy the browser's autoplay
  // policy and start playing remote audio.
  const enableAudio = useCallback(async () => {
    const r = roomRef.current;
    if (!r) return false;
    try {
      await r.startAudio();
      setAudioBlocked(!r.canPlaybackAudio);
      return r.canPlaybackAudio !== false;
    } catch {
      setAudioBlocked(true);
      return false;
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (resubTimerRef.current) { clearInterval(resubTimerRef.current); resubTimerRef.current = null; }
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

  // SERIALISES every camera change. Two setCameraEnabled calls overlapping is
  // a real way to end up with a LIVE BUT FROZEN track: the browser is still
  // tearing the device down when the next acquisition starts, and Chrome hands
  // back a MediaStreamTrack that reports readyState 'live' while producing zero
  // frames. Nothing downstream can tell that apart from a working camera —
  // LiveKit dutifully encodes and sends black.
  //
  // A promise chain means off→on→off, however fast the clicking, always runs in
  // order and never overlaps.
  const camQueueRef = useRef(Promise.resolve());
  const enqueueCam = useCallback((fn) => {
    const next = camQueueRef.current.then(fn, fn);
    // Swallow rejections so one failure cannot poison every later call.
    camQueueRef.current = next.catch(() => {});
    return next;
  }, []);

  // Set the camera to an EXPLICIT state. `toggleCam` flips whatever is current;
  // this says exactly what you want, which matters for repair flows — two
  // toggles in a row can race (each reads the live published state) and leave a
  // student's camera OFF, with a black tile and no way back.
  const setCam = useCallback((want) => enqueueCam(async () => {
    const r = roomRef.current; if (!r) return;
    const isOn = r.localParticipant.isCameraEnabled;
    if (isOn === want) return;          // already there
    try {
      if (!want) {
        await r.localParticipant.setCameraEnabled(false);
      } else {
        // Turning ON: another app (e.g. Zoom) may have grabbed the webcam while
        // we were away, leaving a dead track. Force a fresh acquisition, and if
        // the preferred device is busy, fall back to any available camera.
        const opts = activeCameraId ? { deviceId: activeCameraId } : undefined;
        try {
          await r.localParticipant.setCameraEnabled(true, opts);
        } catch {
          // The remembered deviceId is STALE. Windows reassigns camera ids
          // fairly readily, especially with two cameras, so a saved id can point
          // at a device that no longer exists — and the retry then failed the
          // same way every time, which is why pressing the button repeatedly did
          // nothing in a real class. Forget it before falling back, so the next
          // press asks for any camera instead of the dead one again.
          setActiveCameraId('');
          await r.localParticipant.setCameraEnabled(true); // default device
        }
        // VERIFY, don't assume. setCameraEnabled(true) can resolve while the
        // camera is still not actually publishing — the device may not have
        // been released yet by the track we just stopped, which is exactly the
        // case in a repair flow (off → 400ms → on). Without this check the
        // student is left with the camera OFF and a black tile, which is how
        // the coach's "fix video" button ended up making things worse.
        if (!r.localParticipant.isCameraEnabled) {
          await new Promise(res => setTimeout(res, 600));
          try { await r.localParticipant.setCameraEnabled(true); } catch { /* reported below */ }
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
    // Resync participant state here rather than in toggleCam, so the repair
    // flows (which call setCam directly) get it too.
    refresh(r);
  }), [enqueueCam, refresh, activeCameraId]);

  // Flip the camera. Delegates to setCam so both paths share one implementation.
  const toggleCam = useCallback(async () => {
    const r = roomRef.current; if (!r) return;
    await setCam(!r.localParticipant.isCameraEnabled);
  }, [setCam]);

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

  // ── FROZEN CAMERA WATCHDOG ──────────────────────────────────────────────
  //
  // The failure nothing else here can see: the MediaStreamTrack reports
  // readyState 'live' and muted === false, LiveKit is happily publishing, and
  // the camera is producing ZERO FRAMES. Every other repair in this file
  // re-attaches or republishes — all of which faithfully re-plumb a dead
  // source. The only cure is asking the browser for the device again.
  //
  // Detection uses the sender's own stats: framesPerSecond stuck at 0 while the
  // track claims to be live. Two consecutive zero readings (~10s) before acting,
  // so a momentarily idle camera is not restarted for no reason.
  const lastFramesRef = useRef(null);
  useEffect(() => {
    let zeroRuns = 0;
    let noStatsRuns = 0;
    let restarting = false;
    lastFramesRef.current = null;

    const check = async () => {
      const r = roomRef.current;
      if (!r || restarting) return;
      try {
        const pub = r.localParticipant?.getTrackPublication?.('camera');
        const track = pub?.videoTrack || pub?.track;
        const raw = track?.mediaStreamTrack;
        // Only meaningful when the camera is supposed to be sending.
        if (!track || !raw || pub?.isMuted || raw.readyState !== 'live') {
          zeroRuns = 0;
          return;
        }

        const stats = await track.getRTCStatsReport?.();
        if (!stats) return;
        let fps = null;
        let framesSent = null;
        stats.forEach((rep) => {
          if (rep.type === 'outbound-rtp' && rep.kind === 'video') {
            if (typeof rep.framesPerSecond === 'number') fps = rep.framesPerSecond;
            // Firefox does not always populate framesPerSecond on outbound-rtp
            // even while encoding normally, so a healthy camera read as 0 and
            // was restarted every ~10s — the coach saw their own tile flash
            // black on a loop. A RISING cumulative frame count proves the
            // camera is producing pictures whatever fps says.
            const c = rep.framesEncoded ?? rep.framesSent;
            if (typeof c === 'number') framesSent = c;
          }
        });

        // Trust a rising frame counter over fps: if frames are still being
        // encoded since the last check, the camera is alive.
        if (framesSent !== null) {
          const prev = lastFramesRef.current;
          lastFramesRef.current = framesSent;
          if (prev !== null && framesSent > prev) { zeroRuns = 0; return; }
          // Counter did not move. Fall through only if fps also says zero.
          if (prev === null) return;       // first reading — nothing to compare yet
        }

        // NO outbound-rtp video stats at all (fps null AND no frame counter).
        //
        // This is not "cannot judge" — it is its own failure, seen in a real
        // class: readyState 'live', publication unmuted, and yet the browser has
        // no video sender to report on, so nothing reaches the SFU and every
        // other participant sees a black tile. Treat it as broken, but only
        // after MORE consecutive readings than the frozen case, because these
        // stats are also legitimately absent for a second or two right after
        // publishing, before the sender is established.
        if (fps === null && framesSent === null) {
          if (++noStatsRuns < 6) return;      // ~30s of genuinely no sender
          noStatsRuns = 0;
          zeroRuns = 6;                       // fall through to the repair below
        } else {
          noStatsRuns = 0;
          // fps says zero, but there is NO frame counter to corroborate it.
          // That is exactly the Firefox case, and acting on fps alone is what
          // restarted a healthy camera every few seconds — releasing the device
          // and visibly blinking its hardware LED. Without a second signal
          // agreeing, do nothing: a black tile with a repair button is far
          // better than a camera that drops out on its own mid-lesson.
          if (framesSent === null) { zeroRuns = 0; return; }
        }

        if (fps > 0) { zeroRuns = 0; return; }

        // Live track, zero frames.
        //
        // Two readings (~10s) was far too eager. The restart RELEASES THE CAMERA
        // DEVICE — the coach sees their hardware LED go out and the picture drop
        // for about a second — so a false positive is not a harmless retry, it is
        // the very glitch this code exists to prevent. Firefox routinely reports
        // fps 0 on a perfectly healthy camera, and every 10s it was restarting
        // the device for no reason.
        //
        // Six consecutive readings (~30s) with no frames at all. A real freeze
        // stays frozen and is still repaired; a stats quirk never survives that
        // long, because any single good reading resets the run to zero.
        if (++zeroRuns < 6) return;
        zeroRuns = 0;
        restarting = true;
        // Restarting re-acquires the device from the OS, which visibly blinks
        // the camera's hardware LED and blacks the picture for ~1s. That is an
        // acceptable price for reviving a genuinely dead camera and completely
        // unacceptable for a working one, so it is now the LAST resort and is
        // logged loudly enough to be traced from a class.
        console.warn('[camera] restarting device — frames stalled for ~30s', { zeroRuns });
        try {
          // restartTrack re-acquires from the OS and swaps the MediaStreamTrack
          // in place, keeping the same publication so subscribers do not have to
          // resubscribe. This is the one repair that fixes a frozen camera.
          await track.restartTrack(VIDEO_CAPTURE_DEFAULTS);
        } catch {
          // Device busy or gone: fall back to a full off→on through the queue.
          try { await setCam(false); await setCam(true); } catch { /* give up */ }
        } finally {
          restarting = false;
        }
      } catch { /* stats unavailable — nothing to do */ }
    };

    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, [setCam]);

  useEffect(() => () => { roomRef.current?.disconnect().catch(() => {}); }, []);

  return {
    room, connected, participants, activeSpeaker, error,
    deviceIssue, retryDevices,
    micOn, camOn, screenOn,
    cameras, activeCameraId, switchCamera,
    mics, activeMicId, switchMic,
    effects, updateEffects, blurOn, toggleBlur,
    noiseSuppression, toggleNoiseSuppression,
    connect, disconnect, toggleMic, toggleCam, setCam, toggleScreen,
    camInfo,
    // Autoplay-blocked audio: `audioBlocked` is true when the browser is refusing
    // to play remote voices; call enableAudio() from a click to unblock.
    audioBlocked, enableAudio,
    // The live Room, for diagnostics only (camera state reporting). Read it,
    // do not drive the session through it — everything else here wraps it.
    get room() { return roomRef.current; },
  };
}
