# CONFRONTATION_PRIORITES.md

> **Confrontation entre ma synthèse d'audit (Phase 2 / 10 docs)** et la **liste de priorités du créateur** établie avec un assistant externe.  
> **Contraintes réelles confirmées** : 8 amis, jamais simultanés, services gratuits, pas de scalabilité, lore mélangé volontairement, pas de cleanup esthétique demandé.

---

## 1. Réponse ligne à ligne à la priorisation créateur

### 🔴 Priorité maximale du créateur

| # | Item créateur | Mon verdict | Justification |
|---|---|---|---|
| 1 | Bug bonus minuit | ✅ **D'accord** | Frustration récurrente, fix probablement < 2h. C'est le bug le plus visible côté joueur. |
| 2 | Joueurs coincés (positions invalides héritées) | ✅ **D'accord** | Le commit `78c9d18` empêche d'écrire une position bloquante mais ne rescue pas les positions DÉJÀ bloquantes. Cas Jérém vécu. |
| 3 | Joueurs coincés dans shops/bâtiments + audit-doors.mjs | ✅ **D'accord** | Le script existe (vu dans `scripts/audit-doors.mjs`) — le faire tourner est trivial. NUTRIPATES sprite-bloquant a été un vrai bug réel (commit `b9a28cb`). |
| 4 | Promesses XP non tenues | ✅ **D'accord, et urgent** | Le bug « Champion revanche 800 XP → 0 donné » prouve que d'autres existent. Aucune garantie systémique aujourd'hui. |
| 5 | Combats orphelins | ✅ **D'accord** | `Daemon.activeBattle` JSON peut rester non-nul indéfiniment. Bouton « reset combat » + timeout 30min = fix propre. |
| 6 | Cohérence narrative (pas de spoil « démon ») | ✅ **D'accord, et urgent** | C'est un risque réel : un PNJ pré-arc qui prononce un mot du futur casse 6 mois de foreshadowing pour rien. |
| 7 | Dialogues qui ne matchent pas l'état | ✅ **D'accord** | Pattern PEPITO_FIRST / PEPITO_AFTER existe mais n'est pas systématique. |
| 8 | Promesses narratives (« va là, tu trouveras X ») | ✅ **D'accord** | Cas concret : Tour Blagueur — si un PNJ promet PIAFFINI au sommet et que le code de rescue est buggé, mensonge structurel. |

**Verdict global sur le 🔴** : Aucun désaccord. La priorité créateur reflète correctement l'expérience joueur.

### 🟠 Priorité élevée du créateur

| # | Item créateur | Mon verdict | Justification |
|---|---|---|---|
| 1 | Messages clairs « N reps requis » | ✅ **D'accord** | Très bon ROI. Une ligne de dialogue type « Tu n'as pas la force. Il te faut 150 reps. » résout le problème de tâtonnement. |
| 2 | Calibrage progression (niveaux Daemons PNJ) | ✅ **D'accord** | À auditer arc par arc dans la Partie B. |
| 3 | Cap niveau / courbe XP | ⚠️ **Nuance — à déprioriser** | À 8 amis sportifs réguliers, atteindre L30+ prend déjà beaucoup de combats. Le mur L49→L50 est un problème **théorique futur**. Tant qu'aucun pote n'a passé L25, c'est pas le moment. **Recommandation** : audit dans Partie B.6 pour mesurer où en sont les 8 joueurs, et décider ensuite. |
| 4 | Tutoriel contrôles | ✅ **D'accord** | Overlay simple « ← → ↑ ↓ pour bouger, A pour interagir, START pour sac » au premier mount. Effort minimal, impact massif sur premier kilomètre. |
| 5 | Race condition `energySpentToday` (fix `{increment}`) | ⚠️ **Nuance — d'accord uniquement parce que trivial** | Le créateur a raison que multi-utilisateurs n'arrivera jamais. **Mais** : double-clic rapide sur un même bouton **par le même joueur** crée la même race. Et le fix est trivial (1h max). Donc oui, à faire — mais classer en confort joueur, pas en correction architecturale. |

### ⚪ Ignorable selon le créateur

