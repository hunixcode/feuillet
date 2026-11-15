export interface Parametres {
  dureeMiseDeCoteJours: number
  delaiRetourJours: number
  delaiRetourCadeauJours: number
  fraisEmballage: number
  fraisLivraison: number
  seuilAlerteDefaut: number
}

export type CleParametre = keyof Parametres
