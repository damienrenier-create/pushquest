// src/lib/gamebook/yellow/store/saveManager.ts
//
// Nexus Jaune Éclair — pont entre les stores (joueur + Pokédex) et l'API de save.
// Charge au démarrage, puis auto-sauvegarde (débouncé) à chaque changement.

import { getPlayer, hydratePlayer, subscribePlayer, setWildCtx, creditDailyReps, bankReps, claimWelcomeGift, claimSpagGift, applySaiyanResults, resetForIntro, reregisterCustomDaemons, getActiveWorld, setActiveWorld, startNgPlusWorld, raiseRepsCap, grantReps } from "./playerStore"
import { getPokedex, hydratePokedex, subscribePokedex } from "./pokedexStore"
import { parseSave, emptySave, type YellowSave, type ChampionMon, SAVE_VERSION } from "../storage/save"
import type { StoredCustomDaemon } from "../create/customSpecies"
import type { MonInstance } from "../battle/types"
import type { BadgeId } from "../data/cts"
import { saiyanPointsForLevels, type SaiyanWindow } from "../data/saiyanConfig"

/** Énergie de départ d'un New Game+ (crédit + plafond). */
export const NGPLUS_START_ENERGY = 6000

let loaded = false
let autosaveInit = false
let timer: ReturnType<typeof setTimeout> | null = null

// NG+ (2 mondes navigables) — le monde ACTIF vit dans les stores (playerStore + pokedexStore). Le monde
// INACTIF est stashé ici, sérialisé (YellowSave), et fusionné dans snapshot() sans jamais écraser l'actif.
// `ngplusOldTeam` = ancienne équipe figée (adversaire du combat de fin de Ligue NG+), globale aux 2 mondes.
let inactiveWorld: YellowSave | null = null
let ngplusOldTeam: ChampionMon[] | null = null

/** Le monde LIVE « nu » (sans les méta NG+) extrait d'une save de haut niveau. */
function liveWorldOf(save: YellowSave): YellowSave {
    return { ...save, activeWorld: "live", ngplusWorld: null, ngplusOldTeam: null }
}

/** Hydrate les stores (joueur + Pokédex) depuis UN monde. `customDaemons` est GLOBAL (partagé entre les
 *  2 mondes) → toujours fourni depuis le haut niveau de la save. */
function hydrateFromWorld(w: YellowSave, customDaemons: StoredCustomDaemon[]): void {
    hydratePlayer({ team: w.team, pc: w.pc, items: w.items, reps: w.reps, repsCap: w.repsCap, creditedThrough: w.creditedThrough, pastaBoughtToday: w.pastaBoughtToday, pastaDayBonus: w.pastaDayBonus, defeatedTrainers: w.defeatedTrainers, rematchedTrainers: w.rematchedTrainers, badges: w.badges as BadgeId[], introSeen: w.introSeen, sbireDefeatsToday: w.sbireDefeatsToday, sbireWinsTotal: w.sbireWinsTotal, pvpStats: w.pvpStats, acePeakLevel: w.acePeakLevel, aceBox: w.aceBox, aceTeamSizePeak: w.aceTeamSizePeak, aceWins: w.aceWins, aceDefeatedDate: w.aceDefeatedDate, duelWins: w.duelWins, ownedCts: w.ownedCts, boughtCts: w.boughtCts, gekrocResolved: w.gekrocResolved, hhSpectresShown: w.hhSpectresShown, hhCollectorWins: w.hhCollectorWins, isChampion: w.isChampion, sylvebarbeAwake: w.sylvebarbeAwake, repsBankedTotal: w.repsBankedTotal, welcomeGift: w.welcomeGift, spagGift: w.spagGift, pastaGodGift: w.pastaGodGift, labDefi: w.labDefi, customDaemons })
    hydratePokedex({ seen: w.pokedex.seen, caught: w.pokedex.caught })
}