| Item | Mon verdict |
|---|---|
| Race conditions multi-utilisateurs | ✅ D'accord — ignore complètement |
| Timezones internationaux | ✅ D'accord — Paris uniquement |
| Refactor MapClient, god-table, `prisma as any` | ✅ D'accord — fonctionne, on touche pas |
| Tests automatisés systématiques | ✅ D'accord — sauf un test sur la formule XP/badges si on touche au code des promesses (sécuriser le « annoncé = donné ») |
| RGPD avancée, rate limiting, CSRF | ✅ D'accord |
| 14 modèles sans CREATE TABLE | ⚠️ **Nuance** — d'accord d'ignorer **pour la prod actuelle**, mais le créateur doit savoir : si Neon plante demain, il ne peut pas recréer la base via `prisma migrate deploy` seul. Il faudra `db push`. **Action minimale** : ajouter une ligne dans le README. |
| Casino EV positive | ⚠️ **Nuance** — d'accord sur l'équilibrage, mais si un pote tombe par hasard sur une combo qui génère 500 reps/jour d'énergie gratuite, le créateur va devoir intervenir manuellement. Audit léger en Partie B.9, recommandation à toi. |
| Refactor narratif (fusion univers) | ✅ D'accord — la fusion est volontaire, c'est l'identité du jeu. Mon audit précédent était hors-sujet sur ce point. |

### 🤔 Arbitrages — ma recommandation

| # | Item | Ma reco | Justification |
|---|---|---|---|
| A1 | Supprimer code mort (`engine.ts`, 8 routes mortes, `_archive/`) | **OUI, mais après le reste** | Risque actuel : zéro impact joueur. Risque latent : un futur dev (toi-même dans 6 mois) modifie `engine.ts` croyant qu'il sert, et casse rien (parce qu'inutilisé). Mais surtout : c'est du temps perdu à grepper « tiens, c'est utilisé ? ». Effort fix : 1-2h. À planifier en dernier. |
| A2 | Audit log serveur (`GamebookEvent` append-only) | **NON pour l'instant** | Pour 8 amis qui ne contestent pas leurs XP, c'est de la complexité gratuite. Si un jour un pote crie « j'ai pas reçu mon XP », tu peux interroger la table existante. À reconsidérer **uniquement** si plusieurs incidents surviennent. |
| A3 | Baseline migration pour les 14 modèles | **NON, mais documenter** | Pas de bénéfice immédiat. Risque uniquement si Neon plante ou si tu veux cloner sur un autre Neon. Action 5 minutes : ajouter `## Régénération DB` dans le README expliquant la procédure (`db push --accept-data-loss=false` puis seed). |

---

## 2. Éléments que MON audit a vus et qui méritent d'entrer dans la priorisation

### #M1 — Dualité `Daemon.currentHp` vs `activeBattle.actorHp`
- **Ce que le joueur vit** : si le client crash en plein combat, le HP affiché au retour ne correspond pas à celui en base.
- **Localisation** : `src/lib/gamebook/daemon.ts` + JSON `activeBattle` géré par `src/app/api/gamebook/daemon/battle/action/route.ts`.
- **Criticité** : 🟠 Frustrant — pas bloquant mais perturbant.
- **Fix proposé** : à la fin d'un combat, écrire `currentHp = activeBattle.actorHp` puis `activeBattle = null`. À l'init d'un combat, lire `currentHp` comme source unique. ~1-2h.
- **Confiance** : Élevée — vu directement dans le code.

