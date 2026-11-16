import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import EnteteInfo from './EnteteInfo.tsx'

function afficher() {
  render(
    <table>
      <thead>
        <tr>
          <EnteteInfo libelle="Montant net" info="Ce que l’article a rapporté." className="rapports-nombre" />
        </tr>
      </thead>
    </table>,
  )
}

describe('EnteteInfo', () => {
  it('garde le nom de la colonne et y rattache son explication', () => {
    afficher()

    const entete = screen.getByRole('columnheader', { name: 'Montant net' })
    expect(entete).toHaveClass('rapports-nombre')
    expect(screen.getByText('Montant net', { selector: '.info-terme' })).toHaveAccessibleDescription(
      'Ce que l’article a rapporté.',
    )
  })

  it('se lit aussi au clavier', () => {
    afficher()

    expect(screen.getByText('Montant net', { selector: '.info-terme' })).toHaveAttribute('tabindex', '0')
  })
})
