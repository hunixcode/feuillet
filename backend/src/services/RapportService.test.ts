import { beforeEach, describe, expect, it } from "vitest";
import { ErreurApi } from "../erreurs.js";
import { servicesMemoire } from "../tests/servicesMemoire.js";
import { semaineDe } from "./RapportService.js";

async function erreurDe(promesse: Promise<unknown>): Promise<ErreurApi> {
  const erreur = await promesse.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(erreur).toBeInstanceOf(ErreurApi);
  return erreur as ErreurApi;
}

describe("RapportService", () => {
  let horloge: { date: Date; maintenant: () => Date };
  let services: ReturnType<typeof servicesMemoire>;
  let livre: string;
  let manga: string;
  let cahier: string;

  async function produit(reference: string, designation: string, categorie: string, prix: number) {
    return (await services.produitService.creer({ reference, designation, type: "livre", categorie, prix, tauxTva: 5 })).id;
  }

  const client = { id: "c-1", nom: "Marie", email: "marie@example.pf", role: "client" as const };
  async function vendre(produitId: string, quantite: number) {
    const commande = await services.venteService.commanderEnLigne(client, { lignes: [{ produitId, quantite }], adresseLivraison: "Papeete" });
    return services.venteService.marquerExpediee(commande.id);
  }

  beforeEach(async () => {
    // Vendredi 2026-11-06, 10:00 à Tahiti, inventaire de départ.
    horloge = { date: new Date("2026-11-06T20:00:00Z"), maintenant: () => horloge.date };
    services = servicesMemoire(horloge);
    await services.repositories.categories.creer({ id: "roman", libelle: "Roman" });
    await services.repositories.categories.creer({ id: "manga", libelle: "Manga" });
    livre = await produit("LIV-001", "L'Île au trésor", "roman", 1800);
    manga = await produit("LIV-002", "One Piece", "manga", 1100);
    cahier = await produit("LIV-003", "Sans activité", "roman", 500);
    await services.stockService.corrigerInventaire(livre, { quantiteComptee: 10, motif: "Stock initial" });
    await services.stockService.corrigerInventaire(manga, { quantiteComptee: 20, motif: "Stock initial" });
    await services.stockService.corrigerInventaire(cahier, { quantiteComptee: 3, motif: "Stock initial" });
  });

  describe("semaine (décision 21)", () => {
    it("va du lundi au dimanche contenant le jour donné", () => {
      expect(semaineDe("2026-11-09")).toEqual({ debut: "2026-11-09", fin: "2026-11-15" });
      expect(semaineDe("2026-11-15")).toEqual({ debut: "2026-11-09", fin: "2026-11-15" });
      expect(semaineDe("2026-11-12")).toEqual({ debut: "2026-11-09", fin: "2026-11-15" });
    });
  });

  describe("rapport (RG08)", () => {
    beforeEach(async () => {
      // Lundi 9 et mercredi 11 novembre : ventes et retours de la semaine.
      horloge.date = new Date("2026-11-09T20:00:00Z");
      const venteLivre = await vendre(livre, 4);
      await vendre(manga, 3);
      horloge.date = new Date("2026-11-11T20:00:00Z");
      await services.retourService.enregistrer(venteLivre.id, { produitId: livre, quantite: 1, issue: "remboursement" });
      await services.retourService.enregistrer(venteLivre.id, { produitId: livre, quantite: 1, issue: "remplacement" });
      // Semaine suivante : ne compte pas dans le rapport de la semaine du 9.
      horloge.date = new Date("2026-11-16T20:00:00Z");
      await vendre(livre, 2);
    });

    it("donne ventes brutes, retours, net et quantités de la semaine, par produit et au total", async () => {
      const rapport = await services.rapportService.rapport({ semaine: "2026-11-11" });

      expect(rapport.periode).toEqual({ debut: "2026-11-09", fin: "2026-11-15" });
      expect(rapport.totaux).toEqual({
        ventesBrutes: 4 * 1800 + 3 * 1100,
        retours: 1800,
        net: 3 * 1800 + 3 * 1100,
        quantiteVendue: 7,
        quantiteRetournee: 1,
        quantiteNette: 6,
      });
      expect(rapport.produits.find((p) => p.produitId === livre)).toEqual({
        produitId: livre,
        reference: "LIV-001",
        designation: "L'Île au trésor",
        categorie: "roman",
        quantiteVendue: 4,
        montantVentes: 7200,
        quantiteRetournee: 1,
        montantRetours: 1800,
        quantiteNette: 3,
        montantNet: 5400,
        quantiteRemplacee: 1,
        // Fin de semaine : 10 − 4 + 1 (remis en stock) − 1 (neuf du remplacement), avant la vente du 16.
        stockRestant: 6,
        pourcentageVendu: 30,
      });
      expect(rapport.statistiques).toEqual({
        nombreVentes: 2,
        panierMoyen: Math.round((7200 + 3300) / 2),
        nombreRetours: 2,
      });
    });

    it("montre aussi les articles actifs sans activité, avec leur stock", async () => {
      const rapport = await services.rapportService.rapport({ semaine: "2026-11-11" });

      expect(rapport.produits.find((p) => p.produitId === cahier)).toMatchObject({ quantiteVendue: 0, stockRestant: 3 });
    });

    it("filtre par catégorie", async () => {
      const rapport = await services.rapportService.rapport({ semaine: "2026-11-11", categorie: "manga" });

      expect(rapport.categorie).toBe("manga");
      expect(rapport.produits.map((p) => p.produitId)).toEqual([manga]);
      expect(rapport.totaux.ventesBrutes).toBe(3300);
      expect(rapport.statistiques.nombreVentes).toBe(1);
    });

    it("accepte une période libre et prend la semaine du jour par défaut", async () => {
      const libre = await services.rapportService.rapport({ debut: "2026-11-01", fin: "2026-11-30" });
      const parDefaut = await services.rapportService.rapport({});

      expect(libre.totaux.quantiteVendue).toBe(9);
      expect(parDefaut.periode).toEqual({ debut: "2026-11-16", fin: "2026-11-22" });
    });

    it("valide la période", async () => {
      expect((await erreurDe(services.rapportService.rapport({ debut: "2026-11-10", fin: "2026-11-01" }))).details).toEqual({
        champs: { fin: "La date de fin doit suivre la date de début." },
      });
      expect((await erreurDe(services.rapportService.rapport({ debut: "2026-02-30" }))).details).toEqual({
        champs: { debut: expect.any(String), fin: expect.any(String) },
      });
      expect(await erreurDe(services.rapportService.rapport({ debut: "2025-01-01", fin: "2026-12-31" }))).toMatchObject({
        code: "VALIDATION",
      });
      expect(await erreurDe(services.rapportService.rapport({ semaine: "hier" }))).toMatchObject({ code: "VALIDATION" });
    });

    it("exporte le rapport en CSV pour Excel", async () => {
      const { nomFichier, contenu } = await services.rapportService.exporterCsv({ semaine: "2026-11-11" });

      expect(nomFichier).toBe("rapport-2026-11-09-2026-11-15.csv");
      expect(contenu.startsWith("﻿Rapport du 2026-11-09 au 2026-11-15\r\n")).toBe(true);
      expect(contenu).toContain("Référence;Désignation;Catégorie;Quantité vendue;Ventes (XPF)");
      expect(contenu).toContain("LIV-001;L'Île au trésor;roman;4;7200;1;1800;3;5400;1;6;30\r\n");
      expect(contenu).toContain("Nombre de ventes;2\r\n");
    });
  });

  describe("meilleures ventes (RG14)", () => {
    it("classe les 10 produits les plus vendus sur 30 jours, nets des retours, pour tous", async () => {
      horloge.date = new Date("2026-11-08T20:00:00Z");
      const venteLivre = await vendre(livre, 5);
      await vendre(manga, 4);
      await services.retourService.enregistrer(venteLivre.id, { produitId: livre, quantite: 2, issue: "remboursement" });
      await services.retourService.enregistrer(venteLivre.id, { produitId: livre, quantite: 1, issue: "remplacement" });

      const meilleures = await services.rapportService.meilleuresVentes({});

      expect(meilleures.map((p) => [p.reference, p.quantiteVendue])).toEqual([
        ["LIV-002", 4],
        ["LIV-001", 3],
      ]);
      expect(meilleures[0]).toMatchObject({ designation: "One Piece", prixApplique: 1100, disponibilite: "disponible" });
    });

    it("ne compte que les 30 derniers jours, filtre par catégorie et ignore les archivés", async () => {
      await vendre(livre, 5);
      horloge.date = new Date("2026-12-07T20:00:00Z");
      await vendre(manga, 1);
      await vendre(cahier, 1);
      await services.produitService.modifier(cahier, {
        reference: "LIV-003",
        designation: "Sans activité",
        type: "livre",
        categorie: "roman",
        prix: 500,
        tauxTva: 5,
        archive: true,
      });

      expect((await services.rapportService.meilleuresVentes({})).map((p) => p.reference)).toEqual(["LIV-002"]);
      await expect(services.rapportService.meilleuresVentes({ categorie: "roman" })).resolves.toEqual([]);
    });

    it("garde au plus 10 produits", async () => {
      for (let i = 0; i < 12; i++) {
        const id = await produit(`MAN-${i}`, `Manga ${String(i).padStart(2, "0")}`, "manga", 100);
        await services.stockService.corrigerInventaire(id, { quantiteComptee: 20, motif: "Stock" });
        await vendre(id, i + 1);
      }

      const meilleures = await services.rapportService.meilleuresVentes({});

      expect(meilleures).toHaveLength(10);
      expect(meilleures[0]!.reference).toBe("MAN-11");
    });
  });
});
