import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ParametresPage from './ParametresPage.tsx'

const parametres = {
  dureeMiseDeCoteJours: 7,
  delaiRetourJours: 14,
  delaiRetourCadeauJours: 30,
  fraisEmballage: 300,
  fraisLivraison: 800,
  seuilAlerteDefaut: 20,
}

interface Requete {
  url: string
  methode: string
  corps?: unknown
}

const categories = [
  { id: 'roman', libelle: 'Roman' },
  { id: 'poesie', libelle: 'Poésie' },
]

const produit = {
  id: 'p-1',
  reference: 'LIV-001',
  designation: 'Le Petit Prince',
  type: 'livre',
  categorie: 'roman',
  prix: 1200,
  tauxTva: 5,
  archive: false,
  prixApplique: 1200,
}

function json(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status })
}

function simulerApi(
  enregistrement: (corps: unknown) => Response = (corps) => json(corps),
  autre: (requete: Requete) => Response | undefined = () => undefined,
) {
  const requetes: Requete[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree, options) => {
    const url = String(entree)
    const methode = options?.method ?? 'GET'
    const corps = options?.body ? JSON.parse(String(options.body)) : undefined
    const requete = { url, methode, corps }
    requetes.push(requete)
    const particuliere = autre(requete)
    if (particuliere) {
      return particuliere
    }
    if (url.startsWith('/api/categories')) {
      return json(categories)
    }
    if (url.startsWith('/api/produits')) {
      return json(url.includes('archive=true') ? [] : [produit])
    }
    return methode === 'PUT' ? enregistrement(corps) : json(parametres)
  })
  return requetes
}

async function champ(libelle: string) {
  return screen.findByLabelText(libelle)
}

