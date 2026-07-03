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

// ── Équipes run 2 par trainerId (leaders + gardes des 5 arènes) ──
export const NGPLUS_ARENA_TEAMS: Record<string, TrainerMonSpec[]> = {
    // ===== ARÈNE PLANTE → VOL (Druide Sylvain) =====
    y_arena_g1: [{ speciesId: "plumiot", level: 7 }, { speciesId: "piouflot", level: 9 }],
    y_arena_g2: [{ speciesId: "colibraise", level: 8 }, { speciesId: "plumiot", level: 9 }],
    y_arena_g3: [{ speciesId: "rembodo", level: 10 }, { speciesId: "cornaissant", level: 8 }],
    y_arena_g4: [{ speciesId: "corvenin", level: 16 }],
    y_arena_druide: [
        { speciesId: "piouflot", level: 16 },
        { speciesId: "draclet", level: 16, moves: ["serres_aube", "draco_souffle", "picpic", "charge"], opening: ["serres_aube"] }, // AS
    ],

    // ===== ARÈNE ROCHE → PSY (Maître Granit) =====
    y_rocharena_g1: [{ speciesId: "nouillon", level: 14 }, { speciesId: "vermisaint", level: 16 }, { speciesId: "blaziper", level: 17 }],
    y_rocharena_g2: [{ speciesId: "hibouh", level: 5 }, { speciesId: "nouillon", level: 7 }, { speciesId: "blaziper", level: 9 }, { speciesId: "limaroche", level: 11 }, { speciesId: "jerbiwat", level: 13 }],
    y_rocharena_g3: [{ speciesId: "nouillon", level: 15 }, { speciesId: "blaziper", level: 15 }, { speciesId: "limaroche", level: 17 }],
    y_rocharena_g4: [{ speciesId: "escaroche", level: 18 }, { speciesId: "vermisaint", level: 17 }],
    y_rocharena_boss: [
        { speciesId: "vermisaint", level: 21, moves: ["onde_cerebrale", "vague_mentale", "choc_mental", "onde_folie"], opening: ["onde_cerebrale"] }, // AS
        { speciesId: "flamaspic", level: 21 },
        { speciesId: "escaroche", level: 20 },
        { speciesId: "jerbiwat", level: 21 },
        { speciesId: "escaroche", level: 18 },
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
        { speciesId: "namizeus", level: 30 },
        { speciesId: "flamkure", level: 31 },
        { speciesId: "frappard", level: 32, moves: ["danse_fauve", "belier", "poing_karate", "double_pied"], opening: ["danse_fauve"] }, // AS
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

// ── Cadeaux des BOSS d'arène en NG+ : CT signature exclusive + ticket roulette dédié (10→50). ──
export const NGPLUS_BOSS_GIFTS: Record<string, { ctId: string; ticket: number }> = {
    y_arena_druide: { ctId: "ct53", ticket: 10 },   // Vol → Serres de l'Aube
    y_rocharena_boss: { ctId: "ct54", ticket: 20 }, // Psy → Onde Cérébrale
    y_feuarena_boss: { ctId: "ct55", ticket: 30 },  // Éclectique → Danse du Fauve
    y_elecarena_boss: { ctId: "ct56", ticket: 40 }, // Insecte → Essaim Vorace
    y_eauarena_boss: { ctId: "ct57", ticket: 50 },  // Sol → Frappe Atlas
}
