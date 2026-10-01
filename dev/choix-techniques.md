# Choix techniques — Sujet 2 : Gestion du stock de librairie

> Document à présenter et valider par le client avant le développement.

---

## 1. Langage de programmation

### Choix retenu
**TypeScript** (front-end et back-end)

### Justification
| Critère | Commentaire |
|---|---|
| Adéquation au besoin | TypeScript offre un typage statique qui aide à modéliser le domaine métier (produits, mouvements, ventes) avec des interfaces et des types précis. Les règles métier complexes (calculs de stock, invariants) bénéficient de la vérification de types à la compilation. |
| Compétences du groupe | Le trinôme maîtrise JavaScript et souhaite renforcer ses compétences en typage statique, compétence très recherchée en industrie. |
| Possibilités de test | TypeScript s'intègre parfaitement avec les frameworks de tests modernes (Vitest, Jest). Le typage permet de détecter les erreurs de contrat entre modules avant l'exécution. |
| Déploiement | Compilation en JavaScript standard, compatible avec tous les navigateurs et Node.js. Aucune dépendance d'exécution supplémentaire. |
| Maintenance | Le typage documente le code implicitement, facilite le refactoring et réduit les régressions lors de l'évolution des règles métier. |

### Alternatives envisagées
| Langage | Pourquoi écarté |
|---|---|
| JavaScript pur | Le typage statique est un atout majeur pour un projet à règles métier complexes ; JavaScript augmente le risque d'erreurs silencieuses sur les types de données. |
| Java | Verbeux pour une application web moderne ; le cycle développement/test est plus lourd. L'équipe souhaite une stack plus agile. |
| Python | Moins adapté au développement front-end moderne ; le typage optionnel (mypy) est moins intégré que TypeScript. |

---

## 2. Framework de tests automatisés (obligatoire)

### Choix retenu
**Vitest** (front-end) + **Jest** ou **Vitest** (back-end)

### Justification
| Critère | Commentaire |
|---|---|
| Intégration avec le langage | Vitest est conçu pour TypeScript et Vite ; il comprend les types nativement et offre une expérience de développement fluide. |
| Facilité d'écriture des tests métier | Syntaxe simple (describe, it, expect), support des mocks et spies pour isoler les services métier. |
| Support des tests d'intégration | Permet de tester les API Express avec des bibliothèques comme supertest. |
| Rapports de couverture | Intégration native avec V8 coverage ou istanbul. |

### Alternatives envisagées
| Framework | Pourquoi écartée |
|---|---|
| Jest | Bonne alternative, mais Vitest est plus rapide et mieux intégré à Vite (partage de la configuration). |
| Mocha | Plus flexible mais nécessite plus de configuration ; Vitest offre une expérience plus clé en main. |

### Justification de l'organisation
| Décision | Raison |
|---|---|
| Séparation interface / métier / données | Permet de tester la logique métier sans les écrans (exigence du sujet). Les règles de stock, calculs de disponibilité et invariants sont testables en isolation. |
| API REST (Express) | Découple le front-end du back-end ; permet de faire évoluer l'interface sans toucher à la logique métier. |
| Services métier dédiés | Chaque service (StockService, VenteService, ReapproService) encapsule un ensemble cohérent de règles, facilitant la maintenance et les tests. |

### Alternatives envisagées
| Organisation | Pourquoi écartée |
|---|---|
| Monolithe front-end avec logique embarquée | Impossible de tester la logique métier sans l'interface, ce qui est une exigence du projet. |
| GraphQL | Surdimensionné pour le besoin ; les opérations sont principalement CRUD avec quelques calculs métier. REST suffit. |

## 4. Interface graphique

### Choix retenu
**ReactJS + Vite + TypeScript**

### Justification
| Critère | Commentaire |
|---|---|
| Adéquation aux acteurs (client, vendeur, responsable) | Interface web accessible depuis n'importe quel navigateur ; adaptée aux trois profils avec des vues et droits différenciés. |
| Facilité de développement | React permet de composer l'interface à partir de composants réutilisables (cartes produit, formulaires, tableaux). Vite offre un démarrage instantané et un rechargement à chaud. |
| Testabilité de la logique métier sous-jacente | La logique métier est dans les services Express, testables indépendamment de l'interface. Les composants React peuvent être testés avec Testing Library si nécessaire. |

### Alternatives envisagées
| Option | Pourquoi écartée |
|---|---|
| Vue.js | Bonne alternative, mais l'équipe a choisi React pour son écosystème plus large et sa popularité en industrie. |
| Application mobile (React Native) | Le sujet ne précise pas de besoin mobile ; une application web responsive suffit pour les trois acteurs. |
| Application bureau (Electron) | Inutile pour un usage interne de gestion ; le web est plus accessible et facile à déployer. |

