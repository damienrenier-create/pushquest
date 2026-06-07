// src/lib/gamebook/yellow/data/encounters.ts
//
// Nexus Jaune Éclair — rencontres sauvages (Daemons ORIGINAUX).
// Probabilité par famille = base_rareté × influence_biome (4 paliers) × bonus_joueur.
// Niveau corrélé au 1er Daemon de l'équipe. Tout est pur/déterministe (RNG injecté).

import { createMonInstance } from "../battle/factory"
import type { MonInstance } from "../battle/types"
import { biomeDistance, affinityMult, repulsionMult, type Biome } from "./biomes"
import { rollIvs } from "./ivConfig"

// Rareté de base (poids avant modulation).
const COMMON = 100, UNCOMMON = 45, RARE = 14, VERY_RARE = 5

type PlayerTag = "combat" | "rocheSol" | "elec" | "rare"

interface WildEntry {
    speciesId: string
    base: number
    affinity?: Biome[]    // biomes qui l'attirent (densité ↑ en approchant)
    repulsion?: Biome[]   // biomes qu'il fuit (densité ↓ en approchant)
    player?: PlayerTag    // type influencé par les stats PushQuest
    rare?: boolean        // popе 1-2 niveaux au-dessus du lead
}

interface Zone { rate: number; pool: WildEntry[] }

/** Stats PushQuest normalisées 0..1 (sauf quotaReached). Couche méta. */
export interface WildPlayerCtx {
    pompes: number       // 0..1 (effort pompes du jour)
    squats: number       // 0..1
    quotaReached: boolean
    overshoot: number    // 0..1 (dépassement du quota)
    quotaRatio: number   // 0..1 (total du jour / quota, capé) → pilote le plancher d'IV
}

export interface EncounterCtx {
    mapId: string
    x: number
    y: number
    leadLevel: number          // niveau du 1er Daemon de l'équipe
    rng?: () => number         // [0,1) — défaut Math.random
    player?: WildPlayerCtx
}

const ZONES: Record<string, Zone> = {
    yellow_route_nord: {
        rate: 0.14,
        pool: [
            // Communs (passe-partout / habitats larges)
            { speciesId: "plumiot", base: COMMON, affinity: ["mountain", "sapin"], repulsion: ["water"] },
            { speciesId: "couperin", base: COMMON, player: "combat" },
            { speciesId: "cailloutchi", base: COMMON, affinity: ["mountain"], player: "rocheSol" },
            { speciesId: "ruffiant", base: COMMON, affinity: ["sapin"] },
            { speciesId: "cornaissant", base: COMMON, affinity: ["mountain", "sapin"], repulsion: ["water"] },
            // Peu communs (élémentaires, denses dans leur biome)
            { speciesId: "electroatiss", base: UNCOMMON, player: "elec" },
            { speciesId: "loutrille", base: UNCOMMON, affinity: ["water"] },
            { speciesId: "piouflot", base: UNCOMMON, affinity: ["water"] },
            { speciesId: "pampousse", base: UNCOMMON, affinity: ["sapin"] },
            { speciesId: "fennaise", base: UNCOMMON, affinity: ["mountain"], repulsion: ["water"] },
            { speciesId: "lavapetit", base: UNCOMMON, affinity: ["mountain"], repulsion: ["water"] },
            { speciesId: "auroruff", base: UNCOMMON, affinity: ["mountain"] },
            { speciesId: "broussours", base: UNCOMMON, affinity: ["sapin"], player: "combat" },
            { speciesId: "trolystrik", base: UNCOMMON, affinity: ["mountain"], player: "combat" },
            { speciesId: "forgeotin", base: UNCOMMON, affinity: ["mountain", "sapin"], player: "combat" },
            // Rares
            { speciesId: "sporbeo", base: RARE, affinity: ["sapin"], player: "rare", rare: true },
            { speciesId: "nouillon", base: RARE, player: "rare", rare: true },
            // Très rare
            { speciesId: "draclet", base: VERY_RARE, affinity: ["mountain"], repulsion: ["water"], player: "rare", rare: true },
        ],
    },
    // GROTTE ROCHEUSE : habitat des Daemons Roche (+ une rareté spectrale).
    yellow_grotte: {
        rate: 0.16,
        pool: [
            { speciesId: "mottoche", base: COMMON },          // le « Magicarpe » rocheux
            { speciesId: "cailloutchi", base: COMMON, player: "rocheSol" },
            { speciesId: "rembodo", base: UNCOMMON },         // fossile
            { speciesId: "limaroche", base: UNCOMMON },       // roche/psy
            { speciesId: "marmoterre", base: UNCOMMON },      // roche/glace
            { speciesId: "lavapetit", base: UNCOMMON },       // roche/feu
            { speciesId: "tetardoc", base: UNCOMMON, affinity: ["water"] }, // roche/eau près de la mare
            { speciesId: "revemante", base: RARE, player: "rare", rare: true },
            { speciesId: "draclet", base: VERY_RARE, player: "rare", rare: true },
        ],
    },
}

