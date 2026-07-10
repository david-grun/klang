import { Hero } from './components/Hero'
import { StageStrip } from './components/StageStrip'
import { SiteFooter } from './components/SiteFooter'

export default function App() {
  return (
    <div className="house">
      <Hero />
      <StageStrip />
      <SiteFooter />
    </div>
  )
}
