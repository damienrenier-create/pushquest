import { describe, it, expect } from "vitest"
import { applyServerSave, snapshot, resetYellowChapter, abandonNewGamePlus, restartRun3, startRun3, startNewGamePlus, switchProfile, startReplay, exitReplay, startNewProfileFromRun1, geniePaidOfSave, mergeWorlds } from "./saveManager"
import { getPlayer, getActiveWorld, applyAcceptedGenieWishEffects, applyExternalEffects, consumeGenieAnnouncements, isGeniePaid, getGeniePaid, genieCatchCharges, consumeGenieCatchCharge, getEvResetCharges, consumeEvResetCharges, getDexWish, getShopSurtax, isGenieArcSeen, reapplyGenieWishes, isCasinoRestricted, genieCatchCharges as catchLeft, markTrainerDefeated, WILD_HEAL_MARKER } from "./playerStore"
import { emptySave, parseSave, type YellowSave } from "../storage/save"
import { createMonInstance } from "../battle/factory"

// Sartay, 28/10/2026 : « un vœu n'arrive qu'une fois ! donc si on rejoue le run, le vœu ne doit plus avoir lieu ! sauf
// évidemment si c'est un vœu qui dure dans le temps. c'est un bug qui arrive souvent ».
// Avant ce correctif, « déjà payé » se lisait dans les marqueurs des mondes ENCORE PRÉSENTS : abandonner le run 2, recommencer
// le run 3 ou remettre le chapitre à zéro jetait le marqueur… et le vœu se repayait au chargement suivant. Les vœux qui durent
// (charges, durée) se perdaient à la fusion, ou passaient en double dans un nouveau profil.

const fx = (effects: object[]) => JSON.stringify(effects)
const ENERGY = fx([{ kind: "energy", amount: 1000 }])
const live = (over: Partial<YellowSave> = {}): YellowSave => ({ ...emptySave(), reps: 100, repsCap: 5000, repsBankedTotal: 0, team: [createMonInstance("feuillichot", 12)], ...over })

