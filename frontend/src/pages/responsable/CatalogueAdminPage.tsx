import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import Segment from '../../components/client/Segment.tsx'
import Button from '../../components/common/Button.tsx'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import Loader from '../../components/common/Loader.tsx'
import CourbePrix from '../../components/responsable/CourbePrix.tsx'
import FormulaireProduit from '../../components/responsable/FormulaireProduit.tsx'
import GestionCategories from '../../components/responsable/GestionCategories.tsx'
import IconeAdmin from '../../components/responsable/IconeAdmin.tsx'
import PromotionsProduit from '../../components/responsable/PromotionsProduit.tsx'
import SeuilAlerteProduit from '../../components/responsable/SeuilAlerteProduit.tsx'
import Vignette from '../../components/responsable/Vignette.tsx'
import { LIBELLES_TYPE } from '../../components/responsable/libelles'
import {
  changerArchivage,
  creerProduit,
  listerProduits,
  modifierProduit,
  obtenirProduit,
  supprimerProduit,
} from '../../services/catalogueAdminService'
import { listerCategories } from '../../services/categorieService'
import { listerProduitsAReapprovisionner, listerSeuilsAlerte } from '../../services/reapproService'
import { listerStock } from '../../services/stockService'
import type { Categorie } from '../../types/categorie'
import type { FicheProduit, Produit, TypeProduit } from '../../types/produit'
import type { SeuilAlerte } from '../../types/reappro'
import type { LigneStock } from '../../types/stock'
import { nombre } from '../../utils/datesAdmin'
import { messageErreur } from '../../utils/erreurs'
import { useOuverture } from '../../utils/ouvertureAdmin'
import { formatXPF } from '../../utils/format'

type Panneau =
  | { mode: 'creation' }
  | { mode: 'edition'; produit: Produit }
  | { mode: 'categories' }

type Vue = 'liste' | 'rayon'

const TYPES: { valeur: TypeProduit | ''; libelle: string }[] = [
  { valeur: '', libelle: 'Tous' },
  { valeur: 'livre', libelle: 'Livres' },
  { valeur: 'magazine', libelle: 'Magazines' },
  { valeur: 'papeterie', libelle: 'Papeterie' },
]

const LIBELLES_PANNEAU: Record<Panneau['mode'], string> = {
  creation: 'Nouvel article',
  edition: 'Article choisi',
  categories: 'Catégories',
}

