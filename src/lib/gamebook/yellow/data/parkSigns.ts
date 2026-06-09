// src/lib/gamebook/yellow/data/parkSigns.ts
//
// Nexus Jaune Éclair — CONSEILS des panneaux espacés de la Route Nord ("le parc").
// Chaque panneau est un hotspot interactif : le lire affiche un conseil. Les
// conseils tournent en boucle (cf. npcs.ts → PARK_SIGN_NPCS, index % nb de conseils).
//
// Objectif : APPRENDRE de vraies mécaniques PushQuest (pas des banalités). Édite
// librement : chaque conseil est un tableau de bulles (une par tap).

/** Conseils affichés sur les panneaux de la Route Nord (cyclés). */
export const PARK_SIGN_TIPS: ReadonlyArray<ReadonlyArray<string>> = [
    // 1 — Capture : affaiblir + statut
    [
        "POUR CAPTURER : descends d'abord les PV de la cible le plus bas possible.",
        "À 1 PV, tes chances triplent. Et un statut (SOMMEIL ou GEL) les multiplie encore par 2,5 !",
        "Garde tes meilleures Balls pour les rares : à pleins PV, même une Hyper Ball galère.",
    ],
    // 2 — Reps → énergie
    [
        "Tes VRAIES répétitions PushQuest deviennent ton ÉNERGIE de combat.",
        "Chaque attaque coûte des reps : pas de sport, pas de munitions.",
        "Toutes tes reps du jour sont jouables immédiatement.",
    ],
    // 3 — Le quota du jour
    [
        "Atteins ton QUOTA quotidien et la nature te récompense :",
        "captures facilitées, Daemons plus rares et de plus haut niveau dans les herbes.",
        "Dépasse-le pour des potentiels (IV) encore meilleurs.",
    ],
    // 4 — Table des types (le coeur du jeu)
    [
        "Le triangle de base : l'Eau éteint le Feu, le Feu brûle la Plante, la Plante boit l'Eau.",
        "Mais retiens aussi : la ROCHE écrase Feu et Vol · le COMBAT brise Roche et Normal · le SOL foudroie Feu, Roche et Élec.",
        "Une équipe de types VARIÉS ne se fait jamais surprendre.",
    ],
    // 5 — Daemon de tête
    [
        "Le Daemon EN TÊTE fixe le niveau des sauvages que tu croises.",
        "C'est aussi lui que le sbire copie face à toi. Réordonne ton équipe pour choisir qui ouvre.",
    ],
    // 6 — Partage d'XP (corrigé)
    [
        "L'XP d'un ennemi vaincu va à TOUS tes Daemons qui l'ont affronté — pas aux autres.",
        "Envoie tes jeunes recrues au front un instant : même un bref passage les fait grandir.",
    ],
    // 7 — Attaques de statut
    [
        "Toutes les attaques ne font pas de dégâts directs.",
        "Poison, paralysie, sommeil… elles rongent l'adversaire ou l'immobilisent tour après tour.",
        "Bien placées, elles renversent un combat sans que tu prennes un coup.",
    ],
    // 8 — Renforcement / objets X
    [
        "Sacrifie un tour pour aiguiser ton Attaque ou ta Défense, et les coups suivants font mal.",
        "Les objets X font pareil en combat : +1 cran (~+50%) sur une stat, le temps du duel.",
    ],
    // 9 — Apprentissage des attaques
    [
        "Un Daemon ne retient que QUATRE attaques.",
        "Quand il veut en apprendre une 5e, ça t'attend dans sa FICHE : choisis laquelle remplacer, quand tu veux.",
    ],
    // 10 — Fuite
    [
        "Face à un sauvage trop coriace, fuir n'a rien de honteux.",
        "Mais contre un DRESSEUR, pas d'échappatoire : il faut vaincre ou tomber.",
    ],
    // 11 — La Grotte
    [
        "Une GROTTE s'ouvre dans le flanc de la montagne, au nord.",
        "C'est l'antre des Daemons ROCHE — idéal pour étoffer ton équipe avant l'arène de pierre.",
    ],
    // 12 — Le Centre Daemon
    [
        "Au Centre Daemon : soigne ton équipe, range tes Daemons à l'ORDINATEUR (PC),",
        "consulte la BIBLIOTHÈQUE (les stats des autres dresseurs)… et grimpe à l'étage voir ce qui s'y trame.",
    ],
]