describe("un don unique ne se repaie jamais, quoi qu'il arrive aux mondes", () => {
    it("remise à zéro du chapitre : rien n'est repayé, le perk permanent revient, les charges restent où elles en étaient", async () => {
        applyServerSave(live())
        const row = { round: 0, accepted1: true, effect1: ENERGY, condition1: "Exaucé.", accepted2: true, effect2: fx([{ kind: "wild_heal" }]), accepted3: true, effect3: fx([{ kind: "ev_reset_charges", amount: 18 }]) }
        expect(applyAcceptedGenieWishEffects(row)).toBe(true)
        expect(consumeGenieAnnouncements()).toEqual(["Exaucé."])
        expect(getPlayer().reps).toBe(1100)
        consumeEvResetCharges(5) // 13 charges restantes
        await resetYellowChapter()
        expect(getPlayer().defeatedTrainers).not.toContain("genie_fx1") // monde neuf…
        const base = getPlayer().reps
        applyAcceptedGenieWishEffects(row)
        expect(getPlayer().reps).toBe(base)                                    // …mais pas de 2e don d'énergie
        expect(consumeGenieAnnouncements()).toEqual([])                         // ni de 2e annonce du génie
        expect(getPlayer().defeatedTrainers).toContain(WILD_HEAL_MARKER)        // le vœu qui dure (perk) continue
        expect(getEvResetCharges()).toBe(13)                                    // charges ni perdues ni ré-armées à 18
        expect(snapshot().geniePaid).toEqual(expect.arrayContaining(["genie_fx1", "genie_fx2", "genie_fx3"]))
    })

    it("run 2 encore abandonnable : un vœu NEUF attend (payé là, il serait perdu avec le monde jeté) ; après l'abandon, payé une fois au run 1", async () => {
        applyServerSave({ ...live({ isChampion: true, ngplusUsed: true }), activeWorld: "ngplus", ngplusWorld: { ...live({ ngplusUsed: true }), ngplusBattles: 0 } })
        expect(getActiveWorld()).toBe("ngplus")
        const row = { round: 0, accepted1: true, effect1: fx([{ kind: "energy", amount: 1000 }, { kind: "dex_wish_days", amount: 7 }]) }
        expect(applyAcceptedGenieWishEffects(row)).toBe(false)
        expect(getPlayer().reps).toBe(100)
        expect(getDexWish()).toBeUndefined()
        expect(await abandonNewGamePlus()).toBe(true)
        expect(getActiveWorld()).toBe("live")
        const r0 = getPlayer().reps
        expect(applyAcceptedGenieWishEffects(row)).toBe(true)
        expect(getPlayer().reps).toBe(r0 + 1000)
        expect(getDexWish()?.charges).toBe(7)
        applyAcceptedGenieWishEffects(row)
        expect(getPlayer().reps).toBe(r0 + 1000) // une seule fois
    })
    it("run 2 hors fenêtre d'abandon : le vœu est payé au run 2 (une fois)", () => {
        applyServerSave({ ...live({ isChampion: true, ngplusUsed: true }), activeWorld: "ngplus", ngplusWorld: { ...live({ ngplusUsed: true }), ngplusBattles: 16 } })
        const row = { round: 0, accepted1: true, effect1: ENERGY }
        expect(applyAcceptedGenieWishEffects(row)).toBe(true)
        expect(getPlayer().reps).toBe(1100)
        applyAcceptedGenieWishEffects(row)
        expect(getPlayer().reps).toBe(1100)
    })
    it("passage au run 3 : les captures garanties du run 2 PASSENT au concours (et quittent le run 2 : pas de 2e jeu à la fusion)", async () => {
        applyServerSave({ ...live({ isChampion: true, ngplusUsed: true }), activeWorld: "ngplus", ngplusWorld: { ...live({ ngplusUsed: true, isChampion: true, defeatedTrainers: ["genie_catch_3"] }), ngplusBattles: 40 } })
        expect(genieCatchCharges()).toBe(3)
        expect(await startRun3(createMonInstance("elefer", 5))).toBe(true)
        expect(getActiveWorld()).toBe("run3")
        expect(genieCatchCharges()).toBe(3)
        expect(snapshot().ngplusWorld?.defeatedTrainers.some((m) => m.startsWith("genie_catch_"))).toBe(false)
    })

    it("nouveau départ du run 3 : les captures garanties continuent, sans se ré-armer à 5", async () => {
        applyServerSave({ ...live({ isChampion: true, ngplusUsed: true, run3Used: true }), activeWorld: "run3", ngplusWorld: live({ ngplusUsed: true }), run3World: live({ run3Used: true, badges: [] }) })
        expect(getActiveWorld()).toBe("run3")
        const row = { round: 0, accepted3: true, effect3: fx([{ kind: "guaranteed_captures", amount: 5 }]) }
        applyAcceptedGenieWishEffects(row)
        expect(genieCatchCharges()).toBe(5)
        consumeGenieCatchCharge(); consumeGenieCatchCharge()
        expect(await restartRun3(createMonInstance("elefer", 5))).toBe(true)
        expect(genieCatchCharges()).toBe(3)
        applyAcceptedGenieWishEffects(row)
        expect(genieCatchCharges()).toBe(3)
        expect(isGeniePaid("genie_fx3")).toBe(true)
    })

    it("nouveau profil (rejouer le run 1) : aucun vœu repayé, aucun état de vœu hérité en double", async () => {
        applyServerSave(live({ defeatedTrainers: ["genie_fx1"], evResetCharges: 12, shopSurtax: { until: Date.now() + 86_400_000, mult: 2 } }))
        expect(isGeniePaid("genie_fx1")).toBe(true) // rétro-rempli depuis le marqueur (save d'avant le registre)
        expect(await startNewProfileFromRun1()).toBe(true)
        expect(getPlayer().team).toEqual([])
        expect(getEvResetCharges()).toBe(0)       // restent au profil d'origine (avant : copiées dans le neuf aussi)
        expect(getShopSurtax()).toBeUndefined()
        expect(snapshot().altProfiles?.[0].evResetCharges).toBe(12)
        const r0 = getPlayer().reps
        applyAcceptedGenieWishEffects({ round: 0, accepted1: true, effect1: ENERGY })
        expect(getPlayer().reps).toBe(r0)
    })

    it("bulle de rejeu : un vœu payé au monde réel ne se repaie ni dans la bulle, ni au retour", async () => {
        applyServerSave(live())
        const row = { round: 0, accepted1: true, effect1: ENERGY }
        applyAcceptedGenieWishEffects(row)
        expect(await startReplay("run1")).toBe(true)
        const inBubble = getPlayer().reps
        applyAcceptedGenieWishEffects(row)
        expect(getPlayer().reps).toBe(inBubble)
        await exitReplay()
        const back = getPlayer().reps
        applyAcceptedGenieWishEffects(row)
        expect(getPlayer().reps).toBe(back)
        expect(getGeniePaid()).toEqual(["genie_fx1"])
    })
})

