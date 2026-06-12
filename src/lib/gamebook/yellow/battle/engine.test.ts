import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn, type BattleState } from "./engine"
import { createMonInstance } from "./factory"
import { applyEvolution } from "./evolution"
import { getTrainer } from "../data/trainers"

// Auto-joue un combat jusqu'à l'issue, de façon DÉTERMINISTE :
// - en cas de changement forcé (KO du joueur), on envoie le 1er Daemon valide ;
// - sinon on attaque toujours avec la 1re capacité.
// Garde-fou anti-boucle : 300 tours max. Renvoie l'état final + le nombre de tours.
function autoPlay(start: BattleState): { final: BattleState; turns: number } {
    let s = start
    let turns = 0
    while (s.phase !== "ended" && turns < 300) {
        if (s.forcedSwitch === "player") {
            const idx = s.player.team.findIndex((m) => m.currentHp > 0)
            s = resolveTurn(s, { kind: "switch", teamIndex: idx })
        } else {
            s = resolveTurn(s, { kind: "move", moveIndex: 0 })
        }
        turns++
    }
    return { final: s, turns }
}

function trainerEnemyTeam(trainerId: string) {
    const t = getTrainer(trainerId)!
    return t.team.map((m) => createMonInstance(m.speciesId, m.level, { owned: false }))
}

