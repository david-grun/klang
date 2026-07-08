// interpreter.js
// PHASE 6 (control flow) + PHASE 7 (data types and operations) + PHASE 8 (OOP).
//
// A tree-walking interpreter. It executes the AST directly, which is the
// simplest thing that can possibly work and keeps the language easy to reason
// about. Return / break / continue are implemented as internal control-flow
// signals (JS exceptions used only inside the interpreter, never surfaced to
// the user). Every executed statement can notify an optional `emit` callback,
// which is the hook the audio/visual layer (FR9, the "execute" instrument)
// will consume later without any change to this file.

import {
  mkInt, mkFloat, mkBool, mkStr, NONE,
  isNumber, num, typeName, truthy, reprString, valuesEqual,
} from "./values.js";
import { Environment } from "./environment.js";
import { RuntimeErr } from "./errors.js";

// internal control-flow signals
class ReturnSignal { constructor(value) { this.value = value; } }
class BreakSignal {}
class ContinueSignal {}

export class Interpreter {
  constructor({ emit = null } = {}) {
    this.output = [];
    this.emit = emit; // (stage, detail) => void  -- optional, for the visualizer
    this.global = new Environment();
    this.installBuiltins();
  }

  event(detail) {
    if (this.emit) this.emit("execute", detail);
  }

  installBuiltins() {
    const self = this;
    const builtin = (name, fn) => this.global.define(name, { t: "builtin", name, fn });

    builtin("print", (args) => {
      self.output.push(args.map(reprString).join(" "));
      return NONE;
    });
    builtin("length", (args, line) => {
      const a = args[0];
      if (!a || a.t !== "string") throw new RuntimeErr("length() expects a string", line);
      return mkInt(a.v.length);
    });
    builtin("str", (args) => mkStr(reprString(args[0] ?? NONE)));
    builtin("int", (args, line) => {
      const a = args[0];
      if (isNumber(a)) return mkInt(num(a));
      if (a.t === "string") {
        const n = parseInt(a.v, 10);
        if (Number.isNaN(n)) throw new RuntimeErr(`cannot convert '${a.v}' to int`, line);
        return mkInt(n);
      }
      throw new RuntimeErr(`cannot convert ${typeName(a)} to int`, line);
    });
    builtin("float", (args, line) => {
      const a = args[0];
      if (isNumber(a)) return mkFloat(num(a));
      if (a.t === "string") {
        const n = parseFloat(a.v);
        if (Number.isNaN(n)) throw new RuntimeErr(`cannot convert '${a.v}' to float`, line);
        return mkFloat(n);
      }
      throw new RuntimeErr(`cannot convert ${typeName(a)} to float`, line);
    });
    builtin("bool", (args) => mkBool(truthy(args[0] ?? NONE)));
    builtin("scale", (args, line) => {
      const ints = args.map((a) => {
        if (!isNumber(a)) throw new RuntimeErr("scale() expects integer arguments", line);
        return Math.trunc(num(a));
      });
      let start = 0, stop = 0, step = 1;
      if (ints.length === 1) [stop] = ints;
      else if (ints.length === 2) [start, stop] = ints;
      else if (ints.length >= 3) [start, stop, step] = ints;
      if (step === 0) throw new RuntimeErr("scale() step cannot be zero", line);
      const items = [];
      if (step > 0) for (let i = start; i < stop; i += step) items.push(mkInt(i));
      else for (let i = start; i > stop; i += step) items.push(mkInt(i));
      return { t: "range", items };
    });
  }

  run(program) {
    this.execBlock(program.body, this.global);
    return this.output;
  }

  // ---- statements ----

  execBlock(body, env) {
    for (const node of body) this.execStmt(node, env);
  }

  execStmt(node, env) {
    switch (node.type) {
      case "Assign": return this.execAssign(node, env);
      case "ExprStmt": { this.eval(node.expr, env); return; }
      case "If": return this.execIf(node, env);
      case "While": return this.execWhile(node, env);
      case "For": return this.execFor(node, env);
      case "FuncDef": return this.execFuncDef(node, env);
      case "ClassDef": return this.execClassDef(node, env);
      case "Return": throw new ReturnSignal(node.value ? this.eval(node.value, env) : NONE);
      case "Break": throw new BreakSignal();
      case "Continue": throw new ContinueSignal();
      case "Global": return; // handled structurally by assignment target choice
      default:
        throw new RuntimeErr(`cannot execute ${node.type}`, node.line);
    }
  }

