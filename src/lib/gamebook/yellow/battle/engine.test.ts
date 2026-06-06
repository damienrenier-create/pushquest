import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn, type BattleState } from "./engine"
import { createMonInstance } from "./factory"
import { getTrainer } from "../data/trainers"

// Auto-joue un combat jusqu'à l'issue, de façon DÉTERMINISTE :
// - en cas de changement forcé (KO du joueur), on envoie le 1er Daemon valide ;
// - sinon on attaque toujours avec la 1re capacité.
// Garde-fou anti-boucle : 300 tours max. Renvoie l'état final + le nombre de tours.
function autoPlay(start: BattleState): { final: BattleState; turns: number } {
    let s = start
    let turns = 0
    while (s.phase !== "ended" && turns < 300) {
        if (s.forcedSwitch === "player") {
            const idx = s.player.team.findIndex((m) => m.currentHp > 0)
            s = resolveTurn(s, { kind: "switch", teamIndex: idx })
        } else {
            s = resolveTurn(s, { kind: "move", moveIndex: 0 })
        }
        turns++
    }
    return { final: s, turns }
}

function trainerEnemyTeam(trainerId: string) {
    const t = getTrainer(trainerId)!
    return t.team.map((m) => createMonInstance(m.speciesId, m.level, { owned: false }))
}

describe("combat de dresseur — enchaînement multi-Daemon", () => {
    it("un joueur surpuissant bat les 2 Daemons du dresseur (les deux finissent K.O.)", () => {
        const player = [createMonInstance("cerfeuillu", 50), createMonInstance("cailloutchi", 50)]
        const enemy = trainerEnemyTeam("y_trainer_leo") // rongeur L5 + bulle L6
        const start = createBattle(player, enemy, { isWild: false, seed: 12345 })

        const { final, turns } = autoPlay(start)

        expect(final.phase).toBe("ended")
        expect(final.outcome).toBe("win")
        expect(turns).toBeLessThan(300)
        // L'enchaînement a bien eu lieu : TOUS les Daemons adverses sont K.O.
        expect(final.enemy.team.every((m) => m.currentHp <= 0)).toBe(true)
    })

    it("est parfaitement déterministe pour une même seed", () => {
        const mk = () => createBattle(
            [createMonInstance("cerfeuillu", 50), createMonInstance("cailloutchi", 50)],
            trainerEnemyTeam("y_trainer_leo"),
            { isWild: false, seed: 999 },
        )
        const a = autoPlay(mk())
        const b = autoPlay(mk())
        expect(a.turns).toBe(b.turns)
        expect(a.final.outcome).toBe(b.final.outcome)
    })

    it("on ne peut ni fuir ni capturer un combat de dresseur", () => {
        const start = createBattle(
            [createMonInstance("cerfeuillu", 50)],
            trainerEnemyTeam("y_trainer_mia"),
            { isWild: false, seed: 7 },
        )
        const afterRun = resolveTurn(start, { kind: "run" })
        expect(afterRun.phase).not.toBe("ended") // la fuite est refusée
        const afterBall = resolveTurn(start, { kind: "ball", itemId: "nexus_ball" })
        expect(afterBall.outcome).not.toBe("caught") // la capture est refusée
    })

    it("un objet de soin restaure des PV et consomme le tour", () => {
        const p = createMonInstance("rochison", 30) // énorme Défense → l'ennemi tape pour ~rien
        p.currentHp = 10
        const start = createBattle([p], [createMonInstance("plumiot", 2)], { isWild: true, seed: 5 })
        const after = resolveTurn(start, { kind: "item", itemId: "potion" })
        const mon = after.player.team[after.player.activeIndex]
        expect(mon.currentHp).toBeGreaterThan(10) // +20 PV (moins le coup ennemi minime)
        expect(after.turn).toBe(start.turn + 1)    // le tour est bien passé
    })

    it("partage l'XP : un Daemon ayant combattu puis mis au banc gagne aussi l'XP", () => {
        const a = createMonInstance("rochison", 50) // tank : survit à tout
        const b = createMonInstance("plumiot", 5)
        const startExpB = b.exp
        let s = createBattle([a, b], [createMonInstance("plumiot", 2)], { isWild: true, seed: 77 })
        // b entre en combat (→ "participated"), puis on le renvoie au banc.
        s = resolveTurn(s, { kind: "switch", teamIndex: 1 })
        s = resolveTurn(s, { kind: "switch", teamIndex: 0 })
        // a achève le sauvage.
        let guard = 0
        while (s.phase !== "ended" && guard < 50) {
            s = resolveTurn(s, { kind: "move", moveIndex: 0 })
            guard++
        }
        expect(s.outcome).toBe("win")
        // b était au banc à la fin, mais ayant participé il a touché de l'XP.
        expect(s.player.team[1].exp).toBeGreaterThan(startExpB)
    })

    it("ne partage PAS l'XP avec un Daemon n'ayant jamais combattu", () => {
        const a = createMonInstance("rochison", 50)
        const b = createMonInstance("plumiot", 5) // reste au banc tout le combat
        const startExpB = b.exp
        let s = createBattle([a, b], [createMonInstance("plumiot", 2)], { isWild: true, seed: 78 })
        let guard = 0
        while (s.phase !== "ended" && guard < 50) {
            s = resolveTurn(s, { kind: "move", moveIndex: 0 })
            guard++
        }
        expect(s.outcome).toBe("win")
        expect(s.player.team[1].exp).toBe(startExpB) // jamais envoyé → aucune XP
    })

    it("un Daemon faible et seul perd contre le dresseur", () => {
        const start = createBattle(
            [createMonInstance("cornaissant", 2)],
            trainerEnemyTeam("y_trainer_mia"), // piafeu L7 + galet L7
            { isWild: false, seed: 4242 },
        )
        const { final } = autoPlay(start)
        expect(final.phase).toBe("ended")
        expect(final.outcome).toBe("lose")
    })
})
