# AUDIT_JOUEUR_04_BLOCAGES.md

> Blocages physiques et logiques : joueurs coincés, portes incohérentes, combats orphelins, téléports cassés.

---

## 1. Audit-doors.mjs — résultats

Script lancé avec succès. Résultats :

### 1.1 🔴 Erreurs critiques (2)

| Map | Problème |
|---|---|
| `mont_sommet` | `exitTarget` défini mais **AUCUN doorMat** dans la map |
| `hautespates` | `exitTarget` défini mais **AUCUN doorMat** dans la map |

### #45 — `mont_sommet` sans doorMat
- **Ce que le joueur vit** : depuis le sommet du Mont, il monte vers `mont_sommet`. Aucune tile `doorMat` n'existe dans cette map pour redescendre via l'event "exit". Le joueur sort probablement via une autre logique (grassTall sud → mont_pasta_ventoux), mais le `exitTarget` codé pour cette map ne pointe nulle part fonctionnel.
- **Localisation** : [src/lib/gamebook/maps.ts](src/lib/gamebook/maps.ts) (déclaration `mont_sommet`)
- **Criticité** : 🟠 Frustrant (cohérence sémantique)
- **Fix proposé** : soit ajouter un `doorMat` (par exemple à la position centre-bas), soit retirer le `exitTarget` (le code de sortie passera alors uniquement par le transit grassTall). Effort 15 min.
- **Confiance** : Élevée

### #46 — `hautespates` sans doorMat
- **Ce que le joueur vit** : Hautes-Pâtes a un `exitTarget` mais aucun `doorMat`. Le joueur entre via grassTall sud depuis Pépiteville, traverse, sort par grassTall nord vers la tour. Probable même cas que mont_sommet : `exitTarget` orphelin.
- **Localisation** : [src/lib/gamebook/maps.ts](src/lib/gamebook/maps.ts)
- **Criticité** : 🟠 Frustrant (cohérence)
- **Fix proposé** : idem #45.
- **Confiance** : Élevée

### 1.2 🟡 Warnings (7)

| Map | Problème |
|---|---|
| `gym`, `casino`, `gym_pepite`, `casino_pepite`, `gym_muscuville`, `casino_muscuville` | 2 doorMats trouvés (multi-portes) |
| `shop_interior` | entry (4,5) PAS adjacente au doorMat (4,7) — distance 2 |

