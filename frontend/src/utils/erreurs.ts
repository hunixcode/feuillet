import { ApiRequestError } from '../services/api'

export function messageErreur(erreur: unknown): string {
  if (erreur instanceof ApiRequestError) {
    return erreur.message
  }

  return 'Une erreur inattendue est survenue.'
}

export type ActionStock = 'inventaire' | 'defectueux' | 'sortie'

const stockInsuffisant: Record<ActionStock, string> = {
  inventaire: 'La quantité comptée ne peut pas être inférieure aux exemplaires mis de côté.',
  defectueux: 'Impossible de déclarer abîmés plus d’exemplaires que le stock vendable.',
  sortie: 'Impossible de sortir plus d’exemplaires que le stock défectueux.',
}

export function stockModifie(erreur: unknown): boolean {
  return erreur instanceof ApiRequestError && erreur.code === 'STOCK_MODIFIE'
}

export function messageErreurStock(erreur: unknown, action: ActionStock): string {
  if (stockModifie(erreur)) {
    return 'Le stock a changé, rechargez et recommencez.'
  }
  if (erreur instanceof ApiRequestError && erreur.code === 'STOCK_INSUFFISANT') {
    return stockInsuffisant[action]
  }

  return messageErreur(erreur)
}

export function erreursDesChamps(erreur: unknown): Record<string, string> {
  if (!(erreur instanceof ApiRequestError)) {
    return {}
  }

  const details = erreur.details
  if (typeof details !== 'object' || details === null || !('champs' in details)) {
    return {}
  }

  const champs = details.champs
  if (typeof champs !== 'object' || champs === null) {
    return {}
  }

  const resultat: Record<string, string> = {}
  for (const [champ, message] of Object.entries(champs)) {
    if (typeof message === 'string') {
      resultat[champ] = message
    }
  }
  return resultat
}

function restantDe(erreur: ApiRequestError): number | null {
  const details = erreur.details
  if (typeof details === 'object' && details !== null && 'restant' in details) {
    return typeof details.restant === 'number' ? details.restant : null
  }
  return null
}

export function codeErreur(erreur: unknown): string {
  return erreur instanceof ApiRequestError ? erreur.code : ''
}

export function messageErreurReception(erreur: unknown): string {
  if (!(erreur instanceof ApiRequestError)) {
    return messageErreur(erreur)
  }
  switch (erreur.code) {
    case 'QUANTITE_SUPERIEURE_AU_RESTANT': {
      const restant = restantDe(erreur)
      const reste =
        restant === null
          ? 'Il reste moins d’exemplaires à recevoir sur cette commande'
          : `Il ne reste que ${restant} exemplaire${restant > 1 ? 's' : ''} à recevoir sur cette commande`
      return `${reste} : la quantité reçue en bon état ne peut pas dépasser ce nombre. Vérifiez le bon de livraison ; les exemplaires abîmés se saisissent à part.`
    }
    case 'COMMANDE_DEJA_RECUE':
      return 'Cette commande est déjà entièrement reçue : il n’y a plus rien à réceptionner.'
    case 'RECEPTION_DEJA_VALIDEE':
      return 'Cette réception a déjà été validée. Le stock n’a pas été compté une seconde fois.'
    case 'STOCK_MODIFIE':
      return 'La commande ou le stock a changé pendant la validation, rien n’a été enregistré. Les informations ont été rechargées : vérifiez puis recommencez.'
    default:
      return erreur.message
  }
}

function detail(erreur: ApiRequestError, cle: string): unknown {
  const details = erreur.details
  if (typeof details === 'object' && details !== null && cle in details) {
    return (details as Record<string, unknown>)[cle]
  }
  return undefined
}

const jourTahiti = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Pacific/Tahiti' })

export function messageErreurRetour(erreur: unknown): string {
  if (!(erreur instanceof ApiRequestError)) {
    return messageErreur(erreur)
  }
  switch (erreur.code) {
    case 'VENTE_NON_EXPEDIEE':
      return 'Cette commande n’a pas encore été expédiée : le client ne peut pas renvoyer un article qu’il n’a pas reçu. Marquez-la d’abord comme expédiée.'
    case 'DELAI_RETOUR_DEPASSE': {
      const limite = detail(erreur, 'dateLimiteRetour')
      const date = typeof limite === 'string' ? ` depuis le ${jourTahiti.format(new Date(limite))}` : ''
      return `Le délai de retour est dépassé${date} (14 jours après l’achat, 1 mois pour un cadeau). Ce retour ne peut plus être accepté.`
    }
    case 'QUANTITE_NON_RETOURNABLE': {
      const reste = detail(erreur, 'quantiteRetournable')
      if (reste === 0) {
        return 'Tous les exemplaires de cet article ont déjà été retournés.'
      }
      return typeof reste === 'number'
        ? `Le client ne peut plus rendre que ${reste} exemplaire${reste > 1 ? 's' : ''} de cet article : les autres ont déjà été retournés.`
        : 'Cette quantité dépasse ce qui peut encore être retourné pour cet article.'
    }
    case 'LIGNE_INDISPONIBLE':
      return 'L’article choisi pour l’échange n’est plus disponible en stock. Rien n’a été enregistré : choisissez un autre article ou proposez un remboursement.'
    case 'STOCK_MODIFIE':
      return 'Le stock a changé pendant l’enregistrement, rien n’a été enregistré. Les informations ont été rechargées : vérifiez puis recommencez.'
    case 'COMMANDE_DEJA_EXPEDIEE':
      return 'Cette commande a déjà été marquée comme expédiée. Les informations ont été rechargées.'
    default:
      return erreur.message
  }
}
