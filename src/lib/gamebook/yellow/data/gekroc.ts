// src/lib/gamebook/yellow/data/gekroc.ts
//
// GÉKROC — mini-boss STATIQUE de la Centrale Électrique (gardien de la Pierre d'Évolution).
// Combat UNIQUE (one-time) : à vaincre OU capturer. Wild-style (capturable), instance fixe N35.
// Câblé via gameStore.pressA (NPC y_gekroc) → startWildBattle ; résolution dans battleStore.finishBattle
// (flag playerStore.gekrocResolved + don de la Pierre). Sprite overworld qui devient la Pierre une fois résolu.

import { createMonInstance } from "../battle/factory"
import type { MonInstance, PokeType } from "../battle/types"

export const GEKROC_NPC_ID = "y_gekroc"
export const GEKROC_MAP_ID = "yellow_centrale"
export const GEKROC_POS = { x: 4, y: 9 }
export const GEKROC_LEVEL = 35
export const GEKROC_STONE_ITEM = "pierre_gekroc"

export const GEKROC_INTRO_LINES = [
    "*Une masse fossile incrustée d'une pierre crépitante s'arrache du sol dans un grondement…*",
    "GÉKROC, le gardien souterrain, surgit — sa Pierre d'Évolution étincelle de mille éclairs !",
    "Il se dresse en travers de ton chemin. Le combat est inévitable.",
]
export const GEKROC_DONE_LINES = [
    "*Il ne reste qu'un cratère fumant là où Gékroc gardait sa Pierre. Tu l'as déjà descellée.*",
]
export const GEKROC_NO_TEAM_LINES = [
    "Tes Daemons sont tous K.O. !",
    "Soigne-les au Centre avant d'affronter le gardien.",
]

/** Espèce du mini-boss selon le MONDE : Gékroc (SOL/ÉLEC) run 1, jumeau Gékraise (ROCHE/FEU) run 2 (NG+),
 *  jumeau Gékosmic (ROCHE/PSY) run 3. Même créature re-typée : mêmes stats/niveau/capture, seul le type change. */
export const GEKROC_SPECIES = "gekroc"
export const GEKRAISE_SPECIES = "gekraise"
export const GEKOSMIC_SPECIES = "gekosmic"

/** Espèce du gardien de la Pierre pour le monde actif. */
export function gekrocSpeciesForWorld(world: "live" | "ngplus" | "run3"): string {
    return world === "run3" ? GEKOSMIC_SPECIES : world === "ngplus" ? GEKRAISE_SPECIES : GEKROC_SPECIES
}

/** Fabrique l'instance de combat du gardien : N35, capture DURE (×0.6) mais SANS statut requis (≠ légendaire).
 *  L'espèce dépend du monde (`live`/`ngplus`/`run3`) — cf. gekrocSpeciesForWorld. */
export function buildGekroc(world: "live" | "ngplus" | "run3" = "live"): MonInstance {
    const mon = createMonInstance(gekrocSpeciesForWorld(world), GEKROC_LEVEL, { owned: false })
    Object.assign(mon, { captureMult: 0.6 }) // dur à capturer (cf. engine performCapture), mais pas légendaire
    return mon
}

// ── PART B : la Pierre Gékroc fait évoluer PANTHÉON vers la panthère du TYPE choisi ──
export const PANTHEON_BASE_ID = "pantheon"
/** Choix offerts par la Pierre Gékroc sur un Panthéon : 1 type → 1 panthère colorée. */
export const PANTHEON_STONE_EVOS: ReadonlyArray<{ type: PokeType; speciesId: string }> = [
    { type: "FEU", speciesId: "pyropanthe" },
    { type: "EAU", speciesId: "aquapanthe" },
    { type: "ELEC", speciesId: "voltapanthe" },
    { type: "PLANTE", speciesId: "florapanthe" },
    { type: "GLACE", speciesId: "panthegel" },
    { type: "SPECTRE", speciesId: "ombrapanthe" },
]
