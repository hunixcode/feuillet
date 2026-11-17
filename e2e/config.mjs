// Valeurs partagées par le lanceur (serveur.mjs) et les tests. La base est temporaire : ce compte n'existe nulle part ailleurs.
export const PORT = Number(process.env.E2E_PORT ?? 4173);

export const RESPONSABLE = {
  email: "responsable@e2e.test",
  motDePasse: "Responsable-e2e-2026",
};
