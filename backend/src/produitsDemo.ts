// Catalogue de démonstration (EQ03) ; promotion : remise en %, du jour du seed à J + jours.
export const PRODUITS_DEMO = [
  { reference: "DEMO-LIV-001", designation: "L'Île au trésor", type: "livre", categorie: "roman", prix: 1800, tauxTva: 5, auteur: "Robert Louis Stevenson", promotion: { remise: 15, jours: 30 } },
  { reference: "DEMO-LIV-002", designation: "Le Petit Prince", type: "livre", categorie: "jeunesse", prix: 1200, tauxTva: 5, isbn: "9782070612758", auteur: "Antoine de Saint-Exupéry" },
  { reference: "DEMO-LIV-003", designation: "Le Crime de l'Orient-Express", type: "livre", categorie: "policier", prix: 1500, tauxTva: 5, isbn: "9782253010616", auteur: "Agatha Christie" },
  { reference: "DEMO-LIV-004", designation: "One Piece, tome 1", type: "livre", categorie: "bd-manga", prix: 1100, tauxTva: 5, isbn: "9782723434621", auteur: "Eiichirō Oda" },
  { reference: "DEMO-LIV-005", designation: "Astérix le Gaulois", type: "livre", categorie: "bd-manga", prix: 1650, tauxTva: 5, isbn: "9782012101333", auteur: "René Goscinny, Albert Uderzo" },
  { reference: "DEMO-LIV-006", designation: "Noa Noa", type: "livre", categorie: "documentaire", prix: 2400, tauxTva: 5, isbn: "9782841860517", auteur: "Paul Gauguin" },
  { reference: "DEMO-LIV-007", designation: "Bescherelle : la conjugaison pour tous", type: "livre", categorie: "scolaire", prix: 1350, tauxTva: 5, isbn: "9782218951947", auteur: "Collectif", promotion: { remise: 10, jours: 14 } },
  { reference: "DEMO-MAG-001", designation: "Géo n° 548", type: "magazine", categorie: "presse", prix: 950, tauxTva: 5, issn: "0220-8245", numero: 548, dateParution: "2026-10-01" },
  { reference: "DEMO-MAG-002", designation: "Science & Vie n° 1297", type: "magazine", categorie: "presse", prix: 800, tauxTva: 5, issn: "0036-8369", numero: 1297, dateParution: "2026-10-05" },
  { reference: "DEMO-PAP-001", designation: "Cahier 96 pages grands carreaux", type: "papeterie", categorie: "fournitures", prix: 350, tauxTva: 16, marque: "Clairefontaine" },
  { reference: "DEMO-PAP-002", designation: "Stylo bille bleu (lot de 4)", type: "papeterie", categorie: "fournitures", prix: 450, tauxTva: 16, marque: "Bic", promotion: { remise: 20, jours: 7 } },
  { reference: "DEMO-PAP-003", designation: "Calculatrice collège", type: "papeterie", categorie: "scolaire", prix: 2900, tauxTva: 16, marque: "Casio" },
];
