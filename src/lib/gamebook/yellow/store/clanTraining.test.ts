import { describe, it, expect, beforeEach } from "vitest"
import { resetForIntro, awardBadge, addCaught, getClanTrainPeaks } from "./playerStore"
import { clanChiefPressA, executeClanJoin } from "./clanChief"
import { startClanChiefBattle, getSnapshot } from "./battleStore"
import { createMonInstance } from "../battle/factory"

const TODAY = "2026-08-30"

// Entraînement chez les chefs (Phase 3) : mon clan ×2 XP / rivaux ×3 coût+XP, gate triangle, cliquet, cap journalier.
describe("Entraînement de clan (Phase 3)", () => {
    beforeEach(() => resetForIntro())

    it("MON CLAN : combat lancé (×2 XP, coût ×1), taille = mon équipe, cliquet mémorisé, 1×/jour", () => {
        awardBadge("feu"); executeClanJoin("air") // pivinci (VOL) niv 5
        const ok = startClanChiefBattle("air", TODAY)
        expect(ok).toBe(true)
        const b = getSnapshot().battle!
        expect(b.expMult).toBe(2)
        expect(b.costMult).toBe(1)
        expect(b.enemy.team.length).toBe(1)                       // taille = équipe du joueur
        expect(getClanTrainPeaks("air")[0]).toBeGreaterThanOrEqual(5) // pic mémorisé
        // marqueur journalier posé → 2e demande refusée le même jour
        const r = clanChiefPressA("y_clan_air", TODAY)!
        expect(r.pendingTrain).toBeUndefined()
        expect(r.lines.join(" ")).toMatch(/déjà/i)
    })

    it("RIVAL : coût ×3 et XP ×3", () => {
        awardBadge("feu"); executeClanJoin("air")
        const ok = startClanChiefBattle("combat", TODAY) // combat = proie de l'air (rival)
        expect(ok).toBe(true)
        const b = getSnapshot().battle!
        expect(b.expMult).toBe(3)
        expect(b.costMult).toBe(3)
    })

    it("gate PROIE (clan faible) : je possède déjà leur type → refus ; sinon → offre ×3", () => {
        awardBadge("feu"); executeClanJoin("air") // air : proie = combat
        // sans Daemon Combat → offre
        let r = clanChiefPressA("y_clan_combat", TODAY)!
        expect(r.pendingTrain).toBe("combat")
        expect(r.lines.join(" ")).toMatch(/TRIPLE/i)
        // avec un Daemon Combat en équipe → refus (rien à apprendre)
        addCaught(createMonInstance("maitrezenc", 12, { owned: true })) // type COMBAT (non signature)
        r = clanChiefPressA("y_clan_combat", TODAY)!
        expect(r.pendingTrain).toBeUndefined()
        expect(r.lines.join(" ")).toMatch(/Ouste|apprendre/i)
    })

    it("gate PRÉDATEUR (clan fort) : aucun de leur type → refus ; avec → offre ×3", () => {
        awardBadge("feu"); executeClanJoin("air") // air : prédateur = roche
        let r = clanChiefPressA("y_clan_roche", TODAY)!
        expect(r.pendingTrain).toBeUndefined()
        expect(r.lines.join(" ")).toMatch(/suicide|équipé/i)
        addCaught(createMonInstance("mottoche", 12, { owned: true })) // type ROCHE
        r = clanChiefPressA("y_clan_roche", TODAY)!
        expect(r.pendingTrain).toBe("roche")
        expect(r.lines.join(" ")).toMatch(/TRIPLE/i)
    })
})
