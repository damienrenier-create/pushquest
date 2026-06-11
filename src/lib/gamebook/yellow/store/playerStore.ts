// src/lib/gamebook/yellow/store/playerStore.ts
//
// Nexus Jaune Éclair — état PERSISTANT du joueur : équipe (max 6), PC (réserve),
// objets. Store externe (useSyncExternalStore). Source de vérité hors combat ;
// le combat travaille sur une COPIE de l'équipe et resynchronise à la fin.

import { useSyncExternalStore } from "react"
import type { MonInstance, MoveSlot } from "../battle/types"
import { fullStats } from "../battle/stats"
import { getSpecies } from "../data/species"
import { tradeEvolutionTarget, applyEvolution, type EvolutionResult } from "../battle/evolution"
import { getMove } from "../data/moves"
import { getItem } from "../data/items"
import { SAIYAN_POINT_VALUE } from "../data/saiyanConfig"
import { BADGE_REPS_CAP_BONUS } from "../data/badges"
import { getCt, canLearnCt, purchasableCts, type BadgeId } from "../data/cts"
import type { StatKey } from "../battle/types"
import { expForLevel, levelFromExp, applyExp, MAX_LEVEL, type ExpResult } from "../battle/xp"
import type { WildPlayerCtx } from "../data/encounters"
import { aceTargetLevel, bestCounter } from "../data/ace"
import type { PokeType } from "../battle/types"

export const TEAM_MAX = 6

/** Super Pasta : +1 niveau. Prix = (60 + bonus journalier) × 1.5^achats du jour. */
export const SUPER_PASTA_BASE = 60
/** Le prix plancher augmente de ce montant à chaque nouveau jour de jeu. */
export const SUPER_PASTA_DAILY_INCREASE = 3
export const SUPER_PASTA_GROWTH = 1.5

interface PlayerState {
    team: MonInstance[]
    pc: MonInstance[]
    items: Record<string, number>
    /** Portefeuille : reps stockés (dépensés en boutique ET pour attaquer). Persisté. */
    reps: number
    /** Plafond de stockage des reps (1000 au départ, augmenté par les badges d'arène). */
    repsCap: number
    /** Dernier jour tické (reset quotidien pasta/sbire). */
    creditedThrough: string
    /** High-water des reps banquées en énergie (total déjà crédité). -1 = non initialisé. */
    repsBankedTotal: number
    /** Cadeau de bienvenue (100 énergie) déjà réclamé ? */
    welcomeGift: boolean
    /** Nb de Super Pastas achetés aujourd'hui (remis à 0 chaque jour ; gonfle le prix ×1.5). */
    pastaBoughtToday: number
    /** Bonus cumulé sur le prix plancher du Super Pasta (+3 par jour de jeu écoulé). */
    pastaDayBonus: number
    /** Ids des dresseurs déjà battus. */
    defeatedTrainers: string[]
    /** Badges d'arène gagnés (Feu/Plante/Eau). */
    badges: BadgeId[]
    /** Stats d'effort du jour (PushQuest) qui modulent les rencontres. Null = neutre. */
    wildCtx: WildPlayerCtx | null
    /** Cinématique d'intro (choix du starter) déjà jouée ? */
    introSeen: boolean
    /** Victoires sur le sbire AUJOURD'HUI (reset au tick quotidien ; plafond 2). */
    sbireDefeatsToday: number
    /** Victoires totales sur le sbire (cumulatif → cycle des explications app). */
    sbireWinsTotal: number
    /** Réputation PvP (matchs + usages pour fétiche/favorite). */
    pvpStats: PvpStats
    /** ACE (rival) — pic de niveau mémorisé (ratchet, ne régresse jamais). */
    acePeakLevel: number
    /** Mémoire de niveau des espèces-contre (slot 6 adaptatif). */
    aceBox: Record<string, number>
    /** Taille d'équipe d'ACE (cliquet de la taille du joueur, min 3 = les 3 panthères, ne redescend jamais). */
    aceTeamSizePeak: number
    /** Nombre de fois où le joueur a battu ACE (récompenses). */
    aceWins: number
    /** Jour (= creditedThrough) où ACE a été battu → 1 défaite/jour. */
    aceDefeatedDate: string
    /** CT CADEAUX possédées (remises par les boss) : enseignables GRATUITEMENT. */
    ownedCts: string[]
}

