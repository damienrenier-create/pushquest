"use client"

// Nexus Jaune Éclair — utilitaires multijoueur partagés.

// ⚠️ VERSION DE PROTOCOLE PvP : À INCRÉMENTER à CHAQUE modification du moteur de
// combat (engine.ts), de resolveTurnPvp, du format des messages réseau, ou de
// toute logique qui influe sur le déterminisme. Deux clients de versions
// différentes refusent de se battre (sinon désync silencieuse — cf. note casino-pvp).
export const MP_VERSION = "mp-2026-06-06.1"

/** Le mode debug multijoueur est-il actif ? (?mpdebug dans l'URL, ou localStorage). */
export function mpDebugEnabled(): boolean {
    if (typeof window === "undefined") return false
    try {
        return new URLSearchParams(window.location.search).has("mpdebug")
            || window.localStorage.getItem("mpdebug") === "1"
    } catch {
        return false
    }
}

/** Log réseau de diagnostic (silencieux sauf mode debug). Tag court + données. */
export function mpLog(tag: string, ...args: unknown[]): void {
    if (!mpDebugEnabled()) return
    // eslint-disable-next-line no-console
    console.log(`%c[MP ${tag}]`, "color:#d89028;font-weight:bold", ...args)
}
