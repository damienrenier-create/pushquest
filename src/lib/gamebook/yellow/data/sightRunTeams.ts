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
        // AQUA ARENA (bateau) — RUN 2 : thème EAU (remix Sartay). JUSTE MILIEU : ossature de FINALS EAU costauds + UN
        //   clin d'œil PÊCHABLE par matelot (Osquille/Rô/Braisécaille) ; GEAUCKÉ (giga-rare) = trophée du boss final. ACE = Léviabysse + Chant du Naufrageur.
        y_aqua_n1: [{ speciesId: "razmaree", level: 36 }, { speciesId: "osquille", level: 36 }],
        y_aqua_n2: [{ speciesId: "naiadrak", level: 36 }, { speciesId: "sonarque", level: 36 }, { speciesId: "ro", level: 36 }],
        y_aqua_n3: [{ speciesId: "leviathonn", level: 40 }, { speciesId: "braisecaille", level: 37 }],
        y_aqua_n4: [{ speciesId: "osquille", level: 37 }, { speciesId: "crapotaure", level: 37 }, { speciesId: "ondaloutre", level: 37 }],
        y_aqua_boss_a: [{ speciesId: "razmaree", level: 38 }, { speciesId: "naiadrak", level: 38 }, { speciesId: "sonarque", level: 38 }, { speciesId: "mobyd", level: 39 }, { speciesId: "leviabysse", level: 40, moves: ["sig_chant_naufrageur"], opening: ["sig_chant_naufrageur"] }],
        y_aqua_boss_b: [{ speciesId: "ondaloutre", level: 38 }, { speciesId: "crapotaure", level: 38 }, { speciesId: "naiadrak", level: 39 }, { speciesId: "geaucke", level: 39 }, { speciesId: "leviathonn", level: 40 }],
        // FRÈRES GLAÇON (Grotte Gelée) — RUN 2 : stades intermédiaires/finaux Glace.
        y_frere_frisquet: [{ speciesId: "glaceer", level: 46 }, { speciesId: "iorours", level: 47 }],
        y_frere_grelot: [{ speciesId: "glacirex", level: 48 }, { speciesId: "glaceer", level: 49 }],
        y_frere_glagla: [{ speciesId: "iorours", level: 50 }, { speciesId: "glaceer", level: 50 }],
        y_frere_givre: [{ speciesId: "iorours", level: 51 }, { speciesId: "cryotyran", level: 51 }, { speciesId: "panthegel", level: 52 }],
        y_frere_blizzard: [{ speciesId: "yetiroche", level: 53 }, { speciesId: "auroraur", level: 53 }, { speciesId: "cryotyran", level: 54 }, { speciesId: "orcaline", level: 55 }],
        // PLAGE (dresseurs à vue) — RUN 2 : thème SPECTRE (remix Sartay ; les spectres ont migré du Manoir vers la crique).
        y_plage_pecheur: [{ speciesId: "brookhante", level: 50 }, { speciesId: "archibouh", level: 51 }],
        // Shadow (NORMAL/SPECTRE) : 2 attaques TÉNÈBRES (devoreur_ombres/onde_obscure) FORCÉES → seules capables de percer
        //   un adversaire Normal/Spectre (ex. Nécrossum de Zyran), sinon immunité mutuelle = combat impossible à finir.
        y_plage_nageuse: [{ speciesId: "chouhante", level: 50 }, { speciesId: "shadow", level: 51, moves: ["devoreur_ombres", "onde_obscure", "griffe_spectrale", "tranche"] }, { speciesId: "revemante", level: 52 }],
        y_plage_marin: [{ speciesId: "shadow", level: 50, moves: ["devoreur_ombres", "onde_obscure", "griffe_spectrale", "tranche"] }, { speciesId: "brookhante", level: 51 }],
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
        // FRÈRES GLAÇON (Grotte Gelée) — RUN 3 : stades finaux + lignée Guizer (run 3) + Givroptère (post-Ligue).
        y_frere_frisquet: [{ speciesId: "auroraur", level: 55 }, { speciesId: "yetiroche", level: 55 }],
        y_frere_grelot: [{ speciesId: "cryotyran", level: 56 }, { speciesId: "guizer", level: 55 }, { speciesId: "auroraur", level: 56 }],
        y_frere_glagla: [{ speciesId: "yetiroche", level: 57 }, { speciesId: "dalugazer", level: 57 }, { speciesId: "morrow", level: 57 }],
        y_frere_givre: [{ speciesId: "yetiroche", level: 58 }, { speciesId: "cryotyran", level: 58 }, { speciesId: "mobyd", level: 58 }, { speciesId: "morrow", level: 59 }],
        y_frere_blizzard: [{ speciesId: "yetiroche", level: 60 }, { speciesId: "auroraur", level: 60 }, { speciesId: "cryotyran", level: 61 }, { speciesId: "givroptere", level: 61 }, { speciesId: "orcaline", level: 62 }],
        // PLAGE (dresseurs à vue) — RUN 3.
        y_plage_pecheur: [{ speciesId: "razmaree", level: 58 }, { speciesId: "crapotaure", level: 59 }],
        y_plage_nageuse: [{ speciesId: "naiadrak", level: 58 }, { speciesId: "oragron", level: 59 }, { speciesId: "leviathonn", level: 60 }],
        y_plage_marin: [{ speciesId: "aquilothan", level: 58 }, { speciesId: "necrocorbe", level: 59 }],
    },
}