/** Statistiques PvP du joueur (réputation). */
export interface PvpStats {
    wins: number
    losses: number
    /** Matchs que J'AI abandonnés (comptés aussi dans `losses`). */
    forfeits: number
    /** speciesId → nb de fois envoyé/utilisé en PvP (→ "Daemon fétiche"). */
    daemonUse: Record<string, number>
    /** moveId → nb d'utilisations en PvP (→ "attaque favorite"). */
    moveUse: Record<string, number>
}

export function emptyPvpStats(): PvpStats {
    return { wins: 0, losses: 0, forfeits: 0, daemonUse: {}, moveUse: {} }
}

let st: PlayerState = { team: [], pc: [], items: {}, reps: 0, repsCap: 1000, creditedThrough: "", repsBankedTotal: -1, welcomeGift: false, pastaBoughtToday: 0, pastaDayBonus: 0, defeatedTrainers: [], badges: [], wildCtx: null, introSeen: false, sbireDefeatsToday: 0, sbireWinsTotal: 0, pvpStats: emptyPvpStats(), acePeakLevel: 0, aceBox: {}, aceTeamSizePeak: 3, aceWins: 0, aceDefeatedDate: "", ownedCts: [] }
const listeners = new Set<() => void>()

function emit() { for (const l of listeners) l() }

export function subscribePlayer(l: () => void): () => void {
    listeners.add(l)
    return () => { listeners.delete(l) }
}

export function getPlayer(): PlayerState { return st }

export function hydratePlayer(p: Partial<PlayerState>) {
    st = {
        team: p.team ?? [], pc: p.pc ?? [], items: p.items ?? {},
        reps: p.reps ?? st.reps ?? 0, repsCap: p.repsCap ?? st.repsCap ?? 1000, creditedThrough: p.creditedThrough ?? st.creditedThrough ?? "",
        repsBankedTotal: p.repsBankedTotal ?? st.repsBankedTotal ?? -1, welcomeGift: p.welcomeGift ?? st.welcomeGift ?? false,
        pastaBoughtToday: p.pastaBoughtToday ?? st.pastaBoughtToday ?? 0, pastaDayBonus: p.pastaDayBonus ?? st.pastaDayBonus ?? 0,
        defeatedTrainers: p.defeatedTrainers ?? [], badges: p.badges ?? st.badges ?? [], wildCtx: p.wildCtx ?? st.wildCtx ?? null,
        introSeen: p.introSeen ?? st.introSeen ?? false,
        sbireDefeatsToday: p.sbireDefeatsToday ?? st.sbireDefeatsToday ?? 0,
        sbireWinsTotal: p.sbireWinsTotal ?? st.sbireWinsTotal ?? 0,
        pvpStats: p.pvpStats ?? st.pvpStats ?? emptyPvpStats(),
        acePeakLevel: p.acePeakLevel ?? st.acePeakLevel ?? 0,
        aceBox: p.aceBox ?? st.aceBox ?? {},
        aceTeamSizePeak: p.aceTeamSizePeak ?? st.aceTeamSizePeak ?? 3,
        aceWins: p.aceWins ?? st.aceWins ?? 0,
        aceDefeatedDate: p.aceDefeatedDate ?? st.aceDefeatedDate ?? "",
        ownedCts: p.ownedCts ?? st.ownedCts ?? [],
    }
    emit()
}

/** Marque la cinématique d'intro comme jouée. */
export function markIntroSeen() {
    if (st.introSeen) return
    st = { ...st, introSeen: true }
    emit()
}

/** DEV : remet la progression jaune à zéro pour rejouer l'intro (équipe vidée, introSeen=false). */
export function resetForIntro() {
    st = { team: [], pc: [], items: {}, reps: 0, repsCap: 1000, creditedThrough: "", repsBankedTotal: -1, welcomeGift: false, pastaBoughtToday: 0, pastaDayBonus: 0, defeatedTrainers: [], badges: [], wildCtx: st.wildCtx, introSeen: false, sbireDefeatsToday: 0, sbireWinsTotal: 0, pvpStats: emptyPvpStats(), acePeakLevel: 0, aceBox: {}, aceTeamSizePeak: 3, aceWins: 0, aceDefeatedDate: "", ownedCts: [] }
    emit()
}

