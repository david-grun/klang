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
eq("arithmetic", "print(2 + 3 * 4)", "14");
eq("float division", "print(7 / 2)", "3.5");
eq("floor division", "print(7 // 2)", "3");
eq("power", "print(2 ** 10)", "1024");
eq("bool as number", "print(True + 1)", "2");
eq("string concat", 'print("a" + "b")', "ab");
eq("int conversion", 'print(int("41") + 1)', "42");
eq("float repr", "print(float(7))", "7.0");
eq("comparison", "print(3 < 5)", "True");
eq("not/and/or", "print(not False and True)", "True");
eq("if/elif/else", "x = 2\nif x == 1:\n    print('a')\nelif x == 2:\n    print('b')\nelse:\n    print('c')", "b");
eq("while loop", "i = 0\nwhile i < 3:\n    print(i)\n    i = i + 1", "0\n1\n2");
eq("for range", "for i in range(3):\n    print(i)", "0\n1\n2");
eq("break", "for i in range(9):\n    if i == 2:\n        break\n    print(i)", "0\n1");
eq("continue", "for i in range(4):\n    if i == 1:\n        continue\n    print(i)", "0\n2\n3");
eq("function", "def sq(n):\n    return n * n\nprint(sq(6))", "36");
eq("recursion", "def f(n):\n    if n <= 1:\n        return 1\n    return n * f(n - 1)\nprint(f(5))", "120");
eq("closure", "def mk(n):\n    def add(x):\n        return x + n\n    return add\nprint(mk(5)(10))", "15");
eq("global", "c = 0\ndef bump():\n    global c\n    c = c + 1\nbump()\nbump()\nprint(c)", "2");
eq("local no leak", "c = 1\ndef f():\n    c = 99\n    return c\nprint(f())\nprint(c)", "99\n1");
eq("oop", "class P:\n    def __init__(self, n):\n        self.n = n\n    def get(self):\n        return self.n\nprint(P(7).get())", "7");
eq("encapsulation update", "class C:\n    def __init__(self):\n        self._v = 0\n    def inc(self):\n        self._v = self._v + 1\n    def get(self):\n        return self._v\nc = C()\nc.inc()\nc.inc()\nprint(c.get())", "2");
eq("string iteration", 'for ch in "hi":\n    print(ch)', "h\ni");

// --- programs that must fail, at a specific stage ---
failsAt("lex error", "x = 5 @ 3", "lexer");
failsAt("syntax error", "if x > 5\n    print(1)", "parser");
failsAt("undeclared var", "print(z)", "scope");
failsAt("type mismatch add", 'x = "a" + True', "semantic");
failsAt("bad comparison", "y = 5 < \"ten\"", "semantic");
failsAt("range on string", 'for i in range("3"):\n    print(i)', "semantic");
failsAt("division by zero", "def d(x):\n    return 1 / x\nprint(d(0))", "execute");
failsAt("undefined attribute", "class C:\n    def __init__(self):\n        self.a = 1\nprint(C().b)", "execute");
failsAt("wrong arity", "def f(a, b):\n    return a\nprint(f(1))", "execute");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
