# AUDIT_JOUEUR_02_LORE.md

> Chasse aux incohérences de séquençage narratif, spoils prématurés, et glitches dialogiques.

---

## 1. Spoils prématurés détectés

### #11 — LYRA spoile "Pastagone" et l'énigme cuisine
- **Ce que le joueur vit** : LYRA (lasagnas_vegas, accessible relativement tôt après bestioles + Muscuville) dit explicitement : « Tu connais le **Pastagone** ? Le pentagone des chiens. Il y a une cuisine là-bas. Avec trois sacs de pâtes. Si tu inspectes les deux bons sacs dans le bon ordre, et que tu touches ensuite le comptoir… quelque chose se réveillera. »
- **Ce que le jeu devrait offrir** : un hint mystérieux, pas la solution complète d'une énigme.
- **Localisation** : [src/lib/gamebook/npcs.ts:2052-2076](src/lib/gamebook/npcs.ts) (LYRA)
- **Criticité** : 🔴 Bloquant narrativement (le joueur qui croise LYRA avant d'arriver à Pastagone connaît déjà l'énigme + la map)
- **Fix proposé** : reformuler en : « Il paraît qu'il existe un endroit où des sacs de pâtes cachent un secret. À toi de comprendre comment les ouvrir. » (retirer "Pastagone", "trois sacs", "deux bons", "comptoir"). Effort 15 min.
- **Confiance** : Élevée

### #12 — CORAM dévoile la Poussière + Daemons + mondes parallèles trop tôt
- **Ce que le joueur vit** : CORAM (Pastagone, contexte arrest) explique « La Poussière s'est posée sur toi. Tu vois ces lumières au loin ? Ce sont des mondes. Quand ton Daemon aura mûri, tu pourras y entrer. »
- **Ce que le jeu devrait offrir** : ce dialogue est censé arriver **après** que le joueur a déverrouillé son Daemon proprement et après le boss Pastagone. En arrivant **dans la cellule** ou en début d'arc, c'est prématuré.
- **Localisation** : [src/lib/gamebook/npcs.ts:2217-2241](src/lib/gamebook/npcs.ts) (CORAM)
- **Criticité** : 🟠 Frustrant (rompt le foreshadow assumé Will + Serafina)
- **Fix proposé** : gater CORAM derrière `pastagoneBossBeaten === true` (il ne parle pas, ou parle autrement avant). Effort 30 min.
- **Confiance** : Élevée

### #13 — FUSILLI mentionne « PIAFFINI » indirectement avant le rescue
- **Ce que le joueur vit** : FUSILLI (Pépiteville) dit « Un drôle d'oiseau au sommet de la TOUR... Un truc duveteux, bizarre, avec un regard qui dit 'sauve-moi'. »
- **Ce que le jeu devrait offrir** : foreshadowing OK, le terme « PIAFFINI » n'apparaît pas → c'est volontairement mystérieux. ✅ **PAS UN BUG**.
- **Status** : ⚪ Vérifié OK
- **Confiance** : Élevée

### #14 — GARDIEN (tower_floor_1) parle de PIAFFINI nommément trop tôt ?
- **Ce que le joueur vit** : GARDIEN dit « Le petit piaf en haut... c'est triste, déboussolé. Si tu vois JOJO, dis-lui qu'on a besoin de le récupérer. »
- **Diagnostic** : GARDIEN est dans la Tour ; le joueur n'arrive là qu'après les rumeurs (FUSILLI + RUMEUR_OISEAU). Le terme "PIAFFINI" n'est pas prononcé ; "petit piaf" = mascot général ⇒ ✅ acceptable.
- **Status** : ⚪ Vérifié OK
- **Confiance** : Moyenne — à confirmer que le terme PIAFFINI n'est jamais prononcé avant rescue

### #15 — ORNITHOLOGUE prononce le mot "PIAFFINI" 
- **Ce que le joueur vit** : ORNITHOLOGUE (grass_sud) dit : « On raconte qu'un oiseau légendaire vit au-delà de Muscuville... PIAFFINI est lié à lui par le sang. »
- **Question** : à quel moment le joueur croise ORNITHOLOGUE ?
  - grass_sud requiert traversée bestioles (compagnon recommandé)
  - Ce qui arrive **après** la Tour si scénario standard
  - **Donc PIAFFINI est connu** (déjà sauvé) au moment où ORNITHOLOGUE est rencontré → ✅ OK
