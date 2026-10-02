// 🚪 REPRENDRE OU LÂCHER UN COMBAT AU CHARGEMENT — la porte de sortie.
//
// L'instantané de combat (localStorage, cf. battleStore #8) existe pour qu'un RECHARGEMENT ne vaille pas une fuite
// gratuite : sans lui, un joueur en difficulté faisait F5 et sautait le boss avec son équipe intacte.
//
// Mais il créait un piège. Kingme (02/10/2026) s'est retrouvé ENFERMÉ : son adversaire se régénérait plus vite
// qu'il ne frappait, son énergie est tombée à zéro — plus d'attaque possible — et un combat de dresseur ne se fuit
// pas. L'instantané le remettait dans ce même combat à chaque rechargement, pendant 24 h. Aucune sortie.
//
// LA RÈGLE (Sartay) : quitter l'appli et y revenir fait SORTIR du combat. Un rechargement, non.
// On distingue les deux par un témoin en sessionStorage : il survit à un F5, il disparaît quand l'onglet ou la PWA
// se ferme. C'est la seule façon fiable de séparer les deux gestes, et ça laisse à tout joueur coincé une porte
// qu'il trouve tout seul — fermer l'appli — sans rendre la fuite au boss gratuite d'un simple F5.

/** Que faire de l'instantané de combat trouvé au chargement ?
 *  - `resume` : même session (le joueur a rechargé) → on reprend le combat où il en était ;
 *  - `release`: l'appli a été fermée depuis → on LÂCHE le combat, retour sur la carte ;
 *  - `none`   : il n'y a rien à reprendre.
 *
 *  `sameSession` = le témoin de sessionStorage est présent. */
export function battleResumeDecision(hasSnapshot: boolean, sameSession: boolean): "resume" | "release" | "none" {
    if (!hasSnapshot) return "none"
    return sameSession ? "resume" : "release"
}