describe("combat de dresseur — enchaînement multi-Daemon", () => {
    it("un joueur surpuissant bat les 2 Daemons du dresseur (les deux finissent K.O.)", () => {
        const player = [createMonInstance("cerfeuillu", 50), createMonInstance("cailloutchi", 50)]
        const enemy = trainerEnemyTeam("y_trainer_leo") // rongeur L5 + bulle L6
        const start = createBattle(player, enemy, { isWild: false, seed: 12345 })

        const { final, turns } = autoPlay(start)

        expect(final.phase).toBe("ended")
        expect(final.outcome).toBe("win")
        expect(turns).toBeLessThan(300)
        // L'enchaînement a bien eu lieu : TOUS les Daemons adverses sont K.O.
        expect(final.enemy.team.every((m) => m.currentHp <= 0)).toBe(true)
    })

    it("est parfaitement déterministe pour une même seed", () => {
        const mk = () => createBattle(
            [createMonInstance("cerfeuillu", 50), createMonInstance("cailloutchi", 50)],
            trainerEnemyTeam("y_trainer_leo"),
            { isWild: false, seed: 999 },
        )
        const a = autoPlay(mk())
        const b = autoPlay(mk())
        expect(a.turns).toBe(b.turns)
        expect(a.final.outcome).toBe(b.final.outcome)
    })

    it("on ne peut ni fuir ni capturer un combat de dresseur", () => {
        const start = createBattle(
            [createMonInstance("cerfeuillu", 50)],
            trainerEnemyTeam("y_trainer_mia"),
            { isWild: false, seed: 7 },
        )
        const afterRun = resolveTurn(start, { kind: "run" })
        expect(afterRun.phase).not.toBe("ended") // la fuite est refusée
        const afterBall = resolveTurn(start, { kind: "ball", itemId: "nexus_ball" })
        expect(afterBall.outcome).not.toBe("caught") // la capture est refusée
    })

    it("#2 — la fuite suit fleeChance : 100% file, 0% échoue et l'ennemi prend le tour", () => {
        const sure = createBattle([createMonInstance("rochison", 50)], [createMonInstance("plumiot", 2)], { isWild: true, seed: 1, fleeChance: 100 })
        expect(resolveTurn(sure, { kind: "run" }).outcome).toBe("run") // 100% → on file
        const stuck = createBattle([createMonInstance("rochison", 50)], [createMonInstance("plumiot", 2)], { isWild: true, seed: 1, fleeChance: 0 })
        const after = resolveTurn(stuck, { kind: "run" })
        expect(after.outcome).not.toBe("run")  // 0% → fuite refusée
        expect(after.phase).not.toBe("ended")  // … toujours en combat (l'ennemi a joué)
    })

    it("un objet de soin restaure des PV et consomme le tour", () => {
        const p = createMonInstance("rochison", 30) // énorme Défense → l'ennemi tape pour ~rien
        p.currentHp = 10
        const start = createBattle([p], [createMonInstance("plumiot", 2)], { isWild: true, seed: 5 })
        const after = resolveTurn(start, { kind: "item", itemId: "potion" })
        const mon = after.player.team[after.player.activeIndex]
        expect(mon.currentHp).toBeGreaterThan(10) // +20 PV (moins le coup ennemi minime)
        expect(after.turn).toBe(start.turn + 1)    // le tour est bien passé
    })

    it("partage l'XP : un Daemon ayant combattu puis mis au banc gagne aussi l'XP", () => {
        const a = createMonInstance("rochison", 50) // tank : survit à tout
        const b = createMonInstance("plumiot", 5)
        const startExpB = b.exp
        let s = createBattle([a, b], [createMonInstance("plumiot", 2)], { isWild: true, seed: 77 })
        // b entre en combat (→ "participated"), puis on le renvoie au banc.
        s = resolveTurn(s, { kind: "switch", teamIndex: 1 })
        s = resolveTurn(s, { kind: "switch", teamIndex: 0 })
        // a achève le sauvage.
        let guard = 0
        while (s.phase !== "ended" && guard < 50) {
            s = resolveTurn(s, { kind: "move", moveIndex: 0 })
            guard++
        }
        expect(s.outcome).toBe("win")
        // b était au banc à la fin, mais ayant participé il a touché de l'XP.
        expect(s.player.team[1].exp).toBeGreaterThan(startExpB)
    })

    it("un Daemon mis K.O. pendant le combat ne gagne AUCUN XP (même en ayant participé)", () => {
        const a = createMonInstance("rochison", 50) // tank : achève le sauvage
        const b = createMonInstance("plumiot", 5)
        b.currentHp = 1 // sera K.O. au premier coup encaissé
        const startExpB = b.exp
        let s = createBattle([a, b], [createMonInstance("plumiot", 6)], { isWild: true, seed: 123 })
        // b entre en combat (→ participe) puis se fait K.O. par le sauvage.
        s = resolveTurn(s, { kind: "switch", teamIndex: 1 })
        if (s.forcedSwitch === "player") s = resolveTurn(s, { kind: "switch", teamIndex: 0 })
        let guard = 0
        while (s.phase !== "ended" && guard < 50) { s = resolveTurn(s, { kind: "move", moveIndex: 0 }); guard++ }
        expect(s.outcome).toBe("win")
        expect(s.player.team[1].currentHp).toBe(0)   // b est bien K.O.
        expect(s.player.team[1].exp).toBe(startExpB) // … et n'a gagné AUCUN XP
    })

    it("#6 — un Daemon GARDE l'XP gagnée AVANT d'être KO, mais rien après sa chute", () => {
        // b (lead) achève l'ennemi #1 alors qu'il est DEBOUT → il garde cette XP. Puis il se fait
        // K.O. par l'ennemi #2 → il ne touche RIEN pour #2. a (debout) achève #2 et prend son XP.
        const b = createMonInstance("plumiot", 5)   // lead fragile mais rapide : tue e1 vivant
        const a = createMonInstance("cerfeuillu", 50) // Plante : résiste à l'Eau, achève e2
        const e1 = createMonInstance("plumiot", 2); e1.currentHp = 1 // b le one-shot
        const e2 = createMonInstance("razmaree", 15)               // K.O. b, mais perd contre a
        const startExpB = b.exp, startExpA = a.exp
        const { final } = autoPlay(createBattle([b, a], [e1, e2], { isWild: false, seed: 246 }))
        expect(final.outcome).toBe("win")
        expect(final.player.team[0].currentHp).toBe(0)              // b est bien K.O.
        expect(final.player.team[0].exp).toBeGreaterThan(startExpB) // … mais a GARDÉ l'XP d'e1 (tué vivant)
        expect(final.player.team[1].exp).toBeGreaterThan(startExpA) // a (debout) touche l'XP d'e2
    })

    it("#10 — le Daemon ennemi envoyé après un K.O. n'agit PAS le tour même", () => {
        const a = createMonInstance("rochison", 50)               // rapide vs plumiot L5, achève e1
        const e1 = createMonInstance("plumiot", 5); e1.currentHp = 1
        const e2 = createMonInstance("razmaree", 50)              // frapperait FORT (eau ×4) s'il agissait
        let s = createBattle([a], [e1, e2], { isWild: false, seed: 321 })
        const hpBefore = s.player.team[0].currentHp
        s = resolveTurn(s, { kind: "move", moveIndex: 0 })        // a KO e1 → e2 entre…
        expect(s.enemy.team[s.enemy.activeIndex].speciesId).toBe("razmaree") // e2 bien envoyé
        expect(s.player.team[0].currentHp).toBe(hpBefore)        // … mais a ne prend AUCUN dégât ce tour
    })

    it("#3 — partage dégressif : 1er/2e 100%, 3e 60% (mêmes ennemis affrontés)", () => {
        // A, B, C affrontent tous le MÊME ennemi (via switchs) puis A l'achève. Tous survivent.
        const A = createMonInstance("rochison", 50), B = createMonInstance("rochison", 50), C = createMonInstance("rochison", 50)
        const fA = A.exp, fC = C.exp // même espèce/niveau → même plancher d'XP
        let s = createBattle([A, B, C], [createMonInstance("plumiot", 2)], { isWild: true, seed: 50 })
        s = resolveTurn(s, { kind: "switch", teamIndex: 1 }) // B participe (rang 1)
        s = resolveTurn(s, { kind: "switch", teamIndex: 2 }) // C participe (rang 2)
        let guard = 0
        while (s.phase !== "ended" && guard < 30) { s = resolveTurn(s, { kind: "move", moveIndex: 0 }); guard++ }
        expect(s.outcome).toBe("win")
        const gainA = s.player.team[0].exp - fA
        const gainC = s.player.team[2].exp - fC
        expect(gainA).toBeGreaterThan(0)
        expect(gainC).toBeGreaterThan(0)
        expect(gainC).toBeLessThan(gainA)                                   // le 3e touche MOINS
        expect(Math.abs(gainC - Math.round(gainA * 0.6))).toBeLessThanOrEqual(1) // ≈ 60 %
    })

    it("ne partage PAS l'XP avec un Daemon n'ayant jamais combattu", () => {
        const a = createMonInstance("rochison", 50)
        const b = createMonInstance("plumiot", 5) // reste au banc tout le combat
        const startExpB = b.exp
        let s = createBattle([a, b], [createMonInstance("plumiot", 2)], { isWild: true, seed: 78 })
        let guard = 0
        while (s.phase !== "ended" && guard < 50) {
            s = resolveTurn(s, { kind: "move", moveIndex: 0 })
            guard++
        }
        expect(s.outcome).toBe("win")
        expect(s.player.team[1].exp).toBe(startExpB) // jamais envoyé → aucune XP
    })

    it("un Daemon faible et seul perd contre le dresseur", () => {
        const start = createBattle(
            [createMonInstance("cornaissant", 2)],
            trainerEnemyTeam("y_trainer_mia"), // piafeu L7 + galet L7
            { isWild: false, seed: 4242 },
        )
        const { final } = autoPlay(start)
        expect(final.phase).toBe("ended")
        expect(final.outcome).toBe("lose")
    })
})

