import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Layout from '../Layout.tsx'

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/prova']}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/prova" element={<h1>Pagina di prova</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('Layout', () => {
  it('starts the keyboard order with a link that skips to the content', async () => {
    renderLayout()
    await userEvent.tab()
    const skip = screen.getByRole('link', { name: 'Vai al contenuto' })
    expect(skip).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('main')).toHaveFocus()
  })

  it('shows the theme switch in the header', () => {
    renderLayout()
    expect(screen.getByRole('group', { name: 'Tema' })).toBeInTheDocument()
  })
})
