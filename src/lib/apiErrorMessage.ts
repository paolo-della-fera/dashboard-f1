import { isRateLimitError } from '../api/errors.ts'

/** User-facing (Italian) message for an API error. */
export function apiErrorMessage(error: unknown): string {
  if (isRateLimitError(error)) {
    const minutes = Math.max(1, Math.ceil(error.retryAfterMs / 60_000))
    return `Troppe richieste all'API. Riprova tra circa ${minutes} minut${minutes === 1 ? 'o' : 'i'}.`
  }
  return 'Impossibile caricare i dati. Riprova più tardi.'
}
