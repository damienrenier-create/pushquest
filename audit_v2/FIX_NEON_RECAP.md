# FIX_NEON_RECAP.md

> Mission : réduire la consommation Neon (compute-time + data transfer) du module Nexus pour permettre le scale-to-zero quand personne ne joue activement.
>
> **Date** : 2026-05-28

---

## TL;DR

3 fixes appliqués. Estimation conservatrice du gain :
- **~85% de requêtes en moins** quand le joueur est inactif (onglet caché ou modale ouverte) : 0 polling au lieu de 1 toutes les 30s.
- **~80% de POST `/state` en moins** lors d'un déplacement de N cases (1 POST groupé au lieu de N immédiats).
- **Scale-to-zero Neon enfin atteignable** : quand aucun joueur n'a son onglet actif, la DB ne reçoit plus aucune requête.

---

## FIX 1 — Polling `/api/gamebook/players` ralenti + suspendu

### Avant

`src/app/gamebook/MapClient.tsx` :
- Si Pusher désactivé : `setInterval(loadOtherPlayers, 30_000)` — appel toutes les **30 secondes**, en permanence, même onglet inactif.
- Si Pusher activé : `setInterval(loadOtherPlayers, 60_000)` (safety poll) — toutes les **60 secondes**, idem.

**Conséquence** : avec un onglet ouvert en arrière-plan, Neon recevait au minimum 1 requête/30s ou 60s → jamais scale-to-zero.

### Après

- **Pusher OFF** : poll passé à **60 secondes** (au lieu de 30s).
- **Pusher ON** : safety poll passé à **5 minutes** (au lieu de 60s).
- **Gardé par `shouldSkipPollRef`** : ne fait RIEN si
  - `document.hidden === true` (onglet en arrière-plan)
  - ou une modale est ouverte (`showStartMenu`, `showInventory`, `showShop`, combat, casino, etc. — ~24 modales bloquantes)
