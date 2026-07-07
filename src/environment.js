// environment.js
// PHASE 4 at runtime.
//
// An Environment is one scope's variable table plus a link to its parent.
// Functions capture the environment they were defined in (lexical scoping), so
// closures work. Reading a name walks up the chain (Local -> Enclosing ->
// Global); assigning defines in the current scope, which is exactly why a plain
// assignment inside a function creates a local rather than mutating a global,
// unless `global` was declared for that name.

import { RuntimeErr } from "./errors.js";

export class Environment {
  constructor(parent = null, globalEnv = null, globalNames = null) {
    this.parent = parent;
    this.vars = new Map();
    // Names declared `global` in this function, plus a direct link to the
    // module scope, so an assignment to such a name writes to the module scope
    // instead of creating a local shadow.
    this.globalEnv = globalEnv;
    this.globalNames = globalNames;
  }

  define(name, value) {
    if (this.globalNames && this.globalNames.has(name) && this.globalEnv) {
      this.globalEnv.vars.set(name, value);
      return;
    }
    this.vars.set(name, value);
  }

  get(name, line = null) {
    let env = this;
    while (env) {
      if (env.vars.has(name)) return env.vars.get(name);
      env = env.parent;
    }
    throw new RuntimeErr(`name '${name}' is not defined`, line);
  }

  has(name) {
    let env = this;
    while (env) {
      if (env.vars.has(name)) return true;
      env = env.parent;
    }
    return false;
  }
}
