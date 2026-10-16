import { useQuery } from '@tanstack/react-query'
import { apiErrorMessage } from '../lib/apiErrorMessage.ts'

interface RawDataBlockProps {
  title: string
  queryKey: readonly unknown[]
  queryFn: () => Promise<unknown>
}

/** Shows the raw JSON returned by an API function (debug only). */
export default function RawDataBlock({ title, queryKey, queryFn }: RawDataBlockProps) {
  const query = useQuery({ queryKey, queryFn, retry: false })

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {query.isPending && <p className="mt-2 text-gray-600">Caricamento…</p>}
      {query.isError && (
        <p role="alert" className="mt-2 text-red-700">
          {apiErrorMessage(query.error)}
        </p>
      )}
      {query.isSuccess && (
        <pre className="mt-2 max-h-96 overflow-auto rounded bg-gray-900 p-3 text-xs text-gray-100">
          {JSON.stringify(query.data, null, 2)}
        </pre>
      )}
    </section>
  )
}
