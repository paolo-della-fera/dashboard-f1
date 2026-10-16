import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <section>
      <h1 className="text-2xl font-bold">Pagina non trovata</h1>
      <p className="mt-4 text-gray-600">L'indirizzo che hai aperto non corrisponde a nessuna pagina della dashboard.</p>
      <Link
        to="/calendario"
        className="mt-4 inline-block font-medium text-red-700 underline transition-colors duration-150 hover:text-red-900"
      >
        Vai al calendario
      </Link>
    </section>
  )
}
