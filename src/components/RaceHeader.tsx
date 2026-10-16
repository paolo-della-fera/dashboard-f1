import { formatRaceDate } from '../lib/calendar.ts'
import type { Race } from '../types/jolpica.ts'

interface RaceHeaderProps {
  race: Race
}

export default function RaceHeader({ race }: RaceHeaderProps) {
  const { circuitName, Location } = race.Circuit
  return (
    <header className="mt-4">
      <p className="text-sm text-gray-600">
        Stagione {race.season} · Round {race.round}
      </p>
      <h2 className="text-xl font-semibold">{race.raceName}</h2>
      <p className="text-sm text-gray-700">
        {circuitName} · {Location.locality}, {Location.country} · {formatRaceDate(race)}
      </p>
    </header>
  )
}
