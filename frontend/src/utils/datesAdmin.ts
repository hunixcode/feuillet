import { jourIso } from './format'

const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const UN_JOUR = 86_400_000

export function jourDe(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : jourIso(new Date(iso))
}

function versDate(iso: string): Date {
  const [annee, mois, jour] = jourDe(iso).split('-').map(Number)
  return new Date(Date.UTC(annee, mois - 1, jour))
}

export function ajouterJours(iso: string, nombre: number): string {
  return new Date(versDate(iso).getTime() + nombre * UN_JOUR).toISOString().slice(0, 10)
}

export function ecartJours(de: string, a: string): number {
  return Math.round((versDate(a).getTime() - versDate(de).getTime()) / UN_JOUR)
}

function numero(iso: string): string {
  const jour = versDate(iso).getUTCDate()
  return jour === 1 ? '1er' : String(jour)
}

export function moisCourt(iso: string): string {
  return MOIS_COURTS[versDate(iso).getUTCMonth()]
}

export function numeroJour(iso: string): string {
  return numero(iso)
}

export function dateCourte(iso: string): string {
  return `${numero(iso)} ${moisCourt(iso)}`
}

export function dateLongue(iso: string): string {
  return `${numero(iso)} ${MOIS[versDate(iso).getUTCMonth()]}`
}

export function nomJour(iso: string): string {
  return JOURS[versDate(iso).getUTCDay()]
}

export function majuscule(texte: string): string {
  return texte.replace(/^./, (lettre) => lettre.toUpperCase())
}

export function dans(iso: string, aujourdhui: string): string {
  const ecart = ecartJours(aujourdhui, iso)
  if (ecart === 0) return 'Aujourd’hui'
  if (ecart === 1) return 'Demain'
  return ecart > 0 ? `Dans ${ecart} jours` : `Il y a ${-ecart} jours`
}

export function dateRelative(iso: string, aujourdhui: string): string {
  const ecart = ecartJours(iso, aujourdhui)
  if (ecart === 0) return 'aujourd’hui'
  if (ecart === 1) return 'hier'
  if (ecart > 1 && ecart < 7) return nomJour(iso)
  return `le ${dateLongue(iso)}`
}

const heureFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Pacific/Tahiti',
})

export function heure(date: Date | string): string {
  return heureFormatter.format(new Date(date)).replace(':', ' h ')
}

const nombreFormatter = new Intl.NumberFormat('fr-FR')

export function nombre(valeur: number): string {
  return nombreFormatter.format(valeur).replace(/\u202f/g, '\u00a0')
}
