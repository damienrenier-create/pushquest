# HANDOFF — reprise de contexte Claude Code

> **Pour Claude (moi-même sur une nouvelle machine) : LIS CE FICHIER EN PREMIER.**
> Il me redonne les réflexes et l'état du projet. ⚠️ Ce repo est **PUBLIC** → aucun secret ni donnée
> joueur ici. Ma mémoire complète (privée) reste dans des fichiers **locaux** (voir §Mémoire).

## Le projet
- **PushQuest — « Nexus Jaune Éclair »** (chapitre 2), sous-système *Gamebook* type Pokémon.
- Stack : **Next.js 16 + Prisma 5 + Neon (Postgres)**. **EN PRODUCTION** pour ~7-24 amis.
- Dev **solo** (Sartay / DamRen). Déploiement **manuel via Vercel** par lui. Il **ne peut pas** générer de sprites lui-même (il fournit des PNG ; je câble l'intégration).

## ⚠️ RÈGLES D'OR (ne jamais enfreindre)
1. **`npx tsc --noEmit` doit rester à 0 erreur.** Ne JAMAIS monter le compteur. Faire tourner la **suite vitest complète** (`npx vitest run`) avant de considérer une tâche finie.
2. **Branche de prod = `feat/nexus-yellow`.** `main` est **OBSOLÈTE → NE JAMAIS y toucher.**
3. **Commit / push UNIQUEMENT quand demandé.** Messages de commit finissant par :
   `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
4. **Migrations DB additives seulement.** `npm run db:push` (ou `npx prisma db push`) **AVANT** tout déploiement Vercel qui dépend d'un nouveau champ/table. La plupart des changements de save **ne nécessitent PAS** de db:push (voir §Save).
5. **Save-safety = risque #1.** Neon a ~6h de rétention → **backup avant toute écriture/reset DB**. Ne jamais reset un compte sans sauvegarde préalable.
6. Pas de refactor non demandé. Respecter le style/idiome du code environnant, commentaires en français.

## Save & base de données
- La **save** d'un joueur = `GamebookProgress.flags` (blob JSON) : équipe, PC, Pokédex (`pokedex.seen/caught`), badges, `reps` (énergie), `activeWorld` (`live`=run1 / `ngplus`=run2 / `run3` / `replay`), `isChampion`, `sylvebarbeAwake`, etc.
  → Modifier un **champ de save** = éditer ce JSON, **pas** de db:push.
- `gameMode` est sur le modèle **User** (`normal` / `easy` / `debutant` / `fun`). Les « funs » = lien d'invitation `nexus-fun-2026` (départ **10 000⚡** + 10 Nexus-Ball, interface muscu allégée).
- **Requêtes DB en lecture** : script Node standalone qui parse `.env` pour `DATABASE_URL` puis `new PrismaClient()`. **Le lancer depuis la racine du repo** (résolution de `@prisma/client`). Toujours privilégier le read-only ; backup avant écriture.

## Commandes & environnement
- Racine repo (Windows) : `C:\Users\<user>\Documents\GitHub\pushquest` (shell Git Bash dispo).
- Vérif : `npx tsc --noEmit` puis `npx vitest run` (≈ 1600+ tests, ~1-2 min).
- Fichiers temporaires : les mettre dans le scratchpad de session, pas dans le repo. Supprimer les scripts jetables après usage.

## Mémoire (IMPORTANT — elle ne suit PAS le repo)
Ma mémoire persistante est **locale à la machine**, non synchronisée, dans :
```
C:\Users\Sartay\.claude\projects\C--Users-Sartay\memory\
```
- `MEMORY.md` = index (une ligne par fait) ; ~60 fiches thématiques (systèmes, designs, sessions).
- **Pour la transférer** sur la nouvelle machine : la **copier en privé** (USB / OneDrive) dans le dossier `.claude` équivalent — PAS dans ce repo public. Si le nom d'utilisateur Windows change, les fichiers restent lisibles (nouveau chat + mémoire copiée = je reprends tout).
- Alternative cloud (sans copie) : `claude.ai/code` (sessions cloud liées au compte, repo GitHub connecté) — mais elles démarrent **sans** cette mémoire → ce HANDOFF sert alors d'amorçage.

## État au 2026-09-01 (dernière session)
Tout est commité + poussé sur `feat/nexus-yellow`. Derniers commits notables :
- **EV cap 561 en mode fun dès le run 1 + rétroactif** (`ensureFunEvCapBoost`, `evConfig.evTotalCap` : dépend des IV + du niveau de capture).
- **Difficulté de l'Archiviste** (Collectionneur) graduée par nb de badges + **ball de reflet** graduée (Nexus→Super→Hyper selon l'avancée d'arène).
- **Panneau d'astuces Ville Jaune (23,1)** : 20 conseils rotatifs (6 h), s'inscrivent au **Calepin** (`data/villeJauneTips.ts`, NPC `y_tips_board`).
- Texte de départ fun corrigé (**10 000⚡**).
- **Gate TÉNÈBRES run 1** (`postSylvebarbe`) : les créatures Ténèbres (type « run 3 ») ne poppent plus en run 1 avant l'éveil de Sylvebarbe (Plage + pêche Cendreville). Cf. `data/tenebres_gate.test.ts`.

### Fil ouvert (à investiguer)
- **Bug « vol ×3 »** : le bonus de triplement d'énergie (dépassement de quota) n'est pas appliqué → piste `tomorrowEnergyMult` / `bankReps` (playerStore). Rapporté par un joueur, **non corrigé**.

## Routine « alertes créateur » (à faire en début de session)
Interroger la DB (lecture seule) et signaler à Sartay :
- `GenieWish` avec `status="SUBMITTED"` (nouveaux vœux à traiter). Répondre = poser `conditionN` + `proposedSeen=false` (+ `status="PROPOSED"`) en base ; `effectN` = cadeau optionnel (JSON). Cf. `api/gamebook/yellow/genie-wish/route.ts`.
- `AdvisorQuestion` avec `answer=null` **créées récemment** (les anciennes ont déjà été traitées/archivées — voir la mémoire locale pour lesquelles).
