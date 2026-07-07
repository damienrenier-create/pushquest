// src/lib/gamebook/yellow/data/berryLore.ts
//
// Introduction narrative des BAIES (post-Ligue). Deux porteurs du secret :
//   • le DRUIDE SYLVAIN (boss de l'arène 1) en RUN 2 — ses Daemons TIENNENT des baies ; à sa défaite il
//     livre le secret (affiché en dialogue post-combat via rematchReward) ;
//   • l'ASSISTANT du Prof. CHEN (labo) — FALLBACK post-Ligue quand le joueur ne lance pas de run 2.
// Récolte : 3 arbres/jour sur Route Nord & Ville Jaune (cf. data/berryTrees.ts).

/** Le Druide (boss arène 1, run 2) livre le secret des baies à sa défaite. */
export const BERRY_SECRET_LINES_DRUIDE = [
    "Hmpf… tu as vaincu mes protégés. Mais as-tu remarqué ? À bout de forces, ils ont croqué une BAIE… et sont repartis de plus belle.",
    "C'est le secret des dresseurs de la nature : on fait TENIR une baie à son Daemon. Elle se déclenche SEULE au combat — un soin, un regain de fougue, ou la fin d'un vilain statut.",
    "La forêt en sème dans les arbres, à Ville Jaune comme sur la Route Nord. Chaque jour, quelques arbres en portent une nouvelle. Cueille-les (A face à l'arbre) et confie-les à tes Daemons.",
    "Va, Champion. Et que tes compagnons ne tombent plus jamais à sec.",
]

/** L'assistant du Prof. CHEN révèle les baies (fallback post-Ligue, hors run 2). */
export const BERRY_SECRET_LINES_ASSISTANT = [
    "« Oh, Champion ! Puisque te voilà… le Prof. m'autorise enfin à partager une trouvaille de terrain. »",
    "« Les BAIES. De petits fruits qu'un Daemon peut TENIR : à court de PV ou frappé d'un statut, il la croque tout seul en plein combat. Soin, coup de fouet, antidote… selon la baie. »",
    "« La nature en fait pousser sur les arbres de VILLE JAUNE et de la ROUTE NORD. Trois arbres par jour, au hasard, en portent une. Approche-toi, appuie sur A face à l'arbre — hop, dans ton sac ! »",
    "« Ensuite, équipe-la depuis la fiche d'un Daemon, comme n'importe quel objet tenu. Essaie, tu m'en diras des nouvelles ! »",
]
