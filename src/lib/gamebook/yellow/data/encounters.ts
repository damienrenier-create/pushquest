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
import { SPECIAL_OBTAIN } from "./captureSpecial"

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
    captureTaunt?: string         // message de RAILLERIE au 1er lancer (créations finales niv 75 de la Grotte du Nexus)
    captureRequiresStatus?: boolean // capture IMPOSSIBLE sans statut majeur sur la cible (légendaire, ex. Goshendofy)
    captureStatusBypassesBall?: boolean // un statut majeur shunte captureMinBallBonus (Super Ball+ OU statut, ex. Bouh)
    minLeadLevel?: number         // ne pop QUE si le lead de l'équipe atteint ce niveau (ex. Orcaline run 2 = 35) — sinon poids 0
    hourRange?: [number, number]  // ne pop QUE dans cette fenêtre horaire [début, fin[ (0-23). fin<=début = enjambe minuit (ex. [20,8]). Sinon poids 0
    requiresFusionLeague?: boolean // ne pop QU'APRÈS la 1re victoire à la Ligue de Fusion (créatures anciennes B2F) — sinon poids 0
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

/** SOUS-ZONE RECTANGULAIRE (biotope) : dans une map à `rects`, le POOL dépend du rectangle contenant (x,y).
 *  Hors de tout rectangle → aucune rencontre. Sert aux biotopes de la Grotte du Nexus B1F. Bornes INCLUSIVES. */
interface RectZone { x1: number; y1: number; x2: number; y2: number; pool: WildEntry[] }
interface Zone { rate: number; pool: WildEntry[]; minLevel?: number; maxLevel?: number; trainingGrid?: TrainingGrid; rects?: RectZone[] }

/** Le rectangle-biotope contenant (x,y), ou null (hors biotope). Bornes inclusives. */
function rectAt(rects: RectZone[], x: number, y: number): RectZone | null {
    return rects.find((r) => x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2) ?? null
}

/** Clé du BIOTOPE courant : `mapId` seul si la zone n'a pas de rects (ex. 1F) ; sinon `mapId:<index du rect>`
 *  (ou `mapId:-1` hors de tout rect). Sert à SCOPER la règle de pop de fusion : une fusion ne s'amorce QUE de
 *  2 parents consécutifs rencontrés DANS LE MÊME biotope (pas de bleed cross-biotope ni cross-étage). */
export function biotopeKeyAt(mapId: string, x: number, y: number): string {
    const zone = ZONES[mapId]
    if (!zone?.rects) return mapId
    return mapId + ":" + zone.rects.findIndex((r) => x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2)
}

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
    hour?: number               // heure locale 0-23 (new Date().getHours()) → gate les entrées `hourRange`. Absent = pas de gate horaire
    goshCaught?: boolean        // Goshendofy déjà capturé sur ce compte → ne réapparaît PLUS JAMAIS
    ngplus?: boolean            // NEW GAME+ : bascule sur les pools RUN 2 (NGPLUS_ZONES) pour les zones re-mixées
    run3?: boolean              // RUN 3 (concours) : bascule sur les pools RUN 3 (RUN3_ZONES) — espèces INÉDITES (chaque run différent)
    champion?: boolean          // isChampion (LIVE post-Ligue) → active le RATTRAPAGE des inédits run 3 au champ + Grotte
    run3Used?: boolean          // run 3 déjà fait → rattrapage RARE (sinon ULTRA-RARE : teaser « regarde ce que t'as raté »)
    caughtSpecies?: readonly string[] // Pokédex des captures → gate les entrées `catchOnce` (ex. Pyropanthe, Panthéon run 3)
    fusionLeagueWon?: boolean   // le joueur a-t-il déjà vaincu la Ligue de Fusion ? → débloque les créatures anciennes B2F (requiresFusionLeague)
    blockedSpecies?: readonly string[] // espèces DÉFINITIVEMENT bloquées pour ce joueur → ne popent JAMAIS (ex. Caninombre scellé après un défi némésis perdu)
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
        if (z.rects?.some((r) => r.pool.some((e) => e.speciesId === speciesId))) return true // biotopes (Grotte B1F)
        const tg = z.trainingGrid
        if (tg) {
            if (tg.legendary?.speciesId === speciesId) return true
            if (Object.values(tg.typePools).some((p) => p.some((e) => e.speciesId === speciesId))) return true
        }
        return false
    })
}

// ── DAEMOMANIAQUE (guide de capture) : « OÙ / QUAND / COMMENT », SCOPÉ PAR RUN (run 1 = ZONES · run 2 =
//    NGPLUS_ZONES · run 3 = RUN3_ZONES) → chaque run ne donne QUE ses propres localisations (fix : plus de
//    mélange inter-runs). Module PUR (noms de cartes inlinés, pas de cycle maps.ts).
//    Précision Sartay : « Route Nord » = hautes herbes au NORD de Ville Jaune ; « Hautes Herbes » = Cendreville. ──
const GUIDE_MAP_NAMES: Record<string, string> = {
    yellow_route_nord: "Route Nord", yellow_grotte: "Grotte Rocheuse", yellow_grotte_gelee: "Grotte Gelée",
    yellow_plage: "Plage", yellow_centrale: "Centrale", yellow_maison_hantee: "Maison Hantée",
    yellow_hautes_herbes: "Hautes Herbes (Cendreville)", yellow_cendreville: "Cendreville",
    yellow_grotte_nexus: "Grotte du Nexus (1F)", yellow_grotte_nexus_b1f: "Grotte du Nexus (B1F)", yellow_grotte_nexus_b2f: "Grotte du Nexus (B2F)",
}
const guideMapName = (mapId: string) => GUIDE_MAP_NAMES[mapId] ?? mapId
const rarityBand = (base: number) => base >= 100 ? "très commun" : base >= UNCOMMON ? "assez commun" : base >= RARE ? "rare" : base >= VERY_RARE ? "très rare" : "extrêmement rare"
const GUIDE_EVO_PROBES = [8, 16, 24, 32, 42, 55, 68]
const hourText = (hr: readonly [number, number]) => {
    const [s, e] = hr
    if (e <= s) return `la nuit (${s}h→${e}h)`
    if (s >= 5 && e <= 12) return `le matin (${s}h→${e}h)`
    if (s >= 12 && e <= 20) return `l'après-midi (${s}h→${e}h)`
    return `entre ${s}h et ${e}h`
}
// Cartes ENDGAME (post-Ligue) masquées en RUN 1 tant que le joueur n'est pas Champion — anti-spoiler. UNIQUEMENT
//   la Grotte du Nexus (le casse-tête, accessible via la Zone de Combat = post-Ligue). Les Hautes Herbes de
//   Cendreville (plaine d'entraînement) sont gatées par le badge ÉLEC (pré-Ligue) → contenu run 1 normal, PAS masquées.
const GUIDE_ENDGAME_MAPS = new Set(["yellow_grotte_nexus", "yellow_grotte_nexus_b1f", "yellow_grotte_nexus_b2f"])
// MIROIR du runtime (rollWildEncounter : `RUN3_ZONES[map] || NGPLUS_ZONES[map] || ZONES[map]`) : le guide doit
// RETOMBER sur ZONES pour toute carte NON re-mixée (NGPLUS/RUN3 n'en overrident que 5 sur 11). Sans ce fallback,
// Plage / Grotte du Nexus / Maison Hantée / Hautes Herbes — et donc ukognos, les créations B2F, etc. — étaient
// déclarés à tort « ne se croise pas dans cette run ». Le spread écrase par clé, exactement comme le || par-carte.
const guideTable = (run: number): Record<string, Zone> =>
    run === 2 ? { ...ZONES, ...NGPLUS_ZONES } : run === 3 ? { ...ZONES, ...RUN3_ZONES } : ZONES
