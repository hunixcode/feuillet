import { useEffect, useState, type SubmitEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ChoixQuantite from '../../components/client/ChoixQuantite.tsx'
import Button from '../../components/common/Button.tsx'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import Input from '../../components/common/Input.tsx'
import Loader from '../../components/common/Loader.tsx'
import { usePanier } from '../../contexts/usePanier'
import { ApiRequestError } from '../../services/api'
import {
  annulerDemande,
  envoyerDemande,
  listerDemandes,
  listerNotifications,
  marquerNotificationLue,
} from '../../services/demandeService'
import type { Demande, NotificationClient, StatutDemande } from '../../types/demande'
import { erreursDesChamps, messageErreur } from '../../utils/erreurs'
import { formatJourTahiti } from '../../utils/format'
import './DemandesPage.css'

const statuts: Record<StatutDemande, string> = {
  en_attente: 'En attente',
  mise_de_cote: 'Mise de côté',
  honoree: 'Honorée',
  expiree: 'Expirée',
  annulee: 'Annulée',
}

function exemplaires(nombre: number) {
  return nombre > 1 ? `${nombre} exemplaires` : '1 exemplaire'
}

function statutAvecDate(demande: Demande) {
  const libelle = statuts[demande.statut]
  return demande.dateFin ? `${libelle} le ${formatJourTahiti(demande.dateFin)}` : libelle
}

function DemandesPage() {
  const [parametres] = useSearchParams()
  const { ajouter } = usePanier()

  const [essai, setEssai] = useState(0)
  const [resultat, setResultat] = useState<{
    essai: number
    demandes?: Demande[]
    erreur?: string
  } | null>(null)
  const [notifications, setNotifications] = useState<NotificationClient[]>([])
  const [annulation, setAnnulation] = useState('')
  const [erreurLigne, setErreurLigne] = useState<{ id: string; message: string } | null>(null)
  const [ajoutees, setAjoutees] = useState<string[]>([])

  const [titre, setTitre] = useState(parametres.get('titre') ?? '')
  const [auteur, setAuteur] = useState('')
  const [isbn, setIsbn] = useState('')
  const [quantite, setQuantite] = useState(1)
  const [envoi, setEnvoi] = useState(false)
  const [champs, setChamps] = useState<Record<string, string>>({})
  const [erreurEnvoi, setErreurEnvoi] = useState('')
  const [confirmation, setConfirmation] = useState('')

  const actuel = resultat?.essai === essai ? resultat : null
  const demandes = actuel?.demandes

  useEffect(() => {
    let actif = true
    listerDemandes()
      .then((liste) => {
        if (actif) {
          setResultat({ essai, demandes: liste })
        }
      })
      .catch((raison: unknown) => {
        if (actif) {
          setResultat({ essai, erreur: messageErreur(raison) })
        }
      })
    return () => {
      actif = false
    }
  }, [essai])

  useEffect(() => {
    let actif = true
    listerNotifications()
      .then((liste) => {
        if (actif) {
          setNotifications(liste)
        }
      })
      .catch(() => {})
    return () => {
      actif = false
    }
  }, [])

  function remplacer(demande: Demande) {
    setResultat((courant) =>
      courant?.demandes
        ? {
            ...courant,
            demandes: courant.demandes.map((d) => (d.id === demande.id ? demande : d)),
          }
        : courant,
    )
  }

  async function annuler(demande: Demande) {
    setAnnulation(demande.id)
    setErreurLigne(null)
    try {
      remplacer(await annulerDemande(demande.id))
    } catch (raison) {
      const message =
        raison instanceof ApiRequestError && raison.code === 'DEMANDE_NON_ANNULABLE'
          ? 'Cette demande n\'est plus en attente : elle ne peut plus être annulée.'
          : messageErreur(raison)
      setErreurLigne({ id: demande.id, message })
    } finally {
      setAnnulation('')
    }
  }

  function ajouterAuPanier(demande: Demande) {
    if (!demande.produitId || !demande.miseDeCote) {
      return
    }
    ajouter(demande.produitId, demande.miseDeCote.quantite)
    setAjoutees((liste) => [...liste, demande.id])
  }

  async function lire(notification: NotificationClient) {
    setNotifications((liste) => liste.filter((n) => n.id !== notification.id))
    try {
      await marquerNotificationLue(notification.id)
    } catch {
      setNotifications((liste) => [notification, ...liste])
    }
  }

  async function envoyer(evenement: SubmitEvent<HTMLFormElement>) {
    evenement.preventDefault()
    setEnvoi(true)
    setChamps({})
    setErreurEnvoi('')
    setConfirmation('')
    try {
      const nouvelle = await envoyerDemande({
        titre: titre.trim(),
        ...(auteur.trim() ? { auteur: auteur.trim() } : {}),
        ...(isbn.trim() ? { isbn: isbn.trim() } : {}),
        quantiteSouhaitee: quantite,
      })
      setResultat((courant) =>
        courant?.demandes ? { ...courant, demandes: [nouvelle, ...courant.demandes] } : courant,
      )
      setTitre('')
      setAuteur('')
      setIsbn('')
      setQuantite(1)
      setConfirmation(`Demande envoyée pour « ${nouvelle.titre} ».`)
    } catch (raison) {
      const erreurs = erreursDesChamps(raison)
      if (Object.keys(erreurs).length > 0) {
        setChamps(erreurs)
      } else {
        setErreurEnvoi(messageErreur(raison))
      }
    } finally {
      setEnvoi(false)
    }
  }

  const nonLues = notifications.filter((notification) => !notification.lue)

  function suivi() {
    if (!actuel) {
      return <Loader>Chargement de vos demandes…</Loader>
    }

    if (!demandes) {
      return (
        <div className="demandes-erreur">
          <ErrorMessage>{actuel.erreur ?? ''}</ErrorMessage>
          <Button onClick={() => setEssai(essai + 1)}>Réessayer</Button>
        </div>
      )
    }

    if (demandes.length === 0) {
      return (
        <section className="vide" aria-labelledby="suivi-titre">
          <h2 id="suivi-titre">Aucune demande pour l'instant.</h2>
          <p>
            Un livre est épuisé ou absent du catalogue ? Demandez-le : il vous sera mis de côté
            dès son arrivée.
          </p>
        </section>
      )
    }

    return (
      <section aria-labelledby="suivi-titre">
        <h2 id="suivi-titre" className="suivi-titre">
          Suivi de vos demandes
        </h2>
        <ul className="suivi">
          {demandes.map((demande) => (
            <li key={demande.id}>
              <div className="suivi-infos">
                <span className="suivi-livre">{demande.titre}</span>
                <span className="suivi-detail">
                  {[
                    demande.auteur,
                    exemplaires(demande.quantiteSouhaitee),
                    `demandé le ${formatJourTahiti(demande.date)}`,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </span>
                {demande.statut === 'mise_de_cote' && demande.miseDeCote && (
                  <p className="suivi-cote">
                    {`${exemplaires(demande.miseDeCote.quantite)} mis de côté pour vous jusqu'au ${formatJourTahiti(demande.miseDeCote.dateLimite)}. Commandez avant cette date.`}
                  </p>
                )}
                {erreurLigne?.id === demande.id && <ErrorMessage>{erreurLigne.message}</ErrorMessage>}
              </div>
              <div className="suivi-fin">
                <span className={`statut statut-${demande.statut}`}>{statutAvecDate(demande)}</span>
                {demande.statut === 'en_attente' && (
                  <button
                    type="button"
                    className="lien-action"
                    disabled={annulation === demande.id}
                    aria-label={`Annuler la demande de ${demande.titre}`}
                    onClick={() => annuler(demande)}
                  >
                    Annuler la demande
                  </button>
                )}
                {demande.statut === 'mise_de_cote' &&
                  demande.produitId &&
                  (ajoutees.includes(demande.id) ? (
                    <Link to="/panier">Voir le panier</Link>
                  ) : (
                    <Button
                      variant="secondary"
                      aria-label={`Ajouter ${demande.titre} au panier`}
                      onClick={() => ajouterAuPanier(demande)}
                    >
                      Ajouter au panier
                    </Button>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <div className="demandes">
      <title>Mes demandes · Feuillet</title>
      <div className="page-intro">
        <h1>Mes demandes</h1>
        <p>Les livres que vous attendez</p>
      </div>

      {nonLues.length > 0 && (
        <section className="notifications" aria-labelledby="titre-notifications">
          <h2 id="titre-notifications">Bonne nouvelle</h2>
          <ul>
            {nonLues.map((notification) => (
              <li key={notification.id}>
                <p>{notification.message}</p>
                <button
                  type="button"
                  className="lien-action"
                  aria-label={`Masquer : ${notification.message}`}
                  onClick={() => lire(notification)}
                >
                  Masquer
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="demandes-grille">
        <div>{suivi()}</div>

        <form className="encadre formulaire" onSubmit={envoyer} noValidate>
          <h2>Demander un livre</h2>
          <p className="aide">
            Pour un livre absent du catalogue. Une demande ne vous engage pas à l'acheter.
          </p>
          <Input
            label="Titre"
            name="titre"
            placeholder="Ex. Le Rivage des Syrtes"
            value={titre}
            error={champs.titre}
            onChange={(e) => setTitre(e.target.value)}
          />
          <Input
            label="Auteur (facultatif)"
            name="auteur"
            value={auteur}
            error={champs.auteur}
            onChange={(e) => setAuteur(e.target.value)}
          />
          <Input
            label="ISBN (facultatif)"
            name="isbn"
            value={isbn}
            error={champs.isbn}
            onChange={(e) => setIsbn(e.target.value)}
          />
          <div className="champ-quantite">
            <span className="common-input__label">Quantité</span>
            <ChoixQuantite valeur={quantite} onChange={setQuantite} libelle="Quantité souhaitée" />
            {champs.quantiteSouhaitee && (
              <span className="common-input__error">{champs.quantiteSouhaitee}</span>
            )}
          </div>
          <Button type="submit" loading={envoi}>
            Envoyer la demande
          </Button>
          {erreurEnvoi && <ErrorMessage>{erreurEnvoi}</ErrorMessage>}
          {confirmation && (
            <p className="aide" role="status">
              {confirmation}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

export default DemandesPage
