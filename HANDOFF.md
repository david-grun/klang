# Klang Handoff

Read this first when resuming the project.

## Current state

Klang is a small Python-like language core written in dependency-free
JavaScript ES modules. The core compiler/interpreter pipeline is present:
lexer, parser, resolver, semantic checker, and interpreter. The code is in the
intended `src/` layout, with language design notes in `docs/`.

The showcase uses a pixel-art theater theme in a dark plum palette (deep
purple hall, red curtains with gold tiebacks): the stage has arched windows
and candelabras on the back wall, spotlight beams, and a little classical
orchestra in powdered wigs and tailcoats (violinist, cellist, conductor with
baton, hornist) that plays harder while a program runs. Music
notes drift up from the pit; during the lexer stage a note also pops above
each token in the editor. The audio concept is "one instrument per pipeline
stage": each stage joins in as it activates so a clean run builds up like a
short symphony, and an error cuts the remaining instruments off. The
instrument map (all pure Web Audio, no Tone.js / CDN):

- lexer -> triangle synth
- parser -> plucked string (Karplus-Strong)
- scope -> soft pad
- semantic -> bell / FM
- execute -> percussive membrane (one hit per output line)

The web layer lives in `index.html` (scene + workbench markup), `about.html`
(how Klang works, how to use it, and the honest "is it a new language"
answer), `styles.css`
(palette + scene animations), `sound.js` (the five instruments), and `app.js`
(editor highlighting, the Symphony canvas roll, the pipeline sidebar, and the
run orchestration that drives visuals and audio together off the real
`pipeline.run` result). It is intentionally static and deployable: no package
install is required, and `npm run build` copies the browser showcase into
`dist/`.

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

1. Optionally re-expose the raw stage artifacts (tokens / AST / scope) in a
   collapsible "details" panel; the old inspector tabs were dropped in the
   pixel-art redesign to match the focused mockup.
2. Use the interpreter `emit` events (already collected in `app.js`) to drive
   finer-grained execute-stage audio, e.g. one membrane hit per real print
   rather than per output line.
3. Add a share/deploy step for `dist/` (static host) and a screenshot/preview
   in the README.

## Caveats

The type checker is gradual, not fully static. It catches definite type errors
before execution and lets runtime checks handle cases that cannot be inferred
statically, especially function returns and attribute reads.
