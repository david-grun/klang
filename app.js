import { run, STAGES } from "./src/pipeline.js";
import { tokenCategory } from "./src/token.js";
import { KlangSound } from "./sound.js";

const samples = {
  hello: {
    label: "Hello",
    source: `def greet(name):
    print("hello " + name)

greet("Klang")
`,
  },
  fizzbuzz: {
    label: "FizzBuzz",
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
    source: `x = "a" + True
`,
  },
  runtimeError: {
    label: "Runtime error",
    source: `def divide(x):
    return 1 / x

print(divide(0))
`,
  },
};

const stageDetails = {
  lexer: { movement: "I. Overture", role: "Lexical" },
  parser: { movement: "II. Allegro", role: "Syntax" },
  scope: { movement: "III. Fugue", role: "Binding" },
  semantic: { movement: "IV. Andante", role: "Types" },
  execute: { movement: "V. Finale", role: "Runtime" },
};

const STRUCTURAL_SOURCE_TOKENS = new Set(["EOF", "NEWLINE", "INDENT", "DEDENT"]);
const PRESENTATION = {
  introMs: 380,
  minMs: 4300,
  maxMs: 8400,
  tokenMs: 95,
  outroMs: 1800,
};

const els = {
  sampleSelect: document.querySelector("#sampleSelect"),
  theaterStage: document.querySelector("#theaterStage"),
  soundToggle: document.querySelector("#soundToggle"),
  soundStatus: document.querySelector("#soundStatus"),
  resetButton: document.querySelector("#resetButton"),
  runButton: document.querySelector("#runButton"),
  sourceInput: document.querySelector("#sourceInput"),
  sourceNoteLayer: document.querySelector("#sourceNoteLayer"),
  sourceMeta: document.querySelector("#sourceMeta"),
  runStatus: document.querySelector("#runStatus"),
  stageStrip: document.querySelector("#stageStrip"),
  outputBox: document.querySelector("#outputBox"),
  errorBox: document.querySelector("#errorBox"),
  tokenCount: document.querySelector("#tokenCount"),
  tokenRoll: document.querySelector("#tokenRoll"),
  inspector: document.querySelector("#inspector"),
  tabs: [...document.querySelectorAll(".tab")],
};

let activeTab = "tokens";
let lastRun = null;
let runSequence = 0;
let measureCanvas = null;
const sound = new KlangSound();

function init() {
  for (const [key, sample] of Object.entries(samples)) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = sample.label;
    els.sampleSelect.append(option);
  }

  els.sourceInput.value = samples.hello.source;
  els.sampleSelect.value = "hello";
  els.soundToggle.checked = true;
  bindEvents();
  runSource({ playSound: false });
}

function bindEvents() {
  els.runButton.addEventListener("click", () => runSource({ playSound: true, animateScore: true }));
  els.resetButton.addEventListener("click", () => {
    els.sourceInput.value = samples[els.sampleSelect.value].source;
    runSource({ playSound: false });
  });
  els.sampleSelect.addEventListener("change", () => {
    els.sourceInput.value = samples[els.sampleSelect.value].source;
    runSource({ playSound: false });
  });
  els.soundToggle.addEventListener("change", () => {
    sound.setEnabled(els.soundToggle.checked);
    els.soundStatus.textContent = els.soundToggle.checked ? "ready" : "muted";
  });
  els.sourceInput.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const start = els.sourceInput.selectionStart;
      const end = els.sourceInput.selectionEnd;
      els.sourceInput.setRangeText("    ", start, end, "end");
    }
  });
  for (const tab of els.tabs) {
    tab.addEventListener("click", () => {
      activeTab = tab.dataset.tab;
      renderInspector();
      renderTabs();
    });
  }
}

