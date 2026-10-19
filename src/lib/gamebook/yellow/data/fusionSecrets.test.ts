import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { fusionSecretEntries, discoveredByKey, FUSION_SECRET_RIDDLES, SECRET_KIND_LABEL, shadowClarity, shadowBlurSigma, shadowBucket, bestLevelsFromSave, SHADOW_MAX_BLUR } from "./fusionSecrets"
import { fusionSecretCatalog, fusionSynergy, fusionSecretRevealKey } from "./fusionSpecies"
import { getSpecies } from "./species"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// 🔮 PAGE « SECRETS » DU FUSIODEX (19/10/2026) — chaque fusion boostée en OMBRE + énigme, révélée en couleur pour tous
// dès qu'un joueur la perce. Les clés DOIVENT être celles de fusionSynergy (= la fête de découverte), sinon une carte
// ne se révélerait jamais.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

const entries = fusionSecretEntries()

describe("catalogue", () => {
    it("tous les secrets y sont : inédites, duos, CHAQUE paire de clan (15 panthères + 10 geckos), Mimimoy — clés uniques", () => {
        const kinds = (k: string) => entries.filter((e) => e.kind === k).length
        expect(kinds("special")).toBeGreaterThanOrEqual(10)
        expect(kinds("pair")).toBeGreaterThanOrEqual(8)
        expect(kinds("clan")).toBe(25) // 6 panthères → 15 paires, 5 geckos → 10 paires (même espèce : interdit)
        expect(kinds("mimimoy")).toBe(1)
        expect(new Set(entries.map((e) => e.key)).size).toBe(entries.length)
        expect(entries.length).toBe(fusionSecretCatalog().length)
    })

    it("⚠️ chaque clé = celle de fusionSynergy pour sa recette (sinon la carte ne se révèle jamais)", () => {
        for (const e of entries) {
            if (e.pair) expect(fusionSecretRevealKey(e.pair[0], e.pair[1]), e.key).toBe(e.key) // clé de la CARTE
            if (e.pair && e.kind !== "clan") expect(fusionSynergy(e.pair[0], e.pair[1])?.key, e.key).toBe(e.key) // = clé de la fête
            if (e.kind === "clan") expect(fusionSynergy(e.pair![0], e.pair![1])?.key, e.key).toBe(e.key.split(":").slice(0, 2).join(":")) // fête : 1 fois par clan
            if (e.kind === "mimimoy") expect(fusionSynergy("mimimoy", "pyrokoss")?.key).toBe("mimimoy")
        }
    })

    it("les secrets du 19/10 y figurent (starters du run 3)", () => {
        const keys = entries.map((e) => e.key)
        expect(keys).toContain("special:Lunasfer")
        expect(keys).toContain("special:Coccilune")
        expect(keys).toContain("pair:coccimperatrice|colosfer")
    })
})

describe("cartes", () => {
    it("chaque secret a son énigme (aucune énigme orpheline)", () => {
        for (const e of entries) {
            expect(e.riddle, e.key).not.toBe("Une ombre que personne n'a encore percée.") // jamais l'énigme par défaut
            if (e.kind !== "clan") expect(FUSION_SECRET_RIDDLES[e.key], e.key).toBeTruthy() // clans : énigme calculée (les deux éléments)
        }
        for (const k of Object.keys(FUSION_SECRET_RIDDLES)) expect(entries.some((e) => e.key === k), k).toBe(true)
    })

    it("⚠️ ANTI-SPOILER : aucune énigme ne cite le nom d'une espèce de sa recette", () => {
        for (const e of entries) {
            const ids = [...(e.pair ?? []), ...(e.members ?? [])]
            for (const id of ids) {
                const name = getSpecies(id)?.name ?? id
                expect(e.riddle.toLowerCase().includes(name.toLowerCase()), `${e.key} cite « ${name} »`).toBe(false)
            }
        }
    })

    it("la vitrine de chaque carte désigne des espèces réelles avec un sprite", () => {
        for (const e of entries) {
            const ids = e.showcase.kind === "pair" ? [e.showcase.a, e.showcase.b] : [e.showcase.id]
            for (const id of ids) {
                const sp = getSpecies(id)
                expect(sp, `${e.key} → ${id}`).toBeTruthy()
                expect(sp!.sprite.includes("missingno"), `${e.key} → ${id}`).toBe(false)
            }
            if (e.kind === "clan" && e.showcase.kind === "pair") {
                expect(e.members).toContain(e.showcase.a)
                expect(e.members).toContain(e.showcase.b)
            }
        }
    })

    it("libellé pour chaque famille ; le 1er découvreur garde la paternité", () => {
        for (const e of entries) expect(SECRET_KIND_LABEL[e.kind]).toBeTruthy()
        const m = discoveredByKey([{ key: "a", by: "Mools", at: "2026-08-17T00:00:00Z" }, { key: "a", by: "Autre", at: "2026-09-01T00:00:00Z" }])
        expect(m.get("a")?.by).toBe("Mools")
    })
})

