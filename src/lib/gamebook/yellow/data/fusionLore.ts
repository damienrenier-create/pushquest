// src/lib/gamebook/yellow/data/fusionLore.ts
//
// CONTENU (texte) du système de fusion — FUSION_RULES : les règles claires/précises/exhaustives affichées
// dans le FUSIODEX (page « Comment fusionner ? »). Les dialogues de PNJ 7 vivent dans data/pnj7.ts.

/** Les règles de la fusion, exhaustives (Fusiodex → page « Comment fusionner ? »). */
export const FUSION_RULES: string[] = [
    "🧬 LA FUSION DES DAEMONS",
    "Sur l'Autel de la Chimère, pose 2 Daemons : ils fusionnent en UN seul construct de combat, le temps d'un affrontement. Les 2 parents restent intacts (aucune perte).",
    "Tout se calcule sur les stats RÉELLES des parents (niveau, EV/IV, points Saiyan) : fais monter tes parents et la fusion monte avec eux.",
    "① STATS PHYSIQUES (PV · Attaque · Défense · Vitesse). Pour chaque parent, ses 2 plus HAUTES de ces 4 stats sont DOMINANTES (×0,6), les 2 plus basses RÉCESSIVES (×0,45). La stat du fusionné = la somme pondérée des deux. Une stat dominante des DEUX côtés atteint le poids combiné ×1,2 (0,6+0,6) et peut DÉPASSER les deux parents.",
    "② STAT SPÉCIALE — le fusionné a UNE seule Spéciale (offense = défense), comme tout Daemon. Elle vaut 0,6 × la meilleure Spéciale des 2 parents + 0,45 × la moindre (même esprit dominant/récessif que les stats physiques).",
    "③ NIVEAU = celui du plus haut des 2 parents. Les stats sont ensuite GELÉES pour tout le combat.",
    "④ TYPES — pour chaque parent, le fusionné garde le type le plus FIDÈLE à ses grosses stats (2 mono-types → un bi-type ; type partagé → mono-type, ou + le meilleur autre type).",
    "⑤ ATTAQUES — il reçoit les 2 PREMIÈRES attaques du parent le plus RAPIDE + les 2 DERNIÈRES du plus LENT (dédupliquées).",
    "⑥ OBJETS TENUS — il hérite des objets tenus de ses parents (0, 1 ou 2). Pour l'instant, le 1er objet est actif en combat.",
    "⑦ Un parent EN FUSION est indisponible : il ne combat pas et ne peut pas re-fusionner tant qu'il est engagé dans une fusion.",
    "⑧ AUCUN plafond de stats : une fusion peut surpasser ses deux parents. À toi de trouver les meilleures combinaisons (souvent des stats COMPLÉMENTAIRES).",
    "🐣 À l'état sauvage, deux âmes affines qui surgissent l'une juste après l'autre peuvent fusionner d'elles-mêmes… mais on ne capture une fusion qu'avec une FUSIO-BALL.",
]