// Identité du joueur courant (= User.id) + carte courante : sert à estampiller
// l'ownership et le lieu de capture (RECO identité/Pokédex). Posés par l'UI au montage.
let currentPlayerId = ""
let currentMapId = ""
export function setCurrentPlayerId(id: string) { currentPlayerId = id || "" }
export function getCurrentPlayerId(): string { return currentPlayerId }
export function setCurrentMapId(id: string) { currentMapId = id || "" }

/** Renseigne les stats d'effort du jour (fetchées au chargement). */
export function setWildCtx(ctx: WildPlayerCtx | null) {
    st = { ...st, wildCtx: ctx }
    emit()
}

/** Marque un dresseur comme battu (idempotent). */
export function markTrainerDefeated(trainerId: string) {
    if (st.defeatedTrainers.includes(trainerId)) return
    st = { ...st, defeatedTrainers: [...st.defeatedTrainers, trainerId] }
    emit()
}

export function isTrainerDefeated(trainerId: string): boolean {
    return st.defeatedTrainers.includes(trainerId)
}

/** Possède ce badge d'arène ? */
export function hasBadge(id: BadgeId): boolean {
    return st.badges.includes(id)
}

/** Accorde un badge (idempotent) : augmente aussi le plafond de stockage des reps. */
export function awardBadge(id: BadgeId): boolean {
    if (st.badges.includes(id)) return false
    st = { ...st, badges: [...st.badges, id], repsCap: st.repsCap + BADGE_REPS_CAP_BONUS }
    emit()
    return true
}

/** Remet une CT CADEAU (trophée de boss) → enseignable GRATUITEMENT. true si nouvelle. */
export function grantCt(ctId: string): boolean {
    if (st.ownedCts.includes(ctId)) return false
    st = { ...st, ownedCts: [...st.ownedCts, ctId] }
    emit()
    return true
}

/** Remplace l'équipe (utilisé pour resynchroniser après un combat : XP/PV/niveaux). */
export function setTeam(team: MonInstance[]) {
    st = { ...st, team }
    emit()
}

/** Ajoute un Daemon capturé (équipe si place, sinon PC). */
export function addCaught(mon: MonInstance, ctx?: { quotaReached?: boolean }): "team" | "pc" {
    const today = new Date().toISOString().slice(0, 10)
    const owned: MonInstance = {
        ...mon, owned: true,
        capturedLevel: mon.capturedLevel ?? mon.level,
        capturedAt: mon.capturedAt ?? today,
        // Identité : posée UNE fois (le captureur). currentOwner = origin à la capture.
        originalTrainerId: mon.originalTrainerId ?? (currentPlayerId || undefined),
        currentOwnerId: mon.currentOwnerId ?? (currentPlayerId || undefined),
        traded: mon.traded ?? false,
        // Métadonnées de capture (Pokédex enrichi).
        capturedMapId: mon.capturedMapId ?? (currentMapId || undefined),
        capturedQuotaReached: mon.capturedQuotaReached ?? ctx?.quotaReached,
    }
    if (st.team.length < TEAM_MAX) {
        st = { ...st, team: [...st.team, owned] }
        emit()
        return "team"
    }
    st = { ...st, pc: [...st.pc, owned] }
    emit()
    return "pc"
}

/**
 * ÉCHANGE (RECO 4) : retire le Daemon donné (par uid, équipe OU PC), ajoute le reçu
 * avec nouvel ownership. originalTrainerId préservé (survit aux allers-retours) ;
 * surnom d'origine figé. Renvoie false si le Daemon donné est introuvable (déjà parti).
 */
export function executeTrade(giveUid: string, receive: MonInstance): boolean {
    const has = st.team.some((m) => m.uid === giveUid) || st.pc.some((m) => m.uid === giveUid)
    if (!has || !receive?.speciesId) return false
    const team = st.team.filter((m) => m.uid !== giveUid)
    const pc = st.pc.filter((m) => m.uid !== giveUid)
    const got: MonInstance = {
        ...receive,
        owned: true,
        currentOwnerId: currentPlayerId || receive.currentOwnerId,
        originalTrainerId: receive.originalTrainerId ?? receive.currentOwnerId,
        traded: true,
        originalNickname: receive.originalNickname ?? receive.nickname,
    }
    if (team.length < TEAM_MAX) team.push(got)
    else pc.push(got)
    st = { ...st, team, pc }
    emit()
    return true
}

