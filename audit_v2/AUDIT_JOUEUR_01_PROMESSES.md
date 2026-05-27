# AUDIT_JOUEUR_01_PROMESSES.md

> Vérification systématique : tout ce qui est promis au joueur est-il respecté ?

---

## 1. Tableau récapitulatif — XP de badges

| Source | XP annoncé (dialogue) | XP donné (code) | Match ? |
|---|---|---|---|
| Monstre — pousse arbre | « 200 XP » | 200 (`XP_REWARD_PIONNIER`) | ✅ |
| Monstre — pousse arbre **par d'autres potes** | (non annoncé) | 100 (`XP_REWARD_POUSSEUR`, `water/push`) | ⚠️ silencieux |
| Pont — Star du Pont d'Hier | (non explicitement annoncé) | 200 (`XP_REWARD_CHAMPIO_STAR`) | ⚠️ silencieux |
| Sommet Mont — Conquérant | « +200 XP » (`MONT_SUMMIT_LINES`) | 200 (`XP_REWARD_CONQUERANT`) | ✅ (cap v4.0) |
| JOJO post-rescue PIAFFINI | « Set de Nage » (dialogue) + « 200 XP » metadata | 200 (`XP_REWARD_SAUVEUR_PIAFFINI`) | ⚠️ silencieux sur le 200 |
| Franss-joke autoheal | Aucun montant dit | 200 | 🔴 **silencieux total** |
| Pattern spin casseur de banque | Aucun montant dit | 200 (`BADGE_CASSEUR_BANQUE`) | ⚠️ silencieux |
| Tamagotchi libéré — Animal Totem | « +100 XP » | 100 | ✅ |
| Champion Muscuville revanche | Dialogue dit « +200 XP » | 200 (post-fix `706f20e`) | ✅ |
| Workouts spéciaux (`/api/workouts/special`) | Aucun (hors gamebook) | 1000 par défaut | ⚠️ silencieux |
| Bets dépôt/résolution | Aucun montant dit | Variable | ⚠️ silencieux |

---

## 2. Incohérences détectées

