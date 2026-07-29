// src/lib/gamebook/yellow/data/sightRunTeams.ts
//
// ÉQUIPES PAR RUN des dresseurs à EMBUSCADE (Centrale + Grotte du Nexus B2F).
//
// Ces dresseurs n'utilisent PAS scaleWithBadges : leurs niveaux sont FIXES et montent
// avec le RUN (run 1 → run 2 → run 3). L'équipe de RUN 1 est le champ `team` de la fiche
// TrainerData (data/trainers.ts) ; run 2 (« ngplus ») et run 3 REMPLACENT cette équipe,
// exactement comme NGPLUS_ARENA_TEAMS / RUN3_ARENA_TEAMS pour les arènes.
//
// IMPORTANT : les espèces sont déjà données à leur STADE FINAL VOULU (« resolved »), donc
// AUCUN speciesAtLevel n'est appliqué (contrairement à RUN3_ARENA_TEAMS qui field des bases).
// Câblé dans gameStore.tryLaunchTrainer (sélection selon effectiveRunWorld()).
//
// Niveaux : Centrale 40 / 50 / 56 (équipes ici). B2F = équipe UNIQUE niv 88 → dans TrainerData.team
// (accès surtout post-run 3, donc pas de variation par run là-bas ; ce fichier ne gère que la Centrale).
// Centrale : Léo & Mia gardent leur identité (Daemons de la Route Nord évolués) ; les 3 LOCAUX
// (Solène/Noé/Igor) suivent le THÈME TOURNANT de la zone — run 1 Élec, run 2 Feu, run 3 Psy.

import type { TrainerMonSpec } from "./trainers"

