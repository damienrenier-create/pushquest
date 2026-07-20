import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn } from "./engine"
import { createMonInstance } from "./factory"

// FUSION — hook moteur `frozenSpd` (défense spéciale séparée de l'attaque spéciale).
// Prouve : (1) PARITÉ — un défenseur SANS frozenSpd se défend avec sa spc, EXACTEMENT comme avant (Gen-1 inchangé) ;
//          (2) le hook fonctionne — un frozenSpd plus élevé réduit les dégâts spéciaux reçus.
// La preuve de parité LARGE (aucun combat existant affecté) = les 994 autres tests, tous verts avec le hook.

// Dégâts d'UNE attaque spéciale (Choc Mental, PSY, power 50) contre un défenseur aux stats FIGÉES (spc = SpD).
// Attaquant plus rapide (divinpâte vit 82 > 40) → son coup frappe en premier, seul le défenseur perd des PV.
function specialDamage(defFrozenSpd?: number): number {
    const atk = createMonInstance("divinpate", 50, { moveIds: ["choc_mental"] })
    const def = createMonInstance("razmaree", 50)
    def.frozenStats = { hp: 250, atk: 80, def: 90, spe: 40, spc: 100 } // spc=100 = défense spé par défaut
    if (defFrozenSpd !== undefined) def.frozenSpd = defFrozenSpd
    def.currentHp = def.frozenStats.hp
    let s = createBattle([atk], [def], { isWild: true, seed: 4242 })
    s = resolveTurn(s, { kind: "move", moveIndex: 0 })
    return def.frozenStats.hp - s.enemy.team[0].currentHp
}

describe("FUSION — hook moteur frozenSpd", () => {
    it("PARITÉ : frozenSpd absent OU = spc → dégâts IDENTIQUES (comportement Gen-1 strictement inchangé)", () => {
        const noSpd = specialDamage(undefined) // se défend avec spc = 100
        const sameSpd = specialDamage(100)      // frozenSpd = 100 = spc → le `?? spc` tombe sur la même valeur
        expect(noSpd).toBeGreaterThan(0)
        expect(sameSpd).toBe(noSpd)
    })

    it("le hook fonctionne : une SpD plus haute réduit les dégâts spéciaux (défense uniquement)", () => {
        const lowSpd = specialDamage(100)
        const highSpd = specialDamage(300) // SpD ×3 → nettement moins de dégâts
        expect(highSpd).toBeLessThan(lowSpd)
        expect(highSpd).toBeGreaterThan(0)
    })
})
