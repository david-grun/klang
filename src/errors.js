// errors.js
// One error class per pipeline stage. Every error carries a stage, a
// human-readable message, and (where known) a source position, so the UI can
// point at the exact line and the audio layer knows which instrument to cut
// off. Nothing here throws a bare string or a raw stack trace at the user.

export class KlangError extends Error {
  constructor(stage, message, line = null, col = null) {
    super(message);
    this.name = "KlangError";
    this.stage = stage; // "lexer" | "parser" | "scope" | "semantic" | "runtime"
    this.klangMessage = message;
    this.line = line;
    this.col = col;
  }

  // A clean one-line report, e.g. "Semantic error on line 2: ..."
  format() {
    const where = this.line != null ? ` on line ${this.line}` : "";
    const stageName = this.stage.charAt(0).toUpperCase() + this.stage.slice(1);
    return `${stageName} error${where}: ${this.klangMessage}`;
  }
}

export class LexError extends KlangError {
  constructor(message, line, col) {
    super("lexer", message, line, col);
    this.name = "LexError";
  }
}

export class SyntaxErr extends KlangError {
  constructor(message, line, col) {
    super("parser", message, line, col);
    this.name = "SyntaxErr";
  }
}

export class ScopeError extends KlangError {
  constructor(message, line, col) {
    super("scope", message, line, col);
    this.name = "ScopeError";
  }
}

export class SemanticError extends KlangError {
  constructor(message, line, col) {
    super("semantic", message, line, col);
    this.name = "SemanticError";
  }
}

export class RuntimeErr extends KlangError {
  constructor(message, line, col) {
    super("runtime", message, line, col);
    this.name = "RuntimeErr";
  }
}
