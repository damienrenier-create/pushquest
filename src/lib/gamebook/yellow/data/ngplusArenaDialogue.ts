// src/lib/gamebook/yellow/data/ngplusArenaDialogue.ts
//
// Nexus Jaune Éclair — DIALOGUES RUN 2 (New Game+) des 5 arènes RE-TYPÉES.
// Au run 1, boss et gardes récitaient leur persona d'origine. Ici chaque dresseur parle avec sa
// NOUVELLE identité run-2 (type + nom + CADEAU EXACT — fini la « Faille Sismique » annoncée à tort).
// Les BOSS peuvent en plus CLASHER l'équipe du joueur : un roast dynamique calé sur les types qu'il
// porte en équipe active. Injecté par gameStore quand activeWorld === "ngplus" (sinon prose run 1).

import { getSpecies } from "./species"
import { typeMultiplier } from "../battle/typeChart"
import type { PokeType } from "../battle/types"

const FR_TYPE: Record<PokeType, string> = {
    NORMAL: "Normal", FEU: "Feu", EAU: "Eau", PLANTE: "Plante", ELEC: "Électrik", GLACE: "Glace",
    COMBAT: "Combat", POISON: "Poison", SOL: "Sol", VOL: "Vol", PSY: "Psy", INSECTE: "Insecte",
    ROCHE: "Roche", SPECTRE: "Spectre", DRAGON: "Dragon", FEE: "Fée", METAL: "Métal", TENEBRES: "Ténèbres",
}

export interface Run2Dialogue { intro: string[]; defeat: string[] }

// Roast de boss (clash de l'équipe du joueur) : {type} = type FR détecté, {lead} = nom du meneur.
//   weak    = le joueur porte un type que l'arène DOMINE (arène ×2 dessus) → moquerie.
//   strong  = le joueur porte un type qui MENACE l'arène (×2 sur l'arène) → respect méfiant.
//   mono    = équipe 100 % d'un seul type.
//   generic = repli.
interface BossRoast { type: PokeType | null; weak?: string; strong?: string; mono?: string; generic: string }

