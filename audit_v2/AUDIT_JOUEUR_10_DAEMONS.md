# AUDIT_JOUEUR_10_DAEMONS.md

> Cohérence des Daemons entre eux : équilibrage, types, attaques, évolutions.

---

## 1. Distribution des stats de base entre types

### #146 — Pas de bonus de type sur les baseStats
- **Diagnostic** : les baseStats (force, vitesse, défense, intel, endurance) sont **calculées depuis les datas réelles du joueur** (`computeDaemonBaseStats`). Aucun bonus type.
- **Conséquence** : un Daemon Feu et un Daemon Eau du même joueur ont les mêmes baseStats.
- **Status** : ⚪ Design intentionnel (chaque joueur a 1 jeu de stats, le type est cosmétique côté stats)

---

## 2. Attaques disponibles par type

### 2.1 Catalogue d'attaques (`attacks.ts`)

| Type | Attaques attendues | Vu dans catalogue |
|---|---|---|
| Normal | charge, griffe, queue_de_fer, ultra_laser | ✅ |
| Crocs (morpho) | morsure | ✅ |
| Bec (morpho) | picpic ? | À vérifier |
| Insecte (morpho) | piqure ? | À vérifier |
| Pattes (morpho) | claque ? | À vérifier |
| Écailles (morpho) | (à vérifier) | À vérifier |
| Feu / Eau / Plante / Electrique / Vol / Psy / Pate / Combat / Roche | au moins 1 attaque chacun | À vérifier |

### #147 — Couverture attaques par type
- **Action** : grep `type: "Feu"` dans `attacks.ts` pour vérifier qu'il y a au moins une attaque par type.
- **Localisation** : [src/lib/gamebook/attacks.ts](src/lib/gamebook/attacks.ts) (242 lignes)
- **Criticité** : 🟠 (si un type sans attaque dédiée, le Daemon de ce type peut être désavantagé)
- **Confiance** : À confirmer

---

## 3. Table des types (faiblesses/résistances)

Cf. AUDIT_JOUEUR_03_FORMULES #37-#40. **Recap** :

| Type | Tous les types ont au moins un contre ? |
|---|---|
| Normal | Combat (×2 attaquant) | ✅ |
| Feu | Eau (×2), Roche (×2) | ✅ |
| Eau | Plante (×2), Electrique (×2) | ✅ |
| Plante | Feu, Vol | ✅ |
| Electrique | Plante (résiste ×0.5 inverse) → contre Electrique = peu | ⚠️ |
| Vol | Electrique, Roche | ✅ |
| Psy | **Aucun contre identifié comme attaquant**, seul Combat est sa cible | 🟡 |
| Pate | Combat (×2) | ✅ |
| Combat | Vol (×2), Psy (×2) | ✅ |
| Roche | Eau (×2), Plante (×2), Combat (×2) | ✅ |

### #148 — Type Psy sans contre direct
- Cf. #38. **Status** : 🟡

### #149 — Type Electrique sans contre offensif
- **Diagnostic** : aucun type ne frappe ×2 sur Electrique. Seulement Plante résiste (×0.5 dans le sens « Plante reçoit Electrique ×0.5 », donc Plante NE contre PAS Electrique offensivement). Roche est ×0 (Electrique ne peut pas blesser Roche, mais ça n'aide pas à blesser Electrique).
- **Conséquence** : un Daemon Electrique adverse est dur à battre.
- **Criticité** : 🟡 Confort équilibrage
- **Fix proposé** : ajouter `Roche: { Electrique: 2 }` ou similaire dans `TYPE_CHART`. Effort 5 min.
- **Confiance** : Élevée

---

## 4. Pierres d'évolution — couverture

### #150 — Daemons sans accès évolution
- **Diagnostic** : pierres pour Feu/Eau/Plante/Electrique/Vol/Psy/Roche. Pas de pierre pour Normal/Combat/Pate.
- **Conséquence** : un Daemon Normal/Combat/Pate ne peut pas être customisé via pierre.
- **Status** : ⚪ Design intentionnel (Pate spécial = lore, Combat dérive d'adversaires, Normal = base)

### #151 — Pierres rares (stock Lee Scoresby)
- **Ce que le joueur vit** : Lee Scoresby dit « reviens quand stock reconstitué ». Si elles sont en vente immédiatement, le dialogue ment.
- Cf. AUDIT_JOUEUR_02_LORE #23.
- **Action** : aligner code et dialogue.

---

## 5. Wearables — restrictions par type

### #152 — `canEquipDaemon` restriction de type ?
- **Diagnostic** : `canEquipDaemon` boost une stat (force/vitesse/etc.) mais ne semble pas restreindre par type.
- **Conséquence** : n'importe quel item équipable peut être mis sur n'importe quel Daemon. ✅ équitable.
- **Status** : ⚪ OK

---

## 6. Bonheur — mécanique équitable selon les types

### #153 — Bonheur indépendant du type
- **Diagnostic** : `happiness` est un Int sur Daemon, modifié par décay (steps), interactions, hôtel, véto. Aucun bonus/malus de type sur le décay.
- **Status** : ⚪ Équitable

---

## 7. Statut spécial du type "Pâte" dans le lore

### #154 — BOLOGNION = Pate ?
- **Diagnostic** : BOLOGNION est mentionné comme « créature mutante » et appartient au lore mafia. Probable type `Pate` (custom).
- **Vérification** : impossible sans lire le code complet. À confirmer.
- **Status** : ⚪ Probablement cohérent

### #155 — Daemons Combat (chiens flics) vs Pate (Team Boulette)
- **Diagnostic** : selon `TYPE_CHART`, Combat ×2 vs Pate, Pate ×0.5 vs Combat. ✅ Cohérent avec le lore (chiens flics croquent la pâte).
- **Status** : ⚪ Excellent design narratif

---

## 8. Synthèse Daemons

| # | Titre | Criticité |
|---|---|---|
| #146 | Stats indépendantes du type | ⚪ |
| #147 | Couverture attaques par type | 🟠 |
| #148 | Psy sans contre | 🟡 |
| #149 | Electrique sans contre offensif | 🟡 |
| #150 | Pierres : Normal/Combat/Pate sans évolution | ⚪ |
| #151 | Lee Scoresby stock cohérence | 🟠 |
| #152 | Wearables sans restriction type | ⚪ |
| #153 | Bonheur équitable | ⚪ |
| #154 | BOLOGNION type Pate cohérent | ⚪ |
| #155 | Combat vs Pate lore + mécanique | ⚪ |

---

## 9. Recommandations

1. **Vérifier la couverture d'attaques par type** dans `attacks.ts` (#147). 10 min.
2. **Ajouter un contre à Electrique** (Roche ×2 par exemple) (#149). 5 min.
3. **Décider Psy : laisser sans contre direct ou en ajouter un** (#148). Probablement laisser tel quel pour v1.

---

*Fin AUDIT_JOUEUR_10_DAEMONS.md*
