// @ts-expect-error — compiler lives at repo root; Vite bundles it
import { KEYWORDS, LITERAL_WORDS } from '../../../src/token.js'

const LITERAL_WORD_SET = new Set(Object.keys(LITERAL_WORDS))
const KEYWORD_SET = new Set(KEYWORDS.keys())

const TOKEN_RE =
  /(#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\d+\.?\d*)|([A-Za-z_]\w*)|([+\-*/%=<>!.]+|[()[\]:,])/g

function escapeHtml(text: string): string {
  return text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)
}

export function highlightKlang(src: string): string {
  let out = ''
  let last = 0
  let m: RegExpExecArray | null
  TOKEN_RE.lastIndex = 0
  while ((m = TOKEN_RE.exec(src))) {
    if (m.index > last) out += escapeHtml(src.slice(last, m.index))
    const [, comment, string, number, word, op] = m
    if (comment !== undefined) {
      out += `<span class="tok-comment">${escapeHtml(comment)}</span>`
    } else if (string !== undefined) {
      out += `<span class="tok-string">${escapeHtml(string)}</span>`
    } else if (number !== undefined) {
      out += `<span class="tok-number">${escapeHtml(number)}</span>`
    } else if (word !== undefined) {
      let cls = 'tok-identifier'
      if (LITERAL_WORD_SET.has(word)) cls = 'tok-literal'
      else if (KEYWORD_SET.has(word)) cls = 'tok-keyword'
      out += `<span class="${cls}">${escapeHtml(word)}</span>`
    } else if (op !== undefined) {
      out += `<span class="tok-operator">${escapeHtml(op)}</span>`
    }
    last = TOKEN_RE.lastIndex
  }
  if (last < src.length) out += escapeHtml(src.slice(last))
  return out
}
