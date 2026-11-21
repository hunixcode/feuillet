import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import Segment from '../../components/client/Segment.tsx'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import Loader from '../../components/common/Loader.tsx'
import FormulaireDefectueux from '../../components/responsable/FormulaireDefectueux.tsx'
import FormulaireInventaire from '../../components/responsable/FormulaireInventaire.tsx'
import IconeAdmin from '../../components/responsable/IconeAdmin.tsx'
import JournalMouvements from '../../components/responsable/JournalMouvements.tsx'
import Vignette from '../../components/responsable/Vignette.tsx'
import {
  LIBELLES_MOUVEMENT,
  LIBELLES_OPERATEUR,
  LIBELLES_TYPE,
  libelleQuantiteMouvement,
} from '../../components/responsable/libelles'
import { listerProduits } from '../../services/catalogueAdminService'
import { listerCategories } from '../../services/categorieService'
import { listerProduitsAReapprovisionner, listerSeuilsAlerte } from '../../services/reapproService'
import { listerMouvements, listerStock, type FiltresMouvements } from '../../services/stockService'
import type { Categorie } from '../../types/categorie'
import type { Produit, TypeProduit } from '../../types/produit'
import type { ProduitAReapprovisionner, SeuilAlerte } from '../../types/reappro'
import type { LigneStock, Mouvement } from '../../types/stock'
import { dateCourte, heure, jourDe } from '../../utils/datesAdmin'
import { messageErreur } from '../../utils/erreurs'
import { useOuverture } from '../../utils/ouvertureAdmin'

type FiltreEtat = 'tous' | 'sous-seuil' | 'epuises' | 'defectueux'
type Action = 'inventaire' | 'abime' | 'sortie'

const ETATS: { valeur: FiltreEtat; libelle: string }[] = [
  { valeur: 'tous', libelle: 'Tous' },
  { valeur: 'sous-seuil', libelle: 'Stock bas' },
  { valeur: 'epuises', libelle: 'Épuisés' },
  { valeur: 'defectueux', libelle: 'Avec défectueux' },
]

function Etat({ ligne, bas }: { ligne: LigneStock; bas: boolean }) {
  if (ligne.quantiteVendable === 0) return <span className="statut statut-fini">Épuisé</span>
  if (bas) return <span className="statut statut-bas">Stock bas</span>
  return <span className="statut statut-dispo">Disponible</span>
}

function somme(lignes: LigneStock[], cle: keyof LigneStock): number {
  return lignes.reduce((total, ligne) => total + (ligne[cle] as number), 0)
}

function Bilan({ articles }: { articles: LigneStock[] }) {
  const reserve = somme(articles, 'quantitePhysique')
  const enVente = somme(articles, 'quantiteVendable')
  const cote = somme(articles, 'quantiteMiseDeCote')
  const defectueux = somme(articles, 'quantiteDefectueuse')
  const ensemble = Math.max(1, reserve + defectueux)
  const part = (nombre: number) => `${(nombre / ensemble) * 100}%`
  return (
    <dl className="bilan-stock">
      <div>
        <dt>En réserve</dt>
        <dd>{reserve}</dd>
      </div>
      <div>
        <dt>En vente</dt>
        <dd>{enVente}</dd>
      </div>
      <div>
        <dt>Mis de côté</dt>
        <dd>{cote}</dd>
      </div>
      <div>
        <dt>Défectueux</dt>
        <dd>{defectueux}</dd>
      </div>
      <div className="repartition-zone">
        <div className="legende">
          <span>
            <i />
            En vente
          </span>
          <span>
            <i className="part-cote" />
            Mis de côté
          </span>
          <span>
            <i className="part-defectueux" />
            Défectueux, hors vente
          </span>
        </div>
        <div
          className="repartition"
          role="img"
          aria-label={`${enVente} en vente, ${cote} mis de côté, ${defectueux} défectueux`}
        >
          <span style={{ width: part(enVente) }} />
          <span className="part-cote" style={{ width: part(cote) }} />
          <span className="part-defectueux" style={{ width: part(defectueux) }} />
        </div>
      </div>
    </dl>
  )
}

