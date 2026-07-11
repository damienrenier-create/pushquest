import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn } from "./engine"
import { createMonInstance } from "./factory"

const mv = (id: string) => ({ moveId: id, pp: 10, ppMax: 10 })

describe("Vol d'Éclat (Wistree) — siphon de boosts", () => {
    it("VOLE (transfère) les boosts POSITIFS de la cible vers le lanceur — la cible les perd", () => {
        const p = createMonInstance("wistree", 55); p.moves = [mv("vol_d_eclat")]
        const e = createMonInstance("couperin", 45); e.moves = [mv("charge")]
        let b = createBattle([p], [e], { isWild: true, seed: 5 })
        b.enemy.team[0].stages.atk = 2
        b.enemy.team[0].stages.spe = 1
        b = resolveTurn(b, { kind: "move", moveIndex: 0 })
        expect(b.enemy.team[0].stages.atk).toBe(0)   // la cible PERD ses gains
        expect(b.enemy.team[0].stages.spe).toBe(0)
        expect(b.player.team[0].stages.atk).toBe(2)  // le lanceur se les APPROPRIE
        expect(b.player.team[0].stages.spe).toBe(1)
    })
})

describe("Mitra-Poing (Focus Punch) — charge / casse / libération", () => {
    it("phase 1 = CHARGE sans dégât + verrou ; phase 2 = grosse frappe si NON touché", () => {
        const p = createMonInstance("uzumaro", 80); p.moves = [mv("mitra_poing")]
        const e = createMonInstance("couperin", 20); e.moves = [mv("mur_de_fer")] // statut → ne touche jamais le lanceur
        let b = createBattle([p], [e], { isWild: true, seed: 7 })
        const eHp0 = b.enemy.team[0].currentHp
        b = resolveTurn(b, { kind: "move", moveIndex: 0 })          // PHASE 1 : concentration
        expect(b.enemy.team[0].currentHp).toBe(eHp0)                // aucun dégât en phase 1
        expect(b.player.team[0].chargingMove).toBe("mitra_poing")
        expect(b.player.team[0].focusing).toBe(true)
        b = resolveTurn(b, { kind: "move", moveIndex: 0 })          // PHASE 2 : libération (jamais touché)
        expect(b.enemy.team[0].currentHp).toBeLessThan(eHp0)        // gros coup encaissé
        expect(b.player.team[0].chargingMove).toBeUndefined()
    })

    it("EMPOISONNÉ : le résiduel de fin de tour ne casse PAS le focus → libère quand même", () => {
        const p = createMonInstance("uzumaro", 80); p.moves = [mv("mitra_poing")]
        const e = createMonInstance("couperin", 20); e.moves = [mv("mur_de_fer")] // statut → ne touche jamais le lanceur
        let b = createBattle([p], [e], { isWild: true, seed: 11 })
        b.player.team[0].status = "POISON"
        const eHp0 = b.enemy.team[0].currentHp
        b = resolveTurn(b, { kind: "move", moveIndex: 0 })     // phase 1 : focus ; poison en fin de tour NE déconcentre PAS
        expect(b.player.team[0].focusing).toBe(true)
        expect(b.player.team[0].focusBroken).toBeFalsy()
        b = resolveTurn(b, { kind: "move", moveIndex: 0 })     // phase 2 : libère malgré le poison
        expect(b.enemy.team[0].currentHp).toBeLessThan(eHp0)
    })

    it("TOUCHÉ pendant la charge → déconcentré, l'attaque ÉCHOUE au tour 2", () => {
        const p = createMonInstance("uzumaro", 60); p.moves = [mv("mitra_poing")]   // VIT 84 → agit avant
        const e = createMonInstance("enclumind", 60); e.moves = [mv("poing_karate")] // VIT 52 → frappe après le focus
        let b = createBattle([p], [e], { isWild: true, seed: 9 })
        b = resolveTurn(b, { kind: "move", moveIndex: 0 })          // phase 1 : focus, puis l'ennemi frappe
        expect(b.player.team[0].focusBroken).toBe(true)
        const eHp1 = b.enemy.team[0].currentHp
        b = resolveTurn(b, { kind: "move", moveIndex: 0 })          // phase 2 : ÉCHEC (déconcentré)
        expect(b.enemy.team[0].currentHp).toBe(eHp1)                // aucun dégât : Mitra-Poing a raté
        expect(b.player.team[0].chargingMove).toBeUndefined()       // charge consommée
    })
})
