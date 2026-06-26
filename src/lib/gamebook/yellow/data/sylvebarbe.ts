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
export const SYLVEBARBE_LEVEL = 60             // gardien post-Ligue (Ligue = niv 52-62)
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

/** Instance de combat de SYLVEBARBE : N60, capture DURE (×0.6) mais SANS statut requis (≠ légendaire). */
export function buildSylvebarbe(): MonInstance {
    const mon = createMonInstance("sylvebarbe", SYLVEBARBE_LEVEL, { owned: false })
    Object.assign(mon, { captureMult: 0.6 }) // dur à capturer (cf. engine performCapture), mais pas légendaire
    return mon
}

// ── ÉMISSAIRE DU DIEU SPAGHETTI (étage du Centre = labo) : remet la Daemonflûte au nouveau Maître ──
export const FLUTE_EMISSARY_NPC_ID = "y_flute_emissaire"
export const FLUTE_EMISSARY_MAP_ID = "yellow_infirmary_2e"
export const FLUTE_EMISSARY_POS = { x: 9, y: 3 }
export const FLUTE_GIVE_LINES = [
    "*Un curieux personnage en toge tachée de sauce t'attend près des éprouvettes.*",
    "« Ah, le nouveau Maître ! Le Dieu Spaghetti m'a chargé de te remettre Sa récompense. »",
    "Tu reçois la DAEMONFLÛTE !",
    "« Au sud de la ville dort un colosse de bois. Cette flûte le réveillera… et t'ouvrira la ZONE DE COMBAT. »",
]
export const FLUTE_ALREADY_HAVE_LINES = [
    "« Tu as déjà la Daemonflûte. Va réveiller le gardien endormi, au sud de la ville ! »",
]
export const FLUTE_DONE_LINES = [
    "« Le gardien est réveillé, la Zone de Combat t'est ouverte. Que tes combats soient légendaires, Maître. »",
]
export const FLUTE_NOT_CHAMPION_LINES = [
    "« Cette récompense est réservée au Maître de la Ligue. Reviens quand tu auras vaincu LE MAÎTRE. »",
]