describe("registre des vœux payés : rétro-remplissage et format", () => {
    it("reconstitué depuis TOUS les mondes et les profils inactifs", () => {
        const save: YellowSave = {
            ...emptySave(), defeatedTrainers: ["genie_fx1", "y_genie_ambush"],
            ngplusWorld: { ...emptySave(), defeatedTrainers: ["genie_fx2"] },
            run3World: { ...emptySave(), geniePaid: ["genie_fx3"] },
            replayWorld: { ...emptySave(), defeatedTrainers: ["genie_fx1_r1"] },
            altProfiles: [{ ...emptySave(), run3World: { ...emptySave(), defeatedTrainers: ["genie_fx2_r2"] } }],
        }
        expect(geniePaidOfSave(save).sort()).toEqual(["genie_fx1", "genie_fx1_r1", "genie_fx2", "genie_fx2_r2", "genie_fx3"])
    })
    it("parseSave garde les seuls marqueurs de vœux, sans doublon", () => {
        const s = parseSave({ ...emptySave(), geniePaid: ["genie_fx1", "x", "genie_fx2_r1", 5, "genie_fx9", "genie_fx1"] })
        expect(s.geniePaid).toEqual(["genie_fx1", "genie_fx2_r1"])
        expect(parseSave({ ...emptySave() }).geniePaid).toBeUndefined()
    })
})

describe("vœux qui durent : la fusion de fin de run les conserve", () => {
    it("charges EV, dex wish, surtaxe, malédiction, issues garanties des Pâtes : repris du monde absorbé ; un seul compteur de captures", () => {
        const dexWish = { charges: 4, day: "2026-10-27", dex: 0, speciesId: "", level: 0, pops: 0 }
        const surtax = { until: Date.now() + 86_400_000, mult: 2 }
        const primary: YellowSave = { ...emptySave(), defeatedTrainers: ["genie_catch_2"], luxeOutcomeQueue: ["min"] }
        const secondary: YellowSave = { ...emptySave(), evResetCharges: 12, dexWish, shopSurtax: surtax, curseAbundanceStart: 123, curseFreeItemsTaken: 2, luxeOutcomeQueue: ["shiny_perfect"], geniePaid: ["genie_fx1"], defeatedTrainers: ["genie_fx1", "genie_catch_4", "abundance_curse_active"] }
        const m = mergeWorlds(primary, secondary)
        expect(m.evResetCharges).toBe(12)
        expect(m.dexWish).toEqual(dexWish)
        expect(m.shopSurtax).toEqual(surtax)
        expect(m.curseAbundanceStart).toBe(123); expect(m.curseFreeItemsTaken).toBe(2)
        expect(m.luxeOutcomeQueue).toEqual(["min", "shiny_perfect"])
        expect(m.defeatedTrainers.filter((t) => t.startsWith("genie_catch_"))).toEqual(["genie_catch_2"])
        expect(m.defeatedTrainers).toEqual(expect.arrayContaining(["genie_fx1", "abundance_curse_active"]))
        expect(m.geniePaid).toEqual(["genie_fx1"])
    })
    it("le monde gagnant garde SON état s'il en a un (jamais d'écrasement ni de somme)", () => {
        const m = mergeWorlds({ ...emptySave(), evResetCharges: 3 }, { ...emptySave(), evResetCharges: 12 })
        expect(m.evResetCharges).toBe(3)
    })
})

