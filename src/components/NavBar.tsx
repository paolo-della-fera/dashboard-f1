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
      {/* Phones: four equal columns in one row; every link is at least 44px tall. */}
      <ul className="grid grid-cols-4 gap-1 sm:flex sm:flex-wrap">
        {links.map((link) => (
          <li key={link.to} className="flex">
            <NavLink
              to={link.to}
              className={({ isActive }) =>
                `flex min-h-11 w-full items-center justify-center rounded px-1 py-1 text-center text-xs leading-tight font-medium transition-colors duration-150 sm:px-3 sm:text-sm ${
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
