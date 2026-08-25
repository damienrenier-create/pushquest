import { describe, it, expect } from "vitest"
import { chooseAiAction } from "./ai"
import { toBattleMon } from "./engine"
import { createMonInstance } from "./factory"
import { Rng } from "./rng"

// PILOTE D'ARCHÉTYPE générique (mur-sweepers / stallers) : détecte les rôles des moves ÉQUIPÉS et applique une
// échelle commune (finir > soin > esquive > usure/statut > graine > neutraliser > setup > snowball). Whitelist
// d'espèces. Moves imposés → on contrôle le kit. Foe à 9999 PV = pas de KO possible (on teste bien la mise en place).
const mon = (id: string, lvl: number, moves: string[]) => toBattleMon(createMonInstance(id, lvl, { moveIds: moves, owned: false }))
const SPEC = "divinpate" // PSY spc120 > atk68 → attaquant SPÉCIAL (donc « safe » pour un mur : pas une menace physique)

describe("Pilote d'archétype — setup / usure / win-con", () => {
    it("MégamonarX (physique) face à un spécial sûr : monte l'Attaque (Danse-Lames)", () => {
        const self = mon("megamonarx", 80, ["danse_lames", "charge"])
        const foe = mon(SPEC, 80, ["charge"]); foe.currentHp = 9999
        expect(chooseAiAction(self, foe, [self], 0, "hof", new Rng(1))).toEqual({ kind: "move", moveIndex: 0 })
    })

    it("MégamonarX à BAS PV (<50 %) : NE se met PLUS en place → attaque au lieu de Danse-Lames (fix plainte reflet)", () => {
        const self = mon("megamonarx", 80, ["danse_lames", "charge"]); self.currentHp = 50 // frac très < 0.5
        const foe = mon(SPEC, 80, ["charge"]); foe.currentHp = 9999
        expect(chooseAiAction(self, foe, [self], 0, "hof", new Rng(1))).toEqual({ kind: "move", moveIndex: 1 }) // Charge, PAS Danse-Lames
    })

    it("Ukognos (spécial) face à un spécial sûr : monte le Spécial (Focalisation)", () => {
        const self = mon("ukognos", 80, ["focalisation", "eclat_lunaire"])
        const foe = mon(SPEC, 80, ["charge"]); foe.currentHp = 9999
        expect(chooseAiAction(self, foe, [self], 0, "hof", new Rng(1))).toEqual({ kind: "move", moveIndex: 0 })
    })

    it("Merorem : pose Toxik sur un foe frais et empoisonnable (usure prioritaire sur l'attaque)", () => {
        const self = mon("merorem", 80, ["toxik", "charge"])
        const foe = mon("razmaree", 80, ["charge"]); foe.currentHp = 9999 // EAU (empoisonnable), frais, sans statut
        expect(chooseAiAction(self, foe, [self], 0, "hof", new Rng(1))).toEqual({ kind: "move", moveIndex: 0 })
    })

    it("Merorem : ne re-Toxik PAS un foe déjà empoisonné → pose Vampigraine (2e horloge)", () => {
        const self = mon("merorem", 80, ["toxik", "vampigraine", "charge"])
        const foe = mon("razmaree", 80, ["charge"]); foe.currentHp = 9999; foe.status = "TOXIC"
        expect(chooseAiAction(self, foe, [self], 0, "hof", new Rng(1))).toEqual({ kind: "move", moveIndex: 1 })
    })

    it("Karmaki (Patience, dynamicPower bas-PV) : à bas PV, NE se repose PAS — les PV bas sont l'arme", () => {
        const self = mon("karmaki", 80, ["patience", "repos"]); self.currentHp = 30 // frac < 0.5
        const foe = mon(SPEC, 80, ["charge"]); foe.currentHp = 9999
        expect(chooseAiAction(self, foe, [self], 0, "hof", new Rng(1))).toEqual({ kind: "move", moveIndex: 0 }) // Patience, PAS Repos
    })

    it("Glouta-maki (kit complet) : Vampigraine en OUVERTURE quand il est en forme (PV hauts, foe frais)", () => {
        const self = mon("karmaki", 80, ["patience", "tempete_verte", "vampigraine", "repos"]) // PV pleins
        const foe = mon(SPEC, 80, ["charge"]); foe.currentHp = 9999
        expect(chooseAiAction(self, foe, [self], 0, "hof", new Rng(1))).toEqual({ kind: "move", moveIndex: 2 }) // Vampigraine posée en ouverture
    })

    it("Glouta-maki à BAS PV : ne pose PLUS Vampigraine → lâche Patience (bug run argent : graine à quelques PV)", () => {
        const self = mon("karmaki", 80, ["patience", "tempete_verte", "vampigraine", "repos"]); self.currentHp = 30 // frac < 0.5
        // Foe COMBAT (Forgeotin) : Patience (PSY) le frappe ×2 → à bas PV (~150 de base ×2) elle domine Tempête Verte.
        const foe = mon("forgeotin", 80, ["charge"]); foe.currentHp = 9999 // non-SEEDED
        const act = chooseAiAction(self, foe, [self], 0, "hof", new Rng(1))
        expect(act).toEqual({ kind: "move", moveIndex: 0 }) // Patience, surtout PAS Vampigraine (index 2)
    })

    it("un mur au kit banal (aucune mécanique spéciale) retombe sur l'IA générique", () => {
        // Sylvebarbe est whitelisté, mais avec 2 attaques pures → chooseArchetypeMove renvoie null → IA générique
        //   choisit tout de même un coup (jamais de crash, jamais de switch).
        const self = mon("sylvebarbe", 80, ["charge", "tranche"])
        const foe = mon(SPEC, 80, ["charge"]); foe.currentHp = 9999
        expect(chooseAiAction(self, foe, [self], 0, "hof", new Rng(1)).kind).toBe("move")
    })
})