describe("tout ou rien face à un effet inconnu du build", () => {
    it("canal externe : un lot avec un effet inconnu n'applique rien ; tous connus → appliqué et acquittable", () => {
        applyServerSave(live())
        expect(applyExternalEffects(fx([{ kind: "energy", amount: 500 }, { kind: "effet_du_futur" }]))).toBe(false)
        expect(getPlayer().reps).toBe(100)
        expect(applyExternalEffects(fx([{ kind: "energy", amount: 500 }, { kind: "item" }]))).toBe(true) // un effet connu SANS prise (objet sans id) ne bloque plus le lot
        expect(getPlayer().reps).toBe(600)
    })
    it("vœu : un effet inconnu fait attendre le vœu ENTIER (rien payé, rien marqué)", () => {
        applyServerSave(live())
        expect(applyAcceptedGenieWishEffects({ round: 0, accepted1: true, effect1: fx([{ kind: "energy", amount: 1000 }, { kind: "effet_du_futur" }]) })).toBe(false)
        expect(getPlayer().reps).toBe(100)
        expect(isGeniePaid("genie_fx1")).toBe(false)
        expect(getPlayer().defeatedTrainers).not.toContain("genie_fx1")
    })
})

describe("ce qui DURE suit le joueur partout, une seule fois", () => {
    it("lot d'effets externes : appliqué une fois, même rechargé ou relu (acquittement perdu)", () => {
        applyServerSave(live())
        const raw = fx([{ kind: "energy", amount: 500 }, { kind: "item", id: "poke_ball", qty: 3 }])
        expect(applyExternalEffects(raw)).toBe(true)
        expect(applyExternalEffects(raw)).toBe(true)
        applyServerSave(parseSave(JSON.parse(JSON.stringify(snapshot())))) // rechargement depuis la save écrite
        expect(applyExternalEffects(raw)).toBe(true)
        expect(getPlayer().reps).toBe(600)
        expect(getPlayer().items.poke_ball).toBe(3)
    })
    it("colporteur du génie déjà battu (save d'avant le drapeau) : son embuscade ne se rejoue nulle part", async () => {
        applyServerSave(live({ defeatedTrainers: ["y_genie_ambush"] }))
        expect(isGenieArcSeen()).toBe(true)
        expect(await startReplay("run1")).toBe(true)
        expect(isGenieArcSeen()).toBe(true)
        await exitReplay()
        expect(snapshot().genieArcSeen).toBe(true)
        expect(await startNewProfileFromRun1()).toBe(true)
        expect(isGenieArcSeen()).toBe(true)
        expect(getPlayer().items.lampe_rouillee).toBe(1) // la lampe du compte : de quoi trancher un futur tour de vœux
    })
    it("« plus jamais c'est plus jamais » : le sceau suit le joueur dans un rejeu (run 1 et run 3), une bulle déjà ouverte et un profil neuf", async () => {
        applyServerSave(live({ defeatedTrainers: ["blaziper_blocked"] })) // save d'avant le registre : reconstitué depuis le monde
        expect(await startReplay("run1")).toBe(true)
        expect(getPlayer().defeatedTrainers).toContain("blaziper_blocked")
        await exitReplay()
        expect(await startReplay("run3", createMonInstance("elefer", 5))).toBe(true)
        expect(getPlayer().defeatedTrainers).toContain("blaziper_blocked") // le concours aussi
        await exitReplay()
        // bulle ouverte AVANT le registre, sceau seulement au run 1 : recopié au chargement
        applyServerSave({ ...live({ defeatedTrainers: ["voltapanthe_blocked"] }), activeWorld: "replay", replayRun: "run3", replayReturn: "live", replayWorld: { ...emptySave(), team: [createMonInstance("elefer", 5)] } })
        expect(getPlayer().defeatedTrainers).toContain("voltapanthe_blocked")
        await exitReplay()
        expect(await startNewProfileFromRun1()).toBe(true)
        expect(getPlayer().defeatedTrainers).toContain("voltapanthe_blocked")
    })
    it("perk permanent : reposé dès l'entrée dans un monde neuf (sans attendre le rechargement)", async () => {
        applyServerSave(live())
        applyAcceptedGenieWishEffects({ round: 0, accepted1: true, effect1: fx([{ kind: "wild_heal" }]) })
        expect(await startReplay("run1")).toBe(true)
        expect(getPlayer().defeatedTrainers).not.toContain(WILD_HEAL_MARKER)
        expect(reapplyGenieWishes()).toBe(true) // appelé à chaque écriture de la save (persistNow)
        expect(getPlayer().defeatedTrainers).toContain(WILD_HEAL_MARKER)
        await exitReplay()
    })
    it("casino : une levée reçue dans un monde n'est pas annulée, à la fusion, par le plafond venu de l'autre", () => {
        const m = mergeWorlds({ ...emptySave(), defeatedTrainers: ["casino_uncapped"] }, { ...emptySave(), defeatedTrainers: ["casino_restricted"] })
        expect(m.defeatedTrainers).not.toContain("casino_restricted")
        applyServerSave(live({ defeatedTrainers: ["casino_restricted"] }))
        expect(applyExternalEffects(fx([{ kind: "casino_uncap", tag: "test-fusion" }]))).toBe(true)
        expect(isCasinoRestricted()).toBe(false)
        expect(getPlayer().defeatedTrainers).toContain("casino_uncapped")
    })
})