  execAssign(node, env) {
    const value = this.eval(node.value, env);
    if (node.target.type === "Identifier") {
      // Assignment defines in the current scope. If the name already exists in
      // an enclosing scope and this is the global scope, we still define here.
      env.define(node.target.name, value);
      this.event({ kind: "assign", name: node.target.name, line: node.line });
    } else {
      // attribute assignment: obj.attr = value
      const obj = this.eval(node.target.object, env);
      if (obj.t !== "instance") {
        throw new RuntimeErr(`cannot set attribute on ${typeName(obj)}`, node.line);
      }
      obj.fields.set(node.target.name, value);
      this.event({ kind: "setattr", name: node.target.name, line: node.line });
    }
  }

  execIf(node, env) {
    if (truthy(this.eval(node.test, env))) {
      this.execBlock(node.consequent, env);
      return;
    }
    for (const e of node.elifs) {
      if (truthy(this.eval(e.test, env))) {
        this.execBlock(e.body, env);
        return;
      }
    }
    if (node.alternate) this.execBlock(node.alternate, env);
  }

  execWhile(node, env) {
    while (truthy(this.eval(node.test, env))) {
      try {
        this.execBlock(node.body, env);
      } catch (sig) {
        if (sig instanceof BreakSignal) break;
        if (sig instanceof ContinueSignal) continue;
        throw sig;
      }
    }
  }

  execFor(node, env) {
    const iter = this.eval(node.iter, env);
    let items;
    if (iter.t === "range") items = iter.items;
    else if (iter.t === "string") items = [...iter.v].map(mkStr);
    else throw new RuntimeErr(`${typeName(iter)} is not iterable`, node.line);

    for (const item of items) {
      env.define(node.varName, item);
      try {
        this.execBlock(node.body, env);
      } catch (sig) {
        if (sig instanceof BreakSignal) break;
        if (sig instanceof ContinueSignal) continue;
        throw sig;
      }
    }
  }

  execFuncDef(node, env) {
    const fn = {
      t: "function",
      name: node.name,
      params: node.params,
      body: node.body,
      globals: collectGlobals(node.body),
      closure: env,
    };
    env.define(node.name, fn);
  }

  execClassDef(node, env) {
    const methods = new Map();
    for (const m of node.methods) {
      methods.set(m.name, {
        t: "function",
        name: m.name,
        params: m.params,
        body: m.body,
        globals: collectGlobals(m.body),
        closure: env,
      });
    }
    env.define(node.name, { t: "class", name: node.name, methods, closure: env });
  }

  // ---- expressions ----

  eval(node, env) {
    switch (node.type) {
      case "Literal":
        switch (node.litType) {
          case "int": return mkInt(node.value);
          case "float": return mkFloat(node.value);
          case "bool": return mkBool(node.value);
          case "string": return mkStr(node.value);
          case "none": return NONE;
        }
        break;
      case "Identifier":
        return env.get(node.name, node.line);
      case "Unary": return this.evalUnary(node, env);
      case "Logical": return this.evalLogical(node, env);
      case "Binary": return this.evalBinary(node, env);
      case "Call": return this.evalCall(node, env);
      case "Attribute": return this.evalAttribute(node, env);
    }
    throw new RuntimeErr(`cannot evaluate ${node.type}`, node.line);
  }

  evalUnary(node, env) {
    const v = this.eval(node.operand, env);
    if (node.op === "not") return mkBool(!truthy(v));
    if (!isNumber(v)) throw new RuntimeErr(`unary '${node.op}' needs a number, got ${typeName(v)}`, node.line);
    const n = num(v);
    const r = node.op === "-" ? -n : n;
    return v.t === "float" ? mkFloat(r) : mkInt(r);
  }

  evalLogical(node, env) {
    const left = this.eval(node.left, env);
    if (node.op === "and") return truthy(left) ? this.eval(node.right, env) : left;
    return truthy(left) ? left : this.eval(node.right, env); // or
  }

