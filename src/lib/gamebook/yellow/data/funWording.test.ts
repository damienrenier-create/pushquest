import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { repsUnit, repsIcon, notEnoughReps } from "./energyWords"
import { captureGuide, funBoostSlotsOfEntry, funSlotLabel } from "./encounters"
import { SPECIAL_OBTAIN, SPECIAL_OBTAIN_FUN_HOW } from "./captureSpecial"
import { FISHING_RARE_BASE } from "./fishing"
import { SPECIES } from "./species"
import { evaluateRun2Badges, run2EarnedBadgeIds, RUN2_BADGES, RUN2_BADGE_LABELS_FUN } from "./run2Badges"
import type { BadgeInput } from "./run1Badges"
import { aceReward, aceGiftLine } from "./ace"
import { FASHION_ROD_GIFT_LINES, FASHION_ROD_GIFT_LINES_FUN } from "./avatars"
import { duelWinLines, duelGiftEnergy, DUEL_GIFT_MAX } from "./duel"
import { getPunchline } from "./dexPunchlines"
import { TRAINERS } from "./trainers"
import { CHEN_FUN_GIFT_LINES, CHEN_FUN_GIFT_OFFER_LINES } from "./labDialogues"
import { NGPLUS_ARENA_NPCS } from "./ngplusArenas"
import { GENIE_PERSISTENT_EFFECT_KINDS, GENIE_ONCE_EFFECT_KINDS, genieFxMarker } from "./genieLamp"
import { hydratePlayer, setActiveWorld, getPlayer, applyAcceptedGenieWishEffects, consumeGenieAnnouncements, setOtherWorldMarkerCheck } from "../store/playerStore"

// Signalé par Sartay le 20/10/2026 : en mode FUN, des joueurs lisaient encore des conseils sur les pompes, le quota ou les
// « reps » — alors qu'un fun n'encode RIEN (son énergie vient des défis du labo, des hauts faits, de Chen…). Ce fichier
// verrouille (1) chaque texte rendu « fun » et (2) un GARDE-FOU sur TOUT le jeu : un nouveau texte qui parle de pompes,
// de quota ou de reps fait échouer la suite tant qu'on n'a pas vérifié qu'un joueur fun ne le lit jamais.
const NOT_FOR_FUN = /pompe|squat|quota|séance|sueur|transpir|workout|vraie vie|encod|(?<!\p{L})reps?(?!\p{L})/iu
const ROOT = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8")