### #1 — Franss-joke autoheal silencieux (200 XP donné sans annonce)
- **Ce que le joueur vit** : Franss subit la blague PIAFFINI, reçoit +30 reps annoncés. **En arrière-plan**, un autoheal lui crédite 200 XP de badge Sauveur PIAFFINI s'il manquait — sans aucun message visible.
- **Ce que le jeu devrait offrir** : message clair « +200 XP de badge » dans la réponse de la route.
- **Localisation** : [src/app/api/gamebook/state/route.ts:96-106](src/app/api/gamebook/state/route.ts#L96-L106) (le bloc autoheal) + [src/app/api/gamebook/franss-joke/route.ts](src/app/api/gamebook/franss-joke/route.ts)
- **Criticité** : 🟠 Frustrant — XP donné mais le joueur ne le voit pas
- **Fix proposé** : retourner `xpAwarded: 200` dans la réponse JSON quand le badge est créé. Effort 30 min.
- **Confiance** : Élevée

### #2 — Pattern spin "Casseur de banque" silencieux (200 XP)
- **Ce que le joueur vit** : aux 5 victoires consécutives, le badge est créé mais aucun toast/message ne le signale.
- **Localisation** : [src/app/api/gamebook/casino/pattern-spin/route.ts](src/app/api/gamebook/casino/pattern-spin/route.ts)
- **Criticité** : 🟠 Frustrant
- **Fix proposé** : ajouter `xpAwarded: 200` dans la réponse + dialogue MapClient. Effort 30 min.
- **Confiance** : Élevée

### #3 — Pont "Star du Pont d'Hier" silencieux
- **Ce que le joueur vit** : si le joueur a fini #1 au pont la veille et bat un PNJ aujourd'hui, il reçoit 200 XP. Le dialogue ne le mentionne pas explicitement comme "Star du Pont d'Hier".
- **Localisation** : [src/app/api/gamebook/bridge/route.ts:289](src/app/api/gamebook/bridge/route.ts#L289)
- **Criticité** : 🟡 Confort
- **Fix proposé** : ajouter une ligne « ⭐ Tu étais le n°1 hier — badge bonus +200 XP » quand `championStarAwarded === true`. Effort 30 min.
- **Confiance** : Moyenne (à confirmer le dialogue exact côté client)

### #4 — Bets idempotence sur dépôt
- **Ce que le joueur vit** : si un double POST `bets/[id]/enter` survient (double-clic + réseau lent), le joueur peut être débité 2 fois en XP.
- **Localisation** : [src/app/api/bets/[id]/enter/route.ts](src/app/api/bets/[id]/enter/route.ts), [src/app/api/bets/[id]/accept/route.ts](src/app/api/bets/[id]/accept/route.ts)
- **Criticité** : 🟠 Frustrant (perte de ressource)
- **Fix proposé** : vérifier `existingEntry` AVANT `xpAdjustment.create`. Effort 1h.
- **Confiance** : Élevée
- **Note** : hors Nexus strictement, mais le créateur a parlé d'XP donc à inclure.

---

## 3. Tableau récapitulatif — Énergie (reps)

| Source | Annoncé | Code donne | Match ? |
|---|---|---|---|
| BUFFY (gym Bourg) | « +100 reps » | 100 (`grant-gym-energy`) | ✅ |
| DURUM (gym Pépiteville) | « +50 reps » | 50 (`grant-durum-energy`) | ✅ |
| Papa boost (Tour) | « +100 reps première fois » | 100 (`painting/papa-boost`) | ✅ |
| Ornithologue grass_sud | « +50 énergies » si oiseau | 50 (`ornithologue/route.ts`) | ✅ |
| Nageur défi 50 pompes | « +100 reps » | 100 (`nageur/route.ts`) | ✅ |
| Brigadier FAA (Pastagone) | « +100 reps réserve » | 100 (à vérifier `pastagone/faa-gift/route.ts`) | ⚠️ à confirmer |
| Capitaine équipe (MARCO/POLO) | « +30 reps/jour » | 30 (`team/captain-bonus`) | ✅ |
| Hôtel Carbonara | « régénère reps + bonheur » | `energySpentToday = 0` (reset complet) | ✅ |
| Arène MAESTRO (Vegas) | « +100 reps + 5 bonheur » | (à vérifier `arena/fight`) | ⚠️ à confirmer |
| Contest hall POMPATOR | « +100 reps surplus » | 100 (`contest/defi/route.ts`) | ✅ |
| Contest hall SQUATILUS | « +100 reps » | 100 | ✅ |
| Contest hall TIROIR | « +100 reps » | 100 | ✅ |
| Fruits pommier | « +80 reps × 3/jour » | 80 (`TREE_KIND_CONFIGS`) | ✅ |
| Fruits cerisier | « +40 reps × 5/jour » | 40 | ✅ |
| Fruits poirier | « +60 reps × 4/jour » | 60 | ✅ |
| Fruits pêcher | « +100 reps × 2/jour » | 100 | ✅ |
| Fruits cocotier | « +150 reps × 1/jour » | 150 | ✅ |
| Fruits olivier | « +20 reps × 7/jour » | 20 | ✅ |
| Fruit Maléfica | (avertissement ROMARIN partiel : « fruits violets... tu perds tes forces ») | -30 reps × 3/jour | ⚠️ **prévenu mais sans chiffre** |
| Park boost | « ×2 énergie 1×/jour » | ×2 effectif | ✅ |
| Park divisor | (pas annoncé — sprite trompeur) | ÷2 énergie | 🔴 **piège silencieux** |
| Lotto-poule gain | « mise ×16 » | mise×16 | ✅ |
| Stop-ou-encore | « mise ×N selon stops » | (à vérifier) | ⚠️ à confirmer |
| Pattern spin pierres | Multiplicateurs visuels | (à vérifier) | ⚠️ à confirmer |
| Croupier Vitellino | « +10% prochain pari » | +10% du payout (à confirmer `casinoBoost.ts`) | ⚠️ à confirmer |

### Incohérences

### #5 — Park divisor : piège sans avertissement
- **Ce que le joueur vit** : il cueille un fruit, croit gagner de l'énergie, son énergie est divisée par 2.
- **Localisation** : [src/lib/gamebook/maps.ts](src/lib/gamebook/maps.ts) (tile `park_divisor_1`) + [src/app/api/gamebook/take-fruit/route.ts](src/app/api/gamebook/take-fruit/route.ts)
- **Criticité** : 🟠 Frustrant (perte massive d'énergie possible)
- **Fix proposé** : 
  - Soit ajouter un sprite distinct (couleur, taille) qui le différencie du park boost
  - Soit ajouter un dialogue de prévisualisation : « Cet arbre a un aspect bizarre. Continuer ? [Oui/Non] »
  - Soit déplacer l'info dans le Livre des Arbres (`MIRABELLE`) pour qu'un joueur qui lit soit prévenu
- **Confiance** : Élevée (vu dans le code via subagent maps.ts)

### #6 — Maléfica : warning verbal sans chiffre
- **Ce que le joueur vit** : ROMARIN dit « fruits violets... tu perds tes forces ». Le joueur peut interpréter ça comme « ne pas en abuser » et tenter quand même. Il prend -30 reps.
- **Localisation** : [src/lib/gamebook/npcs.ts:836+](src/lib/gamebook/npcs.ts) (ROMARIN pool) + `take-fruit/route.ts`
- **Criticité** : 🟡 Confort
- **Fix proposé** : confirmation du joueur avant cueillette d'un poison_tree : « ⚠️ Cet arbre est suspect. Continuer ? » + ajouter le chiffre exact dans le Livre des Arbres.
- **Confiance** : Élevée

---

## 4. Tableau récapitulatif — Objets cadeaux

| Source | Objet promis | Item donné | Match ? |
|---|---|---|---|
| MAMAN/PEPITO | Sac + Baskets + Carte | `hasBag=true`, `boots` (durabilité 500), `map` | ✅ |
| JOJO post-PIAFFINI | Set de Nage | `swim_set` | ✅ |
| MONSTRE | Amulette d'os | `amulette_monstre` (canPreserve 50%) | ✅ |
| BASILICO | Arrosoir magique | (item `arrosoir`, à vérifier disponibilité) | ⚠️ à confirmer |
| Lee Scoresby | Pierres d'évolution | items `canEvolveType` | ✅ (mais stock conditionnel selon dialogue : « reviens quand stock reconstitué ») |
| Serafina | Sérums boost permanent | items `canPermanentStatBoost` | ✅ |
| Mary Malone | Potions soin Daemon | items `canUseInBattle: heal_hp` | ✅ |
| Iorek | Armures Daemon | items `canEquipDaemon` | ✅ |
| Brigadier FAA | +100 reps | `bonusSurplus += 100` | ✅ (à confirmer) |
| Récompense défi NUTRIPATES | (varia) | items achetables (pas cadeau) | N/A |

### #7 — Item "carte_tresor" en `availableAt: gift` mais jamais distribué
- **Ce que le joueur vit** : aucun. Mais le code prévoit une carte aux trésors gift, jamais offerte.
- **Localisation** : [src/lib/gamebook/items.ts:253-262](src/lib/gamebook/items.ts#L253-L262)
- **Criticité** : ⚪ Cosmétique (placeholder pour quête future ORZO)
- **Fix proposé** : aucun maintenant — c'est un placeholder pour la quête promise par ORZO (qui foreshadow « pièces tombées au casino Bourg »). À implémenter quand le créateur veut.
- **Confiance** : Élevée

---

## 5. Promesses narratives (« va là, tu trouveras X »)

| PNJ | Promesse | Réalité |
|---|---|---|
| Monstre Spaghetti Volant | « Au nord, dans les hautes herbes, y'a un arbre tombé. Il coûte 150 reps. » | ✅ `treeObstacle` à route1 |
| ROULETTE | « Dans un bâtiment, marcher devient GRATUIT » | ✅ INDOOR_MAP_IDS |
| RAVIOLI | « Y a plein d'arbres à pâtes-fruits partout » | ✅ 17 arbres répartis |
| RAVIOLI | « Un arbre est planqué près des fleurs à Hautes-Pâtes » | ✅ `apple_tree_3` caché en (1,7) hautespates |
| FUSILLI | « Un drôle d'oiseau au sommet de la TOUR DES PÂTES AIGUËS » | ✅ PIAFFINI floor 5 (mais foreshadow PIAFFINI avant rescue — à arbitrer en LORE) |
| MORUE | « Il paraît qu'il y a une île magnifique de l'autre côté de cette mer » | ✅ Macaron'île |
| MORUE post-PIAFFINI | « Va voir TRENETTE au passage » | ✅ TRENETTE existe shop_macaron |
| FARFALL | « Y'a une silhouette qui flotte au large... Un naufragé » | ✅ NAUFRAGÉ en la_mer |
| ORZO | « Au casino de Bourg-Boulette, y a un coin où des pièces sont tombées » | ✅ coin trouvable + `bourgCasinoCoinsFound` |
| BUCATINI | « Va à la bibliothèque, BIBLIO a tout un rayon sur les animaux » | ✅ bibliotheque + topics |
| BUCATINI | « Tu pourras passer chez V3T pour adopter le tien » | ✅ vétérinaire fonctionne |
| PELOTON | « Tu veux gravir le Mont ? Faut un vélo » | ✅ bike_shop |
| MUSCUMAN | « 4 nouveaux champions » | ✅ 4 champions arena_muscuville |
| GRAS-DOUBLE | « 4/4 = gratos pour passer rochers Vegas » | ✅ -25%/champion |
| SECRÉTAIRE MONT | « Les 4 champions viennent juste de redescendre » | ✅ arena déverrouille |
| ROGER | « Ma copine Lyra est partie chercher quelque chose au nord » | ✅ LYRA est dans lasagnas_vegas — **mais pas au "nord"** vs Roger | ⚠️ |
| LYRA | « Dans la cuisine de Pastagone, trois sacs de pâtes » | ✅ pastagone_cuisine + énigme cuisine |
| MIRABELLE (biblio_muscu) | « J'ai écrit un Livre des Arbres » | ✅ Livre des Arbres existe biblio_muscu |
| Père Pesto | « Murmure ce mot au videur » | ✅ portier ARRABBIATA accepte/refuse |
| VEILLEUR | « Forêt hantée à l'est » | ❌ map non implémentée — mais le panneau dit « Tu as trop peur. Reviens quand prêt. » donc c'est un placeholder explicite |

### #8 — Promesse spatiale ROGER : « Lyra au nord »
- **Ce que le joueur vit** : ROGER (lasagnas_vegas) dit que Lyra est partie chercher au nord. **LYRA est en réalité dans la même map** (lasagnas_vegas).
- **Localisation** : [src/lib/gamebook/npcs.ts:2024+](src/lib/gamebook/npcs.ts) (dialogue ROGER) vs LYRA placée dans `lasagnas_vegas`
- **Criticité** : 🟡 Confort narratif
- **Fix proposé** : soit déplacer LYRA dans une map plus au nord (Macaron'île ?), soit changer le dialogue ROGER en « partie chercher quelque chose » sans direction.
- **Confiance** : Élevée

---

## 6. Promesses conditionnelles (« si X alors Y »)

| PNJ | Condition | Récompense | Status |
|---|---|---|---|
| MARCO (capitaine rouge) | équipe Rouge | +30 reps/jour | ✅ `lastTeamCaptainBonusDate` |
| POLO (capitaine jaune) | équipe Jaune | +30 reps/jour | ✅ |
| BESTIOLE | compagnon | passage gratuit grass_sud | ⚠️ logique exacte à vérifier (1ère morsure gratuite, suivantes -10) |
| ORNITHOLOGUE | compagnon = oiseau | +50 reps | ✅ |
| MIRABELLE | « prouver que tu aimes lire » | Livre Arbres | ✅ (condition trop floue ? à vérifier mécanique exacte) |
| PORTIER ARRABBIATA | bon mot de passe (Père Pesto) | accès bar | ✅ |
| JAMIE | bat les 3 sbires TB | clé bureau IL CAPO | ✅ |
| CASINO C VIP | smoking + 100 pompes + bouncer | entrée | ✅ |
| Rochers Muscuville | N champions battus | -25% × N | ✅ (à vérifier formule) |
| Mont vélo | a un vélo | accès Mont | ✅ |
| Mont cadence | BPM 60-80 | ×0.5 | ✅ |

### #9 — BESTIOLE : règle de morsure pas claire
- **Ce que le joueur vit** : sans compagnon, la 1ère traversée de grass_sud serait gratuite, les suivantes coûtent -10 reps. Sans dialogue préventif, le joueur peut traverser à répétition et perdre de l'énergie sans comprendre.
- **Localisation** : [src/app/api/gamebook/bestiole/encounter/route.ts](src/app/api/gamebook/bestiole/encounter/route.ts) + dialogue BESTIOLE
- **Criticité** : 🟠 Frustrant (perte d'énergie cumulée)
- **Fix proposé** : à la 1ère morsure, dialogue : « *Une bestiole te mord. Ça pique mais ça passe.* La prochaine fois, sans compagnon, ça te coûtera 10 reps. » Effort 1h.
- **Confiance** : Moyenne (à confirmer la logique exacte)

---

## 7. Annonces de coût

| Action | Coût annoncé | Coût réel | Match ? |
|---|---|---|---|
| Mouvement standard | 10 reps/case (Monstre intro) | `COST_MOVE=10` | ✅ |
| Arbre obstacle | 150 reps (Monstre intro) | `150` | ✅ |
| Mont vélo basique | 8 reps/case (PELOTON) | 8 | ✅ |
| Mont vélo sport | 4 reps/case | 4 | ✅ |
| Mont vélo pro | 2 reps/case | 2 | ✅ |
| Casquette anti-route (RAVIOL'STYLE) | 200 reps | (à confirmer dans `items.ts`) | ⚠️ |
| Bidon IL CAPO | (cadeau, pas vendu) | priceReps: 0 | ✅ |
| Roulette mise | 10-50 reps | (à vérifier `casino/bet`) | ⚠️ |
| Lotto mise | 10 reps | 10 | ✅ |
| Cockfight mise | 20-200 reps | (à vérifier) | ⚠️ |
| Boutique Pépiteville (`nutripates`) | varies par item | varies | ✅ |
| Boutique Macaron (`trenette`) | varies | varies | ✅ |
| Vegas habits casquette | (à vérifier) | varies | ⚠️ |
| Pastagone armurerie | varies | (à confirmer) | ⚠️ |

### #10 — Aucune incohérence majeure détectée sur les coûts annoncés
Les principaux coûts (mouvement, arbre, vélo) sont cohérents. Les coûts shops sont des prix d'items, lus directement dans `items.ts` côté shop UI. Sécurisé.

---

## 8. Synthèse des incohérences

| # | Titre | Criticité |
|---|---|---|
| #1 | Franss-joke autoheal silencieux (200 XP) | 🟠 |
| #2 | Pattern spin "Casseur de banque" silencieux | 🟠 |
| #3 | Pont "Star du Pont d'Hier" silencieux | 🟡 |
| #4 | Bets idempotence dépôt (hors Nexus) | 🟠 |
| #5 | Park divisor : piège sans warning | 🟠 |
| #6 | Maléfica : warning verbal sans chiffre | 🟡 |
| #7 | Item carte_tresor placeholder | ⚪ |
| #8 | Promesse spatiale ROGER (Lyra "au nord") | 🟡 |
| #9 | BESTIOLE : règle morsure pas dialoguée | 🟠 |
| #10 | (Aucune incohérence majeure sur les coûts) | ⚪ |

**À confirmer (cas marqués ⚠️ dans les tableaux)** : FAA gift, MAESTRO arena, pierres Lee Scoresby stock, mécanique BESTIOLE exacte, prix casquette anti-route, prix Pastagone armurerie. À investiguer si le créateur veut un audit XL.

---

*Fin AUDIT_JOUEUR_01_PROMESSES.md*
