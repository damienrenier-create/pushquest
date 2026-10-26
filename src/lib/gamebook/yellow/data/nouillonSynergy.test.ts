import { describe, it, expect } from "vitest"
import { fusionSynergy, clanPairName, synergyPairName } from "./fusionSpecies"
import { fusionSecretEntries } from "./fusionSecrets"

// 26/10/2026 (Sartay) : « on retire Kilipanda × Druidours, on crée Iorours × Druidours, on crée des synergies pour les
// Pokémon des clans — la panda, l'oiseau et le lapin ».
const NOUILLON = ["pandapurna", "picassault", "lievrocogne"]

describe("clans de Nouillon : la panda, l'oiseau, le lapin", () => {
    it("les 3 formes finales se boostent deux à deux (clé clan:nouillon), noms sur mesure, ordre indifférent", () => {
        const pairs: [string, string][] = [["pandapurna", "picassault"], ["pandapurna", "lievrocogne"], ["picassault", "lievrocogne"]]
        for (const [a, b] of pairs) {
            expect(fusionSynergy(a, b)?.key, `${a}×${b}`).toBe("clan:nouillon")
            expect(fusionSynergy(b, a)?.label).toBe("la synergie des clans de Nouillon")
            expect(clanPairName(a, b)).toBeTruthy()
            expect(synergyPairName(b, a)).toBe(clanPairName(a, b))
        }
        expect(clanPairName("pandapurna", "picassault")).toBe("Pandassault")
        expect(clanPairName("pandapurna", "lievrocogne")).toBe("Pandacogne")
        expect(clanPairName("picassault", "lievrocogne")).toBe("Lièvrassault")
    })
    it("comme les Panthères : formes finales seulement (pas les disciples niv 5 ni les stades intermédiaires)", () => {
        expect(fusionSynergy("fujipanda", "pivinci")).toBeNull()
        expect(fusionSynergy("kilipanda", "lapunch")).toBeNull()
        expect(fusionSynergy("vengbec", "lievrocogne")).toBeNull()
    })
    it("ursidés : Iorours × Druidours (Iordruide) remplace Kilipanda × Druidours (Pandolmen)", () => {
        expect(fusionSynergy("iorours", "druidours")?.label).toBe("la synergie des ursidés")
        expect(synergyPairName("druidours", "iorours")).toBe("Iordruide")
        expect(fusionSynergy("kilipanda", "druidours")).toBeNull()
        expect(synergyPairName("kilipanda", "druidours")).toBeNull()
    })
    it("page Secrets : 3 cartes de clan Nouillon (énigme sans nom d'espèce) + la carte des ours", () => {
        const entries = fusionSecretEntries()
        const nou = entries.filter((e) => e.kind === "clan" && !!e.pair && e.pair.every((id) => NOUILLON.includes(id)))
        expect(nou.length).toBe(3)
        for (const e of nou) {
            expect(e.riddle).toContain("clans de Nouillon")
            expect(e.riddle).not.toMatch(/Pandapurna|Picassault|Lièvrocogne|Fujipanda|Pivinci|Lapifrappe/)
        }
        expect(entries.find((e) => e.key === "pair:druidours|iorours")?.riddle).toContain("ours")
        expect(entries.find((e) => e.key === "pair:druidours|kilipanda")).toBeUndefined()
    })
})