describe('page des paramètres', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('affiche les paramètres actuels avec leur explication', async () => {
    simulerApi()
    render(<ParametresPage />)

    expect(await champ('Durée d’une mise de côté (jours)')).toHaveValue(7)
    expect(screen.getByLabelText('Délai de retour (jours)')).toHaveValue(14)
    expect(screen.getByLabelText('Délai de retour d’un cadeau (jours)')).toHaveValue(30)
    expect(screen.getByLabelText('Emballage cadeau (XPF)')).toHaveValue(300)
    expect(screen.getByLabelText('Livraison (XPF)')).toHaveValue(800)
    expect(screen.getByLabelText('Seuil d’alerte par défaut (%)')).toHaveAccessibleDescription(
      /sur 100 exemplaires achetés, l’alerte se déclenche à 20 restants/,
    )
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
    expect(document.title).toBe('Paramètres · Feuillet')
  })

  it('met à jour l exemple du seuil pendant la saisie', async () => {
    simulerApi()
    render(<ParametresPage />)

    fireEvent.change(await champ('Seuil d’alerte par défaut (%)'), { target: { value: '35' } })

    expect(screen.getByLabelText('Seuil d’alerte par défaut (%)')).toHaveAccessibleDescription(
      /l’alerte se déclenche à 35 restants/,
    )

    fireEvent.change(screen.getByLabelText('Seuil d’alerte par défaut (%)'), { target: { value: '150' } })

    expect(screen.getByLabelText('Seuil d’alerte par défaut (%)')).toHaveAccessibleDescription(
      /l’alerte se déclenche à … restants/,
    )
  })

  it('enregistre tous les paramètres et confirme', async () => {
    const requetes = simulerApi()
    render(<ParametresPage />)

    fireEvent.change(await champ('Livraison (XPF)'), { target: { value: '1000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Paramètres enregistrés.')
    expect(requetes.find((requete) => requete.methode === 'PUT')?.corps).toEqual({
      ...parametres,
      fraisLivraison: 1000,
    })
    expect(screen.getByLabelText('Livraison (XPF)')).toHaveValue(1000)
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
  })

  it('vérifie chaque valeur avant d envoyer', async () => {
    const requetes = simulerApi()
    render(<ParametresPage />)

    fireEvent.change(await champ('Seuil d’alerte par défaut (%)'), { target: { value: '120' } })
    fireEvent.change(screen.getByLabelText('Délai de retour (jours)'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Emballage cadeau (XPF)'), { target: { value: '2.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(screen.getByLabelText('Seuil d’alerte par défaut (%)')).toHaveAccessibleDescription(
      /La valeur doit être un nombre entier entre 1 et 100\./,
    )
    expect(screen.getByLabelText('Délai de retour (jours)')).toHaveAccessibleDescription(
      /La valeur doit être un nombre entier entre 1 et 1\s000\s000\./,
    )
    expect(screen.getByLabelText('Emballage cadeau (XPF)')).toHaveAttribute('aria-invalid', 'true')
    expect(requetes.some((requete) => requete.methode === 'PUT')).toBe(false)
  })

  it('affiche sous le champ l erreur renvoyée par le serveur', async () => {
    simulerApi(() =>
      json(
        {
          code: 'VALIDATION',
          message: 'Données invalides.',
          details: { champs: { dureeMiseDeCoteJours: 'Valeur refusée par le serveur.' } },
        },
        400,
      ),
    )
    render(<ParametresPage />)

    fireEvent.change(await champ('Durée d’une mise de côté (jours)'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('Valeur refusée par le serveur.')).toBeInTheDocument()
    expect(screen.getByLabelText('Durée d’une mise de côté (jours)')).toHaveAttribute('aria-invalid', 'true')
  })

  it('explique une erreur du serveur qui ne vise aucun champ et garde la saisie', async () => {
    simulerApi(() => json({ code: 'INTERDIT', message: 'Accès réservé au responsable.' }, 403))
    render(<ParametresPage />)

    fireEvent.change(await champ('Délai de retour (jours)'), { target: { value: '21' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Accès réservé au responsable.')
    expect(screen.getByLabelText('Délai de retour (jours)')).toHaveValue(21)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('retire la confirmation dès qu une valeur change à nouveau', async () => {
    simulerApi()
    render(<ParametresPage />)
    fireEvent.change(await champ('Livraison (XPF)'), { target: { value: '1000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await screen.findByRole('status')

    fireEvent.change(screen.getByLabelText('Livraison (XPF)'), { target: { value: '1200' } })

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeEnabled()
  })

  it('grise Enregistrer quand on remet la valeur d origine', async () => {
    simulerApi()
    render(<ParametresPage />)

    fireEvent.change(await champ('Durée d’une mise de côté (jours)'), { target: { value: '10' } })
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeEnabled()

    fireEvent.change(screen.getByLabelText('Durée d’une mise de côté (jours)'), { target: { value: '7' } })
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
  })

  it('annule les changements non enregistrés', async () => {
    simulerApi()
    render(<ParametresPage />)

    fireEvent.change(await champ('Délai de retour (jours)'), { target: { value: '21' } })
    fireEvent.click(screen.getByRole('button', { name: 'Annuler les changements' }))

    expect(screen.getByLabelText('Délai de retour (jours)')).toHaveValue(14)
    expect(screen.queryByRole('button', { name: 'Annuler les changements' })).not.toBeInTheDocument()
  })

  it('affiche une erreur de chargement', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      json({ code: 'INTERDIT', message: 'Accès réservé au responsable.' }, 403),
    )
    render(<ParametresPage />)

    const alertes = await screen.findAllByRole('alert')
    expect(alertes.every((alerte) => alerte.textContent === 'Accès réservé au responsable.')).toBe(true)
  })

  it('liste les catégories avec leurs articles et ne propose de supprimer que les vides', async () => {
    simulerApi()
    render(<ParametresPage />)

    const section = within(screen.getByRole('region', { name: 'Catégories' }))
    const roman = (await section.findByText('Roman')).closest('li') as HTMLElement
    await waitFor(() => expect(roman).toHaveTextContent('1 article'))
    expect(within(roman).getByText('Utilisée')).toBeInTheDocument()
    expect(within(roman).queryByRole('button')).not.toBeInTheDocument()
    expect(section.getByText('Poésie').closest('li')).toHaveTextContent('Vide')
  })

  it('ajoute et supprime une catégorie', async () => {
    const requetes = simulerApi(undefined, ({ url, methode }) => {
      if (url === '/api/categories' && methode === 'POST') {
        return json({ id: 'theatre', libelle: 'Théâtre' }, 201)
      }
      if (methode === 'DELETE') {
        return new Response(null, { status: 204 })
      }
      return undefined
    })
    render(<ParametresPage />)
    const section = within(screen.getByRole('region', { name: 'Catégories' }))
    await section.findByText('Poésie')

    fireEvent.click(section.getByRole('button', { name: 'Ajouter' }))
    expect(section.getByRole('textbox', { name: 'Nouvelle catégorie' })).toHaveAccessibleDescription(
      'Donnez un nom à la catégorie.',
    )

    fireEvent.change(section.getByRole('textbox', { name: 'Nouvelle catégorie' }), { target: { value: 'Théâtre' } })
    fireEvent.click(section.getByRole('button', { name: 'Ajouter' }))
    expect(await screen.findByText('Catégorie « Théâtre » ajoutée.')).toBeInTheDocument()

    fireEvent.click(section.getByRole('button', { name: 'Supprimer Poésie' }))
    expect(await screen.findByText('Catégorie « Poésie » supprimée.')).toBeInTheDocument()
    expect(requetes.find((requete) => requete.methode === 'DELETE')?.url).toBe('/api/categories/poesie')
  })

  it('explique le refus de suppression d une catégorie', async () => {
    simulerApi(undefined, ({ methode }) =>
      methode === 'DELETE'
        ? json({ code: 'CATEGORIE_UTILISEE', message: 'Cette catégorie est utilisée par un produit.' }, 409)
        : undefined,
    )
    render(<ParametresPage />)
    const section = within(screen.getByRole('region', { name: 'Catégories' }))

    fireEvent.click(await section.findByRole('button', { name: 'Supprimer Poésie' }))

    expect(await section.findByRole('alert')).toHaveTextContent('Cette catégorie est utilisée par un produit.')
  })

  it('résume les modifications dans la barre d enregistrement', async () => {
    simulerApi()
    render(<ParametresPage />)

    fireEvent.change(await champ('Livraison (XPF)'), { target: { value: '1000' } })
    const barre = within(screen.getByRole('region', { name: 'Modifications' }))
    expect(barre.getByText('1 réglage modifié')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Délai de retour (jours)'), { target: { value: '' } })
    expect(barre.getByText('Corrigez les valeurs signalées')).toBeInTheDocument()
  })
})
