import { Link } from 'react-router-dom'
import './NotFoundPage.css'

interface NotFoundPageProps {
  retour?: { to: string; label: string }
}

function NotFoundPage({ retour = { to: '/catalogue', label: 'Retour au catalogue' } }: NotFoundPageProps) {
  return (
    <section className="introuvable">
      <p className="introuvable-code" aria-hidden="true">
        404
      </p>
      <h1>Page introuvable</h1>
      <p>L'adresse est peut-être incorrecte, ou la page a été déplacée.</p>
      <Link className="common-button common-button--primary" to={retour.to}>
        {retour.label}
      </Link>
    </section>
  )
}

export default NotFoundPage
