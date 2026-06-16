import { describe, it, expect } from "vitest"
import { getSpecies } from "./species"
import { getMove } from "./moves"
import { getTrainer } from "./trainers"
import { YELLOW_MAPS } from "../maps"
import { createBattle, resolveTurn } from "../battle/engine"
import { createMonInstance } from "../battle/factory"
import type { MonInstance, MajorStatus } from "../battle/types"

describe("Goshendofy — légendaire des hautes herbes", () => {
    const sp = getSpecies("goshendofy")!
    it("existe, DRAGON pur, BST 590, croissance lente, catchRate légendaire", () => {
        expect(sp).toBeTruthy()
        expect(sp.types).toEqual(["DRAGON"])
        const bst = Object.values(sp.baseStats).reduce((a, b) => a + b, 0)
        expect(bst).toBe(590)
        expect(sp.growthRate).toBe("slow")
        expect(sp.catchRate).toBe(3)
        expect(sp.rarity).toBe("LEGENDARY")
        expect(sp.evolution).toBeUndefined()
    })
    it("learnset valide + sprite cohérent", () => {
        for (const l of sp.learnset) expect(getMove(l.moveId), l.moveId).toBeTruthy()
        expect(sp.sprite).toBe("/yellow/sprites/dex/goshendofy.png")
        expect(createMonInstance("goshendofy", 50).moves.length).toBeGreaterThan(0)
    })
})

// Sauvage avec config de capture attachée (façon rollWildEncounter).
function wildMon(speciesId: string, level: number, cfg: { currentHp?: number; status?: MajorStatus; captureRequiresStatus?: boolean; captureMinBallBonus?: number }): MonInstance {
    const m = createMonInstance(speciesId, level, { owned: false })
    if (cfg.currentHp != null) m.currentHp = cfg.currentHp
    if (cfg.status) m.status = cfg.status
    if (cfg.captureRequiresStatus) Object.assign(m, { captureRequiresStatus: true })
    if (cfg.captureMinBallBonus != null) Object.assign(m, { captureMinBallBonus: cfg.captureMinBallBonus })
    return m
}
const hasGateMsg = (events: { kind: string; text?: string }[]) =>
    events.some((e) => e.kind === "message" && e.text?.includes("STATUT"))

describe("Verrou de capture sous STATUT (légendaire)", () => {
    it("sans statut → la Ball est déviée, pas de capture", () => {
        const player = [createMonInstance("cailloutchi", 50)]
        const wild = [wildMon("goshendofy", 40, { captureRequiresStatus: true, currentHp: 1 })]
        const after = resolveTurn(createBattle(player, wild, { isWild: true, seed: 9 }), { kind: "ball", itemId: "hyper_ball_plus" })
        expect(after.outcome).not.toBe("caught")
        expect(hasGateMsg(after.events)).toBe(true)
    })
    it("avec un statut → le verrou de statut ne bloque PLUS (capture possible)", () => {
        const player = [createMonInstance("cailloutchi", 50)]
        const wild = [wildMon("goshendofy", 40, { captureRequiresStatus: true, status: "PARALYSIS", currentHp: 1 })]
        const after = resolveTurn(createBattle(player, wild, { isWild: true, seed: 9 }), { kind: "ball", itemId: "hyper_ball_plus" })
        expect(hasGateMsg(after.events)).toBe(false)
    })
    it("la Master Ball shunte le verrou de statut", () => {
        const player = [createMonInstance("cailloutchi", 50)]
        const wild = [wildMon("goshendofy", 40, { captureRequiresStatus: true, currentHp: 1 })]
        const after = resolveTurn(createBattle(player, wild, { isWild: true, seed: 9 }), { kind: "ball", itemId: "master_ball" })
        expect(after.outcome).toBe("caught")
    })
})

describe("Ligue de Cendreville — Conseil des 4 + Maître", () => {
    const ids = ["y_ligue_1_olga", "y_ligue_2_aldo", "y_ligue_3_agatha", "y_ligue_4_peter", "y_ligue_maitre"]
    it("les 5 dresseurs existent avec une équipe et des dialogues", () => {
        for (const id of ids) {
            const t = getTrainer(id)
            expect(t, id).toBeTruthy()
            expect(t!.team.length).toBeGreaterThanOrEqual(5)
            expect(t!.intro.length).toBeGreaterThan(0)
            expect(t!.defeat.length).toBeGreaterThan(0)
        }
    })
    it("séquence gauntlet : chaque membre requiert le précédent", () => {
        expect(getTrainer("y_ligue_2_aldo")!.requiresTrainers).toContain("y_ligue_1_olga")
        expect(getTrainer("y_ligue_3_agatha")!.requiresTrainers).toContain("y_ligue_2_aldo")
        expect(getTrainer("y_ligue_4_peter")!.requiresTrainers).toContain("y_ligue_3_agatha")
        expect(getTrainer("y_ligue_maitre")!.requiresTrainers).toContain("y_ligue_4_peter")
    })
    it("le Maître (ACE rival) est en IA 'ace' et mène ses 3 panthères", () => {
        const m = getTrainer("y_ligue_maitre")!
        expect(m.aiLevel).toBe("ace")
        const panthers = m.team.filter((t) => t.speciesId.endsWith("panthe"))
        expect(panthers.length).toBeGreaterThanOrEqual(3)
    })
})

describe("Ligue — 5 salles en enfilade (maps + dresseurs câblés)", () => {
    const ROOMS = [
        ["yellow_ligue_glace", "y_ligue_1_olga"],
        ["yellow_ligue_combat", "y_ligue_2_aldo"],
        ["yellow_ligue_spectre", "y_ligue_3_agatha"],
        ["yellow_ligue_dragon", "y_ligue_4_peter"],
        ["yellow_ligue_rival", "y_ligue_maitre"],
    ] as const

    it("chaque salle existe + son dresseur y est placé", () => {
        for (const [mapId, trainerId] of ROOMS) {
            expect(YELLOW_MAPS[mapId], mapId).toBeTruthy()
            expect(getTrainer(trainerId)!.mapId).toBe(mapId)
        }
    })

    it("enfilade par la porte droite (20,6) ; la salle du rival sort vers Cendreville", () => {
        const chain = ["yellow_ligue_glace", "yellow_ligue_combat", "yellow_ligue_spectre", "yellow_ligue_dragon"]
        chain.forEach((id, i) => {
            const exit = YELLOW_MAPS[id]?.exits?.find((e) => e.x === 19 && e.y === 6)
            expect(exit, id).toBeTruthy()
            expect(exit?.targetMapId).toBe(i < chain.length - 1 ? chain[i + 1] : "yellow_ligue_rival")
        })
        const rivalExit = YELLOW_MAPS["yellow_ligue_rival"]?.exits?.find((e) => e.x === 19 && e.y === 6)
        expect(rivalExit?.targetMapId).toBe("yellow_cendreville")
    })
})
