// src/lib/gamebook/yellow/data/fusionMon.ts
//
// FUSION — construction du BattleMon FUSIONNÉ (construct de combat éphémère) à partir de 2 Daemons.
// Branche le module PUR (fusionSpecies : la génétique) sur le moteur : espèce custom éphémère + instance figée
// (frozenStats à 5 stats — UNE seule Spéciale, comme tout Daemon —, moveset, objet tenu). JAMAIS persisté, JAMAIS au dex.
//
// Cycle de vie : buildFusion() enregistre l'espèce → à la fin du combat, unregisterCustomSpecies([speciesId]).
// Les 2 Daemons parents ne sont PAS mutés (l'instance fusionnée est neuve).

import { computeFusion, type FusionParent, type FusionResult } from "./fusionSpecies"
import { getSpecies, registerCustomSpecies, unregisterCustomSpecies } from "./species"
import { officialFusionForParents } from "./officialFusions"
import { MISSINGNO_SPRITE } from "./fusionSprite"
import { getFusionSpriteFromMemory } from "./fusionSpriteRegistry"
import { createMonInstance } from "../battle/factory"
import { fullStats } from "../battle/stats"
import type { MonInstance, SpeciesData } from "../battle/types"

/** FusionParent depuis une instance réelle : stats FINALES (via fullStats), types, moves actuels, objet tenu. */
export function fusionParentFromInstance(inst: MonInstance): FusionParent {
    const sp = getSpecies(inst.speciesId)
    if (!sp) throw new Error(`Espèce inconnue: ${inst.speciesId}`)
    return {
        name: sp.name,
        types: sp.types,
        stats: fullStats(inst, sp),
        level: inst.level,
        moves: inst.moves.map((m) => m.moveId),
        heldItem: inst.heldItem,
    }
}

/** id d'espèce éphémère (déterministe sur la paire de parents — l'ordre = tête/dominant en 1er). */
export function fusionSpeciesId(a: MonInstance, b: MonInstance): string {
    return `fusion_${a.uid}_${b.uid}`
}

/** Fige les stats du fusionné : une SEULE Spéciale (spc), comme tout Daemon Gen-1 (offense ET défense spé).
 *  On ne pose PAS frozenSpd → le moteur retombe sur spc en défense spé (frozenSpd reste réservé à Ukognofy). */
export function applyFusionStats(inst: MonInstance, f: FusionResult): void {
    inst.frozenStats = { hp: f.stats.hp, atk: f.stats.atk, def: f.stats.def, spe: f.stats.spe, spc: f.stats.spc }
    inst.currentHp = f.stats.hp
}

/** SpeciesData ÉPHÉMÈRE d'une fusion. baseStats.spc = la Spéciale unique (le COMBAT lit frozenStats).
 *  Masquée du dex. `nameOverride` = nom figé (ex. les 21 noms de la Ligue de Fusion) sinon le portmanteau auto. */
function buildFusionSpecies(id: string, f: FusionResult, sprite: string, parentSpeciesIds: [string, string], nameOverride?: string, movesOverride?: string[]): SpeciesData {
    // TAUX DE CAPTURE ∝ 1/BST : la Fusio-Ball (non garantie) est redoutable sur une fusion FAIBLE (BST bas → catchRate
    //   haut), ardue sur une fusion très PUISSANTE (BST énorme → catchRate ~3). Clamp 3..60. (BST sur 5 stats.)
    const bst = f.stats.hp + f.stats.atk + f.stats.def + f.stats.spe + f.stats.spc
    const catchRate = Math.max(3, Math.min(60, Math.round((1500 - bst) / 30)))
    return {
        id, dexNo: -1, name: nameOverride ?? f.name, types: f.types,
        baseStats: { hp: f.stats.hp, atk: f.stats.atk, def: f.stats.def, spe: f.stats.spe, spc: f.stats.spc },
        learnset: (movesOverride ?? f.moves).map((moveId) => ({ level: 1, moveId })),
        // baseExp ∝ BST, PLAFONNÉ à 250 (≈ un final costaud) : sert au REVERSEMENT d'XP aux parents en Ligue de Fusion
        //   (rawXp dans awardExp). Le cap évite qu'une fusion-boss (BST énorme, ex. Ukognofy 1710) ne donne une XP
        //   délirante. N'affecte pas le fusionné éphémère lui-même (expMult=0 en combat de fusion → 0 level-up réel).
        catchRate, baseExp: Math.min(250, Math.max(1, Math.round(bst * 0.4))), rarity: "RARE",
        description: `Fusion éphémère de ${f.parents[0]} et ${f.parents[1]}.`,
        sprite, fusionParents: parentSpeciesIds, hiddenUntilCaught: true,
    }
}

export interface BuiltFusion { instance: MonInstance; speciesId: string; result: FusionResult }

/** Construit le Daemon FUSIONNÉ de A (tête/dominant) et B : enregistre l'espèce éphémère + fabrique l'instance de
 *  combat figée (frozenStats à 5 stats — Spéciale unique —, moveset, objet tenu). À DÉTRUIRE après le combat via
 *  disposeFusion(speciesId). Les 2 parents ne sont pas touchés. */
export function buildFusion(a: MonInstance, b: MonInstance, opts?: { name?: string; moves?: string[]; sprite?: string }): BuiltFusion {
    const result = computeFusion(fusionParentFromInstance(a), fusionParentFromInstance(b))
    const id = fusionSpeciesId(a, b)
    // Fusion JOUEUR (aucun override curé) : reconnaît une fusion OFFICIELLE (même paire de parents, ordre indifférent)
    //   → reprend son NOM + SPRITE dédiés. Sinon le sprite = MissingNo (JAMAIS celui d'un parent). Les fusions curées
    //   (Ligue/boss/épreuve) passent leurs opts → la reconnaissance est court-circuitée.
    const official = opts?.name ? null : officialFusionForParents(a.speciesId, b.speciesId)
    const name = opts?.name ?? official?.name
    // Ordre de résolution (invariant) : opts curé → officiel → sprite GÉNÉRÉ en cache mémoire (repli SYNCHRONE,
    //   aucun réseau : le combat ne bloque jamais) → MissingNo. Le registre est chauffé par le hook/prefetch client.
    const sprite = opts?.sprite ?? official?.sprite ?? getFusionSpriteFromMemory(a.speciesId, b.speciesId) ?? MISSINGNO_SPRITE
    // moveset : dérivé du moteur (fusions du joueur) OU curé à la main (opts.moves — les fusions de la Ligue).
    const moves = opts?.moves ?? result.moves
    registerCustomSpecies([buildFusionSpecies(id, result, sprite, [a.speciesId, b.speciesId], name, opts?.moves)])
    const instance = createMonInstance(id, result.level, { moveIds: [...moves], owned: false })
    applyFusionStats(instance, result)
    instance.fusionParents = [a.uid, b.uid] // Ligue Fusion : à la fin du combat, chaque parent reçoit la moitié de l'XP du fusionné
    // Objets tenus : le 1er est appliqué. ⚠️ Le 2e (result.heldItems[1]) attend l'extension moteur « 2 objets »
    //   (le système de combat lit heldItem au singulier). Cf. spec Inc.1.
    if (result.heldItems[0]) instance.heldItem = result.heldItems[0]
    return { instance, speciesId: id, result }
}

/** DÉ-FUSION : retire l'espèce éphémère du registre custom (à appeler à la fin du combat, dans un finally). */
export function disposeFusion(speciesId: string): void {
    unregisterCustomSpecies([speciesId])
}
