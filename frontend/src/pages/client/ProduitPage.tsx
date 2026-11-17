import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import ChoixQuantite from '../../components/client/ChoixQuantite.tsx'
import Couverture from '../../components/client/Couverture.tsx'
import Prix from '../../components/client/Prix.tsx'
import ProduitCarte from '../../components/client/ProduitCarte.tsx'
import Button from '../../components/common/Button.tsx'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import { useAnnonce } from '../../contexts/useAnnonce'
import { useAuth } from '../../contexts/useAuth'
import { usePanier } from '../../contexts/usePanier'
import { ApiRequestError } from '../../services/api'
import { listerCategories } from '../../services/categorieService'
import { envoyerDemande } from '../../services/demandeService'
import { listerProduits, obtenirProduit } from '../../services/produitService'
import type { Categorie } from '../../types/categorie'
import type { Produit, ProduitDetail, TypeProduit } from '../../types/produit'
import { COUP_DE_COEUR } from '../../utils/coupDeCoeur'
import { messageErreur } from '../../utils/erreurs'
import { formatDate, formatXPF } from '../../utils/format'
import { decouperTitre } from '../../utils/titre'
import NotFoundPage from '../NotFoundPage.tsx'

const TYPES: Record<TypeProduit, string> = {
  livre: 'Livre',
  magazine: 'Magazine',
  papeterie: 'Papeterie',
}

function messageDemande(raison: unknown): string {
  if (raison instanceof ApiRequestError && raison.code === 'DEMANDE_EN_COURS') {
    return 'Vous avez déjà une demande en cours pour cet article.'
  }
  if (raison instanceof ApiRequestError && raison.code === 'PRODUIT_DISPONIBLE') {
    return "Cet article est de nouveau disponible : rechargez la page pour l'ajouter au panier."
  }
  return messageErreur(raison)
}

function DemandeEpuise({ produit }: { produit: ProduitDetail }) {
  const { utilisateur, chargement } = useAuth()
  const [quantite, setQuantite] = useState(1)
  const [envoi, setEnvoi] = useState(false)
  const [envoyee, setEnvoyee] = useState(false)
  const [erreur, setErreur] = useState('')

  async function demander() {
    setEnvoi(true)
    setErreur('')
    try {
      await envoyerDemande({ produitId: produit.id, quantiteSouhaitee: quantite })
      setEnvoyee(true)
    } catch (raison) {
      setErreur(messageDemande(raison))
    } finally {
      setEnvoi(false)
    }
  }

  function action() {
    if (chargement) {
      return null
    }
    if (!utilisateur) {
      return (
        <div className="achat">
          <Link
            className="common-button common-button--primary"
            to="/connexion"
            state={{ depuis: `/produits/${produit.id}` }}
          >
            Se connecter pour demander ce livre
          </Link>
        </div>
      )
    }
    if (utilisateur.role !== 'client') {
      return <p className="aide">Connectez-vous avec un compte client pour demander ce livre.</p>
    }
    if (envoyee) {
      return (
        <p className="aide" role="status">
          Demande enregistrée : nous vous prévenons dès qu'un exemplaire est mis de côté pour
          vous. <Link to="/demandes">Suivre mes demandes</Link>
        </p>
      )
    }
    return (
      <>
        <div className="achat">
          <ChoixQuantite valeur={quantite} onChange={setQuantite} libelle="Quantité souhaitée" />
          <Button onClick={demander} loading={envoi}>
            Demander ce livre
          </Button>
        </div>
        {erreur && <ErrorMessage>{erreur}</ErrorMessage>}
      </>
    )
  }

  return (
    <>
      {action()}
      <p className="aide">
        {produit.arriveePrevue
          ? `Retour en rayon prévu le ${formatDate(produit.arriveePrevue)}. `
          : ''}
        Une demande ne vous engage pas à acheter : l'article vous est mis de côté dès son arrivée.
      </p>
    </>
  )
}

