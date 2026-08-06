// src/lib/gamebook/yellow/data/officialFusions.ts
//
// Registre des fusions OFFICIELLES (celles qui ont un nom + un sprite dédié) indexé par PAIRE DE PARENTS
// (espèces, n'importe quel ordre). Sert à reconnaître, quand un JOUEUR fabrique une fusion à l'Atelier, qu'il
// vient de recréer une fusion connue → on lui redonne son NOM et son SPRITE officiels (les stats, elles, restent
// calculées depuis SES Daemons). Couvre : les 23 fusions de la Ligue Johto + 4 du boss + 2 de l'épreuve + 5 fusions
// de base + les 20 anciennes fusions Kanto RETIRÉES mais gardées en « bonus » (sprites déjà générés, cf. plus bas).
//
// Règle Sartay : « dès que la paire matche et qu'elle a un sprite, on l'utilise ». Sinon → MissingNo (cf. buildFusion).
// Registre bâti PARESSEUSEMENT (1er appel) → évite tout souci d'ordre d'import (cycle fusionMon ↔ fusionLeague).

import { FUSION_LEAGUE, FUSION_BOSS_PAIRS } from "./fusionLeague"
import { FUSION_TRIAL_PAIRS } from "./fusionTrial"
import { FUSION_BASE_PARENTS, FUSION_BASE_SPECIES } from "./fusionBaseSpecies"
import { fusionSpritePath } from "./fusionSprite"

export interface OfficialFusion { name: string; sprite: string }

/** Fusions PERSO curées à la main (hors Ligue/base) : paire de parents (ordre indifférent) → nom + sprite dédié.
 *  PRIORITAIRES sur le générateur (buildFusion lit officialFusionForParents AVANT le blob généré). Ajoutées ici
 *  quand Sartay dessine un sprite maison pour une combinaison libre → permanent, sans coût de génération. */
const FUSION_CUSTOM_PAIRS: { a: string; b: string; name: string; sprite: string }[] = [
    { a: "alirocaillus", b: "sylvebarbe", name: "Sylvaroc", sprite: fusionSpritePath("Sylvaroc") },
    { a: "gloutanoir", b: "naiadrak", name: "Naianoir", sprite: fusionSpritePath("Naianoir") },
    { a: "lunarque", b: "jerbiwat", name: "Lunarwatt", sprite: fusionSpritePath("Lunarwatt") },
    // ANCIENNES fusions du BOSS (retirées de FUSION_BOSS_PAIRS lors du passage à l'équipe « max-0.6 ») — gardées ici
    //   pour ne pas orpheliner leurs sprites + rester reconnues à l'Atelier. UKOGNOFY (goshendofy+ukognos) est
    //   RÉSERVÉE pour la vraie fin : elle n'apparaît plus dans aucune équipe mais reste une fusion officielle.
    { a: "divinpate", b: "cerfeuillu", name: "Divinliane", sprite: fusionSpritePath("Divinliane") },
    { a: "pyrokoss", b: "razmaree", name: "Pyromarée", sprite: fusionSpritePath("Pyromarée") },
    { a: "zappeureal", b: "naiadrak", name: "Zappadrak", sprite: fusionSpritePath("Zappadrak") },
    { a: "goshendofy", b: "ukognos", name: "Ukognofy", sprite: fusionSpritePath("Ukognofy") },
    { a: "shadow", b: "jerbiwat", name: "Shadowatt", sprite: fusionSpritePath("Shadowatt") }, // fusion faite-main (hors Ligue) — sprite fourni par Sartay
]

/** Fusions de l'ANCIENNE Ligue Kanto, RETIRÉES de la Ligue Johto mais gardées comme fusions « bonus » : un joueur
 *  qui recompose la paire à la Grotte/Atelier retrouve l'ancien nom + son sprite DÉJÀ généré (zéro art gaspillé).
 *  Ajoutées EN DERNIER dans le registre → toute paire encore ACTIVE (Johto, boss, épreuve, base, perso) garde son nom
 *  courant. SEULE maitrezenc+enclumind est absente d'ici : elle est reprise par la Ligue Johto (Zenclumind réutilise
 *  déjà maitreclume.png via son champ sprite). ombrapanthe+shadow N'EST PLUS reprise (Karen refondue) → Shadopanthe
 *  revient ici pour ne pas orpheliner shadopanthe.png. */