describe("contrepartie datée : la surtaxe de la boutique suit le joueur", () => {
    it("rejeu du run 1 et du run 2 : surtaxe toujours due ; rejeu du run 3 (concours scellé) : aucune ; retour : intacte", async () => {
        const surtax = { until: Date.now() + 86_400_000, mult: 2 }
        applyServerSave(live({ shopSurtax: surtax }))
        expect(await startReplay("run1")).toBe(true)
        expect(getShopSurtax()?.mult).toBe(2)
        await exitReplay()
        expect(await startReplay("run2", createMonInstance("elefer", 5))).toBe(true)
        expect(getShopSurtax()?.mult).toBe(2)
        await exitReplay()
        expect(await startReplay("run3", createMonInstance("elefer", 5))).toBe(true)
        expect(getShopSurtax()).toBeUndefined()
        await exitReplay()
        expect(getShopSurtax()).toEqual(surtax)
    })
})

describe("tours de vœux : un vœu archivé n'est ni perdu ni repayé", () => {
    it("tour archivé SANS trace de paiement : rien n'est versé (il a pu l'être dans un monde jeté avant le registre)", () => {
        applyServerSave(live())
        const row = { round: 1, history: JSON.stringify([{ round: 0, accepted1: true, effect1: fx([{ kind: "energy", amount: 3000 }, { kind: "wild_heal" }]), condition1: "Exaucé, mortel." }]) }
        expect(applyAcceptedGenieWishEffects(row)).toBe(false)
        expect(getPlayer().reps).toBe(100)
        expect(getPlayer().defeatedTrainers).not.toContain("genie_fx1")
        expect(consumeGenieAnnouncements()).toEqual([])
    })
    it("tour archivé DÉJÀ payé : seul son perk permanent revient dans un monde neuf, sans don ni annonce", () => {
        applyServerSave(live({ geniePaid: ["genie_fx3"] }))
        const row = { round: 1, history: JSON.stringify([{ round: 0, accepted3: true, effect3: fx([{ kind: "energy", amount: 3000 }, { kind: "ace_daily_cap" }]), condition3: "ACE 7×/jour." }]) }
        expect(applyAcceptedGenieWishEffects(row)).toBe(true)
        expect(getPlayer().reps).toBe(100)
        expect(getPlayer().defeatedTrainers).toContain("genie_fx3")
        expect(consumeGenieAnnouncements()).toEqual([])
    })
})

