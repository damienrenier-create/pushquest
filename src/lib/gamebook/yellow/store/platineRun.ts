// src/lib/gamebook/yellow/store/platineRun.ts
//
// PALIER PLATINE — ÉTAT D'UN PARCOURS DE COULOIR. La salle du trône est UNE SEULE carte réutilisée : c'est donc
// un COMPTEUR D'ÉTAPE qui décide de l'adversaire qu'on y trouve.
//
// La séquence est toujours :   ACE  →  chaque salle de champion  →  le MAÎTRE en titre (s'il y en a un)
// Si personne ne tient encore le trône, le couloir s'arrête après les champions : le joueur devient le PREMIER
// Maître Ultime.
//
// ÉTAT TRANSIENT, JAMAIS PERSISTÉ — exactement comme le gauntlet de la Ligue (fusionGauntlet) : on traverse le
// couloir d'une traite, et quitter la salle par la gauche abandonne la tentative. Ça évite tout un système de
// reprise à mi-parcours, et ça rend l'échec réel (c'est ce qui donne sa valeur au trône).
//
// Le couloir lui-même vient du SERVEUR (route platine-throne) : on le dépose ici une fois à l'entrée, puis
// gameStore le lit SYNCHRONEMENT au moment de lancer chaque combat.

import type { PlatineChampion } from "../data/platineArena"
import type { FusionChampionMon } from "../storage/save"
import { emptyLedger, type PlatineLedger } from "../data/platineLedger"

/** Le Maître en titre, tel que le renvoie la route. */
export interface PlatineThroneHolder {
    userId: string
    nickname: string
    points: number
    sinceAt: string
    reignDays: number
    team: FusionChampionMon[]
    avatar?: string
}

/** Ce qu'on trouve dans la salle à une étape donnée. */
export type PlatineOpponent =
    | { kind: "ace"; label: string }
    | { kind: "room"; label: string; champion: PlatineChampion }
    | { kind: "throne"; label: string; holder: PlatineThroneHolder }

let rooms: PlatineChampion[] = []
let holder: PlatineThroneHolder | null = null
let loaded = false
let step = 0
let ledger: PlatineLedger = emptyLedger()

/** Dépose le couloir récupéré au serveur (à l'entrée de la salle). Remet le parcours à zéro. */
export function setPlatineCorridor(nextRooms: PlatineChampion[], nextHolder: PlatineThroneHolder | null): void {
    rooms = [...nextRooms]
    holder = nextHolder
    loaded = true
    step = 0
    ledger = emptyLedger()
}

/** Le couloir a-t-il été chargé ? Sert à afficher un message plutôt que de lancer un combat dans le vide. */
export function isPlatineCorridorLoaded(): boolean { return loaded }

/** Les salles du couloir (hors ACE et hors trône). */
export function getPlatineRooms(): PlatineChampion[] { return rooms }

/** Le Maître en titre, ou null si le trône est vacant (personne n'a encore réussi). */
export function getPlatineHolder(): PlatineThroneHolder | null { return holder }

/** Nombre TOTAL d'adversaires du couloir : ACE + les salles + éventuellement le Maître. */
export function platineTotalSteps(): number {
    return 1 + rooms.length + (holder ? 1 : 0)
}

/** Étape courante (0 = ACE). */
export function getPlatineStep(): number { return step }

/** L'adversaire de l'étape courante, ou null si le couloir est terminé (→ sacre). */
export function currentPlatineOpponent(): PlatineOpponent | null {
    if (!loaded) return null
    if (step === 0) return { kind: "ace", label: "ACE" }
    const roomIdx = step - 1
    if (roomIdx < rooms.length) {
        const c = rooms[roomIdx]
        return { kind: "room", label: c.nickname, champion: c }
    }
    if (holder && roomIdx === rooms.length) return { kind: "throne", label: holder.nickname, holder }
    return null
}

/** Avance d'une salle (appelé à chaque victoire). */
export function advancePlatineStep(): void { step += 1 }

/** Le couloir est-il TERMINÉ ? (plus aucun adversaire → le joueur prend la chaise) */
export function isPlatineCorridorCleared(): boolean {
    return loaded && currentPlatineOpponent() === null
}

/** Le registre des meilleurs coups du parcours (matière du générique). */
export function getPlatineLedger(): PlatineLedger { return ledger }
export function setPlatineLedger(next: PlatineLedger): void { ledger = next }

/** Abandon / échec / sortie par la gauche : on oublie tout. Le couloir se refait d'une traite. */
export function resetPlatineRun(): void {
    rooms = []
    holder = null
    loaded = false
    step = 0
    ledger = emptyLedger()
}