/** Échange de CT : retire la CT donnée de ownedCts et ajoute la reçue (si pas déjà possédée).
 *  Renvoie false si je ne possède pas la CT offerte (garde-fou anti-triche). */
export function tradeCt(giveCtId: string, receiveCtId: string): boolean {
    const i = st.ownedCts.indexOf(giveCtId)
    if (i < 0) return false
    const owned = [...st.ownedCts]
    owned.splice(i, 1)
    if (receiveCtId && !owned.includes(receiveCtId)) owned.push(receiveCtId)
    st = { ...st, ownedCts: owned }
    emit()
    return true
}

/**
 * ÉVOLUTION PAR ÉCHANGE : si le Daemon reçu (uid) appartient à une espèce qui évolue
 * par TRADE, l'évolue sur-le-champ (immuable). Renvoie le résultat (pour le toast/anim).
 */
export function applyTradeEvolution(uid: string): EvolutionResult | null {
    const inTeam = st.team.findIndex((m) => m.uid === uid)
    const where: "team" | "pc" = inTeam >= 0 ? "team" : "pc"
    const idx = inTeam >= 0 ? inTeam : st.pc.findIndex((m) => m.uid === uid)
    if (idx < 0) return null
    const src = (where === "team" ? st.team : st.pc)[idx]
    const toId = tradeEvolutionTarget(src)
    if (!toId) return null
    const clone: MonInstance = { ...src, moves: src.moves.map((m) => ({ ...m })), pendingMoves: src.pendingMoves ? [...src.pendingMoves] : undefined }
    const res = applyEvolution(clone, toId)
    if (!res) return null
    const list = [...(where === "team" ? st.team : st.pc)]
    list[idx] = clone
    st = where === "team" ? { ...st, team: list } : { ...st, pc: list }
    emit()
    return res
}

export function addItem(itemId: string, qty = 1) {
    st = { ...st, items: { ...st.items, [itemId]: (st.items[itemId] ?? 0) + qty } }
    emit()
}

/** Consomme 1 objet (ex. une Ball). Renvoie false si le joueur n'en a pas. */
export function consumeItem(itemId: string): boolean {
    if ((st.items[itemId] ?? 0) <= 0) return false
    st = { ...st, items: { ...st.items, [itemId]: st.items[itemId] - 1 } }
    emit()
    return true
}

/** Solde de reps disponible (pool stocké, déjà plafonné). */
export function walletBalance(): number {
    return st.reps
}

/** Dépense des reps (boutique OU attaque). Renvoie false si solde insuffisant. */
export function spendReps(n: number): boolean {
    if (st.reps < n) return false
    st = { ...st, reps: st.reps - Math.floor(n) }
    emit()
    return true
}

/** Crédite des reps (récompense), plafonné au cap. Renvoie le montant réellement ajouté. */
export function grantReps(n: number): number {
    const before = st.reps
    st = { ...st, reps: Math.min(st.repsCap, st.reps + Math.max(0, Math.floor(n))) }
    emit()
    return st.reps - before
}

/**
 * Tick quotidien (1×/jour) : reset des achats Super Pasta (+3 au prix plancher) et
 * du compteur de combats du sbire. Le CRÉDIT des reps est désormais géré par bankReps.
 */
export function creditDailyReps(today: string) {
    if (st.creditedThrough === today) return // déjà tické aujourd'hui
    const firstEver = st.creditedThrough === ""
    st = {
        ...st,
        creditedThrough: today,
        pastaBoughtToday: 0,
        pastaDayBonus: firstEver ? st.pastaDayBonus : st.pastaDayBonus + SUPER_PASTA_DAILY_INCREASE,
        sbireDefeatsToday: 0, // nouveau jour → le sbire est de nouveau affrontable (2×)
    }
    emit()
}

/**
 * Banque les reps réelles en ÉNERGIE, INSTANTANÉMENT (high-water mark) : crédite le
 * DELTA entre le total cumulé des reps (incluant aujourd'hui, en direct) et ce qui a
 * déjà été banqué → aujourd'hui compte tout de suite, les jours non joués ne sont
 * jamais perdus, zéro double-crédit (idempotent). 1re fois : pic initialisé au "total
 * d'hier" (le passé est déjà banqué par l'ancien système → pas de crédit rétroactif).
 */
