import { Link } from 'react-router-dom'
import { useAnnonce } from '../../contexts/useAnnonce'
import { usePanier } from '../../contexts/usePanier'
import type { Produit } from '../../types/produit'
import { COUP_DE_COEUR } from '../../utils/coupDeCoeur'
import { formatXPF } from '../../utils/format'
import Couverture from './Couverture.tsx'

interface ProduitCarteProps {
  produit: Produit
  rang?: number
}

function marque(produit: Produit, epuise: boolean) {
  if (epuise) {
    return <span className="marque-tuile marque-epuise">Épuisé</span>
  }
  if (produit.promotion) {
    return <span className="marque-tuile">−{produit.promotion.remise} %</span>
  }
  if (produit.reference === COUP_DE_COEUR.reference) {
    return <span className="marque-tuile marque-coeur">Coup de cœur</span>
  }
  return null
}

export default function ProduitCarte({ produit, rang }: ProduitCarteProps) {
  const { ajouter } = usePanier()
  const annoncer = useAnnonce()
  const sousTitre = produit.auteur ?? produit.marque
  const epuise = produit.disponibilite === 'epuise'
  const fiche = `/produits/${produit.id}`

  return (
    <div className="produit">
      <div className="produit-visuel">
        <Link className="tuile" to={fiche} tabIndex={-1} aria-hidden="true">
          {marque(produit, epuise)}
          <Couverture produit={produit} />
        </Link>
        {!epuise && (
          <button
            className="ajout-rapide"
            type="button"
            aria-label={`Ajouter ${produit.designation} au panier`}
            onClick={() => {
              ajouter(produit.id, 1)
              annoncer(produit, 1)
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        )}
      </div>
      <Link className={rang ? 'produit-lien produit-classe' : 'produit-lien'} to={fiche}>
        {rang !== undefined && (
          <span className="rang" aria-label={`Numéro ${rang}`}>
            {rang}
          </span>
        )}
        <span className="produit-titre">{produit.designation}</span>
        {sousTitre && <span className="produit-auteur">{sousTitre}</span>}
        <span className="produit-prix">
          {formatXPF(produit.prixApplique)}
          {produit.promotion && (
            <s>
              <span className="visuellement-cache">au lieu de </span>
              {formatXPF(produit.prix)}
            </s>
          )}
        </span>
        {epuise && <span className="produit-etat">Disponible sur demande</span>}
      </Link>
    </div>
  )
}
