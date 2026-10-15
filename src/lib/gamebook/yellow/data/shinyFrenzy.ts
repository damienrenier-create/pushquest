// ✨ FRÉNÉSIE SHINY — cadeau d'anniversaire du Dieu Spaghetti (Jacanon, 15/10/2026).
//
// « Le taux de pop de shiny va augmenter : 50 % de shiny durant 24 h, jusqu'à ce qu'il en capture 3. Peu importe
// combien il en croise, l'important c'est combien il en CAPTURE. Quand il en aura capturé 3, le taux revient à la
// normale. » — Sartay.
//
// Lecture retenue : la frénésie s'éteint à la PREMIÈRE des deux bornes — 3 captures, ou 24 h écoulées. Les shiny
// de la frénésie sont de VRAIS shiny (permanents, IV parfaits), pas des éphémères.
//
// Module PUR (l'instant est injecté) : le tirage vit dans encounters.finalizeSpawn, le décompte dans battleStore.

export const SHINY_FRENZY_CHANCE = 0.5
export const SHINY_FRENZY_DEFAULT_HOURS = 24
export const SHINY_FRENZY_DEFAULT_CAPTURES = 3

export interface ShinyFrenzyState {
    /** Fin de la fenêtre (epoch ms). */
    until: number
    /** Captures de shiny encore à réaliser avant que le taux ne revienne à la normale. */
    left: number
}

export function freshShinyFrenzy(now: number, hours: number = SHINY_FRENZY_DEFAULT_HOURS, captures: number = SHINY_FRENZY_DEFAULT_CAPTURES): ShinyFrenzyState {
    return { until: now + Math.max(1, hours) * 3_600_000, left: Math.max(1, Math.floor(captures)) }
}

/** La frénésie est-elle en cours ? (il reste des captures ET la fenêtre n'est pas close) */
export function shinyFrenzyActive(st: ShinyFrenzyState | null | undefined, now: number): boolean {
    return !!st && st.left > 0 && now < st.until
}

/** Probabilité de shiny à appliquer au pop, ou undefined pour laisser le taux normal (~1/512). */
export function shinyFrenzyChance(st: ShinyFrenzyState | null | undefined, now: number): number | undefined {
    return shinyFrenzyActive(st, now) ? SHINY_FRENZY_CHANCE : undefined
}

/** Un shiny vient d'être CAPTURÉ pendant la frénésie. Décompte ; `done` quand la 3ᵉ capture clôt la fête. */
export function onShinyCaptured(st: ShinyFrenzyState, now: number): { state: ShinyFrenzyState; done: boolean; left: number } {
    if (!shinyFrenzyActive(st, now)) return { state: st, done: false, left: st.left }
    const left = Math.max(0, st.left - 1)
    return { state: { ...st, left }, done: left === 0, left }
}

/** Réplique du Dieu Spaghetti à chaque capture de la frénésie. */
export function shinyFrenzyCaptureMessage(left: number): string {
    if (left <= 0) return "🍝 « Trois shiny dans ta besace… la fête est finie, mortel. Les étoiles reprennent leur rythme habituel. Joyeux anniversaire. »"
    return `🍝 « Un shiny de plus pour ton anniversaire ! Encore ${left} à capturer avant que les étoiles ne se calment. »`
}
