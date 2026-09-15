// src/lib/gamebook/yellow/data/ephemeralShiny.ts
//
// VŒU DU GÉNIE — « UN TAUX DE RENCONTRE BEAUCOUP PLUS ÉLEVÉ AVEC DES SHINY » (Task1).
//
// La contrepartie posée par Sartay : des shiny, oui — mais ÉPHÉMÈRES. Six charges, une par jour au plus. Chaque
// jour de jeu, un N est tiré entre 1 et 30 : le N-ième pop sauvage de la journée est shiny, et il le RESTE
// jusqu'à avoir encaissé N K.O. Plus le shiny arrive tard dans la journée, plus il tient — et s'il s'arrête de
// popper avant le N-ième, il ne saura jamais qu'un shiny l'attendait au 27ᵉ. C'est ce qui donne envie de continuer.
//
// Quand le compteur tombe à zéro, le Daemon redevient ORDINAIRE — couleurs, +10 % de stats, ET IV re-tirés au
// hasard (décision Sartay : retour complet, pas de consolation). Il a des Tiramisus pour ça.
//
// MODULE PUR : aucune date implicite, aucun hasard implicite — `today` et `rng` sont injectés. Testable au tick près.

import type { MonInstance, StatKey } from "../battle/types"

/** Le N est tiré dans [1, SHINY_WISH_MAX_POP]. */
export const SHINY_WISH_MAX_POP = 30
export const SHINY_WISH_DEFAULT_CHARGES = 6

/** L'état du vœu, tel qu'il vit dans la save. `target` : 0 = aucun shiny à venir aujourd'hui (déjà sorti, ou
 *  pas de tirage) ; > 0 = le pop de la journée qui sera shiny. */
export interface ShinyWishState {
    charges: number
    day: string
    target: number
    pops: number
}

export function freshShinyWish(charges = SHINY_WISH_DEFAULT_CHARGES): ShinyWishState {
    return { charges: Math.max(0, Math.floor(charges)), day: "", target: 0, pops: 0 }
}

/** Le vœu a-t-il encore quelque chose à donner ? */
export function shinyWishActive(st: ShinyWishState | null | undefined): st is ShinyWishState {
    return !!st && st.charges > 0
}

/** UN POP SAUVAGE. Renvoie l'état mis à jour et, si CE pop doit être shiny, sa durabilité en K.O.
 *
 *  Règles :
 *   • nouveau jour → on tire N ∈ [1,30] et on repart de 0 pop. Un jour manqué n'est PAS perdu : la charge n'est
 *     consommée que quand le shiny SORT (décision Sartay : 6 charges, max une par jour) ;
 *   • max un shiny par jour : après la sortie, target passe à 0 et plus rien ne se passe jusqu'à demain ;
 *   • sans charge, on ne touche à rien. */
export function onWildPop(st: ShinyWishState, today: string, rng: () => number): { state: ShinyWishState; shinyKo?: number } {
    if (st.charges <= 0) return { state: st }
    let s = st
    if (s.day !== today) s = { ...s, day: today, target: 1 + Math.floor(rng() * SHINY_WISH_MAX_POP), pops: 0 }
    if (s.target <= 0) return { state: s } // le shiny du jour est déjà sorti
    const pops = s.pops + 1
    if (pops < s.target) return { state: { ...s, pops } }
    // C'est LUI. Sa durabilité = son rang dans la journée.
    return { state: { ...s, pops, target: 0, charges: s.charges - 1 }, shinyKo: s.target }
}

/** Rend un exemplaire SHINY ÉPHÉMÈRE : couleurs + IV parfaits (comme un shiny naturel) + compteur de K.O. */
export function makeEphemeralShiny(mon: MonInstance, koLeft: number): MonInstance {
    const perfect: Record<StatKey, number> = { hp: 15, atk: 15, def: 15, spe: 15, spc: 15 }
    return { ...mon, shiny: true, ivs: perfect, shinyKoLeft: Math.max(1, Math.floor(koLeft)) }
}

/** Le Daemon est-il un shiny en sursis ? */
export function isEphemeralShiny(mon: Pick<MonInstance, "shinyKoLeft">): boolean {
    return (mon.shinyKoLeft ?? 0) > 0
}

/** IL VIENT D'ENCAISSER UN K.O. Décrémente ; à zéro, l'éclat s'éteint : plus de couleurs, plus de +10 %, et
 *  ses IV sont RE-TIRÉS au hasard (0-15 chacun) — retour complet à l'ordinaire. */
export function takeShinyKo(mon: MonInstance, rng: () => number): { mon: MonInstance; faded: boolean; left: number } {
    const left = Math.max(0, (mon.shinyKoLeft ?? 0) - 1)
    if (left > 0) return { mon: { ...mon, shinyKoLeft: left }, faded: false, left }
    const roll = () => Math.floor(rng() * 16)
    const ivs: Record<StatKey, number> = { hp: roll(), atk: roll(), def: roll(), spe: roll(), spc: roll() }
    const { shinyKoLeft: _drop, ...rest } = mon
    void _drop
    return { mon: { ...rest, shiny: undefined, ivs }, faded: true, left: 0 }
}

/** Les messages du génie, pour l'écran d'après-combat. */
export function shinyKoMessage(name: string, left: number, faded: boolean): string {
    if (faded) return `✨ L'éclat de ${name} s'est éteint. Il redevient ordinaire — entièrement. Le génie ne rend pas la monnaie.`
    return `✨ ${name} a encaissé un K.O. Son éclat tient encore ${left} fois.`
}

/** Le génie annonce le shiny du jour. */
export function shinyPopMessage(koLeft: number, chargesLeft: number): string {
    return `✨ Le génie a soufflé sur ce ${koLeft === 1 ? "premier" : `${koLeft}ᵉ`} pop : il brille — et tiendra ${koLeft} K.O. (${chargesLeft} jour${chargesLeft > 1 ? "s" : ""} de chance restant${chargesLeft > 1 ? "s" : ""}.)`
}
