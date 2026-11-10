import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import LignePanier from '../../components/client/LignePanier.tsx'
import Button from '../../components/common/Button.tsx'
import ErrorMessage from '../../components/common/ErrorMessage.tsx'
import Input from '../../components/common/Input.tsx'
import Loader from '../../components/common/Loader.tsx'
import Select from '../../components/common/Select.tsx'
import { useAuth } from '../../contexts/useAuth'
import { usePanier } from '../../contexts/usePanier'
import { obtenirProduits } from '../../services/produitService'
import type { Produit } from '../../types/produit'
import { messageErreur } from '../../utils/erreurs'
import './PanierPage.css'

function PanierPage() {
  const { utilisateur, chargement: sessionEnCours } = useAuth()
  const { lignes, nombreArticles, changerQuantite, retirer } = usePanier()

  const [produits, setProduits] = useState<Record<string, Produit | null>>({})
  const [erreur, setErreur] = useState<{ cle: string; message: string } | null>(null)
  const [essai, setEssai] = useState(0)
  const [cadeau, setCadeau] = useState(false)
  const [occasion, setOccasion] = useState('')
  const [emballage, setEmballage] = useState(false)
  const [adresse, setAdresse] = useState('')

  const manquants = lignes
    .map((ligne) => ligne.produitId)
    .filter((id) => !(id in produits))
    .join(',')
  const cle = `${manquants}|${essai}`
  const enErreur = erreur?.cle === cle
  const chargement = manquants !== '' && !enErreur

  useEffect(() => {
    if (manquants === '') {
      return
    }
    let actif = true
    obtenirProduits(manquants.split(','))
      .then((trouves) => {
        if (actif) {
          setProduits((actuels) => ({ ...actuels, ...trouves }))
        }
      })
      .catch((raison: unknown) => {
        if (actif) {
          setErreur({ cle, message: messageErreur(raison) })
        }
      })
    return () => {
      actif = false
    }
  }, [manquants, cle])

  const aDesProblemes = lignes.some((ligne) => {
    const produit = produits[ligne.produitId]
    return produit === null || produit?.disponibilite === 'epuise'
  })

  function action() {
    if (sessionEnCours) {
      return null
    }
    if (!utilisateur) {
      return (
        <Link
          className="common-button common-button--primary"
          to="/connexion"
          state={{ depuis: '/panier' }}
        >
          Se connecter pour commander
        </Link>
      )
    }
    if (utilisateur.role !== 'client') {
      return <p className="aide">Connectez-vous avec un compte client pour commander.</p>
    }
    return (
      <>
        <Button disabled aria-describedby="commande-bientot">
          Confirmer la commande
        </Button>
        <p className="aide" id="commande-bientot">
          La confirmation des commandes sera bientôt disponible.
        </p>
      </>
    )
  }

  function contenu() {
    if (lignes.length === 0) {
      return (
        <section className="vide">
          <h2>Votre panier est vide.</h2>
          <p>
            Ajoutez des livres depuis le catalogue. Le panier ne réserve rien : les quantités sont
            vérifiées quand vous confirmez votre commande.
          </p>
          <Link className="common-button common-button--primary" to="/catalogue">
            Parcourir le catalogue
          </Link>
        </section>
      )
    }

    if (chargement) {
      return <Loader>Chargement du panier…</Loader>
    }

    if (enErreur) {
      return (
        <div className="panier-erreur">
          <ErrorMessage>{erreur?.message ?? ''}</ErrorMessage>
          <Button onClick={() => setEssai(essai + 1)}>Réessayer</Button>
        </div>
      )
    }

    return (
      <div className="panier-grille">
        <div>
          <ul className="lignes">
            {lignes.map((ligne) => (
              <LignePanier
                key={ligne.produitId}
                produit={produits[ligne.produitId] ?? null}
                quantite={ligne.quantite}
                onQuantite={(quantite) => changerQuantite(ligne.produitId, quantite)}
                onRetirer={() => retirer(ligne.produitId)}
              />
            ))}
          </ul>

          <form className="options" onSubmit={(evenement) => evenement.preventDefault()} noValidate>
            <fieldset>
              <legend>Cadeau</legend>
              <label className="choix">
                <input
                  type="checkbox"
                  checked={cadeau}
                  onChange={(evenement) => setCadeau(evenement.target.checked)}
                />
                <span>
                  C'est un cadeau
                  <small>Pour une occasion, le délai de retour passe à un mois.</small>
                </span>
              </label>
              {cadeau && (
                <Select
                  label="Occasion"
                  value={occasion}
                  onChange={(evenement) => setOccasion(evenement.target.value)}
                >
                  <option value="">Choisir une occasion</option>
                  <option value="noel">Noël</option>
                  <option value="anniversaire">Anniversaire</option>
                  <option value="fete">Fête</option>
                </Select>
              )}
              <label className="choix">
                <input
                  type="checkbox"
                  checked={emballage}
                  onChange={(evenement) => setEmballage(evenement.target.checked)}
                />
                <span>
                  Emballage cadeau
                  <small>Frais calculés par la librairie.</small>
                </span>
              </label>
            </fieldset>

            <fieldset>
              <legend>Livraison</legend>
              <Input
                label="Adresse de livraison"
                name="adresse"
                autoComplete="street-address"
                value={adresse}
                onChange={(evenement) => setAdresse(evenement.target.value)}
              />
              <p className="aide">Livraison à domicile uniquement. Frais calculés par la librairie.</p>
            </fieldset>
          </form>
        </div>

        <aside className="recap" aria-labelledby="titre-recap">
          <h2 id="titre-recap">Récapitulatif</h2>
          <dl>
            <dt>Articles</dt>
            <dd>{nombreArticles}</dd>
            <dt>Emballage cadeau</dt>
            <dd>{emballage ? 'Oui' : 'Aucun'}</dd>
            <dt>Livraison</dt>
            <dd>À domicile</dd>
            <dt className="total">Total TTC</dt>
            <dd className="total">Calculé par la librairie</dd>
            <dt>dont TVA</dt>
            <dd>Calculée par la librairie</dd>
          </dl>
          {action()}
          {aDesProblemes && (
            <p className="aide">Retirez les articles signalés pour pouvoir commander.</p>
          )}
          <p className="aide">
            Le panier ne réserve pas les articles : leur disponibilité est vérifiée quand vous
            confirmez la commande.
          </p>
        </aside>
      </div>
    )
  }

  return (
    <div className="panier">
      <title>Panier · Feuillet</title>
      <div className="page-intro">
        <h1>Panier</h1>
        <p>{nombreArticles > 1 ? `${nombreArticles} articles` : `${nombreArticles} article`}</p>
      </div>
      {contenu()}
    </div>
  )
}

export default PanierPage
