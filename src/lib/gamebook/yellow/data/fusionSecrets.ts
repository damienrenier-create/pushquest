// src/lib/gamebook/yellow/data/fusionSecrets.ts
//
// 🔮 SECRETS DE FUSION — la page « Secrets » du Fusiodex (décision Sartay, 19/10/2026). Chaque fusion qui « va bien
// ensemble » (génétique boostée : inédite nommée, duo, clan, potentiel de Mimimoy) y figure en OMBRE, avec une énigme
// courte. Le premier dresseur qui la forge à l'Atelier perce le secret pour TOUT le Nexus (fête communautaire déjà en
// place, idempotente par clé) : l'ombre passe en couleur pour tous ceux qui ont le Fusiodex, avec la recette et son nom.
//
// Source unique des secrets : fusionSecretCatalog() (fusionSpecies.ts) — mêmes clés que fusionSynergy(), donc que la
// fête. Ici on ajoute ce qui sert à l'affichage : l'énigme et la « vitrine » (la paire dont on montre le sprite).
// Module PUR : les secrets percés viennent du serveur (GET /api/gamebook/yellow/synergy-gift).

import { fusionSecretCatalog, type FusionSecretDef, type FusionSecretKind } from "./fusionSpecies"

/** Un secret percé dans le Nexus (le 1er au monde). `at` = ISO. */
export interface DiscoveredSecret { key: string; by: string; at: string }

/** Ce qu'on montre sur la carte : le sprite d'une PAIRE (fusion), ou d'un Daemon seul (Mimimoy). */
export type SecretShowcase = { kind: "pair"; a: string; b: string } | { kind: "single"; id: string }

export interface FusionSecretEntry extends FusionSecretDef {
    riddle: string
    showcase: SecretShowcase
}

export const SECRET_KIND_LABEL: Record<FusionSecretKind, string> = {
    special: "Fusion inédite",
    pair: "Duo",
    clan: "Clan",
    mimimoy: "Potentiel caché",
}

/** CLANS : chaque paire a sa carte, et son énigme nomme les DEUX éléments (jamais les espèces). */
const CLAN_NOUN: Record<string, string> = { panthere: "panthères", gecko: "geckos", nouillon: "clans de Nouillon" }
const CLAN_ELEMENT: Record<string, string> = {
    florapanthe: "les lianes", panthegel: "le givre", pyropanthe: "la braise", ombrapanthe: "l'ombre", aquapanthe: "le torrent", voltapanthe: "la foudre",
    gekroc: "l'étincelle", gekraise: "le magma", gekosmic: "l'esprit", geckebre: "l'obsidienne", geaucke: "le geyser",
    pandapurna: "la panda", picassault: "l'oiseau", lievrocogne: "le lapin", // clans de Nouillon (26/10/2026)
}
function clanRiddle(d: FusionSecretDef): string | null {
    if (d.kind !== "clan" || !d.pair) return null
    const clan = d.key.split(":")[1] ?? ""
    const [x, y] = d.pair
    if (!CLAN_ELEMENT[x] || !CLAN_ELEMENT[y]) return null
    return `Deux ${CLAN_NOUN[clan] ?? "frères"} : ${CLAN_ELEMENT[x]} et ${CLAN_ELEMENT[y]}.`
}
/** Les énigmes : courtes, sans AUCUN nom d'espèce (garde-fou testé). Le triangle des starters se répond. */
export const FUSION_SECRET_RIDDLES: Record<string, string> = {
    "special:Cendrecerf": "Le cerf et la braise.",
    "special:Bourbicerf": "Le cerf et la marée.",
    "special:Vaporêve": "La braise et la marée.",
    "special:Crocaroc": "Deux crocs de pierre : l'un rampe, l'autre plane.",
    "special:Aimouflon": "Le bison et l'orage.",
    "special:Gamabunta": "Deux crapauds de légende.",
    "special:Orochitachi": "La vipère et le corbeau.",
    "special:Karmind Z": "Le moine et le forgeron.",
    "special:Lunasfer": "Le fer et la lune.",
    "special:Coccilune": "La lune et l'impératrice.",
    "pair:merorem|tonytony": "Les deux piliers du casino.",
    "pair:leviathonn|mobyd": "Deux monstres des abysses.",
    "pair:mobyd|orcaline": "Deux orques.",
    "pair:loupyre|tenebrir": "Deux loups, une meute.",
    "pair:bouhbou|karatame": "Deux arts martiaux.",
    "pair:brookhante|namizeus": "Deux âmes errantes.",
    "pair:druidours|iorours": "Deux ours : l'un des bois, l'autre des glaces.",
    "pair:coccimperatrice|colosfer": "L'impératrice et le fer.",
    "mimimoy": "Le plus insignifiant de tous… mais pas en fusion.",
}

