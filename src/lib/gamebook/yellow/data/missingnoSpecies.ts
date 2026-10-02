// src/lib/gamebook/yellow/data/missingnoSpecies.ts
//
// 👻 MISSINGNO — l'erreur de pagination du Pokédex, et la PUNITION du vœu « je choisis le numéro ».
//
// Règle de Sartay (02/10/2026) : dans ce vœu, CHAQUE journée annoncée est consommée, même si le joueur réclame un
// numéro interdit (inexistant, légendaire, ou absent de son run). Dans ce cas, le génie tient parole à la lettre :
// il lui envoie bien un Daemon au 10ᵉ pop… mais ce sera CETTE chose. Niveau 5, BST 100 — « super nul en somme ».
//
// Module FEUILLE (types + fusionSprite, pur) pour la même raison qu'ukognofySpecies : species.ts doit pouvoir le
// résoudre côté serveur, et l'importer en sens inverse créerait un cycle.
//
// ⚠️ HORS de SPECIES, donc : absent du Pokédex, et surtout ABSENT de la liste des numéros annonçables — personne
// ne peut le commander volontairement. La capture est BLOQUÉE à la rencontre (captureBlockedOwned, posé par
// gameStore) : une punition ne doit pas rapporter un point de Pokédex, qui compte dans les scores de run.

import type { SpeciesData } from "../battle/types"
import { MISSINGNO_SPRITE } from "./fusionSprite"

export const MISSINGNO_ID = "missingno"
/** Niveau d'apparition de la punition. */
export const MISSINGNO_LEVEL = 5

/** BST 100 réparti à parts égales : 20 partout. C'est volontairement pathétique — il n'y a aucune stat à sauver. */
export const MISSINGNO_SPECIES: SpeciesData = {
    id: MISSINGNO_ID, dexNo: 0, name: "MissingNo.", types: ["NORMAL"],
    baseStats: { hp: 20, atk: 20, def: 20, spe: 20, spc: 20 }, // BST 100
    learnset: [{ level: 1, moveId: "charge" }],
    catchRate: 255, baseExp: 1, rarity: "COMMON", growthRate: "medium_fast",
    description: "Une erreur de pagination du Pokédex. Ça glitche, ça grésille, et ça ne sert absolument à rien.",
    sprite: MISSINGNO_SPRITE, hiddenUntilCaught: true,
}
