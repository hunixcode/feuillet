import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Segment from './Segment.tsx'

interface AccesCadreProps {
  children: ReactNode
}

export default function AccesCadre({ children }: AccesCadreProps) {
  const location = useLocation()
  const actif = location.pathname === '/inscription' ? 'inscription' : 'connexion'

  return (
    <div className="acces">
      <div className="acces-photo">
        <img src="/images/etagere.jpg" alt="Une main choisit un livre sur une étagère" />
        <p className="acces-marque" aria-hidden="true">
          Feuillet
        </p>
      </div>
      <div className="acces-forme">
        <div className="acces-carte">
          <Segment
            libelle="Choisir entre connexion et création de compte"
            valeur={actif}
            options={[
              { valeur: 'connexion', libelle: 'Se connecter', to: '/connexion', state: location.state },
              {
                valeur: 'inscription',
                libelle: 'Créer un compte',
                to: '/inscription',
                state: location.state,
              },
            ]}
          />
          <div className="panneau" key={actif}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
