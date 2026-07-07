import { describe, it, expect } from "vitest"
import { arenaInfo, currentGymBadge } from "./arenaInfos"
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
})
