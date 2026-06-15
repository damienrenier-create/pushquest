// src/lib/gamebook/yellow/data/encounters.ts
//
// Nexus Jaune Éclair — rencontres sauvages (Daemons ORIGINAUX).
// Probabilité par famille = base_rareté × influence_biome (4 paliers) × bonus_joueur.
// Niveau corrélé au 1er Daemon de l'équipe. Tout est pur/déterministe (RNG injecté).

import { createMonInstance } from "../battle/factory"
import { getMove } from "./moves"
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
    // --- Règles de NIVEAU/ÉVO par espèce (ex. Centrale) ---
    levelFixed?: number           // niveau IMPOSÉ (ex. Zappeuréal 40, Thundah 50) — ignore scaling + caps
    levelRange?: [number, number] // niveau tiré dans [min,max] (ex. Bélunode 5-15) — ignore scaling + caps
    levelMode?: "weakestTeam" | "strongestTeam" // niveau = Daemon le + faible (Namicha) / le + fort (Vipember) de l'équipe
    levelBonus?: number           // décalage appliqué au levelMode (ex. Vipember = strongestTeam +5)
    levelMax?: number             // plafond spécifique à l'espèce (ex. Jerbiwat 20)
    noEvolve?: boolean            // garde l'espèce telle quelle (pas de speciesAtLevel → ex. Namicha jamais Namizeus)
    quotaRateMult?: number        // ×poids d'apparition si quota du jour atteint (ex. Bélunode ×3)
    // --- Règles de COMBAT/CAPTURE par espèce (attachées au sauvage spawné, lues par le moteur) ---
    openMirage?: number           // ouvre le combat par N Mirage forcés (ex. Namicha 1, Thundah 2)
    openMoves?: string[]          // ouvre le combat par CES moves forcés (injectés au moveset, ex. Bouh = ["detonation"])
    fleeMaxTurns?: number         // fuit AU PLUS TARD après ce nb de tours (ex. Boltah 5, Heatah 3) — tiré dans [⌈max/2⌉, max]
    captureMinBallBonus?: number  // capture IMPOSSIBLE si ballBonus de la Ball < cette valeur (ex. Zappeuréal = Hyper Ball+ → 4)
    captureMult?: number          // ×<1 → capture PLUS DURE (ex. Thundah, Bélunode)
    captureRequiresStatus?: boolean // capture IMPOSSIBLE sans statut majeur sur la cible (légendaire, ex. Goshendofy)
    captureStatusBypassesBall?: boolean // un statut majeur shunte captureMinBallBonus (Super Ball+ OU statut, ex. Bouh)
}

/** Carré d'herbes hautes = 1 PALIER de niveau : plage de colonnes + 5 bandes de niveau (band 0 en bas). */
interface TrainingSquare { cols: [number, number]; bands: ReadonlyArray<readonly [number, number]> }
/** GRILLE D'ENTRAÎNEMENT : 3 carrés = 3 PALIERS (gauche→droite, niveaux croissants). Chaque carré
 *  affiche UN type/jour (rotation déterministe par date), niveau DÉTERMINISTE par la LIGNE (band).
 *  Le légendaire (Goshendofy) y rôde, + fréquent en herbe BASSE (palier 1, bandes basses). */
interface TrainingGrid {
    bottomRow: number                          // y de la ligne band-0 (la + basse) ; band = bottomRow - y
    squares: TrainingSquare[]                  // 3 paliers (chacun : colonnes + 5 bandes de niveau)
    types: readonly string[]                   // types en ROTATION QUOTIDIENNE (1 type/carré/jour)
    typePools: Record<string, WildEntry[]>     // type → pool de base (pondéré rareté → les rares restent rares)
    highOnlyTypes?: readonly string[]          // types jamais au palier 1 (ex. ROCHE → ≥ palier 2)
    legendary?: WildEntry                      // Goshendofy (capture gatée Ball+statut via ses champs)
    legendaryDenomByBand?: number[]            // dénom de proba par band [bas..haut]
    legendaryTierMult?: number[]               // ×dénom par palier (tier) → raréfié en montant de palier
}