function StockPage() {
  const [recherche, setRecherche] = useState('')
  const [type, setType] = useState<TypeProduit | ''>('')
  const [categorie, setCategorie] = useState('')
  const [filtreEtat, setFiltreEtat] = useState<FiltreEtat>('tous')
  const [lignes, setLignes] = useState<LigneStock[] | null>(null)
  const [articles, setArticles] = useState<LigneStock[]>([])
  const [aRecommander, setARecommander] = useState<ProduitAReapprovisionner[]>([])
  const [seuils, setSeuils] = useState<Map<string, SeuilAlerte>>(new Map())
  const [produits, setProduits] = useState<Map<string, Produit>>(new Map())
  const [categories, setCategories] = useState<Categorie[]>([])
  const [mouvements, setMouvements] = useState<Mouvement[] | null>(null)
  const [filtresJournal, setFiltresJournal] = useState<FiltresMouvements>({})
  const [selection, setSelection] = useState('')
  const [action, setAction] = useState<Action>('inventaire')
  const [mouvementsArticle, setMouvementsArticle] = useState<Mouvement[] | null>(null)
  const [erreur, setErreur] = useState('')
  const [version, setVersion] = useState(0)
  const refFermer = useRef<HTMLButtonElement>(null)

  const rafraichir = useCallback(() => setVersion((precedente) => precedente + 1), [])

  useOuverture(['journal'], () => {
    document.getElementById('titre-journal')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  })

  useEffect(() => {
    let actif = true
    listerCategories()
      .then((liste) => {
        if (actif) {
          setCategories(liste)
        }
      })
      .catch((probleme: unknown) => {
        if (actif) {
          setErreur(messageErreur(probleme))
        }
      })
    return () => {
      actif = false
    }
  }, [])

  useEffect(() => {
    let actif = true
    listerStock({ q: recherche, type, categorie })
      .then((liste) => {
        if (actif) {
          setLignes(liste)
          setErreur('')
        }
      })
      .catch((probleme: unknown) => {
        if (actif) {
          setErreur(messageErreur(probleme))
        }
      })
    return () => {
      actif = false
    }
  }, [recherche, type, categorie, version])

  useEffect(() => {
    let actif = true
    listerStock()
      .then((liste) => {
        if (actif) {
          setArticles(liste)
        }
      })
      .catch((probleme: unknown) => {
        if (actif) {
          setErreur(messageErreur(probleme))
        }
      })
    return () => {
      actif = false
    }
  }, [version])

  useEffect(() => {
    let actif = true
    Promise.all([
      listerProduitsAReapprovisionner().catch(() => [] as ProduitAReapprovisionner[]),
      listerSeuilsAlerte().catch(() => []),
      listerProduits().catch(() => [] as Produit[]),
    ]).then(([sousSeuil, listeSeuils, liste]) => {
      if (actif) {
        setARecommander(sousSeuil)
        setSeuils(new Map(listeSeuils.map(({ produitId, ...seuil }) => [produitId, seuil])))
        setProduits(new Map(liste.map((produit) => [produit.id, produit])))
      }
    })
    return () => {
      actif = false
    }
  }, [version])

  useEffect(() => {
    let actif = true
    listerMouvements(filtresJournal)
      .then((liste) => {
        if (actif) {
          setMouvements(liste)
        }
      })
      .catch((probleme: unknown) => {
        if (actif) {
          setErreur(messageErreur(probleme))
        }
      })
    return () => {
      actif = false
    }
  }, [filtresJournal, version])

  useEffect(() => {
    if (!selection) {
      return
    }
    let actif = true
    listerMouvements({ produit: selection })
      .then((liste) => {
        if (actif) {
          setMouvementsArticle(liste)
        }
      })
      .catch(() => {
        if (actif) {
          setMouvementsArticle([])
        }
      })
    return () => {
      actif = false
    }
  }, [selection, version])

  useEffect(() => {
    if (!selection) {
      return
    }
    refFermer.current?.focus({ preventScroll: true })
    function echap(evenement: globalThis.KeyboardEvent) {
      if (evenement.key === 'Escape') {
        setSelection('')
      }
    }
    document.addEventListener('keydown', echap)
    return () => document.removeEventListener('keydown', echap)
  }, [selection])

  const sousSeuil = new Set(aRecommander.map((article) => article.produitId))

  const lignesAffichees = lignes?.filter((ligne) => {
    if (filtreEtat === 'sous-seuil') {
      return sousSeuil.has(ligne.produitId)
    }
    if (filtreEtat === 'epuises') {
      return ligne.quantiteVendable === 0
    }
    if (filtreEtat === 'defectueux') {
      return ligne.quantiteDefectueuse > 0
    }
    return true
  })

  const ligneChoisie = articles.find((article) => article.produitId === selection)

  function choisir(ligne: LigneStock) {
    setMouvementsArticle(null)
    setAction('inventaire')
    setSelection(ligne.produitId)
  }

  function clavier(evenement: KeyboardEvent<HTMLTableRowElement>, ligne: LigneStock) {
    if (evenement.target === evenement.currentTarget && (evenement.key === 'Enter' || evenement.key === ' ')) {
      evenement.preventDefault()
      choisir(ligne)
    }
  }

  function descriptionArticle(produitId: string): string {
    const reappro = aRecommander.find((article) => article.produitId === produitId)
    if (reappro) {
      return `${reappro.quantiteAcheteeOrigine} achetés à la dernière réception, seuil d’alerte à ${reappro.seuilAlerte} %`
    }
    const seuil = seuils.get(produitId)
    if (seuil) {
      return `Seuil d’alerte à ${seuil.seuilAlerte} %${seuil.parDefaut ? ', celui par défaut' : ''}`
    }
    const produit = produits.get(produitId)
    return produit ? LIBELLES_TYPE[produit.type] : ''
  }

  return (
    <>
      <title>Stock et mouvements · Feuillet</title>
      <header className="tete">
        <div>
          <h1>Stock et mouvements</h1>
          <p>Ce qui est en réserve, ce qui est gardé pour un client, et chaque entrée ou sortie.</p>
        </div>
      </header>

      {erreur && <ErrorMessage>{erreur}</ErrorMessage>}

      <section className="feuille" aria-label="Stock par article">
        <Bilan articles={articles} />
        <div className="outils">
          <label className="cherche">
            <IconeAdmin nom="loupe" epaisseur={1.8} />
            <input
              type="search"
              placeholder="Titre ou référence"
              aria-label="Rechercher un article"
              value={recherche}
              onChange={(evenement) => setRecherche(evenement.target.value)}
            />
          </label>
          <div className="pilules" role="group" aria-label="État du stock">
            {ETATS.map((option) => (
              <button
                key={option.valeur}
                type="button"
                aria-pressed={filtreEtat === option.valeur}
                onClick={() => setFiltreEtat(option.valeur)}
              >
                {option.libelle}
              </button>
            ))}
          </div>
          <select
            className="choix-liste"
            aria-label="Type d’article"
            value={type}
            onChange={(evenement) => setType(evenement.target.value as TypeProduit | '')}
          >
            <option value="">Tous les types</option>
            {Object.entries(LIBELLES_TYPE).map(([valeur, libelle]) => (
              <option key={valeur} value={valeur}>
                {libelle}
              </option>
            ))}
          </select>
          <select
            className="choix-liste"
            aria-label="Catégorie"
            value={categorie}
            onChange={(evenement) => setCategorie(evenement.target.value)}
          >
            <option value="">Toutes les catégories</option>
            {categories.map((element) => (
              <option key={element.id} value={element.id}>
                {element.libelle}
              </option>
            ))}
          </select>
        </div>

        {lignesAffichees === undefined && !erreur && <Loader />}
        {lignesAffichees?.length === 0 && <p className="vide-liste">Aucun article ne correspond.</p>}
        {lignesAffichees && lignesAffichees.length > 0 && (
          <table className="liste">
            <thead>
              <tr>
                <th scope="col">Article</th>
                <th
                  scope="col"
                  className="num optionnel"
                  data-bulle-titre="En réserve"
                  data-bulle-texte="Exemplaires en magasin, mises de côté comprises. Les défectueux sont rangés à part."
                >
                  En réserve
                </th>
                <th
                  scope="col"
                  className="num optionnel"
                  data-bulle-titre="Mis de côté"
                  data-bulle-texte="Exemplaires gardés pour des clients qui les avaient demandés : ils ne se vendent pas à quelqu’un d’autre."
                >
                  Mis de côté
                </th>
                <th
                  scope="col"
                  className="num"
                  data-bulle-titre="En vente"
                  data-bulle-texte="En réserve moins mis de côté : ce que les clients peuvent encore commander."
                >
                  En vente
                </th>
                <th
                  scope="col"
                  className="num optionnel"
                  data-bulle-titre="Défectueux"
                  data-bulle-texte="Exemplaires abîmés, jamais vendables, en attente de renvoi au fournisseur ou de destruction."
                >
                  Défectueux
                </th>
                <th
                  scope="col"
                  className="optionnel-large"
                  data-bulle-titre="État"
                  data-bulle-texte="« Stock bas » quand le stock en vente passe sous le seuil d’alerte de l’article."
                >
                  État
                </th>
                <th scope="col" className="chevron">
                  <span hidden>Ouvrir</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lignesAffichees.map((ligne) => {
                const produit = produits.get(ligne.produitId)
                return (
                  <tr
                    key={ligne.produitId}
                    tabIndex={0}
                    className={selection === ligne.produitId ? 'selectionnee' : undefined}
                    onClick={() => choisir(ligne)}
                    onKeyDown={(evenement) => clavier(evenement, ligne)}
                  >
                    <td>
                      <span className="article">
                        <Vignette key={produit?.isbn} isbn={produit?.isbn} type={produit?.type} />
                        <span>
                          <span className="article-titre">{ligne.designation}</span>
                          <span className="article-meta">{ligne.reference}</span>
                        </span>
                      </span>
                    </td>
                    <td className="num optionnel">{ligne.quantitePhysique}</td>
                    <td className={ligne.quantiteMiseDeCote ? 'num optionnel' : 'num optionnel gris'}>
                      {ligne.quantiteMiseDeCote}
                    </td>
                    <td className="num fort">{ligne.quantiteVendable}</td>
                    <td className={ligne.quantiteDefectueuse ? 'num optionnel' : 'num optionnel gris'}>
                      {ligne.quantiteDefectueuse}
                    </td>
                    <td className="optionnel-large">
                      <Etat ligne={ligne} bas={sousSeuil.has(ligne.produitId)} />
                    </td>
                    <td className="chevron">
                      <IconeAdmin nom="chevron" epaisseur={2} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="feuille" aria-labelledby="titre-journal">
        <div className="feuille-tete">
          <h2 className="feuille-titre" id="titre-journal">
            Journal des mouvements
          </h2>
          <p className="feuille-note">Chaque entrée ou sortie de stock, de la plus récente à la plus ancienne.</p>
        </div>
        {mouvements === null && !erreur && <Loader />}
        {mouvements && (
          <JournalMouvements
            mouvements={mouvements}
            articles={articles}
            produits={produits}
            filtres={filtresJournal}
            onFiltres={setFiltresJournal}
          />
        )}
      </section>

      {ligneChoisie && (
        <>
          <div className="tiroir-fond ouvert" aria-hidden="true" onClick={() => setSelection('')} />
          <aside className="tiroir ouvert" aria-label="Article choisi">
            <div className="tiroir-barre">
              <span>{ligneChoisie.reference}</span>
              <button
                ref={refFermer}
                className="bouton-fermer"
                type="button"
                aria-label="Fermer le volet"
                onClick={() => setSelection('')}
              >
                Fermer
              </button>
            </div>
            <div className="scene">
              <Etat ligne={ligneChoisie} bas={sousSeuil.has(ligneChoisie.produitId)} />
              <Vignette
                key={produits.get(ligneChoisie.produitId)?.isbn}
                nu
                isbn={produits.get(ligneChoisie.produitId)?.isbn}
                type={produits.get(ligneChoisie.produitId)?.type}
              />
            </div>
            <h2 className="tiroir-titre">{ligneChoisie.designation}</h2>
            <p className="tiroir-meta">{descriptionArticle(ligneChoisie.produitId)}</p>
            <dl className="chiffres">
              <div>
                <dt>En réserve</dt>
                <dd>{ligneChoisie.quantitePhysique}</dd>
              </div>
              <div>
                <dt>Mis de côté</dt>
                <dd>{ligneChoisie.quantiteMiseDeCote}</dd>
              </div>
              <div className="chiffre-fort">
                <dt>En vente</dt>
                <dd>{ligneChoisie.quantiteVendable}</dd>
              </div>
              <div>
                <dt>Défectueux</dt>
                <dd>{ligneChoisie.quantiteDefectueuse}</dd>
              </div>
            </dl>

            <section className="tiroir-section" aria-labelledby="titre-corriger">
              <h3 id="titre-corriger">Corriger le stock</h3>
              <div className="formulaire-stock-choix">
                <Segment
                  libelle="Correction à faire"
                  valeur={action}
                  onChange={(valeur) => setAction(valeur as Action)}
                  options={[
                    { valeur: 'inventaire', libelle: 'Inventaire' },
                    { valeur: 'abime', libelle: 'Abîmé' },
                    { valeur: 'sortie', libelle: 'Sortie du défectueux' },
                  ]}
                />
              </div>
              {action === 'inventaire' && (
                <FormulaireInventaire
                  key={`inventaire-${ligneChoisie.produitId}`}
                  integre
                  ligne={ligneChoisie}
                  onChangement={rafraichir}
                  onRecharger={rafraichir}
                />
              )}
              {action !== 'inventaire' && (
                <FormulaireDefectueux
                  key={`${action}-${ligneChoisie.produitId}`}
                  modeImpose={action === 'sortie' ? 'sortie' : 'declaration'}
                  ligne={ligneChoisie}
                  onChangement={rafraichir}
                  onRecharger={rafraichir}
                />
              )}
            </section>

            <section className="tiroir-section" aria-labelledby="titre-mouvements-article">
              <h3 id="titre-mouvements-article">
                Mouvements
                {mouvementsArticle && (
                  <small>
                    {mouvementsArticle.length === 0
                      ? 'aucun'
                      : `${mouvementsArticle.length} enregistré${mouvementsArticle.length > 1 ? 's' : ''}`}
                  </small>
                )}
              </h3>
              {mouvementsArticle === null && <Loader />}
              {mouvementsArticle?.length === 0 && (
                <p className="tiroir-note">Aucun mouvement pour cet article.</p>
              )}
              {mouvementsArticle && mouvementsArticle.length > 0 && (
                <ul className="journal">
                  {mouvementsArticle.map((mouvement) => (
                    <li key={mouvement.id}>
                      <time dateTime={mouvement.date}>
                        {`${dateCourte(jourDe(mouvement.date))}, ${heure(mouvement.date)}`}
                      </time>
                      <span>
                        {LIBELLES_MOUVEMENT[mouvement.type]}
                        <small>{`${mouvement.motif}, ${LIBELLES_OPERATEUR[mouvement.operateur].toLowerCase()}`}</small>
                      </span>
                      <span className={mouvement.quantite > 0 ? 'signe-plus' : 'signe-moins'}>
                        {libelleQuantiteMouvement(mouvement)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </>
      )}
    </>
  )
}

export default StockPage
