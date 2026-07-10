const VOCABULARY = [
  { term: 'motif', desc: 'define a reusable phrase (a function)' },
  { term: 'resolve', desc: 'hand a value back from a motif (return)' },
  { term: 'play', desc: 'perform / print a value to the console' },
  { term: 'when · orwhen · otherwise', desc: 'conditionals (if · elif · else)' },
  { term: 'sustain', desc: 'keep looping while a condition holds (while)' },
  { term: 'loop … in …', desc: 'iterate over a sequence (for-each)' },
  { term: 'scale(a, b)', desc: 'a run of numbers to loop over (range)' },
  { term: 'stop · skip', desc: 'leave the loop · jump to the next turn (break · continue)' },
  { term: 'ensemble · tune', desc: 'define a class · its constructor' },
  { term: 'tutti', desc: 'bind a name in the whole-ensemble (module) scope (global)' },
  { term: 'rest', desc: 'the empty value / silence (None)' },
  { term: 'length(s)', desc: 'how many characters are in a string' },
] as const

export function VocabularyGrid() {
  return (
    <div className="vocab-grid" role="list">
      {VOCABULARY.map((item) => (
        <article key={item.term} className="vocab-card" role="listitem">
          <code className="vocab-term">{item.term}</code>
          <span className="vocab-desc">{item.desc}</span>
        </article>
      ))}
    </div>
  )
}
