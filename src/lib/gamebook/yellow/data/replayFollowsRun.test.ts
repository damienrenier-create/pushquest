import { describe, it, expect, afterEach } from "vitest"
import fs from "node:fs"
import path from "node:path"
import {
    setActiveWorld, setReplayContext, clearReplayContext, effectiveRunWorld, hydratePlayer,
    claimBlackjackCt, blackjackNgplusPickPending, casinoPillar, blackjackLegacyApotheoseInReplay, makeTonytonyShiny, getPlayer,
} from "../store/playerStore"
import { emptyLabDefi, BLACKJACK_CT_TARGET, BLACKJACK_CT_NGPLUS_TARGET, TONYTONY_SHINY_TARGET } from "./labDefis"
import { createMonInstance } from "../battle/factory"
import { chenLabRoute } from "./labDialogues"
import { pateDeLuxeGodLines } from "./pateDeLuxeGod"

// Sartay, 27/10/2026 : « il faut suivre le run joué évidemment, ainsi que les autres rejeux ! ». Un REJEU (bulle) doit
// présenter le contenu du run REJOUÉ (PNJ, cadeaux, arènes, casino, panneaux) — effectiveRunWorld() — tandis que
// l'économie réelle (dons serveur, classements, hauts faits payés, abandon du run 2) reste sur le monde RÉEL (getActiveWorld).
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")
const inReplay = (run: "run1" | "run2" | "run3") => { setActiveWorld("replay"); setReplayContext(run, "live") }
afterEach(() => { clearReplayContext(); setActiveWorld("live") })

describe("monde effectif d'une bulle de rejeu", () => {
    it("rejeu du run 1/2/3 → live/ngplus/run3 ; hors rejeu → le monde actif", () => {
        inReplay("run1"); expect(effectiveRunWorld()).toBe("live")
        inReplay("run2"); expect(effectiveRunWorld()).toBe("ngplus")
        inReplay("run3"); expect(effectiveRunWorld()).toBe("run3")
        clearReplayContext(); setActiveWorld("ngplus"); expect(effectiveRunWorld()).toBe("ngplus")
    })
})

