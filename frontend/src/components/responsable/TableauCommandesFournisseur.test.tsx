import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CommandeFournisseur } from '../../types/reappro'
import TableauCommandesFournisseur from './TableauCommandesFournisseur.tsx'

function commande(valeurs: Partial<CommandeFournisseur> = {}): CommandeFournisseur {
  return {
    id: 'cf-1',
    fournisseur: { id: 'f-1', nom: 'Diffusion Océanie' },
    produitId: 'p-1',
    reference: 'LIV-001',
    designation: "L'Île au trésor",
    quantiteCommandee: 10,
    quantiteRecue: 4,
    date: '2026-11-08T20:00:00.000Z',
    dateArriveePrevue: '2026-11-20',
    statut: 'partiellement_recue',
    ...valeurs,
  }
}

function cellules(nom: string) {
  return Array.from(
    screen.getByRole('button', { name: nom }).closest('tr')?.querySelectorAll('td') ?? [],
  ).map((cellule) => cellule.textContent)
}

describe('TableauCommandesFournisseur', () => {
  it('montre ce qui est commandé, reçu et encore attendu', () => {
    render(
      <TableauCommandesFournisseur commandes={[commande()]} aujourdhui="2026-11-14" onSelection={vi.fn()} />,
    )

    expect(cellules("L'Île au trésor")).toEqual([
      "L'Île au trésorLIV-001",
      'Diffusion Océanie',
      '10',
      '4',
      '6',
      'ven. 20 nov.',
      'Partiellement reçue',
      '8 novembre 2026',
    ])
  })

  it('signale une arrivée prévue dépassée', () => {
    render(
      <TableauCommandesFournisseur
        commandes={[commande({ dateArriveePrevue: '2026-11-10', statut: 'en_cours', quantiteRecue: 0 })]}
        aujourdhui="2026-11-14"
        onSelection={vi.fn()}
      />,
    )

    expect(screen.getByText('En retard')).toBeInTheDocument()
  })

  it('ne parle plus de retard ni d attente pour une commande reçue', () => {
    render(
      <TableauCommandesFournisseur
        commandes={[commande({ dateArriveePrevue: '2026-11-10', statut: 'recue', quantiteRecue: 10 })]}
        aujourdhui="2026-11-14"
        onSelection={vi.fn()}
      />,
    )

    expect(screen.queryByText('En retard')).not.toBeInTheDocument()
    expect(cellules("L'Île au trésor")[4]).toBe('—')
    expect(cellules("L'Île au trésor")[6]).toBe('Reçue')
  })

  it('ouvre la commande choisie et marque sa ligne', () => {
    const onSelection = vi.fn()
    render(
      <TableauCommandesFournisseur
        commandes={[commande()]}
        aujourdhui="2026-11-14"
        selection="cf-1"
        onSelection={onSelection}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: "L'Île au trésor" }))

    expect(onSelection).toHaveBeenCalledWith(expect.objectContaining({ id: 'cf-1' }))
    expect(screen.getByRole('button', { name: "L'Île au trésor" }).closest('tr')).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('explique les colonnes', () => {
    render(
      <TableauCommandesFournisseur commandes={[commande()]} aujourdhui="2026-11-14" onSelection={vi.fn()} />,
    )

    expect(screen.getByText('Encore attendus', { selector: '.info-terme' })).toHaveAccessibleDescription(
      'Commandés moins reçus : les exemplaires que le fournisseur doit encore livrer.',
    )
  })
})
