import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Couverture from '../../components/client/Couverture.tsx'
import Prix from '../../components/client/Prix.tsx'
import ProduitCarte from '../../components/client/ProduitCarte.tsx'
import Button from '../../components/common/Button.tsx'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import { useAnnonce } from '../../contexts/useAnnonce'
import { usePanier } from '../../contexts/usePanier'
import { listerCategories } from '../../services/categorieService'
import { listerMeilleuresVentes, listerProduits } from '../../services/produitService'
import type { Categorie } from '../../types/categorie'
import type { Produit } from '../../types/produit'
import { COUP_DE_COEUR } from '../../utils/coupDeCoeur'
import { trierRayons } from '../../utils/rayons'
import { decouperTitre } from '../../utils/titre'

const ORDRE_RAYONS = ['roman', 'bd-et-manga', 'policier', 'jeunesse']

const PHRASES: Record<string, string> = {
  roman: 'Les grands classiques, à lire ou à relire.',
  'bd-et-manga': 'Les nouveaux tomes arrivent chaque mois.',
  policier: 'Enquêtes, suspense et gentlemen-cambrioleurs.',
  jeunesse: 'Des histoires pour grandir, à lire seul ou à deux.',
}

const FONDS: Record<string, string> = {
  roman: '#16201a',
  'bd-et-manga': '#000000',
  policier: '#131722',
  jeunesse: '#231a11',
}

interface Donnees {
  categories: Categorie[]
  meilleures: Produit[]
  produits: Produit[]
}

interface Rayon {
  id: string
  libelle: string
  produits: Produit[]
}

function Fleche({ sens }: { sens: 'gauche' | 'droite' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d={sens === 'gauche' ? 'm14.5 6-6 6 6 6' : 'm9.5 6 6 6-6 6'} />
    </svg>
  )
}

