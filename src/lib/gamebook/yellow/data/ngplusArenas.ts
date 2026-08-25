// src/lib/gamebook/yellow/data/ngplusArenas.ts
//
// Nexus Jaune Éclair — ARÈNES DU RUN 2 (New Game+).
// En NG+, les 5 arènes gardent leurs dresseurs/sprites/effectifs/niveaux de slot, mais leurs Daemons
// changent : chaque arène montre des espèces JAMAIS FIELDÉES ailleurs (ou d'un type inédit), TOUJOURS
// à un niveau NATUREL. Injecté par tryLaunchTrainer (gameStore) UNIQUEMENT quand activeWorld === "ngplus".
//
// Chaque BOSS d'arène offre en plus, à sa victoire NG+ : une CT-CADEAU signature EXCLUSIVE (ct53→ct57,
// introuvable autrement) + un ticket roulette dédié. Son AS PORTE sa signature (moves + opening).
//
// RÈGLE ABSOLUE respectée : aucun Daemon à un niveau non naturel (revalidé par scripts/_resolve_ids).

import type { TrainerMonSpec } from "./trainers"
import { getTrainer } from "./trainers"

// ── REVANCHE RUN 2 : chaque arène propose, APRÈS son combat re-typé, une REVANCHE = l'arène RUN 1 d'origine
//    (boss + gardes) re-jouée à +N niveaux (combat SÉPARÉ). Boost par arène (mapId) : 1→+2 … 5→+6. ──
const ARENA_REVANCHE_BOOST: Record<string, number> = {
    yellow_arena: 2,        // Plante (Druide Sylvain)
    yellow_arena_roche: 3,  // Roche (Maître Granit)
    yellow_arena_feu: 4,    // Feu (Pyra)
    yellow_arena_elec: 5,   // Élec (Volta)
    yellow_arena_eau: 6,    // Eau (Ondine)
}

/** Boost de niveau de la REVANCHE run 2 pour ce dresseur (selon son arène), ou null s'il n'est pas d'une arène. */
export function arenaRevancheBoost(trainerId: string): number | null {
    const t = getTrainer(trainerId)
    if (!t) return null
    return ARENA_REVANCHE_BOOST[t.mapId] ?? null
}

/** Réplique(s) d'intro de la revanche run 2 (proposée quand on re-parle à un dresseur d'arène déjà battu). */
export function arenaRevancheIntro(trainerName: string, isBoss: boolean): string[] {
    return isBoss
        ? [`Tu as maîtrisé ma garde re-typée… mais ${trainerName} n'a pas dit son dernier mot.`,
           "Je te renvoie mon ÉQUIPE D'ORIGINE — celle du premier run — mais aguerrie, montée d'un cran. En garde pour la revanche !"]
        : ["Une revanche ? Avec plaisir. Mon équipe d'antan a repris du service, en plus fort. En garde !"]
}

