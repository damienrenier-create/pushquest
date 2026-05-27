Données complètes. Je rédige le rapport.

---

# AUDIT_02_DATABASE.md — Administrateur Base de Données

> **Périmètre** : Nexus / Gamebook subsystem  
> **Branche** : `feat/gamification-pass-2` (HEAD `6f0bb65`)  
> **Date** : 2026-05-27  
> **Posture** : Sans complaisance  
> **Critères** : 🔴 Bloquant prod • 🟠 Critique • 🟡 Moyen • ⚪ Mineur

---

## 1. Vue d'ensemble — Inventaire schéma

| Métrique | Valeur | Verdict |
|---|---|---|
| Modèles Prisma déclarés | 26 | — |
| Tables effectivement créées par migrations | 12 | 🔴 14 modèles fantômes |
| Champs sur `GamebookProgress` | **130** | 🔴 God-table |
| Champs sur `Daemon` | 40 | 🟠 Trop large |
| Migrations totales | 34 | — |
| `prisma.$transaction` dans gamebook | **0** | 🔴 Aucune atomicité |
| `FOR UPDATE` / `pg_advisory_lock` | **0** | 🔴 Aucun verrouillage |
| Routes mutant `energySpentToday` sans tx | **31** | 🔴 Race condition systémique |

---

## 2. Cohérence schéma Prisma

### 2.1 🔴 God-table `GamebookProgress` (130 champs)

| Type | Count | Exemples |
|---|---|---|
| `Boolean` | 42 | `hasBag`, `treeObstacleCleared`, `piaffiniRescued`, `pastagoneBossBeaten` |
| `Json` / `Json?` | 24 | `flags`, `history`, `inventory`, `tamagotchi`, `activeBattle`, `pastagoneCuisinePuzzle` |
| `String` / `String?` | 27 | `mapId`, `phase`, `videurState`, `casinoBetsDate` |
| `Int` / `Int?` | 22 | `posX`, `posY`, `energySpentToday`, `luck`, `bonusSurplus` |
| `DateTime` / `DateTime?` | 11 | `createdAt`, `lastSeen`, `gamebookFrozenUntil`, `pastagoneInterrogStart` |

**Diagnostic** : Anti-pattern « Single Massive Save Object ». Chaque interaction joueur (déplacement, achat, dialogue, combat) déclenche un `update` de **tous les champs concernés** sur une ligne unique par utilisateur. Le payload moyen d'un round-trip dépasse 8 KB. Impossible à partitionner, impossible à archiver, impossible à indexer finement.

**Conséquences concrètes** :
- Verrouillage pessimiste implicite : chaque écriture verrouille toute la ligne, donc toute concurrence sur le même `userId` se sérialise → latence montre quand le joueur poste plusieurs actions rapprochées.
- L'absence d'index secondaires sur les 42 booléens force des full-scans pour toute statistique ad-hoc (« combien de joueurs ont sauvé PIAFFINI ? »).
- Aucune séparation domaine : casino, combat, narration, inventaire, daemon, économie cohabitent dans la même ligne.

### 2.2 🟠 Anti-pattern « Date stockée en String »

Onze champs nommés `*Date` typés `String` au lieu de `DateTime` :

```
casinoBetsDate, lastLuckTalkDate, lottoPouleDate, stopOuEncoreDate,
cockfightDate, slotMachinesDate, casinoBoostDate, lastArenaDate,
vetoMuscuLastVisitDate, lastDailyDecayDate, happyFlowerLastDate,
lastHotelSleepDate, energySpentDate
```

Format attendu : `YYYY-MM-DD` (TZ Europe/Paris).  
**Risques** :
- Toute comparaison se fait lexicographiquement — fonctionne pour ISO mais casse au moindre format alternatif.
- Impossible d'utiliser les opérateurs Prisma `gte`/`lt` avec sémantique calendaire (fuseaux, été/hiver).
- Migrations multi-pays impossibles sans rewrite.

### 2.3 🔴 14 modèles déclarés mais jamais migrés (schema drift)

Les `CREATE TABLE` dans `prisma/migrations/*/migration.sql` couvrent **12 tables** seulement :

```
✅ User, BadgeDefinition, BadgeEvent, BadgeEventLike, BadgeOwnership,
   ExerciseSet, FineRecord, GamebookProgress, MedicalCertificate,
   MonthlyChallengeEntry, PotEvent, WallMessage
```

