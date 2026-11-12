// Catégories de départ (rapport.md, vocabulaire) ; le responsable peut ensuite les modifier.
export const CATEGORIES_DEPART = [
  "Roman",
  "Policier",
  "BD et manga",
  "Jeunesse",
  "Documentaire",
  "Scolaire",
  "Presse",
  "Fournitures",
];

// Catalogue de démonstration (EQ03) ; promotion : remise en %, du jour du seed à J + jours ;
// stock : quantité posée par une correction d'inventaire avant les ventes de démonstration (0 = épuisé).
export const PRODUITS_DEMO = [
  { reference: "DEMO-LIV-001", designation: "L'Île au trésor", type: "livre", categorie: "roman", prix: 1800, tauxTva: 5, auteur: "Robert Louis Stevenson", promotion: { remise: 15, jours: 30 } , stock: 12 },
  { reference: "DEMO-LIV-002", designation: "Le Petit Prince", type: "livre", categorie: "jeunesse", prix: 1200, tauxTva: 5, isbn: "9782070612758", auteur: "Antoine de Saint-Exupéry" , stock: 8 },
  { reference: "DEMO-LIV-003", designation: "Le Crime de l'Orient-Express", type: "livre", categorie: "policier", prix: 1500, tauxTva: 5, isbn: "9782253010616", auteur: "Agatha Christie" , stock: 5 },
  { reference: "DEMO-LIV-004", designation: "One Piece, tome 1", type: "livre", categorie: "bd-et-manga", prix: 1100, tauxTva: 5, isbn: "9782723434621", auteur: "Eiichirō Oda" , stock: 20 },
  { reference: "DEMO-LIV-005", designation: "Astérix le Gaulois", type: "livre", categorie: "bd-et-manga", prix: 1650, tauxTva: 5, isbn: "9782012101333", auteur: "René Goscinny, Albert Uderzo" , stock: 3 },
  { reference: "DEMO-LIV-006", designation: "Noa Noa", type: "livre", categorie: "documentaire", prix: 2400, tauxTva: 5, isbn: "9782841860517", auteur: "Paul Gauguin" , stock: 0 },
  { reference: "DEMO-LIV-007", designation: "Bescherelle : la conjugaison pour tous", type: "livre", categorie: "scolaire", prix: 1350, tauxTva: 5, isbn: "9782218951947", auteur: "Collectif", promotion: { remise: 10, jours: 14 } , stock: 15 },
  { reference: "DEMO-MAG-001", designation: "Géo n° 548", type: "magazine", categorie: "presse", prix: 950, tauxTva: 5, issn: "0220-8245", numero: 548, dateParution: "2026-10-01" , stock: 10 },
  { reference: "DEMO-MAG-002", designation: "Science & Vie n° 1297", type: "magazine", categorie: "presse", prix: 800, tauxTva: 5, issn: "0036-8369", numero: 1297, dateParution: "2026-10-05" , stock: 6 },
  { reference: "DEMO-PAP-001", designation: "Cahier 96 pages grands carreaux", type: "papeterie", categorie: "fournitures", prix: 350, tauxTva: 16, marque: "Clairefontaine" , stock: 40 },
  { reference: "DEMO-PAP-002", designation: "Stylo bille bleu (lot de 4)", type: "papeterie", categorie: "fournitures", prix: 450, tauxTva: 16, marque: "Bic", promotion: { remise: 20, jours: 7 } , stock: 25 },
  { reference: "DEMO-PAP-003", designation: "Calculatrice collège", type: "papeterie", categorie: "scolaire", prix: 2900, tauxTva: 16, marque: "Casio" , stock: 4 },
];

// Compte client auquel sont rattachées les commandes de démonstration.
export const CLIENT_DEMO = { nom: "Client de démonstration", email: "client.demo@librairie.example" };

// Commandes de démonstration (EQ03), passées il y a `jours` jours, pour les meilleures ventes (RG14).
export const VENTES_DEMO = [
  { jours: 28, lignes: [["DEMO-LIV-004", 3], ["DEMO-PAP-001", 5]], adresseLivraison: "BP 120, 98713 Papeete" },
  { jours: 21, lignes: [["DEMO-LIV-002", 1]], occasionCadeau: "anniversaire", emballageCadeau: true, adresseLivraison: "BP 45, 98702 Faa'a" },
  { jours: 14, lignes: [["DEMO-LIV-004", 2], ["DEMO-PAP-002", 2]], adresseLivraison: "BP 120, 98713 Papeete" },
  { jours: 10, lignes: [["DEMO-LIV-007", 2], ["DEMO-PAP-001", 4], ["DEMO-PAP-003", 1]], adresseLivraison: "BP 8, 98728 Moorea" },
  { jours: 6, lignes: [["DEMO-LIV-001", 1], ["DEMO-MAG-001", 1]], adresseLivraison: "BP 120, 98713 Papeete" },
  { jours: 3, lignes: [["DEMO-LIV-004", 1], ["DEMO-LIV-005", 1]], adresseLivraison: "BP 45, 98702 Faa'a" },
  { jours: 1, lignes: [["DEMO-PAP-001", 3], ["DEMO-PAP-002", 1]], adresseLivraison: "BP 8, 98728 Moorea" },
] as const;

// Fournisseurs de démonstration (EX06) et commandes en cours : arrivée prévue dans `jours` jours (EX04).
export const FOURNISSEURS_DEMO = [
  { nom: "Hachette Pacifique (démo)", contact: "commandes@hachette-pacifique.example" },
  { nom: "Archipel Diffusion (démo)", contact: "40 50 60 70" },
];

export const COMMANDES_FOURNISSEUR_DEMO = [
  { fournisseur: 0, reference: "DEMO-LIV-006", quantiteCommandee: 6, jours: 10 },
  { fournisseur: 1, reference: "DEMO-LIV-005", quantiteCommandee: 10, jours: 5 },
] as const;

// Le stock de départ est compté avant la première vente de démonstration.
export const JOURS_INVENTAIRE_DEMO = 30;
