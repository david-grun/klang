const SECTIONS = [
  { id: 'what', label: 'What' },
  { id: 'stages', label: 'Stages' },
  { id: 'demo', label: 'Try it' },
  { id: 'vocabulary', label: 'Vocabulary' },
  { id: 'site', label: 'The site' },
  { id: 'language', label: 'Language' },
  { id: 'cli', label: 'CLI' },
] as const

export function SectionNav() {
  return (
    <nav className="section-nav" aria-label="On this page">
      <span className="section-nav-label">On this page</span>
      <ul className="section-nav-list">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`}>{s.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
