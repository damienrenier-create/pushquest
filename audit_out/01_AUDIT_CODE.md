Données collectées. Voici le rapport :

---

# 🧑‍💻 AUDIT_01_CODE.md — Tech Lead Silicon Valley QA

*Phase 1.1 — Audit Code & Architecture. Sans complaisance, sans modification de code.*

## 0. Résumé exécutif

> Le module Nexus tient debout par habitude et par chance, pas par design. La séparation client/serveur existe sur le papier mais le client est un god-component de 5791 lignes qui dépend de tout, et le serveur n'utilise **aucune** transaction Prisma sur 95 routes mutatives. La sécurité de typage est volontairement contournée 292 fois (`prisma as any`). Aucun test automatisé. Code mort identifié dans 9 endroits (1 lib + 8 routes), `engine.ts` à 218 lignes n'est référencé NULLE PART.

**Verdict global** : ⚠️ **Dette technique majeure**. Le code livre la valeur business demandée mais chaque ajout coûte exponentiellement plus cher. La prochaine refonte structurelle est non-optionnelle si la roadmap continue de s'étendre.

---

## 1. Indicateurs transverses (chiffres bruts)

| Métrique | Valeur | Verdict |
|---|---:|---|
| `(prisma as any)` (bypass typage) | **292** | 🔴 Massif |
| `as any` (autres casts) | 10 | 🟡 Marginal |
| Casts structurels `as { ... }` | **592** | 🔴 Le typage explicite n'est pas utilisé |
| `console.warn/error/log` | 80 | 🟡 OK pour debug, à logger structuré en prod |
| `catch { /* silent */ }` | **31** | 🟠 Bugs invisibles |
| `TODO/FIXME/HACK` | 0 | ⚪ Bizarre (signe que personne ne note la dette) |
| Transactions Prisma `$transaction` | **0** | 🔴 Aucune atomicité sur 95 routes mutatives |
| AbortController côté client | **0** | 🟠 Fetch fantômes possibles |
| useEffect dans MapClient | 11 | ⚪ |
| useState dans MapClient | **57** | 🔴 God component |
| `try { ... }` dans MapClient | 88 | 🔴 Idem |
| `fetch("/api/gamebook…")` dans MapClient | 94 | 🔴 Idem |
| `state.mapId === "…"` dans MapClient | **85** | 🔴 Gating spaghetti |
| Tests automatisés Nexus | **0** | 🔴 |

---

## 2. Architecture globale — séparation des responsabilités

### 2.1 🔴 Le god component : `MapClient.tsx`

- **5 791 lignes** dans un seul composant React.
- **57 hooks `useState`** locaux → la moitié de l'état applicatif vit dans un seul composant.
- **94 appels `fetch`** vers 50+ routes différentes, mélangés inline dans des handlers JSX.
- **85 branches `state.mapId === "…"`** qui transforment ce composant en machine à états déguisée.
- **88 blocs `try`** dispersés, dont aucun avec stratégie de retry.
- Importe ~50 modules (modals, NPCs, items, map data).

**Verdict** : Ce composant viole `single-responsibility`, `open/closed`, et la moindre règle de cohésion. Toute modification non-triviale a un risque de régression imprévisible.

**Recommandation** : Découper en au minimum :
- `useGamebookState()` — hook custom qui gère état joueur (position, énergie, flags) + sync serveur.
- `useNpcInteraction()` — hook qui gère le `pressA` sur NPCs avec un router par `npcId`.
- `useTileInteraction()` — hook qui gère le `pressA` sur tiles (shopCounter, doorMat, animalCage, etc.).
- `useCinematicMachine()` — state machine dédiée aux cinématiques.
- `useBattleFlow()` — gestion BattleModal + state activeBattle.
- `<MapRenderer>` — composant pur de rendu de la grille et des sprites.
- `<ModalHost>` — un seul host qui mount/unmount tous les modals selon état.

### 2.2 🟠 Confusion `engine.ts` vs `mapEngine.ts`

| Fichier | Lignes | Rôle déclaré | Rôle effectif |
|---|---:|---|---|
| `engine.ts` | 218 | "Moteur du Gamebook. Fonctions pures." | **Zéro importeur**. Code mort intégral. |
| `mapEngine.ts` | 578 | Pas commenté | Le VRAI moteur (tryComputeMove, isBlockingTile, INTERIOR_ENTRY_POSITIONS). |