function CarrouselRayons({ rayons }: { rayons: Rayon[] }) {
  const [index, setIndex] = useState(0)
  const piste = useRef<HTMLDivElement>(null)
  const attente = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(attente.current), [])

  function aller(cible: number, focaliser = false) {
    const borne = Math.max(0, Math.min(rayons.length - 1, cible))
    setIndex(borne)
    const element = piste.current
    const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    element?.scrollTo?.({ left: borne * element.clientWidth, behavior: reduit ? 'auto' : 'smooth' })
    if (focaliser) {
      document.getElementById(`onglet-${rayons[borne].id}`)?.focus()
    }
  }

  function suivreDefilement() {
    window.clearTimeout(attente.current)
    attente.current = window.setTimeout(() => {
      const element = piste.current
      if (element && element.clientWidth > 0) {
        setIndex(Math.round(element.scrollLeft / element.clientWidth))
      }
    }, 120)
  }

  function clavier(evenement: KeyboardEvent<HTMLDivElement>) {
    const cibles: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: rayons.length - 1,
    }
    if (!(evenement.key in cibles)) {
      return
    }
    evenement.preventDefault()
    aller(cibles[evenement.key], true)
  }

  const rayon = rayons[index]

  return (
    <section
      className="section bande-manga bande-rayons"
      style={{ '--fond-rayon': FONDS[rayon.id] ?? '#000000' } as CSSProperties}
      aria-roledescription="carrousel"
      aria-labelledby="titre-rayon"
    >
      <div className="section-tete">
        <div className="rayon-entete" aria-live="polite" key={rayon.id}>
          <h2 id="titre-rayon">{rayon.libelle}</h2>
          <p>{PHRASES[rayon.id] ?? 'Une sélection du rayon.'}</p>
        </div>
        <div className="carrousel-commandes">
          <Link className="lien" to={`/catalogue?categorie=${encodeURIComponent(rayon.id)}`}>
            Voir le rayon
          </Link>
          <span className="carrousel-compte" aria-hidden="true">
            <span>{index + 1}</span> / {rayons.length}
          </span>
          <button
            type="button"
            className="carrousel-fleche"
            aria-label="Rayon précédent"
            aria-controls="piste-rayons"
            disabled={index === 0}
            onClick={() => aller(index - 1)}
          >
            <Fleche sens="gauche" />
          </button>
          <button
            type="button"
            className="carrousel-fleche"
            aria-label="Rayon suivant"
            aria-controls="piste-rayons"
            disabled={index === rayons.length - 1}
            onClick={() => aller(index + 1)}
          >
            <Fleche sens="droite" />
          </button>
        </div>
      </div>
      <div className="carrousel-onglets" role="tablist" aria-label="Rayons" onKeyDown={clavier}>
        {rayons.map((r, i) => (
          <button
            key={r.id}
            type="button"
            role="tab"
            id={`onglet-${r.id}`}
            aria-controls={`diapo-${r.id}`}
            aria-selected={i === index}
            tabIndex={i === index ? 0 : -1}
            onClick={() => aller(i)}
          >
            {r.libelle}
          </button>
        ))}
      </div>
      <div className="carrousel-piste" id="piste-rayons" ref={piste} onScroll={suivreDefilement}>
        {rayons.map((r, i) => (
          <div
            key={r.id}
            className="carrousel-diapo"
            role="tabpanel"
            id={`diapo-${r.id}`}
            aria-labelledby={`onglet-${r.id}`}
            inert={i !== index}
          >
            <ul className="produits">
              {r.produits.map((produit) => (
                <li key={produit.id}>
                  <ProduitCarte produit={produit} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

function CoupDeCoeur({ produit }: { produit: Produit }) {
  const { ajouter } = usePanier()
  const annoncer = useAnnonce()
  const epuise = produit.disponibilite === 'epuise'
  const { titre, tome } = decouperTitre(produit.designation)
  const sousTitre = [produit.auteur ?? produit.marque, tome].filter(Boolean).join(', ')

  return (
    <section
      className="coup-de-coeur"
      style={
        { '--scene': COUP_DE_COEUR.scene, '--scene-texte': COUP_DE_COEUR.sceneTexte } as CSSProperties
      }
      aria-labelledby="titre-coeur"
    >
      <div className="coeur-visuel">
        <Couverture produit={produit} />
      </div>
      <div className="coeur-texte">
        <p className="coeur-intro">Le choix de la librairie</p>
        <h2 id="titre-coeur">{titre}</h2>
        {sousTitre && <p className="coeur-auteur">{sousTitre}</p>}
        <p className="coeur-avis">{COUP_DE_COEUR.avis}</p>
        <p className="coeur-prix">
          <Prix montant={produit.prixApplique} /> <span>{epuise ? 'Épuisé' : 'Disponible'}</span>
        </p>
        <div className="coeur-actions">
          {!epuise && (
            <button
              className="bouton"
              type="button"
              onClick={() => {
                ajouter(produit.id, 1)
                annoncer(produit, 1)
              }}
            >
              Ajouter au panier
            </button>
          )}
          <Link className="lien" to={`/produits/${produit.id}`}>
            {produit.categorie === 'bd-et-manga' ? 'Voir le manga' : 'Voir la fiche'}
          </Link>
        </div>
      </div>
    </section>
  )
}

function AccueilPage() {
  const { hash } = useLocation()
  const [donnees, setDonnees] = useState<Donnees | null>(null)
  const [erreur, setErreur] = useState(false)
  const [essai, setEssai] = useState(0)

  useEffect(() => {
    let actif = true
    Promise.all([listerCategories(), listerMeilleuresVentes(), listerProduits()])
      .then(([categories, meilleures, produits]) => {
        if (actif) {
          setDonnees({ categories: trierRayons(categories), meilleures, produits })
        }
      })
      .catch(() => {
        if (actif) {
          setErreur(true)
        }
      })
    return () => {
      actif = false
    }
  }, [essai])

  useEffect(() => {
    if (donnees && hash === '#rayons') {
      document.getElementById('rayons')?.scrollIntoView?.()
    }
  }, [donnees, hash])

  const libelle = (id: string) => donnees?.categories.find((c) => c.id === id)?.libelle
  const coupDeCoeur = donnees?.produits.find((p) => p.reference === COUP_DE_COEUR.reference)
  const rayons: Rayon[] = donnees
    ? [
        ...ORDRE_RAYONS,
        ...donnees.categories.map((c) => c.id).filter((id) => !ORDRE_RAYONS.includes(id)),
      ]
        .map((id) => ({
          id,
          libelle: libelle(id) ?? '',
          produits: donnees.produits.filter((p) => p.categorie === id).slice(0, 5),
        }))
        .filter((r) => r.libelle && r.produits.length > 0)
        .slice(0, 4)
    : []

  return (
    <>
      <title>Feuillet, librairie en ligne</title>
      <section className="accueil" aria-labelledby="accueil-phrase">
        <img
          className="accueil-photo"
          src="/images/accueil.jpg"
          alt="Un lecteur tient un livre ouvert dans la lumière du soleil"
        />
        <div className="accueil-texte">
          <h1 id="accueil-phrase" className="accueil-phrase">
            Romans, BD, manga et papeterie, choisis avec soin et livrés chez vous.
          </h1>
          <div className="accueil-actions">
            <Link className="bouton bouton-blanc" to="/catalogue">
              Voir le catalogue
            </Link>
            <a className="lien" href="#rayons">
              Parcourir les rayons
            </a>
          </div>
        </div>
        <p className="accueil-marque" aria-hidden="true">
          Feuillet
        </p>
      </section>

      {erreur && (
        <div className="page-corps vide">
          <ErrorMessage>Les rayons n'ont pas pu être chargés.</ErrorMessage>
          <Button
            variant="secondary"
            onClick={() => {
              setErreur(false)
              setEssai((actuel) => actuel + 1)
            }}
          >
            Réessayer
          </Button>
        </div>
      )}

      {donnees && donnees.categories.length > 0 && (
        <nav className="rayons" id="rayons" aria-label="Rayons">
          <p className="rayons-titre">Rayons</p>
          <ul className="pilules">
            {donnees.categories.map((categorie) => (
              <li key={categorie.id}>
                <Link to={`/catalogue?categorie=${encodeURIComponent(categorie.id)}`}>
                  {categorie.libelle}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {donnees && donnees.meilleures.length > 0 && (
        <section className="section" aria-labelledby="titre-vendus">
          <div className="section-tete">
            <h2 id="titre-vendus">Les plus vendus</h2>
            <Link className="lien" to="/catalogue">
              Tout le catalogue
            </Link>
          </div>
          <ol className="produits">
            {donnees.meilleures.slice(0, 5).map((produit, index) => (
              <li key={produit.id}>
                <ProduitCarte produit={produit} rang={index + 1} />
              </li>
            ))}
          </ol>
        </section>
      )}

      {coupDeCoeur && <CoupDeCoeur produit={coupDeCoeur} />}

      {rayons.length > 0 && <CarrouselRayons rayons={rayons} />}

      <section className="demande demande-courte" aria-labelledby="titre-demande">
        <div className="demande-texte">
          <h2 id="titre-demande">Un livre manque au catalogue ?</h2>
          <p>Dites-nous lequel. Nous le commandons pour vous et nous vous prévenons dès qu'il arrive.</p>
        </div>
        <Link className="bouton" to="/demandes">
          Demander un livre
        </Link>
      </section>
    </>
  )
}

export default AccueilPage
