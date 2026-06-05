// src/lib/gamebook/yellow/data/evConfig.ts
//
// Nexus Jaune Éclair — EXPÉRIENCE DE COMBAT (EV). Couche "vétéran" : un Daemon
// gagne de l'EV en combattant → il dépasse peu à peu sa base (façon Gen 3, BORNÉE).
// INDÉPENDANT du Saiyan : l'EV est purement le volume de combat en jeu (pas le
// fitness réel), additif et plafonné → pas de power creep, l'arène reste calibrée.
//
// Contribution à une stat = ⌊EV/4⌋ dans le terme Gen-1 : (2×Base + IV + ⌊EV/4⌋)×niv/100.
// Pur (aucune date / aucun serveur) → vit dans le moteur déterministe.

import type { MonInstance, StatKey, SpeciesData } from "../battle/types"

/** EV gagné par victoire, versé dans la stat-signature de l'adversaire vaincu. */
export const EV_YIELD_PER_WIN = 3
/** Plafond d'EV par stat (252 → +63 à la stat au niveau 100, comme la Gen 3). */
export const EV_STAT_CAP = 252
/** Budget total d'EV réparti sur les 5 stats (510 → on spécialise ~2 stats). */
export const EV_TOTAL_CAP = 510

const STAT_KEYS: StatKey[] = ["hp", "atk", "def", "spe", "spc"]

/** Contribution d'une réserve d'EV au calcul de stat (terme interne Gen-1). */
export function evStatBonus(ev: number): number {
    return Math.floor(Math.max(0, ev) / 4)
}

/** Total d'EV accumulé (0..510). */
export function evTotal(ev?: Partial<Record<StatKey, number>>): number {
    if (!ev) return 0
    return STAT_KEYS.reduce((a, k) => a + (ev[k] ?? 0), 0)
}

/** Stat-signature d'une espèce = sa plus haute base (ordre déterministe en cas d'égalité). */
export function signatureStat(sp: SpeciesData): StatKey {
    let best: StatKey = "hp"
    for (const k of STAT_KEYS) if (sp.baseStats[k] > sp.baseStats[best]) best = k
    return best
}

/**
 * Verse de l'EV dans une stat (MUTE l'instance), en respectant le cap par stat
 * ET le budget total. Renvoie le montant réellement ajouté (0 si plafonds atteints).
 */
export function gainEv(mon: MonInstance, stat: StatKey, amount: number): number {
    const ev = mon.ev ?? {}
    const cur = ev[stat] ?? 0
    const total = evTotal(ev)
    const room = Math.min(EV_STAT_CAP - cur, EV_TOTAL_CAP - total, Math.max(0, Math.floor(amount)))
    if (room <= 0) return 0
    mon.ev = { ...ev, [stat]: cur + room }
    return room
}

/** Les stats où le Daemon a le plus d'EV (pour l'affichage), triées desc. */
export function topEvStats(ev?: Partial<Record<StatKey, number>>): StatKey[] {
    if (!ev) return []
    return STAT_KEYS.filter((k) => (ev[k] ?? 0) > 0).sort((a, b) => (ev[b] ?? 0) - (ev[a] ?? 0))
}
