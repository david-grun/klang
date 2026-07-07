import { run, STAGES } from "./src/pipeline.js";
import { KEYWORDS, LITERAL_WORDS, tokenCategory } from "./src/token.js";
import { KlangSound } from "./sound.js";

// ---------------------------------------------------------------- samples

const samples = {
  hello: {
    label: "Hello",
    file: "hello.klang",
    source: `def greet(name):
    print("hello " + name)

greet("Klang")
`,
  },
  fizzbuzz: {
    label: "FizzBuzz",
    file: "fizzbuzz.klang",
    source: `for i in range(1, 16):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)
`,
  },
  oop: {
    label: "Counter class",
    file: "counter.klang",
    source: `class Counter:
    def __init__(self, start):
        self._n = start

    def bump(self):
        self._n = self._n + 1

    def value(self):
        return self._n

c = Counter(10)
for i in range(3):
    c.bump()

print(c.value())
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
    source: `def divide(x):
    return 1 / x

print(divide(0))
`,
  },
};

// one instrument (and one hue) per pipeline stage
const STAGE_META = {
  lexer: { label: "Lexer", instrument: "triangle synth", color: "#ec897b" },
  parser: { label: "Parser", instrument: "plucked string", color: "#e58fb2" },
  scope: { label: "Scope", instrument: "soft pad", color: "#6fb0a4" },
  semantic: { label: "Semantic", instrument: "bell · FM", color: "#8a8ed0" },
  execute: { label: "Execute", instrument: "membrane drum", color: "#5f5473" },
};
const STAGE_COLORS = STAGES.map((key) => STAGE_META[key].color);

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
};

const sound = new KlangSound();
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let runSeq = 0;
let running = false;
let activeIndex = -1;

// -------------------------------------------------------------- editor

const LITERAL_WORD_SET = new Set(Object.keys(LITERAL_WORDS));
const TOKEN_RE =
  /(#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\d+\.?\d*)|([A-Za-z_]\w*)|([+\-*/%=<>!.]+|[()[\]:,])/g;

function escapeHtml(text) {
  return text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

function highlightCode(src) {
  let out = "";
  let last = 0;
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(src))) {
    if (m.index > last) out += escapeHtml(src.slice(last, m.index));
    const [, comment, string, number, word, op] = m;
    if (comment !== undefined) {
      out += `<span class="tok-comment">${escapeHtml(comment)}</span>`;
    } else if (string !== undefined) {
      out += `<span class="tok-string">${escapeHtml(string)}</span>`;
    } else if (number !== undefined) {
      out += `<span class="tok-number">${escapeHtml(number)}</span>`;
    } else if (word !== undefined) {
      let cls = "tok-identifier";
      if (LITERAL_WORD_SET.has(word)) cls = "tok-literal";
      else if (KEYWORDS.has(word)) cls = "tok-keyword";
      out += `<span class="${cls}">${escapeHtml(word)}</span>`;
    } else if (op !== undefined) {
      out += `<span class="tok-operator">${escapeHtml(op)}</span>`;
    }
    last = TOKEN_RE.lastIndex;
  }
  if (last < src.length) out += escapeHtml(src.slice(last));
  return out;
}

function updateEditor() {
  const src = els.sourceInput.value;
  els.codeHighlight.innerHTML = highlightCode(src) + "\n";
  const lines = src.split("\n").length;
  let gutter = "";
  for (let i = 1; i <= lines; i++) gutter += (i > 1 ? "\n" : "") + i;
  els.gutter.textContent = gutter;
  syncScroll();
}

function syncScroll() {
  els.codeHighlight.scrollTop = els.sourceInput.scrollTop;
  els.codeHighlight.scrollLeft = els.sourceInput.scrollLeft;
  els.gutter.scrollTop = els.sourceInput.scrollTop;
}

// ----------------------------------------------------- token note pops

const CATEGORY_COLOR = {
  keyword: "#8a7ed0",
  identifier: "#4a9c89",
  operator: "#d5734f",
  literal: "#d1608c",
  structural: "#a49cb2",
};
const NOTE_GLYPHS = ["♪", "♫", "♩", "♬"];
let measureCanvas = null;

function measureCharWidth(style) {
  if (!measureCanvas) measureCanvas = document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d");
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  return ctx.measureText("0").width;
}

function tokenPosition(token) {
  const ta = els.sourceInput;
  const style = getComputedStyle(ta);
  const fontSize = parseFloat(style.fontSize) || 13;
  let lineHeight = parseFloat(style.lineHeight);
  // some browsers report the unitless multiplier (e.g. 1.7) instead of px
  if (!lineHeight || lineHeight < fontSize) lineHeight = fontSize * 1.7;
  const padLeft = parseFloat(style.paddingLeft) || 0;
  const padTop = parseFloat(style.paddingTop) || 0;
  const charWidth = measureCharWidth(style);
  const x = padLeft + (token.col - 1) * charWidth - ta.scrollLeft;
  const y = padTop + (token.line - 1) * lineHeight - ta.scrollTop;
  if (y < -4 || y > ta.clientHeight - 6) return null;
  if (x < -8 || x > ta.clientWidth + 8) return null;
  return { x, y };
}

function popSourceNote(token) {
  const pos = tokenPosition(token);
  if (!pos) return;
  const note = document.createElement("span");
  note.className = "source-note";
  note.textContent = NOTE_GLYPHS[Math.floor(Math.random() * NOTE_GLYPHS.length)];
  note.style.left = `${pos.x}px`;
  note.style.top = `${pos.y - 6}px`;
  note.style.color = CATEGORY_COLOR[tokenCategory(token.type)] || "var(--text-secondary)";
  els.sourceNotes.append(note);
  note.addEventListener("animationend", () => note.remove(), { once: true });
}

function clearSourceNotes() {
  els.sourceNotes.replaceChildren();
}

// -------------------------------------------------------- pipeline list

function renderPipeline(active, failedIndex) {
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
      icon.style.color = STAGE_META[key].color;
    } else {
      icon.textContent = "·";
    }

    const dot = document.createElement("span");
    dot.className = "pipe-dot";
    dot.style.background = STAGE_META[key].color;

    const label = document.createElement("span");
    label.className = "pipe-label";
    label.textContent = STAGE_META[key].label;

    row.append(icon, dot, label);
    els.pipelineList.append(row);
  });
}

function renderLegend() {
  els.legendList.replaceChildren();
  for (const key of STAGES) {
    const row = document.createElement("div");
    row.className = "legend-row";
    const dot = document.createElement("span");
    dot.className = "legend-dot";
    dot.style.background = STAGE_META[key].color;
    const label = document.createElement("span");
    label.innerHTML = `${STAGE_META[key].label} <span class="legend-role">— ${STAGE_META[key].instrument}</span>`;
    row.append(dot, label);
    els.legendList.append(row);
  }
}

// -------------------------------------------------------- symphony roll

const rollCtx = els.roll.getContext("2d");
const rollWrap = els.roll.parentElement;
let rollNotes = [];

function resizeRoll() {
  const dpr = window.devicePixelRatio || 1;
  els.roll.width = rollWrap.clientWidth * dpr;
  els.roll.height = rollWrap.clientHeight * dpr;
  rollCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function resetRoll() {
  rollNotes = [];
}

function pushRoll(stageIndex, x) {
  const w = rollWrap.clientWidth;
  const px = x === undefined ? 24 + Math.random() * (w - 48) : x;
  rollNotes.push({ stage: stageIndex, t: 0, x: px });
}

function drawRoll() {
  const w = rollWrap.clientWidth;
  const h = rollWrap.clientHeight;
  rollCtx.clearRect(0, 0, w, h);
  const laneH = h / STAGES.length;

  for (let i = 0; i < STAGES.length; i++) {
    const y = i * laneH;
    if (i % 2 === 0) {
      rollCtx.fillStyle = "rgba(59,52,72,0.03)";
      rollCtx.fillRect(0, y, w, laneH);
    }
    rollCtx.strokeStyle = "rgba(59,52,72,0.07)";
    rollCtx.beginPath();
    rollCtx.moveTo(0, y);
    rollCtx.lineTo(w, y);
    rollCtx.stroke();

    // faint stage tint on the left edge
    rollCtx.fillStyle = STAGE_COLORS[i];
    rollCtx.globalAlpha = 0.5;
    rollCtx.fillRect(0, y, 3, laneH);
    rollCtx.globalAlpha = 1;
  }

  for (let j = rollNotes.length - 1; j >= 0; j--) {
    const n = rollNotes[j];
    n.t += 0.02;
    const laneY = n.stage * laneH + laneH / 2;
    const radius = 9 - n.t * 6;
    if (radius <= 0) {
      rollNotes.splice(j, 1);
      continue;
    }
    rollCtx.fillStyle = STAGE_COLORS[n.stage];
    rollCtx.globalAlpha = Math.max(0, 1 - n.t * 1.5);
    rollCtx.beginPath();
    rollCtx.arc(n.x, laneY, Math.max(radius, 1), 0, Math.PI * 2);
    rollCtx.fill();
    rollCtx.globalAlpha = 1;
  }
  requestAnimationFrame(drawRoll);
}

// --------------------------------------------------------------- console

function setConsole(text, muted) {
  els.consoleOut.textContent = text;
  els.consoleOut.classList.toggle("is-muted", Boolean(muted));
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

// ------------------------------------------------------------------- run

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function playStage(index, result, isFail, seq) {
  const key = STAGES[index];

  if (isFail) {
    pushRoll(index);
    pushRoll(index);
    sound.glitch();
    await wait(520);
    return;
  }

  if (key === "lexer") {
    // the lexer reads the source token by token: pop a note above each one.
    const scale = ["C4", "D4", "E4", "G4", "A4", "C5", "D5", "E5", "G5"];
    const tokens = (result.tokens || []).filter((t) => !STRUCTURAL.has(t.type));
    const n = tokens.length || 1;
    // unhurried: each token gets a beat, capped so long programs still finish
    const spacing = Math.max(110, Math.min(210, 5200 / n));
    for (let k = 0; k < tokens.length; k++) {
      if (seq !== runSeq) return;
      sound.triangle(scale[k % scale.length]);
      pushRoll(index);
      popSourceNote(tokens[k]);
      await wait(spacing);
    }
    await wait(140);
  } else if (key === "parser") {
    for (const note of ["C3", "G3", "C4"]) {
      if (seq !== runSeq) return;
      sound.pluck(note);
      pushRoll(index);
      await wait(150);
    }
    await wait(140);
  } else if (key === "scope") {
    sound.pad(["A2", "E3", "A3", "C4"]);
    for (let k = 0; k < 3; k++) {
      if (seq !== runSeq) return;
      pushRoll(index);
      await wait(90);
    }
    await wait(500);
  } else if (key === "semantic") {
    for (const note of ["G4", "B4"]) {
      if (seq !== runSeq) return;
      sound.bell(note);
      pushRoll(index);
      await wait(230);
    }
    await wait(200);
  } else if (key === "execute") {
    const lines = Math.max(1, Math.min(6, (result.output || []).length || 1));
    const drums = ["C2", "G2", "C2", "E2", "G2", "C2"];
    for (let k = 0; k < lines; k++) {
      if (seq !== runSeq) return;
      sound.membrane(drums[k % drums.length]);
      pushRoll(index);
      await wait(160);
    }
    await wait(160);
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
  els.scene.classList.add("is-performing");

  const failedIndex = result.failedStage ? STAGES.indexOf(result.failedStage) : -1;
  const lastIndex = failedIndex >= 0 ? failedIndex : STAGES.length - 1;

  await sound.resume();
  updateSoundStatus();

  for (let i = 0; i <= lastIndex; i++) {
    if (seq !== runSeq) return;
    activeIndex = i;
    renderPipeline(activeIndex, failedIndex);
    await playStage(i, result, i === failedIndex, seq);
  }

  if (seq !== runSeq) return;
  activeIndex = lastIndex + 1;
  renderPipeline(activeIndex, failedIndex);

  if (failedIndex >= 0) {
    showError(result);
    setConsole(result.output.length ? result.output.join("\n") : "", false);
  } else {
    setConsole(result.output.length ? result.output.join("\n") : "(no output)", false);
    sound.flourish();
  }

  els.scene.classList.remove("is-performing");
  running = false;
  els.runButton.disabled = false;
}

// ---------------------------------------------------- rising stage notes

const SCENE_NOTE_COLORS = ["#8a8ed0", "#6fb0a4", "#e58fb2", "#ec897b", "#a49cb2"];

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
  resetRun();
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

  window.addEventListener("resize", resizeRoll);
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

  if (!reduceMotion) {
    for (let i = 0; i < 3; i++) setTimeout(spawnSceneNote, i * 700);
    setInterval(spawnSceneNote, 1400);
  }

  // handy for demos and headless screenshots
  if (location.hash === "#autorun") setTimeout(performRun, 300);
}

init();
