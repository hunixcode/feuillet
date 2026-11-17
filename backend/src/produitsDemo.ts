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
  { reference: "DEMO-LIV-001", designation: "L'Île au trésor", type: "livre", categorie: "roman", prix: 1800, tauxTva: 5, isbn: "9782081204645", auteur: "Robert Louis Stevenson", promotion: { remise: 15, jours: 30 } , stock: 12 },
  { reference: "DEMO-LIV-002", designation: "Le Petit Prince", type: "livre", categorie: "jeunesse", prix: 1200, tauxTva: 5, isbn: "9782070612758", auteur: "Antoine de Saint-Exupéry" , stock: 8 },
  { reference: "DEMO-LIV-003", designation: "Le Crime de l'Orient-Express", type: "livre", categorie: "policier", prix: 1500, tauxTva: 5, isbn: "9782013218924", auteur: "Agatha Christie" , stock: 5 },
  { reference: "DEMO-LIV-004", designation: "One Piece, tome 1", type: "livre", categorie: "bd-et-manga", prix: 1100, tauxTva: 5, isbn: "9782723433358", auteur: "Eiichirō Oda" , stock: 20 },
  { reference: "DEMO-LIV-005", designation: "Astérix le Gaulois", type: "livre", categorie: "bd-et-manga", prix: 1650, tauxTva: 5, isbn: "9782012101333", auteur: "René Goscinny, Albert Uderzo" , stock: 3 },
  { reference: "DEMO-LIV-006", designation: "Noa Noa", type: "livre", categorie: "documentaire", prix: 2400, tauxTva: 5, isbn: "9782908228458", auteur: "Paul Gauguin" , stock: 0 },
  { reference: "DEMO-LIV-007", designation: "Bescherelle : la conjugaison pour tous", type: "livre", categorie: "scolaire", prix: 1350, tauxTva: 5, isbn: "9782218922626", auteur: "Collectif", promotion: { remise: 10, jours: 14 } , stock: 15 },
  { reference: "DEMO-LIV-008", designation: "La Peste", type: "livre", categorie: "roman", prix: 1050, tauxTva: 5, isbn: "9782070360420", auteur: "Albert Camus", stock: 20 },
  { reference: "DEMO-LIV-009", designation: "Le Tour du monde en quatre-vingts jours", type: "livre", categorie: "roman", prix: 790, tauxTva: 5, isbn: "9781692526252", auteur: "Jules Verne", stock: 8 },
  { reference: "DEMO-LIV-010", designation: "Dune, tome 2", type: "livre", categorie: "roman", prix: 1590, tauxTva: 5, isbn: "9782266114035", auteur: "Frank Herbert", stock: 18 },
  { reference: "DEMO-LIV-011", designation: "L'Alchimiste", type: "livre", categorie: "roman", prix: 1100, tauxTva: 5, isbn: "9782277241201", auteur: "Paulo Coelho", stock: 18 },
  { reference: "DEMO-LIV-012", designation: "L'Étranger", type: "livre", categorie: "roman", prix: 950, tauxTva: 5, isbn: "9782070212002", auteur: "Albert Camus", stock: 13 },
  { reference: "DEMO-LIV-013", designation: "Le Comte de Monte-Cristo", type: "livre", categorie: "roman", prix: 1900, tauxTva: 5, isbn: "9782080710048", auteur: "Alexandre Dumas", stock: 4 },
  { reference: "DEMO-LIV-014", designation: "Les Misérables, tome 1", type: "livre", categorie: "roman", prix: 1290, tauxTva: 5, isbn: "9782080720962", auteur: "Victor Hugo", stock: 6 },
  { reference: "DEMO-LIV-015", designation: "Madame Bovary", type: "livre", categorie: "roman", prix: 890, tauxTva: 5, isbn: "9782080704641", auteur: "Gustave Flaubert", stock: 7 },
  { reference: "DEMO-LIV-016", designation: "L'Écume des jours", type: "livre", categorie: "roman", prix: 950, tauxTva: 5, isbn: "9783125997509", auteur: "Boris Vian", stock: 9 },
  { reference: "DEMO-LIV-017", designation: "Arsène Lupin, gentleman-cambrioleur", type: "livre", categorie: "policier", prix: 790, tauxTva: 5, isbn: "9782010195464", auteur: "Maurice Leblanc", stock: 10 },
  { reference: "DEMO-LIV-018", designation: "Le Mystère de la chambre jaune", type: "livre", categorie: "policier", prix: 850, tauxTva: 5, isbn: "9782013220460", auteur: "Gaston Leroux", stock: 6 },
  { reference: "DEMO-LIV-019", designation: "Millénium, tome 1", type: "livre", categorie: "policier", prix: 1490, tauxTva: 5, isbn: "9782286036454", auteur: "Stieg Larsson", stock: 5 },
  { reference: "DEMO-LIV-020", designation: "Souvenirs sur Sherlock Holmes", type: "livre", categorie: "policier", prix: 450, tauxTva: 5, isbn: "9782253010159", auteur: "Arthur Conan Doyle", stock: 12 },
  { reference: "DEMO-LIV-021", designation: "Tout Simenon, tome 1", type: "livre", categorie: "policier", prix: 2950, tauxTva: 5, isbn: "9782258020986", auteur: "Georges Simenon", stock: 2 },
  { reference: "DEMO-LIV-022", designation: "Le Petit Nicolas", type: "livre", categorie: "jeunesse", prix: 890, tauxTva: 5, isbn: "9782070364237", auteur: "Sempé et Goscinny", stock: 14 },
  { reference: "DEMO-LIV-023", designation: "Le Lion", type: "livre", categorie: "jeunesse", prix: 850, tauxTva: 5, isbn: "9780785923718", auteur: "Joseph Kessel", stock: 6 },
  { reference: "DEMO-LIV-024", designation: "L'Enfant et la rivière", type: "livre", categorie: "jeunesse", prix: 790, tauxTva: 5, isbn: "9782070529179", auteur: "Henri Bosco", stock: 8 },
  { reference: "DEMO-LIV-025", designation: "Vingt mille lieues sous les mers", type: "livre", categorie: "jeunesse", prix: 990, tauxTva: 5, isbn: "9780341744368", auteur: "Jules Verne", stock: 7 },
  { reference: "DEMO-MAN-001", designation: "Sakamoto Days, tome 1", type: "livre", categorie: "bd-et-manga", prix: 1150, tauxTva: 5, isbn: "9788419096746", auteur: "Yūto Suzuki", stock: 12 },
  { reference: "DEMO-MAN-002", designation: "Sakamoto Days, tome 2", type: "livre", categorie: "bd-et-manga", prix: 1150, tauxTva: 5, isbn: "9788419306302", auteur: "Yūto Suzuki", stock: 10 },
  { reference: "DEMO-MAN-003", designation: "Sakamoto Days, tome 5", type: "livre", categorie: "bd-et-manga", prix: 1150, tauxTva: 5, isbn: "9781974734412", auteur: "Yūto Suzuki", stock: 8 },
  { reference: "DEMO-MAN-004", designation: "Sakamoto Days, tome 6", type: "livre", categorie: "bd-et-manga", prix: 1150, tauxTva: 5, isbn: "9788419730473", auteur: "Yūto Suzuki", stock: 8 },
  { reference: "DEMO-MAN-005", designation: "Spy × Family, tome 1", type: "livre", categorie: "bd-et-manga", prix: 1100, tauxTva: 5, isbn: "9788418271236", auteur: "Tatsuya Endō", stock: 10 },
  { reference: "DEMO-MAN-006", designation: "Kuroko's Basket, tome 1", type: "livre", categorie: "bd-et-manga", prix: 1100, tauxTva: 5, isbn: "9788416512805", auteur: "Tadatoshi Fujimaki", stock: 10 },
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
  { jours: 26, lignes: [["DEMO-LIV-008", 6], ["DEMO-LIV-010", 4]], adresseLivraison: "BP 45, 98702 Faa'a" },
  { jours: 21, lignes: [["DEMO-LIV-002", 1]], occasionCadeau: "anniversaire", emballageCadeau: true, adresseLivraison: "BP 45, 98702 Faa'a" },
  { jours: 19, lignes: [["DEMO-LIV-011", 7], ["DEMO-LIV-012", 4], ["DEMO-LIV-008", 4]], adresseLivraison: "BP 8, 98728 Moorea" },
  { jours: 14, lignes: [["DEMO-LIV-004", 2], ["DEMO-PAP-002", 2]], adresseLivraison: "BP 120, 98713 Papeete" },
  { jours: 12, lignes: [["DEMO-LIV-010", 5], ["DEMO-LIV-004", 7]], adresseLivraison: "BP 120, 98713 Papeete" },
  { jours: 10, lignes: [["DEMO-LIV-007", 2], ["DEMO-PAP-001", 4], ["DEMO-PAP-003", 1]], adresseLivraison: "BP 8, 98728 Moorea" },
  { jours: 8, lignes: [["DEMO-LIV-012", 9], ["DEMO-LIV-011", 6], ["DEMO-LIV-008", 4]], adresseLivraison: "BP 45, 98702 Faa'a" },
  { jours: 6, lignes: [["DEMO-LIV-001", 1], ["DEMO-MAG-001", 1]], adresseLivraison: "BP 120, 98713 Papeete" },
  { jours: 5, lignes: [["DEMO-LIV-010", 5], ["DEMO-MAN-001", 2]], adresseLivraison: "BP 8, 98728 Moorea" },
  { jours: 3, lignes: [["DEMO-LIV-004", 1], ["DEMO-LIV-005", 1]], adresseLivraison: "BP 45, 98702 Faa'a" },
  { jours: 2, lignes: [["DEMO-LIV-008", 2]], occasionCadeau: "noel", emballageCadeau: true, adresseLivraison: "BP 120, 98713 Papeete" },
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