function Achat({ produit }: { produit: ProduitDetail }) {
  const { ajouter } = usePanier()
  const annoncer = useAnnonce()
  const [quantite, setQuantite] = useState(1)
  const [ajoute, setAjoute] = useState(false)
  const [barre, setBarre] = useState(false)
  const bloc = useRef<HTMLDivElement>(null)
  const epuise = produit.disponibilite === 'epuise'

  useEffect(() => {
    if (epuise) {
      return
    }
    const suivre = () => setBarre((bloc.current?.getBoundingClientRect().bottom ?? 1) < 0)
    window.addEventListener('scroll', suivre, { passive: true })
    return () => window.removeEventListener('scroll', suivre)
  }, [epuise])

  if (epuise) {
    return <DemandeEpuise produit={produit} />
  }

  function ajouterAuPanier() {
    ajouter(produit.id, quantite)
    setAjoute(true)
  }

  return (
    <>
      <div className="achat" ref={bloc}>
        <ChoixQuantite valeur={quantite} onChange={setQuantite} libelle="Quantité" />
        <Button onClick={ajouterAuPanier}>Ajouter au panier</Button>
      </div>
      {ajoute && (
        <p className="aide" role="status">
          Ajouté au panier. <Link to="/panier">Voir le panier</Link>
        </p>
      )}
      <div className={barre ? 'barre-achat visible' : 'barre-achat'} aria-hidden={!barre} inert={!barre}>
        <div>
          <p className="barre-prix">
            <Prix montant={produit.prixApplique} />
          </p>
          <p className="barre-dispo">Disponible</p>
        </div>
        <button
          className="bouton"
          type="button"
          onClick={() => {
            ajouterAuPanier()
            annoncer(produit, quantite)
          }}
        >
          Ajouter au panier
        </button>
      </div>
    </>
  )
}

function Similaires({ produit }: { produit: ProduitDetail }) {
  const [resultat, setResultat] = useState<{ id: string; produits: Produit[] } | null>(null)

  useEffect(() => {
    let actif = true
    listerProduits({ categorie: produit.categorie })
      .then((liste) => {
        if (actif && Array.isArray(liste)) {
          setResultat({
            id: produit.id,
            produits: liste.filter((autre) => autre.id !== produit.id).slice(0, 5),
          })
        }
      })
      .catch(() => {})
    return () => {
      actif = false
    }
  }, [produit.id, produit.categorie])

  const produits = resultat?.id === produit.id ? resultat.produits : []
  if (produits.length === 0) {
    return null
  }

  return (
    <section className="section" aria-labelledby="titre-aussi">
      <div className="section-tete">
        <h2 id="titre-aussi">À découvrir aussi</h2>
        <Link className="lien" to="/catalogue">
          Tout le catalogue
        </Link>
      </div>
      <ul className="produits">
        {produits.map((autre) => (
          <li key={autre.id}>
            <ProduitCarte produit={autre} />
          </li>
        ))}
      </ul>
    </section>
  )
}

interface Resultat {
  cle: string
  produit: ProduitDetail | null
  introuvable: boolean
  erreur: string
}

