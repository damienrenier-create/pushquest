# AUDIT_JOUEUR_06_PROGRESSION.md

> Niveaux attendus par zone, calibrage Daemons PNJ, courbe XP, combats nécessaires.

---

## 1. Niveau Daemon attendu par zone

### 1.1 Niveaux des PNJ adverses (récoltés du code)

| Zone | PNJ adverse | combatLevel |
|---|---|---|
| Pastagone Tour de Garde | NPC rotatif 1 | 8 |
| Pastagone Tour de Garde | NPC rotatif 2 | 9 |
| Pastagone Tour de Garde | NPC rotatif 3 | 9 |
| Pastagone Tour de Garde | NPC rotatif 4 (faible) | 4 |
| Pastagone Tour de Garde | NPC rotatif 5 (fort) | 14 |
| Pastagone Inspecteur Coulter | mini-boss | 12 |
| Pastagone CAPOLINO mid | rival | 13 |
| Pastagone Boss final | Doberman Alpha | 15 |
| Daemon nouveau (cuisine puzzle / orphan) | starter | 1 |

(Sources : [src/lib/gamebook/pastagoneTourNpcs.ts](src/lib/gamebook/pastagoneTourNpcs.ts), [src/app/api/gamebook/pastagone/](src/app/api/gamebook/pastagone/))

### 1.2 Niveau attendu du joueur par zone

