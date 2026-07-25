import { useState, useRef, useCallback, useEffect } from 'react';

// Voice narration for the Nexus Coach using the browser Web Speech API. A "script" is
// an ordered array of steps: { text, onStart?() }. play() speaks each step in turn and
// fires its onStart when that line begins (so a lesson can highlight a square / draw an
// arrow exactly as the coach says it). Exposes the current line text + a `speaking`
// flag (drives the avatar's talking animation) + play/replay/mute controls.
//
// Fully graceful: if speechSynthesis is missing/blocked, steps still advance on a timer
// so the on-screen text + highlights work without audio. Mute preference persists.

const MUTE_KEY = 'cn_academy_muted';
const hasTTS = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

// Rough time to display a line when there's no audio (or when muted): ~ reading time.
const readMs = (text) => Math.max(1600, Math.min(9000, (text || '').length * 55));

export function useNarration() {
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
  });
  const [speaking, setSpeaking] = useState(false);
  const [lineIndex, setLineIndex] = useState(-1);
  const [lineText, setLineText] = useState('');
  const [done, setDone] = useState(false);

  const scriptRef = useRef([]);
  const idxRef = useRef(-1);
  const timerRef = useRef(null);
  const cancelledRef = useRef(false);
  const mutedRef = useRef(muted);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const clearTimer = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };

  const stop = useCallback(() => {
    cancelledRef.current = true;
    clearTimer();
    if (hasTTS()) { try { window.speechSynthesis.cancel(); } catch (_) {} }
    setSpeaking(false);
  }, []);

  const speakStep = useCallback((i) => {
    const script = scriptRef.current;
    if (cancelledRef.current) return;
    if (i >= script.length) {
      setSpeaking(false); setDone(true); setLineIndex(script.length); return;
    }
    idxRef.current = i;
    const step = script[i] || {};
    setLineIndex(i);
    setLineText(step.text || '');
    try { step.onStart && step.onStart(i); } catch (_) {}

    const next = () => { if (!cancelledRef.current) speakStep(i + 1); };

    if (hasTTS() && !mutedRef.current && step.text) {
      try {
        const u = new SpeechSynthesisUtterance(step.text);
        u.rate = 0.92; u.pitch = 1.05; // a touch slow + friendly for kids
        u.onstart = () => setSpeaking(true);
        u.onend = () => { setSpeaking(false); if (!cancelledRef.current) timerRef.current = setTimeout(next, 350); };
        u.onerror = () => { setSpeaking(false); if (!cancelledRef.current) timerRef.current = setTimeout(next, 300); };
        window.speechSynthesis.speak(u);
        return;
      } catch (_) { /* fall through to timed advance */ }
    }
    // No audio (unsupported or muted): show the line, then advance on a reading timer.
    setSpeaking(!mutedRef.current);
    timerRef.current = setTimeout(() => { setSpeaking(false); next(); }, readMs(step.text));
  }, []);

  // Start (or restart) narrating a script. Steps: [{ text, onStart? }].
  const play = useCallback((script) => {
    stop();
    cancelledRef.current = false;
    scriptRef.current = Array.isArray(script) ? script : [];
    setDone(false);
    setLineIndex(-1); setLineText('');
    // A tiny delay lets any prior cancel() settle before we speak.
    timerRef.current = setTimeout(() => speakStep(0), 60);
  }, [speakStep, stop]);

  const replay = useCallback(() => {
    if (scriptRef.current.length) play(scriptRef.current);
  }, [play]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const nm = !m;
      try { localStorage.setItem(MUTE_KEY, nm ? '1' : '0'); } catch (_) {}
      if (nm && hasTTS()) { try { window.speechSynthesis.cancel(); } catch (_) {} setSpeaking(false); }
      return nm;
    });
  }, []);

  // Clean up on unmount.
  useEffect(() => () => stop(), [stop]);

  return { play, replay, stop, muted, toggleMute, speaking, lineIndex, lineText, done, hasTTS: hasTTS() };
}
