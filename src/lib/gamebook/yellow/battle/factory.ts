// src/lib/gamebook/yellow/battle/factory.ts
//
// Nexus Jaune Éclair — fabrique d'instances de monstres (équipe joueur, sauvages,
// dresseurs). React-free. Choisit automatiquement les 4 dernières attaques apprises
// au niveau donné, calcule les PV pleins, et génère un uid unique.

import type { MonInstance, StatKey } from "./types"
import { getSpecies } from "../data/species"
import { getMove } from "../data/moves"
import { fullStats } from "./stats"

let seq = 0

export interface MakeMonOpts {
    /** Valeur d'IV uniforme (0..31). Défaut 15. */
    ivs?: number
    owned?: boolean
    nickname?: string
    moveIds?: string[]
}

export function createMonInstance(speciesId: string, level: number, opts: MakeMonOpts = {}): MonInstance {
    const sp = getSpecies(speciesId)
    if (!sp) throw new Error(`Espèce inconnue: ${speciesId}`)

    const ivVal = clampIv(opts.ivs ?? 15)
    const ivs: Record<StatKey, number> = { hp: ivVal, atk: ivVal, def: ivVal, spa: ivVal, spd: ivVal, spe: ivVal }

    // 4 dernières attaques apprises (level <= niveau), sinon la 1ère du learnset.
    const learned = opts.moveIds ?? sp.learnset.filter((l) => l.level <= level).map((l) => l.moveId)
    let moveIds = learned.slice(-4)
    if (moveIds.length === 0 && sp.learnset.length > 0) moveIds = [sp.learnset[0].moveId]

    const moves = moveIds.map((id) => {
        const m = getMove(id)
        const ppMax = m?.pp ?? 5
        return { moveId: id, pp: ppMax, ppMax }
    })

    const inst: MonInstance = {
        uid: `${speciesId}-${level}-${++seq}`,
        speciesId,
        level,
        exp: 0,
        ivs,
        currentHp: 0,
        status: "NONE",
        statusCounter: 0,
        moves,
        owned: opts.owned,
        nickname: opts.nickname,
    }
    inst.currentHp = fullStats(inst, sp).hp
    return inst
}

function clampIv(v: number): number {
    return Math.max(0, Math.min(31, Math.floor(v)))
}
