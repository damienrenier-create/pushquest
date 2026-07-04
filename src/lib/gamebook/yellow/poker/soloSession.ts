// src/lib/gamebook/yellow/poker/soloSession.ts
//
// Nexus — Poker : règles de la PREMIÈRE PARTIE (tuto SOLO vs bots, jouée 100% LOCALEMENT côté client).
// La maison offre un tapis que l'utilisateur DOIT jouer, plafonne les gains en « trichant » (elle reprend
// l'excédent au-dessus de 1000), et récupère une part à la sortie (clawback, avec intérêts si gros gains).
//
// PROPRIÉTÉ CLÉ — RISQUE NUL : le tapis est 100 % house-funded. Les reps du joueur ne sont JAMAIS débités
// par la 1re partie ; à la sortie il ne fait qu'ENCAISSER ce qu'il garde (0 → 800). Il ne peut rien perdre
// de son propre solde. Aucun vrai pote n'est impliqué (partie solo locale) → aucune énergie réelle en jeu.

/** Tapis offert par la maison au début de la 1re partie (l'utilisateur est OBLIGÉ de le jouer). */
export const FIRST_GAME_GIFT = 100
/** Plafond de tapis : au-dessus, la maison triche et reprend l'excédent (empêche tout runaway). */
export const FIRST_GAME_CHEAT_CAP = 1000

/** Triche « plafond » : si le tapis dépasse le cap, la maison reprend l'excédent.
 *  Renvoie le tapis corrigé + le montant repris (0 si sous le plafond). */
export function applyFirstGameCheat(stack: number): { stack: number; taken: number } {
    const s = Math.max(0, Math.floor(stack))
    if (s <= FIRST_GAME_CHEAT_CAP) return { stack: s, taken: 0 }
    return { stack: FIRST_GAME_CHEAT_CAP, taken: s - FIRST_GAME_CHEAT_CAP }
}

/** Clawback à la SORTIE selon le tapis final (déjà plafonné) : la maison reprend son prêt.
 *  - tapis > 500 : rends 200 (intérêts) · tapis > 200 : rends 100 · sinon : rien.
 *  Renvoie ce que la maison reprend (`repay`) et ce que le joueur GARDE en reps (`kept`). */
export function firstGameClawback(finalStack: number): { repay: number; kept: number } {
    const s = Math.max(0, Math.floor(finalStack))
    const repay = s > 500 ? 200 : s > 200 ? 100 : 0
    return { repay, kept: Math.max(0, s - repay) }
}

/** Règlement complet à la sortie : d'abord le plafond (triche), puis le clawback.
 *  `kept` = reps crédités au joueur (0 → 800). `cheatTaken` + `repay` = ce que la maison a repris. */
export function settleFirstGame(finalStack: number): { capped: number; cheatTaken: number; repay: number; kept: number } {
    const { stack: capped, taken: cheatTaken } = applyFirstGameCheat(finalStack)
    const { repay, kept } = firstGameClawback(capped)
    return { capped, cheatTaken, repay, kept }
}
