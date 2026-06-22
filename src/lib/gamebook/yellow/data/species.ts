// src/lib/gamebook/yellow/data/species.ts
//
// Nexus Jaune Éclair — registre des espèces (Daemons ORIGINAUX, STRICT Gen 1).
// 5 stats de base : hp, atk, def, spe, spc. Extensible jusqu'à 151.
// Sprites = chemins /yellow/sprites/dex/* (à fournir dans public/).

import type { SpeciesData } from "../battle/types"

export const SPECIES: Record<string, SpeciesData> = {
    // ============================================================
    // ROSTER DES 18 (2 triangles : Plante/Eau/Feu + Combat/Roche/Vol).
    // Daemons ORIGINAUX (noms/designs/sprites maison). Les baseStats ci-dessous
    // sont des valeurs d'ÉQUILIBRAGE MAISON, pas une table externe : ajuste
    // librement n'importe quel nombre (hp/atk/def/spe/spc) ici.
    // ============================================================

    // --- Ligne PLANTE (starter) ---
    feuillichot: {
        id: "feuillichot", dexNo: 1, name: "Feuillichot", types: ["PLANTE"],
        baseStats: { hp: 45, atk: 48, def: 50, spe: 42, spc: 60 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 4, moveId: "fouet_lianes" },
            { level: 10, moveId: "vampigraine" },
            { level: 16, moveId: "mega_sangsue" },
        ],
        evolution: { toId: "broutame", method: { kind: "LEVEL", level: 16 } },
        catchRate: 45, baseExp: 64, rarity: "RARE", growthRate: "medium_fast", role: "Starter Plante — endurant",
        description: "Pousse-lapin espiègle. Plus son dresseur transpire, plus elle verdit.",
        sprite: "/yellow/sprites/dex/feuillichot.png",
    },
    broutame: {
        id: "broutame", dexNo: 2, name: "Broubouc", types: ["PLANTE"],
        baseStats: { hp: 62, atk: 58, def: 68, spe: 52, spc: 82 },
        learnset: [
            { level: 1, moveId: "fouet_lianes" },
            { level: 1, moveId: "vampigraine" },
            { level: 20, moveId: "mega_sangsue" },
            { level: 28, moveId: "tempete_verte" },
            { level: 34, moveId: "danse_lames" },
        ],
        evolution: { toId: "sylvapuce", method: { kind: "LEVEL", level: 32 } },
        catchRate: 45, baseExp: 141, rarity: "RARE", growthRate: "medium_fast", role: "Plante — endurant",
        description: "Faon aux bois bourgeonnants. Broute la lumière du matin pour gagner en vigueur.",
        sprite: "/yellow/sprites/dex/broutame.png",
    },
    sylvapuce: {
        id: "sylvapuce", dexNo: 3, name: "Cerfeuillu", types: ["PLANTE"],
        baseStats: { hp: 85, atk: 78, def: 90, spe: 70, spc: 112 },
        learnset: [
            { level: 1, moveId: "tempete_verte" },
            { level: 1, moveId: "vampigraine" },
            { level: 1, moveId: "mega_sangsue" },
            { level: 24, moveId: "spores_dodo" },
            { level: 40, moveId: "belier" },
            { level: 46, moveId: "repos" },
            { level: 52, moveId: "brume_sporale" },
            { level: 66, moveId: "lance_soleil" },
        ],
        catchRate: 45, baseExp: 208, rarity: "RARE", growthRate: "medium_fast", role: "Plante — mur special",
        description: "Cerf-forêt centenaire. Là où il se repose fleurit une clairière.",
        sprite: "/yellow/sprites/dex/sylvapuce.png",
    },

    // --- Ligne EAU (starter) ---
    gouttiny: {
        id: "gouttiny", dexNo: 4, name: "Gouttiny", types: ["EAU"],
        baseStats: { hp: 44, atk: 46, def: 68, spe: 38, spc: 50 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 6, moveId: "pistolet_a_o" },
            { level: 18, moveId: "coup_d_givre" },
            { level: 30, moveId: "mur_de_fer" },
        ],
        evolution: { toId: "ondulo", method: { kind: "LEVEL", level: 16 } },
        catchRate: 45, baseExp: 64, rarity: "RARE", growthRate: "medium_fast", role: "Starter Eau — défensif",
        description: "Goutte d'eau espiègle qui rebondit partout. Adore éclabousser.",
        sprite: "/yellow/sprites/dex/gouttiny.png",
    },
    ondulo: {
        id: "ondulo", dexNo: 5, name: "Ondulo", types: ["EAU"],
        baseStats: { hp: 60, atk: 58, def: 86, spe: 50, spc: 64 },
        learnset: [
            { level: 1, moveId: "pistolet_a_o" },
            { level: 1, moveId: "charge" },
            { level: 24, moveId: "coup_d_givre" },
            { level: 34, moveId: "hydrocanon" },
        ],
        evolution: { toId: "razmaree", method: { kind: "LEVEL", level: 36 } },
        catchRate: 45, baseExp: 141, rarity: "RARE", growthRate: "medium_fast", role: "Eau — défensif",
        description: "Amphibien surfeur ; chevauche ses propres vagues pour esquiver.",
        sprite: "/yellow/sprites/dex/ondulo.png",
    },
    razmaree: {
        id: "razmaree", dexNo: 6, name: "Razmarée", types: ["EAU"],
        baseStats: { hp: 80, atk: 80, def: 112, spe: 66, spc: 86 },
        learnset: [
            { level: 1, moveId: "hydrocanon" },
            { level: 1, moveId: "pistolet_a_o" },
            { level: 1, moveId: "coup_d_givre" },
            { level: 42, moveId: "mur_de_fer" },
            { level: 42, moveId: "repos" },
            { level: 50, moveId: "carapace_diamant" },
        ],
        catchRate: 45, baseExp: 208, rarity: "RARE", growthRate: "medium_fast", role: "Eau — tank",
        description: "Gardien des marées. Quand il inspire, l'eau baisse à des mètres à la ronde.",
        sprite: "/yellow/sprites/dex/razmaree.png",
    },

    // --- Ligne FEU (starter) ---
    braisille: {
        id: "braisille", dexNo: 7, name: "Braisille", types: ["FEU"],
        baseStats: { hp: 40, atk: 52, def: 42, spe: 68, spc: 52 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 7, moveId: "flammeche" },
        ],
        evolution: { toId: "flamkure", method: { kind: "LEVEL", level: 16 } },
        catchRate: 45, baseExp: 64, rarity: "RARE", growthRate: "medium_fast", role: "Starter Feu — rapide offensif",
        description: "Renardeau de braise qui crépite d'impatience. S'éteint si on le néglige.",
        sprite: "/yellow/sprites/dex/braisille.png",
    },
    flamkure: {
        id: "flamkure", dexNo: 8, name: "Flamkure", types: ["FEU"],
        baseStats: { hp: 58, atk: 66, def: 52, spe: 88, spc: 68 },
        learnset: [
            { level: 1, moveId: "flammeche" },
            { level: 1, moveId: "charge" },
            { level: 30, moveId: "lance_flammes" },
            { level: 36, moveId: "danse_lames" },
        ],
        evolution: { toId: "pyrokoss", method: { kind: "LEVEL", level: 36 } },
        catchRate: 45, baseExp: 141, rarity: "RARE", growthRate: "medium_fast", role: "Feu — rapide offensif",
        description: "Jeune fauve de flammes ; sa fourrure brûle plus fort à l'échauffement.",
        sprite: "/yellow/sprites/dex/flamkure.png",
    },
    pyrokoss: {
        id: "pyrokoss", dexNo: 9, name: "Pyrokoss", types: ["FEU"],
        baseStats: { hp: 78, atk: 90, def: 74, spe: 112, spc: 92 },
        learnset: [
            { level: 1, moveId: "lance_flammes" },
            { level: 1, moveId: "flammeche" },
            { level: 1, moveId: "belier" },
            { level: 30, moveId: "flamme_ardente" },
            { level: 44, moveId: "seisme" },
            { level: 66, moveId: "focalisation" },
        ],
        catchRate: 45, baseExp: 208, rarity: "RARE", growthRate: "medium_fast", role: "Feu — sweeper",
        description: "Lion de lave. Chaque pas laisse une empreinte de magma.",
        sprite: "/yellow/sprites/dex/pyrokoss.png",
    },

    // --- Ligne VOL (Normal/Vol) ---
    plumiot: {
        id: "plumiot", dexNo: 10, name: "Plumiot", types: ["NORMAL", "VOL"],
        baseStats: { hp: 42, atk: 48, def: 42, spe: 66, spc: 36 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 5, moveId: "picpic" },
            { level: 12, moveId: "vive_attaque" },
            { level: 20, moveId: "tornade" },
        ],
        evolution: { toId: "faukon", method: { kind: "LEVEL", level: 18 } },
        catchRate: 120, baseExp: 50, rarity: "COMMON", growthRate: "medium_fast", role: "Vol — early bird",
        description: "Oisillon ébouriffé qui tombe plus qu'il ne vole. Courageux pour deux.",
        sprite: "/yellow/sprites/dex/plumiot.png",
    },
    faukon: {
        id: "faukon", dexNo: 11, name: "Faukon", types: ["NORMAL", "VOL"],
        baseStats: { hp: 62, atk: 62, def: 54, spe: 76, spc: 50 },
        learnset: [
            { level: 1, moveId: "picpic" },
            { level: 1, moveId: "vive_attaque" },
            { level: 24, moveId: "tornade" },
            { level: 34, moveId: "belier" },
        ],
        evolution: { toId: "aquilothan", method: { kind: "LEVEL", level: 36 } },
        catchRate: 90, baseExp: 122, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Vol — rapide",
        description: "Faucon vif comme l'éclair ; fond sur ses proies en piqué.",
        sprite: "/yellow/sprites/dex/faukon.png",
    },
    aquilothan: {
        id: "aquilothan", dexNo: 12, name: "Aquilothan", types: ["NORMAL", "VOL"],
        baseStats: { hp: 80, atk: 82, def: 72, spe: 100, spc: 68 },
        learnset: [
            { level: 1, moveId: "tornade" },
            { level: 1, moveId: "picpic" },
            { level: 1, moveId: "belier" },
            { level: 30, moveId: "elan" },
            { level: 36, moveId: "fonce_bec" },
            { level: 40, moveId: "coup_d_boule" },
            { level: 46, moveId: "meteores" }, // STAB qui ne rate JAMAIS (boost du final commun)
            { level: 52, moveId: "plaquage" },
            { level: 66, moveId: "vol" },
        ],
        catchRate: 45, baseExp: 210, rarity: "RARE", growthRate: "medium_fast", role: "Vol — sweeper",
        description: "Empereur des cieux. Son envergure projette l'ombre d'un nuage.",
        sprite: "/yellow/sprites/dex/aquilothan.png",
    },

    // --- Ligne ROCHE/SOL ---
    cailloutchi: {
        id: "cailloutchi", dexNo: 13, name: "Cailloutchi", types: ["ROCHE", "SOL"],
        baseStats: { hp: 40, atk: 75, def: 102, spe: 20, spc: 30 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 8, moveId: "jet_pierres" },
            { level: 16, moveId: "jet_de_sable" },
            { level: 26, moveId: "eboulis" },
        ],
        evolution: { toId: "roctaur", method: { kind: "LEVEL", level: 25 } },
        catchRate: 120, baseExp: 60, rarity: "COMMON", growthRate: "medium_fast", role: "Roche — mur lent",
        description: "Chevreau de pierre aux yeux ronds. Encaisse sans broncher, lent à démarrer.",
        sprite: "/yellow/sprites/dex/cailloutchi.png",
    },
    roctaur: {
        id: "roctaur", dexNo: 14, name: "Roctaur", types: ["ROCHE", "SOL"],
        baseStats: { hp: 55, atk: 92, def: 120, spe: 30, spc: 42 },
        learnset: [
            { level: 1, moveId: "jet_pierres" },
            { level: 1, moveId: "charge" },
            { level: 24, moveId: "eboulis" },
            { level: 30, moveId: "seisme" },
            { level: 36, moveId: "tir_boue" },
        ],
        evolution: { toId: "rochison", method: { kind: "TRADE" } }, // évolue par ÉCHANGE (hommage Grolem)
        catchRate: 60, baseExp: 142, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Roche — tank",
        description: "Bélier rocheux ; charge en faisant trembler le sol.",
        sprite: "/yellow/sprites/dex/roctaur.png",
    },
    rochison: {
        id: "rochison", dexNo: 15, name: "Rochison", types: ["ROCHE", "SOL"],
        baseStats: { hp: 80, atk: 115, def: 138, spe: 40, spc: 52 },
        learnset: [
            { level: 1, moveId: "eboulis" },
            { level: 1, moveId: "seisme" },
            { level: 1, moveId: "tir_boue" },
            { level: 34, moveId: "carapace_diamant" },
            { level: 44, moveId: "belier" },
            { level: 50, moveId: "plaquage" },
            { level: 66, moveId: "lame_roche" },
        ],
        catchRate: 45, baseExp: 210, rarity: "RARE", growthRate: "medium_fast", role: "Roche — tank offensif",
        description: "Bison de roche. On l'a longtemps pris pour un menhir avant qu'il ne charge.",
        sprite: "/yellow/sprites/dex/rochison.png",
    },

    // --- Ligne COMBAT ---
    couperin: {
        id: "couperin", dexNo: 16, name: "Couperin", types: ["COMBAT"],
        baseStats: { hp: 45, atk: 82, def: 42, spe: 75, spc: 32 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 7, moveId: "double_pied" },
            { level: 18, moveId: "poing_karate" },
            { level: 28, moveId: "danse_lames" },
        ],
        evolution: { toId: "frappard", method: { kind: "LEVEL", level: 28 } },
        catchRate: 120, baseExp: 60, rarity: "COMMON", growthRate: "medium_fast", role: "Combat — frêle agressif",
        description: "Renard méditant aux poings bandés. S'entraîne sur tout ce qui dépasse.",
        sprite: "/yellow/sprites/dex/couperin.png",
    },
    frappard: {
        id: "frappard", dexNo: 17, name: "Frappard", types: ["COMBAT"],
        baseStats: { hp: 64, atk: 106, def: 56, spe: 96, spc: 52 },
        learnset: [
            { level: 1, moveId: "poing_karate" },
            { level: 1, moveId: "double_pied" },
            { level: 30, moveId: "belier" },
            { level: 36, moveId: "danse_lames" },
        ],
        evolution: { toId: "maitrezenc", method: { kind: "LEVEL", level: 36 } },
        catchRate: 60, baseExp: 142, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Combat — rapide offensif",
        description: "Combattant discipliné ; enchaîne les séries comme un athlète à l'entraînement.",
        sprite: "/yellow/sprites/dex/frappard.png",
    },
    maitrezenc: {
        id: "maitrezenc", dexNo: 18, name: "Maîtrezenc", types: ["COMBAT"],
        baseStats: { hp: 80, atk: 118, def: 68, spe: 88, spc: 68 },
        learnset: [
            { level: 1, moveId: "poing_karate" },
            { level: 1, moveId: "belier" },
            { level: 1, moveId: "double_pied" },
            { level: 38, moveId: "crochet_maitre" },
            { level: 44, moveId: "seisme" },
            { level: 46, moveId: "danse_lames" },
            { level: 56, moveId: "focalisation" },
            { level: 65, moveId: "deluge_crochets" },
        ],
        catchRate: 45, baseExp: 210, rarity: "RARE", growthRate: "medium_fast", role: "Combat — sweeper",
        description: "Maître sensei au calme olympien. Un seul crochet fend la pierre.",
        sprite: "/yellow/sprites/dex/maitrezenc.png",
    },

    // ============================================================
    // 7 FAMILLES BONUS (couverture de types). Daemons ORIGINAUX, stats maison.
    // ============================================================

    // --- ⚡ Coatis (Élec) ---
    electroatiss: {
        id: "electroatiss", dexNo: 19, name: "Électroatiss", types: ["ELEC"],
        baseStats: { hp: 42, atk: 50, def: 38, spe: 68, spc: 56 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 6, moveId: "etincelle" },
            { level: 18, moveId: "vive_attaque" },
            { level: 28, moveId: "cage_eclair" },
        ],
        evolution: { toId: "couranti", method: { kind: "LEVEL", level: 16 } },
        catchRate: 120, baseExp: 60, rarity: "COMMON", growthRate: "medium_fast", role: "Élec — vif",
        description: "Coati farceur à bandeau ; sa queue crépite d'étincelles.",
        sprite: "/yellow/sprites/dex/electroatiss.png",
    },
    couranti: {
        id: "couranti", dexNo: 20, name: "Couranti", types: ["ELEC"],
        baseStats: { hp: 58, atk: 64, def: 50, spe: 90, spc: 70 },
        learnset: [
            { level: 1, moveId: "etincelle" },
            { level: 1, moveId: "vive_attaque" },
            { level: 30, moveId: "cage_eclair" },
            { level: 36, moveId: "danse_lames" },
        ],
        evolution: { toId: "zappeureal", method: { kind: "LEVEL", level: 36 } },
        catchRate: 60, baseExp: 142, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Élec — rapide",
        description: "Maraudeur électrique drapé d'une cape conductrice.",
        sprite: "/yellow/sprites/dex/couranti.png",
    },
    zappeureal: {
        id: "zappeureal", dexNo: 21, name: "Zappeuréal", types: ["ELEC"],
        baseStats: { hp: 80, atk: 84, def: 68, spe: 115, spc: 98 },
        learnset: [
            { level: 1, moveId: "etincelle" },
            { level: 1, moveId: "cage_eclair" },
            { level: 1, moveId: "vive_attaque" },
            { level: 38, moveId: "fulgurance" },
            { level: 42, moveId: "coup_d_boule" },
            { level: 46, moveId: "focalisation" },
            { level: 70, moveId: "ultra_foudre" },
        ],
        catchRate: 45, baseExp: 210, rarity: "RARE", growthRate: "medium_fast", role: "Élec — sweeper",
        description: "Souverain de la foudre, couronné d'arcs électriques.",
        sprite: "/yellow/sprites/dex/zappeureal.png",
    },

    // --- ❄️ Chiens (Glace) ---
    auroruff: {
        id: "auroruff", dexNo: 22, name: "Auroruff", types: ["GLACE"],
        baseStats: { hp: 52, atk: 48, def: 62, spe: 44, spc: 56 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 8, moveId: "coup_d_givre" },
            { level: 20, moveId: "vive_attaque" },
            { level: 30, moveId: "mur_de_fer" },
        ],
        evolution: { toId: "glaceer", method: { kind: "LEVEL", level: 16 } },
        catchRate: 120, baseExp: 60, rarity: "COMMON", growthRate: "medium_fast", role: "Glace — équilibré",
        description: "Chiot des neiges à l'os givré ; fidèle et frileux.",
        sprite: "/yellow/sprites/dex/auroruff.png",
    },
    glaceer: {
        id: "glaceer", dexNo: 23, name: "Glaceer", types: ["GLACE"],
        baseStats: { hp: 66, atk: 64, def: 72, spe: 66, spc: 76 },
        learnset: [
            { level: 1, moveId: "coup_d_givre" },
            { level: 1, moveId: "charge" },
            { level: 28, moveId: "belier" },
            { level: 36, moveId: "mur_de_fer" },
        ],
        evolution: { toId: "auroraur", method: { kind: "LEVEL", level: 35 } },
        catchRate: 60, baseExp: 142, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Glace — élégant",
        description: "Lévrier de gel ; laisse une traînée de givre à chaque foulée.",
        sprite: "/yellow/sprites/dex/glaceer.png",
    },
    auroraur: {
        id: "auroraur", dexNo: 24, name: "Auroraur", types: ["GLACE"],
        baseStats: { hp: 92, atk: 80, def: 92, spe: 66, spc: 100 },
        learnset: [
            { level: 1, moveId: "coup_d_givre" },
            { level: 1, moveId: "belier" },
            { level: 1, moveId: "mur_de_fer" },
            { level: 30, moveId: "vive_attaque" },
            { level: 38, moveId: "souffle_polaire" },
            { level: 44, moveId: "repos" },
            { level: 50, moveId: "focalisation" },
        ],
        catchRate: 45, baseExp: 210, rarity: "RARE", growthRate: "medium_fast", role: "Glace — mur",
        description: "Molosse polaire à la cape d'aurore boréale. Majestueux.",
        sprite: "/yellow/sprites/dex/auroraur.png",
    },

    // --- 🐜 Fourmis (Insecte → Insecte/Psy) ---
    ruffiant: {
        id: "ruffiant", dexNo: 25, name: "Ruffiant", types: ["INSECTE"],
        baseStats: { hp: 40, atk: 54, def: 54, spe: 52, spc: 34 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 6, moveId: "dard_nuee" },
            { level: 13, moveId: "dard_venin" }, // avant l'évo (niv 15) → réellement accessible
            { level: 26, moveId: "morsure" },
        ],
        evolution: { toId: "formiguer", method: { kind: "LEVEL", level: 15 } },
        catchRate: 120, baseExp: 60, rarity: "COMMON", growthRate: "medium_fast", role: "Insecte — ouvrière",
        description: "Fourmi-soldat dégourdie, mandibules toujours prêtes.",
        sprite: "/yellow/sprites/dex/ruffiant.png",
    },
    formiguer: {
        id: "formiguer", dexNo: 26, name: "Formiguer", types: ["INSECTE"],
        baseStats: { hp: 58, atk: 78, def: 76, spe: 64, spc: 46 },
        learnset: [
            { level: 1, moveId: "dard_nuee" },
            { level: 1, moveId: "morsure" },
            { level: 30, moveId: "dard_mortel" },
            { level: 36, moveId: "dard_venin" },
        ],
        evolution: { toId: "regnantaur", method: { kind: "LEVEL", level: 34 } },
        catchRate: 60, baseExp: 142, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Insecte — soldat",
        description: "Fourmi-guerrière à la carapace chitineuse renforcée.",
        sprite: "/yellow/sprites/dex/formiguer.png",
    },
    regnantaur: {
        id: "regnantaur", dexNo: 27, name: "Regnantaur", types: ["INSECTE", "PSY"],
        baseStats: { hp: 76, atk: 98, def: 88, spe: 82, spc: 86 },
        learnset: [
            { level: 1, moveId: "dard_mortel" },
            { level: 1, moveId: "choc_mental" },
            { level: 1, moveId: "onde_folie" },
            { level: 40, moveId: "vague_mentale" },
            { level: 44, moveId: "danse_lames" },
            { level: 52, moveId: "dard_venin" },
            { level: 65, moveId: "dard_fatal" },
        ],
        catchRate: 45, baseExp: 210, rarity: "RARE", growthRate: "medium_fast", role: "Insecte/Psy — reine",
        description: "Reine-fourmi couronnée, dont l'esprit dirige toute la colonie.",
        sprite: "/yellow/sprites/dex/regnantaur.png",
    },

    // --- 🌋 Magma (Roche/Feu) ---
    lavapetit: {
        id: "lavapetit", dexNo: 28, name: "Lavapetit", types: ["ROCHE", "FEU"],
        baseStats: { hp: 44, atk: 54, def: 66, spe: 28, spc: 46 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 8, moveId: "jet_pierres" },
            { level: 18, moveId: "flammeche" },
            { level: 28, moveId: "mur_de_fer" },
        ],
        evolution: { toId: "fissuralave", method: { kind: "LEVEL", level: 17 } },
        catchRate: 120, baseExp: 60, rarity: "COMMON", growthRate: "medium_fast", role: "Roche/Feu — braise lente",
        description: "Caillou couvant une braise interne ; tiède au toucher.",
        sprite: "/yellow/sprites/dex/lavapetit.png",
    },
    fissuralave: {
        id: "fissuralave", dexNo: 29, name: "Fissuralave", types: ["ROCHE", "FEU"],
        baseStats: { hp: 64, atk: 80, def: 94, spe: 38, spc: 64 },
        learnset: [
            { level: 1, moveId: "jet_pierres" },
            { level: 1, moveId: "flammeche" },
            { level: 30, moveId: "seisme" },
            { level: 36, moveId: "lance_flammes" },
        ],
        evolution: { toId: "magmator", method: { kind: "LEVEL", level: 37 } },
        catchRate: 60, baseExp: 142, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Roche/Feu — colosse",
        description: "Golem fissuré laissant suinter la lave par ses craquelures.",
        sprite: "/yellow/sprites/dex/fissuralave.png",
    },
    magmator: {
        id: "magmator", dexNo: 30, name: "Magmator", types: ["ROCHE", "FEU"],
        baseStats: { hp: 80, atk: 112, def: 100, spe: 50, spc: 82 },
        learnset: [
            { level: 1, moveId: "seisme" },
            { level: 1, moveId: "lance_flammes" },
            { level: 1, moveId: "jet_pierres" },
            { level: 40, moveId: "mur_de_fer" },
            { level: 44, moveId: "belier" },
            { level: 48, moveId: "carapace_diamant" },
            { level: 66, moveId: "lame_roche" },
        ],
        catchRate: 45, baseExp: 210, rarity: "RARE", growthRate: "medium_fast", role: "Roche/Feu — tank",
        description: "Titan de roche en fusion ; son cœur de magma ne s'éteint jamais.",
        sprite: "/yellow/sprites/dex/magmator.png",
    },

    // --- 🍝 Dieu spaghetti (Psy) ---
    nouillon: {
        id: "nouillon", dexNo: 31, name: "Nouillon", types: ["PSY"],
        baseStats: { hp: 55, atk: 28, def: 58, spe: 36, spc: 68 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 7, moveId: "choc_mental" },
            { level: 18, moveId: "onde_folie" },
            { level: 28, moveId: "repos" },
        ],
        evolution: { toId: "vermisaint", method: { kind: "LEVEL", level: 16 } },
        catchRate: 90, baseExp: 64, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Psy — special frêle",
        description: "Petit amas de nouilles vivant aux yeux sur tentacules.",
        sprite: "/yellow/sprites/dex/nouillon.png",
    },
    vermisaint: {
        id: "vermisaint", dexNo: 32, name: "Vermisaint", types: ["PSY"],
        baseStats: { hp: 66, atk: 45, def: 60, spe: 52, spc: 88 },
        learnset: [
            { level: 1, moveId: "choc_mental" },
            { level: 1, moveId: "onde_folie" },
            { level: 30, moveId: "repos" },
            { level: 34, moveId: "leche" },
        ],
        evolution: { toId: "divinpate", method: { kind: "LEVEL", level: 34 } },
        catchRate: 45, baseExp: 142, rarity: "RARE", growthRate: "medium_fast", role: "Psy — special",
        description: "Enchevêtrement de pâtes nimbé d'une aura mystique.",
        sprite: "/yellow/sprites/dex/vermisaint.png",
    },
    divinpate: {
        id: "divinpate", dexNo: 33, name: "Divinpâte", types: ["PSY"],
        baseStats: { hp: 72, atk: 68, def: 64, spe: 82, spc: 120 },
        learnset: [
            { level: 1, moveId: "choc_mental" },
            { level: 1, moveId: "onde_folie" },
            { level: 1, moveId: "repos" },
            { level: 36, moveId: "vague_mentale" },
            { level: 44, moveId: "leche" },
            { level: 48, moveId: "meteores" }, // pluie d'étoiles cosmiques qui ne rate JAMAIS (boost du final)
            { level: 66, moveId: "eveil_divin" }, // finisher snowball : +Spécial à chaque coup
        ],
        catchRate: 30, baseExp: 220, rarity: "RARE", growthRate: "medium_fast", role: "Psy — special divin (snowball)",
        description: "Divinité-spaghetti ailée, auréolée et couronnée. On la touche de sa nouille.",
        sprite: "/yellow/sprites/dex/divinpate.png",
    },

    // --- 🐦 Héron (Vol/Eau) ---
    piouflot: {
        id: "piouflot", dexNo: 34, name: "Piouflot", types: ["VOL", "EAU"],
        baseStats: { hp: 40, atk: 40, def: 40, spe: 56, spc: 48 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 5, moveId: "pistolet_a_o" },
            { level: 14, moveId: "picpic" },
            { level: 22, moveId: "tornade" },
        ],
        evolution: { toId: "herondee", method: { kind: "LEVEL", level: 17 } },
        catchRate: 120, baseExp: 55, rarity: "COMMON", growthRate: "medium_fast", role: "Vol/Eau — poussin",
        description: "Poussin duveteux qui patauge plus qu'il ne vole.",
        sprite: "/yellow/sprites/dex/piouflot.png",
    },
    herondee: {
        id: "herondee", dexNo: 35, name: "Hérondée", types: ["VOL", "EAU"],
        baseStats: { hp: 58, atk: 54, def: 52, spe: 76, spc: 68 },
        learnset: [
            { level: 1, moveId: "pistolet_a_o" },
            { level: 1, moveId: "picpic" },
            { level: 20, moveId: "lame_eau" },
            { level: 28, moveId: "tornade" },
        ],
        evolution: { toId: "oragron", method: { kind: "LEVEL", level: 35 } },
        catchRate: 60, baseExp: 142, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Vol/Eau — gracile",
        description: "Héron élégant ruisselant d'eau de pluie.",
        sprite: "/yellow/sprites/dex/herondee.png",
    },
    oragron: {
        id: "oragron", dexNo: 36, name: "Oragron", types: ["VOL", "ELEC"],
        baseStats: { hp: 80, atk: 74, def: 70, spe: 106, spc: 92 },
        learnset: [
            { level: 1, moveId: "tornade" },
            { level: 35, moveId: "etincelle" },
            { level: 42, moveId: "pique_fatal" },
            { level: 46, moveId: "focalisation" },
            { level: 52, moveId: "lame_eau" },
            { level: 54, moveId: "fulgurance" },
            { level: 65, moveId: "vol" },
            { level: 66, moveId: "ultra_foudre" },
        ],
        catchRate: 45, baseExp: 210, rarity: "RARE", growthRate: "medium_fast", role: "Vol/Élec — sweeper",
        description: "Héron de tempête aux ailes de nuages d'orage, zébré d'éclairs.",
        sprite: "/yellow/sprites/dex/oragron.png",
    },

    // --- 🐻 Ours sylvestre (Combat/Plante) ---
    broussours: {
        id: "broussours", dexNo: 37, name: "Broussours", types: ["COMBAT", "PLANTE"],
        baseStats: { hp: 56, atk: 64, def: 52, spe: 38, spc: 38 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 7, moveId: "double_pied" },
            { level: 18, moveId: "fouet_lianes" },
        ],
        evolution: { toId: "sylvours", method: { kind: "LEVEL", level: 18 } },
        catchRate: 120, baseExp: 60, rarity: "COMMON", growthRate: "medium_fast", role: "Combat/Plante — ourson",
        description: "Ourson des broussailles à la fourrure mêlée de lierre.",
        sprite: "/yellow/sprites/dex/broussours.png",
    },
    sylvours: {
        id: "sylvours", dexNo: 38, name: "Sylvours", types: ["COMBAT", "PLANTE"],
        baseStats: { hp: 76, atk: 88, def: 72, spe: 48, spc: 54 },
        learnset: [
            { level: 1, moveId: "double_pied" },
            { level: 1, moveId: "fouet_lianes" },
            { level: 30, moveId: "poing_karate" },
            { level: 36, moveId: "mega_sangsue" },
        ],
        evolution: { toId: "druidours", method: { kind: "LEVEL", level: 36 } },
        catchRate: 60, baseExp: 142, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Combat/Plante — colosse",
        description: "Ours sylvestre dressé, paré d'une armure de feuilles.",
        sprite: "/yellow/sprites/dex/sylvours.png",
    },
    druidours: {
        id: "druidours", dexNo: 39, name: "Druidours", types: ["COMBAT", "PLANTE"],
        baseStats: { hp: 105, atk: 118, def: 98, spe: 48, spc: 66 },
        learnset: [
            { level: 1, moveId: "poing_karate" },
            { level: 1, moveId: "fouet_lianes" },
            { level: 1, moveId: "belier" },
            { level: 38, moveId: "crochet_maitre" },
            { level: 40, moveId: "tempete_verte" },
            { level: 44, moveId: "seisme" },
            { level: 48, moveId: "mega_sangsue" },
            { level: 54, moveId: "lance_soleil" },
        ],
        catchRate: 45, baseExp: 220, rarity: "RARE", growthRate: "medium_fast", role: "Combat/Plante — tank offensif",
        description: "Ours-druide titanesque au cœur de sève luminescent.",
        sprite: "/yellow/sprites/dex/druidours.png",
    },

    // ============================================================
    // 8 FAMILLES SUPPLÉMENTAIRES (Daemons ORIGINAUX, stats maison).
    // ============================================================

    // --- 🌿 Félin végétal (Plante, signature Vitesse) ---
    pampousse: {
        id: "pampousse", dexNo: 40, name: "Pampousse", types: ["PLANTE"],
        baseStats: { hp: 45, atk: 45, def: 42, spe: 55, spc: 52 },
        learnset: [{ level: 1, moveId: "charge" }, { level: 4, moveId: "fouet_lianes" }, { level: 10, moveId: "vive_attaque" }, { level: 18, moveId: "tranche_feuille" }],
        evolution: { toId: "feliane", method: { kind: "LEVEL", level: 16 } },
        catchRate: 45, baseExp: 64, rarity: "RARE", growthRate: "medium_fast", role: "Plante — vif",
        description: "Chaton-pousse joueur qui bondit de branche en branche.",
        sprite: "/yellow/sprites/dex/pampousse.png",
    },
    feliane: {
        id: "feliane", dexNo: 41, name: "Féliane", types: ["PLANTE"],
        baseStats: { hp: 62, atk: 68, def: 56, spe: 82, spc: 68 },
        learnset: [{ level: 1, moveId: "fouet_lianes" }, { level: 1, moveId: "tranche_feuille" }, { level: 20, moveId: "spores_dodo" }, { level: 24, moveId: "mega_sangsue" }, { level: 30, moveId: "vive_attaque" }, { level: 34, moveId: "focalisation" }],
        evolution: { toId: "cerfeuillu", method: { kind: "LEVEL", level: 34 } },
        catchRate: 45, baseExp: 141, rarity: "RARE", growthRate: "medium_fast", role: "Plante — rapide",
        description: "Félin sylvestre à la crinière de feuilles ; file comme le vent.",
        sprite: "/yellow/sprites/dex/feliane.png",
    },
    cerfeuillu: {
        id: "cerfeuillu", dexNo: 42, name: "Silviliane", types: ["PLANTE"],
        baseStats: { hp: 82, atk: 88, def: 74, spe: 96, spc: 92 },
        learnset: [{ level: 1, moveId: "tempete_verte" }, { level: 1, moveId: "tranche_feuille" }, { level: 1, moveId: "coup_d_boule" }, { level: 1, moveId: "spores_dodo" }, { level: 1, moveId: "focalisation" }, { level: 40, moveId: "elan" }, { level: 48, moveId: "mega_sangsue" }, { level: 66, moveId: "brume_sporale" }],
        catchRate: 45, baseExp: 210, rarity: "RARE", growthRate: "medium_fast", role: "Plante — sweeper",
        description: "Félin-cerf majestueux paré de fruits et de fleurs.",
        sprite: "/yellow/sprites/dex/cerfeuillu.png",
    },

    // --- 💧 Loutre → dragon d'eau (Eau, signature Spécial) ---
    loutrille: {
        id: "loutrille", dexNo: 43, name: "Loutrille", types: ["EAU"],
        baseStats: { hp: 48, atk: 46, def: 46, spe: 50, spc: 60 },
        learnset: [{ level: 1, moveId: "charge" }, { level: 6, moveId: "pistolet_a_o" }, { level: 12, moveId: "vive_attaque" }, { level: 20, moveId: "lame_eau" }],
        evolution: { toId: "ondaloutre", method: { kind: "LEVEL", level: 16 } },
        catchRate: 45, baseExp: 64, rarity: "RARE", growthRate: "medium_fast", role: "Eau — special",
        description: "Petite loutre espiègle qui ne tient pas en place.",
        sprite: "/yellow/sprites/dex/loutrille.png",
    },
    ondaloutre: {
        id: "ondaloutre", dexNo: 44, name: "Ondaloutre", types: ["EAU"],
        baseStats: { hp: 64, atk: 60, def: 60, spe: 64, spc: 82 },
        learnset: [{ level: 1, moveId: "pistolet_a_o" }, { level: 1, moveId: "lame_eau" }, { level: 26, moveId: "coup_d_givre" }, { level: 34, moveId: "hydrocanon" }],
        evolution: { toId: "naiadrak", method: { kind: "LEVEL", level: 36 } },
        catchRate: 45, baseExp: 141, rarity: "RARE", growthRate: "medium_fast", role: "Eau — special",
        description: "Loutre élégante chevauchant ses propres vagues.",
        sprite: "/yellow/sprites/dex/ondaloutre.png",
    },
    naiadrak: {
        id: "naiadrak", dexNo: 45, name: "Naïadrak", types: ["EAU"],
        baseStats: { hp: 84, atk: 76, def: 66, spe: 82, spc: 114 },
        learnset: [{ level: 1, moveId: "hydrocanon" }, { level: 1, moveId: "lame_eau" }, { level: 1, moveId: "coup_d_givre" }, { level: 38, moveId: "draco_souffle" }, { level: 44, moveId: "focalisation" }, { level: 50, moveId: "plaquage" }, { level: 60, moveId: "ultralaser" }],
        catchRate: 45, baseExp: 210, rarity: "RARE", growthRate: "medium_fast", role: "Eau — canon spécial (Déf frêle)",
        description: "Dragon d'eau couronné de corail ; gardien des courants.",
        sprite: "/yellow/sprites/dex/naiadrak.png",
    },

    // --- 🔥 Fennec → loup (Feu, signature Attaque/Vitesse) ---
    fennaise: {
        id: "fennaise", dexNo: 46, name: "Fennaise", types: ["FEU"],
        baseStats: { hp: 42, atk: 52, def: 40, spe: 64, spc: 48 },
        learnset: [{ level: 1, moveId: "charge" }, { level: 7, moveId: "flammeche" }, { level: 14, moveId: "vive_attaque" }, { level: 22, moveId: "flamme_ardente" }],
        evolution: { toId: "pyrenard", method: { kind: "LEVEL", level: 16 } },
        catchRate: 45, baseExp: 64, rarity: "RARE", growthRate: "medium_fast", role: "Feu — vif",
        description: "Renardeau de feu aux grandes oreilles, vif et farceur.",
        sprite: "/yellow/sprites/dex/fennaise.png",
    },
    pyrenard: {
        id: "pyrenard", dexNo: 47, name: "Pyrenard", types: ["FEU"],
        baseStats: { hp: 60, atk: 74, def: 52, spe: 86, spc: 60 },
        learnset: [{ level: 1, moveId: "flammeche" }, { level: 1, moveId: "flamme_ardente" }, { level: 28, moveId: "belier" }, { level: 36, moveId: "lance_flammes" }],
        evolution: { toId: "loupyre", method: { kind: "LEVEL", level: 36 } },
        catchRate: 45, baseExp: 141, rarity: "RARE", growthRate: "medium_fast", role: "Feu — rapide offensif",
        description: "Renard de braise dont la queue laisse une traînée d'étincelles.",
        sprite: "/yellow/sprites/dex/pyrenard.png",
    },
    loupyre: {
        id: "loupyre", dexNo: 48, name: "Loupyre", types: ["FEU"],
        baseStats: { hp: 82, atk: 110, def: 72, spe: 98, spc: 72 },
        learnset: [{ level: 1, moveId: "lance_flammes" }, { level: 1, moveId: "flamme_ardente" }, { level: 1, moveId: "belier" }, { level: 40, moveId: "elan" }, { level: 42, moveId: "crochet_maitre" }, { level: 46, moveId: "danse_lames" }, { level: 50, moveId: "ultralaser" }, { level: 65, moveId: "boutefeu" }],
        catchRate: 45, baseExp: 210, rarity: "RARE", growthRate: "medium_fast", role: "Feu — sweeper physique",
        description: "Loup de flammes à la crinière incandescente.",
        sprite: "/yellow/sprites/dex/loupyre.png",
    },

    // --- 🦍 Orang-outan forgeron (Combat → Combat/Psy) ---
    forgeotin: {
        id: "forgeotin", dexNo: 49, name: "Forgeotin", types: ["COMBAT"],
        baseStats: { hp: 52, atk: 58, def: 50, spe: 40, spc: 44 },
        learnset: [{ level: 1, moveId: "charge" }, { level: 7, moveId: "double_pied" }, { level: 16, moveId: "mur_de_fer" }, { level: 24, moveId: "balayage" }],
        evolution: { toId: "marteloutan", method: { kind: "LEVEL", level: 18 } },
        catchRate: 120, baseExp: 60, rarity: "COMMON", growthRate: "medium_fast", role: "Combat — apprenti",
        description: "Jeune orang-outan déjà armé de son petit marteau.",
        sprite: "/yellow/sprites/dex/forgeotin.png",
    },
    marteloutan: {
        id: "marteloutan", dexNo: 50, name: "Marteloutan", types: ["COMBAT"],
        baseStats: { hp: 74, atk: 82, def: 70, spe: 52, spc: 60 },
        learnset: [{ level: 1, moveId: "balayage" }, { level: 1, moveId: "double_pied" }, { level: 1, moveId: "mur_de_fer" }, { level: 30, moveId: "crochet_maitre" }, { level: 36, moveId: "focalisation" }],
        evolution: { toId: "enclumind", method: { kind: "LEVEL", level: 36 } },
        catchRate: 60, baseExp: 142, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Combat — forgeron",
        description: "Forgeron singe au tablier de cuir ; frappe comme une enclume.",
        sprite: "/yellow/sprites/dex/marteloutan.png",
    },
    enclumind: {
        id: "enclumind", dexNo: 51, name: "Enclumind", types: ["COMBAT", "PSY"],
        baseStats: { hp: 92, atk: 122, def: 90, spe: 52, spc: 82 },
        learnset: [{ level: 1, moveId: "crochet_maitre" }, { level: 1, moveId: "balayage" }, { level: 1, moveId: "choc_mental" }, { level: 30, moveId: "mur_de_fer" }, { level: 40, moveId: "seisme" }, { level: 46, moveId: "vague_mentale" }, { level: 52, moveId: "danse_lames" }, { level: 65, moveId: "deluge_crochets" }, { level: 80, moveId: "eveil_divin" }],
        catchRate: 45, baseExp: 215, rarity: "RARE", growthRate: "medium_fast", role: "Combat/Psy — bruiser lent",
        description: "Maître-forgeron en armure runique ; son marteau plie l'acier et l'esprit.",
        sprite: "/yellow/sprites/dex/enclumind.png",
    },

    // --- ⚡ Trolls (Combat/Élec, signature Attaque) ---
    trolystrik: {
        id: "trolystrik", dexNo: 52, name: "Trolystrik", types: ["COMBAT", "ELEC"],
        baseStats: { hp: 46, atk: 60, def: 40, spe: 58, spc: 40 },
        learnset: [{ level: 1, moveId: "charge" }, { level: 7, moveId: "double_pied" }, { level: 16, moveId: "etincelle" }, { level: 24, moveId: "vive_attaque" }],
        evolution: { toId: "brutetrik", method: { kind: "LEVEL", level: 17 } },
        catchRate: 120, baseExp: 60, rarity: "COMMON", growthRate: "medium_fast", role: "Combat/Élec — vif",
        description: "Troll-lutin nerveux dont la crête grésille d'électricité.",
        sprite: "/yellow/sprites/dex/trolystrik.png",
    },
    brutetrik: {
        id: "brutetrik", dexNo: 53, name: "Brutetrik", types: ["COMBAT", "ELEC"],
        baseStats: { hp: 70, atk: 92, def: 62, spe: 76, spc: 56 },
        learnset: [{ level: 1, moveId: "poing_karate" }, { level: 1, moveId: "etincelle" }, { level: 30, moveId: "balayage" }, { level: 36, moveId: "fulgurance" }],
        evolution: { toId: "hebulmin", method: { kind: "LEVEL", level: 38 } },
        catchRate: 60, baseExp: 142, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Combat/Élec — brute",
        description: "Troll musculeux dont les poings crépitent d'arcs électriques.",
        sprite: "/yellow/sprites/dex/brutetrik.png",
    },
    hebulmin: {
        id: "hebulmin", dexNo: 54, name: "Hébulmin", types: ["COMBAT", "ELEC"],
        baseStats: { hp: 100, atk: 126, def: 82, spe: 66, spc: 64 },
        learnset: [{ level: 1, moveId: "crochet_maitre" }, { level: 1, moveId: "fulgurance" }, { level: 1, moveId: "belier" }, { level: 40, moveId: "danse_lames" }, { level: 44, moveId: "seisme" }, { level: 46, moveId: "cage_eclair" }, { level: 52, moveId: "vive_attaque" }, { level: 65, moveId: "plaquage" }],
        catchRate: 45, baseExp: 215, rarity: "RARE", growthRate: "medium_fast", role: "Combat/Élec — colosse",
        description: "Colosse-troll à la crinière de foudre ; un seul coup fait trembler l'arène.",
        sprite: "/yellow/sprites/dex/hebulmin.png",
    },

    // --- 🐉 Dragon blanc (Vol/Dragon, pseudo-légendaire) ---
    draclet: {
        id: "draclet", dexNo: 55, name: "Draclet", types: ["VOL", "DRAGON"],
        baseStats: { hp: 45, atk: 50, def: 44, spe: 50, spc: 50 },
        learnset: [{ level: 1, moveId: "charge" }, { level: 5, moveId: "picpic" }, { level: 16, moveId: "draco_souffle" }, { level: 24, moveId: "vive_attaque" }],
        evolution: { toId: "wyverion", method: { kind: "LEVEL", level: 20 } },
        catchRate: 45, baseExp: 66, rarity: "RARE", growthRate: "medium_fast", role: "Dragon — équilibré",
        description: "Dragonnet blanc enjoué aux ailes encore trop petites.",
        sprite: "/yellow/sprites/dex/draclet.png",
    },
    wyverion: {
        id: "wyverion", dexNo: 56, name: "Wyverion", types: ["VOL", "DRAGON"],
        baseStats: { hp: 68, atk: 78, def: 66, spe: 74, spc: 68 },
        learnset: [{ level: 1, moveId: "picpic" }, { level: 1, moveId: "draco_souffle" }, { level: 26, moveId: "tornade" }, { level: 34, moveId: "fonce_bec" }],
        evolution: { toId: "draconarque", method: { kind: "LEVEL", level: 40 } },
        catchRate: 45, baseExp: 144, rarity: "RARE", growthRate: "medium_fast", role: "Dragon — agile",
        description: "Wyverne véloce aux ailes coriaces ; chasse en piqué.",
        sprite: "/yellow/sprites/dex/wyverion.png",
    },
    draconarque: {
        id: "draconarque", dexNo: 57, name: "Draconarque", types: ["VOL", "DRAGON"],
        baseStats: { hp: 90, atk: 110, def: 88, spe: 100, spc: 90 },
        learnset: [{ level: 1, moveId: "draco_charge" }, { level: 1, moveId: "draco_souffle" }, { level: 1, moveId: "fonce_bec" }, { level: 44, moveId: "pique_fatal" }, { level: 48, moveId: "souffle_polaire" }, { level: 52, moveId: "danse_lames" }, { level: 66, moveId: "vol" }, { level: 80, moveId: "ultralaser" }],
        catchRate: 30, baseExp: 255, rarity: "LEGENDARY", growthRate: "medium_fast", role: "Dragon — pseudo-légendaire",
        description: "Grand dragon blanc régnant sur les cimes. Son ombre couvre une vallée.",
        sprite: "/yellow/sprites/dex/draconarque.png",
    },

    // --- ☠️ Corbeaux (Vol/Poison, signature Spécial/Vitesse) ---
    cornaissant: {
        id: "cornaissant", dexNo: 58, name: "Cornaissant", types: ["VOL", "POISON"],
        baseStats: { hp: 40, atk: 44, def: 40, spe: 52, spc: 52 },
        learnset: [{ level: 1, moveId: "charge" }, { level: 5, moveId: "picpic" }, { level: 14, moveId: "dard_venin" }, { level: 22, moveId: "vive_attaque" }],
        evolution: { toId: "corvenin", method: { kind: "LEVEL", level: 16 } },
        catchRate: 120, baseExp: 60, rarity: "COMMON", growthRate: "medium_fast", role: "Vol/Poison — early",
        description: "Corbillat tout juste éclos, déjà curieux des potions.",
        sprite: "/yellow/sprites/dex/cornaissant.png",
    },
    corvenin: {
        id: "corvenin", dexNo: 59, name: "Corvenin", types: ["VOL", "POISON"],
        baseStats: { hp: 58, atk: 60, def: 52, spe: 72, spc: 72 },
        learnset: [{ level: 1, moveId: "picpic" }, { level: 1, moveId: "crachat_acide" }, { level: 26, moveId: "tornade" }, { level: 32, moveId: "toxik" }],
        evolution: { toId: "necrocorbe", method: { kind: "LEVEL", level: 35 } },
        catchRate: 60, baseExp: 142, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Vol/Poison — rapide",
        description: "Corbeau alchimiste transportant une fiole de venin.",
        sprite: "/yellow/sprites/dex/corvenin.png",
    },
    necrocorbe: {
        id: "necrocorbe", dexNo: 60, name: "Nécrocorbe", types: ["VOL", "POISON"],
        baseStats: { hp: 78, atk: 80, def: 72, spe: 96, spc: 100 },
        learnset: [{ level: 1, moveId: "tornade" }, { level: 1, moveId: "vague_mentale" }, { level: 1, moveId: "crachat_acide" }, { level: 36, moveId: "pique_fatal" }, { level: 38, moveId: "bombe_beurk" }, { level: 40, moveId: "ombre_furtive" }, { level: 44, moveId: "toxik" }, { level: 52, moveId: "focalisation" }, { level: 62, moveId: "miasme_corrosif" }],
        catchRate: 45, baseExp: 210, rarity: "RARE", growthRate: "medium_fast", role: "Vol/Poison — hex caster",
        description: "Corbeau-chamane drapé d'ossements ; ses incantations rongent l'âme.",
        sprite: "/yellow/sprites/dex/necrocorbe.png",
    },

    // --- 👻 Champignons (Spectre/Poison, signature Spécial + bulk) ---
    sporbeo: {
        id: "sporbeo", dexNo: 61, name: "Sporbéo", types: ["SPECTRE", "POISON"],
        baseStats: { hp: 48, atk: 40, def: 48, spe: 38, spc: 60 },
        learnset: [{ level: 1, moveId: "charge" }, { level: 7, moveId: "leche" }, { level: 14, moveId: "dard_venin" }, { level: 22, moveId: "mega_sangsue" }],
        evolution: { toId: "lampignon", method: { kind: "LEVEL", level: 15 } },
        catchRate: 90, baseExp: 64, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Spectre/Poison — special frêle",
        description: "Petit champignon souriant coiffé d'une flammèche spectrale.",
        sprite: "/yellow/sprites/dex/sporbeo.png",
    },
    lampignon: {
        id: "lampignon", dexNo: 62, name: "Lampignon", types: ["SPECTRE", "POISON"],
        baseStats: { hp: 66, atk: 54, def: 64, spe: 52, spc: 86 },
        learnset: [{ level: 1, moveId: "leche" }, { level: 1, moveId: "crachat_acide" }, { level: 1, moveId: "mega_sangsue" }, { level: 30, moveId: "toxik" }, { level: 36, moveId: "onde_folie" }],
        evolution: { toId: "mycedruide", method: { kind: "LEVEL", level: 33 } },
        catchRate: 45, baseExp: 142, rarity: "RARE", growthRate: "medium_fast", role: "Spectre/Poison — special",
        description: "Esprit-champignon ailé portant une lanterne d'âmes.",
        sprite: "/yellow/sprites/dex/lampignon.png",
    },
    mycedruide: {
        id: "mycedruide", dexNo: 63, name: "Mycédruide", types: ["SPECTRE", "POISON"],
        baseStats: { hp: 90, atk: 72, def: 88, spe: 60, spc: 116 },
        learnset: [{ level: 1, moveId: "leche" }, { level: 1, moveId: "onde_folie" }, { level: 1, moveId: "vague_mentale" }, { level: 1, moveId: "toxik" }, { level: 36, moveId: "ball_ombre" }, { level: 38, moveId: "bombe_beurk" }, { level: 44, moveId: "repos" }, { level: 42, moveId: "spores_dodo" }, { level: 52, moveId: "mega_sangsue" }, { level: 58, moveId: "linceul" }, { level: 68, moveId: "miasme_corrosif" }],
        catchRate: 45, baseExp: 215, rarity: "RARE", growthRate: "medium_fast", role: "Spectre/Poison — mur spécial",
        description: "Sage-champignon millénaire couronné de mycélium luminescent.",
        sprite: "/yellow/sprites/dex/mycedruide.png",
    },

    // ============================================================
    // DONJON — espèces INÉDITES (boss-only pour l'instant ; Panthéon sera
    // offert au joueur par un boss plus tard). Famille tamanoir + panthères.
    // ============================================================

    // --- 🐜 Tamanoir végétal (Plante, archétype drain-tank spécial) ---
    tamanpousse: {
        id: "tamanpousse", dexNo: 64, name: "Tamanpousse", types: ["PLANTE"],
        baseStats: { hp: 55, atk: 40, def: 52, spe: 40, spc: 58 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 5, moveId: "fouet_lianes" },
            { level: 9, moveId: "vampigraine" },
            { level: 14, moveId: "mega_sangsue" },
            { level: 20, moveId: "spores_dodo" },
        ],
        evolution: { toId: "fourmilierre", method: { kind: "LEVEL", level: 16 } },
        catchRate: 45, baseExp: 64, rarity: "RARE", growthRate: "medium_fast", role: "Plante — bébé draineur",
        description: "Bébé tamanoir feuillu qui aspire la sève des fourmilières.",
        sprite: "/yellow/sprites/dex/tamanpousse.png",
    },
    fourmilierre: {
        id: "fourmilierre", dexNo: 65, name: "Fourmilierre", types: ["PLANTE"],
        baseStats: { hp: 78, atk: 52, def: 70, spe: 46, spc: 80 },
        learnset: [
            { level: 1, moveId: "fouet_lianes" },
            { level: 1, moveId: "vampigraine" },
            { level: 1, moveId: "mega_sangsue" },
            { level: 22, moveId: "morsure" },
            { level: 24, moveId: "spores_dodo" },
            { level: 30, moveId: "tranche_feuille" },
        ],
        evolution: { toId: "gloutanoir", method: { kind: "LEVEL", level: 34 } },
        catchRate: 45, baseExp: 142, rarity: "RARE", growthRate: "medium_fast", role: "Plante — draineur",
        description: "Tamanoir paré de lianes ; sa langue happe les nuisibles.",
        sprite: "/yellow/sprites/dex/fourmilierre.png",
    },
    gloutanoir: {
        id: "gloutanoir", dexNo: 66, name: "Gloutanoir", types: ["PLANTE"],
        baseStats: { hp: 108, atk: 72, def: 95, spe: 50, spc: 110 },
        learnset: [
            { level: 1, moveId: "mega_sangsue" },
            { level: 1, moveId: "vampigraine" },
            { level: 1, moveId: "tranche_feuille" },
            { level: 1, moveId: "morsure" },
            { level: 22, moveId: "jet_de_sable" },
            { level: 38, moveId: "tempete_verte" },
            { level: 46, moveId: "tranche" },
            { level: 66, moveId: "focalisation" },
        ],
        catchRate: 45, baseExp: 220, rarity: "RARE", growthRate: "medium_fast", role: "Plante — mur draineur",
        description: "Tamanoir-titan à la crinière de fougères ; vide ses proies de leur vigueur.",
        sprite: "/yellow/sprites/dex/gloutanoir.png",
    },

    // --- 🐆 Panthères élémentaires (base Normal + 6 formes ; v1 = boss-only) ---
    pantheon: {
        id: "pantheon", dexNo: 67, name: "Panthéon", types: ["NORMAL"],
        baseStats: { hp: 58, atk: 62, def: 52, spe: 70, spc: 55 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 1, moveId: "vive_attaque" },
            { level: 12, moveId: "coup_d_boule" },
            { level: 18, moveId: "hurlement" },
            { level: 24, moveId: "elan" },
        ],
        catchRate: 45, baseExp: 70, rarity: "RARE", growthRate: "medium_fast", role: "Normal — souche panthère (don futur)",
        description: "Panthéreau sombre et vif, réceptif aux énergies élémentaires.",
        sprite: "/yellow/sprites/dex/pantheon.png",
    },
    florapanthe: {
        id: "florapanthe", dexNo: 68, name: "Florapanthe", types: ["PLANTE"],
        baseStats: { hp: 90, atk: 80, def: 82, spe: 90, spc: 98 },
        learnset: [
            { level: 1, moveId: "vive_attaque" },
            { level: 1, moveId: "fouet_lianes" },
            { level: 1, moveId: "coup_d_boule" }, // couverture Normal (comme les autres panthères) → loadout Plante/Normal
            { level: 1, moveId: "tranche_feuille" },
            { level: 1, moveId: "etreinte_sylvestre" }, // signature du Druide
            { level: 20, moveId: "mega_sangsue" },
            { level: 30, moveId: "tempete_verte" },
        ],
        catchRate: 45, baseExp: 190, rarity: "RARE", growthRate: "medium_fast", role: "Plante — panthère (boss)",
        description: "Panthère sylvestre aux lianes vives ; bondit comme le lierre s'élance.",
        sprite: "/yellow/sprites/dex/florapanthe.png",
    },

    // --- 🐆 Les 5 autres panthères élémentaires (boss-only ; évolutions de Panthéon) ---
    panthegel: {
        id: "panthegel", dexNo: 69, name: "Panthégel", types: ["GLACE"],
        baseStats: { hp: 90, atk: 72, def: 90, spe: 82, spc: 105 },
        learnset: [
            { level: 1, moveId: "coup_d_givre" }, { level: 1, moveId: "souffle_polaire" },
            { level: 1, moveId: "vive_attaque" }, { level: 1, moveId: "coup_d_boule" },
        ],
        catchRate: 45, baseExp: 195, rarity: "RARE", growthRate: "medium_fast", role: "Glace — panthère (boss)",
        description: "Panthère de givre au pelage cristallin ; son souffle gèle l'air.",
        sprite: "/yellow/sprites/dex/panthegel.png",
    },
    pyropanthe: {
        id: "pyropanthe", dexNo: 70, name: "Pyropanthe", types: ["FEU"],
        baseStats: { hp: 72, atk: 78, def: 62, spe: 118, spc: 121 },
        learnset: [
            { level: 1, moveId: "flamme_ardente" }, { level: 1, moveId: "lance_flammes" },
            { level: 1, moveId: "vive_attaque" }, { level: 1, moveId: "coup_d_boule" },
        ],
        catchRate: 45, baseExp: 200, rarity: "RARE", growthRate: "medium_fast", role: "Feu — panthère (boss)",
        description: "Panthère de braise ; file plus vite que la flamme qui la couronne.",
        sprite: "/yellow/sprites/dex/pyropanthe.png",
    },
    ombrapanthe: {
        id: "ombrapanthe", dexNo: 71, name: "Ombrapanthe", types: ["SPECTRE"],
        baseStats: { hp: 78, atk: 96, def: 70, spe: 113, spc: 98 },
        learnset: [
            { level: 1, moveId: "ball_ombre" }, { level: 1, moveId: "leche" },
            { level: 1, moveId: "morsure" }, { level: 1, moveId: "coup_d_boule" },
        ],
        catchRate: 45, baseExp: 200, rarity: "RARE", growthRate: "medium_fast", role: "Spectre (ténèbre) — panthère (boss)",
        description: "Panthère des ténèbres ; surgit de l'ombre avant qu'on la voie.",
        sprite: "/yellow/sprites/dex/ombrapanthe.png",
    },
    aquapanthe: {
        id: "aquapanthe", dexNo: 72, name: "Aquapanthe", types: ["EAU"],
        baseStats: { hp: 102, atk: 76, def: 92, spe: 80, spc: 95 },
        learnset: [
            { level: 1, moveId: "lame_eau" }, { level: 1, moveId: "hydrocanon" },
            { level: 1, moveId: "vive_attaque" }, { level: 1, moveId: "coup_d_boule" },
        ],
        catchRate: 45, baseExp: 195, rarity: "RARE", growthRate: "medium_fast", role: "Eau — panthère (boss)",
        description: "Panthère des torrents ; sa crinière ruisselle d'une eau vive.",
        sprite: "/yellow/sprites/dex/aquapanthe.png",
    },
    voltapanthe: {
        id: "voltapanthe", dexNo: 73, name: "Voltapanthe", types: ["ELEC"],
        baseStats: { hp: 76, atk: 88, def: 64, spe: 122, spc: 102 },
        learnset: [
            { level: 1, moveId: "etincelle" }, { level: 1, moveId: "fulgurance" },
            { level: 1, moveId: "cage_eclair" }, { level: 1, moveId: "vive_attaque" },
        ],
        catchRate: 45, baseExp: 200, rarity: "RARE", growthRate: "medium_fast", role: "Élec — panthère (boss)",
        description: "Panthère de foudre ; un éclair sur pattes, la plus rapide du donjon.",
        sprite: "/yellow/sprites/dex/voltapanthe.png",
    },

    // ============================================================
    // LIGNÉES ROCHE (arène Roche) + 1 lignée Insecte/Spectre (dexNo 74-97)
    // ============================================================

    // --- Lignée 1 : Fossile « le temps se rembobine » (Roche/Vol) — base ultra-rapide,
    //     Vitesse qui STAGNE, Attaque qui monte EN FLÈCHE ---
    rembodo: {
        id: "rembodo", dexNo: 74, name: "Rembodo", types: ["ROCHE", "VOL"],
        baseStats: { hp: 45, atk: 35, def: 45, spe: 90, spc: 35 },
        learnset: [{ level: 1, moveId: "charge" }, { level: 1, moveId: "picpic" }, { level: 7, moveId: "vive_attaque" }, { level: 12, moveId: "jet_pierres" }],
        evolution: { toId: "retroraptor", method: { kind: "LEVEL", level: 18 } },
        catchRate: 120, baseExp: 62, rarity: "COMMON", growthRate: "medium_fast", role: "Roche/Vol — dodo (très rapide, faible Atk)",
        description: "Dodo aux grandes pattes, vif comme l'éclair ; un vestige qui remonte le temps.",
        sprite: "/yellow/sprites/dex/rembodo.png",
    },
    retroraptor: {
        id: "retroraptor", dexNo: 75, name: "Rétroraptor", types: ["ROCHE", "VOL"],
        baseStats: { hp: 65, atk: 78, def: 58, spe: 91, spc: 45 },
        learnset: [{ level: 1, moveId: "picpic" }, { level: 1, moveId: "jet_pierres" }, { level: 1, moveId: "morsure" }, { level: 1, moveId: "eboulis" }, { level: 30, moveId: "fonce_bec" }, { level: 36, moveId: "lame_roche" }],
        evolution: { toId: "chronorex", method: { kind: "LEVEL", level: 38 } },
        catchRate: 60, baseExp: 140, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Roche/Vol — rapace fossile",
        description: "Raptor au bec de dodo ; remonte encore le temps en évoluant.",
        sprite: "/yellow/sprites/dex/retroraptor.png",
    },
    chronorex: {
        id: "chronorex", dexNo: 76, name: "Chronorex", types: ["ROCHE", "VOL"],
        baseStats: { hp: 90, atk: 135, def: 82, spe: 92, spc: 55 },
        learnset: [{ level: 1, moveId: "morsure" }, { level: 1, moveId: "eboulis" }, { level: 1, moveId: "fonce_bec" }, { level: 1, moveId: "lame_roche" }, { level: 40, moveId: "belier" }, { level: 46, moveId: "pique_fatal" }, { level: 50, moveId: "seisme" }],
        catchRate: 45, baseExp: 210, rarity: "RARE", growthRate: "medium_fast", role: "Roche/Vol — T-Rex (Atk énorme, Vit stagnée)",
        description: "T-Rex au bec de dodo ; le plus ancien des fossiles, à la force titanesque.",
        sprite: "/yellow/sprites/dex/chronorex.png",
    },

    // --- Lignée 2 : Diamant « doublement » — 9 STADES — arc Magicarpe→Léviator :
    //     base ridicule, PAS de Vitesse (sa faiblesse), montée massive PV+Déf,
    //     attaques de set-up (Carapace Diamant, Danse-Lames, Repos) au bout. ---
    mottoche: {
        id: "mottoche", dexNo: 77, name: "Mottoche", types: ["ROCHE", "SOL"],
        baseStats: { hp: 50, atk: 15, def: 48, spe: 15, spc: 28 },
        learnset: [{ level: 1, moveId: "charge" }, { level: 1, moveId: "jet_pierres" }],
        evolution: { toId: "dumotte", method: { kind: "LEVEL", level: 8 } },
        catchRate: 220, baseExp: 36, rarity: "COMMON", growthRate: "medium_fast", growthByStage: true, role: "Roche/Sol — motte (quasi inutile)",
        description: "Une petite boule de terre qui roule mollement. Très commune.",
        sprite: "/yellow/sprites/dex/mottoche.png",
    },
    dumotte: {
        id: "dumotte", dexNo: 78, name: "Dumotte", types: ["ROCHE", "SOL"],
        baseStats: { hp: 60, atk: 22, def: 60, spe: 18, spc: 34 },
        learnset: [{ level: 1, moveId: "charge" }, { level: 1, moveId: "jet_pierres" }, { level: 1, moveId: "mur_de_fer" }],
        evolution: { toId: "quadroc", method: { kind: "LEVEL", level: 12 } },
        catchRate: 180, baseExp: 50, rarity: "COMMON", growthRate: "medium_fast", growthByStage: true, role: "Roche/Sol — 2 mottes",
        description: "Deux boules de terre soudées.",
        sprite: "/yellow/sprites/dex/dumotte.png",
    },
    quadroc: {
        id: "quadroc", dexNo: 79, name: "Quadroc", types: ["ROCHE", "SOL"],
        baseStats: { hp: 72, atk: 30, def: 74, spe: 20, spc: 40 },
        learnset: [{ level: 1, moveId: "jet_pierres" }, { level: 1, moveId: "tir_boue" }, { level: 1, moveId: "mur_de_fer" }],
        evolution: { toId: "octoroc", method: { kind: "LEVEL", level: 20 } },
        catchRate: 140, baseExp: 70, rarity: "COMMON", growthRate: "medium_fast", growthByStage: true, role: "Roche/Sol — 4 cailloux",
        description: "Quatre cailloux agglomérés.",
        sprite: "/yellow/sprites/dex/quadroc.png",
    },
    octoroc: {
        id: "octoroc", dexNo: 80, name: "Octoroc", types: ["ROCHE", "SOL"],
        baseStats: { hp: 84, atk: 40, def: 90, spe: 22, spc: 48 },
        learnset: [{ level: 1, moveId: "eboulis" }, { level: 1, moveId: "tir_boue" }, { level: 1, moveId: "mur_de_fer" }],
        evolution: { toId: "hexaroc", method: { kind: "LEVEL", level: 30 } },
        catchRate: 100, baseExp: 95, rarity: "UNCOMMON", growthRate: "medium_fast", growthByStage: true, role: "Roche/Sol — 8 cailloux",
        description: "Huit cailloux plus solides.",
        sprite: "/yellow/sprites/dex/octoroc.png",
    },
    hexaroc: {
        id: "hexaroc", dexNo: 81, name: "Hexaroc", types: ["ROCHE", "SOL"],
        baseStats: { hp: 96, atk: 52, def: 108, spe: 26, spc: 56 },
        learnset: [{ level: 1, moveId: "eboulis" }, { level: 1, moveId: "mur_de_fer" }, { level: 1, moveId: "carapace_diamant" }, { level: 26, moveId: "seisme" }],
        evolution: { toId: "diamantine", method: { kind: "LEVEL", level: 36 } },
        catchRate: 70, baseExp: 130, rarity: "UNCOMMON", growthRate: "medium_fast", growthByStage: true, role: "Roche/Sol — 16 cailloux",
        description: "Seize cailloux quasi indestructibles.",
        sprite: "/yellow/sprites/dex/hexaroc.png",
    },
    diamantine: {
        id: "diamantine", dexNo: 82, name: "Diamantine", types: ["ROCHE", "SOL"],
        baseStats: { hp: 108, atk: 64, def: 124, spe: 30, spc: 68 },
        learnset: [{ level: 1, moveId: "eboulis" }, { level: 1, moveId: "carapace_diamant" }, { level: 1, moveId: "lame_roche" }, { level: 1, moveId: "seisme" }],
        evolution: { toId: "amadiam", method: { kind: "LEVEL", level: 50 } },
        catchRate: 45, baseExp: 175, rarity: "RARE", growthRate: "medium_fast", growthByStage: true, role: "Roche — 32 cailloux diamant",
        description: "Trente-deux cristaux d'un bleu diamant, presque inrayables.",
        sprite: "/yellow/sprites/dex/diamantine.png",
    },
    amadiam: {
        id: "amadiam", dexNo: 83, name: "Amadiam", types: ["ROCHE", "SOL"],
        baseStats: { hp: 118, atk: 78, def: 138, spe: 34, spc: 78 },
        learnset: [{ level: 1, moveId: "lame_roche" }, { level: 1, moveId: "carapace_diamant" }, { level: 1, moveId: "seisme" }, { level: 1, moveId: "eboulis" }],
        evolution: { toId: "golemini", method: { kind: "LEVEL", level: 63 } },
        catchRate: 35, baseExp: 205, rarity: "RARE", growthRate: "medium_fast", growthByStage: true, role: "Roche — amas de 64 diamants",
        description: "Un amas de soixante-quatre diamants éclatants.",
        sprite: "/yellow/sprites/dex/amadiam.png",
    },
    golemini: {
        id: "golemini", dexNo: 84, name: "Golémini", types: ["ROCHE", "SOL"],
        baseStats: { hp: 128, atk: 90, def: 150, spe: 38, spc: 86 },
        learnset: [{ level: 1, moveId: "lame_roche" }, { level: 1, moveId: "seisme" }, { level: 1, moveId: "carapace_diamant" }, { level: 1, moveId: "repos" }],
        evolution: { toId: "megalithe", method: { kind: "LEVEL", level: 80 } },
        catchRate: 25, baseExp: 245, rarity: "RARE", growthRate: "medium_fast", growthByStage: true, role: "Roche — petit golem de diamant",
        description: "Un golem compact taillé dans soixante-quatre diamants.",
        sprite: "/yellow/sprites/dex/golemini.png",
    },
    megalithe: {
        id: "megalithe", dexNo: 85, name: "Mégalithe", types: ["ROCHE"],
        baseStats: { hp: 140, atk: 100, def: 160, spe: 40, spc: 95 },
        learnset: [{ level: 1, moveId: "lame_roche" }, { level: 1, moveId: "seisme" }, { level: 1, moveId: "carapace_diamant" }, { level: 1, moveId: "danse_lames" }, { level: 1, moveId: "repos" }, { level: 50, moveId: "belier" }],
        catchRate: 20, baseExp: 290, rarity: "RARE", growthRate: "medium_fast", growthByStage: true, role: "Roche — méga golem de diamant (mur ultime, set-up)",
        description: "Titan de diamant ; le mur le plus infranchissable connu. Récompense d'un grind héroïque.",
        sprite: "/yellow/sprites/dex/megalithe.png",
    },

    // --- Lignée 3 : Limace/escargot/tortue (Roche/Psy, tank spécial) ---
    limaroche: {
        id: "limaroche", dexNo: 86, name: "Limaroche", types: ["ROCHE", "PSY"],
        baseStats: { hp: 55, atk: 35, def: 55, spe: 20, spc: 50 },
        learnset: [{ level: 1, moveId: "charge" }, { level: 1, moveId: "choc_mental" }, { level: 9, moveId: "jet_pierres" }],
        evolution: { toId: "escaroche", method: { kind: "LEVEL", level: 18 } },
        catchRate: 120, baseExp: 58, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Roche/Psy — limace (très lente)",
        description: "Limace minérale aux antennes télépathes.",
        sprite: "/yellow/sprites/dex/limaroche.png",
    },
    escaroche: {
        id: "escaroche", dexNo: 87, name: "Escargyle", types: ["ROCHE", "PSY"],
        baseStats: { hp: 72, atk: 45, def: 80, spe: 24, spc: 75 },
        learnset: [{ level: 1, moveId: "choc_mental" }, { level: 1, moveId: "jet_pierres" }, { level: 1, moveId: "eboulis" }, { level: 24, moveId: "mur_de_fer" }],
        evolution: { toId: "torturoche", method: { kind: "LEVEL", level: 36 } },
        catchRate: 60, baseExp: 128, rarity: "RARE", growthRate: "medium_fast", role: "Roche/Psy — escargot",
        description: "Escargot à coquille de pierre ; lent mais imperturbable.",
        sprite: "/yellow/sprites/dex/escaroche.png",
    },
    torturoche: {
        id: "torturoche", dexNo: 88, name: "Tortoracle", types: ["ROCHE", "PSY"],
        baseStats: { hp: 100, atk: 58, def: 108, spe: 27, spc: 112 },
        learnset: [{ level: 1, moveId: "vague_mentale" }, { level: 1, moveId: "lame_roche" }, { level: 1, moveId: "eboulis" }, { level: 1, moveId: "choc_mental" }, { level: 40, moveId: "focalisation" }, { level: 44, moveId: "mur_de_fer" }, { level: 48, moveId: "repos" }],
        catchRate: 45, baseExp: 200, rarity: "RARE", growthRate: "medium_fast", role: "Roche/Psy — tortue (mur spécial)",
        description: "Tortue ancestrale ; sa carapace de roche abrite un esprit puissant.",
        sprite: "/yellow/sprites/dex/torturoche.png",
    },

    // --- Lignée 4 : Marmotte/ourse/yéti (Roche/Glace, mur physique) ---
    marmoterre: {
        id: "marmoterre", dexNo: 89, name: "Marmoterre", types: ["ROCHE", "GLACE"],
        baseStats: { hp: 58, atk: 52, def: 52, spe: 42, spc: 48 },
        learnset: [{ level: 1, moveId: "charge" }, { level: 1, moveId: "coup_d_givre" }, { level: 8, moveId: "jet_pierres" }],
        evolution: { toId: "iorours", method: { kind: "LEVEL", level: 20 } },
        catchRate: 120, baseExp: 62, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Roche/Glace — marmotte",
        description: "Marmotte des cimes gelées qui creuse la pierre.",
        sprite: "/yellow/sprites/dex/marmoterre.png",
    },
    iorours: {
        id: "iorours", dexNo: 90, name: "Iorours", types: ["ROCHE", "GLACE"],
        baseStats: { hp: 80, atk: 80, def: 70, spe: 50, spc: 72 },
        learnset: [{ level: 1, moveId: "coup_d_givre" }, { level: 1, moveId: "jet_pierres" }, { level: 1, moveId: "eboulis" }, { level: 28, moveId: "belier" }],
        evolution: { toId: "yetiroche", method: { kind: "LEVEL", level: 40 } },
        catchRate: 50, baseExp: 150, rarity: "RARE", growthRate: "medium_fast", role: "Roche/Glace — ourse polaire",
        description: "Ourse polaire cuirassée de glace et de roc, fière et indomptable.",
        sprite: "/yellow/sprites/dex/iorours.png",
    },
    yetiroche: {
        id: "yetiroche", dexNo: 91, name: "Yétiroche", types: ["ROCHE", "GLACE"],
        baseStats: { hp: 95, atk: 100, def: 80, spe: 55, spc: 95 },
        learnset: [{ level: 1, moveId: "souffle_polaire" }, { level: 1, moveId: "lame_roche" }, { level: 1, moveId: "eboulis" }, { level: 1, moveId: "coup_d_givre" }, { level: 40, moveId: "belier" }, { level: 44, moveId: "danse_lames" }],
        catchRate: 45, baseExp: 205, rarity: "RARE", growthRate: "medium_fast", role: "Roche/Glace — yéti (attaquant MIXTE Atk+Spé)",
        description: "Yéti légendaire des sommets ; frappe aussi bien du poing que du souffle glacé.",
        sprite: "/yellow/sprites/dex/yetiroche.png",
    },

    // --- Lignée 5 : Têtard/grenouille-archère/crapaud (Roche/EAU) — le plus RAPIDE
    //     des Roche → frappe en premier + machine à critiques (Lame de Roche) ---
    tetardoc: {
        id: "tetardoc", dexNo: 92, name: "Têtardoc", types: ["ROCHE", "EAU"],
        baseStats: { hp: 50, atk: 50, def: 52, spe: 60, spc: 42 },
        learnset: [{ level: 1, moveId: "charge" }, { level: 1, moveId: "pistolet_a_o" }, { level: 7, moveId: "jet_pierres" }, { level: 12, moveId: "vive_attaque" }],
        evolution: { toId: "grenarc", method: { kind: "LEVEL", level: 18 } },
        catchRate: 120, baseExp: 60, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Roche/Eau — têtard",
        description: "Têtard à carapace de galet ; vise déjà juste.",
        sprite: "/yellow/sprites/dex/tetardoc.png",
    },
    grenarc: {
        id: "grenarc", dexNo: 93, name: "Grenarc", types: ["ROCHE", "EAU"],
        baseStats: { hp: 66, atk: 72, def: 60, spe: 88, spc: 54 },
        learnset: [{ level: 1, moveId: "pistolet_a_o" }, { level: 1, moveId: "jet_pierres" }, { level: 1, moveId: "eboulis" }, { level: 22, moveId: "lame_eau" }, { level: 28, moveId: "belier" }],
        evolution: { toId: "crapotaure", method: { kind: "LEVEL", level: 36 } },
        catchRate: 60, baseExp: 134, rarity: "RARE", growthRate: "medium_fast", role: "Roche/Eau — grenouille archère",
        description: "Grenouille armée d'un arc de pierre ; tireuse d'élite.",
        sprite: "/yellow/sprites/dex/grenarc.png",
    },
    crapotaure: {
        id: "crapotaure", dexNo: 94, name: "Crapôtaure", types: ["ROCHE", "EAU"],
        baseStats: { hp: 86, atk: 108, def: 78, spe: 108, spc: 64 },
        learnset: [{ level: 1, moveId: "lame_roche" }, { level: 1, moveId: "hydrocanon" }, { level: 1, moveId: "lame_eau" }, { level: 1, moveId: "belier" }, { level: 40, moveId: "eboulis" }, { level: 44, moveId: "danse_lames" }],
        catchRate: 45, baseExp: 200, rarity: "RARE", growthRate: "medium_fast", role: "Roche/Eau — crapaud archer (le + rapide des Roche)",
        description: "Crapaud colossal au grand arc ; ses flèches de roche critent sans relâche.",
        sprite: "/yellow/sprites/dex/crapotaure.png",
    },

    // --- Lignée 6 : Mante/scarabée/scolopendre spectral (Insecte/Spectre) —
    //     Déf TRÈS basse mais immunisé Normal+Combat & résiste Plante/Sol/Poison ---
    revemante: {
        id: "revemante", dexNo: 95, name: "Revemante", types: ["INSECTE", "SPECTRE"],
        baseStats: { hp: 50, atk: 58, def: 40, spe: 72, spc: 52 },
        learnset: [{ level: 1, moveId: "leche" }, { level: 1, moveId: "dard_nuee" }, { level: 12, moveId: "ombre_furtive" }],
        evolution: { toId: "necarabee", method: { kind: "LEVEL", level: 20 } },
        catchRate: 90, baseExp: 72, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Insecte/Spectre — mante revenante",
        description: "Mante religieuse spectrale ; surgit du néant.",
        sprite: "/yellow/sprites/dex/revemante.png",
    },
    necarabee: {
        id: "necarabee", dexNo: 96, name: "Nécarabée", types: ["INSECTE", "SPECTRE"],
        baseStats: { hp: 64, atk: 80, def: 52, spe: 86, spc: 66 },
        learnset: [{ level: 1, moveId: "leche" }, { level: 1, moveId: "morsure" }, { level: 1, moveId: "ombre_furtive" }, { level: 30, moveId: "ball_ombre" }],
        evolution: { toId: "necrolopendre", method: { kind: "LEVEL", level: 38 } },
        catchRate: 50, baseExp: 144, rarity: "RARE", growthRate: "medium_fast", role: "Insecte/Spectre — scarabée nécrotique",
        description: "Scarabée spectral à la carapace translucide.",
        sprite: "/yellow/sprites/dex/necarabee.png",
    },
    necrolopendre: {
        id: "necrolopendre", dexNo: 97, name: "Nécrolopendre", types: ["INSECTE", "SPECTRE"],
        baseStats: { hp: 70, atk: 105, def: 50, spe: 100, spc: 75 },
        learnset: [{ level: 1, moveId: "ball_ombre" }, { level: 1, moveId: "dard_mortel" }, { level: 1, moveId: "morsure" }, { level: 1, moveId: "ombre_furtive" }, { level: 40, moveId: "dard_nuee" }],
        catchRate: 45, baseExp: 200, rarity: "RARE", growthRate: "medium_fast", role: "Insecte/Spectre — scolopendre (assassin de verre)",
        description: "Scolopendre spectral interminable ; insaisissable, mais fragile s'il est touché.",
        sprite: "/yellow/sprites/dex/necrolopendre.png",
    },

    // ============================================================
    // FAMILLE FEU (arène 3) — 5 lignées, dexNo 98-108. Capture en zone
    // volcanique (à créer) ; pour l'instant data only (équipes d'arène à venir).
    // BST calibrés sur les Feu existants (Pyrokoss 446 / Loupyre 434 / Pyropanthe 451).
    // ============================================================

    // --- Ligne OISEAU (Vol/Feu) — sweeper rapide & fragile (×4 Roche, immunisé Sol) ---
    colibraise: {
        id: "colibraise", dexNo: 98, name: "Colibraise", types: ["VOL", "FEU"],
        baseStats: { hp: 38, atk: 45, def: 38, spe: 75, spc: 56 },
        learnset: [
            { level: 1, moveId: "charge" }, { level: 1, moveId: "picpic" },
            { level: 7, moveId: "flammeche" }, { level: 13, moveId: "vive_attaque" },
            { level: 17, moveId: "tornade" },
        ],
        evolution: { toId: "arardent", method: { kind: "LEVEL", level: 17 } },
        catchRate: 120, baseExp: 64, rarity: "COMMON", growthRate: "medium_fast", role: "Vol/Feu — colibri vif",
        description: "Colibri de braise qui bat des ailes si vite qu'elles s'enflamment.",
        sprite: "/yellow/sprites/dex/colibraise.png",
    },
    arardent: {
        id: "arardent", dexNo: 99, name: "Arardent", types: ["VOL", "FEU"],
        baseStats: { hp: 55, atk: 60, def: 52, spe: 95, spc: 76 },
        learnset: [
            { level: 1, moveId: "picpic" }, { level: 1, moveId: "flammeche" }, { level: 1, moveId: "tornade" },
            { level: 20, moveId: "flamme_ardente" }, { level: 28, moveId: "fonce_bec" },
        ],
        evolution: { toId: "toucanyon", method: { kind: "LEVEL", level: 36 } },
        catchRate: 60, baseExp: 141, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Vol/Feu — ara flamboyant",
        description: "Ara au plumage incandescent ; ses cris font crépiter l'air chaud.",
        sprite: "/yellow/sprites/dex/arardent.png",
    },
    toucanyon: {
        id: "toucanyon", dexNo: 100, name: "Toucanyon", types: ["VOL", "FEU"],
        baseStats: { hp: 78, atk: 80, def: 68, spe: 122, spc: 108 },
        learnset: [
            { level: 1, moveId: "flamme_ardente" }, { level: 1, moveId: "fonce_bec" }, { level: 1, moveId: "tornade" },
            { level: 38, moveId: "lance_flammes" }, { level: 44, moveId: "pique_fatal" },
        ],
        catchRate: 45, baseExp: 209, rarity: "RARE", growthRate: "medium_fast", role: "Vol/Feu — sweeper rapide",
        description: "Toucan-volcan dont le bec rougeoyant projette des flammes à distance.",
        sprite: "/yellow/sprites/dex/toucanyon.png",
    },

    // --- Ligne SERPENT (Psy/Feu) — l'ACE du boss, encaisse + spécial ---
    blaziper: {
        id: "blaziper", dexNo: 101, name: "Blaziper", types: ["PSY", "FEU"],
        baseStats: { hp: 46, atk: 46, def: 50, spe: 52, spc: 64 },
        learnset: [
            { level: 1, moveId: "charge" }, { level: 1, moveId: "flammeche" },
            { level: 8, moveId: "choc_mental" }, { level: 14, moveId: "flamme_ardente" },
            { level: 20, moveId: "onde_folie" },
        ],
        evolution: { toId: "flamaspic", method: { kind: "LEVEL", level: 18 } },
        catchRate: 90, baseExp: 66, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Psy/Feu — serpenteau",
        description: "Serpenteau aux écailles tièdes ; hypnotise ses proies d'un regard ardent.",
        sprite: "/yellow/sprites/dex/blaziper.png",
    },
    flamaspic: {
        id: "flamaspic", dexNo: 102, name: "Flamaspic", types: ["PSY", "FEU"],
        baseStats: { hp: 64, atk: 58, def: 66, spe: 68, spc: 92 },
        learnset: [
            { level: 1, moveId: "choc_mental" }, { level: 1, moveId: "flammeche" }, { level: 1, moveId: "flamme_ardente" },
            { level: 24, moveId: "onde_folie" }, { level: 30, moveId: "lance_flammes" },
        ],
        evolution: { toId: "vipember", method: { kind: "LEVEL", level: 38 } },
        catchRate: 60, baseExp: 145, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Psy/Feu — aspic de feu",
        description: "Aspic incandescent dont les anneaux fument quand il se concentre.",
        sprite: "/yellow/sprites/dex/flamaspic.png",
    },
    vipember: {
        id: "vipember", dexNo: 103, name: "Vipember", types: ["PSY", "FEU"],
        baseStats: { hp: 90, atk: 72, def: 88, spe: 92, spc: 120 },
        learnset: [
            { level: 1, moveId: "vague_mentale" }, { level: 1, moveId: "lance_flammes" },
            { level: 1, moveId: "flamme_ardente" }, { level: 1, moveId: "onde_folie" },
            { level: 42, moveId: "repos" },
        ],
        catchRate: 45, baseExp: 214, rarity: "RARE", growthRate: "medium_fast", role: "Psy/Feu — vipère psychique (ace)",
        description: "Vipère-braise millénaire ; son esprit brûlant plie la volonté des autres.",
        sprite: "/yellow/sprites/dex/vipember.png",
    },

    // --- Ligne TORTUE (Feu/Eau) — le mur (le twist : l'Eau ne la blesse pas) ---
    braisecaille: {
        id: "braisecaille", dexNo: 104, name: "Braisécaille", types: ["FEU", "EAU"],
        baseStats: { hp: 58, atk: 52, def: 76, spe: 38, spc: 58 },
        learnset: [
            { level: 1, moveId: "charge" }, { level: 1, moveId: "flammeche" },
            { level: 6, moveId: "pistolet_a_o" }, { level: 14, moveId: "flamme_ardente" },
            { level: 22, moveId: "mur_de_fer" },
        ],
        evolution: { toId: "calderont", method: { kind: "LEVEL", level: 32 } },
        catchRate: 110, baseExp: 66, rarity: "COMMON", growthRate: "medium_fast", role: "Feu/Eau — tortuelet",
        description: "Petite tortue dont la carapace abrite des braises sous une mare interne.",
        sprite: "/yellow/sprites/dex/braisecaille.png",
    },
    calderont: {
        id: "calderont", dexNo: 105, name: "Caldéront", types: ["FEU", "EAU"],
        baseStats: { hp: 100, atk: 80, def: 118, spe: 48, spc: 92 },
        learnset: [
            { level: 1, moveId: "pistolet_a_o" }, { level: 1, moveId: "flammeche" }, { level: 1, moveId: "mur_de_fer" },
            { level: 30, moveId: "lame_eau" }, { level: 36, moveId: "lance_flammes" },
        ],
        catchRate: 45, baseExp: 205, rarity: "RARE", growthRate: "medium_fast", role: "Feu/Eau — tortue-volcan (mur)",
        description: "Tortue dont la carapace est un volcan miniature crachant lave et vapeur.",
        sprite: "/yellow/sprites/dex/calderont.png",
    },

    // --- Ligne VACHE (Feu/Combat) — casseur physique ---
    brasicow: {
        id: "brasicow", dexNo: 106, name: "Brasicow", types: ["FEU", "COMBAT"],
        baseStats: { hp: 66, atk: 66, def: 54, spe: 46, spc: 44 },
        learnset: [
            { level: 1, moveId: "charge" }, { level: 1, moveId: "double_pied" },
            { level: 7, moveId: "flammeche" }, { level: 15, moveId: "coup_d_boule" },
            { level: 22, moveId: "poing_karate" },
        ],
        evolution: { toId: "tauricendre", method: { kind: "LEVEL", level: 30 } },
        catchRate: 110, baseExp: 66, rarity: "COMMON", growthRate: "medium_fast", role: "Feu/Combat — veau de braise",
        description: "Veau râblé qui rumine du charbon ardent ; charge tête baissée.",
        sprite: "/yellow/sprites/dex/brasicow.png",
    },
    tauricendre: {
        id: "tauricendre", dexNo: 107, name: "Tauricendre", types: ["FEU", "COMBAT"],
        baseStats: { hp: 100, atk: 120, def: 84, spe: 66, spc: 62 },
        learnset: [
            { level: 1, moveId: "double_pied" }, { level: 1, moveId: "poing_karate" }, { level: 1, moveId: "flammeche" },
            { level: 30, moveId: "flamme_ardente" }, { level: 36, moveId: "crochet_maitre" }, { level: 42, moveId: "belier" },
        ],
        catchRate: 45, baseExp: 205, rarity: "RARE", growthRate: "medium_fast", role: "Feu/Combat — taureau de cendre (casseur)",
        description: "Taureau colossal aux cornes en fusion ; sa charge fait trembler le sol.",
        sprite: "/yellow/sprites/dex/tauricendre.png",
    },

    // --- OURS (Feu) — polyvalent fiable, 1 stade ---
    pyrozly: {
        id: "pyrozly", dexNo: 108, name: "Pyrozly", types: ["FEU"],
        baseStats: { hp: 96, atk: 100, def: 86, spe: 72, spc: 90 },
        learnset: [
            { level: 1, moveId: "charge" }, { level: 1, moveId: "flammeche" },
            { level: 12, moveId: "flamme_ardente" }, { level: 24, moveId: "coup_d_boule" },
            { level: 36, moveId: "lance_flammes" }, { level: 44, moveId: "belier" },
        ],
        catchRate: 60, baseExp: 196, rarity: "RARE", growthRate: "medium_fast", role: "Feu — ours grizzly ardent",
        description: "Grizzly au pelage fumant ; hiberne dans les cratères encore tièdes.",
        sprite: "/yellow/sprites/dex/pyrozly.png",
    },

    // ============================================================
    // NOUVELLES LIGNÉES ÉLECTRIQUES (arène "Tour Hertz") — dexNo 109-117
    // ============================================================
    // 🐋 Baleines Eau/Élec — le MUR/pivot (riposte ×2 sur Roche/Sol, casse le hard-counter rochison).
    belunode: {
        id: "belunode", dexNo: 109, name: "Bélunode", types: ["EAU", "ELEC"],
        baseStats: { hp: 65, atk: 45, def: 55, spe: 35, spc: 55 },
        learnset: [
            { level: 1, moveId: "pistolet_a_o" }, { level: 1, moveId: "charge" },
            { level: 8, moveId: "etincelle" }, { level: 14, moveId: "lame_eau" },
        ],
        evolution: { toId: "sonarque", method: { kind: "LEVEL", level: 16 } },
        catchRate: 140, baseExp: 64, rarity: "COMMON", growthRate: "medium_fast", role: "Eau/Élec — bébé béluga",
        description: "Bébé béluga bardé de petits nodes électriques ; crépite quand on le caresse.",
        sprite: "/yellow/sprites/dex/belunode.png",
    },
    sonarque: {
        id: "sonarque", dexNo: 110, name: "Sonarque", types: ["EAU", "ELEC"],
        baseStats: { hp: 90, atk: 60, def: 75, spe: 45, spc: 75 },
        learnset: [
            { level: 1, moveId: "pistolet_a_o" }, { level: 1, moveId: "etincelle" },
            { level: 1, moveId: "lame_eau" }, { level: 22, moveId: "repos" },
            { level: 30, moveId: "fulgurance" },
        ],
        catchRate: 60, baseExp: 128, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Eau/Élec — cétacé sonar",
        evolution: { toId: "leviathonn", method: { kind: "LEVEL", level: 34 } },
        description: "Émet des clics sonar électrifiés pour étourdir ses proies dans les abysses.",
        sprite: "/yellow/sprites/dex/sonarque.png",
    },
    leviathonn: {
        id: "leviathonn", dexNo: 111, name: "Léviathonn", types: ["EAU", "ELEC"],
        baseStats: { hp: 120, atk: 75, def: 95, spe: 50, spc: 95 },
        learnset: [
            { level: 1, moveId: "lame_eau" }, { level: 1, moveId: "etincelle" },
            { level: 1, moveId: "repos" }, { level: 30, moveId: "fulgurance" },
            { level: 44, moveId: "hydrocanon" },
        ],
        catchRate: 30, baseExp: 196, rarity: "RARE", growthRate: "medium_fast", role: "Eau/Élec — colosse abyssal (mur)",
        description: "Colosse des fosses ; sa décharge fait trembler l'océan sur des kilomètres.",
        sprite: "/yellow/sprites/dex/leviathonn.png",
    },

    // 🧠 Jerbiwat — UNIQUE, croissance LENTE (faible tôt, monstre à N60 via Focalisation cumulable).
    jerbiwat: {
        id: "jerbiwat", dexNo: 112, name: "Jerbiwat", types: ["PSY", "ELEC"],
        baseStats: { hp: 70, atk: 55, def: 60, spe: 120, spc: 130 },
        learnset: [
            { level: 1, moveId: "charge" }, { level: 1, moveId: "choc_mental" },
            { level: 12, moveId: "etincelle" }, { level: 24, moveId: "focalisation" },
            { level: 36, moveId: "vague_mentale" }, { level: 48, moveId: "fulgurance" },
        ],
        catchRate: 30, baseExp: 200, rarity: "RARE", growthRate: "slow", role: "Psy/Élec — gerbille late-bloomer",
        description: "Petite gerbille électrostatique ; lente à mûrir, mais un canon psychique une fois adulte.",
        sprite: "/yellow/sprites/dex/jerbiwat.png",
    },

    // 👻 Chats Spectre/Élec — rapides, Mirage (esquive) + Ombre Furtive (priorité). Immunisés Normal+Combat.
    namicha: {
        id: "namicha", dexNo: 113, name: "Namicha", types: ["SPECTRE", "ELEC"],
        baseStats: { hp: 45, atk: 55, def: 42, spe: 70, spc: 55 },
        learnset: [
            { level: 1, moveId: "leche" }, { level: 1, moveId: "vive_attaque" },
            { level: 12, moveId: "mirage" }, { level: 20, moveId: "ombre_furtive" },
        ],
        catchRate: 120, baseExp: 66, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Spectre/Élec — chaton de l'ombre",
        evolution: { toId: "namizeus", method: { kind: "LEVEL", level: 30 } },
        description: "Chaton fait d'ombre et de statique ; se faufile entre deux éclairs.",
        sprite: "/yellow/sprites/dex/namicha.png",
    },
    namizeus: {
        id: "namizeus", dexNo: 114, name: "Namizeus", types: ["SPECTRE", "ELEC"],
        baseStats: { hp: 70, atk: 80, def: 60, spe: 110, spc: 95 },
        learnset: [
            { level: 1, moveId: "leche" }, { level: 1, moveId: "mirage" },
            { level: 1, moveId: "ombre_furtive" }, { level: 1, moveId: "vive_attaque" },
            { level: 34, moveId: "fulgurance" }, { level: 40, moveId: "ball_ombre" },
        ],
        catchRate: 45, baseExp: 188, rarity: "RARE", growthRate: "medium_fast", role: "Spectre/Élec — félin spectral",
        description: "Félin spectral foudroyant ; frappe depuis les ombres avant que le tonnerre ne gronde.",
        sprite: "/yellow/sprites/dex/namizeus.png",
    },

    // 🐆 Guépards Feu/Élec — glass cannon ULTRA-rapide, esquive (Mirage) + débuff (Hurlement). ×4 faible Sol.
    boltah: {
        id: "boltah", dexNo: 115, name: "Boltah", types: ["FEU", "ELEC"],
        baseStats: { hp: 45, atk: 55, def: 40, spe: 75, spc: 55 },
        learnset: [
            { level: 1, moveId: "flammeche" }, { level: 1, moveId: "etincelle" },
            { level: 10, moveId: "mirage" }, { level: 16, moveId: "hurlement" },
        ],
        catchRate: 140, baseExp: 66, rarity: "COMMON", growthRate: "medium_fast", role: "Feu/Élec — guépardeau",
        evolution: { toId: "heatah", method: { kind: "LEVEL", level: 16 } },
        description: "Guépardeau aux pattes crépitantes ; déjà plus rapide que son ombre.",
        sprite: "/yellow/sprites/dex/boltah.png",
    },
    heatah: {
        id: "heatah", dexNo: 116, name: "Heatah", types: ["FEU", "ELEC"],
        baseStats: { hp: 60, atk: 70, def: 50, spe: 100, spc: 70 },
        learnset: [
            { level: 1, moveId: "flammeche" }, { level: 1, moveId: "etincelle" },
            { level: 1, moveId: "mirage" }, { level: 1, moveId: "hurlement" },
            { level: 24, moveId: "flamme_ardente" },
        ],
        catchRate: 60, baseExp: 130, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Feu/Élec — guépard de course",
        evolution: { toId: "thundah", method: { kind: "LEVEL", level: 36 } },
        description: "Laisse une traînée de braises et d'étincelles dans son sillage.",
        sprite: "/yellow/sprites/dex/heatah.png",
    },
    thundah: {
        id: "thundah", dexNo: 117, name: "Thundah", types: ["FEU", "ELEC"],
        baseStats: { hp: 75, atk: 85, def: 60, spe: 130, spc: 95 },
        learnset: [
            { level: 1, moveId: "etincelle" }, { level: 1, moveId: "mirage" },
            { level: 1, moveId: "hurlement" }, { level: 1, moveId: "flamme_ardente" },
            { level: 40, moveId: "fulgurance" }, { level: 46, moveId: "lance_flammes" },
        ],
        catchRate: 45, baseExp: 196, rarity: "RARE", growthRate: "medium_fast", role: "Feu/Élec — guépard foudre (le + rapide)",
        description: "Le Daemon le plus rapide du Nexus ; un éclair de feu sur quatre pattes.",
        sprite: "/yellow/sprites/dex/thundah.png",
    },

    // === SPECTRES MAISON HANTÉE (dexNo 118-124, 2026-06-14) — NOMS/TYPES À VALIDER PAR SARTAY ===
    // Comblent les trous du roster spectre : mur physique, tank lent, wallbreaker lent à priorité,
    // glass cannon spécial. Brooks volontairement MONO-SPECTRE (1 faiblesse) plutôt que /SOL (4).
    bouh: {
        id: "bouh", dexNo: 118, name: "Bouh", types: ["SPECTRE"],
        baseStats: { hp: 78, atk: 48, def: 86, spe: 30, spc: 64 },
        learnset: [
            { level: 1, moveId: "leche" },
            { level: 1, moveId: "ombre_furtive" },
            { level: 7, moveId: "malediction" },
            { level: 13, moveId: "voile_effroi" },
            { level: 20, moveId: "griffe_spectrale" },
            { level: 28, moveId: "linceul" },
            { level: 30, moveId: "detonation" },
            { level: 34, moveId: "ball_ombre" },
        ],
        evolution: { toId: "bouhbou", method: { kind: "LEVEL", level: 30 } },
        catchRate: 120, baseExp: 62, rarity: "COMMON", growthRate: "medium_slow", role: "Spectre — mur physique / pose de statut",
        description: "Petit spectre boudeur qui se barricade dans l'ombre ; bien plus coriace qu'il n'en a l'air.",
        sprite: "/yellow/sprites/dex/bouh.png",
    },
    bouhbou: {
        id: "bouhbou", dexNo: 119, name: "Bouhbou", types: ["COMBAT", "SPECTRE"],
        baseStats: { hp: 95, atk: 118, def: 92, spe: 48, spc: 72 },
        learnset: [
            { level: 1, moveId: "leche" },
            { level: 1, moveId: "ombre_furtive" },
            { level: 1, moveId: "poing_karate" },
            { level: 20, moveId: "griffe_spectrale" },
            { level: 30, moveId: "ball_ombre" },
            { level: 36, moveId: "crochet_maitre" },
            { level: 42, moveId: "frappe_audela" },
        ],
        catchRate: 45, baseExp: 158, rarity: "RARE", growthRate: "medium_slow", role: "Combat/Spectre — wallbreaker lent à priorité",
        description: "Le spectre boudeur a appris à cogner : il frappe fort, encaisse, et passe devant grâce à ses coups furtifs.",
        sprite: "/yellow/sprites/dex/bouhbou.png",
    },
    brook: {
        id: "brook", dexNo: 120, name: "Brook", types: ["SPECTRE"],
        baseStats: { hp: 74, atk: 50, def: 78, spe: 36, spc: 54 },
        learnset: [
            { level: 1, moveId: "leche" },
            { level: 1, moveId: "charge" },
            { level: 8, moveId: "voile_effroi" },
            { level: 15, moveId: "malediction" },
            { level: 23, moveId: "drain_ame" },
            { level: 31, moveId: "linceul" },
            { level: 38, moveId: "ball_ombre" },
        ],
        evolution: { toId: "brookhante", method: { kind: "LEVEL", level: 32 } },
        catchRate: 110, baseExp: 60, rarity: "UNCOMMON", growthRate: "medium_slow", role: "Spectre — tank défensif (pré-évo)",
        description: "Gardien squelettique des tombes ; encaisse en silence et affaiblit ceux qui s'approchent trop.",
        sprite: "/yellow/sprites/dex/brook.png",
    },
    brookhante: {
        id: "brookhante", dexNo: 121, name: "Brookhanté", types: ["SPECTRE"],
        baseStats: { hp: 112, atk: 66, def: 116, spe: 40, spc: 78 },
        learnset: [
            { level: 1, moveId: "leche" },
            { level: 1, moveId: "ombre_furtive" },
            { level: 1, moveId: "voile_effroi" },
            { level: 23, moveId: "drain_ame" },
            { level: 33, moveId: "malediction" },
            { level: 36, moveId: "bombe_beurk" }, // couverture POISON → seul moyen de toucher les NORMAL (immunisés au Spectre)
            { level: 40, moveId: "ball_ombre" },
            { level: 46, moveId: "frappe_audela" },
        ],
        catchRate: 45, baseExp: 150, rarity: "RARE", growthRate: "medium_slow", role: "Spectre — mur physique (le vrai tank du roster spectre)",
        description: "Colosse d'outre-tombe : sa carcasse encaisse l'inencaissable et draine la vie de ses assaillants.",
        sprite: "/yellow/sprites/dex/brookhante.png",
    },
    hibouh: {
        id: "hibouh", dexNo: 122, name: "Hibouh", types: ["SPECTRE"],
        baseStats: { hp: 48, atk: 38, def: 46, spe: 62, spc: 66 },
        learnset: [
            { level: 1, moveId: "leche" },
            { level: 1, moveId: "picpic" },
            { level: 9, moveId: "choc_mental" },
            { level: 16, moveId: "griffe_spectrale" },
        ],
        evolution: { toId: "chouhante", method: { kind: "LEVEL", level: 22 } },
        catchRate: 120, baseExp: 58, rarity: "COMMON", growthRate: "medium_slow", role: "Spectre — hibou frêle (pré-évo)",
        description: "Hibou spectral aux yeux luminescents ; il hulule dans le noir avant de fondre sur sa proie.",
        sprite: "/yellow/sprites/dex/hibouh.png",
    },
    chouhante: {
        id: "chouhante", dexNo: 123, name: "Chouhanté", types: ["PSY", "SPECTRE"],
        baseStats: { hp: 62, atk: 48, def: 52, spe: 84, spc: 90 },
        learnset: [
            { level: 1, moveId: "leche" },
            { level: 1, moveId: "picpic" },
            { level: 1, moveId: "choc_mental" },
            { level: 25, moveId: "ball_ombre" },
            { level: 30, moveId: "onde_folie" },
            { level: 36, moveId: "vague_mentale" },
        ],
        evolution: { toId: "archibouh", method: { kind: "LEVEL", level: 40 } },
        catchRate: 60, baseExp: 120, rarity: "UNCOMMON", growthRate: "medium_slow", role: "Psy/Spectre — pivot spécial",
        description: "Son regard sonde les esprits ; entre deux mondes, il devient psychique autant que spectral.",
        sprite: "/yellow/sprites/dex/chouhante.png",
    },
    archibouh: {
        id: "archibouh", dexNo: 124, name: "Archibouh", types: ["PSY", "SPECTRE"],
        baseStats: { hp: 66, atk: 95, def: 52, spe: 108, spc: 118 }, // BST 439 — glass cannon MIXTE frêle (Psy spé + Spectre phys) : seule l'Atq monte (52→95)
        learnset: [
            { level: 1, moveId: "choc_mental" },
            { level: 1, moveId: "ball_ombre" },
            { level: 1, moveId: "ombre_furtive" },
            { level: 1, moveId: "onde_folie" },
            { level: 36, moveId: "hypnose" },
            { level: 40, moveId: "vague_mentale" },
            { level: 42, moveId: "drain_ame" },
            { level: 44, moveId: "focalisation" },
            { level: 46, moveId: "repos" },
            { level: 48, moveId: "frappe_audela" },
        ],
        catchRate: 30, baseExp: 150, rarity: "RARE", growthRate: "medium_slow", role: "Psy/Spectre — glass cannon mixte FRÊLE, disrupteur (sommeil/confusion/drain/Repos)",
        description: "Grand-duc d'outre-tombe : son cri psychique foudroie l'esprit avant que l'ombre n'achève la proie.",
        sprite: "/yellow/sprites/dex/archibouh.png",
    },

    // === LÉGENDAIRE des hautes herbes du nord de Cendreville (dexNo 125, 2026-06-14) ===
    // Apex DRAGON pur, BST le + haut du jeu. Plus fréquent en herbe BASSE (1/100 → 1/1000 en profondeur),
    // capture = Hyper Nexus Ball (ballBonus≥5) ET statut majeur requis (cf. WildEntry captureRequiresStatus).
    goshendofy: {
        id: "goshendofy", dexNo: 125, name: "Goshendofy", types: ["DRAGON"],
        baseStats: { hp: 130, atk: 130, def: 105, spe: 90, spc: 135 }, // BST 590 — colosse tanky, vitesse moyenne (pas le + rapide)
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 1, moveId: "draco_souffle" },
            { level: 22, moveId: "danse_lames" },
            { level: 33, moveId: "belier" },
            { level: 44, moveId: "seisme" },
            { level: 55, moveId: "draco_charge" },
        ],
        catchRate: 3, baseExp: 220, rarity: "LEGENDARY", growthRate: "slow", exclusive: true, role: "Légendaire DRAGON — apex des hautes herbes (capture gatée Ball+statut)",
        description: "Dragon primordial qui sommeille, camouflé, dans l'herbe la plus humble — là où nul ne songe à le chercher.",
        sprite: "/yellow/sprites/dex/goshendofy.png",
        hiddenUntilCaught: true, // SURPRISE : absent du Pokédex tant qu'on ne l'a pas capturé
    },
    // 🪨⚡ GÉKROC — mini-boss STATIQUE de la Centrale (gardien de la Pierre d'Évolution). Stats moyennes
    // mais COUTEAU-SUISSE : apprend TOUTES les CT (learnsAllCts). Capture dure (catchRate 10) mais ≠ légendaire.
    gekroc: {
        id: "gekroc", dexNo: 126, name: "Gékroc", types: ["SOL", "ELEC"],
        baseStats: { hp: 90, atk: 92, def: 100, spe: 48, spc: 80 }, // BST 410 — tank physique lent (immunisé ÉLEC via SOL)
        learnset: [
            { level: 1, moveId: "vive_attaque" },
            { level: 1, moveId: "etincelle" },
            { level: 1, moveId: "tunnel" },
            { level: 1, moveId: "repos" },
        ],
        catchRate: 10, baseExp: 180, rarity: "RARE", growthRate: "medium_fast", exclusive: true,
        role: "Mini-boss SOL/ÉLEC — gardien de la Pierre, apprend TOUTES les CT",
        description: "Golem-taupe fossile incrusté d'une pierre d'évolution crépitante. Creuse des tunnels fulgurants et s'adapte à tout.",
        sprite: "/yellow/sprites/dex/gekroc.png",
        learnsAllCts: true,
        hiddenUntilCaught: true, // SURPRISE : absent du Pokédex tant qu'on ne l'a pas capturé
    },

    // ===== LIGNÉE CARLIN-DRAGON (Feu/Dragon) — profil "Ptéra" : sprinter fragile (Vit++/Atk++, Déf molle) =====
    carlinou: {
        id: "carlinou", dexNo: 127, name: "Carlinou", types: ["FEU", "DRAGON"],
        baseStats: { hp: 45, atk: 55, def: 45, spe: 60, spc: 50 }, // BST 255
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 6, moveId: "flamme_ardente" },
            { level: 14, moveId: "draco_souffle" },
            { level: 22, moveId: "vive_attaque" },
        ],
        evolution: { toId: "carlembre", method: { kind: "LEVEL", level: 18 } },
        catchRate: 45, baseExp: 62, rarity: "RARE", growthRate: "medium_fast", role: "Feu/Dragon — chiot endormi",
        description: "Bébé carlin-dragon qui ronfle des volutes de fumée. Une flammèche couve déjà au bout de sa queue.",
        sprite: "/yellow/sprites/dex/carlinou.png",
    },
    carlembre: {
        id: "carlembre", dexNo: 128, name: "Carlembre", types: ["FEU", "DRAGON"],
        baseStats: { hp: 65, atk: 80, def: 62, spe: 90, spc: 72 }, // BST 369
        learnset: [
            { level: 1, moveId: "flamme_ardente" },
            { level: 1, moveId: "draco_souffle" },
            { level: 1, moveId: "vive_attaque" },
            { level: 30, moveId: "lance_flammes" },
        ],
        evolution: { toId: "dracarlin", method: { kind: "LEVEL", level: 36 } },
        catchRate: 45, baseExp: 145, rarity: "RARE", growthRate: "medium_fast", role: "Feu/Dragon — fougueux ailé",
        description: "Joufflu mais vif : ses petites ailes le portent déjà, et sa queue de feu ne s'éteint plus.",
        sprite: "/yellow/sprites/dex/carlembre.png",
    },
    dracarlin: {
        id: "dracarlin", dexNo: 129, name: "Dracarlin", types: ["FEU", "DRAGON"],
        baseStats: { hp: 80, atk: 115, def: 72, spe: 128, spc: 85 }, // BST 480 — sprinter offensif fragile (façon Ptéra)
        learnset: [
            { level: 1, moveId: "draco_charge" },
            { level: 1, moveId: "lance_flammes" },
            { level: 1, moveId: "vive_attaque" },
            { level: 40, moveId: "pique_fatal" },
            { level: 46, moveId: "danse_lames" },
        ],
        catchRate: 30, baseExp: 250, rarity: "RARE", growthRate: "medium_fast", role: "Feu/Dragon — foudre de guerre ailée",
        description: "Carlin-dragon altier au regard d'acier. Fond du ciel en piqué embrasé avant qu'on ait pu cligner des yeux.",
        sprite: "/yellow/sprites/dex/dracarlin.png",
    },

    // ===== LIGNÉE T-REX DE GLACE (Dragon/Glace) — le stade 2 calé sur Léviator Gen 1 =====
    // Typage malin : Dragon/Glace ANNULE la faiblesse Glace du dragon. Faible Combat/Roche/Dragon.
    glacirex: {
        id: "glacirex", dexNo: 130, name: "Glacirex", types: ["DRAGON", "GLACE"],
        baseStats: { hp: 60, atk: 78, def: 55, spe: 52, spc: 60 }, // BST 305
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 7, moveId: "coup_d_givre" },
            { level: 16, moveId: "draco_souffle" },
            { level: 26, moveId: "morsure" },
        ],
        evolution: { toId: "cryotyran", method: { kind: "LEVEL", level: 35 } },
        catchRate: 45, baseExp: 70, rarity: "RARE", growthRate: "medium_fast", role: "Dragon/Glace — saurien juvénile",
        description: "Jeune tyrannosaure des glaces. Sa gueule givrante mord plus fort qu'elle n'en a l'air.",
        sprite: "/yellow/sprites/dex/glacirex.png",
    },
    cryotyran: {
        id: "cryotyran", dexNo: 131, name: "Cryotyran", types: ["DRAGON", "GLACE"],
        baseStats: { hp: 95, atk: 125, def: 79, spe: 81, spc: 100 }, // BST 480 — calqué sur Léviator Gen 1
        learnset: [
            { level: 1, moveId: "draco_souffle" },
            { level: 1, moveId: "coup_d_givre" },
            { level: 1, moveId: "morsure" },
            { level: 38, moveId: "souffle_polaire" },
            { level: 44, moveId: "draco_charge" },
        ],
        catchRate: 30, baseExp: 250, rarity: "RARE", growthRate: "medium_fast", role: "Dragon/Glace — colosse glaciaire",
        description: "Tyran des banquises hérissé de cristaux. Un rugissement de Cryotyran gèle l'air et fait trembler la roche.",
        sprite: "/yellow/sprites/dex/cryotyran.png",
    },
    orcaline: {
        id: "orcaline", dexNo: 132, name: "Orcaline", types: ["GLACE", "EAU"],
        // BST 465 — contre "par type" de Goshendofy : VIT 100 (outspeed son 90), SPÉ 130 (2HKO),
        // PV 95/DÉF 90 (encaisse 1 Séisme neutre), ATK dumpée (tout passe en spécial Gen 1).
        baseStats: { hp: 95, atk: 50, def: 90, spe: 100, spc: 130 },
        learnset: [
            { level: 1, moveId: "vive_attaque" },
            { level: 1, moveId: "coup_d_givre" },
            { level: 12, moveId: "lame_eau" },
            { level: 24, moveId: "deferlante" },
            { level: 40, moveId: "souffle_polaire" }, // arme principale anti-Goshendofy (Glace, peut geler)
            { level: 51, moveId: "plaquage" },
            { level: 58, moveId: "hydrocanon" },
            { level: 75, moveId: "repos" },
            { level: 81, moveId: "ultralaser" },
        ],
        catchRate: 30, baseExp: 210, rarity: "RARE", growthRate: "slow", exclusive: true, role: "Glace/Eau — orque polaire (contre des dragons)",
        description: "Petite orque des banquises au souffle glacé. Vive et maligne, elle plonge sous la glace puis jaillit pour figer les dragons d'un Souffle Polaire.",
        sprite: "/yellow/sprites/dex/orcaline.png",
    },
    sylvebarbe: {
        id: "sylvebarbe", dexNo: 133, name: "Sylvebarbe", types: ["SOL", "PLANTE"],
        // BST 490 — COLOSSE-TANK très lent : mur PV/DÉF, SPÉ élevée (tanke l'Eau spéciale + propulse Tempête
        // Verte) ; ATK pour Faille Sismique (Sol phys). VIT 30 volontairement basse. Contre de Léviathonn
        // (immunisé Élec via Sol, neutre Eau via Plante, frappe ×2 Sol ET Plante).
        baseStats: { hp: 130, atk: 95, def: 130, spe: 30, spc: 105 },
        learnset: [
            { level: 1, moveId: "spores_dodo" },
            { level: 1, moveId: "repos" },
            { level: 1, moveId: "faille_sismique" },
            { level: 30, moveId: "vampigraine" },
            { level: 40, moveId: "tempete_verte" },
            { level: 50, moveId: "plaquage" },
            { level: 60, moveId: "focalisation" }, // booste le Spécial (+1)
            { level: 70, moveId: "mirage" },
            { level: 80, moveId: "ultralaser" },
            { level: 90, moveId: "lance_soleil" }, // LA plus forte attaque Plante (120, en 2 temps)
        ],
        catchRate: 25, baseExp: 220, rarity: "RARE", growthRate: "medium_fast", exclusive: true, role: "Sol/Plante — colosse-sylve (mur anti-Eau/Élec)",
        description: "Arbre-titan millénaire à l'écorce de roche. Immensément lent mais quasi inamovible : ses racines fendent le sol et ses ramures balaient l'ennemi.",
        sprite: "/yellow/sprites/dex/sylvebarbe.png",
    },
    tonytony: {
        id: "tonytony", dexNo: 134, name: "Tonytony", types: ["NORMAL"],
        // Stats calquées sur Leveinard/Chansey Gen 1 (modèle 1 stat Spéciale = 105). PV ÉNORMES + SPÉ solide
        // = mur spécial absolu ; mais ATQ/DÉF dérisoires → s'effondre face au PHYSIQUE (surtout COMBAT ×2).
        baseStats: { hp: 250, atk: 5, def: 5, spe: 50, spc: 105 },
        learnset: [
            { level: 1, moveId: "charge" },        // Écras'Face (flavor — ATQ 5)
            { level: 1, moveId: "hurlement" },      // Rugissement : -ATQ (mate les physiques)
            { level: 12, moveId: "cage_eclair" },   // Thunder Wave : paralysie
            { level: 18, moveId: "repos" },         // Soft-Boiled : soin 50%
            { level: 24, moveId: "berceuse" },      // Sing : sommeil (signature)
            { level: 30, moveId: "souffle_polaire" }, // Ice Beam : moitié BoltBeam (+gel)
            { level: 38, moveId: "mirage" },        // Minimize : +esquive
            { level: 44, moveId: "mur_de_fer" },    // Defense Curl : +Défense
            { level: 48, moveId: "focalisation" },  // (Light Screen→) +Spécial : renforce le mur spé
            { level: 54, moveId: "fulgurance" },    // Thunderbolt : moitié BoltBeam
        ],
        catchRate: 30, baseExp: 220, rarity: "RARE", growthRate: "medium_fast", exclusive: true, role: "Normal — œuf-soigneur (mur spécial ; s'effondre au physique)",
        description: "Petit Daemon-œuf au cœur immense. Encaisse les pires assauts spéciaux sans broncher grâce à ses PV colossaux, mais le moindre coup physique le fait vaciller. Soigne et endort plus qu'il ne frappe.",
        sprite: "/yellow/sprites/dex/tonytony.png",
    },
}

export function getSpecies(id: string): SpeciesData | null {
    return SPECIES[id] ?? null
}

export const SPECIES_IDS = Object.keys(SPECIES)
export const DEX_COUNT = SPECIES_IDS.length

export function speciesByDexNo(dexNo: number): SpeciesData | null {
    return Object.values(SPECIES).find((s) => s.dexNo === dexNo) ?? null
}
