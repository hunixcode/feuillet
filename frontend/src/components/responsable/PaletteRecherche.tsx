import { Fragment, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { listerProduits } from '../../services/catalogueAdminService'
import { listerDemandes } from '../../services/demandeAdminService'
import { listerFournisseurs } from '../../services/reapproService'
import { listerStock } from '../../services/stockService'
import { listerVentes } from '../../services/venteAdminService'
import type { Demande } from '../../types/demande'
import type { Produit } from '../../types/produit'
import type { Fournisseur } from '../../types/reappro'
import type { LigneStock } from '../../types/stock'
import type { Vente } from '../../types/vente'
import { dateLongue, jourDe } from '../../utils/datesAdmin'
import { formatXPF } from '../../utils/format'
import { demanderOuverture, type Ouverture } from '../../utils/ouvertureAdmin'
import IconeAdmin from './IconeAdmin.tsx'
import Vignette from './Vignette.tsx'

export interface PagePalette {
  cle: string
  to: string
  label: string
}

interface Resultat {
  groupe: string
  titre: string
  meta?: string
  suite?: string
  icone?: string
  produit?: Produit
  to?: string
  ouverture?: Ouverture
  action?: () => void
}

interface Donnees {
  produits: Produit[]
  stocks: Map<string, LigneStock>
  ventes: Vente[]
  demandes: Demande[]
  fournisseurs: Fournisseur[]
}

interface PaletteRechercheProps {
  pages: PagePalette[]
  onFermer: () => void
  onApparence: () => void
}

const PAR_GROUPE = 5

function simplifier(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

function PaletteRecherche({ pages, onFermer, onApparence }: PaletteRechercheProps) {
  const navigate = useNavigate()
  const champ = useRef<HTMLInputElement>(null)
  const zone = useRef<HTMLDivElement>(null)
  const [texte, setTexte] = useState('')
  const [choix, setChoix] = useState(0)
  const [donnees, setDonnees] = useState<Donnees | null>(null)

  useEffect(() => {
    const retour = document.activeElement as HTMLElement | null
    champ.current?.focus()
    return () => retour?.focus?.({ preventScroll: true })
  }, [])

  useEffect(() => {
    let actif = true
    Promise.all([
      listerProduits().catch(() => [] as Produit[]),
      listerStock().catch(() => [] as LigneStock[]),
      listerVentes('').catch(() => [] as Vente[]),
      listerDemandes('').catch(() => [] as Demande[]),
      listerFournisseurs().catch(() => [] as Fournisseur[]),
    ]).then(([produits, stock, ventes, demandes, fournisseurs]) => {
      if (actif) {
        setDonnees({
          produits,
          stocks: new Map(stock.map((ligne) => [ligne.produitId, ligne])),
          ventes,
          demandes,
          fournisseurs,
        })
      }
    })
    return () => {
      actif = false
    }
  }, [])

  const actions: Resultat[] = [
    { groupe: 'Actions', titre: 'Commandes à préparer', meta: 'Ventes et retours', icone: 'ventes', to: '/admin/ventes' },
    {
      groupe: 'Actions',
      titre: 'Nouvel article',
      meta: 'Catalogue et prix',
      icone: 'plus',
      to: '/admin/catalogue',
      ouverture: { cible: 'nouvel-article' },
    },
    {
      groupe: 'Actions',
      titre: 'Nouvelle commande fournisseur',
      meta: 'Fournisseurs',
      icone: 'camion',
      to: '/admin/commandes',
      ouverture: { cible: 'nouvelle-commande' },
    },
    {
      groupe: 'Actions',
      titre: 'Journal des mouvements',
      meta: 'Stock et mouvements',
      icone: 'stock',
      to: '/admin/stock',
      ouverture: { cible: 'journal' },
    },
    { groupe: 'Actions', titre: 'Changer d’apparence', meta: 'Clair ou sombre', icone: 'lune', action: onApparence },
  ]

  const pagesResultats: Resultat[] = pages.map((page) => ({
    groupe: 'Pages',
    titre: page.label,
    icone: page.cle,
    to: page.to,
  }))

  function sources(): Resultat[] {
    if (!donnees) {
      return [...pagesResultats, ...actions]
    }
    const articles = donnees.produits.map((produit) => {
      const stock = donnees.stocks.get(produit.id)
      return {
        groupe: 'Articles',
        titre: produit.designation,
        meta: [produit.auteur ?? produit.marque, produit.reference].filter(Boolean).join(', '),
        produit,
        suite: stock ? `${stock.quantiteVendable} en vente` : undefined,
        to: '/admin/catalogue',
        ouverture: { cible: 'article', id: produit.id },
      } satisfies Resultat
    })
    const ventes = donnees.ventes.map(
      (vente): Resultat => ({
        groupe: 'Commandes clients',
        titre: vente.client.nom,
        meta: `Commande du ${dateLongue(jourDe(vente.date))}, ${formatXPF(vente.total)}`,
        icone: 'ventes',
        suite: vente.statut === 'a_preparer' ? 'À préparer' : 'Expédiée',
        to: '/admin/ventes',
        ouverture: { cible: 'vente', id: vente.id },
      }),
    )
    const demandes = donnees.demandes.map(
      (demande): Resultat => ({
        groupe: 'Demandes',
        titre: demande.titre,
        meta: `Demande de ${demande.client?.nom ?? 'un client'}`,
        icone: 'demandes',
        to: '/admin/demandes',
        ouverture: { cible: 'demande', id: demande.id },
      }),
    )
    const fournisseurs = donnees.fournisseurs.map(
      (fournisseur): Resultat => ({
        groupe: 'Fournisseurs',
        titre: fournisseur.nom,
        meta: fournisseur.contact,
        icone: 'commandes',
        to: '/admin/commandes',
        ouverture: { cible: 'fournisseur', id: fournisseur.id },
      }),
    )
    return [...pagesResultats, ...articles, ...ventes, ...demandes, ...fournisseurs, ...actions]
  }

  const mots = simplifier(texte.trim()).split(/\s+/).filter(Boolean)
  let resultats: Resultat[]
  if (mots.length === 0) {
    resultats = [...actions, ...pagesResultats]
  } else {
    const parGroupe = new Map<string, Resultat[]>()
    for (const resultat of sources()) {
      const contenu = simplifier(`${resultat.titre} ${resultat.meta ?? ''}`)
      if (!mots.every((mot) => contenu.includes(mot))) {
        continue
      }
      const liste = parGroupe.get(resultat.groupe) ?? []
      if (liste.length < PAR_GROUPE) {
        liste.push(resultat)
      }
      parGroupe.set(resultat.groupe, liste)
    }
    resultats = [...parGroupe.values()].flat()
  }
  const actif = resultats.length ? Math.min(choix, resultats.length - 1) : -1

  useEffect(() => {
    zone.current?.querySelector(`#palette-${actif}`)?.scrollIntoView?.({ block: 'nearest' })
  }, [actif])

  function valider(resultat: Resultat | undefined) {
    if (!resultat) {
      return
    }
    onFermer()
    if (resultat.action) {
      resultat.action()
      return
    }
    if (resultat.to) {
      navigate(resultat.to)
    }
    if (resultat.ouverture) {
      demanderOuverture(resultat.ouverture)
    }
  }

  function clavier(evenement: KeyboardEvent<HTMLInputElement>) {
    if (evenement.key === 'ArrowDown' || evenement.key === 'ArrowUp') {
      evenement.preventDefault()
      if (resultats.length) {
        const pas = evenement.key === 'ArrowDown' ? 1 : -1
        setChoix((actif + pas + resultats.length) % resultats.length)
      }
    }
    if (evenement.key === 'Enter') {
      evenement.preventDefault()
      valider(resultats[actif])
    }
  }

  return (
    <>
      <div className="palette-fond" aria-hidden="true" onClick={onFermer} />
      <div className="palette" role="dialog" aria-modal="true" aria-label="Rechercher partout">
        <label className="palette-champ">
          <IconeAdmin nom="loupe" epaisseur={1.8} />
          <input
            ref={champ}
            type="search"
            placeholder="Un article, un client, une page"
            aria-label="Rechercher partout"
            aria-controls="palette-resultats"
            aria-activedescendant={actif >= 0 ? `palette-${actif}` : undefined}
            autoComplete="off"
            value={texte}
            onChange={(evenement) => {
              setTexte(evenement.target.value)
              setChoix(0)
            }}
            onKeyDown={clavier}
          />
        </label>
        <div className="palette-resultats" id="palette-resultats" role="listbox" aria-label="Résultats" ref={zone}>
          {resultats.length === 0 && <p className="palette-vide">{`Rien ne correspond à « ${texte.trim()} ».`}</p>}
          {resultats.map((resultat, index) => {
            const entete = index === 0 || resultats[index - 1].groupe !== resultat.groupe ? resultat.groupe : ''
            return (
              <Fragment key={`${resultat.groupe}-${resultat.titre}-${index}`}>
                {entete && (
                  <p className="palette-groupe" role="presentation">
                    {entete}
                  </p>
                )}
                <a
                  href={resultat.to ?? '#'}
                  role="option"
                  id={`palette-${index}`}
                  aria-selected={index === actif}
                  tabIndex={-1}
                  onMouseMove={() => index !== actif && setChoix(index)}
                  onClick={(evenement) => {
                    evenement.preventDefault()
                    valider(resultat)
                  }}
                >
                  {resultat.produit ? (
                    <Vignette key={resultat.produit.isbn} isbn={resultat.produit.isbn} type={resultat.produit.type} />
                  ) : (
                    <span className="palette-icone">
                      <IconeAdmin nom={resultat.icone ?? 'loupe'} epaisseur={1.7} />
                    </span>
                  )}
                  <span>
                    {resultat.titre}
                    {resultat.meta && <small>{resultat.meta}</small>}
                  </span>
                  <span className="palette-suite">{resultat.suite ?? ''}</span>
                </a>
              </Fragment>
            )
          })}
        </div>
        <div className="palette-pied">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            naviguer
          </span>
          <span>
            <kbd>Entrée</kbd>
            ouvrir
          </span>
          <span>
            <kbd>Échap</kbd>
            fermer
          </span>
        </div>
      </div>
    </>
  )
}

export default PaletteRecherche
