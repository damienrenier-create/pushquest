import { describe, it, expect } from "vitest"
import {
    attackCost, QUOTA_STD, LEVEL_STD, MAX_COST,
    EXTENDED_LEVEL_CEIL, EXTENDED_MAX_COST, playerAttackQuota,
} from "./combatCostConfig"
import { getMove } from "./moves"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// VŒU DU GÉNIE — « REMPLIS MA JAUGE » (Laura)
//
// La contrepartie posée par Sartay : sa jauge part à ras bord, mais le prix de ses coups continue de monter
// jusqu'au niveau 80 au lieu de saturer à 60 — plafond 13 au lieu de 10. L'énergie donnée revient par les coups.
//
// Ce qui compte ici : que la courbe soit RIGOUREUSEMENT identique sous le niveau 60 (elle joue à 29-46, le vœu
// ne doit rien changer aujourd'hui), qu'elle plafonne bien à 13 et pas au-delà, et surtout que RIEN ne bouge
// pour les autres joueurs — c'est un vœu, pas un changement de règle du jeu.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

const gros = () => getMove("hydrocanon")   // puissance 110 → facteur puissance saturé
const petit = () => getMove("vive_attaque") // puissance 40

describe("courbe étendue — les bornes", () => {
    it("les constantes disent bien « jusqu'au niveau 80, plafond 13 »", () => {
        expect(EXTENDED_LEVEL_CEIL).toBe(80)
        expect(EXTENDED_MAX_COST).toBe(13)
        // 13 n'est pas un nombre arbitraire : c'est la pente prolongée jusqu'à 80.
        expect(EXTENDED_MAX_COST).toBe(Math.round(MAX_COST * EXTENDED_LEVEL_CEIL / LEVEL_STD))
    })

    it("⚠️ SOUS le niveau 60, la courbe est IDENTIQUE — le vœu ne coûte rien tout de suite", () => {
        for (const lvl of [5, 20, 29, 33, 39, 46, 55, 59]) {
            for (const mv of [gros(), petit()]) {
                expect(attackCost(mv, lvl, QUOTA_STD, undefined, true), `niv ${lvl}`)
                    .toBe(attackCost(mv, lvl, QUOTA_STD, undefined, false))
            }
        }
    })

    it("au niveau 60 pile, les deux courbes se touchent encore", () => {
        expect(attackCost(gros(), 60, QUOTA_STD, undefined, true)).toBe(attackCost(gros(), 60, QUOTA_STD, undefined, false))
        expect(attackCost(gros(), 60, QUOTA_STD, undefined, false)).toBe(MAX_COST)
    })

    it("au-dessus de 60, elle monte — et atteint 13 au niveau 80", () => {
        const c = (l: number) => attackCost(gros(), l, QUOTA_STD, undefined, true)
        expect(c(65)).toBe(11)
        expect(c(70)).toBe(12)
        expect(c(80)).toBe(13)
        // strictement croissante entre 60 et 80
        for (let l = 61; l <= 80; l++) expect(c(l)).toBeGreaterThanOrEqual(c(l - 1))
    })

    it("⚠️ au-delà de 80, plus rien ne monte : 13 est un VRAI plafond", () => {
        for (const l of [81, 85, 90, 95, 100]) {
            expect(attackCost(gros(), l, QUOTA_STD, undefined, true), `niv ${l}`).toBe(EXTENDED_MAX_COST)
        }
    })

    it("sans le vœu, le plafond reste 10 quel que soit le niveau", () => {
        for (const l of [60, 70, 80, 100]) {
            expect(attackCost(gros(), l, QUOTA_STD, undefined, false), `niv ${l}`).toBe(MAX_COST)
        }
    })
})

describe("courbe étendue — le cas réel de Laura (mode fun, 3 badges)", () => {
    // En mode fun le « quota » vient des BADGES, pas des reps du jour : 3 badges → 120, soit un facteur 0,8.
    const quotaLaura = playerAttackQuota(3)

    it("son quota est bien 120, pas l'étalon", () => {
        expect(quotaLaura).toBe(120)
        expect(quotaLaura).toBeLessThan(QUOTA_STD)
    })

    it("son équipe actuelle (29-46) ne paie pas un rep de plus", () => {
        for (const lvl of [29, 32, 33, 34, 39, 46]) {
            for (const mv of [gros(), petit()]) {
                expect(attackCost(mv, lvl, quotaLaura, undefined, true), `niv ${lvl}`)
                    .toBe(attackCost(mv, lvl, quotaLaura, undefined, false))
            }
        }
    })

    it("à 80, son plus gros coup passe de 8 à 11 — le petit quota la protège du plafond 13", () => {
        expect(attackCost(gros(), 80, quotaLaura, undefined, false)).toBe(8)
        expect(attackCost(gros(), 80, quotaLaura, undefined, true)).toBe(11)
        // 13 ne s'atteint qu'avec le quota PLEIN : un joueur à petit quota reste ménagé, comme partout ailleurs.
        expect(attackCost(gros(), 80, quotaLaura, undefined, true)).toBeLessThan(EXTENDED_MAX_COST)
    })

    it("plus elle gagne de badges, plus la note monte — la contrepartie suit sa progression", () => {
        const a3 = attackCost(gros(), 80, playerAttackQuota(3), undefined, true)
        const a5 = attackCost(gros(), 80, playerAttackQuota(5), undefined, true)
        expect(a5).toBeGreaterThan(a3)
        expect(a5).toBe(EXTENDED_MAX_COST) // 4+ badges → quota plein → plafond atteint
    })
})

describe("courbe étendue — ce qu'elle ne doit PAS casser", () => {
    it("le plancher reste 1 : aucune attaque n'est jamais gratuite", () => {
        expect(attackCost(petit(), 1, 1, undefined, true)).toBeGreaterThanOrEqual(1)
        expect(attackCost(null, 100, QUOTA_STD, undefined, true)).toBe(1)
    })

    it("les statuts restent bornés par leur propre palier, le vœu ne les déplafonne pas", () => {
        const dodo = getMove("spores_dodo")
        if (dodo) {
            const cp = dodo.costPower ?? 30
            // Un statut ne peut pas dépasser son palier d'impact, même sur la courbe étendue au niveau 100.
            expect(attackCost(dodo, 100, QUOTA_STD, undefined, true)).toBeLessThanOrEqual(Math.round(MAX_COST * (cp / 100) * (EXTENDED_LEVEL_CEIL / LEVEL_STD)))
        }
    })

    it("par défaut (paramètre omis), c'est la courbe D'ORIGINE — personne d'autre n'est touché", () => {
        for (const l of [60, 80, 100]) {
            expect(attackCost(gros(), l, QUOTA_STD)).toBe(attackCost(gros(), l, QUOTA_STD, undefined, false))
            expect(attackCost(gros(), l, QUOTA_STD)).toBe(MAX_COST)
        }
    })
})
