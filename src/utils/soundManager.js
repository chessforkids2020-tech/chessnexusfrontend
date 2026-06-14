/**
 * Centralized Sound Manager
 * Handles all audio playback throughout the application
 * Preloads sounds for better performance and reliability
 */

// Enhanced Sound Generator for fallback sounds
const SoundGenerator = {
  audioContext: null,
  
  getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioContext;
  },

  // Chess piece move sound
  move() {
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(220, ctx.currentTime); // A3
    oscillator.frequency.linearRampToValueAtTime(330, ctx.currentTime + 0.1); // E4
    
    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.15);
  },

  // Capture sound
  capture() {
    const ctx = this.getAudioContext();
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc1.type = 'square';
    osc2.type = 'sawtooth';
    
    osc1.frequency.setValueAtTime(440, ctx.currentTime);  // A4
    osc1.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.15); // A3
    
    osc2.frequency.setValueAtTime(660, ctx.currentTime);  // E5
    osc2.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.15); // E4
    
    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.2);
    osc2.stop(ctx.currentTime + 0.2);
  },

  // Correct puzzle answer
  correct() {
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(660, ctx.currentTime); // E5
    oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.25);
  },

  // Wrong puzzle answer
  wrong() {
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(180, ctx.currentTime); // F#3
    oscillator.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.3); // F#2
    
    gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.35);
  },

  // Puzzle complete
  complete() {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;
    
    // Play a C major chord arpeggio
    const notes = [
      { freq: 523.25, time: 0.0 },   // C5
      { freq: 659.25, time: 0.1 },   // E5
      { freq: 783.99, time: 0.2 },   // G5
      { freq: 1046.5, time: 0.3 }    // C6
    ];
    
    notes.forEach((note) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(note.freq, now + note.time);
      
      gainNode.gain.setValueAtTime(0, now + note.time);
      gainNode.gain.linearRampToValueAtTime(0.08, now + note.time + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + note.time + 0.3);
      
      oscillator.start(now + note.time);
      oscillator.stop(now + note.time + 0.3);
    });
  },

  // Chat notification
  notification() {
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
    
    // Create two beeps
    const times = [0, 0.1];
    times.forEach(timeOffset => {
      gainNode.gain.setValueAtTime(0, ctx.currentTime + timeOffset);
      gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + timeOffset + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + timeOffset + 0.1);
    });
    
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.2);
  }
};

class SoundManager {
  constructor() {
    this.sounds = {};
    this.muted = false;
    this.volume = 0.5;
    this.initialized = false;
    
    // Define all sound files
    this.soundFiles = {
      // Chess move sounds
      move: '/sounds/chess-move.mp3',
      capture: '/sounds/capture.mp3',
      
      // Puzzle sounds
      correct: '/sounds/correct.mp3',
      wrong: '/sounds/error-buzz.mp3',
      complete: '/sounds/success-chime.mp3',
      
      // Chat notification
      notification: '/sounds/chat-notification.mp3'
    };
  }

  /**
   * Initialize and preload all sounds
   * Call this early in your app lifecycle (e.g., after user interaction)
   */
  async init() {
    if (this.initialized) return;
    
    try {
      // Preload all sounds
      for (const [key, path] of Object.entries(this.soundFiles)) {
        const audio = new Audio(path);
        audio.volume = this.volume;
        audio.preload = 'auto';
        
        // Handle loading
        audio.addEventListener('canplaythrough', () => {
        });
        
        audio.addEventListener('error', (e) => {
        });
        
        this.sounds[key] = audio;
      }
      
      this.initialized = true;
    } catch (error) {
    }
  }

  /**
   * Play a sound by name
   * @param {string} soundName - Name of the sound to play
   * @param {Object} options - Optional settings
   * @param {number} options.volume - Override default volume (0-1)
   * @param {boolean} options.loop - Whether to loop the sound
   */
  play(soundName, options = {}) {
    if (this.muted) return;
    
    try {
      let audio = this.sounds[soundName];
      
      // If not initialized or sound not found, try to create it on the fly
      if (!audio && this.soundFiles[soundName]) {
        audio = new Audio(this.soundFiles[soundName]);
        this.sounds[soundName] = audio;
      }
      
      if (!audio) {
        this.playFallback(soundName);
        return;
      }
      
      // Clone audio for overlapping sounds
      const clone = audio.cloneNode();
      clone.volume = options.volume !== undefined ? options.volume : this.volume;
      clone.loop = options.loop || false;
      
      // Play and handle errors
      const playPromise = clone.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          this.playFallback(soundName);
        });
      }
      
    } catch (error) {
      this.playFallback(soundName);
    }
  }

  /**
   * Fallback to synthesized sounds when audio files fail
   * @param {string} soundName - Name of the sound to generate
   */
  playFallback(soundName) {
    try {
      // Use enhanced sound generator
      if (SoundGenerator[soundName]) {
        SoundGenerator[soundName]();
      } else {
      }
    } catch (error) {
    }
  }

  /**
   * Set volume for all sounds
   * @param {number} volume - Volume level (0-1)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    Object.values(this.sounds).forEach(audio => {
      if (audio) audio.volume = this.volume;
    });
  }

  /**
   * Mute/unmute all sounds
   * @param {boolean} mute - Whether to mute
   */
  setMuted(mute) {
    this.muted = mute;
  }

  /**
   * Toggle mute state
   */
  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  /**
   * Stop all currently playing sounds
   */
  stopAll() {
    Object.values(this.sounds).forEach(audio => {
      if (audio && !audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
  }
}

// Create singleton instance
const soundManager = new SoundManager();

// Auto-initialize on first user interaction (if possible)
if (typeof window !== 'undefined') {
  const initOnInteraction = () => {
    soundManager.init();
    // Remove listeners after first interaction
    document.removeEventListener('click', initOnInteraction);
    document.removeEventListener('keydown', initOnInteraction);
    document.removeEventListener('touchstart', initOnInteraction);
  };
  
  document.addEventListener('click', initOnInteraction, { once: true });
  document.addEventListener('keydown', initOnInteraction, { once: true });
  document.addEventListener('touchstart', initOnInteraction, { once: true });
}

export default soundManager;
