# INTENTIONS_RECONSTRUITES.md

> Reconstruction des intentions narratives et mécaniques **depuis le code** (commits, dialogues, archives, configs).  
> Référentiel pour les audits Partie B.

---

## 1. Ordre prévu des arcs narratifs

### 1.1 Arc principal (linéaire forcé par les flags)

| Étape | Trigger | Map principale | Flags-clé |
|---|---|---|---|
| 0 — Onboarding | Spawn | `bourgpates` | `hasSeenWelcomeScreen` |
| 1 — Rencontre Monstre | Entrée hautes herbes nord | `cave` (téléport) | `monsterCaveRevealed`, `hasEnteredTallGrass` |
| 2 — Push the tree | Joueur force 150 reps | `bourgpates` | `treeObstacleCleared`, `pioneerBadgeAwarded` |
| 3 — Pont Pépite | Route 1 + 4 PNJ défis | `route1` | (varie selon PNJ) |
| 4 — Pépiteville | Don du sac + baskets | `pepiteville` | `hasBag` |
| 5 — Hautes-Pâtes | Sortie nord Pépiteville | `hautespates` | — |
| 6 — Tour Blagueur | 4 étages + sauvetage PIAFFINI | `tower_floor_1→5` | `piaffiniRescued`, `tbBossBeaten`, `tbRewardClaimed` |
| 7 — Mer + Set de Nage | JOJO offre maillot+palmes | `la_mer` | `firstSwimDone` |
| 8 — Macaron'île | Accès via canal sud | `macaron_ile` | `(découverte)` |
| 9 — Tamagotchi/Daemon | V3T (véto) + animal | `veterinaire` | `tamagotchiInBag` |
| 10 — Grass Sud | Bestioles bloquantes | `grass_sud` | `bestiolesFirstEncountered` |
| 11 — Muscuville | Forcer bestioles avec compagnon | `muscuville` | (champion flags) |
| 12 — Mont Pasta-Ventoux | Vélo obligatoire | `mont_pasta_ventoux` | `montSummitReached` |
| 13 — Arène + Contest hall | Post-Mont | `arena_muscuville`, `contest_hall` | `contestDefi*Done` |
| 14 — Pasta Vegas | Brisure rochers Muscuville | `lasagnas_vegas` | — |
| 15 — Tour Blagueur Vegas | 4 PNJ + boss IL CAPO | `lasagnas_tb_bar/bureau` | `tbBossBeaten` |
| 16 — Tour Pullman | 4 étages : Mary Malone / Iorek / Lee / Serafina | `vegas_shoptower_*` | — |
| 17 — Pastagone | Arrest + escape | `pastagone_cellule` puis `pastagone` | `pastagoneArrested`, `pastagoneEscaped`, `pastagoneBossBeaten` |
| 18 — Rival CAPOLINO (4 rencontres) | Croisé Muscuville → Vegas → Pastagone → fuite | mixte | `pastagoneCapolinoMidBeaten`, `pastagoneCapolinoFleeShown` |
| 19 — Pierres d'évolution (Lee Scoresby) + Sérums (Serafina) | Post-Pastagone | Tour Pullman | — |

### 1.2 Arcs latéraux non bloquants

