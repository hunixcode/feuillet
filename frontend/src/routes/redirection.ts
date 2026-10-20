import type { Role } from '../types/utilisateur'

export function accueilDuRole(role: Role): string {
  return role === 'responsable' ? '/admin' : '/catalogue'
}

export function cheminApresConnexion(role: Role, depuis?: string): string {
  if (!depuis) {
    return accueilDuRole(role)
  }

  const versEspaceAdmin = depuis.startsWith('/admin')
  if (versEspaceAdmin !== (role === 'responsable')) {
    return accueilDuRole(role)
  }

  return depuis
}
