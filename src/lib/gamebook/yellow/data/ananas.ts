// src/lib/gamebook/yellow/data/ananas.ts
//
// ANANAS — le petit chercheur de baies des HAUTES HERBES de la Route Nord. Il erre (spot aléatoire par session) et
// propose UN combat par palier : après chaque victoire d'arène (runs 1-3), ou 1×/jour en run 4 (post-Sylvebarbe).
// Piloté par la MEILLEURE IA ("hof"). Son équipe = 6 Daemons ÉVOLUÉS au niveau du boss d'arène qu'on vient de battre
// (run 1-3) ou à la MOYENNE du joueur en cliquet (run 4). Il gagne +25 % d'EV & de points Saiyan par run
// (run1=25 % … run4=100 % = full). Récompenses : Baie Phénix (run 2/3), baie au hasard 20 % Phénix (run 4).
//
// PUR (data only, aucune dépendance store). Le câblage (spawn, gate, lancement, récompense) se fait en aval.

import { createMonInstance } from "../battle/factory"
import { getSpecies } from "./species"
import { baseSpeciesOf, speciesAtLevel } from "./ace"
import { distributeDomeTraining } from "../frontier/domeBudgets"
import { arenaInfo, run3ArenaInfo } from "./arenaInfos"
import { BERRY_IDS, HELD_ITEMS } from "./heldItems"
import type { MonInstance } from "../battle/types"
import type { BadgeId } from "./cts"

export const ANANAS_NPC_ID = "y_ananas"
export const ANANAS_TRAINER_ID = "ananas" // id SIMPLE (pas de préfixe réservé frontier:/duel:/hof:)

export type AnanasVariant = "run1" | "run2" | "run3" | "run4"

// EV & points Saiyan : +25 % par run → run4 = full (510 EV / ~90 Saiyan, cf. tier MAÎTRE du Dôme).
const ANANAS_TRAIN_PCT: Record<AnanasVariant, number> = { run1: 0.25, run2: 0.5, run3: 0.75, run4: 1 }
const FULL_EV = 510, FULL_SAIYAN = 90
const PHENIX = "baie_phenix"

// ROSTERS par run (espèces DE BASE → évoluées au niveau cible via speciesAtLevel). `berry` = baie TENUE :
//   null (run1 : il cherche des baies mais n'en a pas), une baie de rôle (run2), Phénix (run3), "RANDOM" (run4).
const ROSTERS: Record<AnanasVariant, { base: string; berry: string | null }[]> = {
    // RUN 1 (pré-Sylvebarbe) : 3 starters + 3 communs. AUCUNE baie (« j'en cherche mais j'en trouve pas »).
    run1: [
        { base: "feuillichot", berry: null }, // starter PLANTE
        { base: "gouttiny", berry: null },     // starter EAU
        { base: "braisille", berry: null },    // starter FEU
        { base: "plumiot", berry: null },
        { base: "cailloutchi", berry: null },
        { base: "couperin", berry: null },
    ],
    // RUN 2 : chaque Daemon tient une baie selon son RÔLE ; l'ACE (lignée Draclet, en dernier) tient une Phénix.
    run2: [
        { base: "electroatiss", berry: "baie_eclat" },  // sweeper spécial
        { base: "auroruff", berry: "baie_soin" },        // encaisseur
        { base: "ruffiant", berry: "baie_fougue" },      // sweeper physique
        { base: "lavapetit", berry: "baie_vive" },       // rapide/fragile
        { base: "nouillon", berry: "baie_pure" },        // support (anti-statut)
        { base: "draclet", berry: PHENIX },              // ACE
    ],
    // RUN 3 : TOUTE l'équipe tient une Baie Phénix.
    run3: [
        { base: "brook", berry: PHENIX }, { base: "goatiny", berry: PHENIX }, { base: "elefer", berry: PHENIX },
        { base: "cornaive", berry: PHENIX }, { base: "coccipoing", berry: PHENIX }, { base: "gekosmic", berry: PHENIX },
    ],
    // RUN 4 (run 1 post-Sylvebarbe) : baies AU HASARD sur toute l'équipe.
    run4: [
        { base: "thundah", berry: "RANDOM" }, { base: "leviabysse", berry: "RANDOM" }, { base: "merorem", berry: "RANDOM" },
        { base: "omnhippo", berry: "RANDOM" }, { base: "karmaki", berry: "RANDOM" }, { base: "wistree", berry: "RANDOM" },
    ],
}

const randomBerry = (): string => BERRY_IDS[Math.floor(Math.random() * BERRY_IDS.length)]

