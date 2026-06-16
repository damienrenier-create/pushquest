import { describe, it, expect } from "vitest"
import { getTrainer } from "./trainers"
import { getMove } from "./moves"
import { getCt } from "./cts"
import { getSpecies } from "./species"
import { YELLOW_MAPS } from "../maps"

const GARDES = ["y_eauarena_g1", "y_eauarena_g2", "y_eauarena_g3", "y_eauarena_g4"]

describe("Arène Eau — Sanctuaire des Marées (badge eau)", () => {
    it("4 gardes + 1 boss existent, équipes valides (espèces réelles)", () => {
        for (const id of [...GARDES, "y_eauarena_boss"]) {
            const t = getTrainer(id)
            expect(t, id).toBeTruthy()
            expect(t!.team.length).toBeGreaterThan(0)
            for (const m of t!.team) expect(getSpecies(m.speciesId), m.speciesId).toBeTruthy()
        }
    })

    it("le boss ONDINE donne le badge eau + la CT27, gate sur les 4 gardes", () => {
        const boss = getTrainer("y_eauarena_boss")!
        expect(boss.badge).toBe("eau")
        expect(boss.giftCt).toBe("ct27")
        expect(boss.requiresTrainers).toEqual(GARDES)
    })

    it("Déferlante : move EAU + CT27 cadeau", () => {
        const mv = getMove("deferlante")!
        expect(mv.type).toBe("EAU")
        expect(mv.power).toBeGreaterThan(0)
        const ct = getCt("ct27")!
        expect(ct.moveId).toBe("deferlante")
        expect(ct.gift).toBe(true)
    })

    it("l'AS du boss (Razmarée) ouvre sur Déferlante + Naïadrak présent (les 2 AS)", () => {
        const team = getTrainer("y_eauarena_boss")!.team
        const ace = team.find((m) => m.opening?.includes("deferlante"))
        expect(ace).toBeTruthy()
        expect(ace!.speciesId).toBe("razmaree")
        expect(team.some((m) => m.speciesId === "naiadrak")).toBe(true)
        expect(team.some((m) => m.speciesId === "leviathonn")).toBe(false) // Léviathonn retiré du boss
    })

    it("map yellow_arena_eau existe + les 5 dresseurs placés aux bonnes cases", () => {
        expect(YELLOW_MAPS["yellow_arena_eau"]).toBeTruthy()
        const pos: Record<string, [number, number]> = {
            y_eauarena_g1: [5, 8], y_eauarena_g2: [5, 11], y_eauarena_g3: [11, 8], y_eauarena_g4: [11, 11], y_eauarena_boss: [7, 3],
        }
        for (const [id, [x, y]] of Object.entries(pos)) {
            const t = getTrainer(id)!
            expect(t.mapId).toBe("yellow_arena_eau")
            expect([t.x, t.y]).toEqual([x, y])
        }
    })

    it("gardes INDÉPENDANTS (pas de chaîne) ; seul le boss exige les 4", () => {
        for (const g of GARDES) expect(getTrainer(g)!.requiresTrainers ?? []).toEqual([])
        expect(getTrainer("y_eauarena_boss")!.requiresTrainers).toEqual(GARDES)
    })
})
