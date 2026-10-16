import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.tsx'
import CalendarPage from './pages/CalendarPage.tsx'
import StandingsPage from './pages/StandingsPage.tsx'
import ResultsPage from './pages/ResultsPage.tsx'
import HeadToHeadPage from './pages/HeadToHeadPage.tsx'
import DevDataPage from './pages/DevDataPage.tsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/calendario" replace />} />
        <Route path="calendario" element={<CalendarPage />} />
        <Route path="classifiche" element={<StandingsPage />} />
        <Route path="risultati" element={<ResultsPage />} />
        {/* Single Grand Prix page: content comes in phase 4. */}
        <Route path="risultati/:season/:round" element={<ResultsPage />} />
        <Route path="testa-a-testa" element={<HeadToHeadPage />} />
        <Route path="dev/dati" element={<DevDataPage />} />
      </Route>
    </Routes>
  )
}
