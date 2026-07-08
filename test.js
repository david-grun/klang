// test.js — a small self-contained test suite over the pipeline.
// Run with: node test.js   (or npm test)

import { run } from "./src/pipeline.js";

let passed = 0;
let failed = 0;

function eq(name, source, expectedOutput) {
  const r = run(source);
  const got = r.output.join("\n");
  if (r.ok && got === expectedOutput) {
    passed++;
  } else {
    failed++;
    console.log(`FAIL ${name}`);
    console.log(`  expected: ${JSON.stringify(expectedOutput)}`);
    console.log(`  got:      ${JSON.stringify(got)}  (stage ${r.reachedStage}${r.failedStage ? ", failed " + r.failedStage : ""})`);
    if (r.error) console.log(`  error:    ${r.error.format()}`);
  }
}

function failsAt(name, source, stage) {
  const r = run(source);
  if (!r.ok && r.failedStage === stage) {
    passed++;
  } else {
    failed++;
    console.log(`FAIL ${name}: expected failure at ${stage}, got ${r.ok ? "success" : r.failedStage}`);
  }
}

// --- clean programs ---
eq("arithmetic", "play(2 + 3 * 4)", "14");
eq("float division", "play(7 / 2)", "3.5");
eq("floor division", "play(7 // 2)", "3");
eq("power", "play(2 ** 10)", "1024");
eq("bool as number", "play(True + 1)", "2");
eq("string concat", 'play("a" + "b")', "ab");
eq("int conversion", 'play(int("41") + 1)', "42");
eq("float repr", "play(float(7))", "7.0");
eq("comparison", "play(3 < 5)", "True");
eq("not/and/or", "play(not False and True)", "True");
eq("when/orwhen/otherwise", "x = 2\nwhen x == 1:\n    play('a')\norwhen x == 2:\n    play('b')\notherwise:\n    play('c')", "b");
eq("sustain loop", "i = 0\nsustain i < 3:\n    play(i)\n    i = i + 1", "0\n1\n2");
eq("loop over scale", "loop i in scale(3):\n    play(i)", "0\n1\n2");
eq("stop", "loop i in scale(9):\n    when i == 2:\n        stop\n    play(i)", "0\n1");
eq("skip", "loop i in scale(4):\n    when i == 1:\n        skip\n    play(i)", "0\n2\n3");
eq("motif", "motif sq(n):\n    resolve n * n\nplay(sq(6))", "36");
eq("recursion", "motif f(n):\n    when n <= 1:\n        resolve 1\n    resolve n * f(n - 1)\nplay(f(5))", "120");
eq("closure", "motif mk(n):\n    motif add(x):\n        resolve x + n\n    resolve add\nplay(mk(5)(10))", "15");
eq("tutti", "c = 0\nmotif bump():\n    tutti c\n    c = c + 1\nbump()\nbump()\nplay(c)", "2");
eq("local no leak", "c = 1\nmotif f():\n    c = 99\n    resolve c\nplay(f())\nplay(c)", "99\n1");
eq("oop", "ensemble P:\n    motif tune(self, n):\n        self.n = n\n    motif get(self):\n        resolve self.n\nplay(P(7).get())", "7");
eq("encapsulation update", "ensemble C:\n    motif tune(self):\n        self._v = 0\n    motif inc(self):\n        self._v = self._v + 1\n    motif get(self):\n        resolve self._v\nc = C()\nc.inc()\nc.inc()\nplay(c.get())", "2");
eq("string iteration", 'loop ch in "hi":\n    play(ch)', "h\ni");

// --- programs that must fail, at a specific stage ---
failsAt("lex error", "x = 5 @ 3", "lexer");
failsAt("syntax error", "when x > 5\n    play(1)", "parser");
failsAt("undeclared var", "play(z)", "scope");
failsAt("type mismatch add", 'x = "a" + True', "semantic");
failsAt("bad comparison", "y = 5 < \"ten\"", "semantic");
failsAt("scale on string", 'loop i in scale("3"):\n    play(i)', "semantic");
failsAt("division by zero", "motif d(x):\n    resolve 1 / x\nplay(d(0))", "execute");
failsAt("undefined attribute", "ensemble C:\n    motif tune(self):\n        self.a = 1\nplay(C().b)", "execute");
failsAt("wrong arity", "motif f(a, b):\n    resolve a\nplay(f(1))", "execute");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