// ── Équipes run 2 par trainerId (leaders + gardes des 5 arènes) ──
// RUN 2 (NG+) — RE-SKIN des dresseurs d'arène : nom + planche Gen 3 (760×160) + position ALTERNATIVE (x,y) appliqués
//   par activeNpcs/arenaInfo quand activeWorld === "ngplus". Les équipes restent NGPLUS_ARENA_TEAMS ci-dessous.
//   x,y = repositionnement quand la carte NG+ change de grille (ex. arène 2 adopte la config de l'arène 1) ; absent = position du run 1.
//   • Arène 1 (yellow_arena) = thème VOL « Sanctuaire des Vents » — même grille qu'au run 1 → pas de repositionnement.
//   • Arène 2 (yellow_arena_roche) = thème PSY « Nef Psychique » — grille RE-CONFIGURÉE comme l'arène 1 (cf. NGPLUS_ARENA_MAPS)
//     → PNJ repositionnés sur la disposition de l'arène 1 (gardes en haut, boss au trône central).
export const NGPLUS_ARENA_NPCS: Record<string, { name: string; gen3: string; x?: number; y?: number }> = {
    // Arène 1 — VOL
    y_arena_g1: { name: "GARDE BRISE", gen3: "/yellow/sprites/npc_vol_g1_gen3.png" },
    y_arena_g2: { name: "GARDE NUÉE", gen3: "/yellow/sprites/npc_vol_g2_gen3.png" },
    y_arena_g3: { name: "GARDE RAFALE", gen3: "/yellow/sprites/npc_vol_g3_gen3.png" },
    y_arena_g4: { name: "GARDE BOURRASQUE", gen3: "/yellow/sprites/npc_vol_g4_gen3.png" },
    y_arena_druide: { name: "ZÉPHYRA", gen3: "/yellow/sprites/npc_vol_boss_gen3.png" },
    // Arène 2 — PSY (grille = config arène 1 → repositionnement sur les emplacements du Bosquet/Vol)
    y_rocharena_g1: { name: "GARDE ONDE", gen3: "/yellow/sprites/npc_psy_g1_gen3.png", x: 2, y: 1 },
    y_rocharena_g2: { name: "GARDE MIRAGE", gen3: "/yellow/sprites/npc_psy_g2_gen3.png", x: 3, y: 1 },
    y_rocharena_g3: { name: "GARDE PRISME", gen3: "/yellow/sprites/npc_psy_g3_gen3.png", x: 11, y: 1 },
    y_rocharena_g4: { name: "GARDE AURA", gen3: "/yellow/sprites/npc_psy_g4_gen3.png", x: 12, y: 1 },
    y_rocharena_boss: { name: "CÉRÉBRA", gen3: "/yellow/sprites/npc_psy_boss_gen3.png", x: 7, y: 1 },
    // Arène 3 — ÉQUILIBRÉE « Temple de l'Harmonie » (grille = config arène 1 → repositionnement)
    y_feuarena_g1: { name: "GARDE ÉQUINOXE", gen3: "/yellow/sprites/npc_equi_g1_gen3.png", x: 2, y: 1 },
    y_feuarena_g2: { name: "GARDE MOSAÏQUE", gen3: "/yellow/sprites/npc_equi_g2_gen3.png", x: 3, y: 1 },
    y_feuarena_g3: { name: "GARDE NUANCE", gen3: "/yellow/sprites/npc_equi_g3_gen3.png", x: 11, y: 1 },
    y_feuarena_g4: { name: "GARDE ALLIAGE", gen3: "/yellow/sprites/npc_equi_g4_gen3.png", x: 12, y: 1 },
    y_feuarena_boss: { name: "HARMONIA", gen3: "/yellow/sprites/npc_equi_boss_gen3.png", x: 7, y: 1 },
    // Arène 4 — INSECTE « La Grande Ruche » (grille = config arène 1 → repositionnement)
    y_elecarena_g1: { name: "GARDE DARD", gen3: "/yellow/sprites/npc_insecte_g1_gen3.png", x: 2, y: 1 },
    y_elecarena_g2: { name: "GARDE CHITINE", gen3: "/yellow/sprites/npc_insecte_g2_gen3.png", x: 3, y: 1 },
    y_elecarena_g3: { name: "GARDE ESSAIM", gen3: "/yellow/sprites/npc_insecte_g3_gen3.png", x: 11, y: 1 },
    y_elecarena_g4: { name: "GARDE ANTENNE", gen3: "/yellow/sprites/npc_insecte_g4_gen3.png", x: 12, y: 1 },
    y_elecarena_boss: { name: "REGINA", gen3: "/yellow/sprites/npc_insecte_boss_gen3.png", x: 7, y: 1 },
    // Arène 5 — « Salle des Colosses » (finals inédits) : noms tirés du Daemon signature de chaque dresseur.
    //   Remous [pyrokoss/cerfeuillu/torturoche/tonytony] · Écume [diamantine] · Abysse [loupyre] · Ressac/boss [amadiam AS].
    y_eauarena_g1: { name: "GARDE TITAN", gen3: "/yellow/sprites/npc_finals_g1_gen3.png", x: 2, y: 1 },
    y_eauarena_g2: { name: "GARDE DIAMANT", gen3: "/yellow/sprites/npc_finals_g2_gen3.png", x: 3, y: 1 },
    y_eauarena_g3: { name: "GARDE CROC", gen3: "/yellow/sprites/npc_finals_g3_gen3.png", x: 11, y: 1 },
    y_eauarena_g4: { name: "GARDE GEMME", gen3: "/yellow/sprites/npc_finals_g4_gen3.png", x: 12, y: 1 },
    y_eauarena_boss: { name: "AMADIA", gen3: "/yellow/sprites/npc_finals_boss_gen3.png", x: 7, y: 1 },
}

