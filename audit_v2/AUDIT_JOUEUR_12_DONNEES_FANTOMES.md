# AUDIT_JOUEUR_12_DONNEES_FANTOMES.md

> Données fantômes, flags orphelins, doublons tamagotchi/Daemon.

---

## 1. Flags orphelins (écrits jamais lus)

D'après l'audit subagent flags : **aucun flag orphelin majeur**, sauf 2 quasi-orphelins identifiés dans l'audit précédent :

### #166 — `durumEnergyGiven` — écrit 1 fois, jamais relu pour gating
- **Localisation** : [src/app/api/gamebook/grant-durum-energy/route.ts](src/app/api/gamebook/grant-durum-energy/route.ts) (set) + `daemon.ts:132` (compté dans `countDefisValidated`)
- **Diagnostic** : ✅ relu dans `countDefisValidated`. Pas orphelin en vrai.
- **Status** : ⚪ Faux positif

### #167 — `lottoPouleWonToday` — écrit 1 fois, jamais relu pour gating
- **Localisation** : [src/app/api/gamebook/casino/lotto-poule/route.ts](src/app/api/gamebook/casino/lotto-poule/route.ts) (set)
- **Diagnostic** : utilisé pour empêcher de rejouer mais via `lottoPouleDate` direct, pas via `lottoPouleWonToday`.
- **Status** : 🟡 Probable redondance. Effort de cleanup faible.
- **Fix proposé** : décider si on garde le flag (pour potentiel besoin futur) ou si on le supprime.

---

## 2. Flags fantômes (lus jamais initialisés)

### #168 — Aucun flag fantôme détecté
- **Diagnostic** : tous les booléens du schéma ont `@default(false)` ou sont nullable et lus avec `?.x === true`. Pas de NULL pollution.
- **Status** : ⚪ Sain

---

## 3. JSON fourre-tout

### #169 — `flags` Json — taille par joueur ?
- **Diagnostic** : sans accès DB, je ne peux pas mesurer. **Hypothèse raisonnable** : <2 KB par joueur (clés ad-hoc).
- **Risque** : croissance non bornée si des routes écrivent sans cleanup.
- **À surveiller** : pas d'urgence.
- **Status** : 🟡 Confort

### #170 — `history` Json — taille par joueur ?
- **Diagnostic** : `history` est probablement append-only par les beats narratifs.
- **Risque** : à 6 mois d'usage par joueur, pourrait grossir à >10 KB.
- **Action** : monitorer en DB. Si <50 KB par joueur dans 6 mois, on s'en fiche.
- **Status** : ⚪ Pas urgent

### #171 — `npcsTalkedTo` Json — taille ?
- **Diagnostic** : tracking des NPC parlés. 100 PNJ ≈ ~3 KB.
- **Status** : ⚪ OK

### #172 — `visitedTowns` Json — taille ?
- **Diagnostic** : 6-10 villes ≈ <500 octets.
- **Status** : ⚪ OK

---

## 4. Code référençant des quêtes / PNJ inexistants

### #173 — Aucun PNJ référencé hors `npcs.ts`
- **Diagnostic rapide** : grep des dialogues hardcodés en routes API. Rares (dialogue dans franss-joke, intro Monstre). Tous cohérents avec les PNJ existants.
- **Status** : ⚪ OK

---

## 5. Items d'inventaire non plus dans le catalogue

### #174 — `carte_tresor` retirée du shop mais reste dans le catalogue
- **Diagnostic** : commit annoté dans `items.ts:250-251` : « v3.23p — Retirée du shop TRENETTE. Reste dans le catalogue pour ne pas casser les inventaires existants. »
- **Status** : ⚪ Design intentionnel (placeholder + back-compat)

### #175 — Items en inventaire d'un joueur sans définition catalogue
- **Diagnostic** : si une v ancienne avait un item depuis supprimé, le joueur peut avoir un `key` orphelin dans son `inventory` Json.
- **Action** : script de nettoyage `npm run cleanup-orphan-items` à écrire si besoin.
- **Status** : 🟡 Confort

---

## 6. Daemons orphelins

### #176 — Slots inutilisés (slotIndex > 1) ?
- **Diagnostic** : sans accès DB, à vérifier. Probable qu'aucun joueur n'ait plus de 1 Daemon (slot 1 leader).
- **Action** : query Prisma `daemon.findMany() group by slotIndex`.
- **Status** : ⚪ Probablement OK