describe("casino d'un rejeu du run 2 : le lot du VRAI run 2 (1 CT au choix, pilier Merorem)", () => {
    const lab = (o: Partial<ReturnType<typeof emptyLabDefi>>) => ({ ...emptyLabDefi(), ...o })
    it("rejeu du run 2 : pas d'Apothéose, la récompense unique est proposée, et le pilier est Merorem", () => {
        inReplay("run2")
        hydratePlayer({ team: [], pc: [], ownedCts: [], labDefi: lab({ blackjackWon: Math.max(BLACKJACK_CT_TARGET, BLACKJACK_CT_NGPLUS_TARGET) }) })
        expect(claimBlackjackCt()).toBeNull()
        expect(blackjackNgplusPickPending()).toBe(true)
        expect(casinoPillar().name).toBe("Merorem")
    })
    it("TRANSITION : une bulle du run 2 qui a déjà touché l'Apothéose (avant le correctif) n'a pas de 2e lot", () => {
        inReplay("run2")
        hydratePlayer({ team: [], pc: [], ownedCts: [], labDefi: lab({ blackjackWon: 5000, blackjackCtClaimed: true }) })
        expect(blackjackNgplusPickPending()).toBe(false)
        expect(blackjackLegacyApotheoseInReplay()).toBe(true) // le panneau l'affiche comme « lot déjà obtenu »
        expect(read("src/app/gamebook/yellow/BlackjackPanel.tsx")).toContain("const legacyApotheose = ngplus && blackjackLegacyApotheoseInReplay()")
    })
    it("TRANSITION : le pilier déjà reçu (Tonytony) garde son nom partout et devient shiny à 5000 — pas de Merorem en plus", () => {
        inReplay("run2")
        const tony = createMonInstance("tonytony", 20)
        hydratePlayer({ team: [tony], pc: [], ownedCts: [], caughtThisRun: ["tonytony"], labDefi: lab({ tonytonyClaimed: true, casinoTotalWon: TONYTONY_SHINY_TARGET }) })
        expect(casinoPillar().name).toBe("Tonytony") // labo, croupier, roulette et message de réussite disent Tonytony
        expect(makeTonytonyShiny()).toBe("team")
        const team = getPlayer().team
        expect(team.map((m) => m.speciesId)).toEqual(["tonytony"])
        expect(team[0].shiny).toBe(true)
    })
    it("TRANSITION robuste : la trace du DON compte, pas la possession (relâché, échangé)", () => {
        inReplay("run2")
        // Tonytony reçu avant le correctif puis relâché : on redonne un Tonytony shiny, pas un Merorem.
        hydratePlayer({ team: [], pc: [], ownedCts: [], caughtThisRun: ["tonytony"], labDefi: lab({ tonytonyClaimed: true, casinoTotalWon: TONYTONY_SHINY_TARGET }) })
        expect(casinoPillar().name).toBe("Tonytony")
        expect(makeTonytonyShiny()).toBe("new")
        expect(getPlayer().team.concat(getPlayer().pc).map((m) => m.speciesId)).toEqual(["tonytony"])
        // Bulle neuve : Merorem reçu puis relâché, un Tonytony obtenu par échange → le pilier reste Merorem.
        const tony = createMonInstance("tonytony", 20)
        hydratePlayer({ team: [tony], pc: [], ownedCts: [], caughtThisRun: ["merorem"], labDefi: lab({ tonytonyClaimed: true, casinoTotalWon: TONYTONY_SHINY_TARGET }) })
        expect(casinoPillar().name).toBe("Merorem")
    })
    it("rejeu du run 2 « neuf » : c'est le Merorem qui brille ; vrai run 2 : règle inchangée", () => {
        inReplay("run2")
        const mero = createMonInstance("merorem", 20)
        hydratePlayer({ team: [mero], pc: [], ownedCts: [], labDefi: lab({ tonytonyClaimed: true, casinoTotalWon: TONYTONY_SHINY_TARGET }) })
        expect(casinoPillar().name).toBe("Merorem")
        expect(makeTonytonyShiny()).toBe("team")
        expect(getPlayer().team[0].shiny).toBe(true)
        clearReplayContext(); setActiveWorld("ngplus")
        const tony = createMonInstance("tonytony", 20)
        hydratePlayer({ team: [tony], pc: [], ownedCts: [], labDefi: lab({ tonytonyClaimed: true, casinoTotalWon: TONYTONY_SHINY_TARGET }) })
        expect(makeTonytonyShiny()).toBe("new") // vrai monde run 2 : pas de transition, un Merorem shiny comme avant
    })
    it("rejeu du run 1 : Apothéose et Tonytony, comme au vrai run 1 ; le vrai run 2 garde sa règle", () => {
        inReplay("run1")
        hydratePlayer({ team: [], pc: [], ownedCts: [], labDefi: lab({ blackjackWon: BLACKJACK_CT_TARGET }) })
        expect(blackjackNgplusPickPending()).toBe(false)
        expect(casinoPillar().name).toBe("Tonytony")
        expect(claimBlackjackCt()).not.toBeNull()
        clearReplayContext(); setActiveWorld("ngplus")
        hydratePlayer({ team: [], pc: [], ownedCts: [], labDefi: lab({ blackjackWon: 5000, blackjackCtClaimed: true }) })
        expect(blackjackNgplusPickPending()).toBe(true) // vrai monde run 2 : le drapeau run 1 hérité ne bloque rien
    })
})

describe("Pâte du Voleur : le Dieu Spaghetti ne présente pas un tiers de shiny comme un miracle", () => {
    it("répliques shiny de la Pâte du Voleur sans « une bouchée sur mille » ; la Pâte classique garde les siennes", () => {
        for (const r of [0, 0.5, 0.99]) {
            const t = pateDeLuxeGodLines("shiny_perfect", "Rochison", r, { thief: true }).join(" ")
            expect(t).toContain("Rochison"); expect(t).not.toContain("sur mille"); expect(t).not.toContain("ne se reproduira")
        }
        expect(pateDeLuxeGodLines("shiny_perfect", "Rochison", 0).join(" ")).toContain("sur mille")
        expect(pateDeLuxeGodLines("min", "Rochison", 0, { thief: true })).toEqual(pateDeLuxeGodLines("min", "Rochison", 0))
        expect(read("src/app/gamebook/yellow/YellowDevClient.tsx")).toContain("pateDeLuxeGodLines(r.outcome, nm, Math.random(), { thief: item === PATE_LUXE_VOLEUR_ITEM_ID })")
    })
})

describe("labo de CHEN : un champion en rejeu du run 3 n'est jamais verrouillé « flûte »", () => {
    it("route du run 3 (Magnetor) et pas de flûte, même Champion sans flûte", () => {
        const base = { fun: false, canAbandon: false, isChampion: true, hasFlute: false, sylvebarbeAwake: false }
        expect(chenLabRoute({ ...base, world: "run3" })).not.toBe("flute")
        expect(chenLabRoute({ ...base, world: "live" })).toBe("flute")
    })
})

