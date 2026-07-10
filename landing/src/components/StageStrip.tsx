export function StageStrip() {
  return (
    <section className="stage-strip" aria-label="Pipeline stages">
      <p className="stage-strip-label">From source to sound</p>
      <ul className="stage-beats">
        <li>Lex</li>
        <li aria-hidden="true">·</li>
        <li>Parse</li>
        <li aria-hidden="true">·</li>
        <li>Play</li>
      </ul>
    </section>
  )
}