### #177 — Daemons de test (origin='test') ?
- **Diagnostic** : possible si le créateur a fait des tests manuels.
- **Action** : `daemon.findMany({ where: { origin: 'test' OR userId: 'test' } })`.
- **Status** : 🟡 Confort

---

## 7. Doublons tamagotchi (Json) / Daemon (v4.0)

### #178 — `ensureDaemonForTamagotchi` est idempotent
- **Diagnostic** : la fonction crée un Daemon en slot 1 **uniquement si** :
  - `tamagotchi` Json présent
  - **Pas déjà** de Daemon en slot 1
- **Conséquence** : impossible d'avoir un doublon par cette fonction.
- **Status** : ⚪ Idempotent

### #179 — Quelle est la source de vérité ?
- **Diagnostic** : 
  - Pour les **stats** (HP, level, type, équipement) : `Daemon` (table) est la source de vérité.
  - Pour le **bonheur quotidien décay** : à vérifier — est-ce `Daemon.happiness` ou `tamagotchi.happiness` Json ?
  - Pour le **nom** : `Daemon.name`
- **Risque** : si une route met à jour `tamagotchi.happiness` mais pas `Daemon.happiness`, désynchro.
- **Localisation** : [src/app/api/gamebook/tamagotchi/](src/app/api/gamebook/tamagotchi/) (routes legacy)
- **Action** : grep `tamagotchi` dans routes pour voir si certaines écrivent encore le Json sans synchroniser Daemon.
- **Criticité** : 🟠 Frustrant (HP/happiness affiché ≠ HP/happiness combat)
- **Confiance** : Moyenne

### #180 — Cleanup v4.0 Phase 1.E
- **Diagnostic** : le code commente « Cleanup en Phase 1.E uniquement » → suppression `tamagotchi` Json prévue.
- **Action** : à planifier après stabilisation Daemon. Pas urgent.
- **Status** : 🟡 Planifié

---

## 8. Routes API mortes (rappel audit précédent)

Liste héritée :
- `biblio/gift-tree-book/route.ts`
- `daemon/equip-item/route.ts`
- `daemon/heal/route.ts`
- `daemon/unequip-item/route.ts`
- `muscuville/interpellator-talk/route.ts`
- `pusher-auth/route.ts`
- `tamagotchi/use-serum/route.ts`
- `v3t/talk/route.ts`

### #181 — 8 routes mortes
- **Action** : delete files. Effort 10 min. ⚠️ Vérifier qu'elles ne sont pas référencées côté client (fetch URL hardcodée).
- **Criticité** : ⚪ Cosmétique (priorité créateur : ignorable selon Q-A)

---

## 9. Code mort lib

### #182 — `engine.ts` (218 lignes) — 0 importer
- **Action** : delete. Effort 5 min.
- **Status** : ⚪ Cosmétique

---

## 10. Synthèse données fantômes

| # | Titre | Criticité |
|---|---|---|
| #166 | `durumEnergyGiven` (faux positif) | ⚪ |
| #167 | `lottoPouleWonToday` redondance | 🟡 |
| #168 | Pas de flag fantôme | ⚪ |
| #169 | `flags` Json taille | 🟡 |
| #170 | `history` Json taille | ⚪ |
| #171 | `npcsTalkedTo` OK | ⚪ |
| #172 | `visitedTowns` OK | ⚪ |
| #173 | Pas de PNJ orphelin | ⚪ |
| #174 | `carte_tresor` placeholder | ⚪ |
| #175 | Items orphelins inventaire (rare) | 🟡 |
| #176 | Daemon slot > 1 (probable OK) | ⚪ |
| #177 | Daemons test | 🟡 |
| #178 | Migration tamagotchi idempotente | ⚪ |
| #179 | Source de vérité tamagotchi/Daemon happiness | 🟠 |
| #180 | Cleanup Phase 1.E planifié | 🟡 |
| #181 | 8 routes mortes | ⚪ |
| #182 | `engine.ts` mort | ⚪ |

---

## 11. Recommandations

1. **Action immédiate** : vérifier #179 (tamagotchi/Daemon happiness sync) — risque réel d'affichage incohérent. 1h d'audit.
2. **Action différée** : nettoyer code mort #181, #182. Quand le créateur veut, 30 min.
3. **À monitorer** : taille `flags`/`history` JSON dans 6 mois.

---

*Fin AUDIT_JOUEUR_12_DONNEES_FANTOMES.md*
