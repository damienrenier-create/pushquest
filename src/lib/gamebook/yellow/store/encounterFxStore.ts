"use client"

// Nexus Jaune Éclair — petit store externe pour l'état "transition de rencontre
// en cours" (le rideau cinématique au DÉMARRAGE d'un combat). EncounterTransition
// le passe à true tant que l'overlay s'affiche ; la coque Game Boy le lit pour
// neutraliser le D-pad pendant l'écran de chargement (pas de pas/curseur fantôme).
// Pattern useSyncExternalStore, identique au battleStore.

import { useSyncExternalStore } from "react"

let active = false
const listeners = new Set<() => void>()

function emit() {
    for (const l of listeners) l()
}

/** EncounterTransition : true pendant l'overlay de rencontre, false à la fin/skip. */
export function setEncounterFxActive(v: boolean) {
    if (active === v) return
    active = v
    emit()
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
}

/** True tant que l'écran de chargement de combat (transition) est affiché. */
export function useEncounterFxActive(): boolean {
    return useSyncExternalStore(subscribe, () => active, () => false)
}
