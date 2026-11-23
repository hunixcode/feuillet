import { useEffect, useState, type FormEvent } from 'react'
import { enregistrerRetour, lireRetours } from '../../services/venteAdminService'
import type { Produit } from '../../types/produit'
import type { EtatRetours, IssueRetour, Retour } from '../../types/retour'
import type { Vente } from '../../types/vente'
import { codeErreur, erreursDesChamps, messageErreur, messageErreurRetour } from '../../utils/erreurs'
import { formatDateHeure, formatJourTahiti, formatXPF } from '../../utils/format'
import { adresseSurUneLigne } from '../../utils/livraison'
import Button from '../common/Button.tsx'
import ErrorMessage from '../common/ErrorMessage.tsx'
import Input from '../common/Input.tsx'
import Loader from '../common/Loader.tsx'
import Select from '../common/Select.tsx'
import EnteteInfo from './EnteteInfo.tsx'
import { LIBELLES_ISSUE } from './libelles'

type Etat = 'intact' | 'ouvert' | 'abime'

type Champ = 'produitId' | 'quantite' | 'etat' | 'nouveauProduit' | 'nouvelleQuantite'

interface RetoursVenteProps {
  vente: Vente
  produits: Produit[]
  onChangement: () => void
}

const ISSUES: { valeur: IssueRetour; aide: string }[] = [
  {
    valeur: 'remboursement',
    aide: 'Le client est remboursé du prix payé pour l’article. Les frais de livraison et d’emballage ne sont pas remboursés.',
  },
  {
    valeur: 'echange',
    aide: 'Seulement si le plastique est intact. Le client reçoit un autre article ; la différence de prix lui est rendue ou demandée.',
  },
  {
    valeur: 'remplacement',
    aide: 'Pour un article défectueux : un exemplaire neuf du même article lui est envoyé, sans rien payer.',
  },
]

function exemplaires(nombre: number): string {
  return `${nombre} exemplaire${nombre > 1 ? 's' : ''}`
}

function devenirArticle(retour: Retour, etat: Etat | null): string {
  if (retour.issue === 'remplacement' || !retour.revendable) {
    return 'L’article rendu passe en stock défectueux.'
  }
  if (etat === 'ouvert') {
    return 'L’article rendu est remis en stock : il peut repartir en vente sous cellophane.'
  }
  return 'L’article rendu est remis en stock.'
}

function bilan(retour: Retour): string {
  if (retour.remplacementImpossible) {
    return `Aucun exemplaire neuf n’était disponible : le retour a été remboursé à la place. À rembourser au client : ${formatXPF(retour.montantRembourse)}.`
  }
  if (retour.issue === 'remplacement') {
    return 'Un exemplaire neuf remplace l’article défectueux. Rien à payer ni à rembourser.'
  }
  if (retour.complementPaye > 0) {
    return `Complément à payer par le client : ${formatXPF(retour.complementPaye)}.`
  }
  if (retour.montantRembourse > 0) {
    return `À rembourser au client : ${formatXPF(retour.montantRembourse)}.`
  }
  return 'Aucune différence de prix : rien à payer ni à rembourser.'
}

