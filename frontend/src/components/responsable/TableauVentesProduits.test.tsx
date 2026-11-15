import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { LigneRapport } from '../../types/rapport'
import TableauVentesProduits from './TableauVentesProduits.tsx'

function ligne(produitId: string, designation: string, valeurs: Partial<LigneRapport> = {}): LigneRapport {
  return {
    produitId,
    reference: `REF-${produitId}`,
    designation,
    categorie: 'roman',
    quantiteVendue: 0,
    montantVentes: 0,
    quantiteRetournee: 0,
    montantRetours: 0,
    quantiteNette: 0,
    montantNet: 0,
    quantiteRemplacee: 0,
    stockRestant: 5,
    pourcentageVendu: 0,
    ...valeurs,
  }
}

const ile = ligne('p-1', "L'Île au trésor", {
  quantiteVendue: 12,
  montantVentes: 21600,
  quantiteRetournee: 1,
  montantRetours: 1800,
  quantiteNette: 11,
  montantNet: 19800,
})

const carnet = ligne('p-2', 'Carnet ligné A5', {
  quantiteVendue: 10,
  montantVentes: 9500,
  quantiteNette: 10,
  montantNet: 9900,
})

const evolutions = {
  'p-1': [
    { jour: '2026-11-02', quantite: 3, montant: 5850 },
    { jour: '2026-11-03', quantite: 8, montant: 15600 },
  ],
  'p-2': [
    { jour: '2026-11-02', quantite: 4, montant: 3800 },
    { jour: '2026-11-03', quantite: 6, montant: 5700 },
  ],
}

describe('TableauVentesProduits', () => {
  it('détaille les quantités et le montant net de chaque article vendu', () => {
    render(<TableauVentesProduits produits={[ile, carnet]} />)

    const premiere = screen.getByText("L'Île au trésor").closest('tr')
    expect(premiere).toHaveTextContent('REF-p-1')
    expect(premiere?.querySelectorAll('td')[1]).toHaveTextContent('12')
    expect(premiere?.querySelectorAll('td')[2]).toHaveTextContent('1')
    expect(premiere?.querySelectorAll('td')[3]).toHaveTextContent('11')
    expect(premiere).toHaveTextContent('19 800 XPF')
  })

  it('dessine une jauge relative au meilleur article', () => {
    render(<TableauVentesProduits produits={[ile, carnet]} />)

    const jauge = (nom: string) =>
      screen.getByText(nom).closest('tr')?.querySelector('.ventes-produits-jauge > span')
    expect(jauge("L'Île au trésor")).toHaveStyle({ width: '100%' })
    expect(jauge('Carnet ligné A5')).toHaveStyle({ width: '50%' })
  })

  it('garde un article seulement rendu et cache ceux sans activité', () => {
    render(
      <TableauVentesProduits
        produits={[
          ile,
          ligne('p-3', 'Mutismes', { quantiteRetournee: 1, quantiteNette: -1, montantNet: -2300 }),
          ligne('p-4', 'Gomme blanche'),
        ]}
      />,
    )

    expect(screen.getByText('Mutismes')).toBeInTheDocument()
    expect(screen.queryByText('Gomme blanche')).not.toBeInTheDocument()
  })

  it('signale une période sans article vendu', () => {
    render(<TableauVentesProduits produits={[ligne('p-4', 'Gomme blanche')]} />)

    expect(screen.getByText('Aucun article vendu sur la période.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('choisit un article par son titre ou par sa mini-courbe', () => {
    const onSelection = vi.fn()
    render(
      <TableauVentesProduits
        produits={[ile, carnet]}
        evolutions={evolutions}
        selection=""
        onSelection={onSelection}
      />,
    )

    expect(
      screen.getByText('Cliquez sur un article pour afficher sa courbe dans l’évolution ci-dessus.'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: "L'Île au trésor" }))
    fireEvent.click(screen.getByRole('button', { name: 'Afficher la courbe de Carnet ligné A5' }))

    expect(onSelection).toHaveBeenNthCalledWith(1, 'p-1')
    expect(onSelection).toHaveBeenNthCalledWith(2, 'p-2')
  })

  it('met en avant l article choisi sans ouvrir de courbe dans le tableau', () => {
    render(
      <TableauVentesProduits
        produits={[ile, carnet]}
        evolutions={evolutions}
        selection="p-1"
        onSelection={vi.fn()}
      />,
    )

    const titre = screen.getByRole('button', { name: "L'Île au trésor" })
    expect(titre).toHaveAttribute('aria-pressed', 'true')
    expect(titre.closest('tr')).toHaveAttribute('aria-current', 'true')
    expect(titre.closest('tr')).toHaveClass('ventes-produits-choisi')
    expect(screen.getByRole('button', { name: 'Carnet ligné A5' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(3)
  })

  it('explique les colonnes au survol', () => {
    render(<TableauVentesProduits produits={[ile]} evolutions={evolutions} onSelection={vi.fn()} />)

    expect(screen.getByText('Tendance', { selector: '.info-terme' })).toHaveAccessibleDescription(
      /Petite courbe des exemplaires vendus nets/,
    )
    expect(screen.getByText('Net', { selector: '.info-terme' })).toHaveAccessibleDescription(
      'Vendus moins retournés : les exemplaires vraiment partis.',
    )
  })

  it('garde un tableau simple sans évolutions', () => {
    render(<TableauVentesProduits produits={[ile]} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Tendance' })).not.toBeInTheDocument()
  })
})