export function hasEncounters(mapId: string): boolean {
    return mapId in ZONES
}

/** Bonus joueur (plafonné ×1.8) selon les stats PushQuest. */
function playerMult(entry: WildEntry, p?: WildPlayerCtx): number {
    if (!p || !entry.player) return 1
    let m = 1
    if (entry.player === "combat") m *= 1 + Math.min(0.8, Math.max(0, p.pompes))
    else if (entry.player === "rocheSol") m *= 1 + Math.min(0.8, Math.max(0, p.squats))
    else if (entry.player === "elec") m *= p.quotaReached ? 1.5 : 1
    else if (entry.player === "rare") m *= 1 + Math.min(0.8, Math.max(0, p.overshoot))
    return Math.min(1.8, m)
}

/** Poids final d'une entrée à une position donnée. */
function entryWeight(entry: WildEntry, mapId: string, x: number, y: number, p?: WildPlayerCtx): number {
    let w = entry.base
    for (const b of entry.affinity ?? []) w *= affinityMult(biomeDistance(mapId, x, y, b))
    for (const b of entry.repulsion ?? []) w *= repulsionMult(biomeDistance(mapId, x, y, b))
    return w * playerMult(entry, p)
}

const intIn = (rng: () => number, min: number, max: number) => min + Math.floor(rng() * (max - min + 1))

/**
 * Tire (ou non) une rencontre sauvage. Renvoie un Daemon prêt au combat, ou null.
 * Le niveau suit le 1er Daemon de l'équipe (rares : +1 à +2).
 */
export function rollWildEncounter(ctx: EncounterCtx): MonInstance | null {
    const zone = ZONES[ctx.mapId]
    if (!zone) return null
    const rng = ctx.rng ?? Math.random
    if (rng() >= zone.rate) return null

    const weights = zone.pool.map((e) => entryWeight(e, ctx.mapId, ctx.x, ctx.y, ctx.player))
    const total = weights.reduce((a, w) => a + w, 0)
    if (total <= 0) return null

    let r = rng() * total
    let idx = 0
    for (let i = 0; i < zone.pool.length; i++) {
        if (r < weights[i]) { idx = i; break }
        r -= weights[i]
    }
    const entry = zone.pool[idx]

    let level = ctx.leadLevel + intIn(rng, -2, 1)
    if (entry.rare) level += intIn(rng, 1, 2)
    level = Math.max(2, Math.min(100, level))

    // IV "génétiques" pilotés par l'effort du jour (proximité du quota → meilleur plancher).
    // Sans données d'effort (hors-ligne), plancher médian (0.5) : ni puni ni maximal.
    const quotaRatio = ctx.player ? ctx.player.quotaRatio : 0.5
    const overshoot = ctx.player ? ctx.player.overshoot : 0
    const ivsByStat = rollIvs(rng, quotaRatio, overshoot)

    return createMonInstance(entry.speciesId, level, { ivsByStat })
}

/** Exposé pour les tests/outils : poids de chaque espèce à une position. */
export function debugWeights(mapId: string, x: number, y: number, player?: WildPlayerCtx): Record<string, number> {
    const zone = ZONES[mapId]
    if (!zone) return {}
    const out: Record<string, number> = {}
    for (const e of zone.pool) out[e.speciesId] = entryWeight(e, mapId, x, y, player)
    return out
}
