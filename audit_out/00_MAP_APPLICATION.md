# 📍 MAP_APPLICATION.md — Cartographie du module Nexus

*Phase 0 — Audit chirurgical Nexus. Pas de modification de code.*

---

## 1. Périmètre couvert

Le module **Nexus** (alias *gamebook*) regroupe :

| Catégorie | Chemin racine | Volume |
|---|---|---|
| Composants UI client | `src/app/gamebook/` | 36 fichiers, ~14 000 lignes |
| Routes API serveur | `src/app/api/gamebook/` | 95 fichiers |
| Bibliothèques métier | `src/lib/gamebook/` | 23 fichiers, ~9 700 lignes |
| Catalogue items | `src/lib/gamebook/items.ts` + `src/config/badges.ts` | 2 fichiers |
| Routes admin liées | `src/app/api/admin/rescue-player/` | 1 route |
| Migrations Prisma | `prisma/migrations/` (filtre Nexus) | ~22 migrations |
| Models Prisma | `prisma/schema.prisma` | 4 modèles directs + 3 satellites |
| Scripts utilitaires | `scripts/audit-doors.mjs` | 1 fichier |

**Hors périmètre** mais utilisés en lecture : `src/lib/xp.ts` (XP_ANIMALS, getLevelDetails), `src/lib/badges.ts` (BADGE_DEFINITIONS, recalc), `src/lib/challenge.ts` (getTodayISO, daily reps), `src/lib/rewards.ts`.

---

## 2. Arborescence détaillée

### 2.1 Composants UI client — `src/app/gamebook/`

#### Point d'entrée Next.js
| Fichier | Lignes | Rôle |
|---|---:|---|
| `page.tsx` | 30 | Page Next.js `/gamebook` server-side. Récupère session + state initial + injecte `<GamebookClient>`. |
| `GamebookClient.tsx` | 230 | Wrapper SSR→client. Charge initial state, gère erreur d'hydration, monte MapClient. |

#### Orchestrateur monolithique
| Fichier | Lignes | Rôle |
|---|---:|---|
| `MapClient.tsx` | **5791** ⚠️ | Cœur applicatif client. Gère état joueur, mouvement, popups, cinematics, NPCs, broadcasts Pusher, tous les handlers `pressA`/`tryMove`, ouverture de TOUS les modals. **C'est le monolithe critique à refactoriser.** |

#### Composants tile / sprite
| Fichier | Lignes | Rôle |
|---|---:|---|
| `TileCell.tsx` | 1167 | Rendu visuel CSS d'une tile (~60 cas dans un switch déguisé). Accepte `overlayEmoji` pour les cages véto. |
| `PlayerSprite.tsx` | 122 | Sprite joueur (corps + direction + lunettes). |
| `MontVentouxSideView.tsx` | 309 | Vue de profil pseudo-3D du Mont (parallax 3 couches, route inclinée, cycliste animé). |
| `PiaffiniFlightScreen.tsx` | 156 | Cinématique plein écran du vol PIAFFINI. |
| `BlackScreen.tsx` | 66 | Écran noir transitoire. |
| `FrozenScreen.tsx` | 154 | Overlay anti-cheat (gel quand suppression de reps). |

#### Modales principales
| Fichier | Lignes | Rôle |
|---|---:|---|
| `StartMenu.tsx` | 133 | Menu START (SAC / DAEMON / RETOUR). Gating conditionnel sur `hasRecoveredDaemon`. |
| `InventoryModal.tsx` | 397 | Sac + actions sur items. |
| `ShopModal.tsx` | 337 | Shop générique paramétré par prop `shop` (10 vendeurs supportés). |
| `BibliothequeModal.tsx` | 377 | Bibliothèque Macaron/Muscuville avec topics navigables. |
| `TamagotchiModal.tsx` | 538 | Adoption + soin tamagotchi + boutons défis. |
| `DaemonTeamModal.tsx` | 445 | Équipe Daemon 6 slots + stats + items applicables (sérums/pierres). |
| `BattleModal.tsx` | 517 | Combat Pokémon-style (attaques/switch/sac/fuite). |
| `SaiyanLevelUpModal.tsx` | 275 | Répartition points stats après level-up Daemon. |
| `PlayerMapModal.tsx` | 181 | Mini-map mondiale (item map). |
| `TreeBookModal.tsx` | 109 | Pokédex des arbres. |
| `FastTravelModal.tsx` | 128 | Voyage rapide entre villes (désactivé v3.33). |
| `BestioleNamingModal.tsx` | 120 | Nommer les bestioles à la 1ʳᵉ rencontre. |

