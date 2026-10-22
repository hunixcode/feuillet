import { useState, type SubmitEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AccesCadre from '../../components/client/AccesCadre.tsx'
import Button from '../../components/common/Button.tsx'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import Input from '../../components/common/Input.tsx'
import { useAuth } from '../../contexts/useAuth'
import { cheminApresConnexion } from '../../routes/redirection'
import { erreursDesChamps, messageErreur } from '../../utils/erreurs'

function ConnexionPage() {
  const { connexion } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const depuis = (location.state as { depuis?: string } | null)?.depuis

  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [envoi, setEnvoi] = useState(false)

  async function envoyer(evenement: SubmitEvent<HTMLFormElement>) {
    evenement.preventDefault()
    setEnvoi(true)
    setErreurs({})
    setMessage('')

    try {
      const utilisateur = await connexion({ email, motDePasse })
      navigate(cheminApresConnexion(utilisateur.role, depuis), { replace: true })
    } catch (erreur) {
      const champs = erreursDesChamps(erreur)
      setErreurs(champs)
      setMessage(Object.keys(champs).length > 0 ? '' : messageErreur(erreur))
      setEnvoi(false)
    }
  }

  return (
    <AccesCadre>
      <title>Connexion · Feuillet</title>
      <form className="formulaire" onSubmit={envoyer} noValidate>
        <h1>Connexion</h1>
        {message && <ErrorMessage>{message}</ErrorMessage>}
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
          autoComplete="current-password"
          value={motDePasse}
          onChange={(evenement) => setMotDePasse(evenement.target.value)}
          error={erreurs.motDePasse}
        />
        <Button type="submit" loading={envoi}>
          Se connecter
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
          Pas encore de compte ?{' '}
          <Link to="/inscription" state={location.state}>
            Créer un compte
          </Link>
        </p>
      </form>
    </AccesCadre>
  )
}

export default ConnexionPage
