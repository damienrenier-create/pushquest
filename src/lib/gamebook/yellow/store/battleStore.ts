// src/lib/gamebook/yellow/store/battleStore.ts
//
// Nexus Jaune Éclair — STORE EXTERNE du combat (pattern useSyncExternalStore).
// Le moteur (battle/engine.ts) reste 100% React-free ; ce store est la SEULE
// couche de liaison avec React. L'UI lit l'état via le hook useBattle() et
// déclenche les actions ; elle ne recalcule jamais les règles elle-même.

import { useSyncExternalStore } from "react"
import {
    createBattle,
    resolveTurn,
    type BattleState,
    type PlayerAction,
} from "../battle/engine"
import type { MonInstance } from "../battle/types"

interface BattleStoreState {
    battle: BattleState | null
}

let storeState: BattleStoreState = { battle: null }
const listeners = new Set<() => void>()

function emit() {
    for (const l of listeners) l()
}

function setStore(next: BattleStoreState) {
    storeState = next
    emit()
}

// --- Abonnement / lecture (contrat useSyncExternalStore) ---
export function subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
}

export function getSnapshot(): BattleStoreState {
    return storeState
}

// ============================================================
// Actions (mutent l'état via le moteur pur)
// ============================================================

export function startWildBattle(playerTeam: MonInstance[], enemyTeam: MonInstance[], seed: number) {
    setStore({ battle: createBattle(playerTeam, enemyTeam, { isWild: true, seed }) })
}

export function startTrainerBattle(playerTeam: MonInstance[], enemyTeam: MonInstance[], seed: number) {
    setStore({ battle: createBattle(playerTeam, enemyTeam, { isWild: false, seed }) })
}

export function submitPlayerAction(action: PlayerAction) {
    if (!storeState.battle) return
    const next = resolveTurn(storeState.battle, action)
    setStore({ battle: next })
}

export function endBattle() {
    setStore({ battle: null })
}

// ============================================================
// Hooks de lecture (React) — la référence reste stable entre tours.
// ============================================================

export function useBattle(): BattleState | null {
    return useSyncExternalStore(
        subscribe,
        () => getSnapshot().battle,
        () => getSnapshot().battle,
    )
}
