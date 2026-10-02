import { describe, it, expect, vi } from "vitest"
import { startFusionLeagueBattle, getSnapshot, endBattle, resumeBattleFromStorage } from "./battleStore"
import { buildFusion, disposeFusion } from "../data/fusionMon"
import { buildFusionLeagueTeam, disposeFusionLeagueTeam } from "../data/fusionLeague"
import { createMonInstance } from "../battle/factory"
import { getSpecies, unregisterCustomSpecies } from "../data/species"
import { BATTLE_SESSION_KEY } from "../storage/sessionKeys"

// LIGUE DE FUSION — REPRISE EXACTE au refresh. Les chimères (joueur + ENNEMI) sont des espèces ÉPHÉMÈRES (registre
// mémoire, perdues au reload). persistBattleSnapshot EMBARQUE leur définition dans l'instantané ; resumeBattleFromStorage
// les ré-enregistre AVANT de valider → le combat reprend pile où il en était (au lieu de repartir de zéro).
const _ls: Record<string, string> = {}
// sessionStorage : il SURVIT à un rechargement (et meurt avec l'onglet). Ce test simule justement un RECHARGEMENT
//   dans la même session — il faut donc le modéliser, sinon resumeBattleFromStorage considère que l'appli a été
//   fermée et LÂCHE le combat (porte de sortie, cf. data/battleResumePolicy). On ne le vide jamais ici.
const _ss: Record<string, string> = {}
const store = (m: Record<string, string>) => ({
    getItem: (k: string) => (k in m ? m[k] : null),
    setItem: (k: string, v: string) => { m[k] = v },
    removeItem: (k: string) => { delete m[k] },
})
vi.stubGlobal("window", { localStorage: store(_ls), sessionStorage: store(_ss) })

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
            // …mais un vrai rechargement ne passe PAS par endBattle() : l'instantané localStorage ET le témoin de
            //   session survivent tous les deux. endBattle() est un raccourci de test qui efface un peu trop —
            //   on remet donc les deux, sinon resumeBattleFromStorage croit que l'appli a été fermée et lâche
            //   le combat (porte de sortie, cf. data/battleResumePolicy).
            _ls[key] = raw
            _ss[BATTLE_SESSION_KEY] = "1"
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
