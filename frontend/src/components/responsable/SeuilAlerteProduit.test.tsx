import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Produit } from '../../types/produit'
import type { SeuilAlerte } from '../../types/reappro'
import SeuilAlerteProduit from './SeuilAlerteProduit.tsx'

const produit: Produit = {
  id: 'p-1',
  reference: 'LIV-001',
  designation: 'L’Île au trésor',
  type: 'livre',
  categorie: 'jeunesse',
  prix: 1500,
  tauxTva: 5,
  archive: false,
  prixApplique: 1500,
}

const parDefaut: SeuilAlerte = { seuilAlerte: 20, parDefaut: true }
const propre: SeuilAlerte = { seuilAlerte: 35, parDefaut: false }

interface Requete {
  url: string
  methode: string
  corps?: unknown
}

function json(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status })
}

function simulerApi(actuel: SeuilAlerte, envoi?: (requete: Requete) => Response) {
  const requetes: Requete[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree, options) => {
    const requete = {
      url: String(entree),
      methode: options?.method ?? 'GET',
      corps: options?.body ? JSON.parse(String(options.body)) : undefined,
    }
    requetes.push(requete)
    if (requete.methode === 'PUT' && envoi) {
      return envoi(requete)
    }
    return json(actuel)
  })
  return requetes
}

function envois(requetes: Requete[]) {
  return requetes.filter((requete) => requete.methode === 'PUT')
}

async function afficher(onChangement = vi.fn()) {
  render(<SeuilAlerteProduit produit={produit} onChangement={onChangement} />)
  await screen.findByText(/Seuil actuel/)
  return onChangement
}

const champ = () => screen.getByLabelText('Seuil d’alerte (%)')

describe('SeuilAlerteProduit', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('montre un article qui suit le seuil par défaut', async () => {
    const requetes = simulerApi(parDefaut)
    await afficher()

    expect(screen.getByText(/Seuil actuel/)).toHaveTextContent('Seuil actuel : 20 %, celui par défaut des paramètres.')
    expect(champ()).toHaveValue(null)
    expect(champ()).toHaveAttribute('placeholder', '20')
    expect(screen.queryByRole('button', { name: 'Revenir au seuil par défaut' })).not.toBeInTheDocument()
    expect(requetes[0].url).toBe('/api/produits/p-1/seuil-alerte')
  })

  it('pré-remplit le seuil propre à l article', async () => {
    simulerApi(propre)
    await afficher()

    expect(screen.getByText(/Seuil actuel/)).toHaveTextContent('Seuil actuel : 35 %, propre à cet article.')
    expect(champ()).toHaveValue(35)
    expect(screen.getByRole('button', { name: 'Revenir au seuil par défaut' })).toBeInTheDocument()
  })

  it('fixe un seuil propre à l article et prévient la page', async () => {
    const requetes = simulerApi(parDefaut, () => json({ seuilAlerte: 30, parDefaut: false }))
    const onChangement = await afficher()

    fireEvent.change(champ(), { target: { value: '30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le seuil' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Seuil d’alerte enregistré : 30 %.')
    expect(screen.getByText(/Seuil actuel/)).toHaveTextContent('30 %, propre à cet article.')
    expect(envois(requetes)).toEqual([
      { url: '/api/produits/p-1/seuil-alerte', methode: 'PUT', corps: { seuilAlerte: 30 } },
    ])
    expect(onChangement).toHaveBeenCalled()
  })

  it('revient au seuil par défaut', async () => {
    const requetes = simulerApi(propre, () => json(parDefaut))
    await afficher()

    fireEvent.click(screen.getByRole('button', { name: 'Revenir au seuil par défaut' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'L’article suit de nouveau le seuil par défaut (20 %).',
    )
    expect(envois(requetes)[0].corps).toEqual({ seuilAlerte: null })
    expect(champ()).toHaveValue(null)
    expect(screen.queryByRole('button', { name: 'Revenir au seuil par défaut' })).not.toBeInTheDocument()
  })

  it.each(['', '101', '-1', '12.5'])('refuse le seuil « %s » sans rien envoyer', async (valeur) => {
    const requetes = simulerApi(parDefaut)
    await afficher()

    fireEvent.change(champ(), { target: { value: valeur } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le seuil' }))

    expect(champ()).toHaveAccessibleDescription('Le seuil d’alerte doit être un nombre entier entre 0 et 100.')
    expect(envois(requetes)).toHaveLength(0)
  })

  it('accepte un seuil de 0 %', async () => {
    const requetes = simulerApi(parDefaut, () => json({ seuilAlerte: 0, parDefaut: false }))
    await afficher()

    fireEvent.change(champ(), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le seuil' }))

    expect(await screen.findByRole('status')).toHaveTextContent('0 %')
    expect(envois(requetes)[0].corps).toEqual({ seuilAlerte: 0 })
  })

  it('affiche sous le champ l erreur renvoyée par le backend', async () => {
    const onChangement = vi.fn()
    simulerApi(parDefaut, () =>
      json(
        {
          code: 'VALIDATION',
          message: 'Certains champs sont invalides.',
          details: { champs: { seuilAlerte: 'Le seuil d’alerte doit être un entier entre 0 et 100, ou null.' } },
        },
        400,
      ),
    )
    await afficher(onChangement)

    fireEvent.change(champ(), { target: { value: '50' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le seuil' }))

    expect(await screen.findByText('Le seuil d’alerte doit être un entier entre 0 et 100, ou null.')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(onChangement).not.toHaveBeenCalled()
  })

  it('affiche une erreur générale du serveur', async () => {
    simulerApi(propre, () => json({ code: 'PRODUIT_INTROUVABLE', message: 'Produit introuvable.' }, 404))
    await afficher()

    fireEvent.click(screen.getByRole('button', { name: 'Revenir au seuil par défaut' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Produit introuvable.')
  })

  it('affiche une erreur si le seuil ne se charge pas', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ code: 'PRODUIT_INTROUVABLE', message: 'Produit introuvable.' }, 404),
    )
    render(<SeuilAlerteProduit produit={produit} onChangement={vi.fn()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Produit introuvable.')
    expect(screen.queryByLabelText('Seuil d’alerte (%)')).not.toBeInTheDocument()
  })
})
