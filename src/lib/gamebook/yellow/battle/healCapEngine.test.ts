import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn, maxHpOf } from "./engine"
import { createMonInstance } from "./factory"
import { ENEMY_MAX_HEALS } from "../data/healCap"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// PLAFOND DE RÉGÉNÉRATION — le CÂBLAGE dans le moteur (les bornes sont testées dans data/healCap.test)
//
// Pourquoi ce test existe : Kingme s'est retrouvé ENFERMÉ dans un combat de dresseur le 02/10. L'adversaire se
// soignait (50 % des PV, 10 PP) plus vite qu'il ne pouvait frapper, chacune de ses attaques lui coûtait de
// l'énergie, et un combat de dresseur ne se fuit pas. Les helpers purs ne prouvent rien tant que le moteur ne les
// consulte pas vraiment : on joue donc de VRAIS tours.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

/** Un adversaire SEUL (donc pas de changement possible) dont le seul coup est un soin → l'IA le choisit à bas PV. */
const soigneur = () => createMonInstance("sylvours", 50, { moveIds: ["linceul"] })
/** Le joueur joue un coup inoffensif : on veut observer l'adversaire, pas le tuer. */
const passif = () => createMonInstance("cerfeuillu", 50, { moveIds: ["aromatherapie"] })

/** Remet l'adversaire à bas PV (pour que l'IA veuille se soigner) puis joue un tour. */
function tourABasPv(s: ReturnType<typeof createBattle>) {
    const foe = s.enemy.team[0]
    foe.currentHp = Math.max(1, Math.floor(maxHpOf(foe) * 0.15))
    const avant = foe.currentHp
    const apres = resolveTurn(s, { kind: "move", moveIndex: 0 })
    return { state: apres, avant, pv: apres.enemy.team[0].currentHp, events: apres.events }
}

describe("un Daemon de dresseur ne se régénère que 3 fois", () => {
    it(`les ${ENEMY_MAX_HEALS} premiers soins passent, le suivant est REFUSÉ`, () => {
        let s = createBattle([passif()], [soigneur()], { isWild: false, seed: 7 })

        for (let i = 1; i <= ENEMY_MAX_HEALS; i++) {
            const t = tourABasPv(s); s = t.state
            expect(t.pv, `soin n°${i} : les PV doivent remonter`).toBeGreaterThan(t.avant)
            expect(s.enemy.team[0].healsUsed, `compteur après le soin n°${i}`).toBe(i)
        }

        // Le 4e : PV inchangés, compteur figé, et le joueur est PRÉVENU (sinon il croit à un bug).
        const t = tourABasPv(s); s = t.state
        expect(t.pv, "4e soin : les PV ne doivent PAS remonter").toBe(t.avant)
        expect(s.enemy.team[0].healsUsed).toBe(ENEMY_MAX_HEALS)
        const dit = t.events.some((e) => e.kind === "message" && /bout de forces/i.test((e as { text: string }).text))
        expect(dit, "un message doit expliquer le refus").toBe(true)
    })

    it("le compteur survit à l'instantané de combat (un rechargement ne le remet pas à zéro)", () => {
        let s = createBattle([passif()], [soigneur()], { isWild: false, seed: 7 })
        for (let i = 0; i < ENEMY_MAX_HEALS; i++) s = tourABasPv(s).state
        // C'est exactement ce que persistBattleSnapshot écrit dans localStorage, puis relit.
        const reparse = JSON.parse(JSON.stringify({ ...s, events: [] }))
        expect(reparse.enemy.team[0].healsUsed).toBe(ENEMY_MAX_HEALS)
    })
})

describe("ce que le plafond ne doit PAS toucher", () => {
    it("⚠️ le JOUEUR garde ses soins : il se régénère autant que ses PP le permettent", () => {
        let s = createBattle([createMonInstance("sylvours", 50, { moveIds: ["linceul"] })], [createMonInstance("plumiot", 5)], { isWild: true, seed: 3 })
        for (let i = 0; i < ENEMY_MAX_HEALS + 2; i++) {
            const me = s.player.team[0]
            me.currentHp = Math.max(1, Math.floor(maxHpOf(me) * 0.2))
            const avant = me.currentHp
            s = resolveTurn(s, { kind: "move", moveIndex: 0 })
            expect(s.player.team[0].currentHp, `soin joueur n°${i + 1}`).toBeGreaterThan(avant)
        }
        expect(s.player.team[0].healsUsed, "le joueur n'est même pas compté").toBeUndefined()
    })

    it("REPOS refusé n'endort pas pour rien (l'attaque échoue en entier)", () => {
        let s = createBattle([passif()], [createMonInstance("sylvours", 50, { moveIds: ["repos"] })], { isWild: false, seed: 11 })
        for (let i = 0; i < ENEMY_MAX_HEALS; i++) {
            s = tourABasPv(s).state
            s.enemy.team[0].status = "NONE"; s.enemy.team[0].statusCounter = 0 // on le réveille pour qu'il rejoue
        }
        const t = tourABasPv(s); s = t.state
        expect(s.enemy.team[0].healsUsed).toBe(ENEMY_MAX_HEALS)
        expect(t.pv).toBe(t.avant)                       // pas de soin
        expect(s.enemy.team[0].status).toBe("NONE")      // ET pas de sommeil subi pour rien
    })
})
