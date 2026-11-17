import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import ProduitCarte from '../../components/client/ProduitCarte.tsx'
import Segment from '../../components/client/Segment.tsx'
import Button from '../../components/common/Button.tsx'
import { listerCategories } from '../../services/categorieService'
import { listerProduits } from '../../services/produitService'
import type { Categorie } from '../../types/categorie'
import type { Produit } from '../../types/produit'
import { messageErreur } from '../../utils/erreurs'
import { trierRayons } from '../../utils/rayons'

interface Resultat {
  cle: string
  produits: Produit[]
  erreur: string
}

const tris = [
  { valeur: '', libelle: 'Titre' },
  { valeur: 'prix-croissant', libelle: 'Prix croissant' },
  { valeur: 'prix-decroissant', libelle: 'Prix décroissant' },
]

function trier(produits: Produit[], tri: string): Produit[] {
  if (tri === 'prix-croissant') {
    return [...produits].sort((a, b) => a.prixApplique - b.prixApplique)
  }
  if (tri === 'prix-decroissant') {
    return [...produits].sort((a, b) => b.prixApplique - a.prixApplique)
  }
  return produits
}

const types = [
  { valeur: '', libelle: 'Tous les types' },
  { valeur: 'livre', libelle: 'Livres' },
  { valeur: 'magazine', libelle: 'Magazines' },
  { valeur: 'papeterie', libelle: 'Papeterie' },
]

const COURBE = 'cubic-bezier(0.2, 0.7, 0.2, 1)'

type Positions = Map<string, { x: number; y: number }>

function mesurer(conteneur: HTMLElement): Positions {
  const origine = conteneur.getBoundingClientRect()
  const positions: Positions = new Map()
  for (const carte of conteneur.querySelectorAll<HTMLElement>(':scope > li[data-id]')) {
    const rect = carte.getBoundingClientRect()
    positions.set(carte.dataset.id ?? '', { x: rect.left - origine.left, y: rect.top - origine.top })
  }
  return positions
}

