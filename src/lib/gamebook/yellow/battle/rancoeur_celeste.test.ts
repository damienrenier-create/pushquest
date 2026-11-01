import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn, resolveTurnPvp, chooseEnemyAction, maxHpOf, type BattleState, type BattleEvent } from "./engine"
import { createMonInstance } from "./factory"
import { Rng } from "./rng"
import { getMove } from "../data/moves"
import { moveCategoryOf } from "./typeChart"
import { VANISH_LINES, targetsFoe } from "./vanish"
import { MOVES } from "../data/moves"

// RANCŒUR CÉLESTE (signature de Namizeus, Sartay 01/11/2026) + RAITEI (Élec PHYSIQUE 150/90).
// Lancement 90 % (jet plat, sur soi) → disparu 1 à 5 tours : intouchable (seul un coup sûr le touche), n'agit qu'une fois sur
// deux, puis tous ses PV + sommeil (même tirage qu'un sommeil infligé). Joueur : sans limite. Ordinateur : jamais 3 fois d'affilée.

const V = (m: { vanishTurns?: number }) => m.vanishTurns ?? 0
const P = (s: BattleState) => s.player.team[s.player.activeIndex]
const E = (s: BattleState) => s.enemy.team[s.enemy.activeIndex]
const msgs = (s: BattleState) => s.events.filter((e) => e.kind === "message").map((e) => (e as { text: string }).text)
const has = (s: BattleState, text: string) => msgs(s).includes(text)
const nami = (moves: string[], lv = 60, owned = true) => createMonInstance("namizeus", lv, { owned, ivs: 8, moveIds: moves })
const wall = (moves = ["mur_de_fer"]) => createMonInstance("rochison", 60, { ivs: 8, moveIds: moves })
const NZ = "Namizeus"
/** Lance Rancœur Céleste (slot 0) jusqu'à réussite ; `min` = nombre minimal de tours cachés restants voulu. */
function vanish(s: BattleState, min = 1): BattleState {
    for (let k = 0; k < 40 && V(P(s)) < min; k++) {
        s = resolveTurn(s, { kind: "move", moveIndex: 0 })
        if (V(P(s)) > 0 && V(P(s)) < min) { while (V(P(s)) > 0 && s.phase !== "ended") s = resolveTurn(s, { kind: "move", moveIndex: 1 }); s.player.team[0].status = "NONE" }
    }
    return s
}

describe("Rancœur Céleste — lancement", () => {
    it("90 % de réussite, jet PLAT : +6 d'esquive adverse ne change rien ; durée 1..5 (uniforme)", () => {
        let succ = 0; const dur = new Map<number, number>()
        for (let seed = 1; seed <= 1000; seed++) {
            const s0 = createBattle([nami(["rancoeur_celeste"])], [wall()], { isWild: false, seed, aiLevel: "trainer" })
            s0.enemy.team[0].stages.eva = 6
            const s = resolveTurn(s0, { kind: "move", moveIndex: 0 })
            if (V(P(s)) > 0) { succ++; dur.set(V(P(s)), (dur.get(V(P(s))) ?? 0) + 1); expect(has(s, VANISH_LINES.cast(NZ))).toBe(true) }
            else expect(has(s, VANISH_LINES.castFail(NZ))).toBe(true)
        }
        expect(succ / 1000).toBeGreaterThan(0.87); expect(succ / 1000).toBeLessThan(0.93)
        expect([...dur.keys()].sort()).toEqual([1, 2, 3, 4, 5]) // après la fin du tour de lancement : N tours cachés restent
        for (const n of dur.values()) expect(n / succ).toBeGreaterThan(0.15)
    })
    it("le lancement marche même si l'adversaire est sous terre (move sur soi)", () => {
        const s0 = createBattle([nami(["rancoeur_celeste"])], [wall()], { isWild: false, seed: 4, aiLevel: "trainer" })
        s0.enemy.team[0].semiInvuln = true
        let ok = false
        for (let seed = 1; seed <= 20 && !ok; seed++) ok = V(P(resolveTurn({ ...s0, seed }, { kind: "move", moveIndex: 0 }))) > 0
        expect(ok).toBe(true)
    })
    it("tour du lancement : si Namizeus agit en premier, l'attaque adverse de ce même tour le traverse", () => {
        let checked = 0
        for (let seed = 1; seed <= 60; seed++) {
            const s = resolveTurn(createBattle([nami(["rancoeur_celeste"])], [createMonInstance("megalithe", 60, { ivs: 8, moveIds: ["seisme"] })], { isWild: false, seed, aiLevel: "trainer" }), { kind: "move", moveIndex: 0 })
            if (V(P(s)) === 0) continue
            checked++
            expect(P(s).currentHp).toBe(maxHpOf(P(s)))
            expect(has(s, VANISH_LINES.passThrough(NZ))).toBe(true)
        }
        expect(checked).toBeGreaterThan(40)
    })
})

