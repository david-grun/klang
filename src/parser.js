// parser.js
// PHASE 3 — Syntax Analysis.
//
// A hand-written recursive-descent parser. It consumes the token stream from
// the lexer and produces an AST, or throws a SyntaxErr with a position when
// the structure is wrong (FR2: malformed input yields a specific error, not a
// crash). Recursive descent is used deliberately so the "we built this"
// grammar story holds up in the Q&A, with no parser-generator dependency.
//
// Grammar (informal):
//   program    -> (NEWLINE | statement)* EOF
//   statement  -> compound | simple NEWLINE
//   compound   -> ifStmt | whileStmt | forStmt | funcDef | classDef
//   simple     -> return | break | continue | global | assignOrExpr
//   block      -> NEWLINE INDENT statement+ DEDENT
//   expression -> or_expr
//   or_expr    -> and_expr ('or' and_expr)*
//   and_expr   -> not_expr ('and' not_expr)*
//   not_expr   -> 'not' not_expr | comparison
//   comparison -> sum (('=='|'!='|'<'|'<='|'>'|'>=') sum)*
//   sum        -> term (('+'|'-') term)*
//   term       -> factor (('*'|'/'|'%'|'//') factor)*
//   factor     -> ('-'|'+') factor | power
//   power      -> postfix ('**' factor)?
//   postfix    -> primary (call | attribute)*
//   primary    -> literal | IDENTIFIER | '(' expression ')'

import { TokenType } from "./token.js";
import { SyntaxErr } from "./errors.js";

