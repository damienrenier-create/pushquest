# AUDIT_JOUEUR_11_TEMPS.md

> Comportement à minuit Paris (uniquement). Bug bonus minuit analysé.

---

## 1. Comportement à minuit Paris — ce qui reset

| Champ | Reset à minuit ? | Logic |
|---|---|---|
| `energySpentToday` | ✅ Reset | Check `energySpentDate !== today` |
| `casinoBetsToday` | ✅ Reset | Check `casinoBetsDate !== today` |
| `lottoPouleWonToday` | ✅ Reset | Check `lottoPouleDate !== today` |
| `stopOuEncorePlaysToday` | ✅ Reset | Check `stopOuEncoreDate !== today` |
| `slotMachinesPlayedToday` | ✅ Reset | Check `slotMachinesDate !== today` |
| `casinoBoostPctToday` | ✅ Reset | Check `casinoBoostDate !== today` |
| `casinoCroupierTalkedToday` | ✅ Reset | Check date + croupierId |
| Cooldowns 1×/jour (`lastArenaDate`, `lastHotelSleepDate`, `lastLuckTalkDate`, etc.) | ✅ Reset (en pratique : le check passe à nouveau) | Pattern uniforme |
| Daily decay tamagotchi | ✅ Appliqué une fois/jour | `lastDailyDecayDate` |
| Happy flower bonus | ✅ Reset | `happyFlowerLastDate` |
| Champion arène revanche | ✅ Reset (`lastArenaDate`) | OK |
| `fruitsTaken.counts` | ✅ Reset (via `fruitsTaken.date !== today`) | OK |
| `bonusSurplus` | ❌ **Pas reset (intentionnel, fix v3.10)** | Source de vérité confirmée dans `energy.ts:13` |
| Flags one-shot (`pioneerBadgeAwarded`, etc.) | ❌ Pas reset (intentionnel = définitif) | OK |
| `currentHp` Daemon | ❌ Pas reset (jusqu'à heal vétérinaire ou hôtel) | OK |
| `happiness` Daemon | ❌ Pas reset (jusqu'à interactions) | OK |

**Status** : ⚪ Tous les resets sont cohérents et bien isolés.

---

## 2. Bug bonus minuit — analyse précise

### #156 — Hypothèses sur le bug créateur
Le créateur dit : « les bonus gagnés (pommiers, papa, capitaine…) sont perdus à minuit ».

**Diagnostic code serveur** : `bonusSurplus` n'est PAS reseté (fix v3.10 explicite). Confirmé par audit subagent.

**Hypothèses possibles** :

#### H1 — Cache client stale après minuit
- **Mécanisme** : `MapClient.tsx:2929` recalcule l'énergie via `energy = todayReps + bonusSurplus`. Au passage de minuit, sans re-fetch `/state`, le client affiche une valeur incohérente.
- **Probabilité** : 🟢 Élevée — c'est le candidat le plus crédible.
- **Test** : avec compte test, simuler passage de minuit, vérifier si l'UI re-fetch automatiquement.
- **Fix proposé** : forcer un re-fetch `/state` à chaque détection de changement de jour côté client (timer ou `setInterval`). Effort 1-2h.

#### H2 — Confusion avec le reset intentionnel de `energySpentToday`
- **Mécanisme** : le joueur dépense 200 reps à 23h. À 00h, `energySpentToday` est reseté à 0, donc son énergie disponible = todayReps + bonusSurplus = 0 + bonusSurplus = bonusSurplus seul. Si bonusSurplus était modeste, le joueur croit avoir perdu de l'énergie.
- **Mais** : à minuit, `todayReps` se reseed sur le nouveau jour (les reps de la veille sont remis à 0, ceux du nouveau jour à 0 aussi). Donc le joueur démarre à `0 + bonusSurplus`.
- **Le joueur peut interpréter** : « hier j'avais 100 reps de bonus papa + 80 reps de pommier en réserve. Aujourd'hui je vois juste mon bonusSurplus, je crois que les 100+80 sont perdus » alors qu'ils étaient déjà consommés.
- **Probabilité** : 🟡 Moyenne.

#### H3 — Bug historique fixé sans que le créateur le sache
- **Mécanisme** : avant le fix v3.10, le bonusSurplus était reseté. Maintenant non.
- **Probabilité** : 🟢 Élevée. Le bug a été fixé en v3.10, le créateur a peut-être vu le symptôme depuis et présumé qu'il existait toujours.

#### H4 — Cas spécifique d'un type de bonus
- **Mécanisme** : un bonus particulier (ex. capitaine) n'utilise pas `grantRewardOnSnapshot` et est mal écrit.
- **Probabilité** : 🟡 Moyenne.
- **Test** : audit code pour vérifier que toutes les routes bonus utilisent `grantRewardOnSnapshot`.

### #157 — Action concrète
1. **Compte test** (Partie C) : reproduire à 23h55 + 00h05 pour H1 et H3.
2. **Audit code** : vérifier que `team/captain-bonus`, `painting/papa-boost`, `take-fruit`, `franss-joke`, etc. utilisent tous bien `grantRewardOnSnapshot` (au lieu d'incrémenter directement un champ qui reset).
3. **Fix H1 (client re-fetch)** : à implémenter si H1 confirmé.

### #158 — Recommandation
- **Avant tout fix** : reproduire avec compte test (Partie C livrera l'outil).
- **Si H1 confirmé** : ajouter un `setInterval(refetchState, 60000)` ou un check date dans `useEffect`. ~1h.
- **Si H3 confirmé** : pas de fix, communiquer au créateur « c'est déjà fixé depuis v3.10 ».
- **Si H4 confirmé** : auditer route par route.

---

## 3. Décay du bonheur

### #159 — Fréquence et déclencheur
- **Source code** : `happinessChanges.ts:STEP_DECAY = -1` toutes les 50 cases.
- **Status** : ⚪ Clair et raisonnable

---

## 4. Cooldowns « 1 fois par jour » — entre 2 minuits ou par tranche 24h ?

### #160 — Pattern uniforme : check date string
- **Diagnostic** : tous les cooldowns 1×/jour utilisent `champ_date !== today` (où today = `getTodayISO()` Europe/Paris).
- **Conséquence** : un joueur qui joue à 23h55 puis à 00h05 a **immédiatement** un reset, pas une attente de 24h.
- **Status** : ⚪ Design intentionnel — alignement calendaire.

### #161 — Effet pervers : 2 utilisations en quelques minutes
- **Ce que le joueur vit** : à 23h55, il prend son bonus capitaine. À 00h05, il en reprend un. → 2 bonus en 10 minutes.
- **Acceptation** : OK, c'est le contrat « 1 par calendrier ».
- **Status** : ⚪ Acceptable

---

## 5. Date stockée en String : comportement aux limites

### #162 — Comparaison lexicographique des dates ISO
- **Diagnostic** : `"2026-05-26" !== "2026-05-27"` fonctionne lexicographiquement → ✅ OK.
- **Risque théorique** : si un jour le format change ou si un autre TZ est mêlé. Pas un risque actuel pour le créateur.
- **Status** : ⚪ OK

### #163 — Changement d'heure été/hiver
- **Diagnostic** : `getTodayISO()` utilise `new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" })`. JavaScript gère l'heure d'été automatiquement.
- **Conséquence** : à 00h00 Paris en mars (passage à l'heure d'été), tout fonctionne.
- **Status** : ⚪ OK

---

## 6. Session longue à cheval sur minuit

### #164 — Comportement à 00h
- **Ce que le joueur vit** : il joue à 23h59, fait un mouvement. La requête arrive serveur à 00h00. Quelle date ?
- **Diagnostic** : `getTodayISO()` est appelé **au moment de la requête serveur** → utilise la nouvelle date.
- **Conséquence** : la requête déclenche le reset des champs daily, puis applique le mouvement. Le joueur démarre la journée +1.
- **Status** : ⚪ Cohérent

### #165 — UI client non synchronisée
- **Diagnostic** : si le client a fetché `/state` à 23h58 et garde la donnée en mémoire jusqu'à 00h05, il affiche des compteurs périmés.
- Cf. H1 du bug bonus minuit (#156).
- **Fix proposé** : timer client qui re-fetch à `00:00:05` Paris.

---

## 7. Synthèse temps

| # | Titre | Criticité |
|---|---|---|
| #156 | Bug bonus minuit : H1-H4 hypothèses | 🔴 |
| #157 | Action : reproduire avec compte test | 🔴 |
| #158 | Recommandation : audit routes bonus + fix client | 🔴 |
| #159 | Décay bonheur OK | ⚪ |
| #160 | Cooldowns par calendrier (intentionnel) | ⚪ |
| #161 | Effet 23h55/00h05 acceptable | ⚪ |
| #162 | Comparaison string OK | ⚪ |
| #163 | Heure été OK | ⚪ |
| #164 | Mouvement à minuit cohérent serveur | ⚪ |
| #165 | UI client peut être périmée | 🟠 |

---

*Fin AUDIT_JOUEUR_11_TEMPS.md*
