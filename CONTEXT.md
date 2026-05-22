# CONTEXT.md — Pour Claude Code et tout assistant IA travaillant sur PushQuest

> **À LIRE EN PREMIER avant toute modification.**
> Ce fichier est la mémoire persistante du projet. Il décrit l'architecture complète, les conventions, les pièges connus, et la roadmap.

---

## 🎯 Qu'est-ce que PushQuest ?

PushQuest est une **app web de gamification fitness pour un groupe privé de ~7 amis**. Elle est en production sur Vercel depuis plusieurs mois et contient ~40 000 XP et ~40 000 reps accumulés. **Le projet est mature, pas un greenfield.**

L'app combine plusieurs systèmes :
- **Tracking d'exercices** quotidien (pompes, squats, gainage, tractions, cardio)
- **Système de badges compétitifs** (Headhunters, Pharaon, etc.)
- **Système de paris** entre joueurs
- **Système de coins / cagnotte / amendes**
- **Place publique (wall)** pour partager des messages
- **Workouts spéciaux** (La Grande Pyramide, etc.)
- **Mini-jeu Gamebook** (style Pokémon Red, accessible via `/gamebook`)
- **Quota modifiers** : événements qui modifient les objectifs quotidiens
- **Certificats médicaux** : système pour les arrêts maladie

**LE GAMEBOOK N'EST QU'UNE SOUS-PARTIE DU PROJET.** La majorité des features sont indépendantes du Gamebook.

---

## 🧱 Stack technique

| Composant | Version |
|---|---|
| Framework | Next.js 16.1.6 (App Router + Turbopack) |
| Frontend | React 19, TypeScript 5, Tailwind CSS 4 |
| ORM | Prisma 5.22.0 |
| DB | PostgreSQL via Neon (serverless, cluster eu) |
| Auth | NextAuth 4.24 (Credentials provider) |
| Realtime | Pusher Channels (cluster eu, plan Sandbox) |
| Hosting | Vercel (plan Hobby) |
| Icons | lucide-react |
| Crypto | bcrypt + bcryptjs |

**Baseline TypeScript** : `npx tsc --noEmit` produit **47 erreurs pré-existantes**. **NE JAMAIS DÉPASSER 47.** Si une modification ajoute des erreurs, c'est un bug à corriger.

---

## 📋 Pages de l'app

| Route | Description |
|---|---|
| `/` | Dashboard principal (logged) ou redirection login |
| `/login` | Page de connexion |
| `/register` | Inscription (limitée aux invitations) |
| `/profile` | Profil de l'utilisateur connecté |
| `/profile/badges` | Détail des badges du user |
| `/u/[nickname]` | Profil public d'un autre joueur |
| `/pantheon` | Hall of Fame : Journal de Gloire + Badges + Possessions |
| `/leaderboard` | Classement global des joueurs |
| `/trophies` | Tableau des Chasseurs + Médailles & Milestones |
| `/faq` | Catalogue de tous les badges avec descriptions |
| `/wall` | Place publique (messages des joueurs) |
| `/album` | Galerie photos (à vérifier) |
| `/admin` | Interface admin (réservée admins) |
| `/workouts/[slug]` | Pages des workouts spéciaux (ex: La Grande Pyramide) |
| `/gamebook` | Mini-jeu Pokémon-like |

---

## 🛣️ Routes API (65 au total)

### Auth (5)
- `/api/auth/[...nextauth]` : NextAuth handler
- `/api/auth/register` : inscription
- `/api/auth/switch` : changement d'utilisateur (mode dev)
- `/api/auth/switch-ego` : alter ego mode

### Admin (8)
- `/api/admin/add-set` : ajouter manuellement un set
- `/api/admin/delete-set` : supprimer un set (⚠️ déclenchera le futur anti-cheat v3.6)
- `/api/admin/edit-set` : éditer un set
- `/api/admin/delete-fine` : supprimer une amende
- `/api/admin/delete-user` : supprimer un user
- `/api/admin/force-badges` : recalcul forcé des badges
- `/api/admin/update-user` : modifier un user
- `/api/admin/bets/[betId]/correct-odd` : ajuster les cotes d'un pari