  evalBinary(node, env) {
    const a = this.eval(node.left, env);
    const b = this.eval(node.right, env);
    const op = node.op;
    const line = node.line;

    if (op === "==") return mkBool(valuesEqual(a, b));
    if (op === "!=") return mkBool(!valuesEqual(a, b));

    // string concatenation
    if (op === "+" && a.t === "string" && b.t === "string") return mkStr(a.v + b.v);

    // ordered comparison for strings
    if ((op === "<" || op === "<=" || op === ">" || op === ">=") && a.t === "string" && b.t === "string") {
      switch (op) {
        case "<": return mkBool(a.v < b.v);
        case "<=": return mkBool(a.v <= b.v);
        case ">": return mkBool(a.v > b.v);
        case ">=": return mkBool(a.v >= b.v);
      }
    }

    // everything else is numeric
    if (!isNumber(a) || !isNumber(b)) {
      throw new RuntimeErr(`unsupported operand types for '${op}': ${typeName(a)} and ${typeName(b)}`, line);
    }
    const x = num(a), y = num(b);
    const bothInt = a.t !== "float" && b.t !== "float";
    switch (op) {
      case "+": return bothInt ? mkInt(x + y) : mkFloat(x + y);
      case "-": return bothInt ? mkInt(x - y) : mkFloat(x - y);
      case "*": return bothInt ? mkInt(x * y) : mkFloat(x * y);
      case "/":
        if (y === 0) throw new RuntimeErr("division by zero", line);
        return mkFloat(x / y); // '/' is always float, as in Python 3
      case "//":
        if (y === 0) throw new RuntimeErr("division by zero", line);
        return bothInt ? mkInt(Math.floor(x / y)) : mkFloat(Math.floor(x / y));
      case "%":
        if (y === 0) throw new RuntimeErr("modulo by zero", line);
        return bothInt ? mkInt(((x % y) + y) % y) : mkFloat(x - Math.floor(x / y) * y);
      case "**": {
        const r = Math.pow(x, y);
        return bothInt && y >= 0 ? mkInt(r) : mkFloat(r);
      }
      case "<": return mkBool(x < y);
      case "<=": return mkBool(x <= y);
      case ">": return mkBool(x > y);
      case ">=": return mkBool(x >= y);
    }
    throw new RuntimeErr(`unknown operator '${op}'`, line);
  }

  evalCall(node, env) {
    const callee = this.eval(node.callee, env);
    const args = node.args.map((a) => this.eval(a, env));

    if (callee.t === "builtin") {
      return callee.fn(args, node.line) ?? NONE;
    }
    if (callee.t === "function") {
      return this.callFunction(callee, args, node.line);
    }
    if (callee.t === "class") {
      return this.instantiate(callee, args, node.line);
    }
    if (callee.t === "bound-method") {
      return this.callFunction(callee.fn, [callee.self, ...args], node.line);
    }
    throw new RuntimeErr(`${typeName(callee)} is not callable`, node.line);
  }

  callFunction(fn, args, line) {
    if (args.length !== fn.params.length) {
      throw new RuntimeErr(
        `${fn.name}() takes ${fn.params.length} argument(s) but ${args.length} were given`,
        line
      );
    }
    // `global`-declared names route their assignments to the module scope.
    const local = new Environment(fn.closure, this.global, fn.globals);
    fn.params.forEach((p, i) => local.define(p, args[i]));
    try {
      this.execBlock(fn.body, local);
    } catch (sig) {
      if (sig instanceof ReturnSignal) return sig.value;
      throw sig;
    }
    return NONE;
  }

  instantiate(klass, args, line) {
    const instance = { t: "instance", klass, fields: new Map() };
    const init = klass.methods.get("tune"); // `tune` is Klang's constructor
    if (init) this.callFunction(init, [instance, ...args], line);
    else if (args.length > 0) {
      throw new RuntimeErr(`${klass.name}() takes no arguments`, line);
    }
    this.event({ kind: "instantiate", name: klass.name, line });
    return instance;
  }

  evalAttribute(node, env) {
    const obj = this.eval(node.object, env);
    if (obj.t !== "instance") {
      throw new RuntimeErr(`${typeName(obj)} has no attribute '${node.name}'`, node.line);
    }
    if (obj.fields.has(node.name)) return obj.fields.get(node.name);
    const method = obj.klass.methods.get(node.name);
    if (method) return { t: "bound-method", fn: method, self: obj };
    throw new RuntimeErr(`'${obj.klass.name}' object has no attribute '${node.name}'`, node.line);
  }
}

// Collect names declared `global` inside a function body (non-recursive into
// nested functions, matching Python's per-function global declarations).
function collectGlobals(body) {
  const g = new Set();
  for (const node of body) {
    if (node.type === "Global") for (const n of node.names) g.add(n);
    else if (node.type === "If") {
      [node.consequent, ...node.elifs.map((e) => e.body), node.alternate || []].forEach((b) =>
        collectGlobals(b).forEach((n) => g.add(n))
      );
    } else if (node.type === "While" || node.type === "For") {
      collectGlobals(node.body).forEach((n) => g.add(n));
    }
  }
  return g;
}
