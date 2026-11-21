import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import Segment from '../../components/client/Segment.tsx'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import Loader from '../../components/common/Loader.tsx'
import IconeAdmin from '../../components/responsable/IconeAdmin.tsx'
import PanneauDemande from '../../components/responsable/PanneauDemande.tsx'
import { SituationDemande, SuiviDemande } from '../../components/responsable/SuiviDemande.tsx'
import Vignette from '../../components/responsable/Vignette.tsx'
import { listerCategories } from '../../services/categorieService'
import { listerDemandes } from '../../services/demandeAdminService'
import { listerProduits } from '../../services/produitService'
import { listerCommandesFournisseur } from '../../services/reapproService'
import type { Categorie } from '../../types/categorie'
import type { Demande } from '../../types/demande'
import type { Produit } from '../../types/produit'
import type { CommandeFournisseur } from '../../types/reappro'
import { dateCourte, dateLongue, jourDe } from '../../utils/datesAdmin'
import { messageErreur } from '../../utils/erreurs'
import { useOuverture } from '../../utils/ouvertureAdmin'
import { jourIso } from '../../utils/format'

type Onglet = 'en_attente' | 'mise_de_cote' | 'terminees'

const TERMINEES: Demande['statut'][] = ['honoree', 'expiree', 'annulee']

function dansOnglet(demande: Demande, onglet: Onglet): boolean {
  return onglet === 'terminees' ? TERMINEES.includes(demande.statut) : demande.statut === onglet
}

