// src/lib/gamebook/yellow/data/fishing.ts
//
// PÊCHE — la CANNE À PÊCHE (offerte par la Fashion Victim). S'utilise FACE À UN PLAN D'EAU (tuile "water" devant
// le joueur) → ferre un Daemon aquatique (combat sauvage). Le pool = les espèces EAU, miroir de HH_TYPE_POOLS.EAU
// (data/encounters.ts) pour rester cohérent avec les Hautes Herbes « eau ». Module PUR (testable, sans store).

export const FISHING_ROD_ITEM_ID = "canne_a_peche"

/** Pool de pêche = espèces EAU pondérées (identique au carré EAU des Hautes Herbes). */
export const FISHING_POOL: ReadonlyArray<{ speciesId: string; weight: number }> = [
    { speciesId: "loutrille", weight: 100 },
    { speciesId: "piouflot", weight: 50 },
    { speciesId: "tetardoc", weight: 45 },
    { speciesId: "braisecaille", weight: 5 },
]

/** Tire une espèce EAU pondérée. `rand` ∈ [0,1). Déterministe pour un rand donné → testable. */
export function pickFishSpecies(rand: number): string {
    const total = FISHING_POOL.reduce((a, e) => a + e.weight, 0)
    let r = Math.max(0, Math.min(0.999999, rand)) * total
    for (const e of FISHING_POOL) {
        if (r < e.weight) return e.speciesId
        r -= e.weight
    }
    return FISHING_POOL[0].speciesId
}

/** Niveau du poisson : calé sur le niveau du lead (un peu en dessous), dispersion ±2, borné [5, 100].
 *  `rand` ∈ [0,1) pour la dispersion → déterministe/testable. */
export function fishingLevel(leadLevel: number, rand: number): number {
    const spread = Math.floor(Math.max(0, Math.min(0.999999, rand)) * 5) - 2 // -2..+2
    return Math.max(5, Math.min(100, Math.floor(leadLevel) - 2 + spread))
}

/** Durée MAX d'une session de pêche (le chrono monte jusqu'ici). Au-delà, moulinet automatique. */
export const FISHING_MAX_WAIT_SEC = 60
/** Shiny MAX atteignable en attendant tout le chrono (patience → chromatique, INDÉPENDANT des reps). */
export const FISHING_SHINY_MAX = 0.4

/** Probabilité que « ça morde » quand on remonte la ligne après `sec` d'attente : ~35 % tout de suite, 100 % dès ~10 s.
 *  → remonter trop vite peut ramener une ligne vide ; patienter un peu garantit une touche. */
export function fishingBiteChance(sec: number): number {
    const t = Math.max(0, Math.min(FISHING_MAX_WAIT_SEC, sec))
    return Math.max(0, Math.min(1, 0.35 + (t / 10) * 0.65))
}

/** Probabilité de SHINY selon l'attente : 0 à t=0, montée linéaire jusqu'à FISHING_SHINY_MAX à 60 s.
 *  « Plus le joueur attend, plus le Daemon est proche du shiny » — sans rapport avec les reps. */
export function fishingShinyChance(sec: number): number {
    const t = Math.max(0, Math.min(FISHING_MAX_WAIT_SEC, sec))
    return (t / FISHING_MAX_WAIT_SEC) * FISHING_SHINY_MAX
}
