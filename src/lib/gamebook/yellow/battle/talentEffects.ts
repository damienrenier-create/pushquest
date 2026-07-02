// src/lib/gamebook/yellow/battle/talentEffects.ts
//
// TALENTS SECRETS (créateur de Daemon) — effets de combat LÉGERS (≤5 %), lus par le moteur EXACTEMENT comme
// les objets tenus (heldItems.ts). Un talent est porté par une LIGNÉE custom (SpeciesData.secretTalent).
// N'affecte QUE les Daemons custom → `talentEffect(mon)` renvoie undefined pour toute espèce standard, donc
// le combat existant est STRICTEMENT inchangé (0 impact hors création de Daemon).

import { getSpecies } from "../data/species"
import type { PokeType } from "./types"

export interface TalentEffect {
    stabBonus?: number         // zele : +mult STAB (appliqué quand STAB)
    lowHpBonus?: number        // acharnement : bonus dégâts si cible < 25 % PV
    superEffBonus?: number     // poigne_fer : bonus dégâts si typeEff ≥ 2
    mainTypeBonus?: number     // affinite_elem : bonus dégâts si moveType == type principal
    critDmgBonus?: number      // coup_dur : bonus quand coup critique
    dmgTakenMult?: number      // cuir_epais : ×0.95 tous dégâts subis
    superEffTakenMult?: number // resistant : ×0.95 si super-efficace subi
    physTakenMult?: number     // chair_coriace : ×0.95 si physique subi
    minRandom?: number         // fine_lame : plancher du facteur aléatoire de dégâts
    critStage?: number         // coup_sort : +cran de crit (façon Lentilscope)
    incomingCritMult?: number  // anti_crit : la proba de crit de l'attaquant vs ce défenseur ×0.95
    accOutMult?: number        // oeil_lynx : précision de tes attaques ×1.05
    incomingAccMult?: number   // voile / anguille : précision des attaques ADVERSES vers toi ×0.95
    statusChanceMult?: number  // chanceux / toxine_tenace : chance des effets/statuts de tes attaques ×1.05
    statusResistMult?: number  // sang_froid : chance de subir une altération ×0.95
    flinchOut?: number         // regard_percant : % d'apeurer après attaque
    flinchResistMult?: number  // corps_sain : chance d'être apeuré ×0.95
    statDropMult?: number      // volonte_vaincre : magnitude des débuffs SUBIS ×0.95
    recoilMult?: number        // endurant : recul ×0.75
    drainDealtFrac?: number    // sangsue : soin = dégâts / N à chaque coup
    survive1hpPct?: number     // instinct_survie : % survie à 1 PV (depuis PV pleins)
    leftoversFrac?: number     // coeur_vaillant : soin de fin de tour = PVmax / N
    quickClawPct?: number      // main_leste : % d'agir en premier à priorité égale
    expMult?: number           // studieux : ×XP
    evMult?: number            // bourreau_travail : ×EV gagnés
    negateStatDrop?: boolean   // volonte_fer : annule la 1re baisse de stat (façon Herbe Blanche)
    speedMult?: number         // reflexes : ×Vitesse (fullStats)
    multiHitBonus?: number     // frappe_repetee : % de coup supplémentaire (multi-hit)
    guaranteedCritOnce?: boolean // cuirasse_mentale : 1 crit garanti / combat
}

/** Effets par clé de talent — ≤5 %, calés sur les mêmes formes que les objets tenus. */
export const TALENT_EFFECTS: Record<string, TalentEffect> = {
    // offensif
    coup_sort: { critStage: 1 },
    zele: { stabBonus: 0.05 },
    acharnement: { lowHpBonus: 0.05 },
    coup_dur: { critDmgBonus: 0.025 },
    fine_lame: { minRandom: 0.90 },
    poigne_fer: { superEffBonus: 0.05 },
    affinite_elem: { mainTypeBonus: 0.05 },
    frappe_repetee: { multiHitBonus: 5 },
    // défensif
    anti_crit: { incomingCritMult: 0.95 },
    cuir_epais: { dmgTakenMult: 0.95 },
    resistant: { superEffTakenMult: 0.95 },
    voile: { incomingAccMult: 0.95 },
    anguille: { incomingAccMult: 0.95 },
    chair_coriace: { physTakenMult: 0.95 },
    volonte_fer: { negateStatDrop: true },
    // précision / statut
    oeil_lynx: { accOutMult: 1.05 },
    sang_froid: { statusResistMult: 0.95 },
    chanceux: { statusChanceMult: 1.05 },
    regard_percant: { flinchOut: 5 },
    corps_sain: { flinchResistMult: 0.95 },
    volonte_vaincre: { statDropMult: 0.95 },
    toxine_tenace: { statusChanceMult: 1.05 },
    // survie
    endurant: { recoilMult: 0.75 },
    sangsue: { drainDealtFrac: 20 },
    instinct_survie: { survive1hpPct: 5 },
    coeur_vaillant: { leftoversFrac: 20 },
    cuirasse_mentale: { guaranteedCritOnce: true },
    // utilitaire
    reflexes: { speedMult: 1.05 },
    main_leste: { quickClawPct: 5 },
    studieux: { expMult: 1.05 },
    bourreau_travail: { evMult: 1.05 },
}

type MonRef = { speciesId?: string }

/** Effet du talent secret de la LIGNÉE du Daemon (undefined si espèce standard / sans talent). */
export function talentEffect(mon: MonRef): TalentEffect | undefined {
    const key = mon.speciesId ? getSpecies(mon.speciesId)?.secretTalent : undefined
    return key ? TALENT_EFFECTS[key] : undefined
}

/** ×Vitesse du talent (fullStats, à côté de heldStatMult). 1 si aucun. */
export function talentSpeedMult(mon: MonRef): number { return talentEffect(mon)?.speedMult ?? 1 }

/** Multiplicateur de dégâts OFFENSIFS du talent de l'attaquant selon le contexte. À FOLDER dans itemMult. */
export function talentOutgoingDmgMult(
    attacker: MonRef,
    ctx: { stab: boolean; typeEff: number; isCrit: boolean; moveType: PokeType; mainType?: PokeType; targetHpFrac: number },
): number {
    const t = talentEffect(attacker); if (!t) return 1
    let m = 1
    if (t.stabBonus && ctx.stab) m *= 1 + t.stabBonus
    if (t.lowHpBonus && ctx.targetHpFrac < 0.25) m *= 1 + t.lowHpBonus
    if (t.superEffBonus && ctx.typeEff >= 2) m *= 1 + t.superEffBonus
    if (t.mainTypeBonus && ctx.mainType && ctx.moveType === ctx.mainType) m *= 1 + t.mainTypeBonus
    if (t.critDmgBonus && ctx.isCrit) m *= 1 + t.critDmgBonus
    return m
}

/** Multiplicateur de dégâts SUBIS du talent du défenseur selon le contexte. À FOLDER dans itemMult. */
export function talentIncomingDmgMult(defender: MonRef, ctx: { typeEff: number; isPhysical: boolean }): number {
    const t = talentEffect(defender); if (!t) return 1
    let m = 1
    if (t.dmgTakenMult) m *= t.dmgTakenMult
    if (t.superEffTakenMult && ctx.typeEff >= 2) m *= t.superEffTakenMult
    if (t.physTakenMult && ctx.isPhysical) m *= t.physTakenMult
    return m
}
