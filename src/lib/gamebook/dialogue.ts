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
