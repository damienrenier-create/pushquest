// src/lib/gamebook/yellow/data/fusionLeague.ts
//
// LIGUE DE FUSION — data des 5 dresseurs (Conseil 4 + Champion), chacun avec une équipe de Daemons FUSIONNÉS.
// Chaque fusion = 2 parents UNIQUES (aucun réutilisé dans TOUTE la Ligue) ; noms FIGÉS (les 21 portmanteaux) ;
// types calculés par computeFusion. Le 6e « dresseur » (miroir) est DYNAMIQUE (équipe du joueur + némésis) → il
// vit ailleurs, pas ici.
//
// Rejouable en 3 PALIERS : bronze (parents niv 80 / 75 Saiyan), argent (90 / 85), or (100 / 95). MÊMES fusions,
// MÊMES sprites (juste des parents plus forts). Les parents sont ÉPHÉMÈRES : construits à la volée, jamais persistés.

import type { MonInstance, StatKey } from "../battle/types"
import { getSpecies } from "./species"
import { signatureStat } from "./evConfig"
import { createMonInstance } from "../battle/factory"
import { buildFusion, disposeFusion, type BuiltFusion } from "./fusionMon"

export type FusionTier = "bronze" | "argent" | "or"
export const FUSION_TIERS: Record<FusionTier, { level: number; saiyan: number; label: string }> = {
    bronze: { level: 80, saiyan: 75, label: "Bronze" },
    argent: { level: 90, saiyan: 85, label: "Argent" },
    or: { level: 100, saiyan: 95, label: "Or" },
}

export interface FusionPairDef { a: string; b: string; name: string }
export interface FusionLeagueTrainer {
    key: string
    name: string    // nom du dresseur
    theme: string   // type-lore de son équipe
    icon: string
    pairs: FusionPairDef[]
}

/** Les 5 dresseurs (4 Conseil + Champion). 21 fusions, 42 parents tous distincts. */
export const FUSION_LEAGUE: FusionLeagueTrainer[] = [
    { key: "lorelei", name: "Lorelei", theme: "GLACE", icon: "🧊", pairs: [
        { a: "morrow", b: "orcaline", name: "Morcaline" },
        { a: "mobyd", b: "auroraur", name: "Aurobyd" },
        { a: "panthegel", b: "yetiroche", name: "Panthyéti" },
        { a: "iorours", b: "glaceer", name: "Glaciours" },
    ] },
    { key: "bruno", name: "Bruno", theme: "COMBAT", icon: "🥊", pairs: [
        { a: "maitrezenc", b: "enclumind", name: "Maîtreclume" },
        { a: "hebulmin", b: "tauricendre", name: "Hébultaure" },
        { a: "druidours", b: "uzumaro", name: "Druidumaro" },
        { a: "bouhbou", b: "karatame", name: "Karabouh" },
    ] },
    { key: "agatha", name: "Agatha", theme: "SPECTRE", icon: "👻", pairs: [
        { a: "ombrapanthe", b: "shadow", name: "Shadopanthe" },
        { a: "namizeus", b: "necrolopendre", name: "Nécrozeus" },
        { a: "archibouh", b: "brookhante", name: "Archibrook" },
        { a: "mycedruide", b: "necrocorbe", name: "Mycécorbe" },
    ] },
    { key: "peter", name: "Peter", theme: "DRAGON", icon: "🐉", pairs: [
        { a: "draconarque", b: "alirocaillus", name: "Draconroc" },
        { a: "cryotyran", b: "leviathonn", name: "Cryoviathan" },
        { a: "dracarlin", b: "crocodaillus", name: "Dracroco" },
    ] },
    { key: "ace", name: "ACE", theme: "-", icon: "👑", pairs: [
        { a: "golemini", b: "sylvebarbe", name: "Golésylve" },
        { a: "aquilord", b: "jerbiwat", name: "Aquilwatt" },
        { a: "vipember", b: "toucanyon", name: "Vipécan" },
        { a: "magmator", b: "rochison", name: "Magmarok" },
        { a: "loupyre", b: "thundah", name: "Thundaloup" },
        { a: "omnhippo", b: "regnantaur", name: "Omnantaur" },
    ] },
]

const STAT_KEYS: StatKey[] = ["hp", "atk", "def", "spe", "spc"]

/** 2e plus haute base d'une espèce (≠ excl) — pour l'EV secondaire d'un parent dont la signature est PV. */
function secondStat(speciesId: string, excl: StatKey): StatKey {
    const sp = getSpecies(speciesId)!
    let best: StatKey = excl === "atk" ? "spc" : "atk"
    for (const k of STAT_KEYS) if (k !== excl && sp.baseStats[k] > sp.baseStats[best]) best = k
    return best
}

/** Parent optimisé « au mieux » : 252 EV sur sa stat-signature + 252 EV en PV, tous les points Saiyan sur la signature.
 *  Boire la stat-signature → nourrit optimalement le rôle de la fusion (le split spécial suit les parents). */
function buildParent(speciesId: string, level: number, saiyan: number): MonInstance {
    const sp = getSpecies(speciesId)
    if (!sp) throw new Error(`Ligue Fusion : espèce inconnue ${speciesId}`)
    const primary = signatureStat(sp)
    const ev: Partial<Record<StatKey, number>> = {}
    if (primary === "hp") { ev.hp = 252; ev[secondStat(speciesId, "hp")] = 252 }
    else { ev[primary] = 252; ev.hp = 252 }
    return createMonInstance(speciesId, level, { ev, allocated: { [primary]: saiyan } })
}

/** Équipe de FUSIONS d'un dresseur pour un palier. Renvoie des BuiltFusion (espèces éphémères ENREGISTRÉES →
 *  à DÉTRUIRE après le combat via disposeFusionLeagueTeam). Les parents ne sont jamais persistés. */
export function buildFusionLeagueTeam(trainerKey: string, tier: FusionTier): BuiltFusion[] {
    const tr = FUSION_LEAGUE.find((t) => t.key === trainerKey)
    if (!tr) throw new Error(`Ligue Fusion : dresseur inconnu ${trainerKey}`)
    const { level, saiyan } = FUSION_TIERS[tier]
    return tr.pairs.map((p) =>
        buildFusion(buildParent(p.a, level, saiyan), buildParent(p.b, level, saiyan), { name: p.name }),
    )
}

/** Détruit les espèces éphémères d'une équipe de Ligue (fin de combat / démontage). */
export function disposeFusionLeagueTeam(team: BuiltFusion[]): void {
    for (const f of team) disposeFusion(f.speciesId)
}

/** Toutes les paires de parents (pour vérifier l'unicité / le contenu). */
export function allFusionLeaguePairs(): FusionPairDef[] {
    return FUSION_LEAGUE.flatMap((t) => t.pairs)
}