describe("retour de revue du 28/10 : ni perte, ni doublon, ni contournement", () => {
    it("perks reposés en cours de session : un vœu NEUF n'est pas versé là (il le sera au chargement, avec son annonce)", () => {
        applyServerSave(live())
        applyAcceptedGenieWishEffects({ round: 0 }) // dernière ligne connue : aucun vœu
        applyAcceptedGenieWishEffects({ round: 0, accepted1: true, effect1: fx([{ kind: "wild_heal" }]) })
        consumeGenieAnnouncements()
        const row = { round: 0, accepted1: true, effect1: fx([{ kind: "wild_heal" }]), accepted2: true, effect2: ENERGY, condition2: "Tiens." }
        expect(applyAcceptedGenieWishEffects(row, { perksOnly: true })).toBe(false)
        expect(getPlayer().reps).toBe(100)
        expect(applyAcceptedGenieWishEffects(row)).toBe(true) // chargement suivant : versé et annoncé
        expect(getPlayer().reps).toBe(1100)
        expect(consumeGenieAnnouncements()).toEqual(["Tiens."])
    })
    it("level_drain sans sa cible dans ce monde : le lot comme le vœu ATTENDENT (rien versé, rien perdu)", () => {
        applyServerSave(live())
        const drain = fx([{ kind: "energy", amount: 8000 }, { kind: "level_drain", id: "divinpate", amount: 12 }])
        expect(applyExternalEffects(drain)).toBe(false)
        expect(applyAcceptedGenieWishEffects({ round: 0, accepted1: true, effect1: drain })).toBe(false)
        expect(getPlayer().reps).toBe(100)
        applyServerSave(live({ team: [createMonInstance("divinpate", 50)] }))
        expect(applyAcceptedGenieWishEffects({ round: 0, accepted1: true, effect1: drain })).toBe(true)
        expect(getPlayer().reps).toBe(8100)
        expect(getPlayer().team[0].level).toBe(38)
    })
    it("fusion : une fenêtre DATÉE échue ne masque pas celle qui court encore", () => {
        const now = Date.now()
        const m = mergeWorlds({ ...emptySave(), shopSurtax: { until: now - 1000, mult: 2 } }, { ...emptySave(), shopSurtax: { until: now + 86_400_000, mult: 3 } })
        expect(m.shopSurtax?.mult).toBe(3)
    })
    it("remise à zéro : verrou de Balls, plafond casino, défi némésis tenté et sceau sont conservés ; la rencontre Galijah ne passe pas", async () => {
        applyServerSave(live({ ballLockRemaining: 7, forcedEncounter: JSON.stringify({ speciesId: "galijah", level: 60, hard: true }), defeatedTrainers: ["casino_restricted", "nemesis_challenge_armed", "nemesis_challenge_done", "blaziper_blocked", "genie_catch_2"] }))
        await resetYellowChapter()
        expect(getPlayer().ballLockRemaining).toBe(7)
        expect(isCasinoRestricted()).toBe(true)
        expect(getPlayer().defeatedTrainers).toEqual(expect.arrayContaining(["nemesis_challenge_armed", "nemesis_challenge_done", "blaziper_blocked"]))
        expect(catchLeft()).toBe(2)
        expect(getPlayer().forcedEncounter).toBeUndefined()
    })
})

describe("sceaux du défi némésis : un registre du compte (« plus jamais c'est plus jamais »)", () => {
    it("suit le joueur au run 2 et après une remise à zéro ; écrit dans chaque monde de la save", async () => {
        applyServerSave({ ...live({ isChampion: true, defeatedTrainers: ["blaziper_blocked"] }) })
        expect(await startNewGamePlus(createMonInstance("elefer", 5), [])).toBe(true)
        expect(getPlayer().defeatedTrainers).toContain("blaziper_blocked")
        const snap = snapshot()
        expect(snap.nemesisSeals).toEqual(["blaziper_blocked"])
        expect(snap.ngplusWorld?.defeatedTrainers).toContain("blaziper_blocked")
        expect(parseSave(JSON.parse(JSON.stringify(snap))).nemesisSeals).toEqual(["blaziper_blocked"])
        await resetYellowChapter()
        expect(getPlayer().defeatedTrainers).toContain("blaziper_blocked")
    })
    it("une défaite pose le sceau au registre ; une REVANCHE le lève dans TOUS les mondes, sans retour au rechargement", async () => {
        applyServerSave({ ...live({ isChampion: true }) })
        expect(await startNewGamePlus(createMonInstance("elefer", 5), [])).toBe(true)
        markTrainerDefeated("voltapanthe_blocked") // défi perdu au run 2
        expect(snapshot().defeatedTrainers).toContain("voltapanthe_blocked") // recopié aussi au run 1 (stash)
        applyServerSave(parseSave(JSON.parse(JSON.stringify(snapshot())))) // rechargement
        expect(getPlayer().defeatedTrainers).toContain("voltapanthe_blocked")
        // revanche accordée par le créateur (canal externe) : sceau levé partout
        expect(applyExternalEffects(fx([{ kind: "nemesis_challenge", tag: "revanche-test" }]))).toBe(true)
        expect(getPlayer().defeatedTrainers).not.toContain("voltapanthe_blocked")
        const snap = snapshot()
        expect(snap.defeatedTrainers).not.toContain("voltapanthe_blocked") // run 1 stashé : plus de sceau périmé
        expect(snap.nemesisSeals).toEqual([])
        applyServerSave(parseSave(JSON.parse(JSON.stringify(snap))))
        expect(getPlayer().defeatedTrainers).not.toContain("voltapanthe_blocked") // ne revient pas
        expect(getPlayer().defeatedTrainers).toContain("nemesis_challenge_armed")
    })
})

