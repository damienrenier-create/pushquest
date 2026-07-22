// src/lib/gamebook/yellow/data/fusionMon.ts
//
// FUSION — construction du BattleMon FUSIONNÉ (construct de combat éphémère) à partir de 2 Daemons.
// Branche le module PUR (fusionSpecies : la génétique) sur le moteur : espèce custom éphémère + instance figée
// (frozenStats.spc = SpA, frozenSpd = SpD, moveset, objet tenu). JAMAIS persisté, JAMAIS au dex.
//
// INVARIANT (revue Inc.1) : frozenStats.spc (SpA) et frozenSpd (SpD) viennent EN PAIRE de computeFusion et sont
// posés ENSEMBLE par applyFusionStats — ne JAMAIS poser l'un sans l'autre (sinon profil de combat incohérent).
//
// Cycle de vie : buildFusion() enregistre l'espèce → à la fin du combat, unregisterCustomSpecies([speciesId]).
// Les 2 Daemons parents ne sont PAS mutés (l'instance fusionnée est neuve).

import { computeFusion, type FusionParent, type FusionResult } from "./fusionSpecies"
import { getSpecies, registerCustomSpecies, unregisterCustomSpecies } from "./species"
import { officialFusionForParents } from "./officialFusions"
import { MISSINGNO_SPRITE } from "./fusionSprite"
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

/** INVARIANT : pose frozenStats (dont spc = SpA, lue en OFFENSE) ET frozenSpd (= SpD, lue en DÉFENSE) ENSEMBLE.
 *  Point d'entrée UNIQUE pour figer les stats d'un fusionné → impossible d'oublier l'un des deux. */
export function applyFusionStats(inst: MonInstance, f: FusionResult): void {
    inst.frozenStats = { hp: f.stats.hp, atk: f.stats.atk, def: f.stats.def, spe: f.stats.spe, spc: f.stats.spcAtk }
    inst.frozenSpd = f.stats.spcDef
    inst.currentHp = f.stats.hp
}

/** SpeciesData ÉPHÉMÈRE d'une fusion. baseStats.spc = SpA (fallback d'affichage ; le COMBAT lit frozenStats/frozenSpd,
 *  pas ceci). Masquée du dex. `nameOverride` = nom figé (ex. les 21 noms de la Ligue de Fusion) sinon le portmanteau auto. */
function buildFusionSpecies(id: string, f: FusionResult, sprite: string, nameOverride?: string, movesOverride?: string[]): SpeciesData {
    // TAUX DE CAPTURE ∝ 1/BST : la Fusio-Ball (non garantie) est redoutable sur une fusion FAIBLE (BST bas → catchRate
    //   haut), ardue sur une fusion très PUISSANTE (BST énorme → catchRate ~3, ex. Ukognofy ~1710 → 3). Clamp 3..60.
    const bst = f.stats.hp + f.stats.atk + f.stats.def + f.stats.spe + f.stats.spcAtk + f.stats.spcDef
    const catchRate = Math.max(3, Math.min(60, Math.round((1900 - bst) / 40)))
    return {
        id, dexNo: -1, name: nameOverride ?? f.name, types: f.types,
        baseStats: { hp: f.stats.hp, atk: f.stats.atk, def: f.stats.def, spe: f.stats.spe, spc: f.stats.spcAtk },
        learnset: (movesOverride ?? f.moves).map((moveId) => ({ level: 1, moveId })),
        catchRate, baseExp: 0, rarity: "RARE",
        description: `Fusion éphémère de ${f.parents[0]} et ${f.parents[1]}.`,
        sprite, hiddenUntilCaught: true,
    }
}

export interface BuiltFusion { instance: MonInstance; speciesId: string; result: FusionResult }

/** Construit le Daemon FUSIONNÉ de A (tête/dominant) et B : enregistre l'espèce éphémère + fabrique l'instance de
 *  combat figée (frozenStats = SpA, frozenSpd = SpD, moveset, objet tenu). À DÉTRUIRE après le combat via
 *  disposeFusion(speciesId). Les 2 parents ne sont pas touchés. */
export function buildFusion(a: MonInstance, b: MonInstance, opts?: { name?: string; moves?: string[]; sprite?: string }): BuiltFusion {
    const result = computeFusion(fusionParentFromInstance(a), fusionParentFromInstance(b))
    const id = fusionSpeciesId(a, b)
    // Fusion JOUEUR (aucun override curé) : reconnaît une fusion OFFICIELLE (même paire de parents, ordre indifférent)
    //   → reprend son NOM + SPRITE dédiés. Sinon le sprite = MissingNo (JAMAIS celui d'un parent). Les fusions curées
    //   (Ligue/boss/épreuve) passent leurs opts → la reconnaissance est court-circuitée.
    const official = opts?.name ? null : officialFusionForParents(a.speciesId, b.speciesId)
    const name = opts?.name ?? official?.name
    const sprite = opts?.sprite ?? official?.sprite ?? MISSINGNO_SPRITE
    // moveset : dérivé du moteur (fusions du joueur) OU curé à la main (opts.moves — les fusions de la Ligue).
    const moves = opts?.moves ?? result.moves
    registerCustomSpecies([buildFusionSpecies(id, result, sprite, name, opts?.moves)])
    const instance = createMonInstance(id, result.level, { moveIds: [...moves], owned: false })
    applyFusionStats(instance, result)
    // Objets tenus : le 1er est appliqué. ⚠️ Le 2e (result.heldItems[1]) attend l'extension moteur « 2 objets »
    //   (le système de combat lit heldItem au singulier). Cf. spec Inc.1.
    if (result.heldItems[0]) instance.heldItem = result.heldItems[0]
    return { instance, speciesId: id, result }
}

/** DÉ-FUSION : retire l'espèce éphémère du registre custom (à appeler à la fin du combat, dans un finally). */
export function disposeFusion(speciesId: string): void {
    unregisterCustomSpecies([speciesId])
}
