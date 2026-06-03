// src/lib/gamebook/yellow/battle/ai.ts
//
// Nexus Jaune Éclair — IA de combat (React-free, pure, sans dépendre du moteur).
// 3 niveaux : "wild" (erratique), "trainer" (cherche le meilleur coup),
// "ace" (anticipe : KO probable, efficacité de type, change si mauvais matchup).

import type { BattleMon } from "./types"
import { getMove } from "../data/moves"
import { getSpecies } from "../data/species"
import { typeEffectiveness } from "./typeChart"
import type { Rng } from "./rng"

export type AiLevel = "wild" | "trainer" | "ace"

export interface AiChoice {
    kind: "move" | "switch"
    moveIndex?: number
    teamIndex?: number
}

interface ScoredMove { index: number; score: number; eff: number; power: number }

function scoreMoves(self: BattleMon, foe: BattleMon): ScoredMove[] {
    const foeTypes = getSpecies(foe.speciesId)?.types ?? []
    const out: ScoredMove[] = []
    self.moves.forEach((slot, index) => {
        const mv = getMove(slot.moveId)
        if (!mv || slot.pp <= 0) return
        const isStatus = mv.power <= 0
        const eff = isStatus ? 1 : typeEffectiveness(mv.type, foeTypes)
        const power = mv.power || 0
        // Score : puissance pondérée par l'efficacité ; les coups de statut ont un
        // score plancher (utile mais pas prioritaire face à un KO).
        const score = isStatus ? 25 : power * eff
        out.push({ index, score, eff, power })
    })
    return out
}

/** Meilleur matchup défensif disponible sur le banc (pour décider d'un switch). */
function bestSwitchIndex(team: BattleMon[], activeIndex: number, foe: BattleMon): number | null {
    const foeTypes = getSpecies(foe.speciesId)?.types ?? []
    let bestI = -1
    let bestResist = Infinity
    team.forEach((m, i) => {
        if (i === activeIndex || m.currentHp <= 0) return
        const myTypes = getSpecies(m.speciesId)?.types ?? []
        // "resist" = à quel point les types adverses sont peu efficaces contre moi (plus bas = mieux).
        const incoming = foeTypes.reduce((acc, t) => acc * typeEffectiveness(t, myTypes), 1)
        if (incoming < bestResist) { bestResist = incoming; bestI = i }
    })
    return bestI >= 0 ? bestI : null
}

export function chooseAiAction(
    self: BattleMon,
    foe: BattleMon,
    team: BattleMon[],
    activeIndex: number,
    level: AiLevel,
    rng: Rng,
): AiChoice {
    const scored = scoreMoves(self, foe)
    if (scored.length === 0) return { kind: "move", moveIndex: 0 } // Lutte (placeholder)

    // --- "ace" : envisage un switch si le matchup actuel est mauvais ---
    if (level === "ace") {
        const myTypes = getSpecies(self.speciesId)?.types ?? []
        const foeTypes = getSpecies(foe.speciesId)?.types ?? []
        const incomingOnMe = foeTypes.reduce((acc, t) => acc * typeEffectiveness(t, myTypes), 1)
        const myBestEff = Math.max(...scored.map((s) => s.eff))
        if (incomingOnMe >= 2 && myBestEff < 2) {
            const sw = bestSwitchIndex(team, activeIndex, foe)
            if (sw !== null && rng.chance(60)) return { kind: "switch", teamIndex: sw }
        }
    }

    // --- "wild" : choix erratique (souvent sous-optimal) ---
    if (level === "wild") {
        if (rng.chance(35)) {
            const r = scored[rng.int(0, scored.length - 1)]
            return { kind: "move", moveIndex: r.index }
        }
    }

    // --- "trainer"/"ace"/"wild" (cas par défaut) : meilleur score, petit bruit ---
    let best = scored[0]
    let bestScore = -1
    for (const s of scored) {
        const noise = 0.85 + rng.next() * 0.3
        const sc = s.score * noise
        if (sc > bestScore) { bestScore = sc; best = s }
    }
    return { kind: "move", moveIndex: best.index }
}
