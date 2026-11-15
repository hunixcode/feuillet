import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import Loader from '../../components/common/Loader.tsx'
import Select from '../../components/common/Select.tsx'
import DetailVente from '../../components/responsable/DetailVente.tsx'
import EnteteVente from '../../components/responsable/EnteteVente.tsx'
import RetoursVente from '../../components/responsable/RetoursVente.tsx'
import TableauVentes from '../../components/responsable/TableauVentes.tsx'
import { listerProduits } from '../../services/produitService'
import { expedierVente, listerVentes, obtenirVente } from '../../services/venteAdminService'
import type { Produit } from '../../types/produit'
import type { StatutVente, Vente } from '../../types/vente'
import { codeErreur, messageErreur, messageErreurRetour } from '../../utils/erreurs'
import './VentesPage.css'

type Onglet = 'commande' | 'retours'

const ONGLETS: { valeur: Onglet; libelle: string }[] = [
  { valeur: 'commande', libelle: 'Commande' },
  { valeur: 'retours', libelle: 'Retours' },
]

function VentesPage() {
  const [statut, setStatut] = useState<StatutVente | ''>('a_preparer')
  const [ventes, setVentes] = useState<Vente[] | null>(null)
  const [produits, setProduits] = useState<Produit[]>([])
  const [erreur, setErreur] = useState('')
  const [choisie, setChoisie] = useState<Vente | null>(null)
  const [expedition, setExpedition] = useState(false)
  const [erreurExpedition, setErreurExpedition] = useState('')
  const [message, setMessage] = useState('')
  const [version, setVersion] = useState(0)
  const [onglet, setOnglet] = useState<Onglet>('commande')
  const refFermer = useRef<HTMLButtonElement>(null)

  const rafraichir = useCallback(() => setVersion((precedente) => precedente + 1), [])

  useEffect(() => {
    let actif = true
    listerProduits()
      .then((liste) => {
        if (actif) {
          setProduits(liste)
        }
      })
      .catch(() => {})
    return () => {
      actif = false
    }
  }, [])

  useEffect(() => {
    let actif = true
    listerVentes(statut)
      .then((liste) => {
        if (actif) {
          setVentes(liste)
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
    function echap(evenement: globalThis.KeyboardEvent) {
      if (evenement.key === 'Escape') {
        setChoisie(null)
        setErreurExpedition('')
        setMessage('')
      }
    }
    document.addEventListener('keydown', echap)
    return () => document.removeEventListener('keydown', echap)
  }, [idChoisi])

  const venteAffichee = choisie

  function choisir(vente: Vente) {
    setChoisie(vente)
    setOnglet('commande')
    setErreurExpedition('')
    setMessage('')
  }

  function fermer() {
    setChoisie(null)
    setErreurExpedition('')
    setMessage('')
  }

  function naviguerOnglets(evenement: KeyboardEvent<HTMLDivElement>) {
    if (evenement.key !== 'ArrowLeft' && evenement.key !== 'ArrowRight') {
      return
    }
    evenement.preventDefault()
    const suivant = onglet === 'commande' ? 'retours' : 'commande'
    setOnglet(suivant)
    document.getElementById(`onglet-${suivant}`)?.focus()
  }

  async function expedier(vente: Vente) {
    setExpedition(true)
    setErreurExpedition('')
    setMessage('')
    try {
      const aJour = await expedierVente(vente.id)
      setChoisie(aJour)
      setMessage(`La commande de ${aJour.client.nom} est marquée comme expédiée.`)
    } catch (probleme) {
      setErreurExpedition(messageErreurRetour(probleme))
      if (codeErreur(probleme) === 'COMMANDE_DEJA_EXPEDIEE') {
        obtenirVente(vente.id)
          .then(setChoisie)
          .catch(() => {})
      }
    } finally {
      setExpedition(false)
      rafraichir()
    }
  }

  return (
    <div className="ventes-page">
      <title>Ventes et retours · Feuillet</title>
      <header className="ventes-entete">
        <h1>Ventes et retours</h1>
        <p>
          Les commandes passées en ligne par les clients, à préparer puis à expédier. Les retours
          arrivent par colis et s’enregistrent sur la commande d’origine.
        </p>
      </header>

      {erreur && <ErrorMessage>{erreur}</ErrorMessage>}

      <section className="ventes-surface" aria-labelledby="titre-ventes">
        <div className="ventes-titre-ligne">
          <h2 id="titre-ventes">
            {statut === 'a_preparer' ? 'À préparer' : statut === 'expediee' ? 'Expédiées' : 'Toutes les commandes'}
            {ventes && <span className="ventes-compte">{ventes.length}</span>}
          </h2>
          <div className="ventes-filtre">
            <Select
              label="Statut"
              value={statut}
              onChange={(evenement) => setStatut(evenement.target.value as StatutVente | '')}
            >
              <option value="a_preparer">À préparer</option>
              <option value="expediee">Expédiées</option>
              <option value="">Toutes</option>
            </Select>
          </div>
        </div>
        {!ventes && !erreur && <Loader />}
        {ventes?.length === 0 && (
          <p className="ventes-aide">
            {statut === 'a_preparer'
              ? 'Aucune commande à préparer : tout est parti.'
              : 'Aucune commande ne correspond.'}
          </p>
        )}
        {ventes && ventes.length > 0 && (
          <TableauVentes ventes={ventes} selection={venteAffichee?.id} onSelection={choisir} />
        )}
      </section>


      {venteAffichee && (
        <>
          <div className="ventes-voile" aria-hidden="true" onClick={fermer} />
          <aside className="ventes-panneau" aria-label="Commande choisie">
            <div className="ventes-panneau-tete">
              <button
                ref={refFermer}
                type="button"
                className="ventes-fermer"
                aria-label="Fermer la commande"
                onClick={fermer}
              >
                ×
              </button>
              <EnteteVente
                vente={venteAffichee}
                expedition={expedition}
                onExpedier={() => expedier(venteAffichee)}
              />
              {erreurExpedition && <ErrorMessage>{erreurExpedition}</ErrorMessage>}
              {message && (
                <p className="ventes-succes" role="status">
                  {message}
                </p>
              )}
              <div className="ventes-onglets" role="tablist" aria-label="Contenu de la commande" onKeyDown={naviguerOnglets}>
                {ONGLETS.map((option) => (
                  <button
                    key={option.valeur}
                    type="button"
                    role="tab"
                    id={`onglet-${option.valeur}`}
                    aria-selected={onglet === option.valeur}
                    aria-controls={`contenu-${option.valeur}`}
                    tabIndex={onglet === option.valeur ? 0 : -1}
                    className="ventes-onglet"
                    onClick={() => setOnglet(option.valeur)}
                  >
                    {option.libelle}
                  </button>
                ))}
              </div>
            </div>
            <div className="ventes-panneau-corps">
              <div
                role="tabpanel"
                id="contenu-commande"
                aria-labelledby="onglet-commande"
                hidden={onglet !== 'commande'}
              >
                <DetailVente vente={venteAffichee} />
              </div>
              <div
                role="tabpanel"
                id="contenu-retours"
                aria-labelledby="onglet-retours"
                hidden={onglet !== 'retours'}
              >
                <RetoursVente
                  key={`${venteAffichee.id}-${venteAffichee.statut}`}
                  vente={venteAffichee}
                  produits={produits}
                  onChangement={rafraichir}
                />
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}

export default VentesPage
