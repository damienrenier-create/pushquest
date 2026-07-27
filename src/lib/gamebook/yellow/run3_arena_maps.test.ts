import { describe, it, expect } from "vitest"
import { RUN3_ARENA_MAPS, YELLOW_MAPS } from "./maps"
import { TRAINERS } from "./data/trainers"
import { RUN3_ARENA_TEAMS } from "./data/ngplusArenas"

// RUN 3 — variantes d'arène re-thémées (glace/combat/spectre/dragon/multi) : grille 15×10 UNIFIÉE + fonds dédiés
// + dresseurs repositionnés. Ces variantes ne doivent JAMAIS altérer les cartes de base (run 1/2).

describe("RUN 3 — variantes d'arène re-thémées", () => {
    const IDS = ["yellow_arena", "yellow_arena_roche", "yellow_arena_feu", "yellow_arena_elec", "yellow_arena_eau"] as const

    it("les 5 variantes existent, toutes 15×10, fond _r3 + entrée/sortie (7,9)", () => {
        for (const id of IDS) {
            const m = RUN3_ARENA_MAPS[id]
            expect(m, id).toBeTruthy()
            expect(m.width, id).toBe(15)
            expect(m.height, id).toBe(10)
            expect(m.tiles.length).toBe(10)
            expect(m.tiles[0].length).toBe(15)
            expect(m.backgroundImage).toMatch(/_r3\.png$/)
            expect(m.exits?.[0]).toMatchObject({ x: 7, y: 9 })
        }
    })

    it("les 5 variantes partagent EXACTEMENT la même grille de collision (unifiée)", () => {
        const sig = (id: string) => RUN3_ARENA_MAPS[id].tiles.map((r) => r.join(",")).join("|")
        for (const id of IDS.slice(1)) expect(sig(id), id).toBe(sig("yellow_arena"))
    })

    it("arène 5 (Multi) sort vers CENDREVILLE ; les autres vers Ville Jaune", () => {
        expect(RUN3_ARENA_MAPS.yellow_arena_eau.exits?.[0]?.targetMapId).toBe("yellow_cendreville")
        for (const id of ["yellow_arena", "yellow_arena_roche", "yellow_arena_feu", "yellow_arena_elec"]) {
            expect(RUN3_ARENA_MAPS[id].exits?.[0]?.targetMapId, id).not.toBe("yellow_cendreville")
        }
    })

    it("NE modifie PAS les cartes de base (run 1/2)", () => {
        expect(YELLOW_MAPS.yellow_arena_feu.width).toBe(16)
        expect(YELLOW_MAPS.yellow_arena_eau.width).toBe(16)
        expect(YELLOW_MAPS.yellow_arena_roche.backgroundImage).toBe("/yellow/sprites/arena_roche.png")
        expect(YELLOW_MAPS.yellow_arena_eau.backgroundImage).toBe("/yellow/sprites/arene_eau.png")
    })

    it("les 4 gardes + boss de CHAQUE arène ont les positions run-3 unifiées (2,5)(12,5)(4,7)(10,7)+boss(7,1)", () => {
        const wantG: [number, number][] = [[2, 5], [12, 5], [4, 7], [10, 7]]
        const groups = [
            { p: "y_arena", boss: "y_arena_druide" },
            { p: "y_rocharena", boss: "y_rocharena_boss" },
            { p: "y_feuarena", boss: "y_feuarena_boss" },
            { p: "y_elecarena", boss: "y_elecarena_boss" },
            { p: "y_eauarena", boss: "y_eauarena_boss" },
        ]
        const byId = (id: string) => TRAINERS.find((t) => t.id === id)!
        for (const grp of groups) {
            ;[1, 2, 3, 4].forEach((n, i) => {
                const t = byId(`${grp.p}_g${n}`)
                expect([t.run3X, t.run3Y], `${grp.p}_g${n}`).toEqual(wantG[i])
            })
            const b = byId(grp.boss)
            // Boss run-3 = (7,1). Certains boss (druide, VOLTA) y sont DÉJÀ (pas de run3X) → défaut = (x,y).
            expect([b.run3X ?? b.x, b.run3Y ?? b.y], grp.boss).toEqual([7, 1])
        }
    })

    it("arène 5 run 3 : 1 seul Daemon run-3 swappé par garde (g1→Gékosmic, g2→Omnhippo, g3→Uzumaro)", () => {
        const ids = (k: string) => (RUN3_ARENA_TEAMS[k] ?? []).map((m) => m.speciesId)
        expect(ids("y_eauarena_g1")).toContain("gekosmic")
        expect(ids("y_eauarena_g1")).not.toContain("necrocorbe")
        expect(ids("y_eauarena_g2")).toContain("omnhippo")
        expect(ids("y_eauarena_g2")).not.toContain("cryotyran")
        expect(ids("y_eauarena_g3")).toContain("uzumaro")
        expect(ids("y_eauarena_g3")).not.toContain("archibouh")
        // exactement 1 swap par garde → les autres membres sont conservés
        expect(ids("y_eauarena_g1")).toEqual(["maitrezenc", "mycedruide", "dracarlin", "gekosmic"])
    })
})