const FUSION_RETIRED_PAIRS: { a: string; b: string; name: string }[] = [
    { a: "morrow", b: "orcaline", name: "Morcaline" },
    { a: "ombrapanthe", b: "shadow", name: "Shadopanthe" },
    { a: "mobyd", b: "auroraur", name: "Aurobyd" },
    { a: "panthegel", b: "yetiroche", name: "Panthyéti" },
    { a: "orcaline", b: "cryotyran", name: "Glacyran" },
    { a: "hebulmin", b: "tauricendre", name: "Hébultaure" },
    { a: "druidours", b: "uzumaro", name: "Druidumaro" },
    { a: "bouhbou", b: "karatame", name: "Karabouh" },
    { a: "namizeus", b: "necrolopendre", name: "Nécrozeus" },
    { a: "archibouh", b: "brookhante", name: "Archibrook" },
    { a: "mycedruide", b: "necrocorbe", name: "Mycécorbe" },
    { a: "draconarque", b: "alirocaillus", name: "Draconroc" },
    { a: "cryotyran", b: "leviathonn", name: "Cryoviathan" },
    { a: "dracarlin", b: "chronorex", name: "Dracorex" },
    { a: "megalithe", b: "sylvebarbe", name: "Mégasylve" },
    { a: "aquilord", b: "jerbiwat", name: "Aquilwatt" },
    { a: "vipember", b: "toucanyon", name: "Vipécan" },
    { a: "magnetor", b: "rochison", name: "Rockator" },
    { a: "loupyre", b: "thundah", name: "Thundaloup" },
    { a: "omnhippo", b: "regnantaur", name: "Omnantaur" },
    { a: "tonytony", b: "calderont", name: "Tonyront" }, // orphelin re-câblé (sprite tonyront.png existait sans paire) — parents confirmés par Sartay
    { a: "maitrezenc", b: "aquilord", name: "Aquizenc" }, // ex-Ligue (remplacée par Aquidruide) — gardée en bonus, sprite aquizenc.png fourni
]

/** Clé de paire indépendante de l'ordre des parents. */
const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

let _registry: Map<string, OfficialFusion> | null = null
function registry(): Map<string, OfficialFusion> {
    if (_registry) return _registry
    const m = new Map<string, OfficialFusion>()
    const add = (a: string, b: string, name: string, sprite: string) => {
        const k = pairKey(a, b)
        if (!m.has(k)) m.set(k, { name, sprite }) // 1re occurrence gagne (les paires curées sont uniques de toute façon)
    }
    for (const p of FUSION_CUSTOM_PAIRS) add(p.a, p.b, p.name, p.sprite) // perso d'abord → priorité sur tout le reste
    for (const tr of FUSION_LEAGUE) for (const p of tr.pairs) add(p.a, p.b, p.name, p.sprite ?? fusionSpritePath(p.name))
    for (const p of FUSION_BOSS_PAIRS) add(p.a, p.b, p.name, p.sprite ?? fusionSpritePath(p.name))
    for (const p of FUSION_TRIAL_PAIRS) add(p.a, p.b, p.name, fusionSpritePath(p.name))
    for (const fid of Object.keys(FUSION_BASE_PARENTS)) {
        const [a, b] = FUSION_BASE_PARENTS[fid]
        const sp = FUSION_BASE_SPECIES.find((s) => s.id === fid)
        if (sp) add(a, b, sp.name, sp.sprite ?? fusionSpritePath(sp.name))
    }
    for (const p of FUSION_RETIRED_PAIRS) add(p.a, p.b, p.name, fusionSpritePath(p.name)) // anciennes Kanto « bonus » — EN DERNIER (les paires actives gagnent)
    _registry = m
    return m
}

/** Fusion OFFICIELLE (nom + sprite dédié) dont `a`,`b` sont les 2 parents (ordre indifférent), ou null. */
export function officialFusionForParents(aSpeciesId: string, bSpeciesId: string): OfficialFusion | null {
    return registry().get(pairKey(aSpeciesId, bSpeciesId)) ?? null
}
