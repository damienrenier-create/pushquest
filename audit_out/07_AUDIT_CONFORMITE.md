# AUDIT_07_CONFORMITE.md — Conformité / Sécurité / Anti-cheat

> **Périmètre** : Nexus / Gamebook subsystem  
> **Date** : 2026-05-27

---

## 1. Authentification

### 1.1 🟢 NextAuth sur toutes les routes

Chaque route mutative commence par `getServerSession(authOptions)` puis vérifie `session?.user?.id`. **Cohérent.**

### 1.2 🟡 Aucun rate limiting

Aucun middleware visible (next.config / `middleware.ts` à vérifier). Un attaquant authentifié peut spam-poster 1000 req/s sur `/spend`. Pas critique en dev, **dangereux en prod si quelqu'un voulait nuker l'énergie d'un pote** (impossible sans son auth) ou DDOS le Neon.

### 1.3 🔴 Pas de CSRF check explicite

NextAuth gère le CSRF pour ses propres routes mais les routes `/api/gamebook/*` ne semblent pas avoir de validation CSRF token explicite. À vérifier (Phase 1.8) — NextAuth peut le gérer transparently via cookie SameSite=Lax.

---

## 2. Autorisations

### 2.1 🟢 Le `userId` vient toujours de la session

Aucune route ne lit un `userId` depuis le body de la requête. ✅ Pas d'IDOR (Insecure Direct Object Reference).

### 2.2 🔴 `isCreator` / `isSystem` backdoors

`src/lib/gamebook/creator.ts` :
- `padAvailableEnergyForCreator` → énergie min 1000 pour `isSystem=true`
- `bridge/route.ts` : bypass tous les checks de défi
- `spend/route.ts` : `availableEnergy = Math.max(availableEnergy, 1000)`

**111 références à `isCreator/isSystem` dans les routes Nexus.** Toute personne avec `isSystem=true` en DB a des super-pouvoirs. **Si ce flag est jamais accidentellement activé sur un compte joueur, le balancing est cassé.**

→ Aligné avec Partie B du brief (compte test God Mode externe). C'est exactement ce que la Partie B veut **remplacer**.

### 2.3 🟢 `isSystem` exclu de classements

`bridge/route.ts:296` filtre `user: { isSystem: false }`. ✅ Bonne pratique pour ne pas polluer les leaderboards.

---

## 3. Anti-cheat

### 3.1 🟢 Freeze gamebook si suppression de reps (v3.6)

`isGamebookFrozen` + `gamebookFrozenUntil` : si un joueur supprime ses reps après avoir spend de l'énergie, le gamebook est gelé. ✅ Idée correcte.

### 3.2 🟠 La freeze n'est pas réversible côté joueur

Aucune route `/api/gamebook/unfreeze` côté joueur. Le créateur peut update en DB. Pour 7 potes, c'est gérable. **Mais** : si un joueur a 3-4 freeze par mois, son XP narrative s'éteint.

### 3.3 🔴 Aucune validation cryptographique des actions

Le client envoie « j'ai cliqué sur PNJ X, je veux le défi ». Le serveur fait confiance. Si un joueur ouvre la console et POST directement `/api/gamebook/piaffini/rescue`, est-ce qu'il rescue PIAFFINI sans avoir fait la tour ? **À vérifier (Phase 1.8).** Probablement oui pour certaines routes.

### 3.4 🔴 Aucun audit log des actions sensibles

Cf. Phase 1.2 §6.2. Si un joueur conteste ou si un autre est suspect de triche, **aucune trace serveur** pour départager.

---

## 4. RGPD

### 4.1 🟢 Cascade delete

`onDelete: Cascade` sur toutes les FK vers `User`. ✅ Conforme à l'effacement RGPD.

### 4.2 🟡 Aucune export/portabilité

Aucune route `/api/user/export` visible. Si un joueur demande son data, c'est manuel.

### 4.3 🟡 Aucune mention CGU/CGV in-game

Pas de gate « j'ai lu les conditions ». Pour 7 potes, OK. En cas d'élargissement → à prévoir.

---

## 5. Secrets

### 5.1 🟡 `.env` présent dans le repo (vu dans `ls`)

Le `.env` est dans le repo (`.gitignore` à vérifier). Si le fichier réel est tracké, c'est un leak. À confirmer (Phase 1.8).

### 5.2 🟢 `.env.example` séparé

Bonne pratique vue.

---

## 6. Conformité business

### 6.1 ⚪ Casino simulé sans argent réel

Pas de PSC, pas de question légale en France (pas de jeu d'argent au sens du code monétaire).

---

## 7. Synthèse criticité

| # | Constat | Criticité |
|---|---|---|
| 1 | Pas de rate limiting | 🟠 |
| 2 | CSRF à vérifier | 🟠 |
| 3 | 111 backdoors `isCreator` | 🔴 (= raison d'être de Partie B) |
| 4 | Validation actions sensibles côté serveur incomplète | 🔴 |
| 5 | Aucun audit log | 🔴 |
| 6 | Aucune export RGPD | 🟡 |
| 7 | `.env` tracké ? | 🟡 |

---
