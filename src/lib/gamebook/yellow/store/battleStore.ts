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
import { markSeen, markCaught } from "./pokedexStore"
import { getPlayer, setTeam, addCaught, consumeItem, addMoney } from "./playerStore"
import { toMonInstance } from "../storage/save"
import { evolveTeam } from "../progression/evolveTeam"
import { persistYellowSave } from "./saveManager"

/** Espèce de l'adversaire actif (pour synchroniser le Pokédex). */
function enemyActiveSpeciesId(b: BattleState): string | null {
    const m = b.enemy.team[b.enemy.activeIndex]
    return m ? m.speciesId : null
}

/** Met à jour le Pokédex depuis l'état de combat (vu, et capturé si applicable). */
function syncPokedex(b: BattleState) {
    const sp = enemyActiveSpeciesId(b)
    if (!sp) return
    markSeen(sp)
    if (b.outcome === "caught") markCaught(sp)
}

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
    const battle = createBattle(playerTeam, enemyTeam, { isWild: true, seed })
    syncPokedex(battle) // adversaire "vu" dès la rencontre
    setStore({ battle })
}

export function startTrainerBattle(playerTeam: MonInstance[], enemyTeam: MonInstance[], seed: number) {
    const battle = createBattle(playerTeam, enemyTeam, { isWild: false, seed })
    syncPokedex(battle)
    setStore({ battle })
}

export function submitPlayerAction(action: PlayerAction) {
    if (!storeState.battle) return
    // Lancer une Ball consomme l'objet de l'inventaire (réussite ou non).
    if (action.kind === "ball" && !consumeItem(action.itemId)) return
    const next = resolveTurn(storeState.battle, action)
    syncPokedex(next) // vu (changement d'adversaire) + capturé le cas échéant
    setStore({ battle: next })
    if (next.phase === "ended") finishBattle(next)
}

/** Fin de combat : resync équipe (XP/PV/niveaux), capture, évolutions, sauvegarde. */
function finishBattle(b: BattleState) {
    // 1) Resynchronise l'équipe persistante depuis l'état de combat.
    setTeam(b.player.team.map(toMonInstance))

    // 2) Capture → ajoute le sauvage à l'équipe/PC.
    if (b.outcome === "caught") {
        const wild = b.enemy.team[b.enemy.activeIndex]
        if (wild) addCaught(toMonInstance(wild))
    }

    // 2bis) Argent de victoire (prix de combat).
    if (b.outcome === "win") {
        const foe = b.enemy.team[b.enemy.activeIndex]
        if (foe) addMoney(foe.level * 6)
    }

    // 3) Évolutions post-combat (mute l'équipe → re-set pour notifier + Pokédex).
    const team = getPlayer().team
    const evos = evolveTeam(team)
    if (evos.length > 0) {
        for (const e of evos) markCaught(e.toId) // la nouvelle forme entre au Pokédex
        setTeam([...team])
    }

    // 4) Sauvegarde persistante (DB).
    persistYellowSave()
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
