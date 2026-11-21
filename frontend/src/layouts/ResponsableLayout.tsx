import { useEffect, useRef, useState, type RefObject } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import IconeAdmin from '../components/responsable/IconeAdmin.tsx'
import PaletteRecherche from '../components/responsable/PaletteRecherche.tsx'
import { useAuth } from '../contexts/useAuth'
import { listerDemandes } from '../services/demandeAdminService'
import { listerVentes } from '../services/venteAdminService'
import '../styles/feuillet-admin.css'

type Apparence = 'clair' | 'sombre' | 'auto'

const CLE_APPARENCE = 'feuillet-apparence'

const NAVIGATION = [
  {
    groupe: 'Au quotidien',
    liens: [
      { cle: 'tableau', to: '/admin', label: 'Tableau de bord', end: true },
      { cle: 'ventes', to: '/admin/ventes', label: 'Ventes et retours' },
      { cle: 'demandes', to: '/admin/demandes', label: 'Demandes' },
    ],
  },
  {
    groupe: 'Le fonds',
    liens: [
      { cle: 'catalogue', to: '/admin/catalogue', label: 'Catalogue et prix' },
      { cle: 'stock', to: '/admin/stock', label: 'Stock et mouvements' },
      { cle: 'commandes', to: '/admin/commandes', label: 'Fournisseurs' },
    ],
  },
  {
    groupe: 'Pilotage',
    liens: [
      { cle: 'rapports', to: '/admin/rapports', label: 'Rapports' },
      { cle: 'parametres', to: '/admin/parametres', label: 'Paramètres' },
    ],
  },
]

const APPARENCES: { valeur: Apparence; icone: string; titre: string; libelle: string }[] = [
  { valeur: 'clair', icone: 'soleil', titre: 'Clair', libelle: 'Apparence claire' },
  { valeur: 'sombre', icone: 'lune', titre: 'Sombre', libelle: 'Apparence sombre' },
  { valeur: 'auto', icone: 'auto', titre: 'Comme le système', libelle: 'Apparence du système' },
]

function lireApparence(): Apparence {
  try {
    const valeur = localStorage.getItem(CLE_APPARENCE)
    return valeur === 'clair' || valeur === 'sombre' ? valeur : 'auto'
  } catch {
    return 'auto'
  }
}

interface EtatBulle {
  titre: string
  texte: string
  left: number
  top: number
  visible: boolean
}

function useBulle(racine: RefObject<HTMLDivElement | null>): EtatBulle | null {
  const [bulle, setBulle] = useState<EtatBulle | null>(null)

  useEffect(() => {
    const element = racine.current
    if (!element) {
      return
    }
    const cible = (evenement: Event) =>
      (evenement.target as Element | null)?.closest?.('[data-bulle-titre]') ?? null
    const montrer = (evenement: Event) => {
      const trouvee = cible(evenement)
      if (!trouvee) {
        return
      }
      const zone = trouvee.getBoundingClientRect()
      setBulle({
        titre: trouvee.getAttribute('data-bulle-titre') ?? '',
        texte: trouvee.getAttribute('data-bulle-texte') ?? '',
        left: Math.min(window.innerWidth - 120, Math.max(120, zone.left + zone.width / 2)),
        top: zone.top + zone.height * 0.18,
        visible: true,
      })
    }
    const cacher = () => setBulle((actuelle) => (actuelle ? { ...actuelle, visible: false } : actuelle))
    const sortir = (evenement: Event) => {
      if (cible(evenement)) {
        cacher()
      }
    }
    element.addEventListener('pointerover', montrer)
    element.addEventListener('pointerout', sortir)
    element.addEventListener('focusin', montrer)
    element.addEventListener('focusout', cacher)
    window.addEventListener('scroll', cacher, { passive: true })
    return () => {
      element.removeEventListener('pointerover', montrer)
      element.removeEventListener('pointerout', sortir)
      element.removeEventListener('focusin', montrer)
      element.removeEventListener('focusout', cacher)
      window.removeEventListener('scroll', cacher)
    }
  }, [racine])

  return bulle
}

function enSaisie(cible: EventTarget | null): boolean {
  return Boolean((cible as Element | null)?.closest?.('input, textarea, select, [contenteditable="true"]'))
}

