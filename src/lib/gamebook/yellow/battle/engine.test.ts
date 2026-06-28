import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn, resolveTurnPvp, chooseEnemyAction, type BattleState } from "./engine"
import { Rng } from "./rng"
import { createMonInstance } from "./factory"
import { applyEvolution } from "./evolution"
import { getTrainer } from "../data/trainers"
import { MISS_CAPTURE_LINES } from "../data/missCaptureLines"

// Auto-joue un combat jusqu'à l'issue, de façon DÉTERMINISTE :
// - en cas de changement forcé (KO du joueur), on envoie le 1er Daemon valide ;
// - sinon on attaque toujours avec la 1re capacité.
// Garde-fou anti-boucle : 300 tours max. Renvoie l'état final + le nombre de tours.
function autoPlay(start: BattleState): { final: BattleState; turns: number } {
    let s = start
    let turns = 0
    while (s.phase !== "ended" && turns < 300) {
        if (s.enemySendOut) {
            // Fenêtre d'envoi adverse (combat de Dresseur) : on garde notre Daemon (l'ennemi entre).
            s = resolveTurn(s, { kind: "stay" })
        } else if (s.forcedSwitch === "player") {
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
        const player = [createMonInstance("cerfeuillu", 50, { moveIds: ["tranche_feuille", "tempete_verte", "coup_d_boule", "mega_sangsue"] }), createMonInstance("cailloutchi", 50)]
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
            [createMonInstance("cerfeuillu", 50, { moveIds: ["tranche_feuille", "tempete_verte", "coup_d_boule", "mega_sangsue"] }), createMonInstance("cailloutchi", 50)],
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
            [createMonInstance("cerfeuillu", 50, { moveIds: ["tranche_feuille", "tempete_verte", "coup_d_boule", "mega_sangsue"] })],
            trainerEnemyTeam("y_trainer_mia"),
            { isWild: false, seed: 7 },
        )
        const afterRun = resolveTurn(start, { kind: "run" })
        expect(afterRun.phase).not.toBe("ended") // la fuite est refusée
        const afterBall = resolveTurn(start, { kind: "ball", itemId: "nexus_ball" })
        expect(afterBall.outcome).not.toBe("caught") // la capture est refusée
    })

    it("#2 — la fuite suit fleeChance : 100% file, 0% échoue et l'ennemi prend le tour", () => {
        const sure = createBattle([createMonInstance("rochison", 50, { moveIds: ["eboulis", "belier", "seisme", "lame_roche"] })], [createMonInstance("plumiot", 2)], { isWild: true, seed: 1, fleeChance: 100 })
        expect(resolveTurn(sure, { kind: "run" }).outcome).toBe("run") // 100% → on file
        const stuck = createBattle([createMonInstance("rochison", 50, { moveIds: ["eboulis", "belier", "seisme", "lame_roche"] })], [createMonInstance("plumiot", 2)], { isWild: true, seed: 1, fleeChance: 0 })
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
        const a = createMonInstance("rochison", 50, { moveIds: ["eboulis", "belier", "seisme", "lame_roche"] }) // tank : survit à tout
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
        const a = createMonInstance("rochison", 50, { moveIds: ["eboulis", "belier", "seisme", "lame_roche"] }) // tank : achève le sauvage
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
        const a = createMonInstance("cerfeuillu", 50, { moveIds: ["tranche_feuille", "tempete_verte", "coup_d_boule", "mega_sangsue"] }) // Plante : résiste à l'Eau, achève e2
        const e1 = createMonInstance("plumiot", 2); e1.currentHp = 1 // b le one-shot
        const e2 = createMonInstance("razmaree", 15)               // K.O. b, mais perd contre a
        const startExpB = b.exp, startExpA = a.exp
        const { final } = autoPlay(createBattle([b, a], [e1, e2], { isWild: false, seed: 246 }))
        expect(final.outcome).toBe("win")
        expect(final.player.team[0].currentHp).toBe(0)              // b est bien K.O.
        expect(final.player.team[0].exp).toBeGreaterThan(startExpB) // … mais a GARDÉ l'XP d'e1 (tué vivant)
        expect(final.player.team[1].exp).toBeGreaterThan(startExpA) // a (debout) touche l'XP d'e2
    })

    it("opening scripté : le boss force son move signature sur ses 2 premiers tours", () => {
        const enemy = createMonInstance("vipember", 32, { moveIds: ["lance_flammes", "pyrotechnie", "vague_mentale", "flamme_ardente"] })
        Object.assign(enemy, { openingMoves: ["pyrotechnie", "pyrotechnie"] }) // signature imposée d'entrée
        const s = createBattle([createMonInstance("cerfeuillu", 30)], [enemy], { isWild: false, seed: 7, aiLevel: "trainer" })
        const pyro = s.enemy.team[0].moves.findIndex((m) => m.moveId === "pyrotechnie") // ≠ index 0 (lance_flammes, + puissant)
        expect(chooseEnemyAction(s, new Rng(s.seed))).toMatchObject({ kind: "move", moveIndex: pyro }) // tour 1 : forcé
        expect(chooseEnemyAction(s, new Rng(s.seed))).toMatchObject({ kind: "move", moveIndex: pyro }) // tour 2 : forcé
        expect(s.enemy.team[0].openingMoves).toHaveLength(0)                                           // opening épuisé
    })

    it("Surtension (2 tours) : tour 1 charge + ralentit (-2 Vit), tour 2 libère automatiquement", () => {
        const enemy = createMonInstance("voltapanthe", 36, { moveIds: ["surtension", "fulgurance", "vive_attaque", "cage_eclair"] })
        Object.assign(enemy, { openingMoves: ["surtension"] }) // l'AS ouvre sur sa signature
        const player = createMonInstance("cerfeuillu", 60) // neutre à l'Élec, encaisse les 2 phases
        let s = createBattle([player], [enemy], { isWild: false, seed: 5, aiLevel: "trainer" })
        // Tour 1 : le joueur temporise (objet → ne touche pas l'ennemi), l'ennemi CHARGE la Surtension.
        s = resolveTurn(s, { kind: "item", itemId: "potion" })
        expect(s.enemy.team[0].chargingMove).toBe("surtension") // l'ennemi est verrouillé en charge
        expect(s.player.team[0].stages.spe).toBe(-2)            // -2 Vitesse appliqué dès la phase 1
        // Tour 2 : l'ennemi est forcé de LIBÉRER sa décharge, quoi que fasse le joueur.
        s = resolveTurn(s, { kind: "item", itemId: "potion" })
        expect(s.enemy.team[0].chargingMove).toBeUndefined()    // déchargé → plus en charge
    })

    it("Surtension : rappeler le LANCEUR annule la charge (switch tactique)", () => {
        const a = createMonInstance("voltapanthe", 40, { moveIds: ["surtension", "fulgurance", "vive_attaque", "cage_eclair"] })
        const b = createMonInstance("rochison", 40)
        let s = createBattle([a, b], [createMonInstance("rochison", 5)], { isWild: false, seed: 9 })
        s = resolveTurn(s, { kind: "move", moveIndex: 0 })   // a CHARGE la surtension
        expect(s.player.team[0].chargingMove).toBe("surtension")
        s = resolveTurn(s, { kind: "switch", teamIndex: 1 }) // on RAPPELLE a → la charge s'annule
        expect(s.player.team[0].chargingMove).toBeUndefined()
        expect(s.player.activeIndex).toBe(1)                  // b est bien entré
    })

    it("#10 — combat de Dresseur : KO adverse → fenêtre d'envoi, le Daemon entrant n'agit PAS", () => {
        const a = createMonInstance("rochison", 50, { moveIds: ["eboulis", "belier", "seisme", "lame_roche"] })               // rapide vs plumiot L5, achève e1
        const e1 = createMonInstance("plumiot", 5); e1.currentHp = 1
        const e2 = createMonInstance("razmaree", 50)              // frapperait FORT (eau ×4) s'il agissait
        let s = createBattle([a], [e1, e2], { isWild: false, seed: 321 })
        const hpBefore = s.player.team[0].currentHp

        // 1) a KO e1 → l'ennemi ANNONCE son envoi mais N'entre PAS encore (flow Game Boy).
        s = resolveTurn(s, { kind: "move", moveIndex: 0 })
        expect(s.enemySendOut).not.toBeNull()                                // fenêtre d'envoi ouverte
        expect(s.enemy.team[s.enemy.activeIndex].speciesId).toBe("plumiot")  // e2 PAS encore envoyé
        expect(s.player.team[0].currentHp).toBe(hpBefore)                    // aucun dégât pendant l'annonce

        // 2) le joueur décide de RESTER → e2 entre enfin, mais ne porte AUCUN coup ce tour.
        s = resolveTurn(s, { kind: "stay" })
        expect(s.enemySendOut).toBeNull()                                    // fenêtre refermée
        expect(s.enemy.team[s.enemy.activeIndex].speciesId).toBe("razmaree") // e2 bien envoyé
        expect(s.player.team[0].currentHp).toBe(hpBefore)                    // toujours aucun dégât (pas un tour)
    })

    it("#3 — partage dégressif : 1er/2e 100%, 3e 60% (mêmes ennemis affrontés)", () => {
        // A, B, C affrontent tous le MÊME ennemi (via switchs) puis A l'achève. Tous survivent.
        const A = createMonInstance("rochison", 50, { moveIds: ["eboulis", "belier", "seisme", "lame_roche"] }), B = createMonInstance("rochison", 50, { moveIds: ["eboulis", "belier", "seisme", "lame_roche"] }), C = createMonInstance("rochison", 50, { moveIds: ["eboulis", "belier", "seisme", "lame_roche"] })
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
        const a = createMonInstance("rochison", 50, { moveIds: ["eboulis", "belier", "seisme", "lame_roche"] })
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

describe("fenêtre d'envoi adverse — combat de Dresseur (flow Game Boy)", () => {
    it("le joueur peut CHANGER de Daemon avant l'entrée adverse (sans coup offert)", () => {
        const a = createMonInstance("rochison", 50, { moveIds: ["eboulis", "belier", "seisme", "lame_roche"] })             // achève e1
        const b = createMonInstance("cerfeuillu", 50, { moveIds: ["tranche_feuille", "tempete_verte", "coup_d_boule", "mega_sangsue"] })           // remplaçant anticipé
        const e1 = createMonInstance("plumiot", 5); e1.currentHp = 1
        const e2 = createMonInstance("razmaree", 50)
        let s = createBattle([a, b], [e1, e2], { isWild: false, seed: 321 })
        const bHpBefore = b.currentHp

        s = resolveTurn(s, { kind: "move", moveIndex: 0 })      // a KO e1 → fenêtre d'envoi ouverte
        expect(s.enemySendOut).not.toBeNull()

        // Le joueur anticipe : il change pour b AVANT que l'ennemi entre.
        s = resolveTurn(s, { kind: "switch", teamIndex: 1 })
        expect(s.enemySendOut).toBeNull()                                    // fenêtre refermée
        expect(s.player.activeIndex).toBe(1)                                 // b est entré
        expect(s.enemy.team[s.enemy.activeIndex].speciesId).toBe("razmaree") // e2 aussi
        expect(s.player.team[1].currentHp).toBe(bHpBefore)                   // face-à-face d'envois : b ne prend aucun coup
    })

    it("combat SAUVAGE : aucune fenêtre d'envoi (KO = fin du combat)", () => {
        let s = createBattle([createMonInstance("rochison", 50, { moveIds: ["eboulis", "belier", "seisme", "lame_roche"] })], [createMonInstance("plumiot", 2)], { isWild: true, seed: 1 })
        let guard = 0
        while (s.phase !== "ended" && guard < 30) { s = resolveTurn(s, { kind: "move", moveIndex: 0 }); guard++ }
        expect(s.enemySendOut).toBeNull() // jamais de fenêtre en sauvage
        expect(s.outcome).toBe("win")
    })

    it("Dresseur à 1 seul Daemon : KO = victoire directe, sans fenêtre", () => {
        let s = createBattle([createMonInstance("rochison", 50, { moveIds: ["eboulis", "belier", "seisme", "lame_roche"] })], [createMonInstance("plumiot", 2)], { isWild: false, seed: 2 })
        let guard = 0
        while (s.phase !== "ended" && guard < 30) {
            s = s.enemySendOut ? resolveTurn(s, { kind: "stay" }) : resolveTurn(s, { kind: "move", moveIndex: 0 })
            guard++
        }
        expect(s.outcome).toBe("win")
        expect(s.enemySendOut).toBeNull()
    })
})

describe("PvP — changement après KO : CHAQUE joueur choisit (pas d'envoi auto)", () => {
    // Régression du bug "en PvP, parfois le Daemon suivant est envoyé automatiquement" : c'était
    // une asymétrie player/enemy dans checkFaints (le camp canonique "enemy" = rôle B était
    // auto-switché alors que "player" = rôle A obtenait un forcedSwitch). Les 2 camps sont des
    // joueurs → les 2 doivent armer un changement FORCÉ (et NON un auto-switch).

    it("KO du camp 'enemy' (rôle B) → forcedSwitch='enemy', l'actif K.O. reste en place (pas d'auto-switch)", () => {
        const player = [createMonInstance("rochison", 50, { moveIds: ["eboulis", "belier", "seisme", "lame_roche"] })]
        const e1 = createMonInstance("plumiot", 2); e1.currentHp = 1   // sera mis K.O. ce tour
        const e2 = createMonInstance("razmaree", 50)                   // remplaçant vivant
        let s = createBattle(player, [e1, e2], { isWild: false, seed: 4242, pvp: true })

        s = resolveTurnPvp(s, { kind: "move", moveIndex: 0 }, { kind: "move", moveIndex: 0 })

        expect(s.phase).not.toBe("ended")          // il reste un Daemon vivant côté enemy
        expect(s.forcedSwitch).toBe("enemy")       // ← LE FIX : le rôle B doit CHOISIR
        expect(s.enemy.activeIndex).toBe(0)         // l'actif K.O. n'a PAS été remplacé automatiquement
        expect(s.player.team[0].currentHp).toBeGreaterThan(0) // single-KO (player intact)

        // Le rôle B choisit ensuite son remplaçant → il entre.
        s = resolveTurnPvp(s, { kind: "move", moveIndex: 0 }, { kind: "switch", teamIndex: 1 })
        expect(s.forcedSwitch).toBeNull()
        expect(s.enemy.activeIndex).toBe(1)
    })

    it("KO du camp 'player' (rôle A) → forcedSwitch='player' (symétrique)", () => {
        const p1 = createMonInstance("plumiot", 2); p1.currentHp = 1
        const p2 = createMonInstance("rochison", 50)
        const enemy = [createMonInstance("razmaree", 50)] // moves par défaut (slot 0 = attaque offensive)
        let s = createBattle([p1, p2], enemy, { isWild: false, seed: 4243, pvp: true })

        s = resolveTurnPvp(s, { kind: "move", moveIndex: 0 }, { kind: "move", moveIndex: 0 })

        expect(s.phase).not.toBe("ended")
        expect(s.forcedSwitch).toBe("player")
        expect(s.player.activeIndex).toBe(0)        // l'actif K.O. attend le choix (pas d'auto-switch)
        expect(s.enemy.team[0].currentHp).toBeGreaterThan(0)
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
        const s0 = createBattle([createMonInstance("cerfeuillu", 50, { moveIds: ["tranche_feuille", "tempete_verte", "coup_d_boule", "mega_sangsue"] })], [createMonInstance("braisille", 8)], { isWild: false, seed: 9, enemyEnergyCap: 0, aiLevel: "ace" })
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
        const s0 = createBattle([createMonInstance("rochison", 50, { moveIds: ["eboulis", "belier", "seisme", "lame_roche"] })], [createMonInstance("plumiot", 2)], { isWild: true, seed: 1 })
        expect(s0.player.team[s0.player.activeIndex].stages.atk).toBe(0)
        const s1 = resolveTurn(s0, { kind: "item", itemId: "x_attaque" })
        expect(s1.player.team[s1.player.activeIndex].stages.atk).toBe(1)
        const s2 = resolveTurn(s1, { kind: "item", itemId: "x_special" })
        expect(s2.player.team[s2.player.activeIndex].stages.spc).toBe(1)
    })

    it("un anti-statut soigne le bon statut", () => {
        const s0 = createBattle([createMonInstance("rochison", 50, { moveIds: ["eboulis", "belier", "seisme", "lame_roche"] })], [createMonInstance("plumiot", 2)], { isWild: true, seed: 1 })
        s0.player.team[s0.player.activeIndex].status = "PARALYSIS"
        const s1 = resolveTurn(s0, { kind: "item", itemId: "anti_para" })
        expect(s1.player.team[s1.player.activeIndex].status).toBe("NONE")
    })

    it("Total Soin soigne n'importe quel statut", () => {
        const s0 = createBattle([createMonInstance("rochison", 50, { moveIds: ["eboulis", "belier", "seisme", "lame_roche"] })], [createMonInstance("plumiot", 2)], { isWild: true, seed: 1 })
        s0.player.team[s0.player.activeIndex].status = "BURN"
        const s1 = resolveTurn(s0, { kind: "item", itemId: "total_soin" })
        expect(s1.player.team[s1.player.activeIndex].status).toBe("NONE")
    })
})

describe("capture ratée — séquence d'échec théâtral (miss + punchline)", () => {
    it("un lancer raté joue l'anim 'miss' + une punchline, PAS l'anim de réussite", () => {
        // Sauvage coriace (haut niveau, PV pleins, Ball de base) → capture quasi impossible.
        const s = createBattle([createMonInstance("rochison", 50, { moveIds: ["eboulis", "belier", "seisme", "lame_roche"] })], [createMonInstance("razmaree", 80)], { isWild: true, seed: 1 })
        const after = resolveTurn(s, { kind: "ball", itemId: "poke_ball" })
        expect(after.outcome).not.toBe("caught")
        // Anim d'ÉCHEC présente ; anim de RÉUSSITE (secousses + clic) ABSENTE.
        expect(after.events.some((e) => e.kind === "ball" && e.action === "miss")).toBe(true)
        expect(after.events.some((e) => e.kind === "ball" && e.action === "result" && e.caught === true)).toBe(false)
        expect(after.events.some((e) => e.kind === "ball" && e.action === "shake")).toBe(false)
        // Une punchline moqueuse tirée de la liste officielle.
        expect(after.events.some((e) => e.kind === "message" && MISS_CAPTURE_LINES.includes(e.text))).toBe(true)
    })

    it("une capture RÉUSSIE garde l'anim classique (result caught), sans 'miss' ni punchline", () => {
        const s = createBattle([createMonInstance("rochison", 50, { moveIds: ["eboulis", "belier", "seisme", "lame_roche"] })], [createMonInstance("plumiot", 2)], { isWild: true, seed: 1 })
        const after = resolveTurn(s, { kind: "ball", itemId: "master_ball" }) // Master = capture garantie
        expect(after.outcome).toBe("caught")
        expect(after.events.some((e) => e.kind === "ball" && e.action === "result" && e.caught === true)).toBe(true)
        expect(after.events.some((e) => e.kind === "ball" && e.action === "miss")).toBe(false)
        expect(after.events.some((e) => e.kind === "message" && MISS_CAPTURE_LINES.includes(e.text))).toBe(false)
    })

    it("la punchline d'échec est déterministe (même seed → même réplique)", () => {
        const mk = () => createBattle([createMonInstance("rochison", 50, { moveIds: ["eboulis", "belier", "seisme", "lame_roche"] })], [createMonInstance("razmaree", 80)], { isWild: true, seed: 4242 })
        const a = resolveTurn(mk(), { kind: "ball", itemId: "poke_ball" })
        const b = resolveTurn(mk(), { kind: "ball", itemId: "poke_ball" })
        const pick = (st: BattleState) => st.events.find((e) => e.kind === "message" && MISS_CAPTURE_LINES.includes(e.text))
        const la = pick(a), lb = pick(b)
        expect(la?.kind === "message" && lb?.kind === "message" && la.text === lb.text).toBe(true)
    })
})
