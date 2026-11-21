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
  auteur: 'Robert Louis Stevenson',
  disponibilite: 'disponible',
  promotion: { id: 'pr-1', remise: 15, debut: '2026-10-10', fin: '2026-10-31' },
}

const magazine: Produit = {
  id: 'p-3',
  reference: 'MAG-002',
  designation: 'Tahiti Mag',
  type: 'magazine',
  categorie: 'presse',
  prix: 500,
  tauxTva: 5,
  archive: false,
  prixApplique: 500,
  numero: 12,
  disponibilite: 'disponible',
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
  if (url === '/api/seuils-alerte') {
    return json([{ produitId: 'p-1', seuilAlerte: 20, parDefaut: true }])
  }
  if (url === '/api/stock') {
    return json([
      {
        produitId: 'p-1',
        reference: 'LIV-001',
        designation: "L'Île au trésor",
        quantitePhysique: 10,
        quantiteMiseDeCote: 1,
        quantiteDefectueuse: 1,
        quantiteVendable: 8,
      },
    ])
  }
  if (url === '/api/reapprovisionnement') {
    return json([])
  }
  if (url.endsWith('/seuil-alerte')) {
    return json({ seuilAlerte: 20, parDefaut: true })
  }
  if (url.endsWith('/promotions')) {
    return json([livre.promotion])
  }
  if (url.endsWith('/historique-prix')) {
    return json([
      { date: '2026-09-01T20:00:00.000Z', prix: 1600 },
      { date: '2026-10-01T20:00:00.000Z', prix: 1800 },
    ])
  }
  if (url === '/api/produits?archive=true') {
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

function titres() {
  return Array.from(document.querySelectorAll('.liste tbody .article')).map(
    (article) => article.querySelector('.article-titre')?.textContent,
  )
}

async function ligne(titre: string) {
  const element = await screen.findByText(titre, { selector: '.article .article-titre' })
  return element.closest('tr') as HTMLElement
}

async function ouvrirLivre() {
  fireEvent.click(await ligne("L'Île au trésor"))
  return screen.getByRole('complementary', { name: 'Article choisi' })
}

describe('page catalogue du responsable', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('affiche les articles en vente avec leur rayon, leur prix remisé et les compteurs', async () => {
    simulerApi()
    render(<CatalogueAdminPage />)

    const rangee = await ligne("L'Île au trésor")
    expect(within(rangee).getByText('Robert Louis Stevenson, LIV-001')).toBeInTheDocument()
    expect(await within(rangee).findByText('Roman')).toBeInTheDocument()
    expect(within(rangee).getByText('Livre')).toBeInTheDocument()
    expect(within(rangee).getByText('1 800 XPF')).toBeInTheDocument()
    expect(rangee).toHaveTextContent('1 530 XPF')
    expect(rangee).toHaveTextContent('−15 %')
    expect(screen.getByRole('button', { name: /^En vente/ })).toHaveTextContent('En vente1')
    expect(await screen.findByRole('button', { name: /^Archivés/ })).toHaveTextContent('Archivés1')
    expect(document.title).toBe('Catalogue et prix · Feuillet')
  })

  it('donne la disponibilité de chaque article et signale le stock bas', async () => {
    simulerApi((requete) => {
      if (requete.url === '/api/produits') {
        return json([
          livre,
          { ...magazineArchive, archive: false, designation: 'Magazine épuisé', disponibilite: 'epuise' },
          { ...magazineArchive, id: 'p-4', archive: false, designation: 'Sans stock connu' },
          { ...magazine, id: 'p-5', designation: 'Presque vendu' },
        ])
      }
      if (requete.url === '/api/reapprovisionnement') {
        return json([{ produitId: 'p-5' }])
      }
      return undefined
    })
    render(<CatalogueAdminPage />)

    expect(within(await ligne("L'Île au trésor")).getByText('Disponible')).toHaveClass('statut-dispo')
    expect(within(await ligne('Magazine épuisé')).getByText('Épuisé')).toHaveClass('statut-fini')
    expect(within(await ligne('Sans stock connu')).getByText('Non renseigné')).toBeInTheDocument()
    expect(await within(await ligne('Presque vendu')).findByText('Stock bas')).toHaveClass('statut-bas')
  })

  it('montre le stock vendable et rappelle le seuil d alerte dans la bulle', async () => {
    simulerApi()
    render(<CatalogueAdminPage />)

    const rangee = await ligne("L'Île au trésor")
    const cellule = await within(rangee).findByText('8 sur 10')
    const bulle = cellule.closest('td') as HTMLElement
    expect(bulle).toHaveAttribute('data-bulle-titre', '8 en vente sur 10 en rayon')
    expect(bulle.getAttribute('data-bulle-texte')).toContain('1 mis de côté, 1 défectueux.')
    expect(bulle.getAttribute('data-bulle-texte')).toContain('Seuil d’alerte : 20 %, celui par défaut.')
  })

  it('garde le catalogue si le stock et les seuils ne se chargent pas', async () => {
    simulerApi((requete) =>
      requete.url === '/api/seuils-alerte' || requete.url === '/api/stock'
        ? json({ code: 'ERREUR_SERVEUR', message: 'Erreur.' }, 500)
        : undefined,
    )
    render(<CatalogueAdminPage />)

    const rangee = await ligne("L'Île au trésor")
    expect(within(rangee).getByText('—')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('filtre par type, par catégorie et par recherche, sans tenir compte des accents', async () => {
    simulerApi((requete) => (requete.url === '/api/produits' ? json([livre, magazine]) : undefined))
    render(<CatalogueAdminPage />)
    await ligne('Tahiti Mag')
    await screen.findByRole('option', { name: 'Presse' })

    fireEvent.click(screen.getByRole('button', { name: 'Magazines' }))
    expect(titres()).toEqual(['Tahiti Mag'])
    expect(screen.getByRole('button', { name: 'Magazines' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Tous' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrer par catégorie' }), {
      target: { value: 'roman' },
    })
    expect(titres()).toEqual(["L'Île au trésor"])

    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrer par catégorie' }), { target: { value: '' } })
    fireEvent.change(screen.getByRole('searchbox', { name: 'Rechercher un article' }), {
      target: { value: 'ile au tresor' },
    })
    expect(titres()).toEqual(["L'Île au trésor"])

    fireEvent.change(screen.getByRole('searchbox', { name: 'Rechercher un article' }), {
      target: { value: 'introuvable' },
    })
    expect(screen.getByText('Aucun article ne correspond.')).toBeInTheDocument()
  })

  it('affiche séparément les articles archivés', async () => {
    const requetes = simulerApi()
    render(<CatalogueAdminPage />)
    await ligne("L'Île au trésor")

    fireEvent.click(screen.getByRole('button', { name: /^Archivés/ }))

    expect(titres()).toEqual(['Ancien magazine'])
    expect(within(await ligne('Ancien magazine')).getByText('Archivé')).toHaveClass('statut-fini')
    expect(requetes.some((requete) => requete.url === '/api/produits?archive=true')).toBe(true)
  })

  it('présente les articles en rayon et ouvre un article depuis son casier', async () => {
    simulerApi()
    render(<CatalogueAdminPage />)
    await ligne("L'Île au trésor")

    fireEvent.click(screen.getByRole('button', { name: 'Rayon' }))

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: "Ouvrir L'Île au trésor" }))
    expect(screen.getByRole('complementary', { name: 'Article choisi' })).toBeInTheDocument()
  })

  it('ouvre et ferme le volet d un article au clavier et par le fond', async () => {
    simulerApi()
    render(<CatalogueAdminPage />)
    const rangee = await ligne("L'Île au trésor")

    fireEvent.keyDown(rangee, { key: 'Enter' })
    expect(screen.getByRole('button', { name: 'Fermer le volet' })).toHaveFocus()
    expect(screen.getByText('LIV-001, livre')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()

    fireEvent.click(rangee)
    fireEvent.click(document.querySelector('.tiroir-fond') as Element)
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('donne les chiffres de l article et dessine l évolution de son prix avec la promotion', async () => {
    simulerApi()
    render(<CatalogueAdminPage />)
    const volet = within(await ouvrirLivre())

    expect(volet.getByRole('heading', { name: "L'Île au trésor" })).toBeInTheDocument()
    expect(volet.getByText('Robert Louis Stevenson, Roman')).toBeInTheDocument()
    expect(volet.getByText('Prix de vente').nextElementSibling).toHaveTextContent('1 530')
    expect(volet.getByText('Mis de côté').nextElementSibling).toHaveTextContent('1')

    const courbe = await volet.findByRole('img', {
      name: 'Évolution du prix : 2 prix enregistrés, promotion en cours',
    })
    expect(volet.getByRole('heading', { name: /^Évolution du prix/ })).toHaveTextContent('1 changement')
    expect(volet.getByText('Depuis le 1er octobre 2026')).toBeInTheDocument()
    expect(courbe).toHaveTextContent('Promotion −15 %, 1 530')
    expect(courbe).toHaveTextContent('sept. 26')
    expect(courbe.querySelectorAll('.point')).toHaveLength(2)
    expect(volet.getByRole('cell', { name: '1 600 XPF' })).toBeInTheDocument()
  })

  it('met à jour le seuil d alerte depuis la fiche et recharge le catalogue', async () => {
    const requetes = simulerApi((requete) =>
      requete.methode === 'PUT' && requete.url.endsWith('/seuil-alerte')
        ? json({ seuilAlerte: 40, parDefaut: false })
        : undefined,
    )
    render(<CatalogueAdminPage />)
    const volet = within(await ouvrirLivre())
    const chargements = () => requetes.filter((requete) => requete.url === '/api/seuils-alerte').length
    const avant = chargements()

    fireEvent.change(await volet.findByLabelText('Seuil d’alerte (%)'), { target: { value: '40' } })
    fireEvent.click(volet.getByRole('button', { name: 'Enregistrer le seuil' }))

    expect(await volet.findByText('Seuil d’alerte enregistré : 40 %.')).toBeInTheDocument()
    await waitFor(() => expect(chargements()).toBeGreaterThan(avant))
  })

  it('crée un article avec les champs du type choisi', async () => {
    const requetes = simulerApi((requete) =>
      requete.methode === 'POST' ? json({ ...magazine, id: 'p-9' }, 201) : undefined,
    )
    render(<CatalogueAdminPage />)
    await screen.findByRole('option', { name: 'Presse' })
    fireEvent.click(screen.getByRole('button', { name: 'Nouvel article' }))
    const volet = within(screen.getByRole('complementary', { name: 'Nouvel article' }))

    fireEvent.change(volet.getByLabelText('Référence'), { target: { value: 'MAG-002' } })
    fireEvent.change(volet.getByLabelText('Type'), { target: { value: 'magazine' } })
    fireEvent.change(volet.getByLabelText('Désignation'), { target: { value: 'Tahiti Mag' } })
    fireEvent.change(volet.getByLabelText('Catégorie'), { target: { value: 'presse' } })
    fireEvent.change(volet.getByLabelText('Prix TTC (XPF)'), { target: { value: '500' } })
    fireEvent.change(volet.getByLabelText('Taux de TVA (%)'), { target: { value: '5' } })
    fireEvent.change(volet.getByLabelText('Numéro'), { target: { value: '12' } })
    expect(volet.queryByLabelText('ISBN')).not.toBeInTheDocument()
    fireEvent.click(volet.getByRole('button', { name: "Créer l'article" }))

    expect(await screen.findByText('« Tahiti Mag » a été ajouté au catalogue.')).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Article choisi' })).toBeInTheDocument()
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
    const volet = within(screen.getByRole('complementary', { name: 'Nouvel article' }))
    fireEvent.click(volet.getByRole('button', { name: "Créer l'article" }))

    expect(await volet.findByText('Cette référence existe déjà.')).toBeInTheDocument()
    expect(volet.getByLabelText('Référence')).toHaveAttribute('aria-invalid', 'true')
  })

  it('ouvre un article avec sa promotion en cours, son seuil, puis l archive', async () => {
    const requetes = simulerApi((requete) =>
      requete.methode === 'PUT' ? json({ ...livre, archive: true }) : undefined,
    )
    render(<CatalogueAdminPage />)
    const volet = within(await ouvrirLivre())

    expect(volet.getByLabelText('Référence')).toHaveValue('LIV-001')
    expect(volet.getByText(/L’article est vendu 1 530 XPF/)).toBeInTheDocument()
    expect(await volet.findByRole('button', { name: /^Supprimer la promotion de 15 %/ })).toBeInTheDocument()
    expect(volet.getByRole('heading', { name: 'Seuil d’alerte' })).toBeInTheDocument()
    expect(await volet.findByText(/Seuil actuel/)).toHaveTextContent('20 %, celui par défaut')

    fireEvent.click(volet.getByRole('button', { name: 'Archiver' }))

    expect(await screen.findByText("« L'Île au trésor » a été archivé.")).toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    const modification = requetes.find((requete) => requete.methode === 'PUT')
    expect(modification?.url).toBe('/api/produits/p-1')
    expect(modification?.corps).toMatchObject({ archive: true, reference: 'LIV-001' })
  })

  it('propose de remettre en vente un article archivé', async () => {
    simulerApi((requete) =>
      requete.methode === 'PUT' ? json({ ...magazineArchive, archive: false }) : undefined,
    )
    render(<CatalogueAdminPage />)
    await ligne("L'Île au trésor")
    fireEvent.click(screen.getByRole('button', { name: /^Archivés/ }))
    fireEvent.click(await ligne('Ancien magazine'))

    fireEvent.click(screen.getByRole('button', { name: 'Remettre en vente' }))

    expect(await screen.findByText('« Ancien magazine » a été remis en vente.')).toBeInTheDocument()
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
    const volet = within(await ouvrirLivre())
    fireEvent.click(volet.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByText("« L'Île au trésor » a été enregistré.")).toBeInTheDocument()

    fireEvent.click(volet.getByRole('button', { name: 'Archiver' }))

    expect(await volet.findByText('Le serveur ne répond pas.')).toBeInTheDocument()
    expect(screen.queryByText("« L'Île au trésor » a été enregistré.")).not.toBeInTheDocument()
  })

  it('programme une promotion et affiche un conflit de dates', async () => {
    simulerApi((requete) =>
      requete.methode === 'POST'
        ? json({ code: 'PROMOTION_EN_CONFLIT', message: 'Une promotion existe déjà sur cette période.' }, 409)
        : undefined,
    )
    render(<CatalogueAdminPage />)
    const volet = within(await ouvrirLivre())

    fireEvent.change(volet.getByLabelText('Remise (%)'), { target: { value: '10' } })
    fireEvent.change(volet.getByLabelText('Début'), { target: { value: '2026-10-20' } })
    fireEvent.change(volet.getByLabelText('Fin'), { target: { value: '2026-10-25' } })
    fireEvent.click(volet.getByRole('button', { name: 'Programmer la promotion' }))

    expect(await volet.findByText('Une promotion existe déjà sur cette période.')).toBeInTheDocument()
  })

  it('demande confirmation avant de supprimer un article', async () => {
    const requetes = simulerApi((requete) =>
      requete.methode === 'DELETE' ? new Response(null, { status: 204 }) : undefined,
    )
    const confirmation = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    render(<CatalogueAdminPage />)
    const volet = within(await ouvrirLivre())
    const supprimer = volet.getByRole('button', { name: 'Supprimer l’article' })

    fireEvent.click(supprimer)
    expect(requetes.some((requete) => requete.methode === 'DELETE')).toBe(false)

    fireEvent.click(supprimer)
    expect(await screen.findByText("« L'Île au trésor » a été supprimé.")).toBeInTheDocument()
    expect(confirmation).toHaveBeenCalledTimes(2)
    expect(requetes.find((requete) => requete.methode === 'DELETE')?.url).toBe('/api/produits/p-1')
  })

  it('retire le filtre d’une catégorie supprimée', async () => {
    let supprimee = false
    simulerApi((requete) => {
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
    const filtre = screen.getByRole('combobox', { name: 'Filtrer par catégorie' })
    fireEvent.change(filtre, { target: { value: 'presse' } })
    fireEvent.click(screen.getByRole('button', { name: 'Catégories' }))

    fireEvent.click(
      within(screen.getByRole('complementary', { name: 'Catégories' })).getByRole('button', {
        name: 'Supprimer Presse',
      }),
    )

    await waitFor(() => expect(filtre).toHaveValue(''))
  })

  it('gère les catégories et affiche le refus de suppression', async () => {
    simulerApi((requete) =>
      requete.methode === 'DELETE'
        ? json({ code: 'CATEGORIE_UTILISEE', message: 'Cette catégorie est utilisée par un produit.' }, 409)
        : undefined,
    )
    render(<CatalogueAdminPage />)
    await screen.findByRole('option', { name: 'Roman' })
    fireEvent.click(screen.getByRole('button', { name: 'Catégories' }))
    const volet = within(screen.getByRole('complementary', { name: 'Catégories' }))

    fireEvent.click(volet.getByRole('button', { name: 'Supprimer Roman' }))

    expect(await volet.findByRole('alert')).toHaveTextContent('Cette catégorie est utilisée par un produit.')
  })

  it('affiche une erreur de chargement du catalogue', async () => {
    simulerApi((requete) =>
      requete.url.startsWith('/api/produits')
        ? json({ code: 'INTERDIT', message: 'Accès réservé au responsable.' }, 403)
        : undefined,
    )
    render(<CatalogueAdminPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Accès réservé au responsable.')
  })
})
