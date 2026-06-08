// src/lib/gamebook/yellow/storage/save.ts
//
// Nexus Jaune Éclair — modèle de sauvegarde (sérialisation pure, React-free).
// Stocké côté DB dans GamebookProgress.flags de la ligne chapterId="yellow"
// (isolée de l'arc v3 → aucune migration). Versionné pour rester compatible.

import type { MonInstance, StatKey, MajorStatus } from "../battle/types"

export interface YellowSave {
    version: number
    team: MonInstance[]
    /** Réserve (PC) au-delà des 6 de l'équipe. */
    pc: MonInstance[]
    items: Record<string, number>
    /** Portefeuille reps (pool stocké, plafonné). */
    reps: number
    /** Plafond de stockage des reps (augmenté par les badges d'arène). */
    repsCap: number
    /** Dernier jour tické (YYYY-MM-DD) — reset quotidien pasta/sbire (plus le crédit reps). */
    creditedThrough: string
    /** High-water des reps banquées en énergie (total déjà crédité). -1 = non initialisé. */
    repsBankedTotal: number
    /** Cadeau de bienvenue (100 énergie) déjà réclamé ? */
    welcomeGift: boolean
    /** Nb de Super Pastas achetés aujourd'hui (reset quotidien). */
    pastaBoughtToday: number
    /** Bonus cumulé du prix plancher du Super Pasta (+3/jour). */
    pastaDayBonus: number
    pokedex: { seen: string[]; caught: string[] }
    /** Ids des dresseurs déjà battus (ne se recombattent pas). */
    defeatedTrainers: string[]
    /** Badges d'arène gagnés. */
    badges: string[]
    /** La cinématique d'intro (choix du starter) a-t-elle déjà été jouée ? */
    introSeen: boolean
    /** Nb de victoires sur le sbire AUJOURD'HUI (reset quotidien ; plafond 2/jour). */
    sbireDefeatsToday: number
    /** Nb total de victoires sur le sbire (cumulatif → cycle des explications). */
    sbireWinsTotal: number
    /** Réputation PvP : matchs + usages (Daemon fétiche / attaque favorite). */
    pvpStats: { wins: number; losses: number; forfeits: number; daemonUse: Record<string, number>; moveUse: Record<string, number> }
    /** ACE (rival) : pic de niveau (ratchet) + box des contres + défaites + jour. */
    acePeakLevel: number
    aceBox: Record<string, number>
    /** Taille d'équipe d'ACE = pic (cliquet) de la taille d'équipe du joueur, ne redescend jamais. */
    aceTeamSizePeak: number
    aceWins: number
    aceDefeatedDate: string
    /** CT cadeaux possédées (trophées de boss). */
    ownedCts: string[]
}

export const SAVE_VERSION = 1

export function emptySave(): YellowSave {
    return { version: SAVE_VERSION, team: [], pc: [], items: {}, reps: 0, repsCap: 1000, creditedThrough: "", repsBankedTotal: -1, welcomeGift: false, pastaBoughtToday: 0, pastaDayBonus: 0, pokedex: { seen: [], caught: [] }, defeatedTrainers: [], badges: [], introSeen: false, sbireDefeatsToday: 0, sbireWinsTotal: 0, pvpStats: { wins: 0, losses: 0, forfeits: 0, daemonUse: {}, moveUse: {} }, acePeakLevel: 0, aceBox: {}, aceTeamSizePeak: 3, aceWins: 0, aceDefeatedDate: "", ownedCts: [] }
}

const STAT_KEYS: StatKey[] = ["hp", "atk", "def", "spe", "spc"]
const MAJOR: MajorStatus[] = ["NONE", "BURN", "POISON", "TOXIC", "PARALYSIS", "SLEEP", "FREEZE"]