### Badges (6)
- `/api/badges/featured` : badge à l'honneur (rotation hebdo)
- `/api/badges/possession` : qui détient quoi
- `/api/badges/react` : réagir à un badge
- `/api/badges/stolen` : badges volés récemment
- `/api/badges/events/[eventId]/like` : liker un event de badge
- `/api/user/badges/[nickname]` : badges d'un user spécifique

### Bets / Paris (10)
Toute la gestion des paris entre joueurs. Voir `/api/bets/*` et `/api/admin/bets/*`.

### Dashboard (3)
- `/api/dashboard` : data principale
- `/api/dashboard/quick` : data rapide (cached)
- `/api/dashboard/progression` : graphes de progression

### Gamebook (7 — système temps réel multijoueur)
- `/api/gamebook/state` : GET/POST état du joueur (position, phase, flags)
- `/api/gamebook/players` : positions des autres joueurs (snapshot)
- `/api/gamebook/spend` : débit d'énergie (v3.4a, source de vérité serveur)
- `/api/gamebook/grant-gym-energy` : récompense BUFFY (+100 reps, idempotent)
- `/api/gamebook/bridge` : défis PNJ du pont + claim badge Pionnier
- `/api/gamebook/broadcast` : publier event Pusher (v3.4b)
- `/api/gamebook/pusher-auth` : auth canaux privés Pusher (préparé, pas utilisé)

### Workouts spéciaux (2)
- `/api/workouts/special` : entry pour workout spécial
- `/api/workouts/special/ranking` : classement

### User (10)
Voir tous les `/api/user/*` pour gérer profil, badges, certifs médicaux, status, stats.

### Autres
- `/api/pushups` : enregistrer un set (POST) ou supprimer (DELETE) ⚠️ point d'entrée principal
- `/api/wall` + `/api/wall/alerts` : messages de la place publique
- `/api/status` : status des users
- `/api/coins` : balance de coins
- `/api/quota-modifiers` : modifs de quotas
- `/api/cron/bets-check` : cron pour résoudre les paris
- `/api/challenge/sally` : challenge spécial Sally
- `/api/logs/save` + `/api/logs/today` : logs d'activité
- `/api/users/list` : liste users (pour mentions, etc.)
- `/api/dev` + `/api/dev/reset` : routes dev (à ne PAS toucher en prod)

---

## 🗄️ Modèles Prisma (25 au total)

| Modèle | Rôle |
|---|---|
| `User` | Utilisateurs (email, password, nickname, niveau, isSystem, etc.) |
| `GlobalConfig` | Config globale clé/valeur (featuredBadgeKey, etc.) |
| `ExerciseSet` | Sets d'exercices quotidiens (CŒUR DU TRACKING) |
| `FineRecord` | Amendes pour quotas non atteints |
| `MonthlyChallengeEntry` | Entries des challenges mensuels |
| `MedicalCertificate` | Certificats médicaux (arrêts) |
| `PotEvent` | Événements de la cagnotte/pot commun |
| `BadgeDefinition` | Définitions des badges (synchronisé via initBadges) |
| `BadgeOwnership` | Qui détient quel badge (singleton par badge) |
| `BadgeLike` | Likes sur badges |
| `BadgeEvent` | Événements de badges (vols, attributions, UNIQUE_AWARDED) |
| `BadgeEventLike` | Likes sur events |
| `WallMessage` | Messages de la place publique |
| `UserStatus` | Status courts des users |
| `StatusLike` | Likes sur status |
| `XpAdjustment` | Ajustements XP (bonus, malus, récompenses) — `date` obligatoire |
| `SpecialWorkoutEntry` | Entries workouts spéciaux |
| `Bet` + `BetEntry` + `BetEvent` + `BetEventLike` + `BetResult` | Système de paris complet |
| `CoinAdjustment` | Ajustements de coins |
| `QuotaModifier` | Modifs de quotas quotidiens |
| `GamebookProgress` | État du joueur dans le Gamebook (position, flags, énergie consommée, etc.) |

**Schéma complet** : `prisma/schema.prisma`

---

## ⚠️ Conventions critiques

