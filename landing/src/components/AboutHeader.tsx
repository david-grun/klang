export function AboutHeader() {
  return (
    <header className="about-header" aria-label="About Klang">
      <div className="about-header-brand">
        <span className="about-kicker">Program notes</span>
        <h1 className="about-title">About Klang</h1>
      </div>
      <nav className="about-nav" aria-label="Site navigation">
        <a className="about-nav-link" href="/">
          House
        </a>
        <a className="about-nav-cta" href="/play">
          Enter the stage
        </a>
      </nav>
    </header>
  )
}
