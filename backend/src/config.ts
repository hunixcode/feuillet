export function lireVariable(nom: string): string {
  const valeur = process.env[nom];
  if (!valeur) {
    console.error(`${nom} manquante — copier .env.example vers .env`);
    process.exit(1);
  }
  return valeur;
}

/** Lit `TRUST_PROXY` : absent → `false`, nombre → nombre de proxys, `true`/`false`, sinon liste d'adresses d'Express. */
export function lireConfianceProxy(valeur: string | undefined): boolean | number | string {
  const texte = valeur?.trim() ?? "";
  if (texte === "" || texte === "false") return false;
  if (texte === "true") return true;
  if (/^\d+$/.test(texte)) return Number(texte);
  return texte;
}
