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
    replaysUsed: number
}

const EMPTY: FrontierProfile = { jc: 0, towerBest: 0, factoryBest: 0, domeBest: 0, symbols: [], replaysUsed: 0 }

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

/** Dépense des JC (boutique). `symbol` optionnel = achat d'un symbole de prestige (ajouté atomiquement).
 *  Renvoie le succès + le nouveau solde (+ la liste des symboles si fournie). */
export async function postSpend(amount: number, symbol?: string): Promise<{ ok: boolean; jc: number; symbols?: string[] }> {
    try {
        const r = await fetch(BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "spend", amount, ...(symbol ? { symbol } : {}) }),
        })
        const j = await r.json()
        return { ok: !!j?.ok, jc: typeof j?.jc === "number" ? j.jc : 0, symbols: Array.isArray(j?.symbols) ? j.symbols : undefined }
    } catch { return { ok: false, jc: 0 } }
}

/** REJEU (« run bis ») : débite le coût JC CROISSANT du prochain rejeu (calculé serveur) + incrémente le compteur global.
 *  `reason: "insufficient"` = pas assez de JC ; "no-table"/"error" = champ pas encore créé / réseau → l'appelant laisse
 *  passer le rejeu GRATUITEMENT (dégradation propre avant db:push). */
export async function postReplaySpend(): Promise<{ ok: boolean; jc: number; replaysUsed: number; cost: number; reason?: string }> {
    try {
        const r = await fetch(BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "replaySpend" }),
        })
        const j = await r.json()
        return {
            ok: !!j?.ok,
            jc: typeof j?.jc === "number" ? j.jc : 0,
            replaysUsed: typeof j?.replaysUsed === "number" ? j.replaysUsed : 0,
            cost: typeof j?.cost === "number" ? j.cost : 0,
            reason: typeof j?.reason === "string" ? j.reason : undefined,
        }
    } catch { return { ok: false, jc: 0, replaysUsed: 0, cost: 0, reason: "error" } }
}
