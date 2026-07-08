// lexer.js
// PHASE 2 — Lexical Analysis.
//
// Turns raw source text into a flat list of tokens of the form
//   { type, value, line, col, category }
// which is exactly the shape FR1 asks for ({type, value, position}) plus the
// category the visualizer needs.
//
// Because Klang is Python-like (indentation defines blocks) the lexer also
// emits NEWLINE, INDENT and DEDENT tokens. That is the one genuinely subtle
// part of lexing this language, so it is commented in detail below.

import { TokenType, KEYWORDS, LITERAL_WORDS, OPERATORS, PUNCTUATION } from "./token.js";
import { LexError } from "./errors.js";
import { tokenCategory } from "./token.js";

const TAB_WIDTH = 4;

function isDigit(ch) {
  return ch >= "0" && ch <= "9";
}
function isIdentStart(ch) {
  return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_";
}
function isIdentPart(ch) {
  return isIdentStart(ch) || isDigit(ch);
}

export function tokenize(source) {
  const tokens = [];
  const indentStack = [0]; // column widths of currently open blocks
  const lines = source.split("\n");

  // Bracket depth. Inside (), [] a newline is a line continuation, so we do
  // not emit NEWLINE/INDENT/DEDENT there. This is the Python "implicit line
  // joining" rule and it keeps multi-line calls from breaking the grammar.
  let bracketDepth = 0;

  const push = (type, value, line, col) => {
    tokens.push({ type, value, line, col, category: tokenCategory(type) });
  };

  for (let ln = 0; ln < lines.length; ln++) {
    const line = lines[ln];
    const lineNo = ln + 1;
    let i = 0;

    // --- Indentation handling, only at the start of a logical line ---
    if (bracketDepth === 0) {
      // measure leading whitespace as a column width
      let indent = 0;
      while (i < line.length && (line[i] === " " || line[i] === "\t")) {
        indent += line[i] === "\t" ? TAB_WIDTH : 1;
        i++;
      }
      // Blank line or comment-only line: emits no structure at all.
      const rest = line.slice(i);
      if (rest.trim() === "" || rest.trimStart().startsWith("#")) {
        continue;
      }
      const top = indentStack[indentStack.length - 1];
      if (indent > top) {
        indentStack.push(indent);
        push(TokenType.INDENT, indent, lineNo, i + 1);
      } else if (indent < top) {
        while (indentStack.length > 1 && indent < indentStack[indentStack.length - 1]) {
          indentStack.pop();
          push(TokenType.DEDENT, indent, lineNo, i + 1);
        }
        if (indentStack[indentStack.length - 1] !== indent) {
          throw new LexError("inconsistent indentation", lineNo, i + 1);
        }
      }
    } else {
      // continuation line: just skip the leading whitespace, no structure
      while (i < line.length && (line[i] === " " || line[i] === "\t")) i++;
    }

    // --- Scan the rest of the line into tokens ---
    let sawToken = false;
    while (i < line.length) {
      const ch = line[i];
      const col = i + 1;

      // whitespace between tokens
      if (ch === " " || ch === "\t") {
        i++;
        continue;
      }
      // comment runs to end of line
      if (ch === "#") break;

      // string literal (single or double quoted, no escapes beyond \n \t \" \' \\)
      if (ch === '"' || ch === "'") {
        const quote = ch;
        let j = i + 1;
        let str = "";
        while (j < line.length && line[j] !== quote) {
          if (line[j] === "\\" && j + 1 < line.length) {
            const next = line[j + 1];
            str += next === "n" ? "\n" : next === "t" ? "\t" : next;
            j += 2;
          } else {
            str += line[j];
            j++;
          }
        }
        if (j >= line.length) {
          throw new LexError("unterminated string literal", lineNo, col);
        }
        push(TokenType.STRING, str, lineNo, col);
        i = j + 1;
        sawToken = true;
        continue;
      }

      // number literal (int or float)
      if (isDigit(ch)) {
        let j = i;
        let isFloat = false;
        while (j < line.length && isDigit(line[j])) j++;
        if (line[j] === "." && isDigit(line[j + 1])) {
          isFloat = true;
          j++;
          while (j < line.length && isDigit(line[j])) j++;
        }
        const text = line.slice(i, j);
        push(isFloat ? TokenType.FLOAT : TokenType.INT, isFloat ? parseFloat(text) : parseInt(text, 10), lineNo, col);
        i = j;
        sawToken = true;
        continue;
      }

      // identifier / keyword / literal-word
      if (isIdentStart(ch)) {
        let j = i;
        while (j < line.length && isIdentPart(line[j])) j++;
        const word = line.slice(i, j);
        if (Object.prototype.hasOwnProperty.call(LITERAL_WORDS, word)) {
          const spec = LITERAL_WORDS[word];
          push(spec.type, spec.value, lineNo, col);
        } else if (KEYWORDS.has(word)) {
          // emit the canonical keyword the rest of the compiler understands
          push(TokenType.KEYWORD, KEYWORDS.get(word), lineNo, col);
        } else {
          push(TokenType.IDENTIFIER, word, lineNo, col);
        }
        i = j;
        sawToken = true;
        continue;
      }

      // punctuation that affects bracket depth
      if (PUNCTUATION.has(ch)) {
        if (ch === "(" || ch === "[") bracketDepth++;
        if (ch === ")" || ch === "]") bracketDepth = Math.max(0, bracketDepth - 1);
        push(TokenType.PUNCT, ch, lineNo, col);
        i++;
        sawToken = true;
        continue;
      }

      // operators (longest match first)
      let matched = null;
      for (const opText of OPERATORS) {
        if (line.startsWith(opText, i)) {
          matched = opText;
          break;
        }
      }
      if (matched) {
        push(TokenType.OP, matched, lineNo, col);
        i += matched.length;
        sawToken = true;
        continue;
      }

      throw new LexError(`unexpected character '${ch}'`, lineNo, col);
    }

    // End of a logical line: emit NEWLINE unless we are continuing inside
    // brackets or the line produced nothing.
    if (bracketDepth === 0 && sawToken) {
      push(TokenType.NEWLINE, "\\n", lineNo, line.length + 1);
    }
  }

  // At EOF, close any blocks still open and finish with a NEWLINE + EOF so the
  // parser always sees a clean terminator.
  const lastLine = lines.length;
  if (tokens.length && tokens[tokens.length - 1].type !== TokenType.NEWLINE) {
    push(TokenType.NEWLINE, "\\n", lastLine, 1);
  }
  while (indentStack.length > 1) {
    indentStack.pop();
    push(TokenType.DEDENT, 0, lastLine, 1);
  }
  push(TokenType.EOF, "<eof>", lastLine, 1);

  return tokens;
}
