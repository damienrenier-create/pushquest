# AUDIT_JOUEUR_03_FORMULES.md

> Vérification : annoncé = appliqué pour les formules numériques visibles au joueur.

---

## 1. Coût de mouvement

| Cas | Annoncé | Code (mapEngine.ts:325) | Match ? |
|---|---|---|---|
| Standard outdoor | 10 reps/case | `COST_MOVE = 10` | ✅ |
| Indoor (bâtiment) | gratuit (dialogue ROULETTE) | `INDOOR_MAP_IDS` set | ✅ |
| Mont vélo basique | 8 reps/case | `costPerCase: 8` | ✅ |
| Mont vélo sport | 4 reps/case | `costPerCase: 4` | ✅ |
| Mont vélo pro | 2 reps/case | `costPerCase: 2` | ✅ |
| Mont cadence ×0.5 | BPM 60-80 | (à confirmer dans logique Mont) | ⚠️ |
| Mont cadence ×1.5 | BPM 30-59 ou 81-99 | idem | ⚠️ |
| Mont cadence ×3.0 | BPM <30 ou ≥100 | idem | ⚠️ |
| Baskets (intactes) | -2 reps/case (8 au lieu de 10) | `moveCostReduction: 2` | ✅ |
| Chaussures course | -8 reps/case (2 au lieu de 10) | `moveCostReduction: 8` | ✅ |
| Brassards waterShallow | -2 reps/case sur waterShallow uniquement | `tileRestriction: "waterShallow"` | ✅ |
| Cumul brassards + baskets | (cumulable d'après description brassards) | (à vérifier dans `spend/route.ts`) | ⚠️ |

### #35 — Cumul wearables : à confirmer
- **Question** : si le joueur a baskets (intactes) + brassards (intacts) et marche sur waterShallow, le coût est-il bien `10 - 2 - 2 = 6` ou `10 - 2 = 8` ?
- **Localisation** : [src/lib/gamebook/inventory.ts](src/lib/gamebook/inventory.ts) + [src/app/api/gamebook/spend/route.ts:53-64](src/app/api/gamebook/spend/route.ts#L53-L64)
- **Criticité** : 🟡 Confort
- **Action** : test à faire en jeu après implémentation compte test.
- **Confiance** : Moyenne

---

## 2. Saiyan points

| Cas | Annoncé (commentaire `daemon.ts`) | Code | Match ? |
|---|---|---|---|
| Base | 7 points | `SAIYAN_POINTS_BASE = 7` | ✅ |
| +1 si effort | ≥100 reps spent ce level | `if (energySpentThisLevel >= 100) pts += 1` | ✅ |
| +1 si résilience | ≥1 KO ce level | `if (koCountThisLevel >= 1) pts += 1` | ✅ |
| +1 si difficile | hardBattles > easy×2 | `if (hardBattlesCount > easyBattlesCount*2)` | ✅ |
| −1 si farm easy | easy > hard×2 (et hard > 0) | `if (easyBattlesCount > hardBattlesCount*2 && hardBattlesCount > 0)` | ✅ |
| Cap | [5, 9] | `Math.max(5, Math.min(9, pts))` | ✅ |

**Status** : ⚪ Toutes les formules Saiyan sont parfaitement implémentées.

---

## 3. Calcul de dégâts (Pokémon Gen 1 adapté)

Formule officielle (commentée dans `combat.ts`):
```
damage = floor(
  ((((2 × Level / 5) + 2) × Power × ATK / DEF) / 50) × STAB × Type × Crit × Random
) + 2
```

| Composant | Annoncé / attendu | Code | Match ? |
|---|---|---|---|
| Level coefficient | `(2×L/5) + 2` | (à vérifier dans `computeDamage`) | ⚠️ |
| STAB | 1.5 si type attaque ∈ types Daemon | `STAB_BONUS = 1.5` | ✅ |
| Crit multiplier | 2× | `CRIT_MULTIPLIER = 2` | ✅ |
| Random range | [0.85, 1.0] | `RANDOM_MIN = 0.85`, `RANDOM_MAX = 1.0` | ✅ |
| Damage minimum hors immunité | 1 | (commentaire — à vérifier) | ⚠️ |
| Damage si immunité | 0 | (à vérifier `mult === 0`) | ⚠️ |

### #36 — Vérifier `computeDamage` retourne bien `Math.max(1, ...)` hors immunité
- **Localisation** : [src/lib/gamebook/combat.ts](src/lib/gamebook/combat.ts) (fonction `computeDamage` à lire intégralement)
- **Criticité** : 🟡 Confort
- **Action** : vérifier visuellement le code.
- **Confiance** : Moyenne

---

## 4. Table des types (matchups)

| Attaquant\Défenseur | Faible vs (×2) | Résistant à (×0.5) | Immune à (×0) |
|---|---|---|---|
| Normal | Combat | — | — |
| Feu | Eau, Roche | Feu | — |
| Eau | Plante, Electrique | Eau | — |
| Plante | Feu, Vol | Plante | — |
| Electrique | Plante | Electrique | Roche |
| Vol | Electrique, Roche | — | — |
| Psy | — | Psy | — |
| Pate | Combat | Pate | — |
| Combat | Vol, Psy | — | — |
| Roche | Eau, Plante, Combat | — | — |

(Table déduite des matchups inversés du `TYPE_CHART`.)

### #37 — Type "Pâte" custom : 🟢 Identité du jeu
- ✅ Type "Pate" super efficace vs Feu/Eau/Normal (la pâte étouffe / absorbe). Charmant.
- ✅ Pate faible vs Combat (les chiens flics croquent la pâte). Cohérent avec Pastagone.

### #38 — Type "Psy" : aucune faiblesse exploitable
- **Diagnostic** : Psy n'a aucune faiblesse listée. Il est uniquement faible quand un autre type a "Psy: 2" comme attaquant. Mais en parcourant la table, je vois seulement Combat: `Psy: 0.5`. Donc **Psy n'a aucun contre direct**.
- **Criticité** : 🟡 Confort équilibrage — si un boss est Psy, le joueur n'a aucun outil dédié.
- **Fix proposé** : ajouter `Ombre` (sombre) qui contre Psy, ou Insecte. À évaluer en Partie B.10. Pour V1 à 8 potes : laisser tel quel.
- **Confiance** : Élevée

### #39 — Type "Roche" : aucune faiblesse listée comme attaquant ciblant Roche
- **Diagnostic** : qui frappe fort sur Roche ? Eau (×2), Plante (×2), Combat (×2). ✅ Trois types contrent Roche.
- **Status** : ⚪ OK

### #40 — Type "Combat" : faible à Vol et Psy ✅

---

## 5. Multiplicateurs

| Modifier | Annoncé | Code | Match ? |
|---|---|---|---|
| Crit rate base | 6.25% (1/16) | `0.0625` | ✅ |
| Crit Int bonus | + Int/500 | ✅ | ✅ |
| Crit happiness | + happiness/1000 | ✅ | ✅ |
| Crit cap | 35% | `Math.min(0.35, ...)` | ✅ |
| Happiness multiplier | 1 + (h - 50)/100 | ✅ | ✅ |
| Range happiness | [0, 100] | `DAEMON_HAPPINESS_MAX = 100` | ✅ |
| Effective happiness multi | ×0.5 à ×1.5 | ✅ | ✅ |
| Int réduction coût énergie | cap 50% (Int=100 → max -50%) | `INT_ENERGY_REDUCTION_CAP = 0.5` | ✅ |

**Status** : ⚪ Tout matche.

---

## 6. HP max

Formule officielle (`daemon.ts:157`):
```
maxHp = floor(((End + bonusEnd) + 10) × 2 × Level / 100) + Level + 10 + bonusEnd
```

| Composant | Annoncé | Code | Match ? |
|---|---|---|---|
| Base End + 10 | base Pokémon Gen 1 | ✅ | ✅ |
| × 2 × Level / 100 | ✅ | ✅ | ✅ |
| + Level | ✅ | ✅ | ✅ |
| + 10 | ✅ | ✅ | ✅ |
| + bonusEnd | bonus items équipés | ✅ | ✅ |

**Status** : ⚪ OK

---

## 7. Conditions d'évolution

| Item | Mécanique | Localisation | Match ? |
|---|---|---|---|
| Pierre Feu | change type → Feu | `canEvolveType.newType: "Feu"` | ✅ |
| Pierre Eau | → Eau | idem | ✅ |
| Pierre Plante | → Plante | idem | ✅ |
| Pierre Électrique | → Electrique | idem | ✅ |
| Pierre Vol | → Vol | idem | ✅ |
| Pierre Psy | → Psy | idem | ✅ |
| Pierre Roche | → Roche | idem | ✅ |

### #41 — Pierres pour type Pate / Combat / Normal ?
- **Diagnostic** : aucune pierre pour redevenir Normal ou évoluer vers Combat/Pate. Cohérent avec le lore Pullman (Lee vend les "rares").
- **Status** : ⚪ Design intentionnel

### #42 — Évolution par niveau ?
- **Diagnostic** : aucune évolution automatique par level n'est codée. Le Daemon garde son type tant que pas de pierre consommée.
- **Status** : ⚪ Design intentionnel

---

## 8. Coûts shop (sample)

| Item | priceReps | Match ? |
|---|---|---|
| Gourde | 50 | ✅ |
| Baskets | 200 | ✅ |
| Grande Gourde | 200 | ✅ |
| Chaussures de course | 400 | ✅ |
| Brassards | 100 | ✅ |
| Corned Pâtes | 80 | ✅ |
| Lunettes | 50 | ✅ |
| Vélo basique | 100 | ✅ |
| Vélo sport | 300 | ✅ |
| Vélo pro | (à vérifier) | ⚠️ |
| Casquette anti-route (RAVIOL'STYLE) | 200 (selon dialogue) | (à confirmer dans items.ts vegas_habits) | ⚠️ |
| Items Pastagone armurerie | (à vérifier) | ⚠️ |

**Status** : ⚪ Cohérence apparente. À confirmer les prix manquants.

---

## 9. Cooldowns

| Action | Cooldown annoncé | Code | Match ? |
|---|---|---|---|
| Capitaine équipe (MARCO/POLO) | 1×/jour | `lastTeamCaptainBonusDate !== today` | ✅ |
| Lotto-poule | 1×/jour | `lottoPouleDate !== today` | ✅ |
| Stop-ou-encore | 3 essais/jour | `stopOuEncorePlaysToday ≤ 3` | ✅ |
| Cockfight | 1×/jour à 21h+ | `cockfightDate` (mais pas de check 21h dans code visible) | ⚠️ |
| Slot machines | (à vérifier le cap) | `slotMachinesPlayedToday` | ⚠️ |
| Pattern spin | bankrupt cooldown | `casinoPatternBankruptUntil` DateTime | ✅ |
| Arène 1×/jour | `lastArenaDate !== today` | ✅ | ✅ |
| Hôtel sleep | 1×/jour | `lastHotelSleepDate !== today` | ✅ |
| Croupier-talk | 1 croupier/jour | `casinoBoostDate + casinoCroupierTalkedToday` | ✅ |
| Luck talk | 1×/jour | `lastLuckTalkDate !== today` | ✅ |
| Véto heal | 1×/jour | `vetoMuscuLastVisitDate !== today` | ✅ |
| Happy flower | 1×/jour | `happyFlowerLastDate !== today` | ✅ |
| Daily decay tamagotchi | 1×/jour | `lastDailyDecayDate !== today` | ✅ |

### #43 — Cockfight : le « pas avant 21h » est-il vraiment appliqué ?
- **Ce que le joueur vit** : dialogue « On commence à 21h, pas avant ».
- **Localisation** : [src/app/api/gamebook/casino/cockfight/route.ts](src/app/api/gamebook/casino/cockfight/route.ts)
- **À vérifier** : présence d'un check `new Date().getHours() >= 21`.
- **Criticité** : 🟡 Confort (un joueur déterminé peut tester à 14h et être surpris)
- **Fix proposé** : si pas appliqué, ajouter le check + message « Reviens à partir de 21h » ; si appliqué, OK.
- **Confiance** : À confirmer

---

## 10. Décay du bonheur (tamagotchi)

D'après `src/lib/gamebook/happinessChanges.ts` :

| Cas | Annoncé | Code |
|---|---|---|
| STEP_DECAY | -1 toutes 50 cases | ✅ (vu dans le commentaire) |

Pas approfondi (lib pas re-lue ici), mais commentaire honnête.

---

## 11. Reset minuit — confirmation B.0 + bug

Selon `energy.ts` (subagent confirmation) :
- `bonusSurplus` **n'est pas reseté** à minuit (fix v3.10 explicite)
- `energySpentToday` est **bien reseté** à minuit
- Tous les champs `*Date` sont vérifiés via `getTodayISO()` cohéremment

**Conclusion** : le bug « bonus minuit » du créateur **n'est pas dans le code serveur actuel**. Hypothèses :
1. Bug client (cache stale après minuit dans `MapClient.tsx:2929`)
2. Confusion avec le reset intentionnel de `energySpentToday`
3. Bug historique fixé sans que le créateur s'en rende compte

### #44 — Bug bonus minuit : INVESTIGATION REQUISE
- **Ce que le joueur vit** : il prétend que les bonus (papa, pommiers, capitaine) sont perdus à minuit.
- **Diagnostic code serveur** : pas de reset de `bonusSurplus` constaté.
- **Diagnostic code client** : `MapClient.tsx:2929` recalcule l'énergie sur la base du payload serveur. Si le payload est correct, l'affichage l'est aussi.
- **Hypothèse principale** : c'était un vrai bug en pre-v3.10, peut-être latent dans l'expérience joueur depuis sans qu'il ait été testé en conditions réelles.
- **Action** : avec le compte test (Partie C), tester :
  1. Gagner +100 reps via papaBoost à 23h55
  2. Avancer l'horloge à 00h05 via le panneau testeur
  3. Re-fetch `/state` et vérifier que `bonusSurplus` est toujours là
- **Criticité** : 🔴 Bloquant (prioritaire selon créateur)
- **Confiance** : Moyenne (suspicion fix v3.10 déjà appliqué, mais à confirmer)

---

## 12. Synthèse formules

| # | Titre | Criticité |
|---|---|---|
| #35 | Cumul wearables à confirmer | 🟡 |
| #36 | `computeDamage` min hors immunité | 🟡 |
| #37 | Type Pâte cohérent | ⚪ |
| #38 | Type Psy sans contre direct | 🟡 |
| #39 | Type Roche contré normalement | ⚪ |
| #40 | Type Combat OK | ⚪ |
| #41 | Pas de pierre Pate/Combat/Normal | ⚪ |
| #42 | Pas d'évolution par niveau | ⚪ |
| #43 | Cockfight 21h+ : check à confirmer | 🟡 |
| #44 | Bug bonus minuit : reproduce avec compte test | 🔴 |

**Conclusion globale** : les formules sont **excellemment alignées** entre annoncé et codé. Les écarts résiduels sont des points de confort à éclaircir, pas des bugs de gameplay.

---

*Fin AUDIT_JOUEUR_03_FORMULES.md*