describe("Rancœur Céleste — intouchable", () => {
    it("Toxik, Onde Folie, Plaquage manquent un Namizeus disparu", () => {
        for (const mv of ["toxik", "onde_folie", "plaquage"]) {
            const foe = createMonInstance("aquilothan", 60, { ivs: 8, moveIds: [mv] })
            let s = vanish(createBattle([nami(["rancoeur_celeste", "mirage"])], [foe], { isWild: false, seed: 77, aiLevel: "trainer" }), 2)
            const before = { hp: P(s).currentHp, st: P(s).status }
            s = resolveTurn(s, { kind: "move", moveIndex: 1 })
            expect(P(s).currentHp, mv).toBe(before.hp)
            expect(P(s).status, mv).toBe(before.st)
            expect(P(s).volatiles.CONFUSION, mv).toBeUndefined()
            expect(has(s, VANISH_LINES.passThrough(NZ)), mv).toBe(true)
        }
    })
    it("un coup SÛR (Météores) touche quand même — vérifié sur un lanceur non-Spectre (Météores est Normal : ×0 sur Namizeus)", () => {
        const caster = createMonInstance("rochison", 60, { owned: true, ivs: 8, moveIds: ["rancoeur_celeste", "mur_de_fer"] })
        let s = vanish(createBattle([caster], [createMonInstance("aquilothan", 60, { ivs: 8, moveIds: ["meteores"] })], { isWild: false, seed: 5, aiLevel: "trainer" }), 2)
        const hp = P(s).currentHp
        s = resolveTurn(s, { kind: "move", moveIndex: 1 })
        expect(P(s).currentHp).toBeLessThan(hp)
    })
    it("la décharge d'un adversaire qui chargeait AVANT la disparition se perd (pas de verrou bloqué)", () => {
        let cases = 0
        for (let seed = 1; seed <= 120; seed++) {
            const volta = createMonInstance("voltapanthe", 60, { ivs: 8, moveIds: ["surtension", "fulgurance"] })
            Object.assign(volta, { openingMoves: ["surtension"] })
            let s = createBattle([nami(["rancoeur_celeste", "ball_ombre"])], [volta], { isWild: false, seed, aiLevel: "trainer" })
            s.player.team[0].stages.spe = -6 // Voltapanthe charge d'abord, puis Namizeus disparaît
            s = resolveTurn(s, { kind: "move", moveIndex: 0 })
            if (!E(s).chargingMove || V(P(s)) === 0) continue
            cases++
            s = resolveTurn(s, { kind: "move", moveIndex: 1 })
            expect(E(s).chargingMove).toBeUndefined()
        }
        expect(cases).toBeGreaterThan(0)
    })
})

