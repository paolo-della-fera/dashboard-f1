import { useId } from 'react'

interface SeasonSelectProps {
  seasons: number[]
  value: number
  onChange: (season: number) => void
}

export default function SeasonSelect({ seasons, value, onChange }: SeasonSelectProps) {
  const id = useId()
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        Stagione
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
      >
        {seasons.map((season) => (
          <option key={season} value={season}>
            {season}
          </option>
        ))}
      </select>
    </div>
  )
}
