# AUDIT_JOUEUR_08_ONBOARDING.md

> Premier kilomètre du joueur. Premier écran → première récompense émotionnelle.

---

## 1. Premier écran : le joueur sait-il quoi faire ?

### #122 — Premier mount MapClient
- **Ce que le joueur vit** : il arrive sur `bourgpates`, position (7,12). Personne ne lui dit immédiatement « bouge avec les flèches ».
- **Trigger intro** : la cinématique Monstre démarre quand le joueur entre dans les hautes herbes nord (y=1-2). Donc il faut **deviner d'aller au nord**.
- **Criticité** : 🟠 Frustrant
- **Fix proposé** :
  - À la 1ère connexion (`hasSeenWelcomeScreen === false`), afficher un overlay de bienvenue : « Bienvenue dans Nexus. Bouge avec les flèches. A pour interagir. ↑ pour découvrir. »
  - Marquer `hasSeenWelcomeScreen = true` à la fermeture
- Effort : 2-3h pour un overlay React minimal.
- **Confiance** : Élevée

---

## 2. Premier objectif clair et atteignable

### #123 — L'objectif est implicite : monter au nord vers les hautes herbes
- **Ce que le joueur vit** : pas de quête écrite « va vers le nord ». L'objectif est purement émergent (curiosité).
- **Risque** : un joueur peu curieux explore Bourg-Boulette, parle au shop, etc., et tarde à monter au nord. La quête principale ne démarre que là-haut.
- **Fix proposé** : un PNJ à côté du spawn (ex. un curieux) qui dit « Tu vois ces hautes herbes au nord ? Personne n'y va. Vas-y voir. » Effort 30 min.
- **Confiance** : Élevée

---

## 3. L'arbre des 150 reps : mur ou introduction ?

### #124 — 150 reps = combien de pompes pour le joueur ?
- **Ce que le joueur vit** : 
  - Un athlète : 150 pompes en 5 minutes. Trivial.
  - Un débutant : 150 pompes = 5-10 séries. Peut prendre des jours.
  - Un sédentaire : 150 pompes = potentiellement intimidant.
- **Diagnostic** : à 8 amis sportifs (tous font déjà PushQuest régulièrement), 150 reps = ~1 session. Soutenable.
- **Risque** : un nouveau pote qui rejoint avec un faible volume initial est freezé pendant ses premières sessions.
- **Status** : ⚪ Acceptable pour les 8 actuels. Pourrait être problématique pour un futur recruit débutant.

### #125 — Le joueur a-t-il les outils pour comprendre ?
- **Avant l'arbre** : le Monstre lui dit clairement « Il coûte 150 reps. Va te faire des pompes avant. »
- **Diagnostic** : ✅ Le message est explicite et même donne le moyen (faire des pompes).
- **Status** : ⚪ Très bon onboarding sur ce point précis.

---

## 4. Première récompense émotionnelle

### #126 — Quand le joueur se dit « ah c'est cool » ?
- **Hypothèses** :
  1. **Quand il pousse l'arbre** (15-30 min ou plusieurs jours selon profil) → badge Pionnier +200 XP
  2. **Quand il sauve PIAFFINI** (au sommet de la tour) → badge + Set de Nage de JOJO
  3. **Quand il atteint Macaron'île** (traversée mer)
- **Diagnostic** : la 1ère récompense vraiment cool est probablement à 30 min - 1h de jeu pour un sportif moyen.
- **Status** : ⚪ Acceptable

### #127 — Avant la pousse d'arbre, qu'est-ce que le joueur explore ?
- **Bourg-Boulette propose** : gym, casino, cave (verrouillée jusqu'au Monstre), MAMAN qui donne sac/baskets, cerisier, hautes herbes nord (déclencheur).
- **Diagnostic** : 5-6 PNJ + 1 cerisier (40 reps × 5/jour = +200 reps) = exploration de 10-15 minutes possible avant la quête principale. ✅

---

## 5. Reps pour traverser l'intro complète

### #128 — Estimation reps cumulés intro
| Étape | Reps consommés |
|---|---|
| Spawn → hautes herbes nord (déclenche Monstre) | ~10 cases × 10 = 100 |
| Téléport vers cave (gratuit) | 0 |
| Retour vers arbre (route 1) | ~10 cases = 100 |
| Pousser l'arbre | 150 |
| Total intro | ~350 reps |

**Soutenable** pour un athlète. Le créateur a probablement calibré pour ça.

---

## 6. Re-onboarding : joueur revenant après 2 semaines

### #129 — Aucun re-onboarding
- **Ce que le joueur vit** : il revient après 2 semaines, ouvre MapClient. État restauré (DB), il est où il en était. Mais aucun rappel de ses objectifs en cours.
- **Localisation** : `MapClient` mount logic
- **Criticité** : 🟡 Confort
- **Fix proposé** : à chaque mount, si `lastSeen > 7 jours`, afficher un toast « Bon retour ! Tu étais à [mapId] avec [objectif courant]. ». Effort 1-2h.
- **Confiance** : Élevée

### #130 — Journal de quêtes / suivi
- **Diagnostic** : aucune UI ne liste « quêtes en cours ». Le joueur doit se souvenir.
- **Criticité** : 🟡 Confort
- **Fix proposé** : Phase 2 — ajouter un panneau « Journal » avec les quêtes actives (déductibles des flags). Effort 4-8h.
- **Confiance** : Moyenne

---

## 7. Synthèse onboarding

| # | Titre | Criticité |
|---|---|---|
| #122 | Premier écran : overlay manquant | 🟠 |
| #123 | Premier objectif implicite | 🟠 |
| #124 | 150 reps acceptable pour les 8 | ⚪ |
| #125 | Monstre explique bien le 150 reps | ⚪ |
| #126 | 1ère récompense émotionnelle ~30 min | ⚪ |
| #127 | Exploration Bourg-Boulette OK | ⚪ |
| #128 | ~350 reps intro complète | ⚪ |
| #129 | Pas de re-onboarding au retour | 🟡 |
| #130 | Pas de journal de quêtes | 🟡 |

---

## 8. Recommandations

1. **Overlay contrôles + premier objectif** au 1er mount → priorité 1 (#122, #123).
2. **Toast de retour** si > 7 jours → priorité 2 (#129).
3. **Journal de quêtes** → priorité 3, optionnel.

---

*Fin AUDIT_JOUEUR_08_ONBOARDING.md*
