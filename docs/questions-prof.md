Questions pour le prof :

Rendu et organisation

1. Quel niveau de détail attendez-vous dans la spécification et les diagrammes : seulement les grandes fonctionnalités ou chaque cas particulier ?
2. Qu'est-ce qu'on doit rendre exactement (code, rapport, diagrammes, tests) et pour quelle date ?
3. Quels diagrammes UML sont obligatoires ?
4. Pour la démo, l'application peut tourner sur notre ordinateur ou elle doit être mise en ligne ?
5. Notre choix de technologies (React, Express, MongoDB) vous convient-il ?

Catalogue

6. Pour chaque catégorie (livre, magazine, papeterie), quelles informations faut-il enregistrer en plus du nom et du prix ? Par exemple l'auteur et l'éditeur pour un livre.
7. Les catégories sont-elles fixes ou le responsable doit-il pouvoir en créer de nouvelles ?
8. Quelle référence utiliser pour chaque catégorie : l'ISBN pour les livres, et quoi pour les magazines et la papeterie ?
9. Pour un magazine, chaque nouveau numéro est-il un produit différent ?
10. Quand le prix d'un article change, faut-il garder l'historique des anciens prix ou seulement le prix actuel ?
11. Les prix sont-ils en francs Pacifique, donc sans centimes ? Faut-il gérer la TVA ou des promotions ?
12. Un produit archivé peut-il être remis en vente plus tard ?

Stock

13. Quand un produit est abîmé en magasin, on le retire simplement du stock ou il faut le garder à part (invendable, à renvoyer au fournisseur) ?
14. Pour un mouvement de stock, le motif est-il choisi dans une liste fixe (vente, retour, casse, perte, correction) ou écrit librement ?
15. Qui a le droit de corriger le stock après un inventaire : seulement le responsable ou aussi le vendeur ?

Ventes

16. Le client peut-il commander lui-même en ligne, ou seules les ventes faites en magasin par le vendeur existent ?
17. Un client doit-il avoir un compte pour acheter, ou une vente en magasin peut-elle se faire sans connaître le client ?
18. Quand un article est ajouté au panier, est-il réservé tout de suite ou le stock est-il vérifié seulement au moment de valider ?

Retours

19. Quel est le délai pour faire un retour, et sous quelles conditions (article en bon état, ticket obligatoire) ?
20. Un retour donne-t-il lieu à un remboursement, un avoir ou un échange ?
21. Un client peut-il retourner seulement une partie des articles d'une vente ?
22. Pour un retour, comment retrouve-t-on la vente d'origine : numéro de ticket, nom du client, date ?
23. Un article retourné qui ne peut plus être vendu, on le sort du stock ou on le renvoie au fournisseur ?

Demandes et mises de côté

24. Un client peut-il demander un livre qui n'est pas du tout dans le catalogue, comme une commande spéciale ?
25. Quand un article demandé arrive, est-il mis de côté automatiquement pour le client ou c'est le responsable qui décide ?
26. Si plusieurs clients attendent le même article, qui est servi en premier ?
27. Combien de temps dure une mise de côté ? Ce délai est-il fixe ou modifiable par le responsable ?
28. Quand une mise de côté expire sans que le client vienne, la demande est-elle annulée ou remise en attente ?
29. Pour prévenir le client, une notification dans l'application suffit-elle ou faut-il envoyer un vrai mail ?

Réapprovisionnement

30. Le seuil d'alerte de chaque produit est-il fixé à la main ou doit-il être calculé à partir des ventes ?
31. Faut-il gérer plusieurs fournisseurs ? Un même produit peut-il venir de plusieurs fournisseurs ?
32. Quand une commande fournisseur n'arrive qu'en partie, on attend le reste sans limite ou on peut clôturer la commande ?
33. À la réception, que faire si le fournisseur livre plus que commandé, un article non commandé ou des articles abîmés ?

Rapports

34. La semaine des rapports va-t-elle du lundi au dimanche ? Faut-il aussi pouvoir choisir n'importe quelle période ?
35. En plus des ventes, retours et stocks restants, faut-il d'autres informations dans le rapport (chiffre d'affaires, articles les plus vendus) ?

Comptes et tests

36. Faut-il une vraie connexion avec identifiant et mot de passe, ou un simple choix du rôle (client, vendeur, responsable) suffit pour la démo ?
37. Le responsable de stock peut-il aussi enregistrer des ventes et des retours comme un vendeur ?
38. Quels tests attendez-vous : seulement sur les règles métier ou aussi sur l'interface ? Y a-t-il une couverture minimum ?
