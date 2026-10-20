import { ApiRequestError } from '../services/api'

export function messageErreur(erreur: unknown): string {
  if (erreur instanceof ApiRequestError) {
    return erreur.message
  }

  return 'Une erreur inattendue est survenue.'
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
