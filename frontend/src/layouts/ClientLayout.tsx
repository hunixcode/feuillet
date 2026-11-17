import { useCallback, useEffect, useRef, useState, type SubmitEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Couverture from '../components/client/Couverture.tsx'
import { AnnonceContext } from '../contexts/useAnnonce'
import { useAuth } from '../contexts/useAuth'
import { usePanier } from '../contexts/usePanier'
import { listerMeilleuresVentes, listerProduits } from '../services/produitService'
import type { Produit } from '../types/produit'
import { formatXPF } from '../utils/format'
import '../styles/feuillet.css'

const liens = [
  { to: '/catalogue', label: 'Catalogue' },
  { to: '/commandes', label: 'Mes commandes' },
  { to: '/demandes', label: 'Mes demandes' },
]

function Icone({ nom }: { nom: 'loupe' | 'compte' | 'sac' | 'menu' | 'coche' }) {
  const traits = {
    loupe: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.6-3.6" />
      </>
    ),
    compte: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6" />
      </>
    ),
    sac: (
      <>
        <path d="M5 8h14l-1 13H6L5 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </>
    ),
    menu: <path d="M4 9h16M4 15h16" />,
    coche: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={nom === 'coche' ? 2.6 : 1.7}
      aria-hidden="true"
    >
      {traits[nom]}
    </svg>
  )
}

function LienPanier() {
  const { nombreArticles } = usePanier()

  return (
    <li>
      <NavLink className="entete-bouton" to="/panier">
        <Icone nom="sac" />
        <span className="visuellement-cache">Panier</span>
        {nombreArticles > 0 && (
          <>
            <span key={nombreArticles} className="entete-pastille saute" aria-hidden="true">
              {nombreArticles}
            </span>
            <span className="visuellement-cache">
              {`, ${nombreArticles} ${nombreArticles > 1 ? 'articles' : 'article'}`}
            </span>
          </>
        )}
      </NavLink>
    </li>
  )
}

function MenuCompte({ onDeconnexion }: { onDeconnexion: () => void }) {
  const { utilisateur, chargement } = useAuth()

  if (chargement) {
    return null
  }

  if (!utilisateur) {
    return (
      <li className="entete-compte">
        <NavLink className="entete-bouton" to="/connexion" aria-label="Connexion">
          <Icone nom="compte" />
        </NavLink>
      </li>
    )
  }

  return (
    <>
      {utilisateur.role === 'responsable' && (
        <li className="entete-compte">
          <NavLink className="entete-texte" to="/admin">
            Espace responsable
          </NavLink>
        </li>
      )}
      <li className="entete-compte">
        <span className="entete-nom">{utilisateur.nom}</span>
      </li>
      <li className="entete-compte">
        <button type="button" className="entete-texte" onClick={onDeconnexion}>
          Déconnexion
        </button>
      </li>
    </>
  )
}

interface RechercheProps {
  ouverte: boolean
  onFermer: () => void
}

