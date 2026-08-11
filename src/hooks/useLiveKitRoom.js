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

// ── ADAPTIVE CODEC: let each machine publish what it can actually encode ─────
//
// THE BUG THIS FIXES. We used to hardcode VP9 with `backupCodec: true`. On a
// machine whose GPU cannot encode VP9 that is close to the worst case possible:
//
//   • VP9 has NO hardware encoder on any consumer NVIDIA GPU (NVENC does H.264 /
//     HEVC / AV1 — never VP9), and VP8 has none anywhere. So both fall back to
//     Chrome's libvpx SOFTWARE encoder.
//   • `backupCodec` does not mean "instead of" — it publishes a SECOND video
//     track so incompatible subscribers can still see you. With simulcast on,
//     one camera became a VP9 L3T3_KEY stack PLUS a 3-layer VP8 stack: ~6
//     concurrent software encodes at 720p30.
//   • The CPU cannot sustain that, so the encoder drops frames and then delivers
//     a burst — video that appears to jump backwards and forwards.
//
// Confirmed on a Windows desktop (GeForce GT 710): webrtc-internals showed
// `SimulcastEncoderAdapter (libvpx, libvpx, libvpx)` with
// `powerEfficientEncoder=false`, and chrome://gpu listed H.264 encode ONLY.
// Laptops mostly escaped it because modern mobile chips DO have VP9 encode.
//
// So: ask the browser what this device can encode efficiently, and publish that.
// Newer machines keep VP9 (best quality per bit); older ones get H.264, which is
// hardware-accelerated essentially everywhere — including that GT 710. Nobody is
// downgraded to fix somebody else's machine, which is what a global switch to
// H.264 would have done.
const CODEC_PROBE_KEY = 'lkVideoCodec:v1';

// Is `codec` encodable on this device, and is it POWER EFFICIENT (i.e. hardware)?
// mediaCapabilities is the only web API that answers the hardware question —
// RTCRtpSender.getCapabilities() lists a codec whether it is hardware or software,
// so it cannot distinguish the machines that need help.
async function probeEncoder(mimeType) {
  try {
    if (!navigator.mediaCapabilities?.encodingInfo) return null;
    const info = await navigator.mediaCapabilities.encodingInfo({
      type: 'webrtc',
      video: {
        contentType: mimeType,
        width: VIDEO_PRESET.width,
        height: VIDEO_PRESET.height,
        bitrate: 2_500_000,
        framerate: 30,
      },
    });
    return { supported: !!info?.supported, efficient: !!info?.powerEfficient };
  } catch {
    return null; // API missing or threw — treat as "unknown", never as a failure
  }
}

// Pick the publish codec for THIS device. Cached per browser: the answer depends
// on hardware that does not change between classes, and probing costs a few ms.
async function pickVideoCodec() {
  try {
    const cached = sessionStorage.getItem(CODEC_PROBE_KEY);
    if (cached) return cached;
  } catch { /* private mode — just probe again */ }

  let codec = 'vp9'; // default unchanged: best quality where the hardware allows
  try {
    const vp9 = await probeEncoder('video/VP9');
    // Only move OFF VP9 when we have positive evidence this device would software-
    // encode it. `null` (API unavailable) keeps today's behaviour — an unknown
    // device must not be silently downgraded.
    if (vp9 && (!vp9.supported || !vp9.efficient)) {
      const h264 = await probeEncoder('video/H264');
      if (h264?.supported && h264.efficient) codec = 'h264';
      // If H.264 is not hardware either, VP9 remains the better choice: it at
      // least gives a cleaner picture for the same CPU spend.
    }
  } catch { /* keep the default */ }

  try { sessionStorage.setItem(CODEC_PROBE_KEY, codec); } catch { /* ignore */ }
  return codec;
}

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
  resolution: {
    width: 1280,
    height: 720,
    // A RANGE, not a bare 30. Many webcams cut their frame rate in dim light —
    // auto-exposure holds the shutter open longer, and a 1080p camera can fall
    // to 12fps, which is where the "video jumps back and forth" reports came
    // from. `min: 15` tells the driver not to trade frame rate away that far;
    // it prefers a slightly darker but SMOOTH picture, which is what a viewer
    // actually notices. `ideal: 30` still asks for full smoothness where the
    // light allows, and a camera that genuinely cannot do 15 is not rejected —
    // min is advisory in practice, unlike `exact`.
    frameRate: { min: 15, ideal: 30 },
  },
};

