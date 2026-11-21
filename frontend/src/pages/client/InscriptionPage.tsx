import { useState, type SubmitEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AccesCadre from '../../components/client/AccesCadre.tsx'
import Champ from '../../components/client/Champ.tsx'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
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
        <title>Compte créé · Feuillet</title>
        <h1>Bienvenue, {inscrit.nom}</h1>
        <p role="status">
          <strong>Votre compte est créé.</strong> Vous êtes connecté : vous pouvez suivre vos
          commandes et vos demandes.
        </p>
        <div className="formulaire">
          <Link className="bouton" to={cheminApresConnexion(inscrit.role, depuis)}>
            Continuer
          </Link>
        </div>
      </AccesCadre>
    )
  }

  return (
    <AccesCadre>
      <title>Créer un compte · Feuillet</title>
      <h1>Créer un compte</h1>
      <p>Pour commander en ligne et suivre vos demandes.</p>
      <form className="formulaire" onSubmit={envoyer} noValidate>
        {message && <ErrorMessage>{message}</ErrorMessage>}
        <Champ
          label="Nom complet"
          type="text"
          name="nom"
          autoComplete="name"
          value={nom}
          onChange={(evenement) => setNom(evenement.target.value)}
          error={erreurs.nom}
        />
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
          autoComplete="new-password"
          aide="8 caractères minimum."
          value={motDePasse}
          onChange={(evenement) => setMotDePasse(evenement.target.value)}
          error={erreurs.motDePasse}
        />
        <button className="bouton" type="submit" disabled={envoi} aria-busy={envoi || undefined}>
          Créer mon compte
        </button>
      </form>
    </AccesCadre>
  )
}

export default InscriptionPage
