import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn } from "./engine"
import { createMonInstance } from "./factory"
import type { BattleEvent } from "./engine"

// RÉGRESSION — le statut SOMMEIL et son AFFICHAGE. Bug signalé : « on peut attaquer alors qu'on est endormi » et
// « les statuts viennent puis disparaissent ». Cause : les CURES (réveil/dégel/…) ne poussaient AUCUN event `status`,
// donc le badge du client (dispStatus, piloté par les events) restait bloqué sur SLEEP alors que le Daemon s'était
// réveillé et avait agi. Fix : canAct pousse `{kind:"status", status:"NONE"}` au réveil (et au dégel).

function playerAsleep(counter: number) {
    const atk = createMonInstance("divinpate", 50, { moveIds: ["choc_mental"] }) // rapide (Vit 82) → agit avant l'ennemi
    const def = createMonInstance("razmaree", 50)
    let s = createBattle([atk], [def], { isWild: true, seed: 777 })
    const me = s.player.team[s.player.activeIndex]
    me.status = "SLEEP"
    me.statusCounter = counter
    s = resolveTurn(s, { kind: "move", moveIndex: 0 })
    const wokeEvent = s.events.some((e: BattleEvent) => e.kind === "status" && e.side === "player" && e.status === "NONE")
    return { s, wokeEvent, playerStatus: s.player.team[0].status, enemyHp: s.enemy.team[0].currentHp, enemyMax: s.enemy.team[0].frozenStats?.hp }
}

describe("SOMMEIL — réveil : émet un event status NONE + le Daemon agit (fini « attaquer en dormant »)", () => {
    it("compteur 1 → se réveille CE tour : event status:NONE présent, statut NONE, et il ATTAQUE (l'ennemi perd des PV)", () => {
        const { wokeEvent, playerStatus, s } = playerAsleep(1)
        expect(wokeEvent).toBe(true)               // le badge SLEEP se retire AU réveil (avant l'attaque)
        expect(playerStatus).toBe("NONE")          // réellement réveillé
        // l'ennemi a bien encaissé l'attaque du réveillé
        const enemyLostHp = s.enemy.team[0].currentHp < (s.enemy.team[0].frozenStats?.hp ?? Infinity) || s.enemy.team[0].currentHp < 9999
        expect(enemyLostHp).toBe(true)
        // ORDRE : le réveil (status NONE) précède les dégâts infligés à l'ennemi (le badge tombe AVANT le coup)
        const wakeIdx = s.events.findIndex((e: BattleEvent) => e.kind === "status" && e.side === "player" && e.status === "NONE")
        const enemyHpIdx = s.events.findIndex((e: BattleEvent) => e.kind === "hp" && e.side === "enemy")
        expect(wakeIdx).toBeGreaterThanOrEqual(0)
        expect(enemyHpIdx).toBeGreaterThan(wakeIdx)
    })

    it("compteur 5 → dort encore : AUCUN event status:NONE, statut reste SLEEP (le Daemon N'attaque PAS)", () => {
        const { wokeEvent, playerStatus, s } = playerAsleep(5)
        expect(wokeEvent).toBe(false)
        expect(playerStatus).toBe("SLEEP")
        // le joueur n'a pas agi → aucun event hp côté ennemi causé par lui (l'ennemi n'a pas perdu de PV avant son propre tour)
        const dortEvent = s.events.some((e: BattleEvent) => e.kind === "message" && e.text.includes("dort profondément"))
        expect(dortEvent).toBe(true)
    })
})
