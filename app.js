import { run, STAGES } from "./src/pipeline.js";
import { KEYWORDS, LITERAL_WORDS, tokenCategory } from "./src/token.js";
import { KlangSound, CANON_SCORE, ODE_SCORE } from "./sound.js";

// ---------------------------------------------------------------- samples

const samples = {
  hello: {
    label: "Hello",
    file: "hello.klang",
    source: `motif greet(name):
    play("hello " + name)

greet("Klang")
`,
  },
  fizzbuzz: {
    label: "FizzBuzz",
    file: "fizzbuzz.klang",
    source: `loop i in scale(1, 16):
    when i % 15 == 0:
        play("FizzBuzz")
    orwhen i % 3 == 0:
        play("Fizz")
    orwhen i % 5 == 0:
        play("Buzz")
    otherwise:
        play(i)
`,
  },
  oop: {
    label: "Counter ensemble",
    file: "counter.klang",
    source: `ensemble Counter:
    motif tune(self, start):
        self._n = start

    motif bump(self):
        self._n = self._n + 1

    motif value(self):
        resolve self._n

c = Counter(10)
loop i in scale(3):
    c.bump()

play(c.value())
`,
  },
  canon: {
    label: "Canon (Pachelbel)",
    file: "canon.klang",
    mode: "canon",
    source: `# canon.klang — a concert program for Pachelbel's Canon
# The web shell plays an orchestral arrangement as this compiles.

ensemble Orchestra:
    motif tune(self, hall):
        self._hall = hall
        self._voices = 0

    motif seat(self):
        self._voices = self._voices + 1
        resolve self._voices

    motif hall(self):
        resolve self._hall

motif announce(title):
    play(title)

motif bar(n):
    play("bar " + str(n))

motif section(name, bars):
    play(name)
    loop i in scale(1, bars + 1):
        bar(i)

motif continuo():
    play("ground: D A B F#")
    play("ground: G D G A")

motif violin_theme():
    play("violin I enters — canon subject")
    play("D4 F#4 A4 D5")
    play("A4 B4 C#5 D5")

motif viola_answer():
    play("viola answers a bar late")
    play("inner voice fills the thirds")

motif cello_bass():
    play("cello walks the ground bass")
    play("D3 A2 B2 F#2 G2 D2 G2 A2")

motif cadence():
    play("final cadence — D major")
    play("the house is still")

motif canon(voices):
    when voices <= 0:
        play("empty pit — no voices seated")
        resolve
    when voices == 1:
        violin_theme()
        resolve
    when voices == 2:
        violin_theme()
        viola_answer()
        resolve
    when voices == 3:
        violin_theme()
        viola_answer()
        cello_bass()
        resolve
    violin_theme()
    viola_answer()
    cello_bass()
    continuo()
    cadence()

motif program_note():
    play("Klang Hall — evening program")
    play("Johann Pachelbel — Canon")
    play("arranged for the compiler orchestra")
    play("each pipeline stage seats one voice")

# ---- curtain up ----------------------------------------------------------

house = Orchestra("Klang Hall")
program_note()

play("seating the pit")
loop seat in scale(1, 5):
    n = house.seat()
    play("voice " + str(n) + " seated")

play("hall: " + house.hall())
continuo()
section("exposition", 4)
canon(4)
section("development", 3)
canon(3)
section("recapitulation", 2)
canon(2)
cadence()

play("end of program — applause")
`,
  },
  ode: {
    label: "Ode to Joy (Beethoven)",
    file: "ode.klang",
    mode: "ode",
    source: `# ode.klang — a concert program for Beethoven's Ode to Joy
# The web shell plays an orchestral arrangement as this compiles.

ensemble Hall:
    motif tune(self, name):
        self._name = name
        self._chorus = 0

    motif seat_chorus(self):
        self._chorus = self._chorus + 1
        resolve self._chorus

    motif name(self):
        resolve self._name

motif announce(line):
    play(line)

motif bar(n):
    play("bar " + str(n))

motif movement(title, bars):
    play(title)
    loop i in scale(1, bars + 1):
        bar(i)

motif hymn_theme():
    play("Ode to Joy — hymn theme")
    play("E4 E4 F4 G4")
    play("G4 F4 E4 D4")
    play("C4 C4 D4 E4")
    play("E4 D4 D4")

motif hymn_answer():
    play("second phrase — rising answer")
    play("D4 D4 E4 C4")
    play("D4 E4 F4 E4")
    play("D4 C4 D4")

motif bass_walk():
    play("bass walks the tonic and dominant")
    play("C3 G2 A2 F2")
    play("C3 G2 C3 G2")

motif chorus_swell():
    play("full chorus — Freude, schöner Götterfunken")
    play("the hall answers in unison")

motif coda():
    play("coda — triumphant close")
    play("C major cadence")
    play("the Ninth is still ringing")

motif ode(voices):
    when voices <= 0:
        play("empty hall — no chorus")
        resolve
    when voices == 1:
        hymn_theme()
        resolve
    when voices == 2:
        hymn_theme()
        hymn_answer()
        resolve
    when voices == 3:
        hymn_theme()
        hymn_answer()
        bass_walk()
        resolve
    hymn_theme()
    hymn_answer()
    bass_walk()
    chorus_swell()
    coda()

motif program_note():
    play("Klang Hall — evening program")
    play("Ludwig van Beethoven — Symphony No. 9")
    play("Ode to Joy — arranged for the compiler orchestra")
    play("each pipeline stage seats another voice")

# ---- curtain up ----------------------------------------------------------

house = Hall("Klang Hall")
program_note()

play("seating the chorus")
loop seat in scale(1, 5):
    n = house.seat_chorus()
    play("chorus voice " + str(n) + " seated")

play("hall: " + house.name())
bass_walk()
movement("allegro assai — exposition", 4)
ode(4)
movement("development — the theme returns", 3)
ode(3)
movement("recapitulation", 2)
ode(2)
coda()

play("end of program — standing ovation")
`,
  },
  semanticError: {
    label: "Semantic error",
    file: "typemismatch.klang",
    source: `x = "a" + True
`,
  },
  runtimeError: {
    label: "Runtime error",
    file: "runtime.klang",
    source: `motif divide(x):
    resolve 1 / x

play(divide(0))
`,
  },
};

