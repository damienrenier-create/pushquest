// src/lib/gamebook/yellow/frontier/espionApi.ts
//
// USINE — L'ESPION : client des appels /api/gamebook/yellow/espion (liste des joueurs + révélation payante d'un
//   roster). Dégrade proprement (liste vide / échec silencieux) si la table n'existe pas encore.

const BASE = "/api/gamebook/yellow/espion"

export interface EspionPlayer { userId: string; nickname: string; teamSize: number }

/** Roster révélé : mons BRUTS de la save de la cible (le client les hydrate via fullStats). */
export interface EspionReveal {
    ok: boolean
    reason?: "insufficient"
    nickname?: string
    team?: unknown[]
    pc?: unknown[]
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

export async function postEspionReveal(target: string): Promise<EspionReveal> {
    try {
        const r = await fetch(BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target }),
        })
        return (await r.json()) as EspionReveal
    } catch { return { ok: false } }
}
