export type StageKey = 'lexer' | 'parser' | 'scope' | 'semantic' | 'execute'

export type StageInfo = {
  key: StageKey
  label: string
  instrument: string
  description: string
  color: string
}

export const STAGES: StageKey[] = ['lexer', 'parser', 'scope', 'semantic', 'execute']

export const STAGE_META: Record<StageKey, StageInfo> = {
  lexer: {
    key: 'lexer',
    label: 'Lexer',
    instrument: 'triangle synth',
    description: 'splits source into tokens — one note per token',
    color: '#c0453a',
  },
  parser: {
    key: 'parser',
    label: 'Parser',
    instrument: 'plucked string',
    description: 'builds the syntax tree',
    color: '#b5568f',
  },
  scope: {
    key: 'scope',
    label: 'Scope',
    instrument: 'soft pad',
    description: 'resolves every name (LEGB)',
    color: '#2f8f7a',
  },
  semantic: {
    key: 'semantic',
    label: 'Semantic',
    instrument: 'bell · FM',
    description: 'type-checks before running',
    color: '#c9971f',
  },
  execute: {
    key: 'execute',
    label: 'Execute',
    instrument: 'membrane drum',
    description: 'runs the program — one hit per output line',
    color: '#7a4e9a',
  },
}
