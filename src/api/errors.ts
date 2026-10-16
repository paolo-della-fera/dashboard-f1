export interface ApiErrorOptions {
  url?: string
  status?: number
  rateLimited?: boolean
  retryAfterMs?: number
  cause?: unknown
}

export class ApiError extends Error {
  readonly url?: string
  readonly status?: number
  /** True when the request was refused because of the API rate limits. */
  readonly rateLimited: boolean
  /** How long to wait before trying again, when known. */
  readonly retryAfterMs?: number

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message, { cause: options.cause })
    this.name = 'ApiError'
    this.url = options.url
    this.status = options.status
    this.rateLimited = options.rateLimited ?? false
    this.retryAfterMs = options.retryAfterMs
  }
}

export function isRateLimitError(
  error: unknown,
): error is ApiError & { rateLimited: true; retryAfterMs: number } {
  return error instanceof ApiError && error.rateLimited && error.retryAfterMs !== undefined
}
