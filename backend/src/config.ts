export function lireVariable(nom: string): string {
  const valeur = process.env[nom];
  if (!valeur) {
    console.error(`${nom} manquante — copier .env.example vers .env`);
    process.exit(1);
  }
  return valeur;
}

/** Lit `CORS_ORIGINES` : origines séparées par des virgules ; absent ou vide → aucune (même origine). */
export function lireOriginesCors(valeur: string | undefined): string[] {
  return (valeur ?? "")
    .split(",")
    .map((origine) => origine.trim().replace(/\/+$/, ""))
    .filter((origine) => origine !== "");
}
