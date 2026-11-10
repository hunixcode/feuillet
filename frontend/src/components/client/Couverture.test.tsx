import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Produit } from '../../types/produit'
import Couverture from './Couverture.tsx'

const prince: Produit = {
  id: 'p-1',
  reference: 'LIV-001',
  designation: 'Le Petit Prince',
  type: 'livre',
  categorie: 'jeunesse',
  prix: 1200,
  tauxTva: 5,
  archive: false,
  auteur: 'Antoine de Saint-Exupéry',
  isbn: '9782070612758',
  prixApplique: 1200,
}

const asterix: Produit = {
  ...prince,
  id: 'p-2',
  designation: 'Astérix le Gaulois',
  isbn: '9782012101333',
}

const ile: Produit = {
  ...prince,
  id: 'p-3',
  designation: 'L\'Île au trésor',
  isbn: undefined,
}

describe('couverture', () => {
  it('affiche la vraie couverture d un livre avec ISBN', () => {
    const { container } = render(<Couverture produit={prince} />)

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://covers.openlibrary.org/b/isbn/9782070612758-L.jpg?default=false',
    )
  })

  it('garde la couverture dessinée si le livre n a pas d ISBN', () => {
    const { container } = render(<Couverture produit={ile} />)

    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(screen.getByText('L')).toBeInTheDocument()
  })

  it('revient à la couverture dessinée si Open Library n a pas d image', () => {
    const { container } = render(<Couverture produit={prince} />)

    fireEvent.error(container.querySelector('img') as HTMLImageElement)

    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(screen.getByText('Le Petit Prince')).toBeInTheDocument()
  })

  it('cherche à nouveau l image quand on passe à un autre livre', () => {
    const { container, rerender } = render(<Couverture produit={prince} />)
    fireEvent.error(container.querySelector('img') as HTMLImageElement)

    rerender(<Couverture produit={asterix} />)

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://covers.openlibrary.org/b/isbn/9782012101333-L.jpg?default=false',
    )
  })
})
