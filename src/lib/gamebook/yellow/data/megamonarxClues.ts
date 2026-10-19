// src/lib/gamebook/yellow/data/megamonarxClues.ts
//
// 🐉🪨 MÉGAMONARX — L'ENQUÊTE (19/10/2026). Retour de Sartay : « l'indice est trop difficile à trouver ». Constat : l'unique
// indice vivait sur la fiche N°203… inatteignable (silhouette non cliquable), et ne disait rien d'exploitable. Désormais
// une ÉCHELLE d'indices, chacun débloqué par ce que le joueur a VRAIMENT fait, sans jamais écrire la recette en clair
// avant qu'il ne l'ait presque trouvée :
//   ① arrivé au Dôme Fusion          → une chimère peut transcender (le mythe existe) ;
//   ② a VU Dracolithe chez LANCE      → c'est « le dragon devenu DIAMANT » du Champion (sa fiche est VOL/ROCHE comme
//                                        Chronosidhe : « pierre » serait ambigu ; « diamant » ne désigne qu'elle chez LANCE) ;
//   ③ champion de la Ligue de Fusion  → il faut la SACRER, forgée par le joueur ;
//   ④ l'a FORGÉE à l'Autel            → il lui manque l'apogée (le niveau = celui du plus fort parent).
// Surfaces : fiche N°203 (liste cliquable + compteur « 🔍 n/4 »), carte Dracolithe du Fusiodex (naissance en énigme),
// aperçu de l'Autel quand la paire est posée, réplique de défaite de LANCE, épilogue (pointeur vers le N°203).
// Module PUR (aucun store) → testable ; les appelants passent l'état.

/** Marqueurs utilisés (constantes locales : éviter d'importer fusiodex/fusionLeague dans un module d'UI pure). */
const AUTEL_VISITED = "autel_visited"     // = AUTEL_VISITED_MARKER (fusiodex.ts)
const FUSION_CHAMPION = "fusleague_bronze" // = FUSION_TIER_MARKER.bronze → isFusionChampion (fusionLeague.ts)
const THRONE_OPEN = "fusleague_platine_open" // = FUSION_PLATINE_OPEN_MARKER : le palier actif est le Trône (le sacre classique n'y existe plus)

/** La chimère-clé : Dracolithe (Draconarque × Mégalithe), 4ᵉ fusion de LANCE. */
export const GEM_CHIMERA_ID = "lfus_dracolithe" // = leagueFusionId("Dracolithe") — figé par test (module sans dépendance, chargé par la liste du dex)
const GEM_PARENTS: readonly [string, string] = ["draconarque", "megalithe"]

/** La paire posée est-elle celle de la chimère-clé ? (ordre indifférent) */
export function isGemChimeraPair(a?: string | null, b?: string | null): boolean {
    if (!a || !b || a === b) return false
    return GEM_PARENTS.includes(a) && GEM_PARENTS.includes(b)
}

export interface MegamonarxClueCtx {
    reachedDome: boolean   // ① marqueur autel_visited
    sawGemChimera: boolean // ② Dracolithe aperçue (dex.seen, GLOBAL — durable d'un run à l'autre)
    fusionChampion: boolean // ③ bronze bouclé
    forgedIt: boolean      // ④ la paire figure au journal des fusions créées
    throneTier?: boolean   // le joueur est AU palier du Trône → l'indice ③ parle de la chaise (jamais montré avant : anti-spoiler)
}

export const MEGAMONARX_CLUE_TOTAL = 4

export function megamonarxClueContext(i: {
    markers: readonly string[]
    seen: readonly string[]
    fusionHistory: readonly { a: string; b: string }[]
}): MegamonarxClueCtx {
    return {
        reachedDome: i.markers.includes(AUTEL_VISITED),
        sawGemChimera: i.seen.includes(GEM_CHIMERA_ID),
        fusionChampion: i.markers.includes(FUSION_CHAMPION),
        forgedIt: i.fusionHistory.some((p) => isGemChimeraPair(p.a, p.b)),
        throneTier: i.markers.includes(THRONE_OPEN),
    }
}

/** Les 4 indices, dans l'ordre. ⚠️ Jamais de nom (ni du légendaire, ni de la chimère, ni de ses parents), jamais de niveau chiffré. */
export const MEGAMONARX_CLUE_LINES = {
    dome: "🔮 Une rumeur court au Dôme : une chimère poussée à son ultime limite ne redeviendrait jamais deux. Elle cesserait d'être une fusion… pour devenir quelqu'un.",
    gem: "🐉 Les anciens ne parlent que d'UNE chimère du Champion LANCE : le dragon devenu DIAMANT. Le Fusiodex garde sa trace.",
    sacre: "🏆 Pour qu'elle s'éveille, il faut la SACRER : remporter la Ligue de Fusion avec elle dans ton équipe — la tienne, forgée de tes mains à l'Autel.",
    sacreThrone: "🏆 Pour qu'elle s'éveille, il faut la SACRER : au palier du Trône, cela veut dire prendre la chaise avec elle dans ton équipe — la tienne, forgée de tes mains à l'Autel.",
    apogee: "⛰️ Tu l'as déjà forgée. Il lui manque l'APOGÉE : une chimère prend le niveau du plus fort de ses parents — mène l'un d'eux au sommet de sa croissance.",
} as const

/** Les indices débloqués, dans l'ordre de l'enquête. [] = rien encore (le texte générique de la fiche suffit). */
export function megamonarxClues(ctx: MegamonarxClueCtx): string[] {
    const out: string[] = []
    if (ctx.reachedDome) out.push(MEGAMONARX_CLUE_LINES.dome)
    if (ctx.sawGemChimera) out.push(MEGAMONARX_CLUE_LINES.gem)
    if (ctx.fusionChampion) out.push(ctx.throneTier ? MEGAMONARX_CLUE_LINES.sacreThrone : MEGAMONARX_CLUE_LINES.sacre)
    if (ctx.forgedIt) out.push(MEGAMONARX_CLUE_LINES.apogee)
    return out
}

export function megamonarxClueCount(ctx: MegamonarxClueCtx): number {
    return megamonarxClues(ctx).length
}

/** Carte Dracolithe du Fusiodex (aperçue) : sa naissance en énigme — renvoie aux descriptions du dex des deux parents
 *  (« Grand dragon blanc régnant sur les cimes », « Titan de diamant »), sans les nommer. */
export const GEM_CHIMERA_RIDDLE = "🔮 Les archives de la Ligue notent sa naissance : un dragon blanc des cimes, un titan de diamant. On dit qu'elle n'a pas encore livré son dernier secret."

/** Aperçu de l'Autel quand la paire est posée (le joueur l'a trouvée : on confirme la piste). `level` = niveau de la fusion. */
export function gemChimeraAltarLine(level: number): string {
    return level >= 100
        ? "🔮 Le diamant et l'écaille ne font plus qu'un, à leur apogée. Il ne lui manque plus qu'un sacre."
        : "🔮 Le diamant et l'écaille frémissent l'un contre l'autre… Cette chimère attend quelque chose : son apogée, puis un sacre."
}
