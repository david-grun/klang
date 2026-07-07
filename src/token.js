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

// Reserved words. These can never be used as identifiers.
export const KEYWORDS = new Set([
  "def",
  "return",
  "if",
  "elif",
  "else",
  "while",
  "for",
  "in",
  "break",
  "continue",
  "class",
  "and",
  "or",
  "not",
  "global",
  "print",
]);

// Literal keywords are lexed as their own literal token types, not as
// generic keywords, because semantically they carry a value.
export const LITERAL_WORDS = {
  True: { type: TokenType.BOOL, value: true },
  False: { type: TokenType.BOOL, value: false },
  None: { type: TokenType.NONE, value: null },
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
