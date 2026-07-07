// src/lib/gamebook/yellow/battle/berries.ts
//
// Décisions de déclenchement des BAIES réactives (objets tenus consommables). Fonctions PURES & DÉTERMINISTES
// (aucun RNG) → identiques en PvE et PvP. Le moteur (engine.ts) applique l'effet + consomme la baie.

import type { HeldItemData } from "../data/heldItems"

export const BERRY_HEAL_HP = 1 / 3   // baie de soin : se déclenche sous ⅓ des PV max
export const BERRY_STAT_HP = 1 / 4   // baies fougue/éclat/vive/roc : sous ¼ des PV max

export type PinchBerry =
    | { kind: "heal"; frac: number }
    | { kind: "stat"; stat: "atk" | "def" | "spe" | "spc" }

/** Baie « pinch » (soin OU boost de stat) à déclencher pour ce porteur à cette fraction de PV (currentHp/max),
 *  ou null. Le porteur K.O. (hpFrac ≤ 0) ne déclenche rien (géré par la Baie Phénix côté KO). */
export function pinchBerry(it: HeldItemData | undefined, hpFrac: number): PinchBerry | null {
    if (!it || hpFrac <= 0) return null
    if (it.berryHealFrac && hpFrac < BERRY_HEAL_HP) return { kind: "heal", frac: it.berryHealFrac }
    if (it.berryBoostStat && hpFrac < BERRY_STAT_HP) return { kind: "stat", stat: it.berryBoostStat }
    return null
}
