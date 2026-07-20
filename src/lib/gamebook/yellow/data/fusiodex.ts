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

import type { PokeType } from "../battle/types"
import { FUSION_BASE_SPECIES } from "./fusionBaseSpecies"
import { FUSION_RULES } from "./fusionLore"

export { FUSION_RULES }

/** Marker (defeatedTrainers) posé à la 1re arrivée au Dôme Fusion (Autel). GATE du Fusiodex + de l'anti-spoiler. */
export const AUTEL_VISITED_MARKER = "autel_visited"

/** Le Dieu Spaghetti explique le Dôme à la 1re arrivée → débloque le Fusiodex dans le menu du joueur. */
export const DOME_SPAGHETTI_LINES = [
    "*Une vapeur de sauce divine s'élève de l'autel central…*",
    "« Bienvenue au DÔME DE LA FUSION, jeune Dresseur. Ici, deux Daemons n'en font plus qu'UN. »",
    "« Dépose deux créatures sur l'Autel de la Chimère : elles fusionnent en un construct de combat unique — et se retrouvent intactes ensuite. »",
    "« Remporte les épreuves de l'autel, puis défie la LIGUE DE FUSION quand la porte à dragons s'ouvrira. »",
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
