// src/lib/gamebook/yellow/data/fishing.ts
//
// PÊCHE — la CANNE À PÊCHE (offerte par la Fashion Victim). S'utilise FACE À UN PLAN D'EAU (tuile "water" devant
// le joueur) → ferre un Daemon aquatique (combat sauvage). Le pool = les espèces EAU, miroir de HH_TYPE_POOLS.EAU
// (data/encounters.ts) pour rester cohérent avec les Hautes Herbes « eau ». Module PUR (testable, sans store).

export const FISHING_ROD_ITEM_ID = "canne_a_peche"

// ── ESPÈCES ──────────────────────────────────────────────────────────────────────────────────────────────────
/** GIGA-RARE pêchable : glass-cannon Roche/Eau. 1 % de touche, et NE REPOP PLUS une fois capturé. Niveau fixe 30. */
export const GEAUCKE_ID = "geaucke"
export const GEAUCKE_LEVEL = 30
/** Communs de pêche PAR RUN (braisécaille + l'espèce EAU du run) — défaut, pour les plans d'eau sans signature propre. */
export const FISHING_COMMONS: Record<string, readonly string[]> = {
    run1: ["braisecaille", "loutrille"],
    run2: ["braisecaille", "tetardoc"],
    run3: ["braisecaille", "gouttiny"],
}
/** COMMUN PÊCHÉ PAR PLAN D'EAU (choix Sartay 22/08) : chaque grand plan d'eau a SON espèce signature, qui REMPLACE
 *  le commun run-based. Les plans d'eau absents d'ici gardent FISHING_COMMONS[run]. (Les tiers rare Osquille/Rô et
 *  giga Geaucké restent universels.) */
export const FISHING_BY_MAP: Record<string, readonly string[]> = {
    yellow_route_nord: ["piouflot"],    // le lac de la Route Nord
    yellow_grotte: ["loutrille"],       // l'eau de la Grotte
    yellow_grotte_gelee: ["tetardoc"],  // l'eau de la Grotte Gelée
    yellow_cendreville: ["obscurene"],  // l'eau de la ville (Obscurène, Eau/Ténèbres, a quitté le manoir)
}
/** L'espèce commune ferrée : signature du plan d'eau (FISHING_BY_MAP) sinon le commun run-based. `rand`∈[0,1) → déterministe/testable. */
export function fishingCommon(mapId: string, run: string, rand: number): string {
    const pool = FISHING_BY_MAP[mapId] ?? FISHING_COMMONS[run] ?? FISHING_COMMONS.run1
    return pool[Math.min(pool.length - 1, Math.floor(Math.max(0, Math.min(0.999999, rand)) * pool.length))]
}
/** Le RARE du moment selon l'HEURE locale : Osquille de JOUR (8h-20h), Rô de NUIT (20h-8h). */
export function fishingRareOfHour(hour: number): string {
    const h = ((Math.floor(hour) % 24) + 24) % 24
    return h >= 8 && h < 20 ? "osquille" : "ro"
}

// ── TIRAGE DU TIER (par prise) ───────────────────────────────────────────────────────────────────────────────
export const FISHING_NOCATCH = 0.40    // « 60 s pour rien » : le plus souvent, ça ne mord pas
export const FISHING_GEAUCKE = 0.01     // Geaucké : giga-rare
export const FISHING_RARE_BASE = 0.06   // Osquille/Rô : base, ×(1 + dépassement de quota reps)
export type FishTier = "none" | "geaucke" | "rare" | "common"
/** Tire le TIER d'une prise. `rand`∈[0,1). `repsMult` = 1 + dépassement de quota (1→1.8). `geauckeAvailable` = false
 *  si Geaucké déjà capturé (sa proba retombe sur les communs). Le RARE est TOUJOURS dispo (Osquille jour / Rô nuit). */
