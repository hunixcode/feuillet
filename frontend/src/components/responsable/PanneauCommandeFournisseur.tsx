import { useEffect, useState, type FormEvent } from 'react'
import {
  enregistrerReception,
  listerReceptions,
  validerReception,
} from '../../services/reapproService'
import type { CommandeFournisseur, Reception } from '../../types/reappro'
import {
  codeErreur,
  erreursDesChamps,
  messageErreur,
  messageErreurReception,
} from '../../utils/erreurs'
import type { Demande } from '../../types/demande'
import type { Produit } from '../../types/produit'
import { dateCourte, dateLongue, heure, jourDe } from '../../utils/datesAdmin'
import { formatJourTahiti } from '../../utils/format'
import Button from '../common/Button.tsx'
import ErrorMessage from '../common/ErrorMessage.tsx'
import Input from '../common/Input.tsx'
import Loader from '../common/Loader.tsx'
import IconeAdmin from './IconeAdmin.tsx'
import { enRetard, restantARecevoir } from './libelles'
import { StatutCommande } from './StatutCommande.tsx'
import Vignette from './Vignette.tsx'

interface PanneauCommandeFournisseurProps {
  commande: CommandeFournisseur
  aujourdhui: string
  onChangement: (commande?: CommandeFournisseur) => void
  produit?: Produit
  demandes?: Demande[]
}

type Champ = 'quantiteRecue' | 'quantiteAbimee'

function exemplaires(nombre: number): string {
  return `${nombre} exemplaire${nombre > 1 ? 's' : ''}`
}

