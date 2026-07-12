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
import { getSpecies, SPECIES } from "./species"

// Rareté de base (poids avant modulation).
const COMMON = 100, UNCOMMON = 45, RARE = 14, VERY_RARE = 5, GIGA_RARE = 2

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
    minLeadLevel?: number         // ne pop QUE si le lead de l'équipe atteint ce niveau (ex. Orcaline run 2 = 35) — sinon poids 0
    catchOnce?: boolean           // UNE SEULE capture sur ce compte (ex. Pyropanthe) → ne repop plus une fois dans le Pokédex
}

/** Carré d'herbes hautes (grille 3×3) : rectangle (cols × rows) + tier (0 = rangée BAS … 2 = rangée HAUT,
 *  pour la raréfaction légendaire/dragon) + 5 bandes de niveau (band 0 = ligne du BAS du carré). */
interface TrainingSquare { cols: readonly [number, number]; rows: readonly [number, number]; tier: number; bands: ReadonlyArray<readonly [number, number]> }
/** GRILLE D'ENTRAÎNEMENT 3×3 : 9 carrés, chacun affiche UN type/jour (rotation déterministe par date, le
 *  TYPE = l'INDEX du carré 0-8). Le NIVEAU monte avec la HAUTEUR (rangée BAS faible → HAUT fort), bande par
 *  bande dans chaque carré. Le légendaire (Goshendofy) y rôde, + fréquent en bas (tier 0, bandes basses). */
interface TrainingGrid {
    squares: TrainingSquare[]                  // 9 carrés (grille 3×3) ; le slot de type du jour = l'index du carré
    types: readonly string[]                   // types en ROTATION QUOTIDIENNE (1 type/carré/jour)
    typePools: Record<string, WildEntry[]>     // type → pool de base (pondéré rareté → les rares restent rares)
    highOnlyTypes?: readonly string[]          // types jamais sur la rangée du BAS (tier 0, bas niveau) — ex. ROCHE
    legendary?: WildEntry                      // Goshendofy (capture gatée Ball+statut via ses champs)
    legendaryDenomByBand?: number[]            // dénom de proba par band [bas..haut]
    legendaryTierMult?: number[]               // ×dénom par TIER (0 bas → 2 haut) → raréfié en montant
    /** DRAGONS RARES : chance de tomber sur un dragon (au lieu du type du jour), à la forme adaptée au
     *  niveau du carré (speciesAtLevel). Proba = 1 / (denomByBand[band] × tierMult[tier]) → PLUS le
     *  dragon pop fort (band haut / tier haut), PLUS il est rare. bases = têtes de lignées dragon. */
    dragonRare?: { bases: readonly string[]; denomByBand: number[]; tierMult: number[] }
}

interface Zone { rate: number; pool: WildEntry[]; minLevel?: number; maxLevel?: number; trainingGrid?: TrainingGrid }