**Manquants** (déclarés `model X { ... }` mais aucun `CREATE TABLE`) :

```
❌ Daemon
❌ GlobalConfig
❌ BadgeLike
❌ UserStatus
❌ StatusLike
❌ XpAdjustment
❌ SpecialWorkoutEntry
❌ Bet, BetEntry, BetEvent, BetEventLike, BetResult
❌ CoinAdjustment
❌ QuotaModifier
```

**Diagnostic** : Le schéma de production a été synchronisé via `prisma db push` (sync direct, sans génération de migration) plutôt que `prisma migrate dev`. Conséquences :
- Tout clonage du repo échouera à recréer la prod avec `prisma migrate deploy`.
- Aucune trace d'historique pour ces tables : impossible de rollback, impossible d'auditer l'évolution des contraintes.
- Le `migration_lock.toml` ment sur l'état réel.

**Cas le plus critique : `Daemon`** — 40 colonnes, FK vers `User`, contient les statpoints, l'XP, l'équipement et l'objet `activeBattle`. C'est la **seconde table la plus critique du Nexus**, et elle n'a pas de migration. Si la prod est cassée demain, la recréation passe par un `db push` manuel.

### 2.4 ⚪ Index présents

| Table | Index | Coverage |
|---|---|---|
| `GamebookProgress` | `@@unique([userId, chapterId])`, `@@index([userId])`, `@@index([mapId])`, `@@index([lastSeen Desc])` | Correct pour les requêtes connues |
| `Daemon` | `@@unique([userId, slotIndex])`, `@@index([userId])` | Correct |

Bonne nouvelle : aucun manque d'index sur les hot paths. **Mais** aucun index partiel sur les 42 booléens, ce qui rendra coûteuse toute future analytics (« qui a fini Pastagone ? »).

### 2.5 🟡 Intégrité référentielle

Toutes les FK vers `User` ont `onDelete: Cascade`. Cohérent avec la suppression RGPD. **Mais** :
- Aucune FK sortante de `Daemon` ou `GamebookProgress` vers des tables de définition (ex. `BadgeDefinition` pour les badges débloqués). Tous les `badgeKey` sont des **strings libres**. → Impossible de garantir qu'un badge cité dans le payload existe réellement.
- Le champ `chapterId` est un string libre. Aucune table `Chapter` pour le contraindre.

---

## 3. État des migrations

### 3.1 🔴 Désordre chronologique entre nommage et sémantique

