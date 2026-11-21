import { useState, type SubmitEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AccesCadre from '../../components/client/AccesCadre.tsx'
import Champ from '../../components/client/Champ.tsx'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
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
      <h1>Connexion</h1>
      <p>Retrouvez votre panier et le suivi de vos demandes.</p>
      <form className="formulaire" onSubmit={envoyer} noValidate>
        {message && <ErrorMessage>{message}</ErrorMessage>}
        <Champ
          label="Adresse e-mail"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(evenement) => setEmail(evenement.target.value)}
          error={erreurs.email}
        />
        <Champ
          label="Mot de passe"
          type="password"
          name="motDePasse"
          autoComplete="current-password"
          value={motDePasse}
          onChange={(evenement) => setMotDePasse(evenement.target.value)}
          error={erreurs.motDePasse}
        />
        <button className="bouton" type="submit" disabled={envoi} aria-busy={envoi || undefined}>
          Se connecter
        </button>
      </form>
    </AccesCadre>
  )
}

export default ConnexionPage
