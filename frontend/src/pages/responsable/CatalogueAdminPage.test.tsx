import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Categorie } from '../../types/categorie'
import type { Produit } from '../../types/produit'
import CatalogueAdminPage from './CatalogueAdminPage.tsx'

const categories: Categorie[] = [
  { id: 'roman', libelle: 'Roman' },
  { id: 'presse', libelle: 'Presse' },
]

const livre: Produit = {
  id: 'p-1',
  reference: 'LIV-001',
  designation: "L'Île au trésor",
  type: 'livre',
  categorie: 'roman',
  prix: 1800,
  tauxTva: 5,
  archive: false,
  prixApplique: 1530,
  promotion: { id: 'pr-1', remise: 15, debut: '2026-10-10', fin: '2026-10-31' },
}

const magazineArchive: Produit = {
  id: 'p-2',
  reference: 'MAG-001',
  designation: 'Ancien magazine',
  type: 'magazine',
  categorie: 'presse',
  prix: 500,
  tauxTva: 5,
  archive: true,
  prixApplique: 500,
}

interface Requete {
  url: string
  methode: string
  corps?: unknown
}

function json(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status })
}

function reponseParDefaut(requete: Requete): Response {
  const { url } = requete
  if (url === '/api/categories') {
    return json(categories)
  }
  if (url.endsWith('/promotions')) {
    return json([livre.promotion])
  }
  if (url.endsWith('/historique-prix')) {
    return json([
      { date: '2026-09-01T08:00:00.000Z', prix: 1600 },
      { date: '2026-10-01T08:00:00.000Z', prix: 1800 },
    ])
  }
  if (url.startsWith('/api/produits') && url.includes('archive=true')) {
    return json([magazineArchive])
  }
  if (url.startsWith('/api/produits/')) {
    return json(livre)
  }
  return json([livre])
}

function simulerApi(reponses: (requete: Requete) => Response | undefined = () => undefined) {
  const requetes: Requete[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (entree, options) => {
    const requete: Requete = {
      url: String(entree),
      methode: options?.method ?? 'GET',
      corps: options?.body ? JSON.parse(String(options.body)) : undefined,
    }
    requetes.push(requete)
    return reponses(requete) ?? reponseParDefaut(requete)
  })
  return requetes
}

async function ouvrirLivre() {
  fireEvent.click(await screen.findByRole('button', { name: "L'Île au trésor" }))
  return screen.getByRole('complementary')
}

