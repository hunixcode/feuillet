import { useEffect, useState, type SubmitEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Champ from '../../components/client/Champ.tsx'
import ChoixQuantite from '../../components/client/ChoixQuantite.tsx'
import Couverture from '../../components/client/Couverture.tsx'
import Button from '../../components/common/Button.tsx'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
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

const statuts: Record<StatutDemande, { libelle: string; classe: string }> = {
  en_attente: { libelle: 'En attente', classe: 'statut-attente' },
  mise_de_cote: { libelle: 'Mis de côté', classe: 'statut-cote' },
  honoree: { libelle: 'Honorée', classe: 'statut-honoree' },
  expiree: { libelle: 'Expirée', classe: 'statut-fini' },
  annulee: { libelle: 'Annulée', classe: 'statut-fini' },
}

function exemplaires(nombre: number) {
  return nombre > 1 ? `${nombre} exemplaires` : '1 exemplaire'
}

function note(demande: Demande) {
  if (demande.statut === 'mise_de_cote' && demande.miseDeCote) {
    const { quantite, dateLimite } = demande.miseDeCote
    const gardes = quantite > 1 ? `${quantite} exemplaires gardés` : 'Gardé'
    return `${gardes} pour vous jusqu'au ${formatJourTahiti(dateLimite)}`
  }
  return demande.dateFin ? `Le ${formatJourTahiti(demande.dateFin)}` : ''
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
        <div className="vide">
          <ErrorMessage>{actuel.erreur ?? ''}</ErrorMessage>
          <Button onClick={() => setEssai(essai + 1)}>Réessayer</Button>
        </div>
      )
    }

    if (demandes.length === 0) {
      return (
        <div className="suivi-vide">
          <h3>Aucune demande pour l'instant.</h3>
          <p>
            Un livre est épuisé ou absent du catalogue ? Demandez-le : il vous sera mis de côté
            dès son arrivée.
          </p>
        </div>
      )
    }

    return (
      <ul className="suivi">
        {demandes.map((demande) => {
          const statut = statuts[demande.statut]
          const texte = note(demande)
          return (
            <li key={demande.id}>
              {demande.isbn ? (
                <span className="tuile">
                  <Couverture
                    produit={{
                      designation: demande.titre,
                      type: 'livre',
                      isbn: demande.isbn,
                      auteur: demande.auteur,
                    }}
                  />
                </span>
              ) : (
                <span className="tuile tuile-vide">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" />
                    <path d="M5 17a3 3 0 0 1 3-3h10" />
                  </svg>
                </span>
              )}
              <div>
                <p className="suivi-titre">{demande.titre}</p>
                <p className="suivi-meta">
                  {[
                    demande.auteur,
                    exemplaires(demande.quantiteSouhaitee),
                    `demandé le ${formatJourTahiti(demande.date)}`,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </p>
                {erreurLigne?.id === demande.id && <ErrorMessage>{erreurLigne.message}</ErrorMessage>}
              </div>
              <div className="suivi-fin">
                <span className={`statut ${statut.classe}`}>{statut.libelle}</span>
                {texte && <span className="suivi-note">{texte}</span>}
                {demande.statut === 'en_attente' && (
                  <button
                    type="button"
                    className="retirer"
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
                    <Link className="lien" to="/panier">
                      Voir le panier
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="bouton bouton-petit"
                      aria-label={`Ajouter ${demande.titre} au panier`}
                      onClick={() => ajouterAuPanier(demande)}
                    >
                      Ajouter au panier
                    </button>
                  ))}
              </div>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <>
      <title>Mes demandes · Feuillet</title>
      <header className="page-tete">
        <h1 className="page-titre">Mes demandes</h1>
        <p className="page-intro">
          Un livre manque au catalogue ou il est épuisé ? Demandez-le : nous le commandons pour
          vous et nous vous prévenons dès qu'il arrive.
        </p>
      </header>

      {nonLues.length > 0 && (
        <section className="notifications" aria-labelledby="titre-notifications">
          <h2 id="titre-notifications">Bonne nouvelle</h2>
          <ul>
            {nonLues.map((notification) => (
              <li key={notification.id}>
                <p>{notification.message}</p>
                <button
                  type="button"
                  className="retirer"
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

      <div className="demandes">
        <section className="carte-demande" aria-labelledby="titre-nouvelle">
          <h2 id="titre-nouvelle">Demander un livre</h2>
          <form className="formulaire" onSubmit={envoyer} noValidate>
            <Champ
              label="Titre"
              name="titre"
              value={titre}
              error={champs.titre}
              onChange={(e) => setTitre(e.target.value)}
            />
            <Champ
              label="Auteur"
              name="auteur"
              placeholder="Facultatif"
              value={auteur}
              error={champs.auteur}
              onChange={(e) => setAuteur(e.target.value)}
            />
            <Champ
              label="ISBN"
              name="isbn"
              inputMode="numeric"
              placeholder="Facultatif"
              value={isbn}
              error={champs.isbn}
              onChange={(e) => setIsbn(e.target.value)}
            />
            <div className="champ">
              <p className="champ-libelle" id="libelle-quantite">
                Quantité
              </p>
              <ChoixQuantite valeur={quantite} onChange={setQuantite} libelle="Quantité souhaitée" />
              {champs.quantiteSouhaitee && (
                <span className="champ-erreur">{champs.quantiteSouhaitee}</span>
              )}
            </div>
            <button className="bouton" type="submit" disabled={envoi} aria-busy={envoi || undefined}>
              Envoyer la demande
            </button>
            {erreurEnvoi && <ErrorMessage>{erreurEnvoi}</ErrorMessage>}
            {confirmation && (
              <p className="confirmation" role="status">
                {confirmation}
              </p>
            )}
          </form>
        </section>

        <section aria-labelledby="titre-suivi">
          <div className="section-tete">
            <h2 className="titre-bloc" id="titre-suivi">
              Suivi
            </h2>
          </div>
          {suivi()}
        </section>
      </div>
    </>
  )
}

export default DemandesPage
