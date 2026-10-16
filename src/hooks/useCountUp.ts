import { useEffect, useRef, useState } from 'react'
import { animate, MotionGlobalConfig, useReducedMotion } from 'motion/react'
import { COUNT_UP_DURATION, countUpFrame } from '../lib/motion.ts'

/**
 * Number counting up to `target`; when the target changes it counts from the
 * value currently shown. With "reduce motion" (or animations disabled, as in
 * tests) it is always the final value.
 */
export function useCountUp(target: number): number {
  const reduceMotion = useReducedMotion()
  const skip = reduceMotion === true || MotionGlobalConfig.skipAnimations === true
  const [shown, setShown] = useState(skip ? target : 0)
  const shownRef = useRef(skip ? target : 0)

  useEffect(() => {
    if (skip) return
    const from = shownRef.current
    if (from === target) return
    const show = (value: number) => {
      shownRef.current = value
      setShown(value)
    }
    const controls = animate(0, 1, {
      duration: COUNT_UP_DURATION,
      ease: 'easeOut',
      onUpdate: (progress) => show(progress >= 1 ? target : from + countUpFrame(target - from, progress)),
      onComplete: () => show(target),
    })
    return () => controls.stop()
  }, [target, skip])

  return skip ? target : shown
}
