import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import {
    GEM_CHIMERA_ID, GEM_CHIMERA_RIDDLE, MEGAMONARX_CLUE_LINES, MEGAMONARX_CLUE_TOTAL,
    isGemChimeraPair, megamonarxClueContext, megamonarxClues, megamonarxClueCount, gemChimeraAltarLine,
} from "./megamonarxClues"
import { leagueFusionId } from "./leagueFusionDex"
import { FUSION_LEAGUE } from "./fusionLeague"
import { getSpecies } from "./species"
import { getTrainer } from "./trainers"
import { LEAGUE_FUSION_DESC } from "./leagueFusionDesc"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// 🐉🪨 MÉGAMONARX — L'ENQUÊTE (19/10/2026). « L'indice est trop difficile à trouver » : l'unique indice vivait sur une
// fiche inatteignable. Échelle de 4 indices débloqués par le jeu réel, sans jamais écrire la recette en clair.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

const NONE = { markers: [] as string[], seen: [] as string[], fusionHistory: [] as { a: string; b: string }[] }
const BANNED = ["Draconarque", "Mégalithe", "Megalithe", "MégamonarX", "Mégamonarx", "Dracolithe", "niv 100", "niveau 100"]

describe("la chimère-clé", () => {
    it("GEM_CHIMERA_ID = l'id réel de Dracolithe au Fusiodex, et c'est bien Draconarque × Mégalithe chez LANCE", () => {
        expect(GEM_CHIMERA_ID).toBe(leagueFusionId("Dracolithe"))
        const lance = FUSION_LEAGUE.find((t) => t.key === "lance")!
        const gem = lance.pairs.find((p) => p.name === "Dracolithe")!
        expect(isGemChimeraPair(gem.a, gem.b)).toBe(true)
    })
    it("« le dragon devenu diamant » désigne UNE seule chimère de LANCE (sa fiche est VOL/ROCHE comme Chronosidhe : « pierre » serait ambigu)", () => {
        const lance = FUSION_LEAGUE.find((t) => t.key === "lance")!
        const diamond = lance.pairs.filter((p) => (LEAGUE_FUSION_DESC[leagueFusionId(p.name)] ?? "").toLowerCase().includes("diamant"))
        expect(diamond.map((p) => p.name)).toEqual(["Dracolithe"])
        expect(MEGAMONARX_CLUE_LINES.gem).toContain("DIAMANT")
    })
    it("isGemChimeraPair : ordre indifférent, rien d'autre", () => {
        expect(isGemChimeraPair("megalithe", "draconarque")).toBe(true)
        expect(isGemChimeraPair("draconarque", "megalithe")).toBe(true)
        expect(isGemChimeraPair("draconarque", "goshendofy")).toBe(false)
        expect(isGemChimeraPair("megalithe", "megalithe")).toBe(false)
        expect(isGemChimeraPair(undefined, "megalithe")).toBe(false)
    })
})

describe("le contexte de l'enquête", () => {
    it("chaque indice a sa vraie condition", () => {
        expect(megamonarxClueContext(NONE)).toEqual({ reachedDome: false, sawGemChimera: false, fusionChampion: false, forgedIt: false, throneTier: false })
        expect(megamonarxClueContext({ ...NONE, markers: ["autel_visited"] }).reachedDome).toBe(true)
        expect(megamonarxClueContext({ ...NONE, seen: [GEM_CHIMERA_ID] }).sawGemChimera).toBe(true)
        expect(megamonarxClueContext({ ...NONE, markers: ["fusleague_bronze"] }).fusionChampion).toBe(true)
        expect(megamonarxClueContext({ ...NONE, markers: ["y_fusion_maitre"] }).fusionChampion).toBe(false) // marqueur de boss : purgé à chaque entrée
        expect(megamonarxClueContext({ ...NONE, fusionHistory: [{ a: "megalithe", b: "draconarque" }] }).forgedIt).toBe(true)
        expect(megamonarxClueContext({ ...NONE, fusionHistory: [{ a: "draconarque", b: "dracarlin" }] }).forgedIt).toBe(false)
    })
})

