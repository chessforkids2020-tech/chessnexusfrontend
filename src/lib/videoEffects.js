// lib/videoEffects.js
// Free, self-host-safe "look good on camera" video effects — the Zoom features
// (light adjustment + touch-up appearance), done with a plain <canvas> so there is
// NO paid dependency and no licensing question. Background blur is handled
// separately by @livekit/track-processors (Apache-2.0, also free) in the hook.
//
// How it works: LiveKit lets us attach a video "processor" to the local camera
// track. Our processor draws each frame to an offscreen canvas with CSS filters
// applied (brightness / contrast / low-light gamma / soft-focus), and publishes
// the canvas stream — so EVERYONE sees the adjusted video, exactly like Zoom.
//
// Settings persist in localStorage ("set once, always used").

// Bumped v2 → v3 when the default was switched to "brighter, but still sharp": a
// LIGHT-ONLY enhancement (gentle brightness/contrast, NO touch-up blur) is ON by
// default so the picture reads bright/clean like Zoom out of the box, while staying
// crisp. The rename means everyone starts fresh on this new default instead of
// inheriting a stale v2 `enabled:false` from localStorage; users can still turn all
// effects OFF (raw camera) or crank touch-up UP in the Video effects panel, and it
// re-persists under v3.
// Bumped v4 → v5 with the "Zoom-white" retune (brighter + whiter + LESS colour,
// neutral white balance). The rename means everyone starts fresh on the new defaults
// instead of inheriting a stale warm/saturated v4 from localStorage; they can still
// adjust or turn effects off in the Video effects panel, and it re-persists under v5.
const LS_KEY = 'cn_video_effects_v5';

// Defaults: light-only enhancement is ON — a gentle brightness/contrast/whitepoint
// lift for the clean, bright Zoom look, with touch-up (the soft-focus skin smoothing)
// left OFF so we DON'T introduce the blur that softens hair/edges. The canvas does
// re-sample each frame, but with no blur pass the sharpness cost is small, and it's
// paired with the hardware auto-exposure/white-balance in the hook (which brightens
// with zero softening). Net: brighter than raw, still sharp. Anyone who wants the raw
// camera, more brightness, or skin touch-up can adjust it in Video effects.
// Tuned to match Zoom's "clean white": the difference the user spotted is NOT
// brightness — Zoom uses a WARM-NEUTRAL whitepoint with the highlights gently lifted,
// so white walls read clean-white instead of the flat grey/cool cast a plain
// brightness push leaves. So: a touch of warmth (kills the grey), a slightly stronger
// whitepoint lift (clean whites), and brightness eased back a hair (the warmth+whiten
// carry the "bright" feel, so we don't need to push raw brightness as hard).
// Retuned toward the ZOOM look: brighter + "whiter" + LESS colour, not warmer.
// The previous defaults pushed warmth (a sepia/orange cast) and saturation UP, which
// read as "too much colour / heavy skin". Zoom instead lifts the image toward white:
// more brightness + whitepoint, saturation pulled slightly DOWN, a NEUTRAL white
// balance (no sepia), softer contrast, and a little skin smoothing. That gives the
// clean, light, "whiter" appearance the user spotted.
export const DEFAULT_EFFECTS = {
  enabled: true,      // ON by default — the clean "Zoom-white" light enhancement
  brightness: 1.16,   // 0.6 … 1.8 — brighter/lifted (Zoom reads noticeably lighter)
  contrast: 1.0,      // 0.8 … 1.3 — soft, not harsh (Zoom's gentle contrast)
  saturation: 0.94,   // 0.8 … 1.4 — pulled DOWN so it's not "too much colour"
  whiten: 0.18,       // 0 … 0.4 — stronger whitepoint lift → the clean, white feel
  warmth: 0,          // -20 … +20 — NEUTRAL: no sepia/orange cast (that was the heavy look)
  touchUp: 0.25,      // 0 … 1 — light skin smoothing, like Zoom's softer picture
};

export function loadEffects() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULT_EFFECTS };
    return { ...DEFAULT_EFFECTS, ...JSON.parse(raw) };
  } catch { return { ...DEFAULT_EFFECTS }; }
}

