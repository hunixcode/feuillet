import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import GraphiqueVentes, { type VenteDuJour } from './GraphiqueVentes.tsx'

const ventes: VenteDuJour[] = [
  { jour: '2026-11-02', net: 24300 },
  { jour: '2026-11-03', net: 55100 },
  { jour: '2026-11-04', net: 0 },
]

function jour(nom: string) {
  return screen.getByRole('button', { name: new RegExp(nom) })
}

function barre(nom: string) {
  return jour(nom).querySelector('.graphique-ventes-barre')
}

describe('GraphiqueVentes', () => {
  it('donne pour chaque jour sa date et son montant', () => {
    render(<GraphiqueVentes ventes={ventes} selection="" onSelection={vi.fn()} />)

    expect(screen.getByRole('list', { name: 'Ventes nettes par jour' })).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(3)
    expect(jour('lun. 2 nov.')).toHaveTextContent('24 300 XPF')
  })

  it('dimensionne les barres par rapport au jour le plus fort', () => {
    render(<GraphiqueVentes ventes={ventes} selection="" onSelection={vi.fn()} />)

    expect(barre('mar. 3 nov.')).toHaveStyle({ height: '100%' })
    expect(barre('mer. 4 nov.')).toHaveStyle({ height: '0%' })
    expect(jour('mar. 3 nov.')).toHaveClass('graphique-ventes-jour--fort')
  })

  it('ne dessine pas de barres négatives', () => {
    render(
      <GraphiqueVentes
        ventes={[...ventes, { jour: '2026-11-05', net: -1800 }]}
        selection=""
        onSelection={vi.fn()}
      />,
    )

    expect(barre('jeu. 5 nov.')).toHaveStyle({ height: '0%' })
  })

  it('choisit un jour au clic', () => {
    const onSelection = vi.fn()
    render(<GraphiqueVentes ventes={ventes} selection="" onSelection={onSelection} />)

    fireEvent.click(jour('lun. 2 nov.'))

    expect(onSelection).toHaveBeenCalledWith('2026-11-02')
  })

  it('marque le jour choisi et le désélectionne au second clic', () => {
    const onSelection = vi.fn()
    render(<GraphiqueVentes ventes={ventes} selection="2026-11-02" onSelection={onSelection} />)

    expect(jour('lun. 2 nov.')).toHaveAttribute('aria-pressed', 'true')
    expect(jour('mar. 3 nov.')).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(jour('lun. 2 nov.'))

    expect(onSelection).toHaveBeenCalledWith('')
  })

  it('signale une semaine sans vente', () => {
    render(
      <GraphiqueVentes ventes={[{ jour: '2026-11-02', net: 0 }]} selection="" onSelection={vi.fn()} />,
    )

    expect(screen.getByText('Aucune vente sur la période.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})