export function fishingTier(rand: number, repsMult: number, geauckeAvailable: boolean): FishTier {
    const geaucke = geauckeAvailable ? FISHING_GEAUCKE : 0
    const rare = Math.min(0.3, FISHING_RARE_BASE * Math.max(1, repsMult))
    const r = Math.max(0, Math.min(0.999999, rand))
    if (r < FISHING_NOCATCH) return "none"
    if (r < FISHING_NOCATCH + geaucke) return "geaucke"
    if (r < FISHING_NOCATCH + geaucke + rare) return "rare"
    return "common"
}

// ── NIVEAU DES RARES (Osquille/Rô) : 50 % bande de badges, 50 % niveau moyen d'équipe ────────────────────────
const FISHING_BADGE_BANDS: ReadonlyArray<readonly [number, number]> = [[5, 15], [15, 30], [30, 45], [45, 60], [60, 75]]
/** Niveau d'un rare : 50 % → bande selon le nb de badges du run (1→5-15 … 5→60-75) ; 50 % → niveau moyen d'équipe. */
export function fishingRareLevel(badges: number, avgLevel: number, useAvgRand: number, bandRand: number): number {
    if (Math.max(0, Math.min(0.999999, useAvgRand)) < 0.5) return Math.max(2, Math.min(100, Math.round(avgLevel)))
    const b = Math.max(1, Math.min(5, Math.floor(badges)))
    const [lo, hi] = FISHING_BADGE_BANDS[b - 1]
    return Math.max(2, Math.min(100, lo + Math.floor(Math.max(0, Math.min(0.999999, bandRand)) * (hi - lo + 1))))
}

/** Niveau du poisson : calé sur le niveau du lead (un peu en dessous), dispersion ±2, borné [5, 100].
 *  `rand` ∈ [0,1) pour la dispersion → déterministe/testable. */
export function fishingLevel(leadLevel: number, rand: number): number {
    const spread = Math.floor(Math.max(0, Math.min(0.999999, rand)) * 5) - 2 // -2..+2
    return Math.max(5, Math.min(100, Math.floor(leadLevel) - 2 + spread))
}

/** Durée MAX d'une session (le chrono monte jusqu'ici). Le poisson mord AVANT en général ; l'atteindre = rare. */
export const FISHING_MAX_WAIT_SEC = 60
/** Durée (s) du mini-jeu de FERRAGE (mashing) quand ça mord. */
export const FISHING_REEL_SEC = 10
/** FERRAGE : bonus d'IV = +1 par tranche de 10 appuis (ajouté aux IV « prévus », cap 15 côté appelant). 0 appui géré à part. */
export function fishingReelBonus(taps: number): number { return Math.floor(Math.max(0, taps) / 10) }

/** IV « PRÉVUS » d'une prise : priorité au TEMPS D'ATTENTE (centrés sur biteAt/60, ±2 par stat, bornés 0-15).
 *  Le ferrage au mashing les remonte ensuite. Mutualisé entre le tirage normal et l'onboarding. */
export function fishingBaseIvs(biteAt: number, rand: () => number): { hp: number; atk: number; def: number; spe: number; spc: number } {
    const center = Math.round(Math.min(1, biteAt / FISHING_MAX_WAIT_SEC) * 15)
    const roll = () => Math.max(0, Math.min(15, center + Math.floor(rand() * 5) - 2))
    return { hp: roll(), atk: roll(), def: roll(), spe: roll(), spc: roll() }
}

/** ONBOARDING PÊCHE : les 2 premières parties À VIE sont scriptées (braisécaille garanti) pour donner envie de
 *  pêcher — 1re mord à 8 s, 2e à 21 s, puis le hasard reprend. Compteur via marqueurs (defeatedTrainers, sans champ save). */
export const FISHING_TUTORIAL: ReadonlyArray<{ biteAt: number; speciesId: string }> = [
    { biteAt: 8, speciesId: "braisecaille" },
    { biteAt: 21, speciesId: "braisecaille" },
]
export const FISHING_TUTORIAL_MARKER = "fishing_tuto_"
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