export function fusionSecretEntries(): FusionSecretEntry[] {
    return fusionSecretCatalog().map((d) => {
        const showcase: SecretShowcase = d.pair ? { kind: "pair", a: d.pair[0], b: d.pair[1] } : { kind: "single", id: d.members?.[0] ?? "mimimoy" }
        return { ...d, riddle: FUSION_SECRET_RIDDLES[d.key] ?? clanRiddle(d) ?? "Une ombre que personne n'a encore percée.", showcase }
    })
}

/** Les secrets percés, indexés par clé (le 1er découvreur garde la paternité). */
export function discoveredByKey(list: readonly DiscoveredSecret[]): Map<string, DiscoveredSecret> {
    const out = new Map<string, DiscoveredSecret>()
    for (const d of list) if (d && d.key && !out.has(d.key)) out.set(d.key, d)
    return out
}

/** NETTETÉ D'UNE OMBRE (demande Sartay 19/10/2026) — propre à CHAQUE joueur : niveau combiné de SES deux Daemons parents
 *  (meilleur exemplaire de chaque espèce), rapporté à 200. Deux parents niveau 100 = ombre nette ; aucun des deux = une tache.
 *  Mimimoy (avec n'importe qui) : son seul niveau, sur 100. Renvoie 0..1. */
export function shadowClarity(showcase: SecretShowcase, bestLevel: (speciesId: string) => number): number {
    const lv = (id: string) => Math.max(0, Math.min(100, Math.floor(bestLevel(id) || 0)))
    const c = showcase.kind === "pair" ? (lv(showcase.a) + lv(showcase.b)) / 200 : lv(showcase.id) / 100
    return Math.max(0, Math.min(1, c))
}
/** Flou maximal (sigma gaussien, en px sur une silhouette de 140 px) : une tache méconnaissable. */
export const SHADOW_MAX_BLUR = 20 // réglé sur aperçu (19/10) : à netteté 0, une tache méconnaissable même à la taille de la carte
/** Flou appliqué par le SERVEUR : linéaire, nul à netteté 1, maximal à netteté 0. */
export function shadowBlurSigma(clarity: number): number { return SHADOW_MAX_BLUR * (1 - Math.max(0, Math.min(1, clarity))) }
/** Palier de netteté (0..20, pas de 5 %) : simple clé de cache côté navigateur — le serveur recalcule depuis la save. */
export function shadowBucket(clarity: number): number { return Math.round(Math.max(0, Math.min(1, clarity)) * 20) }
/** Meilleur niveau par espèce dans une save BRUTE (monde vivant + run 2 + run 3 ; jamais la bulle de rejeu, jetable). Lecture défensive. */
export function bestLevelsFromSave(save: unknown): Map<string, number> {
    const out = new Map<string, number>()
    const root = (save && typeof save === "object" ? save : {}) as Record<string, unknown>
    for (const w of [root, root.ngplusWorld, root.run3World]) {
        if (!w || typeof w !== "object") continue
        const world = w as { team?: unknown; pc?: unknown }
        for (const list of [world.team, world.pc]) {
            if (!Array.isArray(list)) continue
            for (const m of list) {
                const mon = (m ?? {}) as { speciesId?: unknown; level?: unknown }
                if (typeof mon.speciesId !== "string") continue
                const lv = Math.max(0, Math.min(100, Math.floor(Number(mon.level) || 0)))
                if (lv > (out.get(mon.speciesId) ?? 0)) out.set(mon.speciesId, lv)
            }
        }
    }
    return out
}
