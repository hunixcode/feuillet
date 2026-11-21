import { useCallback, useEffect, useRef, useState } from 'react'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import Loader from '../../components/common/Loader.tsx'
import Select from '../../components/common/Select.tsx'
import PanneauDemande from '../../components/responsable/PanneauDemande.tsx'
import TableauDemandes from '../../components/responsable/TableauDemandes.tsx'
import TableauMisesDeCote from '../../components/responsable/TableauMisesDeCote.tsx'
import { LIBELLES_STATUT_DEMANDE } from '../../components/responsable/libelles'
import { listerCategories } from '../../services/categorieService'
import { listerDemandes } from '../../services/demandeAdminService'
import { listerProduits } from '../../services/produitService'
import type { Categorie } from '../../types/categorie'
import type { Demande, StatutDemande } from '../../types/demande'
import type { Produit } from '../../types/produit'
import { messageErreur } from '../../utils/erreurs'
import './DemandesAdminPage.css'

const STATUTS: StatutDemande[] = ['en_attente', 'mise_de_cote', 'honoree', 'expiree', 'annulee']

function DemandesAdminPage() {
  const [statut, setStatut] = useState<StatutDemande | ''>('en_attente')
  const [demandes, setDemandes] = useState<Demande[] | null>(null)
  const [misesDeCote, setMisesDeCote] = useState<Demande[] | null>(null)
  const [produits, setProduits] = useState<Produit[]>([])
  const [categories, setCategories] = useState<Categorie[]>([])
  const [erreur, setErreur] = useState('')
  const [choisie, setChoisie] = useState<Demande | null>(null)
  const [version, setVersion] = useState(0)
  const refFermer = useRef<HTMLButtonElement>(null)

  const rafraichir = useCallback(() => setVersion((precedente) => precedente + 1), [])

  useEffect(() => {
    let actif = true
    Promise.all([listerProduits(), listerCategories()])
      .then(([liste, toutes]) => {
        if (actif) {
          setProduits(liste)
          setCategories(toutes)
        }
      })
      .catch(() => {})
    return () => {
      actif = false
    }
  }, [version])

  useEffect(() => {
    let actif = true
    Promise.all([listerDemandes(statut), listerDemandes('mise_de_cote')])
      .then(([liste, reservees]) => {
        if (actif) {
          setDemandes(liste)
          setMisesDeCote(
            [...reservees].sort((a, b) =>
              (a.miseDeCote?.dateLimite ?? '').localeCompare(b.miseDeCote?.dateLimite ?? ''),
            ),
          )
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
  }, [statut, version])

  const idChoisi = choisie?.id

  useEffect(() => {
    if (!idChoisi) {
      return
    }
    refFermer.current?.focus()
    function echap(evenement: KeyboardEvent) {
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

  return (
    <div className="demandes-page">
      <title>Demandes et mises de côté · Feuillet</title>
      <header className="demandes-entete">
        <h1>Demandes et mises de côté</h1>
        <p>
          Les clients demandent un article épuisé ou un livre absent du catalogue. Une demande n’est
          pas une vente : le client ne paie rien. Quand l’article arrive, il lui est mis de côté
          jusqu’à une date limite, puis il le commande en ligne.
        </p>
      </header>

      {erreur && <ErrorMessage>{erreur}</ErrorMessage>}

      <section className="demandes-surface" aria-labelledby="titre-mises-de-cote">
        <h2 id="titre-mises-de-cote">
          Mises de côté en cours
          {misesDeCote && <span className="demandes-compte">{misesDeCote.length}</span>}
        </h2>
        <p className="demandes-aide">
          Articles arrivés et réservés pour un client, de la date limite la plus proche à la plus
          lointaine. Elles sont créées à la réception et expirent seules.
        </p>
        {!misesDeCote && !erreur && <Loader />}
        {misesDeCote?.length === 0 && <p className="demandes-aide">Aucun article n’est mis de côté.</p>}
        {misesDeCote && misesDeCote.length > 0 && (
          <TableauMisesDeCote demandes={misesDeCote} selection={choisie?.id} onSelection={setChoisie} />
        )}
      </section>

      <section className="demandes-surface" aria-labelledby="titre-demandes">
        <div className="demandes-titre-ligne">
          <h2 id="titre-demandes">
            {statut ? `Demandes : ${LIBELLES_STATUT_DEMANDE[statut].toLowerCase()}` : 'Toutes les demandes'}
            {demandes && <span className="demandes-compte">{demandes.length}</span>}
          </h2>
          <div className="demandes-filtre">
            <Select
              label="Statut"
              value={statut}
              onChange={(evenement) => setStatut(evenement.target.value as StatutDemande | '')}
            >
              {STATUTS.map((valeur) => (
                <option key={valeur} value={valeur}>
                  {LIBELLES_STATUT_DEMANDE[valeur]}
                </option>
              ))}
              <option value="">Toutes</option>
            </Select>
          </div>
        </div>
        {!demandes && !erreur && <Loader />}
        {demandes?.length === 0 && <p className="demandes-aide">Aucune demande ne correspond.</p>}
        {demandes && demandes.length > 0 && (
          <TableauDemandes demandes={demandes} selection={choisie?.id} onSelection={setChoisie} />
        )}
      </section>

      {choisie && (
        <>
          <div className="demandes-voile" aria-hidden="true" onClick={() => setChoisie(null)} />
          <aside className="demandes-panneau" aria-label="Demande choisie">
            <button
              ref={refFermer}
              type="button"
              className="demandes-fermer"
              aria-label="Fermer la demande"
              onClick={() => setChoisie(null)}
            >
              ×
            </button>
            <PanneauDemande
              key={choisie.id}
              demande={choisie}
              produits={produits}
              categories={categories}
              onChangement={changement}
            />
          </aside>
        </>
      )}
    </div>
  )
}

export default DemandesAdminPage
