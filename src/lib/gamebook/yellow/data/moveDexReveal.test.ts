import { describe, it, expect } from "vitest"
import { knownMoveIds, type MoveKnowledgeInput } from "./moveDexReveal"
import { SPECIES } from "./species"
import { CTS, purchasableCts } from "./cts"

const empty: MoveKnowledgeInput = { seen: [], caught: [], ownedMons: [], badges: [], boughtCts: [], ownedCts: [] }

describe("knownMoveIds — révélation progressive du Pokédex des attaques", () => {
    it("sans espèce ni Daemon : seules les attaques des CT achetables DÈS LE DÉPART sont connues (règle b)", () => {
        const known = knownMoveIds(empty)
        const dayOne = new Set(purchasableCts([], []).map((c) => c.moveId))
        expect(known).toEqual(dayOne)
        expect(known.size).toBeGreaterThan(0) // il existe des CT universelles sans badge
    })

    it("(a) espèce CROISÉE (vue ou capturée) → tout son learnset devient connu", () => {
        const sp = Object.values(SPECIES).find((s) => s.learnset.length > 0)!
        const known = knownMoveIds({ ...empty, seen: [sp.id] })
        for (const { moveId } of sp.learnset) expect(known.has(moveId)).toBe(true)
    })

    it("(d) Daemon POSSÉDÉ → ses attaques actuelles sont connues, même hors learnset/espèce inconnue", () => {
        const known = knownMoveIds({ ...empty, ownedMons: [{ speciesId: "___inconnu___", moves: ["charge"] }] })
        expect(known.has("charge")).toBe(true)
    })

    it("(b) une CT derrière un badge NON possédé est exclue du canal ACHAT (purchasableCts)", () => {
        const gated = CTS.find((c) => c.badge && !c.gift && !c.labOnly)
        if (gated) expect(purchasableCts([], []).some((c) => c.id === gated.id)).toBe(false)
    })

    it("(c) CT-cadeau REÇUE (ownedCts) → son attaque devient connue", () => {
        const gift = CTS.find((c) => c.gift)!
        expect(knownMoveIds({ ...empty, ownedCts: [gift.id] }).has(gift.moveId)).toBe(true)
    })
})
