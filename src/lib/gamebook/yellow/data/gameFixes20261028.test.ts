import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { speciesAtLevel, npcSpeciesAtLevel, baseSpeciesOf, buildAceTeam, bestCounter } from "./ace"
import { existingNemesisBase } from "../create/nemesisArchitect"
import { customStarterSpeciesId } from "../create/customSpecies"
import { runSpawnableSpecies, runObtainableSpecies, captureGuide } from "./encounters"
import { fusionSynergy, synergyPairName } from "./fusionSpecies"
import { PERMANENT_OFF_DEX_SPECIES } from "./species"
import { formsAtLevel } from "../frontier/engine"
import { applyServerSave } from "../store/saveManager"
import { getNgplusNemesisSpeciesId, reregisterCustomDaemons } from "../store/playerStore"
import { emptySave } from "../storage/save"
import { POKE_TYPES, type MonInstance, type PokeType } from "../battle/types"

// Sartay, 28/10/2026 : « vas-y, règle » — les cinq défauts de jeu trouvés par les revues du jour, plus « Pyrozly est un ours
// aussi : il devrait faire partie de la synergie avec les deux ours ».
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")
const mon = (uid: string, speciesId: string, level: number): MonInstance =>
    ({ uid, speciesId, level, exp: 0, ivs: { hp: 15, atk: 15, def: 15, spe: 15, spc: 15 }, currentHp: 1, status: "NONE", statusCounter: 0, moves: [{ moveId: "charge", pp: 35, ppMax: 35 }], owned: true })

describe("1. les PNJ font leurs évolutions par échange (ACE n'est plus bloqué sur Roctaur)", () => {
    const rocheTyping = ((): PokeType[] => {
        for (const a of POKE_TYPES) { if (bestCounter([a]) === "rochison") return [a]; for (const b of POKE_TYPES) if (a !== b && bestCounter([a, b]) === "rochison") return [a, b] }
        throw new Error("aucun typage contré par Rochison")
    })()
    const counterAt = (aceLevel: number) => buildAceTeam({ aceLevel, playerLastTypes: rocheTyping, badgeCount: 5 }).team[5].speciesId
    it("le contre d'ACE est Roctaur jusqu'au niveau 35, Rochison dès le niveau 36", () => {
        expect(counterAt(20)).toBe("cailloutchi")
        expect(counterAt(35)).toBe("roctaur")
        expect(counterAt(36)).toBe("rochison")
        expect(counterAt(100)).toBe("rochison")
    })
    it("au moins 10 niveaux après le stade : Aquilothan (atteint au 36) devient Aquilord au 46", () => {
        const base = baseSpeciesOf("aquilord")
        expect(npcSpeciesAtLevel(base, 45)).toBe("aquilothan")
        expect(npcSpeciesAtLevel(base, 46)).toBe("aquilord")
    })
    it("jamais pour les sauvages ; la Zone de Combat voit Rochison à la place de Roctaur dès 36", () => {
        expect(speciesAtLevel(baseSpeciesOf("rochison"), 100)).toBe("roctaur")
        expect(formsAtLevel(50)).toContain("rochison")
        expect(formsAtLevel(50)).not.toContain("roctaur")
    })
    it("câblage : Défi Némésis, clones du Voleur, Archiviste, Ananas, entraînement de clan passent par la règle des PNJ", () => {
        expect(read("src/lib/gamebook/yellow/data/nemesisChallenge.ts")).toContain("const counterId = npcSpeciesAtLevel(counterBase, m.level)")
        expect(read("src/lib/gamebook/yellow/data/thief.ts")).toContain("const counterId = npcSpeciesAtLevel(baseSpeciesOf(bestCounter([...sp.types])), m.level)")
        expect(read("src/lib/gamebook/yellow/data/collectionneurNpc.ts")).toContain("const staged = npcSpeciesAtLevel(baseSpeciesOf(id), level)")
        expect(read("src/lib/gamebook/yellow/data/ananas.ts")).toContain("const speciesId = npcSpeciesAtLevel(baseSpeciesOf(base), lvl)")
        expect(read("src/lib/gamebook/yellow/store/battleStore.ts")).toContain("const speciesId = npcSpeciesAtLevel(baseId, lvl)")
    })
})

