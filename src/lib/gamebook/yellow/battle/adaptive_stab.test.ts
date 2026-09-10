import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn, type BattleState } from "./engine"
import { createMonInstance } from "./factory"

// CT-trophée « Apothéose » (flag adaptiveStab) : l'attaque prend le TYPE PRIMAIRE du Daemon (types[0] →
// STAB garanti + efficacité de ce type) et la CATÉGORIE de sa MEILLEURE stat offensive (physique si atk ≥ spc).
// LOUPYRE est l'exemple canonique : mono-FEU, atk 110 ≫ spc 72 ("sweeper physique") → ses STAB Feu
// (spéciaux) gaspillent son Attaque ; Apothéose lui fait enfin taper du FEU au PHYSIQUE.
//
// RÈGLE BI-TYPE (décision Sartay 10/09) : c'est TOUJOURS types[0], jamais « le type dont la catégorie
// naturelle colle ». Pour une FUSION, types[0] = le type hérité du parent TÊTE → une fusion POISON/PSY à
// grosse Spéciale envoie du POISON *en spécial*. Conséquence ASSUMÉE : le type primaire peut être ×0
// contre certaines cibles (ex. Gékroc SOL/ELEC → SOL, donc ×0 sur un VOL) — c'est le prix de l'identité.

/** Messages (texte) émis pendant un tour. */
function messages(s: BattleState): string[] {
    return s.events.flatMap((e) => (e.kind === "message" ? [e.text] : []))
}

/** Messages d'un tour où le Daemon joueur utilise `moveId` (slot 0) contre une cible sauvage. */
function turnMessages(attackerId: string, atkLvl: number, moveId: string, defenderId: string, defLvl: number): string[] {
    const s0 = createBattle(
        [createMonInstance(attackerId, atkLvl, { moveIds: [moveId] })],
        [createMonInstance(defenderId, defLvl)],
        { isWild: true, seed: 5 },
    )
    return messages(resolveTurn(s0, { kind: "move", moveIndex: 0 }))
}

/** Dégâts infligés à la cible quand le joueur lance `moveId` (slot 0). */
function enemyDamage(attackerId: string, atkLvl: number, moveId: string, defenderId: string, defLvl: number, seed: number): number {
    const s0 = createBattle(
        [createMonInstance(attackerId, atkLvl, { moveIds: [moveId] })],
        [createMonInstance(defenderId, defLvl)],
        { isWild: true, seed },
    )
    const before = s0.enemy.team[s0.enemy.activeIndex].currentHp
    const s1 = resolveTurn(s0, { kind: "move", moveIndex: 0 })
    const after = s1.enemy.team[s1.enemy.activeIndex].currentHp
    return before - after
}

describe("Apothéose — STAB adaptatif : le TYPE suit le Daemon", () => {
    it("est de type FEU pour Loupyre → SUPER EFFICACE contre un Plante", () => {
        // FEU ×2 sur PLANTE → message d'efficacité. Si le type était resté NORMAL, ce serait ×1 (aucun message).
        const msgs = turnMessages("loupyre", 80, "apotheose", "feuillichot", 20)
        expect(msgs).toContain("C'est super efficace !")
    })

    it("est de type FEU pour Loupyre → PEU EFFICACE contre un Eau", () => {
        // FEU ×0.5 sur EAU → message « pas très efficace ». NORMAL serait ×1 (aucun message) → distingue bien.
        const msgs = turnMessages("loupyre", 80, "apotheose", "gouttiny", 20)
        expect(msgs).toContain("Ce n'est pas très efficace…")
    })
})

describe("Apothéose — BI-TYPE : c'est le type PRIMAIRE (types[0]), pas celui qui colle à la catégorie", () => {
    it("Gékroc (SOL/ELEC, spc 115 > atk 55) → SOL en spécial, PAS Élec", () => {
        // Discriminant fort contre Mottoche (ROCHE/SOL) : SOL ×2·×1 = ×2 (super efficace) tandis que
        // l'ancienne règle aurait choisi ELEC (seul type de catégorie SPÉCIALE) → ELEC ×1·×0 = ×0 (aucun effet).
        const msgs = turnMessages("gekroc", 50, "apotheose", "mottoche", 15)
        expect(msgs).toContain("C'est super efficace !")
        expect(enemyDamage("gekroc", 50, "apotheose", "mottoche", 15, 7)).toBeGreaterThan(0)
    })

    it("Magnetor (FEU/METAL, sweeper physique) → FEU en physique, PAS Métal", () => {
        // Contre un Plante : FEU ×2 (super efficace) vs METAL ×0.5 (peu efficace) → sépare nettement
        // la nouvelle règle (types[0] = FEU) de l'ancienne (METAL, seul type de catégorie PHYSIQUE).
        const msgs = turnMessages("magnetor", 60, "apotheose", "feuillichot", 20)
        expect(msgs).toContain("C'est super efficace !")
    })

    it("CONSÉQUENCE ASSUMÉE : un type primaire ×0 rend Apothéose inoffensive (Gékroc SOL vs un VOL)", () => {
        // SOL → VOL = ×0. On FIGE ce comportement : c'est le revers de la règle « toujours types[0] ».
        expect(enemyDamage("gekroc", 50, "apotheose", "piouflot", 15, 7)).toBe(0)
    })
})

describe("Apothéose — STAB adaptatif : la CATÉGORIE suit la meilleure stat offensive", () => {
    it("frappe au PHYSIQUE pour Loupyre (atk 110 ≫ spc 72) : Apothéose > Lance-Flammes à armes égales", () => {
        // Cible = Loupyre miroir → Défense == Spéciale (base 72 == 72) : les dénominateurs s'annulent.
        // Même seed → même crit / même facteur aléatoire / même STAB (FEU) / même efficacité (FEU vs FEU ×0.5).
        // Reste : Apothéose (85 × ATQ110) vs Lance-Flammes (95 × SPC72). atk ≫ spc → Apothéose strictement
        // supérieure. Si la catégorie n'avait PAS basculé en physique, ce serait 85×SPC < 95×SPC → l'inverse.
        const SEED = 11
        const apoth = enemyDamage("loupyre", 80, "apotheose", "loupyre", 60, SEED)
        const flamme = enemyDamage("loupyre", 80, "lance_flammes", "loupyre", 60, SEED)
        expect(apoth).toBeGreaterThan(0)
        expect(flamme).toBeGreaterThan(0)
        expect(apoth).toBeGreaterThan(flamme)
    })
})