describe("l'échelle", () => {
    it("rien fait → aucun indice ; tout fait → les 4, dans l'ordre", () => {
        expect(megamonarxClues(megamonarxClueContext(NONE))).toEqual([])
        const all = megamonarxClueContext({ markers: ["autel_visited", "fusleague_bronze"], seen: [GEM_CHIMERA_ID], fusionHistory: [{ a: "draconarque", b: "megalithe" }] })
        expect(megamonarxClues(all)).toEqual([MEGAMONARX_CLUE_LINES.dome, MEGAMONARX_CLUE_LINES.gem, MEGAMONARX_CLUE_LINES.sacre, MEGAMONARX_CLUE_LINES.apogee])
        expect(megamonarxClueCount(all)).toBe(MEGAMONARX_CLUE_TOTAL)
    })
    it("indices indépendants : forgée sans être champion → l'indice ④ sans le ③", () => {
        const c = megamonarxClues(megamonarxClueContext({ ...NONE, fusionHistory: [{ a: "draconarque", b: "megalithe" }] }))
        expect(c).toEqual([MEGAMONARX_CLUE_LINES.apogee])
    })
    it("⚠️ ANTI-SPOILER : aucun nom (légendaire, chimère, parents), aucun niveau chiffré — dans TOUS les textes", () => {
        const texts = [...Object.values(MEGAMONARX_CLUE_LINES), GEM_CHIMERA_RIDDLE, gemChimeraAltarLine(50), gemChimeraAltarLine(100)]
        for (const t of texts) for (const b of BANNED) expect(t.includes(b), `« ${t.slice(0, 40)}… » contient « ${b} »`).toBe(false)
    })
    it("l'énigme du Fusiodex renvoie aux descriptions réelles des parents", () => {
        expect(getSpecies("draconarque")!.description).toContain("dragon blanc")
        expect(getSpecies("megalithe")!.description).toContain("Titan de diamant")
        expect(GEM_CHIMERA_RIDDLE).toContain("dragon blanc des cimes")
        expect(GEM_CHIMERA_RIDDLE).toContain("titan de diamant")
    })
    it("l'Autel distingue avant / après l'apogée", () => {
        expect(gemChimeraAltarLine(64)).toContain("apogée, puis un sacre")
        expect(gemChimeraAltarLine(64)).toContain("diamant")
        expect(gemChimeraAltarLine(100)).toContain("Il ne lui manque plus qu'un sacre")
    })
})

describe("surfaces (garde-fous structurels)", () => {
    const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8")
    it("⚠️ la silhouette N°203 est CLIQUABLE dans la liste du dex (sinon l'enquête est introuvable)", () => {
        const src = read("src/app/gamebook/yellow/dex/DexClient.tsx")
        const branch = src.slice(src.indexOf("if (!enc) {"), src.indexOf("const caught = caughtSet.has(sp.id)"))
        expect(branch).toContain("DEX_ULTRA_SECRET.has(sp.id)")
        expect(branch).toContain("router.push(`/gamebook/yellow/dex/${sp.id}`)")
        expect(branch).toContain("megaN")
    })
    it("la fiche scellée affiche l'enquête ; l'Autel et le Fusiodex portent leur ligne", () => {
        expect(read("src/app/gamebook/yellow/dex/[id]/DexDetailClient.tsx")).toContain("<MegaClues clues={mClues} />")
        expect(read("src/app/gamebook/yellow/FusionPreviewCard.tsx")).toContain("gemChimeraAltarLine(level)")
        expect(read("src/app/gamebook/yellow/fusiodex/FusiodexClient.tsx")).toContain("GEM_CHIMERA_RIDDLE")
    })
    it("LANCE évoque sa chimère aux écailles de diamant dans son intro, sans nommer personne", () => {
        const intro = getTrainer("y_fusion_maitre")!.intro.join(" ")
        expect(intro).toContain("écailles de diamant")
        for (const b of BANNED) expect(intro.includes(b), b).toBe(false)
    })
})

describe("palier du Trône (relecture 19/10)", () => {
    it("au Trône, l'indice ③ parle de prendre la chaise ; avant, jamais (anti-spoiler)", () => {
        const base = { seen: [] as string[], fusionHistory: [] as { a: string; b: string }[] }
        const before = megamonarxClues(megamonarxClueContext({ ...base, markers: ["fusleague_bronze"] }))
        const throne = megamonarxClues(megamonarxClueContext({ ...base, markers: ["fusleague_bronze", "fusleague_platine_open"] }))
        expect(before).toEqual([MEGAMONARX_CLUE_LINES.sacre])
        expect(throne).toEqual([MEGAMONARX_CLUE_LINES.sacreThrone])
        expect(before.join(" ")).not.toContain("Trône")
        for (const b of BANNED) expect(MEGAMONARX_CLUE_LINES.sacreThrone.includes(b), b).toBe(false)
    })
    it("⚠️ prendre la chaise avec un Dracolithe niv 100 éveille MégamonarX (octroi dans la branche du sacre platine)", () => {
        const src = fs.readFileSync(path.join(process.cwd(), "src/lib/gamebook/yellow/store/battleStore.ts"), "utf8")
        const i = src.indexOf("platineSacre = true")
        expect(src.slice(i, i + 900)).toContain("grantMegamonarx()")
    })
})

describe("cinématique MégamonarX (relecture 19/10)", () => {
    it("⚠️ elle attend l'écran libre : le générique du sacre (rematchReward) ne peut plus l'écraser ; les offres attendent la cinématique", () => {
        const src = fs.readFileSync(path.join(process.cwd(), "src/app/gamebook/yellow/YellowDevClient.tsx"), "utf8")
        expect(src).toContain("if (battle || evolutions.length > 0 || rematchReward || dialogue || newDexEntry || pendingLearn || fusionParentReward) return")
        expect(src).toContain("!championRun && !fusionParentReward && !megamonarxReveal) {") // Fusio-Ball
        expect(src).toContain("!fusionSacre && !megamonarxReveal && getActiveWorld()") // boucle endgame
    })
})