describe("Rancœur Céleste — les attaques SUR SOI marchent contre un Daemon invisible (Sartay, 01/11/2026)", () => {
    // Adversaire disparu et INOFFENSIF (son action cachée est Mur de Fer) : rien ne vient perturber l'attaque testée.
    const hiddenFoe = (turns: number) => { const en = nami(["rancoeur_celeste", "mur_de_fer"], 60, false); Object.assign(en, { vanishTurns: turns }); return en }
    const start = (moveId: string, sp = "rochison", turns = 3) => {
        const user = createMonInstance(sp, 60, { owned: true, ivs: 8, moveIds: [moveId] })
        return createBattle([user], [hiddenFoe(turns)], { isWild: false, seed: 2, aiLevel: "trainer" })
    }
    it("Repos, Danse-Lames, Mur de Fer, Mirage, Machination, Danse du Fauve : l'effet s'applique, rien ne « traverse l'orage »", () => {
        const cases: [string, (m: ReturnType<typeof P>) => boolean][] = [
            ["repos", (m) => m.status === "SLEEP" && m.currentHp > 60],
            ["danse_lames", (m) => m.stages.atk === 2],
            ["mur_de_fer", (m) => m.stages.def === 1],
            ["mirage", (m) => m.stages.eva === 2],
            ["machination", (m) => m.stages.spc === 2],
            ["danse_fauve", (m) => m.stages.atk === 1 && m.stages.spe === 1],
        ]
        for (const [mv, ok] of cases) {
            const s0 = start(mv)
            if (mv === "repos") s0.player.team[0].currentHp = 60
            const s = resolveTurn(s0, { kind: "move", moveIndex: 0 })
            expect(ok(P(s)), mv).toBe(true)
            expect(has(s, VANISH_LINES.passThrough(NZ)), mv).toBe(false)
        }
    })
    it("Mitra-Poing : la concentration marche ; le coup, lui, manque s'il est toujours invisible (verrous levés)", () => {
        let s = resolveTurn(start("mitra_poing", "rochison", 4), { kind: "move", moveIndex: 0 })
        expect(msgs(s).some((t) => t.includes("concentre toute son énergie"))).toBe(true)
        expect(P(s).chargingMove).toBe("mitra_poing")
        expect(P(s).focusing).toBe(true)
        s = resolveTurn(s, { kind: "move", moveIndex: 0 })
        expect(has(s, VANISH_LINES.passThrough(NZ))).toBe(true)
        expect(P(s).chargingMove).toBeUndefined()
        expect(P(s).focusing).toBeUndefined()
    })
    it("Tunnel : creuser marche ; l'émergence manque une cible toujours invisible, sans rester bloqué sous terre", () => {
        let s = resolveTurn(start("tunnel", "crocavern", 4), { kind: "move", moveIndex: 0 })
        expect(P(s).semiInvuln).toBe(true)
        s = resolveTurn(s, { kind: "move", moveIndex: 0 })
        expect(has(s, VANISH_LINES.passThrough(NZ))).toBe(true)
        expect(P(s).semiInvuln).toBeUndefined()
        expect(P(s).chargingMove).toBeUndefined()
    })
    it("une attaque qui vise AUSSI la cible (Atrophie : −2 Atq pour les deux) la manque en entier", () => {
        const s = resolveTurn(start("atrophie"), { kind: "move", moveIndex: 0 })
        expect(has(s, VANISH_LINES.passThrough(NZ))).toBe(true)
        expect(P(s).stages.atk).toBe(0)
        expect(E(s).stages.atk).toBe(0)
    })
    it("classement FIGÉ de tout le jeu : 16 statuts sur soi, 3 préparations ; toute autre attaque vise l'adversaire", () => {
        const all = Object.values(MOVES)
        expect(all.filter((m) => m.power <= 0 && !targetsFoe(m, false)).map((m) => m.id).sort()).toEqual([
            "aimantation", "aromatherapie", "carapace_diamant", "cristallisation", "danse_fauve", "danse_lames", "elan", "focalisation",
            "linceul", "machination", "mirage", "mur_de_fer", "rancoeur_celeste", "repos", "reprise_ailes", "visee",
        ])
        expect(all.filter((m) => m.power > 0 && !targetsFoe(m, false)).map((m) => m.id).sort()).toEqual(["mitra_poing", "tunnel", "vol"])
        for (const m of all) if (m.power > 0) expect(targetsFoe(m, true), m.id).toBe(true) // phase 2 / attaque normale : vise l'adversaire
    })
})