export function bankReps(totalToDate: number, throughYesterday: number) {
    const tot = Math.max(0, Math.floor(totalToDate))
    let banked = st.repsBankedTotal
    if (banked < 0) banked = Math.max(0, Math.floor(throughYesterday)) // init migration / 1re fois
    const delta = Math.max(0, tot - banked)
    st = { ...st, reps: Math.min(st.repsCap, st.reps + delta), repsBankedTotal: Math.max(banked, tot) }
    emit()
}

/** Cadeau de bienvenue : +100 énergie, UNE seule fois par joueur (à l'arrivée dans le Ch.2). */
export function claimWelcomeGift() {
    if (st.welcomeGift) return
    st = { ...st, welcomeGift: true, reps: Math.min(st.repsCap, st.reps + 100) }
    emit()
}

/**
 * Enregistre une victoire sur le sbire : +1 au compteur du jour ET au cumul.
 * Renvoie le numéro de victoire TOTAL (1-indexé) → choix de l'explication app.
 */
export function recordSbireWin(): number {
    const winsTotal = st.sbireWinsTotal + 1
    st = { ...st, sbireDefeatsToday: st.sbireDefeatsToday + 1, sbireWinsTotal: winsTotal }
    emit()
    return winsTotal
}

// === RÉPUTATION PvP ===

/** Enregistre l'issue d'un match PvP. "forfeit" = j'ai abandonné (compté en défaite aussi). */
export function recordPvpResult(result: "win" | "loss" | "forfeit") {
    const s = st.pvpStats
    const next: PvpStats = { ...s, daemonUse: { ...s.daemonUse }, moveUse: { ...s.moveUse } }
    if (result === "win") next.wins += 1
    else if (result === "loss") next.losses += 1
    else { next.forfeits += 1; next.losses += 1 }
    st = { ...st, pvpStats: next }
    emit()
}

/** Comptabilise l'usage d'un Daemon (+ d'une attaque) en PvP → fétiche / favorite. */
export function recordPvpUse(speciesId: string, moveId?: string) {
    const s = st.pvpStats
    const daemonUse = { ...s.daemonUse, [speciesId]: (s.daemonUse[speciesId] ?? 0) + 1 }
    const moveUse = moveId ? { ...s.moveUse, [moveId]: (s.moveUse[moveId] ?? 0) + 1 } : s.moveUse
    st = { ...st, pvpStats: { ...s, daemonUse, moveUse } }
    emit()
}

function topKey(rec: Record<string, number>): string | null {
    let best: string | null = null, max = -1
    for (const [k, v] of Object.entries(rec)) if (v > max) { max = v; best = k }
    return best
}
/** Daemon fétiche (le plus envoyé en PvP), ou null. */
export function favoriteDaemon(): string | null { return topKey(st.pvpStats.daemonUse) }
/** Attaque favorite (la plus utilisée en PvP), ou null. */
export function favoriteMove(): string | null { return topKey(st.pvpStats.moveUse) }

// === ACE (rival) ===
/** Pic de niveau mémorisé + box des contres (pour construire son équipe au combat). */
export function getAceState(): { peak: number; box: Record<string, number> } {
    return { peak: st.acePeakLevel, box: st.aceBox }
}
/** Taille d'équipe d'ACE : max(pic, taille du joueur), plancher 3 (les 3 panthères), cliquet → ne redescend jamais. */
export function aceTeamSizeFor(playerTeamSize: number): number {
    const want = Math.max(1, Math.min(6, Math.floor(playerTeamSize)))
    const size = Math.max(st.aceTeamSizePeak, 3, want)
    if (size !== st.aceTeamSizePeak) { st = { ...st, aceTeamSizePeak: size }; emit() }
    return size
}
/** Nombre de défaites d'ACE infligées par ce joueur. */
export function aceWinsCount(): number { return st.aceWins }
/** ACE affrontable aujourd'hui ? (1 défaite/jour ; retry libre si on perd). */
export function aceAvailableToday(): boolean {
    return st.creditedThrough === "" || st.aceDefeatedDate !== st.creditedThrough
}
/**
 * Défaite d'ACE : ratchet du pic de niveau (= max(pic, ton meilleur + 2), ne régresse
 * jamais) + mémorise le niveau du contre affronté. Verrouille la journée. Renvoie le n° de victoire.
 */
