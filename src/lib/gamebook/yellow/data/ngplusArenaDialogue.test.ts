import { describe, it, expect } from "vitest"
import { RUN2_DIALOGUE, RUN2_BOSS_ROAST, run2ArenaIntro, run2ArenaDefeat } from "./ngplusArenaDialogue"
import { NGPLUS_ARENA_NPCS, NGPLUS_BOSS_GIFTS } from "./ngplusArenas"
import { getCt } from "./cts"
import { getMove } from "./moves"

// Dialogues RUN 2 des 5 arènes re-typées : complétude, cadeau EXACT (fix « Faille Sismique »), roast d'équipe.

describe("Dialogues run 2 — complétude", () => {
    it("les 25 dresseurs d'arène (5 boss + 20 gardes) ont une intro + une défaite non vides", () => {
        for (const id of Object.keys(NGPLUS_ARENA_NPCS)) {
            const d = RUN2_DIALOGUE[id]
            expect(d, `dialogue manquant pour ${id}`).toBeDefined()
            expect(d.intro.length).toBeGreaterThan(0)
            expect(d.defeat.length).toBeGreaterThan(0)
        }
    })
})

describe("Dialogues run 2 — chaque BOSS annonce SON vrai cadeau", () => {
    it("la défaite de chaque boss nomme la CT qu'il offre réellement (NGPLUS_BOSS_GIFTS)", () => {
        for (const [bossId, gift] of Object.entries(NGPLUS_BOSS_GIFTS)) {
            const moveName = getMove(getCt(gift.ctId)!.moveId)!.name
            const text = RUN2_DIALOGUE[bossId].defeat.join(" ").toUpperCase()
            expect(text, `${bossId} devrait nommer ${moveName}`).toContain(moveName.toUpperCase())
        }
    })
    it("BUG CORRIGÉ : le boss PSY (CÉRÉBRA) annonce bien ONDE CÉRÉBRALE (le vrai cadeau ct54)", () => {
        // (Il DÉSAVOUE la vieille « Faille Sismique » du run 1 comme clin d'œil — d'où sa présence assumée dans le texte.)
        const text = RUN2_DIALOGUE["y_rocharena_boss"].defeat.join(" ").toUpperCase()
        expect(text).toContain("ONDE CÉRÉBRALE")
    })
})

describe("Dialogues run 2 — roast dynamique (clash de l'équipe du joueur)", () => {
    it("ZÉPHYRA (VOL) se MOQUE d'un meneur Combat (proie du Vol) et le nomme", () => {
        const lines = run2ArenaIntro("y_arena_druide", [{ speciesId: "maitrezenc" }])!
        expect(lines.length).toBe(RUN2_DIALOGUE["y_arena_druide"].intro.length + 1) // +1 = la réplique-clash
        const roast = lines[lines.length - 1]
        expect(roast).toContain("Combat")       // type détecté
        expect(roast).toContain("Maîtrezenc")   // meneur nommé
    })
    it("ZÉPHYRA (VOL) est MÉFIANTE face à un meneur Roche (menace le Vol)", () => {
        const roast = run2ArenaIntro("y_arena_druide", [{ speciesId: "rocosaure" }])!.pop()!
        expect(roast).toContain("Roche")
    })
    it("un GARDE (sans roast ni admire) rend son intro TELLE QUELLE", () => {
        const lines = run2ArenaIntro("y_arena_g1", [{ speciesId: "maitrezenc" }])!
        expect(lines).toEqual(RUN2_DIALOGUE["y_arena_g1"].intro)
    })
    it("un GARDE ADMIRATIF s'extasie devant un Daemon RARE/LÉGENDAIRE et le nomme", () => {
        const lines = run2ArenaIntro("y_arena_g2", [{ speciesId: "pestilyx" }])! // Pestilyx = RARE
        expect(lines.length).toBe(RUN2_DIALOGUE["y_arena_g2"].intro.length + 1)
        expect(lines[lines.length - 1]).toContain("Pestilyx")
    })
    it("pas d'émerveillement SANS pièce rare dans l'équipe", () => {
        const lines = run2ArenaIntro("y_arena_g2", [{ speciesId: "plumiot" }])! // commun
        expect(lines).toEqual(RUN2_DIALOGUE["y_arena_g2"].intro)
    })
    it("un garde NON-admiratif ne s'extasie jamais, même face à un rare", () => {
        const lines = run2ArenaIntro("y_arena_g1", [{ speciesId: "pestilyx" }])!
        expect(lines).toEqual(RUN2_DIALOGUE["y_arena_g1"].intro)
    })
    it("tous les boss ont un roast, aucun garde", () => {
        for (const bossId of Object.keys(NGPLUS_BOSS_GIFTS)) expect(RUN2_BOSS_ROAST[bossId]).toBeDefined()
    })
})

describe("Dialogues run 2 — résolveurs", () => {
    it("run2ArenaDefeat renvoie null pour un dresseur NON-arène", () => {
        expect(run2ArenaDefeat("y_move_tutor")).toBeNull()
        expect(run2ArenaIntro("y_move_tutor", [{ speciesId: "maitrezenc" }])).toBeNull()
    })
})