describe("Rancœur Céleste — tours cachés et fin de l'effet", () => {
    it("n'agit qu'une fois sur deux ; à la fin : tous ses PV + SOMMEIL (2..9), le poison est écrasé", () => {
        let acted = 0, tried = 0, cycles = 0
        for (let seed = 1; seed <= 200; seed++) {
            let s = createBattle([nami(["rancoeur_celeste", "ball_ombre"])], [createMonInstance("megalithe", 60, { ivs: 8, moveIds: ["seisme"] })], { isWild: false, seed, aiLevel: "trainer" })
            s.player.team[0].currentHp = 150; s.player.team[0].status = "POISON"
            s = resolveTurn(s, { kind: "move", moveIndex: 0 })
            const n = V(P(s)); if (n === 0) continue
            let h = 0
            while (V(P(s)) > 0 && s.phase !== "ended") {
                s = resolveTurn(s, { kind: "move", moveIndex: 1 }); h++; tried++
                if (has(s, VANISH_LINES.reappear(NZ))) acted++
            }
            if (s.phase === "ended" || P(s).currentHp <= 0) continue
            cycles++
            expect(h).toBe(n)
            expect(P(s).currentHp).toBe(maxHpOf(P(s)))
            expect(P(s).status).toBe("SLEEP")
            expect(P(s).statusCounter).toBeGreaterThanOrEqual(2); expect(P(s).statusCounter).toBeLessThanOrEqual(9)
        }
        expect(cycles).toBeGreaterThan(50)
        expect(acted / tried).toBeGreaterThan(0.44); expect(acted / tried).toBeLessThan(0.56)
    })
    it("ordre des événements : action cachée réussie = voile levé → « surgit » → « utilise » → … → voile remis", () => {
        let seen = 0
        for (let seed = 1; seed <= 80 && seen < 5; seed++) {
            let s = vanish(createBattle([nami(["rancoeur_celeste", "ball_ombre"])], [wall()], { isWild: false, seed, aiLevel: "trainer" }), 2)
            s = resolveTurn(s, { kind: "move", moveIndex: 1 })
            const ev = s.events as BattleEvent[]
            const iOff = ev.findIndex((e) => e.kind === "vanish" && e.side === "player" && !e.hidden)
            if (iOff < 0) continue
            seen++
            const iSurgit = ev.findIndex((e) => e.kind === "message" && e.text === VANISH_LINES.reappear(NZ))
            const iUse = ev.findIndex((e) => e.kind === "message" && e.text === `${NZ} utilise Ball'Ombre !`)
            const iOn = ev.findIndex((e, k) => k > iUse && e.kind === "vanish" && e.side === "player" && e.hidden)
            expect(iOff).toBeLessThan(iSurgit); expect(iSurgit).toBeLessThan(iUse); expect(iOn).toBeGreaterThan(iUse)
        }
        expect(seen).toBeGreaterThan(0)
    })
    it("ordre des événements en fin d'effet : voile levé, réapparition, PV, soin, SOMMEIL, endormi", () => {
        let s = vanish(createBattle([nami(["rancoeur_celeste", "ball_ombre"])], [createMonInstance("megalithe", 60, { ivs: 8, moveIds: ["seisme"] })], { isWild: false, seed: 9, aiLevel: "trainer" }))
        s.player.team[0].currentHp = 40
        while (V(P(s)) > 0 && s.phase !== "ended") s = resolveTurn(s, { kind: "move", moveIndex: 1 })
        const tail = (s.events as BattleEvent[]).slice((s.events as BattleEvent[]).findIndex((e) => e.kind === "message" && e.text === VANISH_LINES.stormEnds(NZ)) - 1)
        expect(tail.map((e) => e.kind)).toEqual(["vanish", "message", "hp", "message", "status", "message"])
        expect(tail[0]).toMatchObject({ kind: "vanish", side: "player", hidden: false })
        expect(tail[4]).toMatchObject({ kind: "status", side: "player", status: "SLEEP" })
    })
    it("le poison continue de ronger un Daemon disparu ; le rappel met fin à l'effet SANS soin", () => {
        let s = vanish(createBattle([nami(["rancoeur_celeste", "ball_ombre"]), createMonInstance("leviathonn", 60, { owned: true })], [wall()], { isWild: false, seed: 5, aiLevel: "trainer" }), 3)
        s.player.team[0].status = "POISON"; s.player.team[0].currentHp = 120
        s = resolveTurn(s, { kind: "move", moveIndex: 1 })
        expect(s.player.team[0].currentHp).toBeLessThan(120)
        const hp = s.player.team[0].currentHp
        s = resolveTurn(s, { kind: "switch", teamIndex: 1 })
        expect(V(s.player.team[0])).toBe(0)
        expect(s.player.team[0].currentHp).toBe(hp)
        expect(s.player.team[0].status).toBe("POISON")
    })
    it("K.O. pendant l'effet : effet levé, le sprite revient AVANT la chute", () => {
        let s = vanish(createBattle([nami(["rancoeur_celeste", "ball_ombre"])], [wall()], { isWild: false, seed: 3, aiLevel: "trainer" }), 2)
        s.player.team[0].currentHp = 1; s.player.team[0].status = "POISON"
        s = resolveTurn(s, { kind: "move", moveIndex: 1 })
        const kinds = s.events.map((e) => e.kind as string)
        expect(s.player.team[0].currentHp).toBe(0)
        expect(V(s.player.team[0])).toBe(0)
        expect(kinds.lastIndexOf("vanish")).toBeLessThan(kinds.indexOf("faint"))
    })
    it("relancer en étant disparu : sans effet, la durée ne repart pas", () => {
        let s = vanish(createBattle([nami(["rancoeur_celeste", "ball_ombre"])], [wall()], { isWild: false, seed: 2, aiLevel: "trainer" }), 3)
        const v = V(P(s))
        s = resolveTurn(s, { kind: "move", moveIndex: 0 })
        expect(V(P(s))).toBe(v - 1)
        expect(has(s, VANISH_LINES.alreadyVanished(NZ, "Rancœur Céleste"))).toBe(true)
    })
    it("un instantané JSON en plein effet reprend à l'identique (localStorage pq_yellow_battle_v1)", () => {
        let s = vanish(createBattle([nami(["rancoeur_celeste", "ball_ombre"])], [createMonInstance("megalithe", 60, { ivs: 8, moveIds: ["seisme"] })], { isWild: false, seed: 21, aiLevel: "trainer" }), 2)
        let b = JSON.parse(JSON.stringify({ ...s, events: [] })) as BattleState
        for (let k = 0; k < 6; k++) { s = resolveTurn(s, { kind: "move", moveIndex: 1 }); b = resolveTurn(b, { kind: "move", moveIndex: 1 }) }
        expect(P(b).currentHp).toBe(P(s).currentHp); expect(V(P(b))).toBe(V(P(s))); expect(b.seed).toBe(s.seed); expect(P(b).status).toBe(P(s).status)
    })
    it("anti-impasse : le compte à rebours compte comme un progrès", () => {
        let s = vanish(createBattle([nami(["rancoeur_celeste", "mirage"])], [createMonInstance("tonytony", 60, { ivs: 8, moveIds: ["plaquage"] })], { isWild: false, seed: 12, aiLevel: "trainer" }))
        while (V(P(s)) > 0 && s.phase !== "ended") { s = resolveTurn(s, { kind: "move", moveIndex: 0 }); expect(s.stallTurns ?? 0).toBe(0) }
    })
})

