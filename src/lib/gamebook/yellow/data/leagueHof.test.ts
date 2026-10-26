import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { LEAGUE_POST_FUSION_WORLD, leagueWorldForSacre, leagueHofVisible, leagueLiveDuplicates } from "./leagueHof"
import { teamOutclasses, rankClosest, REFLECT_OUTCLASS_COUNT, REFLECT_OUTCLASS_MARGIN } from "./playerArena"

// 26/10/2026 (Sartay, « pour ne pas décourager les nouveaux ») : palmarès de la Ligue du run 1 = UN sacre par joueur ; les
// re-sacres et les sacres post-fusion vont dans « RUN 1 · APRÈS FUSION », visible des seuls joueurs au run fusion.
// Et les REFLETS d'autres joueurs plus forts que toi ne s'affichent plus.
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")

describe("Hall of Fame de la Ligue — run 1 : un seul sacre par joueur, le reste après fusion", () => {
    it("classement d'un sacre", () => {
        expect(leagueWorldForSacre("live", false, false)).toBe("live")                  // 1er sacre d'un joueur hors fusion
        expect(leagueWorldForSacre("live", true, false)).toBe(LEAGUE_POST_FUSION_WORLD) // déjà fusionné
        expect(leagueWorldForSacre("live", false, true)).toBe(LEAGUE_POST_FUSION_WORLD) // déjà un sacre run 1
        expect(leagueWorldForSacre(undefined, false, false)).toBe("live")
        expect(leagueWorldForSacre("ngplus", true, true)).toBe("ngplus")                 // runs 2/3 : inchangés
        expect(leagueWorldForSacre("run3", true, true)).toBe("run3")
        expect(leagueWorldForSacre("platine", false, false)).toBe("live")                // whitelist stricte (comme avant)
    })
    it("visibilité : après-fusion réservé au run fusion ; fusion:* jamais ici", () => {
        expect(leagueHofVisible("live", false)).toBe(true)
        expect(leagueHofVisible(null, false)).toBe(true)
        expect(leagueHofVisible(LEAGUE_POST_FUSION_WORLD, false)).toBe(false)
        expect(leagueHofVisible(LEAGUE_POST_FUSION_WORLD, true)).toBe(true)
        expect(leagueHofVisible("fusion:or", true)).toBe(false)
    })
    it("reprise : pour chaque joueur, le PREMIER sacre run 1 reste, les suivants partent", () => {
        const rows = [
            { id: "a2", userId: "u1", world: "live", wonAt: "2026-08-01" }, { id: "a1", userId: "u1", world: "live", wonAt: "2026-06-22" },
            { id: "b1", userId: "u2", world: "live", wonAt: "2026-07-14" }, { id: "b2", userId: "u2", world: "ngplus", wonAt: "2026-07-20" },
            { id: "c1", userId: "u3", world: null, wonAt: "2026-07-01" }, { id: "c2", userId: "u3", world: null, wonAt: "2026-07-02" },
        ]
        expect(leagueLiveDuplicates(rows)).toEqual(["c2", "a2"])
    })
    it("câblage : route (serveur décide) + onglet du viewer", () => {
        const route = read("src/app/api/gamebook/yellow/hall-of-fame/route.ts")
        expect(route).toContain("leagueWorldForSacre(body.world, await playerRun3Used(auth.userId), alreadyLive)")
        expect(route).toContain("leagueHofVisible(r.world, viewerRun3Used)")
        const viewer = read("src/app/gamebook/yellow/HallOfFameViewer.tsx")
        expect(viewer).toContain("{ id: \"live_post\", label: \"RUN 1 · APRÈS FUSION\" }")
        expect(viewer).toContain("(w.id === \"live_post\" && player.run3Used && activeWorld !== \"run3\")") // en plein run 3 : pas d onglet (le serveur ne le sert pas)
    })
})

describe("reflets : jamais un joueur plus fort que toi", () => {
    const mon = (level: number) => ({ speciesId: "plumiot", level, moves: [] as string[] })
    it("surclassé = au moins 2 Daemons à plus de 2 niveaux au-dessus de ton plus haut", () => {
        expect(REFLECT_OUTCLASS_COUNT).toBe(2); expect(REFLECT_OUTCLASS_MARGIN).toBe(2)
        expect(teamOutclasses([mon(43), mon(43), mon(10)], 40)).toBe(true)   // 2 Daemons à +3
        expect(teamOutclasses([mon(42), mon(42), mon(42)], 40)).toBe(false)  // +2 exactement : toléré
        expect(teamOutclasses([mon(60), mon(10), mon(10)], 40)).toBe(false)  // un seul Daemon au-dessus
        expect(teamOutclasses([], 40)).toBe(false)
    })
    it("rankClosest exclut ces joueurs, même proches en niveau max", () => {
        const players = [
            { userId: "p1", nickname: "P1", team: [mon(44), mon(44), mon(30)] },  // max 44 : dans la borne ±15, mais 2 Daemons à +4 → exclu
            { userId: "p2", nickname: "P2", team: [mon(44), mon(20), mon(20)] },  // un seul au-dessus → gardé
            { userId: "p3", nickname: "P3", team: [mon(38), mon(37), mon(36)] },  // moins fort → gardé
        ] as unknown as Parameters<typeof rankClosest>[0]
        expect(rankClosest(players, "me", 40, 6).map((p) => p.userId).sort()).toEqual(["p2", "p3"])
    })
    it("les PNJ-joueurs du run 2 (Grotte 1F) suivent la même règle", () => {
        const g = read("src/lib/gamebook/yellow/multiplayer/useRun2Ghosts.ts")
        expect(g).toContain("if (teamOutclasses(c.team, myLevel)) continue")
        expect(read("src/app/gamebook/yellow/YellowDevClient.tsx")).toContain("useRun2Ghosts(mapPlayer.mapId, userId, myArenaLevel)")
    })
})
