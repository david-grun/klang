#!/usr/bin/env node
// klang.js — command-line runner.
//
//   node klang.js examples/hello.klang         run a program
//   node klang.js --stages examples/hello.klang run and print every stage
//   node klang.js --tokens examples/hello.klang just dump the token stream
//
// Exit code is 0 on a clean run and 1 when any stage reports an error, so this
// doubles as a test harness.

import { readFileSync } from "node:fs";
import { run, STAGES } from "./src/pipeline.js";
import { tokenize } from "./src/lexer.js";
import { tokenCategory } from "./src/token.js";

const args = process.argv.slice(2);
const showStages = args.includes("--stages");
const showTokens = args.includes("--tokens");
const file = args.find((a) => !a.startsWith("--"));

if (!file) {
  console.error("usage: node klang.js [--stages|--tokens] <file.klang>");
  process.exit(2);
}

const source = readFileSync(file, "utf8");

if (showTokens) {
  for (const t of tokenize(source)) {
    if (t.type === "NEWLINE" || t.type === "EOF") continue;
    console.log(`  ${t.type.padEnd(10)} ${JSON.stringify(t.value).padEnd(10)} [${tokenCategory(t.type)}]`);
  }
  process.exit(0);
}

const result = run(source);

if (showStages) {
  console.log("Pipeline:");
  for (const stage of STAGES) {
    const reachedIdx = STAGES.indexOf(result.reachedStage);
    const idx = STAGES.indexOf(stage);
    let mark;
    if (result.failedStage === stage) mark = "x FAIL";
    else if (idx <= reachedIdx && !(result.failedStage && idx > STAGES.indexOf(result.failedStage))) mark = "ok";
    else mark = "-";
    console.log(`  [${mark.padEnd(6)}] ${stage}`);
  }
  console.log("");
}

if (result.ok) {
  const out = result.output.join("\n");
  if (out) console.log(out);
  process.exit(0);
} else {
  for (const e of result.errors) console.error(e.format());
  process.exit(1);
}
