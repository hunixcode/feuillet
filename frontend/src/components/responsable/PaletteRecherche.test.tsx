import { fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOuverture } from '../../utils/ouvertureAdmin'
import PaletteRecherche from './PaletteRecherche.tsx'

const pages = [
  { cle: 'tableau', to: '/admin', label: 'Tableau de bord' },
  { cle: 'catalogue', to: '/admin/catalogue', label: 'Catalogue et prix' },
]

function json(corps: unknown) {
  return new Response(JSON.stringify(corps), { status: 200 })
}

function simulerApi() {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree) => {
    const url = String(entree)
    if (url.startsWith('/api/produits')) {
      return json([
        {
          id: 'p-2',
          reference: 'LIV-002',
          designation: 'Le Petit Prince',
          type: 'livre',
          categorie: 'jeunesse',
          prix: 1200,
          tauxTva: 5,
          archive: false,
          prixApplique: 1200,
          auteur: 'Antoine de Saint-Exupéry',
        },
      ])
    }
    if (url.startsWith('/api/stock')) {
      return json([
        {
          produitId: 'p-2',
          reference: 'LIV-002',
          designation: 'Le Petit Prince',
          quantitePhysique: 7,
          quantiteMiseDeCote: 0,
          quantiteDefectueuse: 0,
          quantiteVendable: 7,
        },
      ])
    }
    if (url.startsWith('/api/fournisseurs')) {
      return json([{ id: 'f-1', nom: 'Diffusion Océanie', contact: 'commandes@do.pf' }])
    }
    return json([])
  })
}

function Emplacement() {
  const { pathname } = useLocation()
  const [ouvert, setOuvert] = useState('')
  useOuverture(['article'], (ouverture) => setOuvert(ouverture.id ?? ''))
  return <p data-testid="emplacement">{`${pathname} ${ouvert}`}</p>
}

function afficher(onFermer = vi.fn(), onApparence = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="*" element={<Emplacement />} />
      </Routes>
      <PaletteRecherche pages={pages} onFermer={onFermer} onApparence={onApparence} />
    </MemoryRouter>,
  )
  return { onFermer, onApparence }
}

describe('PaletteRecherche', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('propose les actions et les pages avant toute saisie, champ sélectionné', () => {
    simulerApi()
    afficher()

    const palette = within(screen.getByRole('dialog', { name: 'Rechercher partout' }))
    expect(palette.getByRole('searchbox', { name: 'Rechercher partout' })).toHaveFocus()
    expect(palette.getByText('Actions')).toBeInTheDocument()
    expect(palette.getByText('Pages')).toBeInTheDocument()
    expect(palette.getByRole('option', { name: /Nouvel article/ })).toHaveAttribute('aria-selected', 'false')
    expect(palette.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('trouve un article sans tenir compte des accents et l ouvre dans le catalogue', async () => {
    simulerApi()
    const { onFermer } = afficher()
    const champ = screen.getByRole('searchbox', { name: 'Rechercher partout' })

    fireEvent.change(champ, { target: { value: 'petit saint-exupery' } })

    const option = await screen.findByRole('option', { name: /Le Petit Prince/ })
    expect(option).toHaveTextContent('7 en vente')
    expect(screen.getByText('Articles')).toBeInTheDocument()

    fireEvent.keyDown(champ, { key: 'Enter' })

    expect(onFermer).toHaveBeenCalled()
    expect(screen.getByTestId('emplacement')).toHaveTextContent('/admin/catalogue p-2')
  })

  it('parcourt les résultats au clavier', async () => {
    simulerApi()
    afficher()
    const champ = screen.getByRole('searchbox', { name: 'Rechercher partout' })

    fireEvent.keyDown(champ, { key: 'ArrowDown' })
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true')
    expect(champ).toHaveAttribute('aria-activedescendant', 'palette-1')

    fireEvent.keyDown(champ, { key: 'ArrowUp' })
    fireEvent.keyDown(champ, { key: 'ArrowUp' })
    const options = screen.getAllByRole('option')
    expect(options[options.length - 1]).toHaveAttribute('aria-selected', 'true')
  })

  it('change l apparence depuis les actions', () => {
    simulerApi()
    const { onApparence, onFermer } = afficher()

    fireEvent.click(screen.getByRole('option', { name: /Changer d’apparence/ }))

    expect(onApparence).toHaveBeenCalled()
    expect(onFermer).toHaveBeenCalled()
  })

  it('dit quand rien ne correspond', async () => {
    simulerApi()
    afficher()

    fireEvent.change(screen.getByRole('searchbox', { name: 'Rechercher partout' }), { target: { value: 'zzz' } })

    expect(await screen.findByText('Rien ne correspond à « zzz ».')).toBeInTheDocument()
  })
})