// one instrument (and one hue) per pipeline stage
const STAGE_META = {
  lexer: { label: "Lexer", instrument: "triangle synth", color: "#c0453a" },
  parser: { label: "Parser", instrument: "plucked string", color: "#b5568f" },
  scope: { label: "Scope", instrument: "soft pad", color: "#2f8f7a" },
  semantic: { label: "Semantic", instrument: "bell · FM", color: "#c9971f" },
  execute: { label: "Execute", instrument: "membrane drum", color: "#7a4e9a" },
};

const STAGE_META_CANON = {
  lexer: { label: "Lexer", instrument: "violin (Canon theme)", color: "#c0453a" },
  parser: { label: "Parser", instrument: "cello (ground bass)", color: "#b5568f" },
  scope: { label: "Scope", instrument: "continuo (organ pad)", color: "#2f8f7a" },
  semantic: { label: "Semantic", instrument: "viola (inner voice)", color: "#c9971f" },
  execute: { label: "Execute", instrument: "bass · cadence", color: "#7a4e9a" },
};

const STAGE_META_ODE = {
  lexer: { label: "Lexer", instrument: "violin (Ode theme)", color: "#c0453a" },
  parser: { label: "Parser", instrument: "cello (walking bass)", color: "#b5568f" },
  scope: { label: "Scope", instrument: "continuo (hymn pad)", color: "#2f8f7a" },
  semantic: { label: "Semantic", instrument: "viola (harmony)", color: "#c9971f" },
  execute: { label: "Execute", instrument: "bass · ode cadence", color: "#7a4e9a" },
};

const STAGE_COLORS = STAGES.map((key) => STAGE_META[key].color);

function activeSample() {
  return samples[els.sampleSelect.value] || samples.hello;
}

function sampleMode() {
  return activeSample().mode || null;
}

function stageMeta() {
  const mode = sampleMode();
  if (mode === "canon") return STAGE_META_CANON;
  if (mode === "ode") return STAGE_META_ODE;
  return STAGE_META;
}

const STRUCTURAL = new Set(["EOF", "NEWLINE", "INDENT", "DEDENT"]);

// ------------------------------------------------------------------- dom

const els = {
  scene: document.querySelector("#scene"),
  sourceNotes: document.querySelector("#sourceNotes"),
  sampleSelect: document.querySelector("#sampleSelect"),
  soundToggle: document.querySelector("#soundToggle"),
  soundStatus: document.querySelector("#soundStatus"),
  resetButton: document.querySelector("#resetButton"),
  runButton: document.querySelector("#runButton"),
  brandFile: document.querySelector("#brandFile"),
  sourceInput: document.querySelector("#sourceInput"),
  codeHighlight: document.querySelector("#codeHighlight"),
  gutter: document.querySelector("#gutter"),
  errorBanner: document.querySelector("#errorBanner"),
  errorText: document.querySelector("#errorText"),
  consoleOut: document.querySelector("#consoleOut"),
  pipelineList: document.querySelector("#pipelineList"),
  legendList: document.querySelector("#legendList"),
  roll: document.querySelector("#roll"),
  sceneNotes: document.querySelector("#sceneNotes"),
  artifactOut: document.querySelector("#artifactOut"),
  artifactTabs: document.querySelectorAll(".artifact-tab"),
};

const sound = new KlangSound();
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let runSeq = 0;
let running = false;
let activeIndex = -1;
let artifactTab = "tokens";
let lastArtifacts = { tokens: "", ast: "", scope: "" };
let artifactsReady = false;

// -------------------------------------------------------------- editor

