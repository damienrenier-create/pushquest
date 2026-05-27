# AUDIT_JOUEUR_07_EQUITE.md

> Équité minimale entre les 8 joueurs (périmètre réduit selon le créateur).

---

## 1. Ressources partagées épuisables

### #112 — Fruits sur arbres : capacité par jour partagée ou par joueur ?
- **Ce que le joueur vit** : un pommier offre « 3 fruits par jour ». Si Mools prend 3 ce matin, est-ce que Gg trouve l'arbre vide à 18h ?
- **Localisation** : [src/app/api/gamebook/take-fruit/route.ts](src/app/api/gamebook/take-fruit/route.ts) + `fruitsTaken` stocké dans `GamebookProgress` (par joueur)
- **Diagnostic** : le compteur `fruitsTaken` est **par joueur** (dans `GamebookProgress.fruitsTaken`). Donc chaque joueur a ses 3 fruits/jour indépendamment.
- **Status** : ⚪ Équitable

### #113 — Coins casino Bourg-Boulette (bourgCasinoCoinsFound)
- **Ce que le joueur vit** : ORZO dit « il y a une pièce planquée au casino ». Si Franss la trouve, Mools peut-il la trouver à son tour ?
- **Localisation** : flag `bourgCasinoCoinsFound` est **par joueur**.
- **Status** : ⚪ Équitable

### #114 — `papaBoostClaimed` (tableau Tour)
- **Diagnostic** : flag par joueur. Chaque joueur reçoit son +100 reps quand il voit son tableau papa. ✅
- **Status** : ⚪ Équitable

### #115 — Position dans le monde (rare)
- **Ce que le joueur vit** : la "Carte des Joueurs" affiche la position de tous les autres. Si 8 joueurs sont dans la même map, est-ce visible/agréable ?
- **Localisation** : `canView.kind: "playerMap"`
- **Status** : ⚪ Pas un problème — cosmétique

### #116 — Combats Daemon : combats PNJ non-épuisables ?
- **Diagnostic** : combattre Coulter ne le « tue » pas pour les autres. Chaque joueur peut le combattre. ✅
- **Status** : ⚪ Équitable

### #117 — Tour de Garde Pastagone (rotation random) ?
- **Diagnostic** : la rotation est déterministe (Mulberry32 seed). Si la seed est `userId + day`, chaque joueur a sa propre rotation. Sinon, tous les joueurs voient le même NPC le même jour.
- **À vérifier** : seed exact.
- **Localisation** : [src/lib/gamebook/pastagoneTourNpcs.ts](src/lib/gamebook/pastagoneTourNpcs.ts)
- **Criticité** : 🟡 Confort
- **Confiance** : À confirmer

---

## 2. Bonus capitaine d'équipe

### #118 — MARCO (rouge) vs POLO (jaune)
- **Diagnostic** : chaque équipe a 2-3 membres. Bonus +30 reps/jour à chaque membre.
- **Équipe Rouge** : Mools, Milkardashian, Neuneu
- **Équipe Jaune** : Xa, Embi, Gg
- **Et les autres (franss, marvin) ?** : sans équipe = sans bonus capitaine ? Ou autre équipe ?
- **Localisation** : [src/app/api/gamebook/team/captain-bonus/route.ts](src/app/api/gamebook/team/captain-bonus/route.ts) + [src/lib/gamebook/teams.ts](src/lib/gamebook/teams.ts)
- **Criticité** : 🟠 Frustrant si Franss et Marvin n'ont pas accès à un bonus équivalent
- **Action** : vérifier la composition des équipes dans `teams.ts`. Si déséquilibrée, soit ajouter les manquants à une équipe, soit créer une 3e équipe.
- **Confiance** : Moyenne (à confirmer)

### #119 — Bonus mécanique du capitaine lui-même
- **Diagnostic** : MARCO et POLO sont des PNJ — ils ne sont pas des comptes joueurs. Donc pas de capitaine joueur.
- **Status** : ⚪ OK

---

## 3. Padding créateur (`isSystem` + `padAvailableEnergyForCreator`)

### #120 — `padAvailableEnergyForCreator` = floor 1000 reps
- **Ce que le créateur vit** : `isSystem=true` (probablement son compte) → toute énergie est minimum 1000.
- **Conséquence sur classements** :
  - L'app PushQuest exclut `isSystem` des leaderboards (vu dans certaines routes)
  - Mais les classements **Nexus** (volumes, pas, XP cumulé Nexus) : à vérifier
- **Localisation** : [src/lib/gamebook/creator.ts](src/lib/gamebook/creator.ts), [src/app/api/gamebook/players/route.ts](src/app/api/gamebook/players/route.ts), pantheon
- **Criticité** : 🟠 Frustrant pour les 7 amis
- **Fix proposé** : exclure `isSystem === true` de TOUS les classements Nexus (cf. Confrontation Q-G).
- **Action immédiate** : grep `players/route.ts` pour vérifier le filtre.
- **Confiance** : Élevée

### #121 — Compte test (`isTester`) — équité
- **Pour Partie C** : le compte test ne pad pas l'énergie (énergie normale). Il agit via panneau testeur. Donc équité préservée.
- **Status** : ⚪ Design Partie C

---

## 4. Synthèse équité

| # | Titre | Criticité |
|---|---|---|
| #112 | Fruits par joueur | ⚪ |
| #113 | Coins par joueur | ⚪ |
| #114 | papaBoost par joueur | ⚪ |
| #115 | Carte des joueurs | ⚪ |
| #116 | Combats non-épuisables | ⚪ |
| #117 | Tour de garde rotation seed | 🟡 |
| #118 | Bonus capitaine : franss/marvin sans équipe ? | 🟠 |
| #119 | Capitaine PNJ non joueur OK | ⚪ |
| #120 | `isSystem` pad : exclure des classements Nexus | 🟠 |
| #121 | Compte test isTester (Partie C) | ⚪ |

---

*Fin AUDIT_JOUEUR_07_EQUITE.md*
