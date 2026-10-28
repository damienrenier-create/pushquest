import { describe, it, expect, afterEach } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { hydratePlayer, getPlayer, setActiveWorld } from "./playerStore"
import { startWildBattle, submitPlayerAction, moveCostForDisplay, getBattleEnergy } from "./battleStore"
import { run3LastAttackPay } from "../data/combatCostConfig"
import { createMonInstance } from "../battle/factory"

// Sartay, 28/10/2026 : « run 3 : avant d'utiliser Charge Désespérée, la dernière attaque du run peut coûter ce qu'il reste
// d'énergie plutôt que son vrai prix, pour que le joueur finisse à 0 et ne reste pas bloqué à 1 énergie super longtemps ».
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")
afterEach(() => setActiveWorld("live"))

const fight = (reps: number) => {
    const me = createMonInstance("couperin", 45, { moveIds: ["draco_charge"] })
    hydratePlayer({ team: [me], reps, badges: [], items: {} })
    startWildBattle([me], [createMonInstance("plumiot", 5)], 11)
}

describe("run 3 — la dernière attaque coûte ce qu'il reste d'énergie", () => {
    it("règle pure : à court, on paie tout ce qui reste ; sinon le vrai prix ; hors run 3, toujours le vrai prix", () => {
        expect(run3LastAttackPay(12, 3, true)).toBe(3)
        expect(run3LastAttackPay(12, 40, true)).toBe(12)
        expect(run3LastAttackPay(12, 0, true)).toBe(12) // à 0 : rien à payer → l'attaque reste grisée (Charge Désespérée)
        expect(run3LastAttackPay(12, 3, false)).toBe(12)
        expect(run3LastAttackPay(0, 3, true)).toBe(0)
    })
    it("en combat au run 3 : l'attaque part et l'énergie tombe à 0", () => {
        setActiveWorld("run3")
        fight(2)
        expect(moveCostForDisplay(0)).toBeGreaterThan(2) // vraiment trop chère pour ce qui reste
        submitPlayerAction({ kind: "move", moveIndex: 0 })
        expect(getPlayer().reps).toBe(0)
        expect(getBattleEnergy().spent).toBe(2)
    })
    it("hors run 3 : inchangé, l'attaque trop chère est refusée et l'énergie ne bouge pas", () => {
        setActiveWorld("live")
        fight(2)
        expect(moveCostForDisplay(0)).toBeGreaterThan(2)
        submitPlayerAction({ kind: "move", moveIndex: 0 })
        expect(getPlayer().reps).toBe(2)
        expect(getBattleEnergy().spent).toBe(0)
    })
    it("câblage : l'écran de combat affiche et autorise le même montant, en duel du run 3 aussi", () => {
        const ui = read("src/app/gamebook/yellow/battle/BattleScreen.tsx")
        expect(ui).toContain("const pays = costs.map((c) => run3LastAttackPay(c, reps, effectiveRunWorld() === \"run3\"))")
        expect(ui).toContain("disabled: !canUse(pays[i])")
        expect(ui).toContain("Dernière attaque : elle prend toute ton énergie restante")
        expect(ui).toContain("{sel?.moveSlot != null && sel?.detail ? <div style={S.detailHint}>{sel.detail}</div> : null}") // affichée au-dessus de la fiche
        expect(read("src/lib/gamebook/yellow/store/battleStore.ts")).toContain("run3LastAttackPay(moveCostRepsForAction(battle, action.moveIndex, meMon), getPlayer().reps, true)")
        // la FIN du concours « énergie » tombe à 0⚡ (et non plus dès que l'énergie ne paie plus une attaque entière)
        expect(read("src/app/gamebook/yellow/YellowDevClient.tsx")).toContain("if (player.reps > 0 && !beatMaster) return")
    })
})
