export const ROLES = ["client", "responsable"] as const;
export type Role = (typeof ROLES)[number];

export interface Utilisateur {
  id: string;
  nom: string;
  email: string;
  motDePasseHash: string;
  role: Role;
}

export type NouvelUtilisateur = Omit<Utilisateur, "id">;

export type UtilisateurPublic = Omit<Utilisateur, "motDePasseHash">;

export interface AuthResultat {
  utilisateur: UtilisateurPublic;
  token: string;
}

export function versUtilisateurPublic({ motDePasseHash: _, ...utilisateur }: Utilisateur): UtilisateurPublic {
  return utilisateur;
}
