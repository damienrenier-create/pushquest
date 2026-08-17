// src/lib/gamebook/yellow/frontier/espionApi.ts
//
// USINE — L'ESPION : client de /api/gamebook/yellow/espion.
//   • liste des joueurs espionnables (accès Zone de Combat) — gratuit
//   • VITRINE d'un joueur (sprites seulement) — gratuit
//   • RÉVÉLATION d'un Daemon précis (par uid) contre des JC (coût croissant) — payant

const BASE = "/api/gamebook/yellow/espion"

export interface EspionPlayer { userId: string; nickname: string; teamSize: number }
export interface EspionVitrineMon { uid: string; speciesId: string; level: number; shiny: boolean; zone: "team" | "pc" }
export interface EspionReveal {
    ok: boolean
    reason?: "insufficient" | "gone"
    nickname?: string
    mon?: unknown       // Daemon BRUT complet (hydraté par le client)
    cost?: number
    jc?: number
    spyCount?: number
}

export async function fetchEspionPlayers(): Promise<EspionPlayer[]> {
    try {
        const r = await fetch(BASE)
        const j = await r.json()
        return Array.isArray(j?.players) ? (j.players as EspionPlayer[]) : []
    } catch { return [] }
}

export async function fetchEspionVitrine(target: string): Promise<{ nickname: string; mons: EspionVitrineMon[] } | null> {
    try {
        const r = await fetch(`${BASE}?target=${encodeURIComponent(target)}`)
        const j = await r.json()
        if (!j?.ok) return null
        return { nickname: String(j.nickname ?? "Dresseur"), mons: Array.isArray(j.mons) ? (j.mons as EspionVitrineMon[]) : [] }
    } catch { return null }
}

export async function postEspionReveal(target: string, uid: string): Promise<EspionReveal> {
    try {
        const r = await fetch(BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target, uid }),
        })
        return (await r.json()) as EspionReveal
    } catch { return { ok: false } }
}
