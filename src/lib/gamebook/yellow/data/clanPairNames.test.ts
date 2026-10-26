import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { clanPairName, synergyPairName, computeFusion, fusionSecretCatalog, type FusionParent } from "./fusionSpecies"
import { officialFusionForParents } from "./officialFusions"
import { SPECIES, getSpecies } from "./species"
import { FUSION_BOSS_ULTRA } from "./fusionLeague"

const P = (id: string): FusionParent => { const sp = getSpecies(id)!; return { name: sp.name, types: sp.types, stats: sp.baseStats, level: 50, moves: sp.learnset.map((l) => l.moveId), speciesId: sp.id } }
const clanPairs = fusionSecretCatalog().filter((d) => d.kind === "clan").map((d) => d.pair!)
const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8")

describe("noms sur mesure des paires de clan (Sartay 19/10/2026)", () => {
    it("les 28 paires (15 panthères + 10 geckos + 3 clans de Nouillon) ont un nom, le même dans les deux ordres, et c'est celui que donne le moteur", () => {
        expect(clanPairs).toHaveLength(28)
        for (const [a, b] of clanPairs) {
            const n = clanPairName(a, b)
            expect(n, `${a}|${b}`).toBeTruthy()
            expect(clanPairName(b, a)).toBe(n)
            expect(computeFusion(P(a), P(b)).name).toBe(n)
            expect(computeFusion(P(b), P(a)).name).toBe(n)
        }
    })
    it("28 noms distincts, un seul mot sans tiret, 6 à 12 lettres, jamais le nom d'une espèce", () => {
        const names = clanPairs.map(([a, b]) => clanPairName(a, b)!)
        expect(new Set(names.map((n) => n.toLowerCase())).size).toBe(28)
        const species = new Set(Object.values(SPECIES).map((s) => s.name.toLowerCase()))
        for (const n of names) {
            expect(n, n).toMatch(/^[A-ZÀ-Ý][a-zà-ÿ]{5,11}$/)
            expect(species.has(n.toLowerCase()), n).toBe(false)
        }
    })
    it("aucun nom ne double une autre fusion curée (Ligue, officielles, inédites), sauf les trois reprises de la Ligue", () => {
        const curated = ["src/lib/gamebook/yellow/data/fusionLeague.ts", "src/lib/gamebook/yellow/data/officialFusions.ts", "src/lib/gamebook/yellow/data/fusionTrial.ts", "src/lib/gamebook/yellow/data/fusionBaseSpecies.ts"].map(read).join(String.fromCharCode(10))
        for (const [a, b] of clanPairs) {
            const n = clanPairName(a, b)!
            if (n === "Pyrovolt" || n === "Gékaucké" || n === "Voltombre") continue
            expect(curated.includes(`name: "${n}"`), n).toBe(false)
        }
    })
    it("Pyrovolt, Gékaucké et Voltombre gardent le nom que la Ligue leur donne déjà (une paire = un nom, un sprite)", () => {
        expect(clanPairName("pyropanthe", "voltapanthe")).toBe("Pyrovolt")
        expect(FUSION_BOSS_ULTRA.find((p) => [p.a, p.b].sort().join("|") === "pyropanthe|voltapanthe")?.name).toBe("Pyrovolt")
        expect(clanPairName("gekraise", "geaucke")).toBe("Gékaucké")
        expect(read("src/lib/gamebook/yellow/data/fusionLeague.ts")).toMatch(/a: "gekraise", b: "geaucke", name: "Gékaucké"/)
        expect(clanPairName("voltapanthe", "ombrapanthe")).toBe("Voltombre")
        expect(read("src/lib/gamebook/yellow/data/fusionLeague.ts")).toMatch(/a: "ombrapanthe", b: "voltapanthe", name: "Voltombre"|a: "voltapanthe", b: "ombrapanthe", name: "Voltombre"/)
        // TOUTE paire de clan présente dans la Ligue garde son nom de Ligue (relecture 19/10 : Voltombre avait été oublié)
        const league = read("src/lib/gamebook/yellow/data/fusionLeague.ts")
        for (const m of league.matchAll(/a: "([a-z0-9_]+)", b: "([a-z0-9_]+)", name: "([^"]+)"/g)) {
            const n = clanPairName(m[1], m[2])
            if (n) expect(n, `${m[1]}|${m[2]}`).toBe(m[3])
        }
    })
    it("hors clan, rien ne change : mot-valise, inédite, duo", () => {
        expect(clanPairName("pyropanthe", "loupyre")).toBeNull()
        expect(computeFusion(P("pyrokoss"), P("razmaree")).name).toBe("Vaporêve")
        expect(computeFusion(P("pyropanthe"), P("loupyre")).name).toContain("-")
    })
})

describe("noms sur mesure des duos de synergie (Sartay 19/10/2026)", () => {
    const duos = fusionSecretCatalog().filter((d) => d.kind === "pair").map((d) => d.pair!)
    it("chaque duo a un vrai nom en jeu : officiel (Karabouh, Impérafer) ou sur mesure, jamais le mot-valise", () => {
        expect(duos).toHaveLength(8)
        for (const [a, b] of duos) {
            const official = officialFusionForParents(a, b)?.name
            const custom = synergyPairName(a, b)
            expect(official ?? custom, `${a}|${b}`).toBeTruthy()
            expect(!!official && !!custom, `${a}|${b} : un seul nom`).toBe(false)
            if (custom) { expect(computeFusion(P(a), P(b)).name).toBe(custom); expect(computeFusion(P(b), P(a)).name).toBe(custom) }
        }
    })
    it("noms des duos : un mot, 6 à 12 lettres, distincts des espèces, des paires de clan et des fusions curées (sauf Mérotony, nom de Ligue)", () => {
        const species = new Set(Object.values(SPECIES).map((s) => s.name.toLowerCase()))
        const clanNames = new Set(clanPairs.map(([a, b]) => clanPairName(a, b)!.toLowerCase()))
        const curated = ["src/lib/gamebook/yellow/data/fusionLeague.ts", "src/lib/gamebook/yellow/data/officialFusions.ts", "src/lib/gamebook/yellow/data/fusionTrial.ts", "src/lib/gamebook/yellow/data/fusionBaseSpecies.ts"].map(read).join(String.fromCharCode(10))
        const seen = new Set<string>()
        for (const [a, b] of duos) {
            const n = synergyPairName(a, b)
            if (!n) continue
            expect(n, n).toMatch(/^[A-ZÀ-Ý][a-zà-ÿ]{5,11}$/)
            expect(species.has(n.toLowerCase()), n).toBe(false)
            expect(clanNames.has(n.toLowerCase()), n).toBe(false)
            expect(seen.has(n.toLowerCase()), n).toBe(false); seen.add(n.toLowerCase())
            if (n !== "Mérotony") expect(curated.includes(`name: "${n}"`), n).toBe(false)
        }
    })
    it("Mérotony garde le nom de la Ligue, et toute paire de la Ligue garde son nom de Ligue", () => {
        expect(synergyPairName("tonytony", "merorem")).toBe("Mérotony")
        expect(FUSION_BOSS_ULTRA.find((p) => [p.a, p.b].sort().join("|") === "merorem|tonytony")?.name).toBe("Mérotony")
        for (const m of read("src/lib/gamebook/yellow/data/fusionLeague.ts").matchAll(/a: "([a-z0-9_]+)", b: "([a-z0-9_]+)", name: "([^"]+)"/g)) {
            const n = synergyPairName(m[1], m[2])
            if (n) expect(n, `${m[1]}|${m[2]}`).toBe(m[3])
        }
    })
})