### #M2 — `isCreator` padding (1000 reps min via `padAvailableEnergyForCreator`)
- **Ce que le joueur vit** : si tu apparais dans un classement « Top reps Nexus » à côté de tes potes, tu sembles avoir bossé sans en avoir vraiment fait. Asymétrie invisible aux 7 autres.
- **Localisation** : `src/lib/gamebook/creator.ts` + 111 routes.
- **Criticité** : 🟠 Frustrant (mais auto-imposé par toi-même) — c'est précisément ce que la Partie C remplace.
- **Fix proposé** : Partie C compte test (gros chantier déjà planifié). À court terme : exclure `isSystem=true` de tous les classements Nexus (en plus de l'app PushQuest). À vérifier que c'est déjà le cas (`bridge/route.ts:296` le fait pour les défis du pont — mais pour le leaderboard Nexus ?).
- **Confiance** : Élevée.

### #M3 — Dialogues stockés en dur dans `npcs.ts` (2565 lignes) hors de `dialogue.ts`
- **Ce que le joueur vit** : aucun impact direct, **mais** : impossible pour toi d'éditer un dialogue PNJ sans risquer une typo de code. Et impossible d'auditer en bloc « est-ce que mes PNJ se contredisent ? ».
- **Criticité** : 🟡 Confort développeur, pas joueur.
- **Fix proposé** : **pas tout de suite**. Mais en parallèle, je vais produire en Partie B.2 un index des dialogues qui permettra de chasser les incohérences sans refactor.

### #M4 — Pas de feedback visuel à un débit refusé
- **Ce que le joueur vit** : il clique pour bouger, le serveur refuse silencieusement, la page ne réagit pas.
- **Criticité** : 🟠 Frustrant — déjà semi-couvert par « Messages clairs » mais à généraliser.
- **Fix proposé** : toast standard « action impossible » dans `MapClient` pour toute réponse `{ ok: false, reason: ... }`.
- **Confiance** : Moyenne — à vérifier que le pattern existe déjà partiellement.

---

## 3. Éléments dans la liste qui ne sont pas si critiques (à 8 potes)

### Cap niveau L50 & courbe XP L³
**Pourquoi ce n'est pas critique aujourd'hui** : pour atteindre le « mur » L49→L50, il faut ~327 combats à L49. Aucun des 8 amis n'est probablement à L30 aujourd'hui. **Le problème se posera dans 3-6 mois minimum.** À l'inverse, le « plat » L1→L10 est rapide. Ce qui est cassé est la **queue**, pas le **flux principal** où sont les joueurs.

**Recommandation** : audit léger en Partie B.6 pour situer les 8 joueurs sur la courbe. Si le plus avancé est à L18, c'est ⚪. Si quelqu'un approche L30, on planifie un rééquilibrage soft (`BASE_EXP_BOSS_FINAL` × 2 par exemple, sans toucher au cap).

### Race condition `energySpentToday`
**Pourquoi ce n'est pas si critique** : sans concurrence multi-utilisateurs, le seul risque est qu'un joueur double-clique et que les 2 requêtes arrivent en chevauchement. En pratique, le `isLoading` du client bloque ce cas avant qu'il n'atteigne le serveur. **Mais** : le fix `{increment}` reste à faire parce que trivial et zero-risque.

---

## 4. TOP 10 final (impact / effort, à 8 potes, sur services gratuits)

| Rang | Item | Impact | Effort | Priorité (impact-effort) |
|---|---|---|---|---|
| 1 | **Bug bonus minuit** | 🔴 Joueurs perdent leur réussite à 00h00 | S (1-3h) | ⭐⭐⭐⭐⭐ |
| 2 | **Audit XP promesses route par route + tests** | 🔴 Trahison structurelle | M (4-8h) | ⭐⭐⭐⭐⭐ |
| 3 | **Lancer `audit-doors.mjs` + fixer warnings** | 🔴 Joueurs bloqués shops | S (1-3h) | ⭐⭐⭐⭐⭐ |
| 4 | **Script « unstick » : rescue positions héritées invalides** | 🔴 Plusieurs joueurs encore bloqués | S (1-2h) | ⭐⭐⭐⭐⭐ |
| 5 | **Reset combat orphelin (panneau test + timeout 30 min auto)** | 🔴 Daemons en état zombie | S (1-3h) | ⭐⭐⭐⭐⭐ |
| 6 | **Audit cohérence narrative (mots du futur, séquençage)** | 🔴 Spoils accidentels | M (4-8h pour scan + ~2h pour fixes) | ⭐⭐⭐⭐ |
| 7 | **Messages clairs « il te faut N reps »** | 🟠 Tâtonnement énergie | S (2-4h sur tous les obstacles connus) | ⭐⭐⭐⭐ |
| 8 | **Tutoriel contrôles overlay au premier mount** | 🟠 Onboarding | S (2-3h) | ⭐⭐⭐⭐ |
| 9 | **Compte test God Mode (Partie C — déjà planifié)** | 🔴 Productivité dev | L (12-24h) | ⭐⭐⭐⭐ |
| 10 | **Fix #M1 (dualité Daemon.currentHp / activeBattle.actorHp)** | 🟠 Désynchro combat | S (1-2h) | ⭐⭐⭐ |

**Hors top 10 mais à garder à l'œil** : fix `{increment}` énergie (trivial mais zero impact à 8 potes), exclusion `isSystem` des classements Nexus, audit calibrage Daemons par zone (Partie B.6).

---

## 5. Arbitrages à prendre AVANT de fixer

Le créateur doit répondre oui/non aux questions suivantes pour débloquer la phase de fixes. Format binaire pour éviter la paralysie :

### Q-A — Code mort (`engine.ts`, 8 routes mortes, `_archive/`)
**Question** : Tu autorises la suppression complète du code mort identifié ? (delete fichiers + import refs).  
**Ma reco** : OUI mais en dernier (après tous les fixes joueur).

### Q-B — Audit log serveur (`GamebookEvent` append-only)
**Question** : Tu veux qu'on ajoute une table de log serveur pour tracer toutes les actions joueur ?  
**Ma reco** : NON. Trop de complexité pour 8 potes. Réutiliser la table existante au cas par cas.

### Q-C — Baseline migration (CREATE TABLE manquants)
**Question** : Tu veux qu'on génère une migration baseline pour permettre la régénération propre via `prisma migrate deploy` ?  
**Ma reco** : NON. Documenter la procédure de regen via `db push` dans le README, c'est suffisant.

### Q-D — Casino : ajouter un cap journalier de gain cumulé ?
**Question** : Si un pote tombe par hasard sur une combo qui lui rapporte +500 reps/jour, c'est OK ou tu veux un garde-fou ?  
**Ma reco** : OUI à un garde-fou simple : `casinoNetGainToday ≤ 200 reps`. ~1h de code.

### Q-E — Compte test God Mode (Partie C) — confirmation
**Question 1** : Le compte test doit être un **NOUVEAU compte créé** (ex. « tester01 ») ou un **compte existant marqué** (Guigui ou Quatorze) ?  
**Ma reco** : Compte existant marqué (Guigui), parce qu'il a déjà une progression réelle et permettra de tester en conditions naturelles. À toi.

**Question 2** : Le panneau testeur doit-il pouvoir agir sur **n'importe quel compte** depuis le compte tester (ex. débloquer un autre joueur), ou **uniquement sur le compte tester lui-même** ?  
**Ma reco** : Uniquement sur le compte tester lui-même, pour cette V1. Une fonction « rescue another player » peut être ajoutée plus tard via route `/api/admin/rescue-player` qui existe déjà (cf. commit `755a071`).

### Q-F — Cap niveau Daemon
**Question** : Si l'audit Partie B.6 montre qu'un pote approche L25-L30, tu veux qu'on augmente `BASE_EXP_BOSS_FINAL` × 2 ou qu'on baisse le cap à L30 ?  
**Ma reco** : multiplier BASE_EXP boss × 2 (préserve le sentiment Pokémon, accélère la fin de courbe sans changer le plat). À décider après audit.

### Q-G — `isSystem` dans les classements Nexus
**Question** : Confirmer que ton compte créateur (isSystem=true) doit être exclu **de TOUS les classements Nexus**, pas seulement ceux du pont ?  
**Ma reco** : OUI, exclusion partout. À vérifier en Partie B.7.

---

## 6. Conclusion

**La priorisation du créateur est globalement excellente.** Mes 3 ajustements :

1. **Déprioriser** « Cap niveau / courbe XP » tant qu'aucun joueur n'a passé L25 (à mesurer en B.6).
2. **Ajouter** le fix #M1 (dualité Daemon HP) au TOP 10.
3. **Documenter** que la base n'est pas régénérable via `migrate deploy` sans intervention manuelle.

**3 arbitrages bloquants pour la suite** : Q-D (cap casino), Q-E (compte test : nouveau ou existant ?), Q-G (exclusion classements).

Tous les autres arbitrages peuvent être pris pendant ou après les fixes.

---

*Fin CONFRONTATION_PRIORITES.md*
