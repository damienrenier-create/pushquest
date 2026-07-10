import { describe, it, expect } from "vitest"
import { RUN3_ARENA_TEAMS } from "./ngplusArenas"
import { RUN3_ARENAS } from "./run3Arenas"
import { getSpecies } from "./species"
import { speciesAtLevel } from "./ace"

// guardType d'une arène → prédicat sur les types de l'espèce
const TYPE_OK: Record<string, (types: readonly string[]) => boolean> = {
    "Glace": (t) => t.includes("GLACE"),
    "Combat": (t) => t.includes("COMBAT"),
    "Poison/Spectre": (t) => t.includes("POISON") || t.includes("SPECTRE"),
    "Dragon": (t) => t.includes("DRAGON"),
    "Multi": () => true, // mélange de finals assumé
}
// bossTrainerId → préfixe des gardes g1-g4
const GUARD_PREFIX: Record<string, string> = {
    y_arena_druide: "y_arena_g",
    y_rocharena_boss: "y_rocharena_g",
    y_feuarena_boss: "y_feuarena_g",
    y_elecarena_boss: "y_elecarena_g",
    y_eauarena_boss: "y_eauarena_g",
}

describe("RUN3_ARENA_TEAMS — gardiens des 5 arènes re-typés", () => {
    it("chaque gardien porte le TYPE de son arène", () => {
        for (const arena of RUN3_ARENAS) {
            const prefix = GUARD_PREFIX[arena.bossTrainerId]
            const ok = TYPE_OK[arena.guardType]
            for (let g = 1; g <= 4; g++) {
                for (const mon of RUN3_ARENA_TEAMS[`${prefix}${g}`] ?? []) {
                    const sp = getSpecies(mon.speciesId)
                    expect(sp, `${mon.speciesId} existe`).toBeTruthy()
                    expect(ok(sp!.types), `arène ${arena.order} (${arena.guardType}) : ${mon.speciesId} = ${sp!.types}`).toBe(true)
                }
            }
        }
    })

    it("niveau NATUREL : aucune pré-évolution fielded au-dessus de son niveau d'évolution", () => {
        for (const team of Object.values(RUN3_ARENA_TEAMS)) {
            for (const mon of team) {
                expect(speciesAtLevel(mon.speciesId, mon.level), `${mon.speciesId} niv ${mon.level}`).toBe(mon.speciesId)
            }
        }
    })

    it("les 20 gardiens (g1-g4 × 5 arènes) sont tous définis", () => {
        let count = 0
        for (const arena of RUN3_ARENAS) {
            const prefix = GUARD_PREFIX[arena.bossTrainerId]
            for (let g = 1; g <= 4; g++) if (RUN3_ARENA_TEAMS[`${prefix}${g}`]) count++
        }
        expect(count).toBe(20)
    })
})
