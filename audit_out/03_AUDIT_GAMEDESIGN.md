# AUDIT_03_GAMEDESIGN.md — Game Designer

> **Périmètre** : Nexus / Gamebook subsystem  
> **Date** : 2026-05-27  
> **Posture** : Sans complaisance

---

## 1. Boucle de jeu principale

| Couche | Élément | Verdict |
|---|---|---|
| Métrique d'effort | Reps réelles (pompes, squats, plank/5, etc.) | ✅ Excellent : ancrage physique réel |
| Conversion | 10 reps = 1 case (`COST_MOVE = 10`) | ✅ Lisible, mémorisable |
| Plafond / jour | `MAX_SPEND_PER_CALL = 500` par appel | 🟡 Pas un cap journalier réel — limite par requête seulement |
| Boucle minute | Move → interaction PNJ/tile → narrative beat | ✅ Le bouclage est solide |
| Boucle session | Faire ses reps du jour → progresser sur la map → croiser un PNJ | ✅ |
| Boucle long terme | Compléter arcs (TB, Pastagone, Macaron'île…) | 🟠 Voir 1.3 |

### 1.1 🟢 La conversion reps→cases est l'âme du jeu

`COST_MOVE = 10` est non-négociable : c'est ce qui fait que faire des pompes a un coût d'opportunité visible. **À conserver coûte que coûte.**

### 1.2 🟠 La progression long terme repose sur des arcs trop nombreux pour un solo

Liste des arcs identifiés via `mapId` + commentaires version :

```
v3.0  : Bourg-Boulette / cave / arbre obstacle
v3.1  : Route 1 / pont Pépite / 4 PNJ
v3.3  : NPCs Pépiteville
v3.4  : Bonus surplus, baskets
v3.6  : Anti-cheat freeze
v3.8  : Pépiteville (fruits, boots)
v3.11 : PIAFFINI / Tour Blagueur
v3.12 : Water push (mer)
v3.14 : Tamagotchi
v3.17 : Luck / Casino Bourg
v3.19 : Bestioles (hautes herbes sud)
v3.21 : Casino étendu
v3.22 : Fast travel
v3.23 : Mont Pasta-Ventoux / Contest hall
v4.0  : Daemon refactor + Pastagone + Pullman + CAPOLINO + Pierres
```

**~15 arcs livrés**, chacun avec ses PNJ, ses items, ses flags, ses dialogues. Le périmètre est **gigantesque pour un dev solo** sans testeur dédié. Risque inévitable : surface de bug ingérable (vu en Phase 1.2).

### 1.3 🔴 Onboarding sur-codé pour l'effet escompté

Le tutoriel (`MONSTER_INTRO_DIALOGUE`, 13 étapes + téléport en grotte) prescrit la règle « 10 reps = 1 case » verbalement puis envoie le joueur faire 150 reps pour pousser l'arbre. **C'est 150 pompes avant la première progression.** Pour un joueur peu sportif, c'est un mur. Pour un athlète, c'est insignifiant. Aucune adaptation au profil.

**Conséquence** : la courbe de difficulté est binaire (« je peux faire 150 pompes » / « je ne peux pas »). Le « tile 1 » n'existe pas — il y a un saut entre le tuto et le premier vrai obstacle.

---

## 2. Économie & équilibrage

### 2.1 🟢 Stats Daemon — formule très bonne

```
Force        = 25 + totalPushups / 100
Vitesse      = 25 + log10(totalSteps + 1) × 15
Défense      = 25 + 2 × défisValidés
Intelligence = 25 + totalShopSpend / 50
Endurance    = 25 + totalPlankSeconds / 60
```

Clamp `[25, 100]`. **Lecture de game design** : chaque stat capture une dimension réelle du joueur. Log10 sur les steps évite que les marathoniens dominent. Plancher 25 protège les nouveaux. **C'est probablement la meilleure idée mécanique de tout le Nexus.**

### 2.2 🟢 Saiyan : +1 si effort, −1 si farming d'easy → excellent

```
Base = 7, clamp [5, 9]
+1 si energySpentThisLevel ≥ 100
+1 si koCountThisLevel ≥ 1
+1 si hardBattles > easyBattles × 2
−1 si easyBattles > hardBattles × 2  (et hardBattles > 0)
```

Sanctionne le farming, récompense la résilience. **À conserver.**

### 2.3 🔴 Courbe XP Pokémon Gen 1 (L³) + cap niveau 50

```
xpForLevel(L) = L³
xpForLevel(50) = 125 000
```

Avec `BASE_EXP_WILD_COMMON = 64` et `computeRewardXp = baseExp × level / 7` :
- L1 vs L1 → ~9 XP/combat → **~111 combats pour L2** (théorique). En pratique L2 = 8 XP donc 1 combat suffit.
- L25 vs L25 → ~228 XP/combat → **~68 combats** entre L24 et L25.
- L49 vs L49 → ~448 XP/combat → **~327 combats** entre L49 et L50.

→ La queue est **interminable**. Si Sartay veut que ses 7 potes voient le L50, il faudrait ~3500 combats pour le dernier niveau seul. C'est probablement **mort** narrativement.

**Recommandation** : soit cap à L30 (10 fois moins de combats requis), soit baseExp dynamique (boss 4x, rivaux 3x).

### 2.4 🟠 Badges tous capés à 200 XP

Décision récente (commit `c8bb83d`) : tous les badges Nexus capés à 200 XP. 5 badges → 1000 XP max sur l'ensemble du jeu. Pour des joueurs qui font 40k XP/an de reps, **les badges sont insignifiants côté XP**. Leur valeur est purement symbolique/collectionnée. ✅ Décision cohérente avec « le jeu n'inflate pas l'XP de l'app PushQuest ».

### 2.5 🔴 Casino — économie potentiellement cassée

Sources d'énergie identifiées :
- Reps quotidiennes (variable)
- Bonus surplus (one-shots des PNJ)
- Gains casino (cockfight, lotto-poule, slot, pattern-spin, stop-ou-encore)

5 jeux casino. Tous utilisent `Math.random()` côté serveur. Si l'EV (expected value) > 0 sur même un seul → exploit infini d'énergie. **À vérifier sur chaque jeu** (centralisé en Phase 1.8).

Cap journalier identifié : `casinoBetsToday ≤ 10` pour `bet`, `cockfightDate` pour cockfight, `stopOuEncorePlaysToday`, `slotMachinesPlayedToday`, `lottoPouleDate` (1/j). **Mais** : pas de cap cumulé sur le **gain total** d'un jour. Un joueur chanceux peut multiplier son énergie sans plafond.

### 2.6 🟡 Shop — pas de cap de dépense

`totalShopSpend` est tracké (sert à la stat Intelligence) mais aucun cap journalier. Un joueur peut tout dépenser d'un coup ou rien. Pas un bug, mais aucun rythme imposé.

---

## 3. Progression & gating

### 3.1 🟢 Gating par badges/flags — propre

Chaque arc débloque le suivant via un flag (`piaffiniRescued`, `pastagoneEscaped`, etc.). Lecture simple, idempotent, lisible dans le code.

### 3.2 🟠 Gating par défis sportifs — bonne idée, mauvais équilibrage

Pousser l'arbre = 150 reps. Défis Champions de Muscuville = volumes inconnus (à mesurer dans `champion/route.ts`). Le gating crée des **murs déterministes**, mais sans courbe ajustée au profil ça revient au pb du tuto (1.3).

### 3.3 🔴 Aucun système de skip / aide / contournement

Pas de menu « j'abandonne cet arc », pas de réduction du coût après N tentatives, pas de hint après un dialogue répété 5 fois. Un joueur bloqué reste bloqué. Vu le bug récent « Gg-rem coincé dans shop_interior » : c'est arrivé **en vrai sur la prod**.

---

## 4. Combat Daemon

### 4.1 🟢 Formule HP Pokémon Gen 1 fidèle

```
maxHp = floor((End + 10) × 2 × Lvl / 100) + Lvl + 10 + bonusEnd
```

### 4.2 🟢 Crit cap à 35 % — Cohérent

```
crit = 0.0625 + Int/500 + happiness/1000, max 0.35
```

### 4.3 🟢 Bonheur ×0.5 à ×1.5 — Effet visible

```
happinessMultiplier(h) = 1 + (h - 50) / 100
```

### 4.4 🔴 Combat = JSON `activeBattle` mutable — voir Phase 1.2 §4.4

Risque de désynchro client/serveur. Pas de game design en soi, mais le combat est **fragile**.

### 4.5 🟠 Types implémentés mais nombre limité

`DaemonType` énuméré : Normal, Feu, Eau, Plante, Electrique, Vol, Psy, Pate, Combat, Roche.  
Aucune table de faiblesses/résistances visible dans `daemon.ts`. À vérifier dans `combat.ts` ou `attacks.ts` (Phase 1.8).

---

## 5. Items & inventaire

| Catégorie | Count |
|---|---|
| Items totaux | 48 |
| Wearables (baskets, brassards, lunettes…) | ~10 (parsage rapide) |
| Consommables | ~15 |
| Stockables (gourde, bidon) | 2 |
| Cosmétiques | ~5 |

### 5.1 🟢 Wearables à durabilité — bon design

Baskets réduisent le coût de déplacement de 10→8 pendant 500 pas. Trade-off lisible.

### 5.2 🟡 48 items pour 7 joueurs — surface trop grande

Probablement trop d'items pour qu'un joueur les goûte tous. Phénomène classique de jeu solo. Pas critique, mais 30 % des items doivent être rarement vus.

---

## 6. Synthèse criticité

| # | Constat | Criticité |
|---|---|---|
| 1 | Onboarding = mur 150 reps non gradué | 🔴 |
| 2 | Courbe L³ + cap L50 = queue interminable | 🔴 |
| 3 | Casino sans cap de gain journalier cumulé | 🔴 |
| 4 | Aucun système de skip/contournement | 🔴 |
| 5 | 15 arcs pour un dev solo + 7 joueurs | 🟠 |
| 6 | 48 items, dilution attention | 🟡 |
| 7 | Pas de cap shop journalier | 🟡 |

---
