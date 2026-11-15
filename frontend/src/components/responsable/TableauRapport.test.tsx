import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { LigneRapport } from '../../types/rapport'
import TableauRapport from './TableauRapport.tsx'

const ile: LigneRapport = {
  produitId: 'p-1',
  reference: 'LIV-001',
  designation: "L'Île au trésor",
  categorie: 'roman',
  quantiteVendue: 4,
  montantVentes: 7200,
  quantiteRetournee: 1,
  montantRetours: 1800,
  quantiteNette: 3,
  montantNet: 5400,
  quantiteRemplacee: 1,
  stockRestant: 6,
  pourcentageVendu: 30,
}

const categories = [{ id: 'roman', libelle: 'Roman' }]

describe('TableauRapport', () => {
  it('sépare ventes, retours et net pour chaque article', () => {
    render(<TableauRapport produits={[ile]} categories={categories} />)

    expect(screen.getAllByRole('columnheader').map((entete) => entete.querySelector('.info-terme')?.firstChild?.textContent)).toEqual([
      'Article',
      'Exemplaires vendus',
      'Ventes brutes',
      'Exemplaires rendus',
      'Montant rendu',
      'Remplacés',
      'Vendus nets',
      'Montant net',
      'En stock à la fin',
      'Part vendue',
    ])
    const cellules = screen.getByText("L'Île au trésor").closest('tr')?.querySelectorAll('td') ?? []
    expect(cellules[0]).toHaveTextContent('LIV-001 · Roman')
    expect(cellules[1]).toHaveTextContent('4')
    expect(cellules[2]).toHaveTextContent('7 200 XPF')
    expect(cellules[3]).toHaveTextContent('1')
    expect(cellules[4]).toHaveTextContent('− 1 800 XPF')
    expect(cellules[5]).toHaveTextContent('1')
    expect(cellules[6]).toHaveTextContent('3')
    expect(cellules[7]).toHaveTextContent('5 400 XPF')
    expect(cellules[8]).toHaveTextContent('6')
    expect(cellules[9]).toHaveTextContent('30 %')
  })

  it('explique chaque colonne au survol', () => {
    render(<TableauRapport produits={[ile]} categories={categories} />)

    expect(screen.getByRole('columnheader', { name: 'Montant net' })).toBeInTheDocument()
    expect(screen.getByText('Montant net', { selector: '.info-terme' })).toHaveAccessibleDescription(
      'Ventes brutes moins montant rendu : ce que l’article a vraiment rapporté.',
    )
    expect(screen.getByText('En stock à la fin', { selector: '.info-terme' })).toHaveAccessibleDescription(
      'Exemplaires physiquement en magasin le dernier jour de la période.',
    )
  })

  it('affiche un tiret sans retour ni quantité achetée connue', () => {
    render(
      <TableauRapport
        produits={[{ ...ile, montantRetours: 0, quantiteRetournee: 0, pourcentageVendu: null }]}
        categories={[]}
      />,
    )

    const cellules = screen.getByText("L'Île au trésor").closest('tr')?.querySelectorAll('td') ?? []
    expect(cellules[0]).toHaveTextContent('LIV-001 · roman')
    expect(cellules[4]).toHaveTextContent('—')
    expect(cellules[9]).toHaveTextContent('—')
  })

  it('indique une période sans activité', () => {
    render(<TableauRapport produits={[]} categories={categories} />)

    expect(screen.getByText('Aucune vente ni retour sur cette période.')).toBeInTheDocument()
  })
})