#### Modales jeux de hasard
| Fichier | Lignes | Rôle |
|---|---:|---|
| `CasinoModal.tsx` | 195 | Roulette rouge/noir Bourg & Pépiteville. |
| `CasinoPatternModal.tsx` | 278 | Roulette pattern Muscuville. |
| `CasinoPatternVegasModal.tsx` | 226 | Variante VIP Vegas. |
| `SlotMachineModal.tsx` | 117 | Machine à sous Vegas. |
| `LottoPouleModal.tsx` | 123 | Grille 4×4 Vegas. |
| `StopOuEncoreModal.tsx` | 183 | Stop ou Encore Vegas. |
| `CockfightModal.tsx` | 158 | Combat de coqs Vegas. |

#### Modales contexte Muscuville / Vegas
| Fichier | Lignes | Rôle |
|---|---:|---|
| `ArenaModal.tsx` | 163 | Arène Muscuville (4 champions + revanches). |
| `VideurModal.tsx` | 132 | Portier Arrabbiata du bar TB. |

#### Modales Pastagone v4.0
| Fichier | Lignes | Rôle |
|---|---:|---|
| `PastagoneCelluleModal.tsx` | 183 | Interrogatoire CARBONE (3 défis réels pompes/gainage/squats). |
| `PastagoneInfirmerieModal.tsx` | 94 | FUSILLI heal 50 reps / 3 fois/jour. |
| `PastagoneCuisineModal.tsx` | 167 | RIGATONI shop + énigme BOLOGNION. |
| `PastagoneArmurerieModal.tsx` | 130 | PESTO Jr wearables Daemon. |
| `PastagoneBriefingModal.tsx` | 194 | TAGLIA récap arc + défi boss + choix orphelin. |
| `PastagoneTourModal.tsx` | 188 | Tour de Garde (25 PNJ rotation + cooldown 30s). |

### 2.2 Routes API serveur — `src/app/api/gamebook/`

**95 routes**, regroupées par domaine.

#### État global & technique (6)
| Route | Verbe | Rôle |
|---|---|---|
| `state/route.ts` | GET / POST / DELETE | Source de vérité. GET retourne tout l'état joueur + autobootstrap créateur + auto-migration daemon. POST sauvegarde position/flags. DELETE reset. |
| `players/route.ts` | GET | Polling des autres joueurs visibles sur la même map. |
| `broadcast/route.ts` | POST | Diffuse events Pusher (cinematic:trigger). |
| `pusher-auth/route.ts` | POST | Auth Pusher. |
| `spend/route.ts` | POST | Dépense d'énergie ad-hoc (rarement appelée). |
| `travel/route.ts` | POST | Fast-travel entre villes. |

#### Tamagotchi (legacy v3.14 → v4.0) (8)
| Route | Rôle |
|---|---|
| `tamagotchi/adopt` | Adoption initiale chez V3T (snapshot vetFirstVisitLevel). |
| `tamagotchi/feed` | Nourrissage (déprécié au profit de feed-pates). |
| `tamagotchi/feed-pates` | Consomme corned_pates + heal happiness. |
| `tamagotchi/drink` | Consomme gourde + heal happiness. |
| `tamagotchi/check-defis` | Valide les 7 défis d'adoption. |
| `tamagotchi/liberer` | Officialise adoption (recovered=true) + badge animal totem. |
| `tamagotchi/in-bag` | Toggle "rangé dans le sac". |
| `tamagotchi/turn-talk` | Animal follower interactif (dialogues random). |
| `tamagotchi/use-serum` | Sérum intelligence (v3.24d — *attention au doublon avec daemon/use-serum*). |
| `v3t/talk` | Commentaire dynamique V3T (déprécié de fait par dernier commit). |