function Recherche({ ouverte, onFermer }: RechercheProps) {
  const navigate = useNavigate()
  const champ = useRef<HTMLInputElement>(null)
  const [saisie, setSaisie] = useState('')
  const [suggestions, setSuggestions] = useState<Produit[] | null>(null)
  const [resultats, setResultats] = useState<{ q: string; produits: Produit[] } | null>(null)
  const q = saisie.trim()

  useEffect(() => {
    if (!ouverte) {
      return
    }
    const attente = window.setTimeout(() => champ.current?.focus(), 120)
    return () => window.clearTimeout(attente)
  }, [ouverte])

  useEffect(() => {
    if (!ouverte || suggestions) {
      return
    }
    let actif = true
    listerMeilleuresVentes()
      .then((produits) => {
        if (actif) {
          setSuggestions(produits.slice(0, 3))
        }
      })
      .catch(() => {
        if (actif) {
          setSuggestions([])
        }
      })
    return () => {
      actif = false
    }
  }, [ouverte, suggestions])

  useEffect(() => {
    if (!ouverte || !q) {
      return
    }
    let actif = true
    const attente = window.setTimeout(() => {
      listerProduits({ q })
        .then((produits) => {
          if (actif) {
            setResultats({ q, produits: produits.slice(0, 6) })
          }
        })
        .catch(() => {
          if (actif) {
            setResultats({ q, produits: [] })
          }
        })
    }, 250)
    return () => {
      actif = false
      window.clearTimeout(attente)
    }
  }, [ouverte, q])

  function fermer() {
    setSaisie('')
    onFermer()
  }

  function envoyer(evenement: SubmitEvent<HTMLFormElement>) {
    evenement.preventDefault()
    if (q) {
      navigate(`/catalogue?q=${encodeURIComponent(q)}`)
      fermer()
    }
  }

  const trouves = q ? (resultats?.q === q ? resultats.produits : null) : suggestions

  function contenu() {
    if (!trouves) {
      return null
    }
    if (trouves.length === 0) {
      return q ? (
        <p className="recherche-vide">
          Aucun article ne correspond à « {q} ».{' '}
          <Link to={`/demandes?titre=${encodeURIComponent(q)}`} onClick={fermer}>
            Nous pouvons le commander pour vous
          </Link>
          .
        </p>
      ) : null
    }
    return (
      <>
        <p className="recherche-titre">
          {q ? `${trouves.length} ${trouves.length > 1 ? 'résultats' : 'résultat'}` : 'Les plus recherchés'}
        </p>
        <div className="recherche-liste">
          {trouves.map((produit) => (
            <Link key={produit.id} to={`/produits/${produit.id}`} onClick={fermer}>
              <span className="recherche-visuel">
                <Couverture produit={produit} />
              </span>
              <span>
                <strong>{produit.designation}</strong>
                <small>{produit.auteur ?? produit.marque}</small>
                <span className="prix">{formatXPF(produit.prixApplique)}</span>
              </span>
            </Link>
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      <div className="voile" onClick={fermer} />
      <div
        className="recherche"
        id="recherche"
        role="dialog"
        aria-modal="true"
        aria-label="Rechercher"
        aria-hidden={!ouverte}
        inert={!ouverte}
      >
        <form className="recherche-champ" role="search" onSubmit={envoyer}>
          <Icone nom="loupe" />
          <input
            ref={champ}
            name="q"
            type="search"
            placeholder="Un titre, un auteur, un ISBN"
            aria-label="Rechercher un article"
            autoComplete="off"
            value={saisie}
            onChange={(evenement) => setSaisie(evenement.target.value)}
          />
          <button className="bouton-fermer" type="button" onClick={fermer}>
            Fermer
          </button>
        </form>
        <div className="recherche-resultats" aria-live="polite">
          {ouverte && contenu()}
        </div>
      </div>
    </>
  )
}

function ClientLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { utilisateur, deconnexion } = useAuth()
  const { nombreArticles } = usePanier()
  const accueil = pathname === '/'
  const acces = pathname === '/connexion' || pathname === '/inscription'
  const [pleine, setPleine] = useState(false)
  const [cachee, setCachee] = useState(false)
  const [panneau, setPanneau] = useState<{ nom: 'recherche' | 'menu'; chemin: string } | null>(null)
  const [annonce, setAnnonce] = useState<{ produit: Produit; quantite: number } | null>(null)
  const [annonceVisible, setAnnonceVisible] = useState(false)
  const minuterie = useRef<number | undefined>(undefined)
  const ouvert = panneau?.chemin === pathname ? panneau.nom : null

  useEffect(() => {
    let dernier = window.scrollY
    const suivre = () => {
      const y = window.scrollY
      setPleine(y > 24)
      if (Math.abs(y - dernier) > 6) {
        setCachee(y > dernier && y > 320)
        dernier = y
      }
    }
    const cadre = window.requestAnimationFrame(suivre)
    window.addEventListener('scroll', suivre, { passive: true })
    return () => {
      window.cancelAnimationFrame(cadre)
      window.removeEventListener('scroll', suivre)
    }
  }, [])

  useEffect(() => {
    if (!ouvert) {
      return
    }
    const racine = document.documentElement
    racine.style.overflow = 'hidden'
    const clavier = (evenement: KeyboardEvent) => {
      if (evenement.key === 'Escape') {
        setPanneau(null)
      }
    }
    document.addEventListener('keydown', clavier)
    return () => {
      racine.style.overflow = ''
      document.removeEventListener('keydown', clavier)
    }
  }, [ouvert])

  useEffect(() => () => window.clearTimeout(minuterie.current), [])

  const annoncer = useCallback((produit: Produit, quantite: number) => {
    setAnnonce({ produit, quantite })
    setAnnonceVisible(true)
    window.clearTimeout(minuterie.current)
    minuterie.current = window.setTimeout(() => setAnnonceVisible(false), 4200)
  }, [])

  function seDeconnecter() {
    deconnexion()
    setPanneau(null)
    navigate('/catalogue')
  }

  const fermer = () => setPanneau(null)
  const classes = [
    'client-layout',
    'espace-client',
    ouvert === 'recherche' ? 'ouvert-recherche' : '',
    ouvert === 'menu' ? 'ouvert-menu' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const classesEntete = [
    'entete',
    accueil ? 'entete-transparente' : '',
    pleine ? 'entete-pleine' : '',
    cachee && !ouvert && !annonceVisible ? 'entete-cachee' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <AnnonceContext value={annoncer}>
      <div className={classes}>
        <header className={classesEntete}>
          <Link to="/" className="entete-logo">
            Feuillet
          </Link>
          <nav aria-label="Menu principal" className="entete-liens">
            {liens.map((lien) => (
              <NavLink key={lien.to} to={lien.to}>
                {lien.label}
              </NavLink>
            ))}
          </nav>
          <ul className="entete-outils">
            <li>
              <button
                className="entete-bouton"
                type="button"
                aria-label="Rechercher"
                aria-expanded={ouvert === 'recherche'}
                aria-controls="recherche"
                onClick={() => setPanneau({ nom: 'recherche', chemin: pathname })}
              >
                <Icone nom="loupe" />
              </button>
            </li>
            <MenuCompte onDeconnexion={seDeconnecter} />
            <LienPanier />
            <li className="entete-burger">
              <button
                className="entete-bouton"
                type="button"
                aria-label="Ouvrir le menu"
                aria-expanded={ouvert === 'menu'}
                aria-controls="menu"
                onClick={() => setPanneau({ nom: 'menu', chemin: pathname })}
              >
                <Icone nom="menu" />
              </button>
            </li>
          </ul>
        </header>

        <Recherche ouverte={ouvert === 'recherche'} onFermer={fermer} />

        <div
          className="menu-mobile"
          id="menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          aria-hidden={ouvert !== 'menu'}
          inert={ouvert !== 'menu'}
        >
          <div className="menu-tete">
            <Link className="entete-logo" to="/" onClick={fermer}>
              Feuillet
            </Link>
            <button className="bouton-fermer" type="button" onClick={fermer}>
              Fermer
            </button>
          </div>
          <nav aria-label="Menu">
            <Link to="/" onClick={fermer}>
              Accueil
            </Link>
            {liens.map((lien) => (
              <Link key={lien.to} to={lien.to} onClick={fermer}>
                {lien.label}
              </Link>
            ))}
            {utilisateur?.role === 'responsable' && (
              <Link to="/admin" onClick={fermer}>
                Espace responsable
              </Link>
            )}
            {utilisateur ? (
              <button type="button" onClick={seDeconnecter}>
                Déconnexion <span className="menu-compte">{utilisateur.nom}</span>
              </button>
            ) : (
              <Link to="/connexion" onClick={fermer}>
                Mon compte
              </Link>
            )}
            <Link to="/panier" onClick={fermer}>
              Panier{' '}
              <span className="menu-compte">
                {`${nombreArticles} ${nombreArticles > 1 ? 'articles' : 'article'}`}
              </span>
            </Link>
          </nav>
        </div>

        <div
          className={annonceVisible ? 'annonce visible' : 'annonce'}
          role="status"
          aria-live="polite"
          aria-hidden={!annonceVisible}
          inert={!annonceVisible}
          onMouseEnter={() => window.clearTimeout(minuterie.current)}
          onMouseLeave={() => {
            minuterie.current = window.setTimeout(() => setAnnonceVisible(false), 1600)
          }}
        >
          {annonce && (
            <>
              <span className="annonce-visuel">
                <Couverture produit={annonce.produit} />
              </span>
              <div>
                <p className="annonce-petit">
                  <Icone nom="coche" />
                  <span>
                    {annonce.quantite > 1
                      ? `${annonce.quantite} exemplaires ajoutés au panier`
                      : 'Ajouté au panier'}
                  </span>
                </p>
                <p className="annonce-grand">{annonce.produit.designation}</p>
              </div>
              <Link className="annonce-action" to="/panier" onClick={() => setAnnonceVisible(false)}>
                Voir le panier
              </Link>
            </>
          )}
        </div>

        <main className={accueil || acces ? 'client-contenu' : 'client-contenu page'}>
          <Outlet />
        </main>

        {!acces && (
          <footer className="pied">
            <div className="pied-services">
              <div>
                <h3>Livré chez vous</h3>
                <p>Chaque commande est livrée directement à votre adresse.</p>
              </div>
              <div>
                <h3>Pour offrir</h3>
                <p>Choisissez l'emballage cadeau au moment de commander.</p>
              </div>
              <div>
                <h3>Stock à jour</h3>
                <p>Vous voyez tout de suite si un livre est disponible en librairie.</p>
              </div>
            </div>
            <div className="pied-haut">
              <div>
                <p className="pied-logo">Feuillet</p>
                <p className="pied-adresse">Librairie en ligne</p>
              </div>
              <nav aria-label="Boutique">
                <p className="pied-titre">Boutique</p>
                <Link to="/catalogue">Catalogue</Link>
                <Link to={{ pathname: '/', hash: '#rayons' }}>Rayons</Link>
                <Link to="/demandes">Demander un livre</Link>
              </nav>
              <nav aria-label="Compte">
                <p className="pied-titre">Compte</p>
                <Link to="/connexion">Se connecter</Link>
                <Link to="/inscription">Créer un compte</Link>
              </nav>
            </div>
            <p className="pied-bas">© 2026 Feuillet</p>
          </footer>
        )}
      </div>
    </AnnonceContext>
  )
}

export default ClientLayout