interface Zone { rate: number; pool: WildEntry[]; minLevel?: number; maxLevel?: number; trainingGrid?: TrainingGrid }

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
    weakestTeamLevel?: number  // niveau du Daemon le + FAIBLE de l'équipe (pour levelMode "weakestTeam")
    strongestTeamLevel?: number // niveau du Daemon le + FORT de l'équipe (pour levelMode "strongestTeam", ex. Vipember +5)
    rng?: () => number         // [0,1) — défaut Math.random
    player?: WildPlayerCtx
    levelCap?: number          // plafond de niveau (bridé par les badges, cf. wildLevelCap)
    encounterCount?: number    // nb total de sauvages déjà croisés → rampe d'accueil (5+5 premiers)
    dayKey?: string            // "YYYY-MM-DD" → rotation quotidienne des types (hautes herbes). Vide = jour fixe.
}

/**
 * Plafond de niveau des Daemons sauvages selon la progression (badges) :
 * - avant l'arène Plante : N≤12
 * - Plante battue, avant l'arène Roche : N≤17
 * - Roche battue, avant l'arène Feu : N≤30
 * - Feu battue, avant l'arène Électrique : N≤45
 * - Électrique battue : N≤60 (placeholder, à étendre avec les arènes suivantes)
 * S'applique à la Route Nord ET à la Grotte.
 */
export function wildLevelCap(badges: readonly string[]): number {
    if (!badges.includes("plante")) return 12
    if (!badges.includes("roche")) return 17
    if (!badges.includes("feu")) return 30
    if (!badges.includes("elec")) return 45
    return 60
}

/** Zones (mapId) où une espèce apparaît à l'état sauvage — pour la fiche Pokédex. */
export function speciesZones(speciesId: string): string[] {
    return Object.keys(ZONES).filter((mapId) => {
        const z = ZONES[mapId]
        if (z.pool.some((e) => e.speciesId === speciesId)) return true
        const tg = z.trainingGrid
        if (tg) {
            if (tg.legendary?.speciesId === speciesId) return true
            if (Object.values(tg.typePools).some((p) => p.some((e) => e.speciesId === speciesId))) return true
        }
        return false
    })
}