export function recordAceDefeat(playerBestLevel: number, playerLastTypes: PokeType[], playerLastLevel: number): number {
    const wins = st.aceWins + 1
    const peak = aceTargetLevel(st.acePeakLevel, playerBestLevel)
    const counter = bestCounter(playerLastTypes)
    const box = { ...st.aceBox, [counter]: Math.max(st.aceBox[counter] ?? 0, playerLastLevel) }
    st = { ...st, acePeakLevel: peak, aceBox: box, aceWins: wins, aceDefeatedDate: st.creditedThrough }
    emit()
    return wins
}

/** Prix actuel d'un Super Pasta : (60 + bonus journalier) × 1.5^(achats du jour). */
export function superPastaPrice(): number {
    return Math.round((SUPER_PASTA_BASE + st.pastaDayBonus) * SUPER_PASTA_GROWTH ** st.pastaBoughtToday)
}

/**
 * Achète et applique un Super Pasta à un Daemon de l'équipe : +1 niveau effectif,
 * apprentissage des attaques du palier (ou mise en attente), PV ajustés au level-up.
 * Renvoie { ok:false } si solde insuffisant, Daemon introuvable, ou déjà au max.
 */
export function buySuperPasta(uid: string): { ok: boolean; reason?: "reps" | "introuvable" | "max"; result?: ExpResult; price?: number } {
    const price = superPastaPrice()
    if (st.reps < price) return { ok: false, reason: "reps" }
    const idx = st.team.findIndex((m) => m.uid === uid)
    if (idx < 0) return { ok: false, reason: "introuvable" }
    const orig = st.team[idx]
    const sp = getSpecies(orig.speciesId)
    const baseExp = Math.max(orig.exp, expForLevel(orig.level))
    const effLevel = Math.max(orig.level, levelFromExp(orig.exp))
    if (effLevel >= MAX_LEVEL) return { ok: false, reason: "max" }
    const target = Math.min(MAX_LEVEL, effLevel + 1)
    const mon: MonInstance = {
        ...orig, ivs: { ...orig.ivs }, moves: orig.moves.map((s) => ({ ...s })),
        pendingMoves: orig.pendingMoves ? [...orig.pendingMoves] : undefined,
    }
    const hpBefore = sp ? fullStats(orig, sp).hp : orig.currentHp
    const result = applyExp(mon, Math.max(1, expForLevel(target) - baseExp))
    const hpAfter = sp ? fullStats(mon, sp).hp : mon.currentHp
    mon.currentHp = Math.min(hpAfter, mon.currentHp + Math.max(0, hpAfter - hpBefore))
    const team = st.team.slice()
    team[idx] = mon
    st = { ...st, reps: st.reps - price, pastaBoughtToday: st.pastaBoughtToday + 1, team }
    emit()
    return { ok: true, result, price }
}

/** Augmente le plafond de stockage (badge d'arène). */
export function raiseRepsCap(delta: number) {
    st = { ...st, repsCap: st.repsCap + Math.max(0, Math.floor(delta)) }
    emit()
}

/** Soin complet de l'équipe (Centre Daemon) : PV max, statut effacé, PP refaits. */
export function healAllTeam() {
    st = {
        ...st,
        team: st.team.map((m): MonInstance => {
            const sp = getSpecies(m.speciesId)
            const max = sp ? fullStats(m, sp).hp : m.currentHp
            return {
                ...m,
                currentHp: max,
                status: "NONE",
                statusCounter: 0,
                moves: m.moves.map((mv) => ({ ...mv, pp: mv.ppMax })),
            }
        }),
    }
    emit()
}

// ============================================================
// PC / boîtes — dépôt, retrait, renommage, soin hors combat
// ============================================================

/** Dépose un Daemon de l'équipe vers le PC. Refuse de vider entièrement l'équipe. */
export function depositToPc(uid: string): { ok: boolean; reason?: "introuvable" | "last" } {
    const idx = st.team.findIndex((m) => m.uid === uid)
    if (idx < 0) return { ok: false, reason: "introuvable" }
    if (st.team.length <= 1) return { ok: false, reason: "last" }
    const mon = st.team[idx]
    st = { ...st, team: st.team.filter((_, i) => i !== idx), pc: [...st.pc, mon] }
    emit()
    return { ok: true }
}

