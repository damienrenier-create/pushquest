import { describe, it, expect } from "vitest"
import { giftNoteLines, giftNotePlacement, GIFT_NOTE_NPC, GIFT_NOTE_MAX_LINES } from "./energyGiftNote"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// LE PETIT MOT DU DIEU SPAGHETTI (cadeau d'énergie du créateur)
//
// Deux risques à couvrir. (1) Un mot mal formé ne doit JAMAIS produire une réplique vide : une boîte de dialogue
// sans texte bloque l'écran. (2) showDialogue ÉCRASE la réplique en cours — le mot ne doit donc ni couper la parole
// à un autre PNJ, ni se faire écraser en silence, puisqu'il est consommé (one-shot) une fois affiché.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

describe("découpage du mot en répliques", () => {
    it("une ligne par réplique, les lignes vides sautent", () => {
        expect(giftNoteLines("Bonjour !\n\n  Tiens, un cadeau.  \n")).toEqual(["Bonjour !", "Tiens, un cadeau."])
    })

    it("un mot d'une seule ligne donne une seule réplique", () => {
        expect(giftNoteLines("« Tu es quelqu'un de bien. »")).toEqual(["« Tu es quelqu'un de bien. »"])
    })

    it("⚠️ rien d'exploitable → tableau VIDE (le client n'ouvre alors aucune boîte)", () => {
        for (const bad of [null, undefined, "", "   ", "\n\n\n", 42, {}, []]) {
            expect(giftNoteLines(bad), String(bad)).toEqual([])
        }
    })

    it("un mot fleuve est borné, pas tronqué au milieu d'une phrase", () => {
        const lines = giftNoteLines(Array.from({ length: 30 }, (_, i) => `ligne ${i + 1}`).join("\n"))
        expect(lines).toHaveLength(GIFT_NOTE_MAX_LINES)
        expect(lines[0]).toBe("ligne 1")
        expect(lines.at(-1)).toBe(`ligne ${GIFT_NOTE_MAX_LINES}`)
    })

    it("les apostrophes et accents traversent intacts (le texte est écrit en français)", () => {
        expect(giftNoteLines("« C'est à toi que j'pense, héros ! »")).toEqual(["« C'est à toi que j'pense, héros ! »"])
    })
})

describe("placement : à qui le mot a-t-il le droit de couper la parole ?", () => {
    it("personne ne parle → il s'affiche", () => {
        expect(giftNotePlacement(null)).toBe("show")
        expect(giftNotePlacement(undefined)).toBe("show")
        expect(giftNotePlacement("")).toBe("show")
    })

    it("le Dieu Spaghetti parle déjà (drip des hauts faits) → on AJOUTE, même personnage", () => {
        expect(giftNotePlacement(GIFT_NOTE_NPC)).toBe("append")
    })

    it("⚠️ un AUTRE PNJ parle → on DIFFÈRE : ni écrasement de sa réplique, ni mot perdu", () => {
        for (const other of ["spaghetti_dream", "y_ligue_lance", "y_sbire", "n'importe_qui"]) {
            expect(giftNotePlacement(other), other).toBe("defer")
        }
    })
})
