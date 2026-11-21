import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { LigneStock, Mouvement } from '../../types/stock'
import JournalMouvements from './JournalMouvements.tsx'

const articles: LigneStock[] = [
  {
    produitId: 'p-1',
    reference: 'LIV-001',
    designation: "L'Île au trésor",
    quantitePhysique: 10,
    quantiteMiseDeCote: 0,
    quantiteDefectueuse: 0,
    quantiteVendable: 10,
  },
  {
    produitId: 'p-2',
    reference: 'LIV-002',
    designation: 'Casino Royale',
    quantitePhysique: 0,
    quantiteMiseDeCote: 0,
    quantiteDefectueuse: 0,
    quantiteVendable: 0,
  },
]

const mouvements: Mouvement[] = [
  {
    id: 'm-2',
    produitId: 'p-1',
    date: '2026-10-22T20:00:00.000Z',
    type: 'ajustement',
    quantite: -2,
    motif: 'Comptage annuel',
    operateur: 'responsable',
    quantiteAvant: 12,
    quantiteApres: 10,
  },
  {
    id: 'm-1',
    produitId: 'p-2',
    date: '2026-10-21T01:15:00.000Z',
    type: 'vente',
    quantite: -1,
    motif: 'Commande en ligne C-0087',
    operateur: 'client',
  },
]

function cellulesDe(motif: string) {
  const ligne = screen.getByText(motif).closest('tr') as HTMLElement
  return within(ligne)
    .getAllByRole('cell')
    .map((cellule) => cellule.textContent)
}

describe('JournalMouvements', () => {
  it('affiche un ajustement avec la quantité avant et après', () => {
    render(
      <JournalMouvements mouvements={mouvements} articles={articles} filtres={{}} onFiltres={vi.fn()} />,
    )

    expect(cellulesDe('Comptage annuel')).toEqual([
      '22 oct.10 h 00',
      "L'Île au trésor",
      'Ajustement',
      '12 → 10',
      'Comptage annuel',
      'Responsable',
    ])
  })

  it('explique les types de mouvement et les opérateurs', () => {
    render(
      <JournalMouvements mouvements={mouvements} articles={articles} filtres={{}} onFiltres={vi.fn()} />,
    )

    expect(screen.getByRole('columnheader', { name: 'Mouvement' }).getAttribute('data-bulle-texte')).toMatch(
      /Ajustement : correction d’inventaire/,
    )
    expect(screen.getByRole('columnheader', { name: 'Par' }).getAttribute('data-bulle-texte')).toMatch(
      /le responsable, un client \(commande en ligne\) ou le système/,
    )
    expect(screen.getByText('2 mouvements')).toBeInTheDocument()
  })

  it('affiche une vente en ligne faite par le client', () => {
    render(
      <JournalMouvements mouvements={mouvements} articles={articles} filtres={{}} onFiltres={vi.fn()} />,
    )

    expect(cellulesDe('Commande en ligne C-0087')).toEqual([
      '20 oct.15 h 15',
      'Casino Royale',
      'Vente',
      '−1',
      'Commande en ligne C-0087',
      'Client',
    ])
  })

  it('nomme un article absent de la liste comme archivé', () => {
    render(
      <JournalMouvements
        mouvements={[{ ...mouvements[1], produitId: 'p-9' }]}
        articles={articles}
        filtres={{}}
        onFiltres={vi.fn()}
      />,
    )

    expect(screen.getByText('Article archivé')).toBeInTheDocument()
  })

  it('transmet le filtre par article', () => {
    const onFiltres = vi.fn()
    render(
      <JournalMouvements
        mouvements={mouvements}
        articles={articles}
        filtres={{ type: 'vente' }}
        onFiltres={onFiltres}
      />,
    )

    fireEvent.change(screen.getByRole('combobox', { name: 'Article' }), {
      target: { value: 'p-2' },
    })

    expect(onFiltres).toHaveBeenCalledWith({ type: 'vente', produit: 'p-2' })
  })

  it('transmet le filtre par type', () => {
    const onFiltres = vi.fn()
    render(
      <JournalMouvements mouvements={mouvements} articles={articles} filtres={{}} onFiltres={onFiltres} />,
    )

    fireEvent.change(screen.getByRole('combobox', { name: 'Type de mouvement' }), {
      target: { value: 'retour' },
    })

    expect(onFiltres).toHaveBeenCalledWith({ type: 'retour' })
  })

  it('signale un journal vide', () => {
    render(<JournalMouvements mouvements={[]} articles={articles} filtres={{}} onFiltres={vi.fn()} />)

    expect(screen.getByText('Aucun mouvement ne correspond.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