export function saveEffects(effects) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(effects)); } catch { /* storage blocked */ }
}

// Build the CSS `filter` string for a set of effects. Kept pure + tiny so it can
// be reused for BOTH the published canvas processor and any local preview tile.
export function effectsToCssFilter(e) {
  if (!e || !e.enabled) return 'none';
  const parts = [];
  // "White light" lift: extra brightness + a touch of contrast gives the clean,
  // bright Zoom whitepoint. Folded into brightness/contrast so it reads as light,
  // not wash-out.
  const whiten = e.whiten || 0;
  const brightness = (e.brightness ?? 1) + whiten * 0.5;
  const contrast = (e.contrast ?? 1) + whiten * 0.15;
  if (brightness !== 1) parts.push(`brightness(${brightness.toFixed(3)})`);
  if (contrast !== 1) parts.push(`contrast(${contrast.toFixed(3)})`);
  // Combined saturation: the explicit "richness" control plus a little extra when
  // warmth is negative (cool) so colours don't go grey.
  let sat = e.saturation ?? 1;
  if (e.warmth < 0) sat += Math.min(0.3, Math.abs(e.warmth) / 60);
  if (sat !== 1) parts.push(`saturate(${sat.toFixed(3)})`);
  if (e.warmth > 0) {
    // Warmth via sepia: warmer/yellower skin tones (0 = neutral white light).
    const s = Math.min(0.4, e.warmth / 50);
    parts.push(`sepia(${s.toFixed(3)})`);
  }
  // NOTE: touch-up (skin smoothing) is NOT a plain blur here — it's done properly in
  // the canvas processor (edge-preserving lighten/soft-light blend). We deliberately
  // do NOT add blur() to the CSS filter, so the preview stays SHARP and the smoothing
  // reads as "even skin", not "blurry".
  return parts.length ? parts.join(' ') : 'none';
}

import { createSkinSmoother } from './skinSmooth';

// One WebGL skin-smoother PER 2D canvas context (the published track + the preview
// each get their own). Created lazily on first touch-up use; reused every frame.
// A WeakMap keyed by the destination ctx means we never leak GL contexts and each
// surface keeps its own smoother.
const _smoothers = new WeakMap();
function getSmoother(ctx) {
  if (_smoothers.has(ctx)) return _smoothers.get(ctx);
  const s = createSkinSmoother();   // null if WebGL unavailable
  _smoothers.set(ctx, s);
  return s;
}

