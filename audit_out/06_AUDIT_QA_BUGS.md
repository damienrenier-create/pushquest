# AUDIT_06_QA_BUGS.md — QA Engineer

> **Périmètre** : Nexus / Gamebook subsystem  
> **Date** : 2026-05-27

---

## 1. Bugs connus / récents (extraits commit log)

| Commit | Bug | Statut |
|---|---|---|
| `b9a28cb` | shop_interior spawn sur sprite NUTRIPATES | ✅ Fixé |
| `b9a28cb` | MAMAN demande 2 talks pour le sac | ✅ Fixé |
| `b9a28cb` | Véto cages visual | ✅ Fixé |
| `b9a28cb` | "recovered gate" | ✅ Fixé |
| `706f20e` | Revanche Champion +800 XP annoncé mais 0 distribué | ✅ Fixé (capé à 200) |
| `78c9d18` | POST /state acceptait positions sur tiles bloquantes | ✅ Fixé (hardening) |
| `71b972d` | Portes (entry positions + exitTargets) incohérences | ✅ Fixé |
| Mémoire | Bonus minuit (pommiers, papa, capitaine…) perdus à minuit | 🔴 **Non fixé** |
| Phase 1.2 | Race condition energySpentToday (31 routes) | 🔴 **Non fixé** |

### 1.1 🔴 Le bug "bonus minuit" est documenté en mémoire mais pas planifié

Mémo Sartay : « les bonus gagnés (pommiers, papa, capitaine…) sont perdus à minuit. À fixer plus tard. » → **risque de frustration récurrente**. Si un joueur claim un bonus à 23h57, il perd tout à 00h00. Probable cause : un reset journalier touche `bonusSurplus` ou un flag de date confondu.

### 1.2 🔴 31 routes race-prone (cf. Phase 1.2 §4.2)

Symptôme observé concrètement : impossible à reproduire facilement, mais sur 7 joueurs en parallèle qui spam-cliquent, statistiquement il y a déjà eu des désynchros d'énergie. Aucune trace serveur pour le détecter.

---

## 2. Edge cases identifiés à risque

### 2.1 🔴 Reset journalier (minuit Paris)

11 champs stockent une date `String` (voir Phase 1.2 §2.2). À chaque rollover minuit, le code doit savoir :
- Reset `energySpentToday` ?
- Reset `casinoBetsToday` ?
- Reset `bonusSurplus` ?
- Reset `casinoBoostPctToday` ?
- Reset `slotMachinesPlayedToday` ?
- Reset `stopOuEncorePlaysToday` ?

Chaque route fait son propre check `if (storedDate !== today) reset`. **Aucune source unique de vérité.** Risque : oublier un reset, ou en faire deux à des moments différents (cf. bug bonus minuit).

### 2.2 🔴 Concurrence multi-onglets

Un joueur avec 2 onglets ouverts → 2 sessions partagent la même DB. Aucune protection. Si onglet A spend 50 et onglet B spend 50 simultanément, énergie peut sauter à -10 ou rester à 100 (selon ordering DB).

### 2.3 🟠 Crash en plein combat = état `activeBattle` orphelin

`Daemon.activeBattle` est un Json. Si le client crash après le serveur a écrit l'init du combat mais avant la première action, le joueur revient et son daemon est "en combat" sans interface visible. **Aucune route de reset visible.**

### 2.4 🟠 Position bloquante après hardening

Le commit `78c9d18` empêche d'ÉCRIRE une position bloquante. Mais que se passe-t-il pour un joueur dont la position EN BASE était déjà bloquante avant le patch ? → Le `state` GET retourne la position bloquante, le client tente de bouger, le POST refuse, infinite loop possible. **À vérifier.**

### 2.5 🟠 `pioneerBadgeAwarded` et arc Pionnier

Si `treeObstacleCleared = true` mais `pioneerBadgeAwarded = false` (par exemple si le commit de badge a failed), le joueur a passé l'arbre mais n'a jamais reçu le badge. Aucune route de re-claim n'est apparente.

---

## 3. Robustesse des routes

### 3.1 🟠 26 routes ont un `console.error` ou `throw`

Sur 95 routes, ~26 loggent ou throw. Les 69 autres : soit succèdent silencieusement, soit catch silencieusement (voir Phase 1.1 : 31 silent catches). **Couverture d'erreur faible.**

### 3.2 🔴 Aucun test unitaire visible

Aucun fichier `*.test.ts` ou `*.spec.ts` dans `src/lib/gamebook/`. Les formules critiques (`xpForLevel`, `computeMaxHp`, `computeSaiyanPoints`, `computeDaemonBaseStats`) n'ont aucune validation automatisée. Un changement de constante peut casser le balancing sans alerte.

### 3.3 🔴 Aucun test E2E

Aucun Playwright/Cypress trace. Un dev solo en prod sans tests = chaque déploiement est un coup de poker.

---

## 4. Données corrompues récurrentes

### 4.1 🟡 `flags` Json fourre-tout

Aucun schéma. Toute clé peut être écrite. Si une route v3.8 écrit `flags.fooBar = true` puis le code de v4.0 ne le relit jamais, la clé persiste indéfiniment. **Aucun nettoyage.**

### 4.2 🟡 `history` Json non borné

Probable cause : croissance illimitée. À vérifier qu'il n'y a pas de joueur avec 50 KB de history.

---

## 5. Synthèse criticité

| # | Bug/Risque | Criticité | Statut |
|---|---|---|---|
| 1 | Bonus minuit perdus | 🔴 | Non fixé |
| 2 | 31 routes race-prone | 🔴 | Non fixé |
| 3 | Reset journalier dispersé | 🔴 | Latent |
| 4 | Concurrence multi-onglets | 🔴 | Latent |
| 5 | Aucun test unitaire | 🔴 | Latent |
| 6 | Aucun test E2E | 🔴 | Latent |
| 7 | Crash combat = état orphelin | 🟠 | Latent |
| 8 | Position bloquante héritée | 🟠 | À vérifier |
| 9 | Pionnier badge potentiellement loupé | 🟠 | Latent |
| 10 | Flags Json non purgés | 🟡 | Latent |

---
