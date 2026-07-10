import { motion, useReducedMotion } from 'framer-motion'
import { AboutHeader } from '../components/AboutHeader'
import { CodeBlock } from '../components/CodeBlock'
import { PipelineDemo } from '../components/PipelineDemo'
import { SectionNav } from '../components/SectionNav'
import { SiteFooter } from '../components/SiteFooter'
import { StageTimeline } from '../components/StageTimeline'
import { VocabularyGrid } from '../components/VocabularyGrid'

const LANGUAGE_SAMPLE = `# a motif is a reusable phrase (function), with recursion
motif countdown(n):
    when n == 0:
        play("liftoff")
        resolve
    play(n)
    countdown(n - 1)

countdown(3)

# an ensemble groups behaviour (a class); tune is its constructor
ensemble Counter:
    motif tune(self, start):
        self._n = start
    motif bump(self):
        self._n = self._n + 1

c = Counter(10)
c.bump()
play(c._n)   # 11`

const CLI_SAMPLE = `node klang.js examples/hello.klang      # run a program
node klang.js --stages examples/errors/undeclared.klang
node klang.js --tokens examples/hello.klang
node test.js                            # 32 language tests`

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.section
      id={id}
      className="about-section"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <h2 className="about-section-title">{title}</h2>
      {children}
    </motion.section>
  )
}

export function AboutPage() {
  return (
    <div className="about-page">
      <AboutHeader />

      <div className="about-layout">
        <SectionNav />

        <main className="about-main">
          <Section id="what" title="What is Klang?">
            <p>
              Klang is a small programming language whose compiler pipeline you can{' '}
              <em>watch and hear</em>. Every time you press Run, your program passes through
              five real compilation stages, and each stage performs with its own instrument — a
              clean program builds up like a short symphony, and an error stops the orchestra
              mid-phrase at exactly the stage that failed.
            </p>
            <h3 className="about-subhead">A language of its own</h3>
            <p>
              Klang is implemented entirely from scratch: its own lexer, recursive-descent
              parser, scope resolver, semantic checker, and tree-walking interpreter, written in
              dependency-free JavaScript (see <code>src/</code>). No Python runs anywhere. The
              grammar, token set, scoping rules, and gradual type system are Klang&apos;s own,
              specified in <code>docs/LANGUAGE_DESIGN.md</code>.
            </p>
            <p>
              The surface syntax is music-themed. You write <code>motif</code> for a function,{' '}
              <code>ensemble</code> for a class, <code>play</code> to output,{' '}
              <code>when</code> / <code>orwhen</code> / <code>otherwise</code> for conditionals,{' '}
              <code>loop … in scale(...)</code> and <code>sustain</code> for loops — each keyword
              a performance direction rather than a borrowed dialect.
            </p>
          </Section>

          <Section id="stages" title="The five stages (and their instruments)">
            <StageTimeline />
            <p>
              The pipeline stops at the first stage that reports an error, and the instruments for
              the stages after it never play. Try the <em>Semantic error</em> example: the lexer,
              parser, and scope stages perform, the bell strikes a sour note, and Execute stays
              silent.
            </p>
          </Section>

          <Section id="demo" title="Try the pipeline">
            <p>
              Run a short program through the real compiler — no audio here, but the same stages
              and stop-on-error behaviour as the stage.
            </p>
            <PipelineDemo />
          </Section>

          <Section id="vocabulary" title="The vocabulary">
            <p>Klang reads like a score. Each keyword is a performance direction:</p>
            <VocabularyGrid />
            <p>
              Numbers, strings, <code>True</code>/<code>False</code>, the operators (
              <code>+ - * / // % **</code>, comparisons, <code>and / or / not</code>),
              indentation-defined blocks, and <code>#</code> comments work as you&apos;d expect.
            </p>
          </Section>

          <Section id="site" title="How to use the site">
            <ol className="about-steps">
              <li>
                Pick an example from the <strong>Example</strong> menu, or type your own program
                in the editor.
              </li>
              <li>
                Press <strong>▶ Run</strong>. Notes pop above each token as the lexer reads it, the
                Symphony roll shows every stage&apos;s notes in its own lane, and the pipeline
                list checks off stages as they pass.
              </li>
              <li>
                Output appears in the <strong>Console</strong>; errors appear in a banner naming the
                stage, line, and reason.
              </li>
              <li>
                Use the <strong>Sound</strong> checkbox to mute, and <strong>Reset</strong> to
                restore the example.
              </li>
            </ol>
          </Section>

          <Section id="language" title="A taste of the language">
            <CodeBlock source={LANGUAGE_SAMPLE} />
            <ul className="about-features">
              <li>
                <strong>Types:</strong> <code>int</code>, <code>float</code>, <code>bool</code>,{' '}
                <code>string</code>, <code>rest</code> (the empty value); explicit conversions via{' '}
                <code>int()</code>, <code>float()</code>, <code>str()</code>, <code>bool()</code>.
              </li>
              <li>
                <strong>Control flow:</strong> <code>when / orwhen / otherwise</code>,{' '}
                <code>sustain</code> (while), <code>loop … in scale(...)</code> or over a string,{' '}
                <code>stop</code>, <code>skip</code>.
              </li>
              <li>
                <strong>Scope:</strong> lexical LEGB with closures; <code>tutti</code> writes to
                module scope; undeclared names are caught <em>before</em> the program runs.
              </li>
              <li>
                <strong>Checking:</strong> gradual — definite type errors like{' '}
                <code>&quot;a&quot; + True</code> are rejected by the semantic stage; the rest is
                enforced at runtime with the same messages.
              </li>
            </ul>
          </Section>

          <Section id="cli" title="Running Klang from the command line">
            <CodeBlock source={CLI_SAMPLE} variant="terminal" />
          </Section>
        </main>
      </div>

      <SiteFooter />
    </div>
  )
}
