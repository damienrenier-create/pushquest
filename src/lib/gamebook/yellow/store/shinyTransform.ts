// src/lib/gamebook/yellow/store/shinyTransform.ts
//
// TRANSFORMATION CHROMATIQUE (Sartay, 29/10/2026 : « avec l'introduction des Pâtes de Luxe et des Shiny Balls, certains
// Daemons vont devenir shiny. Je voudrais que tu crées une animation léchée pour la transformation ! »).
// File d'attente des transformations à montrer : un Daemon qui DEVIENT shiny (il ne l'était pas) via une Pâte de Luxe ou
// du Voleur (issue « shiny + parfait »), une capture à la Shiny Ball (l'Orfèvre) ou le pilier du casino (5000 jetons).
// La cinématique (battle/ShinyTransform) se joue hors combat ; une Shiny Ball lancée en combat attend la fin du combat.
// Module sans React (store minimal à abonnement) : alimenté par playerStore/battleStore/l'UI, lu par YellowDevClient.

/** D'où vient la transformation : choisit la phrase d'ouverture. */
export type ShinyTransformSource = "pate_luxe" | "pate_voleur" | "shiny_ball" | "casino"

export interface ShinyTransformEvent {
    id: number
    speciesId: string
    name: string
    source: ShinyTransformSource
    /** À jouer à la FIN de la cinématique (ex. le Dieu Spaghetti commente la bouchée). Jamais persisté. */
    after?: () => void
}

/** Durée de la cinématique complète, et de sa version sobre (appareil réglé sur « moins d'animations »). */
export const SHINY_TRANSFORM_MS = 6600
export const SHINY_TRANSFORM_REDUCED_MS = 1800
/** On ne peut pas passer la cinématique avant ce délai (un A martelé ne doit pas la sauter par accident). */
export const SHINY_TRANSFORM_SKIP_AFTER_MS = 700

let queue: ShinyTransformEvent[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => { for (const l of listeners) l() }

export function subscribeShinyTransform(l: () => void): () => void { listeners.add(l); return () => { listeners.delete(l) } }
/** La transformation à montrer maintenant (tête de file), ou null. */
export function currentShinyTransform(): ShinyTransformEvent | null { return queue[0] ?? null }
/** Ajoute une transformation à la file (plusieurs d'affilée se jouent l'une après l'autre). */
export function queueShinyTransform(e: Omit<ShinyTransformEvent, "id">): void {
    queue = [...queue, { ...e, id: nextId++ }]
    emit()
}
/** Termine la transformation en cours (fin ou « Passer ») et lance son `after`. */
export function finishShinyTransform(id: number): void {
    const head = queue[0]
    if (!head || head.id !== id) return
    queue = queue.slice(1)
    emit()
    try { head.after?.() } catch { /* un commentaire raté ne doit pas bloquer la file */ }
}
/** Tests uniquement. */
export function resetShinyTransformQueue(): void { queue = []; emit() }

/** Phrase d'ouverture, selon la source. */
export function shinyTransformCaption(source: ShinyTransformSource, name: string): string {
    switch (source) {
        case "pate_luxe": return `La Pâte de Luxe fait son effet sur ${name}…`
        case "pate_voleur": return `La Pâte du Voleur fait son effet sur ${name}…`
        case "shiny_ball": return `La Shiny Ball se referme sur ${name}…`
        case "casino": return `La chance du casino s'abat sur ${name}…`
    }
}
