import { Link } from 'react-router-dom'
import type { Produit } from '../../types/produit'
import { formatXPF } from '../../utils/format'
import Couverture from './Couverture.tsx'
import './ProduitCarte.css'

interface ProduitCarteProps {
  produit: Produit
  categorie?: string
}

export default function ProduitCarte({ produit, categorie }: ProduitCarteProps) {
  const sousTitre = produit.auteur ?? produit.marque

  return (
    <Link className="livre" to={`/produits/${produit.id}`}>
      <Couverture produit={produit} />
      <div className="livre-infos">
        {categorie && <span className="livre-categorie">{categorie}</span>}
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
