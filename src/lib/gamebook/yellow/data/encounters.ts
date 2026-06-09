// src/lib/gamebook/yellow/data/encounters.ts
//
// Nexus Jaune Éclair — rencontres sauvages (Daemons ORIGINAUX).
// Probabilité par famille = base_rareté × influence_biome (4 paliers) × bonus_joueur.
// Niveau corrélé au 1er Daemon de l'équipe. Tout est pur/déterministe (RNG injecté).

import { createMonInstance } from "../battle/factory"
import type { MonInstance } from "../battle/types"
import { biomeDistance, affinityMult, repulsionMult, type Biome } from "./biomes"
import { rollIvs } from "./ivConfig"
import { speciesAtLevel } from "./ace"

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

interface Zone { rate: number; pool: WildEntry[]; minLevel?: number }

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
    levelCap?: number          // plafond de niveau (bridé par les badges, cf. wildLevelCap)
}

/**
 * Plafond de niveau des Daemons sauvages selon la progression (badges) :
 * - avant l'arène Plante : N≤12
 * - Plante battue, avant l'arène Roche : N≤17
 * - Roche battue : N≤30 (placeholder, à étendre avec les arènes suivantes)
 * S'applique à la Route Nord ET à la Grotte.
 */
export function wildLevelCap(badges: readonly string[]): number {
    if (!badges.includes("plante")) return 12
    if (!badges.includes("roche")) return 17
    return 30
}

/** Zones (mapId) où une espèce apparaît à l'état sauvage — pour la fiche Pokédex. */
export function speciesZones(speciesId: string): string[] {
    return Object.keys(ZONES).filter((mapId) => ZONES[mapId].pool.some((e) => e.speciesId === speciesId))
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
        minLevel: 5, // donjon gated (badge Plante) → pas de bébés niv 2
        pool: [
            // 🪨 ROCHE (la grotte) — repulsion water pour laisser le LAC à l'eau (2 biomes).
            { speciesId: "mottoche", base: 180, repulsion: ["water"] },                       // « Magicarpe » rocheux : COMMUN ++
            { speciesId: "cailloutchi", base: 60, repulsion: ["water"], player: "rocheSol" }, // déjà commun dehors → moins ici
            { speciesId: "rembodo", base: UNCOMMON, repulsion: ["water"] },                   // Roche/Vol
            { speciesId: "lavapetit", base: UNCOMMON, repulsion: ["water"] },                 // Roche/Feu
            { speciesId: "limaroche", base: UNCOMMON, repulsion: ["water"] },                 // Roche/Psy
            { speciesId: "marmoterre", base: UNCOMMON, repulsion: ["water"] },                // Roche/Glace
            { speciesId: "quadroc", base: UNCOMMON, repulsion: ["water"] },                   // lignée diamant
            // 💧 EAU (le lac, haut-gauche) — affinity water = dense au bord, fond en s'éloignant.
            { speciesId: "loutrille", base: 40, affinity: ["water"] },                        // commun au bord, rare loin
            { speciesId: "tetardoc", base: RARE, affinity: ["water"] },                       // le PONT eau/roche, concentré au bord du lac
            // 👻🐉 LE FOND
            { speciesId: "revemante", base: UNCOMMON },                                       // fantôme des cavernes
            { speciesId: "draclet", base: VERY_RARE, player: "rare", rare: true },            // la pépite (Vol/Dragon)
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

    // Niveau sauvage : 3 BANDES de probabilité calées sur le niveau du LEAD (L).
    //   33% « proche » (90-100% de L) · 33% (66-99% de L) · 34% (33-66% de L).
    const L = ctx.leadLevel
    const lerp = (a: number, b: number) => a + (b - a) * rng()
    const roll = rng()
    const frac = roll < 0.33 ? lerp(0.90, 1.00) : roll < 0.66 ? lerp(0.66, 0.99) : lerp(0.33, 0.66)
    let level = Math.round(L * frac)
    if (entry.rare) level += intIn(rng, 1, 2)                        // un rare sauvage = un cran au-dessus
    if (ctx.levelCap != null) level = Math.min(level, ctx.levelCap)  // bridage par badges (arène) — conservé
    level = Math.max(zone.minLevel ?? 2, Math.min(100, level))      // plancher (zone) → plafond 100

    // IV "génétiques" pilotés par l'effort du jour (proximité du quota → meilleur plancher).
    // Sans données d'effort (hors-ligne), plancher médian (0.5) : ni puni ni maximal.
    const quotaRatio = ctx.player ? ctx.player.quotaRatio : 0.5
    const overshoot = ctx.player ? ctx.player.overshoot : 0
    const ivsByStat = rollIvs(rng, quotaRatio, overshoot)

    // Stade d'évolution cohérent avec le niveau tiré : jamais de stade impossible
    // à l'état sauvage (ex. Mottoche N13 → Quadroc). On évolue l'espèce de base.
    return createMonInstance(speciesAtLevel(entry.speciesId, level), level, { ivsByStat })
}

/** Exposé pour les tests/outils : poids de chaque espèce à une position. */
export function debugWeights(mapId: string, x: number, y: number, player?: WildPlayerCtx): Record<string, number> {
    const zone = ZONES[mapId]
    if (!zone) return {}
    const out: Record<string, number> = {}
    for (const e of zone.pool) out[e.speciesId] = entryWeight(e, mapId, x, y, player)
    return out
}
