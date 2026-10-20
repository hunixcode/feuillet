import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import './AccesCadre.css'

interface AccesCadreProps {
  children: ReactNode
}

export default function AccesCadre({ children }: AccesCadreProps) {
  return (
    <div className="acces">
      <div className="acces-visuel">
        <Link className="client-logo" to="/catalogue">
          Feuillet
        </Link>
        <figure>
          <blockquote className="citation">
            Je n’ai jamais eu de chagrin qu’une heure de lecture ne m’ait ôté.
          </blockquote>
          <figcaption className="citation-auteur">Montesquieu</figcaption>
        </figure>
        <p className="aide">Librairie indépendante à Papeete.</p>
      </div>
      <main className="acces-formulaire">{children}</main>
    </div>
  )
}
