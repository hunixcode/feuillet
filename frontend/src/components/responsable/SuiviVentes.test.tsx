import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SuiviVentes from './SuiviVentes.tsx'

const ventes = [
  { jour: '2026-11-02', quantite: 3, montant: 5850 },
  { jour: '2026-11-03', quantite: 6, montant: 11700 },
]

const categories = [{ id: 'roman', libelle: 'Roman' }]
const articles = [{ produitId: 'p-1', designation: "L'Île au trésor" }]

function afficher(choix: string, autres: Partial<Parameters<typeof SuiviVentes>[0]> = {}) {
  const onChoix = vi.fn()
  render(
    <SuiviVentes
      choix={choix}
      onChoix={onChoix}
      categories={categories}
      articles={articles}
      ventes={ventes}
      {...autres}
    />,
  )
  return onChoix
}

describe('SuiviVentes', () => {
  it('propose toutes les ventes, les catégories et les articles', () => {
    afficher('')

    const choix = screen.getByRole('combobox', { name: 'Afficher' })
    expect(within(choix).getByRole('option', { name: 'Toutes les ventes' })).toBeInTheDocument()
    expect(within(choix).getByRole('group', { name: 'Par catégorie' })).toHaveTextContent('Roman')
    expect(within(choix).getByRole('group', { name: 'Par article' })).toHaveTextContent(
      "L'Île au trésor",
    )
  })

  it('transmet le choix', () => {
    const onChoix = afficher('')

    fireEvent.change(screen.getByRole('combobox', { name: 'Afficher' }), {
      target: { value: 'categorie:roman' },
    })

    expect(onChoix).toHaveBeenCalledWith('categorie:roman')
  })

  it('nomme la courbe d après le choix', () => {
    afficher('categorie:roman')

    expect(screen.getByRole('img', { name: 'Exemplaires vendus chaque jour : catégorie Roman' })).toBeInTheDocument()
  })

  it('attend les ventes encore en chargement', () => {
    afficher('categorie:roman', { ventes: null })

    expect(screen.getByRole('status')).toHaveTextContent('Chargement de la courbe…')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('affiche une erreur à la place de la courbe', () => {
    afficher('categorie:roman', { ventes: null, erreur: 'Période invalide.' })

    expect(screen.getByRole('alert')).toHaveTextContent('Période invalide.')
  })
})