/** Hydrate les stores depuis une save serveur (multi-mondes). Réutilisé au chargement ET quand le serveur
 *  REFUSE un écrasement destructif (409) → on resynchronise sur la vraie save au lieu de l'écraser.
 *  Choisit le monde ACTIF (live/ngplus), stashe l'INACTIF, et rend le tout sérialisable sans perte. */
function applyServerSave(save: YellowSave): void {
    // Monde actif = celui du drapeau serveur (dégradé en "live" si le monde NG+ est absent/corrompu).
    const aw: "live" | "ngplus" = save.activeWorld === "ngplus" && save.ngplusWorld ? "ngplus" : "live"
    ngplusOldTeam = save.ngplusOldTeam ?? null
    inactiveWorld = aw === "live" ? (save.ngplusWorld ?? null) : liveWorldOf(save)
    const activeData = aw === "ngplus" ? save.ngplusWorld! : liveWorldOf(save)
    hydrateFromWorld(activeData, save.customDaemons) // customDaemons GLOBAL (haut niveau)
    setActiveWorld(aw)
    reregisterCustomDaemons() // Phase 2 : rend les Daemons custom résolvables en combat (getSpecies) dès le chargement
}

/** Accès (lecture) pour les fonctions NG+ à venir (Commit 3). */
export function getInactiveWorld(): YellowSave | null { return inactiveWorld }
export function getNgplusOldTeam(): ChampionMon[] | null { return ngplusOldTeam }

/** Charge la sauvegarde serveur → hydrate les stores. À appeler au mount. */
export async function loadYellowSave(): Promise<void> {
    if (loaded) return // idempotent : déjà chargé (ex. on arrive sur la page Pokédex en nav interne) → on garde l'état mémoire À JOUR au lieu de réécraser avec la DB (qui peut être en retard du débounce).
    try {
        const r = await fetch("/api/gamebook/yellow/save")
        if (!r.ok) { loaded = true; return }
        const j = await r.json()
        const save = parseSave(j?.save)
        applyServerSave(save)
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
                bankReps(j.repsTotalToDate, j.repsThroughYesterday, typeof j?.today === "string" ? j.today : undefined)
            }
        }
    } catch { /* neutre si indisponible */ }
    // Convertit d'éventuels niveaux Saiyan en attente (gagnés hors-ligne au combat précédent).
    await processSaiyanPoints()
    // Persiste l'état chargé — surtout les cadeaux one-shot crédités ci-dessus (welcomeGift/spagGift)
    // → le flag est sauvé même si le joueur ne fait rien d'autre ensuite (anti double-don).
    persistYellowSave()
}

/** Sérialise le MONDE ACTIF (celui des stores) en YellowSave « nue » (méta NG+ aux défauts). */
function activeWorldSave(): YellowSave {
    const p = getPlayer()
    const d = getPokedex()
    return { version: SAVE_VERSION, team: p.team, pc: p.pc, items: p.items, reps: p.reps, repsCap: p.repsCap, creditedThrough: p.creditedThrough, pastaBoughtToday: p.pastaBoughtToday, pastaDayBonus: p.pastaDayBonus, pokedex: { seen: d.seen, caught: d.caught }, defeatedTrainers: p.defeatedTrainers, rematchedTrainers: p.rematchedTrainers, badges: p.badges, introSeen: p.introSeen, sbireDefeatsToday: p.sbireDefeatsToday, sbireWinsTotal: p.sbireWinsTotal, pvpStats: p.pvpStats, acePeakLevel: p.acePeakLevel, aceBox: p.aceBox, aceTeamSizePeak: p.aceTeamSizePeak, aceWins: p.aceWins, aceDefeatedDate: p.aceDefeatedDate, duelWins: p.duelWins, ownedCts: p.ownedCts, boughtCts: p.boughtCts, gekrocResolved: p.gekrocResolved, hhSpectresShown: p.hhSpectresShown, hhCollectorWins: p.hhCollectorWins, isChampion: p.isChampion, sylvebarbeAwake: p.sylvebarbeAwake, repsBankedTotal: p.repsBankedTotal, welcomeGift: p.welcomeGift, spagGift: p.spagGift, pastaGodGift: p.pastaGodGift, labDefi: p.labDefi, customDaemons: p.customDaemons ?? [], activeWorld: "live", ngplusWorld: null, ngplusOldTeam: null }
}