// HAUTES HERBES — 10 types en ROTATION quotidienne. Exclus : Psy/Spectre/Élec (réservés aux bâtiments) ;
// Normal (trop peu d'espèces → plumiot rejoint Vol) ; Dragon (pas de carré, draclet pop rare Route Nord).
const HAUTES_HERBES_TYPES = ["VOL", "EAU", "PLANTE", "FEU", "COMBAT", "SOL", "ROCHE", "POISON", "GLACE", "INSECTE"] as const
// Pools de BASE par type (formes de base → speciesAtLevel les fait évoluer selon le niveau de la bande).
// Poids = rareté (commun ~100 · secondaire ~45-70 · rare ~14 · très rare ~5) → les rares restent rares.
const HH_TYPE_POOLS: Record<string, WildEntry[]> = {
    VOL: [{ speciesId: "plumiot", base: 100 }, { speciesId: "cornaissant", base: 60 }, { speciesId: "piouflot", base: 45 }, { speciesId: "rembodo", base: 45 }, { speciesId: "colibraise", base: 45 }],
    EAU: [{ speciesId: "loutrille", base: 100 }, { speciesId: "piouflot", base: 50 }, { speciesId: "tetardoc", base: 45 }, { speciesId: "braisecaille", base: 5 }],
    PLANTE: [{ speciesId: "pampousse", base: 100 }, { speciesId: "broussours", base: 45 }, { speciesId: "tamanpousse", base: 14 }],
    FEU: [{ speciesId: "fennaise", base: 100 }, { speciesId: "pyrozly", base: 100 }, { speciesId: "brasicow", base: 45 }, { speciesId: "colibraise", base: 45 }, { speciesId: "lavapetit", base: 45 }, { speciesId: "braisecaille", base: 5 }],
    COMBAT: [{ speciesId: "couperin", base: 100 }, { speciesId: "broussours", base: 60 }, { speciesId: "forgeotin", base: 45 }, { speciesId: "brasicow", base: 45 }],
    SOL: [{ speciesId: "cailloutchi", base: 100 }, { speciesId: "mottoche", base: 70 }],
    ROCHE: [{ speciesId: "cailloutchi", base: 100 }, { speciesId: "mottoche", base: 70 }, { speciesId: "lavapetit", base: 45 }, { speciesId: "rembodo", base: 45 }, { speciesId: "limaroche", base: 45 }, { speciesId: "marmoterre", base: 45 }, { speciesId: "tetardoc", base: 30 }],
    POISON: [{ speciesId: "cornaissant", base: 100 }, { speciesId: "sporbeo", base: 45 }],
    GLACE: [{ speciesId: "auroruff", base: 100 }, { speciesId: "marmoterre", base: 45 }],
    INSECTE: [{ speciesId: "ruffiant", base: 100 }, { speciesId: "revemante", base: 45 }],
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
            { speciesId: "tetardoc", base: UNCOMMON, affinity: ["water"] },                   // le PONT eau/roche : COMMUN au lac, plus rare loin
            { speciesId: "braisecaille", base: VERY_RARE, affinity: ["water"] },              // tortue FEU/EAU : TRÈS RARE au lac (même zone que les têtards)
            // 🍄👻🐉 LE FOND (champignons-fantômes + dragon caché)
            { speciesId: "sporbeo", base: UNCOMMON },                                         // champignon-spectre (→ Lampignon → Mycédruide)
            { speciesId: "revemante", base: UNCOMMON },                                       // insecte-fantôme des cavernes
            { speciesId: "draclet", base: VERY_RARE, player: "rare", rare: true },            // la pépite (Vol/Dragon)
        ],
    },
    // CENDREVILLE : ville-miroir cendrée, gated par le Badge Flamme (ACE).
    // Faune SPECTRE / FEU / ÉLECTRIK — rend enfin capturables les orphelins Feu.
    yellow_cendreville: {
        rate: 0.15,
        minLevel: 16, // ville de milieu de partie (Badge Flamme requis) → pas de bébés
        pool: [
            // 🔥 FEU — les orphelins enfin capturables (cœur des cendres)
            { speciesId: "pyrozly", base: COMMON },                                // Feu pur, passe-partout des cendres
            { speciesId: "brasicow", base: UNCOMMON, player: "combat" },           // Feu/Combat
            { speciesId: "colibraise", base: UNCOMMON, affinity: ["mountain"] },   // Vol/Feu
            { speciesId: "blaziper", base: RARE, player: "rare", rare: true },     // Psy/Feu (pépite)
            // 👻 SPECTRE — la brume de cendre
            { speciesId: "sporbeo", base: UNCOMMON },                              // Spectre/Poison
            { speciesId: "revemante", base: UNCOMMON },                            // Insecte/Spectre
            { speciesId: "necarabee", base: RARE },                               // Insecte/Spectre
            // ⚡ ÉLECTRIK — courts-circuits dans les ruines
            { speciesId: "electroatiss", base: COMMON, player: "elec" },
            { speciesId: "couranti", base: UNCOMMON, player: "elec" },
            { speciesId: "zappeureal", base: RARE, player: "elec" },
            { speciesId: "oragron", base: VERY_RARE, player: "elec", rare: true }, // Vol/Élec (pépite)
        ],
    },
    // CENTRALE ÉLECTRIQUE (intérieur de Cendreville) : DONJON 100% ÉLECTRIK. Rend enfin
    // capturables Jerbiwat (Psy/Élec), la lignée Boltah (Feu/Élec, la + rapide) et Namicha
    // (Spectre/Élec). Sol = "grass" → tout le sol praticable déclenche (façon grotte).
    yellow_centrale: {
        rate: 0.16,
        minLevel: 12,  // plancher des espèces génériques (les autres ont leurs propres règles)
        maxLevel: 25,  // CAP GÉNÉRAL de la Centrale (sauf niveaux imposés ci-dessous)
        pool: [
            // % visés (par rencontre) : Jerbiwat ~51 · Électroatiss ~20 · Namicha ~12 · Boltah ~10
            // · Heatah ~3 · Thundah ~1,1 · Zappeuréal ~0,7 · Bélunode ~1 (×3 si quota).
            { speciesId: "jerbiwat", base: 230, levelMax: 20 },                              // le + commun, ≤20
            { speciesId: "electroatiss", base: 90 },                                         // commun, ≤25
            { speciesId: "namicha", base: 55, levelMode: "weakestTeam", noEvolve: true, openMirage: 1 }, // = + faible équipe, jamais Namizeus, ouvre par 1 Mirage
            { speciesId: "boltah", base: 45, noEvolve: true, fleeMaxTurns: 5 },              // peu commun, ≤25, fuit ≤5 tours
            { speciesId: "heatah", base: 14, noEvolve: true, fleeMaxTurns: 3 },              // rare, ≤25, fuit ≤3 tours
            { speciesId: "thundah", base: 5, levelFixed: 50, noEvolve: true, openMirage: 2, captureMult: 0.35 }, // très rare, N50, 2 Mirage, ne fuit jamais, dur à capturer
            { speciesId: "zappeureal", base: 3, levelFixed: 40, noEvolve: true, captureMinBallBonus: 4 }, // très très rare, N40, Hyper Ball+ obligatoire
            { speciesId: "belunode", base: 4, levelRange: [5, 15], noEvolve: true, quotaRateMult: 3, captureMult: 0.4 }, // bébé rare, N5-15, ×3 quota → évolue en Sonarque (16) → Léviathonn (34)
        ],
    },
    // MAISON HANTÉE (intérieur de Cendreville) : DONJON 100% SPECTRE/PSY, brouillard + labyrinthe
    // invisible. Rend enfin capturables les stades finals spectres. Règles validées par Sartay.
    yellow_maison_hantee: {
        rate: 0.12,    // salle en croix ~80 cases → taux modéré (sous Centrale 0.16)
        minLevel: 14,
        maxLevel: 30,  // cap des espèces SCALANTES (Sporbéo/Revemante/Nouillon/Blaziper) ; les autres ont leurs overrides
        pool: [
            // % visés ≈ Brook 36 · Hibouh 28 · Sporbéo 11,6 · Revemante 11,6 · Nouillon 3,6 · Blaziper 3,1
            // · Namicha 2,1 · Flamaspic 1,3 · Regnantaur 0,8 · Enclumind 0,8 · Vipember 0,5 · Bouh 2,6.
            { speciesId: "brook", base: 140, levelFixed: 20, noEvolve: true },                       // LE + commun, niv 20
            { speciesId: "hibouh", base: 110, levelRange: [15, 18], noEvolve: true },                // très commun, un peu + bas
            { speciesId: "sporbeo", base: 45 },                                                      // UNCOMMON (= taux d'origine), scaling/évolue
            { speciesId: "revemante", base: 45 },                                                    // UNCOMMON (= origine), scaling/évolue
            { speciesId: "bouh", base: 10, levelFixed: 30, noEvolve: true, openMoves: ["detonation"], captureMinBallBonus: 2, captureStatusBypassesBall: true }, // rare, niv 30, KAMIKAZE (1 PV), capture = Super Ball+ OU statut
            { speciesId: "nouillon", base: 14 },                                                     // RARE (= origine), scaling
            { speciesId: "blaziper", base: 12, noEvolve: true, fleeMaxTurns: 6 },                    // rare, fuit en 3-6 tours
            { speciesId: "namicha", base: 8, levelMode: "weakestTeam", noEvolve: true, openMirage: 1 }, // très rare, = règles Centrale (= + faible équipe, 1 Mirage, jamais Namizeus)
            { speciesId: "flamaspic", base: 5, levelFixed: 33, noEvolve: true, fleeMaxTurns: 4 },     // + rare, fuit en 2-4 tours
            { speciesId: "regnantaur", base: 3, levelFixed: 45, noEvolve: true, captureMult: 0.3 },   // très rare, niv 45, très dur à capturer
            { speciesId: "enclumind", base: 3, levelFixed: 45, noEvolve: true, captureMult: 0.3 },    // très rare, niv 45, très dur à capturer
            { speciesId: "vipember", base: 2, levelMode: "strongestTeam", levelBonus: 5, noEvolve: true, captureMult: 0.25 }, // LE + rare, +5 du meilleur de l'équipe, très dur
        ],
    },
    // HAUTES HERBES DU NORD (plaine d'entraînement de Cendreville) : 3 carrés = 3 PALIERS de niveau
    // (palier 1 N3-18 · palier 2 N18-38 · palier 3 N38-50). NIVEAU choisi par la LIGNE (band 0 bas →
    // band 4 haut). Chaque carré affiche UN type qui TOURNE chaque jour (rotation déterministe par date,
    // cf. dailyTypes). Goshendofy y rôde, + fréquent en herbe BASSE (palier 1, bandes basses).
    yellow_hautes_herbes: {
        rate: 0.25, pool: [],
        trainingGrid: {
            bottomRow: 6,
            types: HAUTES_HERBES_TYPES,
            typePools: HH_TYPE_POOLS,
            highOnlyTypes: ["ROCHE"], // Roche jamais au palier 1 (pas de bébé rock niv 3) → ≥ palier 2, cohérent « > 30 »
            squares: [
                { cols: [2, 6], bands: [[3, 6], [6, 9], [9, 12], [12, 15], [15, 18]] },        // PALIER 1 (3-18)
                { cols: [11, 15], bands: [[18, 22], [22, 26], [26, 30], [30, 34], [34, 38]] }, // PALIER 2 (18-38, les ~20 suivants)
                { cols: [20, 24], bands: [[38, 41], [41, 44], [44, 47], [47, 50], [50, 50]] }, // PALIER 3 (38 → 50)
            ],
            // Goshendofy : niveau fixe 50 (vrai légendaire), Hyper Nexus Ball (ballBonus≥5) + STATUT requis, capture ×0.5.
            legendary: { speciesId: "goshendofy", base: 1, levelFixed: 50, noEvolve: true, captureMinBallBonus: 5, captureRequiresStatus: true, captureMult: 0.5 },
            legendaryDenomByBand: [100, 200, 300, 500, 1000], // band 0 (herbe basse) → band 4
            legendaryTierMult: [1, 4, 8],                     // palier 1 (commun) → palier 3 (quasi introuvable)
        },
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
    // Boost d'apparition lié au quota (ex. Bélunode ×3 quand le quota du jour est atteint).
    if (entry.quotaRateMult && p?.quotaReached) w *= entry.quotaRateMult
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

    // GRILLE D'ENTRAÎNEMENT (hautes herbes du nord) : niveau choisi par la LIGNE, type par le CARRÉ.
    if (zone.trainingGrid) return rollTrainingGrid(zone.trainingGrid, ctx, rng)

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
    // RAMPE D'ACCUEIL : les 5 PREMIERS sauvages croisés = 2 niveaux SOUS le lead, les 5
    // SUIVANTS = 1 niveau sous, pour laisser le temps de progresser. Au-delà : bandes normales.
    const ec = ctx.encounterCount ?? 999
    let level: number
    if (ec < 5) {
        level = L - 2
    } else if (ec < 10) {
        level = L - 1
    } else {
        const lerp = (a: number, b: number) => a + (b - a) * rng()
        const roll = rng()
        const frac = roll < 0.33 ? lerp(0.90, 1.00) : roll < 0.66 ? lerp(0.66, 0.99) : lerp(0.33, 0.66)
        level = Math.round(L * frac)
    }
    if (entry.rare) level += intIn(rng, 1, 2)                          // un rare sauvage = un cran au-dessus
    if (ctx.levelCap != null) level = Math.min(level, ctx.levelCap)    // bridage par badges (arène) — conservé
    if (zone.maxLevel != null) level = Math.min(level, zone.maxLevel)  // cap de ZONE (ex. Centrale 25)
    if (entry.levelMax != null) level = Math.min(level, entry.levelMax)// cap d'ESPÈCE (ex. Jerbiwat 20)
    level = Math.max(zone.minLevel ?? 2, Math.min(100, level))        // plancher (zone) → plafond 100
    // OVERRIDES de niveau par espèce (bypassent scaling + caps ci-dessus) :
    if (entry.levelFixed != null) level = entry.levelFixed                                   // ex. Thundah 50, Zappeuréal 40
    else if (entry.levelRange) level = intIn(rng, entry.levelRange[0], entry.levelRange[1])  // ex. Bélunode 5-15
    else if (entry.levelMode === "weakestTeam" && ctx.weakestTeamLevel != null) level = ctx.weakestTeamLevel // ex. Namicha
    else if (entry.levelMode === "strongestTeam" && ctx.strongestTeamLevel != null) level = ctx.strongestTeamLevel + (entry.levelBonus ?? 0) // ex. Vipember = + fort équipe +5
    level = Math.max(1, Math.min(100, level))

    return finalizeSpawn(entry, level, rng, ctx)
}

