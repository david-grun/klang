import { highlightKlang } from '../lib/highlightKlang'

type Props = {
  source: string
  className?: string
  variant?: 'code' | 'terminal'
}

export function CodeBlock({ source, className = '', variant = 'code' }: Props) {
  const html = highlightKlang(source)
  return (
    <pre className={`code-block code-block--${variant} ${className}`.trim()}>
      <code dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  )
}