export const RUN2_DIALOGUE: Record<string, Run2Dialogue> = {
    // ═══════════ ARÈNE 1 — VOL « Sanctuaire des Vents » — ZÉPHYRA ═══════════
    y_arena_g1: { intro: ["Une petite BRISE pour t'accueillir… rien de méchant.", "Enfin, jusqu'à ce que tu perdes pied."], defeat: ["Tu as soufflé plus fort que moi. Pfff."] },
    y_arena_g2: { intro: ["Mes oiseaux volent en NUÉE : tu ne sauras jamais lequel frappe.", "Lève les yeux… trop tard."], defeat: ["Ma nuée se disperse. Bien vu."] },
    y_arena_g3: { intro: ["RAFALE ! Dans mon couloir, celui qui hésite tombe.", "Pas le temps de réfléchir."], defeat: ["Emporté par ma propre rafale… l'ironie."] },
    y_arena_g4: { intro: ["Je n'ai qu'UN Daemon. Mais c'est un ouragan à lui tout seul.", "Accroche-toi bien."], defeat: ["Une seule bourrasque, et tu l'as domptée. Passe."] },
    y_arena_druide: {
        intro: [
            "Bienvenue au Sanctuaire des Vents. Ici, plus une racine : rien que le ciel.",
            "Je suis ZÉPHYRA. Le vent n'a ni pitié ni gravité — et toi, tu me sembles bien lourd.",
        ],
        defeat: [
            "Tu m'as prise de vitesse… moi, la vitesse incarnée. Chapeau bas.",
            "Emporte les SERRES DE L'AUBE : elles frappent TOUJOURS en premier. Un présent de rapace.",
            "Et regarde bien : mes Daemons tenaient des BAIES. Au run 2, la nature se RÉCOLTE. Cueille, et tu comprendras.",
        ],
    },

    // ═══════════ ARÈNE 2 — PSY « Nef Psychique » — CÉRÉBRA ═══════════
    y_rocharena_g1: { intro: ["Une ONDE mentale… tu la sens déjà bourdonner, non ?", "Ce n'est pas ta migraine. C'est moi."], defeat: ["Mon onde s'est brisée sur ta volonté. Étonnant."] },
    y_rocharena_g2: { intro: ["Ce que tu vois n'existe pas. Ce qui te frappe, si.", "Cinq Daemons… ou n'est-ce qu'un MIRAGE ?"], defeat: ["L'illusion se dissipe. Tu as vu clair."] },
    y_rocharena_g3: { intro: ["Je décompose ta stratégie comme un PRISME décompose la lumière.", "Chaque angle de toi m'est déjà connu."], defeat: ["Tu m'as ébloui. Avance."] },
    y_rocharena_g4: { intro: ["Ton AURA vacille. Je le sens à trois pas.", "La peur a une odeur mentale, tu sais."], defeat: ["Ton aura vient de virer à l'acier. Bien."] },
    y_rocharena_boss: {
        intro: [
            "Bienvenue dans la Nef Psychique. J'ai vu ta venue trois nuits avant toi.",
            "Je suis CÉRÉBRA. La ROCHE d'antan a cédé la place à l'ESPRIT — et le tien est un livre grand ouvert.",
        ],
        defeat: [
            "Impossible… je n'avais pas VU cette issue. Tu as échappé à ma prescience.",
            "Reçois l'ONDE CÉRÉBRALE, une déflagration psychique pure. (Oublie la vieille Faille Sismique : ici, c'est l'ESPRIT qui tranche, pas la pierre.)",
        ],
    },

    // ═══════════ ARÈNE 3 — ÉQUILIBRÉ « Temple de l'Harmonie » — HARMONIA ═══════════
    y_feuarena_g1: { intro: ["Jour et nuit, chaud et froid : l'ÉQUINOXE ne penche jamais.", "Ni faiblesse, ni force. Juste l'équilibre."], defeat: ["Tu as fait pencher la balance. Rare."] },
    y_feuarena_g2: { intro: ["Mon équipe est une MOSAÏQUE : chaque pièce couvre la précédente.", "Trouve la fissure, si tu l'oses."], defeat: ["Une pièce a cédé, et tout s'est effondré. Malin."] },
    y_feuarena_g3: { intro: ["Le combat, c'est de la NUANCE, pas de la force brute.", "Tu tapes fort ? Moi, je tape JUSTE."], defeat: ["Ta nuance valait la mienne. Passe."] },
    y_feuarena_g4: { intro: ["Un seul Daemon, mais un ALLIAGE parfait de tous les rôles.", "Indéboulonnable, celui-là."], defeat: ["Même le meilleur alliage a un point de rupture. Tu l'as trouvé."] },
    y_feuarena_boss: {
        intro: [
            "Bienvenue au Temple de l'Harmonie. Ici, aucun type ne règne : ils DANSENT tous ensemble.",
            "Je suis HARMONIA. Le feu de jadis n'était qu'une note ; moi, je joue toute la gamme.",
        ],
        defeat: [
            "Quelle partition… tu as joué juste jusqu'à la dernière mesure. Bravo.",
            "Voici la DANSE DU FAUVE : un rituel qui décuple qui l'exécute. Universelle — enseigne-la à qui tu veux.",
        ],
    },

    // ═══════════ ARÈNE 4 — INSECTE « La Grande Ruche » — REGINA ═══════════
    y_elecarena_g1: { intro: ["Un seul DARD suffit. Le reste, c'est du décor.", "Tu vas gratter un moment."], defeat: ["Mon dard s'est émoussé sur toi. Passe."] },
    y_elecarena_g2: { intro: ["Ma CHITINE encaisse tout. Toi, tu fatigues.", "Le temps joue pour la ruche."], defeat: ["Ma carapace a fêlé. Impressionnant."] },
    y_elecarena_g3: { intro: ["On ne combat pas UN insecte. On combat l'ESSAIM.", "Tu es en infériorité numérique, crois-moi."], defeat: ["L'essaim se disperse… tu as tenu bon."] },
    y_elecarena_g4: { intro: ["Mes ANTENNES sentent ta peur à trois cases.", "Inutile de bluffer."], defeat: ["Mes antennes n'avaient pas prévu ÇA. Bien joué."] },
    y_elecarena_boss: {
        intro: [
            "Bienvenue dans la Grande Ruche. L'électricité de jadis n'est plus qu'un souvenir grillé.",
            "Je suis REGINA, la Reine. Tout ce qui entre dans ma ruche finit… nourriture.",
        ],
        defeat: [
            "La ruche est tombée… la Reine s'incline. Une grande première.",
            "Prends l'ESSAIM VORACE : plus il enchaîne les coups, plus il DRAINE — comme mes ouvrières sur une carcasse. Régale-toi.",
        ],
    },

    // ═══════════ ARÈNE 5 — Finals « Salle des Colosses » — AMADIA ═══════════
    y_eauarena_g1: { intro: ["Ici, plus de bestioles. Rien que des TITANS. Toi compris ?", "Prouve-le."], defeat: ["Un titan est tombé aujourd'hui. Ce n'était pas moi… enfin, si."] },
    y_eauarena_g2: { intro: ["Ma défense est du DIAMANT. Tu vas t'y casser les crocs.", "Personne ne me raye."], defeat: ["Rayé. Par toi. Inconcevable."] },
    y_eauarena_g3: { intro: ["Mes CROCS ont brisé des montagnes. Ton équipe ? Une bouchée.", "Approche."], defeat: ["Tu m'as fait mordre la poussière. Respect."] },
    y_eauarena_g4: { intro: ["Un seul Daemon, mais taillé comme une GEMME de niveau 50.", "Le dernier rempart avant AMADIA."], defeat: ["La gemme se fend. La Salle des Colosses t'ouvre son cœur."] },
    y_eauarena_boss: {
        intro: [
            "Bienvenue dans la Salle des Colosses. L'eau d'autrefois s'est pétrifiée en TITANS.",
            "Je suis AMADIA. Devant moi, on ne nage plus : on TIENT DEBOUT — ou on est enseveli.",
        ],
        defeat: [
            "Toi… tu as fait VACILLER des colosses. Bien peu en sont capables.",
            "Reçois la FRAPPE ATLAS : elle inflige TOUJOURS ton niveau en dégâts, quoi qu'il arrive. Le poids du monde dans un seul poing.",
            "Les cinq badges re-typés sont à toi. Ce qui t'attend au-delà… dépasse l'entendement.",
        ],
    },
}

