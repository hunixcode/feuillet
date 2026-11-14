import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { LigneStock } from '../../types/stock'
import TableauStock from './TableauStock.tsx'

const lignes: LigneStock[] = [
  {
    produitId: 'p-1',
    reference: 'LIV-001',
    designation: "L'Île au trésor",
    quantitePhysique: 8,
    quantiteMiseDeCote: 1,
    quantiteDefectueuse: 1,
    quantiteVendable: 7,
  },
  {
    produitId: 'p-2',
    reference: 'LIV-002',
    designation: 'Casino Royale',
    quantitePhysique: 0,
    quantiteMiseDeCote: 0,
    quantiteDefectueuse: 2,
    quantiteVendable: 0,
  },
]

function ligneDe(designation: string) {
  return screen.getByRole('button', { name: designation }).closest('tr') as HTMLElement
}

describe('TableauStock', () => {
  it('affiche les quantités renvoyées par le serveur', () => {
    render(<TableauStock lignes={lignes} onSelection={vi.fn()} />)

    const cellules = within(ligneDe("L'Île au trésor")).getAllByRole('cell')
    expect(cellules.map((cellule) => cellule.textContent)).toEqual([
      "L'Île au trésorLIV-001",
      '8',
      '1',
      '7',
      '1',
      'Disponible',
    ])
  })

  it('explique chaque colonne au survol', () => {
    render(<TableauStock lignes={lignes} onSelection={vi.fn()} />)

    expect(screen.getByRole('columnheader', { name: 'Vendable' })).toBeInTheDocument()
    expect(screen.getByText('Vendable', { selector: '.info-terme' })).toHaveAccessibleDescription(
      'En rayon moins mis de côté : ce qui peut encore être commandé par les clients.',
    )
    expect(screen.getByText('Défectueux', { selector: '.info-terme' })).toHaveAccessibleDescription(
      /jamais vendables/,
    )
  })

  it('affiche épuisé un article sans vendable même s il a des défectueux', () => {
    render(<TableauStock lignes={lignes} onSelection={vi.fn()} />)

    const ligne = within(ligneDe('Casino Royale'))
    expect(ligne.getByText('Épuisé')).toHaveClass('stock-etat--epuise')
    expect(ligne.queryByText('Disponible')).not.toBeInTheDocument()
  })

  it('transmet l article choisi', () => {
    const onSelection = vi.fn()
    render(<TableauStock lignes={lignes} onSelection={onSelection} />)

    fireEvent.click(screen.getByRole('button', { name: 'Casino Royale' }))

    expect(onSelection).toHaveBeenCalledWith(lignes[1])
  })

  it('signale la ligne sélectionnée', () => {
    render(<TableauStock lignes={lignes} selection="p-2" onSelection={vi.fn()} />)

    expect(ligneDe('Casino Royale')).toHaveAttribute('aria-current', 'true')
    expect(ligneDe("L'Île au trésor")).not.toHaveAttribute('aria-current')
  })
})
