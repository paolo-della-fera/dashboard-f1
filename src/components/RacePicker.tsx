import { useId } from 'react'
import type { Race } from '../types/jolpica.ts'
import SeasonSelect from './SeasonSelect.tsx'

interface RacePickerProps {
  seasons: number[]
  season: number
  races: Race[]
  round: number
  onSeasonChange: (season: number) => void
  onRoundChange: (round: number) => void
}

/** Season and Grand Prix selectors; only races already run can be picked. */
export default function RacePicker({ seasons, season, races, round, onSeasonChange, onRoundChange }: RacePickerProps) {
  const id = useId()
  const inList = races.some((race) => Number(race.round) === round)
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SeasonSelect seasons={seasons} value={season} onChange={onSeasonChange} />
      {races.length > 0 && (
        <div className="flex items-center gap-2">
          <label htmlFor={id} className="text-sm font-medium text-gray-700">
            Gran Premio
          </label>
          <select
            id={id}
            value={inList ? round : ''}
            onChange={(event) => onRoundChange(Number(event.target.value))}
            className="max-w-56 rounded border border-gray-300 bg-white px-2 py-1 text-sm"
          >
            {!inList && <option value="">—</option>}
            {races.map((race) => (
              <option key={race.round} value={race.round}>
                {race.round}. {race.raceName}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
