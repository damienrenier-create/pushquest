import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn, type BattleState } from "./engine"
import { createMonInstance } from "./factory"

// 📟 MINITEL — à la chute du DERNIER Daemon, si l'appel est armé et la réserve présente, un 7e renfort débarque
// au lieu de la défaite (une seule fois). L'injection se joue dans checkFaints, APRÈS le check de victoire ennemie.

/** Combat sauvage où le seul Daemon du joueur (1 PV) va tomber, face à un ennemi qui l'écrase. */
function lethalBattle(): BattleState {
    const weak = createMonInstance("nouillon", 5)
    // Attaque SANS contrecoup ni effet (Charge) → l'ennemi KO le joueur sans se blesser (évite un double-KO par recul).
    const enemy = createMonInstance("rochison", 60, { moveIds: ["charge"] })
    const b = createBattle([weak], [enemy], { isWild: true, seed: 12345 })
    b.player.team[0].currentHp = 1 // tombera ce tour
    return b
}

/** Joue jusqu'à la fin OU l'entrée du renfort (team passe à 2). */
function playUntilReserveOrEnd(start: BattleState): BattleState {
    let s = start, guard = 0
    while (s.phase !== "ended" && s.player.team.length < 2 && guard < 60) {
        if (s.forcedSwitch === "player") {
            const i = s.player.team.findIndex((m) => m.currentHp > 0)
            s = resolveTurn(s, { kind: "switch", teamIndex: i >= 0 ? i : 0 })
        } else {
            s = resolveTurn(s, { kind: "move", moveIndex: 0 })
        }
        guard++
    }
    return s
}

describe("📟 MINITEL — renfort à la chute du dernier Daemon", () => {
    it("ARMÉ : le 7e (réserve) débarque au lieu de la défaite", () => {
        const b = lethalBattle()
        const reserve = createMonInstance("draclet", 40, { owned: true })
        reserve.uid = "minitel__test"
        b.minitelArmed = true
        b.minitelReserve = reserve
        const s = playUntilReserveOrEnd(b)
        expect(s.phase).not.toBe("ended")                 // sauvé par le renfort
        expect(s.minitelUsed).toBe(true)
        expect(s.player.team.length).toBe(2)              // le 7e a rejoint l'équipe de combat
        const active = s.player.team[s.player.activeIndex]
        expect(active.uid).toBe("minitel__test")          // c'est bien la réserve qui est active
        expect(active.currentHp).toBeGreaterThan(0)       // entrée pleine vie
        expect(s.participated).not.toContain("minitel__test") // EMPRUNTÉ : hors partage d'XP → ne gagne aucune XP
    })

    it("NON armé : la défaite tombe normalement", () => {
        const s = playUntilReserveOrEnd(lethalBattle())
        expect(s.phase).toBe("ended")
        expect(s.outcome).toBe("lose")
        expect(s.player.team.length).toBe(1)
    })

    it("UNE SEULE FOIS : minitelUsed déjà vrai → aucun 2e sauvetage", () => {
        const b = lethalBattle()
        b.minitelArmed = true
        b.minitelUsed = true // déjà consommé
        b.minitelReserve = undefined
        const s = playUntilReserveOrEnd(b)
        expect(s.outcome).toBe("lose")
        expect(s.player.team.length).toBe(1)
    })

    it("armé SANS réserve (edge) → défaite normale, pas de crash", () => {
        const b = lethalBattle()
        b.minitelArmed = true
        b.minitelReserve = undefined
        const s = playUntilReserveOrEnd(b)
        expect(s.outcome).toBe("lose")
    })
})
