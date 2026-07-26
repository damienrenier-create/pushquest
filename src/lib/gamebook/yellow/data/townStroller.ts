// src/lib/gamebook/yellow/data/townStroller.ts
//
// PROMENEUR de Ville Jaune — PNJ purement DÉCORATIF : il fait les cent pas sur
// une colonne de 3 cases, à l'est du Centre Daemon. Il ne parle pas, ne se bat
// pas, ne donne rien : c'est de la vie de ville.
//
// Son couloir (31, 22-24) est INFRANCHISSABLE (cf. gameStore.move) : comme sa
// position visuelle vient d'une animation CSS (pas d'un tick partagé avec le
// store), bloquer les 3 cases est la seule façon de garantir que le joueur ne
// se retrouve JAMAIS superposé au sprite. Le reste de la place est large : le
// couloir bouché ne ferme aucun passage.
//
// Sprite : /yellow/sprites/npc_promeneur.png — planche 19×4 cellules de 40×40
// (générée par le "NPC Sprite Forge", style Pokémon Gen 3). Lignes = direction
// (0 = Sud/bas, 1 = Ouest/gauche, 2 = Est/droite, 3 = Nord/haut), colonnes 0-2
// = cycle de marche (0 = pas A, 1 = neutre, 2 = pas B). Le rendu n'utilise que
// les lignes 0 et 3 (il monte et descend) et les colonnes 0 et 2.

import { YELLOW_ENTRANCE_MAP_ID } from "../featureFlag"

export const TOWN_STROLLER_MAP = YELLOW_ENTRANCE_MAP_ID
export const TOWN_STROLLER_SPRITE = "/yellow/sprites/npc_promeneur.png"

/** Colonne + bornes hautes/basses de la ronde (cases walkables de la place est). */
export const TOWN_STROLLER_X = 31
export const TOWN_STROLLER_Y_TOP = 22
export const TOWN_STROLLER_Y_BOTTOM = 24

/** Durée d'un pas (1 case) en ms → cycle complet = 4 pas (2 descendus, 2 montés). */
export const TOWN_STROLLER_STEP_MS = 800

/** Une case (x,y) est-elle dans le couloir arpenté par le promeneur ? */
export function inTownStrollerCorridor(x: number, y: number): boolean {
    return x === TOWN_STROLLER_X && y >= TOWN_STROLLER_Y_TOP && y <= TOWN_STROLLER_Y_BOTTOM
}
