// src/lib/gamebook/yellow/store/saveManager.ts
//
// Nexus Jaune Éclair — pont entre les stores (joueur + Pokédex) et l'API de save.
// Charge au démarrage, puis auto-sauvegarde (débouncé) à chaque changement.

import { getPlayer, hydratePlayer, subscribePlayer, setWildCtx, creditDailyReps, bankReps, claimWelcomeGift, claimSpagGift, applySaiyanResults, resetForIntro } from "./playerStore"
import { getPokedex, hydratePokedex, subscribePokedex } from "./pokedexStore"
import { parseSave, type YellowSave, SAVE_VERSION } from "../storage/save"
import type { BadgeId } from "../data/cts"
import { saiyanPointsForLevels, type SaiyanWindow } from "../data/saiyanConfig"

let loaded = false
let autosaveInit = false
let timer: ReturnType<typeof setTimeout> | null = null

/** Charge la sauvegarde serveur → hydrate les stores. À appeler au mount. */
export async function loadYellowSave(): Promise<void> {
    if (loaded) return // idempotent : déjà chargé (ex. on arrive sur la page Pokédex en nav interne) → on garde l'état mémoire À JOUR au lieu de réécraser avec la DB (qui peut être en retard du débounce).
    try {
        const r = await fetch("/api/gamebook/yellow/save")
        if (!r.ok) { loaded = true; return }
        const j = await r.json()
        const save = parseSave(j?.save)
        hydratePlayer({ team: save.team, pc: save.pc, items: save.items, reps: save.reps, repsCap: save.repsCap, creditedThrough: save.creditedThrough, pastaBoughtToday: save.pastaBoughtToday, pastaDayBonus: save.pastaDayBonus, defeatedTrainers: save.defeatedTrainers, rematchedTrainers: save.rematchedTrainers, badges: save.badges as BadgeId[], introSeen: save.introSeen, sbireDefeatsToday: save.sbireDefeatsToday, sbireWinsTotal: save.sbireWinsTotal, pvpStats: save.pvpStats, acePeakLevel: save.acePeakLevel, aceBox: save.aceBox, aceTeamSizePeak: save.aceTeamSizePeak, aceWins: save.aceWins, aceDefeatedDate: save.aceDefeatedDate, ownedCts: save.ownedCts, gekrocResolved: save.gekrocResolved, hhSpectresShown: save.hhSpectresShown, hhCollectorWins: save.hhCollectorWins, repsBankedTotal: save.repsBankedTotal, welcomeGift: save.welcomeGift, spagGift: save.spagGift, pastaGodGift: save.pastaGodGift })
        hydratePokedex({ seen: save.pokedex.seen, caught: save.pokedex.caught })
        claimWelcomeGift() // cadeau de bienvenue : +100 énergie, une seule fois (à l'arrivée)
        claimSpagGift()    // cadeau du DIEU SPAG : +150 énergie, une seule fois (message toasté côté UI)
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
            if (typeof j?.today === "string") creditDailyReps(j.today) // tick quotidien (resets)
            // Reps INSTANTANÉES : banque le delta (aujourd'hui en direct + jours non joués).
            if (typeof j?.repsTotalToDate === "number" && typeof j?.repsThroughYesterday === "number") {
                bankReps(j.repsTotalToDate, j.repsThroughYesterday)
            }
        }
    } catch { /* neutre si indisponible */ }
    // Convertit d'éventuels niveaux Saiyan en attente (gagnés hors-ligne au combat précédent).
    await processSaiyanPoints()
    // Persiste l'état chargé — surtout les cadeaux one-shot crédités ci-dessus (welcomeGift/spagGift)
    // → le flag est sauvé même si le joueur ne fait rien d'autre ensuite (anti double-don).
    persistYellowSave()
}

function snapshot(): YellowSave {
    const p = getPlayer()
    const d = getPokedex()
    return { version: SAVE_VERSION, team: p.team, pc: p.pc, items: p.items, reps: p.reps, repsCap: p.repsCap, creditedThrough: p.creditedThrough, pastaBoughtToday: p.pastaBoughtToday, pastaDayBonus: p.pastaDayBonus, pokedex: { seen: d.seen, caught: d.caught }, defeatedTrainers: p.defeatedTrainers, rematchedTrainers: p.rematchedTrainers, badges: p.badges, introSeen: p.introSeen, sbireDefeatsToday: p.sbireDefeatsToday, sbireWinsTotal: p.sbireWinsTotal, pvpStats: p.pvpStats, acePeakLevel: p.acePeakLevel, aceBox: p.aceBox, aceTeamSizePeak: p.aceTeamSizePeak, aceWins: p.aceWins, aceDefeatedDate: p.aceDefeatedDate, ownedCts: p.ownedCts, gekrocResolved: p.gekrocResolved, hhSpectresShown: p.hhSpectresShown, hhCollectorWins: p.hhCollectorWins, repsBankedTotal: p.repsBankedTotal, welcomeGift: p.welcomeGift, spagGift: p.spagGift, pastaGodGift: p.pastaGodGift }
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

/**
 * SAIYAN — convertit les niveaux gagnés (pendingSaiyanLevels) en points de stats
 * selon la règle PushQuest (amende → 0 / quota dépassé chaque jour → 2 / sinon 1),
 * évaluée sur la fenêtre [dernier level-up → hier] de chaque Daemon.
 * Best-effort : si le serveur est injoignable, on laisse le compteur (réessai plus tard).
 */
export async function processSaiyanPoints(): Promise<void> {
    const p = getPlayer()
    const pending = [...p.team, ...p.pc].filter((m) => (m.pendingSaiyanLevels ?? 0) > 0)
    if (pending.length === 0) return
    const since = [...new Set(pending.map((m) => m.lastLevelUpAt).filter((d): d is string => !!d))]

    let windows: Record<string, SaiyanWindow> = {}
    let today = ""
    try {
        const r = await fetch("/api/gamebook/yellow/saiyan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ since }),
        })
        if (r.ok) { const j = await r.json(); windows = j.windows ?? {}; today = j.today ?? "" }
    } catch { /* hors-ligne : on réessaiera */ }
    if (!today) return // pas de date fiable → on garde les compteurs pour plus tard

    const results = pending.map((m) => {
        const w: SaiyanWindow = (m.lastLevelUpAt && windows[m.lastLevelUpAt]) || { hadFine: false, quotaEveryDay: false }
        return { uid: m.uid, points: saiyanPointsForLevels(m.pendingSaiyanLevels ?? 0, w) }
    })
    applySaiyanResults(results, today)
    persistYellowSave()
}

/**
 * REMISE À ZÉRO COMPLÈTE du Chapitre 2 pour CE joueur uniquement :
 * vide l'équipe/PC/objets/reps/badges (resetForIntro) ET le Pokédex, puis écrase
 * la sauvegarde serveur. N'affecte que la ligne GamebookProgress "yellow" du joueur.
 */
export async function resetYellowChapter(): Promise<void> {
    // SÉCURITÉ : on copie d'abord la save courante dans `history` (best-effort) → un reset reste
    // annulable. Si le backup échoue (hors-ligne), on n'empêche PAS le reset volontaire.
    try { await fetch("/api/gamebook/yellow/save/backup", { method: "POST" }) } catch { /* best-effort */ }
    resetForIntro()
    hydratePokedex({ seen: [], caught: [] })
    persistYellowSave()
}

/** Branche l'auto-sauvegarde sur les deux stores (idempotent). */
export function initAutosave(): void {
    if (autosaveInit) return
    autosaveInit = true
    subscribePlayer(persistYellowSave)
    subscribePokedex(persistYellowSave)
}
