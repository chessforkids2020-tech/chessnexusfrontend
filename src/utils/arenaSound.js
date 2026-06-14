/**
 * Arena Tournament sound effects using Web Audio API oscillators.
 * No external files required.
 */

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

function tone(frequency, duration, type = 'sine', gain = 0.25) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.connect(vol);
    vol.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    vol.gain.setValueAtTime(gain, ctx.currentTime);
    vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // silently ignore
  }
}

const sounds = {
  move: () => {
    tone(440, 0.08, 'triangle', 0.18);
  },
  gameStart: () => {
    tone(523, 0.12, 'sine', 0.2);
    setTimeout(() => tone(659, 0.12, 'sine', 0.2), 120);
    setTimeout(() => tone(784, 0.18, 'sine', 0.22), 240);
  },
  win: () => {
    tone(523, 0.12, 'sine', 0.22);
    setTimeout(() => tone(659, 0.12, 'sine', 0.22), 130);
    setTimeout(() => tone(784, 0.12, 'sine', 0.22), 260);
    setTimeout(() => tone(1047, 0.35, 'sine', 0.25), 390);
  },
  lose: () => {
    tone(392, 0.18, 'sawtooth', 0.18);
    setTimeout(() => tone(330, 0.18, 'sawtooth', 0.18), 200);
    setTimeout(() => tone(262, 0.3, 'sawtooth', 0.18), 400);
  },
  draw: () => {
    tone(440, 0.15, 'sine', 0.2);
    setTimeout(() => tone(440, 0.15, 'sine', 0.2), 200);
  },
  streak: () => {
    tone(659, 0.1, 'sine', 0.22);
    setTimeout(() => tone(784, 0.1, 'sine', 0.22), 110);
    setTimeout(() => tone(1047, 0.22, 'sine', 0.25), 220);
  }
};

export function playArenaSound(name) {
  try {
    if (sounds[name]) sounds[name]();
  } catch {
    // silently ignore
  }
}
