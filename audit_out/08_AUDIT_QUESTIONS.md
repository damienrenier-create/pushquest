# AUDIT_08_QUESTIONS.md — Questions ouvertes (centralisé)

> Pour chaque question : contexte + impact si non répondue.

---

## 1. Migrations & DB

### Q1.1 — Ordre d'application des migrations en prod
**Contexte** : v3.8/v3.11/v3.12 datées 20260528+ viennent alphabétiquement APRÈS v4.0 datées 20260526.  
**Question** : Sur la prod Neon, dans quel ordre ces migrations ont-elles été appliquées ? Ordre alphabétique (Prisma standard), ordre manuel via `db push`, ou hybride ?  
**Impact** : Détermine si les utilisateurs prod ont vu une « v4.0 active_battle » avant les colonnes v3.8 Pépiteville, ou l'inverse.

### Q1.2 — Régénération depuis zéro
**Contexte** : 14 modèles sans `CREATE TABLE`.  
**Question** : Faut-il accepter de générer une migration « baseline_drift_repair » via `prisma migrate dev --create-only` puis la marquer `--applied` en prod ? Ou laisser le repo non-reproductible ?

### Q1.3 — Bonus minuit
**Contexte** : Bug documenté en mémoire.  
**Question** : Quels champs exactement sont perdus à minuit ? Lesquels doivent persister (bonus permanent) vs reset (énergie quotidienne) ?

---

## 2. Game design

### Q2.1 — Cap niveau Daemon
**Contexte** : Cap L50 + L³ → queue impossible.  
**Question** : Cap à 30 ? Ou baseExp dynamique multiplié pour boss ?

### Q2.2 — Casino EV
**Contexte** : 5 jeux casino, tous en `Math.random()` serveur. Aucun cap de gain cumulé journalier.  
**Question** : EV exact de chaque jeu ? L'un d'eux a-t-il EV > 0 ?

### Q2.3 — Pénalité freeze
**Contexte** : `gamebookFrozenUntil` actif si suppression de reps. Pas de route de réversion joueur.  
**Question** : Garder le freeze comme dissuasion ou ajouter un « rachat » via un défi sportif ?

### Q2.4 — Système de skip
**Contexte** : Joueur bloqué → bloqué.  
**Question** : Ajouter un système d'aide après N tentatives ? Sous quelle forme ?

---

## 3. Narratif

### Q3.1 — Clôture Pastagone
**Contexte** : Arc majeur v4.0.  
**Question** : Beat narratif post-Pastagone ? Qui dit quoi quand le joueur sort ?

### Q3.2 — Fusion univers
**Contexte** : Pullman + Pasta humor + Pokémon mécanique.  
**Question** : Assumer pleinement le mélange (in-jokes croisés) ou re-cloisonner les tonalités par zone ?

### Q3.3 — Linéarisation explicite
**Contexte** : 15 arcs, ordre flou.  
**Question** : Ajouter une carte/journal de quêtes ? Ou rester sur la découverte organique ?

### Q3.4 — TOWER_JOKES replay
**Contexte** : 4 blagues qui rejouent indéfiniment.  
**Question** : Ajouter un flag `tbJokesSeenIds: int[]` pour ne pas reproposer les blagues vues ?

---

## 4. UX

### Q4.1 — Tutoriel contrôles
**Question** : Un overlay au premier `MapClient` mount ?

### Q4.2 — Back/forward dialogue
**Question** : Comportement attendu : `←` pour reculer d'1 step ?

### Q4.3 — Mobile
**Question** : Le jeu est-il testé sur mobile ? Sartay utilise-t-il son téléphone pour jouer ?

### Q4.4 — UI équipe Daemon
**Question** : Existe-t-il une UI pour gérer plusieurs Daemons ? Si non, c'est prioritaire ?

---

## 5. QA / robustesse

### Q5.1 — Tests
**Question** : Acceptes-tu d'introduire un fichier `daemon.test.ts` minimal (formules) en mode « pas casser le code mais ajouter sécurité » ?

### Q5.2 — Position bloquante héritée
**Question** : Faut-il une route admin de « rescue all blocked » à exécuter une fois ?

### Q5.3 — Crash combat orphelin
**Question** : `activeBattle = null` au timeout (>30min sans action) ?

---

## 6. Sécurité

### Q6.1 — CSRF
**Question** : Confirmer que NextAuth gère bien le CSRF via cookie sur les routes `/api/gamebook/*` ?

### Q6.2 — Validation actions sensibles
**Question** : Faut-il auditer route par route les pré-conditions serveur (« le joueur doit avoir tel flag pour POST telle action ») ?

### Q6.3 — .env tracké
**Question** : Vérifier `git ls-files .env`. Si tracké, à purger immédiatement de l'historique ?

### Q6.4 — Rate limit
**Question** : Acceptes-tu un middleware Next.js rate-limit (ex: Upstash) ou ce n'est pas prioritaire pour 7 potes ?

---

## 7. Partie B (God Mode)

### Q7.1 — Périmètre panel testeur
**Question** : Quelles fonctions précises veux-tu (resources, time-travel, flag manip, téléport, snapshots) ? Doit-on inclure la simulation de race conditions ?

### Q7.2 — Lien avec `isSystem`
**Contexte** : 111 backdoors actuels.  
**Question** : Le compte test doit-il rester `isSystem=false` (= joueur normal) et le panel agir via routes admin séparées ? Confirme.

---