describe("surfaces (garde-fous structurels)", () => {
    const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8")
    it("la route liste les secrets percés ; le Fusiodex a son onglet ; l'ombre = filtre noir tant que non percé", () => {
        expect(read("src/app/api/gamebook/yellow/synergy-gift/route.ts")).toContain("export async function GET")
        const ui = read("src/app/gamebook/yellow/fusiodex/FusiodexClient.tsx")
        expect(ui).toContain("🔮 Secrets")
        expect(ui).toContain("fetchDiscoveredSecrets")
    })
})

describe("clans : une carte par paire", () => {
    it("chaque paire de clan a une énigme qui nomme le clan et les deux éléments, sans espèce", () => {
        for (const e of entries.filter((x) => x.kind === "clan")) expect(e.riddle, e.key).toMatch(/^Deux (panthères|geckos) : .+ et .+\.$/)
    })
    it("deux paires distinctes ne partagent jamais la même énigme", () => {
        const clan = entries.filter((x) => x.kind === "clan")
        expect(new Set(clan.map((e) => e.riddle)).size).toBe(clan.length)
    })
    it("révélation ≠ fête pour un clan : paire précise vs clan entier ; identique pour les autres secrets", () => {
        expect(fusionSecretRevealKey("pyropanthe", "voltapanthe")).toBe("clan:panthere:pyropanthe|voltapanthe")
        expect(fusionSecretRevealKey("voltapanthe", "pyropanthe")).toBe("clan:panthere:pyropanthe|voltapanthe") // ordre indifférent
        expect(fusionSynergy("pyropanthe", "voltapanthe")?.key).toBe("clan:panthere")
        expect(fusionSecretRevealKey("tenebrir", "loupyre")).toBe(fusionSynergy("tenebrir", "loupyre")?.key)
        expect(fusionSecretRevealKey("pyropanthe", "loupyre")).toBeNull()
    })
    it("⚠️ la route ne révèle qu'une VRAIE paire de clan (clé revalidée contre le catalogue)", () => {
        const route = fs.readFileSync(path.join(process.cwd(), "src/app/api/gamebook/yellow/synergy-gift/route.ts"), "utf8")
        expect(route).toContain("fusionSecretRevealKey(m[1], m[2]) !== rk")
        expect(route).toContain("synergy_reveal")
    })
})

describe("ombres étanches (relecture 19/10)", () => {
    const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8")
    it("⚠️ une ombre = image noircie PAR LE SERVEUR sous un numéro opaque ; le vrai sprite n'est demandé qu'une fois percé", () => {
        const ui = read("src/app/gamebook/yellow/fusiodex/FusiodexClient.tsx")
        expect(ui).toContain("/api/gamebook/yellow/secret-shadow?i=${index}")
        expect(ui).toContain("useFusionSprite(revealedEarly ? pair?.a : undefined, revealedEarly ? pair?.b : undefined)")
        expect(ui).not.toContain("brightness(0)") // plus de noircissement CSS d'une image en couleur
        const route = read("src/app/api/gamebook/yellow/secret-shadow/route.ts")
        expect(route).toContain("fusionSecretEntries()[i]")
        expect(route).toContain("data[p] = 4")
        expect(route).toContain("!DEX_ULTRA_SECRET.has(ultra)") // ?s= réservé aux ultra-secrets du Pokédex
        const sealed = read("src/app/gamebook/yellow/dex/[id]/DexDetailClient.tsx")
        expect(sealed).toContain("/api/gamebook/yellow/secret-shadow?s=")
        expect(sealed).not.toContain("brightness(0)")
    })
    it("⚠️ l'épreuve de l'Autel et le rattrapage depuis « Mes fusions » percent aussi les secrets", () => {
        expect(read("src/app/gamebook/yellow/YellowDevClient.tsx")).toContain("reportForgedFusionSecrets(picks[0].speciesId, picks[1].speciesId, markSynergyDiscovered)")
        expect(read("src/app/gamebook/yellow/fusiodex/FusiodexClient.tsx")).toContain("reportForgedFusionSecrets(h.a, h.b, markSynergyDiscovered)")
    })
})

