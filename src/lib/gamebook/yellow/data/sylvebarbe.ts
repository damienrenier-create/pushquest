// src/lib/gamebook/yellow/data/sylvebarbe.ts
//
// SYLVEBARBE — colosse sylvestre ENDORMI qui barre la sortie SUD de Ville Jaune (cf. sylvebarbeBlock.ts).
// Réveillé par la DAEMONFLÛTE (récompense de sacre laissée par le Dieu Spaghetti, récupérée à l'étage
// du Centre). Une fois battu OU capturé → la voie sud s'ouvre sur la ZONE DE COMBAT (Battle Frontier).
// Combat UNIQUE, calqué sur le template mini-boss statique data/gekroc.ts.

import { createMonInstance } from "../battle/factory"
import type { MonInstance } from "../battle/types"

export const SYLVEBARBE_NPC_ID = "y_sylvebarbe"
export const SYLVEBARBE_MAP_ID = "yellow_entrance"
export const SYLVEBARBE_POS = { x: 23, y: 38 } // haut du bloc sud (cols 22-25, rows 38-39) ; interpellé depuis (23,37)
export const SYLVEBARBE_LEVEL = 85             // gardien post-Ligue MUSCLÉ (Ligue = niv 52-62) : exige une équipe VRAIMENT forte
export const SYLVEBARBE_FLUTE_ITEM = "daemonflute"

export const SYLVEBARBE_INTRO_LINES = [
    "*Un colosse d'écorce et de mousse ronfle en travers de la route, immense et immobile.*",
    "Tu portes la Daemonflûte à tes lèvres. Une mélodie cristalline s'élève…",
    "Les paupières de SYLVEBARBE s'ouvrent dans un craquement de bois millénaire. Il se dresse — furieux d'être réveillé !",
]
export const SYLVEBARBE_NO_FLUTE_LINES = [
    "*SYLVEBARBE dort profondément, bloquant tout le passage sud.*",
    "Impossible de le réveiller à mains nues… Il te faudrait un instrument. Une flûte, peut-être ?",
]
export const SYLVEBARBE_DONE_LINES = [
    "*L'empreinte de SYLVEBARBE marque encore le sol. La voie vers le sud est libre.*",
]
export const SYLVEBARBE_NO_TEAM_LINES = [
    "Tes Daemons sont tous K.O. !",
    "Soigne-les au Centre avant d'affronter le gardien endormi.",
]

/** Instance de combat de SYLVEBARBE : N85, capture DURE (×0.6) mais SANS statut requis (≠ légendaire).
 *  Kit EXPLICITE (au niv 85 il n'a pas encore Lance-Soleil, niv 90) : double STAB (Tempête Verte PLANTE spé +
 *  Faille Sismique SOL phys) + Focalisation (setup +Spé) + Repos (soin) → mur-sweeper redoutable.
 *  `alreadyOwned` (Sylvebarbe déjà dans le Pokédex GLOBAL) → UNIQUE : le combat a lieu (gate) mais la re-capture
 *  est bloquée, comme un légendaire. */
export function buildSylvebarbe(alreadyOwned = false): MonInstance {
    const mon = createMonInstance("sylvebarbe", SYLVEBARBE_LEVEL, { owned: false, moveIds: ["tempete_verte", "faille_sismique", "focalisation", "repos"] })
    // captureMult + captureBlockedOwned = flags RUNTIME (BattleMon) → posés via Object.assign (hors type MonInstance
    //   persisté) ; ils voyagent jusqu'au combattant via toBattleMon (spread). captureBlockedOwned = UNIQUE (déjà
    //   possédé) → capture bloquée, mais on peut le vaincre (gate per-run).
    Object.assign(mon, { captureMult: 0.6, ...(alreadyOwned ? { captureBlockedOwned: true } : {}) })
    return mon
}

// ── DAEMONFLÛTE : remise par le Prof. CHEN du labo (y_lab_scientist) au nouveau Maître ──
// L'œuvre d'une vie : CHEN, mélomane, a façonné l'instrument capable de réveiller le colosse endormi.
// Il l'offre (1×) au vainqueur de la Ligue — l'aboutissement annoncé par son assistant.
export const FLUTE_GIVE_LINES = [
    "« Maître ! Tu as vaincu la Ligue… alors mon œuvre te revient. Des années de recherche pour cette unique mélodie. »",
    "Le Prof. CHEN te tend un instrument de bois finement ouvragé. Tu reçois la DAEMONFLÛTE !",
    "« Au sud de la ville dort un colosse d'écorce. Cette flûte le réveillera… et t'ouvrira la ZONE DE COMBAT. Va, mélomane d'un jour ! »",
]