// Render ONE processed frame onto a 2D canvas context. Shared by the published
// LiveKit processor AND the in-panel live preview, so "what you see = what you get".
//
// Touch-up = TRUE skin smoothing (edge-preserving bilateral filter in WebGL), NOT a
// blur: flat skin evens out while eyes/mouth/hair/glasses stay sharp. See skinSmooth.js.
export function renderFrame(ctx, videoEl, w, h, e) {
  const baseFilter = effectsToCssFilter({ ...e, touchUp: 0 });

  // Skin smoothing (edge-preserving) BEFORE the light/colour filters, so we smooth
  // the real skin then apply the tone/whitepoint on top. Falls back to the raw frame
  // if WebGL isn't available.
  let frameSource = videoEl;
  if (e.enabled && e.touchUp > 0) {
    const smoother = getSmoother(ctx);
    const out = smoother && smoother.render(videoEl, w, h, e.touchUp);
    if (out) frameSource = out;   // use the smoothed frame as the source below
  }

  // Draw the (smoothed-or-raw) frame with the light/colour filters. Sharp — the
  // filter here is brightness/contrast/warmth only, never blur.
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.filter = baseFilter;
  ctx.drawImage(frameSource, 0, 0, w, h);

  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

// A LiveKit-compatible video processor. Exposes { name, init, restart, destroy,
// processedTrack } — the stable public TrackProcessor contract.
export function createLightAppearanceProcessor(getEffects) {
  let canvas, ctx, videoEl, rafId, srcStream, outStream;
  let running = false;

  // Draw ONE frame. Shared by both drive loops below.
  const paint = () => {
    const e = getEffects();
    // Use the live frame size, but never shrink below what we already have (avoids the
    // old 640×480 fallback resampling a 720p feed down to soft mush).
    const w = videoEl.videoWidth || canvas.width;
    const h = videoEl.videoHeight || canvas.height;
    if (w && canvas.width !== w) canvas.width = w;
    if (h && canvas.height !== h) canvas.height = h;
    renderFrame(ctx, videoEl, w, h, e);
  };

  // Redraw ONCE PER CAMERA FRAME, not once per display refresh.
  //
  // This used to run on requestAnimationFrame, which ticks on the DISPLAY's
  // clock (~60Hz) and has nothing to do with the camera. A webcam that delivers
  // 12fps — common on cheap sensors in dim light, where auto-exposure holds the
  // shutter open longer — meant the canvas redrew the SAME frame ~5 times, then
  // caught a new one mid-cycle. The result is visible judder: motion that seems
  // to jump forward and back, even though every frame is present.
  //
  // requestVideoFrameCallback fires exactly when a new frame is ready, so the
  // canvas now tracks the camera's real cadence however irregular it is. It also
  // stops burning CPU redrawing identical frames — which matters most on the
  // slower machines where this was worst.
  // DRIVEN BY requestAnimationFrame, deliberately.
  //
  // An earlier attempt drove this from requestVideoFrameCallback so the canvas
  // would track the camera's real cadence. That FROZE video: Chrome stops firing
  // rVFC when the source <video> is not being rendered — and this element is an
  // offscreen one we create ourselves, never attached to the DOM — so the draw
  // loop stalled a few seconds in and the published track went black.
  //
  // rAF keeps running for an offscreen element, so it is the safe clock here.
  // Redrawing an unchanged frame costs a little CPU; a frozen classroom costs a
  // lesson. If the judder needs more work, fix it at the CAPTURE end (what the
  // camera is asked for), never by making this loop depend on frame delivery.
  const draw = () => {
    if (!running) return;
    paint();
    rafId = requestAnimationFrame(draw);
  };

  return {
    name: 'cn-light-appearance',
    async init(opts) {
      // LiveKit's ProcessorOptions provides the source MediaStreamTrack as `opts.track`.
      const track = opts.track || opts.inputTrack;
      srcStream = new MediaStream([track]);
      videoEl = document.createElement('video');
      videoEl.autoplay = true; videoEl.playsInline = true; videoEl.muted = true;
      videoEl.srcObject = srcStream;
      await videoEl.play().catch(() => {});
      // Wait for the REAL frame dimensions before sizing the canvas. Seeding at a
      // fallback 640×480 (the old bug) permanently published an upscaled, soft image
      // even when the camera was 720p. Prefer the track's actual settings, fall back
      // to the video element, and only then to 1280×720.
      const settings = (typeof track.getSettings === 'function' && track.getSettings()) || {};
      const vw = settings.width || videoEl.videoWidth;
      const vh = settings.height || videoEl.videoHeight;
      canvas = document.createElement('canvas');
      canvas.width = vw || 1280;
      canvas.height = vh || 720;
      // desynchronized: lower-latency canvas presentation (less of the ~1s pipeline lag).
      ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
      running = true;
      draw();
      // An explicit, STEADY rate. captureStream(0) was tried here and froze
      // video: with 0 the canvas only produces a frame when one is requested,
      // which combined with a stalled draw loop meant no frames at all and a
      // black published track.
      //
      // 30 rather than settings.frameRate: a camera that CLAIMS 12fps is exactly
      // the case we do not want to lock the canvas to, and rAF cannot exceed the
      // display refresh anyway. A steady 30 is safe on every machine.
      outStream = canvas.captureStream(30);
      this.processedTrack = outStream.getVideoTracks()[0];
    },
    async restart(opts) { await this.destroy(); await this.init(opts); },
    async destroy() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      try { outStream?.getTracks().forEach(t => t.stop()); } catch { /* */ }
      try { videoEl?.pause(); videoEl && (videoEl.srcObject = null); } catch { /* */ }
      canvas = ctx = videoEl = srcStream = outStream = null;
    },
    processedTrack: undefined,
  };
}
