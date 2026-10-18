// 🐈‍⬛ GALIJAH — RÉGIME QUOTIDIEN à partir de 200 ESPÈCES (décision Sartay, 18/10/2026).
//
// Jusqu'à 199 espèces, Galijah suit les PALIERS (150 → 199 : une apparition par tranche de 10 espèces, 25 %/combat sur
// l'île, jamais au 1er combat du jour — cf. playerStore.galijahTier). À PARTIR DE 200 espèces capturées, tant qu'il n'est
// pas capturé : chaque jour, il est PLANQUÉ derrière un numéro de pop de l'Île Émeraude tiré entre 1 et 50 — le joueur
// qui enchaîne les rencontres sur l'île finit toujours par le croiser dans la journée — et il n'apparaît qu'UNE fois par
// jour (manqué = à demain, nouveau tirage).
//
// Le tirage du jour est PERSISTÉ dans la save (pas de re-tirage au rechargement) et les pops de l'île sont comptés.
// Module PUR : l'horloge et le RNG sont injectés ; le jour = date ISO UTC, comme tous les marqueurs quotidiens du jeu.

export const GALIJAH_DAILY_THRESHOLD = 200 // espèces différentes au Pokédex (toutes méthodes) → bascule en régime quotidien
export const GALIJAH_DAILY_MAX_POP = 50    // le numéro de pop cible est tiré dans [1, 50]

export interface GalijahDailyState {
    day: string       // "YYYY-MM-DD" (UTC) du tirage
    target: number    // numéro de pop de l'île (1-50) auquel Galijah apparaît
    pops: number      // pops de l'île déjà comptés ce jour
    appeared: boolean // déjà apparu aujourd'hui (capturé ou non) → plus rien jusqu'à demain
}

/** Jour ISO (UTC), la même clé que les marqueurs quotidiens (`ile_enc_<jour>`…). */
export function isoDay(now: number = Date.now()): string { return new Date(now).toISOString().slice(0, 10) }

/** Le régime quotidien s'applique-t-il ? ≥ 200 espèces ET Galijah pas encore capturé. */
export function galijahDailyRegime(caught: readonly string[]): boolean {
    return caught.length >= GALIJAH_DAILY_THRESHOLD && !caught.includes("galijah")
}

/** Nouveau tirage du jour : numéro de pop cible uniforme dans [1, 50]. */
export function freshGalijahDaily(day: string, rng: () => number = Math.random): GalijahDailyState {
    const r = Math.floor(rng() * GALIJAH_DAILY_MAX_POP)
    return { day, target: 1 + Math.min(GALIJAH_DAILY_MAX_POP - 1, Math.max(0, r)), pops: 0, appeared: false }
}

/** L'état valable pour `day` : celui en save s'il est du jour, sinon un tirage neuf (le tirage de la veille est périmé). */
export function galijahDailyFor(st: GalijahDailyState | null | undefined, day: string, rng: () => number = Math.random): GalijahDailyState {
    return st && st.day === day ? st : freshGalijahDaily(day, rng)
}

/** Un pop de l'île a lieu : compte-le et dis si c'est GALIJAH. Il apparaît au pop n° `target` (ou au premier pop qui le
 *  dépasse, si un compte a été raté), une seule fois par jour. */
export function galijahDailyPop(st: GalijahDailyState | null | undefined, day: string, rng: () => number = Math.random): { state: GalijahDailyState; spawn: boolean } {
    const cur = galijahDailyFor(st, day, rng)
    const pops = cur.pops + 1
    const spawn = !cur.appeared && pops >= cur.target
    return { state: { ...cur, pops, appeared: cur.appeared || spawn }, spawn }
}

/** Peut-il encore apparaître aujourd'hui ? (pas encore apparu ce jour — un état d'un autre jour ne compte pas). */
export function galijahDailyAvailable(st: GalijahDailyState | null | undefined, day: string): boolean {
    return !(st && st.day === day && st.appeared)
}