// La GRILLE (Hautes Herbes) n'existe que dans ZONES → servie par fallback en run 2/3, mais le runtime
// (rollTrainingGrid) lui applique des modificateurs run-2 que le guide doit REPRODUIRE : en run 2 le légendaire
// goshendofy devient UKOGNOS, et « mottoche » est RETIRÉ des pools de type (exclusif à la Grotte en run 2).
// (run 1 et run 3 : grille inchangée — goshendofy + mottoche présents.)
const guideGridLegendary = (tg: TrainingGrid, run: number): WildEntry | undefined =>
    !tg.legendary ? undefined : run === 2 ? { ...tg.legendary, speciesId: "ukognos" } : tg.legendary
const guideGridTypePool = (pool: WildEntry[], run: number): WildEntry[] =>
    run === 2 ? pool.filter((e) => e.speciesId !== "mottoche") : pool
/** Une entrée peut faire pop l'espèce cible : directement, OU via speciesAtLevel (forme évoluée in situ), sauf noEvolve. */
function entryYields(e: WildEntry, target: string): boolean {
    if (e.speciesId === target) return true
    if (e.noEvolve) return false
    const levels = e.levelFixed != null ? [e.levelFixed]
        : e.levelRange ? [e.levelRange[0], Math.round((e.levelRange[0] + e.levelRange[1]) / 2), e.levelRange[1]]
        : GUIDE_EVO_PROBES
    return levels.some((L) => { try { return speciesAtLevel(e.speciesId, L) === target } catch { return false } })
}
/** Toutes les espèces qu'une entrée peut faire pop (base + formes évoluées in situ). */
function entryYieldSet(e: WildEntry): string[] {
    if (e.noEvolve) return [e.speciesId]
    const levels = e.levelFixed != null ? [e.levelFixed]
        : e.levelRange ? [e.levelRange[0], Math.round((e.levelRange[0] + e.levelRange[1]) / 2), e.levelRange[1]]
        : GUIDE_EVO_PROBES
    const set = new Set<string>([e.speciesId])
    for (const L of levels) { try { set.add(speciesAtLevel(e.speciesId, L)) } catch { /* ignore */ } }
    return [...set]
}
interface GuideMatch { mapId: string; e: WildEntry; gridType?: string; legend?: boolean; dragon?: boolean; pct?: number }
// Taux de pop NEUTRE d'une entrée = base / Σbase du pool où elle vit (formule vérifiée : rollWildEncounter tire
// weight_i/Σweight, et weight = base sans biome/effort). Exact pour Centrale/Cendreville/Maison Hantée/Nexus/pools
// Hautes Herbes ; APPROCHÉ à la Route Nord & Grotte (biomes) et sur les entrées taguées `player` (effort) → un
// avertissement « taux indicatif » est ajouté dans le COMMENT pour ces cas.
const sumBase = (pool: readonly WildEntry[]): number => pool.reduce((s, e) => s + e.base, 0)
const pctOf = (base: number, sum: number): number | undefined => (sum > 0 ? (base / sum) * 100 : undefined)
function guideMatchesRun(target: string, run: number, hideEndgame: boolean): GuideMatch[] {
    const table = guideTable(run)
    const out: GuideMatch[] = []
    for (const mapId of Object.keys(table)) {
        if (hideEndgame && GUIDE_ENDGAME_MAPS.has(mapId)) continue
        const z = table[mapId]
        const poolSum = sumBase(z.pool)
        for (const e of z.pool) if (entryYields(e, target)) out.push({ mapId, e, pct: pctOf(e.base, poolSum) })
        if (z.rects) for (const r of z.rects) { const rs = sumBase(r.pool); for (const e of r.pool) if (entryYields(e, target)) out.push({ mapId, e, pct: pctOf(e.base, rs) }) }
        const tg = z.trainingGrid
        if (tg) {
            for (const [t, pool0] of Object.entries(tg.typePools)) { const pool = guideGridTypePool(pool0, run); const ps = sumBase(pool); for (const e of pool) if (entryYields(e, target)) out.push({ mapId, e, gridType: t, pct: pctOf(e.base, ps) }) }
            const leg = guideGridLegendary(tg, run)
            if (leg && entryYields(leg, target)) out.push({ mapId, e: leg, legend: true })
            if (tg.dragonRare) for (const b of tg.dragonRare.bases) if (entryYields({ speciesId: b, base: VERY_RARE }, target)) out.push({ mapId, e: { speciesId: b, base: VERY_RARE }, dragon: true })
        }
    }
    return out
}
/** Formate un taux en % (une décimale sous 1 % pour les pépites ; entier au-dessus). */
const fmtPct = (p: number): string => `≈${p >= 1 ? Math.round(p) : p.toFixed(1)}%`
export interface CaptureGuide { where: string[]; how: string[]; note: string | null }
/** Guide « où/quand/comment » d'un Daemon POUR UNE RUN donnée (1/2/3). hideEndgame masque les zones post-Ligue
 *  (run 1 avant la Ligue). Ne renvoie QUE des localisations de cette run → chaque mode du Daemomaniaque reste cohérent. */
