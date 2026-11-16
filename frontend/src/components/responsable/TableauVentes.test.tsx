import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TableauVentes from './TableauVentes.tsx'
import { venteDeTest } from './ventesDeTest'

describe('TableauVentes', () => {
  it('donne la date, le client, l adresse, le total et le statut', () => {
    render(<TableauVentes ventes={[venteDeTest()]} onSelection={vi.fn()} />)

    const cellules = Array.from(
      screen.getByRole('button', { name: '10/11/2026 10:00' }).closest('tr')?.querySelectorAll('td') ?? [],
    ).map((cellule) => cellule.textContent)
    expect(cellules).toEqual([
      '10/11/2026 10:00',
      'Léa Martinlea@example.pf',
      'BP 12, Papeete',
      '4 810 XPF',
      'Expédiée',
    ])
  })

  it('signale un cadeau et une commande à préparer', () => {
    render(
      <TableauVentes
        ventes={[venteDeTest({ occasionCadeau: 'noel', statut: 'a_preparer', dateExpedition: undefined })]}
        onSelection={vi.fn()}
      />,
    )

    expect(screen.getByText('Cadeau · Noël')).toBeInTheDocument()
    expect(screen.getByText('À préparer')).toBeInTheDocument()
  })

  it('ouvre la commande choisie et marque sa ligne', () => {
    const onSelection = vi.fn()
    render(<TableauVentes ventes={[venteDeTest()]} selection="v-1" onSelection={onSelection} />)

    fireEvent.click(screen.getByRole('button', { name: '10/11/2026 10:00' }))

    expect(onSelection).toHaveBeenCalledWith(expect.objectContaining({ id: 'v-1' }))
    expect(screen.getByRole('button', { name: '10/11/2026 10:00' }).closest('tr')).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('explique les colonnes', () => {
    render(<TableauVentes ventes={[venteDeTest()]} onSelection={vi.fn()} />)

    expect(screen.getByText('Statut', { selector: '.info-terme' })).toHaveAccessibleDescription(
      /Expédiée : le colis a été confié au transporteur/,
    )
  })
})
