import type { Progress } from '../api/index.ts'

interface LoadingProgressProps {
  name: string
  progress: Progress | null
}

/** Loading message with the request count, since a first load can take a while. */
export default function LoadingProgress({ name, progress }: LoadingProgressProps) {
  return (
    <div role="status" className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
      <p>
        Caricamento della carriera di {name}… il primo caricamento può richiedere qualche secondo.
      </p>
      {progress && progress.total > 0 && (
        <>
          <p className="mt-2 tabular-nums">
            {name}: {progress.done} di {progress.total} richieste
          </p>
          <progress
            value={progress.done}
            max={progress.total}
            aria-label={`Avanzamento per ${name}`}
            className="mt-1 h-2 w-full accent-red-700"
          />
        </>
      )}
    </div>
  )
}