describe("netteté des ombres par joueur (Sartay 19/10/2026)", () => {
    const pair = { kind: "pair" as const, a: "pyropanthe", b: "voltapanthe" }
    const lv = (o: Record<string, number>) => (id: string) => o[id] ?? 0
    it("deux parents niveau 100 = nette ; un seul = à moitié ; aucun = une tache ; Mimimoy = son niveau", () => {
        expect(shadowClarity(pair, lv({ pyropanthe: 100, voltapanthe: 100 }))).toBe(1)
        expect(shadowClarity(pair, lv({ pyropanthe: 100 }))).toBe(0.5)
        expect(shadowClarity(pair, lv({ pyropanthe: 50, voltapanthe: 50 }))).toBe(0.5)
        expect(shadowClarity(pair, lv({}))).toBe(0)
        expect(shadowClarity(pair, lv({ pyropanthe: 250, voltapanthe: 100 }))).toBe(1) // niveau borné à 100
        expect(shadowClarity({ kind: "single", id: "mimimoy" }, lv({ mimimoy: 40 }))).toBe(0.4)
    })
    it("flou : nul à netteté 1, maximal à 0, décroissant ; palier de cache par pas de 5 %", () => {
        expect(shadowBlurSigma(1)).toBe(0)
        expect(shadowBlurSigma(0)).toBe(SHADOW_MAX_BLUR)
        expect(shadowBlurSigma(0.25)).toBeGreaterThan(shadowBlurSigma(0.75))
        expect(shadowBucket(0.5)).toBe(10)
        expect(shadowBucket(1)).toBe(20)
    })
    it("meilleur niveau par espèce : monde vivant + run 2 + run 3, jamais la bulle de rejeu ; données douteuses ignorées", () => {
        const save = {
            team: [{ speciesId: "pyropanthe", level: 40 }, { speciesId: "loupyre", level: "x" }],
            pc: [{ speciesId: "pyropanthe", level: 70 }, null, { level: 90 }],
            ngplusWorld: { team: [{ speciesId: "voltapanthe", level: 55 }] },
            run3World: { pc: [{ speciesId: "voltapanthe", level: 80 }] },
            replayWorld: { team: [{ speciesId: "pyropanthe", level: 100 }] },
        }
        const m = bestLevelsFromSave(save)
        expect(m.get("pyropanthe")).toBe(70)
        expect(m.get("voltapanthe")).toBe(80)
        expect(m.has("loupyre")).toBe(false)
        expect(bestLevelsFromSave(null).size).toBe(0)
    })
    it("⚠️ le flou est appliqué PAR LE SERVEUR d'après la save ; la page ne montre plus aucune énigme", () => {
        const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8")
        const route = read("src/app/api/gamebook/yellow/secret-shadow/route.ts")
        expect(route).toContain("shadowBlurSigma(shadowClarity(e.showcase")
        expect(route).toContain("bestLevelsFromSave(prog?.flags)")
        expect(route).toContain("img.blur(sigma)")
        const ui = read("src/app/gamebook/yellow/fusiodex/FusiodexClient.tsx")
        expect(ui).toContain("secret-shadow?i=${index}&c=${bucket}")
        const card = ui.slice(ui.indexOf("function SecretCard"), ui.indexOf("function SecretsList"))
        expect(card).not.toContain("e.riddle")
    })
})
