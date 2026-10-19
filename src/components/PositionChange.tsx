interface PositionChangeProps {
  change: number | null
}

/** Positions gained (green) or lost (red) from the starting grid. */
export default function PositionChange({ change }: PositionChangeProps) {
  if (change === null) return <span className="text-subtle">—</span>
  if (change === 0) {
    return (
      <span className="text-muted" aria-label="Nessuna posizione guadagnata o persa">
        =
      </span>
    )
  }
  const gained = change > 0
  const count = Math.abs(change)
  const label = `${gained ? 'Guadagnat' : 'Pers'}${count === 1 ? 'a 1 posizione' : `e ${count} posizioni`}`
  return (
    <span className={gained ? 'text-positive' : 'text-accent'} aria-label={label} title={label}>
      <span aria-hidden="true">
        {gained ? '▲' : '▼'} {count}
      </span>
    </span>
  )
}
