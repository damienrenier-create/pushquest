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
    reportPlatineClaim, hasPendingPlatineClaim, flushPendingPlatineClaim,
    snapshotPlatineRun, seedPlatineMirrorFromSave,
} = await import("./platineRun")
const { PLATINE_RUN_LS_KEY, PLATINE_CLAIM_LS_KEY, SESSION_LS_KEYS, clearRunSessionStorage } = await import("../storage/sessionKeys")
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

// LE SACRE NE DOIT PAS SE PERDRE EN SILENCE. Un couloir, c'est 20-30 min sans reprise. La route avalait ses
//   erreurs en repondant 200, et le client ne relisait meme pas la reponse : on se croyait Maitre alors que
//   rien n'etait grave. Le sacre est desormais mis en file AVANT l'envoi, retente, puis rejoue au chargement.
describe("couloir platine — un sacre ne se perd pas sur un reseau muet", () => {
    beforeEach(() => { for (const k of Object.keys(_ls)) delete _ls[k]; resetPlatineRun() })

    const team = [mon("Voltombre") as any]

    it("le sacre est mis en file AVANT l'envoi (un onglet tue pendant l'appel ne l'emporte pas)", async () => {
        let calls = 0
        vi.stubGlobal("fetch", async () => { calls++; throw new Error("reseau mort") })
        reportPlatineClaim(team, "sk")
        expect(hasPendingPlatineClaim()).toBe(true) // pose SYNCHRONEMENT, avant meme le 1er fetch
        await new Promise((r) => setTimeout(r, 0))
        expect(calls).toBeGreaterThanOrEqual(1)
        expect(hasPendingPlatineClaim()).toBe(true) // toujours en carafe
    })

    it("un serveur qui repond 500 NE vide PAS la file (c'est tout le bug d'origine)", async () => {
        vi.stubGlobal("fetch", async () => ({ ok: false, status: 500, json: async () => ({ ok: false }) }))
        reportPlatineClaim(team)
        await new Promise((r) => setTimeout(r, 0))
        expect(hasPendingPlatineClaim()).toBe(true)
    })

    it("un serveur qui repond 200 mais { ok:false } ne compte pas non plus comme grave", async () => {
        vi.stubGlobal("fetch", async () => ({ ok: true, json: async () => ({ ok: false, reason: "write-failed" }) }))
        reportPlatineClaim(team)
        await new Promise((r) => setTimeout(r, 0))
        expect(hasPendingPlatineClaim()).toBe(true)
    })

    it("grave -> la file se vide", async () => {
        vi.stubGlobal("fetch", async () => ({ ok: true, json: async () => ({ ok: true, throne: { nickname: "X" } }) }))
        reportPlatineClaim(team)
        await new Promise((r) => setTimeout(r, 0))
        expect(hasPendingPlatineClaim()).toBe(false)
    })

    it("le rattrapage au chargement rejoue le sacre reste en carafe", async () => {
        vi.stubGlobal("fetch", async () => ({ ok: false, status: 503, json: async () => ({ ok: false }) }))
        reportPlatineClaim(team, "sk")
        await new Promise((r) => setTimeout(r, 0))
        expect(hasPendingPlatineClaim()).toBe(true)

        let sent: any = null
        vi.stubGlobal("fetch", async (_u: string, o: any) => { sent = JSON.parse(o.body); return { ok: true, json: async () => ({ ok: true }) } })
        expect(await flushPendingPlatineClaim()).toBe(true)
        expect(sent.action).toBe("claim")
        expect(sent.team[0].name).toBe("Voltombre")
        expect(sent.avatar).toBe("sk")               // le skin du sacre voyage avec
        expect(hasPendingPlatineClaim()).toBe(false)
    })

    it("rien en file = rattrapage silencieux, et une file abimee se jette", async () => {
        vi.stubGlobal("fetch", async () => { throw new Error("ne devrait pas etre appele") })
        expect(await flushPendingPlatineClaim()).toBe(false)
        _ls[PLATINE_CLAIM_LS_KEY] = "pas du json"
        expect(await flushPendingPlatineClaim()).toBe(false)
        expect(hasPendingPlatineClaim()).toBe(false) // nettoyee
        _ls[PLATINE_CLAIM_LS_KEY] = JSON.stringify({ v: 1, team: [] })
        expect(await flushPendingPlatineClaim()).toBe(false)
        expect(hasPendingPlatineClaim()).toBe(false) // une equipe vide serait refusee par le serveur : on la jette
    })
})