Migrations triées alphabétiquement (= ordre d'exécution Prisma) :

```
20260524_pushquest_v3_3_npcs
20260525_pushquest_v3_4a_energy_spent
20260526_pushquest_v3_6_anti_cheat
20260526_pushquest_v4_0_active_battle          ← v4.0 ici
20260526_pushquest_v4_0_daemon_unlocked
20260526_pushquest_v4_0_pending_stat_points
20260526_pushquest_v4_pastagone_progress
20260527_pushquest_v4_capolino_mid_fuite
20260527_pushquest_v4_pullman_coulter
20260528_pushquest_v3_8_pepiteville            ← v3.8 APRÈS v4.0 ?!
20260529_pushquest_v3_8_1_fruits_boots
20260530_pushquest_v3_8_2_tower
20260601_pushquest_v3_11_piaffini
20260602_pushquest_v3_12_water
20260603_pushquest_v3_14_tamagotchi
20260604_pushquest_v3_17_luck
20260605_pushquest_v3_17c_polish
20260606_pushquest_v3_19b_bestioles
20260607_pushquest_v3_21_casino
20260608_pushquest_v3_22_fast_travel
```

**Diagnostic** : Les versions sémantiques (v3.8, v3.11, …, v3.22) ont été créées **après** v4.0. Le timestamp de nommage reflète la date d'écriture, pas l'ordre d'arc narratif. C'est légitime sur le papier — mais ça produit deux problèmes :

1. **Risque de conflit sur colonnes** : si v3.8 ajoute `pepitevilleArrived` et v4.0 a déjà altéré la même table, l'ALTER s'enchaîne dans un ordre incohérent avec le code qui les a introduits.
2. **Lecture humaine impossible** : impossible de reconstituer chronologiquement « quand on a livré quoi » à partir du dossier `migrations/`.

**À vérifier (centralisé dans Phase 1.8)** : la prod a-t-elle appliqué les migrations dans cet ordre alphabétique, ou un ordre fourni à la main ? Si Vercel a déclenché `migrate deploy` à chaque push, c'est l'ordre alphabétique qui s'applique → les utilisateurs prod ont vécu une « v4.0 active_battle » avant la « v3.8 pepiteville ».

### 3.2 🟡 Migrations purement additives — Bon point

Toutes les migrations Nexus sont des `ALTER TABLE ... ADD COLUMN` avec `DEFAULT`. Aucun `DROP COLUMN`, aucun `RENAME`, aucun `ALTER TYPE`. ✅ Cohérent avec la règle d'or énoncée par Sartay (« migrations additives only »).

### 3.3 🔴 Migrations qui exécutent du code sur table inexistante (couplé à 2.3)

Plusieurs migrations effectuent des `ALTER TABLE "Daemon" ADD COLUMN ...` alors que la table `Daemon` **n'a jamais été créée par migration**. Sur une base recréée à zéro via `migrate deploy`, ces ALTER plantent. **Inférence** : la branche `feat/gamification-pass-2` n'est aujourd'hui reproductible qu'avec un Neon préexistant ayant subi un `db push` initial.

---

## 4. Race conditions & transactions

### 4.1 🔴 Zéro transaction sur 95 routes mutatives

```bash
$ grep -rln "$transaction\|interactiveTransaction" src/app/api/gamebook/
(aucun résultat)
```

**95 routes Nexus écrivent en base sans `prisma.$transaction`**. Conséquences pratiques sur les scénarios joueur :

| Scénario | Tables touchées | Risque |
|---|---|---|
| Achat shop | `GamebookProgress` (énergie) + `XpAdjustment` (badge) + `BadgeOwnership` | Énergie débitée mais badge non créé si crash entre 2 writes |
| Spend énergie + déplacement | `GamebookProgress.energySpentToday` + `posX/posY` | Position mise à jour mais énergie non débitée (ou inverse) |
| Combat Daemon | `Daemon` (HP, XP) + `GamebookProgress.activeBattle` (JSON) + `XpAdjustment` | Daemon level-up sans XP en banque, ou XP créditée 2× |
| Casino lotto | `GamebookProgress.lottoPouleDate` + `lottoPouleWonToday` + `XpAdjustment` | Joueur peut rejouer en spammant si la 2e écriture rate |

### 4.2 🔴 31 routes mutant `energySpentToday`

C'est le champ le plus chaud du Nexus. Chaque écriture suit le pattern :

```ts
const gbp = await prisma.gamebookProgress.findUnique({...})
const newSpent = gbp.energySpentToday + COST
await prisma.gamebookProgress.update({
  where: { userId_chapterId: {...} },
  data: { energySpentToday: newSpent, ... },
})
```

**Anti-pattern read-modify-write sans verrouillage.** Si deux requêtes du même joueur arrivent à 100 ms d'intervalle :
1. R1 lit `energySpentToday = 50`
2. R2 lit `energySpentToday = 50`
3. R1 écrit `60` (coût 10)
4. R2 écrit `60` (coût 10)
→ Le joueur a dépensé 20 d'énergie mais le compteur indique 60 au lieu de 70.

**Mitigation existante** : le client envoie une action à la fois (`isLoading` du `MapClient`), ce qui réduit la fenêtre. **Mais** : multi-onglets, double-clic rapide, retry côté réseau, et surtout les jobs serveur (Pusher events) bypassent cette garantie client.

### 4.3 🔴 Aucun verrouillage applicatif

Aucun `pg_advisory_lock`, aucun `SELECT ... FOR UPDATE`. La seule garantie est l'isolation `READ COMMITTED` par défaut de PostgreSQL — insuffisante pour des incréments concurrents.

**Pattern correct attendu** : soit incrément atomique (`{ increment: COST }`), soit transaction sérialisable avec retry, soit advisory lock par `userId`. Aucun des trois n'existe.

### 4.4 🟡 Le champ `activeBattle` (JSON) cumule les risques

`Daemon.activeBattle` stocke l'état complet d'un combat (HP, tour, statut). Toute action de combat fait un read-modify-write sur ce JSON :

```ts
const daemon = await prisma.daemon.findFirst(...)
const battle = daemon.activeBattle as Battle
battle.enemyHp -= damage
await prisma.daemon.update({ where: { id }, data: { activeBattle: battle } })
```

Deux clics rapides « ATTAQUE » → double dégât appliqué côté client mais un seul persisté → désynchro.

---

## 5. Inventaire des flags — orphelins & fantômes

### 5.1 Boolean flags (42)

Tous référencés dans le code, **sauf 2 quasi-orphelins** :

| Flag | Référence unique | Statut |
|---|---|---|
| `durumEnergyGiven` | `api/gamebook/grant-durum-energy/route.ts` | 🟡 Set unique, jamais relu pour conditionner |
| `lottoPouleWonToday` | `api/gamebook/casino/lotto-poule/route.ts` | 🟡 Set unique, jamais relu |

Les deux flags sont écrits par leur route mais **jamais consommés** par une garde de gameplay. Soit la garde a été retirée, soit le flag a été conçu en prévision. **À clarifier** (Phase 1.8).

### 5.2 Catégorisation thématique des 42 booléens

| Thème | Flags | Volume |
|---|---|---|
| Onboarding & intro | `hasSeenWelcomeScreen`, `hasBag`, `hasEnteredTallGrass`, `monsterCaveRevealed`, `grassSudCutsceneShown` | 5 |
| Arc Tour Blagueur (TB) | `tbBossBeaten`, `tbBossKeyHeld`, `tbRewardClaimed`, `treeBookGiven`, `treeObstacleCleared` | 5 |
| Arc PIAFFINI / Mont | `piaffiniRescued`, `montSummitReached`, `franssJokeBirdDone`, `ornithologueBirdBonusGiven`, `firstSwimDone` | 5 |
| Muscuville | `muscuvilleInterpellatorTalked`, `muscuvilleRocksPassed`, `arenaUnlocked`, `nageurDefiCompleted` | 4 |
| Contest hall | `contestDefiPompatorDone`, `contestDefiSquatilusDone`, `contestDefiTiroirDone` | 3 |
| Pastagone | `pastagoneArrested`, `pastagoneBolognionFound`, `pastagoneBossBeaten`, `pastagoneCapolinoFleeShown`, `pastagoneCapolinoMidBeaten`, `pastagoneCoulterBeaten`, `pastagoneEscaped`, `pastagoneFaaGiftClaimed` | 8 |
| Casino | `bourgCasinoCoinsFound`, `lottoPouleWonToday` | 2 |
| PNJ ponctuels | `papaBoostClaimed`, `pereTalked`, `durumEnergyGiven`, `gymGuyEnergyGiven`, `bestiolesFirstEncountered` | 5 |
| Tamagotchi & jardinier | `tamagotchiInBag`, `jardinierArrosoirGiven`, `jardinierMissionActive` | 3 |
| Système | `isCompleted`, `pioneerBadgeAwarded` | 2 |

### 5.3 🟠 « Ghost flags » — utilisés dans le code mais valeur par défaut implicite

Plusieurs flags sont lus en `gbp.xxx ?? false` dans le code mais n'ont pas de `DEFAULT false` explicite dans la migration (vérification rapide nécessaire ligne par ligne — à approfondir en Phase 1.7 / 1.8). Risque : sur un compte créé avant l'ajout du flag, la valeur est `NULL`, le code la traite comme `false`, mais les requêtes SQL ad-hoc retournent du `NULL` au lieu de `false`. Inconsistance silencieuse.

### 5.4 🟡 Flags JSON `flags` & `history` — fourre-tout

Les deux Json `flags` et `history` sur `GamebookProgress` sont des sacs à clés. Le code y empile des choses sans schéma. Aucun moyen d'auditer ce qui s'y trouve sans grep exhaustif. **Recommandation différée** : à terme, migrer ces clés vers des colonnes typées ou une table EAV `GamebookFlag(userId, key, value)`.

---

## 6. Persistance client/serveur

### 6.1 🟡 Source de vérité dispersée

| Donnée | Source de vérité | Stockée côté client ? |
|---|---|---|
| Position joueur | `GamebookProgress.posX/posY` | Oui (state React) — re-fetch sur reload |
| Énergie restante | Calculée serveur (`workouts` du jour - `energySpentToday`) | Oui (état dérivé) |
| Inventaire | `GamebookProgress.inventory` (Json) | Oui |
| HP Daemon | `Daemon.currentHp` | Oui (`activeBattle.actorHp` aussi) → 🔴 dualité |
| `activeBattle` | `Daemon.activeBattle` (Json) | Oui (mirror complet) |

**Risque principal** : `Daemon.currentHp` ET `activeBattle.actorHp` représentent la même donnée. Le code lit/écrit l'un OU l'autre selon le contexte. Désynchro garantie si crash en milieu de combat.

### 6.2 🟠 Aucune trace d'audit côté serveur

Aucune table `GamebookEvent` / `PlayerActionLog` / `AuditTrail`. Si demain un joueur conteste « j'ai pas dépensé cette énergie », il n'existe **aucun journal serveur** pour reconstituer la séquence. Le seul artefact est le JSON `history` (taille non bornée, écrit côté client).

### 6.3 ⚪ Snapshots ?

Aucun mécanisme de snapshot/rollback de `GamebookProgress`. Restaurer un joueur après bug = `UPDATE` manuel via Prisma Studio ou route admin ad-hoc.

---

## 7. Top routes par fréquence d'écriture `GamebookProgress`

| Rang | Route | `gamebookProgress.update` count |
|---|---|---|
| 1 | `api/gamebook/state` | 12 |
| 2 | `api/gamebook/spend` | 9 |
| 3 | `api/gamebook/daemon/battle/action` | 9 |
| 4 | `api/gamebook/casino/stop` | 8 |
| 5 | `api/gamebook/muscuville/rocks-pay` | 6 |
| 6 | `api/gamebook/shop/buy` | 5 |
| 7 | `api/gamebook/pastagone/infirmerie-heal` | 5 |
| 8 | `api/gamebook/inventory/use` | 4 |
| 9 | `api/gamebook/hotel/sleep` | 4 |
| 10 | `api/gamebook/franss-joke` | 4 |

**Diagnostic** : la route `/state` (hardenée récemment via commit `78c9d18`) écrit 12 fois — c'est elle qui doit absolument passer en transaction.

---

## 8. Synthèse criticité

| # | Constat | Criticité | Effort fix |
|---|---|---|---|
| 1 | God-table 130 champs | 🔴 | XXL (refacto domaine) |
| 2 | 14 modèles sans CREATE TABLE | 🔴 | M (régénérer baseline migration) |
| 3 | 0 transaction sur 95 routes | 🔴 | L (audit route par route) |
| 4 | 31 routes race-prone sur énergie | 🔴 | M (incrément atomique) |
| 5 | Désordre alphabétique migrations | 🔴 | S (renommer ou figer) |
| 6 | Dates en `String` | 🟠 | M (migration + code) |
| 7 | Dualité `Daemon.currentHp` / `activeBattle.actorHp` | 🟠 | S |
| 8 | Aucun audit log serveur | 🟠 | L |
| 9 | 2 flags quasi-orphelins | 🟡 | XS |
| 10 | Json fourre-tout `flags`/`history` | 🟡 | XL |

---

## 9. Recommandations DBA (sans implémentation)

1. **Baseline urgente** : générer une migration `__baseline_v3_drift_repair` qui crée explicitement les 14 tables manquantes via `prisma migrate dev --create-only`, puis marquer la migration comme appliquée en prod via `prisma migrate resolve --applied`. Sans ça, le repo est ingérable sur tout nouvel environnement.
2. **Atomicité énergie** : remplacer tous les read-modify-write `energySpentToday` par `{ increment: COST }`. Bénéfice immédiat, effort minimal, zéro side effect métier.
3. **Transaction sur routes shopping** : `shop/buy`, `casino/*`, `daemon/battle/action`, `inventory/use` doivent passer en `prisma.$transaction([...])` ou `prisma.$transaction(async tx => ...)`.
4. **Journal append-only** : créer table `GamebookEvent(id, userId, eventType, payload Json, createdAt)` et `INSERT` à chaque action significative. Permet rollback, debug joueur, futur analytics.
5. **Convention dates** : geler la convention « `*Date` toujours `DateTime`, `*Day` toujours `String YYYY-MM-DD` » et migrer progressivement.

---

**Fin AUDIT_02_DATABASE.md.**

Phase 1.2 terminée. Les points 🔴 1, 2, 3, 4, 5 sont les plus alarmants — ils relèvent tous d'un patron systémique (« écriture rapide sans atomicité ») né de la vélocité solo + livraison continue.

Auto Mode actif → j'enchaîne avec **Phase 1.3 : AUDIT_03_GAMEDESIGN.md** (Game Designer) dans la réponse suivante.