async function runSource({ playSound = false, animateScore = false } = {}) {
  const sequence = ++runSequence;
  const events = [];
  const result = run(els.sourceInput.value, {
    emit: (stage, detail) => events.push({ stage, ...detail }),
  });
  lastRun = { result, events };

  renderMeta();
  renderTokenRoll(result.tokens || []);
  renderInspector();

  if (!animateScore) {
    els.theaterStage.classList.remove("is-performing");
    els.runButton.disabled = false;
    clearSourceNotes();
    renderStages(result);
    renderOutput(result);
    return;
  }

  const sourceTokens = sourceVisibleTokens(result.tokens || []);
  const durationMs = presentationDuration(sourceTokens.length);

  els.runButton.disabled = true;
  els.theaterStage.classList.add("is-performing");
  els.runStatus.textContent = "performing";
  els.outputBox.textContent = "";
  els.errorBox.textContent = "";
  renderStages(stagedResult(result, -1));
  clearSourceNotes();

  if (playSound) {
    els.soundStatus.textContent = els.soundToggle.checked ? "playing" : "muted";
    const state = await sound.play(result, events, result.tokens || [], STAGES, { durationMs });
    if (state === "unsupported") els.soundStatus.textContent = "unavailable";
  }

  animateStages(result, durationMs, sequence);
  await animateSourceNotes(sourceTokens, durationMs, sequence);
  await wait(PRESENTATION.outroMs * 0.28);

  if (sequence !== runSequence) return;
  renderStages(result);
  renderOutput(result);
  renderInspector();
  els.theaterStage.classList.remove("is-performing");
  els.soundStatus.textContent = els.soundToggle.checked ? "ready" : "muted";
  els.runButton.disabled = false;
}

function renderMeta() {
  const lines = els.sourceInput.value.split("\n").length;
  els.sourceMeta.textContent = `${lines} lines`;
}

function renderStages(result) {
  els.stageStrip.replaceChildren();
  for (const stage of STAGES) {
    const state = stageState(stage, result);
    const details = stageDetails[stage];
    const node = document.createElement("article");
    node.className = `stage ${state}`;

    const movement = document.createElement("strong");
    movement.textContent = details.movement;

    const role = document.createElement("em");
    role.textContent = details.role;

    const status = document.createElement("span");
    status.textContent = labelForState(state);

    node.append(movement, role, status);
    els.stageStrip.append(node);
  }
}

function stageState(stage, result) {
  if (result.failedStage === stage) return "failed";
  const reached = STAGES.indexOf(result.reachedStage);
  const current = STAGES.indexOf(stage);
  return reached >= current ? "passed" : "pending";
}

function labelForState(state) {
  if (state === "passed") return "passed";
  if (state === "failed") return "failed";
  return "waiting";
}

function renderOutput(result) {
  els.runStatus.textContent = result.ok ? "ok" : `failed: ${result.failedStage}`;
  els.outputBox.textContent = result.output.length ? result.output.join("\n") : "";
  els.errorBox.textContent = result.errors.length ? result.errors.map((error) => error.format()).join("\n") : "";
}

function renderTokenRoll(tokens) {
  const visible = tokens.filter((token) => token.type !== "EOF");
  const lanes = ["keyword", "identifier", "literal", "operator", "structural"];
  els.tokenCount.textContent = `${visible.length} tokens`;
  els.tokenRoll.replaceChildren();

  const rows = new Map();
  for (const lane of lanes) {
    const row = document.createElement("div");
    row.className = "token-lane";
    const label = document.createElement("span");
    label.className = "lane-label";
    label.textContent = lane;
    row.append(label);
    rows.set(lane, row);
    els.tokenRoll.append(row);
  }

  visible.forEach((token, index) => {
    const category = tokenCategory(token.type);
    const row = rows.get(category) || rows.get("structural");
    const pill = document.createElement("span");
    pill.className = `token-pill ${category}`;
    pill.title = `${token.type} on line ${token.line}`;
    pill.textContent = tokenText(token);
    row.append(pill);
  });
}

function sourceVisibleTokens(tokens) {
  return tokens.filter((token) => !STRUCTURAL_SOURCE_TOKENS.has(token.type));
}

function presentationDuration(tokenCount) {
  return Math.min(
    PRESENTATION.maxMs,
    Math.max(PRESENTATION.minMs, tokenCount * PRESENTATION.tokenMs + PRESENTATION.outroMs)
  );
}

function stagedResult(result, stageIndex) {
  const failedIndex = result.failedStage ? STAGES.indexOf(result.failedStage) : Infinity;
  const reachedIndex = Math.min(stageIndex, failedIndex);
  return {
    ...result,
    reachedStage: reachedIndex >= 0 ? STAGES[reachedIndex] : null,
    failedStage: result.failedStage && stageIndex >= failedIndex ? result.failedStage : null,
  };
}

