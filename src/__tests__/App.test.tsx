import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import App from '../App.tsx'

function renderApp(path = '/') {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('App', () => {
  it('shows the four navigation links', () => {
    renderApp()
    const nav = screen.getByRole('navigation', { name: 'Navigazione principale' })
    for (const label of ['Calendario', 'Classifiche', 'Risultati', 'Testa a testa']) {
      expect(nav).toContainElement(screen.getByRole('link', { name: label }))
    }
  })

  it('redirects the root path to the calendar', async () => {
    renderApp('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Calendario' })).toBeInTheDocument()
  })

  it('navigates between sections', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('link', { name: 'Classifiche' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Classifiche' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Testa a testa' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Testa a testa' })).toBeInTheDocument()
  })

  it('shows the 404 page for an unknown address, keeping the navigation', async () => {
    const user = userEvent.setup()
    renderApp('/pagina-che-non-esiste')

    expect(screen.getByRole('heading', { level: 1, name: 'Pagina non trovata' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Navigazione principale' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Vai al calendario' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Calendario' })).toBeInTheDocument()
  })

  it('serves the raw data page in development', async () => {
    renderApp('/dev/dati')
    expect(screen.queryByRole('heading', { name: 'Pagina non trovata' })).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
  })
})
