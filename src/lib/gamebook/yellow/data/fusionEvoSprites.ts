// src/lib/gamebook/yellow/data/fusionEvoSprites.ts
//
// FUSIONS ÉVOLUTIVES — dérivation PURE des lignées (stades ≥2) pour l'AUTO-GÉNÉRATION de leurs sprites.
// Les stades de BASE (S1) sont des fusions de 2 parents → sprite géré par le pipeline PAIRE (fusion-sprite).
// Les stades ÉVOLUÉS (S2→S5) n'ont pas de paire : leur sprite se génère par CHAÎNAGE depuis le stade PRÉCÉDENT
// (comme les Daemons custom : generateCustomDaemonSprite(refUrl=stade précédent)). Ici = qui évolue de qui, à
// quel rang, et lesquels attendent encore un sprite (placeholder MissingNo = pas de sprite maison fourni).
//
// 100% pur (aucune DB, aucun réseau, aucun window) : importable serveur (route) comme client (trigger/injection).

import { FUSION_BASE_SPECIES } from "./fusionBaseSpecies"

const MISSINGNO = "missingno"

/** Un stade évolué : son stade PRÉCÉDENT (référence de chaînage) + sa position dans la lignée. */
export interface EvoStageInfo { prevId: string; stage: number; totalStages: number }

const SP_BY_ID = new Map(FUSION_BASE_SPECIES.map((s) => [s.id, s] as const))

/** Construit la table des stades évolués (≥2) → {prevId, stage, totalStages}. Une BASE = une espèce qui n'est la
 *  cible d'AUCUNE évolution ; on remonte sa chaîne via evolution.toId et on indexe chaque maillon ≥2. */
function buildLineageMap(): Map<string, EvoStageInfo> {
    const targets = new Set<string>()
    for (const s of FUSION_BASE_SPECIES) if (s.evolution?.toId) targets.add(s.evolution.toId)
    const out = new Map<string, EvoStageInfo>()
    for (const base of FUSION_BASE_SPECIES) {
        if (targets.has(base.id)) continue // pas une base (c'est un maillon aval)
        const chain: string[] = [base.id]
        let cur = base, guard = 0
        while (cur.evolution?.toId && SP_BY_ID.has(cur.evolution.toId) && guard < 8) {
            const next = SP_BY_ID.get(cur.evolution.toId)!
            chain.push(next.id); cur = next; guard++
        }
        for (let i = 1; i < chain.length; i++) out.set(chain[i], { prevId: chain[i - 1], stage: i + 1, totalStages: chain.length })
    }
    return out
}

const LINEAGE = buildLineageMap()

/** Infos de stade d'un fusionné évolué (≥2), ou undefined si base/inconnu. */
export function evolvedFusionStageInfo(id: string): EvoStageInfo | undefined { return LINEAGE.get(id) }
/** L'espèce est-elle un STADE ÉVOLUÉ (≥2) d'une lignée de fusion ? */
export function isEvolvedFusionStage(id: string): boolean { return LINEAGE.has(id) }
/** Tous les ids de stades évolués (≥2), toutes lignées confondues. */
export function evolvedFusionStageIds(): string[] { return [...LINEAGE.keys()] }

/** Ce stade attend-il un sprite GÉNÉRÉ ? (placeholder MissingNo = aucun sprite maison committé → auto-gen.)
 *  false si un sprite maison est fourni (ex. Voltriss/Draconvolt) → la génération le laisse tranquille. */
export function fusionStageNeedsGenSprite(id: string): boolean {
    const sp = SP_BY_ID.get(id)
    return !!sp && (!sp.sprite || sp.sprite.includes(MISSINGNO))
}

/** Clé de cache/Blob LITTÉRALE d'un stade évolué (table FusionSprite partagée ; pas fusionPairKey : pas une paire). */
export function evoSpriteKey(id: string): string { return `fusevo:${id}` }
