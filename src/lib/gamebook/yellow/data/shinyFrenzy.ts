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

/** 🤫 SECRET — lit l'état de frénésie dans des flags de save BRUTS (JSON Prisma, côté serveur) : `{ until, left }`
 *  valides → l'état ; sinon null. Le serveur ne fait que LIRE la save (jamais l'écrire). */
export function frenzyFromFlags(flags: unknown): ShinyFrenzyState | null {
    const raw = (flags as { shinyFrenzy?: unknown } | null | undefined)?.shinyFrenzy as { until?: unknown; left?: unknown } | null | undefined
    if (!raw || typeof raw !== "object") return null
    const until = Number(raw.until), left = Number(raw.left)
    if (!Number.isFinite(until) || !Number.isFinite(left)) return null
    return { until, left }
}

/** 🥷 FRÉNÉSIE DU VOLEUR (vol 9, 31/10/2026) — lue dans l'état GLOBAL du Voleur, au HAUT de la save (`thief.lootFrenzy`) : valable
 *  quel que soit le monde actif. ⚠️ Pas d'import de data/thief (il importe ce module, et il pèserait sur la route serveur). */
export function thiefFrenzyFromFlags(flags: unknown): ShinyFrenzyState | null {
    const thief = (flags as { thief?: unknown } | null | undefined)?.thief
    if (!thief || typeof thief !== "object") return null
    return frenzyFromFlags({ shinyFrenzy: (thief as { lootFrenzy?: unknown }).lootFrenzy })
}

/** Les shinies d'un joueur en FRÉNÉSIE sont un secret entre lui et le Dieu Spaghetti (règle de Sartay, 15/10/2026) :
 *  AUCUNE fête communautaire (+50⚡ à tous), ni bonus de clan, ni prime de parrainage. Sans cette garde, 50 % de
 *  shiny = 40 annonces et 2 000⚡ pour tout le Nexus en dix minutes (constaté sur Jacanon). Même règle pour la Frénésie du
 *  Voleur — sauf quand elle DORT (run 3, rejeu) : un shiny croisé là n'est pas le sien et garde sa fête. */
export function shinyFeteSuppressed(flags: unknown, now: number): boolean {
    const world = (flags as { activeWorld?: unknown } | null | undefined)?.activeWorld
    const thiefAsleep = world === "run3" || world === "replay"
    return shinyFrenzyActive(frenzyFromFlags(flags), now) || (!thiefAsleep && shinyFrenzyActive(thiefFrenzyFromFlags(flags), now))
}