// ───────────────────────────────── GARDE-FOU ─────────────────────────────────
// Même lecture que le scan de la revue du 20/10/2026 : chaînes "…" / `…` contenant un espace ou un accent (un TEXTE,
// pas un code comme "reps") + texte JSX (expressions {…} retirées), hors commentaires.
const WORDS = /pompe|squat|quota|séance|sueur|transpir|workout|vraie vie|encod|(?<![\p{L}_.])reps?(?![\p{L}_(:])/giu
const isText = (s: string) => /\p{L}/u.test(s) && /\s|[^\x00-\x7F]/.test(s)
function visibleTexts(src: string): string[] {
    const out: string[] = []
    for (const raw of src.split(/\r?\n/)) {
        const t = raw.trim()
        if (!t || t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("{/*")) continue
        const code = raw.replace(/\s\/\/\s.*$/, "").replace(/\{\/\*.*?\*\/\}/g, "")
        for (const m of code.matchAll(/"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)) {
            const s = m[1] ?? m[2] ?? ""
            if (isText(s)) out.push(s)
        }
        for (const m of code.matchAll(/>([^<>]+)</g)) {
            const txt = m[1].replace(/\{[^{}]*\}/g, " ").trim()
            if (isText(txt)) out.push(txt)
        }
    }
    return out
}
function walk(dir: string, out: string[]): string[] {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const p = `${dir}/${e.name}`
        if (e.isDirectory()) walk(p, out)
        else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(p)
    }
    return out
}
/** Occurrences RELUES le 20/10/2026, fichier par fichier : toutes réservées aux joueurs classiques (branche non-fun),
 *  jamais affichées (texte de repli d'un PNJ qui ouvre son propre écran), ou sans rapport avec le joueur (« squatté »,
 *  un Daemon qui compte SES pompes, journaux serveur…). Un écart = un texte NOUVEAU ou MODIFIÉ à relire. */
const FUN_WORDING_REVIEWED: Record<string, number> = {
    "src/app/gamebook/yellow/ArenaInfoPanel.tsx": 1,
    "src/app/gamebook/yellow/BarmanPanel.tsx": 2,
    "src/app/gamebook/yellow/DailyPokerPanel.tsx": 2,
    "src/app/gamebook/yellow/FashionPicker.tsx": 2,
    "src/app/gamebook/yellow/GameBoyShell.tsx": 1,
    "src/app/gamebook/yellow/GeneIntroCarousel.tsx": 2,
    "src/app/gamebook/yellow/GuidePanel.tsx": 5,
    "src/app/gamebook/yellow/IntroCinematic.tsx": 3,
    "src/app/gamebook/yellow/LabPanel.tsx": 7,
    "src/app/gamebook/yellow/ParkSignPanel.tsx": 11,
    "src/app/gamebook/yellow/PokerPanel.tsx": 1,
    "src/app/gamebook/yellow/SagePanel.tsx": 2,
    "src/app/gamebook/yellow/SoloPokerPanel.tsx": 1,
    "src/app/gamebook/yellow/TrocPanel.tsx": 1,
    "src/app/gamebook/yellow/UltimateChampionSacre.tsx": 1,
    "src/app/gamebook/yellow/WantedTab.tsx": 3,
    "src/app/gamebook/yellow/YellowDevClient.tsx": 11,
    "src/lib/gamebook/yellow/data/ace.ts": 1,
    "src/lib/gamebook/yellow/data/avatars.ts": 2,
    "src/lib/gamebook/yellow/data/captureSpecial.ts": 2,
    "src/lib/gamebook/yellow/data/dexLore.ts": 1,
    "src/lib/gamebook/yellow/data/dexMensurations.ts": 1,
    "src/lib/gamebook/yellow/data/dexPunchlines.ts": 3,
    "src/lib/gamebook/yellow/data/duel.ts": 2,
    "src/lib/gamebook/yellow/data/encounters.ts": 2,
    "src/lib/gamebook/yellow/data/energyWords.ts": 2,
    "src/lib/gamebook/yellow/data/ivConfig.ts": 1,
    "src/lib/gamebook/yellow/data/labDefis.ts": 7,
    "src/lib/gamebook/yellow/data/labDialogues.ts": 3,
    "src/lib/gamebook/yellow/data/parkSigns.ts": 3,
    "src/lib/gamebook/yellow/data/run1Badges.ts": 1,
    "src/lib/gamebook/yellow/data/run2Badges.ts": 1,
    "src/lib/gamebook/yellow/data/sbire.ts": 20,
    "src/lib/gamebook/yellow/data/trainers.ts": 1,
    "src/lib/gamebook/yellow/storage/saveGuard.ts": 2,
    "src/lib/gamebook/yellow/store/clanChief.ts": 1,
    "src/lib/gamebook/yellow/store/gameStore.ts": 2,
    "src/lib/gamebook/yellow/store/playerStore.ts": 1,
}

describe("GARDE-FOU — aucun nouveau texte « pompes / quota / reps » sans relecture mode fun", () => {
    it("chaque fichier du jeu a exactement les occurrences relues (sinon : relire, puis variante fun ou mise à jour)", () => {
        const files = ["src/app/gamebook/yellow", "src/lib/gamebook/yellow"].flatMap((d) => walk(d, []))
        const problems: string[] = []
        const seen = new Set<string>()
        for (const f of files) {
            const hits = visibleTexts(read(f)).map((s) => [[...s.matchAll(WORDS)].length, s] as const).filter(([n]) => n > 0)
            const n = hits.reduce((a, [k]) => a + k, 0)
            if (n) seen.add(f)
            const expected = FUN_WORDING_REVIEWED[f] ?? 0
            if (n !== expected) problems.push(`${f} : ${n} au lieu de ${expected}\n${hits.map(([, s]) => `      · ${s.slice(0, 160)}`).join("\n")}`)
        }
        for (const f of Object.keys(FUN_WORDING_REVIEWED)) if (!seen.has(f)) problems.push(`${f} : plus aucune occurrence → retire-le de FUN_WORDING_REVIEWED`)
        expect(problems, "Texte nouveau/modifié qui parle de pompes, de quota ou de reps. S'il peut être LU par un joueur FUN, " +
            "donne-lui une variante fun (energyWords.ts, *_FUN, getGameMode() === \"fun\"). Sinon, mets à jour FUN_WORDING_REVIEWED.\n" + problems.join("\n")).toEqual([])
    })
})

// ───────────────────────────── TEXTES DU MODE FUN ─────────────────────────────
describe("mode fun — vocabulaire de l'énergie", () => {
    it("⚡ et « énergie » en fun, « reps » en muscu", () => {
        expect(repsUnit(true)).toBe("⚡")
        expect(repsUnit(false)).toBe(" reps")
        expect(repsIcon(true)).toBe("⚡")
        expect(repsIcon(false)).toBe("💪")
        expect(notEnoughReps(true)).not.toMatch(NOT_FOR_FUN)
        expect(notEnoughReps(false)).toBe("Pas assez de reps.")
    })
})

describe("mode fun — guide de capture du Daemomaniaque", () => {
    const allLines = (fun: boolean, run: number) => Object.keys(SPECIES).flatMap((id) => {
        const g = captureGuide(id, run, false, true, true, fun)
        return [...g.where, ...g.how, g.note ?? ""]
    })
    it("⚠️ en fun, AUCUNE fiche (3 runs, toutes les espèces) ne parle d'exercices, de reps ou de quota", () => {
        for (const run of [1, 2, 3]) for (const line of allLines(true, run)) expect(line).not.toMatch(NOT_FOR_FUN)
    })
    it("le guide classique garde la règle des exercices (le mode normal ne change pas)", () => {
        expect(allLines(false, 1).some((l) => l.includes("pompes/squats"))).toBe(true)
    })
    it("en fun, le guide annonce les CRÉNEAUX HORAIRES qui boostent vraiment l'entrée de pop (type tiré + fenêtre horaire)", () => {
        const labels = (e: Parameters<typeof funBoostSlotsOfEntry>[0]) => funBoostSlotsOfEntry(e).map(funSlotLabel)
        const eau = Object.values(SPECIES).find((s) => s.types.length === 1 && s.types[0] === "EAU")!
        expect(labels({ speciesId: eau.id, base: 1 })).toEqual(["de 13h à 17h"])
        // Colibraise (Vol/Feu) : aube (Vol) + soirée (Feu)… mais sa fenêtre 5h-12h ferme la soirée → seulement l'aube.
        expect(labels({ speciesId: "colibraise", base: 1 })).toEqual(["de 5h à 9h", "de 17h à 21h"])
        expect(labels({ speciesId: "colibraise", base: 1, hourRange: [5, 12] })).toEqual(["de 5h à 9h"])
        const all = Object.keys(SPECIES).flatMap((id) => captureGuide(id, 1, false, true, true, true).how)
        expect(all.some((l) => l.startsWith("🕐 Mode fun : il sort plus souvent"))).toBe(true)
    })
    it("pêche : la fiche fun dit « environ 1 lancer sur 8 », soit la vraie chance de RARE sans reps", () => {
        for (const id of Object.keys(SPECIAL_OBTAIN_FUN_HOW)) expect(SPECIAL_OBTAIN[id]).toBeDefined()
        expect(Math.round(1 / FISHING_RARE_BASE)).toBe(8)
        for (const id of ["osquille", "ro"]) expect(captureGuide(id, 1, false, true, true, true).how.join(" ")).toContain("1 lancer sur 8")
    })
})

describe("mode fun — hauts faits du run 2", () => {
    const base = { caught: [], seen: [], mons: [], markers: [], labDefiDone: false, isChampion: false } as unknown as BadgeInput
    it("« défi du Labo (vrai workout) » devient, en fun, un défi CT du labo — même palier, même énergie", () => {
        const fun = evaluateRun2Badges(base, true).badges.find((b) => b.id === "r2_lab_defi")!
        expect(fun.label).not.toMatch(NOT_FOR_FUN)
        expect(fun.earned).toBe(false)
        expect(run2EarnedBadgeIds({ ...base, labCtWins: 1 }, true)).toContain("r2_lab_defi")
        expect(run2EarnedBadgeIds({ ...base, labDefiDone: true }, true)).not.toContain("r2_lab_defi")
        expect(run2EarnedBadgeIds({ ...base, labDefiDone: true })).toContain("r2_lab_defi") // muscu : inchangé
    })
    it("aucun libellé de haut fait vu par un fun ne parle de pompes, de quota ou de reps", () => {
        for (const b of RUN2_BADGES) expect(RUN2_BADGE_LABELS_FUN[b.id]).not.toMatch(NOT_FOR_FUN)
    })
    it("le DOUBLE de la Salle Dorée reste une SURPRISE tant qu'il n'est pas battu", () => {
        const before = evaluateRun2Badges(base, true).badges.find((b) => b.id === "r2_double")!
        expect(before.label).not.toMatch(/double/i)
        const after = evaluateRun2Badges({ ...base, isChampion: true }, true).badges.find((b) => b.id === "r2_double")!
        expect(after.label).toMatch(/DOUBLE/)
    })
})

describe("mode fun — dialogues", () => {
    it("ACE paie en « énergies » (et le run 3 sans « reps »)", () => {
        for (let n = 1; n <= 10; n++) for (const run3 of [false, true]) expect(aceReward(n, run3, true).message).not.toMatch(NOT_FOR_FUN)
        expect(aceReward(1, false).message).toContain("100 reps") // muscu : inchangé
    })
    it("ACE annonce le VRAI cadeau de la 7e victoire : son Némésis au run 2, le Panthéon sinon", () => {
        expect(aceGiftLine(2, "nemesis")).toContain("NÉMÉSIS")
        expect(aceGiftLine(2)).toContain("Panthéon")
        expect(aceGiftLine(7, "nemesis")).not.toContain("Panthéon")
    })
    it("Fashion Victim : même gag, sans « l'argent de tes reps »", () => {
        expect(FASHION_ROD_GIFT_LINES_FUN).toHaveLength(FASHION_ROD_GIFT_LINES.length)
        for (const l of FASHION_ROD_GIFT_LINES_FUN) expect(l).not.toMatch(NOT_FOR_FUN)
    })
    it("duel de reflet : pas de sueur en fun, et le montant annoncé = le vrai versement du serveur", () => {
        const lines = duelWinLines("Mools", { refund: 40, ctDropped: false, energyToOpp: duelGiftEnergy(120, 30), ballLabel: "Nexus-Ball" }, true)
        for (const l of lines) expect(l).not.toMatch(/sueur|sué/i)
        expect(lines.join(" ")).toContain("240⚡")
        expect(duelGiftEnergy(120, 30)).toBe(240)
        expect(duelGiftEnergy(0, 30)).toBe(30)
        expect(duelGiftEnergy(40000, 30)).toBe(DUEL_GIFT_MAX)
        expect(read("src/app/api/gamebook/yellow/duel-gift/route.ts")).toContain("duelGiftEnergy(")
    })
    it("punchlines du Pokédex : aucune séance, aucun squat en fun", () => {
        for (const id of Object.keys(SPECIES)) expect(getPunchline(id, true) ?? "").not.toMatch(/séance|squat|échauffe-toi/i)
    })
    it("dresseurs : aucune intro vue par un fun ne parle de sueur, de pompes ou de reps", () => {
        for (const t of TRAINERS) for (const l of t.introFun ?? t.intro) expect(l, t.id).not.toMatch(NOT_FOR_FUN)
    })
    it("Prof. Chen (cadeau fun) : plus de « compter tes pompes »", () => {
        for (const l of [...CHEN_FUN_GIFT_LINES(300, 1, 200), ...CHEN_FUN_GIFT_OFFER_LINES(300, 200)]) expect(l).not.toMatch(NOT_FOR_FUN)
    })
})

describe("run 2 — vocabulaire, surprise du double, arènes re-skinnées", () => {
    const code = (rel: string) => read(rel).split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).join("\n")
    it("le créateur de Daemon parle de « run 2 », jamais de « New Game+ »", () => {
        expect(code("src/app/gamebook/yellow/create/DaemonCreator.tsx")).not.toMatch(/New Game\+|NEW GAME\+/)
    })
    it("l'intro du run 2 ne dévoile pas le double (ni « ton double », ni « ta PROPRE ancienne équipe »)", () => {
        const ui = read("src/app/gamebook/yellow/YellowDevClient.tsx")
        expect(ui).not.toContain("(Ligue + ton double)")
        expect(ui).not.toContain("ta PROPRE ancienne équipe")
        expect(read("src/app/gamebook/yellow/RunScoreboardPanel.tsx")).not.toContain("<b>ton double</b>")
    })
    it("la bulle de dialogue suit le re-skin du run 2 (nom + portrait), et chaque planche existe", () => {
        const box = read("src/app/gamebook/yellow/DialogueBox.tsx")
        expect(box).toContain("NGPLUS_ARENA_NPCS[dialogue.npcId]")
        expect(box).toContain("effectiveRunWorld() === \"ngplus\"")
        for (const npc of Object.values(NGPLUS_ARENA_NPCS)) expect(fs.existsSync(path.join(ROOT, "public", npc.gen3)), npc.gen3).toBe(true)
        expect(read("src/lib/gamebook/yellow/store/gameStore.ts")).toContain("arenaRevancheIntro(npc.name,")
    })
    it("le labo d'un joueur fun n'ouvre JAMAIS l'onglet des défis physiques (mode connu après le montage)", () => {
        expect(read("src/app/gamebook/yellow/LabPanel.tsx")).toContain("const tab = isFun ? (tabState === \"phys\" ? \"fun\" : tabState)")
    })
})

