// lib/noiseSuppression.js
// FREE, open-source AI noise suppression for the live classroom mic — the "sounds
// clean like Zoom" layer, without Zoom or Krisp's licensing/cost. Uses RNNoise (the
// same denoiser Discord/OBS/Jitsi use) via @sapphi-red/web-noise-suppressor, wired as
// a LiveKit audio TrackProcessor so EVERYONE hears the coach/student with the fan hum,
// keyboard, and background chatter removed.
//
// Self-hosted assets (no CDN): /public/rnnoise/{rnnoise.wasm, rnnoise_simd.wasm,
// rnnoiseWorklet.js}. RNNoise assumes a 48 kHz mono voice stream — which matches the
// mic capture defaults in useLiveKitRoom.js.
//
// LiveKit's LocalAudioTrack.setProcessor(...) calls processor.init({ track,
// audioContext, ... }) and then publishes processor.processedTrack. We build a Web
// Audio graph: source(track) → RnnoiseWorkletNode → destination, and hand back the
// destination's cleaned MediaStreamTrack.

// A LiveKit-compatible AUDIO processor. Same public contract as a video processor:
// { name, init, restart, destroy, processedTrack }.
export function createNoiseSuppressionProcessor() {
  let hpNode = null;        // high-pass, kills tablet handling rumble
  let ownCtx = null;         // an AudioContext we created (only if LiveKit didn't give one)
  let node = null;           // RnnoiseWorkletNode
  let srcNode = null;        // MediaStreamAudioSourceNode
  let dstNode = null;        // MediaStreamAudioDestinationNode

  return {
    name: 'cn-rnnoise',
    processedTrack: undefined,

    async init(opts) {
      const track = opts.track || opts.inputTrack;
      // RNNoise needs a 48 kHz context. Prefer LiveKit's audioContext if it's 48k;
      // otherwise make our own at 48k so the frame math is correct.
      let ctx = opts.audioContext;
      if (!ctx || ctx.sampleRate !== 48000) {
        ctx = new AudioContext({ sampleRate: 48000 });
        ownCtx = ctx;
      }
      if (ctx.state === 'suspended') { try { await ctx.resume(); } catch { /* */ } }

      const base = import.meta.env.BASE_URL || '/';
      const { loadRnnoise, RnnoiseWorkletNode } = await import('@sapphi-red/web-noise-suppressor');

      // Register the worklet module (self-hosted) + load the wasm (self-hosted).
      await ctx.audioWorklet.addModule(`${base}rnnoise/rnnoiseWorklet.js`);
      const wasmBinary = await loadRnnoise({
        url: `${base}rnnoise/rnnoise.wasm`,
        simdUrl: `${base}rnnoise/rnnoise_simd.wasm`,
      });

      node = new RnnoiseWorkletNode(ctx, { maxChannels: 1, wasmBinary });

      // Build the graph: mic → HIGH-PASS → rnnoise → a destination we publish.
      //
      // WHY THE HIGH-PASS: RNNoise (and the browser's own suppressor) is trained
      // on STEADY noise — fans, hum, traffic. It learns a profile and subtracts
      // it. Handling noise is the opposite: a sudden low-frequency thump when a
      // hand grips or sets down a tablet. Being transient and loud, it reads as a
      // real sound and passes straight through — which is the "every time a
      // student touches their iPad" complaint from live classes. On a tablet the
      // mic is a hole in the chassis, so touching the case couples vibration
      // almost directly into it.
      //
      // Speech has essentially no energy below ~100 Hz (adult male fundamentals
      // start ~85 Hz; a child's voice is far higher, ~250-400 Hz), while handling
      // rumble is concentrated there. Rolling off below 120 Hz removes the thump
      // and takes nothing audible from a child's voice.
      srcNode = ctx.createMediaStreamSource(new MediaStream([track]));
      hpNode = ctx.createBiquadFilter();
      hpNode.type = 'highpass';
      hpNode.frequency.value = 120;
      // Butterworth-ish Q: a flat passband, so the filter is inaudible on voice
      // rather than adding a resonant peak right where speech begins.
      hpNode.Q.value = 0.707;
      dstNode = ctx.createMediaStreamDestination();
      srcNode.connect(hpNode);
      hpNode.connect(node);
      node.connect(dstNode);

      this.processedTrack = dstNode.stream.getAudioTracks()[0];
    },

    async restart(opts) { await this.destroy(); await this.init(opts); },

    async destroy() {
      try { srcNode?.disconnect(); } catch { /* */ }
      try { hpNode?.disconnect(); } catch { /* */ }
      try { node?.disconnect(); node?.destroy?.(); } catch { /* */ }
      try { dstNode?.disconnect(); } catch { /* */ }
      // Only close a context WE created — never LiveKit's shared one.
      try { if (ownCtx) await ownCtx.close(); } catch { /* */ }
      ownCtx = node = srcNode = dstNode = hpNode = null;
      this.processedTrack = undefined;
    },
  };
}