#### Daemon v4.0 (14)
| Route | Rôle |
|---|---|
| `daemon/list` | Liste équipe (jusqu'à 6 slots) avec stats enrichies. |
| `daemon/public-list` | Liste publique recovered=true (utilisée par cages véto). |
| `daemon/reorder` | Réordonne slots (set leader). |
| `daemon/feed` `daemon/drink` `daemon/heal` `daemon/in-bag` | Actions de base. |
| `daemon/use-serum` | Active unlockedAt (créateur ou Phase 4 mafia). |
| `daemon/evolve` | Pierre d'évolution (change type). |
| `daemon/boost-stat` | Sérum permanent (+5 stat). |
| `daemon/equip-item` `daemon/unequip-item` | Wearables. |
| `daemon/allocate-points` | Saiyan points → bonus[X]. |
| `daemon/battle/start` `daemon/battle/action` `daemon/battle/use-item` | Combat. |

#### Pastagone v4.0 (12)
| Route | Rôle |
|---|---|
| `pastagone/capture` | Cinématique arrestation → cellule. |
| `pastagone/interrog-defi` | Validation 1 des 3 défis (pompes/gainage/squats). |
| `pastagone/infirmerie-heal` | FUSILLI. |
| `pastagone/cuisine-puzzle` | Énigme BOLOGNION 3 steps. |
| `pastagone/tour-rotate` `pastagone/tour-battle` | Tour de Garde. |
| `pastagone/coulter-battle` `pastagone/capolino-mid-battle` `pastagone/boss-battle` | Mini-bosses + boss. |
| `pastagone/faa-gift` | One-shot +100 reps. |
| `pastagone/orphan-choose` | Choix Anguillzap/Faucotron/Octopsy + ciné CAPOLINO fuite. |
| `pastavegas/shoptower-climb` | Stairs Tour Pullman. |

#### Cinématiques & one-shots narratifs (10)
| Route | Rôle |
|---|---|
| `grant-bag` | PEPITO / MAMAN offrent le sac. |
| `grant-gym-energy` `grant-durum-energy` | Récompenses one-shot reps. |
| `piaffini/rescue` | Sommet Tour → badge Sauveur. |
| `mont/summit-reached` | Sommet Mont → badge Conquérant. |
| `bridge/route.ts` | Pont Azuria + 5 PNJ + badge Pionnier + badge Star. |
| `franss-joke` | Easter egg Franss. |
| `monstre/grant-amulette` | Cadeau Monstre. |
| `grass-sud-cutscene` | Cutscene grass_sud. |
| `nageur/defi` | Défi Nageur. |
| `painting/papa-boost` | Tableau papa tour. |

#### Shops (3)
| Route | Rôle |
|---|---|
| `shop/buy` | Achat unifié pour 10 vendeurs (filtre par availableAt). |
| `shop/info` | Info contextuelle pour `lastShopPurchase`. |
| `take-fruit` | Cueillette arbres fruitiers (~10 types). |

#### Inventaire (2)
| Route | Rôle |
|---|---|
| `inventory/use` | Use d'item (corned_pates, gourde, baskets, etc.). |
| `arrosoir/use` | Arrosoir → fait repousser fruit. |

#### Casinos (8)
| Route | Rôle |
|---|---|
| `casino/bet` `casino/croupier-talk` `casino/coin-found` | Roulette Bourg/Pépite. |
| `casino/pattern-spin` `casino/pattern-vegas-spin` | Roulette pattern Muscuville/Vegas. |
| `casino/slot` `casino/cockfight` `casino/lotto-poule` `casino/stop` | Jeux Vegas additionnels. |

#### Muscuville (4)
| Route | Rôle |
|---|---|
| `muscuville/champion` | 4 champions (1ʳᵉ + revanche). |
| `muscuville/interpellator-talk` | Réceptionniste arène. |
| `muscuville/rocks-pay` | Rochers de sortie ouest (4000 reps modulés). |
| `veto-muscu/heal` | Vétérinaire Muscuville. |
| `biblio-muscu/talk` | Bibliothécaire (donne TreeBook). |
| `arena/fight` | Combat champion exo. |

#### Macaron'île (3)
| Route | Rôle |
|---|---|
| `biblio/gift-tree-book` | Don du TreeBook (déplacé Muscuville). |
| `jardinier/talk` `jardinier/check` | BASILICO mission fruits. |
| `ornithologue/talk` | +50 reps si animal=oiseau. |

#### Team Boulette (Vegas) (7)
| Route | Rôle |
|---|---|
| `tb/videur` `tb/sbire` `tb/jamie` `tb/pesto` `tb/brute` | Sous-fifres. |
| `tb/validate-challenge` | Défis du bar. |
| `tb/boss` | Boss IL CAPO. |

#### Divers (5)
| Route | Rôle |
|---|---|
| `water/attempt` `water/push` `water/jojo-push` | Canal coopératif. |
| `bestiole/encounter` | Hautes herbes du sud. |
| `tower/climb` | Tour des Pâtes Aiguës (gate exercices). |
| `tree/discover` | Découverte Pokédex arbres. |
| `team/captain-bonus` | Bonus capitaine d'équipe. |
| `contest/defi` | Défis intersalle Muscuville. |
| `luck/talk` | LINGUINI chance. |
| `hotel/sleep` | Hôtel Vegas. |
| `guigui/recharge` | Recharge GUIGUI (compte test). |

### 2.3 Bibliothèques métier — `src/lib/gamebook/`

| Fichier | Lignes | Rôle |
|---|---:|---|
| `engine.ts` | 218 | Logique de jeu pure (intro Monstre, transitions). À auditer pour clarifier vs mapEngine. |
| `mapEngine.ts` | 578 | Mouvement (`tryComputeMove`), tiles bloquantes, entrées bâtiments, `INTERIOR_ENTRY_POSITIONS`. |
| `maps.ts` | **2812** ⚠️ | TOUTES les maps (32 maps construites in-code) + buildings + signs. Énorme monolithe. |
| `npcs.ts` | **2565** ⚠️ | TOUS les NPCs (~80+). Données + dialogues + interactions. Difficile à maintenir. |
| `items.ts` | 1018 | Catalogue items + capabilities + filtres shops. |
| `inventory.ts` | 223 | Parse/add/remove/hasIntactItem. Pur. |
| `dialogue.ts` | ? | Dialogues longs (cinématiques, monologues). |
| `daemon.ts` | ? | Stats Daemon, formules XP, computeMaxHp, Saiyan. |
| `battleState.ts` | ? | Transition combat (apply player action, status, vitesse). |
| `attacks.ts` | ? | ~30 attaques + STRUGGLE. |
| `combat.ts` | ? | Formule dégâts Gen 1, types matchups 10×10. |
| `pastagoneTourNpcs.ts` | 175 | Pool 25 PNJ Tour de Garde. |
| `tamagotchi.ts` | 388 | Logique tamagotchi (display, défis, recovered). |
| `happinessChanges.ts` | 71 | Deltas happiness (decay, gains). |
| `energy.ts` | 137 | Calcul `availableEnergy` côté serveur. |
| `creator.ts` | 96 | Bootstrap auto compte créateur. |
| `antiCheat.ts` | ? | Gel gamebook si suppression de reps. |
| `difficulty.ts` | ? | Ratio onboarding (jeunes joueurs paient moins). |
| `ratio.ts` | 177 | Probablement applyRatio (rabais). |
| `userLevel.ts` | 97 | Map level XP global → niveau Pokémon. |
| `teams.ts` | 57 | Captain bonus, équipes. |
| `casino.ts` `casinoBoost.ts` | ? | Calculs roulette + boost LINGUINI. |

### 2.4 Configuration

| Fichier | Rôle |
|---|---|
| `src/config/badges.ts` | 11 badges Nexus (parmi tous les badges PushQuest). |
| `src/lib/xp.ts` | XP_ANIMALS (100 entrées level→emoji) + `getLevelDetails`. |
| `src/lib/challenge.ts` | `getTodayISO`, daily target, ratios. |
| `src/lib/rewards.ts` | XP formulas globales (capture mensuelle). |

### 2.5 Migrations Prisma — `prisma/migrations/`

35 migrations au total, dont **22 liées à Nexus** (préfixe `*_v3_*` ou `*_v4_*`) :

| Date | Migration | Sujet |
|---|---|---|
| 20260520 | add_gamebook_progress | Initial GamebookProgress |
| 20260521 | v3_map | Champs map |
| 20260522 | v3_1_route1 | Route 1 |
| 20260524 | v3_23c_conquerant / v3_23c2_contest_defis / v3_24a_teams / v3_24b_casino_pattern / v3_3_npcs | Plusieurs ajouts simultanés |
| 20260525 | v3_23e_franss_joke / v3_23f_bonus_surplus / v3_23g_water_attempts / v3_23h_vet_first_visit / v3_4a_energy_spent | Polish |
| 20260526 | v3_6_anti_cheat / v4_0_active_battle / v4_0_daemon_unlocked / v4_0_pending_stat_points / v4_pastagone_progress | v4.0 day 1 |
| 20260527 | v4_capolino_mid_fuite / v4_pullman_coulter | v4.0 day 2 |
| 20260528-20260608 | pepiteville / fruits_boots / tower / piaffini / water / tamagotchi / luck / polish / bestioles / casino / fast_travel | Suite historique |

⚠️ **Note** : Les dates de migration `20260528+` ont des préfixes datés **après** les migrations `20260520-20260527`. C'est cohérent dans l'ordre alphabétique car le suffixe `vX_Y_*` ordonne par version logique, mais le format date suggère une réalité historique différente. À vérifier en phase 1.2.

### 2.6 Scripts utilitaires

| Fichier | Rôle |
|---|---|
| `scripts/audit-doors.mjs` | Vérifie INTERIOR_ENTRY_POSITIONS + exitTargets vs tile walkability. Réutilisable. |

---

## 3. Points d'entrée

### 3.1 Route page Next.js
- **`/gamebook`** → `src/app/gamebook/page.tsx` → `<GamebookClient>` → `<MapClient>`.

### 3.2 Routes API consommées par MapClient (extraits)
- `GET /api/gamebook/state` — load au mount + refresh régulier.
- `POST /api/gamebook/state` — chaque mouvement, chaque set de flag.
- `GET /api/gamebook/players` — polling autres joueurs (~10s).
- `POST /api/gamebook/broadcast` — events Pusher.
- ~80 autres endpoints invoqués selon interaction (talk NPC, shopCounter, etc.).

### 3.3 Déclencheurs serveur-side
- **`ensureCreatorBootstrap`** (state route ligne 56) — auto-flag piaffini/swim/swim_set pour comptes isSystem.
- **`ensureDaemonForTamagotchi`** (state route, via daemon.ts) — auto-création Daemon depuis tamagotchi Json.
- **Auto-set `vetFirstVisitLevel`** (state route ligne 117-135) — snapshot level à la 1ʳᵉ visite véto.
- **Tracking `totalGamebookSteps`** (state POST) — incrémenté à chaque mouvement.
- **Bootstrap badges PIAFFINI** (state route ligne 95-110) — auto-création XpAdjustment + BadgeEvent post-rescue.

### 3.4 Real-time
- **Pusher** : event `cinematic:trigger`, broadcast position joueurs. Channel `gamebook-{userId}`.

---

## 4. Dépendances inter-modules

### 4.1 Auth (next-auth)
- Toutes les routes API : `getServerSession(authOptions)` + extraction `userId`.
- Pas de session = 401.

### 4.2 Énergie globale
- **Source de vérité** : `ExerciseSet` (table all-time) → `getTodayReps(userId)` somme PUSHUP+SQUAT+PLANK/5+autres.
- **Énergie dépensée** : `GamebookProgress.energySpentToday` (reset minuit) + `bonusSurplus` (boost).
- **Énergie disponible** : `max(0, todayReps - energySpentToday + bonusSurplus)`.
- **Padding créateur** : `padAvailableEnergyForCreator()` impose floor 1000 reps.
- **Pas de transaction stricte** entre `ExerciseSet.reps` et `GamebookProgress.energySpentToday`.

### 4.3 Badges / XP système global
- `BadgeEvent` (UNIQUE_AWARDED) → trigger recalc via lib/badges.ts.
- `XpAdjustment` (table partagée avec tout PushQuest) — réaffichée dans timeline globale.
- 11 badges Nexus déclarés (cf. audit XP précédent).

### 4.4 Catalogues partagés
- `XP_ANIMALS` (lib/xp.ts) — mapping level→animal utilisé partout (tamagotchi display, daemon emoji, cages véto).
- `getUserLevelForGamebook` (lib/gamebook/userLevel.ts) — niveau Pokémon depuis XP global PushQuest.

### 4.5 Pusher (real-time)
- `lib/pusher-server.ts` + `lib/pusher-client.ts` (hors gamebook).
- Channel par utilisateur (broadcast cinematic).

---

## 5. Modèles Prisma utilisés par Nexus

### 5.1 Modèles directs (4)
| Modèle | Rôle | Champs critiques | Volume actuel (DB locale) |
|---|---|---|---|
| **GamebookProgress** | Un row par user (composite userId+chapterId="map_v3"). Position + 60+ flags narratifs + Json (tamagotchi, inventory, activeBattle). | mapId/posX/posY, hasBag, tbBossBeaten, pastagone*, tamagotchi, inventory, activeBattle | ~7 rows |
| **Daemon** | 1-N par user (slot 1-6 unique). Stats + bonheur + équipement + état combat. | speciesLevel, type, combatLevel, baseFor..baseEnd, currentHp, happiness, unlockedAt, equippedItems, attacksKnown | ~3 rows |
| **ExerciseSet** | Toutes les reps encodées (PUSHUP/SQUAT/PLANK/PULLUP/etc.). | exercise, reps, date, userId | massif |
| **XpAdjustment** | Toutes les attributions d'XP. | userId, amount, reason, date | massif |

### 5.2 Modèles satellites utilisés
| Modèle | Lien Nexus |
|---|---|
| **User** | id, nickname, isSystem, isTester (gating créateur). |
| **BadgeEvent** | UNIQUE_AWARDED pour les 11 badges Nexus. |
| **SpecialWorkoutEntry** | Pas direct, mais WOD défis à la carte (mémoire séparée). |
| **GlobalConfig** | `lastShopPurchase` (info contextuelle shop). |

### 5.3 Modèles totalement hors-périmètre (mais coexistent)
FineRecord, MonthlyChallengeEntry, MedicalCertificate, PotEvent, Bet/BetEntry/BetEvent/BetEventLike/BetResult, CoinAdjustment, QuotaModifier, BadgeOwnership, BadgeDefinition, BadgeLike, BadgeEventLike, WallMessage, UserStatus, StatusLike.

### 5.4 Relations
- `User 1 → 1 GamebookProgress` (via composite (userId, chapterId)).
- `User 1 → N Daemon` (slot unique par user).
- `User 1 → N ExerciseSet`.
- `User 1 → N XpAdjustment`.
- `User 1 → N BadgeEvent` (toUserId).

---

## 6. Observations préliminaires (sans complaisance)

### 6.1 🔴 Symptômes architecturaux préoccupants
1. **`MapClient.tsx` à 5791 lignes** = monolithe critique. Tout le client passe par là. Tout bug latent vivra ici. **À fragmenter avant tout autre refactor**.
2. **`maps.ts` à 2812 lignes** = monolithe données. Toutes les maps construites in-code, pas de séparation.
3. **`npcs.ts` à 2565 lignes** = même problème, ~80+ NPCs avec dialogues inline.
4. **Combinaison MapClient + maps + npcs ≈ 11 000 lignes** dans 3 fichiers. Le toucher = risque de régression sur l'ensemble du jeu.

### 6.2 🟠 Coexistence systèmes legacy/v4.0
- `tamagotchi` (Json sur GamebookProgress) ET `Daemon` (table relationnelle) cohabitent. L'auto-migration `ensureDaemonForTamagotchi` synchronise unilatéralement. **Double source de vérité = bug possible.**
- 2 routes `use-serum` : `tamagotchi/use-serum` (v3.24d sérum intelligence) et `daemon/use-serum` (v4.0 sérum Poussière). **Confusion possible.**

### 6.3 🟠 Migrations à date incohérente
Les migrations `20260528_*` jusqu'à `20260608_*` ont des dates **postérieures** aux migrations `20260526_v4_*` et `20260527_v4_*` qui ajoutent des champs récents (Pastagone, Coulter). Or alphabétiquement, `20260528_pepiteville` s'applique APRÈS `20260527_v4_pullman_coulter`. Si on regarde la sémantique, Pépiteville est *plus ancien* dans le jeu. **À auditer en phase 1.2 (database).**

### 6.4 🟡 Routes redondantes potentielles
- `grant-bag` vs cinematic pepitoBag : qui fait quoi ?
- `tamagotchi/feed` vs `tamagotchi/feed-pates` : la première est-elle morte ?
- `v3t/talk` désactivé de facto par le dernier commit (V3T NPC ouvre direct le modal) : à supprimer ou conserver ?

### 6.5 🟡 Trace narrative pas centralisée
Aucun fichier `flows.ts` ou `progression.ts` qui décrirait le parcours joueur. Le narratif est éparpillé : flags sur GamebookProgress, dialoguesAfterMacaronAwakened en NPC props, conditions inline dans MapClient. **Difficile d'auditer la cohérence narrative sans tout lire.**

### 6.6 🟡 Pas de tests automatisés détectés
Aucun fichier `*.test.ts` ou `*.spec.ts` dans le périmètre Nexus. Tout repose sur le test manuel. Pour un module de cette complexité, c'est un risque élevé.

### 6.7 ⚪ Volumétrie données client
À chaque GET `/api/gamebook/state`, le serveur renvoie ~80 flags + inventory Json + tamagotchi Json + activeBattle Json. **Aucune pagination, aucune normalisation, aucune compression.** À considérer pour la performance mobile.

---

## 7. Statistiques globales

| Indicateur | Valeur |
|---|---|
| Composants UI | 36 |
| Routes API | 95 |
| Modules libs | 23 |
| Modales | 26 (sur 36 composants UI) |
| Routes serveur tamagotchi (legacy) | 10 |
| Routes serveur Daemon (v4.0) | 14 |
| Routes Pastagone v4.0 | 12 |
| Migrations Prisma Nexus | 22 |
| Maps construites | 32 |
| NPCs définis | ~80 |
| Items au catalogue | ~30 |
| Lignes totales périmètre Nexus | ~24 500 |

---

## 🛑 Fin de Phase 0

J'ai terminé MAP_APPLICATION.md. Pas de modification de code apportée.

**Avant de passer à Phase 1.1 (AUDIT_01_CODE.md — Tech Lead / Audit Code & Architecture)**, dis-moi :

1. **Valide-tu le périmètre** (le module Nexus tel que cartographié, hors challenges quotidiens / classements / défis à la carte) ?
2. **Faut-il que j'ouvre chaque lib individuellement** pour préciser les rôles non clairs (engine.ts, dialogue.ts, daemon.ts, antiCheat.ts, etc.) avant d'attaquer l'audit code, ou tu fais confiance aux rôles inférés du nom ?
3. **Question méthodo** : pour l'audit code (phase 1.1), je vais devoir lire profondément les gros fichiers (MapClient 5791 lignes, maps 2812, npcs 2565). Tu préfères que je délègue cette lecture à un sous-agent `Explore` pour aller plus vite, ou je lis moi-même méthodiquement (plus lent mais plus précis) ?

J'attends ton go pour démarrer Phase 1.1.