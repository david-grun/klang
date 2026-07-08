// token.js
// Phase 2 foundation: the vocabulary of Klang.
//
// The lexer classifies every character run into one of these token types.
// The four categories the course spec cares about (identifiers, keywords,
// operators, literals) map onto these constants, plus the structural tokens
// (NEWLINE / INDENT / DEDENT / EOF) that a Python-like, indentation-based
// grammar needs.

export const TokenType = {
  // literals
  INT: "INT",
  FLOAT: "FLOAT",
  STRING: "STRING",
  BOOL: "BOOL",
  NONE: "NONE",

  // names
  IDENTIFIER: "IDENTIFIER",
  KEYWORD: "KEYWORD",

  // operators and punctuation
  OP: "OP",
  PUNCT: "PUNCT",

  // layout / structure
  NEWLINE: "NEWLINE",
  INDENT: "INDENT",
  DEDENT: "DEDENT",
  EOF: "EOF",
};

// Reserved words — Klang's surface syntax is themed after a musical
// performance. Each surface keyword maps to a canonical internal keyword, so
// the parser, resolver, semantic checker, and interpreter are written against
// stable names ("def", "if", ...) while programs read like score directions
// ("motif", "when", ...). The lexer emits the canonical value; nothing else in
// the compiler needs to know the surface spelling.
export const KEYWORDS = new Map([
  ["motif", "def"], // define a reusable phrase (function)
  ["resolve", "return"], // a phrase resolves to a value
  ["when", "if"],
  ["orwhen", "elif"],
  ["otherwise", "else"],
  ["sustain", "while"], // keep looping while the condition holds
  ["loop", "for"], // iterate over a sequence
  ["in", "in"],
  ["stop", "break"], // leave the loop
  ["skip", "continue"], // move to the next iteration
  ["ensemble", "class"], // a group of instruments (a class)
  ["and", "and"],
  ["or", "or"],
  ["not", "not"],
  ["tutti", "global"], // the whole ensemble / module scope
  ["play", "print"], // perform (output) a value
]);

// Literal keywords are lexed as their own literal token types, not as
// generic keywords, because semantically they carry a value. `rest` is Klang's
// musical name for "no value" (a rest is a silence).
export const LITERAL_WORDS = {
  True: { type: TokenType.BOOL, value: true },
  False: { type: TokenType.BOOL, value: false },
  rest: { type: TokenType.NONE, value: null },
};

// Multi-character operators must be tried before single-character ones so
// that `==` is not mis-read as two `=` tokens.
export const OPERATORS = [
  "**",
  "//",
  "==",
  "!=",
  "<=",
  ">=",
  "+",
  "-",
  "*",
  "/",
  "%",
  "<",
  ">",
  "=",
  ".",
];

export const PUNCTUATION = new Set(["(", ")", ":", ",", "[", "]"]);

// The category used by the visualizer / audio layer (FR8). Every token the
// lexer emits reports one of these so the piano roll can pick a lane and the
// lexer instrument can pick a pitch by category.
export function tokenCategory(type) {
  switch (type) {
    case TokenType.INT:
    case TokenType.FLOAT:
    case TokenType.STRING:
    case TokenType.BOOL:
    case TokenType.NONE:
      return "literal";
    case TokenType.KEYWORD:
      return "keyword";
    case TokenType.IDENTIFIER:
      return "identifier";
    case TokenType.OP:
      return "operator";
    default:
      return "structural";
  }
}
