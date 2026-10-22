import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DemandesPage from './DemandesPage.tsx'

function afficher(url = '/demandes') {
  render(
    <MemoryRouter initialEntries={[url]}>
      <DemandesPage />
    </MemoryRouter>,
  )
}

describe('page Mes demandes', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('affiche le titre de la page et de l onglet', () => {
    afficher()

    expect(screen.getByRole('heading', { level: 1, name: 'Mes demandes' })).toBeInTheDocument()
    expect(document.title).toBe('Mes demandes · Feuillet')
  })

  it('propose le formulaire de demande de l écran 5', () => {
    afficher()

    expect(screen.getByRole('heading', { name: 'Demander un livre' })).toBeInTheDocument()
    expect(screen.getByLabelText('Titre')).toBeInTheDocument()
    expect(screen.getByLabelText('Auteur (facultatif)')).toBeInTheDocument()
    expect(screen.getByLabelText('ISBN (facultatif)')).toBeInTheDocument()
    expect(screen.getByLabelText('Quantité')).toHaveValue(1)
  })

  it('reprend le titre cherché dans le catalogue', () => {
    afficher('/demandes?titre=Le%20Rivage%20des%20Syrtes')

    expect(screen.getByLabelText('Titre')).toHaveValue('Le Rivage des Syrtes')
  })

  it('laisse remplir les champs', () => {
    afficher()

    fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'Le Rivage des Syrtes' } })
    fireEvent.change(screen.getByLabelText('Quantité'), { target: { value: '2' } })

    expect(screen.getByLabelText('Titre')).toHaveValue('Le Rivage des Syrtes')
    expect(screen.getByLabelText('Quantité')).toHaveValue(2)
  })

  it('grise l envoi en attendant le backend, sans appeler le serveur', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    afficher()

    const bouton = screen.getByRole('button', { name: 'Envoyer la demande' })
    expect(bouton).toBeDisabled()
    expect(bouton).toHaveAccessibleDescription('L\'envoi des demandes sera bientôt disponible.')
    fireEvent.submit(bouton.closest('form') as HTMLFormElement)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('explique que le suivi des demandes arrive bientôt', () => {
    afficher()

    expect(
      screen.getByRole('heading', { name: 'Aucune demande à afficher pour l\'instant.' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Le suivi de vos demandes sera bientôt disponible\./)).toBeInTheDocument()
  })
})
