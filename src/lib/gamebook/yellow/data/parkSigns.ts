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
    // 1 — Capture : affaiblir + statut (chiffres concrets)
    [
        "POUR CAPTURER : plus la cible est affaiblie, plus c'est facile. Avec une Nexus-Ball sur un Daemon commun :",
        "PV pleins ≈ 24% · à 50% ≈ 47% · à 33% ≈ 55% · à 1 PV ≈ 71%.",
        "Un statut (SOMMEIL ou GEL) multiplie encore par 2,5 ! Garde tes bonnes Balls pour les rares.",
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
    // 5 — Niveau de l'équipe → sauvages (volontairement vague)
    [
        "Le NIVEAU de ton équipe influence les Daemons sauvages que tu croises.",
        "Plus tu montes en puissance, plus les herbes recèlent d'adversaires coriaces.",
    ],
    // 6 — Partage d'XP (corrigé)
    [
        "L'XP d'un ennemi vaincu va à TOUS tes Daemons qui l'ont affronté — pas aux autres.",
        "Envoie tes jeunes recrues au front un instant : même un bref passage les fait grandir.",
    ],
    // 7 — Attaques de statut (avec exemple)
    [
        "Certaines attaques infligent un STATUT : brûlure, poison, paralysie, sommeil…",
        "Ex : Flammèche brûle (10%) — Braisille et Fennaise l'apprennent dès le NIVEAU 7.",
        "Poison et brûlure rongent l'ennemi chaque tour, le sommeil le fige : de quoi gagner sans prendre un coup.",
    ],
    // 8 — Renforcement / objets X (avec exemple)
    [
        "D'autres techniques te renforcent TOI au lieu de frapper.",
        "Ex : Danse-Lames augmente fortement ton Attaque (+2 crans) — un tour de mise, puis tu balaies.",
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
    // 11 — ACE (rival quotidien)
    [
        "ACE, le rival, t'attend en ville : tu peux le défier UNE fois par jour.",
        "Il s'adapte à ta puissance et ne faiblit jamais… mais le vaincre rapporte un petit cadeau.",
        "Reviens chaque jour mesurer tes progrès contre lui.",
    ],
    // 12 — Le Centre Daemon
    [
        "Au Centre Daemon : soigne ton équipe, range tes Daemons à l'ORDINATEUR (PC),",
        "consulte la BIBLIOTHÈQUE (les stats des autres dresseurs)… et grimpe à l'étage voir ce qui s'y trame.",
    ],
]
