import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CourbeVentes, { type PointVentes } from './CourbeVentes.tsx'

const ventes: PointVentes[] = [
  { jour: '2026-11-02', quantite: 3, montant: 5850 },
  { jour: '2026-11-03', quantite: 6, montant: 11700 },
  { jour: '2026-11-04', quantite: 0, montant: 0 },
]

describe('CourbeVentes', () => {
  it('décrit ce que suit la courbe', () => {
    render(<CourbeVentes description="L'Île au trésor" ventes={ventes} />)

    expect(
      screen.getByRole('img', { name: "Exemplaires vendus chaque jour : L'Île au trésor" }),
    ).toBeInTheDocument()
  })

  it('place un point par jour, du plus haut au niveau de l axe', () => {
    render(<CourbeVentes description="L'Île au trésor" ventes={ventes} />)

    const marques = document.querySelectorAll('.courbe-ventes-marque')
    expect(marques).toHaveLength(3)
    expect(marques[1]).toHaveAttribute('cy', '26')
    expect(marques[2]).toHaveAttribute('cy', '112')
    expect(document.querySelector('.courbe-ventes-ligne')).toHaveAttribute(
      'points',
      '40,69 320,26 600,112',
    )
  })

  it('donne le détail de chaque jour dans un tableau', () => {
    render(<CourbeVentes description="L'Île au trésor" ventes={ventes} />)

    const tableau = within(screen.getByRole('table', { name: "Ventes par jour : L'Île au trésor" }))
    const ligne = tableau.getByText('mar. 3 nov.').closest('tr')
    expect(ligne).toHaveTextContent('6')
    expect(ligne).toHaveTextContent('11 700 XPF')
  })

  it('met en évidence le jour marqué', () => {
    render(<CourbeVentes description="Tout" ventes={ventes} jourMarque="2026-11-03" />)

    const marques = document.querySelectorAll('.courbe-ventes-point--marque')
    expect(marques).toHaveLength(1)
    expect(marques[0]).toHaveTextContent('mar. 3 nov.')
  })
})
