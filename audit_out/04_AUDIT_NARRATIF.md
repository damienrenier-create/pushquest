# AUDIT_04_NARRATIF.md — Narrative Designer

> **Périmètre** : Nexus / Gamebook subsystem  
> **Date** : 2026-05-27

---

## 1. Architecture narrative

### 1.1 Personnages identifiés

105 PNJ totaux (count `id:` dans `npcs.ts`).

**Personnages-piliers** :
- Monstre Spaghetti Volant (mentor irrévérencieux, intro)
- MAMAN / PEPITO (donneurs de sac/baskets)
- JOJO / JOJETTE / PIAFFINI (arc Tour Blagueur → sauvetage oiseau)
- CAPOLINO (rival, 4 rencontres)
- BOLOGNION (secret, mafia Team Boulette)
- Asriel / Coulter / Faa / Coram (Pullman PastaVegas, 4 étages)
- Roger / Lyra / Will / Lee (lore Pullman)
- Mary Malone / Iorek / Lee Scoresby / Serafina Pekkala (Pullman, donneurs)
- Champions Muscuville (Pompator / Squatilus / Tiroir + revanche)

**Diagnostic** : 4 univers de référence se croisent (Pokémon Gen 1, Dragon Ball / Saiyan, Pullman *His Dark Materials*, Pasta humor). C'est riche, **mais** :

### 1.2 🟠 Fusion d'univers non assumée

Pullman (sérieux/mystique) + blagues de pâtes + Pokémon → ton oscillant. Le Monstre Spaghetti Volant brise le 4e mur (« arrête de me regarder comme ça ») cohabite avec Asriel / Iorek (références fidèles à un univers tragique). **Aucun joueur n'a verbalisé la dissonance pour le moment, mais c'est un risque de cohésion.**

---

## 2. Dialogues

### 2.1 🟢 Ton du Monstre Spaghetti Volant — excellent

Direct, fainéant, paternel, drôle. C'est **la voix forte** du jeu :
> « 10 reps = 1 case. Pas plus, pas moins. »  
> « Va te faire des pompes avant. »  
> « Et arrête de me regarder comme ça. »

### 2.2 🟢 PIAFFINI / Franss-joke — cassure 4e mur réussie

Le rappel pour blaguer « j'avais oublié un truc → AHAHAH c'était une blague » est exactement le registre d'une amitié geek bienveillante (clin d'œil au Dofus de Sartay, je suppose). À conserver.

### 2.3 🟡 Dialogues conditionnels — gestion fragile

`PEPITO_DIALOGUE_FIRST` vs `PEPITO_DIALOGUE_AFTER` : pattern clair. **Mais** : v3.22 réutilise le même dialogue pour MAMAN OU PEPITO selon la branche du joueur. Le texte parle de « *Te tend un sac* » et « *Sort une paire de baskets* » — pour MAMAN c'est cohérent, pour PEPITO aussi. ✅ Bon réemploi.

### 2.4 🟠 TOWER_JOKES — humour à 100 % spécifique

```
"Pourquoi est-ce que les pâtes sont sportives ?"
"Parce qu'elles ont la forme."
```

4 blagues sur les pâtes. Drôle 1 fois, lassant à la 10e visite. **Aucun gate pour éviter le replay.** À mettre dans Phase 1.5 (UX).

### 2.5 🔴 Aucune table centrale de dialogues

`dialogue.ts` contient ~10 dialogues système (intro, pioneer, pepito, piaffini, jojo, franss-joke, mont, rumeurs, tower jokes). **Tous les autres dialogues** (PNJ ponctuels, champions, mafiosi, jardinier) sont éparpillés dans `npcs.ts` (2565 lignes) ou inline dans les routes.

→ Impossible de relire la narration d'un arc en un endroit unique. Tout audit éditorial (cohérence du « tu » / « vous », orthographe, ton) nécessite de scanner 5+ fichiers.

---

## 3. Arcs narratifs

### 3.1 Inventaire des arcs (par mapId + flags)