export function captureGuide(speciesId: string, run: number = 1, hideEndgame: boolean = false, champion: boolean = false): CaptureGuide {
    const sp = getSpecies(speciesId)
    if (!sp) return { where: [], how: [], note: "Créature spéciale — introuvable dans les hautes herbes." }
    const matches = guideMatchesRun(speciesId, run, hideEndgame)
    const where: string[] = []
    const how = new Set<string>()
    let modulated = false // biomes (Route Nord/Grotte) ou effort (tag player) → le % affiché n'est qu'indicatif
    for (const m of matches) {
        // Taux : % réel (base/Σbase) si connu, sinon bande qualitative (légendaire/dragon = pré-rolls, pas de %).
        const rate = m.pct != null ? fmtPct(m.pct) : rarityBand(m.e.base)
        const parts: string[] = [m.gridType ? `📍 Hautes Herbes (Cendreville) — carré ${m.gridType}` : `📍 ${guideMapName(m.mapId)}`, rate]
        if (m.legend) parts.push("légendaire rôdant")
        if (m.dragon) parts.push("dragon rare (plus rare en altitude)")
        if (m.e.levelFixed != null) parts.push(`niv ${m.e.levelFixed}`)
        else if (m.e.levelRange) parts.push(`niv ${m.e.levelRange[0]}-${m.e.levelRange[1]}`)
        if (m.e.hourRange) parts.push(hourText(m.e.hourRange))
        if (m.e.rare) parts.push("pop un peu au-dessus de ton niveau")
        if (m.e.minLeadLevel) parts.push(`lead niv ${m.e.minLeadLevel}+`)
        if (m.e.requiresFusionLeague) parts.push("après la Ligue de Fusion")
        if (m.e.catchOnce) parts.push("1 seule capture possible")
        where.push(parts.join(" · "))
        if ((m.mapId === "yellow_route_nord" || m.mapId === "yellow_grotte") || (m.e as { player?: unknown }).player) modulated = true
        if (m.e.captureRequiresStatus) how.add("Capture IMPOSSIBLE sans statut majeur : endors-le ou gèle-le d'abord.")
        if (m.e.captureMinBallBonus) how.add(`Exige une Ball puissante (ballBonus ≥ ${m.e.captureMinBallBonus}).`)
        if (m.e.captureMult && m.e.captureMult < 1) how.add("Très coriace : descends-le à 1 PV + statut avant de lancer.")
        if (m.gridType) how.add(`Aux Hautes Herbes de Cendreville, le carré du type ${m.gridType} ne sort que certains jours (rotation quotidienne).`)
    }
    // RATTRAPAGE LIVE post-Ligue : une fois CHAMPION (run 1), des inédits du run 3 (Otama, Hypnoppo, Karmaki, Wistree)
    //   deviennent capturables en LIVE (run3LiveCatchupHH/Grotte). Le guide DOIT les ajouter — sinon « ne se croise
    //   pas » à tort (ex. Otama). Ne s'applique qu'à run===1 && champion (jamais en run 2/3, où ils ont leurs zones).
    if (run === 1 && champion) {
        const catchup = run1ChampionCatchup(speciesId)
        if (catchup.length) {
            where.push(...catchup)
            how.add("Rattrapage post-Ligue : ces inédits du run 3 rôdent en LIVE une fois Champion (RARES ; plus fréquents une fois le run 3 terminé).")
        }
    }
    if (where.length === 0) {
        // Pas sauvage dans cette run → obtention SPÉCIALE curée (pierre/objet/échange/cadeau/boss/rôdeur).
        const special = SPECIAL_OBTAIN[speciesId]
        if (special) return { where: special.where ?? [], how: special.how ?? [], note: special.note ?? null }
        // Sinon : repli sur le pré-évolué (récursif — trouve la base sauvage OU sa propre obtention spéciale).
        const preEvo = Object.values(SPECIES).find((s) => (s as { evolution?: { toId?: string } }).evolution?.toId === speciesId)
        if (preEvo) {
            const base = captureGuide(preEvo.id, run, hideEndgame, champion)
            if (base.where.length > 0 || base.how.length > 0) {
                return { where: base.where, how: base.how, note: `${sp.name} n'est pas capturable directement : obtiens ${preEvo.name} (ci-dessus) puis fais-le évoluer.` }
            }
        }
        return { where: [], how: [], note: `${sp.name} ne se croise pas dans cette run — cadeau, boss, ou pas encore accessible.` }
    }
    if (modulated) how.add("Taux indicatif : il grimpe près du biotope de l'espèce et selon tes exercices (pompes/squats).")
    how.add("Affaiblis-le (idéalement 1 PV) puis lance une Ball ; un statut SOMMEIL/GEL multiplie les chances par ~2,5.")
    return { where, how: [...how], note: null }
}
/** Localisations de RATTRAPAGE LIVE post-Ligue (run 1 CHAMPION) — miroir de RUN3_HH_CATCHUP (Hautes Herbes) +
 *  du rôdeur Wistree (Grotte). [] si l'espèce n'est pas concernée. Référence RUN3_HH_CATCHUP au call time (défini plus bas). */