describe("câblage : le contenu suit le run rejoué, l'économie réelle reste sur le monde réel", () => {
    it("écrans (Bourse, ticket du jour, casino du run 3, revente, panneaux d'arène, trophées, CHEN, blackjack)", () => {
        const ydc = read("src/app/gamebook/yellow/YellowDevClient.tsx")
        for (const s of [
            "if (effectiveRunWorld() === \"run3\" && player.run3Defeated.length >= 1",
            "if (effectiveRunWorld() === \"run3\") return // RUN 3 (et son rejeu) : casino/tickets FERMÉS",
            "if (effectiveRunWorld() === \"run3\") { // rejeu du run 3 compris : la bulle suit les règles d'énergie du concours",
            "{inCasino && effectiveRunWorld() !== \"run3\" && !battle",
            "if (effectiveRunWorld() === \"run3\") return <div style={{ textAlign: \"center\", padding: 18, fontSize: 12, opacity: 0.6 }}>Pas de revente",
            "isRun2={effectiveRunWorld() === \"ngplus\"} isRun3={effectiveRunWorld() === \"run3\"}",
            "const run3 = effectiveRunWorld() === \"run3\" // rejeu du run 3 compris (arènes re-typées",
        ]) expect(ydc, s).toContain(s)
        // L'économie RÉELLE ne bouge pas : drip des hauts faits jamais versé dans une bulle.
        expect(ydc).toContain("getActiveWorld() === \"replay\" ? []")
        const lab = read("src/app/gamebook/yellow/LabPanel.tsx")
        for (const s of ["const runWorld = effectiveRunWorld()", "const ngplus = runWorld === \"ngplus\"", "const run3 = runWorld === \"run3\"", "chenLabRoute({ fun: isFun, world: runWorld, canAbandon: canAbandonNgplus()"]) expect(lab, s).toContain(s)
        // Daemomaniaque, Pokédex, glossaire des attaques et titre STATS suivent eux aussi le run rejoué.
        expect(read("src/app/gamebook/yellow/DaemomaniaquePanel.tsx")).toContain("const w = aw === \"replay\" ? effectiveRunWorld() : aw")
        for (const f of ["src/app/gamebook/yellow/dex/DexClient.tsx", "src/app/gamebook/yellow/MovesPanel.tsx"]) expect(read(f), f).toContain("const isRun2 = w === \"ngplus\", isRun3 = w === \"run3\"")
        expect(ydc).toContain("{activeWorld === \"replay\" ? \" (rejeu)\" : \"\"}")
        const bj = read("src/app/gamebook/yellow/BlackjackPanel.tsx")
        expect(bj).not.toContain("getActiveWorld()") // la garde de transition vit dans le store (blackjackLegacyApotheoseInReplay)
        expect(bj).toContain("const ngplus = effectiveRunWorld() === \"ngplus\"")
        const rb = read("src/app/gamebook/yellow/RunBadgesPanel.tsx")
        expect(rb).toContain("if (getActiveWorld() === \"replay\" && !isRun3) footNote = \"🔁 Rejeu : ces hauts faits sont pour l'honneur.") // aucune énergie promise en bulle
        expect(rb).toContain("const isRun2 = effectiveRunWorld() === \"ngplus\""); expect(rb).toContain("const isRun3 = effectiveRunWorld() === \"run3\"")
    })
    it("Hall of Fame (arènes et Ligue) : un rejeu ouvre le run REJOUÉ ; les combats d'arène sont ceux du run rejoué (Sartay, 28/10/2026)", () => {
        const arena = read("src/app/gamebook/yellow/ArenaHallOfFamePanel.tsx")
        expect(arena).toContain("const runWorld = activeWorld === \"replay\" ? effectiveRunWorld() : activeWorld")
        expect(arena).toContain("useState<\"live\" | \"ngplus\" | \"run3\">(runWorld)")
        expect(arena).toContain("const myWorld = runWorld") // affrontements gatés sur le run rejoué (badges de la bulle)
        const league = read("src/app/gamebook/yellow/HallOfFameViewer.tsx")
        expect(league).toContain("(activeWorld === \"replay\" ? effectiveRunWorld() : activeWorld)")
        for (const [f, s] of [["arènes", arena], ["Ligue", league]]) expect(s, f).not.toContain("activeWorld === \"replay\" ? \"live\"")
        // Une conquête « bis » ne se grave toujours pas au Hall of Fame RÉEL (partagé).
        expect(read("src/app/gamebook/yellow/YellowDevClient.tsx")).toContain("REJEU : une conquête d'arène « bis » ne se grave PAS au Hall of Fame d'arène RÉEL (partagé)")
    })
    it("combats (ACE, revanches, boss d'arène, VOLTA, Collectionneur, dresseur d'Orcaline, Lavapetit)", () => {
        const bs = read("src/lib/gamebook/yellow/store/battleStore.ts")
        for (const s of [
            "if (effectiveRunWorld() === \"run3\" && b.isWild && b.enemy.team.some((e) => e.speciesId === \"lavapetit\"))",
            "const run3 = effectiveRunWorld() === \"run3\" // rejeu du run 3 : même barème",
            "const revBoost = effectiveRunWorld() === \"ngplus\" ? arenaRevancheBoost(id) : null",
            "if (effectiveRunWorld() === \"run3\") { // rejeu du run 3 compris (même dialogue côté gameStore)",
            "const ngplus = effectiveRunWorld() === \"ngplus\" // cadeau = celui du run JOUÉ",
            "const inNgplus = effectiveRunWorld() === \"ngplus\" // rejeu du run 2 : CT signature + ticket du boss",
            "if (badgeAwarded && effectiveRunWorld() === \"live\") grantRouletteTicket(ARENA_TICKET_VALUE)",
            "if (t?.giftCt && effectiveRunWorld() === \"live\" && grantCt(t.giftCt))",
            "!inNgplus && effectiveRunWorld() !== \"run3\") chainRematchId",
        ]) expect(bs, s).toContain(s)
        // Restés sur le monde RÉEL (décisions produit, cf. audit) : Salle Dorée du run 2 et compteur d'abandon.
        expect(bs).toContain("const ngplusMaitre = getActiveWorld() === \"ngplus\"")
        expect(bs).toContain("if (getActiveWorld() === \"ngplus\") incNgplusBattles()")
    })
    it("carte et PNJ (Brocanteur, ACE, Centrale, Tour Hertz, CHEN, assistant, Collectionneur, VOLTA, revanches)", () => {
        const gs = read("src/lib/gamebook/yellow/store/gameStore.ts")
        for (const s of [
            "const ngplus = effectiveRunWorld() === \"ngplus\" // RUN JOUÉ (rejeu du run 2 → Morrow",
            "const ngplus = effectiveRunWorld() === \"ngplus\" // RUN JOUÉ : un rejeu du run 2 affronte l'ACE du run 2",
            "if (effectiveRunWorld() === \"run3\" && targetMapId === \"yellow_centrale\") run3CentralePity",
            "if (npc.id === \"y_elecarena_sign\" && (effectiveRunWorld() === \"ngplus\" || effectiveRunWorld() === \"run3\"))",
            "fun, world: effectiveRunWorld(), canAbandon: canAbandonNgplus()",
            "const assistantLines = effectiveRunWorld() === \"run3\" ? LAB_ASSISTANT_LINES_RUN3",
            "const world = effectiveRunWorld() // RUN JOUÉ (même choix que doHhTrade)",
            "if (effectiveRunWorld() === \"run3\") { // rejeu du run 3 compris (même test que la victoire, battleStore)",
            "!isTrainerDefeated(trainer.id) && effectiveRunWorld() === \"live\") { // rejeu du run 1 : verrou aussi",
            "const inNgplus = effectiveRunWorld() === \"ngplus\" // rejeu du run 2 : revanches du run 2",
        ]) expect(gs, s).toContain(s)
        expect(gs).toContain("sudGateBlockedByRun(getActiveWorld()") // garde Sud de Sylvebarbe : voulu pour toute bulle
        expect(gs).toContain("const ngEasyWild = getActiveWorld() === \"ngplus\"") // démarrage motivant : décision produit
        expect(read("src/lib/gamebook/yellow/store/clanChief.ts")).toContain("if (effectiveRunWorld() !== \"run3\" && lvl > CLAN_ENERGY_GIFT_LEVEL")
        const ps = read("src/lib/gamebook/yellow/store/playerStore.ts")
        expect(ps).toContain("const inRun3 = effectiveRunWorld() === \"run3\" // run 3 ET rejeu du run 3 : même sceau")
        expect(ps).toContain("if ((getActiveWorld() === \"replay\" || worldMayBeDiscarded()) && !elsewhere) return") // vœux NEUFS : attendent un vrai monde (bulle, ou run 2 encore abandonnable)
    })
})
