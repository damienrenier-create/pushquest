# AUDIT_JOUEUR_05_INCOMPREHENSIONS.md

> Cas où le joueur ne comprend pas, dépense de l'énergie en tâtonnant, ou n'a pas le feedback nécessaire.

---

## 1. Obstacles silencieux

### #66 — Arbre obstacle (Route 1, 150 reps)
- **Ce que le joueur vit** : il arrive devant l'arbre, tente de passer, refus. Quel message ?
- **Hypothèse** : le code refuse simplement le mouvement, sans dialogue de coût.
- **Ce que le jeu devrait offrir** : message « 🌳 Trop lourd. Il te faut 150 reps pour le pousser. »
- **Localisation** : [src/lib/gamebook/maps.ts](src/lib/gamebook/maps.ts) (treeObstacle tile) + spend handler
- **Criticité** : 🟠 Frustrant (le créateur a explicitement cité ce cas)
- **Fix proposé** : ajouter une réponse `{ ok: false, reason: "🌳 Trop lourd. Il te faut 150 reps. (Tu en as X.)" }` au handler de l'interaction. Effort 30 min.
- **Confiance** : Élevée

### #67 — Rochers Muscuville (4000 reps initial)
- **Ce que le joueur vit** : il tente de passer, refus. Pas de message clair sur le coût restant après N champions battus.
- **Ce que le jeu devrait offrir** : « 🪨 Les rochers sont trop lourds. Coût restant : X reps. (Bats Y champions pour réduire le coût.) »
- **Localisation** : [src/app/api/gamebook/muscuville/rocks-pay/route.ts](src/app/api/gamebook/muscuville/rocks-pay/route.ts) + interaction rochers
- **Criticité** : 🟠 Frustrant
- **Fix proposé** : retourner message structuré avec coût + nombre de champions restants. Effort 30 min.
- **Confiance** : Moyenne (à vérifier l'état du code actuel)

### #68 — Eau bloquante sans Set de Nage / Brassards
- **Ce que le joueur vit** : il marche vers l'eau, refus. Le jeu dit-il « il te faut le Set de Nage » ?
- **À vérifier** : message côté `state/route.ts` ou MapClient quand `waterShallow` est ciblée sans `swim_set` équipé.
- **Criticité** : 🟠 Frustrant
- **Fix proposé** : message « 🌊 L'eau est trop froide. Il te faut le Set de Nage (récupère-le auprès de JOJO). » Effort 30 min.
- **Confiance** : À confirmer

### #69 — Tile bloquante générique (mur, sand)
- **Ce que le joueur vit** : il tape contre un mur, rien ne se passe. OK pour un sprite mur, mais pour le `sand` (sable beach), le joueur peut être surpris que ce soit bloquant.
- **Criticité** : 🟡 Confort
- **Fix proposé** : ajouter un toast léger « ❌ Le sable est trop chaud, tu ne peux pas marcher dessus » uniquement quand tile = sand. Effort 30 min.
- **Confiance** : Élevée

---

## 2. Conditions implicites jamais annoncées

### #70 — Compagnon requis pour grass_sud
- **Ce que le joueur vit** : sans Daemon, il entre dans les hautes herbes du sud et se fait mordre. La BESTIOLE PNJ le prévient peut-être, mais s'il l'évite ?
- **À vérifier** : si le joueur a `tamagotchiInBag === false` (ou pas de Daemon) et entre dans grass_sud, y a-t-il un dialogue forcé ?
- **Localisation** : `grass_sud` cutscene `grassSudCutsceneShown`
- **Criticité** : 🟠 Frustrant
- **Fix proposé** : cutscene auto à la 1ère entrée. ✅ Probablement déjà en place via `grassSudCutsceneShown`. À confirmer.
- **Confiance** : Moyenne

### #71 — Vélo requis pour Mont
- **Ce que le joueur vit** : sans vélo, le coût Mont est probablement bloqué.
- **Le dialogue PELOTON le dit** : « Tu veux gravir le Mont ? Faut un vélo. Pas le choix. » ✅
- **À vérifier** : à l'entrée du Mont sans vélo, message clair refusant.
- **Localisation** : tile transition vers Mont + spend handler
- **Status** : ⚪ Probablement OK

### #72 — Smoking + 100 pompes + bouncer pour Casino C VIP
- **Ce que le joueur vit** : il tente d'entrer dans Casino C sans le smoking. Refus. Y a-t-il un message explicite des 3 conditions ?
- **À vérifier** : dialogue bouncer.
- **Criticité** : 🟡 Confort
- **Confiance** : À confirmer

### #73 — Vegas casquette anti-route
- **Ce que le joueur vit** : il traverse la route Vegas, se fait écraser, perte d'énergie ? Y a-t-il un warning ?
- **Localisation** : Vegas road tile + `canBypassRoad`
- **À vérifier** : message à la 1ère traversée sans casquette.
- **Criticité** : 🟠 Frustrant
- **Confiance** : À confirmer

### #74 — Mont cadence BPM (zone idéale 60-80)
- **Ce que le joueur vit** : il ne sait pas que la cadence module le coût. Sans information, il peut marcher à 100 BPM et payer ×3.0.
- **Localisation** : Mont logic + UI HUD
- **Criticité** : 🔴 Bloquant (×3.0 vs ×0.5 = écart énorme)
- **Fix proposé** : afficher un indicateur visuel de la cadence et de la zone idéale dans le HUD Mont. Ou au minimum, ajouter un dialogue PELOTON / BICEPS qui prévient « Garde un rythme entre 60 et 80 pour économiser ton énergie. » Effort 1h (UI) ou 15 min (dialogue).
- **Confiance** : Élevée

---

## 3. Boutons non documentés

### #75 — Touches A, ENTER, ESC, START, flèches
- **Ce que le joueur vit** : à la 1ère connexion, le joueur ne sait pas quelles touches utiliser.
- **Indices actuels** :
  - Monstre intro dit « Appuie sur START pour ouvrir ton sac » (ligne au milieu d'un texte)
  - Pas d'overlay de contrôles
- **Ce que le jeu devrait offrir** : tutoriel ou aide-mémoire visible.
- **Localisation** : [src/app/gamebook/MapClient.tsx](src/app/gamebook/MapClient.tsx)
- **Criticité** : 🟠 Frustrant (priorité créateur)
- **Fix proposé** : overlay au 1er mount (gated par `hasSeenWelcomeScreen === false`), affichant les contrôles avec icônes :
  - ⬆⬇⬅➡ : déplacer
  - A / ENTER : interagir
  - START / S : ouvrir le sac
  - ESC : fermer un dialogue
- Effort 2-3h pour le composant React + une image, ou 1h pour un texte simple.
- **Confiance** : Élevée

### #76 — Touche T tester (pas pour joueur normal)
- Hors périmètre joueur. C'est pour le compte test (Partie C).

---

## 4. Positions précises pour interagir (sans que le jeu le dise)

### #77 — PNJ qu'il faut aborder par un côté précis
- **Ce que le joueur vit** : certains PNJ ne répondent que si le joueur est en face dans une direction précise. Sans indicateur, le joueur dépense de l'énergie à tourner autour.
- **Hypothèse** : la logique d'interaction utilise probablement `npc.facing` ou `entity.adjacent` — à vérifier comment ça fonctionne.
- **Localisation** : [src/app/gamebook/MapClient.tsx](src/app/gamebook/MapClient.tsx) handler interaction
- **Criticité** : 🟠 Frustrant
- **Fix proposé** : afficher un indicateur visuel (flèche/halo) sur la case d'interaction quand le joueur est sur une case adjacente à un PNJ. Effort 1-2h.
- **Confiance** : Moyenne

### #78 — Pierres d'évolution : à utiliser dans un menu, pas devant le Daemon
- **Ce que le joueur vit** : il achète une Pierre Feu. Comment l'utilise-t-il sur son Daemon ? Touche A devant le Daemon n'a pas de sens.
- **À vérifier** : route `inventory/use/route.ts` accepte un targetDaemonId ? UI permet de choisir ?
- **Criticité** : 🟡 Confort
- **Fix proposé** : tooltip dans le sac « Cliquer sur l'item ouvre la sélection Daemon ». Effort 30 min.
- **Confiance** : Moyenne

---

## 5. Mécaniques cachées

### #79 — Bonheur tamagotchi décay -1 toutes 50 cases
- **Ce que le joueur vit** : son Daemon devient moins heureux progressivement. S'il ne sait pas, il croit à un bug.
- **À vérifier** : tooltip ou explication dans le sac/vétérinaire.
- **Criticité** : 🟡 Confort
- **Fix proposé** : DOC PROTÉINE ou MIRABELLE doivent expliquer le décay. Effort 30 min de dialogue.
- **Confiance** : Élevée

### #80 — Boost croupier durée
- **Ce que le joueur vit** : il talk à VITELLINO (+10%). S'applique à 1 pari ou toute la journée ?
- **À vérifier** : `casinoBoostPctToday` + logic.
- **Criticité** : 🟡 Confort
- **Fix proposé** : dialogue clair : « Ce boost s'applique sur ton **prochain pari** » ou « tous les paris de la journée ». À aligner code + dialogue.
- **Confiance** : Moyenne

### #81 — Cooldowns implicites (luck, hôtel, etc.)
- **Ce que le joueur vit** : il talk à LINGUINI (+1 luck/jour). Le lendemain à 0h01, peut-il reparler ? Que voit-il s'il essaie 2× le même jour ?
- **À vérifier** : message clair « tu as déjà reçu ton +1 luck aujourd'hui. Reviens demain ! »
- **Criticité** : 🟡 Confort
- **Fix proposé** : standardiser les messages « déjà fait aujourd'hui » sur tous les cooldowns 1×/jour. Effort 1h.
- **Confiance** : Moyenne

### #82 — Mont descente gratuite (-10 cases/pas down)
- **Ce que le joueur vit** : la descente du Mont coûte beaucoup moins (1 pas = 10 cases). Sans info, il croit à un bug.
- **Localisation** : Mont route logic
- **Fix proposé** : message au sommet « 🏔️ Descente : 1 pas = 10 cases gratuites. Bonne route ! » Effort 15 min.
- **Confiance** : Élevée

### #83 — `bonusSurplus` consommé avant `energySpentToday`
- **Ce que le joueur vit** : sa réserve `bonusSurplus` est consommée d'abord. S'il prend un fruit, son bonusSurplus monte. S'il bouge, son bonusSurplus baisse. Sans visualisation séparée du HUD, il croit que c'est un seul pot.
- **Criticité** : 🟡 Confort (déjà transparent côté formule, juste pas visible)
- **Fix proposé** : afficher dans le HUD `Énergie = X (bonus: Y)` distinct. Effort 1h UI.
- **Confiance** : Élevée

---

## 6. Tiles trompeuses

### #84 — Park divisor vs park boost (déjà signalé #5)
- Cf. AUDIT_JOUEUR_01_PROMESSES #5
- **Fix proposé** : sprite distinct + warning

### #85 — grassTall décoratif vs bloquant
- **Ce que le joueur vit** : grass_sud a un `grassTall` partiellement bloquant (60% déterministe). D'autres maps ont du grassTall passant. Pas de règle visuelle.
- **Localisation** : `mapEngine.ts` `isBlockingTile`
- **Criticité** : 🟠 Frustrant (le joueur ne sait pas si une touffe précise va le bloquer)
- **Fix proposé** : 
  - Soit teinte légèrement différente entre passable et bloquant (sprite split)
  - Soit toast au 1er heurt « Ces hautes herbes sont trop denses. Essaie un autre chemin. »
- Effort 1h (toast) ou 2-3h (sprite).
- **Confiance** : Élevée

### #86 — `sand` (plage) bloquant
- Cf. #69

### #87 — `waterShallow` partout passable ?
- **Ce que le joueur vit** : il croit que toute eau est nageable avec swim_set. **Mais** : Macaron'île a `waterShallow` (canal nageable) et `water` (profond bloquant). Distinction visuelle ?
- **Criticité** : 🟡 Confort
- **Fix proposé** : ajout d'une légende dans le menu / livre des arbres. Effort 30 min.
- **Confiance** : Moyenne

---

## 7. Dialogues ambigus

### #88 — Lyra « inspecte les deux bons sacs dans le bon ordre »
- Cf. AUDIT_JOUEUR_02_LORE #11

### #89 — Serafina « les fleurs doivent fleurir »
- **Ce que le joueur vit** : il visite Serafina étage 4, elle dit son truc mystique. Sans savoir si c'est juste du foreshadow ou une condition active, le joueur peut chercher des « fleurs à faire fleurir » qui n'existent pas.
- **Localisation** : [src/lib/gamebook/npcs.ts:2360+](src/lib/gamebook/npcs.ts) (Serafina étage 4)
- **Criticité** : 🟡 Confort
- **Fix proposé** : ajouter « Reviens dans une prochaine version. » ou similaire qui dit clairement que ce contenu n'est pas encore disponible. Effort 15 min.
- **Confiance** : Élevée

### #90 — VEILLEUR « forêt hantée à l'est »
- **Status** : ⚪ Le panneau dit « Reviens quand prêt » → c'est un placeholder explicite. OK.

---

## 8. Modales sans sortie claire

### #91 — Cinématiques (intro, Mont sommet, Franss-joke)
- **Ce que le joueur vit** : démarrage cinematic, comment passer ? touche A ? ESC ?
- **À vérifier** : indicateur « Appuyer sur ESPACE/A pour continuer » à chaque ligne.
- **Criticité** : 🟡 Confort
- **Fix proposé** : ajouter un caret clignotant ou « ▶ » à la fin de chaque ligne de dialogue. Effort 30 min.
- **Confiance** : Moyenne

### #92 — Modale Combat Daemon
- **Ce que le joueur vit** : il est en plein combat. Comment fuir si le combat ne se passe pas bien ?
- **À vérifier** : présence d'une option « Fuir » dans BattleModal.
- **Si absent** : c'est bloqué jusqu'à victoire/défaite/abandon (cf. #52).
- **Criticité** : 🟠 Frustrant
- **Fix proposé** : option « Fuir » avec coût modeste (-10 reps ou autre). Effort 1h.
- **Confiance** : À confirmer

### #93 — Modale Shop
- **Ce que le joueur vit** : il est dans le shop. Comment quitter ? ESC ? clic en dehors ?
- **À vérifier**.
- **Criticité** : 🟡

---

## 9. Feedback manquant après une action

### #94 — Pas de toast XP après badge
- Cf. AUDIT_JOUEUR_01_PROMESSES #1, #2, #3.
- **Pattern à généraliser** : tout `xpAdjustment.create` doit déclencher un toast côté client.
- **Fix proposé** : helper `useXpToast` qui écoute les réponses contenant `xpAwarded`. Effort 1-2h.
- **Confiance** : Élevée

### #95 — Pas de feedback échec énergie
- **Ce que le joueur vit** : il essaie de bouger sans énergie. Le serveur refuse silencieusement. Le client ne réagit pas.
- **Localisation** : `spend/route.ts` retourne `{ ok: false, reason }` mais le client doit afficher.
- **Criticité** : 🟠 Frustrant
- **Fix proposé** : toast standard « ❌ Pas assez d'énergie (X requis, tu en as Y) ». Effort 1h.
- **Confiance** : Élevée

---

## 10. Cas où l'énergie est dépensée même en cas d'échec

### #96 — Dialogues PNJ pas de coût
- **Vérification** : parler à un PNJ coûte-t-il de l'énergie ?
- **Probable** : non, juste se déplacer pour l'approcher.
- **Status** : ⚪ OK

### #97 — Tenter d'interagir avec une porte fermée
- **Ce que le joueur vit** : il tape A devant une porte « fermée ». L'énergie n'est pas débitée (puisqu'il n'a pas bougé). OK.
- **Status** : ⚪ OK

### #98 — Casino : mise refusée mais déjà débitée ?
- **Ce que le joueur vit** : il mise 50 reps au lotto. Si le serveur refuse (date différente / déjà joué), l'énergie est-elle restituée ?
- **À vérifier** : les routes casino utilisent toutes `spendEnergyOnSnapshot` avant le résultat. Si la mise est refusée APRÈS le débit, perte sèche.
- **Localisation** : [src/app/api/gamebook/casino/bet/route.ts](src/app/api/gamebook/casino/bet/route.ts) et autres
- **Criticité** : 🟠 Frustrant
- **Fix proposé** : vérifier que les conditions de refus sont AVANT le débit énergie. Audit code à faire.
- **Confiance** : Moyenne — à confirmer

---

## 11. Synthèse incompréhensions

| # | Titre | Criticité |
|---|---|---|
| #66 | Arbre 150 reps : message coût absent | 🟠 |
| #67 | Rochers Muscuville : message coût restant | 🟠 |
| #68 | Eau bloquante sans Set de Nage : message | 🟠 |
| #69 | Sand bloquant : toast léger | 🟡 |
| #70 | Compagnon requis grass_sud (cutscene OK ?) | 🟠 |
| #71 | Vélo requis Mont : dialogue PELOTON OK | ⚪ |
| #72 | Casino C VIP conditions : à vérifier | 🟡 |
| #73 | Vegas casquette anti-route : warning ? | 🟠 |
| #74 | Mont cadence BPM : indication | 🔴 |
| #75 | Tutoriel contrôles | 🟠 |
| #76 | Touches tester (Partie C) | ⚪ |
| #77 | Positions précises interaction PNJ | 🟠 |
| #78 | Utilisation pierres / sérums | 🟡 |
| #79 | Décay bonheur sans explication | 🟡 |
| #80 | Boost croupier durée ambiguë | 🟡 |
| #81 | Cooldowns implicites | 🟡 |
| #82 | Mont descente gratuite | 🟡 |
| #83 | `bonusSurplus` invisible dans HUD | 🟡 |
| #84 | Park divisor (cf. #5) | 🟠 |
| #85 | grassTall passable vs bloquant | 🟠 |
| #86 | Sand (cf. #69) | 🟡 |
| #87 | waterShallow vs water | 🟡 |
| #88 | Lyra ambigu (cf. #11) | 🔴 |
| #89 | Serafina « fleurs » placeholder à clarifier | 🟡 |
| #90 | VEILLEUR placeholder OK | ⚪ |
| #91 | Cinématiques indicateur next | 🟡 |
| #92 | Combat : option Fuir ? | 🟠 |
| #93 | Modale Shop sortie | 🟡 |
| #94 | Toast XP après badge | 🟠 |
| #95 | Toast échec énergie | 🟠 |
| #96 | Dialogues sans coût (OK) | ⚪ |
| #97 | Porte fermée sans débit (OK) | ⚪ |
| #98 | Casino mise refusée après débit | 🟠 |

---

*Fin AUDIT_JOUEUR_05_INCOMPREHENSIONS.md*