- **Risque résiduel** : si un joueur entre grass_sud sans avoir fait la Tour (compagnon hâtif), il entendra "PIAFFINI" sans contexte.
- **Criticité** : 🟡 Confort
- **Fix proposé** : gate du dialogue ORNITHOLOGUE derrière `piaffiniRescued === true` (le PNJ se tait sinon, ou change de dialogue). Effort 15 min.
- **Confiance** : Moyenne

### #16 — RUMEUR_HERBES_DIALOGUE évoque les bestioles avant grass_sud
- **Ce que le joueur vit** : Dans la Tour (tower_floor_3), un PNJ parle des hautes herbes du sud + morsures. **Foreshadowing assumé** ✅
- **Status** : ⚪ OK

### #17 — RUMEUR_CONCOURS_DIALOGUE évoque le concours annulé
- **Ce que le joueur vit** : Tour (tower_floor_4) — annulation foreshadow contest_hall. Quand le joueur arrive à Muscuville post-Mont, le concours est rouvert. ✅
- **Status** : ⚪ OK

---

## 2. Mots du futur / mécaniques pré-arc

### #18 — Mot « Daemon » (vs « Tamagotchi »)

Le code utilise deux représentations : `tamagotchi` (Json legacy) et `Daemon` (table v4.0). **Question** : dans les dialogues PNJ, comment le mot apparaît-il ?

| PNJ | Terme employé | Statut |
|---|---|---|
| BUCATINI (Macaron) | « compagnon », « animal » | ✅ neutre |
| DINGO | « animal », « compagnon » | ✅ |
| V3T | « animal », « compagnon » | ✅ |
| Iorek | « Daemon » | ⚠️ mot apparaît à Vegas Tour étage 2 |
| Mary Malone | « Daemon » | ⚠️ idem |
| Serafina | « Daemon » | ⚠️ idem |
| CORAM | « Daemon » | ⚠️ Pastagone |
| Lee Scoresby | « Daemon » | ⚠️ Vegas Tour étage 3 |