// ───────────────────────── VŒUX DU GÉNIE : UNE FOIS PAR JOUEUR ─────────────────────────
describe("vœux du génie — jamais rejoués dans un 2e monde (run 2, rejeu…)", () => {
    const setup = () => { hydratePlayer({ reps: 100, repsCap: 5000, repsBankedTotal: 0, defeatedTrainers: [], items: {} }); setActiveWorld("live"); consumeGenieAnnouncements() }
    it("déjà appliqué AILLEURS : le don n'est pas reversé, le perk oui, et pas de seconde annonce", () => {
        setup()
        setOtherWorldMarkerCheck((m) => m === genieFxMarker(1)) // vœu 1 déjà exaucé au run 1
        try {
            const row = { accepted1: true, condition1: "Exaucé !", effect1: JSON.stringify([{ kind: "energy", amount: 15000 }, { kind: "ace_daily_cap" }]) }
            expect(applyAcceptedGenieWishEffects(row)).toBe(true)
            expect(getPlayer().reps).toBe(100)                                // les 15 000⚡ ne sont PAS reversés
            expect(getPlayer().defeatedTrainers).toContain("ace_daily_cap_boost") // le perk (ACE_DAILY_CAP_MARKER) suit le joueur
            expect(getPlayer().defeatedTrainers).toContain(genieFxMarker(1))
            expect(consumeGenieAnnouncements()).toEqual([])
        } finally { setOtherWorldMarkerCheck(() => false) }
    })
    it("nouveau vœu (nulle part ailleurs) : appliqué normalement", () => {
        setup()
        expect(applyAcceptedGenieWishEffects({ accepted2: true, effect2: JSON.stringify({ kind: "energy", amount: 500 }) })).toBe(true)
        expect(getPlayer().reps).toBe(600)
    })
    it("chaque type d'effet est classé « permanent » OU « don unique » (un nouveau type doit être classé)", () => {
        const src = read("src/lib/gamebook/yellow/store/playerStore.ts")
        const body = src.slice(src.indexOf("function runGenieEffect("), src.indexOf("export function applyAcceptedGenieWishEffects("))
        const kinds = [...body.matchAll(/case "([a-z_]+)"/g)].map((m) => m[1])
        expect(kinds.length).toBeGreaterThan(15)
        for (const k of kinds) expect(GENIE_PERSISTENT_EFFECT_KINDS.has(k) || GENIE_ONCE_EFFECT_KINDS.has(k), k).toBe(true)
        for (const k of GENIE_PERSISTENT_EFFECT_KINDS) expect(GENIE_ONCE_EFFECT_KINDS.has(k), k).toBe(false)
    })
    it("saveManager branche la vérification des autres mondes ET des autres profils (sinon le garde-fou ne sert à rien)", () => {
        const sm = read("src/lib/gamebook/yellow/store/saveManager.ts")
        expect(sm).toContain("setOtherWorldMarkerCheck(markerInOtherWorld)")
        expect(sm).toContain("altProfilesStash.some((p) =>")
        // Effets en attente (pendingEffects) : jamais appliqués dans une bulle de rejeu (ils y seraient perdus).
        expect(sm).toContain("getActiveWorld() === \"live\" || getActiveWorld() === \"ngplus\") && applyExternalEffects(rawFx)")
    })
    it("bulle de rejeu : un vœu NEUF attend le retour dans un vrai monde (sinon il serait payé deux fois)", () => {
        hydratePlayer({ reps: 100, repsCap: 5000, repsBankedTotal: 0, defeatedTrainers: [], items: {} }); setActiveWorld("replay")
        try {
            expect(applyAcceptedGenieWishEffects({ accepted1: true, effect1: JSON.stringify({ kind: "energy", amount: 500 }) })).toBe(false)
            expect(getPlayer().reps).toBe(100)
            expect(getPlayer().defeatedTrainers).not.toContain(genieFxMarker(1))
        } finally { setActiveWorld("live") }
    })
    it("tours ARCHIVÉS : leurs perks suivent le joueur dans un monde neuf, jamais leurs dons (ex. Rob, tour 0)", () => {
        hydratePlayer({ reps: 100, repsCap: 5000, repsBankedTotal: 0, defeatedTrainers: [], items: {} }); setActiveWorld("live"); consumeGenieAnnouncements()
        setOtherWorldMarkerCheck((m) => m === genieFxMarker(2) || m === genieFxMarker(3)) // payés au run 1
        try {
            const history = JSON.stringify([{ round: 0, accepted2: true, effect2: JSON.stringify({ kind: "energy", amount: 20000 }), accepted3: true, effect3: JSON.stringify({ kind: "ace_daily_cap" }) }])
            expect(applyAcceptedGenieWishEffects({ round: 1, history })).toBe(true)
            expect(getPlayer().reps).toBe(100)                                    // le don archivé n'est pas reversé
            expect(getPlayer().defeatedTrainers).toContain("ace_daily_cap_boost") // le perk archivé existe dans ce monde
            expect(consumeGenieAnnouncements()).toEqual([])
        } finally { setOtherWorldMarkerCheck(() => false) }
    })
    it("le plafond casino d'un vœu ne revient jamais dans un monde neuf (Jacanon : levé le 15/10 par un autre canal)", () => {
        expect(GENIE_ONCE_EFFECT_KINDS.has("casino_cap")).toBe(true)
        expect(GENIE_PERSISTENT_EFFECT_KINDS.has("casino_cap")).toBe(false)
    })
})
