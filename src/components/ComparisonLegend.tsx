interface ComparisonLegendProps {
  items: { name: string; color: string }[]
}

export default function ComparisonLegend({ items }: ComparisonLegendProps) {
  return (
    <ul aria-label="Legenda" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
      {items.map((item) => (
        <li key={item.name} className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />
          {item.name}
        </li>
      ))}
    </ul>
  )
}
