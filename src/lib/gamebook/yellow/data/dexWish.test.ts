import { describe, it, expect } from "vitest"
import {
    freshDexWish, dexWishActive, canAnnounceToday, resolveDexChoice, announceDex,
    countPopForDexWish, DEX_WISH_POP_INDEX, DEX_WISH_DEFAULT_CHARGES,
} from "./dexWish"
import { MISSINGNO_ID, MISSINGNO_LEVEL, MISSINGNO_SPECIES } from "./missingnoSpecies"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// VŒU « JE CHOISIS LE NUMÉRO » (Guillaume)
//
// Règle de Sartay : CHAQUE journée annoncée est consommée, et un numéro interdit n'est pas refusé — il donne un
// MissingNo niveau 5 (BST 100). Le génie tient parole à la lettre, c'est tout.
//
// Ce qui doit tenir : le 10ᵉ pop obéit (et pas le 9ᵉ), une seule annonce par jour, 7 journées, la punition tombe
// bien sur les trois cas interdits, et une annonce ne peut JAMAIS être silencieusement perdue.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

const DEX = [
    { id: "gekroc", dexNo: 7, name: "Gékroc", rarity: "COMMON" },
    { id: "galijah", dexNo: 204, name: "Galijah", rarity: "LEGENDARY" },
    { id: "karmaki", dexNo: 160, name: "Karmaki", rarity: "RARE" },
]
const DISPO = new Set(["gekroc"]) // seul Gékroc apparaît dans son run
const J = "2026-10-02"
const NIV = 45

describe("la punition : MissingNo, et BST 100", () => {
    it("l'espèce de punition est bien minable — BST 100, niveau 5", () => {
        const bst = Object.values(MISSINGNO_SPECIES.baseStats).reduce((a, b) => a + b, 0)
        expect(bst).toBe(100)
        expect(MISSINGNO_LEVEL).toBe(5)
        expect(MISSINGNO_SPECIES.rarity).not.toBe("LEGENDARY")
    })

    it("un numéro VALIDE et présent dans son run donne la vraie espèce", () => {
        expect(resolveDexChoice(7, DEX, DISPO)).toEqual({ speciesId: "gekroc", dexNo: 7, name: "Gékroc", dud: false })
    })

    it("⚠️ un LÉGENDAIRE n'est pas refusé : il donne MissingNo", () => {
        const r = resolveDexChoice(204, DEX, new Set(["galijah"]))
        expect(r.speciesId).toBe(MISSINGNO_ID)
        expect(r.dud).toBe(true)
        expect(r.why).toBe("legendaire")
    })

    it("⚠️ une espèce HORS de son run donne MissingNo", () => {
        const r = resolveDexChoice(160, DEX, DISPO)
        expect(r.speciesId).toBe(MISSINGNO_ID)
        expect(r.why).toBe("hors_run")
    })

    it("⚠️ un numéro inexistant ou absurde donne MissingNo (jamais de plantage, jamais de refus)", () => {
        for (const bad of [999, 0, -3, "abc", null, undefined, NaN, {}]) {
            const r = resolveDexChoice(bad, DEX, DISPO)
            expect(r.speciesId, String(bad)).toBe(MISSINGNO_ID)
            expect(r.why, String(bad)).toBe("inconnu")
        }
    })

    it("la punition sort au niveau 5, la vraie espèce au niveau des badges", () => {
        const puni = announceDex(freshDexWish(), J, resolveDexChoice(204, DEX, new Set(["galijah"])), NIV)
        expect(puni.speciesId).toBe(MISSINGNO_ID)
        expect(puni.level).toBe(MISSINGNO_LEVEL)

        const vrai = announceDex(freshDexWish(), J, resolveDexChoice(7, DEX, DISPO), NIV)
        expect(vrai.level).toBe(NIV)
    })
})

describe("chaque journée annoncée est consommée", () => {
    it("⚠️ annoncer DÉBITE immédiatement — même pour un numéro interdit", () => {
        const bon = announceDex(freshDexWish(), J, resolveDexChoice(7, DEX, DISPO), NIV)
        expect(bon.charges).toBe(DEX_WISH_DEFAULT_CHARGES - 1)

        const puni = announceDex(freshDexWish(), J, resolveDexChoice(204, DEX, new Set(["galijah"])), NIV)
        expect(puni.charges).toBe(DEX_WISH_DEFAULT_CHARGES - 1) // la bêtise coûte exactement le même prix
    })

    it("⚠️ s'arrêter avant le 10e pop ne rend PAS la journée (annoncer, c'est s'engager)", () => {
        let st = announceDex(freshDexWish(), J, resolveDexChoice(7, DEX, DISPO), NIV)
        for (let i = 0; i < 4; i++) st = countPopForDexWish(st, J, true).state
        expect(st.charges).toBe(DEX_WISH_DEFAULT_CHARGES - 1)
    })

    it("une seule annonce par jour, et plus rien quand les 7 sont passées", () => {
        let st = freshDexWish()
        for (let d = 1; d <= 7; d++) {
            const jour = `2026-10-0${d}`
            expect(canAnnounceToday(st, jour), `jour ${d}`).toBe(true)
            st = announceDex(st, jour, resolveDexChoice(7, DEX, DISPO), NIV)
            expect(canAnnounceToday(st, jour), `re-annonce jour ${d}`).toBe(false)
        }
        expect(st.charges).toBe(0)
        expect(dexWishActive(st)).toBe(false)
        expect(canAnnounceToday(st, "2026-10-08")).toBe(false)
    })
})

