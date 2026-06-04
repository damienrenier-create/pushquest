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
            { level: 22, moveId: "tempete_verte" },
        ],
        evolution: { toId: "broutame", method: { kind: "LEVEL", level: 16 } },
        catchRate: 45, baseExp: 64, rarity: "RARE", growthRate: "medium_fast", role: "Starter Plante — endurant",
        description: "Pousse-lapin espiègle. Plus son dresseur transpire, plus elle verdit.",
        sprite: "/yellow/sprites/dex/feuillichot.png",
    },
    broutame: {
        id: "broutame", dexNo: 2, name: "Broutame", types: ["PLANTE"],
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
        id: "sylvapuce", dexNo: 3, name: "Sylvapuce", types: ["PLANTE"],
        baseStats: { hp: 85, atk: 78, def: 90, spe: 70, spc: 112 },
        learnset: [
            { level: 1, moveId: "tempete_verte" },
            { level: 1, moveId: "vampigraine" },
            { level: 1, moveId: "mega_sangsue" },
            { level: 40, moveId: "belier" },
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
            { level: 20, moveId: "belier" },
            { level: 30, moveId: "lance_flammes" },
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
            { level: 44, moveId: "seisme" },
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
            { level: 40, moveId: "coup_d_boule" },
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
            { level: 26, moveId: "mur_de_fer" },
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
            { level: 30, moveId: "seisme" },
            { level: 36, moveId: "mur_de_fer" },
        ],
        evolution: { toId: "rochison", method: { kind: "LEVEL", level: 36 } },
        catchRate: 60, baseExp: 142, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Roche — tank",
        description: "Bélier rocheux ; charge en faisant trembler le sol.",
        sprite: "/yellow/sprites/dex/roctaur.png",
    },
    rochison: {
        id: "rochison", dexNo: 15, name: "Rochison", types: ["ROCHE", "SOL"],
        baseStats: { hp: 80, atk: 115, def: 138, spe: 40, spc: 52 },
        learnset: [
            { level: 1, moveId: "seisme" },
            { level: 1, moveId: "jet_pierres" },
            { level: 1, moveId: "mur_de_fer" },
            { level: 44, moveId: "belier" },
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
        baseStats: { hp: 80, atk: 118, def: 68, spe: 108, spc: 68 },
        learnset: [
            { level: 1, moveId: "poing_karate" },
            { level: 1, moveId: "belier" },
            { level: 1, moveId: "double_pied" },
            { level: 44, moveId: "seisme" },
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
            { level: 42, moveId: "coup_d_boule" },
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
            { level: 44, moveId: "repos" },
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
            { level: 16, moveId: "dard_venin" },
            { level: 26, moveId: "mur_de_fer" },
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
            { level: 1, moveId: "dard_venin" },
            { level: 30, moveId: "belier" },
            { level: 36, moveId: "mur_de_fer" },
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
            { level: 1, moveId: "dard_nuee" },
            { level: 1, moveId: "choc_mental" },
            { level: 1, moveId: "belier" },
            { level: 40, moveId: "onde_folie" },
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
            { level: 44, moveId: "belier" },
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
            { level: 44, moveId: "leche" },
        ],
        catchRate: 30, baseExp: 220, rarity: "RARE", growthRate: "medium_fast", role: "Psy — special divin",
        description: "Divinité-spaghetti ailée, auréolée et couronnée. On la touche de sa nouille.",
        sprite: "/yellow/sprites/dex/divinpate.png",
    },

    // --- 🐦 Héron (Vol/Eau) ---
    piouflot: {
        id: "piouflot", dexNo: 34, name: "Piouflot", types: ["VOL", "EAU"],
        baseStats: { hp: 40, atk: 42, def: 40, spe: 58, spc: 46 },
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
        baseStats: { hp: 58, atk: 56, def: 52, spe: 78, spc: 66 },
        learnset: [
            { level: 1, moveId: "pistolet_a_o" },
            { level: 1, moveId: "picpic" },
            { level: 26, moveId: "tornade" },
            { level: 34, moveId: "coup_d_givre" },
        ],
        evolution: { toId: "oragron", method: { kind: "LEVEL", level: 35 } },
        catchRate: 60, baseExp: 142, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Vol/Eau — gracile",
        description: "Héron élégant ruisselant d'eau de pluie.",
        sprite: "/yellow/sprites/dex/herondee.png",
    },
    oragron: {
        id: "oragron", dexNo: 36, name: "Oragron", types: ["VOL", "EAU"],
        baseStats: { hp: 78, atk: 78, def: 70, spe: 104, spc: 88 },
        learnset: [
            { level: 1, moveId: "tornade" },
            { level: 1, moveId: "hydrocanon" },
            { level: 1, moveId: "picpic" },
            { level: 42, moveId: "belier" },
        ],
        catchRate: 45, baseExp: 210, rarity: "RARE", growthRate: "medium_fast", role: "Vol/Eau — sweeper",
        description: "Héron de tempête aux ailes de nuages, zébré d'éclairs.",
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
            { level: 28, moveId: "belier" },
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
            { level: 44, moveId: "seisme" },
        ],
        catchRate: 45, baseExp: 220, rarity: "RARE", growthRate: "medium_fast", role: "Combat/Plante — tank offensif",
        description: "Ours-druide titanesque au cœur de sève luminescent.",
        sprite: "/yellow/sprites/dex/druidours.png",
    },

    // --- Famille PLANTE (starter, 2 stades) ---
    pousstout: {
        id: "pousstout", dexNo: 51, name: "Pousstout", types: ["PLANTE", "POISON"],
        baseStats: { hp: 45, atk: 49, def: 49, spe: 45, spc: 65 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 4, moveId: "fouet_lianes" },
            { level: 10, moveId: "vampigraine" },
            { level: 13, moveId: "dard_venin" },
            { level: 18, moveId: "mega_sangsue" },
        ],
        evolution: { toId: "flordaemon", method: { kind: "LEVEL", level: 16 } },
        catchRate: 45, baseExp: 64, rarity: "RARE",
        description: "Une graine vivante qui puise sa force dans les reps de son dresseur.",
        sprite: "/yellow/sprites/dex/pousstout.png",
    },
    flordaemon: {
        id: "flordaemon", dexNo: 52, name: "Flordaemon", types: ["PLANTE", "PSY"],
        baseStats: { hp: 60, atk: 62, def: 63, spe: 60, spc: 90 },
        learnset: [
            { level: 1, moveId: "fouet_lianes" },
            { level: 1, moveId: "vampigraine" },
            { level: 20, moveId: "mega_sangsue" },
            { level: 24, moveId: "onde_folie" },
            { level: 30, moveId: "tempete_verte" },
        ],
        catchRate: 30, baseExp: 142, rarity: "RARE",
        description: "Forme éveillée de Pousstout. Sa fleur émet une lumière apaisante.",
        sprite: "/yellow/sprites/dex/flordaemon.png",
    },

    // --- Sauvages de Route Nord ---
    rongeur: {
        id: "rongeur", dexNo: 53, name: "Rongeur", types: ["NORMAL"],
        baseStats: { hp: 40, atk: 45, def: 40, spe: 60, spc: 30 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 5, moveId: "vive_attaque" },
            { level: 12, moveId: "coup_d_boule" },
        ],
        catchRate: 200, baseExp: 30, rarity: "COMMON",
        description: "Petit rongeur véloce des hautes herbes. Premier adversaire classique.",
        sprite: "/yellow/sprites/dex/rongeur.png",
    },
    piafeu: {
        id: "piafeu", dexNo: 54, name: "Piafeu", types: ["FEU", "VOL"],
        baseStats: { hp: 40, atk: 56, def: 40, spe: 70, spc: 60 },
        learnset: [
            { level: 1, moveId: "picpic" },
            { level: 7, moveId: "flammeche" },
            { level: 14, moveId: "tornade" },
        ],
        catchRate: 120, baseExp: 50, rarity: "UNCOMMON",
        description: "Oiseau au plumage incandescent. Rare au lever du jour sur Route Nord.",
        sprite: "/yellow/sprites/dex/piafeu.png",
    },
    galet: {
        id: "galet", dexNo: 55, name: "Galet", types: ["ROCHE", "SOL"],
        baseStats: { hp: 50, atk: 60, def: 95, spe: 25, spc: 30 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 8, moveId: "jet_pierres" },
            { level: 14, moveId: "mur_de_fer" },
        ],
        catchRate: 150, baseExp: 45, rarity: "COMMON",
        description: "Un caillou animé, dur comme la pierre. Lent mais résistant.",
        sprite: "/yellow/sprites/dex/galet.png",
    },
    bulle: {
        id: "bulle", dexNo: 56, name: "Bulle", types: ["EAU"],
        baseStats: { hp: 48, atk: 48, def: 50, spe: 55, spc: 60 },
        learnset: [
            { level: 1, moveId: "pistolet_a_o" },
            { level: 6, moveId: "vive_attaque" },
            { level: 16, moveId: "coup_d_givre" },
        ],
        catchRate: 160, baseExp: 42, rarity: "COMMON",
        description: "Petite créature aquatique espiègle qui adore les flaques de Route Nord.",
        sprite: "/yellow/sprites/dex/bulle.png",
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
