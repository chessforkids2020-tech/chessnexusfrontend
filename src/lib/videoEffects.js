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

const LS_KEY = 'cn_video_effects_v1';

// Defaults are a subtle "natural enhance" that is ON by default — this is what makes
// Zoom look better than a raw webcam feed. Zoom's signature look is a BRIGHT, clean,
// slightly COOL/white light (not warm/yellow) — so we lift brightness, keep colour
// neutral (warmth 0), and add a whitepoint lift. Users can adjust in Video effects.
export const DEFAULT_EFFECTS = {
  enabled: true,      // ON by default — Zoom-like auto-enhance out of the box
  brightness: 1.14,   // 0.6 … 1.8 — brighter for that clean "white light" look
  contrast: 1.06,     // 0.8 … 1.3 — a little depth (not too much, keeps it clean)
  saturation: 1.08,   // 0.8 … 1.4 — gentle richness (lowered so it's not heavy)
  whiten: 0.12,       // 0 … 0.4 — the "white light" lift (cool whitepoint, screen blend)
  warmth: 0,          // -20 … +20 — neutral by default (positive = warm/yellow)
  touchUp: 0,         // 0 … 1 — soft-focus "touch up my appearance" (off by default)
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

// Render ONE processed frame onto a 2D canvas context. Shared by the published
// LiveKit processor AND the in-panel live preview, so "what you see = what you get"
// (including skin-smoothing, which a plain CSS filter can't do).
export function renderFrame(ctx, videoEl, w, h, e) {
  const baseFilter = effectsToCssFilter({ ...e, touchUp: 0 });

  // Pass 1: base frame with light/colour filters (sharp — keeps eyes/edges crisp).
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.filter = baseFilter;
  ctx.drawImage(videoEl, 0, 0, w, h);

  // Pass 2 (touch-up / skin smoothing). Blemishes/pores/shadows on skin are DARKER
  // than surrounding skin: a blurred "lighten" pass fills them with the smooth tone
  // around them (evening the skin), then a "darken" pass tames blown highlights, so
  // the skin evens out. Eyes/hair (high-contrast edges) survive because lighten/darken
  // only move pixels toward the local average, not into a full blur.
  if (e.enabled && e.touchUp > 0) {
    const t = e.touchUp;
    const radius = (2 + t * 4).toFixed(1);        // 2–6px blur of the smoothing layer
    const soft = `${baseFilter === 'none' ? '' : baseFilter + ' '}blur(${radius}px)`;

    ctx.filter = soft;
    ctx.globalCompositeOperation = 'lighten';      // fill dark specks
    ctx.globalAlpha = Math.min(0.9, 0.5 + t * 0.4);
    ctx.drawImage(videoEl, 0, 0, w, h);

    ctx.globalCompositeOperation = 'darken';       // tame bright specks/shine
    ctx.globalAlpha = Math.min(0.7, 0.35 + t * 0.35);
    ctx.drawImage(videoEl, 0, 0, w, h);

    // Restore a bit of real detail so it reads as "smooth skin", not "plastic".
    ctx.filter = baseFilter;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.max(0.18, 0.4 - t * 0.25);
    ctx.drawImage(videoEl, 0, 0, w, h);
  }

  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

// A LiveKit-compatible video processor. Exposes { name, init, restart, destroy,
// processedTrack } — the stable public TrackProcessor contract.
export function createLightAppearanceProcessor(getEffects) {
  let canvas, ctx, videoEl, rafId, srcStream, outStream;
  let running = false;

  const draw = () => {
    if (!running) return;
    const e = getEffects();
    const w = videoEl.videoWidth || 640;
    const h = videoEl.videoHeight || 480;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    renderFrame(ctx, videoEl, w, h, e);
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
      canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth || 640;
      canvas.height = videoEl.videoHeight || 480;
      ctx = canvas.getContext('2d', { alpha: false });
      running = true;
      draw();
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