/** Niveau CIBLE de l'équipe d'Ananas : niveau max du boss d'arène qu'on vient de battre (run 1-3) ; en run 4, la
 *  MOYENNE du joueur, en cliquet (ne redescend jamais → passer `peak` = pic déjà atteint). Clampé 2..100. */
export function ananasTargetLevel(variant: AnanasVariant, lastBadge: BadgeId, playerAvg: number, peak: number): number {
    if (variant === "run4") return clampLvl(Math.max(peak, playerAvg))
    const info = variant === "run3" ? run3ArenaInfo(lastBadge) : arenaInfo(lastBadge, variant === "run2")
    return clampLvl(info?.levelMax || playerAvg)
}
const clampLvl = (n: number) => Math.max(2, Math.min(100, Math.floor(n)))

/** Construit l'équipe d'Ananas (6 Daemons) pour un run + un niveau donnés : espèce évoluée au bon stade,
 *  EV + points Saiyan répartis (budget = pct du run), baie tenue selon le roster. IVs parfaits (15). */
export function buildAnanasTeam(variant: AnanasVariant, level: number): MonInstance[] {
    const pct = ANANAS_TRAIN_PCT[variant]
    const evBudget = Math.round(FULL_EV * pct), saiyanBudget = Math.round(FULL_SAIYAN * pct)
    const lvl = clampLvl(level)
    return ROSTERS[variant].map(({ base, berry }) => {
        const speciesId = speciesAtLevel(baseSpeciesOf(base), lvl)
        const sp = getSpecies(speciesId)
        const opts = sp ? distributeDomeTraining(sp.baseStats, evBudget, saiyanBudget) : { ev: undefined, allocated: undefined }
        const mon = createMonInstance(speciesId, lvl, { owned: false, ev: opts.ev, allocated: opts.allocated })
        const held = berry === "RANDOM" ? randomBerry() : berry
        if (held) mon.heldItem = held
        return mon
    })
}

/** Baie offerte au joueur s'il GAGNE : null (run 1, pas de baie), Phénix (run 2/3), au hasard 20 % Phénix (run 4). */
export function ananasRewardBerry(variant: AnanasVariant): string | null {
    if (variant === "run1") return null
    if (variant === "run2" || variant === "run3") return PHENIX
    if (Math.random() < 0.2) return PHENIX
    const others = BERRY_IDS.filter((b) => b !== PHENIX)
    return others[Math.floor(Math.random() * others.length)]
}

// ── DIALOGUES (ton : gamin enthousiaste obsédé par les baies) ──
export function ananasIntroLines(variant: AnanasVariant): string[] {
    switch (variant) {
        case "run1": return ["« Salut toi ! Je fouille ces herbes depuis des HEURES pour trouver des baies… et RIEN. Nada. Bon, tant que t'es là — on se fait un p'tit combat ? »"]
        case "run2": return ["« REGARDE ! J'ai enfin déniché des SUPER BAIES ! Chacun de mes Daemons en tient une, taillée pour son rôle. Bats-moi et je t'offre une Baie Phénix ! »"]
        case "run3": return ["« Toute mon équipe carbure à la Baie Phénix, maintenant. Six chances de se relever ! Tu crois pouvoir passer ? Gagne, et une Phénix est à toi. »"]
        default: return ["« J'ai des baies à REVENDRE ! Un combat par jour : si tu gagnes, je pioche une baie au hasard pour toi… avec 1 chance sur 5 d'être une Phénix ! »"]
    }
}
export const ANANAS_NO_TEAM_LINES = ["« Eh, tes Daemons sont tous K.O. ! Va les soigner et reviens jouer avec moi. »"]

/** Réplique de victoire d'Ananas (selon la baie donnée). */
export function ananasWinLines(berryId: string | null): string[] {
    if (!berryId) return ["« Trop fort ! Bon… toujours zéro baie pour moi. Je continue à chercher. Reviens à la prochaine arène ! »"]
    if (berryId === PHENIX) return ["« Gagné, bravo ! Tiens, une BAIE PHÉNIX comme promis 🔥 — un Daemon qui la tient survit à 1 PV une fois au lieu de tomber K.O. Équipe-la depuis ton sac ! »"]
    const b = HELD_ITEMS[berryId]
    return [`« Bien joué ! Je te pioche… une ${b?.emoji ?? "🫐"} ${b?.name ?? "baie"} ! Équipe-la sur un Daemon depuis ton sac. Reviens demain ! »`]
}
