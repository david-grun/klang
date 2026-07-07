# Klang Handoff

Read this first when resuming the project.

## Current state

Klang is a small Python-like language core written in dependency-free
JavaScript ES modules. The core compiler/interpreter pipeline is present:
lexer, parser, resolver, semantic checker, and interpreter. The showcase uses a
German-classical score theme: source tokens trigger animated notes above the
editor, while generated piano-like music plays during the slowed presentation
of the compile/interpreter pipeline.
The code is in the intended `src/` layout, with language design notes in
`docs/`.

The current web layer is intentionally static and deployable: no package
install is required, and `npm run build` copies the browser showcase into
`dist/`. Tone.js can still be added later if the project needs richer
instruments, but the current sound layer works through the Web Audio API.

## Layout

```text
klang/
  klang.js
  test.js
  package.json
  README.md
  HANDOFF.md
  src/
    environment.js
    errors.js
    interpreter.js
    lexer.js
    parser.js
    pipeline.js
    resolver.js
    semantic.js
    token.js
    values.js
  docs/
    LANGUAGE_DESIGN.md
  examples/
    hello.klang
    types.klang
    functions.klang
    oop.klang
    fizzbuzz.klang
    errors/
      lexer.klang
      syntax.klang
      undeclared.klang
      typemismatch.klang
      badcompare.klang
      runtime.klang
```

## Run commands

```bash
node test.js
node klang.js examples/hello.klang
node klang.js --stages examples/errors/undeclared.klang
node klang.js --tokens examples/hello.klang
npm run dev
npm run build
```

Expected test result: `32 passed, 0 failed`.

`npm run dev` serves the showcase website locally. `npm run build` writes a
static `dist/` folder that can be deployed later to a static host.

## Next useful steps

1. Initialize git and commit this core baseline.
2. Build a browser shell with a code editor, Run button, output panel, and
   failed-stage display.
3. Render real stage artifacts from `pipeline.js`: tokens first, then AST,
   scope, semantic status, and output.
4. Add Tone.js audio after the visual pipeline works, using the existing
   `emit` callback and stage status data.

## Caveats

The type checker is gradual, not fully static. It catches definite type errors
before execution and lets runtime checks handle cases that cannot be inferred
statically, especially function returns and attribute reads.
