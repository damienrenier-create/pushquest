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
import { leagueFusionSpecies } from "./leagueFusionDex"
import { FUSION_RULES } from "./fusionLore"
import { computeFusion, type FusionParent, type FusionStats } from "./fusionSpecies"
import { getSpecies } from "./species"
import { getItem } from "./items"

export { FUSION_RULES }

/** Marker (defeatedTrainers) posé à la 1re arrivée au Dôme Fusion (Autel). GATE du Fusiodex + de l'anti-spoiler. */
export const AUTEL_VISITED_MARKER = "autel_visited"

/** Marker (defeatedTrainers) posé à la 1re ENTRÉE dans la Grotte Puzzle → jauge anti-spoiler des fusions CROSS-JOUEUR. */
export const GROTTE_ENTERED_MARKER = "grotte_entered"
const MISSINGNO_SPRITE = "/yellow/sprites/dex/missingno.png"
/** Une espèce est-elle dans la PLAGE fusion/custom (dexNo ≥ 500, ou Ukognofy) ? ⚠️ inclut les Daemons CUSTOM (Créateur),
 *  qui partagent cette plage sans être des fusions → pour toute logique SPÉCIFIQUE aux fusions, utiliser `isTrueFusion`. */
export function isFusionSpeciesId(speciesId: string): boolean {
    return (getSpecies(speciesId)?.dexNo ?? 0) >= 500 || speciesId === "ukognofy"
}
/** VRAIE fusion (native/capturée) : plage fusion MAIS PAS un Daemon CUSTOM (id « custom_… »). Un custom n'est NI soumis
 *  à la règle de super-fusion, NI masqué comme une fusion. Discriminant = préfixe d'id (fiable même au runtime). */
export function isTrueFusion(speciesId: string): boolean {
    return isFusionSpeciesId(speciesId) && !speciesId.startsWith("custom_")
}

/** Daemons « stade ULTIME » qui ne peuvent JAMAIS fusionner (ni comme parent). MégamonarX est déjà l'aboutissement.
 *  Extensible (Sartay) — ajoute ici un id pour l'exclure de toute fusion. */
export const NON_FUSABLE_IDS: readonly string[] = ["megamonarx"]

/** Valide une PAIRE de parents à l'Autel / au roster de Ligue. Renvoie un message d'ERREUR (à toaster) ou null si OK.
 *  RÈGLES (Sartay) : (1) jamais deux fois la MÊME espèce ; (2) un stade ULTIME (MégamonarX…) ne fusionne jamais ;
 *  (3) SUPER-FUSION — une fusion (native/capturée, dexNo ≥ 500 ou Ukognofy) ne fusionne QU'AVEC une AUTRE fusion,
 *  jamais avec un Daemon normal (et réciproquement). Déterministe → même verdict à l'Autel, au roster et en PvP. */
export function fusionPairError(aSpeciesId: string, bSpeciesId: string): string | null {
    if (aSpeciesId === bSpeciesId) return "Impossible de fusionner deux Daemons de la MÊME espèce."
    if (NON_FUSABLE_IDS.includes(aSpeciesId) || NON_FUSABLE_IDS.includes(bSpeciesId)) return "Ce Daemon est un stade ultime : il ne peut pas fusionner."
    // SUPER-FUSION : seules les VRAIES fusions (isTrueFusion) sont soumises à « fusion + fusion uniquement ». Un Daemon
    //   CUSTOM partage la plage dexNo≥500 sans être une fusion → il fusionne comme un normal.
    if (isTrueFusion(aSpeciesId) !== isTrueFusion(bSpeciesId)) return "Une fusion ne peut fusionner qu'avec une AUTRE fusion (native ou capturée)."
    return null
}
/** Vue ANTI-SPOILER d'un Daemon d'AUTRUI : si c'est une fusion ET que le VIEWER n'a jamais mis les pieds dans la
 *  Grotte Puzzle → MissingNo + « ??? ». Sinon le vrai sprite/nom. À utiliser dans espion / échange / classements. */
