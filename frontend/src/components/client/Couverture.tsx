import type { Produit } from '../../types/produit'
import './Couverture.css'

interface CouvertureProps {
  produit: Produit
}

export default function Couverture({ produit }: CouvertureProps) {
  const sousTitre = produit.auteur ?? produit.marque

  return (
    <div className={`couverture couverture-${produit.type}`} aria-hidden="true">
      <span className="couv-lettre">{produit.designation.charAt(0)}</span>
      <span className="couv-titre">{produit.designation}</span>
      {sousTitre && <span className="couv-auteur">{sousTitre}</span>}
    </div>
  )
}