/** FUSION des 2 mondes → une save unique. Les champs PLATS = monde LIVE (toujours, pour le garde-fou
 *  anti-wipe). `ngplusWorld` = monde NG+ imbriqué. `customDaemons` global forcé dans les deux. */
function snapshot(): YellowSave {
    const active = activeWorldSave()
    const cds = getPlayer().customDaemons ?? []
    const aw = getActiveWorld()
    const live: YellowSave = aw === "live" ? active : (inactiveWorld ?? emptySave())
    const ngplusRaw: YellowSave | null = aw === "ngplus" ? active : inactiveWorld
    const ngplusWorld = ngplusRaw
        ? { ...ngplusRaw, customDaemons: cds, activeWorld: "live" as const, ngplusWorld: null, ngplusOldTeam: null }
        : null
    return { ...live, customDaemons: cds, activeWorld: aw, ngplusWorld, ngplusOldTeam }
}

/** Sauvegarde débouncée (ne fait rien tant que la save initiale n'est pas chargée).
 *  Si le serveur REFUSE l'écriture (409 : un autosave vierge allait écraser un compte avancé), on
 *  RESYNCHRONISE les stores sur la vraie save renvoyée → le joueur récupère son compte, rien n'est perdu. */
export function persistYellowSave(): void {
    if (!loaded) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
        fetch("/api/gamebook/yellow/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ save: snapshot() }),
        }).then(async (r) => {
            if (r.status === 409) {
                try { const j = await r.json(); if (j?.save) applyServerSave(parseSave(j.save)) } catch { /* ignore */ }
                console.warn("[yellow] Écrasement vierge REFUSÉ par le serveur → save réelle rechargée (compte protégé).")
            }
        }).catch(() => { /* silencieux */ })
    }, 800)
}

/** Sauvegarde INTENTIONNELLE immédiate (reset volontaire) : contourne le garde-fou (intentionalReset) et
 *  n'est PAS débouncée → elle passe avant tout autosave concurrent. */
async function persistIntentionalReset(): Promise<void> {
    if (timer) { clearTimeout(timer); timer = null }
    try {
        await fetch("/api/gamebook/yellow/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ save: snapshot(), intentionalReset: true }),
        })
    } catch { /* hors-ligne : réessai au prochain autosave */ }
}

/** Sauvegarde IMMÉDIATE (non débouncée) : annule l'autosave en attente et POSTe tout de suite. Utilisée par
 *  les transitions NG+ (démarrage / bascule de monde) pour éviter qu'un autosave concurrent parte AVANT. Le
 *  garde-fou anti-wipe reste actif (les champs plats = monde LIVE inchangés → jamais de fausse régression). */
async function persistNow(): Promise<void> {
    if (!loaded) return
    if (timer) { clearTimeout(timer); timer = null }
    try {
        const r = await fetch("/api/gamebook/yellow/save", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ save: snapshot() }),
        })
        if (r.status === 409) { try { const j = await r.json(); if (j?.save) applyServerSave(parseSave(j.save)) } catch { /* ignore */ } }
    } catch { /* hors-ligne : réessai au prochain autosave */ }
}

/**
 * NEW GAME+ — démarre un 2e run : le monde LIVE courant est STASHÉ (intact + rejouable via switchWorld),
 * l'équipe championne est FIGÉE (adversaire de fin de Ligue NG+), et un monde NG+ frais démarre avec le
 * Daemon custom `starter` en équipe + 6000⚡. Réservé aux champions, hors NG+. Retourne false sinon.
 */