export function fusionMaskedView(speciesId: string, viewerEnteredGrotte: boolean): { sprite: string; name: string; masked: boolean } {
    const sp = getSpecies(speciesId)
    if (!viewerEnteredGrotte && isTrueFusion(speciesId)) return { sprite: MISSINGNO_SPRITE, name: "???", masked: true }
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

/** Espèces RACINES du Fusiodex : celles qui ne sont l'ÉVOLUTION d'aucune autre (base-1 des lignées). Seules elles
 *  sont listées dans l'onglet « Officielles » ; les stades évolués (S2+) n'apparaissent QUE dans la LIGNÉE de leur
 *  racine (fiche), jamais en vrac → pas de spoiler de la profondeur ni du compte. */
export function fusionRootSpeciesIds(): Set<string> {
    const targets = new Set<string>()
    for (const s of FUSION_BASE_SPECIES) if (s.evolution?.toId) targets.add(s.evolution.toId)
    return new Set(FUSION_BASE_SPECIES.filter((s) => !targets.has(s.id)).map((s) => s.id))
}

/** Les fusions OFFICIELLES RACINES (espèces permanentes à sprite). Le drapeau `seen` dit si le joueur l'a APERÇUE
 *  — l'UI masque tout (nom/sprite/type) des entrées non vues (anti-spoiler). Les stades évolués sont exclus d'ici. */
export function officialFusions(seenIds: string[]): OfficialFusionEntry[] {
    const roots = fusionRootSpeciesIds()
    const grotte = FUSION_BASE_SPECIES.filter((s) => roots.has(s.id)).map((s) => ({
        id: s.id,
        name: s.name,
        types: s.types,
        dexNo: s.dexNo,
        sprite: s.sprite,
        description: s.description,
        seen: seenIds.includes(s.id),
    }))
    // FUSIONS DE LA LIGUE (non capturables) : aperçues à la RENCONTRE en Ligue de Fusion (bronze/argent/or). Même
    //   présentation (masquées tant que non vues). dexNo 550+ → listées après les fusions capturables de la Grotte.
    const ligue = leagueFusionSpecies().map((s) => ({
        id: s.id, name: s.name, types: s.types, dexNo: s.dexNo, sprite: s.sprite, description: s.description, seen: seenIds.includes(s.id),
    }))
    return [...grotte, ...ligue]
}

/** Nombre de fusions (Grotte racines + Ligue) aperçues / total (badge de progression du Fusiodex). */
export function officialFusionProgress(seenIds: string[]): { seen: number; total: number } {
    const roots = fusionRootSpeciesIds()
    const rootList = FUSION_BASE_SPECIES.filter((s) => roots.has(s.id))
    const ligue = leagueFusionSpecies()
    const total = rootList.length + ligue.length
    const seen = rootList.filter((s) => seenIds.includes(s.id)).length + ligue.filter((s) => seenIds.includes(s.id)).length
    return { seen, total }
}

/** Un maillon de lignée : l'espèce + le libellé de la MÉTHODE menant au stade SUIVANT (undefined = stade final). */
export interface FusionChainStep { id: string; name: string; toNextLabel?: string }

/** Lignée d'évolution complète d'une racine (racine → S2 → …), avec la méthode menant à chaque stade suivant.
 *  Borne anti-boucle. Utilisée par le Fusiodex pour révéler la lignée À LA CAPTURE (stades non atteints masqués). */
export function fusionEvolutionChain(rootId: string): FusionChainStep[] {
    const out: FusionChainStep[] = []
    const seen = new Set<string>()
    let cur: string | undefined = rootId
    while (cur && !seen.has(cur)) {
        seen.add(cur)
        const sp = getSpecies(cur)
        if (!sp) break
        const m = sp.evolution?.method
        const toNextLabel = !m ? undefined
            : m.kind === "LEVEL" ? `niv. ${m.level}`
            : m.kind === "ITEM" ? (getItem(m.itemId)?.name ?? "objet")
            : m.kind === "TRADE" ? "échange" : undefined
        out.push({ id: cur, name: sp.name, toNextLabel })
        cur = sp.evolution?.toId
    }
    return out
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
