// src/lib/gamebook/yellow/data/legendTeller.ts
//
// LE CONTEUR — PNJ de CENDREVILLE (11,23), « à chaque run son PNJ » (demande Sartay du 27/10/2026) : même case, même rôle,
// mais UN VISAGE (planche Gen 3) PAR RUN. Il raconte qu'un LÉGENDAIRE hante la run, le décrit brièvement, VANTE SES STATS
// (lues dans species.ts → jamais désynchronisées) et explique COMMENT l'attraper (règles réelles : encounters.ts
// trainingGrid.legendary + gamin des Hautes Herbes, run3Legend, île Émeraude dans gameStore, items SUPER_MEGA_TARGET_IDS).
//   run 1 (live, Sylvebarbe endormi) → GOSHENDOFY · run 2 (ngplus) → UKOGNOS · run 3 → FLAMAROKTO · run fusion (live,
//   Sylvebarbe réveillé) → GALIJAH. Câblé via gameStore.activeNpcs (sprite + lignes recalculés à chaque liste).

import { getSpecies } from "./species"
import { HH_KID_NIGHT_START, HH_KID_DAWN_START, HH_KID_DAWN_END, HH_KID_NOON_START, HH_KID_NOON_END } from "./hhKid"
import { FLAMAROKTO_GUARANTEE_HP_FRAC } from "./run3Legend"
import { SURFER_SPECIES_GATE } from "./surferTrainer"
import { GALIJAH_DAILY_THRESHOLD } from "./galijahDaily"

export const CONTEUR_NPC_ID = "y_conteur_legende"
export const CONTEUR_NAME = "CONTEUR"
export const CONTEUR_MAP_ID = "yellow_cendreville"
/** Case (11,23) : rue basse de Cendreville, hors sorties, hors spots du Daemomaniaque. */
export const CONTEUR_POS = { x: 11, y: 23 } as const

export type ConteurRun = "run1" | "run2" | "run3" | "fusion"
export const CONTEUR_RUNS: readonly ConteurRun[] = ["run1", "run2", "run3", "fusion"]
/** Planches Gen 3 (19×4, 760×160) fournies par Sartay le 27/10/2026 — une par run. */
export const CONTEUR_SPRITES: Record<ConteurRun, string> = {
    run1: "/yellow/sprites/npc_conteur_run1_gen3.png",
    run2: "/yellow/sprites/npc_conteur_run2_gen3.png",
    run3: "/yellow/sprites/npc_conteur_run3_gen3.png",
    fusion: "/yellow/sprites/npc_conteur_fusion_gen3.png",
}
/** Le légendaire conté dans chaque run. */
export const CONTEUR_LEGEND: Record<ConteurRun, string> = { run1: "goshendofy", run2: "ukognos", run3: "flamarokto", fusion: "galijah" }
/** Seuil d'apparition de Galijah (150 espèces) — miroir de playerStore.GALIJAH_CAPTURE_THRESHOLD (module feuille, pas d'import du store). */
export const CONTEUR_GALIJAH_DEX_MIN = 150

/** Quelle version du Conteur ? live + Sylvebarbe endormi = run 1 ; live + réveillé = run fusion ; ngplus = run 2 ; run3 = run 3. */
export function conteurRun(world: string, sylvebarbeAwake: boolean): ConteurRun {
    if (world === "run3") return "run3"
    if (world === "ngplus") return "run2"
    return sylvebarbeAwake ? "fusion" : "run1"
}

const TYPE_FR: Record<string, string> = { FEE: "FÉE", ELEC: "ÉLEC", TENEBRES: "TÉNÈBRES" }
const typesFr = (types: readonly string[]) => types.map((t) => TYPE_FR[t] ?? t).join("/")

/** Portrait court (d'après dexLore.ts) + ce qui le rend redoutable. */
const PORTRAIT: Record<ConteurRun, { who: string; boast: string }> = {
    run1: { who: "un immense dragon serpentin aux écailles d'argent et d'or, couronné de bois dorés, qui plane sans ailes au gré des courants", boast: "Une muraille qui frappe comme un boulet et crache comme un volcan." },
    run2: { who: "un lutin espiègle à la tunique rouge, couronné de flammes féeriques roses, qui flotte au-dessus du sol en ricanant", boast: "Vif comme l'éclair, et une Spéciale à faire fondre n'importe quelle garde." },
    run3: { who: "une comète vivante de glace et de flammes, le troisième gardien des Hautes Herbes, le plus insaisissable des trois", boast: "Nul n'est plus rapide, et son souffle gèle et embrase dans le même éclat." },
    fusion: { who: "un petit félin spectral au pelage violet, à la crinière flamboyante et aux yeux immenses, aussi joueur qu'immatériel", boast: "Le plus complet de tous les esprits : rapide, solide, et une Spéciale sans égale." },
}

