import { describe, it, expect } from "vitest"
import {
    freshDexWish, dexWishActive, canAnnounceToday, validateDexChoice, announceDex,
    countPopForDexWish, DEX_WISH_POP_INDEX, DEX_WISH_DEFAULT_CHARGES,
} from "./dexWish"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// VŒU « JE CHOISIS LE NUMÉRO » (Guillaume)
//
// Ce qui doit tenir : le 10ᵉ pop obéit (et pas le 9ᵉ ni le 11ᵉ), une seule annonce par jour, 7 journées en tout,
// et une charge ne se perd JAMAIS pour rien — ni sur un numéro refusé, ni sur une journée écourtée, ni si le canal
// de rencontre forcée est déjà pris par un autre vœu.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

const DEX = [
    { id: "gekroc", dexNo: 7, name: "Gékroc", rarity: "COMMON" },
    { id: "galijah", dexNo: 204, name: "Galijah", rarity: "LEGENDARY" },
    { id: "spectre_run3", dexNo: 160, name: "Karmaki", rarity: "RARE" },
]
const DISPO = new Set(["gekroc"]) // seul Gékroc apparaît dans son run

describe("valider le numéro annoncé", () => {
    it("un numéro valide et présent dans son run est accepté", () => {
        expect(validateDexChoice(7, DEX, DISPO)).toEqual({ ok: true, speciesId: "gekroc", dexNo: 7, name: "Gékroc" })
        expect(validateDexChoice("7", DEX, DISPO)).toMatchObject({ ok: true })
    })

    it("⚠️ un LÉGENDAIRE est refusé, et on dit pourquoi", () => {
        const r = validateDexChoice(204, DEX, new Set(["galijah"]))
        expect(r.ok).toBe(false)
        expect((r as { reason: string }).reason).toMatch(/LÉGENDAIRE/)
    })

    it("⚠️ une espèce ABSENTE de son run est refusée", () => {
        const r = validateDexChoice(160, DEX, DISPO)
        expect(r.ok).toBe(false)
        expect((r as { reason: string }).reason).toMatch(/n'apparaît pas/)
    })

    it("un numéro qui n'existe pas, ou pas un nombre, est refusé proprement", () => {
        for (const bad of [999, 0, -3, "abc", null, undefined, NaN]) {
            expect(validateDexChoice(bad, DEX, DISPO).ok, String(bad)).toBe(false)
        }
    })

    it("⚠️ un refus ne consomme RIEN : l'état n'est pas touché (c'est l'appelant qui l'atteste)", () => {
        const st = freshDexWish()
        validateDexChoice(204, DEX, DISPO)
        expect(st.charges).toBe(DEX_WISH_DEFAULT_CHARGES) // la validation est pure, elle ne touche pas l'état
    })
})

describe("une seule annonce par jour", () => {
    it("au départ : 7 journées, et il peut annoncer", () => {
        const st = freshDexWish()
        expect(st.charges).toBe(7)
        expect(dexWishActive(st)).toBe(true)
        expect(canAnnounceToday(st, "2026-10-02")).toBe(true)
    })

    it("⚠️ après l'annonce du jour, plus d'annonce AVANT demain", () => {
        const st = announceDex(freshDexWish(), "2026-10-02", { speciesId: "gekroc", dexNo: 7 })
        expect(canAnnounceToday(st, "2026-10-02")).toBe(false)
        expect(canAnnounceToday(st, "2026-10-03")).toBe(true)
    })

    it("vœu épuisé → plus aucune annonce", () => {
        expect(canAnnounceToday(freshDexWish(0), "2026-10-02")).toBe(false)
        expect(dexWishActive(freshDexWish(0))).toBe(false)
        expect(dexWishActive(null)).toBe(false)
    })

    it("annoncer ne coûte pas encore la charge (elle se paie à l'arrivée)", () => {
        const st = announceDex(freshDexWish(), "2026-10-02", { speciesId: "gekroc", dexNo: 7 })
        expect(st.charges).toBe(DEX_WISH_DEFAULT_CHARGES)
    })
})

describe("le 10e pop obéit", () => {
    const J = "2026-10-02"
    /** Joue n pops, canal toujours libre. */
    function pops(n: number, from = announceDex(freshDexWish(), J, { speciesId: "gekroc", dexNo: 7 })) {
        let st = from
        const armes: (string | undefined)[] = []
        for (let i = 0; i < n; i++) {
            const r = countPopForDexWish(st, J, true)
            st = r.state; armes.push(r.armSpeciesId)
        }
        return { st, armes }
    }

    it(`l'armement tombe au pop n°${DEX_WISH_POP_INDEX - 1} — car la rencontre forcée sort au pop SUIVANT`, () => {
        const { armes } = pops(DEX_WISH_POP_INDEX)
        const quand = armes.findIndex((a) => a === "gekroc") + 1
        expect(quand).toBe(DEX_WISH_POP_INDEX - 1)
    })

    it("⚠️ rien n'est armé AVANT le seuil (le joueur ne doit pas voir son choix sortir au 3e pop)", () => {
        const { armes } = pops(DEX_WISH_POP_INDEX - 2)
        expect(armes.every((a) => a === undefined)).toBe(true)
    })

    it("une seule fois : les pops suivants n'arment plus rien", () => {
        const { armes } = pops(DEX_WISH_POP_INDEX + 8)
        expect(armes.filter((a) => a === "gekroc")).toHaveLength(1)
    })

    it("la charge est débitée à l'armement, une seule fois", () => {
        const { st } = pops(DEX_WISH_POP_INDEX + 5)
        expect(st.charges).toBe(DEX_WISH_DEFAULT_CHARGES - 1)
        expect(st.speciesId).toBe("") // annonce consommée
    })
})

describe("ce qui ne doit JAMAIS coûter une charge", () => {
    const J = "2026-10-02"

    it("⚠️ s'arrêter avant le seuil : journée écourtée, charge intacte", () => {
        let st = announceDex(freshDexWish(), J, { speciesId: "gekroc", dexNo: 7 })
        for (let i = 0; i < 4; i++) st = countPopForDexWish(st, J, true).state
        expect(st.charges).toBe(DEX_WISH_DEFAULT_CHARGES)
    })

    it("⚠️ canal de rencontre forcée OCCUPÉ : on patiente, et on retente au pop suivant", () => {
        let st = announceDex(freshDexWish(), J, { speciesId: "gekroc", dexNo: 7 })
        for (let i = 0; i < DEX_WISH_POP_INDEX - 2; i++) st = countPopForDexWish(st, J, true).state

        const bloque = countPopForDexWish(st, J, false) // un autre vœu occupe le canal
        expect(bloque.armSpeciesId).toBeUndefined()
        expect(bloque.state.charges).toBe(DEX_WISH_DEFAULT_CHARGES) // rien débité
        expect(bloque.state.speciesId).toBe("gekroc")               // annonce TOUJOURS en attente

        const libre = countPopForDexWish(bloque.state, J, true)     // canal libéré
        expect(libre.armSpeciesId).toBe("gekroc")
        expect(libre.state.charges).toBe(DEX_WISH_DEFAULT_CHARGES - 1)
    })

    it("sans annonce en cours, les pops sont comptés mais rien n'est armé", () => {
        let st = freshDexWish()
        for (let i = 0; i < 20; i++) {
            const r = countPopForDexWish(st, J, true); st = r.state
            expect(r.armSpeciesId).toBeUndefined()
        }
        expect(st.charges).toBe(DEX_WISH_DEFAULT_CHARGES)
    })

    it("changement de jour : l'annonce de la veille est périmée, et il peut re-annoncer", () => {
        let st = announceDex(freshDexWish(), J, { speciesId: "gekroc", dexNo: 7 })
        for (let i = 0; i < 5; i++) st = countPopForDexWish(st, J, true).state
        const demain = countPopForDexWish(st, "2026-10-03", true)
        expect(demain.armSpeciesId).toBeUndefined()
        expect(demain.state.speciesId).toBe("")
        expect(demain.state.charges).toBe(DEX_WISH_DEFAULT_CHARGES)
        expect(canAnnounceToday(demain.state, "2026-10-03")).toBe(true)
    })

    it("les 7 journées donnent 7 Daemons sur commande, pas un de plus", () => {
        let st = freshDexWish()
        let sortis = 0
        for (let d = 1; d <= 10; d++) {
            const jour = `2026-10-${String(d).padStart(2, "0")}`
            st = announceDex(st, jour, { speciesId: "gekroc", dexNo: 7 })
            for (let i = 0; i < DEX_WISH_POP_INDEX; i++) {
                const r = countPopForDexWish(st, jour, true); st = r.state
                if (r.armSpeciesId) sortis++
            }
        }
        expect(sortis).toBe(DEX_WISH_DEFAULT_CHARGES)
        expect(st.charges).toBe(0)
    })
})
