import { useEffect, useState, type SubmitEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import ProduitCarte from '../../components/client/ProduitCarte.tsx'
import Button from '../../components/common/Button.tsx'
import { listerCategories } from '../../services/categorieService'
import { listerMeilleuresVentes, listerProduits } from '../../services/produitService'
import type { Categorie } from '../../types/categorie'
import type { Produit } from '../../types/produit'
import { messageErreur } from '../../utils/erreurs'
import './CataloguePage.css'

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

function CataloguePage() {
  const navigate = useNavigate()
  const [parametres] = useSearchParams()
  const q = parametres.get('q') ?? ''
  const type = parametres.get('type') ?? ''
  const categorie = parametres.get('categorie') ?? ''
  const tri = parametres.get('tri') ?? ''

  const [categories, setCategories] = useState<Categorie[]>([])
  const [meilleuresVentes, setMeilleuresVentes] = useState<Produit[]>([])
  const [essai, setEssai] = useState(0)
  const [resultat, setResultat] = useState<Resultat | null>(null)

  const cle = `${q}|${type}|${categorie}|${essai}`
  const chargement = resultat?.cle !== cle
  const produits = resultat?.produits ?? []
  const erreur = resultat?.erreur ?? ''

  useEffect(() => {
    let actif = true
    listerCategories()
      .then((liste) => {
        if (actif) {
          setCategories(liste)
        }
      })
      .catch(() => {})
    return () => {
      actif = false
    }
  }, [])

  useEffect(() => {
    let actif = true
    listerMeilleuresVentes()
      .then((liste) => {
        if (actif) {
          setMeilleuresVentes(liste)
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

  function rechercher(evenement: SubmitEvent<HTMLFormElement>) {
    evenement.preventDefault()
    const saisie = new FormData(evenement.currentTarget).get('q')
    navigate(adresseAvec('q', typeof saisie === 'string' ? saisie.trim() : ''))
  }

  function intro() {
    if (chargement) {
      return 'Chargement…'
    }
    if (erreur) {
      return ''
    }
    return produits.length > 1 ? `${produits.length} articles` : `${produits.length} article`
  }

  function contenu() {
    if (chargement) {
      return (
        <>
          <p className="visuellement-cache" role="status">
            Chargement du catalogue
          </p>
          <ul className="rayonnage" aria-busy="true">
            {Array.from({ length: 8 }, (_, index) => (
              <li key={index}>
                <div className="squelette squelette-couverture" />
                <div className="squelette squelette-ligne" />
                <div className="squelette squelette-ligne squelette-courte" />
              </li>
            ))}
          </ul>
        </>
      )
    }

    if (erreur) {
      return (
        <section className="vide" role="alert">
          <h2>Le catalogue n'a pas pu être chargé.</h2>
          <p>{erreur}</p>
          <div className="achat-ligne">
            <Button onClick={() => setEssai(essai + 1)}>Réessayer</Button>
          </div>
        </section>
      )
    }

    if (produits.length === 0) {
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
          <div className="achat-ligne">
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
      <ul className="rayonnage">
        {trier(produits, tri).map((produit) => (
          <li key={produit.id}>
            <ProduitCarte
              produit={produit}
              categorie={categories.find((rayon) => rayon.id === produit.categorie)?.libelle}
            />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="catalogue">
      <title>Catalogue · Feuillet</title>
      <div className="page-intro">
        <h1>Catalogue</h1>
        <p>{intro()}</p>
      </div>

      {!q && !type && !categorie && meilleuresVentes.length > 0 && (
        <section className="meilleures-ventes" aria-labelledby="titre-meilleures-ventes">
          <h2 id="titre-meilleures-ventes">Les meilleures ventes</h2>
          <p>Les articles les plus vendus ces 30 derniers jours.</p>
          <ol>
            {meilleuresVentes.map((produit) => (
              <li key={produit.id}>
                <ProduitCarte
                  produit={produit}
                  categorie={categories.find((rayon) => rayon.id === produit.categorie)?.libelle}
                />
              </li>
            ))}
          </ol>
        </section>
      )}

      <form className="filtres" role="search" onSubmit={rechercher}>
        <div className="recherche">
          <label className="visuellement-cache" htmlFor="recherche-catalogue">
            Rechercher dans le catalogue
          </label>
          <input
            key={q}
            id="recherche-catalogue"
            name="q"
            type="search"
            placeholder="Titre, auteur ou ISBN"
            defaultValue={q}
          />
          <button type="submit">Rechercher</button>
        </div>
        <nav aria-label="Rayons">
          <ul className="rayons">
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
        <div className="tri">
          <div className="tri-champ">
            <label htmlFor="type-catalogue">Type</label>
            <select
              id="type-catalogue"
              value={type}
              onChange={(evenement) => navigate(adresseAvec('type', evenement.target.value))}
            >
              {types.map((option) => (
                <option key={option.valeur} value={option.valeur}>
                  {option.libelle}
                </option>
              ))}
            </select>
          </div>
          <div className="tri-champ">
            <label htmlFor="tri-catalogue">Trier par</label>
            <select
              id="tri-catalogue"
              value={tri}
              onChange={(evenement) => navigate(adresseAvec('tri', evenement.target.value))}
            >
              {tris.map((option) => (
                <option key={option.valeur} value={option.valeur}>
                  {option.libelle}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>

      {contenu()}
    </div>
  )
}

export default CataloguePage