- **Casino Bourg-Boulette** (`bourgCasinoCoinsFound`) — anytime
- **Casino Pépiteville + pont (#1 hier/aujourd'hui)** — anytime
- **Jardinier Pépiteville (ROMARIN)** — rumeur d'arbres
- **Jardinier Vegas (BASILICO)** — arrosoir + énigme ordre cueillette
- **Ornithologue grass_sud** — bonus si compagnon = oiseau
- **Père Pesto** — clé bar Team Boulette (mot de passe videur)
- **Casino Lasagnas** — lotto-poule, stop-ou-encore, cockfight, slot, pattern, croupiers
- **Fast Travel (v3.22)** — entre villes connues

### 1.3 Arcs annoncés mais non implémentés (foreshadowing pur)

- **Forêt hantée** (est Muscuville, panneau VEILLEUR) — placeholder
- **Sortie ouest Vegas** (« construction ») — placeholder pour v4.x+
- **Doberman Alpha** (boss final Pastagone) — mentionné dans le code comme arc à venir
- **Donjons Magiques** (CORAM + SERAFINA tour étage 4 : « quand ton Daemon aura mûri, tu pourras entrer dans d'autres mondes ») — foreshadow Arc 3 « Ville Scientifique »
- **Concours de muscu** mentionné dans `RUMEUR_CONCOURS_DIALOGUE` puis livré comme contest_hall

---

## 2. Foreshadowing assumé vs contenu actif

### Foreshadowing assumé (le code l'a voulu)

| Source | Annonce | Statut |
|---|---|---|
| `RUMEUR_OISEAU_DIALOGUE` (Tour) | « oiseau triste au sommet » → PIAFFINI | ✅ Foreshadow correct |
| `RUMEUR_HERBES_DIALOGUE` | « hautes herbes du sud, morsures bestioles » → grass_sud | ✅ |
| `RUMEUR_CONCOURS_DIALOGUE` | « concours intersalle de muscu, annulé cette année » → contest_hall | ✅ |
| ORZO (Macaron) | « pièces tombées par terre au casino Bourg » → coin_found | ✅ |
| VEILLEUR (Muscuville) | « forêt hantée à l'est » → arc futur | ✅ Placeholder honnête |
| WILL (Vegas) | « ce couteau n'est pas d'ici, il découpe d'autres mondes » → Donjons | ✅ Foreshadow |
| LEE SCORESBY (Vegas étage 3) | « pierres d'évolution » → futur stock | ✅ |
| SERAFINA (étage 4) | « les fleurs de Macaron'île doivent fleurir » → arc futur | ✅ |

### Contenu actif

Tout ce qui correspond à un flag déjà existant (cf. § 1.1) est du contenu actif. Le créateur a livré 15+ arcs jouables.

### Zones grises (intention pas claire)

| Source | Question | Sera couvert |
|---|---|---|
| ROMARIN « arbre maléfica » | Le joueur est-il prévenu avant de cueillir le fruit −30 reps ? | B.5 |
| LYRA (Vegas) — « touche les sacs de pâtes » | Spoil du Pastagone ? Énigme de progression ? | B.2 |
| CORAM — « Poussière + Daemons + mondes » | Lore Pullman assumé ou prématuré ? | B.2 |
| `casinoBoostPctToday` croupier | Le boost s'applique-t-il à 1 jeu ou à tous les jeux du jour ? | B.3 |
| `bonusSurplus` reset à minuit ? | Bug documenté ; comportement précis ? | B.11 |
| Cap niveau Daemon | Volonté gameplay ou plafond technique ? | B.6 |
| `lottoPouleWonToday` jamais relu | Quasi-orphelin — bug ou design ? | B.12 |

---

## 3. Règles de jeu annoncées explicitement au joueur

Sources où la règle est dite au joueur en clair :

### 3.1 Mouvement & énergie

| Règle | Source | Application |
|---|---|---|
| « 10 reps = 1 case » | `MONSTER_INTRO_DIALOGUE` step 9 | `COST_MOVE = 10` dans `mapEngine.ts:325` |
| « Pour bouger il faut de l'énergie » | Intro Monstre | `spend/route.ts` MAX_SPEND_PER_CALL=500 |
| « 1 sec gainage = 1/5 énergie » | Aucune ligne joueur — implicite | `spend/route.ts:30` : `s.exercise === "PLANK" ? floor(reps/5) : reps` |
| « Dans un bâtiment, marcher = gratuit » | ROULETTE dialogue | `INDOOR_MAP_IDS` (à vérifier) |

### 3.2 Promesses XP (les principales)

| Source | Annonce | Constante côté code |
|---|---|---|
| Monstre post-pousse arbre | « 200 XP Pionnier » | `XP_REWARD_PIONNIER = 200` |
| Pont (CHAMPIO) | « 200 XP Star du Pont d'Hier » | `XP_REWARD_CHAMPIO_STAR = 200` |
| Sommet Mont | « Badge Conquérant 200 XP » | `XP_REWARD_CONQUERANT = 200` (cap v4.0, était 500) |
| JOJO post-rescue | « Badge Sauveur PIAFFINI 200 XP » | `XP_REWARD_SAUVEUR_PIAFFINI = 200` |
| Champion arène revanche | « Badge 800 XP » (dialogue NPC) / « +200 XP » (route post-fix) | `amount: 200` dans `muscuville/champion/route.ts:160` (mismatch potentiel à vérifier) |

### 3.3 Promesses énergie (one-shots)

| Source | Annonce | Mécanique |
|---|---|---|
| BUFFY (gym Bourg) | « +100 reps » | `gymGuyEnergyGiven` flag one-shot |
| DURUM (gym Pépiteville) | « +50 reps » | `durumEnergyGiven` flag |
| Papa tableau Tour | « +100 reps première fois » | `papaBoostClaimed` |
| Ornithologue grass_sud | « +50 reps si compagnon oiseau » | `ornithologueBirdBonusGiven` |
| Nageur défi | « +100 reps post-50 pompes » | `nageurDefiCompleted` |
| Brigadier FAA (Pastagone) | « +100 reps réserve » | `pastagoneFaaGiftClaimed` |
| Capitaine équipe (MARCO/POLO) | « +30 reps/jour si même équipe » | `lastTeamCaptainBonusDate` |
| Hôtel Carbonara | « Sleep = régénère reps + bonheur Daemon » | `lastHotelSleepDate` |
| Arène Vegas (MAESTRO) | « +100 reps si victoire animal » | quoique +5 happiness |
| POMPATOR/SQUATILUS/TIROIR | « +100 reps surplus si défi validé » | `contestDefi*Done` |

### 3.4 Promesses objets (cadeaux)

| Source | Objet promis | Item key |
|---|---|---|
| MAMAN/PEPITO | Sac (inventory unlock) + Baskets | `hasBag = true`, item `boots` |
| MAMAN/PEPITO | Carte des Joueurs | item `map` |
| JOJO post-PIAFFINI | Set de Nage (maillot+palmes) | item `swim_set` |
| MONSTRE post-déblocage | Amulette d'os | item `amulette_monstre` |
| BASILICO (Vegas) | Arrosoir magique | (item `arrosoir`) |
| Lee Scoresby | Pierres d'évolution | `canEvolveType` items |
| Serafina | Sérums boost permanent | `canPermanentStatBoost` items |
| Mary Malone | Potions soin Daemon | `canUseInBattle: heal_hp` |
| Iorek | Armures Daemon | `canEquipDaemon` |
| FAA (Pastagone) | +100 reps réserve | bonusSurplus |

### 3.5 Promesses Daemon

| Source | Annonce | Constante |
|---|---|---|
| Saiyan points level-up | « 7 points base, modulé par effort » | `SAIYAN_POINTS_BASE = 7`, clamp [5,9] |
| HP max | Formule Pokémon Gen 1 | `((End+10)×2×Lvl/100) + Lvl + 10 + bonusEnd` |
| Crit | « 6.25% base + Int/500 + happiness/1000, cap 35% » | `computeCritRate` |
| Bonheur multi | « ×0.5 à ×1.5 selon happiness » | `happinessMultiplier` |
| XP curve | Pokémon Gen 1 Medium Fast | `xpForLevel(L) = L³` |
| Récompense XP combat | `baseExp × defeatedLevel / 7` | `computeRewardXp` |

### 3.6 Casino — règles annoncées

| Jeu | Règle dite au joueur | Cap quotidien |
|---|---|---|
| Roulette R/N (bet) | Mise 10-50, gain ×2, max 10 paris/jour | `casinoBetsToday ≤ 10` |
| Lotto-poule | 1/16, mise 10, gain ×16, 1/jour | `lottoPouleDate` |
| Stop-ou-Encore | 3 essais/jour, mise 1-20 | `stopOuEncorePlaysToday ≤ 3` |
| Cockfight | « 21h-ouverture », 4 coqs, mise 20-200 | `cockfightDate` |
| Slot | (à vérifier mécanique) | `slotMachinesPlayedToday` |
| Pattern spin | « Pierres + cadence » | `casinoPatternSpinIndex` + bankrupt cooldown |
| Croupier Vitellino | « +10% prochain pari » | `casinoBoostPctToday` |

### 3.7 Vélos Mont

| Vélo | Coût/case | Durabilité |
|---|---|---|
| Vieux Vélo (100 reps) | 8 | 200 |
| Vélo Sport (300 reps) | 4 | 400 |
| Vélo Pro | 2 | 600+ |
| Cadence BPM | ×0.5 (60-80) / ×1.5 / ×3.0 | dans `mapEngine` Mont |

---

## 4. Zones grises confirmées (à arbitrer en Partie B)

1. **bonusSurplus reset minuit** → bug suspect, Partie B.11 confirmera.
2. **Coût rochers Muscuville (4000 reps annoncé / décrémente -25% / champion battu)** — la décrémentation est-elle bien appliquée linéaire ?
3. **Bestioles grass_sud** — « 1ère morsure douleur, suivantes −10 reps » : la 1ère est-elle vraiment gratuite ? Cas du Daemon faible mais présent ?
4. **`hasIntactItem(boots)` lors d'un spend** — si le joueur a des baskets cassées en sac, est-ce que ça réduit toujours le coût ?
5. **Dialogue Lyra qui mentionne « Pastagone »** — spoil de la map ou indice énigme ?
6. **`carte_tresor` en `availableAt: gift` mais jamais distribuée** — orphan item potentiel ?
7. **`Daemon` slot autre que 1** — y a-t-il vraiment plusieurs slots utilisés ?
8. **`tamagotchi` Json legacy** — encore source de vérité pour les comptes pré-v4.0 ?

---

## 5. Lore par univers (cohabitation revendiquée)

| Univers | Personnages-piliers | Tone |
|---|---|---|
| **Pasta humor / FSM** | Monstre Spaghetti Volant, MAMAN, PEPITO, NUTRIPATES, TRENETTE | Irrévérencieux, direct, fainéant |
| **Pokémon Gen 1** | Mécaniques combat, types (Feu/Eau/Plante/Electrique/Vol/Psy/Pâte/Combat/Roche), morphologies (crocs/bec/insecte/pattes/écailles), XP L³, BASE_EXP_RIVAL, BASE_EXP_BOSS_FINAL | Mécanique |
| **Dragon Ball / Saiyan** | Saiyan points (+1 effort, +1 KO, −1 farm easy) | Méta gameplay |
| **Pullman *His Dark Materials*** | Lyra, Roger, Will, Lee Scoresby, Mary Malone, Serafina Pekkala, Iorek, Asriel, Coulter, Faa, Coram + Daemons / Poussière / mondes parallèles | Mystique, foreshadow |
| **Mafia / Vegas** | Team Boulette, IL CAPO, Père Pesto, sbires Meowth/Jessie/Giovanni, casinos | Noir |
| **Pastagone** (police / Doberman) | Inspecteur Coulter, Brigadier Faa, Sergent Coram, Doberman Alpha (boss) | Polar |

**Décision créateur** : la fusion est volontaire et fait partie de l'identité. Aucune chasse à la cohérence inter-univers. **Mais** : à l'intérieur d'un même univers, la cohérence reste exigée (Lyra ne doit pas spoiler Asriel avant son arc, par exemple).

---

## 6. Référentiel pour les phases suivantes

Quand B.1 dira « PNJ X promet 200 XP », B.0 confirme que c'est cohérent avec `XP_REWARD_*`.  
Quand B.2 dira « Lyra prononce le mot Pastagone », B.0 sert de référence pour juger si c'est foreshadowing assumé (oui) ou spoil (à arbitrer).  
Quand B.4 dira « port mont_sommet sans doorMat », B.0 confirme que `mont_sommet` est dans la liste des intérieurs.

---

*Fin INTENTIONS_RECONSTRUITES.md*
