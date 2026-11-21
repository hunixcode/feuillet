import { useState, type FormEvent } from 'react'
import { creerCommandeFournisseur } from '../../services/reapproService'
import type { Produit } from '../../types/produit'
import type { CommandeFournisseur, Fournisseur } from '../../types/reappro'
import { erreursDesChamps, messageErreur } from '../../utils/erreurs'
import Button from '../common/Button.tsx'
import ErrorMessage from '../common/ErrorMessage.tsx'
import Input from '../common/Input.tsx'
import Select from '../common/Select.tsx'

const QUANTITE_MAX = 9999

interface FormulaireCommandeFournisseurProps {
  fournisseurs: Fournisseur[]
  produits: Produit[]
  aujourdhui: string
  onCreee: (commande: CommandeFournisseur) => void
  onAnnuler: () => void
}

type Champ = 'fournisseurId' | 'produitId' | 'quantiteCommandee' | 'dateArriveePrevue'

function FormulaireCommandeFournisseur({
  fournisseurs,
  produits,
  aujourdhui,
  onCreee,
  onAnnuler,
}: FormulaireCommandeFournisseurProps) {
  const [fournisseurId, setFournisseurId] = useState('')
  const [produitId, setProduitId] = useState('')
  const [quantite, setQuantite] = useState('')
  const [date, setDate] = useState('')
  const [erreurs, setErreurs] = useState<Partial<Record<Champ, string>>>({})
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  function verifier(): Partial<Record<Champ, string>> {
    const resultat: Partial<Record<Champ, string>> = {}
    if (!fournisseurId) {
      resultat.fournisseurId = 'Choisissez le fournisseur.'
    }
    if (!produitId) {
      resultat.produitId = 'Choisissez l’article à commander.'
    }
    const nombre = Number(quantite)
    if (!quantite.trim()) {
      resultat.quantiteCommandee = 'Indiquez le nombre d’exemplaires à commander.'
    } else if (!Number.isInteger(nombre) || nombre < 1 || nombre > QUANTITE_MAX) {
      resultat.quantiteCommandee = `La quantité doit être un nombre entier entre 1 et ${QUANTITE_MAX}.`
    }
    if (!date) {
      resultat.dateArriveePrevue = 'Indiquez la date d’arrivée annoncée par le fournisseur.'
    } else if (date < aujourdhui) {
      resultat.dateArriveePrevue = 'La date d’arrivée prévue ne peut pas être passée.'
    }
    return resultat
  }

  async function envoyer(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault()
    const verification = verifier()
    setErreurs(verification)
    setErreur('')
    if (Object.keys(verification).length > 0) {
      return
    }
    setEnvoi(true)
    try {
      const commande = await creerCommandeFournisseur({
        fournisseurId,
        produitId,
        quantiteCommandee: Number(quantite),
        dateArriveePrevue: date,
      })
      onCreee(commande)
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

  if (fournisseurs.length === 0) {
    return (
      <>
        <h2 className="tiroir-titre" style={{ marginTop: 4 }}>
          Nouvelle commande
        </h2>
        <p className="tiroir-meta">
          Ajoutez d’abord un fournisseur avec le bouton « Nouveau fournisseur ».
        </p>
        <div className="tiroir-actions">
          <Button type="button" variant="secondary" onClick={onAnnuler}>
            Fermer
          </Button>
        </div>
      </>
    )
  }

  return (
    <form onSubmit={envoyer} noValidate>
      <h2 className="tiroir-titre" style={{ marginTop: 4 }}>
        Nouvelle commande
      </h2>
      <p className="tiroir-meta">
        Une commande porte sur un seul article chez un seul fournisseur. L’arrivée prévue s’affiche
        aux clients sur la fiche d’un article épuisé.
      </p>
      {erreur && <ErrorMessage>{erreur}</ErrorMessage>}
      <div className="grille-champs">
        <div className="large">
          <Select
            label="Article"
            value={produitId}
            error={erreurs.produitId}
            onChange={(evenement) => setProduitId(evenement.target.value)}
          >
            <option value="">Choisir un article</option>
            {produits.map((produit) => (
              <option key={produit.id} value={produit.id}>
                {produit.designation} ({produit.reference})
              </option>
            ))}
          </Select>
        </div>
        <div className="large">
          <Select
            label="Fournisseur"
            value={fournisseurId}
            error={erreurs.fournisseurId}
            onChange={(evenement) => setFournisseurId(evenement.target.value)}
          >
            <option value="">Choisir un fournisseur</option>
            {fournisseurs.map((fournisseur) => (
              <option key={fournisseur.id} value={fournisseur.id}>
                {fournisseur.nom}
              </option>
            ))}
          </Select>
        </div>
        <Input
          label="Quantité"
          type="number"
          inputMode="numeric"
          min={1}
          max={QUANTITE_MAX}
          value={quantite}
          error={erreurs.quantiteCommandee}
          onChange={(evenement) => setQuantite(evenement.target.value)}
        />
        <Input
          label="Arrivée prévue"
          type="date"
          min={aujourdhui}
          value={date}
          error={erreurs.dateArriveePrevue}
          onChange={(evenement) => setDate(evenement.target.value)}
        />
      </div>
      <div className="tiroir-actions">
        <Button type="submit" loading={envoi}>
          Passer la commande
        </Button>
        <Button type="button" variant="secondary" onClick={onAnnuler}>
          Annuler
        </Button>
      </div>
    </form>
  )
}

export default FormulaireCommandeFournisseur