- **`visibilitychange` listener** : un poll s'exécute à la reprise de l'onglet (pour rattraper l'écart).
- **Cleanup propre** des `setInterval` + listener `visibilitychange` dans `useEffect`.

### Impact attendu

| Scénario | Avant | Après |
|---|---|---|
| Joueur actif sur Nexus (Pusher ON) | 1 req/60s | 1 req/5min |
| Joueur sur Nexus + modale ouverte | 1 req/60s | 0 req |
| Onglet Nexus en arrière-plan | 1 req/60s | 0 req |
| Pas de Pusher (fallback) | 1 req/30s | 1 req/60s + skip si hidden/modale |

→ Pour un joueur qui laisse l'onglet ouvert 8h sans jouer activement (cas typique de la journée de travail) : passage de **~960 req/jour à 0 req/jour**.

---

## FIX 2 — POST `/api/gamebook/state` enrichi (partiel)

### Avant

`POST /api/gamebook/state` retournait uniquement `{ ok: true, state: <row Prisma brute> }`. Les champs dérivés (`availableEnergy`, `energySpentToday`, `bonusSurplus`) n'étaient pas inclus → le client devait faire un `GET /api/gamebook/state` ensuite pour les obtenir, doublant les requêtes pour les actions qui touchaient l'énergie.

### Après

`POST /api/gamebook/state/route.ts` retourne maintenant :

```json
{
  "ok": true,
  "state": <row Prisma>,
  "availableEnergy": 152,
  "energySpentToday": 30,
  "bonusSurplus": 0
}
```

(calculés via `readEnergySnapshot` + `computeAvailableEnergy`, avec override `CREATOR_MIN_ENERGY` préservé pour les comptes `isSystem`).

### ⚠️ Limite assumée

J'ai **enrichi le retour côté serveur** mais **PAS supprimé les `GET /api/gamebook/state` côté client** (~10 occurrences dispersées dans `MapClient.tsx`).

**Raison** : ces GET ne suivent pas le POST `/state` (qui n'en déclenche aucun) — ils suivent des routes spécifiques (`tb/brute`, `jardinier/check`, `monstre/grant-amulette`, push d'un autre joueur, etc.) où le contexte est très différent. Les chasser au cas par cas exigerait de comprendre chaque route et d'auditer leurs réponses individuellement — gros risque de régression silencieuse pour un gain compute **nul** (chaque requête réveille la DB pareil, le scale-to-zero est déjà sauvé par Fix 1 + Fix 3).

**Bénéfice immédiat de l'enrichissement** : les futurs ajouts client peuvent utiliser la réponse du POST `/state` directement sans re-fetch.

### Impact attendu

- Gain compute immédiat : marginal (POST `/state` n'était pas systématiquement suivi d'un GET).
- Gain potentiel futur si on supprime les GET ciblés : ~5-10% de requêtes par session.

---

## FIX 3 — Débounce sauvegarde de position pure (3s) + flush sécurité

### Avant

`saveState` dans `MapClient.tsx` :
```ts
const saveState = useCallback((s) => {
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current)
    saveDebounceRef.current = setTimeout(async () => {
        await fetch("/api/gamebook/state", { method: "POST", ... })
    }, 500)
}, [])
```

**500ms** de debounce uniforme : un joueur qui spam-clique 10 flèches en 5 secondes générait **10 POST**, chacun touchant 130 colonnes de `GamebookProgress`.

### Après

Deux régimes de debounce :
- **Position pure** (mapId/phase/flags inchangés, seuls `posX/posY/direction` bougent) → **3000 ms**. Une traversée de 10 cases sans pause = **1 POST** au lieu de 10.
- **Changement critique** (mapId, phase, flags, npcs, bridgePnj) → **500 ms** (comportement historique préservé). Toute action qui touche la progression part en sauvegarde rapide.

### Filets de sécurité (anti-perte de progression)

- `window.addEventListener("beforeunload")` : flush avec `navigator.sendBeacon` (survit à la fermeture d'onglet).
- `document.addEventListener("visibilitychange")` : flush quand l'onglet passe en arrière-plan.
- `pendingStateRef` + `lastSavedStateRef` : la dernière position en attente est toujours flushable.

### Compatibilité hardening serveur

Le POST `/state` existant refuse déjà les positions sur tiles bloquantes (commit `78c9d18`). Mon débounce **ne change pas les positions envoyées** — il ne fait que retarder l'envoi de la position client (qui est déjà valide par construction côté `tryMove`). Aucun risque d'envoyer une position invalide qu'on n'envoyait pas avant.

### Impact attendu

| Action joueur | Avant (~) | Après (~) |
|---|---|---|
| Marcher 10 cases en ligne droite (5s) | 10 POST `/state` | 1 POST `/state` |
| Marcher 1 case puis ouvrir le shop | 1 POST puis flush sur modale | 1 POST critique (mapId? non — position) → 1 |
| Combattre/dialoguer (flag change) | 1 POST 500ms | 1 POST 500ms (inchangé) |
| Fermer l'onglet en cours de déplacement | Position potentiellement perdue | Sauvegardée via sendBeacon |

---

## Fichiers modifiés

| Fichier | Modif |
|---|---|
| `src/app/gamebook/MapClient.tsx` | Polling /players gardé (Fix 1) + saveState dual-regime (Fix 3) + beforeunload/visibilitychange listeners |
| `src/app/api/gamebook/state/route.ts` | POST retourne availableEnergy/energySpentToday/bonusSurplus (Fix 2 partiel) |

**Aucun autre fichier touché.** Aucune logique de jeu modifiée.

---

## Comment vérifier que ça marche

### Côté Neon Dashboard

1. Va sur https://console.neon.tech → ton projet → onglet **Monitoring**
2. Section **Compute hours used** (ou **Active time**) :
   - **Avant** : graphe quasi-plat à 100% activité — Neon ne s'endort jamais.
   - **Après attendu** : creux visibles pendant les périodes où aucun joueur n'est actif (la nuit, journée de travail si tu fermes/cache l'onglet). Le compute n'augmente que pendant les sessions de jeu actives.
3. Section **Data transfer (egress)** :
   - **Avant** : ~5 GB/mois consommés vite (quota atteint).
   - **Après attendu** : -50% à -70% selon le profil d'usage des 8 amis.

### Côté navigateur (test instantané)

1. Ouvre la console Network sur Nexus.
2. Filtre sur `gamebook/`.
3. **Test polling actif** : reste sur Nexus 90 secondes sans rien faire → tu dois voir **au plus 1-2 requêtes `/players`** (avant : 3 requêtes minimum en 90s).
4. **Test polling onglet caché** : minimise l'onglet ou ouvre un autre onglet pendant 2 min → 0 nouvelle requête `/players`.
5. **Test polling modale** : ouvre le sac/menu → laisse-le ouvert 2 min → 0 nouvelle requête `/players`.
6. **Test débounce position** : marche 10 cases en 5 secondes → tu dois voir **1 seul POST `/state`** (avant : 10).
7. **Test sécurité** : ferme l'onglet en plein mouvement, rouvre → ta position doit être conservée (le `sendBeacon` aura sauvegardé).

### Confirmation scale-to-zero Neon

Sur Neon Dashboard → onglet **Branches** → ton compute. Quand personne ne joue (et que tous les onglets Nexus sont fermés ou cachés), le statut doit passer en **"Idle"** ou **"Suspended"** après ~5 min sans requête. Si tu le vois "Active" en permanence malgré un onglet fermé, c'est qu'autre chose hit la DB (cron, autre service).

---

## Autres optimisations repérées mais NON implémentées

À traiter dans une session dédiée si besoin :

### #1 — God-table `GamebookProgress` lue sans `select`
**Constat** : 89 `findUnique`/`findFirst` sur cette table sans `select`. Chaque requête rapatrie les 130 colonnes (dont JSON volumineux : `flags`, `history`, `inventory`, `activeBattle`, `tamagotchi`, etc.). Un `findUnique` typique transfère **~5-15 KB** au lieu des ~200 octets réellement nécessaires.

**Gain estimé** : ajouter `select: { mapId, posX, posY, ... }` aux routes chaudes (state, spend, take-fruit, daemon/battle/*) réduirait le **data transfer de 60-80%**.

**Risque** : moyen — chaque route a ses propres besoins, certains lisent un seul champ et n'utilisent pas le reste. À auditer route par route.

### #2 — Fusionner les 3-4 lectures de `GamebookProgress` dans GET `/state`
**Constat** : `GET /state` fait actuellement :
1. `findUnique` initial
2. `ensureCreatorBootstrap` → re-update (qui re-lit après update)
3. `ensureDaemonForTamagotchi` → re-lit potentiellement
4. Autoheal franssJoke → potentiellement re-update

→ 3-4 round-trips DB pour UN seul GET `/state`.

**Gain estimé** : passer à 1 seule lecture + 1 seule update conditionnelle = ~70% de compute en moins sur cette route. Mais c'est la route la plus complexe du Nexus — refactor risqué.

### #3 — Borner `history` (JSON non-borné)
**Constat** : le champ `GamebookProgress.history` est append-only sans cap. Sur des comptes anciens, il peut faire plusieurs centaines de KB, ce qui alourdit chaque lecture (même avec `select`).

**Gain estimé** : 10-30% de data transfer si on cap à N derniers events. Faible risque côté code, mais nécessite migration des comptes existants pour trimmer.

### #4 — Supprimer les 10+ GET `/state` redondants côté client
**Constat** : voir Fix 2 limite assumée.

**Gain estimé** : compute marginal mais transfer ~5-10%. Audit route par route.

### #5 — Réduire encore le polling Pusher fallback
**Constat** : actuellement 60s. Pour 8 joueurs qui se croisent rarement en simultané (le créateur l'a confirmé), on pourrait passer à 5 min — voire désactiver complètement le polling fallback et compter uniquement sur Pusher.

**Gain estimé** : marginal si Pusher reste activé, important si Pusher tombe en panne (mais c'est rare).

---

## Décisions à prendre ensuite

- **Branche Neon dev séparée** : éviter que `npm run dev` local hit la prod DB et bouffe le quota. À configurer dans Neon Dashboard.
- **Bornage `history`** : décider d'une politique (50 derniers events ? 200 ?).
- **Audit route par route pour `select`** : prioriser les 5-10 routes les plus chaudes (state, spend, players, daemon/list, take-fruit).

---

*Fin FIX_NEON_RECAP.md*
