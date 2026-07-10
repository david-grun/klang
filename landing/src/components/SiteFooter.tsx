export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>Klang · a tiny language whose compiler performs on stage</span>
      <span className="site-footer-links">
        <a href="/about">About</a>
        <span aria-hidden="true">·</span>
        <a href="https://github.com/david-grun/klang" target="_blank" rel="noopener noreferrer">
          GitHub ↗
        </a>
      </span>
    </footer>
  )
}
