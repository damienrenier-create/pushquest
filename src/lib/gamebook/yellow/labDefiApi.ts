// src/lib/gamebook/yellow/labDefiApi.ts
//
// Nexus Jaune Éclair — client de l'endpoint de validation des défis PHYSIQUES du labo.
// (Le défi CT et le casino sont 100 % client → pas concernés.)

export interface LabDefiStartResp { ok: boolean; snapshot?: number; now?: string }
export interface LabDefiCheckResp { ok: boolean; validated?: boolean; delta?: number; maxSet?: number; total?: number; quota?: number; target?: number; expired?: boolean }

const ENDPOINT = "/api/gamebook/yellow/lab-defi"

/** Lance un défi physique côté serveur (snapshot pour pushup1h, heure serveur de départ). */
export async function postLabDefiStart(kind: string): Promise<LabDefiStartResp> {
    try {
        const r = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", kind }) })
        if (!r.ok) return { ok: false }
        return await r.json()
    } catch { return { ok: false } }
}

/** Valide un défi physique côté serveur (vraies reps). */
export async function postLabDefiCheck(kind: string, startSnapshot?: number, startedAt?: string): Promise<LabDefiCheckResp> {
    try {
        const r = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "check", kind, startSnapshot, startedAt }) })
        if (!r.ok) return { ok: false, validated: false }
        return await r.json()
    } catch { return { ok: false, validated: false } }
}
