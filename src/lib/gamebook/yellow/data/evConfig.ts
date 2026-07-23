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
import { getSpecies } from "./species"

/** EV gagné par victoire, versé dans la stat-signature de l'adversaire vaincu. */
export const EV_YIELD_PER_WIN = 3
/** Plafond d'EV par stat (252 → +63 à la stat au niveau 100, comme la Gen 3). */
export const EV_STAT_CAP = 252
/** Budget total d'EV réparti sur les 5 stats (510 → on spécialise ~2 stats). Plafond de BASE. */
export const EV_TOTAL_CAP = 510
/** Bonus MAX de plafond dû au potentiel génétique (IV parfaits → +5 %). */
export const EV_CAP_GENETIC_MAX = 0.05

const STAT_KEYS: StatKey[] = ["hp", "atk", "def", "spe", "spc"]
const IV_SUM_MAX = 75 // 5 stats × 15

/**
 * Plafond total d'EV PROPRE À L'INDIVIDU (carotte de rejouabilité, NON rétroactive).
 * 510 par défaut. Si le Daemon a été capturé APRÈS la 1ʳᵉ Ligue (`evCapBoost`, estampillé à la
 * capture), le plafond monte selon DEUX leviers ADDITIFS :
 *   • potentiel génétique : +5 % × (ΣIV / 75) → IV parfaits = +5 % ;
 *   • niveau de capture bas : +5 % (niv 1-10) · +3 % (11-19) · +1 % (20-30) · 0 % (≥31).
 * Max = ⌊510 × 1.10⌋ = 561. Le cap PAR STAT (252) reste inchangé.
 */
export function evTotalCap(mon: MonInstance): number {
    // GROS LATE BLOOMER (créatures anciennes B2F) : règle d'EV intrinsèque et DURCIE, prioritaire sur le boost
    //   post-Ligue standard. Capturé TÔT (niv 5) → plafond +20 % (612) ; capturé TARD (niv 90) → −20 % (408).
    //   Interpolé linéairement sur la plage de pop 5→90 (0 % au milieu, ~niv 47).
    if (getSpecies(mon.speciesId)?.lateBloomerEv) {
        const cl = Math.max(5, Math.min(90, mon.capturedLevel ?? mon.level))
        const factor = 0.20 - 0.40 * (cl - 5) / 85 // +0.20 @niv5 → −0.20 @niv90
        return Math.floor(EV_TOTAL_CAP * (1 + factor))
    }
    if (!mon.evCapBoost) return EV_TOTAL_CAP
    const ivSum = STAT_KEYS.reduce((a, k) => a + Math.max(0, mon.ivs?.[k] ?? 0), 0)
    const genetic = EV_CAP_GENETIC_MAX * Math.min(1, ivSum / IV_SUM_MAX)
    const cl = mon.capturedLevel ?? mon.level
    const capture = cl <= 10 ? 0.05 : cl <= 19 ? 0.03 : cl <= 30 ? 0.01 : 0
    return Math.floor(EV_TOTAL_CAP * (1 + genetic + capture))
}

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
    const room = Math.min(EV_STAT_CAP - cur, evTotalCap(mon) - total, Math.max(0, Math.floor(amount)))
    if (room <= 0) return 0
    mon.ev = { ...ev, [stat]: cur + room }
    return room
}

/** Les stats où le Daemon a le plus d'EV (pour l'affichage), triées desc. */
export function topEvStats(ev?: Partial<Record<StatKey, number>>): StatKey[] {
    if (!ev) return []
    return STAT_KEYS.filter((k) => (ev[k] ?? 0) > 0).sort((a, b) => (ev[b] ?? 0) - (ev[a] ?? 0))
}
