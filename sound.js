const STAGE_NOTES = {
  lexer: "C5",
  parser: "E5",
  scope: "G5",
  semantic: "B5",
  execute: "C6",
};

const PLAYFUL_MELODY = [
  ["E5", 1], ["G5", 0.5], ["A5", 0.5], ["G5", 1], ["E5", 1],
  ["D5", 0.5], ["C5", 0.5], ["D5", 1], ["E5", 1.5], ["G5", 0.5],
  ["C6", 1], ["B5", 0.5], ["A5", 0.5], ["G5", 1], ["E5", 1],
  ["F5", 0.5], ["G5", 0.5], ["A5", 1], ["G5", 1], ["C6", 1],
  ["E6", 0.5], ["D6", 0.5], ["C6", 1], ["G5", 1], ["A5", 0.5],
  ["B5", 0.5], ["C6", 1], ["G5", 1], ["E5", 1], ["C5", 1],
];

const ACCOMPANIMENT = [
  ["C3", "G3", "E4"],
  ["G2", "D3", "B3"],
  ["A2", "E3", "C4"],
  ["F2", "C3", "A3"],
  ["D3", "A3", "F4"],
  ["G2", "D3", "B3"],
];

const NOTE_FREQUENCIES = new Map();
for (const name of ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]) {
  for (let octave = 1; octave <= 7; octave++) {
    const semitone = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].indexOf(name);
    const midi = 12 * (octave + 1) + semitone;
    NOTE_FREQUENCIES.set(`${name}${octave}`, 440 * Math.pow(2, (midi - 69) / 12));
  }
}

