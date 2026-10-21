import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { auditSaveVisuals, generatedReadyIds, isPlaceholderSprite } from "./visualAudit"
import { SPECIES } from "./species"
import { dexLore } from "./dexLore"
import { existingNemesisBase } from "../create/nemesisArchitect"
import { speciesAtLevel } from "./ace"
import { POKE_TYPES, type PokeType } from "../battle/types"

// « Plus jamais de MissingNo » (22/10/2026, après Caros, la némésis de Kingme).
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")
// La Chadine de Kingme (création canonisée depuis) : sa némésis générée a été léguée par ACE avant le 22/10.
const CHADINE = {
    ownerId: "cmuhdss6u0003lcgqs3kcm6mp",
    spec: {
        name: "Chadine", da: "Un animal marin, mi orque mi hippopotame.", daFinal: "Un combattant très musclé.", character: "Nerveux mais très agile",
        role: "attaquant-phys", curve: "linear", stages: 3, bloomer: "mid", attributes: ["massif", "muscles"],
        finalTypes: ["EAU", "COMBAT"], finalStats: { hp: 75, atk: 130, def: 70, spc: 49, spe: 90 },
        learnset: [{ level: 5, moveId: "pistolet_a_o" }, { level: 24, moveId: "coup_d_boule" }, { level: 36, moveId: "frappe_cavitation" }],
    },
}

describe("audit d'affichage d'une save", () => {
    it("Daemons officiels : rien à signaler", () => {
        expect(auditSaveVisuals({ team: [{ speciesId: "feuillichot", level: 5 }], pc: [{ speciesId: "pantheon", level: 30 }] })).toEqual([])
    })
    it("espèce inconnue → « espèce introuvable » ; création sans sprite → « sans sprite »", () => {
        const pbs = auditSaveVisuals({ team: [{ speciesId: "pas_une_espece", level: 5 }], ngplusWorld: { pc: [{ speciesId: "custom_x_y_s1", level: 5 }] } })
        expect(pbs.map((p) => p.reason)).toEqual(["espèce introuvable", "espèce introuvable"])
        const sansSprite = auditSaveVisuals({ customDaemons: [{ ownerId: "quelquun", spec: { ...CHADINE.spec, name: "Inedit" } }], team: [{ speciesId: "custom_quelquun_inedit_s1", level: 5 }] })
        expect(sansSprite).toEqual([{ speciesId: "custom_quelquun_inedit_s1", name: "Inedit", where: "run 1, équipe", reason: "sans sprite" }])
        // …sauf si un sprite généré est prêt (table FusionSprite)
        expect(auditSaveVisuals({ customDaemons: [{ ownerId: "quelquun", spec: { ...CHADINE.spec, name: "Inedit" } }], team: [{ speciesId: "custom_quelquun_inedit_s1", level: 5 }] }, generatedReadyIds(["custom:custom_quelquun_inedit_s1"]))).toEqual([])
    })
    it("Caros (Némésis de Chadine III, run 2) : espèce reconstruite, vrai sprite, et une fiche", () => {
        const save = { customDaemons: [CHADINE], ngplusWorld: { team: [{ speciesId: "custom_nemcmuhdss6u0003_nemesisdechadine_s3", level: 47, nickname: "Caros" }] } }
        expect(auditSaveVisuals(save)).toEqual([])
        expect(dexLore("custom_nemcmuhdss6u0003_nemesisdechadine_s3")?.ecology).toContain("Chadine")
        for (const f of ["nem_chadine1", "nem_chadine2", "nem_chadine3", "nem_dracominus1", "nem_dracominus2", "nem_dracominus3"]) {
            expect(fs.existsSync(path.join(process.cwd(), "public/yellow/sprites/dex", `${f}.png`)), f).toBe(true)
        }
    })
    it("generatedReadyIds lit les clés fusevo: et custom:", () => {
        expect([...generatedReadyIds(["fusevo:roctobrute", "custom:custom_a_b_s2", "tauricendre__zappeureal"])]).toEqual(["roctobrute", "custom_a_b_s2"])
        expect(isPlaceholderSprite("/yellow/sprites/dex/missingno.png")).toBe(true)
    })
})

describe("les causes à la source", () => {
    it("toute espèce officielle a un vrai sprite sur le disque", () => {
        for (const s of Object.values(SPECIES)) {
            expect(isPlaceholderSprite(s.sprite), s.id).toBe(false)
            expect(fs.existsSync(path.join(process.cwd(), "public", s.sprite!)), `${s.id} : ${s.sprite}`).toBe(true)
        }
    })
    it("la némésis d'ACE est toujours une espèce EXISTANTE avec sprite, quel que soit le typage de la création", () => {
        const stats = { hp: 80, atk: 100, def: 80, spe: 90, spc: 70 }
        const types = POKE_TYPES.filter((t) => t !== "FEE") as PokeType[]
        for (const a of types) for (const b of [undefined, ...types]) {
            if (b === a) continue
            const base = existingNemesisBase({ types: b ? [a, b] : [a], stats })
            if (!base) continue // aucun contre trouvable : ACE garde sa lignée par défaut
            for (const lv of [10, 40, 70]) {
                const sp = SPECIES[speciesAtLevel(base, lv)]
                expect(sp, `${a}/${b} niv ${lv}`).toBeTruthy()
                expect(isPlaceholderSprite(sp.sprite), `${a}/${b} → ${sp.id}`).toBe(false)
                expect(sp.types.includes("FEE"), `${a}/${b} → ${sp.id}`).toBe(false)
            }
        }
    })
    it("le jeu ne crée plus de némésis générée, ré-enregistre les anciennes, et ACE lègue un Panthéon", () => {
        const ps = read("src/lib/gamebook/yellow/store/playerStore.ts")
        expect(ps).toContain("return existingNemesisBase({ name: stored.spec.name")
        expect(ps).toContain("registerCustomSpecies(buildCustomSpecies(buildNemesis(d.spec), `nem_${d.ownerId}`))")
        expect(read("src/lib/gamebook/yellow/store/battleStore.ts")).toContain("const giftId = \"pantheon\"")
        expect(read("src/app/api/dashboard/route.ts")).toContain("auditSaveVisuals(")
    })
})