// LES DRAPEAUX DE LA TRAVERSEE voyagent DANS le carry. Ils vivaient en memoire de module : un rechargement les
//   remettait a zero alors que l'usure de l'equipe, elle, survivait. `bossBeaten` perdu ENFERMAIT le joueur au
//   palier OR (porte de la salle ultime refusee en silence, boss non re-combattable) ; `berries` perdu retirait
//   aux adversaires leurs baies, Baie Phenix comprise.
describe("Ligue de Fusion — le carry transporte les drapeaux de la traversee", () => {
    it("le JSON du carry embarque l'usure ET les deux drapeaux", async () => {
        const g = await import("./fusionGauntlet")
        g.setGauntletBerries(true)
        g.setGauntletBossBeaten(true)
        // Sans equipe montee, le helper doit rendre null plutot qu'un JSON bancal.
        expect(g.serializeGauntletCarryJson()).toBeNull()
    })

    it("les drapeaux sont bien lus/ecrits par leur paire d'accesseurs", async () => {
        const g = await import("./fusionGauntlet")
        g.setGauntletBerries(false); expect(g.getGauntletBerries()).toBe(false)
        g.setGauntletBerries(true); expect(g.getGauntletBerries()).toBe(true)
        g.setGauntletBossBeaten(false); expect(g.getGauntletBossBeaten()).toBe(false)
        g.setGauntletBossBeaten(true); expect(g.getGauntletBossBeaten()).toBe(true)
    })

    it("un carry d'AVANT cette version (sans drapeaux) reste lisible", () => {
        // Forme historique : { team: [...] }. La reprise doit retomber sur ses replis, pas planter.
        const legacy = JSON.parse(JSON.stringify({ team: [{ a: "u1", b: "u2", hp: 10, status: "NONE", statusCounter: 0, pp: {}, moves: [] }] }))
        expect(Array.isArray(legacy.team)).toBe(true)
        expect(typeof legacy.berries).toBe("undefined")
        expect(typeof legacy.bossBeaten).toBe("undefined")
    })
})

// CROSS-DEVICE. Le miroir localStorage ne suit pas le joueur d'une machine a l'autre, alors que sa POSITION et
//   l'USURE de son equipe, elles, sont dans la save serveur. Commencer le couloir sur PC puis reprendre sur
//   telephone donnait le pire des deux mondes : reapparaitre dans la salle du trone avec une equipe amochee par
//   trois salles gagnees, et le compteur remis a ACE. Le parcours voyage donc AUSSI dans le carry.
describe("couloir platine — reprise sur un AUTRE appareil", () => {
    beforeEach(() => { for (const k of Object.keys(_ls)) delete _ls[k]; resetPlatineRun() })

    it("le parcours s'expose sous une forme transportable, et seulement s'il y a un couloir", () => {
        expect(snapshotPlatineRun()).toBeNull() // rien de charge -> rien a transporter
        const rooms = [champ("Jacanon")], h = holder("Zyran")
        setPlatineCorridor(rooms, h)
        markPlatineOpponentBeaten(); advancePlatineStep()
        const snap = snapshotPlatineRun()!
        expect(snap).toMatchObject({ v: 1, step: 1, beaten: false })
        expect(typeof snap.sig).toBe("string")
    })

    it("arriver sur une machine VIERGE avec le parcours venu de la save le reprend a la bonne etape", () => {
        const rooms = [champ("Jacanon"), champ("Mools")], h = holder("Zyran")
        setPlatineCorridor(rooms, h)
        for (let i = 0; i < 2; i++) { markPlatineOpponentBeaten(); advancePlatineStep() }
        const fromSave = snapshotPlatineRun()
        expect(getPlatineStep()).toBe(2)

        // AUTRE APPAREIL : localStorage vide, memoire vide — seule la save a voyage.
        for (const k of Object.keys(_ls)) delete _ls[k]
        resetPlatineRun()
        seedPlatineMirrorFromSave(fromSave)
        setPlatineCorridor(rooms, h)
        expect(getPlatineStep()).toBe(2)
        expect(currentPlatineOpponent()!.label).toBe("Mools")
    })

    it("le miroir LOCAL reste prioritaire : il est ecrit a chaque tour, donc plus frais que la save", () => {
        const rooms = [champ("Jacanon"), champ("Mools")], h = holder("Zyran")
        setPlatineCorridor(rooms, h)
        markPlatineOpponentBeaten(); advancePlatineStep()          // local = etape 1
        const stale = { ...snapshotPlatineRun()!, step: 0 }        // la save, elle, est en retard
        seedPlatineMirrorFromSave(stale)                           // ne doit RIEN ecraser
        resetPlatineRun(); setPlatineCorridor(rooms, h)
        expect(getPlatineStep()).toBe(1)
    })

    it("un parcours de save abime ou d'une autre version est ignore sans bruit", () => {
        const rooms = [champ("Jacanon")], h = null
        for (const junk of [null, undefined, "texte", 42, {}, { v: 2, sig: "x", step: 1 }, { v: 1, step: 1 }]) {
            for (const k of Object.keys(_ls)) delete _ls[k]
            resetPlatineRun()
            expect(() => seedPlatineMirrorFromSave(junk)).not.toThrow()
            setPlatineCorridor(rooms, h)
            expect(getPlatineStep()).toBe(0)
        }
    })

    it("un parcours venu de la save d'un couloir DIFFERENT est jete comme les autres", () => {
        const rooms = [champ("Jacanon")]
        setPlatineCorridor(rooms, holder("Zyran"))
        markPlatineOpponentBeaten(); advancePlatineStep()
        const fromSave = snapshotPlatineRun()
        for (const k of Object.keys(_ls)) delete _ls[k]
        resetPlatineRun()
        seedPlatineMirrorFromSave(fromSave)
        setPlatineCorridor(rooms, holder("Mools")) // le trone a change de main entre-temps
        expect(getPlatineStep()).toBe(0)
    })
})