**Diagnostic** : le mot "Daemon" arrive dans le lore Pullman (Vegas Tour + Pastagone). Avant ces zones, le joueur ne le rencontre pas. ✅ **Pas de spoil prématuré du concept Daemon**, mais le glissement de vocabulaire entre "compagnon/animal" (Macaron'île) et "Daemon" (Pullman) doit être un beat narratif assumé.

**Status** : ⚪ Cohérent

### #19 — Mot « démon »
- **Ce que le joueur vit** : recherche dans `npcs.ts` + `dialogue.ts` du terme « démon » (avec accent, vs « Daemon »).
- **Vérification** : grep `démon` dans les fichiers dialogue/npcs.
- À vérifier explicitement.

### #20 — « Bolognion » mentionné prématurément ?
- **Ce que le joueur vit** : `BOLOGNION` est un secret de Pastagone (mafia Team Boulette / créature mutante). Il ne doit pas être nommé avant.
- **Vérification** : LYRA parle de « sacs de pâtes » + « quelque chose se réveillera » mais ne dit pas BOLOGNION. ✅
- **Status** : ⚪ Vérifié OK

### #21 — « Mont Pasta-Ventoux » mentionné avant ouverture
- **Ce que le joueur vit** : PELOTON le mentionne avant l'ouverture. Le panneau-dialogue se déclenche **uniquement à Muscuville**, donc post-bestioles + grass_sud. ✅
- **Status** : ⚪ OK

### #22 — « Macaron'île » mentionné avant accès
- **Ce que le joueur vit** : MORUE (Bourg-Boulette) en parle dès le départ. C'est intentionnel (foreshadow + carotte de progression). ✅
- **Status** : ⚪ OK

---

## 3. Personnages Pullman — séquençage

Le créateur veut éviter qu'un personnage Pullman révèle son univers hors séquence.

| Personnage | Lieu | Quand le joueur le rencontre | Cohérence ? |
|---|---|---|---|
| ROGER | lasagnas_vegas | Après Muscuville (rochers brisés) | ✅ |
| LYRA | lasagnas_vegas | Idem | ⚠️ Voir #11 (spoil Pastagone) |
| WILL | lasagnas_vegas | Idem | ✅ |
| Lee Scoresby (panneau) | lasagnas_vegas | Idem | ✅ |
| Mary Malone | vegas_shoptower_1 (étage 1) | Tour Pullman accessible si entrée Vegas | ✅ |
| Iorek | vegas_shoptower_2 | Idem | ✅ |
| Lee Scoresby (étage 3) | vegas_shoptower_3 | Idem | ⚠️ « Mon dirigeable est en bas. Reviens quand stock reconstitué » — bien — mais le joueur peut acheter des pierres ou pas ? À vérifier |
| Serafina (étage 4) | vegas_shoptower_4 | Idem | ✅ (gating « les fleurs doivent fleurir ») |
| Asriel (chef) | pastagone | Pastagone arc | ✅ |
| Coulter (inspecteur) | pastagone | Idem | ✅ |
| Faa (brigadier) | pastagone | Idem | ✅ |
| Coram (sergent) | pastagone | Idem | ⚠️ Voir #12 (Poussière prématurée) |

### #23 — Lee Scoresby étage 3 : disponibilité des pierres incertaine
- **Ce que le joueur vit** : « Aérostier de profession, marchand de pierres rares en hobby. Mon dirigeable est en bas. Sans lui, je peux pas aller chercher les pierres d'évolution. Reviens quand mon stock sera reconstitué. »
- **Question** : les pierres sont-elles vendues immédiatement ou bloquées tant que le dirigeable n'est pas réparé ?
- **Vérification** : le créateur a écrit en mémoire (commit `f95e688`) « Pierres d'évolution (Lee Scoresby) + Sérums boost permanent (Serafina) » — donc sans doute disponibles.
- **Si disponibles immédiatement** : le dialogue est trompeur (« reviens quand stock reconstitué » mais le stock est là).
- **Si non disponibles** : alors la promesse de Pierres d'évolution n'est pas tenue avant l'arc futur.
- **Criticité** : 🟠 Frustrant
- **Fix proposé** : décider lequel + aligner dialogue/code. Effort 15-30 min.
- **Confiance** : Moyenne — à confirmer

---

## 4. Incohérences entre PNJ sur un même événement

### #24 — Disparition de LYRA après le spoil
- **Ce que le joueur vit** : LYRA dit son truc mystérieux, puis « Post-révisit : Lyra a disparu ».
- **Question** : où va-t-elle ? Si le joueur va à Pastagone, croise-t-il Lyra ? Non — elle est juste un foreshadow.
- **Pas un bug**, mais le « Lyra a disparu » sans explication crée une intrigue qui n'est jamais résolue.
- **Criticité** : ⚪ Cosmétique
- **Status** : OK — à reprendre dans une éventuelle v2

### #25 — JOJO vs JOJETTE post-PIAFFINI
- **Ce que le joueur vit** :
  - JOJO (`JOJO_POST_PIAFFINI_DIALOGUE`) : « Tu m'as ramené PIAFFINI ! »
  - JOJETTE (`JOJETTE_POST_PIAFFINI_DIALOGUE`) : « J'ai entendu pour PIAFFINI ! »
- **Cohérence** : ✅ deux PNJ frères/sœurs s'aligne, JOJETTE a "entendu" → cohérent.
- **Status** : ⚪ OK

### #26 — MIRABELLE (biblio_muscu) vs JOJO (bibliotheque Macaron)
- **Ce que le joueur vit** : MIRABELLE et JOJO sont **sœurs** selon le code (« soeur de JOJO »). Cohérent ?
- À vérifier qu'aucun dialogue ne se contredit (par ex. MIRABELLE dit « ma sœur » et JOJO dit « ma cousine »).
- **Status** : Probablement OK, à confirmer

### #27 — MORUE → FARFALL → NAUFRAGÉ : chaîne cross-map
- **Ce que le joueur vit** : 
  - MORUE Bourg parle d'une île
  - FARFALL Macaron parle d'un naufragé en mer
  - NAUFRAGÉ en la_mer attend qu'on l'aperçoit
- **Cohérence** : ✅ ligne logique
- **Status** : ⚪ OK

---

## 5. Dialogues récursifs / asymétrie 1ère fois / fois suivantes

| PNJ | 1ère fois | Fois suivantes | Pattern OK ? |
|---|---|---|---|
| MAMAN/PEPITO | `PEPITO_DIALOGUE_FIRST` | `PEPITO_DIALOGUE_AFTER` | ✅ explicite |
| JOJO | `JOJO_POST_PIAFFINI_DIALOGUE` | `JOJO_AFTER_GIFT_DIALOGUE` | ✅ |
| ROMARIN | random pool 7 lores | random pool 7 lores | ⚠️ même pool — peut rejouer le même fruit info |
| TOWER blagueur PASTAFAR | random parmi 4 blagues | idem | ⚠️ aucun gate, peut rejouer la même |
| BUFFY | one-shot `gymGuyEnergyGiven` | post-flag dialogue absent ? | ⚠️ à vérifier |
| DURUM | one-shot `durumEnergyGiven` | idem | ⚠️ à vérifier |
| Champions arène | post-flag différent (revanche) | post-revanche différent | ✅ |
| MUSCUMAN | greeter standard | greeter standard | ✅ |
| LINGUINI | +1 luck/jour | « reviens demain » | ✅ |
| ORZO | snob | post : pièces cassino + reviens nous | ✅ |
| BUCATINI | naïf curieux | post-awakened heureux | ✅ |
| Tour PASTAFAR | blagues random | blagues random | ⚠️ |
| Croupiers Vegas | boost/malus dialogué | (à vérifier post-reset) | ⚠️ |

### #28 — TOWER_JOKES rejoue la même blague sans gate
- **Ce que le joueur vit** : PASTAFAR rejoue ses 4 blagues, potentiellement la même 2 fois de suite.
- **Localisation** : [src/lib/gamebook/dialogue.ts:124-147](src/lib/gamebook/dialogue.ts#L124-L147)
- **Criticité** : 🟡 Confort
- **Fix proposé** : ajouter un flag JSON `flags.tbJokesSeen: number[]` qui tracke les indices vus, et n'en propose plus tant que les 4 ne sont pas vues. Effort 30 min.
- **Confiance** : Élevée

### #29 — Asymétrie one-shot incomplète : BUFFY, DURUM, FAA
- **Ce que le joueur vit** : si le joueur revient parler à BUFFY/DURUM après avoir reçu l'énergie, le dialogue est-il différent ?
- **Localisation** : [src/lib/gamebook/npcs.ts](src/lib/gamebook/npcs.ts) (BUFFY, DURUM, FAA dialogues)
- **À vérifier** : présence d'une asymétrie `firstTime` vs `afterFlag`.
- **Criticité** : 🟡 Confort
- **Fix proposé** : ajouter un dialogue court post-flag « Tu as déjà reçu ton bonus. Reviens demain. » (ou équivalent). Effort 30 min.
- **Confiance** : Moyenne (à confirmer)

### #30 — ROMARIN peut rejouer le même lore d'arbre
- **Ce que le joueur vit** : ROMARIN tire random parmi 7 lores. Pas de mémoire = peut redire le même 2 fois.
- **Localisation** : [src/lib/gamebook/npcs.ts:821+](src/lib/gamebook/npcs.ts) (ROMARIN pool)
- **Criticité** : ⚪ Cosmétique
- **Fix proposé** : flag JSON `flags.romarinLoresSeen: number[]` pour exhaustivité. Effort 30 min.
- **Confiance** : Élevée

---

## 6. Tutoiement / vouvoiement

Échantillonnage rapide via les dialogues collectés :

| PNJ | Pronom dominant | Cohérent ? |
|---|---|---|
| Monstre Spaghetti Volant | « tu » | ✅ |
| MAMAN/PEPITO | « tu » (familier) | ✅ |
| BUFFY | « tu » | ✅ |
| GARDIEN | « tu » | ✅ |
| DOC PROTÉINE (véto) | « tu » | ✅ |
| BIBLIO | « tu » + « vous » mixés ? | À vérifier |
| Serafina | « voyageur », « tu » | ✅ |
| Mary Malone | « tu » (à confirmer) | À vérifier |
| Croupiers | « tu » familier | ✅ |
| PORTIER ARRABBIATA | « tu » | ✅ |
| IL CAPO | « tu » mafia-style | ✅ |
| ROULETTE | « tu » | ✅ |

**Status global** : tutoiement quasi-universel. Aucun PNJ ne semble vouvoyer systématiquement, **sauf** peut-être BIBLIO (bibliothécaire formelle), à confirmer.

### #31 — Aucune incohérence majeure de pronom détectée
**Status** : ⚪ OK global

---

## 7. Tests de cohérence cross-arc

### #32 — `pereTalked` + accès bar
- **Ce que le joueur vit** : après avoir parlé à Père Pesto (`pereTalked=true`), le mot de passe est valide chez le videur ARRABBIATA.
- **Cohérence** : à vérifier que `pereTalked === false` cache les options de réponse au videur ou montre une option ratée.
- **Criticité** : 🟡 Confort
- **Fix proposé** : si pas déjà fait, gate la réponse correcte au videur derrière `pereTalked === true`. Effort 30 min.
- **Confiance** : Moyenne

### #33 — Brutes Vegas (`tbBrutesTalked` + malus -10 reps)
- **Ce que le joueur vit** : si le joueur ment au videur, les brutes le maltraitent (-10 reps par interaction).
- **Question** : le malus s'arrête-t-il dès que IL CAPO est vaincu (`tbBossBeaten=true`) ?
- **Vérification** : grep dans `tb/brute/route.ts`.
- **Criticité** : 🟠 Frustrant si non corrigé
- **Fix proposé** : ajouter check `if (tbBossBeaten) return { ok: true, reason: 'Les brutes te laissent tranquille maintenant.' }`. Effort 15 min.
- **Confiance** : À confirmer

### #34 — Verrou contest_hall vs badge Conquérant
- **Ce que le joueur vit** : le contest hall est censé être verrouillé sans badge Conquérant (Mont).
- **Cohérence** : à vérifier que l'entrée est bien gatée (côté code/dialogue).
- **Criticité** : 🟠 Frustrant si mal gaté
- **Fix proposé** : si le verrou est manquant, ajouter check `montSummitReached === true` dans `contest_hall` door event. Effort 15 min.
- **Confiance** : À confirmer

---

## 8. Synthèse des incohérences lore

| # | Titre | Criticité |
|---|---|---|
| #11 | LYRA spoile Pastagone + énigme cuisine | 🔴 |
| #12 | CORAM Poussière+Daemons prématuré | 🟠 |
| #13 | FUSILLI PIAFFINI mystérieux (OK) | ⚪ |
| #14 | GARDIEN « petit piaf » (OK) | ⚪ |
| #15 | ORNITHOLOGUE PIAFFINI hors séquence possible | 🟡 |
| #16 | RUMEUR_HERBES (foreshadow OK) | ⚪ |
| #17 | RUMEUR_CONCOURS (OK) | ⚪ |
| #18 | Mot Daemon : glissement de vocabulaire OK | ⚪ |
| #19 | Mot « démon » : à vérifier explicitement | ⚠️ |
| #20 | BOLOGNION jamais nommé prématurément (OK) | ⚪ |
| #21 | Mont mentionné par PELOTON seulement (OK) | ⚪ |
| #22 | Macaron'île foreshadow MORUE (OK) | ⚪ |
| #23 | Lee Scoresby étage 3 : pierres dispo ? | 🟠 |
| #24 | LYRA disparait sans clôture | ⚪ |
| #25 | JOJO/JOJETTE post-PIAFFINI (OK) | ⚪ |
| #26 | MIRABELLE/JOJO sœurs (à confirmer) | ⚪ |
| #27 | MORUE/FARFALL/NAUFRAGÉ chaîne OK | ⚪ |
| #28 | TOWER_JOKES sans gate replay | 🟡 |
| #29 | One-shots PNJ sans dialogue post | 🟡 |
| #30 | ROMARIN lore replay possible | ⚪ |
| #31 | Pronoms : pas d'incohérence majeure | ⚪ |
| #32 | `pereTalked` gate à confirmer | 🟡 |
| #33 | Brutes Vegas post-boss à confirmer | 🟠 |
| #34 | Verrou contest_hall à confirmer | 🟠 |

---

*Fin AUDIT_JOUEUR_02_LORE.md*
