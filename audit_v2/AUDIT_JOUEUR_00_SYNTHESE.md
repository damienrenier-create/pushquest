# AUDIT_JOUEUR_00_SYNTHESE.md

> Synthèse exécutive des 12 audits joueur (B.1 → B.12). Vision globale + Top 20 fixes prioritaires.

---

## 1. Vue d'ensemble

| Phase | Nb d'items détectés | 🔴 | 🟠 | 🟡 | ⚪ |
|---|---|---|---|---|---|
| B.1 Promesses | 10 | 0 | 4 | 2 | 4 |
| B.2 Lore | 24 | 1 | 4 | 5 | 14 |
| B.3 Formules | 10 | 1 | 0 | 4 | 5 |
| B.4 Blocages | 21 | 2 | 7 | 7 | 5 |
| B.5 Incompréhensions | 33 | 2 | 8 | 13 | 10 |
| B.6 Progression | 13 | 0 | 1 | 5 | 7 |
| B.7 Équité | 10 | 0 | 2 | 2 | 6 |
| B.8 Onboarding | 9 | 0 | 2 | 2 | 5 |
| B.9 Exploits | 15 | 1 | 4 | 5 | 5 |
| B.10 Daemons | 10 | 0 | 1 | 3 | 6 |
| B.11 Temps | 10 | 1 (bug bonus) | 1 | 0 | 8 |
| B.12 Données fantômes | 17 | 0 | 1 | 5 | 11 |
| **Total** | **182** | **8** | **35** | **53** | **86** |

**Diagnostic global** : Nexus est solide. 86 ⚪ = parties qui fonctionnent. 53 🟡 = points de confort à améliorer si temps. 35 🟠 = vraies frustrations à fixer. 8 🔴 = à fixer en priorité.

---

## 2. Top 20 fixes prioritaires (impact × effort × valeur 8-amis)

| Rang | # | Titre | Criticité | Effort | Phase |
|---|---|---|---|---|---|
| 1 | #44 | **Bug bonus minuit** — reproduire avec compte test puis fix client si confirmé | 🔴 | S (1-3h) | B.3, B.11 |
| 2 | #49 | **Lancer audit-stuck-players.mjs** + rescue positions héritées | 🔴 | XS (10 min run + 30 min rescue) | B.4 |
| 3 | #52 | **Bouton "abandonner combat" + timeout 30 min** sur `activeBattle` | 🔴 | S (1-2h) | B.4 |
| 4 | #11 | **LYRA spoile Pastagone** — reformuler dialogue | 🔴 | XS (15 min) | B.2 |
| 5 | #145 | **Valider `baseExp`/`combatLevel` body dans battle/start** | 🔴 | XS (30 min) | B.9 |
| 6 | #74 | **Cadence Mont BPM** — indicateur ou dialogue préventif | 🔴 | S (1h dialogue) | B.5 |
| 7 | #66 | **Arbre 150 reps : message coût** | 🟠 | XS (30 min) | B.5 |
| 8 | #75 | **Tutoriel contrôles** — overlay au 1er mount | 🟠 | M (2-3h) | B.5 / B.8 |
| 9 | #67 | **Rochers Muscuville : message coût restant** | 🟠 | XS (30 min) | B.5 |
| 10 | #68 | **Eau bloquante sans swim_set : message** | 🟠 | XS (30 min) | B.5 |
| 11 | #95 | **Toast standard "échec énergie"** dans MapClient | 🟠 | S (1h) | B.5 |
| 12 | #94 | **Toast XP après badge** | 🟠 | S (1-2h) | B.5 |
| 13 | #142 | **Cooldown Tour de Garde Pastagone** — vérifier `pastagoneTourCooldownUntil` | 🟠 | S (30 min) | B.9 |
| 14 | #12 | **CORAM Poussière+Daemons prématuré** — gater derrière `pastagoneBossBeaten` | 🟠 | XS (30 min) | B.2 |
| 15 | #45 + #46 | **mont_sommet + hautespates sans doorMat** | 🟠 | XS (15 min) | B.4 |
| 16 | #118 | **Bonus capitaine équipes : franss/marvin ?** — vérifier teams.ts | 🟠 | S (1h vérif + fix) | B.7 |
| 17 | #120 | **Exclure `isSystem` de tous les classements Nexus** | 🟠 | S (1h audit + fix) | B.7 |
| 18 | #5 | **Park divisor — sprite ou warning** | 🟠 | M (1-3h) | B.1 |
| 19 | #85 | **grassTall passable vs bloquant — toast au 1er heurt** | 🟠 | S (1h) | B.5 |
| 20 | #179 | **Audit sync tamagotchi/Daemon happiness** | 🟠 | S (1h) | B.12 |

**Effort total Top 20** : ~30-50h (1 semaine de travail concentré pour le créateur)

---

## 3. Groupement en lots cohérents

