import { useState, type SubmitEvent } from 'react'
import Button from '../common/Button.tsx'
import ErrorMessage from '../common/ErrorMessage.tsx'
import Input from '../common/Input.tsx'
import {
  creerCategorie,
  renommerCategorie,
  supprimerCategorie,
} from '../../services/catalogueAdminService'
import type { Categorie } from '../../types/categorie'
import { erreursDesChamps, messageErreur } from '../../utils/erreurs'

interface GestionCategoriesProps {
  categories: Categorie[]
  onChangement: () => Promise<void>
}

function GestionCategories({ categories, onChangement }: GestionCategoriesProps) {
  const [nouveau, setNouveau] = useState('')
  const [enEdition, setEnEdition] = useState<string | null>(null)
  const [libelle, setLibelle] = useState('')
  const [erreurChamp, setErreurChamp] = useState('')
  const [erreurEdition, setErreurEdition] = useState('')
  const [message, setMessage] = useState('')
  const [envoi, setEnvoi] = useState(false)

  async function ajouter(evenement: SubmitEvent<HTMLFormElement>) {
    evenement.preventDefault()
    setEnvoi(true)
    setErreurChamp('')
    setMessage('')
    try {
      await creerCategorie(nouveau)
      setNouveau('')
      await onChangement()
    } catch (erreur) {
      const champs = erreursDesChamps(erreur)
      setErreurChamp(champs.libelle ?? '')
      setMessage(champs.libelle ? '' : messageErreur(erreur))
    } finally {
      setEnvoi(false)
    }
  }

  function editer(categorie: Categorie) {
    setEnEdition(categorie.id)
    setLibelle(categorie.libelle)
    setErreurEdition('')
  }

  async function renommer(evenement: SubmitEvent<HTMLFormElement>, id: string) {
    evenement.preventDefault()
    setErreurEdition('')
    try {
      await renommerCategorie(id, libelle)
      setEnEdition(null)
      await onChangement()
    } catch (erreur) {
      setErreurEdition(erreursDesChamps(erreur).libelle ?? messageErreur(erreur))
    }
  }

  async function supprimer(categorie: Categorie) {
    setMessage('')
    try {
      await supprimerCategorie(categorie.id)
      await onChangement()
    } catch (erreur) {
      setMessage(messageErreur(erreur))
    }
  }

  return (
    <section aria-labelledby="titre-categories">
      <h2 className="tiroir-titre" id="titre-categories">
        Catégories
      </h2>
      <p className="tiroir-meta">
        Les rayons du catalogue. Les clients filtrent le catalogue par catégorie, et une catégorie
        encore utilisée par un article ne peut pas être supprimée.
      </p>
      {message && <ErrorMessage>{message}</ErrorMessage>}
      <ul className="tiroir-liste">
        {categories.map((categorie) =>
          enEdition === categorie.id ? (
            <li key={categorie.id}>
              <form onSubmit={(evenement) => renommer(evenement, categorie.id)} noValidate>
                <Input
                  label={`Nouveau nom de ${categorie.libelle}`}
                  value={libelle}
                  onChange={(evenement) => setLibelle(evenement.target.value)}
                  error={erreurEdition}
                  autoFocus
                />
                <div className="tiroir-actions">
                  <Button type="submit">Enregistrer</Button>
                  <Button type="button" variant="secondary" onClick={() => setEnEdition(null)}>
                    Annuler
                  </Button>
                </div>
              </form>
            </li>
          ) : (
            <li key={categorie.id}>
              <span>{categorie.libelle}</span>
              <span className="tiroir-liste-actions">
                <button
                  type="button"
                  className="action-ligne"
                  onClick={() => editer(categorie)}
                  aria-label={`Renommer ${categorie.libelle}`}
                >
                  Renommer
                </button>
                <button
                  type="button"
                  className="action-ligne action-ligne-danger"
                  onClick={() => supprimer(categorie)}
                  aria-label={`Supprimer ${categorie.libelle}`}
                >
                  Supprimer
                </button>
              </span>
            </li>
          ),
        )}
      </ul>
      <form className="tiroir-section" onSubmit={ajouter} noValidate>
        <Input
          label="Nouvelle catégorie"
          name="libelle"
          value={nouveau}
          onChange={(evenement) => setNouveau(evenement.target.value)}
          error={erreurChamp}
        />
        <div className="tiroir-actions">
          <Button type="submit" variant="secondary" loading={envoi}>
            Ajouter
          </Button>
        </div>
      </form>
    </section>
  )
}

export default GestionCategories
