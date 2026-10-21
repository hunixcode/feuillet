import { Link } from 'react-router-dom'
import type { Produit } from '../../types/produit'
import { formatXPF } from '../../utils/format'
import './ProduitCarte.css'

interface ProduitCarteProps {
  produit: Produit
}

export default function ProduitCarte({ produit }: ProduitCarteProps) {
  const sousTitre = produit.auteur ?? produit.marque

  return (
    <Link className="livre" to={`/produits/${produit.id}`}>
      <div className={`couverture couverture-${produit.type}`} aria-hidden="true">
        <span className="couv-lettre">{produit.designation.charAt(0)}</span>
        <span className="couv-titre">{produit.designation}</span>
        {sousTitre && <span className="couv-auteur">{sousTitre}</span>}
      </div>
      <div className="livre-infos">
        <span className="livre-titre">{produit.designation}</span>
        {sousTitre && <span className="livre-auteur">{sousTitre}</span>}
        <span className="livre-prix">
          <strong>{formatXPF(produit.prixApplique)}</strong>
          {produit.promotion && (
            <>
              <s>
                <span className="visuellement-cache">au lieu de </span>
                {formatXPF(produit.prix)}
              </s>
              <span className="promo">−{produit.promotion.remise} %</span>
            </>
          )}
        </span>
      </div>
    </Link>
  )
}
