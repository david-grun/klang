import { run, STAGES } from "./src/pipeline.js";
import { KEYWORDS, LITERAL_WORDS } from "./src/token.js";
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
  petals: document.querySelector("#petals"),
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

function visibleTokenCount(result) {
  return (result.tokens || []).filter((t) => !STRUCTURAL.has(t.type)).length;
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
    const pool = ["C4", "D4", "E4", "G4", "A4", "C5", "D5", "E5", "G5"];
    const count = Math.max(4, Math.min(pool.length, visibleTokenCount(result) || 6));
    for (let k = 0; k < count; k++) {
      if (seq !== runSeq) return;
      sound.triangle(pool[k]);
      pushRoll(index);
      await wait(95);
    }
    await wait(120);
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
  hideError();
  setConsole("", false);

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

  running = false;
  els.runButton.disabled = false;
}

// --------------------------------------------------------------- petals

const PETAL_COLORS = ["#ef9fc0", "#f4bcd4", "#e58fb2"];

function spawnPetal() {
  if (reduceMotion || document.hidden) return;
  const petal = document.createElement("div");
  petal.className = "petal";
  petal.style.background = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
  petal.style.left = 40 + Math.random() * 58 + "%";
  petal.style.top = -10 + Math.random() * 16 + "px";
  const size = 6 + Math.floor(Math.random() * 4);
  petal.style.width = size + "px";
  petal.style.height = size + "px";
  petal.style.setProperty("--drift", -30 - Math.random() * 90 + "px");
  petal.style.animation = `petal-fall ${6 + Math.random() * 5}s linear forwards`;
  els.petals.append(petal);
  petal.addEventListener("animationend", () => petal.remove(), { once: true });
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
  resetRoll();
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
    for (let i = 0; i < 4; i++) setTimeout(spawnPetal, i * 600);
    setInterval(spawnPetal, 950);
  }
}

init();
