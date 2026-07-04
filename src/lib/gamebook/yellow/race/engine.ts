// src/lib/gamebook/yellow/race/engine.ts
//
// Nexus — Pokémon Kart : MOTEUR DE COURSE (solo vs 5 IA). PUR & déterministe (RNG seedé).
// Gère la grille de départ, le décompte, le pas de simulation (physique + IA), les tours, le chrono
// et le classement. Rendu/contrôles = Phase 2 (au-dessus).

import { Rng } from "../battle/rng"
import { deriveKartStats, newKart, stepKart, type KartInput, type KartState, type KartStats } from "./kart"
import { isOffTrack, segmentHeading, type Track } from "./track"

export interface Racer {
    id: string
    name: string
    isPlayer: boolean
    stats: KartStats
    kart: KartState
    nextWp: number     // prochain waypoint visé (démarre à 1 : la ligne = waypoint 0)
    lap: number        // tours COMPLÉTÉS
    finished: boolean
    finishTime: number // s (temps total à l'arrivée)
    skill: number      // 0..1 : légère variance de niveau des IA
}

export type RaceStatus = "countdown" | "racing" | "finished"
export interface RaceState {
    track: Track
    racers: Racer[]
    time: number
    countdown: number
    status: RaceStatus
}

const COUNTDOWN = 3
const REACH_FRAC = 0.9

export interface Entrant {
    id: string
    name: string
    base: { hp: number; atk: number; def: number; spe: number; spc: number }
    isPlayer?: boolean
}

export function createRace(track: Track, entrants: Entrant[], rng: Rng): RaceState {
    const startH = segmentHeading(track, 0)
    const w0 = track.waypoints[0]
    const perp = startH + Math.PI / 2
    const racers: Racer[] = entrants.map((e, i) => {
        const row = Math.floor(i / 2), col = i % 2
        const lateral = (col === 0 ? -0.4 : 0.4) * track.width
        const back = (row + 1) * 55
        const x = w0.x - Math.cos(startH) * back + Math.cos(perp) * lateral
        const y = w0.y - Math.sin(startH) * back + Math.sin(perp) * lateral
        return {
            id: e.id, name: e.name, isPlayer: !!e.isPlayer, stats: deriveKartStats(e.base),
            kart: newKart(x, y, startH), nextWp: 1, lap: 0, finished: false, finishTime: 0,
            skill: e.isPlayer ? 1 : 0.82 + rng.next() * 0.16,
        }
    })
    return { track, racers, time: 0, countdown: COUNTDOWN, status: "countdown" }
}

function angleDiff(a: number, b: number): number {
    let d = a - b
    while (d > Math.PI) d -= Math.PI * 2
    while (d < -Math.PI) d += Math.PI * 2
    return d
}

/** Entrée IA : vise le prochain waypoint, freine avant un virage serré, nitro sur les lignes droites. */
function aiInput(race: RaceState, r: Racer): KartInput {
    const wps = race.track.waypoints
    const target = wps[r.nextWp]
    const toTarget = Math.atan2(target.y - r.kart.y, target.x - r.kart.x)
    const err = angleDiff(toTarget, r.kart.heading)
    const steer = Math.max(-1, Math.min(1, err * 2.2))
    const nA = wps[r.nextWp], nB = wps[(r.nextWp + 1) % wps.length]
    const seg = Math.atan2(nB.y - nA.y, nB.x - nA.x)
    const turnAhead = Math.abs(angleDiff(seg, toTarget))
    const sharp = turnAhead > 0.7 || Math.abs(err) > 0.9
    return {
        throttle: true,
        brake: sharp && r.kart.speed > 130 * r.skill,
        steer,
        nitro: !sharp && r.kart.nitroGauge > 0.5 && r.skill > 0.85,
    }
}

/** Un pas de course (dt s). `playerInput` = entrée du pilote humain (ignorée pour les IA). */
export function stepRace(race: RaceState, playerInput: KartInput, dt: number): void {
    if (race.status === "countdown") {
        race.countdown -= dt
        if (race.countdown <= 0) { race.countdown = 0; race.status = "racing" }
        return
    }
    if (race.status !== "racing") return
    race.time += dt

    for (const r of race.racers) {
        if (r.finished) continue
        const input = r.isPlayer ? playerInput : aiInput(race, r)
        stepKart(r.kart, r.stats, input, dt, isOffTrack(race.track, r.kart.x, r.kart.y))

        const wps = race.track.waypoints
        const tgt = wps[r.nextWp]
        const reach = race.track.width * REACH_FRAC + r.kart.speed * dt
        if (Math.hypot(tgt.x - r.kart.x, tgt.y - r.kart.y) < reach) {
            if (r.nextWp === 0) { // franchit la LIGNE D'ARRIVÉE (waypoint 0)
                r.lap += 1
                if (r.lap >= race.track.laps) { r.finished = true; r.finishTime = race.time }
            }
            r.nextWp = (r.nextWp + 1) % wps.length
        }
    }
    if (race.racers.every((r) => r.finished)) race.status = "finished"
}

/** Progression cumulée pour le classement (arrivés d'abord — par temps ; sinon par avancement). */
export function progressOf(race: RaceState, r: Racer): number {
    return r.lap * race.track.waypoints.length + r.nextWp
}
export function ranking(race: RaceState): Racer[] {
    return [...race.racers].sort((a, b) => {
        if (a.finished && b.finished) return a.finishTime - b.finishTime
        if (a.finished !== b.finished) return a.finished ? -1 : 1
        return progressOf(race, b) - progressOf(race, a)
    })
}
