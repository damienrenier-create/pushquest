// src/lib/gamebook/yellow/frontier/runStore.ts
//
// ZONE DE COMBAT — store client de la SÉRIE EN COURS (non persistant ; la méta-progression
// durable = JC/records vit côté serveur via frontierProfile). Fin wrapper autour des réducteurs
// PURS de `run.ts` (ne réimplémente RIEN). Pattern useSyncExternalStore comme playerStore.

import { useSyncExternalStore } from "react"
import {
    type FrontierRunState,
    startFrontierRun, applyFrontierWin, applyFrontierLoss, quitFrontierRun,
} from "./run"
import type { FrontierMode, LevelRule } from "./engine"

let run: FrontierRunState | null = null
const listeners = new Set<() => void>()
function emit() { for (const l of listeners) l() }

export function subscribeRun(l: () => void): () => void {
    listeners.add(l)
    return () => { listeners.delete(l) }
}
export function getRun(): FrontierRunState | null { return run }
export function useRun(): FrontierRunState | null {
    return useSyncExternalStore(subscribeRun, getRun, getRun)
}

export interface StartRunInput { mode: FrontierMode; levelRule: LevelRule; playerTopLevel: number; seed: number; teamSize?: number }

/** Démarre une série (Tour/Usine/Dôme) et la place comme run courant. */
export function startRun(opts: StartRunInput): FrontierRunState {
    run = startFrontierRun(opts)
    emit()
    return run
}
/** Raccourci Tour (incrément 3). */
export function startTowerRun(opts: { levelRule: LevelRule; playerTopLevel: number; seed: number }): FrontierRunState {
    return startRun({ mode: "TOWER", ...opts })
}

/** Victoire d'une vague : crédite JC + remboursement (via réducteur pur) et prépare la suivante. */
export function applyWinFromBattle(energySpent: number): FrontierRunState | null {
    if (!run) return null
    run = applyFrontierWin(run, energySpent)
    emit()
    return run
}
/** Défaite : la série se termine (record = streak). */
export function applyLossFromBattle(): FrontierRunState | null {
    if (!run) return null
    run = applyFrontierLoss(run)
    emit()
    return run
}
/** Forfait volontaire : termine en gardant les JC gagnés. */
export function quitRun(): FrontierRunState | null {
    if (!run) return null
    run = quitFrontierRun(run)
    emit()
    return run
}
/** Vide le run courant (après report serveur / sortie de la Zone). */
export function endRun(): void {
    run = null
    emit()
}
