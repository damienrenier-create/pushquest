# COMPTE_TEST_SPEC.md

> Spécification du compte test "God Mode" via panneau testeur intégré.

---

## 1. Principe directeur

- Le compte tester est **un compte joueur normal**.
- Toutes les contraintes du jeu s'appliquent (énergie, cooldowns, gating).
- Un **panneau testeur séparé** (overlay UI) permet d'ajuster l'état en cours de jeu.
- **Aucune logique métier (PNJ, dialogues, shops, combats) n'est modifiée** pour reconnaître le compte test.
- Toutes les actions du panneau passent par des **routes API dédiées** `/api/admin/tester/*`, protégées par vérification `isTester === true`.

---

## 2. Conditions préalables (déjà en place dans le repo)

| Élément | Statut |
|---|---|
| Colonne `User.isTester Boolean @default(false)` | ✅ Existe dans `prisma/schema.prisma` |
| Compte GUIGUI marqué `isTester=true` | ✅ Créé via `scripts/init-guigui.ts` |
| Logique existante v3.32 (reset à login + bonus surplus initial) | ✅ Conservée (le créateur peut la désactiver via env var `GUIGUI_LOGIN_ENABLED`) |

**Pas de migration Prisma nécessaire pour cette mission.**

---

## 3. Architecture choisie : Option B (panneau intégré)

- Bouton flottant 🧪 visible **uniquement** si `session.user.isTester === true`
- Overlay au-dessus du `MapClient` sans le démonter
- 7 onglets : Ressources / Temps / Flags / Téléport / Combat / Snapshots / Logs
- Routes API sous `/api/admin/tester/*`, protégées par `requireTester()`

---

## 4. Détail des outils

### A. Ressources
- **Boutons rapides** : `-100 / -50 / -10 / +10 / +50 / +100 / +500` énergie
- **Bouton Reset** : `bonusSurplus = 0`, `energySpentToday = 0` (récup totale)
- **Affichage temps réel** : `todayReps`, `energySpentToday`, `bonusSurplus`, `availableEnergy`

### B. Temps
- **timeOfDay forcé** : pas implémenté en V1 (pas de notion `timeOfDay` côté serveur — sera ajouté si besoin)
- **Simuler passage à minuit** : POST `/api/admin/tester/time` avec `{ skipToMidnight: true }` → reset des champs daily (`energySpentDate`, `casinoBetsDate`, etc.)
- **Avancer de N heures** : pour reproduire bugs temporels (ex. bonus minuit #156)

### C. Flags
- **Liste complète** : 42 booléens du `GamebookProgress`
- **Toggle individuel** : POST `/api/admin/tester/flag` `{ flagName, value }`
- **Filtres** : par zone (Bourg, Pépiteville, Tour, Macaron, Muscuville, Pastagone, Vegas)
- **Recherche** : input simple

### D. Téléportation
- **Liste mapId + spawn par défaut** : déduite de `MAPS` array
- **POST `/api/admin/tester/teleport`** : `{ mapId, posX, posY, direction }`
- **Favoris** : localStorage côté client (pas de DB pour v1)

### E. Reset combat
- **POST `/api/admin/tester/reset-battle`** : set `Daemon.activeBattle = null` pour tous les Daemons du tester

### F. Reset sélectif
- **POST `/api/admin/tester/reset-arc`** : `{ arc }`
  - `intro` : reset onboarding flags
  - `pastagone` : reset tous les `pastagone*`
  - `pullman` : reset Vegas tour flags
  - `muscuville` : reset champions + contests
  - `macaron` : reset Macaron'île flags
- **POST `/api/admin/tester/reset-full`** : reset complet (équivalent du reset login déjà existant)

### G. Logs verbose
- **GET `/api/admin/tester/logs`** : retourne les 100 derniers `XpAdjustment` + `CoinAdjustment` du tester. Pas de table dédiée GamebookEvent (le créateur a dit non).
- Affichage en console côté UI avec filtres simples.

### H. Snapshots
- **POST `/api/admin/tester/snapshot`** : sérialise `GamebookProgress + Daemon` du tester en Json, stocke dans... **localStorage** côté client pour v1 (pas de table DB).
- **GET** : retourne le snapshot stocké
- **PUT** : restore snapshot
- **DELETE** : supprime snapshot

---

## 5. Raccourcis clavier

| Touche | Action |
|---|---|
| `T` | Ouvre/ferme le panneau testeur |
| `L` | Onglet Logs |
| `F` | Onglet Flags |
| `E` | +50 énergie (raccourci) |
| `R` | Reset combat |
| `G` | Onglet Téléport |

Les raccourcis sont actifs **uniquement** si le panneau peut être affiché (compte tester).

---

## 6. Sécurité

- Toutes les routes `/api/admin/tester/*` commencent par :
  ```ts
  const ok = await requireTester(req)
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  ```
- `requireTester` vérifie `session + user.isTester === true`.
- Aucune route ne peut être appelée par un compte non-tester.

---

## 7. Choix de design assumés (V1)

- **Snapshots en localStorage** (pas en DB) : suffit pour 1 tester, évite une table.
- **Pas de table `GamebookEvent`** : conforme à la décision créateur Q-B.
- **Pas de `timeOfDay` global** : non implémenté côté serveur, donc skip.
- **`reset-full` réutilise la logique existante** (`gamebookProgress.deleteMany`) déjà dans auth.ts.
- **Le panneau ne désactive PAS la logique `isTester` existante** (reset login, bonus surplus initial). Le créateur peut désactiver via `GUIGUI_LOGIN_ENABLED=false`.

---

## 8. Différences avec brief original

| Brief original | Implémenté V1 | Raison |
|---|---|---|
| Migration Prisma `isTester` | ❌ skip | Existe déjà |
| Marquer compte test | ❌ skip | GUIGUI déjà marqué |
| `timeOfDay` forced | ❌ skip | Pas de notion serveur |
| Snapshots en DB | ⚠️ localStorage | Simplicité |
| Logs verbose append-only | ⚠️ lecture XpAdjustment/CoinAdjustment | Conforme Q-B |
| Reste | ✅ implémenté | — |

---

## 9. Sortie attendue

À la fin de cette mission, le créateur doit pouvoir :
1. Se connecter avec GUIGUI (`GUIGUI_LOGIN_ENABLED=true` en `.env.local`)
2. Voir un bouton 🧪 flottant
3. Appuyer dessus pour ouvrir le panneau
4. Tester chaque outil
5. Reproduire le bug bonus minuit en quelques clics (cf. AUDIT_JOUEUR_11_TEMPS #157)

---

*Fin COMPTE_TEST_SPEC.md*
