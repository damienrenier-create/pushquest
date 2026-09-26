import { describe, it, expect } from "vitest"
import { isoWeekKey, slotIsOpen, pickCandidate, MIRROR_GIFT_ENERGY } from "./ambientNews"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// ACTUALITÉS DU NEXUS — les deux garde-fous qui comptent
//
// (1) LA CADENCE. Chaque annonce verse de l'ÉNERGIE. Si la clé de période était fausse, un joueur pourrait
//     recharger la page en boucle et se remplir la jauge — c'est de la triche offerte sur un plateau.
// (2) LE VIVIER VIDE. On ne doit JAMAIS inventer un pseudo : tant que personne n'a réellement accompli
//     l'exploit, il n'y a pas d'annonce du tout.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

const d = (s: string) => new Date(`${s}T12:00:00`)

describe("clé de semaine ISO", () => {
    it("la semaine change le LUNDI, pas le dimanche", () => {
        // 2026-09-20 = dimanche, 2026-09-21 = lundi → deux semaines différentes.
        expect(isoWeekKey(d("2026-09-20"))).toBe(isoWeekKey(d("2026-09-14"))) // dimanche = fin de la semaine du lundi 14
        expect(isoWeekKey(d("2026-09-21"))).not.toBe(isoWeekKey(d("2026-09-20")))
    })

    it("tous les jours d'une même semaine partagent la clé (lundi → dimanche)", () => {
        const k = isoWeekKey(d("2026-09-21"))
        for (const day of ["2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27"]) {
            expect(isoWeekKey(d(day)), day).toBe(k)
        }
        expect(k).toMatch(/^\d{4}-W\d{2}$/)
    })

    it("⚠️ passage d'année : la semaine appartient à l'année de son JEUDI (pas de semaine tronquée)", () => {
        // 1er janvier 2027 = vendredi → il appartient à la semaine ISO 53 de 2026.
        expect(isoWeekKey(d("2027-01-01"))).toBe(isoWeekKey(d("2026-12-31")))
        // Et le lundi suivant ouvre bien la semaine 1 de 2027.
        expect(isoWeekKey(d("2027-01-04"))).toBe("2027-W01")
    })

    it("la clé est toujours à deux chiffres (tri alphabétique = tri chronologique)", () => {
        expect(isoWeekKey(d("2026-01-05"))).toBe("2026-W02")
        expect(isoWeekKey(d("2026-01-05")) < isoWeekKey(d("2026-10-05"))).toBe(true)
    })
})

describe("cadence : le créneau ne s'ouvre qu'une fois par période", () => {
    it("jamais servi → ouvert", () => {
        expect(slotIsOpen(null, "2026-W39")).toBe(true)
        expect(slotIsOpen(undefined, "2026-W39")).toBe(true)
        expect(slotIsOpen("", "2026-W39")).toBe(true)
    })

    it("⚠️ même période → FERMÉ (dix rechargements ne donnent pas dix cadeaux)", () => {
        expect(slotIsOpen("2026-W39", "2026-W39")).toBe(false)
        expect(slotIsOpen("2026-09-26", "2026-09-26")).toBe(false)
    })

    it("période suivante → ré-ouvert", () => {
        expect(slotIsOpen("2026-W39", "2026-W40")).toBe(true)
        expect(slotIsOpen("2026-09-26", "2026-09-27")).toBe(true)
    })
})

describe("tirage du candidat", () => {
    it("⚠️ vivier VIDE → null : on n'invente jamais un pseudo", () => {
        expect(pickCandidate([], () => 0.5)).toBeNull()
    })

    it("un seul candidat → c'est lui, quel que soit le hasard", () => {
        for (const r of [0, 0.5, 0.999999]) expect(pickCandidate(["Jacanon"], () => r)).toBe("Jacanon")
    })

    it("le tirage couvre TOUT le vivier, bornes incluses, et ne sort jamais du tableau", () => {
        const pool = ["a", "b", "c", "d"]
        expect(pickCandidate(pool, () => 0)).toBe("a")
        expect(pickCandidate(pool, () => 0.999999)).toBe("d")
        for (const r of [-1, 1, 1.5, NaN]) expect(pool).toContain(pickCandidate(pool, () => r)) // rng défaillant : jamais undefined
    })

    it("chaque membre du vivier est atteignable (pas de biais qui gèlerait un pseudo)", () => {
        const pool = ["a", "b", "c", "d"]
        const seen = new Set(pool.map((_, i) => pickCandidate(pool, () => (i + 0.5) / pool.length)))
        expect(seen).toEqual(new Set(pool))
    })
})

describe("montant du cadeau de reflet", () => {
    it("reste aligné sur la consolation réelle (30⚡)", () => {
        expect(MIRROR_GIFT_ENERGY).toBe(30)
    })
})
