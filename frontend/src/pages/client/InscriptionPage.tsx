import { useState, type SubmitEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AccesCadre from '../../components/client/AccesCadre.tsx'
import Button from '../../components/common/Button.tsx'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import Input from '../../components/common/Input.tsx'
import { useAuth } from '../../contexts/useAuth'
import { cheminApresConnexion } from '../../routes/redirection'
import type { Utilisateur } from '../../types/utilisateur'
import { erreursDesChamps, messageErreur } from '../../utils/erreurs'

function InscriptionPage() {
  const { inscription } = useAuth()
  const location = useLocation()
  const depuis = (location.state as { depuis?: string } | null)?.depuis

  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [inscrit, setInscrit] = useState<Utilisateur | null>(null)

  async function envoyer(evenement: SubmitEvent<HTMLFormElement>) {
    evenement.preventDefault()
    setEnvoi(true)
    setErreurs({})
    setMessage('')

    try {
      setInscrit(await inscription({ nom, email, motDePasse }))
    } catch (erreur) {
      const champs = erreursDesChamps(erreur)
      setErreurs(champs)
      setMessage(Object.keys(champs).length > 0 ? '' : messageErreur(erreur))
      setEnvoi(false)
    }
  }

  if (inscrit) {
    return (
      <AccesCadre>
        <div className="formulaire">
          <h1>Bienvenue, {inscrit.nom}</h1>
          <div className="acces-succes" role="status">
            <p>
              <strong>Votre compte est créé.</strong>
            </p>
            <p>Vous êtes connecté : vous pouvez suivre vos commandes et vos demandes.</p>
          </div>
          <Link
            className="common-button common-button--primary"
            to={cheminApresConnexion(inscrit.role, depuis)}
          >
            Continuer
          </Link>
        </div>
      </AccesCadre>
    )
  }

  return (
    <AccesCadre>
      <form className="formulaire" onSubmit={envoyer} noValidate>
        <h1>Créer un compte</h1>
        {message && <ErrorMessage>{message}</ErrorMessage>}
        <Input
          label="Nom complet"
          type="text"
          name="nom"
          autoComplete="name"
          value={nom}
          onChange={(evenement) => setNom(evenement.target.value)}
          error={erreurs.nom}
        />
        <Input
          label="Adresse e-mail"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(evenement) => setEmail(evenement.target.value)}
          error={erreurs.email}
        />
        <Input
          label="Mot de passe"
          type="password"
          name="motDePasse"
          autoComplete="new-password"
          value={motDePasse}
          onChange={(evenement) => setMotDePasse(evenement.target.value)}
          error={erreurs.motDePasse}
        />
        <Button type="submit" loading={envoi}>
          Créer mon compte
        </Button>
        <p className="separateur">
          <span>ou</span>
        </p>
        <Link className="common-button common-button--secondary" to="/catalogue">
          Continuer en tant qu'invité
        </Link>
        <p className="aide">
          Parcourez le catalogue et préparez votre panier. Un compte vous sera demandé pour
          valider la commande.
        </p>
        <p className="acces-bas">
          Déjà un compte ?{' '}
          <Link to="/connexion" state={location.state}>
            Se connecter
          </Link>
        </p>
      </form>
    </AccesCadre>
  )
}

export default InscriptionPage
