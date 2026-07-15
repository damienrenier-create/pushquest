import { describe, it, expect } from "vitest"
import { DAN_POOL } from "./danTeams"
import { getSpecies } from "../data/species"
import { getMove } from "../data/moves"
import { HELD_ITEMS } from "../data/heldItems"
import { CTS, canLearnCt } from "../data/cts"

// Un move est LÉGAL pour une espèce s'il est à son learnset OU enseignable par une CT compatible (canLearnCt).
function moveLegal(speciesId: string, moveId: string): boolean {
    const sp = getSpecies(speciesId)
    if (!sp) return false
    if (sp.learnset.some((e) => e.moveId === moveId)) return true
    return CTS.some((c) => c.moveId === moveId && canLearnCt(sp, c))
}

describe("DAN_POOL — 12 équipes désignées de la Voie du Maître", () => {
    it("compte 12 équipes de 6 Daemons finaux", () => {
        expect(DAN_POOL.length).toBe(12)
        for (const t of DAN_POOL) expect(t.mons.length).toBe(6)
    })

    it("n'utilise aucune espèce inconnue et JAMAIS deux fois le même Daemon (72 distincts)", () => {
        const all = DAN_POOL.flatMap((t) => t.mons.map((m) => m.speciesId))
        expect(all.length).toBe(72)
        for (const id of all) expect(getSpecies(id), `espèce inconnue: ${id}`).toBeTruthy()
        expect(new Set(all).size, "un Daemon apparaît dans deux équipes").toBe(72)
    })

    it("donne 4 attaques VALIDES et LÉGALES (learnset ou CT) à chaque Daemon", () => {
        for (const t of DAN_POOL) {
            for (const m of t.mons) {
                expect(m.moveIds.length, `${m.speciesId} n'a pas 4 attaques`).toBe(4)
                expect(new Set(m.moveIds).size, `${m.speciesId} a une attaque en double`).toBe(4)
                for (const mid of m.moveIds) {
                    expect(getMove(mid), `move inconnu: ${mid} (${m.speciesId})`).toBeTruthy()
                    expect(moveLegal(m.speciesId, mid), `move ILLÉGAL: ${m.speciesId} → ${mid}`).toBe(true)
                }
            }
        }
    })

    it("n'utilise que des objets tenus réels", () => {
        for (const t of DAN_POOL) {
            for (const m of t.mons) {
                if (m.heldItemId) expect(HELD_ITEMS[m.heldItemId], `objet inconnu: ${m.heldItemId} (${m.speciesId})`).toBeTruthy()
            }
        }
    })
})