## 5. Base de données / Persistance

### Choix retenu
**MongoDB** (avec Mongoose en ODM)

### Justification
| Critère | Commentaire |
|---|---|
| Besoin de persistance après fermeture | MongoDB est une base de données NoSQL orientée documents, adaptée à la persistance des données de stock, ventes et mouvements. |
| Requêtes nécessaires (rapports, historiques) | Le framework d'agrégation MongoDB permet de calculer les rapports hebdomadaires, les stocks à date et les historiques de mouvements efficacement. |
| Facilité d'installation et d'exécution | MongoDB peut être exécuté localement ou via MongoDB Atlas (cloud). Mongoose simplifie la modélisation des schémas et la validation. |
| Données de démonstration réinitialisables | Scripts de seed pour peupler la base avec des données de test ; possibilité de réinitialiser facilement. |

### Alternatives envisagées
| Option | Pourquoi écartée |
|---|---|
| PostgreSQL | Base relationnelle puissante, mais le domaine (catalogue avec attributs variables par catégorie) se prête bien à la flexibilité de MongoDB. L'équipe souhaite explorer NoSQL. |
| SQLite | Trop limité pour les requêtes d'agrégation complexes et la scalabilité. |
| Fichiers JSON | Pas de requêtes possibles, pas de gestion des accès concurrents, pas de persistance fiable. |

## 6. Gestion du temps et des dates

### Problématique
Les règles métier impliquent des calculs temporels (retours sous 24h, mises de côté avec échéance, rapport hebdomadaire, stock à une date passée).

### Choix retenu
**Horloge injectable (service Clock)** + **dates stockées en UTC**

### Justification
| Critère | Commentaire |
|---|---|
| Tests déterministes (dates contrôlables) | En injectant une horloge (Clock) dans les services, les tests peuvent simuler n'importe quelle date sans dépendre de l'heure système. |
| Gestion des fuseaux horaires si applicable | Les dates sont stockées en UTC dans MongoDB ; la conversion se fait au niveau de l'interface si nécessaire. |
| Calcul du stock à une date passée | Les mouvements de stock sont datés ; le stock à une date T est recalculé en agrégeant les mouvements antérieurs à T. |

## 7. Notifications (simulées)

### Choix retenu
**Boîte interne persistante (collection MongoDB)**

### Justification
| Critère | Commentaire |
|---|---|
| Déclenchement testable | Les notifications sont créées par les services métier (ex: ReapproService) et peuvent être vérifiées dans les tests. |
| Destinataire identifiable | Chaque notification est associée à un client (ID) et un produit. |
| Prévention des doublons | Unicité sur (client, produit, type de notification) pour éviter les notifications répétées. |
| Persistance après fermeture | Les notifications sont stockées dans MongoDB et restent disponibles après redémarrage. |

## 8. Paiements (simulés)

### Choix retenu
**Simulation simple (pas de paiement réel)**

### Justification
| Critère | Commentaire |
|---|---|
| Aucun paiement réel nécessaire | Le sujet ne demande pas de gestion de paiement ; la validation du panier enregistre la vente. |
| Simulation suffisante pour les tests | Le montant est calculé et enregistré dans la vente ; aucun appel à un service de paiement externe. |

## 9. Intégration continue (CI)

### Choix retenu
**GitHub Actions**

### Justification
| Critère | Commentaire |
|---|---|
| Exécution des tests à chaque demande de fusion | Workflow YAML qui lance les tests front-end et back-end sur chaque PR. |
| Vérification de la construction | Compilation TypeScript + build Vite pour s'assurer que le projet se construit sans erreur. |
| Accessibilité pour le groupe | Gratuit pour les dépôts publics ; intégré à GitHub qui est déjà utilisé pour le projet. |

### Alternatives envisagées
| Option | Pourquoi écartée |
|---|---|
| GitLab CI | Le dépôt est sur GitHub ; GitHub Actions est plus naturel. |
| Jenkins | Nécessite un serveur dédié ; trop lourd pour un projet étudiant. |

## 10. Gestion de versions et collaboration Git

### Stratégie de branches
```
main (branche principale, toujours exécutable, tests au vert)
  │
  ├── feature/catalogue
  ├── feature/mouvements-stock
  ├── feature/panier
  ├── feature/reapprovisionnement
  ├── feature/retours
  └── feature/rapports
```

### Règles
| Règle | Détail |
|---|---|
| Branches courtes | Une fonctionnalité = une branche |
| Revue obligatoire | Pull request relue par un autre membre avant fusion |
| Commits compréhensibles | Messages clairs et descriptifs |
| Branche principale exécutable | Tests réussissent à chaque fusion |
| Tags | Versions présentées au client + livraison finale |
