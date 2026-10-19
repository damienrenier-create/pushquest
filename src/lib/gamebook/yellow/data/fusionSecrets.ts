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
const CLAN_NOUN: Record<string, string> = { panthere: "panthères", gecko: "geckos" }
const CLAN_ELEMENT: Record<string, string> = {
    florapanthe: "les lianes", panthegel: "le givre", pyropanthe: "la braise", ombrapanthe: "l'ombre", aquapanthe: "le torrent", voltapanthe: "la foudre",
    gekroc: "l'étincelle", gekraise: "le magma", gekosmic: "l'esprit", geckebre: "l'obsidienne", geaucke: "le geyser",
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
    "pair:druidours|kilipanda": "Deux ours… enfin, presque.",
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
