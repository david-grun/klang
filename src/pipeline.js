// pipeline.js
// The end-to-end pipeline: source -> lex -> parse -> resolve -> semantic check
// -> execute. This is the single entry point the web app and the CLI both use.
//
// Two things make it demo-friendly:
//   1. It returns the intermediate product of every stage (tokens, ast, scope,
//      output), so the piano-roll visualizer can render the real token stream
//      (FR8) and each stage panel can show what actually happened.
//   2. It stops at the first stage that produces errors and reports which stage
//      failed. That is exactly the signal the audio layer needs for FR9: the
//      instruments for stages after the failing one never play.
//
// Audio is deliberately NOT wired in here. This layer only produces the data
// and the stage/error signals; dropping Tone.js on top later requires no
// change to the compiler itself.

import { tokenize } from "./lexer.js";
import { parse } from "./parser.js";
import { resolve } from "./resolver.js";
import { check } from "./semantic.js";
import { Interpreter } from "./interpreter.js";
import { KlangError } from "./errors.js";

export const STAGES = ["lexer", "parser", "scope", "semantic", "execute"];

export function run(source, { emit = null } = {}) {
  const result = {
    ok: false,
    failedStage: null,
    error: null, // a single KlangError, or the first of many
    errors: [], // all errors from the failing stage
    tokens: null,
    ast: null,
    scope: null,
    output: [],
    reachedStage: null,
  };

  // ---- Stage 1: Lexer ----
  try {
    result.tokens = tokenize(source);
    result.reachedStage = "lexer";
  } catch (e) {
    return fail(result, "lexer", e);
  }

  // ---- Stage 2: Parser ----
  try {
    result.ast = parse(result.tokens);
    result.reachedStage = "parser";
  } catch (e) {
    return fail(result, "parser", e);
  }

  // ---- Stage 3: Scope / binding ----
  const { errors: scopeErrors, moduleScope } = resolve(result.ast);
  result.scope = moduleScope;
  if (scopeErrors.length) return failMany(result, "scope", scopeErrors);
  result.reachedStage = "scope";

  // ---- Stage 4: Semantic / type checks ----
  const { errors: semErrors } = check(result.ast, moduleScope);
  if (semErrors.length) return failMany(result, "semantic", semErrors);
  result.reachedStage = "semantic";

  // ---- Stage 5: Execute ----
  try {
    const interp = new Interpreter({ emit });
    interp.run(result.ast);
    result.output = interp.output;
    result.reachedStage = "execute";
  } catch (e) {
    return fail(result, "execute", e);
  }

  result.ok = true;
  return result;
}

function fail(result, stage, e) {
  if (!(e instanceof KlangError)) throw e; // real bugs still surface
  result.failedStage = stage;
  result.error = e;
  result.errors = [e];
  return result;
}

function failMany(result, stage, errors) {
  result.failedStage = stage;
  result.error = errors[0];
  result.errors = errors;
  return result;
}
