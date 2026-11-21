import type { CommandeFournisseur } from '../../types/reappro'

export function StatutCommande({ commande }: { commande: CommandeFournisseur }) {
  if (commande.statut === 'recue') {
    return <span className="statut statut-recue">Reçue</span>
  }
  if (commande.statut === 'partiellement_recue') {
    return <span className="statut statut-partielle">Reçue en partie</span>
  }
  return <span className="statut statut-attente">Commandée</span>
}
