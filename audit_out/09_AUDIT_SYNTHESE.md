# AUDIT_00_SYNTHESE.md — Synthèse exécutive

> **Périmètre** : Nexus / Gamebook subsystem  
> **Date** : 2026-05-27  
> **Branche auditée** : `feat/gamification-pass-2` HEAD `6f0bb65`

---

## 1. Verdict global

**Le Nexus est un produit live, joué par 7 vrais utilisateurs, avec une vélocité de production solo remarquable.** Il fonctionne. Mais il porte une **dette technique systémique** née de la livraison continue sans tests, sans transactions, et avec une god-table de 130 colonnes.

| Dimension | Note | Commentaire |
|---|---|---|
| Code | C+ | Architecture étroite (MapClient 5791l, npcs 2565l, maps 2812l), 292 `(prisma as any)`, 0 tests. Cohérent en surface, fragile en profondeur. |
| DB | D | God-table, 14 modèles sans migration, 0 transaction, 31 routes race-prone. |
| Game design | B | Idées fortes (10 reps = 1 case, formules Daemon, Saiyan). Casino non équilibré, courbe L³ impraticable. |
| Narratif | B | Voix forte du Monstre, foreshadowing, mais dispersion et pas de linéarisation. |
| UX | C | Modale-only, pas de tuto contrôles, pas de deeplink, mobile non confirmé. |
| QA | D | Aucun test, bugs latents (race, minuit, multi-onglets). |
| Conformité | C+ | NextAuth OK, mais 111 backdoors `isCreator`, pas d'audit log, pas de rate limit. |

---

## 2. Top 10 priorités (toutes phases confondues)

| Rang | Constat | Phase | Criticité | Effort |
|---|---|---|---|---|
| 1 | **31 routes race-prone sur `energySpentToday`** (read-modify-write sans tx) | 1.2 | 🔴 | M |
| 2 | **0 transaction Prisma sur 95 routes** | 1.2 | 🔴 | L |
| 3 | **14 modèles sans `CREATE TABLE`** (schema drift, repo non-reproductible) | 1.2 | 🔴 | M |
| 4 | **Bonus minuit perdus** (bug documenté, non fixé) | 1.6 | 🔴 | S |
| 5 | **Courbe XP L³ + cap L50 = injouable jusqu'au bout** | 1.3 | 🔴 | S (constants) |
| 6 | **Casino sans cap de gain cumulé journalier** | 1.3 | 🔴 | S |
| 7 | **Aucun test unitaire/E2E** | 1.6 | 🔴 | L (mais L = sécurité long terme) |
| 8 | **Aucun audit log serveur** | 1.2 / 1.7 | 🔴 | M |
| 9 | **MapClient 5791 lignes** (god component) | 1.1 | 🔴 | XL |
| 10 | **111 backdoors `isCreator`** → à remplacer par panneau testeur externe (Partie B) | 1.7 | 🔴 | M (Partie B) |

---

## 3. Schéma de causalité

```
Vélocité solo + livraison continue
        ↓
Dette transactionnelle (0 tx, 31 race-prone)
        ↓
Couplage god-table (130 champs)
        ↓
Architecture client god-component (MapClient 5791l)
        ↓
Aucun test
        ↓
Régressions cycliques (cf. commits b9a28cb, 706f20e, 78c9d18)
```

Chaque couche cristallise les choix de vitesse. Aucune n'est « fautive » isolément — c'est le **système** qui est sous-tendu.

---

## 4. Recommandation stratégique

### 4.1 Priorité absolue (avant tout nouveau contenu)

1. **Baseline migration de répare** (Phase 1.2 §2.3) — sans ça, le repo est inutilisable hors prod actuelle.
2. **Atomicité énergie** (incrément Prisma) — fix systémique, faible effort, haut impact.
3. **Audit log serveur** (`GamebookEvent` append-only) — débloque debug, conformité et anti-cheat.
4. **Fix bug bonus minuit** — frustration utilisateur réelle.

### 4.2 Stabilisation moyen terme

5. **Suite de tests minimale** : formules Daemon + 5 routes critiques en intégration.
6. **Rééquilibrage L³** (cap L30 ou baseExp boss×4).
7. **Cap casino journalier** sur gain cumulé.

### 4.3 Refactor long terme (NON BLOQUANT pour l'audit)

8. **Décomposer MapClient** en hooks (cf. Phase 1.1).
9. **Séparer god-table** : `GamebookCore` (position, énergie) + `GamebookFlags` + `GamebookCasino`.
10. **Centraliser dialogues** dans une table de référence éditable.

### 4.4 Partie B — God Mode externe

Le brief Partie B (panneau testeur séparé, compte normal sans `isSystem`) est **précisément l'antidote** aux 111 backdoors actuels. Recommandation : remplacer progressivement les `isCreator` par des routes `/api/admin/*` cookie-gated par un secret, accessibles uniquement depuis le panel.

---

## 5. Ce qui est solide (à NE PAS toucher)

Sans complaisance mais sans non-plus jeter le bébé :

- **`COST_MOVE = 10`** : intouchable.
- **Formules `computeDaemonBaseStats` & `computeSaiyanPoints`** : à conserver telles quelles.
- **NextAuth + `userId` depuis session** : pattern sain.
- **`onDelete: Cascade` partout** : conforme RGPD.
- **`isSystem` exclu des classements** : bonne discipline.
- **Foreshadowing narratif** : à étendre.
- **Voix du Monstre Spaghetti Volant** : marque identitaire.

---

## 6. Coût estimé (ordres de grandeur, sans engagement)

| Bloc | Estimation Sartay seul |
|---|---|
| Baseline migration | 2-4h |
| Atomicité énergie sur 31 routes | 8-16h |
| Audit log | 4-8h |
| Fix bonus minuit | 1-3h |
| Tests formules Daemon | 2-4h |
| Cap L30 ou rebalance | 1-2h |
| Cap casino journalier | 2-4h |
| Décompo MapClient | 30-60h |
| Refactor god-table | 40-80h |
| Partie B (panel testeur) | 12-24h |

**Travail prio (avant nouveau contenu)** : ~40h.  
**Refactor long terme** : ~120h (donc à étaler).

---

## 7. Ce qui dépend de réponses (Phase 1.8)

22 questions ouvertes centralisées en `AUDIT_08_QUESTIONS.md`. Les plus urgentes :
- Q1.1 (ordre migrations prod)
- Q2.1 (cap L30 ?)
- Q2.2 (EV casino par jeu)
- Q7.1 / Q7.2 (périmètre Partie B)

---

**Fin AUDIT_00_SYNTHESE.md — Fin de la Partie A.**

---
