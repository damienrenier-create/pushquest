import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { sanitizeFrontierTeam, parseEngraved, buildFrontierBoard, sanitizeLevelRule, TOWER_RULES, FACTORY_RULES, FRONTIER_CHAMPION_STREAK } from "./frontierBoard"
import { BOSS_EVERY, JC_PER_WIN, JC_BOSS_MULT, DEFAULT_TEAM_SIZE } from "./engine"
import { DEFAULT_POOL_SIZE } from "./factory"

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8")

describe("stats partagées Tour / Usine (Sartay 19/10/2026)", () => {
    it("équipe gravée assainie : 6 Daemons max, niveau 1-100, champs bornés, données douteuses écartées", () => {
        const t = sanitizeFrontierTeam([
            { speciesId: "loupyre", level: 150, shiny: true, nickname: "  Croc  ", moves: ["Lance-Flammes", 3, "Morsure"] },
            { speciesId: "", level: 5 }, null, { level: 8 }, { speciesId: "x".repeat(65), level: 9 },
            ...Array.from({ length: 8 }, () => ({ speciesId: "mobyd", level: 0 })),
        ])
        expect(t[0]).toEqual({ speciesId: "loupyre", level: 100, shiny: true, nickname: "Croc", moves: ["Lance-Flammes", "Morsure"] })
        expect(t.every((m) => m.level >= 1 && m.level <= 100)).toBe(true)
        expect(t.length).toBeLessThanOrEqual(6)
        expect(sanitizeFrontierTeam("n'importe quoi")).toEqual([])
        expect(sanitizeLevelRule("L100")).toBe("L100")
        expect(sanitizeLevelRule("L999")).toBeUndefined()
    })
    it("record gravé : lu s'il est valide, null sinon (jamais d'exception)", () => {
        const ok = JSON.stringify({ streak: 12, levelRule: "ADAPT", team: [{ speciesId: "loupyre", level: 50 }], at: "2026-10-19T12:00:00Z" })
        expect(parseEngraved(ok)).toEqual({ streak: 12, levelRule: "ADAPT", team: [{ speciesId: "loupyre", level: 50 }], at: "2026-10-19T12:00:00Z" })
        expect(parseEngraved("{pas du json")).toBeNull()
        expect(parseEngraved(JSON.stringify({ streak: 3, team: [] }))).toBeNull()
        expect(parseEngraved(null)).toBeNull()
    })
    it("classement : meilleurs records d'abord, zéros exclus, équipe jointe seulement si gravée avec CE record, « toi » marqué", () => {
        const eng = (streak: number) => JSON.stringify({ streak, team: [{ speciesId: "loupyre", level: 50 }] })
        const board = buildFrontierBoard([
            { userId: "a", best: 12, engraved: eng(12) },
            { userId: "b", best: 30, engraved: eng(20) }, // record battu depuis la gravure → pas d'équipe affichée
            { userId: "c", best: 0 },
            { userId: "d", best: 7 },
        ], (id) => ({ a: "Mools", b: "Jacanon", d: "Zyran" } as Record<string, string>)[id], "a")
        expect(board.map((e) => e.nickname)).toEqual(["Jacanon", "Mools", "Zyran"])
        expect(board[0].team).toBeUndefined()
        expect(board[1]).toMatchObject({ nickname: "Mools", best: 12, me: true })
        expect(board[1].team?.[0].speciesId).toBe("loupyre")
        expect(buildFrontierBoard(Array.from({ length: 40 }, (_, i) => ({ userId: String(i), best: i + 1 })), () => "x", "z").length).toBe(30)
    })
    it("les règles affichées suivent les vraies constantes du moteur", () => {
        const tower = TOWER_RULES.join(" "), factory = FACTORY_RULES.join(" ")
        expect(tower).toContain(`tous les ${BOSS_EVERY} combats`)
        expect(tower).toContain(`${JC_PER_WIN.L50} en Niv 50, ${JC_PER_WIN.ADAPT} en Adaptatif, ${JC_PER_WIN.L100} en Niv 100`)
        expect(tower).toContain(`×${JC_BOSS_MULT}`)
        expect(tower).toContain(`équipes de ${DEFAULT_TEAM_SIZE} Daemons`)
        expect(factory).toContain(`${DEFAULT_TEAM_SIZE} Daemons parmi ${DEFAULT_POOL_SIZE}`)
        expect(tower).toContain(`${FRONTIER_CHAMPION_STREAK} victoires`)
        // le seuil de Champion affiché = celui qui débloque vraiment la CT du Maître
        const ui = read("src/app/gamebook/yellow/YellowDevClient.tsx")
        expect(ui).toContain(`frontierProf.towerBest >= ${FRONTIER_CHAMPION_STREAK}`)
        expect(ui).toContain(`frontierProf.factoryBest >= ${FRONTIER_CHAMPION_STREAK}`)
    })
    it("⚠️ la route sert le classement (GET ?board=1) et ne grave l'équipe QUE sur un nouveau record, dans un essai séparé", () => {
        const route = read("src/app/api/gamebook/yellow/frontier/route.ts")
        expect(route).toContain("req.nextUrl.searchParams.get(\"board\")")
        expect(route).toContain("streak > cur[bestField]")
        expect(route).toContain("sanitizeFrontierTeam(body.team)")
        expect(route).toContain("isSystem: false")
        expect(read("prisma/schema.prisma")).toMatch(/towerTeam\s+String\?/)
    })
    it("⚠️ la Tour et l'Usine ont leurs onglets Jouer / Règles / Stats ; jamais d'équipe envoyée depuis la bulle de rejeu", () => {
        const ui = read("src/app/gamebook/yellow/YellowDevClient.tsx")
        expect(ui).toContain('<FrontierStatsView facility="tour"')
        expect(ui).toContain('<FrontierStatsView facility="usine"')
        expect(ui).toContain("<FrontierRulesView lines={TOWER_RULES} />")
        expect(ui).toContain("<FrontierRulesView lines={FACTORY_RULES} />")
        expect(ui.split("team: getActiveWorld() === \"replay\" ? undefined : freezeChampionTeam(").length - 1).toBe(2)
    })
})