| Zone | Niveau attendu | Justification |
|---|---|---|
| Bourg-Boulette / Route 1 | L1 | Spawn, pas de combat |
| Pépiteville / Hautes-Pâtes / Tour | L1 (pas de combats hors PIAFFINI rescue qui n'est pas un combat) | — |
| Macaron'île / Tour Pullman | L1-L3 | Présentations |
| Grass Sud | L3-L5 | Compagnon obtenu, bestioles passées |
| Muscuville (champions + arène) | L5-L8 | Combats arène, contests, revanches |
| Mont | L5-L8 | Pas de combats Daemon sur Mont |
| Pasta Vegas (TB bar + casinos) | L8-L10 | 4 PNJ TB |
| Pastagone tour de garde | L8-L12 | NPC rotatifs 4-14 (variance large) |
| Coulter | L12 (gap : combat à L12) | Mini-boss |
| CAPOLINO mid | L13 | Combat rival |
| Boss Doberman Alpha | L15 | Boss final |

### #99 — Coulter à L12 vs joueur attendu ?
- **Diagnostic** : si le joueur arrive à Pastagone à L10 (après Vegas + arène Muscuville), Coulter est à L12. C'est faisable, mais peut nécessiter quelques combats d'avancée.
- **Status** : 🟡 acceptable — voir si le créateur veut adoucir Coulter à L10 ou laisser à L12.

### #100 — Doberman Alpha à L15 → mur
- **Diagnostic** : si joueur arrive à L13-L14, c'est un combat serré mais faisable. Si à L10, c'est dur.
- **Status** : 🟡 acceptable mais à monitorer avec les 8 joueurs réels.

### #101 — Variance tour de garde 4-14 = saut difficile
- **Diagnostic** : la Tour de Garde de Pastagone propose des NPC entre L4 et L14. Si un joueur tombe par malchance sur le L14 alors qu'il est à L10, c'est rude.
- **Localisation** : [src/lib/gamebook/pastagoneTourNpcs.ts](src/lib/gamebook/pastagoneTourNpcs.ts)
- **Criticité** : 🟡 Confort
- **Fix proposé** : rapprocher la variance (L8-L12 par exemple) pour éviter le PNJ trop faible (L4 = sans intérêt) ou trop fort (L14 = pénible). Effort 10 min.
- **Confiance** : Élevée

---

## 2. Courbe XP & nombre de combats

### 2.1 Courbe L³ Pokémon Gen 1 Medium Fast

| Level | xpForLevel(L) = L³ | XP requis pour passer ce level |
|---|---|---|
| 1 | 1 | — |
| 5 | 125 | +61 (vs L4) |
| 10 | 1000 | +271 (vs L9) |
| 15 | 3375 | +631 (vs L14) |
| 20 | 8000 | +1141 (vs L19) |
| 25 | 15625 | +1801 (vs L24) |
| 30 | 27000 | +2611 (vs L29) |
| 40 | 64000 | +5781 |
| 50 | 125000 | +12251 |

### 2.2 XP par combat (formule `computeRewardXp(baseExp, defeatedLevel) = max(1, floor(baseExp × L / 7))`)

| Niveau Cible | baseExp | XP gagné |
|---|---|---|
| L1 wild commun (baseExp=64) | — | 9 |
| L5 wild | 64 | 45 |
| L10 wild | 64 | 91 |
| L15 wild | 64 | 137 |
| L12 Coulter (rival 120) | 120 | 205 |
| L13 CAPOLINO mid (120) | 120 | 222 |
| L15 Boss final (300) | 300 | 642 |
| L25 wild | 64 | 228 |
| L25 boss hypo | 300 | 1071 |

### 2.3 Combats requis par tranche

| Tranche | XP requis | XP/combat moy. | Combats requis |
|---|---|---|---|
| L1 → L5 | 124 | 30 (mix L1-L5) | ~4 |
| L5 → L10 | 875 | 70 | ~13 |
| L10 → L15 | 2375 | 130 (mix) | ~18 |
| L15 → L20 | 4625 | 180 | ~26 |
| L20 → L25 | 7625 | 220 | ~35 |
| L25 → L30 | 11375 | 250 | ~46 |
| L30 → L40 | 37000 | 330 | ~112 |
| L40 → L50 | 61000 | 400 | ~153 |

### #102 — Verdict courbe XP
- **L1→L15 (parcours principal)** : ~35 combats. **OK** vu l'inventaire ~25 PNJ Pastagone tour + 5 boss + ~10 routes = ~40 combats disponibles. ✅
- **L15→L25 (post-Pastagone, à venir Arc 3)** : ~60 combats nécessaires. **Pour 8 amis, prendra des semaines** si on ajoute du contenu équivalent.
- **L25→L50 (queue)** : ~311 combats. **Mur impraticable** sauf si Arc 3 + Arc 4 ajoutent ~150-200 combats.
- **Conclusion** : pour la **v1 actuelle (8 amis, parcours jusqu'à L15)**, la courbe est correcte. Le « mur L50 » est un problème **théorique** uniquement.

### #103 — Recommandation explicite
- **À 8 joueurs, en v1 jusqu'au boss Pastagone** : laisser tel quel.
- **Quand Arc 3 sera ajouté** (qui ouvre L15→L25 voire L30) : envisager `BASE_EXP_BOSS_FINAL` × 2 pour rééquilibrer.
- **Avant L25** : pas d'urgence.
- **Status** : 🟡 acceptable v1

---

## 3. Récompenses XP par zone

| Zone | XP/combat estimé | Note |
|---|---|---|
| Tour Pastagone (L4-L14) | 36-128 wild + 230-300 rivaux | OK |
| Coulter (L12, mini-boss rival 120) | 205 | Bon |
| CAPOLINO mid (L13 rival) | 222 | Bon |
| Boss Doberman Alpha (L15, BOSS 300) | 642 | Très bon |

**Diagnostic** : les rivaux et boss donnent un bonus net (×2-3 vs commun). Cohérent.

---

## 4. Économie globale énergie (ratio production / consommation)

### 4.1 Production journalière (par joueur sportif moyen)

Hypothèse 1 joueur fait 100 pompes + 100 squats + 60s plank :
- Pompes : 100 reps
- Squats : 100 reps
- Plank : 60s / 5 = 12 reps
- **Total reps/jour** : ~212

### 4.2 Consommation journalière (mouvement seul)

Hypothèse : le joueur fait 20 cases d'exploration / jour :
- 20 × 10 = 200 reps

### 4.3 Sources supplémentaires d'énergie

| Source | Reps/jour |
|---|---|
| 2 pommiers | 2 × 240 = 480 (3×80 chacun) |
| 1 cerisier 5/jour | 200 |
| Capitaine équipe | 30 |
| Hôtel sleep | reset total (= recover all dépensé) |
| Boost casino | varie |

**Diagnostic** : largement excédentaire si on prend les fruits. Le déplacement est presque toujours soutenable.

### #104 — L'économie est généreuse côté énergie
- **Diagnostic** : avec 2 pommiers + cerisier proche, un joueur peut traverser ~70 cases/jour sans effort.
- **Status** : ⚪ Design intentionnel (le créateur ne veut pas que l'énergie soit punitive)

---

## 5. Total de combats prévus dans le jeu actuel

### 5.1 Combats Daemon disponibles

| Source | Nombre |
|---|---|
| Tour Pastagone (variantes) | jusqu'à 25 NPC (selon rotation) |
| Coulter (mini-boss) | 1 |
| CAPOLINO mid | 1 |
| Boss Doberman Alpha | 1 |
| CAPOLINO 4 rencontres (Muscuville/Vegas/Pastagone/fuite) | 1 combat (la 1ère et la 3e ?) |
| Combats animaux véto adoption (?) | (à confirmer si combat ou défi) |
| Combats arène Muscuville (4 champions) | 4 (combats sport, pas Daemon) |
| Champions revanche | 4 (sport) |
| Contests POMPATOR/SQUATILUS/TIROIR | 3 (sport) |

**Total combats Daemon disponibles** : ~28-30. Total XP cumulable : ~5000-6000 (assez pour L1→L20).

### #105 — Pas de wild encounters
- **Diagnostic confirmé** : grass_sud propose des bestioles bloquantes mais pas de combats Daemon (le compagnon les fait fuir).
- **Conséquence** : tout l'XP vient de PNJ. Le pool est fini.
- **Si un joueur veut farmer pour atteindre L25+** : il bloque sur l'absence de combats.

### #106 — Recommandation : ne pas ouvrir Arc 3 sans ajout de combats
- **Diagnostic** : si Arc 3 (Ville Scientifique) est ouvert demain, le joueur arrive à L15 max et bute. Sans 50+ nouveaux combats, l'Arc 3 sera bloqué par level.
- **Status** : 🟠 préventif pour le prochain arc

---

## 6. Sous-calibrage / sur-calibrage

### #107 — Tour Pastagone L4 (NPC le plus faible) sous-calibré
- **Diagnostic** : un L4 face à un joueur L10-L12 = OHKO. Aucun intérêt sauf XP minimal.
- **Fix proposé** : remonter L4 → L8 (cf. #101).
- **Confiance** : Élevée

### #108 — Tour Pastagone L14 sur-calibré
- **Diagnostic** : un L14 face à un joueur L9-L10 = mur. Si la rotation est random, c'est de la chance pure.
- **Fix proposé** : descendre L14 → L11 (cf. #101).
- **Confiance** : Élevée

### #109 — Variance Tour de Garde — recommandation finale
- **Calibrage suggéré** : tous les NPC entre L8 et L12. Variance = 4. Joueur attendu L10 ± 2.
- **Effort** : 5 min (modifier les constantes).

---

## 7. Combien de temps tient le calibrage actuel ?

### #110 — Verdict
- **Pour 8 joueurs en V1 (jusqu'à boss Pastagone L15)** : le calibrage tient. Pas d'action immédiate.
- **Quand des joueurs atteindront L15 et chercheront du contenu L15+** : impasse — Arc 3 nécessaire.
- **Si Arc 3 livré sans rééquilibrage** : un joueur passe L15 → L20 demandera 26 combats. S'il a 30 combats Arc 3, c'est juste assez. S'il en a moins, blocage XP.
- **Recommandation** : prévoir Arc 3 avec ≥ 40 combats pour permettre L15 → L20 confortablement.

---

## 8. Stats Daemon des PNJ (cf. `pastagoneTourNpcs.ts`)

Le code utilise `combatLevel` mais quid des stats de base (force, vitesse, défense, intel, endurance) ? Le `start/route.ts:156` dit « Snapshot : on assume des stats "moyennes" pour un ennemi à combatLevel donné ».

### #111 — Stats ennemi homogènes
- **Diagnostic** : tous les PNJ d'un même level ont les mêmes stats moyennes côté combat. Pas de variabilité.
- **Conséquence** : un orang-outan L12 (DESSINGH de Coulter) et un Doberman L12 ont les mêmes stats.
- **Status** : ⚪ Acceptable v1, à enrichir si combat trop monotone.

---

## 9. Synthèse progression

| # | Titre | Criticité |
|---|---|---|
| #99 | Coulter L12 | 🟡 |
| #100 | Boss L15 | 🟡 |
| #101 | Variance tour de garde L4-L14 | 🟡 |
| #102 | Courbe XP L1→L15 OK | ⚪ |
| #103 | Pas d'urgence rééquilibrage | ⚪ |
| #104 | Économie énergie généreuse | ⚪ |
| #105 | Pas de wild encounters | ⚪ |
| #106 | Arc 3 sans nouveaux combats = blocage | 🟠 (préventif) |
| #107 | Tour L4 sous-calibré | 🟡 |
| #108 | Tour L14 sur-calibré | 🟡 |
| #109 | Calibrage suggéré L8-L12 | 🟡 |
| #110 | Calibrage tient pour V1 | ⚪ |
| #111 | Stats ennemi homogènes | ⚪ |

---

## 10. Action concrète immédiate

**À faire** : ajuster `pastagoneTourNpcs.ts` pour resserrer la variance des combatLevel entre 8 et 12.

```diff
- combatLevel: 4,   // (NPC 4)
+ combatLevel: 8,

- combatLevel: 14,  // (NPC 5)
+ combatLevel: 11,
```

Effort : 5 minutes.

---

*Fin AUDIT_JOUEUR_06_PROGRESSION.md*