/** Parse défensif d'une instance (tolère les vieux/mauvais formats). */
function parseMon(raw: unknown): MonInstance | null {
    if (!raw || typeof raw !== "object") return null
    const o = raw as Record<string, unknown>
    if (typeof o.speciesId !== "string" || typeof o.level !== "number") return null
    const ivsRaw = (o.ivs ?? {}) as Record<string, unknown>
    const ivs = {} as Record<StatKey, number>
    for (const k of STAT_KEYS) ivs[k] = typeof ivsRaw[k] === "number" ? (ivsRaw[k] as number) : 15
    const moves = Array.isArray(o.moves)
        ? (o.moves as unknown[]).map((m) => {
            const mm = m as Record<string, unknown>
            const ppMax = typeof mm.ppMax === "number" ? mm.ppMax : 5
            return {
                moveId: String(mm.moveId ?? ""),
                pp: typeof mm.pp === "number" ? mm.pp : ppMax,
                ppMax,
            }
        }).filter((m) => m.moveId)
        : []
    const status = MAJOR.includes(o.status as MajorStatus) ? (o.status as MajorStatus) : "NONE"
    return {
        uid: typeof o.uid === "string" ? o.uid : `${o.speciesId}-${o.level}-${Math.floor(Number(o.exp) || 0)}`,
        speciesId: o.speciesId,
        nickname: typeof o.nickname === "string" ? o.nickname : undefined,
        level: Math.max(1, Math.min(100, Math.floor(o.level as number))),
        exp: typeof o.exp === "number" ? o.exp : 0,
        ivs,
        currentHp: typeof o.currentHp === "number" ? o.currentHp : 1,
        status,
        statusCounter: typeof o.statusCounter === "number" ? o.statusCounter : 0,
        moves,
        owned: o.owned === true,
        statPoints: typeof o.statPoints === "number" ? Math.max(0, Math.floor(o.statPoints)) : undefined,
        allocated: parseAllocated(o.allocated),
        ev: parseAllocated(o.ev),
        pendingSaiyanLevels: typeof o.pendingSaiyanLevels === "number" ? Math.max(0, Math.floor(o.pendingSaiyanLevels)) : undefined,
        lastLevelUpAt: typeof o.lastLevelUpAt === "string" ? o.lastLevelUpAt : undefined,
    }
}

/** Parse défensif des points alloués (Saiyan) : sous-ensemble de stats → entiers >= 0. */
function parseAllocated(raw: unknown): Partial<Record<StatKey, number>> | undefined {
    if (!raw || typeof raw !== "object") return undefined
    const out: Partial<Record<StatKey, number>> = {}
    for (const k of STAT_KEYS) {
        const v = (raw as Record<string, unknown>)[k]
        if (typeof v === "number" && v > 0) out[k] = Math.floor(v)
    }
    return Object.keys(out).length ? out : undefined
}

function strArr(raw: unknown): string[] {
    return Array.isArray(raw) ? (raw as unknown[]).filter((x): x is string => typeof x === "string") : []
}

/** Record<string,number> défensif (compteurs d'usage). */
function numRec(raw: unknown): Record<string, number> {
    const out: Record<string, number> = {}
    if (raw && typeof raw === "object") {
        for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
            if (typeof v === "number" && v > 0) out[k] = Math.floor(v)
        }
    }
    return out
}

function parsePvpStats(raw: unknown): YellowSave["pvpStats"] {
    const o = (raw ?? {}) as Record<string, unknown>
    const n = (v: unknown) => (typeof v === "number" ? Math.max(0, Math.floor(v)) : 0)
    return { wins: n(o.wins), losses: n(o.losses), forfeits: n(o.forfeits), daemonUse: numRec(o.daemonUse), moveUse: numRec(o.moveUse) }
}

