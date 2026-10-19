import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import ErrorBoundary from './ErrorBoundary.tsx'
import NavBar from './NavBar.tsx'
import PageTransition from './PageTransition.tsx'
import ThemeToggle from './ThemeToggle.tsx'

const MAIN_ID = 'contenuto'

export default function Layout() {
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen bg-page text-fg">
      {/* Moves focus instead of changing the URL hash, which the router would treat as a navigation. */}
      <a
        href={`#${MAIN_ID}`}
        onClick={(event) => {
          event.preventDefault()
          document.getElementById(MAIN_ID)?.focus()
        }}
        className="sr-only rounded bg-surface px-3 py-2 font-medium text-accent focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        Vai al contenuto
      </a>
      {/* Same red in both themes; focus rings are white on it. */}
      <header className="bg-red-700 text-white shadow [--focus:var(--color-white)]">
        {/* Phones: title and theme switch on the first row, navigation below. From sm: one row. */}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <span className="mr-auto text-xl font-bold">Dashboard F1</span>
          <div className="sm:order-last">
            <ThemeToggle />
          </div>
          <div className="w-full sm:w-auto">
            <NavBar />
          </div>
        </div>
      </header>
      <main id={MAIN_ID} tabIndex={-1} className="mx-auto max-w-6xl px-4 py-6 focus:outline-none">
        <ErrorBoundary resetKey={pathname}>
          {/* Outside the transition, so the fade starts when the page chunk has arrived. */}
          <Suspense fallback={<p className="text-muted">Caricamento…</p>}>
            <PageTransition>
              <Outlet />
            </PageTransition>
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  )
}