describe("Rancœur Céleste — énergie", () => {
    it("action cachée ratée : lastPlayerActed reste true (rien n'est remboursé) ; l'ACE paie quand même", () => {
        let playerFails = 0, enemyFails = 0
        for (let seed = 1; seed <= 200; seed++) {
            let s = vanish(createBattle([nami(["rancoeur_celeste", "ball_ombre"])], [wall()], { isWild: false, seed, aiLevel: "trainer" }), 2)
            s = resolveTurn(s, { kind: "move", moveIndex: 1 })
            if (has(s, VANISH_LINES.reappearFail(NZ, "Ball'Ombre"))) { playerFails++; expect(s.lastPlayerActed).toBe(true) }
            const en = nami(["rancoeur_celeste", "ball_ombre"], 60, false); Object.assign(en, { openingMoves: ["rancoeur_celeste", "ball_ombre"] })
            let t = createBattle([createMonInstance("rochison", 60, { owned: true, ivs: 8, moveIds: ["mur_de_fer"] })], [en], { isWild: false, seed, aiLevel: "trainer", enemyEnergyCap: 1000 })
            t = resolveTurn(t, { kind: "move", moveIndex: 0 })
            if (V(E(t)) === 0) continue
            const spent = t.enemyEnergy!.spent
            t = resolveTurn(t, { kind: "move", moveIndex: 0 })
            if (has(t, VANISH_LINES.reappearFail(NZ, "Ball'Ombre"))) { enemyFails++; expect(t.enemyEnergy!.spent).toBeGreaterThan(spent) }
        }
        expect(playerFails).toBeGreaterThan(0); expect(enemyFails).toBeGreaterThan(0)
    })
})

