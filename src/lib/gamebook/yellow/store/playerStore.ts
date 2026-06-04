// src/lib/gamebook/yellow/store/playerStore.ts
//
// Nexus Jaune Éclair — état PERSISTANT du joueur : équipe (max 6), PC (réserve),
// objets. Store externe (useSyncExternalStore). Source de vérité hors combat ;
// le combat travaille sur une COPIE de l'équipe et resynchronise à la fin.

import { useSyncExternalStore } from "react"
import type { MonInstance } from "../battle/types"
import { fullStats } from "../battle/stats"
import { getSpecies } from "../data/species"

export const TEAM_MAX = 6

interface PlayerState {
    team: MonInstance[]
    pc: MonInstance[]
    items: Record<string, number>
    money: number
}

let st: PlayerState = { team: [], pc: [], items: {}, money: 0 }
const listeners = new Set<() => void>()

function emit() { for (const l of listeners) l() }

export function subscribePlayer(l: () => void): () => void {
    listeners.add(l)
    return () => { listeners.delete(l) }
}

export function getPlayer(): PlayerState { return st }

export function hydratePlayer(p: Partial<PlayerState>) {
    st = { team: p.team ?? [], pc: p.pc ?? [], items: p.items ?? {}, money: p.money ?? 0 }
    emit()
}

/** Remplace l'équipe (utilisé pour resynchroniser après un combat : XP/PV/niveaux). */
export function setTeam(team: MonInstance[]) {
    st = { ...st, team }
    emit()
}

/** Ajoute un Daemon capturé (équipe si place, sinon PC). */
export function addCaught(mon: MonInstance): "team" | "pc" {
    const owned = { ...mon, owned: true }
    if (st.team.length < TEAM_MAX) {
        st = { ...st, team: [...st.team, owned] }
        emit()
        return "team"
    }
    st = { ...st, pc: [...st.pc, owned] }
    emit()
    return "pc"
}

export function addItem(itemId: string, qty = 1) {
    st = { ...st, items: { ...st.items, [itemId]: (st.items[itemId] ?? 0) + qty } }
    emit()
}

/** Consomme 1 objet (ex. une Ball). Renvoie false si le joueur n'en a pas. */
export function consumeItem(itemId: string): boolean {
    if ((st.items[itemId] ?? 0) <= 0) return false
    st = { ...st, items: { ...st.items, [itemId]: st.items[itemId] - 1 } }
    emit()
    return true
}

export function addMoney(n: number) {
    st = { ...st, money: Math.max(0, st.money + Math.floor(n)) }
    emit()
}

/** Dépense de l'argent. Renvoie false si fonds insuffisants. */
export function spendMoney(n: number): boolean {
    if (st.money < n) return false
    st = { ...st, money: st.money - Math.floor(n) }
    emit()
    return true
}

/** Soin complet de l'équipe (Centre Daemon) : PV max, statut effacé, PP refaits. */
export function healAllTeam() {
    st = {
        ...st,
        team: st.team.map((m): MonInstance => {
            const sp = getSpecies(m.speciesId)
            const max = sp ? fullStats(m, sp).hp : m.currentHp
            return {
                ...m,
                currentHp: max,
                status: "NONE",
                statusCounter: 0,
                moves: m.moves.map((mv) => ({ ...mv, pp: mv.ppMax })),
            }
        }),
    }
    emit()
}

export function usePlayer(): PlayerState {
    return useSyncExternalStore(subscribePlayer, getPlayer, getPlayer)
}
