# AUDIT COMPLET — NEXUS JAUNE ÉCLAIR (chapitre yellow)

> Audit factuel et **sans concession** du sous-système `src/lib/gamebook/yellow/` + `src/app/gamebook/yellow/`.
> Branche `feat/nexus-yellow`. ~5 200 lignes de logique (battle + data) + UI + multijoueur.
> Daté du 2026-06-06. Les formules sont **extraites du code réel**, pas reconstituées de mémoire.

---

## 0. Périmètre & volume

| Domaine | Fichiers clés | LOC |
|---|---|---|
| Moteur de combat | `battle/engine.ts` | 884 |
| Espèces | `data/species.ts` | 904 (68 Daemons) |
| Formules pures | `battle/{stats,damage,xp,capture,ai,status,typeChart,rng}.ts` | ~600 |
| Données | `data/{moves,cts,badges,items,encounters,biomes,sbire,trainers,*Config}.ts` | ~1000 |
| UI | `app/gamebook/yellow/{MapView,BattleScreen,BattleControls,YellowDevClient,...}.tsx` | gros |
| Multijoueur | `multiplayer/{useCasinoPresence,useCasinoChallenge,useCasinoBattle,mp}.ts` + store | ~600 |
| Tests | 21 fichiers `.test.ts`, **159 tests verts** | — |

**État global :** chapitre **mature et jouable en solo**, riche (combat Gen-1 complet, économie reps, Saiyan/EV/IV, capture, évolutions, sbire, arène, multijoueur PvP). MAIS plusieurs zones en **transition cassée** (arène réduite à 1 badge) et **non testées** (PvP 2 clients), détaillées plus bas.

---

## 1. FORMULES (exactes, depuis le code)

### 1.1 Stats (`battle/stats.ts`) — Gen 1 strict, 5 stats
- **PV** : `⌊((2·Base + IV + ⌊EV/4⌋)·niv)/100⌋ + niv + 10`
- **Autres** : `⌊((2·Base + IV + ⌊EV/4⌋)·niv)/100⌋ + 5`
- **IV** 0..15. **`spc`** sert d'attaque ET de défense spéciale (pas de split).
- **Bonus Saiyan** ajouté À PLAT par-dessus (PV ×3/pt, autres ×1/pt).
- ⚠️ **Écart assumé vs Gen 1** : le vrai Gen 1 fait `2·(Base+IV)` (IV compte double). Ici `2·Base+IV` → un IV pèse **moitié moins**. Documenté, impact ~niv/13 sur une stat. OK.

### 1.2 Dégâts (`battle/damage.ts`) — Gen 1
- `base = ⌊⌊(⌊2·niv/5+2⌋·power·Atk)/Déf⌋/50⌋ + 2`
- `dégâts = ⌊⌊⌊base·crit⌋·STAB⌋·typeEff⌋·rand` ; **crit ×2**, **STAB ×1.5**, **rand 0.85–1.00**, min 1.
- **Crit Gen 1** : `p = ⌊VitesseBase/2⌋ / 256` (×8 si move highCrit, plafond 255/256). → les rapides critent plus.
- **Catégorie par TYPE** (Gen 1) : NORMAL/COMBAT/VOL/POISON/SOL/ROCHE/INSECTE/SPECTRE = physique ; FEU/EAU/PLANTE/ELEC/GLACE/PSY/DRAGON = spécial.