### Lot 1 — "Stop la galère" (priorité absolue, 5-8h)
- #44 Bug bonus minuit
- #49 Audit positions héritées + rescue
- #52 Reset combat orphelin
- #145 Valider baseExp (exploit XP)
- Audit-doors fixes (#45, #46, #47, #48)

### Lot 2 — "Messages clairs" (4-6h)
- #66 Message arbre 150 reps
- #67 Rochers Muscuville
- #68 Eau bloquante
- #74 Cadence Mont
- #95 Toast échec énergie
- #94 Toast XP badge

### Lot 3 — "Cohérence narrative" (2-3h)
- #11 LYRA spoile Pastagone
- #12 CORAM Poussière prématuré
- #15 ORNITHOLOGUE PIAFFINI gating
- #23 Lee Scoresby stock cohérence
- #28 TOWER_JOKES replay gate

### Lot 4 — "Onboarding" (3-5h)
- #75 + #122 + #123 Tutoriel contrôles + premier objectif
- #129 Re-onboarding toast

### Lot 5 — "Équité 8-amis" (1-2h)
- #118 Audit teams.ts
- #120 Exclure isSystem classements

### Lot 6 — "Calibrage Pastagone" (5 min)
- #109 Variance Tour de Garde L4-L14 → L8-L12

### Lot 7 — "Daemon polish" (1-2h)
- #149 Ajouter contre Electrique
- #179 Sync tamagotchi/Daemon

---

## 4. Estimation totale d'effort pour "8 joueurs heureux"

| Lot | Effort | Cumul |
|---|---|---|
| Lot 1 | 5-8h | 8h |
| Lot 2 | 4-6h | 14h |
| Lot 3 | 2-3h | 17h |
| Lot 4 | 3-5h | 22h |
| Lot 5 | 1-2h | 24h |
| Lot 6 | 5 min | 24h |
| Lot 7 | 1-2h | 26h |
| **Total** | **~25-30h** | |

**Conclusion** : ~1 week-end intense + 1-2 soirées et les 8 amis ont une bien meilleure expérience.

---

## 5. Décisions créateur requises (arbitrages)

Liste rappelée + complétée depuis CONFRONTATION_PRIORITES + audits joueur :

| ID | Question |
|---|---|
| Q-A | Suppression code mort (engine.ts, 8 routes mortes) — OUI/NON ? |
| Q-B | Audit log serveur — OUI/NON ? (reco : NON) |
| Q-C | Baseline migration — OUI/NON ? (reco : NON, juste documenter) |
| Q-D | Cap casino gain cumulé journalier — OUI/NON ? (reco : OUI 200 reps) |
| Q-E | Compte test : nouveau ou existant (Guigui) ? (reco : existant Guigui) |
| Q-F | Si pote approche L25 : multiplier BASE_EXP boss ou baisser cap L30 ? (reco : multiplier) |
| Q-G | Exclusion isSystem TOUS classements Nexus — OUI/NON ? (reco : OUI) |
| Q-H | LYRA dialogue reformulé sans spoil — confirmation ? |
| Q-I | CORAM gater derrière pastagoneBossBeaten ? |
| Q-J | Lee Scoresby : pierres disponibles ou pas ? (aligner code/dialogue) |
| Q-K | Bonus minuit : tester avec compte test puis confirmer H1/H3 ? |
| Q-L | TOWER_JOKES : ajouter flag `tbJokesSeen` ? |
| Q-M | Park divisor : sprite distinct ou warning seul ? |
| Q-N | Combat : ajouter option "Fuir" en plus du reset ? |
| Q-O | Tour de Garde Pastagone : resserrer variance L8-L12 ? |
| Q-P | Casino cockfight : appliquer le check 21h+ ? |

---

## 6. Risques résiduels acceptés (dette consciente)

- **Race conditions énergie multi-utilisateur** : ignorées (jamais 2 joueurs simultanés).
- **Code architecture (god MapClient, prisma as any)** : ignorée (pas d'objectif Silicon Valley).
- **14 modèles sans CREATE TABLE** : ignorée (prod stable).
- **Cap niveau L50 + courbe L³ infinie** : ignorée (aucun joueur n'atteint L25 avant longtemps).
- **Tests automatisés systématiques** : ignorée (sauf un test ciblé sur le pattern "annoncé = donné" si refacto).
- **RGPD avancée, rate limit, CSRF** : ignorée (8 potes).
- **Refactor narratif / fusion univers** : assumé.

---

## 7. Recommandation finale : patches sur l'existant ou découpage v2 ?

### Diagnostic
- Le jeu est **déjà jouable** par les 8 amis.
- Les 8 🔴 sont des bugs/frustrations ponctuels — pas une refonte.
- Les 35 🟠 sont des améliorations incrémentales.
- Aucun refactor majeur n'est nécessaire.

### Recommandation
✅ **Patches sur l'existant**. Pas de v2 nécessaire. Le créateur fait ses Lot 1-7 dans l'ordre, et les 8 amis ont un jeu nettement meilleur.

### Risque de découpage v2
❌ Découper une v2 demanderait des semaines de refacto **pour zéro gain joueur**. À 8 potes, c'est du gaspillage de temps créateur.

---

## 8. Ordre suggéré de mise en œuvre

1. **Lot 1** (Stop la galère) — début de soirée 1
2. **Lot 6** (calibrage Pastagone) — 5 min, à insérer
3. **Lot 2** (messages clairs) — soirée 2
4. **Lot 4** (onboarding) — soirée 3
5. **Lot 3** (cohérence narrative) — soirée 4
6. **Lots 5 + 7** — soirée 5
7. **Compte test (Partie C)** — déjà implémenté par cette mission

**Coup d'envoi** : Lot 1 immédiatement (priorité maximale créateur).

---

## 9. Indicateurs de succès post-fixes

- Aucun joueur reporté « coincé » pendant 1 semaine
- Aucune réclamation « j'ai gagné X mais reçu Y »
- Aucun question « comment je fais pour ____ ? » → indique tutoriel efficace
- Bug bonus minuit reproductible disparu

---

*Fin AUDIT_JOUEUR_00_SYNTHESE.md*
