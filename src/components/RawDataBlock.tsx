import { useQuery } from '@tanstack/react-query'
import { isRateLimitError } from '../api/index.ts'

interface RawDataBlockProps {
  title: string
  queryKey: readonly unknown[]
  queryFn: () => Promise<unknown>
}

function errorMessage(error: unknown): string {
  if (isRateLimitError(error)) {
    const minutes = Math.ceil(error.retryAfterMs / 60_000)
    return `Troppe richieste all'API. Riprova tra circa ${minutes} minut${minutes === 1 ? 'o' : 'i'}.`
  }
  return 'Impossibile caricare i dati. Riprova più tardi.'
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
          {errorMessage(query.error)}
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
