# Klang

A small programming language with a music-themed syntax (a function is a
`motif`, a class is an `ensemble`, output is `play`) whose entire compiler
pipeline is built to be visible and audible. This repository contains the
language core: lexer, parser, scope resolver, semantic checker, and interpreter,
all running end to end with no dependencies. The website is a hybrid: an
opera-house landing at `/` (React + Vite in `landing/`), and a matching dark
stage at `/play` where an orchestra performs the pipeline — a highlight sweeps through
the source token by token, one instrument joins per stage, and an error stops
the orchestra out of tune.

## Run it

Requires Node 18+ (developed on Node 22). The language core needs no packages.
The landing page uses Vite + React; `npm run build` installs those for you.

```bash
node klang.js examples/hello.klang            # run a program
node klang.js --stages examples/errors/undeclared.klang   # show each stage's status
node klang.js --tokens examples/hello.klang   # dump the token stream
node test.js                                  # run the test suite (32 checks)
npm run dev                                   # landing at / , demo at /play
npm run build                                 # hybrid static site → dist/
```

## What each phase maps to

The course spec is graded phase by phase, so the code is organized the same way.

| Phase | Spec topic | File |
|---|---|---|
| 1 | Language design | `docs/LANGUAGE_DESIGN.md` |
| 2 | Lexical analysis | `src/lexer.js`, `src/token.js` |
| 3 | Syntax analysis (parser + grammar) | `src/parser.js` |
| 4 | Names, scope, binding | `src/resolver.js` (static), `src/environment.js` (runtime) |
| 5 | Semantic analysis (type checking) | `src/semantic.js` |
| 6 | Control flow | `src/interpreter.js` |
| 7 | Data types and conversions | `src/values.js`, `src/interpreter.js` |
| 8 | Object orientation | `src/interpreter.js` |
| — | End-to-end pipeline | `src/pipeline.js` |
| — | Errors (one per stage) | `src/errors.js` |

The draft written Q&A answers are in `docs/LANGUAGE_DESIGN.md`, section 8.

## The pipeline

`src/pipeline.js` runs the stages in order and returns the intermediate product
of each one:

```
source ─▶ lexer ─▶ tokens ─▶ parser ─▶ AST ─▶ resolver ─▶ scope
                                                 │
                                                 ▼
                                        semantic checker ─▶ (type-checked)
                                                 │
                                                 ▼
                                           interpreter ─▶ output
```

It stops at the first stage that reports an error and records which stage that
was. Two design choices make the audio/visual layer a thin add-on rather than a
rewrite:

- Every stage's output is returned (`tokens`, `ast`, `scope`, `output`), so the
  piano-roll can render the real token stream and each stage panel can show what
  actually happened.
- `run(source, { emit })` accepts an optional event callback. The interpreter
  calls it on executed statements. The website uses that hook for execution
  pulses, while a failing stage stops the later stage notes from playing.

## Examples

`examples/` holds clean programs that exercise all eight phases
(`hello`, `types`, `functions`, `oop`, `fizzbuzz`, `canon`, `ode`). The
`canon` and `ode` samples are long concert-themed programs; on the `/play`
site they drive orchestral arrangements of Pachelbel’s Canon and Beethoven’s
Ode to Joy as the pipeline runs.
`examples/errors/` holds one
program per failing stage (lexer, parser, scope, semantic, runtime) so the
graceful-failure behavior is easy to demo.

## Language at a glance

```klang
ensemble Counter:
    motif tune(self, start):
        self._n = start          # _prefix is "private by convention"

    motif bump(self):
        self._n = self._n + 1

    motif value(self):
        resolve self._n

c = Counter(10)
loop i in scale(3):
    c.bump()

when c.value() > 10:
    play("counted up to:")
    play(c.value())
```

Klang's keywords are performance directions: `motif` (function), `ensemble`
(class), `tune` (constructor), `play` (print), `when`/`orwhen`/`otherwise`
(if/elif/else), `sustain` (while), `loop … in scale(...)` (for), `resolve`
(return), `stop`/`skip` (break/continue), `tutti` (global), `rest` (None). Full
syntax and type rules are in `docs/LANGUAGE_DESIGN.md`.