const LITERAL_WORD_SET = new Set(Object.keys(LITERAL_WORDS));
const TOKEN_RE =
  /(#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\d+\.?\d*)|([A-Za-z_]\w*)|([+\-*/%=<>!.]+|[()[\]:,])/g;

function escapeHtml(text) {
  return text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

/** Source [start, end) for a lexer token — read from the text, not token.value
 *  (keywords are canonicalized: motif → def, strings drop their quotes, etc.). */
function tokenSourceRange(src, token) {
  if (!token || token.line == null || token.col == null) return null;
  const lines = src.split("\n");
  const lineIdx = token.line - 1;
  if (lineIdx < 0 || lineIdx >= lines.length) return null;

  let offset = 0;
  for (let i = 0; i < lineIdx; i++) offset += lines[i].length + 1;
  const start = offset + (token.col - 1);
  if (start < 0 || start > src.length) return null;

  if (token.type === "STRING") {
    const quote = src[start];
    let j = start + 1;
    while (j < src.length && src[j] !== "\n") {
      if (src[j] === "\\") {
        j += 2;
        continue;
      }
      if (src[j] === quote) return { start, end: j + 1 };
      j++;
    }
    return { start, end: Math.min(start + 1, src.length) };
  }

  if (token.type === "INT" || token.type === "FLOAT") {
    let j = start;
    while (j < src.length && /[0-9.]/.test(src[j])) j++;
    return { start, end: j };
  }

  if (
    token.type === "IDENTIFIER" ||
    token.type === "KEYWORD" ||
    token.type === "BOOL" ||
    token.type === "NONE"
  ) {
    let j = start;
    while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
    return { start, end: j };
  }

  if (token.type === "OP" || token.type === "PUNCT") {
    const text = String(token.value ?? "");
    return { start, end: start + Math.max(1, text.length) };
  }

  return { start, end: start + tokenDisplayLength(token) };
}

/** Emit a source slice as a span with absolute offsets for lexeme tracking. */
function emitSlice(src, from, to, cls) {
  if (from >= to) return "";
  const text = escapeHtml(src.slice(from, to));
  const clsAttr = cls ? ` class="${cls}"` : "";
  return `<span${clsAttr} data-a="${from}" data-b="${to}">${text}</span>`;
}

function highlightCode(src) {
  let out = "";
  let last = 0;
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(src))) {
    if (m.index > last) out += emitSlice(src, last, m.index, null);
    const [, comment, string, number, word, op] = m;
    const start = m.index;
    const end = TOKEN_RE.lastIndex;
    if (comment !== undefined) {
      out += emitSlice(src, start, end, "tok-comment");
    } else if (string !== undefined) {
      out += emitSlice(src, start, end, "tok-string");
    } else if (number !== undefined) {
      out += emitSlice(src, start, end, "tok-number");
    } else if (word !== undefined) {
      let cls = "tok-identifier";
      if (LITERAL_WORD_SET.has(word)) cls = "tok-literal";
      else if (KEYWORDS.has(word)) cls = "tok-keyword";
      out += emitSlice(src, start, end, cls);
    } else if (op !== undefined) {
      out += emitSlice(src, start, end, "tok-operator");
    }
    last = end;
  }
  if (last < src.length) out += emitSlice(src, last, src.length, null);
  return out;
}

let trackToken = null;
let lexemeSpans = [];

function refreshLexemeSpans() {
  lexemeSpans = [...els.codeHighlight.querySelectorAll("[data-a]")];
}

function clearTrackMarks() {
  for (const el of els.codeHighlight.querySelectorAll(".tok-track")) {
    el.classList.remove("tok-track");
    delete el.dataset.note;
    el.style.removeProperty("--note-color");
  }
}

/** Mark the lexeme span(s) in place — no innerHTML rebuild (keeps every token visible). */
function markTokenTrack(token) {
  clearTrackMarks();
  trackToken = token;
  if (!token) return null;

  const range = tokenSourceRange(els.sourceInput.value, token);
  if (!range) return null;

  if (!lexemeSpans.length) refreshLexemeSpans();

  let first = null;
  for (const el of lexemeSpans) {
    const a = Number(el.dataset.a);
    const b = Number(el.dataset.b);
    if (a < range.end && b > range.start) {
      el.classList.add("tok-track");
      if (!first) first = el;
    }
  }
  return first;
}

function updateEditor() {
  const src = els.sourceInput.value;
  trackToken = null;
  els.codeHighlight.innerHTML = highlightCode(src) + "\n";
  refreshLexemeSpans();
  const lines = src.split("\n").length;
  let gutter = "";
  for (let i = 1; i <= lines; i++) gutter += (i > 1 ? "\n" : "") + i;
  els.gutter.textContent = gutter;
  // Keep Score at a fixed panel size; long sources scroll inside the textarea.
  els.sourceInput.style.height = "";
  syncScroll();
}

function syncScroll() {
  els.codeHighlight.scrollTop = els.sourceInput.scrollTop;
  els.codeHighlight.scrollLeft = els.sourceInput.scrollLeft;
  els.gutter.scrollTop = els.sourceInput.scrollTop;
}

// ----------------------------------------------------- token note pops

const CATEGORY_COLOR = {
  keyword: "#b23636",
  identifier: "#2f8069",
  operator: "#c06a17",
  literal: "#9c3d6a",
  structural: "#a08a68",
};
const NOTE_GLYPHS = ["♪", "♫", "♩", "♬"];