// RNG déterministe (mulberry32) + hash de chaîne (FNV-1a) → graine de la rotation quotidienne des types.
function hhMulberry32(seed: number): () => number {
    let a = seed >>> 0
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
function hashStr(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }

/** Types du jour pour les paliers [1,2,3] : tirage DÉTERMINISTE par date (mélange Fisher-Yates),
 *  3 types DISTINCTS ; les highOnlyTypes (ex. ROCHE) ne tombent jamais sur le palier 1. */
function dailyTypes(dayKey: string, types: readonly string[], highOnly: readonly string[]): string[] {
    const rng = hhMulberry32(hashStr(dayKey || "1970-01-01"))
    const pool = [...types]
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1));[pool[i], pool[j]] = [pool[j], pool[i]] }
    const lowIdx = pool.findIndex((t) => !highOnly.includes(t)) // palier 1 : 1er type "bas-OK"
    const tier1 = pool.splice(lowIdx < 0 ? 0 : lowIdx, 1)[0]
    return [tier1, pool[0], pool[1]]
}

/** Exposé pour l'UI/tests : les 3 types affichés ce jour (palier 1 → 3). */
export function hautesHerbesTypesForDay(dayKey: string): string[] {
    const tg = ZONES.yellow_hautes_herbes.trainingGrid
    return tg ? dailyTypes(dayKey, tg.types, tg.highOnlyTypes ?? []) : []
}