function RetoursVente({ vente, produits, onChangement }: RetoursVenteProps) {
  const [etat, setEtat] = useState<EtatRetours | null>(null)
  const [erreurChargement, setErreurChargement] = useState('')
  const [version, setVersion] = useState(0)
  const [produitId, setProduitId] = useState('')
  const [quantite, setQuantite] = useState('1')
  const [issue, setIssue] = useState<IssueRetour>('remboursement')
  const [etatArticle, setEtatArticle] = useState<Etat>('intact')
  const [plastiqueIntact, setPlastiqueIntact] = useState(false)
  const [nouveauProduit, setNouveauProduit] = useState('')
  const [nouvelleQuantite, setNouvelleQuantite] = useState('1')
  const [erreurs, setErreurs] = useState<Partial<Record<Champ, string>>>({})
  const [erreur, setErreur] = useState('')
  const [resultat, setResultat] = useState<{ retour: Retour; etat: Etat | null } | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [saisie, setSaisie] = useState(false)

  useEffect(() => {
    if (vente.statut === 'a_preparer') {
      return
    }
    let actif = true
    lireRetours(vente.id)
      .then((reponse) => {
        if (actif) {
          setEtat(reponse)
          setErreurChargement('')
        }
      })
      .catch((probleme: unknown) => {
        if (actif) {
          setErreurChargement(messageErreur(probleme))
        }
      })
    return () => {
      actif = false
    }
  }, [vente.id, vente.statut, version])

  function recharger() {
    setVersion((precedente) => precedente + 1)
    onChangement()
  }

  const retournables = etat?.lignes.filter((ligne) => ligne.quantiteRetournable > 0) ?? []
  const articleChoisi = produitId || retournables[0]?.produitId || ''
  const ligneChoisie = etat?.lignes.find((ligne) => ligne.produitId === articleChoisi)

  function verifier(): Partial<Record<Champ, string>> {
    const resultatVerification: Partial<Record<Champ, string>> = {}
    if (!ligneChoisie) {
      resultatVerification.produitId = 'Choisissez l’article rendu.'
    }
    const nombre = Number(quantite)
    if (!Number.isInteger(nombre) || nombre < 1) {
      resultatVerification.quantite = 'La quantité doit être un nombre entier d’au moins 1.'
    } else if (ligneChoisie && nombre > ligneChoisie.quantiteRetournable) {
      resultatVerification.quantite = `Le client ne peut plus rendre que ${exemplaires(ligneChoisie.quantiteRetournable)} de cet article.`
    }
    if (issue === 'echange') {
      if (!plastiqueIntact) {
        resultatVerification.etat =
          'Un échange n’est possible que si le plastique est intact. Sinon, proposez un remboursement.'
      }
      if (!nouveauProduit) {
        resultatVerification.nouveauProduit = 'Choisissez l’article envoyé en échange.'
      }
      const nouvelle = Number(nouvelleQuantite)
      if (!Number.isInteger(nouvelle) || nouvelle < 1) {
        resultatVerification.nouvelleQuantite = 'La quantité doit être un nombre entier d’au moins 1.'
      }
    }
    return resultatVerification
  }

  function ouvrirSaisie() {
    setSaisie(true)
    setResultat(null)
    setErreur('')
    setErreurs({})
  }

  function annulerSaisie() {
    setSaisie(false)
    setErreurs({})
    setErreur('')
  }

  async function envoyer(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault()
    const verification = verifier()
    setErreurs(verification)
    setErreur('')
    setResultat(null)
    if (Object.keys(verification).length > 0) {
      return
    }
    setEnvoi(true)
    try {
      const retour = await enregistrerRetour(vente.id, {
        produitId: articleChoisi,
        quantite: Number(quantite),
        issue,
        revendable: issue === 'remplacement' ? false : issue === 'echange' || etatArticle !== 'abime',
        ...(issue === 'echange' && {
          echange: { lignes: [{ produitId: nouveauProduit, quantite: Number(nouvelleQuantite) }] },
        }),
      })
      setResultat({ retour, etat: issue === 'remboursement' ? etatArticle : null })
      setProduitId('')
      setQuantite('1')
      setNouveauProduit('')
      setNouvelleQuantite('1')
      setPlastiqueIntact(false)
      setSaisie(false)
      recharger()
    } catch (probleme) {
      const champs = erreursDesChamps(probleme)
      const code = codeErreur(probleme)
      if (Object.keys(champs).length > 0) {
        setErreurs({
          produitId: champs.produitId,
          quantite: champs.quantite,
          etat: champs.revendable ?? champs.issue,
          nouveauProduit: champs.echange,
        })
        if (!champs.produitId && !champs.quantite && !champs.revendable && !champs.issue && !champs.echange) {
          setErreur(Object.values(champs)[0] ?? messageErreur(probleme))
        }
      } else if (code === 'QUANTITE_NON_RETOURNABLE') {
        setErreurs({ quantite: messageErreurRetour(probleme) })
        recharger()
      } else if (code === 'LIGNE_INDISPONIBLE') {
        setErreurs({ nouveauProduit: messageErreurRetour(probleme) })
      } else {
        setErreur(messageErreurRetour(probleme))
        if (code === 'STOCK_MODIFIE' || code === 'DELAI_RETOUR_DEPASSE' || code === 'VENTE_NON_EXPEDIEE') {
          recharger()
        }
      }
    } finally {
      setEnvoi(false)
    }
  }

  if (vente.statut === 'a_preparer') {
    return (
      <section className="ventes-bloc" aria-labelledby="titre-retours">
        <h3 id="titre-retours" className="visuellement-cache">Retours</h3>
        <p className="ventes-aide">
          Les retours seront possibles une fois la commande expédiée : le client ne peut renvoyer
          que ce qu’il a reçu.
        </p>
      </section>
    )
  }

  return (
    <section className="ventes-bloc" aria-labelledby="titre-retours">
      <h3 id="titre-retours" className="visuellement-cache">Retours</h3>
      {erreurChargement && <ErrorMessage>{erreurChargement}</ErrorMessage>}
      {!erreurChargement && !etat && <Loader />}
      {etat && (
        <>
          <p className={etat.retourPossible ? 'ventes-limite' : 'ventes-limite ventes-limite--depassee'}>
            {etat.retourPossible
              ? `Retour possible jusqu’au ${formatJourTahiti(etat.dateLimiteRetour)} inclus`
              : `Délai de retour dépassé depuis le ${formatJourTahiti(etat.dateLimiteRetour)}`}
            <span className="ventes-secondaire">
              {vente.occasionCadeau ? 'Cadeau : 1 mois après l’achat.' : '14 jours après l’achat.'}
            </span>
          </p>

          <div className="ventes-tableau-cadre">
            <table className="ventes-tableau ventes-tableau--lignes">
              <thead>
                <tr>
                  <EnteteInfo libelle="Article" info="Article de la commande." />
                  <EnteteInfo
                    libelle="Vendus"
                    info="Exemplaires achetés dans cette commande."
                    className="ventes-nombre"
                    aDroite
                  />
                  <EnteteInfo
                    libelle="Déjà rendus"
                    info="Exemplaires déjà retournés, quelle que soit l’issue."
                    className="ventes-nombre"
                    aDroite
                  />
                  <EnteteInfo
                    libelle="Encore retournables"
                    info="Exemplaires que le client peut encore rendre : on ne peut pas rendre plus que ce qui a été acheté."
                    className="ventes-nombre"
                    aDroite
                  />
                </tr>
              </thead>
              <tbody>
                {etat.lignes.map((ligne) => (
                  <tr key={ligne.produitId}>
                    <td>
                      {ligne.designation}
                      <span className="ventes-secondaire">{ligne.reference}</span>
                    </td>
                    <td className="ventes-nombre">{ligne.quantite}</td>
                    <td className="ventes-nombre">{ligne.quantiteRetournee}</td>
                    <td className="ventes-nombre">
                      <strong>{ligne.quantiteRetournable}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {resultat && (
            <div className="ventes-resultat" role="status">
              <strong>
                {LIBELLES_ISSUE[resultat.retour.issue]} enregistré :{' '}
                {exemplaires(resultat.retour.quantite)} de {resultat.retour.designation}.
              </strong>
              <p>{bilan(resultat.retour)}</p>
              <p>{devenirArticle(resultat.retour, resultat.etat)}</p>
              {resultat.retour.issue === 'echange' && (
                <p>
                  Le nouvel article part chez {vente.client.nom}, à l’adresse de la commande, avec
                  la livraison offerte.
                </p>
              )}
            </div>
          )}
          {erreur && <ErrorMessage>{erreur}</ErrorMessage>}

          {etat.retourPossible && retournables.length > 0 && !saisie && (
            <div className="ventes-colis">
              <p className="ventes-aide">
                Le client renvoie les articles par colis, sans demande préalable. Enregistrez le retour
                ici quand vous recevez le colis.
              </p>
              <div className="ventes-actions">
                <Button type="button" onClick={ouvrirSaisie}>
                  J’ai reçu un colis de retour
                </Button>
              </div>
            </div>
          )}

          {etat.retourPossible && retournables.length > 0 && saisie && (
            <form
              className="ventes-bloc ventes-formulaire"
              aria-labelledby="titre-formulaire-retour"
              onSubmit={envoyer}
              noValidate
            >
              <h4 id="titre-formulaire-retour">Enregistrer un retour reçu par colis</h4>
              <div className="ventes-deux">
                <Select
                  label="Article rendu"
                  value={articleChoisi}
                  error={erreurs.produitId}
                  onChange={(evenement) => setProduitId(evenement.target.value)}
                >
                  {retournables.map((ligne) => (
                    <option key={ligne.produitId} value={ligne.produitId}>
                      {ligne.designation} ({ligne.quantiteRetournable} retournable
                      {ligne.quantiteRetournable > 1 ? 's' : ''})
                    </option>
                  ))}
                </Select>
                <Input
                  label="Quantité rendue"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={ligneChoisie?.quantiteRetournable}
                  value={quantite}
                  error={erreurs.quantite}
                  onChange={(evenement) => setQuantite(evenement.target.value)}
                />
              </div>

              <fieldset className="ventes-choix">
                <legend>Que fait-on pour le client ?</legend>
                {ISSUES.map((option) => (
                  <label key={option.valeur} className="ventes-option">
                    <input
                      type="radio"
                      name="issue"
                      value={option.valeur}
                      checked={issue === option.valeur}
                      onChange={() => {
                        setIssue(option.valeur)
                        setErreurs({})
                      }}
                    />
                    <span>
                      <strong>{LIBELLES_ISSUE[option.valeur]}</strong>
                      <span className="ventes-secondaire">{option.aide}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              {issue === 'remboursement' && (
                <fieldset className="ventes-choix" aria-describedby={erreurs.etat ? 'erreur-etat' : undefined}>
                  <legend>Dans quel état est l’article rendu ?</legend>
                  <label className="ventes-option">
                    <input
                      type="radio"
                      name="etat"
                      checked={etatArticle === 'intact'}
                      onChange={() => setEtatArticle('intact')}
                    />
                    <span>
                      <strong>Neuf, plastique intact</strong>
                      <span className="ventes-secondaire">Il est remis en stock tel quel.</span>
                    </span>
                  </label>
                  <label className="ventes-option">
                    <input
                      type="radio"
                      name="etat"
                      checked={etatArticle === 'ouvert'}
                      onChange={() => setEtatArticle('ouvert')}
                    />
                    <span>
                      <strong>Ouvert mais en bon état</strong>
                      <span className="ventes-secondaire">
                        Il est remis en stock et peut repartir en vente sous cellophane.
                      </span>
                    </span>
                  </label>
                  <label className="ventes-option">
                    <input
                      type="radio"
                      name="etat"
                      checked={etatArticle === 'abime'}
                      onChange={() => setEtatArticle('abime')}
                    />
                    <span>
                      <strong>Abîmé ou défectueux</strong>
                      <span className="ventes-secondaire">Il passe en stock défectueux, il ne sera pas revendu.</span>
                    </span>
                  </label>
                  {erreurs.etat && (
                    <span className="common-input__error" id="erreur-etat">
                      {erreurs.etat}
                    </span>
                  )}
                </fieldset>
              )}

              {issue === 'echange' && (
                <>
                  <div className="ventes-case">
                    <label>
                      <input
                        type="checkbox"
                        checked={plastiqueIntact}
                        aria-invalid={erreurs.etat ? true : undefined}
                        aria-describedby={erreurs.etat ? 'erreur-plastique' : undefined}
                        onChange={(evenement) => setPlastiqueIntact(evenement.target.checked)}
                      />
                      J’ai vérifié : le plastique de l’article rendu est intact
                    </label>
                    {erreurs.etat && (
                      <span className="common-input__error" id="erreur-plastique">
                        {erreurs.etat}
                      </span>
                    )}
                  </div>
                  <div className="ventes-deux">
                    <Select
                      label="Article envoyé en échange"
                      value={nouveauProduit}
                      error={erreurs.nouveauProduit}
                      onChange={(evenement) => setNouveauProduit(evenement.target.value)}
                    >
                      <option value="">Choisir un article</option>
                      {produits.map((produit) => (
                        <option key={produit.id} value={produit.id}>
                          {produit.designation} ({formatXPF(produit.prixApplique)})
                        </option>
                      ))}
                    </Select>
                    <Input
                      label="Quantité envoyée"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={nouvelleQuantite}
                      error={erreurs.nouvelleQuantite}
                      onChange={(evenement) => setNouvelleQuantite(evenement.target.value)}
                    />
                  </div>
                  <p className="ventes-aide">
                    Le nouvel article part chez {vente.client.nom}, à l’adresse de la commande
                    ({adresseSurUneLigne(vente.adresseLivraison) || 'adresse non renseignée'}), avec la livraison offerte.
                    La différence de prix est calculée à l’enregistrement.
                  </p>
                </>
              )}

              {issue === 'remplacement' && (
                <p className="ventes-aide">
                  L’article défectueux passe en stock défectueux et un exemplaire neuf part chez le
                  client. S’il n’y a plus d’exemplaire neuf, le retour est remboursé à la place.
                </p>
              )}

              <div className="ventes-actions">
                <Button type="submit" loading={envoi}>
                  Enregistrer le retour
                </Button>
                <Button type="button" variant="secondary" onClick={annulerSaisie} disabled={envoi}>
                  Annuler
                </Button>
              </div>
            </form>
          )}

          {etat.retourPossible && retournables.length === 0 && (
            <p className="ventes-aide">Tous les articles de cette commande ont déjà été retournés.</p>
          )}

          {etat.retours.length > 0 && (
            <div className="ventes-bloc">
              <h4>Retours déjà enregistrés</h4>
              <ul className="ventes-historique">
                {etat.retours.map((retour) => (
                  <li key={retour.id}>
                    <div>
                      <strong>
                        {LIBELLES_ISSUE[retour.issue]} · {exemplaires(retour.quantite)} de {retour.designation}
                      </strong>
                      <span className="ventes-secondaire">
                        Le {formatDateHeure(retour.date)} ·{' '}
                        {retour.revendable ? 'remis en stock' : 'passé en défectueux'}
                      </span>
                    </div>
                    <span className="ventes-montant">
                      {retour.montantRembourse > 0 && `Remboursé ${formatXPF(retour.montantRembourse)}`}
                      {retour.complementPaye > 0 && `Complément ${formatXPF(retour.complementPaye)}`}
                      {retour.montantRembourse === 0 && retour.complementPaye === 0 && 'Sans montant'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default RetoursVente