/** Parse défensif d'une sauvegarde complète. */
export function parseSave(raw: unknown): YellowSave {
    if (!raw || typeof raw !== "object") return emptySave()
    const o = raw as Record<string, unknown>
    const team = Array.isArray(o.team) ? (o.team as unknown[]).map(parseMon).filter((m): m is MonInstance => m !== null) : []
    const pc = Array.isArray(o.pc) ? (o.pc as unknown[]).map(parseMon).filter((m): m is MonInstance => m !== null) : []
    const dex = (o.pokedex ?? {}) as Record<string, unknown>
    const items: Record<string, number> = {}
    if (o.items && typeof o.items === "object") {
        for (const [k, v] of Object.entries(o.items as Record<string, unknown>)) {
            if (typeof v === "number") items[k] = v
        }
    }
    return {
        version: typeof o.version === "number" ? o.version : SAVE_VERSION,
        team,
        pc,
        items,
        reps: typeof o.reps === "number" ? Math.max(0, Math.floor(o.reps)) : 0,
        repsCap: typeof o.repsCap === "number" ? Math.max(1, Math.floor(o.repsCap)) : 1000,
        creditedThrough: typeof o.creditedThrough === "string" ? o.creditedThrough : "",
        repsBankedTotal: typeof o.repsBankedTotal === "number" ? Math.floor(o.repsBankedTotal) : -1,
        welcomeGift: o.welcomeGift === true,
        pastaBoughtToday: typeof o.pastaBoughtToday === "number" ? Math.max(0, Math.floor(o.pastaBoughtToday)) : 0,
        pastaDayBonus: typeof o.pastaDayBonus === "number" ? Math.max(0, Math.floor(o.pastaDayBonus)) : 0,
        pokedex: { seen: strArr(dex.seen), caught: strArr(dex.caught) },
        defeatedTrainers: strArr(o.defeatedTrainers),
        badges: strArr(o.badges),
        introSeen: o.introSeen === true,
        sbireDefeatsToday: typeof o.sbireDefeatsToday === "number" ? Math.max(0, Math.floor(o.sbireDefeatsToday)) : 0,
        sbireWinsTotal: typeof o.sbireWinsTotal === "number" ? Math.max(0, Math.floor(o.sbireWinsTotal)) : 0,
        pvpStats: parsePvpStats(o.pvpStats),
        acePeakLevel: typeof o.acePeakLevel === "number" ? Math.max(0, Math.floor(o.acePeakLevel)) : 0,
        aceBox: numRec(o.aceBox),
        aceTeamSizePeak: typeof o.aceTeamSizePeak === "number" ? Math.max(3, Math.min(6, Math.floor(o.aceTeamSizePeak))) : 3,
        aceWins: typeof o.aceWins === "number" ? Math.max(0, Math.floor(o.aceWins)) : 0,
        aceDefeatedDate: typeof o.aceDefeatedDate === "string" ? o.aceDefeatedDate : "",
        ownedCts: strArr(o.ownedCts),
    }
}

/** Retire l'état runtime de combat (stages/volatiles) pour persister une instance propre. */
export function toMonInstance(m: MonInstance & { stages?: unknown; volatiles?: unknown }): MonInstance {
    return {
        uid: m.uid, speciesId: m.speciesId, nickname: m.nickname, level: m.level, exp: m.exp,
        ivs: { ...m.ivs }, currentHp: m.currentHp, status: m.status, statusCounter: m.statusCounter,
        moves: m.moves.map((mv) => ({ ...mv })), owned: m.owned,
        pendingMoves: m.pendingMoves && m.pendingMoves.length ? [...m.pendingMoves] : undefined,
        statPoints: m.statPoints && m.statPoints > 0 ? m.statPoints : undefined,
        allocated: m.allocated && Object.keys(m.allocated).length ? { ...m.allocated } : undefined,
        ev: m.ev && Object.keys(m.ev).length ? { ...m.ev } : undefined,
        pendingSaiyanLevels: m.pendingSaiyanLevels && m.pendingSaiyanLevels > 0 ? m.pendingSaiyanLevels : undefined,
        lastLevelUpAt: m.lastLevelUpAt,
    }
}
