// src/lib/gamebook/yellow/frontier/frontierApi.ts
//
// ZONE DE COMBAT — client fetch du profil serveur (Jetons de Combat + records).
// Centralise les appels à /api/gamebook/yellow/frontier (route gatée ; neutre tant que
// la table FrontierProfile n'existe pas → ces helpers dégradent proprement).

const BASE = "/api/gamebook/yellow/frontier"

export interface FrontierProfile {
    jc: number
    towerBest: number
    factoryBest: number
    domeBest: number
    symbols: string[]
}

const EMPTY: FrontierProfile = { jc: 0, towerBest: 0, factoryBest: 0, domeBest: 0, symbols: [] }

export async function fetchFrontierProfile(): Promise<FrontierProfile> {
    try {
        const r = await fetch(BASE)
        const j = await r.json()
        return (j?.profile as FrontierProfile) ?? { ...EMPTY }
    } catch { return { ...EMPTY } }
}

/** Persiste la fin d'une série : crédite les JC gagnés + met à jour le meilleur record de la salle. */
export async function postRecordRun(input: { mode: string; streak: number; jcEarned: number; symbol?: string }): Promise<FrontierProfile | null> {
    try {
        const r = await fetch(BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "recordRun", ...input }),
        })
        const j = await r.json()
        return (j?.profile as FrontierProfile) ?? null
    } catch { return null }
}

/** Dépense des JC (boutique). Renvoie le succès + le nouveau solde. */
export async function postSpend(amount: number): Promise<{ ok: boolean; jc: number }> {
    try {
        const r = await fetch(BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "spend", amount }),
        })
        const j = await r.json()
        return { ok: !!j?.ok, jc: typeof j?.jc === "number" ? j.jc : 0 }
    } catch { return { ok: false, jc: 0 } }
}
