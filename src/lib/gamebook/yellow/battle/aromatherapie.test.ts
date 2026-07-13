import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn } from "./engine"
import { createMonInstance } from "./factory"

// AROMATHÉRAPIE (CT59, effect.healTeamStatus) : soigne TOUS les statuts majeurs de l'ÉQUIPE du lanceur
// (actif + banc), sans toucher l'adversaire ni les changements de stats. Distincte de Brume Sporale (ct35).
describe("Aromathérapie — soin de statut de toute l'équipe", () => {
    it("soigne l'actif ET le banc, laisse l'adversaire intact", () => {
        const active = createMonInstance("cerfeuillu", 50, { moveIds: ["aromatherapie"] })
        const bench = createMonInstance("rochison", 50)
        let s = createBattle([active, bench], [createMonInstance("plumiot", 5)], { isWild: true, seed: 1 })

        // Actif = BRÛLURE (laisse agir), banc = SOMMEIL profond, adversaire = POISON.
        s.player.team[0].status = "BURN"; s.player.team[0].statusCounter = 0
        s.player.team[1].status = "SLEEP"; s.player.team[1].statusCounter = 3
        s.enemy.team[0].status = "POISON"; s.enemy.team[0].statusCounter = 0

        s = resolveTurn(s, { kind: "move", moveIndex: 0 })

        expect(s.player.team[0].status).toBe("NONE")        // actif soigné
        expect(s.player.team[1].status).toBe("NONE")        // banc soigné
        expect(s.player.team[1].statusCounter).toBe(0)      // compteur de sommeil remis à zéro
        expect(s.enemy.team[0].status).toBe("POISON")       // l'adversaire n'est PAS soigné
    })
})
