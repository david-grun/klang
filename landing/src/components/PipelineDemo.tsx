import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useRef, useState } from 'react'
// @ts-expect-error — compiler lives at repo root; Vite bundles it
import { run } from '../../../src/pipeline.js'
import { CodeBlock } from './CodeBlock'
import { STAGE_META, STAGES, type StageKey } from '../lib/stageMeta'

const STRUCTURAL = new Set(['EOF', 'NEWLINE', 'INDENT', 'DEDENT'])

const SAMPLES = {
  hello: {
    label: 'Hello',
    source: `motif greet(name):
    play("hello " + name)

greet("Klang")
`,
  },
  semanticError: {
    label: 'Semantic error',
    source: `x = "a" + True
`,
  },
} as const

type SampleKey = keyof typeof SAMPLES
type RunState = 'idle' | 'running' | 'success' | 'error'
type StageStatus = 'pending' | 'active' | 'done' | 'failed' | 'skipped'

type StageResult = {
  status: StageStatus
  detail: string
}

const STAGE_DELAY_MS = 380

function tokenCount(tokens: { type: string }[] | null): number {
  if (!tokens) return 0
  return tokens.filter((t) => !STRUCTURAL.has(t.type)).length
}

function stageDetail(key: StageKey, result: ReturnType<typeof run>): string {
  switch (key) {
    case 'lexer':
      return `${tokenCount(result.tokens)} tokens`
    case 'parser':
      return result.ast ? 'AST built' : '—'
    case 'scope':
      return result.scope ? 'names resolved' : '—'
    case 'semantic':
      if (result.failedStage === 'semantic' && result.error) {
        return result.error.klangMessage ?? result.error.message
      }
      return result.reachedStage === 'semantic' || result.ok ? 'types checked' : '—'
    case 'execute':
      if (result.output?.length) return result.output.join('\n')
      if (result.failedStage === 'execute' && result.error) {
        return result.error.klangMessage ?? result.error.message
      }
      return result.ok ? '(no output)' : '—'
    default:
      return '—'
  }
}

function buildStageResults(result: ReturnType<typeof run>): Record<StageKey, StageResult> {
  const out = {} as Record<StageKey, StageResult>
  const failedIdx = result.failedStage ? STAGES.indexOf(result.failedStage as StageKey) : -1
  const reachedIdx = result.reachedStage ? STAGES.indexOf(result.reachedStage as StageKey) : -1

  for (let i = 0; i < STAGES.length; i++) {
    const key = STAGES[i]
    if (failedIdx >= 0 && i === failedIdx) {
      out[key] = { status: 'failed', detail: stageDetail(key, result) }
    } else if (failedIdx >= 0 && i > failedIdx) {
      out[key] = { status: 'skipped', detail: '—' }
    } else if (result.ok || i <= reachedIdx) {
      out[key] = { status: 'done', detail: stageDetail(key, result) }
    } else {
      out[key] = { status: 'pending', detail: '—' }
    }
  }
  return out
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export function PipelineDemo() {
  const reduceMotion = useReducedMotion()
  const runSeq = useRef(0)
  const [sampleKey, setSampleKey] = useState<SampleKey>('hello')
  const [runState, setRunState] = useState<RunState>('idle')
  const [activeStage, setActiveStage] = useState<StageKey | null>(null)
  const [stageResults, setStageResults] = useState<Record<StageKey, StageResult> | null>(null)

  const sample = SAMPLES[sampleKey]

  const resetDemo = useCallback(() => {
    runSeq.current += 1
    setRunState('idle')
    setActiveStage(null)
    setStageResults(null)
  }, [])

  const handleSampleChange = (key: SampleKey) => {
    setSampleKey(key)
    resetDemo()
  }

  const handleRun = async () => {
    const seq = ++runSeq.current
    setRunState('running')
    setActiveStage(null)
    setStageResults(null)

    const result = run(sample.source)
    const final = buildStageResults(result)
    const stopIdx =
      result.failedStage != null ? STAGES.indexOf(result.failedStage as StageKey) : STAGES.length - 1

    if (reduceMotion) {
      if (seq !== runSeq.current) return
      setStageResults(final)
      setActiveStage(null)
      setRunState(result.ok ? 'success' : 'error')
      return
    }

    for (let i = 0; i <= stopIdx; i++) {
      if (seq !== runSeq.current) return
      const key = STAGES[i]
      setActiveStage(key)
      await wait(STAGE_DELAY_MS)
      if (seq !== runSeq.current) return
      const partial = { ...final }
      for (let j = 0; j < i; j++) partial[STAGES[j]] = { ...final[STAGES[j]], status: 'done' }
      partial[key] = final[key]
      setStageResults(partial)
    }

    if (seq !== runSeq.current) return
    setActiveStage(null)
    setStageResults(final)
    setRunState(result.ok ? 'success' : 'error')
  }

  const getStatus = (key: StageKey): StageStatus => {
    if (activeStage === key) return 'active'
    if (stageResults) return stageResults[key].status
    return 'pending'
  }

  return (
    <div className="pipeline-demo">
      <div className="pipeline-demo-controls">
        <div className="pipeline-demo-samples" role="tablist" aria-label="Demo program">
          {(Object.keys(SAMPLES) as SampleKey[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={sampleKey === key}
              className={`pipeline-demo-tab${sampleKey === key ? ' is-active' : ''}`}
              onClick={() => handleSampleChange(key)}
            >
              {SAMPLES[key].label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="pipeline-demo-run"
          onClick={handleRun}
          disabled={runState === 'running'}
        >
          {runState === 'running' ? 'Running…' : '▶ Run pipeline'}
        </button>
      </div>

      <CodeBlock source={sample.source} className="pipeline-demo-source" />

      <div className="pipeline-demo-stages" role="list">
        {STAGES.map((key) => {
          const meta = STAGE_META[key]
          const status = getStatus(key)
          const detail = stageResults?.[key]?.detail ?? '—'
          return (
            <motion.article
              key={key}
              className={`pipeline-stage pipeline-stage--${status}`}
              role="listitem"
              animate={{
                opacity: status === 'skipped' ? 0.35 : 1,
                scale: status === 'active' ? 1.02 : 1,
              }}
              transition={{ duration: reduceMotion ? 0 : 0.25 }}
            >
              <div className="pipeline-stage-body">
                <h3 className="pipeline-stage-name">{meta.label}</h3>
                <p className="pipeline-stage-detail">{detail}</p>
              </div>
            </motion.article>
          )
        })}
      </div>

      {runState === 'error' && stageResults && (
        <p className="pipeline-demo-error" role="status">
          Pipeline stopped — stages after the failure stay silent, just like on stage.
        </p>
      )}

      <p className="pipeline-demo-cta">
        <a href="/play">Hear the full orchestra on stage →</a>
      </p>
    </div>
  )
}