**`engine.ts` est référencé uniquement depuis `src/_archive/gamebook_progress_v2/progress/route.ts`** — du code explicitement archivé. C'est donc 218 lignes de code mort en `src/lib/gamebook/`.

**Recommandation** : supprimer `engine.ts` OU le renommer `_archive_engine.ts` si tu veux le garder par nostalgie.

### 2.3 🟠 Triple architecture des données de map

- `maps.ts` (2812 lignes) construit les tiles **en code impératif** via des `for` loops + assignements imperatifs.
- `npcs.ts` (2565 lignes) déclare ~80 NPCs en **objets littéraux inline** avec dialogues hardcodés.
- `dialogue.ts` contient encore d'autres dialogues longs séparés des NPCs.

→ Pour ajouter un NPC, il faut toucher 1-3 fichiers, espérer ne pas casser le typage, et tester manuellement. Pas de schéma de données, pas de validation, pas de runtime check.

**Recommandation** : extraire les NPCs en JSON typé (`src/data/npcs/{map}.json`) + un loader qui valide via Zod au démarrage.

### 2.4 🔴 Aucun découpage logique côté serveur

- 95 routes API, chacune avec son fichier `route.ts` (Next.js App Router le force) — OK.
- **Mais** : aucune couche service partagée. Chaque route reimplémente :
  - Auth check (`getServerSession + extraction userId`) — 95×.
  - Lecture `GamebookProgress` — ~80×.
  - Cast `prisma as any` — 292×.
  - Logique métier mélangée avec persistence.

**Recommandation** : créer `src/lib/gamebook/services/` avec :
- `progressService.ts` — read/update GamebookProgress.
- `energyService.ts` — calcul/débit/crédit énergie.
- `daemonService.ts` — list/create/update daemons.
- `inventoryService.ts` — déjà partiellement présent dans `inventory.ts` mais pas utilisé partout.
- `xpService.ts` — création atomique de BadgeEvent + XpAdjustment.

---

## 3. Anti-patterns récurrents

### 3.1 🔴 `(prisma as any)` × 292

Le typage Prisma est contourné systématiquement. Causes probables :
1. Le client Prisma n'a pas été régénéré après chaque migration (cf. règle d'or memo : "EPERM Windows lock sur prisma generate").
2. Les nouveaux champs (Daemon, pastagone*, etc.) sont annotés mais le type généré ne reflète pas la DB.
3. Mode "ça marche, on bouge".

**Conséquence concrète** : aucune erreur de compilation si on tape un mauvais nom de champ (`pastagonneArrested` au lieu de `pastagoneArrested`). Le bug arrive en runtime.

**Recommandation** : forcer `prisma generate` après chaque migration via un hook `postinstall` ET supprimer **tous** les `as any` Prisma en 3 PR (par domaine).

### 3.2 🔴 Dynamic imports partout dans les routes API

```ts
const { applyHappinessDelta, HAPPINESS_DELTAS } = await import("@/lib/gamebook/happinessChanges")
```

Pattern présent dans 20+ routes serveur. Justification présumée : éviter les cycles d'import OU lazy-load. En réalité :
- ❌ Désactive le tree-shaking — tout est bundlé runtime.
- ❌ Cache l'arbre de dépendances aux IDE → impossible de "find usages" en static.
- ❌ Coût runtime à chaque appel de route (résolution module).
- ✅ Le seul cas légitime serait éviter un cycle, mais aucun cycle réel n'est documenté.

**Recommandation** : convertir tous ces dynamic imports en imports statiques en haut du fichier. Si vrai cycle détecté → refactor.

### 3.3 🟠 31 `} catch { /* silent */ }`

Catalogue des silent catches :

```
src/app/gamebook/MapClient.tsx              13 ✗
src/app/gamebook/DaemonTeamModal.tsx         3 ✗
src/app/gamebook/BattleModal.tsx             2 ✗
src/app/gamebook/PastagoneCelluleModal.tsx   2 ✗
... (10+ autres modals)
```

Pour chaque appel `fetch` qui échoue silencieusement, le joueur ne sait pas qu'il y a eu un problème (réseau, 500, 401 après expiration session). Le state local reste mais le serveur ne sait rien. Au prochain reload → divergence.

**Recommandation** : un wrapper `apiFetch(url, opts)` qui :
- Centralise headers/credentials.
- Catch 401 → redirect login.
- Catch 500 → toast "Erreur serveur, réessaie."
- Catch network → toast "Erreur réseau."
- Expose un log structuré.

