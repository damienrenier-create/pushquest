import { describe, it, expect, beforeEach } from "vitest"
import { resetForIntro, getClan, getPlayer, awardBadge, addCaught, rivalClanSignatureInTeam, clanDaemonLevel, getClansEverJoined, startNgPlusWorld, startRun3World, setGameMode } from "./playerStore"
import { clanChiefPressA, executeClanJoin } from "./clanChief"
import { createMonInstance } from "../battle/factory"
import { funMemeBlockedSpecies } from "../data/clans"

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

    it("place pleine : chaque chef fait un PITCH personnalisé et DIFFÉRENT (fin du bug « même discours »)", () => {
        awardBadge("feu")
        for (let i = 0; i < 6; i++) addCaught(createMonInstance("plumiot", 5, { owned: true }))
        const air = clanChiefPressA("y_clan_air", TODAY)!
        const roche = clanChiefPressA("y_clan_roche", TODAY)!
        const combat = clanChiefPressA("y_clan_combat", TODAY)!
        for (const r of [air, roche, combat]) {
            expect(r.pendingJoin).toBeUndefined()               // meute pleine → pas d'offre
            expect(r.lines.join(" ")).toMatch(/place|meute/i)   // encouragement à libérer une place
            expect(r.lines.length).toBeGreaterThanOrEqual(4)    // analyse + pro-clan + anti-rivaux + reviens
        }
        const a = air.lines.join(" "), rc = roche.lines.join(" "), cb = combat.lines.join(" ")
        expect(a).not.toBe(rc); expect(rc).not.toBe(cb); expect(a).not.toBe(cb) // 3 discours DISTINCTS
        expect(a).toMatch(/AIR/); expect(rc).toMatch(/ROCHE/); expect(cb).toMatch(/COMBAT/) // chacun vante SON clan
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

// Registre À VIE des clans rejoints (gate FUN des lignées « meme ») — cf. data/clans.ts + gameStore blockedSpecies.
describe("Registre clansEverJoined (gate FUN meme)", () => {
    beforeEach(() => { resetForIntro(); setGameMode("normal") })

    it("neuf : aucun clan ; pacter inscrit le clan au registre + au run courant", () => {
        expect(getClansEverJoined()).toEqual([])
        awardBadge("feu"); executeClanJoin("air")
        expect(getClansEverJoined()).toEqual(["air"])
    })

    it("le registre SURVIT au NG+ puis au run 3 (à vie, tous runs)", () => {
        awardBadge("feu"); executeClanJoin("air")
        startNgPlusWorld(createMonInstance("pivinci", 5, { owned: true }))
        expect(getClan()).toBeNull()                     // nouveau run : pas encore de pacte
        expect(getClansEverJoined()).toEqual(["air"])    // …mais le clan reste débloqué À VIE
        awardBadge("feu"); executeClanJoin("combat")     // 2e clan au run 2
        expect(getClansEverJoined().sort()).toEqual(["air", "combat"])
        startRun3World(createMonInstance("pivinci", 5, { owned: true }))
        expect(getClansEverJoined().sort()).toEqual(["air", "combat"]) // préservé au run 3
    })

    it("intégration : un joueur FUN débloque UNIQUEMENT la lignée du clan pacté, tous runs", () => {
        setGameMode("fun")
        expect(funMemeBlockedSpecies("fun", getClansEverJoined()).sort()).toEqual(["amadiam", "couperin", "diamantine", "dumotte", "golemini", "hexaroc", "maitrezenc", "megalithe", "mottoche", "octoroc", "plumiot", "quadroc"])
        awardBadge("feu"); executeClanJoin("air")        // rejoint l'Air → plumiot repop
        expect(funMemeBlockedSpecies("fun", getClansEverJoined()).sort()).toEqual(["amadiam", "couperin", "diamantine", "dumotte", "golemini", "hexaroc", "maitrezenc", "megalithe", "mottoche", "octoroc", "quadroc"])
        startNgPlusWorld(createMonInstance("pivinci", 5, { owned: true }))
        expect(funMemeBlockedSpecies("fun", getClansEverJoined()).sort()).toEqual(["amadiam", "couperin", "diamantine", "dumotte", "golemini", "hexaroc", "maitrezenc", "megalithe", "mottoche", "octoroc", "quadroc"]) // plumiot reste débloqué au run 2
    })
})
