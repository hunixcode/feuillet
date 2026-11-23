export interface DetailsLivraison {
  nom: string
  telephone: string
  adresse: string
  codePostal: string
  ville: string
  indications: string
}

export type ChampLivraison = keyof DetailsLivraison

export const LIVRAISON_VIDE: DetailsLivraison = {
  nom: '',
  telephone: '',
  adresse: '',
  codePostal: '',
  ville: '',
  indications: '',
}

export const LONGUEURS_LIVRAISON: Record<ChampLivraison, number> = {
  nom: 50,
  telephone: 20,
  adresse: 100,
  codePostal: 5,
  ville: 40,
  indications: 60,
}

export const ORDRE_LIVRAISON: ChampLivraison[] = ['nom', 'telephone', 'adresse', 'codePostal', 'ville', 'indications']

const PREFIXE_TELEPHONE = 'Tél. '
const PREFIXE_INDICATIONS = 'Indications : '

export function verifierLivraison(details: DetailsLivraison): Partial<Record<ChampLivraison, string>> {
  const erreurs: Partial<Record<ChampLivraison, string>> = {}
  const telephone = details.telephone.trim()
  const chiffres = telephone.replace(/\D/g, '')
  if (!details.nom.trim()) {
    erreurs.nom = 'Indiquez le nom de la personne qui reçoit le colis.'
  }
  if (!telephone) {
    erreurs.telephone = 'Indiquez un numéro pour que le livreur puisse vous joindre.'
  } else if (!/^\+?[\d .-]+$/.test(telephone) || chiffres.length < 8 || chiffres.length > 15) {
    erreurs.telephone = 'Entrez un numéro de téléphone valide, par exemple 87 12 34 56.'
  }
  if (!details.adresse.trim()) {
    erreurs.adresse = 'Indiquez le numéro et la rue, la boîte postale ou le lot.'
  }
  if (!/^\d{5}$/.test(details.codePostal.trim())) {
    erreurs.codePostal = 'Le code postal compte 5 chiffres, par exemple 98714.'
  }
  if (!details.ville.trim()) {
    erreurs.ville = 'Indiquez la ville ou la commune.'
  }
  return erreurs
}

export function composerAdresse(details: DetailsLivraison): string {
  const indications = details.indications.trim()
  return [
    details.nom.trim(),
    `${PREFIXE_TELEPHONE}${details.telephone.trim()}`,
    details.adresse.trim(),
    `${details.codePostal.trim()} ${details.ville.trim()}`,
    indications ? `${PREFIXE_INDICATIONS}${indications}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function lignesAdresse(texte?: string): string[] {
  return (texte ?? '')
    .split('\n')
    .map((ligne) => ligne.trim())
    .filter(Boolean)
}

export function adresseSurUneLigne(texte?: string): string {
  return lignesAdresse(texte).join(', ')
}
