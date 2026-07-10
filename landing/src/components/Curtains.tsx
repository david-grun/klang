import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

type Props = {
  reduceMotion: boolean
}

function useNarrowStage() {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const sync = () => setNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return narrow
}

export function Curtains({ reduceMotion }: Props) {
  const narrow = useNarrowStage()
  // Open further on phones so the wordmark isn't pinched between folds.
  const open = narrow ? '46%' : '38%'
  const ease = [0.22, 1, 0.36, 1] as const

  return (
    <>
      <motion.div
        className="curtain curtain-left"
        aria-hidden="true"
        initial={reduceMotion ? { x: `-${open}` } : { x: '0%' }}
        animate={{ x: `-${open}` }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 1.7, ease, delay: 0.08 }
        }
      >
        <div className="curtain-fold" />
      </motion.div>
      <motion.div
        className="curtain curtain-right"
        aria-hidden="true"
        initial={reduceMotion ? { x: open } : { x: '0%' }}
        animate={{ x: open }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 1.7, ease, delay: 0.16 }
        }
      >
        <div className="curtain-fold" />
      </motion.div>
    </>
  )
}
