import { NavLink } from 'react-router-dom'

const links = [
  { to: '/calendario', label: 'Calendario' },
  { to: '/classifiche', label: 'Classifiche' },
  { to: '/risultati', label: 'Risultati' },
  { to: '/testa-a-testa', label: 'Testa a testa' },
]

export default function NavBar() {
  return (
    <nav aria-label="Navigazione principale">
      <ul className="flex flex-wrap gap-1">
        {links.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              className={({ isActive }) =>
                `block rounded px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-white text-red-700' : 'text-white hover:bg-red-600'
                }`
              }
            >
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