function PanneauCommandeFournisseur({
  commande,
  aujourdhui,
  onChangement,
  produit,
  demandes = [],
}: PanneauCommandeFournisseurProps) {
  const [receptions, setReceptions] = useState<Reception[] | null>(null)
  const [erreurListe, setErreurListe] = useState('')
  const [version, setVersion] = useState(0)
  const [recus, setRecus] = useState('')
  const [abimes, setAbimes] = useState('0')
  const [erreurs, setErreurs] = useState<Partial<Record<Champ, string>>>({})
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState('')
  const [erreurValidation, setErreurValidation] = useState('')
  const [succesValidation, setSuccesValidation] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [validation, setValidation] = useState('')

  useEffect(() => {
    let actif = true
    listerReceptions(commande.id)
      .then((liste) => {
        if (actif) {
          setReceptions(liste)
          setErreurListe('')
        }
      })
      .catch((probleme: unknown) => {
        if (actif) {
          setErreurListe(messageErreur(probleme))
        }
      })
    return () => {
      actif = false
    }
  }, [commande.id, version])

  function recharger(commandeAJour?: CommandeFournisseur) {
    setVersion((precedente) => precedente + 1)
    onChangement(commandeAJour)
  }

  function verifier(): Partial<Record<Champ, string>> {
    const resultat: Partial<Record<Champ, string>> = {}
    const bons = Number(recus)
    const casses = Number(abimes || '0')
    if (!recus.trim()) {
      resultat.quantiteRecue = 'Indiquez le nombre d’exemplaires reçus en bon état (0 s’il n’y en a aucun).'
    } else if (!Number.isInteger(bons) || bons < 0) {
      resultat.quantiteRecue = 'La quantité reçue doit être un nombre entier positif ou nul.'
    }
    if (!Number.isInteger(casses) || casses < 0) {
      resultat.quantiteAbimee = 'La quantité abîmée doit être un nombre entier positif ou nul.'
    }
    if (Object.keys(resultat).length === 0 && bons + casses === 0) {
      resultat.quantiteRecue = 'La réception doit compter au moins un article.'
    }
    return resultat
  }

  async function saisir(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault()
    const verification = verifier()
    setErreurs(verification)
    setErreur('')
    setSucces('')
    setErreurValidation('')
    setSuccesValidation('')
    if (Object.keys(verification).length > 0) {
      return
    }
    setEnvoi(true)
    try {
      await enregistrerReception(commande.id, {
        quantiteRecue: Number(recus),
        quantiteAbimee: Number(abimes || '0'),
      })
      setRecus('')
      setAbimes('0')
      setSucces(
        'Réception saisie. Elle apparaît dans la liste ci-dessous : validez-la pour faire entrer les exemplaires en stock.',
      )
      setVersion((precedente) => precedente + 1)
    } catch (probleme) {
      const champs = erreursDesChamps(probleme)
      if (Object.keys(champs).length > 0) {
        setErreurs(champs)
      } else if (codeErreur(probleme) === 'QUANTITE_SUPERIEURE_AU_RESTANT') {
        setErreurs({ quantiteRecue: messageErreurReception(probleme) })
      } else {
        setErreur(messageErreurReception(probleme))
        if (codeErreur(probleme) === 'COMMANDE_DEJA_RECUE') {
          recharger()
        }
      }
    } finally {
      setEnvoi(false)
    }
  }

  async function valider(reception: Reception) {
    setValidation(reception.id)
    setErreur('')
    setSucces('')
    setErreurValidation('')
    setSuccesValidation('')
    try {
      const resultat = await validerReception(reception.id)
      setSuccesValidation(
        reception.quantiteRecue > 0
          ? `${exemplaires(reception.quantiteRecue)} entré${reception.quantiteRecue > 1 ? 's' : ''} en stock.`
          : 'Réception validée. Aucun exemplaire en bon état n’est entré en stock.',
      )
      recharger(resultat.commande)
    } catch (probleme) {
      setErreurValidation(messageErreurReception(probleme))
      recharger()
    } finally {
      setValidation('')
    }
  }

  const restant = restantARecevoir(commande)
  const retard = enRetard(commande, aujourdhui)

  return (
    <>
      <div className="scene">
        <StatutCommande commande={commande} />
        <Vignette key={produit?.isbn} nu isbn={produit?.isbn} type={produit?.type} />
      </div>
      <h2 className="tiroir-titre">{commande.designation}</h2>
      <p className="tiroir-meta">{`${commande.reference}, chez ${commande.fournisseur.nom}`}</p>
      <dl className="chiffres">
        <div>
          <dt>Commandés</dt>
          <dd>{commande.quantiteCommandee}</dd>
        </div>
        <div>
          <dt>Reçus</dt>
          <dd>{commande.quantiteRecue}</dd>
        </div>
        <div
          className="chiffre-fort"
          data-bulle-titre="Encore attendus"
          data-bulle-texte="Exemplaires que le fournisseur doit encore livrer. Les exemplaires abîmés à la livraison restent attendus."
        >
          <dt>Attendus</dt>
          <dd>{restant}</dd>
        </div>
        <div>
          <dt>Arrivée prévue</dt>
          <dd style={{ fontSize: 20, paddingTop: 4 }}>{dateCourte(commande.dateArriveePrevue)}</dd>
        </div>
      </dl>
      {retard && (
        <div className="encart encart-sombre">
          <IconeAdmin nom="horloge" />
          <span>
            <strong>En retard</strong>
            {` : l’arrivée était prévue le ${dateLongue(commande.dateArriveePrevue)}.`}
          </span>
        </div>
      )}
      {commande.dateReceptionComplete && (
        <p className="tiroir-note">{`Entièrement reçue le ${formatJourTahiti(commande.dateReceptionComplete)}.`}</p>
      )}

      {commande.statut !== 'recue' && (
        <form className="tiroir-section" onSubmit={saisir} noValidate aria-labelledby="titre-saisie">
          <h3 id="titre-saisie">Enregistrer une réception</h3>
          <div className="grille-champs">
            <Input
              label="Reçus en bon état"
              type="number"
              inputMode="numeric"
              min={0}
              value={recus}
              error={erreurs.quantiteRecue}
              onChange={(evenement) => setRecus(evenement.target.value)}
            />
            <Input
              label="Abîmés à la livraison"
              type="number"
              inputMode="numeric"
              min={0}
              value={abimes}
              error={erreurs.quantiteAbimee}
              onChange={(evenement) => setAbimes(evenement.target.value)}
            />
          </div>
          {demandes.length > 0 && (
            <div className="encart">
              <IconeAdmin nom="demandes" />
              <span>
                {`${demandes.length} demande${demandes.length > 1 ? 's attendent' : ' attend'} ce livre : `}
                <strong>{exemplaires(demandes.reduce((total, demande) => total + demande.quantiteSouhaitee, 0))}</strong>
                {` à mettre de côté à la validation de la réception, pour ${demandes.map((demande) => demande.client?.nom ?? 'un client').join(' et ')}.`}
              </span>
            </div>
          )}
          <div className="tiroir-actions">
            <Button type="submit" loading={envoi}>
              Saisir la réception
            </Button>
          </div>
          <p className="tiroir-note">
            {`Il reste ${exemplaires(restant)} à recevoir. Une réception peut être partielle ; les exemplaires abîmés n’entrent pas en stock et restent attendus du fournisseur.`}
          </p>
          {erreur && <ErrorMessage>{erreur}</ErrorMessage>}
          {succes && (
            <p className="encart" role="status">
              {succes}
            </p>
          )}
        </form>
      )}

      <section className="tiroir-section" aria-labelledby="titre-receptions">
        <h3 id="titre-receptions">
          Réceptions
          {receptions && <small>{receptions.length || 'aucune'}</small>}
        </h3>
        <p className="tiroir-note">Une réception saisie n’entre en stock qu’après sa validation.</p>
        {commande.statut === 'recue' && erreur && <ErrorMessage>{erreur}</ErrorMessage>}
        {erreurValidation && <ErrorMessage>{erreurValidation}</ErrorMessage>}
        {succesValidation && (
          <p className="encart" role="status">
            {succesValidation}
          </p>
        )}
        {erreurListe && <ErrorMessage>{erreurListe}</ErrorMessage>}
        {!erreurListe && !receptions && <Loader />}
        {receptions?.length === 0 && <p className="tiroir-note">Rien n’est encore arrivé pour cette commande.</p>}
        {receptions && receptions.length > 0 && (
          <ul className="journal">
            {receptions.map((reception) => (
              <li key={reception.id}>
                <time dateTime={reception.date}>{dateCourte(jourDe(reception.date))}</time>
                <span>
                  {`${exemplaires(reception.quantiteRecue)} en bon état`}
                  {reception.quantiteAbimee > 0 &&
                    `, ${reception.quantiteAbimee} abîmé${reception.quantiteAbimee > 1 ? 's' : ''}`}
                  <small>
                    {reception.validee
                      ? `Validée${reception.dateValidation ? ` le ${dateLongue(jourDe(reception.dateValidation))} à ${heure(reception.dateValidation)}` : ''}`
                      : `Saisie le ${dateLongue(jourDe(reception.date))} à ${heure(reception.date)}, à valider`}
                  </small>
                </span>
                {reception.validee ? (
                  <span className="signe-plus">{`+${reception.quantiteRecue}`}</span>
                ) : (
                  <Button
                    type="button"
                    loading={validation === reception.id}
                    disabled={validation !== '' && validation !== reception.id}
                    onClick={() => valider(reception)}
                  >
                    Valider l’entrée en stock
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

export default PanneauCommandeFournisseur