/** GRILLE D'ENTRAÎNEMENT : niveau = la LIGNE (band, via les bandes du palier), type = le carré du JOUR.
 *  Le légendaire y rôde, + fréquent en herbe BASSE (band bas × palier bas). */
function rollTrainingGrid(tg: TrainingGrid, ctx: EncounterCtx, rng: () => number): MonInstance | null {
    const band = Math.max(0, Math.min(4, tg.bottomRow - ctx.y))
    const sqIdx = tg.squares.findIndex((s) => ctx.x >= s.cols[0] && ctx.x <= s.cols[1])
    if (sqIdx < 0) return null // sur une allée (herbe basse) → pas de rencontre (gameStore ne roll que sur grassTall)
    const sq = tg.squares[sqIdx]
    // LÉGENDAIRE : gradient herbe basse (band) × palier (tier) → + fréquent au bas du palier 1.
    if (tg.legendary && tg.legendaryDenomByBand) {
        const denom = (tg.legendaryDenomByBand[band] ?? 1000) * (tg.legendaryTierMult?.[sqIdx] ?? 1)
        if (rng() < 1 / denom) return finalizeSpawn(tg.legendary, tg.legendary.levelFixed ?? 50, rng, ctx)
    }
    // TYPE DU JOUR pour ce palier → pioche pondérée dans son pool ; NIVEAU déterministe par la bande.
    const type = dailyTypes(ctx.dayKey ?? "", tg.types, tg.highOnlyTypes ?? [])[sqIdx] ?? tg.types[0]
    const pool = tg.typePools[type] ?? []
    if (pool.length === 0) return null
    const weights = pool.map((e) => entryWeight(e, ctx.mapId, ctx.x, ctx.y, ctx.player))
    const total = weights.reduce((a, w) => a + w, 0)
    if (total <= 0) return null
    let r = rng() * total, idx = 0
    for (let i = 0; i < pool.length; i++) { if (r < weights[i]) { idx = i; break } r -= weights[i] }
    const entry = pool[idx]
    const [lo, hi] = sq.bands[band] ?? [3, 6]
    const level = entry.levelFixed ?? intIn(rng, lo, hi)
    return finalizeSpawn(entry, level, rng, ctx)
}

