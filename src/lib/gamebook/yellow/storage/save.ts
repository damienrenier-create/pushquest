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
    /** Monnaie du chapitre (gagnée en combat, dépensée à la boutique). */
    money: number
    pokedex: { seen: string[]; caught: string[] }
    /** Ids des dresseurs déjà battus (ne se recombattent pas). */
    defeatedTrainers: string[]
    /** La cinématique d'intro (choix du starter) a-t-elle déjà été jouée ? */
    introSeen: boolean
}

export const SAVE_VERSION = 1

export function emptySave(): YellowSave {
    return { version: SAVE_VERSION, team: [], pc: [], items: {}, money: 0, pokedex: { seen: [], caught: [] }, defeatedTrainers: [], introSeen: false }
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
    }
}

function strArr(raw: unknown): string[] {
    return Array.isArray(raw) ? (raw as unknown[]).filter((x): x is string => typeof x === "string") : []
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
        money: typeof o.money === "number" ? Math.max(0, Math.floor(o.money)) : 0,
        pokedex: { seen: strArr(dex.seen), caught: strArr(dex.caught) },
        defeatedTrainers: strArr(o.defeatedTrainers),
        introSeen: o.introSeen === true,
    }
}

/** Retire l'état runtime de combat (stages/volatiles) pour persister une instance propre. */
export function toMonInstance(m: MonInstance & { stages?: unknown; volatiles?: unknown }): MonInstance {
    return {
        uid: m.uid, speciesId: m.speciesId, nickname: m.nickname, level: m.level, exp: m.exp,
        ivs: { ...m.ivs }, currentHp: m.currentHp, status: m.status, statusCounter: m.statusCounter,
        moves: m.moves.map((mv) => ({ ...mv })), owned: m.owned,
    }
}
