import { describe, it, expect, beforeEach, vi } from "vitest"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// REPRISE DU COULOIR PLATINE APRÈS UN RECHARGEMENT
//
// Le combat de la Ligue de Fusion était déjà reprenable (l'instantané embarque jusqu'aux espèces éphémères).
// Le PARCOURS, lui, ne l'était pas : il vivait en variables de module. Un onglet tué en plein couloir — le
// cas normal d'une PWA mobile — reprenait donc le combat contre le Maître en titre AVEC un compteur d'étape
// remis à 0. Le joueur gagnait, `isPlatineFinalStep()` répondait faux, aucun sacre n'était envoyé, et la
// porte le renvoyait sur ACE : 20-30 minutes de couloir pour rien, sans un message.
//
// La règle retenue : un RECHARGEMENT n'est pas un abandon (il n'est pas choisi), mais sortir par la porte
// gauche et tomber au combat en sont — et effacent le miroir. Le parcours n'est restauré que si le couloir
// rendu par le serveur est le MÊME : si le trône a changé de main, on repart d'ACE.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

const _ls: Record<string, string> = {}
vi.stubGlobal("window", { localStorage: {
    getItem: (k: string) => (k in _ls ? _ls[k] : null),
    setItem: (k: string, v: string) => { _ls[k] = v },
    removeItem: (k: string) => { delete _ls[k] },
} })

const {
    setPlatineCorridor, resetPlatineRun, abandonPlatineRun, clearPlatineRunMirror,
    currentPlatineOpponent, advancePlatineStep, markPlatineOpponentBeaten, isPlatineOpponentBeaten,
    getPlatineStep, isPlatineFinalStep, getPlatineLedger, setPlatineLedger,
} = await import("./platineRun")
const { PLATINE_RUN_LS_KEY, SESSION_LS_KEYS, clearRunSessionStorage } = await import("../storage/sessionKeys")
const { recordHit, topHits } = await import("../data/platineLedger")
type Holder = import("./platineRun").PlatineThroneHolder | null

const mon = (name: string) => ({
    name, sprite: "/x.png", types: ["TENEBRES"], level: 100,
    stats: { hp: 500, atk: 300, def: 300, spe: 400, spc: 700 }, moves: ["Lance-Soleil"],
})
const champ = (nickname: string, wonAt = "2026-09-08T00:00:00.000Z") =>
    ({ userId: `u-${nickname}`, nickname, wonAt, team: [mon("A")] }) as any
const holder = (nickname: string, sinceAt = "2026-09-01T00:00:00.000Z") =>
    ({ userId: `u-${nickname}`, nickname, points: 3, sinceAt, reignDays: 10, team: [mon("B")] }) as any

/** Simule un RECHARGEMENT DE PAGE : l'état mémoire est perdu, le localStorage survit. C'est exactement ce que
 *  fait le hook au montage (resetPlatineRun avant hydratation), puis au fetch (setPlatineCorridor). */
const reload = (rooms: any[], h: Holder) => { resetPlatineRun(); setPlatineCorridor(rooms, h) }

describe("couloir platine — un rechargement ne perd plus le parcours", () => {
    beforeEach(() => { for (const k of Object.keys(_ls)) delete _ls[k]; resetPlatineRun() })

    it("l'étape et l'adversaire du moment survivent au rechargement", () => {
        const rooms = [champ("Jacanon"), champ("Mools")], h = holder("Zyran")
        setPlatineCorridor(rooms, h)
        markPlatineOpponentBeaten(); advancePlatineStep()   // ACE tombé, porte franchie
        markPlatineOpponentBeaten(); advancePlatineStep()   // Jacanon tombé, porte franchie
        expect(currentPlatineOpponent()!.label).toBe("Mools")

        reload(rooms, h)
        expect(getPlatineStep()).toBe(2)
        expect(currentPlatineOpponent()!.label).toBe("Mools") // …et pas ACE
    })

    it("LE BUG D'ORIGINE : gagner contre le Maître après un rechargement SACRE bien", () => {
        const rooms = [champ("Jacanon")], h = holder("Zyran")
        setPlatineCorridor(rooms, h)
        for (let i = 0; i < 2; i++) { markPlatineOpponentBeaten(); advancePlatineStep() } // ACE puis Jacanon
        expect(currentPlatineOpponent()!.label).toBe("Zyran")
        expect(isPlatineFinalStep()).toBe(true)

        reload(rooms, h)
        expect(currentPlatineOpponent()!.label).toBe("Zyran")
        expect(isPlatineFinalStep()).toBe(true) // avant le correctif : false → victoire sans sacre
    })

    it("une porte DÉVERROUILLÉE le reste après un rechargement (on ne refait pas le combat qu'on vient de gagner)", () => {
        const rooms = [champ("Jacanon")], h = null
        setPlatineCorridor(rooms, h)
        markPlatineOpponentBeaten()
        reload(rooms, h)
        expect(isPlatineOpponentBeaten()).toBe(true)
        expect(currentPlatineOpponent()!.label).toBe("ACE")
    })

    it("les meilleurs coups déjà encaissés survivent aussi (matière du générique)", () => {
        const rooms = [champ("Jacanon")], h = null
        setPlatineCorridor(rooms, h)
        setPlatineLedger(recordHit(getPlatineLedger(), "mine", { name: "Voltombre", move: "Ultra-Foudre", damage: 712, target: "X", room: "ACE" }))
        reload(rooms, h)
        expect(topHits(getPlatineLedger(), "mine")[0]).toMatchObject({ name: "Voltombre", damage: 712 })
    })
})

