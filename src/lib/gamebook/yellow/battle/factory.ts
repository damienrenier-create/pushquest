// src/lib/gamebook/yellow/battle/factory.ts
//
// Nexus Jaune Éclair — fabrique d'instances de monstres (équipe joueur, sauvages,
// dresseurs). React-free. Choisit automatiquement les 4 dernières attaques apprises
// au niveau donné, calcule les PV pleins, et génère un uid unique.

import type { MonInstance, StatKey } from "./types"
import { getSpecies } from "../data/species"
import { getMove } from "../data/moves"
import { fullStats } from "./stats"
import { expForLevel } from "./xp"

let seq = 0

export interface MakeMonOpts {
    /** Valeur d'IV uniforme (0..15). Défaut 15. */
    ivs?: number
    /** IV par stat (prioritaire sur `ivs`) — utilisé pour les captures sauvages (effort → génétique). */
    ivsByStat?: Partial<Record<StatKey, number>>
    owned?: boolean
    nickname?: string
    moveIds?: string[]
    /** EV par stat (entraînement) — ex. Daemons de dresseur boostés. */
    ev?: Partial<Record<StatKey, number>>
    /** Points Saiyan alloués par stat (entraînement) — ex. Daemons de dresseur boostés. */
    allocated?: Partial<Record<StatKey, number>>
    /** CHROMATIQUE (shiny) : force des IV PARFAITS (15) + le flag shiny (= +10% stats via fullStats). */
    shiny?: boolean
}

export function createMonInstance(speciesId: string, level: number, opts: MakeMonOpts = {}): MonInstance {
    const sp = getSpecies(speciesId)
    if (!sp) throw new Error(`Espèce inconnue: ${speciesId}`)

    const ivVal = clampIv(opts.ivs ?? 15)
    const byStat = opts.ivsByStat
    const iv = (k: StatKey) => (byStat && typeof byStat[k] === "number" ? clampIv(byStat[k] as number) : ivVal)
    // SHINY → IV PARFAITS (15) sur toutes les stats, quels que soient ivs/ivsByStat.
    const ivs: Record<StatKey, number> = opts.shiny
        ? { hp: 15, atk: 15, def: 15, spe: 15, spc: 15 }
        : { hp: iv("hp"), atk: iv("atk"), def: iv("def"), spe: iv("spe"), spc: iv("spc") }

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
        // XP cumulée = plancher du niveau (et NON 0) → la fiche/barre d'XP correspondent
        // au niveau réel dès la création/capture (un niv.20 n'affiche plus « XP : 0 »).
        // Plancher calculé sur la courbe DE L'ESPÈCE (cf. growthCurve.ts).
        exp: expForLevel(level, speciesId),
        ivs,
        currentHp: 0,
        status: "NONE",
        statusCounter: 0,
        moves,
        owned: opts.owned,
        nickname: opts.nickname,
        ev: opts.ev && Object.keys(opts.ev).length ? opts.ev : undefined,
        allocated: opts.allocated && Object.keys(opts.allocated).length ? opts.allocated : undefined,
        shiny: opts.shiny || undefined,
    }
    inst.currentHp = fullStats(inst, sp).hp
    return inst
}

function clampIv(v: number): number {
    return Math.max(0, Math.min(15, Math.floor(v))) // Gen 1 : "DV" sur 4 bits (0..15)
}
