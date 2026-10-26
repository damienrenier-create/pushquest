import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { RUN3_ARENA_NPCS, RUN3_ARENA_BOSS_IDS, isRun3ArenaNpc, run3ArenaIntro, run3ArenaDefeat, run3ArenaName } from "./run3ArenaNpcs"
import { TRAINERS } from "./trainers"
import { RUN3_ARENA_TEAMS } from "./ngplusArenas"

// RUN 3 — PNJ d'arène re-thémés (signalement Sartay 26/10/2026 : noms, dialogues et sprites du run 1 en run 3).
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")
const FORBIDDEN = /pompes|quota|\breps\b|sueur/i // lu aussi par les joueurs fun

describe("run 3 — gardiens des 5 arènes : nom + dialogues du thème", () => {
    const guards = TRAINERS.filter((t) => t.run3X != null && !t.badge)
    it("chaque gardien repositionné en run 3 (20) a son entrée ; les 5 boss sont connus", () => {
        expect(guards).toHaveLength(20)
        for (const g of guards) expect(RUN3_ARENA_NPCS[g.id], g.id).toBeTruthy()
        expect(Object.keys(RUN3_ARENA_NPCS).sort()).toEqual(guards.map((g) => g.id).sort())
        expect(Object.keys(RUN3_ARENA_NPCS).sort()).toEqual(Object.keys(RUN3_ARENA_TEAMS).sort()) // mêmes gardiens que les équipes run 3
        for (const id of RUN3_ARENA_BOSS_IDS) expect(TRAINERS.some((t) => t.id === id && t.badge), id).toBe(true)
    })
    it("noms uniques en capitales, intro et défaite non vides, rien du run 1, aucun mot interdit en fun", () => {
        const names = Object.values(RUN3_ARENA_NPCS).map((n) => n.name)
        expect(new Set(names).size).toBe(names.length)
        for (const [id, n] of Object.entries(RUN3_ARENA_NPCS)) {
            expect(n.name, id).toBe(n.name.toUpperCase())
            expect(n.intro.length, id).toBeGreaterThan(0)
            expect(n.defeat.length, id).toBeGreaterThan(0)
            const run1 = TRAINERS.find((t) => t.id === id)!
            expect(n.name, id).not.toBe(run1.name)
            for (const l of [...n.intro, ...n.defeat]) expect(l, `${id} : ${l}`).not.toMatch(FORBIDDEN)
        }
        expect(isRun3ArenaNpc("y_arena_g1")).toBe(true)
        expect(isRun3ArenaNpc("y_arena_druide")).toBe(true)
        expect(isRun3ArenaNpc("y_sbire")).toBe(false)
        expect(run3ArenaName("y_arena_g1")).toBe("GARDE GIVRE")
        expect(run3ArenaIntro("y_arena_druide")).toBeNull() // boss : nom + intro du champion (run3BossIntroLines)
        expect(run3ArenaDefeat("y_eauarena_g4")?.[0]).toContain("estrade")
    })
    it("câblage : nom + hideSprite dans activeNpcs, intros/défaites run 3, aucun sprite ni portrait du run 1", () => {
        const gs = read("src/lib/gamebook/yellow/store/gameStore.ts")
        expect(gs).toContain("hideSprite: true, name: run3ArenaName(n.id) ?? n.name")
        expect(gs).toContain("if (effectiveRunWorld() === \"run3\") return run3ArenaIntro(t.id) ?? intro")
        expect(gs).toContain("if (effectiveRunWorld() === \"run3\") return run3ArenaDefeat(t.id) ?? t.defeat")
        expect(read("src/app/gamebook/yellow/MapView.tsx")).toContain("if (npc.hideSprite && !overrideSprite) return null")
        const db = read("src/app/gamebook/yellow/DialogueBox.tsx")
        expect(db).toContain("isRun3ArenaNpc(dialogue.npcId)")
        expect(db).toContain("const portrait = gen3Sheet || r3 ? undefined : DIALOGUE_PORTRAITS[dialogue.npcId]")
    })
})