export const RUN2_BOSS_ROAST: Record<string, BossRoast> = {
    y_arena_druide: { // VOL — domine Combat/Plante/Insecte ; menacé par Élec/Roche/Glace
        type: "VOL",
        weak: "Tu m'amènes du {type} ? Mes serres ADORENT ce gibier-là. Et {lead} en éclaireur… trop mignon.",
        strong: "Du {type}, hein… la seule chose qui cloue un oiseau au sol. Malin. Mais {lead} devra d'abord me RATTRAPER.",
        generic: "Ni proie facile ni menace évidente chez toi. Voyons si {lead} et sa troupe savent DÉCOLLER.",
    },
    y_rocharena_boss: { // PSY — domine Combat/Poison ; menacé par Ténèbres/Insecte/Spectre
        type: "PSY",
        weak: "Du {type} ? Ha. Je lis tes ordres avant que tu les penses : {lead} attaquera en premier — je le sais déjà.",
        strong: "Ah, du {type}… l'angle mort de l'esprit. Tu as fait tes devoirs. Mais {lead} survivra-t-il à ce que je vais lui METTRE en tête ?",
        generic: "Ta boîte ne me cache aucune surprise. {lead}, puis les autres, dans cet ordre précis. C'est écrit.",
    },
    y_feuarena_boss: { // ÉQUILIBRÉ (aucun type dominant) — punit les équipes mono-type
        type: null,
        mono: "Une équipe 100 % {type} dans MON temple ? Une couleur unique se brise toujours sur l'arc-en-ciel. {lead} tombera le premier.",
        generic: "Je vois {lead} et sa troupe bigarrée… au moins tu as saisi un bout de l'harmonie. Reste à savoir si tu sais l'ORCHESTRER.",
    },
    y_elecarena_boss: { // INSECTE — domine Plante/Psy/Ténèbres ; menacé par Feu/Vol/Roche
        type: "INSECTE",
        weak: "Du {type} dans ta boîte ? Mes ouvrières en RAFFOLENT. {lead} fera une entrée… appétissante.",
        strong: "Du {type}, la hantise des ruches. Prudent. Mais une Reine ne se laisse pas écraser : {lead} devra d'abord passer sur mes ouvrières.",
        generic: "Ni festin ni menace évidente. {lead} et sa colonie… on va voir qui dévore qui.",
    },
    y_eauarena_boss: { // Finals (multi) — toise la puissance brute
        type: null,
        mono: "Une équipe 100 % {type} face à mes colosses ? Courageux. Ou suicidaire. {lead} en découvrira la nuance.",
        generic: "Je toise ta troupe. {lead} en tête… mes titans font trois fois son poids. La Salle des Colosses ne pardonne rien.",
    },
}

