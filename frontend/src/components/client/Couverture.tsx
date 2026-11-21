import { useState } from 'react'
import type { Produit } from '../../types/produit'
import './Couverture.css'

interface CouvertureProps {
  produit: Pick<Produit, 'designation' | 'type' | 'isbn' | 'auteur' | 'marque'>
}

const icones = {
  livre: (
    <>
      <path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" />
      <path d="M5 17a3 3 0 0 1 3-3h10" />
    </>
  ),
  magazine: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </>
  ),
  papeterie: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 3v18M12 8h4M12 12h4" />
    </>
  ),
}

export default function Couverture({ produit }: CouvertureProps) {
  const [isbnSansImage, setIsbnSansImage] = useState<string>()
  const [isbnCharge, setIsbnCharge] = useState<string>()
  const sousTitre = produit.auteur ?? produit.marque
  const avecImage = produit.isbn !== undefined && produit.isbn !== isbnSansImage

  return (
    <div className={`couverture couverture-${produit.type}`} aria-hidden="true">
      <span className="couv-lettre">{produit.designation.charAt(0)}</span>
      <span className="couv-titre">{produit.designation}</span>
      {sousTitre && <span className="couv-auteur">{sousTitre}</span>}
      {!(avecImage && isbnCharge === produit.isbn) && (
        <svg
          className="couv-icone"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {icones[produit.type]}
        </svg>
      )}
      {avecImage && (
        <img
          className="couv-image"
          src={`https://covers.openlibrary.org/b/isbn/${produit.isbn}-L.jpg?default=false`}
          alt=""
          loading="lazy"
          onLoad={() => setIsbnCharge(produit.isbn)}
          onError={() => setIsbnSansImage(produit.isbn)}
        />
      )}
    </div>
  )
}