function simplifier(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

function signature(produit: Produit): string | undefined {
  if (produit.auteur) return produit.auteur
  if (produit.marque) return produit.marque
  return produit.numero !== undefined ? `N° ${produit.numero}` : undefined
}

function Prix({ produit, enLigne = false }: { produit: Produit; enLigne?: boolean }) {
  if (!produit.promotion) {
    return <>{formatXPF(produit.prix)}</>
  }
  return (
    <>
      {formatXPF(produit.prixApplique)}
      <span className="prix-barre" style={enLigne ? { display: 'inline', marginLeft: 6 } : undefined}>
        <s>{formatXPF(produit.prix)}</s>
        {`−${produit.promotion.remise} %`}
      </span>
    </>
  )
}

function Disponibilite({ produit, bas }: { produit: Produit; bas: boolean }) {
  if (produit.archive) return <span className="statut statut-fini">Archivé</span>
  if (!produit.disponibilite) return <span className="statut statut-fini">Non renseigné</span>
  if (produit.disponibilite === 'epuise') return <span className="statut statut-fini">Épuisé</span>
  if (bas) return <span className="statut statut-bas">Stock bas</span>
  return <span className="statut statut-dispo">Disponible</span>
}

function partVendable(stock: LigneStock): number {
  return stock.quantitePhysique > 0 ? Math.round((stock.quantiteVendable / stock.quantitePhysique) * 100) : 0
}

function bulleStock(stock: LigneStock | undefined, seuil: SeuilAlerte | undefined) {
  const texteSeuil = seuil
    ? `Seuil d’alerte : ${seuil.seuilAlerte} %${seuil.parDefaut ? ', celui par défaut' : ', propre à l’article'}.`
    : 'Seuil d’alerte non renseigné.'
  if (!stock) {
    return { 'data-bulle-titre': 'Stock non renseigné', 'data-bulle-texte': texteSeuil }
  }
  return {
    'data-bulle-titre': `${stock.quantiteVendable} en vente sur ${stock.quantitePhysique} en rayon`,
    'data-bulle-texte': `${stock.quantiteMiseDeCote} mis de côté, ${stock.quantiteDefectueuse} défectueux. ${texteSeuil}`,
  }
}

function CatalogueAdminPage() {
  const [archives, setArchives] = useState(false)
  const [recherche, setRecherche] = useState('')
  const [type, setType] = useState<TypeProduit | ''>('')
  const [categorie, setCategorie] = useState('')
  const [vue, setVue] = useState<Vue>('liste')
  const [actifs, setActifs] = useState<Produit[] | null>(null)
  const [archivesListe, setArchivesListe] = useState<Produit[]>([])
  const [categories, setCategories] = useState<Categorie[]>([])
  const [seuils, setSeuils] = useState<Map<string, SeuilAlerte>>(new Map())
  const [stocks, setStocks] = useState<Map<string, LigneStock>>(new Map())
  const [bas, setBas] = useState<Set<string>>(new Set())
  const [erreur, setErreur] = useState('')
  const [annonce, setAnnonce] = useState('')
  const [panneau, setPanneau] = useState<Panneau | null>(null)
  const [version, setVersion] = useState(0)
  const [revision, setRevision] = useState(0)
  const refFermer = useRef<HTMLButtonElement>(null)

  const [aOuvrir, setAOuvrir] = useState<string | null>(null)

  const rafraichir = useCallback(() => setVersion((precedente) => precedente + 1), [])

  useOuverture(['article', 'nouvel-article'], (ouverture) => {
    if (ouverture.cible === 'nouvel-article') {
      ouvrir({ mode: 'creation' })
    } else {
      setAOuvrir(ouverture.id ?? null)
    }
  })

  if (aOuvrir && actifs) {
    const produit = [...actifs, ...archivesListe].find((element) => element.id === aOuvrir)
    setAOuvrir(null)
    if (produit) {
      setArchives(produit.archive)
      setPanneau({ mode: 'edition', produit })
    }
  }

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
    Promise.all([listerProduits(), listerProduits({ archive: true })])
      .then(([enVente, archivesChargees]) => {
        if (actif) {
          setActifs(enVente)
          setArchivesListe(archivesChargees)
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
  }, [version])

  useEffect(() => {
    let actif = true
    Promise.all([
      listerSeuilsAlerte().catch(() => []),
      listerStock().catch(() => [] as LigneStock[]),
      listerProduitsAReapprovisionner().catch(() => []),
    ]).then(([listeSeuils, listeStock, aRecommander]) => {
      if (actif) {
        setSeuils(new Map(listeSeuils.map(({ produitId, ...seuil }) => [produitId, seuil])))
        setStocks(new Map(listeStock.map((ligne) => [ligne.produitId, ligne])))
        setBas(new Set(aRecommander.map((article) => article.produitId)))
      }
    })
    return () => {
      actif = false
    }
  }, [version])

  useEffect(() => {
    if (!annonce) {
      return
    }
    const minuteur = window.setTimeout(() => setAnnonce(''), 4000)
    return () => window.clearTimeout(minuteur)
  }, [annonce])

  const panneauOuvert = panneau ? `${panneau.mode}-${'produit' in panneau ? panneau.produit.id : ''}` : ''

  useEffect(() => {
    if (!panneauOuvert) {
      return
    }
    refFermer.current?.focus({ preventScroll: true })
    function echap(evenement: globalThis.KeyboardEvent) {
      if (evenement.key === 'Escape') {
        setPanneau(null)
      }
    }
    document.addEventListener('keydown', echap)
    return () => document.removeEventListener('keydown', echap)
  }, [panneauOuvert])

  const libelleCategorie = (id: string) =>
    categories.find((element) => element.id === id)?.libelle ?? id

  async function executer(action: () => Promise<void>) {
    setAnnonce('')
    setErreur('')
    try {
      await action()
    } catch (probleme) {
      setErreur(messageErreur(probleme))
    }
  }

  async function creer(fiche: FicheProduit) {
    setAnnonce('')
    const produit = await creerProduit(fiche)
    setAnnonce(`« ${produit.designation} » a été ajouté au catalogue.`)
    setPanneau({ mode: 'edition', produit })
    rafraichir()
  }

  async function modifier(produit: Produit, fiche: FicheProduit) {
    setAnnonce('')
    const misAJour = await modifierProduit(produit.id, fiche)
    setAnnonce(`« ${misAJour.designation} » a été enregistré.`)
    setPanneau({ mode: 'edition', produit: misAJour })
    setRevision((precedente) => precedente + 1)
    rafraichir()
  }

  function basculerArchivage(produit: Produit) {
    return executer(async () => {
      const misAJour = await changerArchivage(produit, !produit.archive)
      setAnnonce(
        misAJour.archive
          ? `« ${misAJour.designation} » a été archivé.`
          : `« ${misAJour.designation} » a été remis en vente.`,
      )
      setPanneau(null)
      rafraichir()
    })
  }

  function supprimer(produit: Produit) {
    if (!window.confirm(`Supprimer définitivement « ${produit.designation} » ?`)) {
      return
    }
    return executer(async () => {
      await supprimerProduit(produit.id)
      setAnnonce(`« ${produit.designation} » a été supprimé.`)
      setPanneau(null)
      rafraichir()
    })
  }

  function actualiserProduit(produit: Produit) {
    return executer(async () => {
      setPanneau({ mode: 'edition', produit: await obtenirProduit(produit.id) })
      rafraichir()
    })
  }

  async function categoriesModifiees() {
    const liste = await listerCategories()
    setCategories(liste)
    if (categorie && !liste.some((element) => element.id === categorie)) {
      setCategorie('')
    }
    rafraichir()
  }

  function ouvrir(nouveau: Panneau) {
    setAnnonce('')
    setErreur('')
    setPanneau(nouveau)
  }

  function clavier(evenement: KeyboardEvent<HTMLElement>, produit: Produit) {
    if (evenement.target === evenement.currentTarget && (evenement.key === 'Enter' || evenement.key === ' ')) {
      evenement.preventDefault()
      ouvrir({ mode: 'edition', produit })
    }
  }

  const texte = simplifier(recherche.trim())
  const visibles = (archives ? archivesListe : (actifs ?? []))
    .filter((produit) => !type || produit.type === type)
    .filter((produit) => !categorie || produit.categorie === categorie)
    .filter(
      (produit) =>
        !texte ||
        simplifier(
          [produit.designation, produit.reference, produit.auteur, produit.isbn, produit.marque]
            .filter(Boolean)
            .join(' '),
        ).includes(texte),
    )
  const choisi = panneau?.mode === 'edition' ? panneau.produit : null

  return (
    <>
      <title>Catalogue et prix · Feuillet</title>
      <header className="tete">
        <div>
          <h1>Catalogue et prix</h1>
          <p>Chaque changement de prix reste dans l’historique de l’article.</p>
        </div>
        <div className="tete-actions">
          <button
            className="bouton bouton-petit bouton-contour"
            type="button"
            onClick={() => ouvrir({ mode: 'categories' })}
          >
            Catégories
          </button>
          <button className="bouton bouton-petit" type="button" onClick={() => ouvrir({ mode: 'creation' })}>
            <IconeAdmin nom="plus" epaisseur={2} />
            Nouvel article
          </button>
        </div>
      </header>

      {erreur && !panneau && <ErrorMessage>{erreur}</ErrorMessage>}

      <section className="feuille" aria-label="Articles">
        <div className="outils">
          <Segment
            libelle="Articles affichés"
            valeur={archives ? 'archives' : 'actifs'}
            onChange={(valeur) => setArchives(valeur === 'archives')}
            options={[
              { valeur: 'actifs', libelle: 'En vente', compte: actifs?.length ?? 0 },
              { valeur: 'archives', libelle: 'Archivés', compte: archivesListe.length },
            ]}
          />
          <div className="pilules" role="group" aria-label="Type d’article">
            {TYPES.map((option) => (
              <button
                key={option.valeur}
                type="button"
                aria-pressed={type === option.valeur}
                onClick={() => setType(option.valeur)}
              >
                {option.libelle}
              </button>
            ))}
          </div>
          <select
            className="choix-liste"
            aria-label="Filtrer par catégorie"
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
          <label className="cherche">
            <IconeAdmin nom="loupe" epaisseur={1.8} />
            <input
              type="search"
              placeholder="Titre, auteur ou référence"
              aria-label="Rechercher un article"
              value={recherche}
              onChange={(evenement) => setRecherche(evenement.target.value)}
            />
          </label>
          <div className="outils-droite">
            <Segment
              libelle="Présentation"
              valeur={vue}
              onChange={(valeur) => setVue(valeur as Vue)}
              options={[
                { valeur: 'liste', libelle: 'Liste' },
                { valeur: 'rayon', libelle: 'Rayon' },
              ]}
            />
          </div>
        </div>

        {actifs === null && !erreur && <Loader />}

        {actifs && visibles.length > 0 && vue === 'liste' && (
          <table className="liste">
            <thead>
              <tr>
                <th scope="col">Article</th>
                <th
                  scope="col"
                  className="optionnel"
                  data-bulle-titre="Rayon"
                  data-bulle-texte="Catégorie de l’article et son type. Les clients filtrent le catalogue par catégorie."
                >
                  Rayon
                </th>
                <th
                  scope="col"
                  className="num"
                  data-bulle-titre="Prix TTC"
                  data-bulle-texte="Prix payé par le client, en XPF. En promotion, l’ancien prix est barré sous le prix remisé."
                >
                  Prix TTC
                </th>
                <th
                  scope="col"
                  className="num optionnel-large"
                  data-bulle-titre="TVA"
                  data-bulle-texte="Taux de TVA déjà compris dans le prix TTC."
                >
                  TVA
                </th>
                <th
                  scope="col"
                  className="optionnel"
                  data-bulle-titre="En vente"
                  data-bulle-texte="Exemplaires vendables sur ceux en rayon : les mis de côté et les défectueux ne se vendent pas. Le stock se gère dans la page Stock."
                >
                  En vente
                </th>
                <th
                  scope="col"
                  data-bulle-titre="Disponibilité"
                  data-bulle-texte="« Stock bas » quand le stock vendable passe sous le seuil d’alerte, « Non renseigné » si le stock n’est pas encore connu."
                >
                  Disponibilité
                </th>
                <th scope="col" className="chevron">
                  <span hidden>Ouvrir</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((produit) => {
                const stock = stocks.get(produit.id)
                const signe = signature(produit)
                return (
                  <tr
                    key={produit.id}
                    tabIndex={0}
                    className={choisi?.id === produit.id ? 'selectionnee' : undefined}
                    onClick={() => ouvrir({ mode: 'edition', produit })}
                    onKeyDown={(evenement) => clavier(evenement, produit)}
                  >
                    <td>
                      <span className="article">
                        <Vignette key={produit.isbn} isbn={produit.isbn} type={produit.type} />
                        <span>
                          <span className="article-titre">{produit.designation}</span>
                          <span className="article-meta">
                            {signe ? `${signe}, ${produit.reference}` : produit.reference}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="optionnel">
                      <span className="article-titre" style={{ fontWeight: 500 }}>
                        {libelleCategorie(produit.categorie)}
                      </span>
                      <span className="article-meta">{LIBELLES_TYPE[produit.type]}</span>
                    </td>
                    <td className="num fort">
                      <Prix produit={produit} />
                    </td>
                    <td className="num optionnel-large gris">{`${produit.tauxTva} %`}</td>
                    <td className="optionnel" {...bulleStock(stock, seuils.get(produit.id))}>
                      {stock ? (
                        <span className="progression">
                          <span>{`${stock.quantiteVendable} sur ${stock.quantitePhysique}`}</span>
                          <span className={bas.has(produit.id) ? 'jauge jauge-alerte' : 'jauge'}>
                            <span style={{ width: `${Math.max(2, Math.min(100, partVendable(stock)))}%` }} />
                          </span>
                        </span>
                      ) : (
                        <span className="gris">—</span>
                      )}
                    </td>
                    <td>
                      <Disponibilite produit={produit} bas={bas.has(produit.id)} />
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

        {actifs && visibles.length > 0 && vue === 'rayon' && (
          <div className="etagere" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            {visibles.map((produit) => {
              const stock = stocks.get(produit.id)
              const epuise = produit.disponibilite === 'epuise'
              const marque = produit.archive ? 'Archivé' : epuise ? 'Épuisé' : bas.has(produit.id) ? 'Stock bas' : ''
              return (
                <article className="casier" key={produit.id}>
                  <button
                    type="button"
                    className="casier-visuel"
                    aria-label={`Ouvrir ${produit.designation}`}
                    onClick={() => ouvrir({ mode: 'edition', produit })}
                  >
                    {marque && (
                      <span
                        className={
                          epuise || stock?.quantiteVendable === 0 ? 'casier-part casier-part-vide' : 'casier-part'
                        }
                      >
                        {marque}
                      </span>
                    )}
                    <Vignette key={produit.isbn} nu isbn={produit.isbn} type={produit.type} />
                  </button>
                  <h3 className="casier-titre">{produit.designation}</h3>
                  <p className="casier-meta">
                    <Prix produit={produit} enLigne />
                  </p>
                </article>
              )
            })}
          </div>
        )}

        {actifs && visibles.length === 0 && (
          <p className="vide-liste">
            {archives ? 'Aucun article archivé ne correspond.' : 'Aucun article ne correspond.'}
          </p>
        )}
      </section>

      <div className={annonce ? 'message-admin visible' : 'message-admin'} role="status" aria-live="polite">
        <IconeAdmin nom="coche" epaisseur={3} />
        <span>{annonce}</span>
      </div>

      {panneau && (
        <>
          <div className="tiroir-fond ouvert" aria-hidden="true" onClick={() => setPanneau(null)} />
          <aside className="tiroir ouvert" aria-label={LIBELLES_PANNEAU[panneau.mode]}>
            <div className="tiroir-barre">
              <span>
                {panneau.mode === 'edition'
                  ? `${panneau.produit.reference}, ${LIBELLES_TYPE[panneau.produit.type].toLowerCase()}`
                  : LIBELLES_PANNEAU[panneau.mode]}
              </span>
              <button
                ref={refFermer}
                className="bouton-fermer"
                type="button"
                aria-label="Fermer le volet"
                onClick={() => setPanneau(null)}
              >
                Fermer
              </button>
            </div>

            {erreur && <ErrorMessage>{erreur}</ErrorMessage>}

            {panneau.mode === 'categories' && (
              <GestionCategories categories={categories} onChangement={categoriesModifiees} />
            )}

            {panneau.mode === 'creation' && (
              <>
                <h2 className="tiroir-titre" style={{ marginTop: 4 }}>
                  Nouvel article
                </h2>
                <p className="tiroir-meta">
                  Le prix de départ devient la première entrée de l’historique des prix.
                </p>
                <section className="tiroir-section" aria-label="Fiche du nouvel article">
                  <FormulaireProduit
                    categories={categories}
                    libelleEnvoi="Créer l'article"
                    onEnregistrer={creer}
                    onAnnuler={() => setPanneau(null)}
                  />
                </section>
              </>
            )}

            {panneau.mode === 'edition' && (
              <FicheArticle
                produit={panneau.produit}
                revision={revision}
                categories={categories}
                stock={stocks.get(panneau.produit.id)}
                bas={bas.has(panneau.produit.id)}
                libelleCategorie={libelleCategorie(panneau.produit.categorie)}
                onModifier={(fiche) => modifier(panneau.produit, fiche)}
                onArchiver={() => basculerArchivage(panneau.produit)}
                onSupprimer={() => supprimer(panneau.produit)}
                onPromotion={() => actualiserProduit(panneau.produit)}
                onSeuil={rafraichir}
              />
            )}
          </aside>
        </>
      )}
    </>
  )
}

interface FicheArticleProps {
  produit: Produit
  revision: number
  categories: Categorie[]
  stock?: LigneStock
  bas: boolean
  libelleCategorie: string
  onModifier: (fiche: FicheProduit) => Promise<void>
  onArchiver: () => void
  onSupprimer: () => void
  onPromotion: () => void
  onSeuil: () => void
}

function FicheArticle({
  produit,
  revision,
  categories,
  stock,
  bas,
  libelleCategorie,
  onModifier,
  onArchiver,
  onSupprimer,
  onPromotion,
  onSeuil,
}: FicheArticleProps) {
  const signe = signature(produit)
  return (
    <>
      <div className="scene">
        <Disponibilite produit={produit} bas={bas} />
        <Vignette key={produit.isbn} nu isbn={produit.isbn} type={produit.type} />
      </div>
      <h2 className="tiroir-titre">{produit.designation}</h2>
      <p className="tiroir-meta">{signe ? `${signe}, ${libelleCategorie}` : libelleCategorie}</p>
      <dl className="chiffres">
        <div className="chiffre-fort">
          <dt>Prix de vente</dt>
          <dd>{nombre(produit.prixApplique)}</dd>
        </div>
        <div>
          <dt>En vente</dt>
          <dd>{stock ? stock.quantiteVendable : '—'}</dd>
        </div>
        <div>
          <dt>Mis de côté</dt>
          <dd>{stock ? stock.quantiteMiseDeCote : '—'}</dd>
        </div>
        <div>
          <dt>Défectueux</dt>
          <dd>{stock ? stock.quantiteDefectueuse : '—'}</dd>
        </div>
      </dl>

      <CourbePrix
        produitId={produit.id}
        prixActuel={produit.prix}
        promotion={produit.promotion}
        prixPromotion={produit.prixApplique}
      />

      <PromotionsProduit key={`promotions-${produit.id}`} produit={produit} onChangement={onPromotion} />

      <section className="tiroir-section" aria-labelledby="titre-fiche">
        <h3 id="titre-fiche">Fiche</h3>
        <FormulaireProduit
          key={`${produit.id}-${revision}`}
          fiche={produit}
          categories={categories}
          libelleEnvoi="Enregistrer"
          onEnregistrer={onModifier}
          actions={
            <>
              <Button type="button" variant="secondary" onClick={onArchiver}>
                {produit.archive ? 'Remettre en vente' : 'Archiver'}
              </Button>
              <button type="button" className="action-ligne" onClick={onSupprimer}>
                Supprimer l’article
              </button>
            </>
          }
        />
        <p className="tiroir-note">
          Un article qui a déjà des ventes, des mouvements de stock ou des demandes ne peut pas être
          supprimé : archivez-le.
        </p>
      </section>

      <SeuilAlerteProduit key={`seuil-${produit.id}`} produit={produit} onChangement={onSeuil} />
    </>
  )
}

export default CatalogueAdminPage
