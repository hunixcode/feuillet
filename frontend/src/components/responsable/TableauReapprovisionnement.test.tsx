import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ProduitAReapprovisionner } from '../../types/reappro'
import TableauReapprovisionnement from './TableauReapprovisionnement.tsx'

const ile: ProduitAReapprovisionner = {
  produitId: 'p-1',
  reference: 'LIV-001',
  designation: "L'Île au trésor",
  quantiteVendable: 2,
  quantiteAcheteeOrigine: 10,
  seuilAlerte: 20,
  pourcentageVendu: 80,
  quantiteEnCommande: 6,
}

describe('TableauReapprovisionnement', () => {
  it('montre la part vendue, le stock, le seuil et ce qui est déjà commandé', () => {
    render(<TableauReapprovisionnement produits={[ile]} />)

    const ligne = screen.getByText("L'Île au trésor").closest('tr')
    const cellules = ligne?.querySelectorAll('td') ?? []
    expect(cellules[0]).toHaveTextContent('LIV-001')
    expect(cellules[1]).toHaveTextContent('80 %')
    expect(cellules[1].querySelector('.rapports-part-jauge > span')).toHaveStyle({ width: '80%' })
    expect(cellules[2]).toHaveTextContent('2')
    expect(cellules[3]).toHaveTextContent('10')
    expect(cellules[4]).toHaveTextContent('20 %')
    expect(cellules[5]).toHaveTextContent('6')
  })

  it('explique chaque colonne au survol', () => {
    render(<TableauReapprovisionnement produits={[ile]} />)

    expect(screen.getByRole('columnheader', { name: 'Déjà vendu' })).toBeInTheDocument()
    expect(screen.getByText('En commande', { selector: '.info-terme' })).toHaveAccessibleDescription(
      'Exemplaires déjà commandés au fournisseur et pas encore reçus, pour ne pas commander deux fois.',
    )
  })

  it('signale un article épuisé et sans commande en cours', () => {
    render(
      <TableauReapprovisionnement
        produits={[{ ...ile, quantiteVendable: 0, pourcentageVendu: 100, quantiteEnCommande: 0 }]}
      />,
    )

    const cellules = screen.getByText("L'Île au trésor").closest('tr')?.querySelectorAll('td') ?? []
    expect(cellules[2]).toHaveTextContent('Épuisé')
    expect(cellules[5]).toHaveTextContent('—')
  })

  it('indique quand rien n est à recommander', () => {
    render(<TableauReapprovisionnement produits={[]} />)

    expect(screen.getByText('Aucun article n’est sous son seuil d’alerte.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