describe("couloir platine — ce qui DOIT effacer le parcours", () => {
    beforeEach(() => { for (const k of Object.keys(_ls)) delete _ls[k]; resetPlatineRun() })

    it("sortir par la porte gauche est un abandon : on repart d'ACE", () => {
        const rooms = [champ("Jacanon")], h = holder("Zyran")
        setPlatineCorridor(rooms, h)
        markPlatineOpponentBeaten(); advancePlatineStep()
        abandonPlatineRun()                                   // ce que fait gameStore à la porte gauche
        expect(_ls[PLATINE_RUN_LS_KEY]).toBeUndefined()
        reload(rooms, h)
        expect(currentPlatineOpponent()!.label).toBe("ACE")
    })

    it("le sacre efface le miroir mais laisse la salle s'afficher", () => {
        const rooms = [champ("Jacanon")], h = null
        setPlatineCorridor(rooms, h)
        markPlatineOpponentBeaten()
        clearPlatineRunMirror()                               // ce que fait battleStore au sacre
        expect(_ls[PLATINE_RUN_LS_KEY]).toBeUndefined()
        expect(currentPlatineOpponent()).not.toBeNull()       // …mais le PNJ est toujours là
    })

    it("⚠️ resetPlatineRun N'efface PAS le miroir — sinon chaque chargement de page tuerait le parcours", () => {
        // Le hook appelle resetPlatineRun au montage, AVANT l'hydratation (la carte courante n'est pas encore
        // la salle du trône). Si ce reset effaçait le miroir, il détruirait précisément ce qu'on veut sauver.
        const rooms = [champ("Jacanon")], h = null
        setPlatineCorridor(rooms, h)
        markPlatineOpponentBeaten(); advancePlatineStep()
        resetPlatineRun()
        expect(_ls[PLATINE_RUN_LS_KEY]).toBeDefined()
        setPlatineCorridor(rooms, h)
        expect(getPlatineStep()).toBe(1)
    })

    it("si le TRÔNE a changé de main pendant l'absence, le parcours sauvegardé est jeté", () => {
        const rooms = [champ("Jacanon")]
        setPlatineCorridor(rooms, holder("Zyran"))
        markPlatineOpponentBeaten(); advancePlatineStep()
        reload(rooms, holder("Mools"))                        // quelqu'un d'autre s'est assis
        expect(getPlatineStep()).toBe(0)
        expect(currentPlatineOpponent()!.label).toBe("ACE")
    })

    it("si une SALLE s'est ajoutée, le parcours sauvegardé est jeté aussi", () => {
        const a = champ("Jacanon")
        setPlatineCorridor([a], null)
        markPlatineOpponentBeaten(); advancePlatineStep()
        reload([a, champ("Mools")], null)
        expect(getPlatineStep()).toBe(0)
    })

    it("un règne re-daté (le tenant a repris la chaise) invalide aussi le parcours", () => {
        const rooms = [champ("Jacanon")]
        setPlatineCorridor(rooms, holder("Zyran", "2026-09-01T00:00:00.000Z"))
        markPlatineOpponentBeaten(); advancePlatineStep()
        reload(rooms, holder("Zyran", "2026-09-11T00:00:00.000Z")) // même joueur, nouveau règne
        expect(getPlatineStep()).toBe(0)
    })

    it("une étape sauvegardée hors bornes est ignorée plutôt que de pointer dans le vide", () => {
        const rooms = [champ("Jacanon")], h = holder("Zyran")
        setPlatineCorridor(rooms, h)
        const saved = JSON.parse(_ls[PLATINE_RUN_LS_KEY])
        _ls[PLATINE_RUN_LS_KEY] = JSON.stringify({ ...saved, step: 99 })
        reload(rooms, h)
        expect(getPlatineStep()).toBe(0)
        expect(currentPlatineOpponent()).not.toBeNull()
    })

    it("un miroir illisible dégrade en parcours neuf, jamais en exception", () => {
        const rooms = [champ("Jacanon")], h = null
        for (const junk of ["pas du json", "{}", '{"v":2}', '{"v":1}', "[]"]) {
            _ls[PLATINE_RUN_LS_KEY] = junk
            expect(() => reload(rooms, h)).not.toThrow()
            expect(getPlatineStep()).toBe(0)
        }
    })

    it("écraser la save purge le parcours avec le reste de la session (sinon : couloir d'une partie morte)", () => {
        setPlatineCorridor([champ("Jacanon")], null)
        expect(SESSION_LS_KEYS).toContain(PLATINE_RUN_LS_KEY)
        clearRunSessionStorage()
        expect(_ls[PLATINE_RUN_LS_KEY]).toBeUndefined()
    })
})
