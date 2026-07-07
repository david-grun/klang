// resolver.js
// PHASE 4 — Names, Scope, and Binding.
//
// A static pass that decides, before anything runs, which scope every name
// belongs to and flags any name that is never bound anywhere reachable
// (FR3: referencing an undeclared variable is caught before execution).
//
// Klang follows Python's rules:
//   * Only functions (and the module) introduce a scope. if / while / for do
//     NOT create scopes, so a variable first assigned inside a loop is visible
//     after it.
//   * Assigning to a name inside a function makes that name local to the whole
//     function, unless it is declared `global`.
//   * Name lookup is Local -> Enclosing function -> Global -> Builtin (LEGB).
//   * Class bodies are skipped during free-name lookup: a method resolves its
//     free names against the module, not against sibling methods, exactly as
//     Python does. Instance state is reached through `self`, not by scope.

import { ScopeError } from "./errors.js";

const BUILTINS = new Set(["print", "len", "int", "float", "str", "bool", "range"]);

class Scope {
  constructor(kind, parent) {
    this.kind = kind; // "module" | "function"
    this.parent = parent; // nearest enclosing function/module scope
    this.names = new Set(); // names bound in this scope
    this.globals = new Set(); // names redirected to module scope
  }
  declare(name) {
    this.names.add(name);
  }
  has(name) {
    return this.names.has(name);
  }
}

export function resolve(program) {
  const errors = [];
  const moduleScope = new Scope("module", null);

  // Pass 1 for a scope: hoist every name this scope binds, without descending
  // into nested function/class bodies (they get their own scope).
  function hoist(body, scope) {
    for (const node of body) {
      switch (node.type) {
        case "Assign":
          if (node.target.type === "Identifier" && !scope.globals.has(node.target.name)) {
            scope.declare(node.target.name);
          }
          break;
        case "For":
          scope.declare(node.varName);
          hoist(node.body, scope);
          break;
        case "If":
          hoist(node.consequent, scope);
          for (const e of node.elifs) hoist(e.body, scope);
          if (node.alternate) hoist(node.alternate, scope);
          break;
        case "While":
          hoist(node.body, scope);
          break;
        case "FuncDef":
          scope.declare(node.name);
          break;
        case "ClassDef":
          scope.declare(node.name);
          break;
        case "Global":
          for (const n of node.names) scope.globals.add(n);
          break;
      }
    }
  }

  // Look a name up the LEGB chain.
  function lookup(name, scope) {
    let s = scope;
    while (s) {
      if (s.globals.has(name)) return moduleScope.has(name) || BUILTINS.has(name);
      if (s.has(name)) return true;
      s = s.parent;
    }
    return BUILTINS.has(name);
  }

  function resolveExpr(node, scope) {
    if (!node) return;
    switch (node.type) {
      case "Identifier":
        if (!lookup(node.name, scope)) {
          errors.push(new ScopeError(`undeclared variable '${node.name}'`, node.line));
        }
        break;
      case "Binary":
      case "Logical":
        resolveExpr(node.left, scope);
        resolveExpr(node.right, scope);
        break;
      case "Unary":
        resolveExpr(node.operand, scope);
        break;
      case "Call":
        resolveExpr(node.callee, scope);
        for (const a of node.args) resolveExpr(a, scope);
        break;
      case "Attribute":
        // resolve the object; the attribute name itself is dynamic (looked up
        // on the instance at runtime), so it is not a scope reference.
        resolveExpr(node.object, scope);
        break;
      case "Literal":
        break;
    }
  }

  function resolveBody(body, scope) {
    for (const node of body) resolveStmt(node, scope);
  }

  function resolveStmt(node, scope) {
    switch (node.type) {
      case "Assign":
        resolveExpr(node.value, scope);
        if (node.target.type === "Attribute") {
          resolveExpr(node.target.object, scope);
        }
        // plain Identifier target was already hoisted as a binding
        break;
      case "ExprStmt":
        resolveExpr(node.expr, scope);
        break;
      case "Return":
        resolveExpr(node.value, scope);
        break;
      case "If":
        resolveExpr(node.test, scope);
        resolveBody(node.consequent, scope);
        for (const e of node.elifs) {
          resolveExpr(e.test, scope);
          resolveBody(e.body, scope);
        }
        if (node.alternate) resolveBody(node.alternate, scope);
        break;
      case "While":
        resolveExpr(node.test, scope);
        resolveBody(node.body, scope);
        break;
      case "For":
        resolveExpr(node.iter, scope);
        resolveBody(node.body, scope);
        break;
      case "FuncDef":
        resolveFunction(node, scope);
        break;
      case "ClassDef":
        // Each method is its own function scope whose parent is the enclosing
        // module/function scope (class body is skipped for free-name lookup).
        for (const method of node.methods) resolveFunction(method, scope);
        break;
      case "Global":
      case "Break":
      case "Continue":
        break;
    }
  }

  function resolveFunction(fn, parentScope) {
    const scope = new Scope("function", parentScope);
    for (const p of fn.params) scope.declare(p);
    hoist(fn.body, scope);
    resolveBody(fn.body, scope);
  }

  hoist(program.body, moduleScope);
  resolveBody(program.body, moduleScope);

  return { errors, moduleScope };
}