// ── SMOOTHNESS OVER SHARPNESS: measure what the camera actually delivers ─────
//
// Constraints are a REQUEST, not a contract. A budget webcam asked for 720p30
// will happily answer "720p" and then deliver 12fps, because auto-exposure holds
// the shutter open longer in dim light and that mathematically caps the frame
// rate. 12fps is where video starts to look like it jumps forward and back.
//
// The web platform will not tell us that pairing up front: getCapabilities()
// returns RANGES (width 640-1920, frameRate 1-31), never "720p only runs at
// 12fps". Zoom avoids the problem because it is native — it reads the camera's
// discrete mode list and simply picks 640x360@30 over 1280x720@12.
//
// So we reach the same answer empirically: ask, MEASURE, and step the resolution
// down until the frame rate is acceptable. A good webcam passes the first check
// and keeps full 720p; a weak one lands on something smooth. No coach ever sees
// this happen, and nobody has to know what a constraint is.
const FPS_FLOOR = 20;              // below this, motion visibly judders
const RESOLUTION_LADDER = [
  { width: 1280, height: 720 },    // preferred — unchanged for capable cameras
  { width: 960,  height: 540 },
  { width: 640,  height: 360 },    // last resort: still smooth, still watchable
];

// Frames actually delivered, measured over `ms`. getSettings().frameRate reports
// what the camera CLAIMS, which on exactly the cameras we care about is the
// number it failed to honour — so we count real frames instead.
function measureFps(track, ms = 1000) {
  return new Promise((resolve) => {
    try {
      const vid = document.createElement('video');
      vid.muted = true; vid.playsInline = true;
      vid.srcObject = new MediaStream([track]);
      const cleanup = () => { try { vid.pause(); vid.srcObject = null; } catch { /* */ } };

      // requestVideoFrameCallback fires once per DELIVERED frame — the only
      // honest count available in a browser.
      if (typeof vid.requestVideoFrameCallback !== 'function') { cleanup(); resolve(null); return; }

      let frames = 0, start = 0, handle = null;
      const tick = (now) => {
        if (!start) start = now;
        frames++;
        if (now - start >= ms) {
          cleanup();
          resolve((frames / (now - start)) * 1000);
          return;
        }
        handle = vid.requestVideoFrameCallback(tick);
      };
      vid.play().then(() => { handle = vid.requestVideoFrameCallback(tick); }).catch(() => { cleanup(); resolve(null); });
      // Never hang the join on a camera that delivers nothing at all.
      setTimeout(() => { if (handle != null) { cleanup(); resolve(frames ? (frames / ms) * 1000 : 0); } }, ms + 1200);
    } catch { resolve(null); }
  });
}