export const NGPLUS_ARENA_TEAMS: Record<string, TrainerMonSpec[]> = {
    // ===== ARÈNE PLANTE → VOL (Druide Sylvain) =====
    y_arena_g1: [{ speciesId: "plumiot", level: 7 }, { speciesId: "piouflot", level: 9 }],
    y_arena_g2: [{ speciesId: "colibraise", level: 8 }, { speciesId: "plumiot", level: 9 }],
    y_arena_g3: [{ speciesId: "rembodo", level: 10 }, { speciesId: "cornaissant", level: 8 }],
    y_arena_g4: [{ speciesId: "corvenin", level: 16 }],
    // 🍒 Ses Daemons TIENNENT des baies (le joueur les voit se déclencher) → à sa défaite, le Druide livre le
    //    secret des baies (cf. battleStore + data/berryLore). Introduit la récolte du run 2.
    y_arena_druide: [
        { speciesId: "piouflot", level: 16, heldItem: "baie_soin" },
        { speciesId: "draclet", level: 16, moves: ["serres_aube", "draco_souffle", "picpic", "charge"], opening: ["serres_aube"], heldItem: "baie_fougue" }, // AS
    ],

    // ===== ARÈNE ROCHE → PSY (Maître Granit) =====
    y_rocharena_g1: [{ speciesId: "nouillon", level: 14 }, { speciesId: "vermisaint", level: 16 }, { speciesId: "blaziper", level: 17 }],
    y_rocharena_g2: [{ speciesId: "hibouh", level: 5 }, { speciesId: "nouillon", level: 7 }, { speciesId: "blaziper", level: 9 }, { speciesId: "limaroche", level: 11 }, { speciesId: "jerbiwat", level: 13 }],
    y_rocharena_g3: [{ speciesId: "nouillon", level: 15 }, { speciesId: "blaziper", level: 15 }, { speciesId: "limaroche", level: 17 }],
    y_rocharena_g4: [{ speciesId: "escaroche", level: 18 }, { speciesId: "vermisaint", level: 17 }],
    y_rocharena_boss: [
        { speciesId: "flamaspic", level: 21 },
        { speciesId: "escaroche", level: 20 },
        { speciesId: "jerbiwat", level: 21 },
        { speciesId: "escaroche", level: 18 },
        { speciesId: "vermisaint", level: 21, moves: ["onde_cerebrale", "vague_mentale", "choc_mental", "onde_folie"], opening: ["onde_cerebrale"] }, // AS = DERNIER (Psy) → le panneau affiche le bon thème PSY
    ],

    // ===== ARÈNE FEU → CABINET INÉDIT (Pyra) =====
    y_feuarena_g1: [{ speciesId: "glaceer", level: 20 }, { speciesId: "carlembre", level: 20 }, { speciesId: "faukon", level: 21 }, { speciesId: "pyrenard", level: 19 }, { speciesId: "marteloutan", level: 18 }],
    y_feuarena_g2: [{ speciesId: "chouhante", level: 22 }, { speciesId: "pyrenard", level: 24 }, { speciesId: "ondulo", level: 26 }, { speciesId: "fourmilierre", level: 27 }, { speciesId: "sylvours", level: 27 }],
    y_feuarena_g3: [{ speciesId: "frappard", level: 28 }, { speciesId: "glaceer", level: 28 }, { speciesId: "carlembre", level: 28 }],
    y_feuarena_g4: [{ speciesId: "broutame", level: 29 }],
    y_feuarena_boss: [
        { speciesId: "faukon", level: 24 },
        { speciesId: "marteloutan", level: 24 },
        { speciesId: "chouhante", level: 29 },
        { speciesId: "namizeus", level: 30, moves: ["danse_fauve", "fulgurance", "ball_ombre", "vive_attaque"], opening: ["danse_fauve"] }, // ouvre Danse du Fauve
        { speciesId: "flamkure", level: 31, moves: ["danse_fauve", "lance_flammes", "flammeche", "charge"], opening: ["danse_fauve"] }, // ouvre Danse du Fauve
        { speciesId: "frappard", level: 32, moves: ["danse_fauve", "belier", "poing_karate", "double_pied"], opening: ["danse_fauve"] }, // AS — ouvre Danse du Fauve
    ],

    // ===== ARÈNE ÉLEC → BESTIOLES & SPECTRES (Volta) =====
    y_elecarena_g1: [{ speciesId: "formiguer", level: 16 }, { speciesId: "revemante", level: 16 }, { speciesId: "necarabee", level: 30 }, { speciesId: "brook", level: 30 }],
    y_elecarena_g2: [{ speciesId: "formiguer", level: 15 }, { speciesId: "lampignon", level: 15 }, { speciesId: "bouh", level: 25 }, { speciesId: "regnantaur", level: 36 }],
    y_elecarena_g3: [{ speciesId: "gloutanoir", level: 35 }, { speciesId: "necarabee", level: 20 }, { speciesId: "glacirex", level: 28, moves: ["morsure", "coup_d_givre", "draco_souffle", "charge"] }, { speciesId: "formiguer", level: 30 }],
    y_elecarena_g4: [{ speciesId: "brook", level: 30 }, { speciesId: "necarabee", level: 32 }, { speciesId: "gloutanoir", level: 34 }],
    y_elecarena_boss: [
        { speciesId: "regnantaur", level: 38 },
        { speciesId: "ombrapanthe", level: 35 },
        { speciesId: "gloutanoir", level: 36 },
        { speciesId: "regnantaur", level: 40, moves: ["essaim_vorace", "dard_mortel", "vague_mentale", "choc_mental"], opening: ["essaim_vorace"] }, // AS
    ],

    // ===== ARÈNE EAU → GAUNTLET DES FINALS INÉDITS (Ondine) =====
    // NB ids : Silviliane="cerfeuillu", Cerfeuillu="sylvapuce", Tortoracle="torturoche".
    y_eauarena_g1: [{ speciesId: "pyrokoss", level: 43 }, { speciesId: "cerfeuillu", level: 43 }, { speciesId: "torturoche", level: 43 }, { speciesId: "tonytony", level: 42 }],
    y_eauarena_g2: [{ speciesId: "thundah", level: 44 }, { speciesId: "diamantine", level: 45 }, { speciesId: "druidours", level: 47 }],
    y_eauarena_g3: [{ speciesId: "sylvapuce", level: 47 }, { speciesId: "loupyre", level: 48 }, { speciesId: "diamantine", level: 49 }],
    y_eauarena_g4: [{ speciesId: "amadiam", level: 50 }],
    y_eauarena_boss: [
        { speciesId: "pyrokoss", level: 51 },
        { speciesId: "torturoche", level: 50 },
        { speciesId: "cerfeuillu", level: 50 },
        { speciesId: "druidours", level: 49 },
        { speciesId: "loupyre", level: 52 },
        { speciesId: "amadiam", level: 53, moves: ["frappe_atlas", "seisme", "lame_roche", "carapace_diamant"], opening: ["frappe_atlas"] }, // AS
    ],
}