describe("budget d'énergie de l'ennemi (ACE)", () => {
    it("sans cap : enemyEnergy = null (solo inchangé)", () => {
        const s = createBattle([createMonInstance("cerfeuillu", 30)], [createMonInstance("razmaree", 30)], { isWild: false, seed: 1 })
        expect(s.enemyEnergy).toBeNull()
    })

    it("avec cap : l'ennemi dépense de l'énergie, jamais au-delà du cap", () => {
        // Ennemi costaud (attaque au moins une fois) vs joueur faible.
        const s0 = createBattle([createMonInstance("cornaissant", 5)], [createMonInstance("razmaree", 40)], { isWild: false, seed: 3, enemyEnergyCap: 1000, aiLevel: "ace" })
        expect(s0.enemyEnergy).toEqual({ spent: 0, cap: 1000 })
        const { final } = autoPlay(s0)
        expect(final.enemyEnergy!.spent).toBeGreaterThan(0)      // il a bien payé son attaque
        expect(final.enemyEnergy!.spent).toBeLessThanOrEqual(1000) // jamais au-delà du budget
    })

    it("cap 0 : l'ennemi ne peut rien payer → Charge Désespérée, dépense reste 0", () => {
        const s0 = createBattle([createMonInstance("cerfeuillu", 50)], [createMonInstance("braisille", 8)], { isWild: false, seed: 9, enemyEnergyCap: 0, aiLevel: "ace" })
        const { final } = autoPlay(s0)
        expect(final.phase).toBe("ended")
        expect(final.enemyEnergy!.spent).toBe(0) // toujours à sec → aucune attaque payante
    })
})

