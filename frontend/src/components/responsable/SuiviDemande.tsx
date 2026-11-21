import type { Demande } from '../../types/demande'
import type { CommandeFournisseur } from '../../types/reappro'
import { dans, dateCourte, ecartJours, jourDe } from '../../utils/datesAdmin'
import { commandeEnCours } from './libelles'

export function SuiviDemande({ demande, aujourdhui }: { demande: Demande; aujourdhui: string }) {
  if (demande.statut === 'en_attente') {
    return <span className="statut statut-attente">En attente</span>
  }
  if (demande.statut === 'mise_de_cote') {
    const limite = jourDe(demande.miseDeCote?.dateLimite ?? demande.date)
    const proche = ecartJours(aujourdhui, limite) <= 2
    return (
      <span className={proche ? 'statut statut-cote' : 'statut statut-attente-forte'}>
        {`Gardé, ${dans(limite, aujourdhui).toLowerCase()}`}
      </span>
    )
  }
  const textes = {
    honoree: ['statut-honoree', 'Honorée'],
    expiree: ['statut-fini', 'Expirée'],
    annulee: ['statut-fini', 'Annulée'],
  } as const
  const [classe, texte] = textes[demande.statut]
  return (
    <span className={`statut ${classe}`}>
      {demande.dateFin ? `${texte} le ${dateCourte(jourDe(demande.dateFin))}` : texte}
    </span>
  )
}

export function SituationDemande({
  demande,
  commandes,
}: {
  demande: Demande
  commandes: CommandeFournisseur[]
}) {
  if (!demande.produitId) {
    return <span className="etiquette etiquette-sombre">Absent du catalogue</span>
  }
  if (demande.statut !== 'en_attente') {
    return null
  }
  const commande = commandeEnCours(demande, commandes)
  return (
    <span className="etiquette">
      {commande ? `Épuisé, arrivée le ${dateCourte(commande.dateArriveePrevue)}` : 'Épuisé, à commander'}
    </span>
  )
}
