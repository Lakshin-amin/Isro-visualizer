// Procedural audio via Web Audio API — no external files needed

class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.ambientNode = null;
    this.enabled = true;
    this.volume = 0.5;
    this._initialized = false;
  }

  init() {
    if (this._initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
      this._initialized = true;
      this.startAmbient();
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  startAmbient() {
    if (!this.ctx || !this.enabled) return;
    this._stopAmbient();

    // Deep space drone: layered oscillators
    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 0;
    gainNode.connect(this.masterGain);

    const oscs = [];
    const freqs = [40, 60, 80, 120, 160];
    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const og  = this.ctx.createGain();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      og.gain.value = 0.08 / (i + 1);
      osc.connect(og);
      og.connect(gainNode);
      osc.start();
      oscs.push(osc);
    });

    // Slow LFO for the drone
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.05;
    lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain);
    lfoGain.connect(gainNode.gain);
    lfo.start();

    // Fade in
    gainNode.gain.setTargetAtTime(0.4, this.ctx.currentTime, 2.0);

    this._ambientGain = gainNode;
    this._ambientOscs = oscs;
    this._ambientLfo  = lfo;
  }

  _stopAmbient() {
    try {
      if (this._ambientOscs) {
        this._ambientOscs.forEach(o => o.stop());
        this._ambientOscs = null;
      }
      if (this._ambientLfo) { this._ambientLfo.stop(); this._ambientLfo = null; }
    } catch (e) {}
  }

  // Sci-fi focus/click sound
  playFocus() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.18);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  // Launch rumble
  playLaunch() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const t = this.ctx.currentTime;
    // Noise burst
    const bufSize = this.ctx.sampleRate * 0.6;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);

    // Rising tone
    const osc = this.ctx.createOscillator();
    const og  = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.4);
    og.gain.setValueAtTime(0.2, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(og);
    og.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  // Soft ping for search result
  playPing() {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.setValueAtTime(1100, t + 0.02);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.start(t);
    osc.stop(t + 0.41);
  }

  // Time scrub hum — call with speed (0 = stop)
  setScrubbing(speed) {
    if (!this.ctx || !this.enabled) return;
    this.resume();
    if (speed === 0) {
      if (this._scrubOsc) {
        try { this._scrubOsc.stop(); } catch(e) {}
        this._scrubOsc = null;
      }
      return;
    }
    if (!this._scrubOsc) {
      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 200 + speed * 0.5;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      this._scrubOsc = osc;
      this._scrubGain = gain;
    }
    this._scrubOsc.frequency.value = 150 + Math.min(speed, 1000) * 0.2;
  }

  setEnabled(v) {
    this.enabled = v;
    if (!v) {
      this._stopAmbient();
      if (this._ambientGain) {
        try { this._ambientGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3); } catch(e) {}
      }
    } else {
      this.startAmbient();
    }
  }

  setVolume(v) {
    this.volume = v;
    if (this.masterGain) this.masterGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
  }
}

export const sound = new SoundManager();
