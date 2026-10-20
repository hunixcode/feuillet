export function lireVariable(nom: string): string {
  const valeur = process.env[nom];
  if (!valeur) {
    console.error(`${nom} manquante — copier .env.example vers .env`);
    process.exit(1);
  }
  return valeur;
}
