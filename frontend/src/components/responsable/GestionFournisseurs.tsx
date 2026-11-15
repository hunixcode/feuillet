import { useState, type FormEvent } from 'react'
import { creerFournisseur, modifierFournisseur } from '../../services/reapproService'
import type { Fournisseur } from '../../types/reappro'
import { erreursDesChamps, messageErreur } from '../../utils/erreurs'
import Button from '../common/Button.tsx'
import ErrorMessage from '../common/ErrorMessage.tsx'
import Input from '../common/Input.tsx'
import EnteteInfo from './EnteteInfo.tsx'

const NOM_MAX = 100
const CONTACT_MAX = 200

interface GestionFournisseursProps {
  fournisseurs: Fournisseur[]
  onEnregistre: () => void
}

type Champ = 'nom' | 'contact'

function GestionFournisseurs({ fournisseurs, onEnregistre }: GestionFournisseursProps) {
  const [edition, setEdition] = useState<Fournisseur | null>(null)
  const [nom, setNom] = useState('')
  const [contact, setContact] = useState('')
  const [erreurs, setErreurs] = useState<Partial<Record<Champ, string>>>({})
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState('')
  const [envoi, setEnvoi] = useState(false)

  function modifier(fournisseur: Fournisseur) {
    setEdition(fournisseur)
    setNom(fournisseur.nom)
    setContact(fournisseur.contact ?? '')
    setErreurs({})
    setErreur('')
    setSucces('')
  }

  function vider() {
    setEdition(null)
    setNom('')
    setContact('')
    setErreurs({})
    setErreur('')
  }

  async function enregistrer(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault()
    const verification: Partial<Record<Champ, string>> = {}
    if (!nom.trim()) {
      verification.nom = 'Le nom est obligatoire.'
    } else if (nom.trim().length > NOM_MAX) {
      verification.nom = `Le nom ne doit pas dépasser ${NOM_MAX} caractères.`
    }
    if (contact.trim().length > CONTACT_MAX) {
      verification.contact = `Le contact ne doit pas dépasser ${CONTACT_MAX} caractères.`
    }
    setErreurs(verification)
    setErreur('')
    setSucces('')
    if (Object.keys(verification).length > 0) {
      return
    }
    setEnvoi(true)
    const fiche = { nom: nom.trim(), ...(contact.trim() && { contact: contact.trim() }) }
    try {
      if (edition) {
        await modifierFournisseur(edition.id, fiche)
        setSucces(`${fiche.nom} a été modifié.`)
      } else {
        await creerFournisseur(fiche)
        setSucces(`${fiche.nom} a été ajouté.`)
      }
      vider()
      onEnregistre()
    } catch (probleme) {
      const champs = erreursDesChamps(probleme)
      if (Object.keys(champs).length > 0) {
        setErreurs(champs)
      } else {
        setErreur(messageErreur(probleme))
      }
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div className="commandes-fournisseurs">
      {fournisseurs.length === 0 ? (
        <p className="commandes-aide">Aucun fournisseur enregistré pour l’instant.</p>
      ) : (
        <div className="commandes-tableau-cadre">
          <table className="commandes-tableau">
            <thead>
              <tr>
                <EnteteInfo libelle="Nom" info="Nom du fournisseur, tel qu’il apparaît dans les commandes." />
                <EnteteInfo
                  libelle="Contact"
                  info="Moyen de joindre le fournisseur : e-mail, téléphone, nom d’un interlocuteur…"
                />
                <th scope="col">
                  <span className="visuellement-cache">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {fournisseurs.map((fournisseur) => (
                <tr
                  key={fournisseur.id}
                  aria-current={edition?.id === fournisseur.id ? 'true' : undefined}
                >
                  <td>{fournisseur.nom}</td>
                  <td>{fournisseur.contact || <span className="commandes-discret">Non renseigné</span>}</td>
                  <td className="commandes-nombre">
                    <button
                      type="button"
                      className="commandes-lien commandes-lien--discret"
                      aria-label={`Modifier ${fournisseur.nom}`}
                      onClick={() => modifier(fournisseur)}
                    >
                      Modifier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form className="commandes-bloc commandes-formulaire-fournisseur" onSubmit={enregistrer} noValidate>
        <h3>{edition ? `Modifier ${edition.nom}` : 'Ajouter un fournisseur'}</h3>
        {erreur && <ErrorMessage>{erreur}</ErrorMessage>}
        {succes && (
          <p className="commandes-succes" role="status">
            {succes}
          </p>
        )}
        <div className="commandes-deux">
          <Input
            label="Nom"
            value={nom}
            maxLength={NOM_MAX}
            error={erreurs.nom}
            onChange={(evenement) => setNom(evenement.target.value)}
          />
          <Input
            label="Contact (facultatif)"
            placeholder="E-mail ou téléphone"
            value={contact}
            maxLength={CONTACT_MAX}
            error={erreurs.contact}
            onChange={(evenement) => setContact(evenement.target.value)}
          />
        </div>
        <div className="commandes-actions">
          <Button type="submit" loading={envoi}>
            {edition ? 'Enregistrer les modifications' : 'Ajouter le fournisseur'}
          </Button>
          {edition && (
            <Button type="button" variant="secondary" onClick={vider}>
              Annuler
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}

export default GestionFournisseurs
