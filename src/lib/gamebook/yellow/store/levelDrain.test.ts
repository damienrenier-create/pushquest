import { describe, it, expect } from "vitest"
import { hydratePlayer, setActiveWorld, getPlayer, applyAcceptedGenieWishEffects } from "./playerStore"
import { createMonInstance } from "../battle/factory"

// VŒU DU GÉNIE — effet `level_drain` : le Daemon désigné (speciesId) « recrache » N niveaux. Cherché dans l'équipe
// PUIS dans le PC. Plancher niveau 1, pas de dé-évolution (l'espèce ne bouge pas). Cible absente → effet NON appliqué
// (renvoie false) pour être retenté au prochain login, comme un type d'effet pas encore déployé.
const setup = (team: string[] = [], pc: string[] = [], level = 77) => {
    hydratePlayer({
        reps: 0, repsCap: 5000, repsBankedTotal: 0, defeatedTrainers: [], items: {},
        team: team.map((id) => createMonInstance(id, level)),
        pc: pc.map((id) => createMonInstance(id, level)),
    })
    setActiveWorld("live")
}

describe("Vœu du génie — effet level_drain", () => {
    it("retire N niveaux au Daemon désigné dans l'équipe", () => {
        setup(["divinpate", "naiadrak"])
        const row = { accepted1: true, effect1: JSON.stringify({ kind: "level_drain", id: "divinpate", amount: 12 }) }
        expect(applyAcceptedGenieWishEffects(row)).toBe(true)
        const team = getPlayer().team
        expect(team[0].level).toBe(65)                     // 77 − 12
        expect(team[0].speciesId).toBe("divinpate")        // PAS de dé-évolution
        expect(team[1].level).toBe(77)                     // les autres ne bougent pas
        expect(getPlayer().defeatedTrainers).toContain("genie_fx1")
    })

    it("trouve la cible dans le PC si elle n'est pas dans l'équipe", () => {
        setup(["naiadrak"], ["divinpate"])
        applyAcceptedGenieWishEffects({ accepted1: true, effect1: JSON.stringify({ kind: "level_drain", id: "divinpate", amount: 12 }) })
        expect(getPlayer().pc[0].level).toBe(65)
        expect(getPlayer().team[0].level).toBe(77)
    })

    it("plancher au niveau 1 (jamais de niveau 0 ou négatif)", () => {
        setup(["divinpate"], [], 5)
        applyAcceptedGenieWishEffects({ accepted1: true, effect1: JSON.stringify({ kind: "level_drain", id: "divinpate", amount: 99 }) })
        expect(getPlayer().team[0].level).toBe(1)
    })

    it("les PV courants sont re-clampés au nouveau maximum", () => {
        setup(["divinpate"])
        const hpBefore = getPlayer().team[0].currentHp
        applyAcceptedGenieWishEffects({ accepted1: true, effect1: JSON.stringify({ kind: "level_drain", id: "divinpate", amount: 12 }) })
        const after = getPlayer().team[0]
        expect(after.currentHp).toBeLessThan(hpBefore)     // niveau plus bas → PV max plus bas
        expect(after.currentHp).toBeGreaterThan(0)
    })

    it("cible introuvable → NON appliqué (retenté au prochain login)", () => {
        setup(["naiadrak"])
        const row = { accepted1: true, effect1: JSON.stringify({ kind: "level_drain", id: "divinpate", amount: 12 }) }
        expect(applyAcceptedGenieWishEffects(row)).toBe(false)
        expect(getPlayer().defeatedTrainers).not.toContain("genie_fx1")
    })

    it("energy + level_drain dans le même vœu : les deux s'appliquent", () => {
        setup(["divinpate"])
        const row = { accepted1: true, effect1: JSON.stringify([{ kind: "energy", amount: 10379 }, { kind: "level_drain", id: "divinpate", amount: 12 }]) }
        expect(applyAcceptedGenieWishEffects(row)).toBe(true)
        expect(getPlayer().reps).toBe(10379)
        expect(getPlayer().team[0].level).toBe(65)
    })
})
