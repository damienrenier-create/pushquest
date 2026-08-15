// src/lib/gamebook/yellow/data/fusionLore.ts
//
// CONTENU (texte) du système de fusion — FUSION_RULES : les règles claires/précises/exhaustives affichées
// dans le FUSIODEX (page « Comment fusionner ? »). Les dialogues de PNJ 7 vivent dans data/pnj7.ts.

/** Les règles de la fusion, exhaustives (Fusiodex → page « Comment fusionner ? »). */
export const FUSION_RULES: string[] = [
    "🧬 LA FUSION DES DAEMONS",
    "Sur l'Autel de la Chimère, pose 2 Daemons : ils fusionnent en UN seul construct de combat, le temps d'un affrontement. Les 2 parents restent intacts (aucune perte).",
    "Tout se calcule sur les stats RÉELLES des parents (niveau, EV/IV, points Saiyan) : fais monter tes parents et la fusion monte avec eux.",
    "① STATS (les 5 comptent : PV · Attaque · Défense · Vitesse · Spéciale). Pour CHAQUE parent, ses 3 plus HAUTES stats sont DOMINANTES (×0,6), ses 2 plus basses RÉCESSIVES (×0,45). La stat du fusionné = la somme pondérée des deux parents. Une stat dominante des DEUX côtés atteint le poids combiné ×1,2 (0,6+0,6) et peut DÉPASSER les deux parents → cherche des parents COMPLÉMENTAIRES (l'un fort là où l'autre est faible).",
    "② STAT SPÉCIALE — le fusionné a UNE seule Spéciale (offense = défense), comme tout Daemon. Elle suit EXACTEMENT la même génétique 0,6/0,45 que les 4 autres stats (elle fait partie du classement des 3 dominantes / 2 récessives de chaque parent).",
    "③ NIVEAU = celui du plus haut des 2 parents. Les stats sont ensuite GELÉES pour tout le combat.",
    "④ TYPES (règle précise) — Chaque parent amène UN type : celui de ses types le plus FIDÈLE à SES PROPRES stats réelles (niveau, EV, points Saiyan) — l'autre est abandonné. Donc une MÊME espèce peut amener un type DIFFÉRENT selon son build (ex. un Daemon gonflé en PV amène son type « PV », gonflé en Spé son type « Spé »). Chaque type a une STAT REPRÉSENTATIVE, et le type dont cette stat est la plus HAUTE chez CE PARENT l'emporte — PV : Ténèbres · Attaque : Combat, Insecte, Dragon · Défense : Plante, Eau, Roche, Sol, Métal · Vitesse : Feu, Normal, Vol, Élec, Fée, Spectre · Spéciale : Glace, Psy, Poison. Résultat : un type par parent = un BI-TYPE (type du parent « tête » affiché en premier ; le STAB se moque de l'ordre).",
    "④ bis — CAS PARTICULIERS des types. Si les DEUX parents pointent vers le MÊME type S, le fusionné garde S + le 2ᵉ type le plus fidèle du couple → il reste BI-TYPE (mono-type uniquement s'il n'existe aucun autre type). Le jeu de types est INDÉPENDANT de l'ordre des parents (les égalités se départagent par l'ordre des noms) → la fusion est DÉTERMINISTE : mêmes types pour tout le monde, PvP inclus.",
    "⑤ ATTAQUES — il reçoit les 2 PREMIÈRES attaques du parent le plus RAPIDE + les 2 DERNIÈRES du plus LENT (dédupliquées).",
    "⑥ OBJETS TENUS — il hérite des objets tenus de ses parents (0, 1 ou 2). Pour l'instant, le 1er objet est actif en combat.",
    "⑦ Un parent EN FUSION est indisponible : il ne combat pas et ne peut pas re-fusionner tant qu'il est engagé dans une fusion.",
    "⑧ AUCUN plafond de stats : une fusion peut surpasser ses deux parents. À toi de trouver les meilleures combinaisons (souvent des stats COMPLÉMENTAIRES).",
    "✨ BONUS SECRET — CERTAINES fusions cachent une génétique BOOSTÉE (dominantes ×0,7 / récessives ×0,5 au lieu de 0,6/0,45) → des stats nettement plus hautes. Lesquelles ? Le génie ne le dira pas… mais une fusion qui possède ce bonus l'AFFICHE sur sa FICHE COMPLÈTE. À toi de les débusquer !",
    "✨✨ FUSION DORÉE — fais fusionner DEUX Daemons SHINY : c'est le bonus ULTIME. Génétique MAXIMALE (dominantes ×0,8 / récessives ×0,6) ET la fusion naît elle-même SHINY.",
    "🐣 À l'état sauvage, deux âmes affines qui surgissent l'une juste après l'autre peuvent fusionner d'elles-mêmes… mais on ne capture une fusion qu'avec une FUSIO-BALL.",
]
