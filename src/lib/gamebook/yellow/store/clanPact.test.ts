import { describe, it, expect, beforeEach } from "vitest"
import { resetForIntro, getClan, getPlayer, awardBadge, addCaught, rivalClanSignatureInTeam, clanDaemonLevel } from "./playerStore"
import { clanChiefPressA, executeClanJoin } from "./clanChief"
import { createMonInstance } from "../battle/factory"

const TODAY = "2026-08-30"

// Pacte de clan (Phase 2) — gate arène 1, offre, serment irréversible, refus loyauté, jalousie, visite.
describe("Pacte de clan (Phase 2)", () => {
    beforeEach(() => resetForIntro())

    it("GATE arène 1 : sans badge, le chef refuse le pacte", () => {
        const r = clanChiefPressA("y_clan_air", TODAY)!
        expect(r.pendingJoin).toBeUndefined()
        expect(r.lines.join(" ")).toMatch(/badge/i)
    })

    it("avec un badge + place libre : le chef OFFRE le pacte (pendingJoin)", () => {
        awardBadge("feu")
        const r = clanChiefPressA("y_clan_air", TODAY)!
        expect(r.pendingJoin).toBe("air")
        expect(r.lines.join(" ")).toMatch(/pacte/i)
    })

    it("place pleine : le chef refuse tant qu'il n'y a pas de slot libre", () => {
        awardBadge("feu")
        for (let i = 0; i < 6; i++) addCaught(createMonInstance("plumiot", 5, { owned: true }))
        const r = clanChiefPressA("y_clan_air", TODAY)!
        expect(r.pendingJoin).toBeUndefined()
        expect(r.lines.join(" ")).toMatch(/place|slot|pleine/i)
    })

    it("executeClanJoin : serment scellé + Daemon-clan niv 5 en équipe", () => {
        awardBadge("feu")
        clanChiefPressA("y_clan_air", TODAY)
        const lines = executeClanJoin("air")
        expect(getClan()).toBe("air")
        expect(getPlayer().team.some((m) => m.speciesId === "pivinci")).toBe(true)
        expect(clanDaemonLevel()).toBe(5)
        expect(lines.join(" ")).toMatch(/scellé/i)
    })

    it("clan déjà juré : un AUTRE chef ne propose JAMAIS un 2e pacte (loyauté)", () => {
        awardBadge("feu"); executeClanJoin("air") // air ; roche = prédateur, pivinci seul (aucun Daemon Roche)
        const r = clanChiefPressA("y_clan_roche", TODAY)!
        expect(r.pendingJoin).toBeUndefined()      // impossible de rejoindre un 2e clan
        expect(r.lines.join(" ")).toMatch(/suicide|équipé/i) // ici : gate d'entraînement rival (pas d'offre de pacte)
    })

    it("JALOUSIE : signature rivale en équipe active → le chef gèle ses bienfaits", () => {
        awardBadge("feu"); executeClanJoin("air")
        addCaught(createMonInstance("lievrocogne", 50, { owned: true })) // signature COMBAT = rivale
        expect(rivalClanSignatureInTeam()).toBe("combat")
        const r = clanChiefPressA("y_clan_air", TODAY)!
        expect(r.lines.join(" ")).toMatch(/traître|rôde/i)
    })

    it("VISITE quotidienne : énergie ⚡ créditée 1×/jour", () => {
        awardBadge("feu"); executeClanJoin("air") // pivinci niv 5
        const r1 = clanChiefPressA("y_clan_air", TODAY)!
        expect(r1.lines.join(" ")).toMatch(/⚡/)          // récompense de visite
        const r2 = clanChiefPressA("y_clan_air", TODAY)!   // même jour → plus de visite
        expect(r2.lines.join(" ")).not.toMatch(/⚡/)
    })
})