### 1. NE JAMAIS dépasser 47 erreurs TypeScript
La baseline du projet est 47 erreurs `npx tsc --noEmit`. Après chaque modification :
```bash
npx tsc --noEmit 2>&1 | wc -l   # doit afficher 47
```

### 2. Migrations Prisma : ADDITIVE uniquement
La DB contient ~40k XP et ~40k reps. **AUCUNE migration destructive.**
- Toujours `migrate deploy` (jamais `migrate dev` en prod)
- Toujours `ADD COLUMN ... DEFAULT ...` pour les nouveaux champs
- JAMAIS `DROP COLUMN`, `DROP TABLE`, `DELETE FROM` en masse
- Tester sur Neon en branche avant la prod si possible

### 3. Comptes système (isSystem: true)
Le compte test `test_sartay@local.dev` (et autres) a `isSystem: true`. Ces comptes :
- N'apparaissent pas dans les classements
- Ne broadcastent pas sur Pusher
- Doivent être exclus des comptages compétitifs

### 4. XpAdjustment.date OBLIGATOIRE
Quand on crée un `XpAdjustment`, le champ `date` (string YYYY-MM-DD) est obligatoire. Utiliser `getTodayISO()` de `src/lib/challenge.ts`.

### 5. BadgeEvent pattern UNIQUE_AWARDED
Pour les badges à plusieurs détenteurs (genre easter eggs, "premier 50 pompes"), on n'utilise PAS `BadgeOwnership` (singleton). On crée des `BadgeEvent` avec `eventType: "UNIQUE_AWARDED"`. Le composant Journal de Gloire les affiche automatiquement.

### 6. NextAuth
Toutes les routes protégées utilisent `getServerSession(authOptions)`. L'userId est dans `session.user.id`.

### 7. Pusher (multijoueur Gamebook)
Variables d'env Vercel configurées :
- `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`
- `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`

Le code a un **fallback gracieux** : si les vars ne sont pas configurées, on tombe en polling 30s. Voir `src/lib/pusher.ts` et `src/lib/pusher-client.ts`.

### 8. Énergie du Gamebook
Source de vérité serveur = `GamebookProgress.energySpentToday` + `GamebookProgress.energySpentDate`. Le client appelle `/api/gamebook/spend` pour débiter. Reset auto à minuit (changement de date). Voir v3.4a.

---

## 🚨 Pièges connus

### Cold start Neon
Neon plan Hobby met la DB en veille après ~5 min d'inactivité. Les migrations Prisma peuvent timeout (P1002). Solution : réveiller la DB via Neon Console avant migration.

### initBadges() upsert
Au démarrage du serveur, `src/lib/badges.ts` exécute `initBadges()` qui fait des `upsert` sur tous les `BADGE_DEFINITIONS`. C'est volontaire — ça met à jour les métadonnées des badges sans toucher aux ownerships.

### Le Gamebook PNJ déterministe
Les PNJ baladeurs (JOJO dans Bourg-Boulette) ont des positions calculées de manière **déterministe** côté client via `Mulberry32` seedé par leur ID + timestamp. Tous les joueurs voient les mêmes positions au même instant SANS DB. Si tu veux changer leur fréquence, modifie `WANDER_TICK_MS` dans `src/lib/gamebook/npcs.ts`.

### Fichiers à ne JAMAIS toucher sans validation explicite
- `src/lib/auth.ts` (auth NextAuth)
- `src/lib/prisma.ts` (instance Prisma)
- `src/lib/badges.ts` (moteur de recalcul des badges)
- `src/app/api/auth/[...nextauth]/route.ts`
- Toute migration déjà appliquée dans `prisma/migrations/`

### "Améliorations" non demandées
Ne pas refactoriser le code "pour l'améliorer". Le code actuel marche, les conventions sont volontaires. Si une chose te paraît bizarre, **demande** avant de modifier.

---

## 📜 Historique des patches (Gamebook)

