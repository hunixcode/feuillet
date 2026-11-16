import { useState } from 'react'
import type { Produit } from '../../types/produit'
import './Couverture.css'

interface CouvertureProps {
  produit: Produit
}

export default function Couverture({ produit }: CouvertureProps) {
  const [isbnSansImage, setIsbnSansImage] = useState<string>()
  const sousTitre = produit.auteur ?? produit.marque
  const avecImage = produit.isbn !== undefined && produit.isbn !== isbnSansImage

  return (
    <div className={`couverture couverture-${produit.type}`} aria-hidden="true">
      <span className="couv-lettre">{produit.designation.charAt(0)}</span>
      <span className="couv-titre">{produit.designation}</span>
      {sousTitre && <span className="couv-auteur">{sousTitre}</span>}
      {avecImage && (
        <img
          className="couv-image"
          src={`https://covers.openlibrary.org/b/isbn/${produit.isbn}-L.jpg?default=false`}
          alt=""
          loading="lazy"
          onError={() => setIsbnSansImage(produit.isbn)}
        />
      )}
    </div>
  )
}