describe("Rancœur Céleste — ordinateur", () => {
    it("jamais plus de 2 lancers À DÉCOUVERT d'affilée, à tous les niveaux d'IA (les actions cachées ne comptent pas)", () => {
        let maxRun = 0
        for (let seed = 1; seed <= 100; seed++) {
            // Vive-Attaque (Normal) est ×0 sur Ombrapanthe (Spectre) → le score pousse toujours Rancœur : seul le garde-fou l'arrête.
            const en = createMonInstance("namizeus", 60, { ivs: 8, moveIds: ["rancoeur_celeste", "vive_attaque"] })
            let s = createBattle([createMonInstance("ombrapanthe", 60, { owned: true, ivs: 8, moveIds: ["mur_de_fer"] })], [en], { isWild: false, seed, aiLevel: (["trainer", "hof", "wild", "ace", "elite"] as const)[seed % 5] })
            let run = 0
            for (let t = 0; t < 60 && s.phase !== "ended"; t++) {
                const hidden = V(E(s)) > 0
                s = resolveTurn(s, { kind: "move", moveIndex: 0 })
                expect(E(s).vanishCastStreak ?? 0).toBeLessThanOrEqual(2)
                if (hidden) continue
                if (msgs(s).some((x) => x.startsWith(`${NZ} utilise Rancœur Céleste`))) maxRun = Math.max(maxRun, ++run)
                else if (msgs(s).some((x) => x.startsWith(`${NZ} utilise `))) run = 0
            }
        }
        expect(maxRun).toBe(2)
    })
    it("même une ouverture scriptée ne l'enchaîne pas une 3e fois (l'entrée est consommée, l'IA décide)", () => {
        let maxRun = 0
        for (let seed = 1; seed <= 60; seed++) {
            const en = createMonInstance("namizeus", 60, { ivs: 8, moveIds: ["rancoeur_celeste", "ball_ombre"] })
            Object.assign(en, { openingMoves: Array(30).fill("rancoeur_celeste") })
            let s = createBattle([createMonInstance("megalithe", 60, { owned: true, ivs: 8, moveIds: ["mur_de_fer"] })], [en], { isWild: false, seed, aiLevel: "trainer" })
            let run = 0
            for (let t = 0; t < 40 && s.phase !== "ended"; t++) {
                const hidden = V(E(s)) > 0
                s = resolveTurn(s, { kind: "move", moveIndex: 0 })
                if (hidden) continue
                if (msgs(s).some((x) => x.startsWith(`${NZ} utilise Rancœur Céleste`))) maxRun = Math.max(maxRun, ++run)
                else if (msgs(s).some((x) => x.startsWith(`${NZ} utilise `))) run = 0
            }
        }
        expect(maxRun).toBeLessThanOrEqual(2)
    })
    it("un tour où l'ordinateur ne peut pas agir (sommeil) ne remet PAS la série à zéro", () => {
        const en = nami(["rancoeur_celeste", "ball_ombre"], 60, false); Object.assign(en, { vanishCastStreak: 2, status: "SLEEP", statusCounter: 3 })
        const s = resolveTurn(createBattle([createMonInstance("rochison", 60, { owned: true, moveIds: ["mur_de_fer"] })], [en], { isWild: false, seed: 1, aiLevel: "trainer" }), { kind: "move", moveIndex: 0 })
        expect(E(s).status).toBe("SLEEP")
        expect(E(s).vanishCastStreak).toBe(2)
    })
    it("ne la relance jamais en étant disparu", () => {
        const en = nami(["rancoeur_celeste", "ball_ombre"], 60, false); Object.assign(en, { vanishTurns: 3 })
        const s = createBattle([createMonInstance("rochison", 60, { owned: true })], [en], { isWild: false, seed: 1, aiLevel: "trainer" })
        for (let k = 0; k < 100; k++) expect(chooseEnemyAction(s, new Rng(k)).moveIndex).not.toBe(0)
    })
    it("plafond de soins (3/combat) : épuisé → l'ordinateur ne la lance plus (même scriptée) ; le soin de fin compte", () => {
        const en = nami(["rancoeur_celeste", "ball_ombre"], 60, false); Object.assign(en, { openingMoves: ["rancoeur_celeste"], healsUsed: 3 })
        const s = resolveTurn(createBattle([createMonInstance("rochison", 60, { owned: true, moveIds: ["mur_de_fer"] })], [en], { isWild: false, seed: 4, aiLevel: "trainer" }), { kind: "move", moveIndex: 0 })
        expect(V(E(s))).toBe(0)
        expect(msgs(s).some((t) => t.startsWith(`${NZ} utilise Rancœur Céleste`))).toBe(false)
        let checked = 0
        for (let seed = 1; seed <= 30; seed++) {
            const en2 = nami(["rancoeur_celeste", "ball_ombre"], 60, false); Object.assign(en2, { openingMoves: ["rancoeur_celeste"] })
            let t = createBattle([createMonInstance("rochison", 60, { owned: true, moveIds: ["mur_de_fer"] })], [en2], { isWild: false, seed, aiLevel: "trainer" })
            t = resolveTurn(t, { kind: "move", moveIndex: 0 })
            if (V(E(t)) === 0) continue
            while (V(E(t)) > 0 && t.phase !== "ended") t = resolveTurn(t, { kind: "move", moveIndex: 0 })
            if (t.phase === "ended") continue
            checked++
            expect(E(t).status).toBe("SLEEP"); expect(E(t).healsUsed).toBe(1)
        }
        expect(checked).toBeGreaterThan(10)
    })
    it("la série est celle de l'ORDINATEUR : elle passe au Daemon entrant (deux porteurs ne l'enchaînent jamais à 3)", () => {
        let checked = 0
        for (let seed = 1; seed <= 20; seed++) {
            // A a déjà lancé 2 fois d'affilée ; endormi à 1 PV, il tombe sous Ball'Ombre → B entre AVEC la série → pas de 3e lancer.
            const a = nami(["rancoeur_celeste", "ball_ombre"], 60, false); Object.assign(a, { vanishCastStreak: 2, status: "SLEEP", statusCounter: 5, currentHp: 1 })
            const b = nami(["rancoeur_celeste", "ball_ombre"], 60, false)
            const s = resolveTurn(createBattle([nami(["ball_ombre"])], [a, b], { isWild: true, seed, aiLevel: "hof" }), { kind: "move", moveIndex: 0 })
            if (s.enemy.activeIndex !== 1) continue
            checked++
            expect(s.enemy.team[0].vanishCastStreak).toBeUndefined()
            expect(E(s).vanishCastStreak).toBe(2)
            for (let k = 0; k < 50; k++) expect(chooseEnemyAction(s, new Rng(k)).moveIndex).not.toBe(0)
        }
        expect(checked).toBeGreaterThan(10)
    })
    it("plafond atteint PENDANT l'orage : il retombe sans soin ni sommeil, jamais de 4e régénération", () => {
        for (let seed = 1; seed <= 20; seed++) {
            const en = nami(["rancoeur_celeste", "ball_ombre"], 60, false); Object.assign(en, { vanishTurns: 1, healsUsed: 3, currentHp: 50 })
            const s = resolveTurn(createBattle([createMonInstance("rochison", 60, { owned: true, moveIds: ["mur_de_fer"] })], [en], { isWild: false, seed, aiLevel: "trainer" }), { kind: "move", moveIndex: 0 })
            expect(V(E(s))).toBe(0)
            expect(E(s).currentHp).toBe(50)
            expect(E(s).status).toBe("NONE")
            expect(E(s).healsUsed).toBe(3)
            expect(has(s, VANISH_LINES.healSpent(NZ))).toBe(true)
        }
        // Repos scripté pris CACHÉ (3e soin), puis fin de l'orage : le compteur ne dépasse jamais 3.
        let refused = 0
        for (let seed = 1; seed <= 60; seed++) {
            const en = nami(["rancoeur_celeste", "repos"], 60, false); Object.assign(en, { vanishTurns: 2, healsUsed: 2, currentHp: 40, openingMoves: ["repos"] })
            let s = createBattle([createMonInstance("rochison", 60, { owned: true, moveIds: ["mur_de_fer"] })], [en], { isWild: false, seed, aiLevel: "hof" })
            for (let t = 0; t < 4 && s.phase !== "ended"; t++) {
                s = resolveTurn(s, { kind: "move", moveIndex: 0 })
                expect(E(s).healsUsed ?? 0).toBeLessThanOrEqual(3)
                if (has(s, VANISH_LINES.healSpent(NZ))) refused++
            }
        }
        expect(refused).toBeGreaterThan(5)
    })
    it("le JOUEUR n'a ni série ni plafond : il l'enchaîne autant qu'il veut", () => {
        let s = createBattle([nami(["rancoeur_celeste", "mirage"])], [wall()], { isWild: false, seed: 8, aiLevel: "trainer" })
        let casts = 0
        for (let t = 0; t < 80 && s.phase !== "ended"; t++) {
            const hidden = V(P(s)) > 0
            s = resolveTurn(s, { kind: "move", moveIndex: hidden ? 1 : 0 })
            if (!hidden && msgs(s).some((x) => x.startsWith(`${NZ} utilise Rancœur Céleste`))) casts++
            expect(P(s).vanishCastStreak).toBeUndefined()
        }
        expect(casts).toBeGreaterThan(4)
        expect(P(s).healsUsed ?? 0).toBe(0)
    })
})

