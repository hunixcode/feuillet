import { useState } from 'react'
import type { TypeProduit } from '../../types/produit'
import IconeAdmin from './IconeAdmin.tsx'

interface VignetteProps {
  isbn?: string
  type?: TypeProduit
  classe?: string
  nu?: boolean
}

function icone(type?: TypeProduit): string {
  if (type === 'papeterie') return 'carnet'
  if (type === 'magazine') return 'magazine'
  return 'livre'
}

export default function Vignette({ isbn, type, classe = 'vignette', nu = false }: VignetteProps) {
  const [isbnSansImage, setIsbnSansImage] = useState<string>()
  const avecImage = isbn !== undefined && isbn !== isbnSansImage

  const contenu = avecImage ? (
    <img
      src={`https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`}
      alt=""
      loading="lazy"
      onError={() => setIsbnSansImage(isbn)}
    />
  ) : (
    <IconeAdmin nom={icone(type)} epaisseur={1.5} />
  )

  return nu ? contenu : <span className={classe}>{contenu}</span>
}
