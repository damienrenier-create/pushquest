import { describe, it, expect } from "vitest"
import { getTrainer } from "./trainers"
import { getMove } from "./moves"

describe("VOLTA — boss à 2 phases (chaînage direct + arène 100% élec)", () => {
    const volta = getTrainer("y_elecarena_boss")!

    it("chainRematch activé + phase 2 (rematch) définie avec ses CT signature", () => {
        expect(volta.chainRematch).toBe(true)
        expect(volta.rematch?.team.length).toBeGreaterThan(0)
        expect(volta.rematch?.giftCts).toContain("ct22") // Surtension
        expect(volta.rematch?.giftCts).toContain("ct25") // Mirage
    })

    it("chaque Daemon des DEUX phases a au moins une attaque de type ÉLEC", () => {
        for (const team of [volta.team, volta.rematch!.team]) {
            for (const m of team) {
                expect(m.moves, `${m.speciesId} doit avoir des moves explicites`).toBeTruthy()
                const hasElec = (m.moves ?? []).some((mv) => getMove(mv)?.type === "ELEC")
                expect(hasElec, `${m.speciesId} doit avoir une attaque ÉLEC`).toBe(true)
            }
        }
    })
})