describe("stats PERSONNELLES Tour / Usine, comme le Dôme (Sartay 19/10/2026)", () => {
    it("⚠️ les fétiches sont comptés au chemin SOLO pour le Dôme, la Tour et l'Usine (le Dôme ne comptait rien)", () => {
        const bs = read("src/lib/gamebook/yellow/store/battleStore.ts")
        const solo = bs.slice(bs.indexOf("export function submitPlayerAction"), bs.indexOf("const PLACEHOLDER_ACTION"))
        expect(solo).toContain("recordDomeUse(meMon.speciesId, usedMove)")
        expect(solo).toContain("recordFrontierUse(facility, meMon.speciesId, usedMove)")
        expect(solo).toContain("tid === \"frontier:TOWER\"")
    })
    it("⚠️ towerStats / factoryStats passent les DEUX sérialiseurs, la lecture de save et la fusion de saves", () => {
        const sm = read("src/lib/gamebook/yellow/store/saveManager.ts")
        expect(sm).toContain("towerStats: w.towerStats, factoryStats: w.factoryStats")
        expect(sm).toContain("towerStats: p.towerStats, factoryStats: p.factoryStats")
        expect(sm).toContain("primary.towerStats?.wins")
        expect(sm).toContain("primary.factoryStats?.moveUse")
        const sv = read("src/lib/gamebook/yellow/storage/save.ts")
        expect(sv).toContain("towerStats: parseDomeStats(o.towerStats)")
        expect(sv).toContain("factoryStats: parseDomeStats(o.factoryStats)")
        const ps = read("src/lib/gamebook/yellow/store/playerStore.ts")
        expect(ps).toContain("towerStats: p.towerStats ?? st.towerStats ?? emptyDomeStats()")
    })
    it("bilan V/D enregistré à chaque combat de Tour ou d'Usine, et affiché avec les fétiches", () => {
        const ui = read("src/app/gamebook/yellow/YellowDevClient.tsx")
        expect(ui).toContain("recordFrontierResult(fMode, frontierResult.won)")
        expect(ui).toContain("stats={player.towerStats}")
        expect(ui).toContain("stats={player.factoryStats}")
        const fm = read("src/app/gamebook/yellow/FrontierMasters.tsx")
        expect(fm).toContain("Tes Daemons de la Tour")
        expect(fm).toContain("Tes attaques de l'Usine")
    })
})

describe("compteurs du joueur (playerStore)", () => {
    it("recordFrontierUse / recordFrontierResult alimentent la bonne salle", async () => {
        const ps = await import("../store/playerStore")
        ps.recordFrontierUse("TOWER", "loupyre", "lance_flammes")
        ps.recordFrontierUse("TOWER", "loupyre", undefined)
        ps.recordFrontierUse("FACTORY", "mobyd", "hydrocanon")
        ps.recordFrontierResult("TOWER", true)
        ps.recordFrontierResult("TOWER", false)
        const p = ps.getPlayer()
        expect(p.towerStats?.daemonUse.loupyre).toBe(2)
        expect(p.towerStats?.moveUse.lance_flammes).toBe(1)
        expect(p.towerStats?.wins).toBe(1)
        expect(p.towerStats?.losses).toBe(1)
        expect(p.factoryStats?.daemonUse.mobyd).toBe(1)
        expect(p.factoryStats?.wins ?? 0).toBe(0)
    })
})
