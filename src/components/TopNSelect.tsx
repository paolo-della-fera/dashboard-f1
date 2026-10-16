import { useId } from 'react'

interface TopNSelectProps {
  options: readonly number[]
  value: number
  onChange: (n: number) => void
}

export default function TopNSelect({ options, value, onChange }: TopNSelectProps) {
  const id = useId()
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        Mostra i primi
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}