export function parse(tokens) {
  let pos = 0;

  const peek = (o = 0) => tokens[pos + o];
  const atEnd = () => peek().type === TokenType.EOF;

  function check(type, value = null) {
    const t = peek();
    if (t.type !== type) return false;
    if (value !== null && t.value !== value) return false;
    return true;
  }
  function match(type, value = null) {
    if (check(type, value)) return tokens[pos++];
    return null;
  }
  function expect(type, value = null, what = null) {
    if (check(type, value)) return tokens[pos++];
    const t = peek();
    const wanted = what || (value !== null ? `'${value}'` : type);
    throw new SyntaxErr(`expected ${wanted}, but found '${t.value}'`, t.line, t.col);
  }
  // Skip stray blank NEWLINE tokens between statements.
  function skipNewlines() {
    while (check(TokenType.NEWLINE)) pos++;
  }

  // ---- statements ----

  function program() {
    const body = [];
    skipNewlines();
    while (!atEnd()) {
      body.push(statement());
      skipNewlines();
    }
    return { type: "Program", body };
  }

  function block() {
    expect(TokenType.NEWLINE, null, "a new line before an indented block");
    skipNewlines();
    expect(TokenType.INDENT, null, "an indented block");
    const body = [];
    skipNewlines();
    while (!check(TokenType.DEDENT) && !atEnd()) {
      body.push(statement());
      skipNewlines();
    }
    expect(TokenType.DEDENT, null, "the end of the indented block");
    return body;
  }

  function statement() {
    if (check(TokenType.KEYWORD)) {
      switch (peek().value) {
        case "if":
          return ifStmt();
        case "while":
          return whileStmt();
        case "for":
          return forStmt();
        case "def":
          return funcDef();
        case "class":
          return classDef();
        case "return":
          return returnStmt();
        case "break":
          return simpleWord("Break");
        case "continue":
          return simpleWord("Continue");
        case "global":
          return globalStmt();
        case "print":
          return exprOrAssign(); // print is a call expression
      }
    }
    return exprOrAssign();
  }

  function simpleWord(nodeType) {
    const t = expect(TokenType.KEYWORD);
    expect(TokenType.NEWLINE, null, "a new line");
    return { type: nodeType, line: t.line };
  }

  function globalStmt() {
    const t = expect(TokenType.KEYWORD, "global");
    const names = [expect(TokenType.IDENTIFIER).value];
    while (match(TokenType.PUNCT, ",")) names.push(expect(TokenType.IDENTIFIER).value);
    expect(TokenType.NEWLINE, null, "a new line");
    return { type: "Global", names, line: t.line };
  }

  function returnStmt() {
    const t = expect(TokenType.KEYWORD, "return");
    let value = null;
    if (!check(TokenType.NEWLINE)) value = expression();
    expect(TokenType.NEWLINE, null, "a new line after return");
    return { type: "Return", value, line: t.line };
  }

  function ifStmt() {
    const t = expect(TokenType.KEYWORD, "if");
    const test = expression();
    expect(TokenType.PUNCT, ":", "':' after the if condition");
    const consequent = block();
    const elifs = [];
    while (check(TokenType.KEYWORD, "elif")) {
      const et = expect(TokenType.KEYWORD, "elif");
      const etest = expression();
      expect(TokenType.PUNCT, ":", "':' after the elif condition");
      const ebody = block();
      elifs.push({ test: etest, body: ebody, line: et.line });
    }
    let alternate = null;
    if (match(TokenType.KEYWORD, "else")) {
      expect(TokenType.PUNCT, ":", "':' after else");
      alternate = block();
    }
    return { type: "If", test, consequent, elifs, alternate, line: t.line };
  }

  function whileStmt() {
    const t = expect(TokenType.KEYWORD, "while");
    const test = expression();
    expect(TokenType.PUNCT, ":", "':' after the while condition");
    const body = block();
    return { type: "While", test, body, line: t.line };
  }

  function forStmt() {
    const t = expect(TokenType.KEYWORD, "for");
    const varName = expect(TokenType.IDENTIFIER, null, "a loop variable").value;
    expect(TokenType.KEYWORD, "in", "'in' in the for loop");
    const iter = expression();
    expect(TokenType.PUNCT, ":", "':' after the for clause");
    const body = block();
    return { type: "For", varName, iter, body, line: t.line };
  }

  function funcDef() {
    const t = expect(TokenType.KEYWORD, "def");
    const name = expect(TokenType.IDENTIFIER, null, "a function name").value;
    expect(TokenType.PUNCT, "(", "'(' after the function name");
    const params = [];
    if (!check(TokenType.PUNCT, ")")) {
      params.push(expect(TokenType.IDENTIFIER, null, "a parameter name").value);
      while (match(TokenType.PUNCT, ",")) {
        params.push(expect(TokenType.IDENTIFIER, null, "a parameter name").value);
      }
    }
    expect(TokenType.PUNCT, ")", "')' to close the parameter list");
    expect(TokenType.PUNCT, ":", "':' after the function signature");
    const body = block();
    return { type: "FuncDef", name, params, body, line: t.line };
  }

  function classDef() {
    const t = expect(TokenType.KEYWORD, "class");
    const name = expect(TokenType.IDENTIFIER, null, "a class name").value;
    expect(TokenType.PUNCT, ":", "':' after the class name");
    // class body is a block of method definitions
    expect(TokenType.NEWLINE, null, "a new line before the class body");
    skipNewlines();
    expect(TokenType.INDENT, null, "an indented class body");
    const methods = [];
    skipNewlines();
    while (!check(TokenType.DEDENT) && !atEnd()) {
      if (!check(TokenType.KEYWORD, "def")) {
        const bad = peek();
        throw new SyntaxErr("class body may only contain method definitions", bad.line, bad.col);
      }
      methods.push(funcDef());
      skipNewlines();
    }
    expect(TokenType.DEDENT, null, "the end of the class body");
    return { type: "ClassDef", name, methods, line: t.line };
  }

  // assignment target vs bare expression statement
  function exprOrAssign() {
    const line = peek().line;
    const expr = expression();
    if (check(TokenType.OP, "=")) {
      expect(TokenType.OP, "=");
      const value = expression();
      expect(TokenType.NEWLINE, null, "a new line after the assignment");
      if (expr.type !== "Identifier" && expr.type !== "Attribute") {
        throw new SyntaxErr("invalid assignment target", line);
      }
      return { type: "Assign", target: expr, value, line };
    }
    expect(TokenType.NEWLINE, null, "a new line after the statement");
    return { type: "ExprStmt", expr, line };
  }

  // ---- expressions ----

  function expression() {
    return orExpr();
  }

  function orExpr() {
    let left = andExpr();
    while (check(TokenType.KEYWORD, "or")) {
      const op = expect(TokenType.KEYWORD).value;
      const right = andExpr();
      left = { type: "Logical", op, left, right, line: left.line };
    }
    return left;
  }

  function andExpr() {
    let left = notExpr();
    while (check(TokenType.KEYWORD, "and")) {
      const op = expect(TokenType.KEYWORD).value;
      const right = notExpr();
      left = { type: "Logical", op, left, right, line: left.line };
    }
    return left;
  }

  function notExpr() {
    if (check(TokenType.KEYWORD, "not")) {
      const t = expect(TokenType.KEYWORD);
      const operand = notExpr();
      return { type: "Unary", op: "not", operand, line: t.line };
    }
    return comparison();
  }

  const COMPARE_OPS = new Set(["==", "!=", "<", "<=", ">", ">="]);
  function comparison() {
    let left = sum();
    while (check(TokenType.OP) && COMPARE_OPS.has(peek().value)) {
      const op = expect(TokenType.OP).value;
      const right = sum();
      left = { type: "Binary", op, left, right, line: left.line };
    }
    return left;
  }

  function sum() {
    let left = term();
    while (check(TokenType.OP, "+") || check(TokenType.OP, "-")) {
      const op = expect(TokenType.OP).value;
      const right = term();
      left = { type: "Binary", op, left, right, line: left.line };
    }
    return left;
  }

  const TERM_OPS = new Set(["*", "/", "%", "//"]);
  function term() {
    let left = factor();
    while (check(TokenType.OP) && TERM_OPS.has(peek().value)) {
      const op = expect(TokenType.OP).value;
      const right = factor();
      left = { type: "Binary", op, left, right, line: left.line };
    }
    return left;
  }

  function factor() {
    if (check(TokenType.OP, "-") || check(TokenType.OP, "+")) {
      const t = expect(TokenType.OP);
      const operand = factor();
      return { type: "Unary", op: t.value, operand, line: t.line };
    }
    return power();
  }

  function power() {
    const base = postfix();
    if (check(TokenType.OP, "**")) {
      expect(TokenType.OP, "**");
      const exp = factor(); // right associative
      return { type: "Binary", op: "**", left: base, right: exp, line: base.line };
    }
    return base;
  }

  function postfix() {
    let expr = primary();
    for (;;) {
      if (check(TokenType.PUNCT, "(")) {
        expect(TokenType.PUNCT, "(");
        const args = [];
        if (!check(TokenType.PUNCT, ")")) {
          args.push(expression());
          while (match(TokenType.PUNCT, ",")) args.push(expression());
        }
        expect(TokenType.PUNCT, ")", "')' to close the argument list");
        expr = { type: "Call", callee: expr, args, line: expr.line };
      } else if (check(TokenType.OP, ".")) {
        expect(TokenType.OP, ".");
        const name = expect(TokenType.IDENTIFIER, null, "an attribute name").value;
        expr = { type: "Attribute", object: expr, name, line: expr.line };
      } else {
        break;
      }
    }
    return expr;
  }

  function primary() {
    const t = peek();
    switch (t.type) {
      case TokenType.INT:
        pos++;
        return { type: "Literal", value: t.value, litType: "int", line: t.line };
      case TokenType.FLOAT:
        pos++;
        return { type: "Literal", value: t.value, litType: "float", line: t.line };
      case TokenType.STRING:
        pos++;
        return { type: "Literal", value: t.value, litType: "string", line: t.line };
      case TokenType.BOOL:
        pos++;
        return { type: "Literal", value: t.value, litType: "bool", line: t.line };
      case TokenType.NONE:
        pos++;
        return { type: "Literal", value: null, litType: "none", line: t.line };
      case TokenType.IDENTIFIER:
        pos++;
        return { type: "Identifier", name: t.value, line: t.line };
      case TokenType.KEYWORD:
        if (t.value === "print") {
          pos++;
          return { type: "Identifier", name: "print", line: t.line };
        }
        break;
      case TokenType.PUNCT:
        if (t.value === "(") {
          pos++;
          const inner = expression();
          expect(TokenType.PUNCT, ")", "')' to close the group");
          return inner;
        }
        break;
    }
    throw new SyntaxErr(`unexpected '${t.value}' in expression`, t.line, t.col);
  }

  return program();
}
