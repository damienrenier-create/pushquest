import { describe, it, expect, vi } from "vitest"
import { startFusionLeagueBattle, getSnapshot, endBattle, resumeBattleFromStorage } from "./battleStore"
import { buildFusion, disposeFusion } from "../data/fusionMon"
import { buildFusionLeagueTeam, disposeFusionLeagueTeam } from "../data/fusionLeague"
import { createMonInstance } from "../battle/factory"
import { getSpecies, unregisterCustomSpecies } from "../data/species"

// LIGUE DE FUSION — REPRISE EXACTE au refresh. Les chimères (joueur + ENNEMI) sont des espèces ÉPHÉMÈRES (registre
// mémoire, perdues au reload). persistBattleSnapshot EMBARQUE leur définition dans l'instantané ; resumeBattleFromStorage
// les ré-enregistre AVANT de valider → le combat reprend pile où il en était (au lieu de repartir de zéro).
const _ls: Record<string, string> = {}
vi.stubGlobal("window", { localStorage: {
    getItem: (k: string) => (k in _ls ? _ls[k] : null),
    setItem: (k: string, v: string) => { _ls[k] = v },
    removeItem: (k: string) => { delete _ls[k] },
} })

describe("Ligue de Fusion — reprise exacte du combat (espèces éphémères embarquées)", () => {
    it("resumeBattleFromStorage ré-enregistre les fusions ENNEMIES perdues et restaure le combat", () => {
        const enemy = buildFusionLeagueTeam("will", "bronze")
        const player = [buildFusion(createMonInstance("maitrezenc", 60), createMonInstance("divinpate", 60))]
        const eTeam = enemy.map((f) => f.instance), pTeam = player.map((f) => f.instance)
        const enemyIds = eTeam.map((m) => m.speciesId), playerIds = pTeam.map((m) => m.speciesId)
        try {
            expect(startFusionLeagueBattle(pTeam, eTeam, 4242, "y_fusion_1")).toBe(true)
            // L'instantané est écrit en LS AVEC la définition des espèces éphémères embarquée.
            const key = Object.keys(_ls)[0]
            const raw = _ls[key]
            expect(raw).toBeTruthy()
            expect(JSON.parse(raw).fusionSpecies?.length).toBeGreaterThan(0)

            // SIMULE UN RELOAD : combat vidé + espèces éphémères PERDUES du registre.
            endBattle()
            unregisterCustomSpecies([...enemyIds, ...playerIds])
            for (const id of enemyIds) expect(getSpecies(id)).toBeNull() // bien perdues
            _ls[key] = raw // …mais l'instantané localStorage, lui, survit au refresh
            expect(getSnapshot().battle).toBeNull()

            // REPREND : ré-enregistre les espèces embarquées puis restaure le combat EXACT.
            expect(resumeBattleFromStorage()).toBe(true)
            const snap = getSnapshot()
            expect(snap.battle).not.toBeNull()
            expect(snap.battle!.enemy.team.length).toBe(eTeam.length)  // les 6 chimères de WILL reprises
            expect(snap.battle!.player.team.length).toBe(pTeam.length)
            for (const id of enemyIds) expect(getSpecies(id)).not.toBeNull() // ENNEMIES ré-enregistrées (sinon MissingNo)
        } finally {
            endBattle()
            player.forEach((f) => disposeFusion(f.speciesId))
            disposeFusionLeagueTeam(enemy)
        }
    })
})
