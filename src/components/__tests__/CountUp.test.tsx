import { render, screen } from '@testing-library/react'
import { MotionGlobalConfig, useReducedMotion } from 'motion/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CountUp from '../CountUp.tsx'

vi.mock('motion/react', async (importOriginal) => {
  const original = await importOriginal<typeof import('motion/react')>()
  return { ...original, useReducedMotion: vi.fn(() => false) }
})

describe('CountUp', () => {
  afterEach(() => {
    MotionGlobalConfig.skipAnimations = true
    vi.mocked(useReducedMotion).mockReturnValue(false)
  })

  it('shows the final value at once when animations are off', () => {
    render(<CountUp value={87.5} format={(value) => `${value} pt`} />)
    expect(screen.getByText('87.5 pt')).toBeInTheDocument()
  })

  it('counts up from 0 to the final value', async () => {
    MotionGlobalConfig.skipAnimations = false
    render(<CountUp value={41} />)

    expect(screen.getByText('0')).toBeInTheDocument()
    expect(await screen.findByText('41')).toBeInTheDocument()
  })

  it('counts from the value shown when the value changes', async () => {
    MotionGlobalConfig.skipAnimations = false
    const { rerender } = render(<CountUp value={10} />)
    await screen.findByText('10')

    rerender(<CountUp value={20} />)
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(await screen.findByText('20')).toBeInTheDocument()
  })

  it('does not count with "reduce motion"', () => {
    MotionGlobalConfig.skipAnimations = false
    vi.mocked(useReducedMotion).mockReturnValue(true)
    render(<CountUp value={41} />)
    expect(screen.getByText('41')).toBeInTheDocument()
  })
})
