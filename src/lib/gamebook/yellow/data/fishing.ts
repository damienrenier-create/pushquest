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

/** Durée MAX d'une session (le chrono monte jusqu'ici). Le poisson mord AVANT en général ; l'atteindre = rare. */
export const FISHING_MAX_WAIT_SEC = 60
/** PLANCHER de shiny = taux normal des rencontres sauvages (« comme les pas », cf. encounters.ts). */
export const FISHING_SHINY_BASE = 1 / 512
/** Proba de MORSURE par seconde → médiane ~8 s ; atteindre 60 s (shiny garanti) arrive ~0,7 % du temps (RARE). */
const FISHING_BITE_PER_SEC = 0.08
/** Raideur de la montée du shiny : reste ≈ plancher longtemps, n'explose vers 100 % que tout près de 60 s. */
const FISHING_SHINY_STEEP = 4

/** Instant (s) où le poisson MORD, tiré à la volée (loi géométrique → tôt en général, 60 s rarement). `rand`∈[0,1).
 *  Borné [2, 60]. Déterministe pour un `rand` donné → testable. */
export function rollBiteTime(rand: number): number {
    const r = Math.max(0, Math.min(0.999999, rand))
    const t = Math.ceil(Math.log(1 - r) / Math.log(1 - FISHING_BITE_PER_SEC))
    return Math.max(2, Math.min(FISHING_MAX_WAIT_SEC, t))
}

/** Proba de SHINY selon l'attente jusqu'à la morsure : PLANCHER = taux normal (comme les pas), montée RAIDE vers
 *  100 % (garanti) à 60 s. → la plupart des touches (précoces) restent au taux de base ; seule une attente rare
 *  (proche de 60 s) rapproche du « parfait ». « Plus le joueur attend, plus c'est shiny » — sans rapport avec les reps. */
export function fishingShinyChance(sec: number): number {
    const t = Math.max(0, Math.min(FISHING_MAX_WAIT_SEC, sec))
    return FISHING_SHINY_BASE + (1 - FISHING_SHINY_BASE) * Math.pow(t / FISHING_MAX_WAIT_SEC, FISHING_SHINY_STEEP)
}
