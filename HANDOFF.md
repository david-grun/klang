# Klang Handoff

Read this first when resuming the project.

## Current state

Klang is a small language with a music-themed syntax (functions are `motif`s,
classes are `ensemble`s, output is `play`, loops are `sustain`/`loop … in
scale(...)`, conditionals are `when`/`orwhen`/`otherwise`), written in
dependency-free JavaScript ES modules. The core compiler/interpreter pipeline
is present: lexer, parser, resolver, semantic checker, and interpreter. The
surface keywords live in `src/token.js`, which maps each to a canonical
internal keyword so the rest of the compiler is unchanged. The code is in the
intended `src/` layout, with language design notes in `docs/`.

The site is a **hybrid**:

- `/` — cinematic opera-house landing (React + Vite + Framer Motion in
  `landing/`). Dark velvet, gold proscenium, Cormorant Garamond wordmark,
  short pitch, one CTA to the demo. Curtains part on load (staggered, faster
  on open); spotlight trails the pointer on fine pointers and idles with a
  gentle drift; coarse pointers keep ambient stage light only.
- `/play` — the opera-house workbench (`play.html` + `styles.css` +
  `app.js` + `sound.js`). Same velvet / gold / Cormorant mood as the landing,
  with the four orchestra sprites on a dark stage. Workbench panels: Score
  (IDE), Symphony, Playbill (console), plus a Pipeline strip, Instruments,
  and a collapsible Details panel (Tokens / AST / Scope). First visit in a
  session walks onto the stage (curtains part); later visits skip it
  (`sessionStorage`). Lexer tracker + Web Audio instruments per pipeline
  stage. Default execute-stage membrane hits follow interpreter `print`
  emit events (one hit per `play`, soft-capped).
- `/about` — program notes (React page in `landing/`, built to `dist/about.html`).

Instrument map (all pure Web Audio, no Tone.js / CDN):

- lexer -> triangle synth
- parser -> plucked string (Karplus-Strong)
- scope -> soft pad
- semantic -> bell / FM
- execute -> percussive membrane (one hit per `play` / print emit)

The **Canon (Pachelbel)** and **Ode to Joy (Beethoven)** samples override those
with orchestral arrangements: voices join as each pipeline stage passes
(violin theme, cello bass, continuo pad, viola inner voice, bass cadence).

`npm run build` builds the React landing into `dist/`, then copies the vanilla
demo assets alongside it. The language runtime and demo remain dependency-free;
only `landing/` has npm packages.

## Layout

```text
klang/
  klang.js
  test.js
  package.json
  README.md
  HANDOFF.md
  play.html          # vanilla workbench
  styles.css
  app.js
  sound.js
  build-site.js
  vercel.json
  landing/           # React opera landing + about page (Vite MPA)
    about.html
    index.html
    src/
      about-main.tsx
      pages/AboutPage.tsx
      components/
      styles/
  src/               # compiler
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
    …
```

## Run commands

```bash
node test.js
node klang.js examples/hello.klang
node klang.js --stages examples/errors/undeclared.klang
node klang.js --tokens examples/hello.klang
npm run dev          # Vite: landing at / , demo at /play
npm run build        # hybrid static site → dist/
```

Expected test result: `32 passed, 0 failed`.

`npm run dev` serves the React landing and proxies/serves the vanilla demo
from the repo root. `npm run build` writes `dist/` for static hosting (Vercel).

## Next useful steps

None blocking. Optional later polish: nested function scopes in the Details
panel (resolver currently returns module scope only), or richer execute-stage
visuals driven by assign/setattr emit events.

## Caveats

The type checker is gradual, not fully static. It catches definite type errors
before execution and lets runtime checks handle cases that cannot be inferred
statically, especially function returns and attribute reads.

Dev note: repo-root `/src/*.js` is the compiler. The Vite app lives under
`landing/src/`. The Vite middleware serves root `src/*.js` for the demo so the
paths do not collide with the landing bundle.
