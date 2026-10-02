// 🩹 PLAFOND DE RÉGÉNÉRATION — le garde-fou anti-combat-interminable.
//
// LE BLOCAGE VÉCU (Kingme, 02/10/2026). Trois attaques restaurent 50 % des PV (Repos, Linceul, Reprise d'Ailes),
// chacune avec 10 PP. Un Daemon de dresseur pouvait donc se régénérer dix fois, soit cinq barres de vie. Or chaque
// attaque du joueur lui COÛTE de l'énergie, et un combat de DRESSEUR ne se fuit pas : le joueur tombait à sec avant
// l'adversaire, sans attaque possible ni sortie. Blocage total — et l'instantané de combat le remettait dedans à
// chaque rechargement pendant 24 h.
//
// LA RÈGLE (décidée par Sartay) : un Daemon de dresseur ne régénère ses PV que 3 fois par combat. Au-delà, le soin
// échoue (et Repos n'endort donc plus pour rien). Trois soins = 150 % de sa barre rendue : largement de quoi faire
// un boss coriace, mais plus de puits sans fond.
//
// PORTÉE : le camp ENNEMI, en PvE uniquement. Le joueur garde ses soins intacts (on ne touche pas à ses stratégies),
// et le PvP est exclu parce que les DEUX clients y simulent le même combat : plafonner un seul camp ferait diverger
// leurs calculs. Cf. battle/engine (application) et battle/ai (l'IA cesse de choisir un soin épuisé).

/** Nombre maximal de régénérations par Daemon de dresseur et par combat. */
export const ENEMY_MAX_HEALS = 3

/** Ce camp est-il soumis au plafond ? (le dresseur piloté par l'IA, hors PvP) */
export function healCapApplies(side: "player" | "enemy", pvp: boolean): boolean {
    return side === "enemy" && !pvp
}

/** Ce Daemon peut-il encore se régénérer ? `capped` vient de healCapApplies. */
export function healAllowed(healsUsed: number | undefined, capped: boolean): boolean {
    if (!capped) return true
    return Math.max(0, Math.floor(healsUsed ?? 0)) < ENEMY_MAX_HEALS
}