describe("Rancœur Céleste — PvP et capture", () => {
    it("PvP : déterministe, sans limite ni plafond, les deux camps peuvent disparaître", () => {
        const A = nami(["rancoeur_celeste", "ball_ombre"]), B = nami(["rancoeur_celeste", "ball_ombre"])
        const run = () => {
            let s = createBattle([structuredClone(A)], [structuredClone(B)], { isWild: false, seed: 31337, pvp: true })
            let both = 0, uses = 0
            for (let t = 0; t < 60 && s.phase !== "ended"; t++) {
                s = resolveTurnPvp(s, { kind: "move", moveIndex: 0 }, { kind: "move", moveIndex: t % 3 === 0 ? 0 : 1 })
                if (V(P(s)) > 0 && V(E(s)) > 0) both++
                uses += msgs(s).filter((x) => x.startsWith(`${NZ} utilise Rancœur Céleste`)).length
                expect(E(s).vanishCastStreak).toBeUndefined() // le camp B d'un PvP est un JOUEUR : aucune série
            }
            return { s, both, uses }
        }
        const a = run(), b = run()
        expect(b.s.seed).toBe(a.s.seed); expect(b.s.turn).toBe(a.s.turn)
        expect(P(b.s).currentHp).toBe(P(a.s).currentHp); expect(E(b.s).currentHp).toBe(E(a.s).currentHp)
        expect(a.both).toBeGreaterThan(0)
        expect(a.uses).toBeGreaterThanOrEqual(3)
    })
    it("une Ball, même Master-Éclair, traverse un sauvage disparu (filet du moteur)", () => {
        const wild = nami(["rancoeur_celeste", "ball_ombre"], 55, false); Object.assign(wild, { openingMoves: ["rancoeur_celeste", "rancoeur_celeste"] })
        let s = createBattle([createMonInstance("rochison", 60, { owned: true, moveIds: ["mur_de_fer"] })], [wild], { isWild: true, seed: 9 })
        for (let k = 0; k < 2 && V(E(s)) === 0; k++) s = resolveTurn(s, { kind: "move", moveIndex: 0 })
        expect(V(E(s))).toBeGreaterThan(0)
        const attempts = s.captureAttempts
        s = resolveTurn(s, { kind: "ball", itemId: "master_ball" })
        expect(s.outcome).not.toBe("caught")
        expect(s.captureAttempts).toBe(attempts)
        expect(has(s, VANISH_LINES.ballThrough(NZ))).toBe(true)
    })
})