describe("sceaux : retour de revue (profils, prédicat unique, revanche en attente)", () => {
    it("run 3 neuf et nouveau départ du run 3 : le sceau suit", async () => {
        applyServerSave({ ...live({ isChampion: true, ngplusUsed: true, defeatedTrainers: ["blaziper_blocked"] }), activeWorld: "ngplus", ngplusWorld: { ...live({ isChampion: true, ngplusUsed: true }), ngplusBattles: 40 } })
        expect(getPlayer().defeatedTrainers).toContain("blaziper_blocked")
        expect(await startRun3(createMonInstance("elefer", 5))).toBe(true)
        expect(getPlayer().defeatedTrainers).toContain("blaziper_blocked")
        expect(await restartRun3(createMonInstance("cornaive", 5))).toBe(true)
        expect(getPlayer().defeatedTrainers).toContain("blaziper_blocked")
    })
    it("profils : le registre des sceaux est celui du COMPTE (bascule, revanche, profil neuf)", async () => {
        applyServerSave(live())
        expect(await startNewProfileFromRun1()).toBe(true) // profil B
        markTrainerDefeated("voltapanthe_blocked") // défi perdu dans B
        expect(await switchProfile(0)).toBe(true) // retour au profil A
        expect(getPlayer().defeatedTrainers).toContain("voltapanthe_blocked") // « plus jamais » vaut aussi dans A
        expect(applyExternalEffects(fx([{ kind: "nemesis_challenge", tag: "revanche-profils" }]))).toBe(true) // revanche dans A
        expect(await switchProfile(0)).toBe(true) // retour à B : sa copie rangée est périmée
        expect(getPlayer().defeatedTrainers).not.toContain("voltapanthe_blocked")
        expect(await startNewProfileFromRun1()).toBe(true) // profil C : pas ressuscité par les copies rangées
        expect(getPlayer().defeatedTrainers).not.toContain("voltapanthe_blocked")
    })
    it("un sceau d'espèce custom à l'id long survit au rechargement (même prédicat pour le jeu et parseSave)", () => {
        const long = "custom_clx9q2w3e4r5t6y7u8i9o0p1a_dragonfeu_s1_blocked"
        expect(parseSave({ ...emptySave(), nemesisSeals: [long, "pas_un_sceau"] }).nemesisSeals).toEqual([long])
    })
    it("revanche armée et pas encore jouée : ni la fusion de fin de run, ni une save d'avant le registre ne la consomment", () => {
        const m = mergeWorlds({ ...emptySave(), defeatedTrainers: ["nemesis_challenge_armed"] }, { ...emptySave(), defeatedTrainers: ["nemesis_challenge_armed", "nemesis_challenge_done", "nemesis_acompte_voltapanthe", "voltapanthe_blocked"] })
        expect(m.defeatedTrainers).toContain("nemesis_challenge_armed")
        expect(m.defeatedTrainers).not.toContain("nemesis_challenge_done")
        expect(m.defeatedTrainers).not.toContain("nemesis_acompte_voltapanthe")
        // save d'avant le registre : ancien essai perdu au run 1, revanche armée au run 2 → le sceau n'est pas ressuscité
        applyServerSave({ ...live({ defeatedTrainers: ["voltapanthe_blocked", "nemesis_challenge_armed", "nemesis_challenge_done"] }), activeWorld: "ngplus", ngplusWorld: { ...live(), defeatedTrainers: ["nemesis_challenge_armed"], ngplusBattles: 40 } })
        expect(getPlayer().defeatedTrainers).not.toContain("voltapanthe_blocked")
        expect(snapshot().nemesisSeals).toEqual([])
    })
})