function ProduitPage() {
  const { id = '' } = useParams()
  const [categories, setCategories] = useState<Categorie[]>([])
  const [essai, setEssai] = useState(0)
  const [resultat, setResultat] = useState<Resultat | null>(null)

  const cle = `${id}|${essai}`
  const chargement = resultat?.cle !== cle

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
    obtenirProduit(id)
      .then((produit) => {
        if (actif) {
          setResultat({ cle, produit, introuvable: false, erreur: '' })
        }
      })
      .catch((raison: unknown) => {
        if (actif) {
          setResultat({
            cle,
            produit: null,
            introuvable: raison instanceof ApiRequestError && raison.code === 'INTROUVABLE',
            erreur: messageErreur(raison),
          })
        }
      })
    return () => {
      actif = false
    }
  }, [id, cle])

  if (chargement || !resultat) {
    return (
      <div className="fiche" aria-busy="true">
        <p className="visuellement-cache" role="status">
          Chargement de l'article…
        </p>
        <div className="fiche-scene squelette" />
        <div className="fiche-infos">
          <div className="squelette squelette-ligne squelette-courte" />
          <div className="squelette squelette-titre" />
          <div className="squelette squelette-prix" />
          <div className="squelette squelette-ligne" />
          <div className="squelette squelette-ligne squelette-courte" />
        </div>
      </div>
    )
  }

  if (resultat.introuvable) {
    return <NotFoundPage />
  }

  const produit = resultat.produit
  if (!produit) {
    return (
      <section className="page-corps vide">
        <h1>L'article n'a pas pu être chargé.</h1>
        <ErrorMessage>{resultat.erreur}</ErrorMessage>
        <div className="vide-actions">
          <Button onClick={() => setEssai(essai + 1)}>Réessayer</Button>
          <Link className="common-button common-button--secondary" to="/catalogue">
            Retour au catalogue
          </Link>
        </div>
      </section>
    )
  }

  const categorie = categories.find((rayon) => rayon.id === produit.categorie)?.libelle
  const { titre, tome } = decouperTitre(produit.designation)
  const sousTitre = [produit.auteur ?? produit.marque ?? categorie, tome].filter(Boolean).join(', ')
  const scene =
    produit.reference === COUP_DE_COEUR.reference
      ? ({ '--scene': COUP_DE_COEUR.scene, '--scene-texte': COUP_DE_COEUR.sceneTexte } as CSSProperties)
      : undefined

  const epuise = produit.disponibilite === 'epuise'

  return (
    <>
      <article className="fiche" style={scene}>
        <title>{`${produit.designation} · Feuillet`}</title>
        <div className="fiche-scene">
          <Couverture produit={produit} />
        </div>

        <div className="fiche-infos">
          <nav className="fil" aria-label="Fil d'Ariane">
            <Link to="/catalogue">Catalogue</Link>
            {categorie && (
              <>
                <span aria-hidden="true">/</span>
                <Link to={`/catalogue?categorie=${encodeURIComponent(produit.categorie)}`}>
                  {categorie}
                </Link>
              </>
            )}
          </nav>
          <h1>{titre}</h1>
          {sousTitre && <p className="fiche-auteur">{sousTitre}</p>}
          <p className="fiche-prix">
            <Prix montant={produit.prixApplique} />
            {produit.promotion && (
              <>
                <s>
                  <span className="visuellement-cache">au lieu de </span>
                  {formatXPF(produit.prix)}
                </s>
                <span className="promo">−{produit.promotion.remise} %</span>
              </>
            )}
            {produit.disponibilite && (
              <span className={epuise ? 'dispo dispo-epuise' : 'dispo'}>
                {epuise ? 'Épuisé' : 'Disponible'}
              </span>
            )}
          </p>
          {produit.promotion && (
            <p className="fiche-resume">
              {`Promotion valable jusqu'au ${formatDate(produit.promotion.fin)}.`}
            </p>
          )}

          <Achat key={produit.id} produit={produit} />

          <ul className="fiche-services">
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" />
                <circle cx="7" cy="17.5" r="1.8" />
                <circle cx="17.5" cy="17.5" r="1.8" />
              </svg>
              Livré directement à votre adresse
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <rect x="4" y="9" width="16" height="11" rx="1" />
                <path d="M12 9v11M4 13h16M12 9c-1.5-3-5-3-5-1s3 1 5 1c2 0 5 1 5-1s-3.5-2-5 1" />
              </svg>
              Emballage cadeau au choix dans le panier
            </li>
          </ul>

          <dl className="details">
            <div>
              <dt>Rayon</dt>
              <dd>{categorie ?? produit.categorie}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{TYPES[produit.type]}</dd>
            </div>
            <div>
              <dt>Référence</dt>
              <dd>{produit.reference}</dd>
            </div>
            {produit.type === 'livre' && produit.auteur && (
              <div>
                <dt>Auteur</dt>
                <dd>{produit.auteur}</dd>
              </div>
            )}
            {produit.type === 'livre' && produit.isbn && (
              <div>
                <dt>ISBN</dt>
                <dd>{produit.isbn}</dd>
              </div>
            )}
            {produit.type === 'magazine' && produit.issn && (
              <div>
                <dt>ISSN</dt>
                <dd>{produit.issn}</dd>
              </div>
            )}
            {produit.type === 'magazine' && produit.numero !== undefined && (
              <div>
                <dt>Numéro</dt>
                <dd>{produit.numero}</dd>
              </div>
            )}
            {produit.type === 'magazine' && produit.dateParution && (
              <div>
                <dt>Parution</dt>
                <dd>{formatDate(produit.dateParution)}</dd>
              </div>
            )}
            {produit.type === 'papeterie' && produit.marque && (
              <div>
                <dt>Marque</dt>
                <dd>{produit.marque}</dd>
              </div>
            )}
            <div>
              <dt>TVA</dt>
              <dd>{`${produit.tauxTva} % incluse`}</dd>
            </div>
          </dl>
        </div>
      </article>
      <Similaires produit={produit} />
    </>
  )
}

export default ProduitPage
