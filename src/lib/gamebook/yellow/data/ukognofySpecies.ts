// src/lib/gamebook/yellow/data/ukognofySpecies.ts
//
// L'ESPÈCE d'Ukognofy, isolée dans un module FEUILLE (types + fusionSprite, qui est pur) — rien d'autre.
//
// Pourquoi la sortir de ukognofy.ts ? Parce que ce fichier-là importe `species.ts` (registerCustomSpecies),
// et que species.ts doit maintenant pouvoir résoudre Ukognofy CÔTÉ SERVEUR : l'importer directement créerait
// un cycle. Un module feuille casse le cycle sans rien déplacer d'autre.
//
// ⚠️ Elle reste HORS de SPECIES (anti-spoiler : visibleDexSpecies n'itère que SPECIES). Côté client elle est
// enregistrée en custom à la rencontre / au chargement de la save ; côté serveur, species.ts la consulte en
// repli — sans quoi toute fusion l'ayant pour parent échouait en `unknown-species` à la génération de sprite.

import { fusionSpritePath } from "./fusionSprite"
import type { SpeciesData } from "../battle/types"

export const UKOGNOFY_ID = "ukognofy"

/** Espèce PERMANENTE d'Ukognofy (enregistrée custom → résolvable, hors Pokédex principal). baseStats = profil
 *  légendaire « collapsé » (Spé unique) de l'exemplaire capturé ; la Spé scindée du fusionné vit dans frozenStats
 *  côté rencontre. hiddenUntilCaught (anti-spoiler) ; catchRate 3 (légendaire, mais capture régie par la Fusio-Ball). */
export const UKOGNOFY_SPECIES: SpeciesData = {
    id: UKOGNOFY_ID, dexNo: 505, name: "Ukognofy", types: ["DRAGON", "FEE"],
    baseStats: { hp: 156, atk: 98, def: 82, spe: 111, spc: 150 }, // BST 597 — mur-nuke spécial, rapide, Déf physique molle
    learnset: [
        { level: 1, moveId: "draco_souffle" }, { level: 1, moveId: "bourrasque_feerique" },
        { level: 1, moveId: "fulgurance" }, { level: 1, moveId: "repos" },
        { level: 30, moveId: "draco_charge" }, { level: 45, moveId: "eclat_lunaire" },
        { level: 60, moveId: "souffle_primordial" }, { level: 75, moveId: "cataclysme_lunaire" },
        { level: 90, moveId: "cage_eclair" },
    ],
    catchRate: 3, baseExp: 250, rarity: "LEGENDARY", growthRate: "slow",
    description: "Le mythe des mythes : les deux légendes, Dragon et Fée, fondues en une seule entité aux flammes féeriques.",
    sprite: fusionSpritePath("Ukognofy"), hiddenUntilCaught: true,
}
