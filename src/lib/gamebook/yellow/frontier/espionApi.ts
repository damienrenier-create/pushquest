// src/lib/gamebook/yellow/frontier/espionApi.ts
//
// USINE — L'ESPION : client de /api/gamebook/yellow/espion.
//   • liste des joueurs espionnables (accès Zone de Combat) — gratuit
//   • VITRINE de l'ÉQUIPE portée (sprites seulement) — GRATUIT
//   • accès à la BOÎTE (PC) — PAYANT (somme des niveaux du PC)
//   • RÉVÉLATION d'un Daemon précis (par uid, équipe OU boîte) contre des JC (coût croissant) — payant

const BASE = "/api/gamebook/yellow/espion"

export interface EspionPlayer { userId: string; nickname: string; teamSize: number; boxSize: number; boxCost: number }
export interface EspionVitrineMon { uid: string; speciesId: string; level: number; shiny: boolean; zone: "team" | "pc" }
export interface EspionAccess { ok: boolean; reason?: "insufficient"; nickname?: string; mons?: EspionVitrineMon[]; spyCount?: number; jc?: number; cost?: number; boxCost?: number; boxSize?: number }
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

/** VITRINE ÉQUIPE (GRATUITE) : sprites de l'équipe portée + coût/taille de la BOÎTE + spyCount + solde JC. */
export async function postEspionAccess(target: string): Promise<EspionAccess> {
    try {
        const r = await fetch(BASE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "access", target }) })
        return (await r.json()) as EspionAccess
    } catch { return { ok: false } }
}

/** ACCÈS À LA BOÎTE (PAYANT) : débite la somme des niveaux du PC → sprites de la boîte entière. */
export async function postEspionAccessBox(target: string): Promise<EspionAccess> {
    try {
        const r = await fetch(BASE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "accessBox", target }) })
        return (await r.json()) as EspionAccess
    } catch { return { ok: false } }
}

/** Coût d'une révélation : 1 JC par NIVEAU + frais de dossier 10×(spyCount+1). (Doit refléter le calcul serveur.) */
export const espionRevealCost = (level: number, spyCount: number) => Math.max(1, Math.floor(level || 1)) + 10 * (Math.max(0, spyCount) + 1)

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
