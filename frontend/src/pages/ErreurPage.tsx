import { Link } from 'react-router-dom'
import Button from '../components/common/Button.tsx'
import './NotFoundPage.css'
import './ErreurPage.css'

function ErreurPage() {
  return (
    <main className="erreur-page">
      <title>Erreur · Feuillet</title>
      <section className="introuvable">
        <p className="introuvable-code" aria-hidden="true">
          Oups
        </p>
        <h1>Une erreur est survenue</h1>
        <p>La page n'a pas pu s'afficher. Réessayez, ou revenez au catalogue.</p>
        <div className="erreur-actions">
          <Button onClick={() => window.location.reload()}>Réessayer</Button>
          <Link className="common-button common-button--secondary" to="/catalogue">
            Retour au catalogue
          </Link>
        </div>
      </section>
    </main>
  )
}

export default ErreurPage
