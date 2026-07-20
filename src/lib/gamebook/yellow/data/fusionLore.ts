// src/lib/gamebook/yellow/data/fusionLore.ts
//
// CONTENU (texte) du système de fusion — indépendant de l'infra. Sert :
//   - FUSION_RULES : les règles claires/précises/exhaustives affichées dans le FUSIODEX (page « Règles »).
//   - PNJ 7 (gardien de la Grotte 1F) : intro/défaite + carrousel d'info post-combat + relecture.
// Câblé plus tard (Fusiodex + trainers.ts + gameStore carrousel).

/** Les règles de la fusion, exhaustives (Fusiodex → page « Comment fusionner ? »). */
export const FUSION_RULES: string[] = [
    "🧬 LA FUSION DES DAEMONS",
    "Sur l'Autel de la Chimère, pose 2 Daemons : ils fusionnent en UN seul construct de combat, le temps d'un affrontement. Les 2 parents restent intacts (aucune perte).",
    "① STATS PHYSIQUES (PV · Attaque · Défense · Vitesse). Pour chaque parent, ses 2 plus HAUTES de ces 4 stats sont DOMINANTES (×0,6), les 2 plus basses RÉCESSIVES (×0,4). La stat du fusionné = la somme pondérée des deux. Une stat dominante des DEUX côtés peut atteindre ~120 % et DÉPASSER les deux parents.",
    "② STAT SPÉCIALE — elle se SCINDE par la VITESSE. L'Attaque Spéciale vient du parent le plus RAPIDE ; la Défense Spéciale, du plus LENT (valeurs pleines). Le fusionné cumule donc la meilleure offensive ET la meilleure défensive spéciales — ce qu'aucun parent ne pouvait faire seul.",
    "③ NIVEAU = celui du plus haut des 2 parents. Les stats sont ensuite GELÉES pour tout le combat.",
    "④ TYPES — le fusionné conserve les 2 types les plus FIDÈLES à ses plus grosses stats (2 mono-types → un bi-type ; mêmes types → mono-type).",
    "⑤ ATTAQUES — il reçoit les 2 PREMIÈRES attaques du parent le plus RAPIDE + les 2 DERNIÈRES du plus LENT.",
    "⑥ OBJETS TENUS — il hérite des objets de ses parents : 0, 1, ou même DEUX (si chaque parent en tenait un).",
    "⑦ Un parent EN FUSION est indisponible : il ne combat pas et ne peut pas re-fusionner tant qu'il est engagé dans une fusion.",
    "⑧ AUCUN plafond de stats : une fusion peut surpasser ses deux parents. À toi de trouver les meilleures combinaisons.",
    "🐣 À l'état sauvage, deux âmes affines qui surgissent l'une juste après l'autre peuvent fusionner d'elles-mêmes… mais on ne capture une fusion qu'avec une FUSIO-BALL.",
]

/** PNJ 7 — gardien de la Grotte du Nexus 1F (5 némésis). */
export const PNJ7_INTRO: string[] = [
    "« Halte. Peu d'aventuriers s'enfoncent aussi loin dans la Grotte du Nexus… »",
    "« Je garde ce seuil. Affronte mes CINQ ombres — mes némésis. Survis-y, et je te révélerai ce que cache vraiment cette caverne. »",
]
export const PNJ7_DEFEAT: string[] = [
    "« …Impressionnant. Mes némésis sont à terre. Tu as gagné le droit de savoir. Approche. »",
]
/** Carrousel d'info montré à la victoire (et revisitable en re-parlant à PNJ 7). */
export const PNJ7_CAROUSEL: string[] = [
    "🔬 « Tout au FOND de cette grotte vit un éminent scientifique. Il mène d'étranges expériences sur la FUSION des Daemons… »",
    "🌿 « La Grotte regorge de BIOTOPES différents : cavités humides, poches volcaniques, salles de cristal… chacune abrite sa propre faune. »",
    "✨ « Certains Daemons extrêmement rares ne se terrent QUE dans un biotope unique. Explore, et ouvre l'œil. »",
    "🧬 « Et parfois… quand deux âmes affines surgissent l'une juste après l'autre, la Grotte les FUSIONNE sous tes yeux. Mais pour capturer pareille chimère, il te faudra une balle très spéciale. »",
]
/** Relecture des infos (re-parler à PNJ 7 après l'avoir battu). */
export const PNJ7_REVISIT: string[] = [
    "« Tu veux que je te répète ce que cache la Grotte ? Volontiers. »",
    ...PNJ7_CAROUSEL,
]
