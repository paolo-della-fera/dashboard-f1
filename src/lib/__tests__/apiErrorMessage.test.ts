import { describe, expect, it } from 'vitest'
import { ApiError } from '../../api/errors.ts'
import { apiErrorMessage } from '../apiErrorMessage.ts'

describe('apiErrorMessage', () => {
  it('tells how long to wait when rate limited', () => {
    const error = new ApiError('limit', { rateLimited: true, retryAfterMs: 5 * 60_000 })
    expect(apiErrorMessage(error)).toMatch(/Riprova tra circa 5 minuti/)
  })

  it('uses the singular for one minute, rounding up short waits', () => {
    const error = new ApiError('limit', { rateLimited: true, retryAfterMs: 20_000 })
    expect(apiErrorMessage(error)).toMatch(/Riprova tra circa 1 minuto\./)
  })

  it('falls back to a generic message', () => {
    expect(apiErrorMessage(new ApiError('boom', { status: 500 }))).toMatch(/Impossibile caricare i dati/)
    expect(apiErrorMessage(new Error('x'))).toMatch(/Impossibile caricare i dati/)
  })
})