/** Retire un Daemon du PC vers l'équipe. Refuse si l'équipe est pleine. */
export function withdrawFromPc(uid: string): { ok: boolean; reason?: "introuvable" | "full" } {
    if (st.team.length >= TEAM_MAX) return { ok: false, reason: "full" }
    const idx = st.pc.findIndex((m) => m.uid === uid)
    if (idx < 0) return { ok: false, reason: "introuvable" }
    const mon = st.pc[idx]
    st = { ...st, pc: st.pc.filter((_, i) => i !== idx), team: [...st.team, mon] }
    emit()
    return { ok: true }
}

/** Échange la position de deux Daemons de l'équipe (réordonnancement manuel). */
export function swapTeam(uidA: string, uidB: string): boolean {
    if (uidA === uidB) return false
    const i = st.team.findIndex((m) => m.uid === uidA)
    const j = st.team.findIndex((m) => m.uid === uidB)
    if (i < 0 || j < 0) return false
    const team = [...st.team]
    ;[team[i], team[j]] = [team[j], team[i]]
    st = { ...st, team }
    emit()
    return true
}

/** Renomme un Daemon (équipe ou PC). Vide → réinitialise au nom d'espèce. Max 12 car. */
export function renameDaemon(uid: string, nickname: string) {
    const target = st.team.find((m) => m.uid === uid) ?? st.pc.find((m) => m.uid === uid)
    if (target?.traded) return // surnom VERROUILLÉ sur un Daemon reçu en échange (cohérent avec l'UI + le flag traded)
    const nn = nickname.trim().slice(0, 12)
    const apply = (m: MonInstance): MonInstance => (m.uid === uid ? { ...m, nickname: nn.length ? nn : undefined } : m)
    st = { ...st, team: st.team.map(apply), pc: st.pc.map(apply) }
    emit()
}

/** Utilise un objet de soin sur un Daemon de l'équipe (hors combat). Renvoie false si inutile.
 *  NB : nom volontairement SANS préfixe « use » (ce n'est pas un hook React). */
export function healTeamMember(uid: string, itemId: string): boolean {
    const item = getItem(itemId)
    if (!item || item.category !== "HEAL") return false
    if ((st.items[itemId] ?? 0) <= 0) return false
    const idx = st.team.findIndex((m) => m.uid === uid)
    if (idx < 0) return false
    const m = st.team[idx]
    if (m.currentHp <= 0) return false // une Potion ne ranime pas un Daemon K.O.
    const sp = getSpecies(m.speciesId)
    const max = sp ? fullStats(m, sp).hp : m.currentHp
    if (m.currentHp >= max) return false // déjà au max
    const heal = item.healHp && item.healHp > 0 ? item.healHp : max
    const team = st.team.slice()
    team[idx] = { ...m, currentHp: Math.min(max, m.currentHp + heal) }
    st = { ...st, team, items: { ...st.items, [itemId]: st.items[itemId] - 1 } }
    emit()
    return true
}

/**
 * ENTRAÎNEMENT SAIYAN : dépense 1 point de stat sur le Daemon (équipe ou PC).
 * Si la stat est PV, augmente aussi les PV courants du gain (pas de PV "manquants").
 */
export function allocateStatPoint(uid: string, stat: StatKey): boolean {
    const pools: ("team" | "pc")[] = ["team", "pc"]
    for (const pool of pools) {
        const arr = st[pool]
        const idx = arr.findIndex((m) => m.uid === uid)
        if (idx < 0) continue
        const m = arr[idx]
        if ((m.statPoints ?? 0) <= 0) return false
        const allocated = { ...(m.allocated ?? {}) }
        allocated[stat] = (allocated[stat] ?? 0) + 1
        const updated: MonInstance = {
            ...m,
            statPoints: (m.statPoints ?? 0) - 1,
            allocated,
            currentHp: stat === "hp" ? m.currentHp + SAIYAN_POINT_VALUE.hp : m.currentHp,
        }
        const next = arr.slice()
        next[idx] = updated
        st = { ...st, [pool]: next }
        emit()
        return true
    }
    return false
}

/**
 * Achète et enseigne une CT à un Daemon (équipe ou PC). Paie en reps.
 * - slot libre → apprise directement ;
 * - 4 slots pleins → mise EN ATTENTE (pendingMoves) → l'écran d'apprentissage gère le remplacement.
 */
