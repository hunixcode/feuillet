export function decouperTitre(designation: string): { titre: string; tome?: string } {
  const resultat = /^(.*), (tome \d+)$/.exec(designation)
  return resultat ? { titre: resultat[1], tome: resultat[2] } : { titre: designation }
}
