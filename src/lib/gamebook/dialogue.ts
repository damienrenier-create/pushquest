// src/lib/gamebook/dialogue.ts
//
// Dialogues du Monstre Spaghetti Volant.

// =====================================================
// INTRO : déclenchée quand le joueur entre dans les hautes herbes pour la 1ère fois
// =====================================================
export const MONSTER_INTRO_DIALOGUE: string[] = [
    "STOP !",
    "Tu vas pas aller dans ces hautes herbes comme ça.",
    "T'es qui d'abord ? Et tu vas où sans prévenir ?",
    "Bon. Suis-moi. J'habite juste là, dans la grotte en bas.",
    // Étape 4 = téléportation dans la grotte
    "Voilà. Bienvenue dans ma grotte. C'est petit mais c'est chez moi.",
    "Je suis le Monstre Spaghetti Volant. Enchanté. Ou pas.",
    "Tu veux explorer le monde ? Très bien. Mais y'a une règle.",
    "Pour bouger, il faut de l'ÉNERGIE.",
    "Et l'énergie, c'est tes REPS. Les vraies. Celles que tu fais.",
    "10 reps = 1 case. Pas plus, pas moins.",
    "Au nord, dans les hautes herbes, y'a un arbre tombé.",
    "Il coûte 150 reps à pousser. Va te faire des pompes avant.",
    "Et arrête de me regarder comme ça.",
]

// Étape où on téléporte le joueur dans la grotte
export const INTRO_STEP_TELEPORT_TO_CAVE = 3

// Étape de fin (après laquelle on passe en phase 'playing')
export const INTRO_LAST_STEP = MONSTER_INTRO_DIALOGUE.length - 1

// =====================================================
// PIONNIER : déclenchée quand le joueur franchit l'arbre obstacle pour la 1ère fois
// (donne le badge "Pionnier" qui vaut 200 XP dans l'app)
// =====================================================
export const MONSTER_PIONEER_DIALOGUE: string[] = [
    "Hé. Toi.",
    "T'as poussé l'arbre. Pas mal.",
    "Tiens, je te file un truc. Un badge. 'Pionnier'.",
    "Ça vaut 200 XP dans l'app. Tu peux remercier.",
    "Devant toi : le pont Pépite d'Azuria.",
    "Quatre PNJ te bloqueront. Chacun veut un effort différent.",
    "Si tu les bats tous, t'arrives à la Route 2. Enfin, plus tard.",
    "Allez, file. Et oublie pas de manger des pâtes.",
]

export const PIONEER_LAST_STEP = MONSTER_PIONEER_DIALOGUE.length - 1

// =====================================================
// v3.8 — PEPITO : donneur de sac à l'entrée de Pépiteville
// Premier passage : il offre le sac.
// =====================================================
// v3.22 — Dialogue utilisé par MAMAN (Bourg-Boulette sortie cave) OU PEPITO (Pépiteville backup).
// Le ton est volontairement à la fois maternel et taquin pour fonctionner avec les deux personnages.
// Don : SAC + BASKETS au premier passage.
export const PEPITO_DIALOGUE_FIRST: string[] = [
    "Te voilà ! Je t'attendais.",
    "T'es parti faire des trucs sans sac. Sans chaussures. Comme un sauvage.",
    "*Te tend un sac.* Tiens, prends ça. Tu pourras y ranger tes affaires.",
    "*Sort une paire de baskets.* Et ces baskets-là. Tes pieds vont te remercier.",
    "Avec ça tu marches moins fatigué. Appuie sur START pour ouvrir ton sac.",
    "Allez, va. Et fais attention à toi, hein.",
]

export const PEPITO_LAST_STEP_FIRST = PEPITO_DIALOGUE_FIRST.length - 1

// Pour les rencontres suivantes, dialogue court (sans donner de sac)
export const PEPITO_DIALOGUE_AFTER: string[] = [
    "Tu reviens. T'as ton sac, c'est l'essentiel.",
    "Va dépenser ton énergie utilement. Ou pas. Je m'en tape.",
]

// =====================================================
// v3.11 — PIAFFINI : cinématique de sauvetage au sommet de la Tour
// =====================================================
export const PIAFFINI_RESCUE_DIALOGUE: string[] = [
    "PIAFFINI : Pioupiou ? *Il te regarde avec ses grands yeux fatigués*",
    "PIAFFINI : Tu... tu viens me chercher ? JOJO t'a envoyé ?",
    "(Tu hoches la tête, intimidé.)",
    "PIAFFINI : Je suis perdu depuis si longtemps...",
    "PIAFFINI : Allez ! Accroche-toi à mes plumes !",
]
export const PIAFFINI_RESCUE_LAST_STEP = PIAFFINI_RESCUE_DIALOGUE.length - 1

