// src/lib/gamebook/yellow/frontier/dome.ts
//
// ZONE DE COMBAT — DÔME : tournoi à ÉLIMINATION (bracket de 8), PUR & déterministe.
// Le joueur fait 3 matchs (quart → demi → finale). Les autres matchs (IA vs IA) sont
// résolus par heuristique seedée (puissance d'équipe + avantage de type + aléa pour upsets).
// Aucune dépendance save/UI : un état + le résultat du match du joueur → nouvel état.

import { Rng } from "../battle/rng"
import { typeMultiplier } from "../battle/typeChart"
import { SPECIES } from "../data/species"
import { bstOf, generateFrontierTeam, type OpponentSpec } from "./engine"
import { DOME_TRAINERS } from "./domeTrainers"

export const DOME_SIZE = 8
export const DOME_ROUNDS = 3 // 8 → 4 → 2 → 1
export const DOME_TEAM_SIZE = 6 // Daemons par équipe dans le Dôme (6v6 — cf. design du Dôme)

const HOLO_NAMES = ["Spectre A", "Spectre B", "Spectre C", "Spectre D", "Spectre E", "Spectre F", "Spectre G"]

export interface DomeEntrant {
    id: number; name: string; team: OpponentSpec[]; isPlayer: boolean
    /** Identité du dresseur (pool des 30) pour l'UI (épithète, taunt) ; absent = joueur / fallback. */
    trainerId?: string; epithet?: string; taunt?: string
}
export interface DomeState {
    level: number
    round: number            // 0 = quart, 1 = demi, 2 = finale
    entrants: DomeEntrant[]   // les 8 participants (index = id)
    alive: number[]           // ids encore en lice, en ORDRE de bracket (paires consécutives)
    playerId: number
    status: "active" | "won" | "eliminated"
}

function shuffle<T>(rng: Rng, arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) { const j = rng.int(0, i);[a[i], a[j]] = [a[j], a[i]] }
    return a
}

export interface CreateDomeOpts { level: number; streak: number; playerTeam: OpponentSpec[]; size?: number }

/** Crée un bracket : le joueur (id 0) + (size-1) IA générées, placés en ordre de bracket aléatoire (seedé). */
export function createDome(rng: Rng, opts: CreateDomeOpts): DomeState {
    const size = opts.size ?? DOME_SIZE
    const entrants: DomeEntrant[] = [{ id: 0, name: "Toi", team: opts.playerTeam, isPlayer: true }]
    // 7 dresseurs DISTINCTS tirés du pool des 30 (Phase 2 : filtre par tier + équipes générées selon leur persona).
    const roster = shuffle(rng, DOME_TRAINERS).slice(0, size - 1)
    for (let i = 1; i < size; i++) {
        const t = roster[i - 1]
        entrants.push({
            id: i, isPlayer: false,
            name: t?.name ?? HOLO_NAMES[(i - 1) % HOLO_NAMES.length],
            trainerId: t?.id, epithet: t?.epithet, taunt: t?.taunt,
            team: generateFrontierTeam(rng, { streak: opts.streak, level: opts.level, size: DOME_TEAM_SIZE }),
        })
    }
    const alive = shuffle(rng, entrants.map((e) => e.id)) // placement de bracket seedé
    return { level: opts.level, round: 0, entrants, alive, playerId: 0, status: "active" }
}

function teamPower(e: DomeEntrant): number {
    return e.team.reduce((s, m) => s + bstOf(m.speciesId), 0)
}
function typesOf(id: string): string[] { return (SPECIES[id] as any)?.types ?? [] }
/** Avantage offensif moyen de `att` contre `def` (meilleur multiplicateur d'un STAB par mon). */
function edge(att: DomeEntrant, def: DomeEntrant): number {
    let tot = 0, n = 0
    for (const m of att.team) for (const at of typesOf(m.speciesId)) {
        let best = 0
        for (const dm of def.team) { let mult = 1; for (const dt of typesOf(dm.speciesId)) mult *= typeMultiplier(at as any, dt as any); best = Math.max(best, mult) }
        tot += best; n++
    }
    return n ? tot / n : 1
}
/** Résout un match IA vs IA (déterministe) : vrai si A gagne. Puissance + avantage de type + aléa (upsets). */
export function aiMatchAWins(rng: Rng, a: DomeEntrant, b: DomeEntrant): boolean {
    const sa = teamPower(a) + 40 * edge(a, b) + rng.int(0, 50)
    const sb = teamPower(b) + 40 * edge(b, a) + rng.int(0, 50)
    return sa >= sb
}

/** L'adversaire du joueur pour le round courant (sa paire dans le bracket). */
export function playerOpponent(s: DomeState): DomeEntrant | null {
    const idx = s.alive.indexOf(s.playerId)
    if (idx < 0) return null
    const partnerId = idx % 2 === 0 ? s.alive[idx + 1] : s.alive[idx - 1]
    return partnerId == null ? null : s.entrants[partnerId]
}

/** Avance le bracket d'un round : on connaît le résultat du match du JOUEUR ; les autres sont résolus par IA. */
export function advanceDome(s: DomeState, rng: Rng, playerWon: boolean): DomeState {
    if (s.status !== "active") return s
    const winners: number[] = []
    for (let i = 0; i < s.alive.length; i += 2) {
        const aId = s.alive[i], bId = s.alive[i + 1]
        if (bId == null) { winners.push(aId); continue } // bye (taille impaire)
        let winId: number
        if (aId === s.playerId || bId === s.playerId) {
            const oppId = aId === s.playerId ? bId : aId
            winId = playerWon ? s.playerId : oppId
        } else {
            winId = aiMatchAWins(rng, s.entrants[aId], s.entrants[bId]) ? aId : bId
        }
        winners.push(winId)
    }
    const playerAlive = winners.includes(s.playerId)
    const status: DomeState["status"] = !playerAlive ? "eliminated" : winners.length === 1 ? "won" : "active"
    return { ...s, alive: winners, round: s.round + 1, status }
}

/** Choix du leader IA face à l'équipe visible du joueur (pick : meilleure menace de type). */
export function aiLeadIndex(aiTeam: OpponentSpec[], playerTeam: OpponentSpec[]): number {
    let bestIdx = 0, bestScore = -Infinity
    for (let i = 0; i < aiTeam.length; i++) {
        let score = 0
        for (const at of typesOf(aiTeam[i].speciesId)) for (const pm of playerTeam) {
            let mult = 1; for (const dt of typesOf(pm.speciesId)) mult *= typeMultiplier(at as any, dt as any); score += mult
        }
        if (score > bestScore) { bestScore = score; bestIdx = i }
    }
    return bestIdx
}