function sombreParDefaut(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

function ResponsableLayout() {
  const { utilisateur, deconnexion } = useAuth()
  const racine = useRef<HTMLDivElement>(null)
  const bulle = useBulle(racine)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [apparence, setApparence] = useState<Apparence>(lireApparence)
  const [menu, setMenu] = useState<string | null>(null)
  const [enAttente, setEnAttente] = useState<Record<string, number>>({})
  const [palette, setPalette] = useState(false)
  const menuOuvert = menu === pathname

  useEffect(() => {
    let actif = true
    Promise.all([
      listerVentes('a_preparer').catch(() => null),
      listerDemandes('en_attente').catch(() => null),
    ]).then(([ventes, demandes]) => {
      if (actif) {
        setEnAttente({
          ventes: Array.isArray(ventes) ? ventes.length : 0,
          demandes: Array.isArray(demandes) ? demandes.length : 0,
        })
      }
    })
    return () => {
      actif = false
    }
  }, [pathname])

  useEffect(() => {
    function clavier(evenement: KeyboardEvent) {
      if ((evenement.key === 'k' || evenement.key === 'K') && (evenement.ctrlKey || evenement.metaKey)) {
        evenement.preventDefault()
        setPalette((ouverte) => !ouverte)
        return
      }
      if (evenement.key === 'Escape') {
        setPalette(false)
        return
      }
      if (evenement.key === '/' && !enSaisie(evenement.target)) {
        evenement.preventDefault()
        setPalette(true)
      }
    }
    document.addEventListener('keydown', clavier)
    return () => document.removeEventListener('keydown', clavier)
  }, [])

  function choisirApparence(valeur: Apparence) {
    setApparence(valeur)
    try {
      localStorage.setItem(CLE_APPARENCE, valeur)
    } catch {
      return
    }
  }

  function seDeconnecter() {
    deconnexion()
    navigate('/connexion')
  }

  const nom = utilisateur?.nom ?? 'Responsable'
  const classes = ['espace-responsable', menuOuvert && 'menu-admin-ouvert', palette && 'palette-ouverte']
    .filter(Boolean)
    .join(' ')
  const sombre = apparence === 'sombre' || (apparence === 'auto' && sombreParDefaut())

  return (
    <div
      ref={racine}
      className={classes}
      data-apparence={apparence === 'auto' ? undefined : apparence}
    >
      <aside className="cote" aria-label="Espace libraire">
        <div className="cote-haut">
          <div>
            <Link className="cote-logo" to="/admin">
              Feuillet
            </Link>
            <p className="cote-sous">Espace libraire</p>
          </div>
          <button
            className="cote-menu"
            type="button"
            aria-expanded={menuOuvert}
            aria-controls="nav-admin"
            onClick={() => setMenu(menuOuvert ? null : pathname)}
          >
            {menuOuvert ? 'Fermer' : 'Menu'}
          </button>
        </div>
        <button
          className="cote-recherche"
          type="button"
          aria-label="Rechercher partout, raccourci Ctrl K"
          onClick={() => setPalette(true)}
        >
          <IconeAdmin nom="loupe" epaisseur={1.8} />
          <span>Rechercher</span>
          <kbd>Ctrl K</kbd>
        </button>
        <nav className="cote-nav" id="nav-admin" aria-label="Menu responsable">
          {NAVIGATION.map(({ groupe, liens }) => (
            <div className="cote-groupe" key={groupe}>
              <p>{groupe}</p>
              {liens.map((lien) => {
                const nombre = enAttente[lien.cle] ?? 0
                return (
                  <NavLink key={lien.cle} to={lien.to} end={lien.end} data-cle={lien.cle}>
                    <IconeAdmin nom={lien.cle} />
                    <span>{lien.label}</span>
                    {nombre > 0 && (
                      <span className="cote-nombre" title={`${nombre} en attente`}>
                        <span aria-hidden="true">{nombre}</span>
                        <span className="visuellement-cache">{`, ${nombre} en attente`}</span>
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>
        <div className="cote-compte">
          <span className="cote-avatar" aria-hidden="true">
            {nom.charAt(0).toUpperCase()}
          </span>
          <div>
            <strong>{nom}</strong>
            {utilisateur?.email && <span>{utilisateur.email}</span>}
          </div>
        </div>
        <div className="apparence" role="group" aria-label="Apparence">
          {APPARENCES.map((choix) => (
            <button
              key={choix.valeur}
              type="button"
              aria-pressed={apparence === choix.valeur}
              title={choix.titre}
              aria-label={choix.libelle}
              onClick={() => choisirApparence(choix.valeur)}
            >
              <IconeAdmin nom={choix.icone} epaisseur={1.7} />
            </button>
          ))}
        </div>
        <div className="cote-liens">
          <Link to="/">Voir la boutique</Link>
          <button type="button" onClick={seDeconnecter}>
            Se déconnecter
          </button>
        </div>
      </aside>
      <main className="contenu">
        <Outlet />
      </main>
      {palette && (
        <PaletteRecherche
          pages={NAVIGATION.flatMap(({ liens }) => liens)}
          onFermer={() => setPalette(false)}
          onApparence={() => choisirApparence(sombre ? 'clair' : 'sombre')}
        />
      )}
      <div
        className={bulle?.visible ? 'bulle visible' : 'bulle'}
        role="tooltip"
        style={bulle ? { left: bulle.left, top: bulle.top } : undefined}
      >
        <strong>{bulle?.titre}</strong>
        <span>{bulle?.texte}</span>
      </div>
    </div>
  )
}

export default ResponsableLayout