// ═══════════════ RUN 3 — GARDIENS des 5 arènes RE-TYPÉS (aperçu de la Ligue) ═══════════════
// Mêmes STRUCTURE + NIVEAUX que les gardiens run 2, mais chaque Daemon devient une espèce du TYPE de l'arène
// (arène 1 Glace, 2 Combat, 3 Poison/Spectre, 4 Dragon, 5 Multi), à un niveau NATUREL. Seuls les GARDIENS
// (g1-g4) sont ici : le BOSS de chaque arène = une équipe de JOUEUR figée, injectée séparément (cf. run3Bosses).
export const RUN3_ARENA_TEAMS: Record<string, TrainerMonSpec[]> = {
    // ── ARÈNE 1 → GLACE (Auroruff/Glaceer, Marmoterre, Panthégel) ──
    y_arena_g1: [{ speciesId: "auroruff", level: 7 }, { speciesId: "marmoterre", level: 9 }],
    y_arena_g2: [{ speciesId: "panthegel", level: 8 }, { speciesId: "auroruff", level: 9 }],
    y_arena_g3: [{ speciesId: "marmoterre", level: 10 }, { speciesId: "panthegel", level: 8 }],
    y_arena_g4: [{ speciesId: "glaceer", level: 16 }],
    // ── ARÈNE 2 → COMBAT (Couperin, Forgeotin, Trolystrik/Brutetrik, Broussours/Sylvours, Brasicow) ──
    y_rocharena_g1: [{ speciesId: "couperin", level: 14 }, { speciesId: "forgeotin", level: 16 }, { speciesId: "brutetrik", level: 17 }],
    y_rocharena_g2: [{ speciesId: "trolystrik", level: 5 }, { speciesId: "couperin", level: 7 }, { speciesId: "broussours", level: 9 }, { speciesId: "forgeotin", level: 11 }, { speciesId: "brasicow", level: 13 }],
    y_rocharena_g3: [{ speciesId: "couperin", level: 15 }, { speciesId: "broussours", level: 15 }, { speciesId: "brutetrik", level: 17 }],
    y_rocharena_g4: [{ speciesId: "sylvours", level: 18 }, { speciesId: "brutetrik", level: 17 }],
    // ── ARÈNE 3 → POISON/SPECTRE (Sporbéo/Lampignon, Cornaissant/Corvenin, Hibouh/Chouhante, Revemante/Necarabee, Brook, Namicha) ──
    y_feuarena_g1: [{ speciesId: "lampignon", level: 20 }, { speciesId: "corvenin", level: 20 }, { speciesId: "hibouh", level: 21 }, { speciesId: "revemante", level: 19 }, { speciesId: "brook", level: 18 }],
    y_feuarena_g2: [{ speciesId: "chouhante", level: 22 }, { speciesId: "corvenin", level: 24 }, { speciesId: "necarabee", level: 26 }, { speciesId: "lampignon", level: 27 }, { speciesId: "namicha", level: 27 }],
    y_feuarena_g3: [{ speciesId: "corvenin", level: 28 }, { speciesId: "necarabee", level: 28 }, { speciesId: "chouhante", level: 28 }],
    y_feuarena_g4: [{ speciesId: "chouhante", level: 29 }],
    // ── ARÈNE 4 → DRAGON (Draclet/Wyverion, Carlinou/Carlembre/Dracarlin, Glacirex/Cryotyran) ──
    y_elecarena_g1: [{ speciesId: "draclet", level: 16 }, { speciesId: "carlinou", level: 16 }, { speciesId: "wyverion", level: 30 }, { speciesId: "carlembre", level: 30 }],
    y_elecarena_g2: [{ speciesId: "draclet", level: 15 }, { speciesId: "carlinou", level: 15 }, { speciesId: "wyverion", level: 25 }, { speciesId: "dracarlin", level: 36 }],
    y_elecarena_g3: [{ speciesId: "cryotyran", level: 35 }, { speciesId: "wyverion", level: 20 }, { speciesId: "carlembre", level: 28 }, { speciesId: "glacirex", level: 30 }],
    y_elecarena_g4: [{ speciesId: "wyverion", level: 30 }, { speciesId: "carlembre", level: 32 }, { speciesId: "glacirex", level: 34 }],
    // ── ARÈNE 5 → MULTI (mélange de FINALS variés, façon gauntlet) ──
    y_eauarena_g1: [{ speciesId: "maitrezenc", level: 43 }, { speciesId: "mycedruide", level: 43 }, { speciesId: "dracarlin", level: 43 }, { speciesId: "gekosmic", level: 43 }], // run 3 : Nécrocorbe → GÉKOSMIC (Centrale Psy)
    y_eauarena_g2: [{ speciesId: "hebulmin", level: 44 }, { speciesId: "omnhippo", level: 46 }, { speciesId: "regnantaur", level: 47 }],                                          // run 3 : Cryotyran → OMNHIPPO (Centrale Psy)
    y_eauarena_g3: [{ speciesId: "druidours", level: 47 }, { speciesId: "necrolopendre", level: 48 }, { speciesId: "uzumaro", level: 48 }],                                        // run 3 : Archibouh → UZUMARO (Maison Combat)
    y_eauarena_g4: [{ speciesId: "enclumind", level: 50 }],
}

// ── Cadeaux des BOSS d'arène en NG+ : CT signature exclusive + ticket roulette dédié (10→50). ──
export const NGPLUS_BOSS_GIFTS: Record<string, { ctId: string; ticket: number }> = {
    y_arena_druide: { ctId: "ct53", ticket: 10 },   // Vol → Serres de l'Aube
    y_rocharena_boss: { ctId: "ct54", ticket: 20 }, // Psy → Onde Cérébrale
    y_feuarena_boss: { ctId: "ct55", ticket: 30 },  // Éclectique → Danse du Fauve
    y_elecarena_boss: { ctId: "ct56", ticket: 40 }, // Insecte → Essaim Vorace
    y_eauarena_boss: { ctId: "ct57", ticket: 50 },  // Sol → Frappe Atlas
}
