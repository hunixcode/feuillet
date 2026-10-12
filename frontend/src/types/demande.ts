// Contrat d'API proposé, à valider avec le backend.
export interface Demande {
  id: string
  titre: string
  date: string
  statut: string
  miseDeCote?: {
    quantite: number
    dateLimite: string
  }
}
