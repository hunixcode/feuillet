import { useCallback, useEffect, useRef, useState } from 'react'
import Button from '../../components/common/Button.tsx'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import Input from '../../components/common/Input.tsx'
import Loader from '../../components/common/Loader.tsx'
import Select from '../../components/common/Select.tsx'
import CourbePrix from '../../components/responsable/CourbePrix.tsx'
import FormulaireProduit from '../../components/responsable/FormulaireProduit.tsx'
import GestionCategories from '../../components/responsable/GestionCategories.tsx'
import PromotionsProduit from '../../components/responsable/PromotionsProduit.tsx'
import { LIBELLES_TYPE, libelleDisponibilite } from '../../components/responsable/libelles'
import {
  changerArchivage,
  creerProduit,
  listerProduits,
  modifierProduit,
  obtenirProduit,
  supprimerProduit,
} from '../../services/catalogueAdminService'
import { listerCategories } from '../../services/categorieService'
import type { Categorie } from '../../types/categorie'
import type { FicheProduit, Produit, TypeProduit } from '../../types/produit'
import { messageErreur } from '../../utils/erreurs'
import { formatXPF } from '../../utils/format'
import './CatalogueAdminPage.css'

type Panneau =
  | { mode: 'creation' }
  | { mode: 'edition'; produit: Produit }
  | { mode: 'categories' }

