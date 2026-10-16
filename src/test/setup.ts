import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// Tests must never hit the real API: any unmocked request fails immediately
// with a 4xx status, which the API client does not retry.
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(null, { status: 418, statusText: 'Network disabled in tests' })),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
