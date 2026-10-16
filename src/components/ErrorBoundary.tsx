import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  /** When this changes (e.g. the path), a caught error is cleared and the children render again. */
  resetKey?: string
}

interface ErrorBoundaryState {
  error: unknown
  resetKey: string | undefined
}

/**
 * Shows a message instead of a blank page when rendering fails, including a
 * page chunk that cannot be downloaded. A class because React has no hook for
 * error boundaries: the only exception to function components in the project.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, resetKey: this.props.resetKey }

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    return { error: error ?? new Error('Unknown error') }
  }

  static getDerivedStateFromProps(props: ErrorBoundaryProps, state: ErrorBoundaryState): Partial<ErrorBoundaryState> | null {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Rendering error', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="rounded border border-red-200 bg-white p-4">
        <p className="font-medium text-red-700">Si è verificato un errore imprevisto.</p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded bg-red-700 px-3 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-red-800"
          >
            Ricarica la pagina
          </button>
          {/* Plain link: it also works when the router itself is what failed. */}
          <a href="/calendario" className="text-sm font-medium text-red-700 underline hover:text-red-900">
            Vai al calendario
          </a>
        </div>
      </div>
    )
  }
}
