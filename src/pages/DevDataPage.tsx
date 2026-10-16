import { getDriverStandings, getSchedule } from '../api/index.ts'
import RawDataBlock from '../components/RawDataBlock.tsx'

/** Hidden debug page: raw API data for the current season. */
export default function DevDataPage() {
  return (
    <section>
      <h1 className="text-2xl font-bold">Dati grezzi (prova)</h1>
      <p className="mt-2 text-gray-600">Pagina di verifica del livello dati, stagione in corso.</p>
      <RawDataBlock
        title="Calendario"
        queryKey={['dev', 'schedule', 'current']}
        queryFn={() => getSchedule('current')}
      />
      <RawDataBlock
        title="Classifica piloti"
        queryKey={['dev', 'driverStandings', 'current']}
        queryFn={() => getDriverStandings('current')}
      />
    </section>
  )
}