/** Keep the Score scrolled so the token under the cursor stays visible. */
function scrollTokenIntoView(token) {
  const ta = els.sourceInput;
  if (ta.scrollHeight <= ta.clientHeight + 1) return;

  const style = getComputedStyle(ta);
  const fontSize = parseFloat(style.fontSize) || 13;
  let lineHeight = parseFloat(style.lineHeight);
  if (!lineHeight || lineHeight < fontSize) lineHeight = fontSize * 1.7;
  const padTop = parseFloat(style.paddingTop) || 0;
  const tokenTop = padTop + (token.line - 1) * lineHeight;
  const tokenBottom = tokenTop + lineHeight;
  const viewTop = ta.scrollTop;
  const viewBottom = viewTop + ta.clientHeight;
  const margin = lineHeight * 1.5;

  if (tokenTop >= viewTop + margin && tokenBottom <= viewBottom - margin) return;

  const maxScroll = Math.max(0, ta.scrollHeight - ta.clientHeight);
  const centered = tokenTop - ta.clientHeight / 2 + lineHeight / 2;
  ta.scrollTop = Math.max(0, Math.min(centered, maxScroll));
  syncScroll();
}

// how many source characters the token spans (fallback when range walk fails)
function tokenDisplayLength(token) {
  if (token.type === "STRING") return String(token.value).length + 2;
  if (token.value === null || token.value === undefined) return String(token.type).length;
  return Math.max(1, String(token.value).length);
}

// Light up the lexeme itself in the highlighted source (scroll-safe, cheap).
function highlightToken(token, { scroll = true } = {}) {
  if (scroll) scrollTokenIntoView(token);
  markTokenTrack(token);
}

function popSourceNote(token, { scroll = false } = {}) {
  if (scroll) scrollTokenIntoView(token);
  const mark =
    (trackToken === token && els.codeHighlight.querySelector(".tok-track")) ||
    markTokenTrack(token);
  if (!mark) return;
  mark.dataset.note = NOTE_GLYPHS[Math.floor(Math.random() * NOTE_GLYPHS.length)];
  mark.style.setProperty(
    "--note-color",
    CATEGORY_COLOR[tokenCategory(token.type)] || "var(--text-secondary)",
  );
}

function clearSourceNotes() {
  els.sourceNotes.replaceChildren();
  clearTrackMarks();
  trackToken = null;
}

// -------------------------------------------------------- pipeline list

function renderPipeline(active, failedIndex) {
  const meta = stageMeta();
  els.pipelineList.replaceChildren();
  STAGES.forEach((key, i) => {
    let status;
    if (failedIndex >= 0 && i === failedIndex && active > i) status = "fail";
    else if (failedIndex >= 0 && i > failedIndex && active > failedIndex) status = "skip";
    else if (active === i) status = "active";
    else if (active > i) status = "ok";
    else status = "pending";

    const row = document.createElement("div");
    row.className = "pipe-row" + (status === "active" ? " active" : "") + (status === "skip" ? " is-skip" : "");

    const icon = document.createElement("span");
    icon.className = "pipe-icon";
    if (status === "ok") {
      icon.textContent = "✓";
      icon.style.color = "var(--success-text)";
    } else if (status === "fail") {
      icon.textContent = "✕";
      icon.style.color = "var(--danger-text)";
    } else if (status === "skip") {
      icon.textContent = "—";
    } else if (status === "active") {
      icon.textContent = "▸";
      icon.style.color = meta[key].color;
    } else {
      icon.textContent = "·";
    }

    const dot = document.createElement("span");
    dot.className = "pipe-dot";
    dot.style.background = meta[key].color;

    const label = document.createElement("span");
    label.className = "pipe-label";
    label.textContent = meta[key].label;

    row.append(icon, dot, label);
    els.pipelineList.append(row);
  });
}

function renderLegend() {
  const meta = stageMeta();
  els.legendList.replaceChildren();
  for (const key of STAGES) {
    const row = document.createElement("div");
    row.className = "legend-row";
    const dot = document.createElement("span");
    dot.className = "legend-dot";
    dot.style.background = meta[key].color;
    const label = document.createElement("span");
    label.innerHTML = `${meta[key].label} <span class="legend-role">— ${meta[key].instrument}</span>`;
    row.append(dot, label);
    els.legendList.append(row);
  }
}

// -------------------------------------------------------- symphony roll

const rollCtx = els.roll.getContext("2d");
const rollWrap = els.roll.parentElement;
let rollNotes = [];
let rollCursor = null;

const CLEF_W = 52; // space reserved on the left for the clef

function rollStartX() {
  return CLEF_W + 6;
}

// the five staff lines double as the five pipeline lanes
function staffY(stageIndex, h) {
  const top = 26;
  const bottom = h - 22;
  const gap = (bottom - top) / (STAGES.length - 1);
  return top + stageIndex * gap;
}

function noteLetter(name) {
  if (!name) return "";
  const m = name.match(/[A-Ga-g]/);
  return m ? m[0].toUpperCase() : "";
}

