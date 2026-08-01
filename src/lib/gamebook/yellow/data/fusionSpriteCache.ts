// src/lib/gamebook/yellow/data/fusionSpriteCache.ts
//
// FUSION — logique PURE du cache de sprites générés (aucune DB, aucun réseau → 100% testable).
//  • clé canonique ORDRE-INDÉPENDANT (A+B == B+A) ;
//  • politique de retry (max 2 tentatives facturées → FAILED définitif, jamais de boucle) ;
//  • transitions d'état.
// Le stockage (Prisma FusionSprite) et l'appel modèle vivent ailleurs (server-only). Ici = décisions pures.

export type FusionSpriteStatus = "PENDING" | "READY" | "FAILED"

/** Nb MAX d'appels API facturés pour une paire avant abandon définitif (FAILED). Borne le coût par paire. */
export const MAX_ATTEMPTS = 2

/** Clé de cache canonique : les 2 speciesId TRIÉS → A+B et B+A donnent la MÊME clé (donc le même sprite). */
export function fusionPairKey(aId: string, bId: string): string {
    return [aId, bId].sort().join("__")
}

/** Paire ordonnée canonique (1er = « dominant » pour la génération) → sprite déterministe quel que soit l'ordre d'entrée. */
export function canonicalPair(aId: string, bId: string): [string, string] {
    const [x, y] = [aId, bId].sort()
    return [x, y]
}

/** Peut-on (re)lancer une génération pour cette ligne ? READY/FAILED = NON (déterminisme + pas de boucle) ;
 *  absente = OUI ; PENDING = OUI tant que attempts < MAX. (Une régénération admin est un chemin séparé, forcé.) */
export function canGenerate(row: { status: FusionSpriteStatus; attempts: number } | null | undefined): boolean {
    if (!row) return true
    if (row.status === "READY" || row.status === "FAILED") return false
    return row.attempts < MAX_ATTEMPTS
}

/** État résultant d'une tentative : succès → READY ; échec → PENDING tant qu'il reste des essais, sinon FAILED. */
export function nextStatusAfterAttempt(prevAttempts: number, ok: boolean): { status: FusionSpriteStatus; attempts: number } {
    const attempts = prevAttempts + 1
    if (ok) return { status: "READY", attempts }
    return { status: attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING", attempts }
}

/** Reste-t-il du budget TOTAL (à vie) ? `spent` = SUM(attempts) sur toutes les paires (= images facturées). */
export function withinTotalBudget(spent: number, cap: number): boolean {
    return spent < cap
}
