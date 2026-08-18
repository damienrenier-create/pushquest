// src/lib/gamebook/yellow/data/fusiodex.ts
//
// FUSIODEX — le « Pokédex » des fusions. Se DÉBLOQUE à la 1re arrivée au Dôme Fusion (Autel), quand le Dieu
// Spaghetti explique le lieu. Trois pages : ① règles exhaustives de la fusion, ② fusions OFFICIELLES aperçues
// (celles à sprite permanent), ③ fusions que le joueur a CRÉÉES (depuis son roster d'Autel).
//
// ⚠️ ANTI-SPOILER (Sartay, en capitales) : un Daemon fusionné ne doit apparaître dans AUCUN document tant qu'il
// n'a pas été APERÇU ET que le joueur n'est PAS arrivé au Dôme Fusion. → (a) le Fusiodex lui-même est gated par
// AUTEL_VISITED_MARKER (arrivé au Dôme) ; (b) une fusion officielle NON aperçue ne révèle ni nom, ni sprite, ni
// type (rendue « ??? » côté UI). Les fusions n'étant pas dans SPECIES, le Pokédex principal ne les voit jamais.

import type { PokeType, SpeciesData } from "../battle/types"
import { FUSION_BASE_SPECIES } from "./fusionBaseSpecies"
import { FUSION_RULES } from "./fusionLore"
import { computeFusion, type FusionParent, type FusionStats } from "./fusionSpecies"
import { getSpecies } from "./species"

export { FUSION_RULES }

/** Marker (defeatedTrainers) posé à la 1re arrivée au Dôme Fusion (Autel). GATE du Fusiodex + de l'anti-spoiler. */
export const AUTEL_VISITED_MARKER = "autel_visited"

/** Marker (defeatedTrainers) posé à la 1re ENTRÉE dans la Grotte Puzzle → jauge anti-spoiler des fusions CROSS-JOUEUR. */
export const GROTTE_ENTERED_MARKER = "grotte_entered"
const MISSINGNO_SPRITE = "/yellow/sprites/dex/missingno.png"
/** Une espèce est-elle une FUSION (dexNo ≥ 500, ou Ukognofy) → à masquer pour qui n'a pas vu la Grotte. */
export function isFusionSpeciesId(speciesId: string): boolean {
    return (getSpecies(speciesId)?.dexNo ?? 0) >= 500 || speciesId === "ukognofy"
}
/** Vue ANTI-SPOILER d'un Daemon d'AUTRUI : si c'est une fusion ET que le VIEWER n'a jamais mis les pieds dans la
 *  Grotte Puzzle → MissingNo + « ??? ». Sinon le vrai sprite/nom. À utiliser dans espion / échange / classements. */
export function fusionMaskedView(speciesId: string, viewerEnteredGrotte: boolean): { sprite: string; name: string; masked: boolean } {
    const sp = getSpecies(speciesId)
    if (!viewerEnteredGrotte && isFusionSpeciesId(speciesId)) return { sprite: MISSINGNO_SPRITE, name: "???", masked: true }
    return { sprite: sp?.sprite ?? MISSINGNO_SPRITE, name: sp?.name ?? "Daemon", masked: false }
}

/** Le Dieu Spaghetti explique le Dôme à la 1re arrivée → débloque le Fusiodex dans le menu du joueur. */
export const DOME_SPAGHETTI_LINES = [
    "*Une vapeur de sauce divine s'élève de l'autel central…*",
    "« Bienvenue au DÔME DE LA FUSION, jeune Dresseur. Ici, deux Daemons n'en font plus qu'UN. »",
    "« Dépose deux créatures sur l'Autel de la Chimère : elles fusionnent en un construct de combat unique — et se retrouvent intactes ensuite. »",
    "« Remporte les épreuves de l'autel, puis défie la LIGUE DE FUSION quand la porte à dragons s'ouvrira. »",
    "« Le marchand te l'a vendue comme la “Ligue Ultime” ? C'est un seul et même défi : la LIGUE DE FUSION EST l'ultime épreuve du Nexus. »",
    "« Et tiens : je débloque pour toi le FUSIODEX ! Les règles de la fusion, les chimères que tu croiseras, celles que TU créeras. Il t'attend dans ton menu. »",
]

export interface OfficialFusionEntry {
    id: string
    name: string
    types: PokeType[]
    dexNo: number
    sprite?: string
    description?: string
    seen: boolean
}

/** Les fusions OFFICIELLES (espèces permanentes à sprite : les 5 fusions de base). Le drapeau `seen` dit si le
 *  joueur l'a APERÇUE — l'UI masque tout (nom/sprite/type) des entrées non vues (anti-spoiler). */
export function officialFusions(seenIds: string[]): OfficialFusionEntry[] {
    return FUSION_BASE_SPECIES.map((s) => ({
        id: s.id,
        name: s.name,
        types: s.types,
        dexNo: s.dexNo,
        sprite: s.sprite,
        description: s.description,
        seen: seenIds.includes(s.id),
    }))
}

/** Nombre de fusions officielles aperçues / total (badge de progression du Fusiodex). */
export function officialFusionProgress(seenIds: string[]): { seen: number; total: number } {
    const total = FUSION_BASE_SPECIES.length
    const seen = FUSION_BASE_SPECIES.filter((s) => seenIds.includes(s.id)).length
    return { seen, total }
}

// ── HISTORIQUE « Mes fusions » : reconstruit nom+types+stats depuis une simple paire de speciesId, SANS instance
//    de combat (module pur fusionSpecies). L'ORDRE compte (a = tête/dominant → moitié du nom + ordre des types). ──

/** FusionParent à partir d'une ESPÈCE seule : level/moves sont des placeholders (sans effet sur nom/types). */
function fusionParentFromSpecies(sp: SpeciesData): FusionParent {
    return { name: sp.name, types: sp.types, stats: sp.baseStats, level: 1, moves: sp.learnset.map((l) => l.moveId), speciesId: sp.id }
}

export interface HistoryFusionEntry {
    key: string
    name: string
    types: string[]
    parents: [string, string]
    stats: FusionStats // 5 stats (Spéciale unique)
    bst: number
}

const EMPTY_FUSION_STATS: FusionStats = { hp: 0, atk: 0, def: 0, spe: 0, spc: 0 }

/** Reconstruit l'affichage de chaque fusion de l'historique (paires {a,b} = speciesId, a=tête). Dédup par paire.
 *  Une paire dont une espèce n'est plus résoluble (ex. lignée custom évincée) est CONSERVÉE avec un libellé neutre
 *  (bst=0 → l'UI la rend en placeholder) plutôt que masquée — le journal reste « à jamais ». Stats = BASE de la fusion. */
export function historyFusions(history: { a: string; b: string }[]): HistoryFusionEntry[] {
    const out: HistoryFusionEntry[] = []
    const seen = new Set<string>()
    for (const { a, b } of history) {
        const key = `${a}|${b}`
        if (seen.has(key)) continue
        seen.add(key)
        const spA = getSpecies(a), spB = getSpecies(b)
        if (!spA || !spB) {
            out.push({ key, name: "Fusion oubliée", types: [], parents: [spA?.name ?? a, spB?.name ?? b], stats: EMPTY_FUSION_STATS, bst: 0 })
            continue
        }
        const res = computeFusion(fusionParentFromSpecies(spA), fusionParentFromSpecies(spB))
        const bst = (Object.values(res.stats) as number[]).reduce((x, y) => x + y, 0)
        out.push({ key, name: res.name, types: [...res.types], parents: [spA.name, spB.name], stats: res.stats, bst })
    }
    return out
}
