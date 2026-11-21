import { Link } from 'react-router-dom'
import type { Produit } from '../../types/produit'
import { formatXPF } from '../../utils/format'
import ChoixQuantite from './ChoixQuantite.tsx'
import Couverture from './Couverture.tsx'

interface LignePanierProps {
  produit: Produit | null
  quantite: number
  montant?: number
  indisponible?: boolean
  onQuantite: (quantite: number) => void
  onRetirer: () => void
}

export default function LignePanier({
  produit,
  quantite,
  montant,
  indisponible = false,
  onQuantite,
  onRetirer,
}: LignePanierProps) {
  if (!produit) {
    return (
      <li className="ligne ligne-probleme">
        <span className="tuile tuile-vide" aria-hidden="true" />
        <div>
          <p className="ligne-titre">Article retiré du catalogue</p>
          <p className="ligne-message">Cet article n'est plus vendu : retirez-le de votre panier.</p>
          <div className="ligne-actions">
            <button
              type="button"
              className="retirer"
              aria-label="Retirer l'article retiré du catalogue"
              onClick={onRetirer}
            >
              Retirer
            </button>
          </div>
        </div>
      </li>
    )
  }

  const epuise = indisponible && produit.disponibilite === 'epuise'
  const sousTitre = produit.auteur ?? produit.marque
  const fiche = `/produits/${produit.id}`

  return (
    <li className={indisponible ? 'ligne ligne-probleme' : 'ligne'}>
      <Link className="tuile" to={fiche} tabIndex={-1} aria-hidden="true">
        <Couverture produit={produit} />
      </Link>
      <div>
        <Link className="ligne-titre" to={fiche}>
          {produit.designation}
        </Link>
        {sousTitre && <p className="ligne-auteur">{sousTitre}</p>}
        <p className="ligne-unitaire">
          {formatXPF(produit.prixApplique)} l'unité
          {produit.promotion && (
            <>
              , au lieu de <s>{formatXPF(produit.prix)}</s>
            </>
          )}
        </p>
        {epuise && (
          <p className="ligne-message">Cet article est épuisé : retirez-le pour pouvoir commander.</p>
        )}
        {!epuise && indisponible && (
          <p className="ligne-message">
            Cette quantité n'est plus disponible : réduisez-la ou retirez l'article.
          </p>
        )}
        <div className="ligne-actions">
          <ChoixQuantite
            petit
            valeur={quantite}
            onChange={onQuantite}
            libelle={`Quantité de ${produit.designation}`}
          />
          <button
            type="button"
            className="retirer"
            aria-label={`Retirer ${produit.designation} du panier`}
            onClick={onRetirer}
          >
            Retirer
          </button>
        </div>
      </div>
      {montant !== undefined && <p className="ligne-total">{formatXPF(montant)}</p>}
    </li>
  )
}