function DemandesAdminPage() {
  const [aujourdhui] = useState(() => jourIso(new Date()))
  const [onglet, setOnglet] = useState<Onglet>('en_attente')
  const [recherche, setRecherche] = useState('')
  const [demandes, setDemandes] = useState<Demande[] | null>(null)
  const [produits, setProduits] = useState<Produit[]>([])
  const [categories, setCategories] = useState<Categorie[]>([])
  const [commandes, setCommandes] = useState<CommandeFournisseur[]>([])
  const [erreur, setErreur] = useState('')
  const [choisie, setChoisie] = useState<Demande | null>(null)
  const [version, setVersion] = useState(0)
  const refFermer = useRef<HTMLButtonElement>(null)

  const [aOuvrir, setAOuvrir] = useState<string | null>(null)

  const rafraichir = useCallback(() => setVersion((precedente) => precedente + 1), [])

  useOuverture(['demande'], (ouverture) => setAOuvrir(ouverture.id ?? null))

  if (aOuvrir && demandes) {
    const trouvee = demandes.find((element) => element.id === aOuvrir)
    setAOuvrir(null)
    if (trouvee) {
      setOnglet(trouvee.statut === 'en_attente' || trouvee.statut === 'mise_de_cote' ? trouvee.statut : 'terminees')
      setChoisie(trouvee)
    }
  }

  useEffect(() => {
    let actif = true
    Promise.all([
      listerProduits().catch(() => [] as Produit[]),
      listerCategories().catch(() => [] as Categorie[]),
      listerCommandesFournisseur().catch(() => [] as CommandeFournisseur[]),
    ]).then(([liste, toutes, enCours]) => {
      if (actif) {
        setProduits(liste)
        setCategories(toutes)
        setCommandes(enCours)
      }
    })
    return () => {
      actif = false
    }
  }, [version])

  useEffect(() => {
    let actif = true
    listerDemandes('')
      .then((liste) => {
        if (actif) {
          setDemandes(liste)
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

  const idChoisi = choisie?.id
  useEffect(() => {
    if (!idChoisi) {
      return
    }
    refFermer.current?.focus({ preventScroll: true })
    function echap(evenement: globalThis.KeyboardEvent) {
      if (evenement.key === 'Escape') {
        setChoisie(null)
      }
    }
    document.addEventListener('keydown', echap)
    return () => document.removeEventListener('keydown', echap)
  }, [idChoisi])

  function changement(demande?: Demande) {
    if (demande) {
      setChoisie(demande)
    }
    rafraichir()
  }

  function clavierLigne(evenement: KeyboardEvent<HTMLTableRowElement>, demande: Demande) {
    if (evenement.target === evenement.currentTarget && (evenement.key === 'Enter' || evenement.key === ' ')) {
      evenement.preventDefault()
      setChoisie(demande)
    }
  }

  const toutes = demandes ?? []
  const texte = recherche.trim().toLowerCase()
  const visibles = toutes
    .filter((demande) => dansOnglet(demande, onglet))
    .filter((demande) => !texte || `${demande.titre} ${demande.client?.nom ?? ''}`.toLowerCase().includes(texte))
    .sort((a, b) =>
      onglet === 'mise_de_cote'
        ? (a.miseDeCote?.dateLimite ?? '').localeCompare(b.miseDeCote?.dateLimite ?? '')
        : b.date.localeCompare(a.date),
    )
  const produitDe = (id?: string) => (id ? produits.find((produit) => produit.id === id) : undefined)

  return (
    <>
      <title>Demandes et mises de côté · Feuillet</title>
      <header className="tete">
        <div>
          <h1>Demandes et mises de côté</h1>
          <p>Les livres que les clients attendent, et les exemplaires gardés pour eux.</p>
        </div>
      </header>

      {erreur && <ErrorMessage>{erreur}</ErrorMessage>}

      <section className="feuille" aria-label="Demandes">
        <div className="outils">
          <Segment
            libelle="Suivi des demandes"
            valeur={onglet}
            onChange={(valeur) => setOnglet(valeur as Onglet)}
            options={[
              { valeur: 'en_attente', libelle: 'En attente', compte: toutes.filter((d) => dansOnglet(d, 'en_attente')).length },
              { valeur: 'mise_de_cote', libelle: 'Mises de côté', compte: toutes.filter((d) => dansOnglet(d, 'mise_de_cote')).length },
              { valeur: 'terminees', libelle: 'Terminées', compte: toutes.filter((d) => dansOnglet(d, 'terminees')).length },
            ]}
          />
          <label className="cherche">
            <IconeAdmin nom="loupe" epaisseur={1.8} />
            <input
              type="search"
              placeholder="Titre ou client"
              aria-label="Rechercher une demande par titre ou client"
              value={recherche}
              onChange={(evenement) => setRecherche(evenement.target.value)}
            />
          </label>
        </div>

        {!demandes && !erreur && <Loader />}

        {demandes && visibles.length > 0 && (
          <table className="liste">
            <thead>
              <tr>
                <th scope="col">Livre demandé</th>
                <th scope="col">Client</th>
                <th scope="col" className="num optionnel">
                  Quantité
                </th>
                <th scope="col" className="optionnel">
                  Demandé
                </th>
                <th scope="col">Suivi</th>
                <th scope="col" className="chevron">
                  <span hidden>Ouvrir</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((demande) => {
                const livre = produitDe(demande.produitId)
                return (
                  <tr
                    key={demande.id}
                    tabIndex={0}
                    className={choisie?.id === demande.id ? 'selectionnee' : undefined}
                    onClick={() => setChoisie(demande)}
                    onKeyDown={(evenement) => clavierLigne(evenement, demande)}
                  >
                    <td>
                      <span className="article">
                        <Vignette key={livre?.isbn ?? demande.isbn} isbn={livre?.isbn ?? demande.isbn} type={livre?.type} />
                        <span>
                          <span className="article-titre">{demande.titre}</span>
                          {(demande.auteur ?? livre?.auteur) && (
                            <span className="article-meta">{demande.auteur ?? livre?.auteur}</span>
                          )}
                          <SituationDemande demande={demande} commandes={commandes} />
                        </span>
                      </span>
                    </td>
                    <td>{demande.client?.nom ?? 'Client inconnu'}</td>
                    <td className="num optionnel">{demande.quantiteSouhaitee}</td>
                    <td className="optionnel gris">{dateCourte(jourDe(demande.date))}</td>
                    <td>
                      <SuiviDemande demande={demande} aujourdhui={aujourdhui} />
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
        {demandes && visibles.length === 0 && <p className="vide-liste">Aucune demande ici.</p>}
      </section>

      {choisie && (
        <>
          <div className="tiroir-fond ouvert" aria-hidden="true" onClick={() => setChoisie(null)} />
          <aside className="tiroir ouvert" aria-label="Demande choisie">
            <div className="tiroir-barre">
              <span>{`Demande du ${dateLongue(jourDe(choisie.date))}`}</span>
              <button
                ref={refFermer}
                className="bouton-fermer"
                type="button"
                aria-label="Fermer la demande"
                onClick={() => setChoisie(null)}
              >
                Fermer
              </button>
            </div>
            <PanneauDemande
              key={choisie.id}
              demande={choisie}
              produits={produits}
              categories={categories}
              commandes={commandes}
              demandes={toutes}
              aujourdhui={aujourdhui}
              onChangement={changement}
            />
          </aside>
        </>
      )}
    </>
  )
}

export default DemandesAdminPage
