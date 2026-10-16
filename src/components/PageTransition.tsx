import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { useLocation } from 'react-router-dom'
import { PAGE_DURATION } from '../lib/motion.ts'

interface PageTransitionProps {
  children: ReactNode
}

/**
 * Fades the page in when the section changes. Keyed by the first path segment,
 * so moving between Grands Prix or changing drivers does not replay it; enter
 * only, so the new page never waits for the old one to leave.
 */
export default function PageTransition({ children }: PageTransitionProps) {
  const section = useLocation().pathname.split('/')[1] ?? ''
  return (
    <motion.div
      key={section}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: PAGE_DURATION, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