export async function startNewGamePlus(starter: MonInstance, oldTeamFrozen: ChampionMon[]): Promise<boolean> {
    if (getActiveWorld() !== "live") return false // déjà en NG+
    if (!getPlayer().isChampion) return false      // réservé aux champions
    // 1) Stash le monde LIVE courant (sérialisé, méta NG+ nettoyées) → devient le monde inactif rejouable.
    inactiveWorld = liveWorldOf(activeWorldSave())
    // 2) Fige l'ancienne équipe (adversaire du combat de fin de Ligue NG+).
    ngplusOldTeam = oldTeamFrozen.length ? oldTeamFrozen : null
    // 3) Monde NG+ frais dans les stores (starter custom, isChampion=false, customDaemons préservés).
    startNgPlusWorld(starter)
    hydratePokedex({ seen: [], caught: [] })
    setActiveWorld("ngplus")
    // 4) 6000⚡ de départ + plafond aligné (raiseRepsCap AVANT grantReps → pas de rabotage).
    raiseRepsCap(NGPLUS_START_ENERGY - 1000) // cap 1000 → 6000
    grantReps(NGPLUS_START_ENERGY)           // reps → 6000
    // 5) Flush immédiat (top-level = monde LIVE inchangé → garde-fou OK).
    await persistNow()
    return true
}

/** NG+ — bascule entre le monde LIVE et le monde NG+ (les deux persistés, aucun perdu). false si l'autre
 *  monde n'existe pas ou si on est déjà dessus. */
export async function switchWorld(target: "live" | "ngplus"): Promise<boolean> {
    if (target === getActiveWorld()) return false
    const otherSave = inactiveWorld
    if (!otherSave) return false // pas de 2e monde à rejoindre
    const cds = getPlayer().customDaemons ?? []
    inactiveWorld = activeWorldSave() // le monde qu'on quitte devient l'inactif
    hydrateFromWorld(otherSave, cds)  // customDaemons GLOBAL, préservé
    setActiveWorld(target)
    reregisterCustomDaemons()
    await persistNow()
    return true
}

/** NG+ — clôt le combat de fin de Ligue (adversaire = ancienne équipe) : consomme l'ancienne équipe figée
 *  (one-time). Les 2 mondes restent navigables. La fusion (transfert entre PC) viendra au Commit 6. */
export function completeNewGamePlus(): void {
    if (!ngplusOldTeam) return
    ngplusOldTeam = null
    persistYellowSave()
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
    inactiveWorld = null; ngplusOldTeam = null // reset volontaire → on efface AUSSI le monde NG+ éventuel
    resetForIntro()
    hydratePokedex({ seen: [], caught: [] })
    // ÉNERGIE « nouvelle partie » : on re-crédite comme un PREMIER chargement (resetForIntro a remis
    // welcomeGift/spagGift à false et repsBankedTotal à -1) → cadeaux de bienvenue + reps du jour.
    claimWelcomeGift() // +100 énergie
    claimSpagGift()    // +150 énergie
    try {
        const r = await fetch("/api/gamebook/yellow/player-stats")
        if (r.ok) {
            const j = await r.json()
            if (j?.ctx) setWildCtx(j.ctx)
            if (typeof j?.today === "string") creditDailyReps(j.today)
            if (typeof j?.repsTotalToDate === "number" && typeof j?.repsThroughYesterday === "number") {
                bankReps(j.repsTotalToDate, j.repsThroughYesterday, typeof j?.today === "string" ? j.today : undefined) // recrédite les reps du jour
            }
        }
    } catch { /* hors-ligne : au moins les cadeaux de bienvenue sont crédités */ }
    await persistIntentionalReset() // reset VOLONTAIRE → contourne le garde-fou anti-écrasement (le backup a déjà été fait)
}

/** Branche l'auto-sauvegarde sur les deux stores (idempotent). */
export function initAutosave(): void {
    if (autosaveInit) return
    autosaveInit = true
    subscribePlayer(persistYellowSave)
    subscribePokedex(persistYellowSave)
}
