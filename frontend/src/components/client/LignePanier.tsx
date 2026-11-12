import { Link } from 'react-router-dom'
import type { Produit } from '../../types/produit'
import { formatXPF } from '../../utils/format'
import ChoixQuantite from './ChoixQuantite.tsx'
import Couverture from './Couverture.tsx'
import './LignePanier.css'

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
      <li className="ligne-probleme">
        <div className="vignette vignette-vide" aria-hidden="true" />
        <div className="ligne-infos">
          <span className="livre-titre">Article retiré du catalogue</span>
          <p className="ligne-message">Cet article n'est plus vendu : retirez-le de votre panier.</p>
        </div>
        <span />
        <div className="ligne-prix">
          <button
            type="button"
            className="lien-action"
            aria-label="Retirer l'article retiré du catalogue"
            onClick={onRetirer}
          >
            Retirer
          </button>
        </div>
      </li>
    )
  }

  const epuise = produit.disponibilite === 'epuise'
  const sousTitre = produit.auteur ?? produit.marque

  return (
    <li className={epuise || indisponible ? 'ligne-probleme' : undefined}>
      <div className="vignette">
        <Couverture produit={produit} />
      </div>
      <div className="ligne-infos">
        <Link className="livre-titre" to={`/produits/${produit.id}`}>
          {produit.designation}
        </Link>
        <span className="livre-auteur">
          {sousTitre ? `${sousTitre}, ` : ''}
          {formatXPF(produit.prixApplique)} l'unité
          {produit.promotion && ` au lieu de ${formatXPF(produit.prix)}`}
        </span>
        {epuise && (
          <p className="ligne-message">Cet article est épuisé : retirez-le pour pouvoir commander.</p>
        )}
        {!epuise && indisponible && (
          <p className="ligne-message">
            Cette quantité n'est plus disponible : réduisez-la ou retirez l'article.
          </p>
        )}
      </div>
      <ChoixQuantite
        valeur={quantite}
        onChange={onQuantite}
        libelle={`Quantité de ${produit.designation}`}
      />
      <div className="ligne-prix">
        {montant !== undefined && <span className="ligne-montant">{formatXPF(montant)}</span>}
        <button
          type="button"
          className="lien-action"
          aria-label={`Retirer ${produit.designation} du panier`}
          onClick={onRetirer}
        >
          Retirer
        </button>
      </div>
    </li>
  )
}
