import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { getSpecies, SPECIES, PERMANENT_OFF_DEX_SPECIES } from "./species"
import { FUSION_BASE_SPECIES, FUSION_BASE_PARENTS } from "./fusionBaseSpecies"
import { UKOGNOFY_SPECIES } from "./ukognofySpecies"
import { isEvolvedFusionStage } from "./fusionEvoSprites"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// LES CRÉATURES SPÉCIALES DOIVENT ÊTRE RÉSOLVABLES SANS CLIENT
//
// Elles vivent hors de SPECIES par choix (anti-spoiler : visibleDexSpecies n'itère que SPECIES) et sont
// enregistrées en « custom » au chargement de la save. Un SERVEUR n'exécute jamais ce code : pour lui, elles
// n'existaient pas. La génération de sprite de fusion résout ses deux parents via getSpecies → toute fusion
// ayant l'une d'elles pour parent échouait en `unknown-species`. Trois paires en ont fait les frais avant
// qu'on s'en aperçoive, bloquées après trois essais.
//
// Ce fichier n'a qu'un but : que la PROCHAINE créature spéciale ne rejoue pas ce scénario en silence.
// Le vrai garde-fou est structurel (PERMANENT_OFF_DEX_SPECIES, consommée par playerStore ET par getSpecies) ;
// ces tests vérifient que la structure tient, et que chaque créature a de quoi servir de référence visuelle.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

const DEX_DIR = path.join(process.cwd(), "public", "yellow", "sprites")
const spriteOnDisk = (rel?: string) => !!rel && fs.existsSync(path.join(DEX_DIR, rel.replace(/^\/yellow\/sprites\//, "")))
const isPlaceholder = (rel?: string) => !!rel && rel.includes("missingno")

describe("espèces permanentes hors dex — résolvables côté serveur", () => {
    it("la liste couvre les deux familles possédables (fusions de base + Ukognofy)", () => {
        expect(PERMANENT_OFF_DEX_SPECIES.length).toBe(FUSION_BASE_SPECIES.length + 1)
        for (const sp of FUSION_BASE_SPECIES) expect(PERMANENT_OFF_DEX_SPECIES).toContain(sp)
        expect(PERMANENT_OFF_DEX_SPECIES).toContain(UKOGNOFY_SPECIES)
    })

    it("⚠️ chacune se résout par getSpecies SANS aucun enregistrement client", () => {
        // Ce test tourne « à froid » : rien n'a appelé registerCustomSpecies. C'est exactement l'état d'un serveur.
        const introuvables = PERMANENT_OFF_DEX_SPECIES.filter((sp) => !getSpecies(sp.id))
        expect(introuvables.map((s) => s.id), "introuvables côté serveur").toEqual([])
    })

    it("…et aucune n'a fui dans le Pokédex principal au passage", () => {
        const fuites = PERMANENT_OFF_DEX_SPECIES.filter((sp) => SPECIES[sp.id])
        expect(fuites.map((s) => s.id), "visibles au dex alors qu'elles doivent rester secrètes").toEqual([])
    })

    it("getSpecies rend bien la MÊME créature, pas un homonyme", () => {
        for (const sp of PERMANENT_OFF_DEX_SPECIES) {
            const found = getSpecies(sp.id)!
            expect(found.name, sp.id).toBe(sp.name)
            expect(found.types, sp.id).toEqual(sp.types)
        }
    })
})

describe("espèces permanentes hors dex — chacune peut servir de RÉFÉRENCE visuelle", () => {
    // La génération d'une fusion envoie au modèle le sprite de ses DEUX parents. Un parent sans image
    // exploitable, c'est soit un échec, soit — bien pire — une génération facturée à partir de MissingNo.
    it("chacune a soit un PNG réel, soit un sprite GÉNÉRÉ attendu (jamais ni l'un ni l'autre)", () => {
        const orphelines = PERMANENT_OFF_DEX_SPECIES.filter((sp) => {
            if (!isPlaceholder(sp.sprite)) return !spriteOnDisk(sp.sprite) // PNG déclaré : il doit exister
            // Placeholder : un sprite GÉNÉRÉ doit être attendu, sous l'une des deux clés que sait lire
            //   parentRefUrl — `fusevo:<id>` pour un stade évolué, la clé de PAIRE pour une fusion de base.
            return !isEvolvedFusionStage(sp.id) && !FUSION_BASE_PARENTS[sp.id]
        })
        expect(
            orphelines.map((s) => `${s.id}(${s.sprite})`),
            "ni PNG réel, ni sprite généré attendu → parent inutilisable en génération",
        ).toEqual([])
    })

    it("un PNG déclaré pointe toujours vers un fichier présent", () => {
        const fantomes = PERMANENT_OFF_DEX_SPECIES
            .filter((sp) => !isPlaceholder(sp.sprite))
            .filter((sp) => !spriteOnDisk(sp.sprite))
        expect(fantomes.map((s) => `${s.id} → ${s.sprite}`), "chemin déclaré sans fichier").toEqual([])
    })

    it("Ukognofy, le cas qui a tout révélé, est bien couvert de bout en bout", () => {
        expect(getSpecies("ukognofy")).toBeTruthy()
        expect(SPECIES["ukognofy"]).toBeUndefined()      // toujours hors dex
        expect(spriteOnDisk(UKOGNOFY_SPECIES.sprite)).toBe(true) // et il a un vrai PNG
    })
})
