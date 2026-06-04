// src/lib/gamebook/yellow/store/playerStore.ts
//
// Nexus Jaune Éclair — état PERSISTANT du joueur : équipe (max 6), PC (réserve),
// objets. Store externe (useSyncExternalStore). Source de vérité hors combat ;
// le combat travaille sur une COPIE de l'équipe et resynchronise à la fin.

import { useSyncExternalStore } from "react"
import type { MonInstance, MoveSlot } from "../battle/types"
import { fullStats } from "../battle/stats"
import { getSpecies } from "../data/species"
import { getMove } from "../data/moves"
import { getItem } from "../data/items"
import { SAIYAN_POINT_VALUE } from "../data/saiyanConfig"
import { BADGE_REPS_CAP_BONUS } from "../data/badges"
import { getCt, canLearnCt, purchasableCts, type BadgeId } from "../data/cts"
import type { StatKey } from "../battle/types"
import { expForLevel, levelFromExp, applyExp, MAX_LEVEL, type ExpResult } from "../battle/xp"
import type { WildPlayerCtx } from "../data/encounters"

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
    /** Dernier jour où les reps de la veille ont été crédités (anti double-crédit). */
    creditedThrough: string
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
}

let st: PlayerState = { team: [], pc: [], items: {}, reps: 0, repsCap: 1000, creditedThrough: "", pastaBoughtToday: 0, pastaDayBonus: 0, defeatedTrainers: [], badges: [], wildCtx: null, introSeen: false }
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
        pastaBoughtToday: p.pastaBoughtToday ?? st.pastaBoughtToday ?? 0, pastaDayBonus: p.pastaDayBonus ?? st.pastaDayBonus ?? 0,
        defeatedTrainers: p.defeatedTrainers ?? [], badges: p.badges ?? st.badges ?? [], wildCtx: p.wildCtx ?? st.wildCtx ?? null,
        introSeen: p.introSeen ?? st.introSeen ?? false,
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
    st = { team: [], pc: [], items: {}, reps: 0, repsCap: st.repsCap, creditedThrough: "", pastaBoughtToday: 0, pastaDayBonus: 0, defeatedTrainers: [], badges: [], wildCtx: st.wildCtx, introSeen: false }
    emit()
}

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

/** Remplace l'équipe (utilisé pour resynchroniser après un combat : XP/PV/niveaux). */
export function setTeam(team: MonInstance[]) {
    st = { ...st, team }
    emit()
}

/** Ajoute un Daemon capturé (équipe si place, sinon PC). */
export function addCaught(mon: MonInstance): "team" | "pc" {
    const owned = { ...mon, owned: true }
    if (st.team.length < TEAM_MAX) {
        st = { ...st, team: [...st.team, owned] }
        emit()
        return "team"
    }
    st = { ...st, pc: [...st.pc, owned] }
    emit()
    return "pc"
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

/**
 * Tick quotidien (1×/jour) : crédite les reps de la veille (plafonné au cap),
 * remet à zéro le compteur d'achats de Super Pasta, et augmente de +3 le prix
 * plancher du Super Pasta à chaque nouveau jour (sauf le tout premier jour).
 */
export function creditDailyReps(yesterdayReps: number, today: string) {
    if (st.creditedThrough === today) return // déjà tické aujourd'hui
    const firstEver = st.creditedThrough === ""
    const credited = Math.min(st.repsCap, st.reps + Math.max(0, Math.floor(yesterdayReps)))
    st = {
        ...st,
        reps: credited,
        creditedThrough: today,
        pastaBoughtToday: 0,
        pastaDayBonus: firstEver ? st.pastaDayBonus : st.pastaDayBonus + SUPER_PASTA_DAILY_INCREASE,
    }
    emit()
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

/** Renomme un Daemon (équipe ou PC). Vide → réinitialise au nom d'espèce. Max 12 car. */
export function renameDaemon(uid: string, nickname: string) {
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
    if (!purchasableCts(st.badges).some((c) => c.id === ctId)) return { ok: false, reason: "locked" }
    const pools: ("team" | "pc")[] = ["team", "pc"]
    for (const pool of pools) {
        const arr = st[pool]
        const idx = arr.findIndex((m) => m.uid === uid)
        if (idx < 0) continue
        const m = arr[idx]
        const sp = getSpecies(m.speciesId)
        if (!sp || !canLearnCt(sp, ct)) return { ok: false, reason: "incompatible" }
        if (m.moves.some((s) => s.moveId === ct.moveId) || m.pendingMoves?.includes(ct.moveId)) return { ok: false, reason: "known" }
        if (st.reps < ct.price) return { ok: false, reason: "reps" }
        const free = m.moves.length < 4
        const pp = getMove(ct.moveId)?.pp ?? 5
        const updated: MonInstance = free
            ? { ...m, moves: [...m.moves, { moveId: ct.moveId, pp, ppMax: pp }] }
            : { ...m, pendingMoves: [...(m.pendingMoves ?? []), ct.moveId] }
        const next = arr.slice()
        next[idx] = updated
        st = { ...st, reps: st.reps - ct.price, [pool]: next }
        emit()
        return { ok: true, queued: !free }
    }
    return { ok: false, reason: "introuvable" }
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