### 3.4 🔴 Aucune transaction Prisma sur 95 routes mutatives

```bash
$ grep -rln 'prisma\.\$transaction' src/app/api/gamebook
# (vide)
```

**Exemples de routes qui devraient être atomiques mais ne le sont pas** :
- `/api/gamebook/shop/buy` : débit energySpent + write inventory + write totalShopSpend → 3 writes séparés.
- `/api/gamebook/mont/summit-reached` : badgeEvent + xpAdjustment + GamebookProgress.update → 3 writes.
- `/api/gamebook/pastagone/orphan-choose` : daemon.create + gamebookProgress.update → 2 writes.
- `/api/gamebook/daemon/battle/action` : daemon.update + gamebookProgress.update → 2 writes.

**Conséquence concrète** : si la première écriture réussit et la seconde échoue (Neon timeout, lock, deadlock), le joueur a l'XP sans le badge OU le daemon sans le slot mis à jour. Récupération manuelle obligatoire.

**Recommandation** : wrapper toutes les routes multi-write dans `prisma.$transaction()`. Coût trivial vs bénéfice critique.

### 3.5 🟠 useEffect avec deps incomplètes

Repéré dans MapClient (11 useEffect, plusieurs avec `[]` ou deps minimales alors que le hook utilise des state externes). Exemple flagrant :

```ts
useEffect(() => { ; (async () => {
    await refresh()
    setLoading(false)
})() }, [])
```