### #47 — `shop_interior` entry/doorMat à distance 2
- **Ce que le joueur vit** : c'est le bug NUTRIPATES (commit `b9a28cb`). Le spawn d'entrée a été déplacé en (4,5) pour éviter le sprite bloquant, mais le doorMat est resté en (4,7). Le joueur peut entrer **mais** la logique de sortie peut s'attendre à voir le joueur sur doorMat pour quitter.
- **Localisation** : [src/lib/gamebook/maps.ts](src/lib/gamebook/maps.ts) shop_interior
- **Criticité** : 🟡 Confort (la sortie fonctionne probablement quand même, mais l'audit signale une incohérence)
- **Fix proposé** : aligner entry et doorMat. Soit déplacer le doorMat en (4,5)/(4,6), soit déplacer l'entry en (4,6).
- **Confiance** : Élevée

### #48 — Multi-doorMats sur gyms/casinos
- **Ce que le joueur vit** : `gym`, `casino`, `gym_pepite`, etc. ont 2 doorMats. Le warning dit « Premier : (4,7) » — donc l'audit prend le premier. Si la logique de sortie touche n'importe quel doorMat, c'est OK. Si elle s'attend à exactement 1, le 2e est un piège invisible.
- **Localisation** : [src/lib/gamebook/maps.ts](src/lib/gamebook/maps.ts)
- **Criticité** : 🟡 Confort
- **Fix proposé** : vérifier la logique de détection de sortie dans MapClient. Si robuste, supprimer les 2e doorMats (ou les transformer en autre tile). Si fragile, ajouter une logique « si N doorMats, sortir via le 1er touché ». Effort 30 min.
- **Confiance** : Moyenne

---

## 2. Joueurs en position bloquante (script à lancer)

### #49 — Audit des positions invalides héritées
- **Ce que le joueur vit** : un joueur dont la position en DB pointe sur une tile bloquante (à cause d'un patch de map post-spawn) ne peut plus se déplacer normalement.
- **Symptôme historique** : cas Jérém (cf. commits `755a071` route `/api/admin/rescue-player`, et `b9a28cb` fix shop_interior).
- **Action proposée** : un script `scripts/audit-stuck-players.mjs` est créé dans ce repo (voir fichier). Il :
  - Lit tous les `GamebookProgress`
  - Vérifie la tile à `(posX, posY)` sur `mapId`
  - Liste ceux dont la tile est bloquante ou hors map
- **Criticité** : 🔴 Bloquant
- **Commande** : `node scripts/audit-stuck-players.mjs` (en local avec DATABASE_URL configuré)
- **Action de rescue** : la route existante `POST /api/admin/rescue-player` peut être réutilisée pour téléporter chaque joueur coincé vers le spawn de sa map.
- **Confiance** : Élevée (script prêt à l'emploi)

---

## 3. PNJ qui spawn sur tiles d'entrée/sortie

### #50 — NUTRIPATES sur doorMat shop_interior (déjà fixé)
- **Diagnostic** : commit `b9a28cb` a déplacé NUTRIPATES de (4,2) à autre position. ✅
- **Status** : ⚪ Résolu

### #51 — À auditer : autres PNJ sur tiles d'entrée
- **Action** : ajouter à `scripts/audit-doors.mjs` une 3e section qui vérifie pour chaque map (interior) qu'aucun PNJ n'est sur (entry) ou (doorMat).
- **Criticité** : 🟠 Préventif
- **Effort** : 1h pour étendre le script + 30min pour fixes
- **Confiance** : Élevée

---

## 4. Combats orphelins

### #52 — `activeBattle` JSON non-réinitialisé après crash
- **Ce que le joueur vit** : il a démarré un combat (Daemon `activeBattle != null`). Le navigateur crash, ou il quitte. Au retour, le serveur retourne toujours `activeBattle` non-null. Le client peut être paumé sur l'état (HP affiché ≠ HP de l'objet).
- **Localisation** : [src/app/api/gamebook/daemon/battle/action/route.ts](src/app/api/gamebook/daemon/battle/action/route.ts), `Daemon.activeBattle` JSON
- **Criticité** : 🔴 Bloquant (un combat fantôme peut empêcher de démarrer un nouveau combat)
- **Fix proposé** (deux solutions cumulables) :
  1. **Bouton « Abandonner combat »** côté UI : appelle `POST /api/gamebook/daemon/battle/forfeit` qui set `activeBattle = null` et ne donne aucun XP. Effort 1-2h.
  2. **Timeout 30 min** : si `activeBattle.startedAt > 30 min`, le serveur ignore le combat au prochain GET `/state` et le set à `null`. Effort 1h.
- **Note** : le compte test (Partie C) inclut déjà un bouton « reset combat » dans sa spec.
- **Confiance** : Élevée

### #53 — Daemon.currentHp vs activeBattle.actorHp désynchro
- Vu dans Partie A #M1. À fixer en même temps que #52.
- **Criticité** : 🟠
- **Fix proposé** : à la fin d'un combat, persister `currentHp = activeBattle.actorHp`. À l'init, lire `currentHp` comme source unique.
- **Confiance** : Élevée

---

## 5. Quêtes déclenchées dans un état impossible à terminer

### #54 — `jardinierMissionActive` sans `jardinierFruitOrder`
- **Ce que le joueur vit** : BASILICO démarre la mission (ordre de cueillette des arbres). Si le code ne valide pas qu'il y a bien un `jardinierFruitOrder` populé, le joueur peut être dans un état « mission active mais aucun objectif visible ».
- **Localisation** : [src/lib/gamebook/maps.ts](src/lib/gamebook/maps.ts) (jardinier) + flag `jardinierMissionActive`
- **À vérifier** : la mission init populate-t-elle bien `jardinierFruitOrder` côté serveur ?
- **Criticité** : 🟡 Confort
- **Action** : test à faire en jeu (compte test).
- **Confiance** : À confirmer

### #55 — Pastagone cellule : escape avant `pastagoneArrested = true`
- **Ce que le joueur vit** : si la téléportation vers la cellule échoue (réseau lent) et que le joueur essaie de quitter la cellule, est-il dans un état cohérent ?
- **Localisation** : [src/app/api/gamebook/pastagone/](src/app/api/gamebook/pastagone/)
- **Criticité** : 🟡 Confort
- **À vérifier** : audit dédié si problème reporté.

---

## 6. Flags one-way sans retour

### #56 — `gamebookFrozenUntil` : pas de réversion joueur
- **Ce que le joueur vit** : si le joueur supprime ses reps (anti-cheat), il est frozen jusqu'à `gamebookFrozenUntil` (constante). Aucune route ne permet de le débloquer manuellement (sauf intervention DB par le créateur).
- **Localisation** : [src/lib/gamebook/antiCheat.ts](src/lib/gamebook/antiCheat.ts)
- **Criticité** : 🟡 Confort (intentionnel = dissuasion)
- **Fix proposé** : reset via compte test panel. Ou bouton créateur via `/api/admin/...`. Pas urgent.
- **Confiance** : Élevée

### #57 — `pastagoneArrested = true` sans `pastagoneEscaped` possible ?
- **Ce que le joueur vit** : si le joueur est arrest mais n'arrive pas à escape, il reste dans la cellule à vie.
- **Localisation** : `pastagone_cellule` + flags `pastagoneArrested`, `pastagoneEscaped`
- **Criticité** : 🟠 Frustrant
- **Action** : tester via compte test, et ajouter un fallback `force-escape` côté admin/tester si besoin. Effort 1h si besoin.
- **Confiance** : À confirmer

### #58 — Item donné via `hasBag = true` : si jamais false par erreur ?
- **Ce que le joueur vit** : si `hasBag` est mis à false par bug (rollback ?), l'inventaire devient inaccessible.
- **Localisation** : MAMAN/PEPITO routes
- **Criticité** : 🟡 (peu probable)
- **Action** : compte test peut le re-set rapidement.
- **Confiance** : Élevée

---

## 7. Téléportations menant à une tile bloquante

### #59 — Fast travel (`v3.22`) atterrit-il toujours sur tile passable ?
- **Ce que le joueur vit** : usage de fast travel vers une ville. Si la position de spawn de la ville devient bloquante (patch map), le joueur arrive coincé.
- **Localisation** : [src/app/api/gamebook/travel/route.ts](src/app/api/gamebook/travel/route.ts)
- **Hardening déjà fait** : commit `78c9d18` refuse les positions sur tiles bloquantes au POST `/state`. Mais le travel route fait-il le même check ?
- **Action** : grep `travel/route.ts` pour confirmer.
- **Criticité** : 🟠
- **Confiance** : À confirmer

### #60 — Sortie Cellule Pastagone après commit `b9a28cb` ?
- **Diagnostic** : `pastagone_cellule` exit avait été un doorMat infinite loop, fixé en (4,6) doorMat facing down. ✅
- **Status** : ⚪ Résolu

### #61 — Téléport intro Monstre (vers `cave`)
- **Ce que le joueur vit** : Monstre dit « Suis-moi » puis téléport vers cave. La position de spawn dans cave est-elle bien passable ?
- **Vérification rapide** : `cave` a entry (4,6) face up, doorMat (4,7), tile="caveFloor" ✓ (audit-doors)
- **Status** : ⚪ OK

---

## 8. Inventaire saturé

### #62 — Cadeau quand inventaire plein ?
- **Ce que le joueur vit** : si le joueur a déjà le `swim_set` (par exemple) et JOJO essaie de le redonner, que se passe-t-il ?
- **Logique attendue** : `maxQuantity: 1` pour les uniques → doublure refusée.
- **Localisation** : [src/lib/gamebook/inventory.ts](src/lib/gamebook/inventory.ts)
- **Criticité** : 🟡 Confort
- **Action** : vérifier que la route gift retourne `{ ok: true, alreadyOwned: true }` quand l'item est déjà là (et ne crash pas).
- **Confiance** : À confirmer

---

## 9. Recovery paths absents

### #63 — Si baskets cassées et joueur en mer (waterShallow)
- **Ce que le joueur vit** : si chaussures de course cassées (durabilité 0) et joueur dans waterShallow sans brassards, son coût reste 10/case. Pas un blocage, juste perte d'efficacité. OK.
- **Status** : ⚪ Pas un blocage

### #64 — Si vélo cassé en plein Mont
- **Ce que le joueur vit** : vélo basique durabilité 0 en plein milieu du Mont. Le joueur peut-il redescendre ? Le mouvement standard `COST_MOVE = 10` est-il appliqué quand vélo cassé sur Mont, ou est-ce bloqué ?
- **Localisation** : Mont route + canRide logic
- **Criticité** : 🟠 Frustrant
- **Fix proposé** : vérifier que sans vélo (ou vélo cassé), le déplacement Mont est interdit avec message « ton vélo est cassé, rentre à pied (1 case = -10 cases gratuites) » → la descente est gratuite donc OK ?
- **Confiance** : À confirmer

### #65 — Si Daemon évolué par accident (mauvaise pierre)
- **Ce que le joueur vit** : le joueur utilise une pierre Feu sur son Daemon de type Plante par erreur. Le type change. Aucun retour arrière.
- **Localisation** : `canEvolveType` logic
- **Criticité** : 🟡 Confort (intentionnel = choix permanent)
- **Action** : ajouter une confirmation modale « Êtes-vous sûr ? Ce changement est permanent. » côté UI. Effort 30 min.
- **Confiance** : Élevée

---

## 10. Synthèse blocages

| # | Titre | Criticité |
|---|---|---|
| #45 | `mont_sommet` sans doorMat | 🟠 |
| #46 | `hautespates` sans doorMat | 🟠 |
| #47 | `shop_interior` entry/doorMat distance 2 | 🟡 |
| #48 | Multi-doorMats gyms/casinos | 🟡 |
| #49 | Joueurs coincés positions héritées (script à lancer) | 🔴 |
| #50 | NUTRIPATES doorMat (résolu) | ⚪ |
| #51 | Audit autres PNJ sur entry tiles | 🟠 |
| #52 | Combats orphelins (activeBattle JSON) | 🔴 |
| #53 | Daemon HP désynchro | 🟠 |
| #54 | `jardinierMissionActive` sans `jardinierFruitOrder` à confirmer | 🟡 |
| #55 | Pastagone cellule escape edge cases | 🟡 |
| #56 | `gamebookFrozenUntil` sans réversion | 🟡 |
| #57 | `pastagoneArrested` sans escape possible | 🟠 |
| #58 | `hasBag = true` reset accidental | 🟡 |
| #59 | Fast travel sur tile bloquante | 🟠 |
| #60 | Cellule Pastagone exit (résolu) | ⚪ |
| #61 | Téléport cave OK | ⚪ |
| #62 | Cadeau quand inventaire plein à confirmer | 🟡 |
| #63 | Baskets cassées en mer OK | ⚪ |
| #64 | Vélo cassé sur Mont à confirmer | 🟠 |
| #65 | Pierre évolution par erreur | 🟡 |

---

## 11. Actions prioritaires

1. **Lancer** `node scripts/audit-stuck-players.mjs` en local pour identifier les joueurs coincés. Rescue via route admin existante.
2. **Fixer** `mont_sommet` et `hautespates` (ajouter doorMat ou retirer exitTarget).
3. **Implémenter** le bouton « Abandonner combat » + timeout 30 min pour `activeBattle`.
4. **Confirmer** que `travel/route.ts` refuse les positions bloquantes (sinon, hardening identique à `state/route.ts`).
5. **Étendre** `audit-doors.mjs` pour détecter les PNJ sur entry tiles.

---

*Fin AUDIT_JOUEUR_04_BLOCAGES.md*