/** Finalise un spawn (partagé par le roll standard ET la grille d'entraînement) : IV pilotés par
 *  l'effort, shiny ~1/512, stade d'évolution cohérent (sauf noEvolve), puis comportements de combat
 *  attachés à l'instance (openMirage/openMoves/fleeMaxTurns/capture*), lus par le moteur via BattleMon. */
function finalizeSpawn(entry: WildEntry, level: number, rng: () => number, ctx: EncounterCtx): MonInstance {
    level = Math.max(1, Math.min(100, level))
    const quotaRatio = ctx.player ? ctx.player.quotaRatio : 0.5
    const overshoot = ctx.player ? ctx.player.overshoot : 0
    const ivsByStat = rollIvs(rng, quotaRatio, overshoot)
    const finalSpecies = entry.noEvolve ? entry.speciesId : speciesAtLevel(entry.speciesId, level)
    const shiny = rng() < 1 / 512 // CHROMATIQUE (~1/512) : IV parfaits + +10% stats (cf. createMonInstance/fullStats)
    const mon = createMonInstance(finalSpecies, level, { ivsByStat, shiny })

    // COMPORTEMENTS SAUVAGES attachés à l'instance (runtime) → transportés par toBattleMon, inertes
    // sur un Daemon capturé (le moteur ne les lit que sur l'ENNEMI sauvage).
    const battleCfg: Record<string, unknown> = {}
    if (entry.openMirage) {
        if (!mon.moves.some((m) => m.moveId === "mirage")) {
            const pp = getMove("mirage")?.pp ?? 20
            const slot = { moveId: "mirage", pp, ppMax: pp }
            if (mon.moves.length < 4) mon.moves.push(slot)
            else mon.moves[mon.moves.length - 1] = slot
        }
        battleCfg.openingMoves = Array.from({ length: entry.openMirage }, () => "mirage")
    }
    if (entry.openMoves && entry.openMoves.length > 0) {
        // Ouverture scriptée GÉNÉRIQUE (ex. Bouh = ["detonation"]) : injecte les moves + impose l'ordre.
        for (const id of entry.openMoves) {
            if (!mon.moves.some((m) => m.moveId === id)) {
                const pp = getMove(id)?.pp ?? 5
                const slot = { moveId: id, pp, ppMax: pp }
                if (mon.moves.length < 4) mon.moves.push(slot)
                else mon.moves[mon.moves.length - 1] = slot
            }
        }
        battleCfg.openingMoves = [...((battleCfg.openingMoves as string[]) ?? []), ...entry.openMoves]
    }
    if (entry.fleeMaxTurns) {
        const max = entry.fleeMaxTurns
        battleCfg.fleeAfterTurns = intIn(rng, Math.ceil(max / 2), max)
    }
    if (entry.captureMinBallBonus != null) battleCfg.captureMinBallBonus = entry.captureMinBallBonus
    if (entry.captureMult != null) battleCfg.captureMult = entry.captureMult
    if (entry.captureRequiresStatus) battleCfg.captureRequiresStatus = true
    if (entry.captureStatusBypassesBall) battleCfg.captureStatusBypassesBall = true
    Object.assign(mon, battleCfg)
    return mon
}

/** Exposé pour les tests/outils : poids de chaque espèce à une position. */
export function debugWeights(mapId: string, x: number, y: number, player?: WildPlayerCtx): Record<string, number> {
    const zone = ZONES[mapId]
    if (!zone) return {}
    const out: Record<string, number> = {}
    for (const e of zone.pool) out[e.speciesId] = entryWeight(e, mapId, x, y, player)
    return out
}