| Version | Date | Description |
|---|---|---|
| v3.0 | ~mai 2026 | Bourg-Boulette + intro Monstre Spaghetti + carte Pokémon-like |
| v3.1 | mai 2026 | Route 1 + Pont Pépite d'Azuria avec 4 PNJ (POMPO, SQUATTO, GAINAX, CHAMPIO) |
| v3.2 | mai 2026 | Intégration badge Pionnier (FAQ, Panthéon, Trophées, Journal de Gloire). Nouvelle rareté EASTEREGG. |
| v3.3 | mai 2026 | Entrée auto bâtiments + 2 types PNJ (interceptor/interactive) + BUFFY (muscu) + JOJO (chercheur d'animal) |
| v3.4a | mai 2026 | **FIX CRITIQUE** énergie persistante (avant : F5 = énergie revenue) |
| v3.4b | mai 2026 | WebSocket Pusher (positions temps réel + cinématiques broadcast) |
| v3.5 | mai 2026 | Refonte pont (5 cases de large + cours d'eau bleus) + zigzag PNJ + ligne de vue + arbre stylisé + vaincu = pour toujours |

---

## 🚧 Roadmap restante

### v3.6 — Anti-triche suppression de sets
**Trigger** : user supprime un set via `/api/admin/delete-set` ou `/api/pushups` (DELETE)
**Action** : reset position à Bourg-Boulette + reset flags Route 1 (`treeObstacleCleared`, `bridgePnjDefeated`, `pioneerBadgeAwarded`) + bloquer mouvements 24h
**Nouveau champ DB nécessaire** : `gamebookFrozenUntil DateTime?` dans `GamebookProgress`

### v3.7+ — Mécanique animal de compagnie
**Concept** : retrouver l'animal disparu de JOJO → tous les joueurs reçoivent un animal de compagnie correspondant à leur niveau XP → renomable → suit le joueur partout
**Gros chantier** : système de follower sprite, table `Pet`, lien dynamique avec XP

### Autres idées en stock
- Présence Pusher (qui est en ligne en temps réel)
- Texte d'interpellation personnalisé par PNJ du pont
- Animation "!" au-dessus d'un PNJ qui interpelle
- Carte étendue après le pont (zone nord du pont)

---

## 👤 Acteurs du projet

- **Sartay** : créateur, product owner, décide de tout
- **Claude (assistant)** : conseil narratif + technique, code
- **Antigravity (Gemini)** : ancien agent d'application des patches (peut être abandonné au profit de Claude Code direct)

---

## 🎮 Le Gamebook en bref

Le Gamebook est un mini-jeu Pokémon Red accessible via `/gamebook`. Le joueur incarne un personnage qui :
1. Se réveille à **Bourg-Boulette** (carte principale)
2. Doit traverser les hautes herbes (côté nord) pour rencontrer le **Monstre Spaghetti** dans sa cave
3. Après l'intro, peut explorer **Route 1** au nord
4. Doit pousser un **arbre obstacle** (150 reps) pour atteindre le **Pont Pépite d'Azuria**
5. Sur le pont, 4 PNJ en zigzag : POMPO, SQUATTO, GAINAX, CHAMPIO (défis : 100 reps de chaque type, sauf CHAMPIO qui demande d'être TOP REPS de la veille)
6. Récompenses : badge **Pionnier** (200 XP, easter egg)
7. Au sud de Bourg-Boulette : **Salle de Muscu** (BUFFY donne +100 reps une fois après l'intro Monstre)

Énergie : 1 case = 10 reps (variable selon contexte). Reset énergie consommée à minuit.

---

## 🛡️ Règle d'or pour les modifications

**TOUJOURS** :
1. Lire le fichier complet avant de le modifier
2. Faire un plan avant de toucher au code
3. Demander confirmation avant les modifications destructives
4. Lancer `npm run build` après chaque modification pour vérifier les 47 erreurs baseline
5. Préserver la rétrocompatibilité des données existantes (40k+ XP en jeu)

**JAMAIS** :
1. Modifier le schéma sans migration additive
2. Renommer des champs DB existants
3. Toucher à `auth.ts`, `prisma.ts`, `badges.ts` sans demande explicite
4. "Refactoriser" du code qui marche sans demande explicite
5. Supprimer des fichiers sans demande explicite

---

Dernière mise à jour : v3.5 déployée en prod, mai 2026.