// Un GARDE ou deux par arène S'ÉMERVEILLE si le joueur porte un Daemon RARE/LÉGENDAIRE — tout en promettant de ne
//   PAS faire de quartier. Occasionnel (déclenché seulement si une pièce rare est réellement présente). {species} = son nom.
export const GUARD_ADMIRE: Record<string, string> = {
    y_arena_g2: "Attends… un {species} dans ta nuée ? Quelle merveille de bête. …Ça ne m'empêchera pas de te plumer, cela dit.",
    y_arena_g4: "Oh, un {species} ! Belle prise, dresseur, sincèrement. Ça ne changera rien : ma bourrasque t'emporte quand même.",
    y_rocharena_g2: "Mon esprit s'incline devant ton {species}… quelle aura rare. Ne crois pas pour autant que je vais te ménager.",
    y_rocharena_g4: "Ton {species} rayonne d'une aura que l'on voit rarement. Magnifique. Ça ne m'empêchera pas de la ternir un peu.",
    y_feuarena_g2: "Oh, un {species} pour compléter ta mosaïque ? Du bel ouvrage, vraiment. …Que je vais quand même devoir briser, désolé.",
    y_feuarena_g3: "Un {species}, rien que ça ? Chapeau, sincèrement. Mais l'admiration n'a jamais gagné un combat — en garde.",
    y_elecarena_g3: "Même la ruche s'émerveille : un {species} dans tes rangs ! Splendide. Ce qui ne t'épargnera pas nos mandibules.",
    y_elecarena_g4: "Mes antennes frémissent devant ton {species}… une pièce rare. Frémir, oui. Reculer, jamais.",
    y_eauarena_g2: "Un {species} ? Voilà un joyau digne de la Salle des Colosses. Je l'admire… juste avant de l'écraser. Rien de personnel.",
    y_eauarena_g4: "Ton {species} brille autant qu'une gemme, dresseur. Respect sincère. Mais nul n'entre chez AMADIA sans souffrir un peu.",
}

function fill(s: string, v: { type?: string; lead?: string; species?: string }): string {
    return s.replace("{type}", v.type ?? "").replace("{lead}", v.lead ?? "ton meneur").replace("{species}", v.species ?? "ce Daemon")
}

/** Dialogue de DÉFAITE run 2 d'un dresseur d'arène (re-talk), ou null s'il n'en a pas. */
export function run2ArenaDefeat(trainerId: string): string[] | null {
    return RUN2_DIALOGUE[trainerId]?.defeat ?? null
}

/** Dialogue d'INTRO run 2 d'un dresseur d'arène, ou null. Pour un BOSS, ajoute une réplique-clash
 *  calée sur l'ÉQUIPE ACTIVE du joueur (types portés + meneur). */
export function run2ArenaIntro(trainerId: string, team: { speciesId: string }[]): string[] | null {
    const d = RUN2_DIALOGUE[trainerId]
    if (!d) return null
    if (team.length === 0) return d.intro
    // BOSS : réplique-clash calée sur les types de l'équipe (proie / menace / mono / repli).
    const roast = RUN2_BOSS_ROAST[trainerId]
    if (roast) {
        const lead = getSpecies(team[0].speciesId)?.name ?? "ton meneur"
        const allTypes = new Set<PokeType>(team.flatMap((m) => getSpecies(m.speciesId)?.types ?? []))
        let line: string | null = null
        if (roast.type) {
            let weak: PokeType | null = null, strong: PokeType | null = null
            for (const t of allTypes) {
                if (!weak && typeMultiplier(roast.type, t) > 1) weak = t       // arène ×2 dessus → proie
                if (!strong && typeMultiplier(t, roast.type) > 1) strong = t   // ×2 sur l'arène → menace
            }
            if (weak && roast.weak) line = fill(roast.weak, { type: FR_TYPE[weak], lead })
            else if (strong && roast.strong) line = fill(roast.strong, { type: FR_TYPE[strong], lead })
        }
        if (!line && allTypes.size === 1 && roast.mono) line = fill(roast.mono, { type: FR_TYPE[[...allTypes][0]], lead })
        if (!line) line = fill(roast.generic, { lead })
        return [...d.intro, line]
    }
    // GARDE admiratif : mot bienveillant si un Daemon RARE/LÉGENDAIRE est présent (mais aucun quartier promis).
    const admire = GUARD_ADMIRE[trainerId]
    if (admire) {
        const specs = team.map((m) => getSpecies(m.speciesId))
        const star = specs.find((s) => s?.rarity === "LEGENDARY") ?? specs.find((s) => s?.rarity === "RARE")
        if (star) return [...d.intro, fill(admire, { species: star.name })]
    }
    return d.intro
}