### 1.3 XP & courbe (`battle/xp.ts`)
- **Courbe douce** : XP cumulée pour niv L = **`12·L²`** (ex. niv 50 = 30 000, niv 100 = 120 000). Volontairement plate (l'ancienne L³ était trop longue).
- **XP gagnée** = `⌊baseExp·nivVaincu/5⌋` (×1.5 vs dresseur).
- Apprentissage : 4 slots max ; au-delà → `pendingMoves` (écran d'apprentissage post-combat).

### 1.4 Coût des attaques en reps (`data/combatCostConfig.ts`)
- **`coût = max(1, ⌈(50/PP)·(1+niv/25)⌉)`** — PP bas = cher, niveau élevé = cher. **PP illimités** (le `pp` ne sert QUE de diviseur de coût).
- Charge Désespérée : gratuite (index −1), recul.

### 1.5 Énergie par combat (`data/badges.ts`)
- Cap = **`200 + 150·badges`**. repsCap +**250**/badge.
- ⚠️ **Non retuné** : le plan "10 badges → +100 cap / +30 énergie" n'a PAS été appliqué (scope réduit). Avec 1 seul badge obtenable (voir §3), valeurs actuelles = +250 cap / +150 énergie.

### 1.6 IV / "potentiel" (`data/ivConfig.ts`)
- Sauvages : plancher d'IV = `⌊12·quotaRatio⌋` (proche du quota = meilleurs IV, dans [12,15] à quota bouclé). Chance de **PARFAIT** (tous IV=15) = `min(0.3, 0.25·overshoot)`.
- Paliers affichés : D/C/B/A/S/PARFAIT (somme IV 0..75).

### 1.7 EV / expérience de combat (`data/evConfig.ts`)
- +**3** dans la **stat-signature** du vaincu par victoire. Cap **252/stat**, **510 total**. Contribution = `⌊EV/4⌋` dans le terme Gen-1.
- PvP : EV au seul actif vainqueur (pas de partage).

### 1.8 Saiyan (`data/saiyanConfig.ts`)
- Points/niveau : **0** si amende dans la fenêtre, **2** si quota dépassé chaque jour, **1** sinon. Répartition libre, PV ×3/pt.

### 1.9 Capture (`battle/capture.ts`)
- `A = catchRate·ballBonus·hpFactor·statut·rareté·extra` ; `hpFactor = (3·max−2·cur)/(3·max)` (1/3 plein → 1 à 1 PV). `p = min(1, A/CALIBRATION)`. Quota atteint = bonus extra.

### 1.10 Type chart (`battle/typeChart.ts`)
- **15 types**, table Gen-1 complète (0/0.5/1/2). Cohérente et testée.

---

## 2. RÈGLES de combat (`battle/engine.ts`)

- **Tour** : switch > priorité de capacité > Vitesse effective > 50/50 RNG sur égalité.
- **Statuts** (`status.ts`) : BRÛLURE (Atq÷2 + dégâts/tour), PARALYSIE (Vit÷2 — *choix moderne, Gen 1 = ÷4* — + 25% rate son tour), POISON/TOXIC, SOMMEIL, GEL (définitif façon Gen 1, assumé), CONFUSION, VAMPIGRAINE.
- **Switch forcé** après KO ; **fuite** (sauvage only) ; **capture** (sauvage only).
- **XP/EV** distribués au KO de l'ennemi ; partage d'XP entre Daemons ayant combattu (`participated`).
- **PvP** (`resolveTurnPvp`) : 2 actions explicites, aucune IA, déterministe (seed), XP **bilatérale** (`awardExpPvp`).
- **Déterminisme** : RNG seedé (`rng.ts`), état clonable, `seed` persistant entre tours → rejouable. **Aucun `Date.now()`/`Math.random()` dans le moteur** (vérifié) sauf génération de seed à la création.

---

## 3. CONTENU

### 3.1 Espèces (68)
- Structurées en **familles de 3 stades** (sauf panthères). Répartition par type : **Combat 12, Vol 12, Feu 9, Plante 12** (avec anteater+panthère), Eau 8, Élec 7, Poison 6, Roche 6, Psy 5, puis **Normal/Glace/Sol/Insecte/Spectre/Dragon = 3** chacun.
- **Inédits ajoutés** : famille tamanoir (Tamanpousse→Fourmilierre→Gloutanoir, drain-tank), Panthéon (Normal, souche) + Florapanthe (Plante). **Boss-only** (pas capturables ; pas de méthode d'évolution joueur → Panthéon NE PEUT PAS encore être offert sans extension moteur).
- ⚠️ Types **minces** (3 espèces) → composer une équipe boss mono-type Spectre/Dragon/Glace/Sol/Insecte = quasi tout le pool.

### 3.2 Attaques (`data/moves.ts`) — ~42 moves
- Couverture : chaque type a 2-3 attaques (early/mid/late) + moves de statut/buff. Signature **Étreinte Sylvestre** (Plante, 75, drain 50%) bien calibrée (audit coût : 9-15 reps, premium justifié par le drain).
- ⚠️ Méga-Sangsue sous-calibrée (40 pow / 8 reps) mais c'est un move de début.

### 3.3 Dresseurs & arène (`data/trainers.ts`, `maps.ts`)
- **Arène = "Bosquet Sacré"** (15×10, plein écran) : 4 gardes (flags) + Druide Sylvain (boss, badge Feuille, gaté par les 4 gardes). PNJ **invisibles** (dessinés dans l'image), portraits en intro/outro.
- Route Nord : 2 dresseurs (Léo, Mia) + zone sauvage.
- **Sbire** (`data/sbire.ts`) : rival 2×/jour, miroir puis faiblesse, 29 conseils, reward énergie/ball.

### 3.4 Rencontres (`data/encounters.ts` + `biomes.ts`)
- Route Nord : taux 0.14, pondéré par **biome** (montagne/sapin/eau) ET **effort réel** (pompes→Combat, squats→Roche/Sol, quota→Élec, dépassement→rares). Pur/déterministe.

---

## 4. ÉCONOMIE
- **Reps** = monnaie + énergie de combat. Crédités la nuit (reps de la veille, plafonné repsCap). Dépensés en attaques, boutique, Super Pasta.
- **Super Pasta** : +1 niveau, prix `(60+3·jours)·1.5^achatsDuJour` → flambe vite (anti-abus).
- **CT** (17) : achetées en reps, gating par badge. **Sbire** : +50 énergie (1re vict./jour), +1 ball (2e).

---

## 5. MULTIJOUEUR (casino + PvP)
- **Présence** : canal Pusher public `gamebook-yellow_casino`, position throttlée par tuile, hello/disconnect, purge fantômes. **Éphémère** (rien en base).
- **Défi** : machine à états, timeout 20s, tie-break des défis mutuels.
- **PvP** : dual-déterministe, état canonique partagé + vue inversée pour l'invité (BattleScreen quasi inchangé). Conséquences RÉELLES (XP/KO/reps). Garde-fous : **checksum de désync**, **version de protocole**, **timeout de tour 35s**, **abandon**, **logs `?mpdebug`**.
- **Réputation** : V/D/abandons + Daemon fétiche + attaque favorite, persistés.

---

## 6. CE QUI VA ✅
1. **Moteur de combat solide, pur, testé** (Gen-1 fidèle, déterministe, 159 tests).
2. **Économie reps cohérente** (coût ∝ puissance, courbe d'énergie, anti-abus Super Pasta).
3. **Couplage fitness↔jeu fort et original** : effort réel → IV, Saiyan, rencontres, énergie. C'est l'ADN, et c'est réussi.
4. **Combat robuste après fixes** (anti-freeze, ordre KO, PV jamais figés, contrôles fixes).
5. **Architecture isolée** (`yellow/`), additive, solo prod protégé.
6. **PvP élégant** (dual-déterministe + checksum) — design de qualité.
7. **Pipeline d'assets** maîtrisé (sharp : découpe, redim, compression 8Mo→425Ko).

---

## 7. CE QUI NE VA PAS ❌ (sans filtre)
1. **🔴 Arène cassée en l'état** : seuls **1 badge (plante)** est obtenable. Feu/Eau/Champion ont été retirés → **progression d'arène incomplète**, et les **CT gatées feu/eau/champion (ct08-16) sont mortes** (inaccessibles). C'est un état transitoire assumé mais **livré tel quel = bancal**.
2. **🔴 PvP jamais testé à 2 clients** : tout le réseau (présence/défi/combat) compile et est logique, mais **0 validation réelle**. Désync silencieuse possible (le checksum la *détecte* mais ne la *corrige* pas).
3. **🟠 Panthéon "à offrir plus tard" impossible** sans extension : pas de méthode d'évolution par item/stone → la promesse "un boss offre Panthéon" nécessite du code moteur non écrit.
4. **🟠 Code mort / incohérent** :
   - IA : seul le niveau **"trainer"** est utilisé (aucun boss en "ace") → la logique de switch défensif (`bestSwitchIndex`) et le niveau "ace" sont **inutilisés**.
   - IA : `scoreMoves` filtre `slot.pp <= 0` alors que **les PP ne descendent jamais** (illimités) → **check mort**.
   - `pp` dans les moves : sémantiquement trompeur (sert de coût, pas d'usages).
5. **🟠 Pas de reconnexion PvP** : une coupure réseau = forfait sec. Timeout 35s couvre l'absence mais le joueur frozen peut, en théorie, se déclarer aussi vainqueur (double-win) — cas limite réel.
6. **🟠 Collisions/positions d'arène "à l'aveugle"** : grille codée sans calage visuel précis (arbre central, entrée) → à valider (quadrillage `?grid` fourni).
7. **🟡 Énergie/repsCap non retunés** pour la cible multi-badges (valeurs +250/+150 héritées de l'ancien design 3 badges).
8. **🟡 Poids des assets** : plusieurs sprites dex restent **1-2 Mo** (divinpate 2Mo, etc.) → chargement lourd sur mobile/Hobby.
9. **🟡 Couverture de tests partielle** : moteur/données bien couverts, mais **0 test** sur le multijoueur (netcode), les maps, l'UI. Le solo bug "freeze" n'avait pas de test.
10. **🟡 Types minces** (Spectre/Dragon/Glace/Sol/Insecte = 3 espèces) → arènes mono-type futures auront peu de matière.
11. **🟡 Bug connu hors-yellow mais impactant** : perte des bonus à minuit (cf. mémoire `bug-midnight-bonuses`).
12. **🟡 Auth "weak by design"** : n'importe quel code ≥3 char → ouvre l'accès. OK entre potes, mais le PvP "réel" sur cette base = aucune garantie d'identité/anti-triche.

---

## 8. SWOT

**Forces** : moteur pur & testé · couplage fitness↔RPG unique · économie saine · archi isolée · PvP au design élégant · pipeline assets maîtrisé.

**Faiblesses** : arène incomplète (1 badge) · PvP non testé · code mort (IA/PP) · couverture tests partielle UI/réseau · assets lourds · contenu mince sur 6 types.

**Opportunités** : modèle "1 arène, PNJ par badge" extensible · panthères élémentaires (6 formes) = gros potentiel de collection · PvP → tournois/classement entre potes · biomes → vraies zones de chasse · pierres d'évolution = nouveau système.

**Menaces** : quota Pusher Sandbox (200k msg/j) · déterminisme PvP cassé par déploiement partiel/cache · combat réel = griefing/frustration entre amis · dépendance Pusher/Neon (services tiers, cold start) · dette si on empile du contenu sans retuner l'éco.

---

## 9. À FAIRE (priorisé)

**P0 — rendre l'arène cohérente :**
- Décider : soit **rebrancher Feu/Eau/Champion** (futurs paliers du modèle "PNJ par badge"), soit **assumer 1 badge** et retirer les CT mortes ct08-16 du catalogue tant qu'elles sont inaccessibles.
- Retuner repsCap/énergie selon le nombre réel de badges visés.

**P1 — fiabiliser le PvP (après 1er test 2 clients) :**
- Reconnexion légère (renvoi d'état à la reprise).
- Corriger le cas double-win du timeout (notifier le frozen).
- Lever le flou anti-triche si on ouvre au-delà des potes.

**P2 — débloquer les panthères :**
- Méthode d'évolution **par item/pierre** (extension `evolution`) → permet d'offrir Panthéon + les 6 formes.

**P3 — contenu & équilibrage :**
- Étoffer les types minces (Spectre/Dragon/Glace) si arènes dédiées.
- Compresser/redimensionner les sprites dex lourds (>500 Ko).

**P4 — tests :**
- Tests d'intégration sur le store PvP (résolution, swap, forfait, désync).
- Test de non-régression du combat solo (la séquence qui figeait).

---

## 10. À ENLEVER / NETTOYER
- **Code mort IA** : niveau "ace" + `bestSwitchIndex` (jamais appelés) → soit on les CÂBLE (boss en "ace"), soit on les retire.
- **Check `slot.pp <= 0`** dans l'IA (mort, PP illimités).
- **CT mortes** ct08-16 (feu/eau/champion) tant que ces badges sont inaccessibles → masquer ou rebrancher.
- **Trainers supprimés** (IGNIS/FLORA/ONDINE/RIVALDI) : confirmer qu'on les recrée plus tard, sinon retirer leurs CT associées.
- **`arena_full.png` (8 Mo)** : plus utilisé par l'arène → à supprimer du `public/` pour alléger le repo.
- **`AUDIT_NEXUS_2026-05-27.pdf`** + assets non suivis traînant à la racine/Downloads.

---

## 11. Dette technique
- 2 erreurs eslint pré-existantes `set-state-in-effect` dans BattleScreen (partiellement refactoré).
- `pp` à resignifier (coût) — au minimum un commentaire/renommage.
- Pas de schéma de migration : tout le yellow vit dans `GamebookProgress.flags`/save JSON (additif, OK, mais non versionné fort → `parseSave` défensif compense).
- Multijoueur dépend d'un compte `isSystem` + env Pusher présent (preview peut-être sans).

---

## Verdict
**Un chapitre ambitieux et techniquement soigné sur le cœur (combat, éco, fitness↔RPG), mais livré dans un état de transition assumé qui a des trous réels** : arène réduite à 1 badge avec du contenu CT mort, PvP brillant mais non éprouvé, et de la dette (code mort IA, assets lourds, tests UI/réseau absents). Rien de cassé en solo ; le risque est concentré sur **l'arène incomplète** (P0) et le **PvP non testé** (P1). Le reste est de l'itération saine.
