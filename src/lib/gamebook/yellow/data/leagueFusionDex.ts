// FICHES DE FUSION DE LA LIGUE — les fusions affrontées à la Ligue de Fusion (bronze/argent/or) ne sont PAS
//   capturables (id éphémère jetable en combat). Ici on en dérive une ESPÈCE PERMANENTE (fiche stable) à partir de
//   leur définition curée (nom/attaques/sprite) + computeFusion (types/stats des 2 parents), pour les afficher dans
//   le FUSIODEX à la RENCONTRE. Distinctes des FUSION_BASE_SPECIES (fusions capturables de la Grotte, dexNo 500-543).
//   dexNo dédié 550+. Construites paresseusement (après chargement de SPECIES) et enregistrées via
//   reregisterCustomDaemons (comme FUSION_BASE_SPECIES).

import type { SpeciesData, PokeType } from "../battle/types"
import { getSpecies } from "./species"
import { computeFusion, type FusionParent } from "./fusionSpecies"
import { allEncounterableFusionDefs, type FusionPairDef } from "./fusionLeague"
import { fusionSpritePath } from "./fusionSprite"
import { LEAGUE_FUSION_DESC } from "./leagueFusionDesc"

/** Base des dexNo des fusions de Ligue (au-dessus des fusions Grotte 500-543). */
const LEAGUE_FUSION_DEX_BASE = 550

/** Slug stable et unique dérivé du NOM (les noms de fusion de Ligue sont uniques par design). */
export function leagueFusionId(name: string): string {
    return "lfus_" + name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
}

/** Clé de paire de parents, ORDRE INDIFFÉRENT (pour retrouver la fusion depuis ses 2 parents à la rencontre). */
function pairKey(a: string, b: string): string {
    return a < b ? `${a}|${b}` : `${b}|${a}`
}

function parentFromSpecies(id: string): FusionParent | null {
    const sp = getSpecies(id)
    if (!sp) return null
    return { name: sp.name, types: sp.types, stats: sp.baseStats, level: 1, moves: sp.learnset.map((l) => l.moveId), speciesId: sp.id }
}

let _species: SpeciesData[] | null = null
let _idByPair: Map<string, string> | null = null

function build(): void {
    const defs = allEncounterableFusionDefs()
    const list: SpeciesData[] = []
    const byPair = new Map<string, string>()
    let idx = 0
    for (const def of defs) {
        const pa = parentFromSpecies(def.a), pb = parentFromSpecies(def.b)
        if (!pa || !pb) continue // parent non résolu (custom non chargé) → on saute (jamais de crash)
        const f = computeFusion(pa, pb)
        const id = leagueFusionId(def.name)
        const moves = (def.moves && def.moves.length ? def.moves : f.moves).slice(0, 4)
        list.push({
            id,
            dexNo: LEAGUE_FUSION_DEX_BASE + idx,
            name: def.name,
            types: f.types as PokeType[],
            baseStats: f.stats,
            learnset: moves.map((moveId) => ({ level: 1, moveId })),
            catchRate: 3,
            baseExp: 90,
            rarity: "RARE",
            growthRate: "medium_fast",
            description: LEAGUE_FUSION_DESC[id] ?? `Fusion de la Ligue née de ${pa.name} et ${pb.name}.`,
            sprite: def.sprite ?? fusionSpritePath(def.name),
            fusionParents: [def.a, def.b],
        })
        byPair.set(pairKey(def.a, def.b), id)
        idx++
    }
    _species = list
    _idByPair = byPair
}

/** Espèces-fiches des fusions de Ligue (mémoïsé ; construit après le chargement de SPECIES). */
export function leagueFusionSpecies(): SpeciesData[] {
    if (!_species) build()
    return _species!
}

/** id de fiche stable pour une PAIRE de parents (ordre indifférent), ou null si ce n'est pas une fusion de Ligue. */
export function leagueFusionIdForParents(a: string, b: string): string | null {
    if (!_idByPair) build()
    return _idByPair!.get(pairKey(a, b)) ?? null
}

/** Tous les ids de fiches de fusion de Ligue (pour le FUSIODEX). */
export function leagueFusionIds(): string[] {
    return leagueFusionSpecies().map((s) => s.id)
}