/** Stats PushQuest normalisées 0..1 (sauf quotaReached). Couche méta. */
export interface WildPlayerCtx {
    pompes: number       // 0..1 (effort pompes du jour)
    squats: number       // 0..1
    quotaReached: boolean
    overshoot: number    // 0..1 (dépassement du quota)
    quotaRatio: number   // 0..1 (total du jour / quota, capé) → pilote le plancher d'IV
    quota?: number       // VALEUR BRUTE du quota du jour (cible reps IRL) → scale le coût des attaques (absent → étalon 150)
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
    goshBoost?: boolean         // GAMIN : la nuit (21h-00h) après sa confidence → chances de Goshendofy ×2
    goshCaught?: boolean        // Goshendofy déjà capturé sur ce compte → ne réapparaît PLUS JAMAIS
    ngplus?: boolean            // NEW GAME+ : bascule sur les pools RUN 2 (NGPLUS_ZONES) pour les zones re-mixées
    run3?: boolean              // RUN 3 (concours) : bascule sur les pools RUN 3 (RUN3_ZONES) — espèces INÉDITES (chaque run différent)
    champion?: boolean          // isChampion (LIVE post-Ligue) → active le RATTRAPAGE des inédits run 3 au champ + Grotte
    run3Used?: boolean          // run 3 déjà fait → rattrapage RARE (sinon ULTRA-RARE : teaser « regarde ce que t'as raté »)
    caughtSpecies?: readonly string[] // Pokédex des captures → gate les entrées `catchOnce` (ex. Pyropanthe, Panthéon run 3)
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

// HAUTES HERBES — 11 types en ROTATION quotidienne. Exclus : Spectre/Élec (réservés aux bâtiments) ;
// Normal (trop peu d'espèces → plumiot rejoint Vol) ; Dragon (pas de carré, draclet pop rare Route Nord).
// PSY ajouté (jour PSY = lignée Nouillon) → sert aussi de porte au rattrapage live d'Hypnoppo/Karmaki (run 3).
const HAUTES_HERBES_TYPES = ["VOL", "EAU", "PLANTE", "FEU", "COMBAT", "SOL", "ROCHE", "POISON", "GLACE", "INSECTE", "PSY"] as const
// Pools de BASE par type (formes de base → speciesAtLevel les fait évoluer selon le niveau de la bande).
// Poids = rareté (commun ~100 · secondaire ~45-70 · rare ~14 · très rare ~5) → les rares restent rares.
const HH_TYPE_POOLS: Record<string, WildEntry[]> = {
    VOL: [{ speciesId: "plumiot", base: 100 }, { speciesId: "cornaissant", base: 60 }, { speciesId: "piouflot", base: 45 }, { speciesId: "rembodo", base: 45 }, { speciesId: "colibraise", base: 45 }],
    EAU: [{ speciesId: "loutrille", base: 100 }, { speciesId: "piouflot", base: 50 }, { speciesId: "tetardoc", base: 45 }, { speciesId: "braisecaille", base: 5 }],
    PLANTE: [{ speciesId: "pampousse", base: 100 }, { speciesId: "broussours", base: 45 }, { speciesId: "tamanpousse", base: 14 }],
    FEU: [{ speciesId: "fennaise", base: 100 }, { speciesId: "pyrozly", base: 100 }, { speciesId: "brasicow", base: 45 }, { speciesId: "colibraise", base: 45 }, { speciesId: "lavapetit", base: 45 }, { speciesId: "braisecaille", base: 5 }],
    COMBAT: [{ speciesId: "couperin", base: 100 }, { speciesId: "broussours", base: 60 }, { speciesId: "forgeotin", base: 45 }, { speciesId: "brasicow", base: 45 }],
    // Mottoche est proposée ici EN RUN 1 ; en RUN 2 elle est FILTRÉE (exclusive à la Grotte) — cf. rollTrainingGrid.
    SOL: [{ speciesId: "cailloutchi", base: 100 }, { speciesId: "mottoche", base: 70 }],
    ROCHE: [{ speciesId: "cailloutchi", base: 100 }, { speciesId: "mottoche", base: 70 }, { speciesId: "lavapetit", base: 45 }, { speciesId: "rembodo", base: 45 }, { speciesId: "limaroche", base: 45 }, { speciesId: "marmoterre", base: 45 }, { speciesId: "tetardoc", base: 30 }],
    POISON: [{ speciesId: "cornaissant", base: 100 }, { speciesId: "sporbeo", base: 45 }],
    GLACE: [{ speciesId: "auroruff", base: 100 }, { speciesId: "marmoterre", base: 45 }],
    INSECTE: [{ speciesId: "ruffiant", base: 100 }, { speciesId: "revemante", base: 45 }],
    PSY: [{ speciesId: "nouillon", base: 100 }], // jour PSY : lignée Nouillon→Vermisaint→Divinpâte (selon la bande)
}

// RATTRAPAGE run 3 en LIVE (post-Ligue) — inédits run-3 SAUVAGES rendus attrapables au champ d'entraînement,
// dans le carré du bon TYPE-du-jour et PLAFONNÉS pour ne jamais dépasser leur forme de base (jamais évolué).
const RUN3_HH_CATCHUP: { speciesId: string; types: readonly string[]; maxLevel?: number }[] = [
    { speciesId: "otama", types: ["EAU", "COMBAT"], maxLevel: 24 },  // évo 25 → cap 24
    { speciesId: "hypnoppo", types: ["PSY"], maxLevel: 15 },          // évo 16 → cap 15
    { speciesId: "karmaki", types: ["PLANTE", "PSY"] },              // mono → aucun cap
]
/** RATTRAPAGE champ : sur un carré du bon type-du-jour et à un niveau ≤ cap, un inédit run-3 remplace la
 *  rencontre. ULTRA-rare sans run 3 fait (teaser) / rare après (run3Used). LIVE post-Ligue uniquement. */
function run3LiveCatchupHH(type: string, level: number, ctx: EncounterCtx, rng: () => number): MonInstance | null {
    if (!ctx.champion || ctx.run3 || ctx.ngplus) return null // LIVE (run 1) post-Ligue UNIQUEMENT — jamais en run 2/3 (doublon RUN3_ZONES / pools NG+)
    const c = RUN3_HH_CATCHUP.find((e) => e.types.includes(type) && (e.maxLevel == null || level <= e.maxLevel))
    if (!c) return null
    const denom = ctx.run3Used ? 16 : 64
    if (rng() >= 1 / denom) return null
    return finalizeSpawn({ speciesId: c.speciesId, base: 1, noEvolve: true }, level, rng, ctx)
}
/** RATTRAPAGE Grotte (LIVE post-Ligue) : Wistree (Spectre/Plante) rôde, ULTRA-rare / rare selon run3Used. */
function run3LiveCatchupGrotte(ctx: EncounterCtx, rng: () => number): MonInstance | null {
    if (!ctx.champion || ctx.run3 || ctx.ngplus || ctx.mapId !== "yellow_grotte") return null
    const denom = ctx.run3Used ? 30 : 120
    if (rng() >= 1 / denom) return null
    const level = Math.max(20, Math.min(ctx.levelCap ?? 60, ctx.leadLevel))
    return finalizeSpawn({ speciesId: "wistree", base: 1, noEvolve: true }, level, rng, ctx)
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
    // HAUTES HERBES DU NORD (plaine d'entraînement de Cendreville) : GRILLE 3×3 = 9 carrés. Le NIVEAU monte
    // avec la HAUTEUR (rangée BAS tier 0 N3-18 · MILIEU tier 1 N18-38 · HAUT tier 2 N38-50), bande par bande
    // dans chaque carré (band 0 = ligne du bas). Chaque carré (index 0-8) affiche UN type qui TOURNE chaque
    // jour (cf. dailyTypes : 9 types/jour). Goshendofy y rôde, + fréquent en bas (tier 0, bandes basses).
    yellow_hautes_herbes: {
        rate: 0.25, pool: [],
        trainingGrid: {
            types: HAUTES_HERBES_TYPES,
            typePools: HH_TYPE_POOLS,
            highOnlyTypes: ["ROCHE"], // Roche jamais sur la rangée du BAS (pas de bébé rock niv 3) → tier ≥ 1
            // 9 carrés (cf. maps.ts HH_SQUARES) : index = slot de type du jour. cols×rows = rectangle ; tier = rangée.
            squares: [
                // RANGÉE BAS (tier 0) — N3-18 — slots de type 0,1,2
                { cols: [1, 4], rows: [13, 17], tier: 0, bands: [[3, 6], [6, 9], [9, 12], [12, 15], [15, 18]] },
                { cols: [6, 9], rows: [13, 17], tier: 0, bands: [[3, 6], [6, 9], [9, 12], [12, 15], [15, 18]] },
                { cols: [11, 14], rows: [13, 17], tier: 0, bands: [[3, 6], [6, 9], [9, 12], [12, 15], [15, 18]] },
                // RANGÉE MILIEU (tier 1) — N18-38 — slots 3,4,5
                { cols: [1, 4], rows: [7, 11], tier: 1, bands: [[18, 22], [22, 26], [26, 30], [30, 34], [34, 38]] },
                { cols: [6, 9], rows: [7, 11], tier: 1, bands: [[18, 22], [22, 26], [26, 30], [30, 34], [34, 38]] },
                { cols: [11, 14], rows: [7, 11], tier: 1, bands: [[18, 22], [22, 26], [26, 30], [30, 34], [34, 38]] },
                // RANGÉE HAUT (tier 2) — N38-50 — slots 6,7,8
                { cols: [1, 4], rows: [1, 5], tier: 2, bands: [[38, 41], [41, 44], [44, 47], [47, 50], [50, 50]] },
                { cols: [6, 9], rows: [1, 5], tier: 2, bands: [[38, 41], [41, 44], [44, 47], [47, 50], [50, 50]] },
                { cols: [11, 14], rows: [1, 5], tier: 2, bands: [[38, 41], [41, 44], [44, 47], [47, 50], [50, 50]] },
            ],
            // Goshendofy : niveau fixe 50 (vrai légendaire), Hyper Nexus Ball (ballBonus≥5) + STATUT requis, capture ×0.5.
            legendary: { speciesId: "goshendofy", base: 1, levelFixed: 50, noEvolve: true, captureMinBallBonus: 5, captureRequiresStatus: true, captureMult: 0.8 }, // ×0.8 (assoupli) + escalade par lancer ; aussi hérité par Ukognos en NG+
            legendaryDenomByBand: [100, 200, 300, 500, 1000], // band 0 (herbe basse) → band 4
            legendaryTierMult: [1, 4, 8],                     // tier 0 (commun) → tier 2 (quasi introuvable)
            // DRAGONS RARES : croise un dragon (Vol/Dragon, Feu/Dragon, Dragon/Glace) au lieu du type du jour ;
            // forme adaptée au niveau (bébé en tier 0 → évolué en tier 2). PLUS il pop fort, PLUS il est rare :
            //   tier 0 ~1/50 (bas) → 1/220 (haut) · tier 1 ×4 · tier 2 ×10 (≈1/500 → 1/2200 pour les gros).
            dragonRare: { bases: ["draclet", "carlinou", "glacirex"], denomByBand: [50, 70, 100, 150, 220], tierMult: [1, 4, 10] },
        },
    },
}

// ═══════════════ RENCONTRES DU RUN 2 (New Game+) ═══════════════
// En NG+, certaines zones sont RE-MIXÉES (espèces late/never rendues catchables tôt, raretés inversées…).
// Choisi par rollWildEncounter quand ctx.ngplus. Les zones absentes d'ici gardent leur pool run 1.
// RÈGLE ABSOLUE respectée : que des BASES de lignées (speciesAtLevel spawn le stade naturel du niveau).
const NGPLUS_ZONES: Record<string, Zone> = {
    // ROUTE NORD run 2 — « les créatures de donjon remontent en surface » + starters sauvages + panthère ancêtre.
    yellow_route_nord: {
        rate: 0.14,
        pool: [
            // Communs (conservés)
            { speciesId: "plumiot", base: COMMON }, { speciesId: "couperin", base: COMMON },
            { speciesId: "cailloutchi", base: COMMON }, { speciesId: "ruffiant", base: COMMON }, { speciesId: "cornaissant", base: COMMON },
            // Peu communs — late/never (donjons/jamais sauvages) rendus catchables tôt + Colibraise (Vol/Feu)
            { speciesId: "blaziper", base: UNCOMMON }, { speciesId: "jerbiwat", base: UNCOMMON },
            { speciesId: "bouh", base: UNCOMMON }, { speciesId: "glacirex", base: UNCOMMON },
            { speciesId: "colibraise", base: UNCOMMON },
            // Rares — les starters Eau & Plante (Braisille/Fennaise déplacés à la CENTRALE FEU run 2)
            { speciesId: "gouttiny", base: RARE, rare: true }, { speciesId: "feuillichot", base: RARE, rare: true },
            // Très rare — le bébé-dragon (→ Carlembre → Dracarlin en l'élevant)
            { speciesId: "carlinou", base: VERY_RARE, rare: true },
            // Giga rare — la pépite dragon + l'ancêtre panthère
            { speciesId: "draclet", base: GIGA_RARE, rare: true }, { speciesId: "pantheon", base: GIGA_RARE, rare: true },
        ],
    },
    // GROTTE run 2 — Mottoche rétrogradé, la lignée-diamant remonte, Orcaline pépite du lac (gate niveau 35).
    yellow_grotte: {
        rate: 0.16, minLevel: 5,
        pool: [
            // Communs — rocher + eau (lignée arène eau) — Lavapetit déplacé à la CENTRALE FEU run 2
            { speciesId: "cailloutchi", base: COMMON }, { speciesId: "tetardoc", base: COMMON },
            // Peu communs
            { speciesId: "rembodo", base: UNCOMMON }, { speciesId: "limaroche", base: UNCOMMON }, { speciesId: "marmoterre", base: UNCOMMON },
            { speciesId: "quadroc", base: UNCOMMON }, { speciesId: "loutrille", base: UNCOMMON },
            { speciesId: "sporbeo", base: UNCOMMON }, { speciesId: "revemante", base: UNCOMMON },
            // Rare — un spectre (Braisécaille déplacée à la CENTRALE FEU run 2)
            { speciesId: "namicha", base: RARE, noEvolve: true },
            // Super rare — Mottoche rétrogradé. TOUJOURS stade 1 (noEvolve) ET à un NIVEAU FIXE 5, indépendant
            // du niveau du lead (levelFixed → bypass du scaling) : jamais sa lignée évoluée, jamais scalé haut.
            { speciesId: "mottoche", base: VERY_RARE, noEvolve: true, levelFixed: 5 },
            // Giga rare — Orcaline (Glace/Eau), UNIQUEMENT si le lead ≥ 35 (son niveau mini)
            { speciesId: "orcaline", base: GIGA_RARE, noEvolve: true, rare: true, minLeadLevel: 35 },
        ],
    },
    // CENTRALE FEU run 2 — la Centrale a SURCHAUFFÉ : le cœur Feu/Élec (lignée Boltah) a fait fondre les
    // circuits, la lave a envahi les couloirs. Devient le FOYER des Feu déplacés ici (Braisille/Fennaise de
    // Route Nord, Lavapetit/Braisécaille de la Grotte, Pyrozly/Brasicow de Cendreville). Le gardien de la
    // Pierre est Gékraise (Roche/Feu) en run 2 (cf. gekroc.ts buildGekroc("ngplus")).
    // Niveaux 100% CONTRÔLÉS (levelFixed/levelRange → aucun scaling du lead), façon Centrale Élec. Les lignées
    // évolutives « couvent » : 60% base (sous son évo) · 30% mi-évo (sous son évo) · 10% final (N40). Les
    // 2-stades : 85% base · 15% final au ×1,5 de l'évo (trophées rares). Pyropanthe = 1 SEULE capture (catchOnce).
    yellow_centrale: {
        rate: 0.16, minLevel: 12, maxLevel: 25,
        pool: [
            // ── LE RÉACTEUR (lignée Boltah, dominant) : 60% Boltah · 30% Heatah · 10% Thundah ──
            { speciesId: "boltah", base: 138, levelFixed: 15 }, // reste Boltah (évo 16)
            { speciesId: "boltah", base: 69, levelFixed: 35 },  // → Heatah (évo Heatah 36)
            { speciesId: "boltah", base: 23, levelFixed: 40 },  // → Thundah
            // ── LA LAVE (lignée Lavapetit) ──
            { speciesId: "lavapetit", base: 33, levelFixed: 16 }, // Lavapetit (évo 17)
            { speciesId: "lavapetit", base: 17, levelFixed: 36 }, // → Fissuralave (évo 37)
            { speciesId: "lavapetit", base: 6, levelFixed: 40 },  // → Magmator
            // ── LE STARTER FEU (lignée Braisille) ──
            { speciesId: "braisille", base: 27, levelFixed: 15 }, // Braisille (évo 16)
            { speciesId: "braisille", base: 14, levelFixed: 35 }, // → Flamkure (évo 36)
            { speciesId: "braisille", base: 5, levelFixed: 40 },  // → Pyrokoss
            // ── LE RENARD (lignée Fennaise) ──
            { speciesId: "fennaise", base: 8, levelFixed: 15 },   // Fennaise (évo 16)
            { speciesId: "fennaise", base: 4, levelFixed: 35 },   // → Pyrenard (évo 36)
            { speciesId: "fennaise", base: 2, levelFixed: 40 },   // → Loupyre
            // ── LES CENDRES : Pyrozly (mono-stade) ──
            { speciesId: "pyrozly", base: 90, levelRange: [15, 25] },
            // ── 2-STADES RARES (85% base sous l'évo · 15% final au ×1,5) ──
            { speciesId: "brasicow", base: 4, levelFixed: 29, player: "combat" }, // Brasicow (évo 30)
            { speciesId: "brasicow", base: 1, levelFixed: 45, player: "combat" }, // → Tauricendre (~1,5×30)
            { speciesId: "braisecaille", base: 3, levelFixed: 31 },               // Braisécaille (évo 32)
            { speciesId: "braisecaille", base: 1, levelFixed: 48 },               // → Caldéront (~1,5×32)
            // ── PÉPITE : Pyropanthe, super-rare, UNE SEULE capture (ne repop plus une fois au Pokédex) ──
            { speciesId: "pyropanthe", base: 2, levelFixed: 50, noEvolve: true, catchOnce: true, captureMult: 0.5 },
        ],
    },
    // CENDREVILLE run 2 — le feu a migré vers la CENTRALE FEU : la ville-cendre penche désormais
    // Spectre/Électrik (Pyrozly/Brasicow → Centrale ; Colibraise → Route Nord). Blaziper reste le dernier feu.
    yellow_cendreville: {
        rate: 0.15, minLevel: 16,
        pool: [
            { speciesId: "blaziper", base: RARE, player: "rare", rare: true }, // Psy/Feu, le dernier feu de la ville
            // 👻 SPECTRE — la brume de cendre
            { speciesId: "sporbeo", base: UNCOMMON }, { speciesId: "revemante", base: UNCOMMON },
            { speciesId: "necarabee", base: RARE },
            // ⚡ ÉLECTRIK — courts-circuits dans les ruines
            { speciesId: "electroatiss", base: COMMON, player: "elec" },
            { speciesId: "couranti", base: UNCOMMON, player: "elec" },
            { speciesId: "zappeureal", base: RARE, player: "elec" },
            { speciesId: "oragron", base: VERY_RARE, player: "elec", rare: true }, // Vol/Élec (pépite)
        ],
    },
}

// ═══════════════ RENCONTRES DU RUN 3 (concours) ═══════════════
// Espèces INÉDITES par rapport aux runs 1/2 (« chaque run différent », choix Sartay 10/07). Poids RELATIFS
// (le pool normalise). Choisi par rollWildEncounter quand ctx.run3. Que des BASES de lignées (speciesAtLevel
// fait évoluer selon le niveau). Marmoterre est RETIRÉ de la grotte (exclusif au troc Ruffiant→Marmoterre).
const RUN3_ZONES: Record<string, Zone> = {
    // ROUTE NORD run 3 — sentier balayé d'un vent glacé, faune inédite. Lavapetit = hook de la quête CHEN
    // (→ Magmator → Magnetor). Ruffiant = la monnaie du troqueur (→ Marmoterre). Panthéon : 1 capture max.
    yellow_route_nord: {
        rate: 0.14,
        pool: [
            { speciesId: "plumiot", base: 20 },
            { speciesId: "tamanpousse", base: 18 }, { speciesId: "limaroche", base: 18 },
            { speciesId: "tetardoc", base: 18 }, { speciesId: "colibraise", base: 18 },
            { speciesId: "hibouh", base: 8 }, { speciesId: "pyrozly", base: 7 },
            { speciesId: "jerbiwat", base: 5 }, { speciesId: "lavapetit", base: 5 },
            { speciesId: "nouillon", base: 3 }, { speciesId: "piouflot", base: 3 }, { speciesId: "ruffiant", base: 3 },
            { speciesId: "revemante", base: 2 }, { speciesId: "goatiny", base: 2 }, { speciesId: "gavillus", base: 2 },
            { speciesId: "auroruff", base: 3 }, // anti-Dragon (remonté)
            { speciesId: "glacirex", base: 1, rare: true }, // Dragon/Glace, pépite
            { speciesId: "pantheon", base: 1, rare: true, catchOnce: true }, // 1 capture max (+ don d'ACE)
        ],
    },
    // GROTTE run 3 — galeries hantées : Sporbéo domine, les 3 STARTERS du run 1 en clin d'œil, Orcaline trophée.
    yellow_grotte: {
        rate: 0.16, minLevel: 5,
        pool: [
            { speciesId: "sporbeo", base: 25 },
            { speciesId: "cailloutchi", base: 10 }, { speciesId: "cornaissant", base: 10 },
            { speciesId: "mottoche", base: 5, noEvolve: true, levelFixed: 5 }, // niveau 5 FIXE (fodder)
            { speciesId: "braisecaille", base: 5 }, { speciesId: "brook", base: 5 }, // Forgeotin (Combat) déplacé → Maison Combat run 3
            // les 3 starters du run 1 (nostalgie, rares)
            { speciesId: "gouttiny", base: 2, rare: true }, { speciesId: "feuillichot", base: 2, rare: true }, { speciesId: "braisille", base: 2, rare: true },
            { speciesId: "draclet", base: 1, rare: true },
            { speciesId: "rembodo", base: 1 }, { speciesId: "belunode", base: 1 }, { speciesId: "namicha", base: 1, noEvolve: true },
            // trophée de la grotte — Glace/Eau anti-Dragon, UNIQUEMENT si le lead ≥ 35 (son niveau mini)
            { speciesId: "orcaline", base: 1, noEvolve: true, rare: true, minLeadLevel: 35 },
            { speciesId: "wistree", base: 2, noEvolve: true, rare: true, captureMult: 0.4 }, // Spectre/Plante rare & mystérieux (voleur d'éclat)
        ],
    },
    // CENTRALE PSY run 3 — DONJON 100% PSY : tout le roster psy (Nouillon/Vermissaint, Limaroche→Escargyle→
    // Tortoracle, Blaziper, Jerbiwat, Chouhanté, Regnantaur) + les 4 INÉDITES glissées discrètement (lignée hippo
    // Hypnoppo→Téléppo→Omnhippo + Karmaki le sage). Niveaux CONTRÔLÉS (levelRange → aucun scaling ; le stade réel
    // sort via speciesAtLevel sauf noEvolve). La GARANTIE de découverte (forçage Hypnoppo/Karmaki à la ~9-10e
    // rencontre du passage) est gérée dans gameStore. Gékosmic = gardien STATIQUE (mini-boss NPC 4,9), hors pool.
    yellow_centrale: {
        rate: 0.16,
        pool: [
            // — POOL PSY (familier, le gros de la population) —
            { speciesId: "nouillon", base: 90, levelRange: [12, 15] },                        // commun (base <16)
            { speciesId: "nouillon", base: 40, levelRange: [27, 33] },                         // peu commun → Vermissaint
            { speciesId: "limaroche", base: 90, levelRange: [12, 15] },                        // commun (base <18)
            { speciesId: "limaroche", base: 40, levelRange: [28, 34] },                        // peu commun → Escargyle
            { speciesId: "limaroche", base: 12, levelRange: [46, 50], captureMult: 0.5 },      // rare → Tortoracle
            { speciesId: "regnantaur", base: 12, noEvolve: true, levelRange: [43, 47], captureMult: 0.4 }, // rare final
            { speciesId: "blaziper", base: 12, noEvolve: true, levelRange: [12, 16] },         // rare (pas de Flamaspic)
            { speciesId: "jerbiwat", base: 12, levelRange: [38, 42], captureMult: 0.5 },       // rare standalone
            { speciesId: "chouhante", base: 12, noEvolve: true, levelRange: [28, 33] },        // rare (pas d'Archibouh)
            // — INÉDITES (discrètes ~18% ; la garantie assure quand même la découverte d'Hypnoppo/Karmaki) —
            { speciesId: "hypnoppo", base: 40, levelRange: [7, 15] },                          // peu commun (base <16)
            { speciesId: "hypnoppo", base: 12, levelRange: [18, 33] },                         // rare → Téléppo
            { speciesId: "karmaki", base: 12, noEvolve: true, levelRange: [28, 56] },          // rare, grande fourchette (mono)
            { speciesId: "omnhippo", base: 3, noEvolve: true, levelRange: [48, 52], catchOnce: true, captureMult: 0.5 }, // ultra-rare pépite
        ],
    },
    // MAISON HANTÉE run 3 → DONJON 100% COMBAT (« dojo hanté ») : le roster Combat (Bouhbou natif + lignées
    // Couperin/Broussours/Trolystrik/Forgeotin/Brasicow) + la lignée grenouille-ninja INÉDITE Otama→Gamaruto→
    // Uzumaro (~18%). Niveaux CONTRÔLÉS (levelRange ; stade via speciesAtLevel sauf noEvolve). Le Collectionneur
    // (au fond du labyrinthe) offre la CT Mitra-Poing si le joueur a un GAMARUTO en équipe (cf. gameStore).
    yellow_maison_hantee: {
        rate: 0.12,
        pool: [
            // — ROSTER COMBAT familier —
            { speciesId: "bouhbou", base: 80, noEvolve: true, levelRange: [24, 32] },        // commun (Combat/Spectre, natif hanté)
            { speciesId: "couperin", base: 80, levelRange: [15, 25] },                        // commun (base)
            { speciesId: "couperin", base: 32, levelRange: [30, 35] },                        // peu commun → Frappard
            { speciesId: "broussours", base: 32, levelRange: [13, 17] },                      // peu commun (base)
            { speciesId: "trolystrik", base: 30, levelRange: [12, 16] },                      // peu commun (base)
            { speciesId: "forgeotin", base: 30, levelRange: [13, 17] },                       // peu commun (base, ex-Grotte)
            { speciesId: "couperin", base: 10, levelRange: [44, 50], captureMult: 0.5 },      // rare → Maîtrezenc
            { speciesId: "broussours", base: 10, levelRange: [44, 50], captureMult: 0.5 },    // rare → Druidours
            { speciesId: "trolystrik", base: 10, levelRange: [44, 50], captureMult: 0.5 },    // rare → Hébulmin
            { speciesId: "forgeotin", base: 10, levelRange: [44, 50], captureMult: 0.4 },     // rare → Enclumind
            { speciesId: "brasicow", base: 8, levelRange: [42, 48], captureMult: 0.5 },       // rare → Tauricendre
            // — GRENOUILLE-NINJA inédite (~18% ; Gamaruto findable pour le Collectionneur) —
            { speciesId: "otama", base: 50, levelRange: [15, 24] },                           // peu commun (base)
            { speciesId: "gamaruto", base: 20, noEvolve: true, levelRange: [26, 42] },        // uncommon (mid — gate Collectionneur)
            { speciesId: "uzumaro", base: 6, noEvolve: true, levelRange: [48, 54], captureMult: 0.5 }, // rare pépite (final)
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
    // Sélection du pool selon le monde : RUN 3 (RUN3_ZONES) > RUN 2 (NGPLUS_ZONES) > run 1 (ZONES par défaut).
    const zone = (ctx.run3 && RUN3_ZONES[ctx.mapId]) || (ctx.ngplus && NGPLUS_ZONES[ctx.mapId]) || ZONES[ctx.mapId]
    if (!zone) return null
    const rng = ctx.rng ?? Math.random
    if (rng() >= zone.rate) return null

    // GRILLE D'ENTRAÎNEMENT (hautes herbes du nord) : niveau choisi par la LIGNE, type par le CARRÉ.
    if (zone.trainingGrid) return rollTrainingGrid(zone.trainingGrid, ctx, rng)

    // RATTRAPAGE run 3 (LIVE post-Ligue) : Wistree rôde dans la Grotte (ultra-rare / rare selon run3Used).
    const grotteCatch = run3LiveCatchupGrotte(ctx, rng)
    if (grotteCatch) return grotteCatch

    // Poids par entrée ; une entrée `minLeadLevel` non atteinte → poids 0 (invisible tant que l'équipe est trop faible).
    const weights = zone.pool.map((e) =>
        (e.minLeadLevel != null && ctx.leadLevel < e.minLeadLevel) ? 0
        : (e.catchOnce && ctx.caughtSpecies?.includes(e.speciesId)) ? 0 // ex. Pyropanthe déjà capturée → ne repop plus
        : entryWeight(e, ctx.mapId, ctx.x, ctx.y, ctx.player))
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

/** Types du jour pour les 9 carrés (slots 0-8) : mélange Fisher-Yates DÉTERMINISTE par date → 9 types
 *  DISTINCTS tirés des 10 (1 type « au repos » chaque jour, en rotation). Les highOnlyTypes (ex. ROCHE)
 *  ne tombent jamais sur la rangée du BAS (slots 0-2, bas niveau) : on les échange avec un slot ≥3. */
function dailyTypes(dayKey: string, types: readonly string[], highOnly: readonly string[]): string[] {
    const rng = hhMulberry32(hashStr(dayKey || "1970-01-01"))
    const pool = [...types]
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1));[pool[i], pool[j]] = [pool[j], pool[i]] }
    const nine = pool.slice(0, 9) // 1 type au repos chaque jour (rotation déterministe)
    for (let i = 0; i < 3 && i < nine.length; i++) {
        if (highOnly.includes(nine[i])) {
            const k = nine.findIndex((t, idx) => idx >= 3 && !highOnly.includes(t))
            if (k >= 0) [nine[i], nine[k]] = [nine[k], nine[i]]
        }
    }
    return nine
}

/** Exposé pour l'UI/tests : les 9 types affichés ce jour (slots 0-8 = carrés BAS→HAUT, gauche→droite). */
export function hautesHerbesTypesForDay(dayKey: string): string[] {
    const tg = ZONES.yellow_hautes_herbes.trainingGrid
    return tg ? dailyTypes(dayKey, tg.types, tg.highOnlyTypes ?? []) : []
}

/** Forme adaptée au niveau MAIS JAMAIS la forme définitive : si speciesAtLevel donne une finale (sans
 *  évolution), on recule sur sa pré-évolution → les dragons sauvages se capturent en pré-évo, à évoluer soi-même. */
function nonFinalFormAtLevel(baseId: string, level: number): string {
    const id = speciesAtLevel(baseId, level)
    const sp = getSpecies(id)
    if (sp && !sp.evolution) {
        const pre = Object.values(SPECIES).find((s) => s.evolution?.toId === id)
        if (pre) return pre.id
    }
    return id
}

/** GRILLE D'ENTRAÎNEMENT 3×3 : carré trouvé par (x,y), niveau = la bande (ligne du carré), type = le carré
 *  du JOUR (slot = index du carré). Le légendaire y rôde, + fréquent en bas (tier bas × bande basse). */
function rollTrainingGrid(tg: TrainingGrid, ctx: EncounterCtx, rng: () => number): MonInstance | null {
    const sqIdx = tg.squares.findIndex((s) => ctx.x >= s.cols[0] && ctx.x <= s.cols[1] && ctx.y >= s.rows[0] && ctx.y <= s.rows[1])
    if (sqIdx < 0) return null // sur une allée / couloir (herbe basse) → pas de rencontre (gameStore ne roll que sur grassTall)
    const sq = tg.squares[sqIdx]
    const band = Math.max(0, Math.min(4, sq.rows[1] - ctx.y)) // band 0 = ligne du BAS du carré
    const tier = sq.tier
    // LÉGENDAIRE : gradient bande × tier → + fréquent au bas de la rangée du bas (tier 0).
    // GAMIN : la nuit (après sa confidence), le dénominateur est divisé par 2 → chances DOUBLÉES.
    // MIROIR RUN 2 : en NG+, le créneau devient UKOGNOS (Fée, alter-ego de Goshendofy), gaté par le Pokédex
    // NG+ ; en run 1, Goshendofy, gaté par goshCaught (jamais 2× sur le compte). Même gating de capture dans
    // les deux cas (Hyper Nexus Ball + statut, ×0.5) : le swap ne touche QUE l'espèce.
    if (tg.legendary && tg.legendaryDenomByBand) {
        const leg = ctx.ngplus ? { ...tg.legendary, speciesId: "ukognos" } : tg.legendary
        const alreadyCaught = ctx.ngplus ? !!ctx.caughtSpecies?.includes("ukognos") : !!ctx.goshCaught
        if (!alreadyCaught) {
            const boost = ctx.goshBoost ? 0.5 : 1
            const denom = (tg.legendaryDenomByBand[band] ?? 1000) * (tg.legendaryTierMult?.[tier] ?? 1) * boost
            if (rng() < 1 / denom) return finalizeSpawn(leg, leg.levelFixed ?? 50, rng, ctx)
        }
    }
    // DRAGONS RARES : + le dragon pop fort (band/tier hauts), + il est rare. JAMAIS en forme définitive
    // (on capture une pré-évolution, à faire évoluer soi-même) → nonFinalFormAtLevel recule d'un cran si besoin.
    if (tg.dragonRare && tg.dragonRare.bases.length > 0) {
        const denom = (tg.dragonRare.denomByBand[band] ?? 220) * (tg.dragonRare.tierMult[tier] ?? 1)
        if (rng() < 1 / denom) {
            const baseId = tg.dragonRare.bases[Math.floor(rng() * tg.dragonRare.bases.length)]
            const [lo, hi] = sq.bands[band] ?? [3, 6]
            const level = intIn(rng, lo, hi)
            return finalizeSpawn({ speciesId: nonFinalFormAtLevel(baseId, level), base: 1, rare: true, noEvolve: true }, level, rng, ctx)
        }
    }
    // TYPE DU JOUR pour ce carré (slot = index) → pioche pondérée dans son pool ; NIVEAU déterministe par la bande.
    const type = dailyTypes(ctx.dayKey ?? "", tg.types, tg.highOnlyTypes ?? [])[sqIdx] ?? tg.types[0]
    // Mottoche (+ sa lignée) : au champ d'entraînement UNIQUEMENT en run 1 → filtrée en RUN 2 (exclusive à la Grotte).
    const pool = (ctx.ngplus ? (tg.typePools[type] ?? []).filter((e) => e.speciesId !== "mottoche") : tg.typePools[type]) ?? []
    if (pool.length === 0) return null
    const weights = pool.map((e) => entryWeight(e, ctx.mapId, ctx.x, ctx.y, ctx.player))
    const total = weights.reduce((a, w) => a + w, 0)
    if (total <= 0) return null
    let r = rng() * total, idx = 0
    for (let i = 0; i < pool.length; i++) { if (r < weights[i]) { idx = i; break } r -= weights[i] }
    const entry = pool[idx]
    const [lo, hi] = sq.bands[band] ?? [3, 6]
    const level = entry.levelFixed ?? intIn(rng, lo, hi)
    // RATTRAPAGE run 3 (LIVE post-Ligue) : sur le bon type-du-jour et ≤ cap, un inédit run-3 remplace la rencontre.
    const catchup = run3LiveCatchupHH(type, level, ctx, rng)
    if (catchup) return catchup
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