describe("Raitei — Élec PHYSIQUE", () => {
    it("catégorie PHYSIQUE (surcharge), 150 / 90, sans effet secondaire", () => {
        const mv = getMove("raitei")!
        expect(mv.type).toBe("ELEC"); expect(mv.category).toBe("PHYSICAL"); expect(moveCategoryOf(mv)).toBe("PHYSICAL")
        expect(mv.power).toBe(150); expect(mv.accuracy).toBe(90); expect(mv.effect).toBeUndefined()
    })
    it("frappe sur Atq/Déf (+6 Déf l'écrase, +6 Spécial ne change rien) et la brûlure la divise par 2", () => {
        const avg = (burn: boolean, def: number, spc: number) => {
            const s0 = createBattle([{ ...nami(["raitei"], 70), status: burn ? "BURN" as const : "NONE" as const }], [createMonInstance("leviathonn", 70, { ivs: 8, moveIds: ["mur_de_fer"] })], { isWild: false, seed: 1, aiLevel: "trainer" })
            s0.enemy.team[0].stages.def = def; s0.enemy.team[0].stages.spc = spc
            let tot = 0, n = 0
            for (let seed = 1; seed <= 80; seed++) { const r = resolveTurn({ ...s0, seed }, { kind: "move", moveIndex: 0 }); const d = s0.enemy.team[0].currentHp - r.enemy.team[0].currentHp; if (d > 0) { tot += d; n++ } }
            return tot / n
        }
        const base = avg(false, 0, 0)
        expect(avg(false, 6, 0)).toBeLessThan(base * 0.4)
        expect(Math.abs(avg(false, 0, 6) - base)).toBeLessThan(base * 0.05)
        expect(avg(true, 0, 0)).toBeLessThan(base * 0.6)
    })
})