// Walk DOWN the ladder until the delivered frame rate clears FPS_FLOOR.
// Returns the resolution that worked, or null to leave the track untouched.
async function tuneForSmoothness(track, onInfo) {
  if (!track || typeof track.applyConstraints !== 'function') return null;
  for (let i = 0; i < RESOLUTION_LADDER.length; i++) {
    const fps = await measureFps(track);
    // null = we could not measure (no rVFC). Changing the camera on a guess
    // would risk downgrading a coach whose video is perfectly fine, so stop.
    if (fps == null) return null;
    const { width, height } = RESOLUTION_LADDER[i];
    if (fps >= FPS_FLOOR) {
      onInfo?.({ width, height, fps: Math.round(fps), steppedDown: i > 0 });
      return { width, height };
    }
    const next = RESOLUTION_LADDER[i + 1];
    if (!next) {
      // Bottom of the ladder and still slow: this is lighting or the sensor
      // itself, not something a constraint can fix. Leave it at the smallest
      // size — it is the best chance the camera has.
      onInfo?.({ ...RESOLUTION_LADDER[i], fps: Math.round(fps), steppedDown: true, floorReached: true });
      return null;
    }
    try {
      await track.applyConstraints({
        width: { ideal: next.width },
        height: { ideal: next.height },
        frameRate: { min: 15, ideal: 30 },
      });
      // Give the camera a moment to restart at the new mode before re-measuring.
      await new Promise(r => setTimeout(r, 400));
    } catch {
      return null; // camera refused the change — keep what we have
    }
  }
  return null;
}

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
  // Result of the smoothness tune: { width, height, fps, steppedDown, floorReached }.
  // Exposed so the UI can tell a coach WHY their video looks soft or still judders
  // — a camera stuck at the bottom of the ladder is a lighting problem, and only
  // the coach can fix that.
  const [camSmoothness, setCamSmoothness] = useState(null);
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
      // The camera PUBLICATION itself, captured whether or not we have a track.
      //
      // The tile's watchdog needs this to re-request a dropped subscription. It
      // used to reach for `track.publication`, which does not exist: in
      // livekit-client 2.x a RemoteTrack exposes receiver/isLocal/start/stop/
      // getRTCStatsReport and no back-pointer to its publication. So that repair
      // was silently dead code, and a tile whose subscription was lost had
      // nothing that could bring it back.
      //
      // Captured BEFORE the `!t` bail below, because the case that matters most
      // is exactly the one where `pub.track` is null.
      let videoPub = null;
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
        if (!isScreen && pub.kind === 'video') videoPub = pub;
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
      list.push({ identity: p.identity, name: p.name || p.identity, isLocal, isSpeaking: p.isSpeaking, videoTrack, videoTrackRaw, videoPub, audioTrack, audioTrackRaw, screenTrack, avatar, camPublished });
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
            // The publication object is stable for the life of a publication, so
            // comparing it costs nothing in the common case and correctly forces
            // a re-render when a camera is republished under a new publication.
            && o.videoPub === n.videoPub
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

  // SERIALISES every camera change. Two setCameraEnabled calls overlapping is
  // a real way to end up with a LIVE BUT FROZEN track: the browser is still
  // tearing the device down when the next acquisition starts, and Chrome hands
  // back a MediaStreamTrack that reports readyState 'live' while producing zero
  // frames. Nothing downstream can tell that apart from a working camera —
  // LiveKit dutifully encodes and sends black.
  //
  // A promise chain means off→on→off, however fast the clicking, always runs in
  // order and never overlaps.
  //
  // Declared ABOVE connect() because the JOIN-TIME camera enable now goes
  // through this same queue. Previously the join enabled the camera directly
  // while only the manual toggle was serialised, so the two could overlap: a
  // user pressing the camera button during the ~1s join window produced exactly
  // the overlapping-acquisition case described above. One queue, both paths.
  const camQueueRef = useRef(Promise.resolve());
  const enqueueCam = useCallback((fn) => {
    const next = camQueueRef.current.then(fn, fn);
    // Swallow rejections so one failure cannot poison every later call.
    camQueueRef.current = next.catch(() => {});
    return next;
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
    // Verbose SDK logging, opt-in per browser so production consoles stay clean:
    //   localStorage.setItem('lkDebug','1')  then reload.
    // Must run BEFORE the Room is constructed — the log level is read at
    // construction. setLogLevel is a top-level export, not a Room method.
    try {
      if (localStorage.getItem('lkDebug') === '1') LK.setLogLevel?.('debug');
    } catch { /* private mode — skip */ }
    const { Room, RoomEvent, Track, ConnectionState } = LK;
    // If we're already connected (e.g. reconnecting with a fresh token after a
    // control change), tear down the old room first to avoid a dangling
    // connection / duplicate participant.
    if (roomRef.current) { try { await roomRef.current.disconnect(); } catch { /* */ } roomRef.current = null; }
    // What can THIS machine encode in hardware? Decided before the Room is built
    // because publishDefaults is read at construction time.
    const videoCodec = await pickVideoCodec();
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
        // Chosen per device (see pickVideoCodec): VP9 where the GPU encodes it,
        // H.264 on machines that would otherwise software-encode — the older
        // desktops where video stuttered.
        videoCodec,
        // backupCodec is deliberately OFF. It publishes a SECOND video track in a
        // fallback codec, so with simulcast one camera became ~6 concurrent
        // software encodes and the picture stuttered on any machine without a
        // hardware VP9 encoder. It is also unnecessary here: VP8/H.264 decode is
        // universal, and we now publish a codec the device actually handles.
        backupCodec: false,
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
      })
      // ASYNCHRONOUS device failure — a camera/mic yanked by another app (or by
      // the OS) AFTER a successful acquisition. The try/catch around
      // setCameraEnabled cannot see this: that call already resolved. Without
      // this listener the track dies mid-class and the user is told nothing.
      .on(RoomEvent.MediaDevicesError, (e) => {
        setDeviceIssue({ mic: false, cam: true, kind: classifyDeviceError(e) });
      })
      // After a FULL reconnect the SDK republishes the tracks, but our canvas
      // processors (light/appearance, background blur) and the sharpness hint do
      // not survive onto the fresh track — the coach comes back from a network
      // blip with their effects silently gone.
      .on(RoomEvent.Reconnected, () => {
        (async () => {
          try {
            applyContentHint(r);
            await applyVideoRef.current();
          } catch { /* effects are optional */ }
          refresh(r);
        })();
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
    //
    // It ALSO catches the case an unsubscribed check cannot see: a publication
    // that is still subscribed but has silently stopped delivering frames (an
    // SFU-side stall, a decoder that gave up after a network blip). To that
    // viewer the tile is simply black, and nothing in the subscription state
    // says anything is wrong. `framesDecoded` from the receiver's own stats is
    // the honest signal — if it stops rising while the publication is unmuted,
    // no pictures are arriving.
    //
    // Two consecutive flat readings (~8s) before acting, so a momentary stall is
    // not "repaired" for nothing. The repair is a resubscribe, which is entirely
    // viewer-side: it never touches the student's camera device, so unlike the
    // camera off→on that was removed today there is nothing to see.
    if (resubTimerRef.current) clearInterval(resubTimerRef.current);
    const frameStats = new Map();   // trackSid -> { frames, flatRuns }
    resubTimerRef.current = setInterval(() => {
      const room = roomRef.current;
      if (!room) return;
      let repaired = false;
      const seen = new Set();
      room.remoteParticipants?.forEach((p) => {
        p.trackPublications?.forEach((pub) => {
          if (pub.isSubscribed === false && typeof pub.setSubscribed === 'function') {
            try { pub.setSubscribed(true); repaired = true; } catch { /* ignore */ }
            return;
          }
          // Frozen-track check: subscribed video only.
          if (pub.kind !== 'video' || pub.isMuted || !pub.track || !pub.trackSid) return;
          seen.add(pub.trackSid);
          const track = pub.track;
          if (typeof track.getRTCStatsReport !== 'function') return;
          track.getRTCStatsReport().then((stats) => {
            if (!stats) return;
            let frames = null;
            stats.forEach((rep) => {
              if (rep.type === 'inbound-rtp' && rep.kind === 'video'
                  && typeof rep.framesDecoded === 'number') frames = rep.framesDecoded;
            });
            if (frames === null) return;      // browser does not report it
            const prev = frameStats.get(pub.trackSid);
            if (!prev) { frameStats.set(pub.trackSid, { frames, flatRuns: 0 }); return; }
            if (frames > prev.frames) {
              frameStats.set(pub.trackSid, { frames, flatRuns: 0 });
              return;
            }
            const flatRuns = prev.flatRuns + 1;
            if (flatRuns < 2) { frameStats.set(pub.trackSid, { frames, flatRuns }); return; }
            // Two flat readings — nothing is being decoded. Force a resubscribe.
            frameStats.set(pub.trackSid, { frames, flatRuns: 0 });
            try {
              pub.setSubscribed(false);
              setTimeout(() => { try { pub.setSubscribed(true); } catch { /* ignore */ } }, 300);
              // eslint-disable-next-line no-console
              console.warn('[liveclass] frozen remote video — resubscribing', pub.trackSid);
            } catch { /* ignore */ }
          }).catch(() => { /* stats unavailable */ });
        });
      });
      // Drop bookkeeping for tracks that have gone away, so the map cannot grow
      // for the length of a long class.
      for (const sid of frameStats.keys()) if (!seen.has(sid)) frameStats.delete(sid);
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

    // ── WAIT FOR A GENUINELY CONNECTED ROOM ──────────────────────────────────
    //
    // r.connect() resolving is necessary but NOT sufficient. On a slow or
    // still-settling transport the Room can be past connect() while the peer
    // connection is not yet ready to negotiate. Publishing into that window
    // produces a track that exists locally and is never negotiated — which
    // renders black for everyone INCLUDING the publisher, and is fixed by a
    // reload. That is the reported symptom, so we gate on the honest signal.
    if (r.state !== ConnectionState.Connected) {
      await new Promise((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          r.off(RoomEvent.ConnectionStateChanged, onState);
          clearTimeout(timer);
          resolve();
        };
        const onState = () => { if (r.state === ConnectionState.Connected) finish(); };
        // Never hang the join forever on a transport that refuses to settle:
        // proceed anyway and let the device errors below report honestly.
        const timer = setTimeout(finish, 8000);
        r.on(RoomEvent.ConnectionStateChanged, onState);
        onState(); // in case it connected between the check and the listener
      });
    }

    // ── SEQUENTIAL device enable (was Promise.all) ───────────────────────────
    // Mic FIRST, then camera — deliberately not in parallel. Requesting both
    // getUserMedia calls concurrently makes some machines fail the camera with
    // NotReadableError/TrackStartError even though permission is granted and the
    // device is free: the camera loses a race against the mic for the same
    // device-manager lock. That hit ONE student on ONE machine while everyone
    // else was fine. Serialising costs ~200-400ms on join and removes the whole
    // failure class.
    //
    // The UI still renders before the slow "polish" steps (effects, RNNoise,
    // Krisp) — those remain in the background block below, which is where the
    // original ~20-30s join delay actually came from, not from this ordering.
    // Failures are RECORDED, not swallowed: entering the room must never be
    // blocked by a dead device, but the user still has to be told why they are
    // silent/invisible.
    const micRes = await r.localParticipant
      .setMicrophoneEnabled(true, AUDIO_CAPTURE_DEFAULTS)
      .then(() => null).catch((e) => e);

    // Through enqueueCam so the join-time enable shares ONE serialisation chain
    // with the manual toggle — see the queue's note above.
    let camFinal = await enqueueCam(() =>
      r.localParticipant.setCameraEnabled(true).then(() => null).catch((e) => e)
    );

    // ONE RETRY for the camera, on its own. KEPT DELIBERATELY.
    //
    // Sequencing above makes this rare, not impossible — a camera briefly still
    // held by another app (Zoom/Teams) fails the same way. The retry cannot be
    // replaced by the SDK's reconnection logic: that handles TRANSPORT failures
    // (ICE restart, signal drop, session resume), whereas a getUserMedia
    // rejection is a LOCAL device-acquisition failure. No track was ever
    // created, so LiveKit does not know one was wanted and will never retry it.
    // Without this the user sits with no video and no recovery until they
    // reload. Costs nothing when the first attempt succeeds.
    if (camFinal) {
      await new Promise(res => setTimeout(res, 500));
      camFinal = await enqueueCam(() =>
        r.localParticipant.setCameraEnabled(true).then(() => null).catch((e) => e)
      );
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
        // Then check the camera is actually DELIVERING a smooth frame rate, and
        // step the resolution down if it is not. Runs once, here, on the raw
        // camera track — before any canvas processor is attached, so we measure
        // the sensor rather than our own effects pipeline. Never mid-class: each
        // step restarts the camera briefly.
        // DISABLED. This measured the delivered frame rate and stepped the
        // resolution down, but applyConstraints restarts the camera underneath a
        // track LiveKit has already published (and a processor may already be
        // attached to), which froze video a few seconds after joining.
        //
        // The capture constraints below already ask for frameRate {min:15,
        // ideal:30}, which pushes the driver away from trading frame rate for
        // resolution without ever restarting anything. If a stronger fix is
        // needed, it must happen BEFORE the track is published, not after.
        // try { await tuneForSmoothness(rawTrack, setCamSmoothness); } catch {}
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
  }, [refresh, enqueueCam]);

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
    // Sequential + queued, for the same reasons as the join path: this is the
    // "my devices are broken" button, so it is the LAST place that should risk
    // losing the camera to a parallel-getUserMedia race against the mic.
    const micRes = await r.localParticipant
      .setMicrophoneEnabled(true, AUDIO_CAPTURE_DEFAULTS)
      .then(() => null).catch((e) => e);
    const camRes = await enqueueCam(() =>
      r.localParticipant.setCameraEnabled(true).then(() => null).catch((e) => e)
    );
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
  }, [refresh, loadCameras, enqueueCam]);

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

  // ── NO AUTOMATIC CAMERA RESTART ─────────────────────────────────────────
  //
  // A "frozen camera watchdog" used to live here. It polled getRTCStatsReport
  // and called track.restartTrack() when it decided the camera had stalled.
  //
  // It was removed because the cure was worse than the disease. restartTrack
  // RE-ACQUIRES THE DEVICE FROM THE OS: the camera's hardware LED goes out, the
  // picture drops for about a second, and every participant sees the coach
  // flicker. Deciding "stalled" reliably turned out to be impossible — Firefox
  // reports framesPerSecond 0 on a perfectly healthy camera, so a real class
  // measured 30 device restarts in five minutes on a camera that was never
  // broken. Successive attempts to tighten the heuristic (frame counters,
  // longer thresholds, requiring corroboration) each still misfired.
  //
  // A camera that genuinely freezes is rare; a camera that blinks every few
  // seconds while you teach is unusable. So repair is now manual and explicit:
  // the student's own "Fix my video" button and the coach's per-tile 🔄, both
  // of which do a full off→on republish and are only pressed when a human can
  // actually see something is wrong.
  //
  // If this is ever reinstated, it must not act on any single browser statistic.

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
    camSmoothness,
    // Autoplay-blocked audio: `audioBlocked` is true when the browser is refusing
    // to play remote voices; call enableAudio() from a click to unblock.
    audioBlocked, enableAudio,
    // The live Room, for diagnostics only (camera state reporting). Read it,
    // do not drive the session through it — everything else here wraps it.
    get room() { return roomRef.current; },
  };
}
