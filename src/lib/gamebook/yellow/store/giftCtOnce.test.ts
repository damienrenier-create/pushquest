import { describe, it, expect } from "vitest"
import { rollWildEncounter } from "../data/encounters"
import fs from "node:fs"
import path from "node:path"
import { hydratePlayer, getPlayer, teachCt, grantSurfCt, ctAlreadyReceived, ctTaughtMarker, recordHhCollectorWin } from "./playerStore"
import { getCt, canLearnCt } from "../data/cts"
import { SPECIES } from "../data/species"
import { createMonInstance } from "../battle/factory"

// Sartay, 28/10/2026 : « run 3 : la CT Arc Plasma, DaKumba l'a apprise à un pokémon et pourtant elle est toujours dans son
// sac ». Une CT CADEAU apprise quitte le sac sans être notée achetée ; les dons « une seule fois » (bateau, Surf,
// Collectionneur, sbire, Mitra-Poing) ne vérifiaient que le sac et la redonnaient.
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")
const learner = (ctId: string) => {
    const ct = getCt(ctId)!
    const sp = Object.values(SPECIES).find((s) => canLearnCt(s, ct))!
    return createMonInstance(sp.id, 40)
}

describe("run 3 — Route Nord : Limaroche moins fréquent (Sartay, 28/10/2026)", () => {
    it("≈ 3 % des rencontres (au lieu de ≈ 17 %), la lignée reste présente", () => {
        let seed = 7
        const rng = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
        let enc = 0, lima = 0
        for (let i = 0; i < 300_000; i++) {
            const m = rollWildEncounter({ mapId: "yellow_route_nord", x: 5, y: 5, leadLevel: 20, run3: true, encounterCount: 999, rng })
            if (!m) continue
            enc++
            if (["limaroche", "escaroche", "torturoche"].includes(m.speciesId)) lima++
        }
        expect(lima / enc).toBeGreaterThan(0.022)
        expect(lima / enc).toBeLessThan(0.038)
    })
})

describe("CT cadeau : reçue une seule fois, même une fois apprise", () => {
    it("apprendre une CT cadeau la retire du sac et la marque apprise (sans la compter comme achat)", () => {
        const mon = learner("ct82")
        hydratePlayer({ team: [{ ...mon, moves: mon.moves.slice(0, 1) }], ownedCts: ["ct82"], boughtCts: [], defeatedTrainers: [], reps: 0 })
        expect(teachCt(mon.uid, "ct82").ok).toBe(true)
        expect(getPlayer().ownedCts).not.toContain("ct82")
        expect(getPlayer().boughtCts).not.toContain("ct82") // le haut fait « a acheté une CT » ne doit pas s'allumer
        expect(getPlayer().defeatedTrainers).toContain(ctTaughtMarker("ct82"))
        expect(ctAlreadyReceived("ct82")).toBe(true)
    })
    it("Surf : déjà appris → plus jamais redonné", () => {
        const mon = learner("ct66")
        hydratePlayer({ team: [{ ...mon, moves: mon.moves.slice(0, 1) }], ownedCts: ["ct66"], boughtCts: [], defeatedTrainers: [], reps: 0 })
        expect(teachCt(mon.uid, "ct66").ok).toBe(true)
        expect(grantSurfCt()).toBe(false)
        expect(getPlayer().ownedCts).not.toContain("ct66")
    })
    it("Collectionneur de spectres : la CT26 apprise n'est pas redonnée à la victoire suivante", () => {
        const mon = learner("ct26")
        // témoin : sans l'avoir jamais reçue, la même victoire la donne bien
        const fresh = { team: [{ ...mon, moves: mon.moves.slice(0, 1) }], ownedCts: [], boughtCts: [], defeatedTrainers: [], reps: 0, hhCollectorWins: 5, hhSpectresShown: ["a", "b", "c"] }
        hydratePlayer(fresh)
        expect(recordHhCollectorWin([]).rewarded).toBe(true)
        // reçue puis apprise : plus jamais redonnée
        expect(teachCt(mon.uid, "ct26").ok).toBe(true)
        expect(recordHhCollectorWin([]).rewarded).toBe(false)
        expect(getPlayer().ownedCts).not.toContain("ct26")
    })
    it("câblage : bateau (rattrapage), sbire et Mitra-Poing testent la CT déjà reçue, apprise comprise", () => {
        expect(read("src/app/gamebook/yellow/YellowDevClient.tsx")).toContain("if (!ctId || ctAlreadyReceived(ctId) || !boatArenaCleared(")
        const bs = read("src/lib/gamebook/yellow/store/battleStore.ts")
        expect(bs).toContain("if (!ctAlreadyReceived(SBIRE_REWARD_CT_ID) && grantCt(SBIRE_REWARD_CT_ID))")
        expect(bs).toContain("if (hasGamaruto && !ctAlreadyReceived(\"ct58\") && grantCt(\"ct58\"))")
    })
})
