import { motion } from 'motion/react'
import { appear } from '../lib/motion.ts'
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
            {/* Phones (360px): team goes under the driver. */}
            <th scope="col" className="hidden px-2 py-2 sm:table-cell">Team</th>
            {columns.map((column) => (
              <th key={column} scope="col" className="px-2 py-2">
                {singleSession ? 'Tempo' : column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => (
            <motion.tr key={`${index}-${result.Driver.driverId}`} className="border-b border-gray-200" {...appear(index)}>
              <td className="px-2 py-2 tabular-nums">{result.position}</td>
              <td className="px-2 py-2 font-medium sm:whitespace-nowrap">
                {result.Driver.givenName} {result.Driver.familyName}
                <span className="block text-xs font-normal text-gray-500 sm:hidden">{result.Constructor.name}</span>
              </td>
              <td className="hidden px-2 py-2 whitespace-nowrap sm:table-cell">{result.Constructor.name}</td>
              {columns.map((column) => (
                <td key={column} className="px-2 py-2 tabular-nums whitespace-nowrap">
                  {result[column] || <span className="text-gray-400">—</span>}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