describe("2. la lignée Mottoche va jusqu'à Mégalithe", () => {
    it("Diamantine au 49, Amadiam au 50, Golémini au 63, Mégalithe au 80 ; la souche de Mégalithe est Mottoche", () => {
        expect(speciesAtLevel("mottoche", 49)).toBe("diamantine")
        expect(speciesAtLevel("mottoche", 50)).toBe("amadiam")
        expect(speciesAtLevel("mottoche", 63)).toBe("golemini")
        expect(speciesAtLevel("mottoche", 80)).toBe("megalithe")
        expect(baseSpeciesOf("megalithe")).toBe("mottoche")
    })
    it("les sauvages (niveau 40 au plus) ne changent pas", () => {
        expect(speciesAtLevel("mottoche", 40)).toBe("diamantine")
    })
    it("les némésis d'ACE restent celles d'avant (lignée Mottoche exclue : sinon 29 typages sur 171 basculaient)", () => {
        const stats = { hp: 80, atk: 80, def: 80, spe: 80, spc: 80 }
        const nem = (types: PokeType[]) => existingNemesisBase({ name: "Test", types, stats })
        expect(nem(["VOL"])).toBe("marmoterre")
        expect(nem(["FEU", "VOL"])).toBe("lavapetit")
        expect(nem(["VOL", "ROCHE"])).toBe("tetardoc")
        for (const a of POKE_TYPES) expect(baseSpeciesOf(nem([a]) ?? "x")).not.toBe("mottoche")
    })
})

describe("3. la némésis du run 2 vient de la création du joueur", () => {
    it("un autre Daemon hors Pokédex en tête (Ukognofy) ne fait plus retomber ACE sur Nouillon", () => {
        const stored = {
            ownerId: "joueur-test",
            spec: {
                name: "Chadine", da: "Un animal marin.", daFinal: "Un combattant.", character: "Nerveux",
                role: "attaquant-phys", curve: "linear", stages: 3, bloomer: "mid", attributes: ["massif"],
                finalTypes: ["EAU", "COMBAT"], finalStats: { hp: 75, atk: 130, def: 70, spc: 49, spe: 90 },
                learnset: [{ level: 5, moveId: "pistolet_a_o" }, { level: 24, moveId: "coup_d_boule" }],
            },
        }
        const offDex = PERMANENT_OFF_DEX_SPECIES[PERMANENT_OFF_DEX_SPECIES.length - 1].id
        applyServerSave({ ...emptySave(), reps: 100, repsCap: 5000, repsBankedTotal: 0, customDaemons: [stored as never], team: [mon("u1", offDex, 50), mon("c1", customStarterSpeciesId(stored as never), 30)] })
        reregisterCustomDaemons()
        const expected = existingNemesisBase({ name: "Chadine", types: ["EAU", "COMBAT"], stats: stored.spec.finalStats })
        expect(expected).toBeTruthy()
        expect(getNgplusNemesisSpeciesId()).toBe(expected)
    })
})

describe("4 et 5. avant le réveil de Sylvebarbe : ni vœu du numéro ni Daemomaniaque n'annoncent les Daemons d'après", () => {
    it("Coucouminou n'est ni « apparaissant » ni « obtenable » avant Sylvebarbe, et l'est après", () => {
        expect(runSpawnableSpecies(1, false, true).has("coucouminou")).toBe(false)
        expect(runSpawnableSpecies(1, false, false).has("coucouminou")).toBe(true)
        expect(runObtainableSpecies(4, true, true).has("coucouminou")).toBe(false)
        expect(runObtainableSpecies(4, true).has("coucouminou")).toBe(true)
    })
    it("la fiche du Daemomaniaque n'annonce pas Coucouminou avant Sylvebarbe, et l'annonce après", () => {
        expect(captureGuide("coucouminou", 1, false, true, false, false, true).where).toEqual([])
        expect(captureGuide("coucouminou", 1, false, true, false, false).where.length).toBeGreaterThan(0)
    })
    it("câblage : le vœu et le Daemomaniaque passent l'état de Sylvebarbe", () => {
        const wish = read("src/app/gamebook/yellow/DexWishModal.tsx")
        expect(wish).toContain("const preSylvebarbe = run === 1 && !getPlayer().sylvebarbeAwake")
        expect(wish).toContain("spawnable: runSpawnableSpecies(run, hideEndgame, preSylvebarbe)")
        const dm = read("src/app/gamebook/yellow/DaemomaniaquePanel.tsx")
        expect(dm).toContain("const preSylvebarbe = mode === \"run4\" && !player.sylvebarbeAwake ? true : undefined")
        expect(dm).toContain("runObtainableSpecies(availRun, endgame, preSylvebarbe)")
        expect(dm.split("getGameMode() === \"fun\", preSylvebarbe)").length - 1).toBe(2)
    })
})

describe("Pyrozly rejoint la synergie des ursidés", () => {
    it("Pyrozly × Iorours et Pyrozly × Druidours : même synergie, noms sur mesure ; la paire d'origine garde sa clé", () => {
        expect(fusionSynergy("pyrozly", "iorours")?.label).toBe("la synergie des ursidés")
        expect(fusionSynergy("druidours", "pyrozly")?.label).toBe("la synergie des ursidés")
        expect(synergyPairName("iorours", "pyrozly")).toBe("Iorzly")
        expect(synergyPairName("pyrozly", "druidours")).toBe("Pyrodruide")
        expect(fusionSynergy("iorours", "druidours")?.key).toBe("pair:druidours|iorours")
    })
})
