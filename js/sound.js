/**
 * Keyflow - Web Audio API Synthesized Sound Effects
 * Generates tactile mechanical keystroke sounds and victory chimes without external audio files.
 */

class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.enabled = false;
    this.volume = 0.3;
    this.soundType = 'thock'; // 'thock' | 'click' | 'off'
  }

  init() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setSoundType(type) {
    this.soundType = type;
    this.enabled = type !== 'off';
  }

  /**
   * Play keystroke sound
   */
  playKey(isError = false, isSpace = false) {
    if (!this.enabled || !this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const now = this.audioCtx.currentTime;

    if (isError) {
      this.playErrorSound(now);
      return;
    }

    if (this.soundType === 'thock') {
      this.playThock(now, isSpace);
    } else if (this.soundType === 'click') {
      this.playClick(now, isSpace);
    }
  }

  /**
   * Deep mechanical "thock" sound
   */
  playThock(now, isSpace) {
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();

    // Randomize pitch slightly for organic typing realism
    const pitchOffset = (Math.random() - 0.5) * 20;
    const baseFreq = isSpace ? 110 : 180 + pitchOffset;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.05);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isSpace ? 450 : 650, now);
    filter.Q.setValueAtTime(2.5, now);

    const initialGain = (isSpace ? 0.35 : 0.25) * this.volume;
    gain.gain.setValueAtTime(initialGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Crisp typewriter / click sound
   */
  playClick(now, isSpace) {
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    const pitchOffset = (Math.random() - 0.5) * 60;
    const baseFreq = isSpace ? 520 : 880 + pitchOffset;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.025);

    gain.gain.setValueAtTime(0.2 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  /**
   * Subtle muted pop on mistyped character
   */
  playErrorSound(now) {
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);

    gain.gain.setValueAtTime(0.18 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  /**
   * Pleasant ascending harmonic chime when completing a test
   */
  playCompletionChime() {
    if (!this.enabled || !this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const chords = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const startTime = this.audioCtx.currentTime;

    chords.forEach((freq, idx) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      const noteTime = startTime + idx * 0.09;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.2 * this.volume, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.5);
    });
  }
}

window.KeyflowSound = new SoundEngine();
