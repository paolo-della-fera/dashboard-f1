import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { createQueryClient } from './hooks/queryClient.ts'
import './index.css'

const queryClient = createQueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* "Reduce motion" from the system: Motion drops movement, keeping at most a fade. */}
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          {/* Last resort for errors in the layout itself; pages have their own boundary. */}
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </BrowserRouter>
      </MotionConfig>
    </QueryClientProvider>
  </StrictMode>,
)