function useDeplacementCartes(grille: RefObject<HTMLUListElement | null>, ordre: string) {
  const positions = useRef<Positions>(new Map())

  useLayoutEffect(() => {
    const conteneur = grille.current
    if (!conteneur) {
      return
    }
    const anciennes = positions.current
    const nouvelles = mesurer(conteneur)
    const calme = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    if (!calme && anciennes.size > 0) {
      let arrivees = 0
      for (const carte of conteneur.querySelectorAll<HTMLElement>(':scope > li[data-id]')) {
        if (typeof carte.animate !== 'function') {
          break
        }
        const ancienne = anciennes.get(carte.dataset.id ?? '')
        const nouvelle = nouvelles.get(carte.dataset.id ?? '')
        if (ancienne && nouvelle) {
          const dx = ancienne.x - nouvelle.x
          const dy = ancienne.y - nouvelle.y
          if (dx || dy) {
            carte.animate(
              [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
              { duration: 650, easing: COURBE },
            )
          }
        } else if (!ancienne) {
          carte.animate(
            [{ opacity: 0, transform: 'translateY(18px) scale(0.97)' }, { opacity: 1, transform: 'none' }],
            { duration: 520, delay: Math.min(arrivees, 8) * 35, easing: COURBE, fill: 'backwards' },
          )
          arrivees += 1
        }
      }
    }
    if (nouvelles.size > 0) {
      positions.current = nouvelles
    }
  }, [grille, ordre])

  useEffect(() => {
    const remesurer = () => {
      if (grille.current) {
        positions.current = mesurer(grille.current)
      }
    }
    window.addEventListener('resize', remesurer)
    return () => window.removeEventListener('resize', remesurer)
  }, [grille])
}

function CataloguePage() {
  const navigate = useNavigate()
  const [parametres] = useSearchParams()
  const q = parametres.get('q') ?? ''
  const type = parametres.get('type') ?? ''
  const categorie = parametres.get('categorie') ?? ''
  const tri = parametres.get('tri') ?? ''

  const [categories, setCategories] = useState<Categorie[]>([])
  const [essai, setEssai] = useState(0)
  const [resultat, setResultat] = useState<Resultat | null>(null)

  const cle = `${q}|${type}|${categorie}|${essai}`
  const chargement = resultat?.cle !== cle
  const produits = resultat?.produits ?? []
  const erreur = resultat?.erreur ?? ''
  const affiches = trier(produits, tri)
  const grille = useRef<HTMLUListElement>(null)
  useDeplacementCartes(grille, affiches.map((produit) => produit.id).join(','))

  useEffect(() => {
    let actif = true
    listerCategories()
      .then((liste) => {
        if (actif) {
          setCategories(trierRayons(liste))
        }
      })
      .catch(() => {})
    return () => {
      actif = false
    }
  }, [])

  useEffect(() => {
    let actif = true
    listerProduits({ q, type, categorie })
      .then((liste) => {
        if (actif) {
          setResultat({ cle, produits: liste, erreur: '' })
        }
      })
      .catch((raison: unknown) => {
        if (actif) {
          setResultat({ cle, produits: [], erreur: messageErreur(raison) })
        }
      })
    return () => {
      actif = false
    }
  }, [q, type, categorie, cle])

  function adresseAvec(nom: string, valeur: string) {
    const suivants = new URLSearchParams(parametres)
    if (valeur) {
      suivants.set(nom, valeur)
    } else {
      suivants.delete(nom)
    }
    const texte = suivants.toString()
    return texte ? `/catalogue?${texte}` : '/catalogue'
  }

  function compte() {
    if (chargement) {
      return 'Chargement…'
    }
    if (erreur) {
      return ''
    }
    return produits.length > 1 ? `${produits.length} articles` : `${produits.length} article`
  }

  function contenu() {
    if (chargement && (!resultat || resultat.erreur)) {
      return (
        <>
          <p className="visuellement-cache" role="status">
            Chargement du catalogue
          </p>
          <ul className="produits catalogue-produits" aria-busy="true">
            {Array.from({ length: 10 }, (_, index) => (
              <li key={index}>
                <div className="squelette squelette-tuile" />
                <div className="squelette squelette-ligne" />
                <div className="squelette squelette-ligne squelette-courte" />
              </li>
            ))}
          </ul>
        </>
      )
    }

    if (!chargement && erreur) {
      return (
        <section className="vide" role="alert">
          <h2>Le catalogue n'a pas pu être chargé.</h2>
          <p>{erreur}</p>
          <Button onClick={() => setEssai(essai + 1)}>Réessayer</Button>
        </section>
      )
    }

    if (!chargement && produits.length === 0) {
      return (
        <section className="vide" aria-live="polite">
          <h2>
            {q ? `Aucun article ne correspond à « ${q} ».` : 'Aucun article dans cette sélection.'}
          </h2>
          <p>
            {q
              ? 'Vérifiez l\'orthographe ou essayez avec le nom de l\'auteur. Si ce livre n\'est pas au catalogue, nous pouvons le commander pour vous.'
              : 'Ce rayon n\'a pas encore d\'article. Un livre vous intéresse ? Nous pouvons le commander pour vous.'}
          </p>
          <div className="vide-actions">
            <Link
              className="common-button common-button--primary"
              to={q ? `/demandes?titre=${encodeURIComponent(q)}` : '/demandes'}
            >
              Demander ce livre
            </Link>
            <Link className="common-button common-button--secondary" to="/catalogue">
              Voir tout le catalogue
            </Link>
          </div>
        </section>
      )
    }

    return (
      <>
        {chargement && (
          <p className="visuellement-cache" role="status">
            Chargement du catalogue
          </p>
        )}
        <ul className="produits catalogue-produits" ref={grille} aria-busy={chargement || undefined}>
          {affiches.map((produit) => (
            <li key={produit.id} data-id={produit.id}>
              <ProduitCarte produit={produit} />
            </li>
          ))}
        </ul>
      </>
    )
  }

  return (
    <div className="catalogue">
      <title>Catalogue · Feuillet</title>
      <header className="page-tete">
        <h1 className="page-titre">Catalogue</h1>
        <p className="page-intro">
          Romans, BD, manga, presse et papeterie. Ce qui est affiché est disponible, sauf mention
          contraire.
        </p>
      </header>

      <div className="filtres">
        <nav aria-label="Rayons">
          <ul className="pilules">
            <li>
              <Link to={adresseAvec('categorie', '')} aria-current={categorie ? undefined : 'page'}>
                Tous
              </Link>
            </li>
            {categories.map((rayon) => (
              <li key={rayon.id}>
                <Link
                  to={adresseAvec('categorie', rayon.id)}
                  aria-current={categorie === rayon.id ? 'page' : undefined}
                >
                  {rayon.libelle}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="filtres-droite">
          <label htmlFor="type-catalogue">Type</label>
          <select
            id="type-catalogue"
            className="choix-liste"
            value={type}
            onChange={(evenement) => navigate(adresseAvec('type', evenement.target.value))}
          >
            {types.map((option) => (
              <option key={option.valeur} value={option.valeur}>
                {option.libelle}
              </option>
            ))}
          </select>
          <span>Trier</span>
          <Segment
            libelle="Trier les articles"
            options={tris}
            valeur={tri}
            onChange={(valeur) => navigate(adresseAvec('tri', valeur))}
          />
        </div>
      </div>

      <section className="catalogue-grille" aria-label="Articles">
        {q && (
          <p className="catalogue-recherche">
            Recherche : « {q} ». <Link to={adresseAvec('q', '')}>Tout afficher</Link>
          </p>
        )}
        <p className="catalogue-compte" aria-live="polite">
          {compte()}
        </p>
        {contenu()}
      </section>
    </div>
  )
}

export default CataloguePage
