import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { demandeDeTest, demandeHorsCatalogue, demandeMiseDeCote } from './demandesDeTest'
import TableauDemandes from './TableauDemandes.tsx'
import TableauMisesDeCote from './TableauMisesDeCote.tsx'

function ligne(titre: string) {
  return screen.getByRole('button', { name: titre }).closest('tr')
}

describe('TableauDemandes', () => {
  it('distingue un article épuisé d un livre absent du catalogue', () => {
    render(
      <TableauDemandes demandes={[demandeDeTest(), demandeHorsCatalogue()]} onSelection={vi.fn()} />,
    )

    expect(ligne('L’Île au trésor')).toHaveTextContent('Article épuisé')
    expect(ligne('L’Île au trésor')).not.toHaveTextContent('Absent du catalogue')
    expect(ligne('Le Rouge et le Noir')).toHaveTextContent('Absent du catalogue')
    expect(ligne('Le Rouge et le Noir')).toHaveTextContent('Stendhal · ISBN 978-2-07-041311-0')
  })

  it('donne le client, la quantité, la date et le statut', () => {
    render(<TableauDemandes demandes={[demandeDeTest()]} onSelection={vi.fn()} />)

    const cellules = ligne('L’Île au trésor')?.querySelectorAll('td') ?? []
    expect(cellules[1]).toHaveTextContent('Marie Teriitahimarie@example.pf')
    expect(cellules[2]).toHaveTextContent('2')
    expect(cellules[3]).toHaveTextContent('8 novembre 2026')
    expect(cellules[4]).toHaveTextContent('En attente')
  })

  it('montre la quantité réservée et la date limite d une mise de côté', () => {
    render(<TableauDemandes demandes={[demandeMiseDeCote()]} onSelection={vi.fn()} />)

    const statut = ligne('Sakamoto Days, tome 2')
    expect(statut).toHaveTextContent('Mise de côté')
    expect(statut).toHaveTextContent('1 réservé jusqu’au 15 novembre 2026')
    expect(statut).not.toHaveTextContent('Article épuisé')
  })

  it('ouvre la demande cliquée et la met en évidence', () => {
    const onSelection = vi.fn()
    const demande = demandeDeTest()
    render(<TableauDemandes demandes={[demande]} selection="d-1" onSelection={onSelection} />)

    fireEvent.click(screen.getByRole('button', { name: 'L’Île au trésor' }))

    expect(onSelection).toHaveBeenCalledWith(demande)
    expect(ligne('L’Île au trésor')).toHaveAttribute('aria-current', 'true')
  })

  it('explique chaque colonne', () => {
    render(<TableauDemandes demandes={[demandeDeTest()]} onSelection={vi.fn()} />)

    expect(screen.getByText('Article demandé')).toHaveAccessibleDescription(/absent du catalogue/i)
    expect(screen.getByText('Quantité')).toHaveAccessibleDescription(/n’est pas une vente/)
  })
})

describe('TableauMisesDeCote', () => {
  it('donne l article, le client, la part réservée et la date limite', () => {
    render(
      <TableauMisesDeCote
        demandes={[demandeMiseDeCote({ quantiteSouhaitee: 3, miseDeCote: { quantite: 2, dateLimite: '2026-11-20T09:59:59.999Z' } })]}
        onSelection={vi.fn()}
      />,
    )

    const cellules = ligne('Sakamoto Days, tome 2')?.querySelectorAll('td') ?? []
    expect(cellules[1]).toHaveTextContent('Marie Teriitahi')
    expect(cellules[2]).toHaveTextContent('2 sur 3')
    expect(cellules[3]).toHaveTextContent('19 novembre 2026')
  })
})