describe("le 10e pop obéit", () => {
    function pops(n: number, from = announceDex(freshDexWish(), J, resolveDexChoice(7, DEX, DISPO), NIV)) {
        let st = from
        const armes: (string | undefined)[] = []
        for (let i = 0; i < n; i++) {
            const r = countPopForDexWish(st, J, true)
            st = r.state; armes.push(r.arm?.speciesId)
        }
        return { st, armes }
    }

    it(`l'armement tombe au pop n°${DEX_WISH_POP_INDEX - 1} — la rencontre forcée sort au pop SUIVANT`, () => {
        const { armes } = pops(DEX_WISH_POP_INDEX)
        expect(armes.findIndex((a) => a === "gekroc") + 1).toBe(DEX_WISH_POP_INDEX - 1)
    })

    it("⚠️ rien avant le seuil, et une seule fois", () => {
        expect(pops(DEX_WISH_POP_INDEX - 2).armes.every((a) => a === undefined)).toBe(true)
        expect(pops(DEX_WISH_POP_INDEX + 8).armes.filter(Boolean)).toHaveLength(1)
    })

    it("l'armement porte le NIVEAU figé à l'annonce", () => {
        let st = announceDex(freshDexWish(), J, resolveDexChoice(204, DEX, new Set(["galijah"])), NIV)
        let arm: { speciesId: string; level: number } | undefined
        for (let i = 0; i < DEX_WISH_POP_INDEX; i++) {
            const r = countPopForDexWish(st, J, true); st = r.state
            if (r.arm) arm = r.arm
        }
        expect(arm).toEqual({ speciesId: MISSINGNO_ID, level: MISSINGNO_LEVEL })
    })
})

describe("une annonce ne se perd jamais en silence", () => {
    it("⚠️ canal de rencontre forcée OCCUPÉ : on patiente et on retente (la journée est déjà payée)", () => {
        let st = announceDex(freshDexWish(), J, resolveDexChoice(7, DEX, DISPO), NIV)
        for (let i = 0; i < DEX_WISH_POP_INDEX - 2; i++) st = countPopForDexWish(st, J, true).state

        const bloque = countPopForDexWish(st, J, false)
        expect(bloque.arm).toBeUndefined()
        expect(bloque.state.speciesId).toBe("gekroc") // TOUJOURS en attente

        const libre = countPopForDexWish(bloque.state, J, true)
        expect(libre.arm?.speciesId).toBe("gekroc")
    })

    it("⚠️ la 7e annonce vide les charges mais DOIT encore être honorée", () => {
        let st = freshDexWish(1) // dernière journée
        st = announceDex(st, J, resolveDexChoice(7, DEX, DISPO), NIV)
        expect(st.charges).toBe(0)
        expect(dexWishActive(st)).toBe(false) // plus de journée…
        let arm: string | undefined
        for (let i = 0; i < DEX_WISH_POP_INDEX; i++) {
            const r = countPopForDexWish(st, J, true); st = r.state
            if (r.arm) arm = r.arm.speciesId
        }
        expect(arm).toBe("gekroc") // …mais la promesse du jour est tenue
    })

    it("changement de jour : l'annonce périme (la journée reste débitée, elle ne se reporte pas)", () => {
        let st = announceDex(freshDexWish(), J, resolveDexChoice(7, DEX, DISPO), NIV)
        for (let i = 0; i < 5; i++) st = countPopForDexWish(st, J, true).state
        const demain = countPopForDexWish(st, "2026-10-03", true)
        expect(demain.arm).toBeUndefined()
        expect(demain.state.speciesId).toBe("")
        expect(demain.state.charges).toBe(DEX_WISH_DEFAULT_CHARGES - 1)
        expect(canAnnounceToday(demain.state, "2026-10-03")).toBe(true)
    })

    it("sans annonce en cours, les pops sont comptés mais rien n'est armé", () => {
        let st = freshDexWish()
        for (let i = 0; i < 20; i++) {
            const r = countPopForDexWish(st, J, true); st = r.state
            expect(r.arm).toBeUndefined()
        }
        expect(st.charges).toBe(DEX_WISH_DEFAULT_CHARGES)
    })
})
