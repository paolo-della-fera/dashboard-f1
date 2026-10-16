import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import ErrorBoundary from './ErrorBoundary.tsx'
import NavBar from './NavBar.tsx'
import PageTransition from './PageTransition.tsx'

export default function Layout() {
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-red-700 text-white shadow">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
          <span className="text-xl font-bold">Dashboard F1</span>
          <NavBar />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <ErrorBoundary resetKey={pathname}>
          {/* Outside the transition, so the fade starts when the page chunk has arrived. */}
          <Suspense fallback={<p className="text-gray-600">Caricamento…</p>}>
            <PageTransition>
              <Outlet />
            </PageTransition>
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  )
}