Dans `DaemonTeamModal.tsx` : `refresh()` capture `focused` dans sa closure mais l'effect a `[]` comme deps. Si `focused` change, la version de `refresh` utilisée reste l'initiale. Fonctionnellement OK ici (l'utilisateur clique pour set focused, qui re-render et re-attache). Mais c'est fragile.

**Recommandation** : activer `eslint-plugin-react-hooks` avec règle `exhaustive-deps` en error.

### 3.6 🟠 Conditions inline gating (85 occurrences)

```ts
if (state.mapId === "veterinaire" && tile === "shopCounter") { setShowTamagotchi(true); return }
if (state.mapId === "pastagone_cuisine" && tile === "foodBag") { ... }
if (state.mapId === "vegas_shoptower_1" || state.mapId === "vegas_shoptower_2" ...
```

Le `pressA` de MapClient est devenu un router de 600+ lignes avec ~85 conditions de gating. Ajouter une interaction nouvelle = trouver le bon endroit dans la chaîne, espérer ne pas casser une priorité existante.

**Recommandation** : table de routing `(mapId, tile|npcId) → handler` extraite. Permet ajout déclaratif sans toucher le god component.

---

## 4. Code mort, dupliqué, ou inutilisé

### 4.1 🔴 `engine.ts` — 218 lignes mortes
0 importeur (sauf `_archive/`). À supprimer.

### 4.2 🔴 8 routes API zéro consumer client

| Route | Statut |
|---|---|
| `biblio/gift-tree-book` | 0 client. Probablement remplacée par `tree-book` à Muscuville. |
| `daemon/equip-item` / `daemon/unequip-item` | 0 client. Routes créées mais aucune UI ne les appelle. |
| `daemon/heal` | 0 client. Route présente, jamais appelée. |
| `muscuville/interpellator-talk` | 0 client. Code mort ? |
| `pusher-auth` | 0 client direct (peut être appelée par lib `pusher-client` côté Pusher SDK). À valider. |
| `tamagotchi/use-serum` | 0 client. Doublon avec `daemon/use-serum` ? |
| `v3t/talk` | 0 client. Dernier commit a désactivé l'appel. À supprimer. |

**Recommandation** : pour chaque route, soit la connecter à une UI, soit la supprimer. Le placebo "ça pourrait servir" coûte plus que ça ne rapporte.

### 4.3 🟠 Routes redondantes / doublons

| Route #1 | Route #2 | Verdict |
|---|---|---|
| `tamagotchi/feed` | `tamagotchi/feed-pates` | feed est probablement obsolète. |
| `tamagotchi/use-serum` (v3.24d sérum intelligence) | `daemon/use-serum` (v4.0 sérum Poussière) | Confusion sémantique forte. À renommer/supprimer. |
| `grant-bag` | `setCinematic("pepitoBag")` côté client | Qui de l'API ou du cinematic effectue le grant ? À tracer. |

### 4.4 🟡 Dossier `_archive/` dans `src/`

```
src/_archive/gamebook_progress_v2/progress/route.ts
src/_archive/sanctuaire_v1/fsm_dialogue.json
src/_archive/sanctuaire_v1/GamebookClient.tsx
src/_archive/sanctuaire_v1/page.tsx
src/_archive/sanctuaire_v1/SanctuaireTab.tsx
```

Le code mort archivé pollue les recherches grep/IDE. **Recommandation** : déplacer hors de `src/` (par exemple `archive/`) ou supprimer (git history le conserve).

### 4.5 🟡 Pattern dupliqué : "battle setup"

`/api/gamebook/daemon/battle/start`, `/api/gamebook/pastagone/tour-battle`, `/api/gamebook/pastagone/coulter-battle`, `/api/gamebook/pastagone/capolino-mid-battle`, `/api/gamebook/pastagone/boss-battle` : 5 routes qui font toutes la même chose (lire leader, calculer effective stats avec snapshot wearables, créer BattleState).

**~80 lignes dupliquées par fichier × 5 = 400 lignes dupliquées**.

**Recommandation** : extraire un helper `buildBattleStart(userId, enemyDescriptor) → BattleState`.

---

## 5. Gestion d'erreurs & cas limites

### 5.1 🟠 Pas de retry, pas d'abort, pas de timeout

- **0 AbortController** côté client → fetch en cours pendant qu'on navigue ou ferme un modal continue à muter le state local après unmount → warnings React + race conditions.
- Pas de retry sur les routes critiques (battle action, shop buy).
- Pas de timeout explicite (le runtime Vercel a son propre timeout).

### 5.2 🟠 Validation d'entrée serveur inégale

Échantillon de routes :

| Route | Validation body | Verdict |
|---|---|---|
| `/state` POST | Inputs validés (mapId in list, posX/posY 0-30, direction in list) | ✅ |
| `/shop/buy` | `itemKey` string check | 🟡 Pas de check explicite que l'item est buyable. |
| `/daemon/battle/action` | `body.action.kind` check | 🟡 Pas de schéma global, juste switch. |
| `/pastagone/orphan-choose` | `orphan` in dict | ✅ |
| `/daemon/allocate-points` | Allocation parsée via clampInt | ✅ |

**Recommandation** : un schema Zod par route, validation strict en début de handler. Sortie type-safe.

### 5.3 🟠 Null safety à la louche

```ts
const userRow = await (prisma as any).user.findUnique({...})
const isCreator = userRow?.isSystem === true   // ✅ optional chaining OK
// ...
const tam = p.tamagotchi as { name?: string; currentLevel?: number; ... }
if (!tam.name || typeof tam.currentLevel !== "number") return  // ✅
```

Mais ailleurs (MapClient) :

```ts
const npcInFront = npcsWithPos.find(...)
if (npcInFront) { ... const npcId = npcInFront.npc.id  // 🟡 npc.id non-typé garanti
```

Et :

```ts
const tile = map.tiles[ny][nx]   // 🟠 si y/x hors map → exception runtime
```

`tryComputeMove` valide les bounds en amont, donc OK ici. Mais ailleurs dans MapClient (les overrides), pas toujours.

### 5.4 🔴 État local non-synchronisé serveur

Pattern observé :

```ts
setState((s) => ({ ...s, pastagoneEscaped: true }))
// PUIS plus tard : POST /state qui ne renvoie pas pastagoneEscaped
```

Le client met à jour son state localement *avant* que le serveur ait confirmé. Si le serveur 500, l'état local est divergent. Récupéré uniquement à la prochaine GET `/state` complète.

**Risque** : un utilisateur qui ferme l'app pendant que son `pastagoneEscaped=true` local est en attente de sync server perd la cohérence.

---

## 6. Performance

### 6.1 🟠 GET `/api/gamebook/state` retourne tout

Réponse type :
- `state` (80+ champs flat, incluant Json tamagotchi + Json activeBattle + Json inventory + Json visitedTowns)
- `todayReps`, `energySpentToday`, `bonusSurplus`, `availableEnergy`
- `frozen`, `frozenUntil`, `inventory`, `hasBag`, `fruitsTaken`, `towerFloorReached`, `difficultyRatio`
- `tamagotchi` (Json reformaté)
- `isCreator`

→ **~5-15 KB par appel**, appelé au mount, après chaque mouvement (POST + GET refresh), et à la fermeture des modals. Mobile en 3G : douloureux.

**Recommandation** :
- Séparer endpoints : `/state/position` (rapide, juste mapId+pos+direction), `/state/full` (au mount uniquement).
- Cache client (SWR/React Query) avec invalidation ciblée.

### 6.2 🟠 Pas de cache `/players`

`/api/gamebook/players` est polled (~10s) pour afficher autres joueurs visibles. Aucun cache HTTP, aucun cache mémoire, aucun stale-while-revalidate.

### 6.3 🟡 Maps construites à chaque import

`maps.ts` construit les 32 maps à l'import via fonctions `buildXxx()`. C'est OK car module-level (1 fois par worker), mais ça gonfle le cold start serverless.

**Recommandation** : sérialiser une fois en JSON statique.

---

## 7. Dette technique récapitulée

| Item | Sévérité | Impact effort |
|---|---|---|
| Aucun test automatisé Nexus | 🔴 | Régression invisible à chaque commit |
| God component MapClient | 🔴 | Toute évolution = risque cascade |
| `(prisma as any)` × 292 | 🔴 | Bug typage en runtime |
| 0 transaction Prisma | 🔴 | Corruptions partielles possibles |
| Silent catches × 31 | 🟠 | Bugs invisibles |
| Dynamic imports systématiques | 🟠 | Tree-shaking off, perf cold start |
| Code mort (engine + 8 routes) | 🟠 | Pollution / confusion |
| `_archive/` dans `src/` | 🟡 | Pollution recherches |
| Pas de schema validation Zod | 🟠 | Validation manuelle inégale |
| Pas d'AbortController client | 🟡 | Memory leaks possibles |
| 5 routes battle/setup dupliquées | 🟡 | 400 lignes dupliquées |
| Pas de retry strategy fetch | 🟡 | UX dégradée sur réseau instable |

---

## 8. Top 10 bombes à désamorcer (prio Tech Lead)

| # | Bombe | Effort | Impact |
|---|---|---|---|
| 1 | Ajouter `prisma.$transaction()` sur les 10 routes les plus mutatives | M | 🔴 |
| 2 | Wrapper `apiFetch` centralisé + retry + abort | M | 🔴 |
| 3 | Découper MapClient en 6-8 hooks customs + ModalHost | L | 🔴 |
| 4 | `prisma generate` enforced post-migration + suppression des `(prisma as any)` | M | 🔴 |
| 5 | Schema validation Zod sur les 20 routes critiques | M | 🟠 |
| 6 | Test E2E sur le golden path (Bourg → Macaron → Pastagone) | L | 🔴 |
| 7 | Supprimer `engine.ts` + 8 routes mortes + `_archive/src/` | S | 🟠 |
| 8 | Convertir dynamic imports en static imports | S | 🟠 |
| 9 | `eslint-plugin-react-hooks` exhaustive-deps en error | S | 🟠 |
| 10 | Snapshot `maps.ts` en JSON statique pré-build | M | 🟡 |

S = small (< 1 jour), M = medium (1-3 jours), L = large (1-2 semaines).

---

## 9. Notes pour les phases suivantes

- **Phase 1.2 (DB)** doit creuser l'absence de transactions, le timing des migrations (`20260528_*` dates incohérentes), et les race conditions XP/énergie.
- **Phase 1.4 (Narratif)** doit lister tous les flags de progression pour cartographier les flows.
- **Phase 1.6 (QA)** doit ouvrir une issue pour chaque silent catch + chaque route morte.
- **Phase 1.7 (Conformité)** doit tracer chaque `as any` à la consigne d'origine — combien sont des contournements documentés vs des paresses.
- Ce que je n'ai PAS audité ici (volontairement, c'est ailleurs) :
  - Les schémas Prisma eux-mêmes (Phase 1.2).
  - Les flows narratifs end-to-end (Phase 1.4).
  - Les bugs visuels (Phase 1.5).
  - La conformité aux consignes (Phase 1.7).

---

## 🛑 Fin de Phase 1.1 — AUDIT_01_CODE.md

Pas une ligne de code modifiée. Aucune correction appliquée.

**Auto Mode actif** → j'enchaîne sur Phase 1.2 (AUDIT_02_DATABASE.md — Database Admin) dans la réponse suivante.

Si tu veux que je marque une pause et que tu valides avant Phase 1.2, dis "stop". Sinon je continue.