function CatalogueAdminPage() {
  const [archives, setArchives] = useState(false)
  const [recherche, setRecherche] = useState('')
  const [type, setType] = useState<TypeProduit | ''>('')
  const [categorie, setCategorie] = useState('')
  const [produits, setProduits] = useState<Produit[] | null>(null)
  const [categories, setCategories] = useState<Categorie[]>([])
  const [erreur, setErreur] = useState('')
  const [annonce, setAnnonce] = useState('')
  const [panneau, setPanneau] = useState<Panneau | null>(null)
  const [version, setVersion] = useState(0)
  const [revision, setRevision] = useState(0)
  const refPanneau = useRef<HTMLElement>(null)

  const rafraichir = useCallback(() => setVersion((precedente) => precedente + 1), [])

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
    listerProduits({ q: recherche, type, categorie, archive: archives })
      .then((liste) => {
        if (actif) {
          setProduits(liste)
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
  }, [recherche, type, categorie, archives, version])

  const panneauOuvert = panneau ? `${panneau.mode}-${'produit' in panneau ? panneau.produit.id : ''}` : ''

  useEffect(() => {
    if (panneauOuvert) {
      refPanneau.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
    }
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
          : `« ${misAJour.designation} » a été réactivé.`,
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
    setPanneau(nouveau)
  }

  return (
    <div className="catalogue-admin">
      <header className="catalogue-entete">
        <h1>Catalogue et prix</h1>
        <div className="catalogue-actions">
          <Button type="button" variant="secondary" onClick={() => ouvrir({ mode: 'categories' })}>
            Catégories
          </Button>
          <Button type="button" onClick={() => ouvrir({ mode: 'creation' })}>
            Nouvel article
          </Button>
        </div>
      </header>

      {annonce && (
        <p className="catalogue-annonce" role="status">
          {annonce}
        </p>
      )}
      {erreur && <ErrorMessage>{erreur}</ErrorMessage>}

      <div className={panneau ? 'catalogue-grille catalogue-grille--panneau' : 'catalogue-grille'}>
        <section className="catalogue-liste" aria-label="Articles">
          <div className="catalogue-onglets" role="group" aria-label="Articles affichés">
            <button type="button" aria-pressed={!archives} onClick={() => setArchives(false)}>
              Actifs
            </button>
            <button type="button" aria-pressed={archives} onClick={() => setArchives(true)}>
              Archivés
            </button>
          </div>

          <div className="catalogue-filtres">
            <Input
              label="Rechercher"
              type="search"
              placeholder="Désignation, référence, auteur, ISBN…"
              value={recherche}
              onChange={(evenement) => setRecherche(evenement.target.value)}
            />
            <Select
              label="Type"
              value={type}
              onChange={(evenement) => setType(evenement.target.value as TypeProduit | '')}
            >
              <option value="">Tous les types</option>
              {Object.entries(LIBELLES_TYPE).map(([valeur, libelle]) => (
                <option key={valeur} value={valeur}>
                  {libelle}
                </option>
              ))}
            </Select>
            <Select
              label="Catégorie"
              value={categorie}
              onChange={(evenement) => setCategorie(evenement.target.value)}
            >
              <option value="">Toutes les catégories</option>
              {categories.map((element) => (
                <option key={element.id} value={element.id}>
                  {element.libelle}
                </option>
              ))}
            </Select>
          </div>

          {produits === null && !erreur && <Loader />}
          {produits?.length === 0 && (
            <p className="catalogue-vide">
              {archives ? 'Aucun article archivé ne correspond.' : 'Aucun article ne correspond.'}
            </p>
          )}
          {produits && produits.length > 0 && (
            <div className="catalogue-tableau-cadre">
              <table className="catalogue-tableau">
                <thead>
                  <tr>
                    <th scope="col">Référence</th>
                    <th scope="col">Désignation</th>
                    <th scope="col" className="catalogue-secondaire">Type</th>
                    <th scope="col" className="catalogue-secondaire">Catégorie</th>
                    <th scope="col" className="catalogue-nombre">Prix TTC</th>
                    <th scope="col" className="catalogue-nombre catalogue-secondaire">TVA</th>
                    <th scope="col">Promotion</th>
                    <th scope="col">Disponibilité</th>
                  </tr>
                </thead>
                <tbody>
                  {produits.map((produit) => (
                    <tr
                      key={produit.id}
                      aria-current={
                        panneau?.mode === 'edition' && panneau.produit.id === produit.id
                          ? 'true'
                          : undefined
                      }
                    >
                      <td className="catalogue-reference">{produit.reference}</td>
                      <td>
                        <button
                          type="button"
                          className="catalogue-lien catalogue-lien--fort"
                          onClick={() => ouvrir({ mode: 'edition', produit })}
                        >
                          {produit.designation}
                        </button>
                      </td>
                      <td className="catalogue-secondaire">{LIBELLES_TYPE[produit.type]}</td>
                      <td className="catalogue-secondaire">{libelleCategorie(produit.categorie)}</td>
                      <td className="catalogue-nombre">
                        {produit.promotion ? (
                          <>
                            <s className="catalogue-prix-barre">{formatXPF(produit.prix)}</s>{' '}
                            {formatXPF(produit.prixApplique)}
                          </>
                        ) : (
                          formatXPF(produit.prix)
                        )}
                      </td>
                      <td className="catalogue-nombre catalogue-secondaire">{produit.tauxTva} %</td>
                      <td>
                        {produit.promotion ? (
                          <span className="catalogue-pastille">−{produit.promotion.remise} %</span>
                        ) : (
                          <span className="catalogue-aucune">Aucune</span>
                        )}
                      </td>
                      <td
                        className={
                          !produit.disponibilite
                            ? 'catalogue-disponibilite catalogue-disponibilite--inconnue'
                            : produit.disponibilite === 'epuise'
                              ? 'catalogue-disponibilite catalogue-disponibilite--epuise'
                              : 'catalogue-disponibilite'
                        }
                      >
                        {libelleDisponibilite(produit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {panneau && (
          <aside className="catalogue-panneau" ref={refPanneau}>
            <button
              type="button"
              className="catalogue-fermer"
              onClick={() => setPanneau(null)}
              aria-label="Fermer le panneau"
            >
              ×
            </button>
            {panneau.mode === 'categories' && (
              <GestionCategories categories={categories} onChangement={categoriesModifiees} />
            )}
            {panneau.mode === 'creation' && (
              <section className="catalogue-bloc" aria-labelledby="titre-creation">
                <h2 id="titre-creation">Nouvel article</h2>
                <FormulaireProduit
                  categories={categories}
                  libelleEnvoi="Créer l'article"
                  onEnregistrer={creer}
                  onAnnuler={() => setPanneau(null)}
                />
              </section>
            )}
            {panneau.mode === 'edition' && (
              <>
                <section className="catalogue-bloc" aria-labelledby="titre-edition">
                  <h2 id="titre-edition">{panneau.produit.designation}</h2>
                  {panneau.produit.archive && (
                    <p className="catalogue-pastille catalogue-pastille--neutre">Archivé</p>
                  )}
                  <FormulaireProduit
                    key={`${panneau.produit.id}-${revision}`}
                    fiche={panneau.produit}
                    categories={categories}
                    libelleEnvoi="Enregistrer"
                    onEnregistrer={(fiche) => modifier(panneau.produit, fiche)}
                  />
                  <div className="catalogue-actions catalogue-actions--bas">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => basculerArchivage(panneau.produit)}
                    >
                      {panneau.produit.archive ? 'Réactiver' : 'Archiver'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="catalogue-bouton-danger"
                      onClick={() => supprimer(panneau.produit)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </section>
                <PromotionsProduit
                  key={`promotions-${panneau.produit.id}`}
                  produit={panneau.produit}
                  onChangement={() => actualiserProduit(panneau.produit)}
                />
                <CourbePrix
                  produitId={panneau.produit.id}
                  prixActuel={panneau.produit.prix}
                  promotion={panneau.produit.promotion}
                  prixPromotion={panneau.produit.prixApplique}
                />
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}

export default CatalogueAdminPage
