import { describe, it, expect } from "vitest"
import { arenaInfo, currentGymBadge } from "./arenaInfos"
import { NGPLUS_ARENA_TEAMS } from "./ngplusArenas"
import type { BadgeId } from "./cts"

const BADGES: BadgeId[] = ["plante", "roche", "feu", "elec", "eau"]

describe("arenaInfo — infos stratégiques auto des arènes", () => {
    it("chaque arène a un boss, une équipe non vide, des niveaux cohérents", () => {
        for (const b of BADGES) {
            const info = arenaInfo(b, false)
            expect(info, b).not.toBeNull()
            expect(info!.team.length, b).toBeGreaterThan(0)
            expect(info!.bossName, b).toBeTruthy()
            expect(info!.levelMax).toBeGreaterThanOrEqual(info!.levelMin)
            expect(info!.guardCount).toBeGreaterThan(0)
        }
    })

    it("recommandations/évitements cohérents avec le type de l'ACE (arène EAU)", () => {
        const eau = arenaInfo("eau", false)!
        expect(eau.themeTypes).toContain("EAU")
        expect(eau.recommend).toContain("ELEC")   // Élec ×2 sur Eau
        expect(eau.recommend).toContain("PLANTE") // Plante ×2 sur Eau
        expect(eau.avoid).toContain("FEU")        // Eau résiste le Feu
        expect(eau.recommend).not.toContain("EAU")
    })

    it("currentGymBadge : la prochaine arène non vaincue du gym", () => {
        expect(currentGymBadge([])).toBe("plante")
        expect(currentGymBadge(["plante"])).toBe("roche")
        expect(currentGymBadge(["plante", "roche"])).toBe("feu")
        expect(currentGymBadge(["plante", "roche", "feu"])).toBe("elec")
    })

    it("run 2 : l'équipe se calcule aussi (arène re-typée si NGPLUS_ARENA_TEAMS a une entrée)", () => {
        for (const b of BADGES) {
            const info2 = arenaInfo(b, true)
            expect(info2, b).not.toBeNull()
            expect(info2!.team.length, b).toBeGreaterThan(0)
        }
    })

    it("run 2 RE-SKIN : le panneau affiche le nom NG+ du boss (arène 1 VOL, arène 2 PSY)", () => {
        // Run 2 → nom re-skinné ; run 1 → nom d'origine (pas de fuite du re-skin dans le run 1).
        expect(arenaInfo("plante", true)!.bossName).toBe("ZÉPHYRA")
        expect(arenaInfo("plante", false)!.bossName).toBe("DRUIDE SYLVAIN")
        expect(arenaInfo("roche", true)!.bossName).toBe("CÉRÉBRA")
        expect(arenaInfo("roche", false)!.bossName).toBe("MAÎTRE GRANIT")
        // Le panneau montre bien l'équipe du RUN 2 (ACE re-typé) : arène 1 = Draclet (VOL), arène 2 = Vermisaint (PSY).
        expect(arenaInfo("plante", true)!.team.at(-1)!.speciesId).toBe("draclet")
        expect(arenaInfo("roche", true)!.team.at(-1)!.speciesId).toBe("vermisaint")
        // Arène 3 (ÉQUILIBRÉE) : boss re-skinné HARMONIA, ACE Frappard (Combat).
        expect(arenaInfo("feu", true)!.bossName).toBe("HARMONIA")
        expect(arenaInfo("feu", false)!.bossName).toBe("PYRA")
        expect(arenaInfo("feu", true)!.team.at(-1)!.speciesId).toBe("frappard")
        // Arène 4 (INSECTE) : boss re-skinné REGINA, ACE Regnantaur.
        expect(arenaInfo("elec", true)!.bossName).toBe("REGINA")
        expect(arenaInfo("elec", false)!.bossName).toBe("VOLTA")
        expect(arenaInfo("elec", true)!.team.at(-1)!.speciesId).toBe("regnantaur")
        // Arène 5 (FINALS) : boss re-skinné AMADIA, ACE Amadiam.
        expect(arenaInfo("eau", true)!.bossName).toBe("AMADIA")
        expect(arenaInfo("eau", false)!.bossName).toBe("ONDINE")
        expect(arenaInfo("eau", true)!.team.at(-1)!.speciesId).toBe("amadiam")
    })

    it("arène 3 run 2 : namizeus/flamkure/frappard ONT Danse du Fauve et l'OUVRENT", () => {
        const boss = NGPLUS_ARENA_TEAMS["y_feuarena_boss"]
        for (const sp of ["namizeus", "flamkure", "frappard"]) {
            const mon = boss.find((m) => m.speciesId === sp)!
            expect(mon.moves, sp).toContain("danse_fauve")
            expect(mon.opening, sp).toEqual(["danse_fauve"])
        }
    })
})
