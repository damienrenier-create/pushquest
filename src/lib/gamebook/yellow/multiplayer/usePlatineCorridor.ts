"use client"

// PALIER PLATINE — CHARGEMENT DU COULOIR. La salle du trône affronte de VRAIS joueurs : ses adversaires vivent
// au serveur, pas dans la save. On les récupère UNE FOIS à l'entrée de la salle, puis gameStore les lit
// synchronement à chaque combat (cf. store/platineRun).
//
// ENTRER charge le couloir ; SORTIR par la porte gauche ABANDONNE la tentative — c'est ce qui donne du poids
// à l'échec. Un RECHARGEMENT de page, lui, n'est pas un abandon : setPlatineCorridor restaure le parcours
// miroité en localStorage si le couloir rendu par le serveur est toujours le même (cf. store/platineRun).
//
// La porte droite REBOUCLE sur la même carte : le mapId ne change pas, donc cet effet ne se re-déclenche pas
// entre deux salles. Le couloir chargé à l'entrée sert pour toute la traversée.

import { useCallback, useEffect, useState } from "react"
import { setPlatineCorridor, resetPlatineRun, type PlatineThroneHolder } from "../store/platineRun"
import type { PlatineChampion } from "../data/platineArena"

export const PLATINE_MAP_ID = "yellow_fusion_platine"
export const PLATINE_TRAINER_ID = "y_fusion_platine"

export interface PlatineCorridorState {
    /** Requête en cours : la salle doit patienter plutôt que lancer un combat dans le vide. */
    loading: boolean
    /** Couloir en place (même vide) → on peut jouer. */
    ready: boolean
    /** Le réseau n'a rien rendu : on le dit au joueur au lieu de le laisser face à une salle muette. */
    failed: boolean
    /** Relance le chargement. La porte droite reboucle sur la MÊME carte, donc l'effet ne se re-déclenche
     *  jamais tout seul : sans ce bouton, il fallait ressortir et refaire tout le trajet depuis l'Autel. */
    retry: () => void
}

/** Charge le couloir platine quand le joueur entre dans la salle du trône ; l'oublie quand il en sort. */
export function usePlatineCorridor(mapId: string): PlatineCorridorState {
    const active = mapId === PLATINE_MAP_ID
    const [state, setState] = useState<PlatineCorridorState>({ loading: false, ready: false, failed: false, retry: () => {} })
    const [attempt, setAttempt] = useState(0)
    const retry = useCallback(() => setAttempt((n) => n + 1), [])

    useEffect(() => {
        if (!active) {
            // Sortie de la salle = ABANDON de la tentative (pas de reprise à mi-couloir).
            resetPlatineRun()
            setState({ loading: false, ready: false, failed: false, retry })
            return
        }
        let cancel = false
        setState({ loading: true, ready: false, failed: false, retry })
        fetch("/api/gamebook/yellow/platine-throne")
            .then((r) => (r.ok ? r.json() : null))
            .then((d: { ok?: boolean; rooms?: PlatineChampion[]; throne?: PlatineThroneHolder | null } | null) => {
                if (cancel) return
                if (!d?.ok) { setState({ loading: false, ready: false, failed: true, retry }); return }
                // Un couloir VIDE reste valide : si personne n'a l'or et que le trône est vacant, ACE seul suffit.
                setPlatineCorridor(Array.isArray(d.rooms) ? d.rooms : [], d.throne ?? null)
                setState({ loading: false, ready: true, failed: false, retry })
            })
            .catch(() => { if (!cancel) setState({ loading: false, ready: false, failed: true, retry }) })
        return () => { cancel = true }
    }, [active, attempt, retry])

    return state
}