export class KlangSound {
  constructor() {
    this.enabled = true;
    this.context = null;
    this.master = null;
    this.room = null;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled && this.master && this.context) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0.0001, now, 0.02);
    }
  }

  async play(result, events, tokens, stages, { durationMs = 5600 } = {}) {
    if (!this.enabled) return "off";
    if (!this.isSupported()) return "unsupported";

    const ctx = await this.ensureContext();
    const start = ctx.currentTime + 0.05;
    const total = Math.max(4.4, durationMs / 1000);
    const beat = this.beatForDuration(total);

    this.master.gain.cancelScheduledValues(start);
    this.master.gain.setValueAtTime(0.3, start);

    this.playAccompaniment(ctx, start, total, beat);
    this.playMelody(ctx, start + beat * 0.5, total, beat);
    this.playStageSparkles(ctx, start + beat, result, stages, total);
    this.playExecutionRun(ctx, start + total * 0.72, events, beat);

    if (result.ok) this.playHappyEnding(ctx, start + total - beat * 2.4, beat);
    else this.playOopsEnding(ctx, start + total - beat * 2.4, beat);

    this.master.gain.setValueAtTime(0.3, start + total - 0.18);
    this.master.gain.exponentialRampToValueAtTime(0.0001, start + total + 0.75);
    return "playing";
  }

  isSupported() {
    return Boolean(window.AudioContext || window.webkitAudioContext);
  }

  async ensureContext() {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.context = new AudioContextClass();

      const delay = this.context.createDelay(0.7);
      const feedback = this.context.createGain();
      const roomGain = this.context.createGain();
      this.master = this.context.createGain();

      delay.delayTime.value = 0.18;
      feedback.gain.value = 0.16;
      roomGain.gain.value = 0.16;
      this.master.gain.value = 0.3;

      delay.connect(feedback).connect(delay);
      delay.connect(roomGain).connect(this.context.destination);
      this.master.connect(this.context.destination);
      this.master.connect(delay);
      this.room = roomGain;
    }
    if (this.context.state === "suspended") await this.context.resume();
    return this.context;
  }

  beatForDuration(total) {
    const melodyBeats = PLAYFUL_MELODY.reduce((sum, [, beats]) => sum + beats, 0);
    return Math.max(0.22, Math.min(0.34, total / (melodyBeats * 0.72)));
  }

  playMelody(ctx, start, total, beat) {
    let time = start;
    let index = 0;
    while (time < start + total - beat * 2) {
      const [note, beats] = PLAYFUL_MELODY[index % PLAYFUL_MELODY.length];
      const duration = beats * beat;
      const accent = index % 8 === 0 ? 1.12 : 1;
      this.pianoNote(ctx, freq(note), time, duration * 1.08, 0.086 * accent, 0.06);
      if (beats >= 1 && index % 4 === 1) {
        this.pianoNote(ctx, freq(note) * 2, time + duration * 0.52, duration * 0.38, 0.035, 0.18);
      }
      time += duration;
      index += 1;
    }
  }

  playAccompaniment(ctx, start, total, beat) {
    let measure = 0;
    let time = start;
    const measureLength = beat * 3;

    while (time < start + total - beat) {
      const [bass, middle, high] = ACCOMPANIMENT[measure % ACCOMPANIMENT.length];
      this.pianoNote(ctx, freq(bass), time, beat * 1.2, 0.088, -0.26);
      this.pianoNote(ctx, freq(middle), time + beat, beat * 0.82, 0.046, -0.1);
      this.pianoNote(ctx, freq(high), time + beat, beat * 0.82, 0.036, 0.08);
      this.pianoNote(ctx, freq(middle), time + beat * 2, beat * 0.78, 0.038, -0.08);
      this.pianoNote(ctx, freq(high), time + beat * 2, beat * 0.78, 0.032, 0.14);
      time += measureLength;
      measure += 1;
    }
  }

  playStageSparkles(ctx, start, result, stages, total) {
    const failedIndex = result.failedStage ? stages.indexOf(result.failedStage) : stages.length - 1;
    const stopIndex = Math.max(0, failedIndex);
    const spacing = (total * 0.58) / (stopIndex + 1);

    for (let index = 0; index <= stopIndex; index++) {
      const stage = stages[index];
      const time = start + index * spacing;
      const note = STAGE_NOTES[stage] || "C5";
      if (result.failedStage === stage) {
        this.pianoChord(ctx, [freq("D4"), freq("F4"), freq("G#4")], time, 0.7, 0.105, -0.05);
        return;
      }
      this.pianoNote(ctx, freq(note), time, 0.2, 0.05, 0.24);
      this.pianoNote(ctx, freq(note) * 1.5, time + 0.09, 0.24, 0.034, 0.28);
    }
  }

  playExecutionRun(ctx, start, events, beat) {
    const notes = ["G5", "A5", "C6", "D6", "E6"];
    events.slice(0, 14).forEach((event, index) => {
      const note = notes[(index + (event.kind === "instantiate" ? 2 : 0)) % notes.length];
      this.pianoNote(ctx, freq(note), start + index * beat * 0.24, beat * 0.35, 0.032, 0.32);
    });
  }

  playHappyEnding(ctx, start, beat) {
    this.pianoNote(ctx, freq("G5"), start, beat, 0.07, -0.06);
    this.pianoNote(ctx, freq("B5"), start + beat * 0.45, beat, 0.065, 0.04);
    this.pianoNote(ctx, freq("C6"), start + beat * 0.9, beat * 1.8, 0.09, 0.12);
    this.pianoChord(ctx, [freq("C4"), freq("E4"), freq("G4"), freq("C5")], start + beat * 1.35, beat * 2.1, 0.078, 0);
  }

  playOopsEnding(ctx, start, beat) {
    this.pianoChord(ctx, [freq("D4"), freq("F4"), freq("G#4")], start, beat * 1.2, 0.11, -0.1);
    this.pianoNote(ctx, freq("C3"), start + beat, beat * 2, 0.12, -0.24);
  }

  pianoChord(ctx, frequencies, start, duration, velocity, pan) {
    frequencies.forEach((frequency, index) => {
      this.pianoNote(ctx, frequency, start + index * 0.018, duration, velocity * (index === 0 ? 1 : 0.72), pan);
    });
  }

  pianoNote(ctx, frequency, start, duration, velocity, pan) {
    const output = ctx.createGain();
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const filter = ctx.createBiquadFilter();
    const partials = [
      { ratio: 1, gain: 1, type: "triangle" },
      { ratio: 2.01, gain: 0.34, type: "sine" },
      { ratio: 3.02, gain: 0.13, type: "sine" },
      { ratio: 4.01, gain: 0.055, type: "sine" },
    ];

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(Math.min(6200, frequency * 10), start);
    filter.frequency.exponentialRampToValueAtTime(Math.min(3600, frequency * 6), start + duration);
    filter.Q.setValueAtTime(0.72, start);

    output.gain.setValueAtTime(0.0001, start);
    output.gain.exponentialRampToValueAtTime(Math.max(velocity, 0.0001), start + 0.008);
    output.gain.exponentialRampToValueAtTime(Math.max(velocity * 0.38, 0.0001), start + 0.12);
    output.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    if (panner) {
      panner.pan.setValueAtTime(pan, start);
      output.connect(filter).connect(panner).connect(this.master);
    } else {
      output.connect(filter).connect(this.master);
    }

    partials.forEach((partial) => {
      const osc = ctx.createOscillator();
      const partialGain = ctx.createGain();
      osc.type = partial.type;
      osc.frequency.setValueAtTime(frequency * partial.ratio, start);
      osc.frequency.exponentialRampToValueAtTime(frequency * partial.ratio * 0.997, start + duration);
      partialGain.gain.setValueAtTime(partial.gain, start);
      osc.connect(partialGain).connect(output);
      osc.start(start);
      osc.stop(start + duration + 0.08);
    });

    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = "sine";
    click.frequency.setValueAtTime(frequency * 6, start);
    clickGain.gain.setValueAtTime(velocity * 0.08, start);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.026);
    click.connect(clickGain).connect(filter);
    click.start(start);
    click.stop(start + 0.035);
  }
}

function freq(note) {
  return NOTE_FREQUENCIES.get(note) || 440;
}
