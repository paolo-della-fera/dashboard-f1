import { qualifyingColumns } from '../lib/results.ts'
import type { QualifyingResult } from '../types/jolpica.ts'

interface QualifyingTableProps {
  results: QualifyingResult[]
}

export default function QualifyingTable({ results }: QualifyingTableProps) {
  const columns = qualifyingColumns(results)
  // Before 2006 there was a single session: "Q1" would be misleading.
  const singleSession = columns.length === 1
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-300 text-gray-600">
          <tr>
            <th scope="col" className="px-2 py-2">Pos.</th>
            <th scope="col" className="px-2 py-2">Pilota</th>
            <th scope="col" className="px-2 py-2">Team</th>
            {columns.map((column) => (
              <th key={column} scope="col" className="px-2 py-2">
                {singleSession ? 'Tempo' : column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => (
            <tr key={`${index}-${result.Driver.driverId}`} className="border-b border-gray-200">
              <td className="px-2 py-2 tabular-nums">{result.position}</td>
              <td className="px-2 py-2 font-medium whitespace-nowrap">
                {result.Driver.givenName} {result.Driver.familyName}
              </td>
              <td className="px-2 py-2 whitespace-nowrap">{result.Constructor.name}</td>
              {columns.map((column) => (
                <td key={column} className="px-2 py-2 tabular-nums whitespace-nowrap">
                  {result[column] || <span className="text-gray-400">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
