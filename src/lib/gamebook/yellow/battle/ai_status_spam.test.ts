import { describe, it, expect } from "vitest"
import { chooseAiAction } from "./ai"
import { toBattleMon } from "./engine"
import { createMonInstance } from "./factory"
import { Rng } from "./rng"

// ANTI-SOFTLOCK IA (toutes les IA) : (a) ne jamais choisir un statut INUTILE (stat déjà au plafond / statut déjà posé) ;
// (b)+(c) pas plus de 6 statuts d'affilée → 7e tour = coup offensif forcé (≥ 1 coup / 7 tours). Fixe le « Jet de Sable
// à l'infini » du Goatiny d'Ananas. moveIds : 0 = jet_de_sable (acc −1), 1 = charge (offensif NORMAL).
const mon = (speciesId: string, level: number, moveIds: string[]) =>
    toBattleMon(createMonInstance(speciesId, level, { moveIds, owned: false }))

describe("IA anti-softlock — attaques de statut", () => {
    it("(a) statut INUTILE (précision cible déjà à −6) → l'IA prend le coup offensif, pas le statut", () => {
        const self = mon("goatiny", 20, ["jet_de_sable", "charge"])
        const foe = mon("razmaree", 20, ["charge"]) // EAU, neutre au NORMAL → charge fait des dégâts
        foe.stages.acc = -6 // plancher : Jet de Sable ne sert plus à rien
        const choice = chooseAiAction(self, foe, [self], 0, "trainer", new Rng(1))
        expect(choice.kind).toBe("move")
        expect(choice.moveIndex).toBe(1) // charge, PAS jet_de_sable (0)
    })

    it("(b/c) 6 statuts d'affilée → 7e = coup offensif FORCÉ (même quand le statut serait 'préféré')", () => {
        const self = mon("goatiny", 40, ["jet_de_sable", "charge"])
        const foe = mon("sporbeo", 40, ["charge"]) // SPECTRE → immunisé au NORMAL → statut naturellement préféré
        foe.stages.acc = 0
        self.aiStatusStreak = 6
        const choice = chooseAiAction(self, foe, [self], 0, "trainer", new Rng(1))
        expect(choice.moveIndex).toBe(1) // charge forcé
        expect(self.aiStatusStreak).toBe(0) // série remise à zéro (coup offensif)
    })

    it("la série de statuts s'incrémente à chaque statut consécutif", () => {
        const self = mon("goatiny", 40, ["jet_de_sable", "charge"])
        const foe = mon("sporbeo", 40, ["charge"]) // charge immunisé → statut préféré tant que streak < 6
        foe.stages.acc = 0
        chooseAiAction(self, foe, [self], 0, "trainer", new Rng(1))
        expect(self.aiStatusStreak).toBe(1)
        chooseAiAction(self, foe, [self], 0, "trainer", new Rng(1))
        expect(self.aiStatusStreak).toBe(2)
    })
})

// AUTO-BUFF EN PURE PERTE (plainte : « focalisation alors qu'il va se faire tuer ») — l'IA préfère FRAPPER plutôt que
// de se mettre en place quand ça ne sert à rien. moveIds : 0 = focalisation (auto-buff Spé), 1 = charge (offensif).
describe("IA — pas de Focalisation en pure perte", () => {
    it("PV pleins : un auto-buff ne passe PAS devant une vraie attaque (dresseur)", () => {
        const self = mon("goatiny", 30, ["focalisation", "charge"])
        const foe = mon("razmaree", 30, ["charge"]) // EAU, neutre au NORMAL → charge fait des dégâts
        const choice = chooseAiAction(self, foe, [self], 0, "trainer", new Rng(1))
        expect(choice.kind).toBe("move")
        expect(choice.moveIndex).toBe(1) // charge, PAS focalisation (0)
    })

    it("bas PV (<50 %) : jamais de Focalisation — on frappe (on tomberait avant d'en profiter)", () => {
        const self = mon("goatiny", 30, ["focalisation", "charge"])
        self.currentHp = 3 // bien sous 50 % PV
        const foe = mon("razmaree", 30, ["charge"])
        const choice = chooseAiAction(self, foe, [self], 0, "trainer", new Rng(1))
        expect(choice.moveIndex).toBe(1) // charge
    })

    it("miroir/boss (hof) bas PV : préfère frapper plutôt que se buffer", () => {
        const self = mon("goatiny", 30, ["focalisation", "charge"])
        self.currentHp = 3
        const foe = mon("razmaree", 30, ["charge"])
        const choice = chooseAiAction(self, foe, [self], 0, "hof", new Rng(1))
        expect(choice.kind).toBe("move")
        expect(choice.moveIndex).toBe(1)
    })
})