describe("évolution — apprentissage des attaques du nouveau stade", () => {
    it("un Daemon qui évolue récupère les attaques 'niv 1' de sa forme évoluée", () => {
        const mon = createMonInstance("ruffiant", 15)
        expect(mon.moves.some((m) => m.moveId === "morsure")).toBe(false) // Ruffiant ne l'a pas
        applyEvolution(mon, "formiguer")
        expect(mon.speciesId).toBe("formiguer")
        const aMorsure = mon.moves.some((m) => m.moveId === "morsure") || (mon.pendingMoves ?? []).includes("morsure")
        expect(aMorsure).toBe(true) // Morsure (niv 1 de Formiguer) est bien acquise
    })
})

describe("objets de combat (X / anti-statut)", () => {
    it("un objet X augmente le palier de stat du Daemon actif (+1)", () => {
        const s0 = createBattle([createMonInstance("rochison", 50)], [createMonInstance("plumiot", 2)], { isWild: true, seed: 1 })
        expect(s0.player.team[s0.player.activeIndex].stages.atk).toBe(0)
        const s1 = resolveTurn(s0, { kind: "item", itemId: "x_attaque" })
        expect(s1.player.team[s1.player.activeIndex].stages.atk).toBe(1)
        const s2 = resolveTurn(s1, { kind: "item", itemId: "x_special" })
        expect(s2.player.team[s2.player.activeIndex].stages.spc).toBe(1)
    })

    it("un anti-statut soigne le bon statut", () => {
        const s0 = createBattle([createMonInstance("rochison", 50)], [createMonInstance("plumiot", 2)], { isWild: true, seed: 1 })
        s0.player.team[s0.player.activeIndex].status = "PARALYSIS"
        const s1 = resolveTurn(s0, { kind: "item", itemId: "anti_para" })
        expect(s1.player.team[s1.player.activeIndex].status).toBe("NONE")
    })

    it("Total Soin soigne n'importe quel statut", () => {
        const s0 = createBattle([createMonInstance("rochison", 50)], [createMonInstance("plumiot", 2)], { isWild: true, seed: 1 })
        s0.player.team[s0.player.activeIndex].status = "BURN"
        const s1 = resolveTurn(s0, { kind: "item", itemId: "total_soin" })
        expect(s1.player.team[s1.player.activeIndex].status).toBe("NONE")
    })
})
