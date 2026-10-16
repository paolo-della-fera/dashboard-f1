import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.tsx'
import LatestResultsRedirect from './pages/LatestResultsRedirect.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'

// Pages are split into their own chunks (Recharts only loads with the pages that chart).
const CalendarPage = lazy(() => import('./pages/CalendarPage.tsx'))
const StandingsPage = lazy(() => import('./pages/StandingsPage.tsx'))
const ResultsPage = lazy(() => import('./pages/ResultsPage.tsx'))
const HeadToHeadPage = lazy(() => import('./pages/HeadToHeadPage.tsx'))
// Development only: in production the condition is `false` and the chunk is never built.
const DevDataPage = import.meta.env.DEV ? lazy(() => import('./pages/DevDataPage.tsx')) : null

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/calendario" replace />} />
        <Route path="calendario" element={<CalendarPage />} />
        <Route path="classifiche" element={<StandingsPage />} />
        <Route path="risultati" element={<LatestResultsRedirect />} />
        <Route path="risultati/:season/:round" element={<ResultsPage />} />
        <Route path="testa-a-testa" element={<HeadToHeadPage />} />
        {DevDataPage && <Route path="dev/dati" element={<DevDataPage />} />}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
