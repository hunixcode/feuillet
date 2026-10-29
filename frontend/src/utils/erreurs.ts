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