export function teachCt(uid: string, ctId: string): { ok: boolean; reason?: "introuvable" | "locked" | "incompatible" | "known" | "reps"; queued?: boolean } {
    const ct = getCt(ctId)
    if (!ct) return { ok: false, reason: "introuvable" }
    // CT possédée (cadeau) → gratuite. Sinon il faut qu'elle soit en vente (badges).
    const owned = st.ownedCts.includes(ctId)
    if (!owned && !purchasableCts(st.badges).some((c) => c.id === ctId)) return { ok: false, reason: "locked" }
    const pools: ("team" | "pc")[] = ["team", "pc"]
    for (const pool of pools) {
        const arr = st[pool]
        const idx = arr.findIndex((m) => m.uid === uid)
        if (idx < 0) continue
        const m = arr[idx]
        const sp = getSpecies(m.speciesId)
        if (!sp || !canLearnCt(sp, ct)) return { ok: false, reason: "incompatible" }
        if (m.moves.some((s) => s.moveId === ct.moveId) || m.pendingMoves?.includes(ct.moveId)) return { ok: false, reason: "known" }
        const cost = owned ? 0 : ct.price // CT cadeau = gratuite
        if (st.reps < cost) return { ok: false, reason: "reps" }
        const free = m.moves.length < 4
        const pp = getMove(ct.moveId)?.pp ?? 5
        const updated: MonInstance = free
            ? { ...m, moves: [...m.moves, { moveId: ct.moveId, pp, ppMax: pp }] }
            : { ...m, pendingMoves: [...(m.pendingMoves ?? []), ct.moveId] }
        const next = arr.slice()
        next[idx] = updated
        // CT cadeau : consommée à l'apprentissage (une seule fois, puis c'est fini).
        const ownedAfter = owned ? st.ownedCts.filter((id) => id !== ctId) : st.ownedCts
        st = { ...st, reps: st.reps - cost, [pool]: next, ownedCts: ownedAfter }
        emit()
        return { ok: true, queued: !free }
    }
    return { ok: false, reason: "introuvable" }
}

/**
 * SAIYAN — applique les points calculés (règle amende/quota) aux Daemons :
 * ajoute statPoints, remet à zéro pendingSaiyanLevels, fixe lastLevelUpAt=today.
 * (Appelé par processSaiyanPoints côté bridge, après l'appel serveur.)
 */
export function applySaiyanResults(results: { uid: string; points: number }[], today: string) {
    if (!today || results.length === 0) return
    const byUid = new Map(results.map((r) => [r.uid, r.points]))
    const patch = (m: MonInstance): MonInstance => {
        if (!byUid.has(m.uid) || !(m.pendingSaiyanLevels ?? 0)) return m
        return {
            ...m,
            statPoints: (m.statPoints ?? 0) + (byUid.get(m.uid) ?? 0),
            pendingSaiyanLevels: undefined,
            lastLevelUpAt: today,
        }
    }
    st = { ...st, team: st.team.map(patch), pc: st.pc.map(patch) }
    emit()
}

/** Apprentissage en attente : un Daemon veut apprendre une attaque mais a 4 slots. */
export interface PendingLearn { uid: string; speciesId: string; name: string; moveId: string; moves: MoveSlot[] }

/** Liste des apprentissages en attente sur l'équipe (un par couple Daemon/attaque). */
export function pendingLearns(): PendingLearn[] {
    const out: PendingLearn[] = []
    for (const m of st.team) {
        if (!m.pendingMoves?.length) continue
        const name = m.nickname ?? getSpecies(m.speciesId)?.name ?? m.speciesId
        for (const moveId of m.pendingMoves) out.push({ uid: m.uid, speciesId: m.speciesId, name, moveId, moves: m.moves })
    }
    return out
}

/** Résout un apprentissage : slotIndex = capacité à remplacer, ou null = renoncer. */
export function resolveLearn(uid: string, moveId: string, slotIndex: number | null) {
    st = {
        ...st,
        team: st.team.map((m) => {
            if (m.uid !== uid) return m
            const pending = (m.pendingMoves ?? []).filter((id) => id !== moveId)
            let moves = m.moves
            if (slotIndex !== null && slotIndex >= 0 && slotIndex < m.moves.length) {
                const pp = getMove(moveId)?.pp ?? 5
                moves = m.moves.map((s, i) => (i === slotIndex ? { moveId, pp, ppMax: pp } : s))
            }
            return { ...m, moves, pendingMoves: pending.length ? pending : undefined }
        }),
    }
    emit()
}

export function usePlayer(): PlayerState {
    return useSyncExternalStore(subscribePlayer, getPlayer, getPlayer)
}
