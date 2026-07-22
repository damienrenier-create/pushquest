// src/lib/gamebook/yellow/data/officialFusions.ts
//
// Registre des fusions OFFICIELLES (celles qui ont un nom + un sprite dédié) indexé par PAIRE DE PARENTS
// (espèces, n'importe quel ordre). Sert à reconnaître, quand un JOUEUR fabrique une fusion à l'Atelier, qu'il
// vient de recréer une fusion connue → on lui redonne son NOM et son SPRITE officiels (les stats, elles, restent
// calculées depuis SES Daemons). Couvre : les 21 fusions de Ligue + 4 du boss + 2 de l'épreuve + 5 fusions de base.
//
// Règle Sartay : « dès que la paire matche et qu'elle a un sprite, on l'utilise ». Sinon → MissingNo (cf. buildFusion).
// Registre bâti PARESSEUSEMENT (1er appel) → évite tout souci d'ordre d'import (cycle fusionMon ↔ fusionLeague).

import { FUSION_LEAGUE, FUSION_BOSS_PAIRS } from "./fusionLeague"
import { FUSION_TRIAL_PAIRS } from "./fusionTrial"
import { FUSION_BASE_PARENTS, FUSION_BASE_SPECIES } from "./fusionBaseSpecies"
import { fusionSpritePath } from "./fusionSprite"

export interface OfficialFusion { name: string; sprite: string }

/** Clé de paire indépendante de l'ordre des parents. */
const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

let _registry: Map<string, OfficialFusion> | null = null
function registry(): Map<string, OfficialFusion> {
    if (_registry) return _registry
    const m = new Map<string, OfficialFusion>()
    const add = (a: string, b: string, name: string, sprite: string) => {
        const k = pairKey(a, b)
        if (!m.has(k)) m.set(k, { name, sprite }) // 1re occurrence gagne (les paires curées sont uniques de toute façon)
    }
    for (const tr of FUSION_LEAGUE) for (const p of tr.pairs) add(p.a, p.b, p.name, p.sprite ?? fusionSpritePath(p.name))
    for (const p of FUSION_BOSS_PAIRS) add(p.a, p.b, p.name, p.sprite ?? fusionSpritePath(p.name))
    for (const p of FUSION_TRIAL_PAIRS) add(p.a, p.b, p.name, fusionSpritePath(p.name))
    for (const fid of Object.keys(FUSION_BASE_PARENTS)) {
        const [a, b] = FUSION_BASE_PARENTS[fid]
        const sp = FUSION_BASE_SPECIES.find((s) => s.id === fid)
        if (sp) add(a, b, sp.name, sp.sprite ?? fusionSpritePath(sp.name))
    }
    _registry = m
    return m
}

/** Fusion OFFICIELLE (nom + sprite dédié) dont `a`,`b` sont les 2 parents (ordre indifférent), ou null. */
export function officialFusionForParents(aSpeciesId: string, bSpeciesId: string): OfficialFusion | null {
    return registry().get(pairKey(aSpeciesId, bSpeciesId)) ?? null
}
