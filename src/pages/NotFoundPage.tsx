import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <section>
      <h1 className="text-2xl font-bold">Pagina non trovata</h1>
      <p className="mt-4 text-muted">L'indirizzo che hai aperto non corrisponde a nessuna pagina della dashboard.</p>
      <Link
        to="/calendario"
        className="mt-4 inline-block font-medium text-accent underline transition-colors duration-150 hover:text-accent-strong"
      >
        Vai al calendario
      </Link>
    </section>
  )
}