function run1ChampionCatchup(speciesId: string): string[] {
    const hh = RUN3_HH_CATCHUP.find((e) => e.speciesId === speciesId)
    if (hh) {
        const cap = hh.maxLevel != null ? ` · niv ≤ ${hh.maxLevel}` : ""
        return [`📍 Hautes Herbes (Cendreville) — carré ${hh.types.join("/")}${cap} · rattrapage post-Ligue (rare)`]
    }
    if (speciesId === "wistree") return ["📍 Grotte Rocheuse · rôdeur post-Ligue (rare)"]
    return []
}
/** Espèces spawnables dans une run (base + formes évoluées in situ). Fusions/customs exclus par l'appelant (getSpecies null). Mémoïsé. */
const _runSpawnCache: Record<string, Set<string>> = {}
export function runSpawnableSpecies(run: number, hideEndgame: boolean = false): Set<string> {
    const key = `${run}:${hideEndgame ? 1 : 0}`
    if (_runSpawnCache[key]) return _runSpawnCache[key]
    const table = guideTable(run)
    const set = new Set<string>()
    const add = (e: WildEntry) => { for (const s of entryYieldSet(e)) set.add(s) }
    for (const mapId of Object.keys(table)) {
        if (hideEndgame && GUIDE_ENDGAME_MAPS.has(mapId)) continue
        const z = table[mapId]
        z.pool.forEach(add)
        z.rects?.forEach((r) => r.pool.forEach(add))
        const tg = z.trainingGrid
        if (tg) {
            Object.values(tg.typePools).forEach((p) => guideGridTypePool(p, run).forEach(add))
            const leg = guideGridLegendary(tg, run)
            if (leg) add(leg)
            tg.dragonRare?.bases.forEach((b) => add({ speciesId: b, base: VERY_RARE }))
        }
    }
    _runSpawnCache[key] = set
    return set
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

// GROTTE DU NEXUS B2F — les FORMES FINALES des créations CANONISÉES des joueurs + leurs NÉMÉSIS, qui rôdent au fond
//   de la caverne à niv 75. Elles poppent « parfois » (VERY_RARE) et sont TRÈS dures à capturer (captureMult 0.45,
//   difficulté ≈ Sylvebarbe) avec une RAILLERIE au 1er lancer de Ball. Formes finales → noEvolve.
const NEXUS_FINAL_TAUNT = "Ce sont des créatures rares et fougueuses… tu ne pensais tout de même pas l'attraper aussi facilement ?"
const NEXUS_POWERFUL_FINALS: WildEntry[] = [
    "alirocaillus", "mouflorage", "mobyd", "phoechaudiii", "karatame", "shadow", // créations finales (Gavillus/Goatiny/Guizer/Phoéchaud/Bidouzen/Shady)
    "tenebrir", "condombre", "leviabysse", "uzumaro",                            // némésis finales (loup / vautour / serpent des abysses / ninja)
].map((speciesId) => ({ speciesId, base: VERY_RARE, noEvolve: true, levelFixed: 75, captureMult: 0.45, captureTaunt: NEXUS_FINAL_TAUNT }))

// GROTTE DU NEXUS — « ÉCHOS ANCIENS » : des Daemons FINAUX d'une puissance rare rôdent PARFOIS au fond de la caverne,
//   à HAUT NIVEAU (50-90), 1-2 par TYPE (complète les types absents des finales niv 75 ci-dessus). GIGA-rares
//   (base 1 ≈ ~0,1 %/rencontre chacun, ~1,6 % agrégé), DURS à capturer (captureMult 0.4). Formes finales →
//   noEvolve + levelFixed. 100 % attaques EXISTANTES. Choix Sartay : ROCHE=Rochison, PSY=lignée hippo (Omnhippo).
const NEXUS_ECHO_TAUNT = "Une créature étonnamment puissante rôde dans ces profondeurs… tu ne la captureras pas si aisément."
const NEXUS_HIGH_LEVEL_ECHOES: WildEntry[] = ([
    ["aquilord", 75],    // NORMAL/VOL
    ["maitrezenc", 55],  // COMBAT pur
    ["toucanyon", 65],   // VOL/FEU
    ["necrocorbe", 55],  // VOL/POISON
    ["rochison", 55],    // ROCHE/SOL
    ["regnantaur", 60],  // INSECTE/PSY
    ["ombrapanthe", 65], // SPECTRE
    ["dracarlin", 85],   // FEU/DRAGON
    ["aquapanthe", 60],  // EAU
    ["florapanthe", 60], // PLANTE
    ["voltapanthe", 65], // ELEC
    ["cryotyran", 90],   // DRAGON/GLACE
    ["omnhippo", 60],    // PSY (lignée hippo — choix Sartay ; NB: normalement runThreeOnly → ici catchable en Grotte)
    ["vipember", 70],    // PSY/FEU
    // (MÉTAL laissé de côté : les 2 seuls finaux — colosfer/magnetor — sont cachés ET runThreeOnly.)
] as [string, number][]).map(([speciesId, levelFixed]) => ({ speciesId, base: 1, noEvolve: true, levelFixed, captureMult: 0.4, captureTaunt: NEXUS_ECHO_TAUNT }))

const ZONES: Record<string, Zone> = {
    yellow_route_nord: {
        rate: 0.14,
        pool: [
            // Communs (passe-partout / habitats larges)
            { speciesId: "plumiot", base: 60, affinity: ["mountain", "sapin"], repulsion: ["water"] }, // un peu plus rare qu'avant (il est COMMUN sur la Plage)
            { speciesId: "couperin", base: COMMON, player: "combat" },
            { speciesId: "cailloutchi", base: VERY_RARE, affinity: ["mountain"], player: "rocheSol" }, // super rare LOIN des montagnes ; ×4 tout près (affinité). Commun dans la Grotte Rocheuse.
            { speciesId: "ruffiant", base: COMMON, affinity: ["sapin"] },
            { speciesId: "cornaissant", base: COMMON, affinity: ["mountain", "sapin"], repulsion: ["water"] },
            // Peu communs (élémentaires, denses dans leur biome)
            { speciesId: "electroatiss", base: UNCOMMON, player: "elec" },
            { speciesId: "pampousse", base: UNCOMMON, affinity: ["sapin"] },
            { speciesId: "fennaise", base: UNCOMMON, affinity: ["mountain"], repulsion: ["water"] },
            { speciesId: "lavapetit", base: VERY_RARE, affinity: ["mountain"], repulsion: ["water"] }, // super rare loin des montagnes ; ×4 tout près. Plus commun dans la Grotte Rocheuse.
            // (Eau/Glace — loutrille, piouflot, auroruff — déplacés à la GROTTE GELÉE.)
            { speciesId: "broussours", base: UNCOMMON, affinity: ["sapin"], player: "combat" },
            { speciesId: "trolystrik", base: UNCOMMON, affinity: ["mountain"], player: "combat" },
            { speciesId: "forgeotin", base: UNCOMMON, affinity: ["mountain", "sapin"], player: "combat" },
            // Rares
            { speciesId: "sporbeo", base: RARE, affinity: ["sapin"], player: "rare", rare: true },
            { speciesId: "nouillon", base: RARE, player: "rare", rare: true },
            // Très rare
            { speciesId: "draclet", base: VERY_RARE, affinity: ["mountain"], repulsion: ["water"], player: "rare", rare: true },
            // TIME-GATED : 2 visiteurs spéciaux selon l'heure locale (fenêtres disjointes → 1 seul actif à la fois).
            { speciesId: "colibraise", base: RARE, rare: true, hourRange: [5, 12] },  // MATIN (5h→12h) : le colibri de l'aube (Vol/Feu)
            { speciesId: "carlinou", base: RARE, rare: true, hourRange: [12, 20] },   // APRÈS-MIDI (12h→20h) : le carlin qui lézarde au soleil (Feu/Dragon)
        ],
    },
    // GROTTE ROCHEUSE : habitat des Daemons Roche (+ une rareté spectrale).
    yellow_grotte: {
        rate: 0.16,
        minLevel: 5, // donjon gated (badge Plante) → pas de bébés niv 2
        pool: [
            // 🪨 ROCHE (la grotte) — repulsion water pour laisser le LAC à l'eau (2 biomes).
            { speciesId: "mottoche", base: 180, repulsion: ["water"] },                       // « Magicarpe » rocheux : COMMUN ++
            { speciesId: "cailloutchi", base: COMMON, repulsion: ["water"], player: "rocheSol" }, // rare dehors (loin des montagnes) → COMMUN ici, son vrai habitat rocheux
            { speciesId: "rembodo", base: UNCOMMON, repulsion: ["water"] },                   // Roche/Vol
            { speciesId: "lavapetit", base: 70, repulsion: ["water"] },                       // Roche/Feu — un peu plus commun ici (rare en Route Nord)
            { speciesId: "limaroche", base: UNCOMMON, repulsion: ["water"] },                 // Roche/Psy
            { speciesId: "quadroc", base: UNCOMMON, repulsion: ["water"] },                   // lignée diamant
            { speciesId: "braisecaille", base: VERY_RARE, affinity: ["water"] },              // tortue FEU/EAU : RESTE dans la Rocheuse (au lac)
            // (Eau/Glace — marmoterre, loutrille, têtardoc — déplacés à la GROTTE GELÉE ; braisécaille conservée ici.)
            // 🍄👻🐉 LE FOND (champignons-fantômes + dragon caché)
            { speciesId: "sporbeo", base: UNCOMMON },                                         // champignon-spectre (→ Lampignon → Mycédruide)
            { speciesId: "revemante", base: UNCOMMON },                                       // insecte-fantôme des cavernes
            { speciesId: "draclet", base: VERY_RARE, player: "rare", rare: true },            // la pépite (Vol/Dragon)
        ],
    },
    // GROTTE GELÉE : zone Eau/Glace relocalisée depuis Route Nord + Grotte Rocheuse (mêmes poids, dédupliqués),
    //   + cornaissant & sporbeo aux taux Route Nord (run 1). Sol praticable = donjon (toute case déclenche).
    yellow_grotte_gelee: {
        rate: 0.16,
        minLevel: 5,
        pool: [
            { speciesId: "cornaissant", base: COMMON },
            { speciesId: "loutrille", base: UNCOMMON },
            { speciesId: "piouflot", base: UNCOMMON },
            { speciesId: "auroruff", base: UNCOMMON },
            { speciesId: "marmoterre", base: UNCOMMON },
            { speciesId: "tetardoc", base: UNCOMMON },
            { speciesId: "sporbeo", base: RARE, player: "rare", rare: true },
        ],
    },
    // PLAGE : hautes herbes ('grassTall'). Oiseaux Vol de la Route Nord + créatures diurnes/nocturnes time-gatées.
    //   Rate 0.14 (comme la Route Nord). hourRange = fenêtre d'apparition (heure locale).
    yellow_plage: {
        rate: 0.14,
        pool: [
            { speciesId: "plumiot", base: COMMON },                                 // l'oiseau Vol commun de la Route Nord
            { speciesId: "draclet", base: UNCOMMON },                               // Vol/Dragon : PLUS commun ici (reste super-rare en Route Nord)
            { speciesId: "crocavern", base: UNCOMMON },
            { speciesId: "sepulcru", base: UNCOMMON, hourRange: [8, 20] },          // JOUR (8h→20h)
            { speciesId: "obscurene", base: UNCOMMON, hourRange: [20, 8] },         // NUIT (20h→8h)
            { speciesId: "karmaki", base: RARE, rare: true, hourRange: [0, 12] },   // rare, matinée (0h→12h)
            { speciesId: "hypnoppo", base: RARE, rare: true, hourRange: [12, 24] }, // rare, après-midi/soir (12h→24h)
        ],
    },
    // GROTTE DU NEXUS 1F : biotope unique (pour l'instant ; zones/biotopes → pools suivants). Bases niv 5-30
    //   TOUJOURS en base-1 (noEvolve = grosse exception voulue), Batchu (chauve-souris élec) 15-50, Draclet rare.
    //   ⚠️ Les FUSIONS (mottelave…) ne sont PAS dans ce pool : elles surgissent UNIQUEMENT via la règle
    //   « 2 parents consécutifs → fusion GARANTIE » (gameStore), pas au tirage aléatoire. Pas de biomes ici.
    yellow_grotte_nexus: {
        rate: 0.14,
        minLevel: 5, maxLevel: 50,
        pool: [
            { speciesId: "mottoche", base: COMMON, noEvolve: true, levelRange: [5, 30] },
            { speciesId: "lavapetit", base: COMMON, noEvolve: true, levelRange: [5, 30] },
            { speciesId: "nouillon", base: COMMON, noEvolve: true, levelRange: [5, 30] },
            { speciesId: "piouflot", base: COMMON, noEvolve: true, levelRange: [5, 30] },
            { speciesId: "revemante", base: COMMON, noEvolve: true, levelRange: [5, 30] },
            { speciesId: "sporbeo", base: COMMON, noEvolve: true, levelRange: [5, 30] },
            { speciesId: "ruffiant", base: COMMON, noEvolve: true, levelRange: [5, 30] },
            { speciesId: "tetardoc", base: COMMON, noEvolve: true, levelRange: [5, 30] },
            { speciesId: "batchu", base: COMMON, noEvolve: true, levelRange: [15, 50] },   // chauve-souris élec
            { speciesId: "draclet", base: RARE, noEvolve: true, levelRange: [5, 30] },     // un peu + rare
        ],
    },
    // GROTTE DU NEXUS B1F — 6 BIOTOPES (rectangles). Le pool dépend du RECTANGLE ; hors biotope → aucune rencontre.
    //   Base = mêmes taux/niveaux qu'en 1F (COMMON, base-1, niv 5-30). Chaque biotope a UN rare EXCLUSIF « seul lieu
    //   de pop dans la caverne » à niv 15. Les fusions (paires de parents du biotope) surgissent via la règle de pop
    //   (gameStore) à niv 15. Bornes rectangulaires INCLUSIVES.
    yellow_grotte_nexus_b1f: {
        rate: 0.14,
        minLevel: 5, maxLevel: 30,
        pool: [], // inutilisé : les rects fournissent le pool
        rects: [
            // « dernier couloir » (16,2→26,5) — OBSCURÈNE exclusif (+ fusion Dractriss via draclet+electroatiss)
            { x1: 16, y1: 2, x2: 26, y2: 5, pool: [
                { speciesId: "obscurene", base: RARE, noEvolve: true, levelRange: [15, 15] },
                { speciesId: "mottoche", base: COMMON, noEvolve: true, levelRange: [5, 30] },
                { speciesId: "nouillon", base: COMMON, noEvolve: true, levelRange: [5, 30] },
                { speciesId: "revemante", base: COMMON, noEvolve: true, levelRange: [5, 30] },
                { speciesId: "ruffiant", base: COMMON, noEvolve: true, levelRange: [5, 30] },
                { speciesId: "electroatiss", base: COMMON, noEvolve: true, levelRange: [5, 30] },
                { speciesId: "draclet", base: COMMON, noEvolve: true, levelRange: [5, 30] },
            ] },
            // « 2e couloir » (25,36→44,37) — HYPNOPPO exclusif (+ fusion Dractriss)
            { x1: 25, y1: 36, x2: 44, y2: 37, pool: [
                { speciesId: "hypnoppo", base: RARE, noEvolve: true, levelRange: [15, 15] },
                { speciesId: "trolystrik", base: COMMON, noEvolve: true, levelRange: [5, 30] },
                { speciesId: "draclet", base: COMMON, noEvolve: true, levelRange: [5, 30] },
                { speciesId: "electroatiss", base: COMMON, noEvolve: true, levelRange: [5, 30] },
                { speciesId: "cornaissant", base: COMMON, noEvolve: true, levelRange: [5, 30] },
                { speciesId: "revemante", base: COMMON, noEvolve: true, levelRange: [5, 30] },
            ] },
            // « 1er couloir » (41,23→44,35) — WISTREE exclusif (+ fusion Ruffardoc via ruffiant+tetardoc)
            { x1: 41, y1: 23, x2: 44, y2: 35, pool: [
                { speciesId: "wistree", base: RARE, noEvolve: true, levelRange: [15, 15] },
                { speciesId: "ruffiant", base: COMMON, noEvolve: true, levelRange: [5, 30] },
                { speciesId: "tetardoc", base: COMMON, noEvolve: true, levelRange: [5, 30] },
                { speciesId: "trolystrik", base: COMMON, noEvolve: true, levelRange: [5, 30] },
                { speciesId: "electroatiss", base: COMMON, noEvolve: true, levelRange: [5, 30] },
            ] },
            // « 3e couloir » (17,4→36,6) — CANINOMBRE exclusif (+ fusion Sporémante via revemante+sporbeo)
            { x1: 17, y1: 4, x2: 36, y2: 6, pool: [
                { speciesId: "caninombre", base: RARE, noEvolve: true, levelRange: [15, 15] },
                { speciesId: "lavapetit", base: COMMON, noEvolve: true, levelRange: [5, 30] },
                { speciesId: "piouflot", base: COMMON, noEvolve: true, levelRange: [5, 30] },
                { speciesId: "sporbeo", base: COMMON, noEvolve: true, levelRange: [5, 30] },
                { speciesId: "revemante", base: COMMON, noEvolve: true, levelRange: [5, 30] },
            ] },
            // « 4e couloir » (10,18→23,19) — SHADY exclusif (+ fusion Nouiflot via nouillon+piouflot)
            { x1: 10, y1: 18, x2: 23, y2: 19, pool: [
                { speciesId: "shady", base: RARE, noEvolve: true, levelRange: [15, 15] },
                { speciesId: "mottoche", base: COMMON, noEvolve: true, levelRange: [5, 30] },
                { speciesId: "nouillon", base: COMMON, noEvolve: true, levelRange: [5, 30] },
                { speciesId: "piouflot", base: COMMON, noEvolve: true, levelRange: [5, 30] },
                { speciesId: "tetardoc", base: COMMON, noEvolve: true, levelRange: [5, 30] },
            ] },
            // « 5e couloir » (2,5→6,19) — GAVILLUS exclusif (rare) (+ fusion Mottelave via mottoche+lavapetit)
            { x1: 2, y1: 5, x2: 6, y2: 19, pool: [
                { speciesId: "gavillus", base: VERY_RARE, noEvolve: true, levelRange: [15, 15] },
                { speciesId: "mottoche", base: COMMON, noEvolve: true, levelRange: [5, 30] },
                { speciesId: "lavapetit", base: COMMON, noEvolve: true, levelRange: [5, 30] },
                { speciesId: "nouillon", base: COMMON, noEvolve: true, levelRange: [5, 30] },
                { speciesId: "revemante", base: COMMON, noEvolve: true, levelRange: [5, 30] },
                { speciesId: "ruffiant", base: COMMON, noEvolve: true, levelRange: [5, 30] },
            ] },
        ],
    },
    // GROTTE DU NEXUS B2F — LE SANCTUAIRE DES CRÉATIONS (le fond de la caverne, aux portes d'Ukognofy). UN seul grand
    //   biotope (pas de rects). Deux tiers :
    //   • BASE catchable (niv ~25) : Goatiny/Guizer/Bidouzen — les 3 créations « réservées à la Grotte du Nexus »
    //     enfin posées, en base-1 (à faire évoluer soi-même).
    //   • PUISSANT (niv 75) : les FORMES FINALES des créations canonisées + leurs NÉMÉSIS (NEXUS_POWERFUL_FINALS),
    //     TRÈS dures à capturer + raillerie au 1er lancer. Poppent « parfois » (VERY_RARE).
    //   Fodder base-1 (niv 20-40) incluant les parents de fusion (Dractriss draclet+electroatiss · Nouiflot
    //     nouillon+piouflot) → la CHAÎNE UKOGNOFY est armable ici (croiser une fusion → Repousse → échelle).
    yellow_grotte_nexus_b2f: {
        rate: 0.14,
        minLevel: 20, maxLevel: 40,
        pool: [
            // FODDER (base-1, niv 20-40) — dont les parents de fusion pour la chaîne Ukognofy.
            { speciesId: "mottoche", base: COMMON, noEvolve: true, levelRange: [20, 40] },
            { speciesId: "nouillon", base: COMMON, noEvolve: true, levelRange: [20, 40] },
            { speciesId: "piouflot", base: COMMON, noEvolve: true, levelRange: [20, 40] },
            { speciesId: "tetardoc", base: COMMON, noEvolve: true, levelRange: [20, 40] },
            { speciesId: "electroatiss", base: COMMON, noEvolve: true, levelRange: [20, 40] },
            { speciesId: "draclet", base: COMMON, noEvolve: true, levelRange: [20, 40] },
            { speciesId: "ruffiant", base: COMMON, noEvolve: true, levelRange: [20, 40] },
            { speciesId: "revemante", base: COMMON, noEvolve: true, levelRange: [20, 40] },
            // BASE CRÉATIONS catchables (niv ~25, base-1) — à faire évoluer soi-même.
            { speciesId: "goatiny", base: RARE, noEvolve: true, levelRange: [23, 27] },   // → Mouflorage (Sol/Élec)
            { speciesId: "guizer", base: RARE, noEvolve: true, levelRange: [23, 27] },    // → Dalugazer → Moby D (Eau/Glace)
            { speciesId: "bidouzen", base: RARE, noEvolve: true, levelRange: [23, 27] },  // → Medisciple → Karatame (Psy/Combat)
            // PUISSANTS niv 75 (formes finales + némésis, TRÈS dur à capturer + raillerie).
            ...NEXUS_POWERFUL_FINALS,
            // ÉCHOS ANCIENS — finaux haut niveau (50-90), 1-2 par TYPE, GIGA-rares (cf. NEXUS_HIGH_LEVEL_ECHOES).
            ...NEXUS_HIGH_LEVEL_ECHOES,
            // CRÉATURES TRÈS ANCIENNES (9 inédites) — DÉBLOQUÉES après la 1re victoire à la LIGUE DE FUSION
            //   (requiresFusionLeague). Pop niv 5-90 : la lignée ÉVOLUE avec le niveau (speciesAtLevel) → base à
            //   bas niveau, finale à haut niveau. Gros LATE BLOOMERS (courbe slow) → capture TÔT = +20 % EV (lateBloomerEv).
            { speciesId: "rosdrakis", base: RARE, levelRange: [5, 90], requiresFusionLeague: true },   // → Dracosidhe (Dragon/Fée, sweeper spé)
            { speciesId: "archeoptix", base: RARE, levelRange: [5, 90], requiresFusionLeague: true },  // → Ptérosidhe (Vol/Fée, rapide phys)
            { speciesId: "toxyrm", base: RARE, levelRange: [5, 90], requiresFusionLeague: true },      // → Wyvortal (Fée/Poison, mur)
            { speciesId: "fulguror", base: RARE, levelRange: [5, 90], requiresFusionLeague: true },    // Électrik (canon de verre spé)
            { speciesId: "rocosaure", base: RARE, levelRange: [5, 90], requiresFusionLeague: true },   // Roche (mur physique)
            { speciesId: "givroptere", base: RARE, levelRange: [5, 90], requiresFusionLeague: true },  // Vol/Glace (équilibré)
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
            { speciesId: "blaziper", base: UNCOMMON },
            { speciesId: "jerbiwat", base: 5, rare: true, captureMult: 0.5 }, // run 2 : rendu TRÈS rare (~0,75 % : 5/663) + capture ÷2 (trop courant à UNCOMMON — choix Sartay)
            { speciesId: "bouh", base: UNCOMMON },
            { speciesId: "colibraise", base: UNCOMMON },
            // Rares — le starter Plante (Gouttiny/Glacirex déplacés à la GROTTE GELÉE ; Braisille/Fennaise → CENTRALE FEU)
            { speciesId: "feuillichot", base: RARE, rare: true },
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
            { speciesId: "cailloutchi", base: COMMON },
            // Peu communs
            { speciesId: "rembodo", base: UNCOMMON }, { speciesId: "limaroche", base: 20 }, // limaroche allégé 45→20 (choix Sartay 13/08)
            { speciesId: "quadroc", base: UNCOMMON },
            { speciesId: "sporbeo", base: UNCOMMON }, { speciesId: "revemante", base: UNCOMMON },
            // Rare — un spectre (Têtardoc/Marmoterre/Loutrille/Orcaline déplacés à la GROTTE GELÉE)
            { speciesId: "namicha", base: RARE, noEvolve: true },
            // Super rare — Mottoche rétrogradé. TOUJOURS stade 1 (noEvolve) ET à un NIVEAU FIXE 5, indépendant
            // du niveau du lead (levelFixed → bypass du scaling) : jamais sa lignée évoluée, jamais scalé haut.
            { speciesId: "mottoche", base: VERY_RARE, noEvolve: true, levelFixed: 5 },
        ],
    },
    // GROTTE GELÉE run 2 — Eau/Glace relocalisées (mêmes poids) + cornaissant (taux Route Nord run 2).
    yellow_grotte_gelee: {
        rate: 0.16, minLevel: 5,
        pool: [
            { speciesId: "tetardoc", base: COMMON }, { speciesId: "cornaissant", base: COMMON },
            { speciesId: "glacirex", base: UNCOMMON }, { speciesId: "marmoterre", base: UNCOMMON }, { speciesId: "loutrille", base: UNCOMMON },
            { speciesId: "gouttiny", base: RARE, rare: true },
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
            { speciesId: "colibraise", base: 18 },
            { speciesId: "hibouh", base: 8 }, { speciesId: "pyrozly", base: 7 },
            { speciesId: "jerbiwat", base: 0.65, rare: true }, { speciesId: "lavapetit", base: 5 }, // Jerbiwat = PÉPITE ciblée à 0,5 % (0,65/128,65 ; trop utilisé — choix Sartay 24/07). Poids fractionnaire volontaire.
            { speciesId: "nouillon", base: 3 }, { speciesId: "ruffiant", base: 3 },
            { speciesId: "revemante", base: 2 },
            // (Eau/Glace — tetardoc, piouflot, auroruff, glacirex — déplacés à la GROTTE GELÉE run 3.)
            // CRÉATIONS (Gavillus/Goatiny/Guizer) RETIRÉES du run 3 → réservées à la Grotte du Nexus (puzzle), à venir.
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
            { speciesId: "braisecaille", base: 5 }, { speciesId: "brook", base: 5 }, // Braisécaille RESTE dans la Rocheuse ; Forgeotin (Combat) → Maison Combat run 3
            // les 3 starters du run 1 (nostalgie, rares)
            { speciesId: "feuillichot", base: 2, rare: true }, { speciesId: "braisille", base: 2, rare: true },
            { speciesId: "draclet", base: 1, rare: true },
            { speciesId: "rembodo", base: 1 }, { speciesId: "namicha", base: 1, noEvolve: true },
            // (Eau/Glace — belunode, orcaline — déplacés à la GROTTE GELÉE run 3.)
            { speciesId: "wistree", base: 2, noEvolve: true, rare: true, captureMult: 0.4 }, // Spectre/Plante rare & mystérieux (voleur d'éclat)
            // PHOÉCHAUD (création Guillaume, phénix maudit FEU/SPECTRE) — capturable au STADE 1 puis évolution (22→40).
            // Ajouté ici (choix Sartay 03/08) pour rendre la lignée complétable au dex. levelRange bas = garantit la base.
            { speciesId: "phoechaudi", base: 3, levelRange: [12, 18], captureMult: 0.5 },
            // CRÉATIONS (Guizer & Shady) RETIRÉES du run 3 → réservées à la Grotte du Nexus (puzzle), à venir.
        ],
    },
    // GROTTE GELÉE run 3 — Eau/Glace relocalisées (mêmes poids relatifs). Pas de cornaissant/sporbeo (absents de Route Nord run 3).
    yellow_grotte_gelee: {
        rate: 0.16, minLevel: 5,
        pool: [
            { speciesId: "tetardoc", base: 18 },
            { speciesId: "piouflot", base: 3 }, { speciesId: "auroruff", base: 3 },
            { speciesId: "gouttiny", base: 2, rare: true },
            { speciesId: "belunode", base: 1 }, { speciesId: "glacirex", base: 1, rare: true },
            { speciesId: "orcaline", base: 1, noEvolve: true, rare: true, minLeadLevel: 35 },
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
            { speciesId: "jerbiwat", base: 2, levelRange: [38, 42], captureMult: 0.5 },        // ULTRA-rare standalone (~1,5 %→~0,5 %, trop utilisé — choix Sartay 24/07)
            { speciesId: "chouhante", base: 12, noEvolve: true, levelRange: [28, 33] },        // rare (pas d'Archibouh)
            // — INÉDITES (discrètes ~18% ; la garantie assure quand même la découverte d'Hypnoppo/Karmaki) —
            { speciesId: "hypnoppo", base: 40, levelRange: [7, 15] },                          // peu commun (base <16)
            { speciesId: "hypnoppo", base: 12, levelRange: [18, 33] },                         // rare → Téléppo
            { speciesId: "karmaki", base: 12, noEvolve: true, levelRange: [28, 56] },          // rare, grande fourchette (mono)
            { speciesId: "omnhippo", base: 3, noEvolve: true, levelRange: [48, 52], catchOnce: true, captureMult: 0.5 }, // ultra-rare pépite
            // CRÉATION Bidouzen (Embi) RETIRÉE du run 3 → réservée à la Grotte du Nexus (puzzle), à venir.
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

/** L'heure `hour` (0-23) est-elle dans la fenêtre [s, e[ ? Si e <= s, la fenêtre enjambe minuit (ex. [20,8] = 20h→8h). */
function inHourRange(hour: number, [s, e]: [number, number]): boolean {
    return s < e ? (hour >= s && hour < e) : (hour >= s || hour < e)
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

    // BIOTOPES (Grotte B1F) : le pool dépend du RECTANGLE contenant (x,y). Hors de tout biotope → aucune rencontre.
    const pool = zone.rects ? (rectAt(zone.rects, ctx.x, ctx.y)?.pool ?? null) : zone.pool
    if (!pool) return null

    // Poids par entrée ; une entrée `minLeadLevel` non atteinte → poids 0 (invisible tant que l'équipe est trop faible).
    const weights = pool.map((e) =>
        (e.minLeadLevel != null && ctx.leadLevel < e.minLeadLevel) ? 0
        : (ctx.blockedSpecies?.includes(e.speciesId)) ? 0 // espèce scellée pour ce joueur (ex. Caninombre après défi némésis perdu) → ne pope jamais
        : (e.hourRange && ctx.hour != null && !inHourRange(ctx.hour, e.hourRange)) ? 0 // gate horaire (ex. Karmaki 0-12h, Hypnoppo 12-24h)
        : (e.catchOnce && ctx.caughtSpecies?.includes(e.speciesId)) ? 0 // ex. Pyropanthe déjà capturée → ne repop plus
        : (e.requiresFusionLeague && !ctx.fusionLeagueWon) ? 0 // créatures anciennes B2F : verrouillées avant la 1re victoire Ligue Fusion
        : entryWeight(e, ctx.mapId, ctx.x, ctx.y, ctx.player))
    const total = weights.reduce((a, w) => a + w, 0)
    if (total <= 0) return null

    let r = rng() * total
    let idx = 0
    for (let i = 0; i < pool.length; i++) {
        if (r < weights[i]) { idx = i; break }
        r -= weights[i]
    }
    const entry = pool[idx]

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
    if (entry.captureTaunt) battleCfg.captureTaunt = entry.captureTaunt
    if (entry.captureRequiresStatus) battleCfg.captureRequiresStatus = true
    if (entry.captureStatusBypassesBall) battleCfg.captureStatusBypassesBall = true
    Object.assign(mon, battleCfg)
    return mon
}

/** VŒU DU GÉNIE — construit un spawn FORCÉ (rencontre imposée par un vœu). `hard` = capture BRUTALE façon légendaire
 *  (statut majeur requis + Ball très puissante ballBonus≥5 + très coriace, captureMult 0.5) → quasi increvable. */
export function buildForcedSpawn(speciesId: string, level: number, hard: boolean): MonInstance {
    const lvl = Math.max(1, Math.min(100, Math.floor(level)))
    const mon = createMonInstance(speciesId, lvl, { owned: false })
    if (hard) Object.assign(mon, { captureRequiresStatus: true, captureMinBallBonus: 5, captureMult: 0.5 })
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