describe('page catalogue du responsable', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('affiche les articles actifs avec catégorie, prix remisé et promotion', async () => {
    simulerApi()
    render(<CatalogueAdminPage />)

    const designation = await screen.findByRole('button', { name: "L'Île au trésor" })
    const ligne = designation.closest('tr') as HTMLElement
    expect(within(ligne).getByText('LIV-001')).toBeInTheDocument()
    expect(await within(ligne).findByText('Roman')).toBeInTheDocument()
    expect(within(ligne).getByText('1 800 XPF')).toBeInTheDocument()
    expect(ligne).toHaveTextContent('1 530 XPF')
    expect(within(ligne).getByText('−15 %')).toBeInTheDocument()
  })

  it('affiche « Aucune » sans promotion et la disponibilité de chaque article', async () => {
    simulerApi((requete) =>
      requete.url === '/api/produits'
        ? json([
            { ...livre, disponibilite: 'disponible' },
            {
              ...magazineArchive,
              archive: false,
              designation: 'Magazine épuisé',
              disponibilite: 'epuise',
            },
            { ...magazineArchive, id: 'p-4', archive: false, designation: 'Sans stock connu' },
          ])
        : undefined,
    )
    render(<CatalogueAdminPage />)

    const ligne = async (nom: string) =>
      (await screen.findByRole('button', { name: nom })).closest('tr') as HTMLElement
    const livreLigne = await ligne("L'Île au trésor")
    expect(within(livreLigne).getByText('Disponible')).not.toHaveClass('catalogue-disponibilite--epuise')
    expect(within(livreLigne).getByText('−15 %')).toBeInTheDocument()
    const epuise = await ligne('Magazine épuisé')
    expect(within(epuise).getByText('Aucune')).toBeInTheDocument()
    expect(within(epuise).getByText('Épuisé')).toHaveClass('catalogue-disponibilite--epuise')
    expect(within(await ligne('Sans stock connu')).getByText('Non renseigné')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Disponibilité' })).toBeInTheDocument()
  })

  it("dessine l'historique du prix avec la promotion en cours", async () => {
    simulerApi()
    render(<CatalogueAdminPage />)
    const panneau = await ouvrirLivre()

    const courbe = await within(panneau).findByRole('img', {
      name: 'Historique du prix : 2 prix enregistrés, promotion en cours',
    })
    expect(within(panneau).getByRole('heading', { name: 'Historique du prix' })).toBeInTheDocument()
    expect(courbe).toHaveTextContent('1 600')
    expect(courbe).toHaveTextContent('1 800')
    expect(courbe).toHaveTextContent('1 530')
    expect(courbe).toHaveTextContent('sept.')
    expect(within(panneau).getByText('Prix catalogue')).toBeInTheDocument()
    expect(within(panneau).getByText('Promotion', { selector: 'span' })).toBeInTheDocument()
  })

  it('affiche séparément les articles archivés', async () => {
    const requetes = simulerApi()
    render(<CatalogueAdminPage />)
    await screen.findByRole('button', { name: "L'Île au trésor" })

    fireEvent.click(screen.getByRole('button', { name: 'Archivés' }))

    expect(await screen.findByRole('button', { name: 'Ancien magazine' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: "L'Île au trésor" })).not.toBeInTheDocument()
    expect(requetes.some((requete) => requete.url === '/api/produits?archive=true')).toBe(true)
  })

  it('filtre par type et par catégorie', async () => {
    const requetes = simulerApi()
    render(<CatalogueAdminPage />)
    await screen.findByRole('option', { name: 'Presse' })

    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'magazine' } })
    fireEvent.change(screen.getByLabelText('Catégorie'), { target: { value: 'presse' } })

    await waitFor(() =>
      expect(requetes.at(-1)?.url).toBe('/api/produits?type=magazine&categorie=presse'),
    )
  })

  it('crée un article avec les champs du type choisi', async () => {
    const requetes = simulerApi((requete) =>
      requete.methode === 'POST'
        ? json({ ...magazineArchive, id: 'p-3', designation: 'Tahiti Mag', archive: false }, 201)
        : undefined,
    )
    render(<CatalogueAdminPage />)
    await screen.findByRole('option', { name: 'Presse' })
    fireEvent.click(screen.getByRole('button', { name: 'Nouvel article' }))
    const panneau = screen.getByRole('complementary')

    fireEvent.change(within(panneau).getByLabelText('Référence'), { target: { value: 'MAG-002' } })
    fireEvent.change(within(panneau).getByLabelText('Type'), { target: { value: 'magazine' } })
    fireEvent.change(within(panneau).getByLabelText('Désignation'), {
      target: { value: 'Tahiti Mag' },
    })
    fireEvent.change(within(panneau).getByLabelText('Catégorie'), { target: { value: 'presse' } })
    fireEvent.change(within(panneau).getByLabelText('Prix TTC (XPF)'), { target: { value: '500' } })
    fireEvent.change(within(panneau).getByLabelText('Taux de TVA (%)'), { target: { value: '5' } })
    fireEvent.change(within(panneau).getByLabelText('Numéro'), { target: { value: '12' } })
    expect(within(panneau).queryByLabelText('ISBN')).not.toBeInTheDocument()
    fireEvent.click(within(panneau).getByRole('button', { name: "Créer l'article" }))

    expect(await screen.findByText('« Tahiti Mag » a été ajouté au catalogue.')).toBeInTheDocument()
    expect(requetes.find((requete) => requete.methode === 'POST')?.corps).toEqual({
      reference: 'MAG-002',
      designation: 'Tahiti Mag',
      type: 'magazine',
      categorie: 'presse',
      prix: 500,
      tauxTva: 5,
      archive: false,
      numero: 12,
    })
  })

  it('affiche sous chaque champ les erreurs renvoyées par le backend', async () => {
    simulerApi((requete) =>
      requete.methode === 'POST'
        ? json(
            {
              code: 'REFERENCE_DEJA_UTILISEE',
              message: 'Cette référence est déjà utilisée.',
              details: { champs: { reference: 'Cette référence existe déjà.' } },
            },
            409,
          )
        : undefined,
    )
    render(<CatalogueAdminPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Nouvel article' }))
    const panneau = screen.getByRole('complementary')
    fireEvent.click(within(panneau).getByRole('button', { name: "Créer l'article" }))

    expect(await within(panneau).findByText('Cette référence existe déjà.')).toBeInTheDocument()
    expect(within(panneau).getByLabelText('Référence')).toHaveAttribute('aria-invalid', 'true')
  })

  it("ouvre un article avec ses promotions et l'historique de ses prix, puis l'archive", async () => {
    const requetes = simulerApi((requete) =>
      requete.methode === 'PUT' ? json({ ...livre, archive: true }) : undefined,
    )
    render(<CatalogueAdminPage />)
    const panneau = await ouvrirLivre()

    expect(within(panneau).getByLabelText('Référence')).toHaveValue('LIV-001')
    expect(await within(panneau).findByText('En cours')).toBeInTheDocument()
    expect(await within(panneau).findByRole('img', { name: /2 prix enregistrés/ })).toBeInTheDocument()

    fireEvent.click(within(panneau).getByRole('button', { name: 'Archiver' }))

    expect(await screen.findByText("« L'Île au trésor » a été archivé.")).toBeInTheDocument()
    const modification = requetes.find((requete) => requete.methode === 'PUT')
    expect(modification?.url).toBe('/api/produits/p-1')
    expect(modification?.corps).toMatchObject({ archive: true, reference: 'LIV-001' })
  })

  it("remplace le message de succès par l'erreur quand une action échoue", async () => {
    simulerApi((requete) =>
      requete.methode === 'PUT' && requete.corps && (requete.corps as Produit).archive
        ? json({ code: 'ERREUR_SERVEUR', message: 'Le serveur ne répond pas.' }, 500)
        : requete.methode === 'PUT'
          ? json(livre)
          : undefined,
    )
    render(<CatalogueAdminPage />)
    const panneau = await ouvrirLivre()
    fireEvent.click(within(panneau).getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByText("« L'Île au trésor » a été enregistré.")).toBeInTheDocument()

    fireEvent.click(within(panneau).getByRole('button', { name: 'Archiver' }))

    expect(await screen.findByText('Le serveur ne répond pas.')).toBeInTheDocument()
    expect(screen.queryByText("« L'Île au trésor » a été enregistré.")).not.toBeInTheDocument()
  })

  it('programme une promotion et affiche un conflit de dates', async () => {
    simulerApi((requete) =>
      requete.methode === 'POST'
        ? json(
            {
              code: 'PROMOTION_EN_CONFLIT',
              message: 'Une promotion existe déjà sur cette période.',
            },
            409,
          )
        : undefined,
    )
    render(<CatalogueAdminPage />)
    const panneau = await ouvrirLivre()

    fireEvent.change(within(panneau).getByLabelText('Remise (%)'), { target: { value: '10' } })
    fireEvent.change(within(panneau).getByLabelText('Début'), { target: { value: '2026-10-20' } })
    fireEvent.change(within(panneau).getByLabelText('Fin'), { target: { value: '2026-10-25' } })
    fireEvent.click(within(panneau).getByRole('button', { name: 'Programmer la promotion' }))

    expect(
      await within(panneau).findByText('Une promotion existe déjà sur cette période.'),
    ).toBeInTheDocument()
  })

  it('demande confirmation avant de supprimer un article', async () => {
    const requetes = simulerApi((requete) =>
      requete.methode === 'DELETE' ? new Response(null, { status: 204 }) : undefined,
    )
    const confirmation = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    render(<CatalogueAdminPage />)
    const panneau = await ouvrirLivre()
    const supprimer = within(panneau).getAllByRole('button', { name: 'Supprimer' })[0]

    fireEvent.click(supprimer)
    expect(requetes.some((requete) => requete.methode === 'DELETE')).toBe(false)

    fireEvent.click(supprimer)
    expect(await screen.findByText("« L'Île au trésor » a été supprimé.")).toBeInTheDocument()
    expect(confirmation).toHaveBeenCalledTimes(2)
    expect(requetes.find((requete) => requete.methode === 'DELETE')?.url).toBe('/api/produits/p-1')
  })

  it('retire le filtre d’une catégorie supprimée', async () => {
    let supprimee = false
    const requetes = simulerApi((requete) => {
      if (requete.methode === 'DELETE') {
        supprimee = true
        return new Response(null, { status: 204 })
      }
      if (requete.url === '/api/categories' && supprimee) {
        return json([categories[0]])
      }
      return undefined
    })
    render(<CatalogueAdminPage />)
    await screen.findByRole('option', { name: 'Presse' })
    fireEvent.change(screen.getByLabelText('Catégorie'), { target: { value: 'presse' } })
    fireEvent.click(screen.getByRole('button', { name: 'Catégories' }))

    fireEvent.click(
      within(screen.getByRole('complementary')).getByRole('button', { name: 'Supprimer Presse' }),
    )

    await waitFor(() => expect(screen.getByLabelText('Catégorie')).toHaveValue(''))
    await waitFor(() => expect(requetes.at(-1)?.url).toBe('/api/produits'))
  })

  it('gère les catégories et affiche le refus de suppression', async () => {
    simulerApi((requete) =>
      requete.methode === 'DELETE'
        ? json(
            { code: 'CATEGORIE_UTILISEE', message: 'Cette catégorie est utilisée par un produit.' },
            409,
          )
        : undefined,
    )
    render(<CatalogueAdminPage />)
    await screen.findByRole('option', { name: 'Roman' })
    fireEvent.click(screen.getByRole('button', { name: 'Catégories' }))
    const panneau = screen.getByRole('complementary')

    fireEvent.click(within(panneau).getByRole('button', { name: 'Supprimer Roman' }))

    expect(await within(panneau).findByRole('alert')).toHaveTextContent(
      'Cette catégorie est utilisée par un produit.',
    )
  })
})
