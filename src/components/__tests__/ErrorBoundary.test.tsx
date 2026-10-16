import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ErrorBoundary from '../ErrorBoundary.tsx'

function Broken({ fail }: { fail: boolean }) {
  if (fail) throw new Error('boom')
  return <p>Contenuto</p>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React and the boundary both log the caught error.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the children when nothing fails', () => {
    render(
      <ErrorBoundary>
        <Broken fail={false} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Contenuto')).toBeInTheDocument()
  })

  it('shows a message instead of a blank page when a child throws', () => {
    render(
      <ErrorBoundary>
        <Broken fail />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Si è verificato un errore imprevisto.')
    expect(screen.getByRole('button', { name: 'Ricarica la pagina' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Vai al calendario' })).toHaveAttribute('href', '/calendario')
  })

  it('renders the children again when the reset key changes', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="/a">
        <Broken fail />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()

    rerender(
      <ErrorBoundary resetKey="/b">
        <Broken fail={false} />
      </ErrorBoundary>,
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('Contenuto')).toBeInTheDocument()
  })
})
