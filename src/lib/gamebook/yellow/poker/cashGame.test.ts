import { describe, it, expect } from "vitest"
import { bossStartStack } from "./cashGame"

describe("poker cash — tapis de départ des boss (cap sur les dons, gains persistés)", () => {
    it("nouveau boss du jour → reçoit le cap (ton buy-in)", () => {
        expect(bossStartStack(undefined, 40)).toBe(40)
    })
    it("boss ruiné aujourd'hui (0) → null (ne s'assoit pas, out du jour)", () => {
        expect(bossStartStack(0, 40)).toBeNull()
    })
    it("boss qui avait PERDU (< cap) → rechargé au cap (jamais en dessous de ton buy-in)", () => {
        expect(bossStartStack(15, 40)).toBe(40)
    })
    it("boss qui avait GAGNÉ (> cap) → GARDE ses gains (peut dépasser ton buy-in)", () => {
        expect(bossStartStack(120, 40)).toBe(120)
    })
    it("les DONS de la maison ne dépassent jamais le cap ; seuls les gains le dépassent", () => {
        // stored exactement au cap → reste au cap
        expect(bossStartStack(40, 40)).toBe(40)
    })
})
