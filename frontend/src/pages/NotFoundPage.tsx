import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <section>
      <h1>Page introuvable</h1>
      <p>
        Cette page n'existe pas. <Link to="/catalogue">Retour au catalogue</Link>
      </p>
    </section>
  )
}

export default NotFoundPage
