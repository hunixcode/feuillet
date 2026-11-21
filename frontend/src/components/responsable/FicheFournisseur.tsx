import { useState, type FormEvent } from 'react'
import { creerFournisseur, modifierFournisseur } from '../../services/reapproService'
import type { Produit } from '../../types/produit'
import type { CommandeFournisseur, Fournisseur } from '../../types/reappro'
import { dateCourte, jourDe } from '../../utils/datesAdmin'
import { erreursDesChamps, messageErreur } from '../../utils/erreurs'
import Button from '../common/Button.tsx'
import ErrorMessage from '../common/ErrorMessage.tsx'
import Input from '../common/Input.tsx'
import { StatutCommande } from './StatutCommande.tsx'
import Vignette from './Vignette.tsx'

const NOM_MAX = 100
const CONTACT_MAX = 200

interface FicheFournisseurProps {
  fournisseur?: Fournisseur
  commandes?: CommandeFournisseur[]
  produits?: Map<string, Produit>
  onEnregistre: (fournisseur: Fournisseur, message: string) => void
}

type Champ = 'nom' | 'contact'

function FicheFournisseur({ fournisseur, commandes = [], produits, onEnregistre }: FicheFournisseurProps) {
  const [nom, setNom] = useState(fournisseur?.nom ?? '')
  const [contact, setContact] = useState(fournisseur?.contact ?? '')
  const [erreurs, setErreurs] = useState<Partial<Record<Champ, string>>>({})
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

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
    if (Object.keys(verification).length > 0) {
      return
    }
    setEnvoi(true)
    const fiche = { nom: nom.trim(), ...(contact.trim() && { contact: contact.trim() }) }
    try {
      if (fournisseur) {
        const modifie = await modifierFournisseur(fournisseur.id, fiche)
        onEnregistre(modifie, `${fiche.nom} a été modifié.`)
      } else {
        const cree = await creerFournisseur(fiche)
        onEnregistre(cree, `${fiche.nom} a été ajouté.`)
      }
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

  const siennes = fournisseur
    ? commandes.filter((commande) => commande.fournisseur.id === fournisseur.id)
    : []

  return (
    <>
      <h2 className="tiroir-titre" style={{ marginTop: 4 }}>
        {fournisseur ? fournisseur.nom : 'Nouveau fournisseur'}
      </h2>
      <p className="tiroir-meta">
        {fournisseur
          ? 'Le nom apparaît sur chaque commande passée chez ce fournisseur.'
          : 'Un fournisseur doit exister avant de lui passer une commande.'}
      </p>
      <form onSubmit={enregistrer} noValidate>
        {erreur && <ErrorMessage>{erreur}</ErrorMessage>}
        <div className="grille-champs">
          <div className="large">
            <Input
              label="Nom"
              value={nom}
              maxLength={NOM_MAX}
              error={erreurs.nom}
              onChange={(evenement) => setNom(evenement.target.value)}
            />
          </div>
          <div className="large">
            <Input
              label="Contact (facultatif)"
              placeholder="E-mail ou téléphone"
              value={contact}
              maxLength={CONTACT_MAX}
              error={erreurs.contact}
              onChange={(evenement) => setContact(evenement.target.value)}
            />
          </div>
        </div>
        <div className="tiroir-actions">
          <Button type="submit" loading={envoi}>
            {fournisseur ? 'Enregistrer' : 'Ajouter le fournisseur'}
          </Button>
        </div>
      </form>
      {fournisseur && (
        <section className="tiroir-section" aria-labelledby="titre-commandes-fournisseur">
          <h3 id="titre-commandes-fournisseur">
            Commandes
            <small>{siennes.length || 'aucune'}</small>
          </h3>
          {siennes.length === 0 ? (
            <p className="tiroir-note">Aucune commande passée chez ce fournisseur.</p>
          ) : (
            <ul className="lignes-commande">
              {siennes.map((commande) => {
                const produit = produits?.get(commande.produitId)
                return (
                  <li key={commande.id}>
                    <Vignette key={produit?.isbn} isbn={produit?.isbn} type={produit?.type} />
                    <div>
                      <p className="rangee-titre">{commande.designation}</p>
                      <p className="rangee-meta">
                        {`${dateCourte(jourDe(commande.date))}, ${commande.quantiteRecue} reçus sur ${commande.quantiteCommandee}`}
                      </p>
                    </div>
                    <StatutCommande commande={commande} />
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}
    </>
  )
}

export default FicheFournisseur
