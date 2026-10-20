import type { Role } from '../types/utilisateur'

export function accueilDuRole(role: Role): string {
  return role === 'responsable' ? '/responsable' : '/catalogue'
}

export function cheminApresConnexion(role: Role, depuis?: string): string {
  if (!depuis) {
    return accueilDuRole(role)
  }

  const versEspaceResponsable = depuis.startsWith('/responsable')
  if (versEspaceResponsable !== (role === 'responsable')) {
    return accueilDuRole(role)
  }

  return depuis
}