async function animateStages(result, durationMs, sequence) {
  const stopIndex = result.failedStage ? STAGES.indexOf(result.failedStage) : STAGES.length - 1;
  const interval = durationMs / (stopIndex + 2);
  let previousTarget = 0;
  for (let index = 0; index <= stopIndex; index++) {
    const target = PRESENTATION.introMs + interval * (index + 1);
    await wait(target - previousTarget);
    previousTarget = target;
    if (sequence !== runSequence) return;
    renderStages(stagedResult(result, index));
  }
}

async function animateSourceNotes(tokens, durationMs, sequence) {
  if (!tokens.length) return;
  const playableMs = Math.max(1200, durationMs - PRESENTATION.outroMs * 0.35);
  const interval = playableMs / tokens.length;

  await wait(PRESENTATION.introMs);
  for (const [index, token] of tokens.entries()) {
    if (sequence !== runSequence) return;
    popSourceNote(token, index);
    await wait(interval);
  }
}

function popSourceNote(token, index) {
  const pos = tokenPosition(token);
  if (!pos) return;

  const note = document.createElement("span");
  note.className = `source-note ${tokenCategory(token.type)}`;
  note.style.left = `${pos.x}px`;
  note.style.top = `${pos.y}px`;
  note.style.animationDelay = `${index % 4 === 0 ? 20 : 0}ms`;

  const head = document.createElement("span");
  head.className = "source-note-head";
  note.append(head);
  els.sourceNoteLayer.append(note);

  note.addEventListener("animationend", () => note.remove(), { once: true });
}

function tokenPosition(token) {
  const textarea = els.sourceInput;
  const style = getComputedStyle(textarea);
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5;
  const paddingLeft = parseFloat(style.paddingLeft) || 0;
  const paddingTop = parseFloat(style.paddingTop) || 0;
  const charWidth = measureCharWidth(style);
  const x = paddingLeft + (token.col - 1) * charWidth - textarea.scrollLeft;
  const y = paddingTop + (token.line - 1) * lineHeight - textarea.scrollTop - 24;

  if (y < -32 || y > textarea.clientHeight + 16) return null;
  if (x < -20 || x > textarea.clientWidth + 20) return null;
  return { x, y };
}

function measureCharWidth(style) {
  if (!measureCanvas) measureCanvas = document.createElement("canvas");
  const context = measureCanvas.getContext("2d");
  context.font = `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  return context.measureText("0").width;
}

function clearSourceNotes() {
  els.sourceNoteLayer.replaceChildren();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tokenText(token) {
  if (token.type === "NEWLINE") return "NL";
  if (token.type === "INDENT") return "INDENT";
  if (token.type === "DEDENT") return "DEDENT";
  if (token.value === null) return "None";
  return String(token.value);
}

function renderTabs() {
  for (const tab of els.tabs) tab.classList.toggle("is-active", tab.dataset.tab === activeTab);
}

function renderInspector() {
  renderTabs();
  if (!lastRun) {
    els.inspector.textContent = "";
    return;
  }

  const { result, events } = lastRun;
  if (activeTab === "tokens") {
    els.inspector.textContent = formatTokens(result.tokens || []);
  } else if (activeTab === "ast") {
    els.inspector.textContent = result.ast ? JSON.stringify(result.ast, null, 2) : "No AST";
  } else if (activeTab === "scope") {
    els.inspector.textContent = result.scope ? JSON.stringify(scopeView(result.scope), null, 2) : "No scope";
  } else {
    els.inspector.textContent = events.length ? JSON.stringify(events, null, 2) : "No events";
  }
}

function formatTokens(tokens) {
  return tokens
    .filter((token) => token.type !== "EOF")
    .map((token) => {
      const value = token.value === "\n" ? "\\n" : tokenText(token);
      return `${String(token.line).padStart(2, " ")}:${String(token.col).padStart(2, " ")}  ${token.type.padEnd(10)}  ${value}`;
    })
    .join("\n");
}

function scopeView(scope) {
  return {
    kind: scope.kind,
    names: [...scope.names].sort(),
    globals: [...scope.globals].sort(),
  };
}

init();