// v3.11 — JOJO change de dialogue une fois PIAFFINI sauvé (cadeau Set de Nage)
export const JOJO_POST_PIAFFINI_DIALOGUE: string[] = [
    "Pioupiou ! Tu m'as ramené PIAFFINI ! Je ne sais comment te remercier !",
    "Tiens, prends ça. C'était le maillot et les palmes de ma grand-mère.",
    "Elle adorait nager. Avec ça, tu pourras explorer les eaux du sud.",
    "(Tu reçois le Set de Nage 🏊.)",
]

// v3.11 — Dialogue court une fois que JOJO a déjà donné le Set
export const JOJO_AFTER_GIFT_DIALOGUE: string[] = [
    "Merci encore d'avoir ramené PIAFFINI. Va profiter de ton équipement de nage !",
]

// v3.11 — JOJETTE félicitations chaleureuses post-PIAFFINI (clôture narrative)
export const JOJETTE_POST_PIAFFINI_DIALOGUE: string[] = [
    "J'ai entendu pour PIAFFINI ! C'est merveilleux.",
    "Mon frère devait être tellement heureux de le revoir.",
    "Profite bien de tes cadeaux !",
]

// =====================================================
// v3.11 — Rumeurs des PNJ de la Tour (foreshadowing arcs futurs)
// =====================================================
export const RUMEUR_OISEAU_DIALOGUE: string[] = [
    "On raconte qu'au sommet de cette tour, il y aurait un oiseau triste...",
    "...qui chante des mélodies tristes.",
    "Personne ne l'a vu, mais on l'entend parfois.",
]
export const RUMEUR_HERBES_DIALOGUE: string[] = [
    "Méfie-toi des hautes herbes du sud, plus loin que la mer.",
    "Mon cousin a essayé de les traverser une fois.",
    "Il est revenu plein de morsures de bestioles. Plus jamais.",
]
export const RUMEUR_CONCOURS_DIALOGUE: string[] = [
    "Tu sais qu'il y a un concours intersalle de muscu chaque année ?",
    "Sur une île au sud de Bourg-Boulette.",
    "Cette année il paraît qu'il est annulé. Bizarre, hein ?",
]

// v3.11 — Blagueur de la Tour : 4 blagues, choix aléatoire à chaque interaction
export const TOWER_JOKES: string[][] = [
    [
        "*Il se tient là, l'air sérieux.*",
        "Pourquoi est-ce que les pâtes sont sportives ?",
        "...",
        "Parce qu'elles ont la forme.",
        "*Personne ne rit.*",
    ],
    [
        "Pourquoi le penne avait honte ?",
        "Parce qu'il avait vu l'orec-chiette.",
        "*Il rit tout seul. Tu fais semblant de partir.*",
    ],
    [
        "Mon père m'a dit un jour :",
        "\"Mon fils, ne joue pas avec la nourriture.\"",
        "Du coup, je joue avec MOI. *clin d'œil*",
    ],
    [
        "Sais-tu pourquoi les fettucine sont mauvaises au foot ?",
        "Parce qu'elles font toujours des passes mal.",
        "Bon je sors.",
    ],
]

// =====================================================
// v3.23c — Cinématique du sommet du Mont Pasta-Ventoux
// =====================================================
export const MONT_SUMMIT_LINES: string[] = [
    "🏔️ Tu poses pied au sommet du Mont Pasta-Ventoux.",
    "Devant toi, l'horizon s'étend à perte de vue. Bourg-Boulette, Pépiteville, Macaron'île — tout te paraît minuscule.",
    "Le vent siffle dans tes oreilles. Tes jambes tremblent.",
    "Tu as conquis ce monstre de pierre. Personne ne pourra plus jamais te dire que tu n'en es pas capable.",
    "(Badge Conquérant 🏔️ +500 XP — Le contest_hall de Muscuville est maintenant accessible.)",
]

// =====================================================
// v3.23e — Blague unique de PIAFFINI pour Franss
// =====================================================
// Compensation narrative pour le bug du téléport raté. Franss arrive quelque part,
// fait son premier pas, et PIAFFINI réapparaît pour une dernière facétie.
export const FRANSS_JOKE_INTRO_LINES: string[] = [
    "*Un battement d'ailes derrière toi.* PIAFFINI ! 🐦",
    "« Coucou Franss ! Tu m'as l'air un peu fatigué de ta longue marche ? »",
    "« J'ai oublié de te dire un truc important. Suis-moi, on retourne à la Tour ! »",
    "*PIAFFINI t'agrippe avant que tu puisses dire ouf.*",
]
export const FRANSS_JOKE_ATTOWER_LINES: string[] = [
    "*PIAFFINI éclate de rire.* « AHAHAH ! »",
    "« T'as cru quoi ? Que j'avais oublié quelque chose ? Non, c'était une blague ! »",
    "« Bon, désolé pour la marche à pied de tout à l'heure. Je me rattrape. »",
    "« Tiens, prends ces 30 reps en cadeau d'excuses. Direction JOJO, et cette fois pour de vrai. »",
]