/** Équipes run 2 (ngplus) et run 3, par id de dresseur. L'équipe run 1 vit dans TrainerData.team. */
export const SIGHT_RUN_TEAMS: Record<"ngplus" | "run3", Record<string, TrainerMonSpec[]>> = {
    // ── RUN 2 (New Game +) ──
    ngplus: {
        // CENTRALE (niv 50, 4 Daemons)
        y_leo_centrale: [
            { speciesId: "aquilothan", level: 50 }, { speciesId: "roctaur", level: 50 },
            { speciesId: "amadiam", level: 50 }, { speciesId: "chronorex", level: 50 },
        ],
        y_mia_centrale: [
            { speciesId: "necrocorbe", level: 50 }, { speciesId: "hebulmin", level: 50 },
            { speciesId: "oragron", level: 50 }, { speciesId: "mycedruide", level: 50 },
        ],
        // Les 3 LOCAUX (Solène/Noé/Igor) en RUN 2 = thème FEU (la Centrale devient volcanique). 4 Daemons chacun.
        y_selene_centrale: [
            { speciesId: "pyrokoss", level: 50 }, { speciesId: "pyropanthe", level: 50 },
            { speciesId: "phoechaudiii", level: 50 }, { speciesId: "vipember", level: 50 },
        ],
        y_noe_centrale: [
            { speciesId: "thundah", level: 50 }, { speciesId: "dracarlin", level: 50 },
            { speciesId: "toucanyon", level: 50 }, { speciesId: "tauricendre", level: 50 },
        ],
        y_igor_centrale: [
            { speciesId: "loupyre", level: 50 }, { speciesId: "pyrozly", level: 50 },
            { speciesId: "calderont", level: 50 }, { speciesId: "pyropanthe", level: 50 },
        ],
        // (Dresseurs B2F : PAS d'entrée ici — équipe unique niv 88 dans TrainerData.team, cf. ci-dessous.)
        // AQUA ARENA (bateau) — RUN 2 : thème FÉE/INSECTE (métal indispo hors gated). ACE des boss = signature Marée d'Acier.
        y_aqua_n1: [{ speciesId: "regnantaur", level: 36 }, { speciesId: "wyvortal", level: 36 }],
        y_aqua_n2: [{ speciesId: "necarabee", level: 36 }, { speciesId: "dracosidhe", level: 36 }, { speciesId: "pterosidhe", level: 36 }],
        y_aqua_n3: [{ speciesId: "necrolopendre", level: 40 }, { speciesId: "pterosidhe", level: 37 }],
        y_aqua_n4: [{ speciesId: "regnantaur", level: 37 }, { speciesId: "wyvortal", level: 37 }, { speciesId: "dracosidhe", level: 37 }],
        y_aqua_boss_a: [{ speciesId: "regnantaur", level: 38 }, { speciesId: "necarabee", level: 38 }, { speciesId: "wyvortal", level: 38 }, { speciesId: "dracosidhe", level: 39 }, { speciesId: "necrolopendre", level: 40, moves: ["sig_maree_dacier"], opening: ["sig_maree_dacier"] }],
        y_aqua_boss_b: [{ speciesId: "dracosidhe", level: 38 }, { speciesId: "pterosidhe", level: 38 }, { speciesId: "regnantaur", level: 39 }, { speciesId: "necrolopendre", level: 40 }, { speciesId: "wyvortal", level: 40, moves: ["sig_maree_dacier"], opening: ["sig_maree_dacier"] }],
    },
    // ── RUN 3 ──
    run3: {
        // CENTRALE (niv 56, 5 Daemons)
        y_leo_centrale: [
            { speciesId: "aquilothan", level: 56 }, { speciesId: "roctaur", level: 56 },
            { speciesId: "amadiam", level: 56 }, { speciesId: "chronorex", level: 56 },
            { speciesId: "rocosaure", level: 56 },
        ],
        y_mia_centrale: [
            { speciesId: "necrocorbe", level: 56 }, { speciesId: "hebulmin", level: 56 },
            { speciesId: "oragron", level: 56 }, { speciesId: "mycedruide", level: 56 },
            { speciesId: "draconarque", level: 56 },
        ],
        // Les 3 LOCAUX (Solène/Noé/Igor) en RUN 3 = thème PSY (la Centrale devient un sanctuaire mental). 5 Daemons chacun.
        y_selene_centrale: [
            { speciesId: "omnhippo", level: 56 }, { speciesId: "divinpate", level: 56 },
            { speciesId: "regnantaur", level: 56 }, { speciesId: "archibouh", level: 56 },
            { speciesId: "karmaki", level: 56 },
        ],
        y_noe_centrale: [
            { speciesId: "omnhippo", level: 56 }, { speciesId: "enclumind", level: 56 },
            { speciesId: "jerbiwat", level: 56 }, { speciesId: "torturoche", level: 56 },
            { speciesId: "karatame", level: 56 },
        ],
        y_igor_centrale: [
            { speciesId: "divinpate", level: 56 }, { speciesId: "regnantaur", level: 56 },
            { speciesId: "archibouh", level: 56 }, { speciesId: "vipember", level: 56 },
            { speciesId: "karmaki", level: 56 },
        ],
        // (Dresseurs B2F : PAS d'entrée ici — équipe unique niv 88 dans TrainerData.team.)
        // AQUA ARENA (bateau) — RUN 3 : thème PLANTE/FEU/ÉLEC. Pas de signature imposée (ACE = finale pure).
        y_aqua_n1: [{ speciesId: "leviathonn", level: 36 }, { speciesId: "flamkure", level: 35 }],
        y_aqua_n2: [{ speciesId: "zappeureal", level: 36 }, { speciesId: "cerfeuillu", level: 36 }, { speciesId: "calderont", level: 36 }],
        y_aqua_n3: [{ speciesId: "thundah", level: 37 }, { speciesId: "druidours", level: 37 }],
        y_aqua_n4: [{ speciesId: "toucanyon", level: 37 }, { speciesId: "gloutanoir", level: 37 }, { speciesId: "brutetrik", level: 37 }],
        y_aqua_boss_a: [{ speciesId: "zappeureal", level: 38 }, { speciesId: "leviathonn", level: 38 }, { speciesId: "thundah", level: 38 }, { speciesId: "oragron", level: 39 }, { speciesId: "fulguror", level: 40 }],
        y_aqua_boss_b: [{ speciesId: "calderont", level: 38 }, { speciesId: "loupyre", level: 38 }, { speciesId: "druidours", level: 38 }, { speciesId: "gloutanoir", level: 39 }, { speciesId: "pyropanthe", level: 40 }],
    },
}
