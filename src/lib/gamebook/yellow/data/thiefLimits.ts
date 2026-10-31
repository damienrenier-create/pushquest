// src/lib/gamebook/yellow/data/thiefLimits.ts
//
// 🥷 LE VOLEUR — bornes partagées par data/thief (le jeu) et storage/save (le parse, AUSSI côté serveur). Module SANS import :
// le parse de la save n'embarque ni espèces, ni dexLore, ni moteur (data/thief les importe tous).

/** Neuf vols en tout (Sartay, 31/10/2026 ; trois jusque-là). */
export const THIEF_MAX_THEFTS = 9
// ── Butins des vols 5 à 9 : la taille de chaque butin est AUSSI le plafond de sa charge (un butin ne se reçoit qu'une fois) ──
/** Vol 5 : captures garanties (Kingme en a eu 5). */
export const THIEF_LOOT_CATCHES = 2
/** Vol 6 : soins après un combat sauvage gagné (Gass : à vie). */
export const THIEF_LOOT_HEALS = 15
/** Vol 7 : appels MINITEL (Task1 : à vie, un par combat). */
export const THIEF_LOOT_MINITEL = 10
/** Vol 8 : combats à coups gratuits (le vœu 3 de Zyran, « énergie illimitée pour les attaques », en petit). */
export const THIEF_LOOT_FREE_FIGHTS = 10
/** Vol 9 : la Frénésie du Voleur s'éteint au premier shiny capturé (Jacanon : 3). */
export const THIEF_FRENZY_CAPTURES = 1