| Arc | Trigger | Sortie | Récompense | Statut |
|---|---|---|---|---|
| Intro | Spawn `bourgpates` | `treeObstacleCleared` | — | ✅ Live |
| Pionnier | Pousser arbre | `pioneerBadgeAwarded` | Badge 200 XP | ✅ Live |
| Pont Pépite | 4 PNJ Route 1 | Accès `pepiteville` | — | ✅ Live |
| Tour Blagueur | `tower_floor_1→4` | `piaffiniRescued` | Set de Nage | ✅ Live |
| PIAFFINI rescue | Sommet tour | Badge Sauveur 200 XP | + dialogue JOJO | ✅ Live |
| Mer | Set de Nage équipé | `firstSwimDone` | Accès sud | ✅ Live |
| Mont Pasta-Ventoux | Atteindre sommet | Badge Conquérant 200 XP | + Muscuville/Contest | ✅ Live |
| Muscuville | 3 défis Champions | Badge Champio Star (revanche) | 200 XP | ✅ Live |
| Contest Hall | 3 défis | `contestDefiXxxDone` | XP cumulé | ✅ Live |
| Bestioles | Hautes herbes sud | `bestiolesFirstEncountered` | Bestiaire | ✅ Live |
| Tamagotchi | v3.14 | Daemon migration | Pierres / Sérums | ✅ Live |
| Casino Bourg | Coin trouvée | `bourgCasinoCoinsFound` | Casseur de banque | ✅ Live |
| Pastagone | Arc complet | `pastagoneEscaped` + `pastagoneBossBeaten` | Bolognion / Pierres | ✅ Live |
| Pullman PastaVegas | 4 étages | Coulter mini-boss | Wearables / Sérums | ✅ Live |
| CAPOLINO rival | 4 rencontres | Combat boss puis fuite | Lore | ✅ Live |
| Macaron'île | Serafina | Sérums boost permanent | XP | ✅ Live |
| Fast travel | v3.22 | Téléport entre villes | — | ✅ Live |

### 3.2 🔴 Aucune linéarisation explicite

Un joueur ne sait pas **dans quel ordre** faire les arcs. Le seul guide est « j'ai débloqué tel flag, donc je peux maintenant aller là ». Avec 17 mapIds et ~15 arcs, c'est désorientant.

### 3.3 🟠 Arcs sans clôture émotionnelle

Plusieurs arcs débloquent un badge puis… rien. PIAFFINI a une vraie clôture (dialogue JOJETTE + cadeau). Mont Pasta-Ventoux a une voix-off sommet. **Pastagone** se termine sur quoi ? À vérifier (Phase 1.8). Si un joueur traverse Pastagone et ne reçoit pas un beat narratif fort à la sortie, c'est anti-climactique.

### 3.4 🟢 Foreshadowing présent

`RUMEUR_OISEAU_DIALOGUE`, `RUMEUR_HERBES_DIALOGUE`, `RUMEUR_CONCOURS_DIALOGUE` plantent PIAFFINI, bestioles, contest. ✅ Bonne pratique de game writing.

---

## 4. Items narratifs

### 4.1 🟢 Items avec lore

- Gourde, Bidon d'IL CAPO (trophée)
- Set de Nage (héritage grand-mère JOJO)
- Tenue VIP casino
- Pierres d'évolution (Lee Scoresby)
- Sérums (Serafina, boost permanent)

Chaque item a sa raison narrative d'exister. ✅

---

## 5. Synthèse criticité

| # | Constat | Criticité |
|---|---|---|
| 1 | Aucune table centrale dialogues | 🔴 |
| 2 | Aucune linéarisation explicite des arcs | 🔴 |
| 3 | Fusion d'univers (Pullman + pasta) non assumée | 🟠 |
| 4 | Plusieurs arcs sans clôture émotionnelle | 🟠 |
| 5 | TOWER_JOKES sans gate replay | 🟡 |
| 6 | Foreshadowing fait | 🟢 |

---
