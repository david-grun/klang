import { useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Curtains } from './Curtains'
import { Spotlight } from './Spotlight'

export function Hero() {
  const reduceMotion = useReducedMotion()
  const [lightsWarm, setLightsWarm] = useState(false)
  const stageRef = useRef<HTMLElement>(null)

  const onCtaEnter = useCallback(() => setLightsWarm(true), [])
  const onCtaLeave = useCallback(() => setLightsWarm(false), [])

  useEffect(() => {
    if (reduceMotion) setLightsWarm(true)
  }, [reduceMotion])

  return (
    <section className="hero" ref={stageRef} aria-label="Klang opera house">
      <div className="hero-stage" aria-hidden="true">
        <div className="valance" />
        <div className="proscenium" />
        <Curtains reduceMotion={!!reduceMotion} />
        <div className="spotlight-ambient left" />
        <div className="spotlight-ambient right" />
        <div className="stage-floor" />
        <div className={`house-lights${lightsWarm ? ' is-warm' : ''}`} />
        <Spotlight stageRef={stageRef} reduceMotion={!!reduceMotion} />
      </div>

      <div className="hero-content">
        <span className="hero-kicker">A compiler you can hear</span>
        <h1 className="hero-title">Klang</h1>
        <p className="hero-lede">
          Watch source become sound — one instrument per pipeline stage.
        </p>
        <a
          className="cta"
          href="/play"
          onMouseEnter={onCtaEnter}
          onMouseLeave={onCtaLeave}
          onFocus={onCtaEnter}
          onBlur={onCtaLeave}
          onPointerDown={onCtaEnter}
        >
          Enter the stage
        </a>
      </div>
    </section>
  )
}
