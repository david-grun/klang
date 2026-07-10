import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion'
import { type RefObject, useEffect, useState } from 'react'

type Props = {
  stageRef: RefObject<HTMLElement | null>
  reduceMotion: boolean
}

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const sync = () => setCoarse(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return coarse
}

export function Spotlight({ stageRef, reduceMotion }: Props) {
  const coarse = useCoarsePointer()
  const rawX = useMotionValue(50)
  const rawY = useMotionValue(40)
  const x = useSpring(rawX, { stiffness: 70, damping: 28, mass: 0.55 })
  const y = useSpring(rawY, { stiffness: 70, damping: 28, mass: 0.55 })
  const left = useMotionTemplate`${x}%`
  const top = useMotionTemplate`${y}%`

  useEffect(() => {
    if (reduceMotion || coarse) return

    const el = stageRef.current
    if (!el) return

    let idleTimer: number | null = null
    let driftTimer: number | null = null
    let angle = 0

    const clearIdle = () => {
      if (idleTimer !== null) {
        window.clearTimeout(idleTimer)
        idleTimer = null
      }
      if (driftTimer !== null) {
        window.clearInterval(driftTimer)
        driftTimer = null
      }
    }

    const startDrift = () => {
      if (driftTimer !== null) return
      driftTimer = window.setInterval(() => {
        angle += 0.035
        rawX.set(50 + Math.sin(angle) * 6)
        rawY.set(38 + Math.cos(angle * 0.7) * 4)
      }, 50)
    }

    const armIdle = () => {
      if (idleTimer !== null) window.clearTimeout(idleTimer)
      idleTimer = window.setTimeout(startDrift, 1800)
    }

    const onMove = (event: PointerEvent) => {
      clearIdle()
      const rect = el.getBoundingClientRect()
      const px = ((event.clientX - rect.left) / rect.width) * 100
      const py = ((event.clientY - rect.top) / rect.height) * 100
      rawX.set(px)
      rawY.set(py)
      armIdle()
    }

    el.addEventListener('pointermove', onMove)
    armIdle()

    return () => {
      el.removeEventListener('pointermove', onMove)
      clearIdle()
    }
  }, [stageRef, reduceMotion, coarse, rawX, rawY])

  if (reduceMotion || coarse) return null

  return (
    <div className="spotlight-layer" aria-hidden="true">
      <motion.div className="spotlight-cursor" style={{ left, top }} />
    </div>
  )
}
