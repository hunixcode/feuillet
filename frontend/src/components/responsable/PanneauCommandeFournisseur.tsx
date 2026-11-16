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
import { formatDate, formatDateHeure, formatJourTahiti } from '../../utils/format'
import Button from '../common/Button.tsx'
import ErrorMessage from '../common/ErrorMessage.tsx'
import Input from '../common/Input.tsx'
import Loader from '../common/Loader.tsx'
import InfoBulle from './InfoBulle.tsx'
import { LIBELLES_STATUT_COMMANDE, enRetard, restantARecevoir } from './libelles'

interface PanneauCommandeFournisseurProps {
  commande: CommandeFournisseur
  aujourdhui: string
  onChangement: (commande?: CommandeFournisseur) => void
}

type Champ = 'quantiteRecue' | 'quantiteAbimee'

function exemplaires(nombre: number): string {
  return `${nombre} exemplaire${nombre > 1 ? 's' : ''}`
}

function PanneauCommandeFournisseur({
  commande,
  aujourdhui,
  onChangement,
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
  const part = commande.quantiteCommandee > 0 ? (commande.quantiteRecue / commande.quantiteCommandee) * 100 : 0

  return (
    <div className="commandes-detail">
      <div className="commandes-bloc">
        <p className="commandes-surtitre">Commande chez {commande.fournisseur.nom}</p>
        <h2>{commande.designation}</h2>
        <p className="commandes-reference">{commande.reference}</p>
        <span className={`commandes-statut commandes-statut--${commande.statut}`}>
          {LIBELLES_STATUT_COMMANDE[commande.statut]}
        </span>

        <div className="commandes-progression">
          <div className="commandes-progression-barre" aria-hidden="true">
            <span style={{ width: `${part}%` }} />
          </div>
          <p>
            {commande.quantiteRecue} reçu{commande.quantiteRecue > 1 ? 's' : ''} sur{' '}
            {commande.quantiteCommandee} commandé{commande.quantiteCommandee > 1 ? 's' : ''}
          </p>
        </div>

        <dl className="commandes-infos">
          <div>
            <dt>
              <InfoBulle
                libelle="Encore attendus"
                info="Exemplaires que le fournisseur doit encore livrer. Les exemplaires abîmés à la livraison restent attendus."
              />
            </dt>
            <dd>{restant > 0 ? exemplaires(restant) : 'Rien'}</dd>
          </div>
          <div>
            <dt>Arrivée prévue</dt>
            <dd className={retard ? 'commandes-date--retard' : undefined}>
              {formatDate(commande.dateArriveePrevue)}
              {retard && <span className="commandes-retard">En retard</span>}
            </dd>
          </div>
          <div>
            <dt>Commandée le</dt>
            <dd>{formatJourTahiti(commande.date)}</dd>
          </div>
          {commande.dateReceptionComplete && (
            <div>
              <dt>Entièrement reçue le</dt>
              <dd>{formatJourTahiti(commande.dateReceptionComplete)}</dd>
            </div>
          )}
        </dl>
      </div>

      {commande.statut !== 'recue' && (
        <form className="commandes-bloc" onSubmit={saisir} noValidate>
          <h3>Enregistrer une réception</h3>
          <p className="commandes-aide">
            Comptez les exemplaires du colis. Une réception peut être partielle : le reste reste
            attendu. Il reste {exemplaires(restant)} à recevoir.
          </p>
          <div className="commandes-deux">
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
          <p className="commandes-aide">
            Les exemplaires abîmés n’entrent pas en stock et restent attendus du fournisseur.
          </p>
          <div className="commandes-actions">
            <Button type="submit" loading={envoi}>
              Saisir la réception
            </Button>
          </div>
          {erreur && <ErrorMessage>{erreur}</ErrorMessage>}
          {succes && (
            <p className="commandes-succes" role="status">
              {succes}
            </p>
          )}
        </form>
      )}

      <section className="commandes-bloc" aria-labelledby="titre-receptions">
        <h3 id="titre-receptions">Réceptions</h3>
        <p className="commandes-aide">
          Une réception saisie n’entre en stock qu’après sa validation.
        </p>
        {commande.statut === 'recue' && erreur && <ErrorMessage>{erreur}</ErrorMessage>}
        {erreurValidation && <ErrorMessage>{erreurValidation}</ErrorMessage>}
        {succesValidation && (
          <p className="commandes-succes" role="status">
            {succesValidation}
          </p>
        )}
        {erreurListe && <ErrorMessage>{erreurListe}</ErrorMessage>}
        {!erreurListe && !receptions && <Loader />}
        {receptions?.length === 0 && <p className="commandes-aide">Aucune réception pour l’instant.</p>}
        {receptions && receptions.length > 0 && (
          <ul className="commandes-receptions">
            {receptions.map((reception) => (
              <li key={reception.id}>
                <div>
                  <strong>
                    {exemplaires(reception.quantiteRecue)} en bon état
                    {reception.quantiteAbimee > 0 && `, ${reception.quantiteAbimee} abîmé${reception.quantiteAbimee > 1 ? 's' : ''}`}
                  </strong>
                  <span className="commandes-discret">
                    Saisie le {formatDateHeure(reception.date)}
                    {reception.validee &&
                      reception.dateValidation &&
                      `, validée le ${formatDateHeure(reception.dateValidation)}`}
                  </span>
                </div>
                {reception.validee ? (
                  <span className="commandes-statut commandes-statut--recue">Validée</span>
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
    </div>
  )
}

export default PanneauCommandeFournisseur
