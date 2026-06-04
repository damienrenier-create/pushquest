// src/lib/gamebook/yellow/store/saveManager.ts
//
// Nexus Jaune Éclair — pont entre les stores (joueur + Pokédex) et l'API de save.
// Charge au démarrage, puis auto-sauvegarde (débouncé) à chaque changement.

import { getPlayer, hydratePlayer, subscribePlayer, setWildCtx, creditDailyReps } from "./playerStore"
import { getPokedex, hydratePokedex, subscribePokedex } from "./pokedexStore"
import { parseSave, type YellowSave, SAVE_VERSION } from "../storage/save"

let loaded = false
let autosaveInit = false
let timer: ReturnType<typeof setTimeout> | null = null

/** Charge la sauvegarde serveur → hydrate les stores. À appeler au mount. */
export async function loadYellowSave(): Promise<void> {
    try {
        const r = await fetch("/api/gamebook/yellow/save")
        if (!r.ok) { loaded = true; return }
        const j = await r.json()
        const save = parseSave(j?.save)
        hydratePlayer({ team: save.team, pc: save.pc, items: save.items, reps: save.reps, repsCap: save.repsCap, creditedThrough: save.creditedThrough, pastaBoughtToday: save.pastaBoughtToday, pastaDayBonus: save.pastaDayBonus, defeatedTrainers: save.defeatedTrainers, introSeen: save.introSeen })
        hydratePokedex({ seen: save.pokedex.seen, caught: save.pokedex.caught })
    } catch {
        /* hors-ligne : on garde l'état mémoire */
    } finally {
        loaded = true
    }
    // Stats d'effort du jour + portefeuille reps (crédités) — best-effort, non bloquant.
    try {
        const r = await fetch("/api/gamebook/yellow/player-stats")
        if (r.ok) {
            const j = await r.json()
            if (j?.ctx) setWildCtx(j.ctx)
            if (typeof j?.yesterdayReps === "number" && typeof j?.today === "string") creditDailyReps(j.yesterdayReps, j.today)
        }
    } catch { /* neutre si indisponible */ }
}

function snapshot(): YellowSave {
    const p = getPlayer()
    const d = getPokedex()
    return { version: SAVE_VERSION, team: p.team, pc: p.pc, items: p.items, reps: p.reps, repsCap: p.repsCap, creditedThrough: p.creditedThrough, pastaBoughtToday: p.pastaBoughtToday, pastaDayBonus: p.pastaDayBonus, pokedex: { seen: d.seen, caught: d.caught }, defeatedTrainers: p.defeatedTrainers, introSeen: p.introSeen }
}

/** Sauvegarde débouncée (ne fait rien tant que la save initiale n'est pas chargée). */
export function persistYellowSave(): void {
    if (!loaded) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
        fetch("/api/gamebook/yellow/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ save: snapshot() }),
        }).catch(() => { /* silencieux */ })
    }, 800)
}

/** Branche l'auto-sauvegarde sur les deux stores (idempotent). */
export function initAutosave(): void {
    if (autosaveInit) return
    autosaveInit = true
    subscribePlayer(persistYellowSave)
    subscribePokedex(persistYellowSave)
}
