import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { StandingsKind } from '../../lib/standings.ts'
import StandingsTabs from '../StandingsTabs.tsx'

function Harness() {
  const [kind, setKind] = useState<StandingsKind>('drivers')
  return <StandingsTabs value={kind} onChange={setKind} panelId="panel" />
}

describe('StandingsTabs', () => {
  it('keeps only the selected tab in the Tab order', () => {
    render(<Harness />)
    expect(screen.getByRole('tab', { name: 'Piloti' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Costruttori' })).toHaveAttribute('tabindex', '-1')
  })

  it('selects and focuses tabs with the arrow keys, Home and End', async () => {
    render(<Harness />)
    await userEvent.tab()
    expect(screen.getByRole('tab', { name: 'Piloti' })).toHaveFocus()

    await userEvent.keyboard('{ArrowRight}')
    const constructors = screen.getByRole('tab', { name: 'Costruttori' })
    expect(constructors).toHaveFocus()
    expect(constructors).toHaveAttribute('aria-selected', 'true')

    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Piloti' })).toHaveAttribute('aria-selected', 'true')

    await userEvent.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Costruttori' })).toHaveFocus()
    await userEvent.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'Piloti' })).toHaveFocus()
  })
})