/** La ligne « stats » : PV / Attaque / Défense / Vitesse / Spécial + total, lus dans species.ts. */
export function conteurStatsLine(speciesId: string): string {
    const sp = getSpecies(speciesId)
    if (!sp) return "« Et quelles stats ! On en parle encore à voix basse. »"
    const b = sp.baseStats
    const total = b.hp + b.atk + b.def + b.spe + b.spc
    return `« Et quelles stats ! PV ${b.hp}, Attaque ${b.atk}, Défense ${b.def}, Vitesse ${b.spe}, Spécial ${b.spc} — ${total} au total. »`
}

/** Comment l'attraper, run par run (règles réelles du moteur). */
function howTo(run: ConteurRun): string[] {
    const plaine = "« Où ? Dans les HAUTES HERBES, au nord de Cendreville — la plaine s'ouvre avec le badge ÉLEC. Il rôde surtout dans l'herbe la plus BASSE de la rangée du bas, toujours au niveau 50, et il est d'une rareté folle. »"
    const capture = "« Pour le capturer : impossible sans STATUT — endors-le ou gèle-le —, une Hyper Nexus-Ball + au minimum, et descends-le au plus bas. La Super Méga Nexus-Ball du Dresseur d'Orcaline le capture À COUP SÛR sous la moitié de ses PV. »"
    switch (run) {
        case "run1": return [
            plaine,
            `« Un conseil : va écouter le GAMIN de la plaine. Une fois sa confidence entendue, reviens la NUIT, dès ${HH_KID_NIGHT_START}h : ses apparitions DOUBLENT. »`,
            capture,
        ]
        case "run2": return [
            plaine,
            `« Un conseil : va écouter le GAMIN de la plaine. Une fois sa confidence entendue, reviens à l'AUBE, entre ${HH_KID_DAWN_START}h et ${HH_KID_DAWN_END}h : ses apparitions DOUBLENT. »`,
            capture,
        ]
        case "run3": return [
            plaine,
            `« Un conseil : va écouter le GAMIN de la plaine au ZÉNITH, entre ${HH_KID_NOON_START}h et ${HH_KID_NOON_END}h. Après sa confidence, dans cette fenêtre, ses apparitions sont multipliées par DEUX ET DEMI. »`,
            `« Pour le capturer : dès qu'il est sous ${Math.round(FLAMAROKTO_GUARANTEE_HP_FRAC * 100)} % de ses PV OU sous un statut, une simple HYPER Nexus-Ball le capture À COUP SÛR. Sinon, mêmes exigences que ses frères : statut obligatoire et Hyper Nexus-Ball + au minimum. »`,
        ]
        case "fusion": return [
            `« Où ? Sur l'ÎLE ÉMERAUDE, au large de la Plage : il faut SURFER pour y aller — la CT Surf, c'est le Surfeur de la Route Nord qui l'accorde, dès ${SURFER_SPECIES_GATE} espèces au Pokédex. Dans l'eau ou les herbes hautes de l'île, jamais au premier combat du jour, puis une rencontre sur quatre. »`,
            `« Mais il ne se montre qu'aux dresseurs qui ont capturé ${CONTEUR_GALIJAH_DEX_MIN} ESPÈCES différentes. Et il revient plus fort à chaque palier du Pokédex : niveau 70, puis 80, 90, 100… Passé ${GALIJAH_DAILY_THRESHOLD} espèces, il hante l'île TOUS les jours, caché dans l'une des cinquante premières vagues. »`,
            capture,
        ]
    }
}

/** Le dialogue complet du Conteur pour une run. `caught` = le légendaire est déjà au Pokédex (toutes runs). */
export function conteurLines(run: ConteurRun, caught: boolean): string[] {
    const id = CONTEUR_LEGEND[run]
    const sp = getSpecies(id)
    const name = (sp?.name ?? id).toUpperCase()
    const types = sp ? typesFr(sp.types) : "?"
    const p = PORTRAIT[run]
    return [
        "*Un conteur assis sur une caisse te fait signe d'approcher, les yeux brillants.*",
        `« Tu sais qu'un LÉGENDAIRE hante ces terres ? ${name}, type ${types} : ${p.who}. Rares sont ceux qui l'ont vu. »`,
        `${conteurStatsLine(id)} ${p.boast}`,
        ...howTo(run),
        ...(caught ? [`« …Mais je vois à ton regard que tu l'as DÉJÀ, ${name} ! Alors c'est toi, la légende. Respect, dresseur. »`] : ["« Va, et reviens me raconter. Les légendes ont besoin de témoins. »"]),
    ]
}
