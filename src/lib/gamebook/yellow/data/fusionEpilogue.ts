// src/lib/gamebook/yellow/data/fusionEpilogue.ts
//
// Contenu de l'ÉPILOGUE « Maître de la Chimère » (affiché après le sacre sur la Ligue de Fusion) :
//  - ACTE I  : revue des 6 dresseurs + le meilleur CONTRE de chacun (statique, lore/stratégie).
//  - ACTE III: checklist DYNAMIQUE des side quests qui restent (calculée depuis l'état du joueur).
// (L'ACTE II « ton équipe » est rendu directement par le panneau à partir du roster vainqueur.)
// Le petit laïus épique du Dieu Spaghetti vit dans EPILOGUE_INTRO_LINES.

/** ACTE I — les 6 combats de la Ligue de Fusion, dans l'ordre, avec leur meilleur contre-type. */
export const EPILOGUE_TRAINERS: { icon: string; name: string; theme: string; counter: string }[] = [
    { icon: "🔮", name: "WILL", theme: "Psy", counter: "TÉNÈBRES (immunisé à son Psy) — Insecte en renfort" },
    { icon: "☠️", name: "KOGA", theme: "Poison", counter: "SOL & PSY (×2 sur Poison)" },
    { icon: "🥊", name: "BRUNO", theme: "Combat", counter: "PSY, VOL ou FÉE (×2 sur Combat)" },
    { icon: "🌙", name: "KAREN", theme: "Ténèbres", counter: "COMBAT & FÉE (×2 sur Ténèbres)" },
    { icon: "🐉", name: "LANCE", theme: "Dragon (Champion)", counter: "FÉE (immunisée au Dragon), Glace, Dragon" },
    { icon: "🍝", name: "DIEU SPAGHETTI", theme: "Forme Ultime", counter: "COMBAT (×4 sur Magnébrir & Cryotony) + FÉE (les Dragons) + un mur MÉTAL" },
]

/** Laïus épique du Dieu Spaghetti, joué AVANT le panneau (séquence de dialogue). */
export const EPILOGUE_INTRO_LINES: string[] = [
    "« Ainsi s'achève la Ligue de Fusion… et commence ta légende, Maître de la Chimère. »",
    "« Laisse-moi te montrer le chemin parcouru — et celui qu'il te reste à tracer. »",
]

export interface EpilogueQuestInput {
    markers: readonly string[]   // save.defeatedTrainers (marqueurs d'événement)
    caught: readonly string[]    // pokedex.caught (ids d'espèces, global)
    dexCount: number             // nb d'espèces distinctes capturées
    domeChampionships: number
    fusionsDiscovered: number    // fusions distinctes aperçues au Fusiodex
    shinyCount: number
}

export interface EpilogueQuest { icon: string; label: string; done: boolean; hint: string }

const has = (i: EpilogueQuestInput, id: string) => i.caught.includes(id)
const mk = (i: EpilogueQuestInput, id: string) => i.markers.includes(id)

/** ACTE III — les side quests restants (done = déjà accompli). Ordre = du plus « endgame » au plus libre.
 *  Les `hint` sont des TEASERS « sans spoiler » : ils mettent sur la piste (ambiance, indice) sans donner la recette
 *  exacte des secrets (Ukognofy / Mégamonarx / Galijah). Les objectifs connus (paliers, Dôme, Pokédex…) restent clairs. */
export function fusionEpilogueQuests(i: EpilogueQuestInput): EpilogueQuest[] {
    return [
        { icon: "🐉", label: "Capturer UKOGNOFY, la fusion légendaire", done: mk(i, "ukognofy_caught"),
          hint: "On murmure qu'une présence colossale sommeille au plus profond du Nexus, et qu'elle ne se montre qu'à la nuit noire — à qui a suivi la piste d'une chimère sauvage. Seule la plus rare des Balls pourrait la retenir…" },
        { icon: "🥈", label: "Décrocher le palier ARGENT de la Ligue de Fusion", done: mk(i, "fusleague_argent"),
          hint: "Le Bronze n'était qu'une mise en bouche. Le Conseil de la Chimère te réclame à nouveau, plus aiguisé. Reviens leur montrer que tu as grandi." },
        { icon: "🥇", label: "Décrocher le palier OR de la Ligue de Fusion", done: mk(i, "fusleague_or"),
          hint: "Au sommet de la Ligue de Fusion t'attend l'épreuve ultime. Franchis-la, et un nouveau cycle s'ouvrira à toi — le pouvoir de tout recommencer." },
        { icon: "🕳️", label: "Atteindre le fond de la Grotte du Nexus (B2F)", done: mk(i, "y_pnj3_grotte_b2f"),
          hint: "La Grotte du Nexus cache bien plus de profondeurs qu'il n'y paraît. Ceux qui osent descendre jusqu'au tout dernier étage y trouvent ce que nul autre n'a vu." },
        { icon: "🐲", label: "Éveiller MÉGAMONARX (3ᵉ légendaire)", done: has(i, "megamonarx"),
          hint: "Certaines unions ne se contentent pas de fusionner deux âmes : portée à son apogée puis sacrée au firmament de la Ligue, une chimère peut en forger une troisième, immortelle. À toi de deviner quel couple de titans engendre un dieu." },
        { icon: "🌟", label: "Capturer GALIJAH (4ᵉ légendaire)", done: has(i, "galijah"),
          hint: "L'être-mystère ne se révèle qu'à ceux dont le Pokédex déborde de vies rencontrées. Continue de collectionner sans relâche : le jour venu, sa chasse s'armera d'elle-même." },
        { icon: "🏆", label: "Titre OR au Dôme de Combat", done: i.domeChampionships >= 3,
          hint: "Trois couronnes t'attendent dans l'arène du Dôme, au cœur de la Zone de Combat. La dernière, dit-on, descelle des portes que nul autre exploit n'ouvre." },
        { icon: "🧬", label: "Étoffer le Fusiodex", done: i.fusionsDiscovered >= 15,
          hint: "L'Autel de la Chimère garde la mémoire de chacune de tes créations. Multiplie les unions inédites — un Fusiodex bien rempli est la marque des grands alchimistes (15+)." },
        { icon: "📕", label: "Compléter le Pokédex (100 Daemons)", done: i.dexCount >= 100,
          hint: "Cent espèces distinctes… Explore, capture, échange sans répit : le Pokédex complet est le serment du vrai dresseur." },
        { icon: "✨", label: "Capturer un Daemon SHINY", done: i.shinyCount >= 1,
          hint: "Quelque part rôde un Daemon aux couleurs interdites, d'une rareté quasi mythique. L'œil du vrai collectionneur finit toujours par croiser cet éclat." },
    ]
}
