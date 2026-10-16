export const ROLES = ["client", "responsable"] as const;
export type Role = (typeof ROLES)[number];

export const TYPES_CLIENT = ["jeunesse", "etudiant", "adulte", "professionnel"] as const;
export type TypeClient = (typeof TYPES_CLIENT)[number];

export interface Utilisateur {
  id: string;
  nom: string;
  email: string;
  motDePasseHash: string;
  role: Role;
  typeClient?: TypeClient;
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
