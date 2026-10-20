import { Link } from 'react-router-dom'
import './NotFoundPage.css'

function NotFoundPage() {
  return (
    <section className="introuvable">
      <p className="introuvable-code" aria-hidden="true">
        404
      </p>
      <h1>Page introuvable</h1>
      <p>L'adresse est peut-être incorrecte, ou la page a été déplacée.</p>
      <Link className="common-button common-button--primary" to="/catalogue">
        Retour au catalogue
      </Link>
    </section>
  )
}

export default NotFoundPage
