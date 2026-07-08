// semantic.js
// PHASE 5 — Semantic Analysis (with the type rules of PHASE 7).
//
// A gradual type checker. Klang is dynamically typed at runtime, but a lot of
// mistakes are decidable statically: adding a string to a bool, subtracting
// strings, comparing a number with text, calling range on a string. This pass
// infers a type for every expression where it can, propagates it through the
// program, and raises a SemanticError the moment two types are definitely
// incompatible (FR4: "a" + True is caught with a specific message). Where a
// type genuinely cannot be known ahead of time (a function's return value, an
// attribute read) the checker records `any` and defers to the runtime checks
// in the interpreter, so it never reports a false positive.
//
// Type names used here: int, float, bool, string, none, instance, any.
// For arithmetic, {int, float, bool} form the "numeric" family (bool counts as
// a number, as in Python), while strings are numeric-incompatible.

import { SemanticError } from "./errors.js";

const NUMERIC = new Set(["int", "float", "bool"]);
const isNum = (t) => NUMERIC.has(t);
const isKnown = (t) => t !== "any";

// Result type of numeric op: float wins over int/bool; bool/int give int.
function numericResult(a, b) {
  if (a === "float" || b === "float") return "float";
  return "int";
}

export function check(program, moduleScope) {
  const errors = [];

  // Class names declared at module level -> a call to one yields an instance.
  const classNames = new Set();
  for (const node of program.body) {
    if (node.type === "ClassDef") classNames.add(node.name);
  }

  // A chain of Maps: name -> inferred type. Only for our own inference; the
  // resolver has already guaranteed every name is bound somewhere.
  class TypeScope {
    constructor(parent) {
      this.parent = parent;
      this.vars = new Map();
    }
    set(name, type) {
      this.vars.set(name, type);
    }
    get(name) {
      let s = this;
      while (s) {
        if (s.vars.has(name)) return s.vars.get(name);
        s = s.parent;
      }
      return classNames.has(name) ? "class" : "any";
    }
  }

  function err(msg, line) {
    errors.push(new SemanticError(msg, line));
  }

  function inferCall(node, scope) {
    const callee = node.callee;
    // builtin type conversions and helpers
    if (callee.type === "Identifier") {
      const name = callee.name;
      const argTypes = node.args.map((a) => inferExpr(a, scope));
      switch (name) {
        case "int":
          return "int";
        case "float":
          return "float";
        case "str":
          return "string";
        case "bool":
          return "bool";
        case "length":
          if (node.args.length === 1 && isKnown(argTypes[0]) && argTypes[0] !== "string") {
            err(`length() expects a string, got ${argTypes[0]}`, node.line);
          }
          return "int";
        case "scale":
          for (const t of argTypes) {
            if (isKnown(t) && !isNum(t)) {
              err(`scale() expects integer arguments, got ${t}`, node.line);
            }
          }
          return "range";
        case "print":
          return "none";
        default:
          if (classNames.has(name)) return "instance";
          return "any"; // user function: return type not inferred
      }
    }
    // method call obj.method(...) or anything else
    for (const a of node.args) inferExpr(a, scope);
    inferExpr(node.callee, scope);
    return "any";
  }

  function inferExpr(node, scope) {
    switch (node.type) {
      case "Literal":
        return node.litType === "none" ? "none" : node.litType;
      case "Identifier":
        return scope.get(node.name);
      case "Call":
        return inferCall(node, scope);
      case "Attribute":
        inferExpr(node.object, scope);
        return "any";
      case "Unary": {
        const t = inferExpr(node.operand, scope);
        if (node.op === "not") return "bool";
        // unary + / -
        if (isKnown(t) && !isNum(t)) {
          err(`unary '${node.op}' needs a number, got ${t}`, node.line);
          return "any";
        }
        return t === "bool" ? "int" : t;
      }
      case "Logical":
        inferExpr(node.left, scope);
        inferExpr(node.right, scope);
        return "any"; // and/or return one of their operands
      case "Binary":
        return inferBinary(node, scope);
      default:
        return "any";
    }
  }

  function inferBinary(node, scope) {
    const lt = inferExpr(node.left, scope);
    const rt = inferExpr(node.right, scope);
    const op = node.op;

    // equality works on anything and always yields a bool
    if (op === "==" || op === "!=") return "bool";

    // ordered comparison
    if (op === "<" || op === "<=" || op === ">" || op === ">=") {
      if (isKnown(lt) && isKnown(rt)) {
        const ok = (isNum(lt) && isNum(rt)) || (lt === "string" && rt === "string");
        if (!ok) err(`cannot compare ${lt} with ${rt} using '${op}'`, node.line);
      }
      return "bool";
    }

    // '+' is overloaded: numbers add, strings concatenate, nothing else
    if (op === "+") {
      if (isKnown(lt) && isKnown(rt)) {
        if (isNum(lt) && isNum(rt)) return numericResult(lt, rt);
        if (lt === "string" && rt === "string") return "string";
        err(`unsupported operand types for '+': ${lt} and ${rt}`, node.line);
        return "any";
      }
      return "any";
    }

    // remaining arithmetic is numbers only
    if (isKnown(lt) && isKnown(rt)) {
      if (!isNum(lt) || !isNum(rt)) {
        err(`unsupported operand types for '${op}': ${lt} and ${rt}`, node.line);
        return "any";
      }
      if (op === "/") return "float";
      if (op === "**") return numericResult(lt, rt);
      return numericResult(lt, rt);
    }
    return "any";
  }

  function checkBody(body, scope) {
    for (const node of body) checkStmt(node, scope);
  }

  function checkStmt(node, scope) {
    switch (node.type) {
      case "Assign": {
        const t = inferExpr(node.value, scope);
        if (node.target.type === "Identifier") {
          scope.set(node.target.name, t);
        } else {
          inferExpr(node.target.object, scope); // self.x = ...
        }
        break;
      }
      case "ExprStmt":
        inferExpr(node.expr, scope);
        break;
      case "Return":
        if (node.value) inferExpr(node.value, scope);
        break;
      case "If":
        inferExpr(node.test, scope);
        checkBody(node.consequent, scope);
        for (const e of node.elifs) {
          inferExpr(e.test, scope);
          checkBody(e.body, scope);
        }
        if (node.alternate) checkBody(node.alternate, scope);
        break;
      case "While":
        inferExpr(node.test, scope);
        checkBody(node.body, scope);
        break;
      case "For": {
        const it = inferExpr(node.iter, scope);
        // range(...) yields ints; anything else, leave the loop var as any
        scope.set(node.varName, it === "range" ? "int" : "any");
        checkBody(node.body, scope);
        break;
      }
      case "FuncDef":
        checkFunction(node, scope);
        break;
      case "ClassDef":
        for (const m of node.methods) checkFunction(m, scope);
        break;
      case "Global":
      case "Break":
      case "Continue":
        break;
    }
  }

  function checkFunction(fn, parentScope) {
    const scope = new TypeScope(parentScope);
    for (const p of fn.params) scope.set(p, "any");
    checkBody(fn.body, scope);
  }

  const root = new TypeScope(null);
  checkBody(program.body, root);
  return { errors };
}