function resizeRoll() {
  const dpr = window.devicePixelRatio || 1;
  els.roll.width = rollWrap.clientWidth * dpr;
  els.roll.height = rollWrap.clientHeight * dpr;
  rollCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function resetRoll() {
  rollNotes = [];
  rollCursor = rollStartX();
}

// each played note is written onto the staff left to right, wrapping around
function pushRoll(stageIndex, noteName) {
  const w = rollWrap.clientWidth;
  if (rollCursor === null || rollCursor > w - 22) rollCursor = rollStartX();
  rollNotes.push({ stage: stageIndex, x: rollCursor, t: 0, letter: noteLetter(noteName) });
  rollCursor += 22;
}

// a filled, tilted notehead with a stem and flag — an eighth note
function drawEighthNote(x, y, color, alpha, letter) {
  rollCtx.globalAlpha = alpha;
  rollCtx.fillStyle = color;
  rollCtx.strokeStyle = color;
  rollCtx.lineWidth = 1.6;
  rollCtx.beginPath();
  rollCtx.moveTo(x + 5, y - 1);
  rollCtx.lineTo(x + 5, y - 19);
  rollCtx.stroke();
  rollCtx.beginPath();
  rollCtx.moveTo(x + 5, y - 19);
  rollCtx.quadraticCurveTo(x + 13, y - 15, x + 9, y - 6);
  rollCtx.stroke();
  rollCtx.save();
  rollCtx.translate(x, y);
  rollCtx.rotate(-0.34);
  rollCtx.beginPath();
  rollCtx.ellipse(0, 0, 6, 4.4, 0, 0, Math.PI * 2);
  rollCtx.fill();
  rollCtx.restore();
  if (letter) {
    rollCtx.globalAlpha = alpha * 0.95;
    rollCtx.fillStyle = "#0c0809";
    rollCtx.font = "700 7px ui-monospace, monospace";
    rollCtx.textAlign = "center";
    rollCtx.textBaseline = "middle";
    rollCtx.fillText(letter, x, y + 0.5);
  }
  rollCtx.globalAlpha = 1;
}

function drawRoll() {
  const w = rollWrap.clientWidth;
  const h = rollWrap.clientHeight;
  rollCtx.clearRect(0, 0, w, h);

  // five-line staff — one line per pipeline stage
  rollCtx.lineWidth = 1;
  for (let i = 0; i < STAGES.length; i++) {
    const y = staffY(i, h);
    rollCtx.strokeStyle = "rgba(212,176,106,0.22)";
    rollCtx.beginPath();
    rollCtx.moveTo(8, y);
    rollCtx.lineTo(w - 10, y);
    rollCtx.stroke();
    // stage colour key at the far right of each line
    rollCtx.fillStyle = STAGE_COLORS[i];
    rollCtx.fillRect(w - 7, y - 3, 4, 6);
  }

  for (let j = rollNotes.length - 1; j >= 0; j--) {
    const n = rollNotes[j];
    n.t += 0.016;
    const alpha = 1 - n.t * 0.5;
    if (alpha <= 0) {
      rollNotes.splice(j, 1);
      continue;
    }
    drawEighthNote(n.x, staffY(n.stage, h), STAGE_COLORS[n.stage], alpha, n.letter);
  }
  requestAnimationFrame(drawRoll);
}

// --------------------------------------------------------------- console

function setConsole(text, muted) {
  const out = els.consoleOut;
  out.classList.toggle("is-muted", Boolean(muted));
  out.replaceChildren();

  if (muted) {
    const empty = document.createElement("p");
    empty.className = "cue cue-empty";
    empty.textContent = text || "Awaiting the first cue…";
    out.appendChild(empty);
    return;
  }

  if (!text) return;

  const lines = String(text).split("\n");
  for (const line of lines) {
    const row = document.createElement("p");
    row.className = "cue";
    if (/^[\s]*[A-Za-z_][\w.]*\s*[=:]|^[\s]*\/\/|^[\s]*#|^[\s]*[{}()[\];]|^\s*\d+\s*[|:]/.test(line)) {
      row.classList.add("cue-code");
    }
    row.textContent = line.length ? line : "\u00a0";
    out.appendChild(row);
  }
}

function showError(result) {
  const error = result.errors && result.errors.length ? result.errors[0] : result.error;
  const message = error && typeof error.format === "function" ? error.format() : String(error || "error");
  els.errorText.textContent = message;
  els.errorBanner.classList.add("is-visible");
}

function hideError() {
  els.errorBanner.classList.remove("is-visible");
  els.errorText.textContent = "";
}

// ------------------------------------------------------------- artifacts

const ARTIFACT_AST_LIMIT = 80_000;

function formatTokens(tokens) {
  if (!tokens) return "(tokens not reached)";
  if (!tokens.length) return "(no tokens)";
  return tokens
    .map((t) => {
      const val = t.value === undefined || t.value === null ? "" : String(t.value);
      const shown = val.length > 40 ? val.slice(0, 37) + "…" : val;
      return `${String(t.line).padStart(3)}:${String(t.col).padStart(3)}  ${String(t.type).padEnd(10)}  ${shown}`;
    })
    .join("\n");
}

function formatAst(ast) {
  if (!ast) return "(AST not reached)";
  let text;
  try {
    text = JSON.stringify(ast, null, 2);
  } catch {
    return "(AST could not be serialized)";
  }
  if (text.length > ARTIFACT_AST_LIMIT) {
    return text.slice(0, ARTIFACT_AST_LIMIT) + "\n\n… truncated (" + text.length + " chars)";
  }
  return text;
}

function formatScope(scope) {
  if (!scope) return "(scope not reached)";
  const names = [...(scope.names || [])].sort();
  const globals = [...(scope.globals || [])].sort();
  return [
    `kind: ${scope.kind || "unknown"}`,
    `names (${names.length}): ${names.length ? names.join(", ") : "(none)"}`,
    `globals (${globals.length}): ${globals.length ? globals.join(", ") : "(none)"}`,
  ].join("\n");
}

function showArtifactTab(tab) {
  artifactTab = tab;
  for (const btn of els.artifactTabs) {
    const active = btn.dataset.artifact === tab;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  }
  const text = artifactsReady
    ? lastArtifacts[tab] || "(empty)"
    : "Run a program to inspect stage artifacts.";
  els.artifactOut.textContent = text;
  els.artifactOut.classList.toggle("is-muted", !artifactsReady);
}

function renderArtifacts(result) {
  if (!result) {
    artifactsReady = false;
    lastArtifacts = { tokens: "", ast: "", scope: "" };
    showArtifactTab(artifactTab);
    return;
  }
  lastArtifacts = {
    tokens: formatTokens(result.tokens),
    ast: formatAst(result.ast),
    scope: formatScope(result.scope),
  };
  artifactsReady = true;
  showArtifactTab(artifactTab);
}

function clearArtifacts() {
  renderArtifacts(null);
}

// ------------------------------------------------------------------- run

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nonStructuralTokens(result) {
  return (result.tokens || []).filter((t) => !STRUCTURAL.has(t.type));
}

/** Walk every lexeme in the Score. Optional onToken hooks audio to each step. */
async function walkAllLexerTokens(tokens, seq, {
  budgetMs = 8000,
  minSpacing = 45,
  maxSpacing = 140,
  onToken = null,
} = {}) {
  const n = Math.max(tokens.length, 1);
  const spacing = Math.max(minSpacing, Math.min(maxSpacing, budgetMs / n));
  for (let k = 0; k < tokens.length; k++) {
    if (seq !== runSeq) return;
    highlightToken(tokens[k]);
    popSourceNote(tokens[k]);
    if (onToken) onToken(tokens[k], k);
    await wait(spacing);
  }
}

async function playStage(index, result, isFail, seq, events = []) {
  const key = STAGES[index];

  if (isFail) {
    pushRoll(index);
    pushRoll(index);
    sound.glitch();
    await wait(1500);
    return;
  }

  if (sampleMode() === "canon") {
    await playCanonStage(key, index, result, seq);
    return;
  }
  if (sampleMode() === "ode") {
    await playOdeStage(key, index, result, seq);
    return;
  }

  if (key === "lexer") {
    const scale = ["C4", "D4", "E4", "G4", "A4", "C5", "D5", "E5", "G5"];
    const tokens = nonStructuralTokens(result);
    await walkAllLexerTokens(tokens, seq, {
      budgetMs: 5200,
      minSpacing: 110,
      maxSpacing: 210,
      onToken: (_token, k) => {
        const lexNote = scale[k % scale.length];
        sound.triangle(lexNote);
        pushRoll(index, lexNote);
      },
    });
    await wait(140);
  } else if (key === "parser") {
    for (const note of ["C3", "G3", "C4"]) {
      if (seq !== runSeq) return;
      sound.pluck(note);
      pushRoll(index, note);
      await wait(150);
    }
    await wait(140);
  } else if (key === "scope") {
    const chord = ["A2", "E3", "A3", "C4"];
    sound.pad(chord);
    for (let k = 0; k < 3; k++) {
      if (seq !== runSeq) return;
      pushRoll(index, chord[k]);
      await wait(90);
    }
    await wait(500);
  } else if (key === "semantic") {
    for (const note of ["G4", "B4"]) {
      if (seq !== runSeq) return;
      sound.bell(note);
      pushRoll(index, note);
      await wait(230);
    }
    await wait(200);
  } else if (key === "execute") {
    const prints = events.filter((e) => e.kind === "print");
    const hits = prints.length > 0 ? Math.min(12, prints.length) : 1;
    const drums = ["C2", "G2", "C2", "E2", "G2", "C2"];
    for (let k = 0; k < hits; k++) {
      if (seq !== runSeq) return;
      const drumNote = drums[k % drums.length];
      sound.membrane(drumNote);
      pushRoll(index, drumNote);
      await wait(160);
    }
    await wait(160);
  }
}

/** Pachelbel Canon: each stage seats another orchestral voice. */
async function playCanonStage(key, index, result, seq) {
  if (key === "lexer") {
    const melody = CANON_SCORE.melody;
    const tokens = nonStructuralTokens(result);
    // Music loops on its own clock; Score walks every token.
    const gate = { done: false };
    const music = (async () => {
      let k = 0;
      while (!gate.done && seq === runSeq) {
        const note = melody[k % melody.length];
        sound.violin(note);
        pushRoll(index, note);
        k++;
        await wait(160);
      }
    })();

    await walkAllLexerTokens(tokens, seq, {
      budgetMs: 10000,
      minSpacing: 45,
      maxSpacing: 120,
    });
    gate.done = true;
    await music;
    await wait(120);
  } else if (key === "parser") {
    for (const note of CANON_SCORE.bass) {
      if (seq !== runSeq) return;
      sound.cello(note);
      pushRoll(index, note);
      await wait(200);
    }
    await wait(120);
  } else if (key === "scope") {
    for (let k = 0; k < CANON_SCORE.chords.length; k++) {
      if (seq !== runSeq) return;
      const chord = CANON_SCORE.chords[k];
      sound.continuo(chord, 0.038);
      pushRoll(index, chord[0]);
      await wait(210);
    }
    await wait(280);
  } else if (key === "semantic") {
    for (const note of CANON_SCORE.inner) {
      if (seq !== runSeq) return;
      sound.viola(note);
      pushRoll(index, note);
      await wait(160);
    }
    await wait(140);
  } else if (key === "execute") {
    const hits = Math.max(4, Math.min(8, (result.output || []).length || 4));
    for (let k = 0; k < hits; k++) {
      if (seq !== runSeq) return;
      const note = CANON_SCORE.bass[k % CANON_SCORE.bass.length];
      sound.bass(note);
      pushRoll(index, note);
      await wait(180);
    }
    await wait(200);
  }
}

/** Beethoven Ode to Joy: play the hymn at a steady tempo (not token-timed). */
async function playOdeStage(key, index, result, seq) {
  const beatMs = ODE_SCORE.beatMs;

  if (key === "lexer") {
    const melody = ODE_SCORE.melody;
    const tokens = nonStructuralTokens(result);
    const hymnMs = melody.reduce((sum, m) => sum + m.beats * beatMs, 0);

    // Hymn keeps its tempo; Score walks every token in parallel.
    const music = (async () => {
      for (const { note, beats } of melody) {
        if (seq !== runSeq) return;
        const durSec = (beats * beatMs) / 1000;
        sound.violin(note, 0.1, durSec * 0.92);
        pushRoll(index, note);
        await wait(beats * beatMs);
      }
    })();

    await walkAllLexerTokens(tokens, seq, {
      budgetMs: Math.max(hymnMs, 8000),
      minSpacing: 35,
      maxSpacing: 110,
    });
    await music;
    await wait(200);
  } else if (key === "parser") {
    for (const { note, beats } of ODE_SCORE.bass) {
      if (seq !== runSeq) return;
      const durSec = (beats * beatMs) / 1000;
      sound.cello(note, 0.16, durSec * 0.9);
      pushRoll(index, note);
      await wait(beats * beatMs);
    }
    await wait(160);
  } else if (key === "scope") {
    for (const { notes, beats } of ODE_SCORE.chords) {
      if (seq !== runSeq) return;
      sound.continuo(notes, 0.045);
      pushRoll(index, notes[0]);
      await wait(beats * beatMs);
    }
    await wait(200);
  } else if (key === "semantic") {
    // second half of the hymn in viola — still the Ode contour
    const inner = ODE_SCORE.inner;
    for (let k = 0; k < inner.length; k++) {
      if (seq !== runSeq) return;
      const { note, beats } = inner[k];
      const durSec = (beats * beatMs) / 1000;
      sound.viola(note, 0.07, durSec * 0.9);
      // soft melody double on the famous opening of phrase 2
      if (k >= 15 && k < 30) {
        const mel = ODE_SCORE.melody[k];
        if (mel) sound.violin(mel.note, 0.045, durSec * 0.85);
      }
      pushRoll(index, note);
      await wait(beats * beatMs);
    }
    await wait(160);
  } else if (key === "execute") {
    // short reprise of the opening phrase, then cadence
    const reprise = ODE_SCORE.melody.slice(0, 15);
    for (const { note, beats } of reprise) {
      if (seq !== runSeq) return;
      const durSec = (beats * beatMs) / 1000;
      sound.violin(note, 0.11, durSec * 0.92);
      sound.bass(ODE_SCORE.bass[0].note, 0.08);
      pushRoll(index, note);
      await wait(beats * beatMs);
    }
    await wait(240);
  }
}

async function performRun() {
  if (running) return;
  const seq = ++runSeq;
  running = true;
  els.runButton.disabled = true;

  const events = [];
  const result = run(els.sourceInput.value, {
    emit: (stage, detail) => events.push({ stage, ...detail }),
  });

  resetRoll();
  clearSourceNotes();
  hideError();
  setConsole("", false);
  els.sourceInput.scrollTop = 0;
  els.sourceInput.scrollLeft = 0;
  syncScroll();
  els.scene.classList.add("is-performing");

  const failedIndex = result.failedStage ? STAGES.indexOf(result.failedStage) : -1;
  const lastIndex = failedIndex >= 0 ? failedIndex : STAGES.length - 1;

  await sound.resume();
  updateSoundStatus();

  for (let i = 0; i <= lastIndex; i++) {
    if (seq !== runSeq) return;
    activeIndex = i;
    renderPipeline(activeIndex, failedIndex);
    await playStage(i, result, i === failedIndex, seq, events);
  }

  if (seq !== runSeq) return;
  activeIndex = lastIndex + 1;
  renderPipeline(activeIndex, failedIndex);
  renderArtifacts(result);

  if (failedIndex >= 0) {
    showError(result);
    setConsole(result.output.length ? result.output.join("\n") : "", false);
  } else {
    setConsole(result.output.length ? result.output.join("\n") : "(no output)", false);
    const mode = sampleMode();
    if (mode === "canon") sound.canonCadence();
    else if (mode === "ode") sound.odeCadence();
    else sound.flourish();
  }

  els.scene.classList.remove("is-performing");
  running = false;
  els.runButton.disabled = false;
}

// ---------------------------------------------------- rising stage notes

const SCENE_NOTE_COLORS = ["#c0453a", "#b5568f", "#2f8f7a", "#c9971f", "#7a4e9a"];

function spawnSceneNote() {
  if (reduceMotion || document.hidden) return;
  const note = document.createElement("span");
  note.className = "scene-note";
  note.textContent = NOTE_GLYPHS[Math.floor(Math.random() * NOTE_GLYPHS.length)];
  note.style.left = 22 + Math.random() * 56 + "%";
  note.style.color = SCENE_NOTE_COLORS[Math.floor(Math.random() * SCENE_NOTE_COLORS.length)];
  note.style.fontSize = 13 + Math.floor(Math.random() * 8) + "px";
  note.style.setProperty("--drift", -30 + Math.random() * 60 + "px");
  note.style.animation = `note-rise ${4.5 + Math.random() * 3}s ease-out forwards`;
  els.sceneNotes.append(note);
  note.addEventListener("animationend", () => note.remove(), { once: true });
}

// -------------------------------------------------------------- controls

function loadSample(key) {
  const sample = samples[key];
  els.sourceInput.value = sample.source;
  els.brandFile.textContent = sample.file;
  updateEditor();
  renderLegend();
  resetRun();
  requestAnimationFrame(resizeRoll);
}

function resetRun() {
  runSeq++;
  running = false;
  activeIndex = -1;
  els.runButton.disabled = false;
  els.scene.classList.remove("is-performing");
  resetRoll();
  clearSourceNotes();
  hideError();
  renderPipeline(-1, -1);
  setConsole("Press Run to hear the pipeline.", true);
  clearArtifacts();
}

function updateSoundStatus() {
  els.soundStatus.textContent = els.soundToggle.checked ? "Sound" : "Muted";
}

function bindEvents() {
  els.runButton.addEventListener("click", performRun);
  els.resetButton.addEventListener("click", () => loadSample(els.sampleSelect.value));
  els.sampleSelect.addEventListener("change", () => loadSample(els.sampleSelect.value));

  els.soundToggle.addEventListener("change", () => {
    sound.setEnabled(els.soundToggle.checked);
    updateSoundStatus();
  });

  els.sourceInput.addEventListener("input", updateEditor);
  els.sourceInput.addEventListener("scroll", syncScroll);
  els.sourceInput.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const start = els.sourceInput.selectionStart;
      const end = els.sourceInput.selectionEnd;
      els.sourceInput.setRangeText("    ", start, end, "end");
      updateEditor();
    }
  });

  for (const btn of els.artifactTabs) {
    btn.addEventListener("click", () => showArtifactTab(btn.dataset.artifact));
  }

  window.addEventListener("resize", resizeRoll);
  if (typeof ResizeObserver !== "undefined" && rollWrap) {
    const ro = new ResizeObserver(() => resizeRoll());
    ro.observe(rollWrap);
  }
}

function initWalkIn() {
  const root = document.documentElement;
  if (!root.classList.contains("walk-pending")) return;

  const finish = () => {
    try {
      sessionStorage.setItem("klang-walked-in", "1");
    } catch {
      /* ignore */
    }
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.classList.add("walk-entered");
      finish();
    });
  });
}

function init() {
  for (const [key, sample] of Object.entries(samples)) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = sample.label;
    els.sampleSelect.append(option);
  }
  els.sampleSelect.value = "hello";

  renderLegend();
  bindEvents();
  resizeRoll();
  requestAnimationFrame(drawRoll);
  loadSample("hello");
  updateSoundStatus();
  initWalkIn();

  if (!reduceMotion) {
    for (let i = 0; i < 3; i++) setTimeout(spawnSceneNote, i * 700);
    setInterval(spawnSceneNote, 1400);
  }

  // handy for demos and headless screenshots
  if (location.hash === "#autorun") setTimeout(performRun, 300);
}

init();
