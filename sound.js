// sound.js
// One instrument per pipeline stage, built on the raw Web Audio API so the
// project stays dependency-free (no Tone.js / CDN). The app drives the timeline
// and calls the matching instrument as each stage activates, so a clean run
// builds up like a short symphony and an error simply stops the sequence.
//
//   lexer    -> triangle synth       (bright, plucky arpeggio)
//   parser   -> plucked string       (Karplus-Strong)
//   scope    -> soft pad             (slow detuned chord)
//   semantic -> bell / FM            (inharmonic FM tone)
//   execute  -> percussive membrane  (pitched drum, one hit per output line)

const NOTE_FREQUENCIES = new Map();
const CHROMA = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
for (const name of CHROMA) {
  for (let octave = 1; octave <= 7; octave++) {
    const midi = 12 * (octave + 1) + CHROMA.indexOf(name);
    NOTE_FREQUENCIES.set(`${name}${octave}`, 440 * Math.pow(2, (midi - 69) / 12));
  }
}

function freq(note) {
  return NOTE_FREQUENCIES.get(note) || 440;
}

export class KlangSound {
  constructor() {
    this.enabled = true;
    this.context = null;
    this.master = null;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled && this.master && this.context) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0.0001, now, 0.02);
    } else if (enabled && this.master && this.context) {
      this.master.gain.setTargetAtTime(0.32, this.context.currentTime, 0.05);
    }
  }

  isSupported() {
    return Boolean(window.AudioContext || window.webkitAudioContext);
  }

  // Called on Run (a user gesture) so the context is allowed to start.
  async resume() {
    if (!this.enabled) return "off";
    if (!this.isSupported()) return "unsupported";
    if (!this.context) this._build();
    if (this.context.state === "suspended") await this.context.resume();
    return "ok";
  }

  _build() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();

    // gentle stereo-ish room: a short feedback delay for air.
    const master = ctx.createGain();
    master.gain.value = 0.32;

    const delay = ctx.createDelay(0.6);
    delay.delayTime.value = 0.19;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.18;
    const room = ctx.createGain();
    room.gain.value = 0.14;

    master.connect(ctx.destination);
    master.connect(delay);
    delay.connect(feedback).connect(delay);
    delay.connect(room).connect(ctx.destination);

    this.context = ctx;
    this.master = master;
  }

  _ready() {
    return this.enabled && this.context && this.master;
  }

  // ---- instruments -------------------------------------------------------

  // lexer: triangle synth
  triangle(note, velocity = 0.09) {
    if (!this._ready()) return;
    const ctx = this.context;
    const when = ctx.currentTime + 0.005;
    const f = freq(note);
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(f, when);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(velocity, when + 0.006);
    g.gain.exponentialRampToValueAtTime(velocity * 0.25, when + 0.14);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.34);
    osc.connect(g).connect(this.master);
    osc.start(when);
    osc.stop(when + 0.4);
  }

  // parser: plucked string (Karplus-Strong)
  pluck(note, velocity = 0.5) {
    if (!this._ready()) return;
    const ctx = this.context;
    const when = ctx.currentTime + 0.005;
    const f = Math.max(freq(note), 55);
    const dur = 0.7;

    const out = ctx.createGain();
    out.gain.setValueAtTime(velocity, when);
    out.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    out.connect(this.master);

    const delay = ctx.createDelay(0.05);
    delay.delayTime.value = 1 / f;
    const damp = ctx.createBiquadFilter();
    damp.type = "lowpass";
    damp.frequency.value = Math.min(4200, f * 6);
    const fb = ctx.createGain();
    fb.gain.setValueAtTime(0.94, when);
    fb.gain.setTargetAtTime(0.0, when + dur * 0.5, 0.12);

    delay.connect(damp).connect(fb).connect(delay);
    delay.connect(out);

    // excite the string with one period of noise
    const len = Math.max(1, Math.floor(ctx.sampleRate / f));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.connect(delay);
    noise.start(when);
    noise.stop(when + 0.05);
  }

  // scope: soft pad (slow detuned chord)
  pad(notes, velocity = 0.05) {
    if (!this._ready()) return;
    const ctx = this.context;
    const when = ctx.currentTime + 0.01;
    const dur = 1.6;
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0.0001, when);
    bus.gain.linearRampToValueAtTime(velocity, when + 0.35);
    bus.gain.setValueAtTime(velocity, when + dur * 0.5);
    bus.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    bus.connect(this.master);

    for (const note of notes) {
      const f = freq(note);
      for (const cents of [-6, 6]) {
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = f * Math.pow(2, cents / 1200);
        osc.connect(bus);
        osc.start(when);
        osc.stop(when + dur + 0.1);
      }
    }
  }

  // semantic: bell / FM
  bell(note, velocity = 0.07) {
    if (!this._ready()) return;
    const ctx = this.context;
    const when = ctx.currentTime + 0.005;
    const f = freq(note);
    const dur = 0.7;

    const carrier = ctx.createOscillator();
    carrier.type = "sine";
    carrier.frequency.value = f;
    const mod = ctx.createOscillator();
    mod.type = "sine";
    mod.frequency.value = f * 2.01; // inharmonic -> bell colour
    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(f * 3.2, when);
    modGain.gain.exponentialRampToValueAtTime(0.001, when + dur * 0.7);
    mod.connect(modGain).connect(carrier.frequency);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(velocity, when + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    carrier.connect(g).connect(this.master);

    carrier.start(when);
    mod.start(when);
    carrier.stop(when + dur + 0.05);
    mod.stop(when + dur + 0.05);
  }

  // execute: percussive membrane (pitched drum)
  membrane(note, velocity = 0.12) {
    if (!this._ready()) return;
    const ctx = this.context;
    const when = ctx.currentTime + 0.005;
    const f = freq(note);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f * 4, when);
    osc.frequency.exponentialRampToValueAtTime(f, when + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(velocity, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.3);
    osc.connect(g).connect(this.master);
    osc.start(when);
    osc.stop(when + 0.35);
  }

  // dissonant cutoff when a stage fails
  glitch() {
    if (!this._ready()) return;
    this.bell("C3", 0.1);
    this.bell("C#3", 0.08);
    this.membrane("C2", 0.14);
  }

  // small bright cadence when a clean run finishes
  flourish() {
    if (!this._ready()) return;
    const ctx = this.context;
    const t = ctx.currentTime;
    ["C5", "E5", "G5", "C6"].forEach((note, i) => {
      setTimeout(() => this.triangle(note, 0.08), i * 70);
    });
    setTimeout(() => this.bell("C6", 0.06), 140);
    void t;
  }
}
