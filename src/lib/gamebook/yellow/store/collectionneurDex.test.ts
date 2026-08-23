import { describe, it, expect, beforeEach } from "vitest"
import { parseSave, emptySave } from "../storage/save"
import {
    hydratePlayer, getPlayer,
    markSeenThisRun, markCaughtThisRun, unlockFichesFromSeen, seedSeenThisRun,
    setCollectionneurDexGiven, isCollectionneurDexGiven, isFicheUnlocked,
} from "./playerStore"

beforeEach(() => {
    // Repart d'un état propre pour les 3 champs Collectionneur (hydratePlayer merge → [] / false les réinitialise).
    hydratePlayer({ seenThisRun: [], fichesUnlockedThisRun: [], collectionneurDexGiven: false })
})

describe("save.ts — champs additifs Collectionneur (défensif / rétro-compatible)", () => {
    it("ancien save (champs absents) → défauts sûrs, aucune migration destructrice", () => {
        const old = { ...emptySave() } as Record<string, unknown>
        delete old.seenThisRun; delete old.fichesUnlockedThisRun; delete old.collectionneurDexGiven // simule un save d'avant la feature
        const s = parseSave(old)
        expect(s.seenThisRun).toEqual([])
        expect(s.fichesUnlockedThisRun).toEqual([])
        expect(s.collectionneurDexGiven).toBe(false)
    })

    it("round-trip : valeurs présentes conservées + bornées + sanitizées", () => {
        const s = parseSave({
            ...emptySave(),
            seenThisRun: ["feuillichot", "broutame", 42, null],   // types parasites filtrés
            fichesUnlockedThisRun: ["feuillichot"],
            collectionneurDexGiven: true,
        })
        expect(s.seenThisRun).toEqual(["feuillichot", "broutame"])
        expect(s.fichesUnlockedThisRun).toEqual(["feuillichot"])
        expect(s.collectionneurDexGiven).toBe(true)
    })

    it("collectionneurDexGiven n'est vrai que pour === true (garde-fou)", () => {
        expect(parseSave({ ...emptySave(), collectionneurDexGiven: 1 }).collectionneurDexGiven).toBe(false)
        expect(parseSave({ ...emptySave(), collectionneurDexGiven: "true" }).collectionneurDexGiven).toBe(false)
    })
})

describe("playerStore — LIGNES (seenThisRun) & FICHES (fichesUnlockedThisRun)", () => {
    it("markSeenThisRun ajoute une ligne (idempotent)", () => {
        markSeenThisRun("feuillichot"); markSeenThisRun("feuillichot")
        expect(getPlayer().seenThisRun).toEqual(["feuillichot"])
    })

    it("markCaughtThisRun ⇒ la ligne apparaît AUSSI (capturé/offert/starter = vu)", () => {
        markCaughtThisRun("broutame")
        expect(getPlayer().seenThisRun).toContain("broutame")
    })

    it("une victoire débloque EN BLOC les fiches vues ; les rencontres SUIVANTES restent verrouillées", () => {
        markSeenThisRun("feuillichot"); markSeenThisRun("broutame")
        expect(isFicheUnlocked("feuillichot")).toBe(false) // verrouillé avant la victoire
        unlockFichesFromSeen()                              // ← défaite de L'Archiviste
        expect(isFicheUnlocked("feuillichot")).toBe(true)
        expect(isFicheUnlocked("broutame")).toBe(true)
        markSeenThisRun("piouflot")                         // nouvelle rencontre APRÈS la victoire
        expect(getPlayer().seenThisRun).toContain("piouflot") // la ligne apparaît
        expect(isFicheUnlocked("piouflot")).toBe(false)       // mais la fiche est re-verrouillée
        unlockFichesFromSeen()                                // victoire suivante
        expect(isFicheUnlocked("piouflot")).toBe(true)
    })

    it("seedSeenThisRun (migration) ne seed QUE si vide → aucune perte, aucun écrasement", () => {
        seedSeenThisRun(["a", "b", "b", ""])   // dédup + filtre vide
        expect(getPlayer().seenThisRun.sort()).toEqual(["a", "b"])
        seedSeenThisRun(["c", "d"])            // déjà rempli → no-op
        expect(getPlayer().seenThisRun.sort()).toEqual(["a", "b"])
    })
})

describe("playerStore — dex OFFERT (bouton menu)", () => {
    it("setCollectionneurDexGiven idempotent + lecture", () => {
        expect(isCollectionneurDexGiven()).toBe(false)
        setCollectionneurDexGiven(); setCollectionneurDexGiven()
        expect(isCollectionneurDexGiven()).toBe(true)
    })
})
