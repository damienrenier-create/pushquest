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
            { level: 10, moveId: "focalisation" },
            { level: 15, moveId: "visee" },
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
            // Parité starters (learnset only) : comblement du trou offensif niv1→66 via la ligne
            // glacée (Coup d'Givre 65 → Souffle Polaire 90 → Blizzard 110). Pas de modif de stats.
            { level: 54, moveId: "souffle_polaire" }, // couverture GLACE (exploite spc 86)
            { level: 66, moveId: "blizzard" },        // capstone 65+ : gros STAB GLACE
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
            { level: 6, moveId: "flammeche" },
            { level: 12, moveId: "vive_attaque" },
            { level: 15, moveId: "tison" },
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
            { level: 14, moveId: "jet_de_sable" },
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
            { level: 26, moveId: "elan" },
            { level: 34, moveId: "plaquage" },
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
        // STADE 4 (post-game) : évolue en AQUILORD par ÉCHANGE (joueur↔joueur, ou brocanteur de Cendreville).
        evolution: { toId: "aquilord", method: { kind: "TRADE" } },
    },
    aquilord: {
        id: "aquilord", dexNo: 154, name: "Aquilord", types: ["VOL", "NORMAL"], // aigle → VOL primaire (fait aussi d'Aquilwatt un Vol/Élec)
        // BST 480 (Aquilothan 402 + 78), taillé SPÉCIAL (grosse Spé + Vitesse) pour sublimer ses couvertures
        // Glace/Feu spéciales. Stade 4 de la lignée Plumiot (Plumiot→Faukon→Aquilothan→Aquilord).
        baseStats: { hp: 85, atk: 84, def: 78, spe: 115, spc: 118 },
        // SUPERSET du learnset d'Aquilothan (mêmes moves aux mêmes niveaux) + 4 AJOUTS exclusifs Aquilord :
        // souffle_polaire (Glace), lance_flammes (Feu), reprise_ailes (soin), ultralaser (capstone). L'évo-échange
        // conserve les moves choisis ; Aquilord apprend les nouveaux en montant de niveau.
        learnset: [
            { level: 1, moveId: "tornade" },
            { level: 1, moveId: "picpic" },
            { level: 1, moveId: "belier" },
            { level: 30, moveId: "elan" },
            { level: 36, moveId: "fonce_bec" },
            { level: 40, moveId: "coup_d_boule" },
            { level: 46, moveId: "meteores" },        // STAB Vol qui ne rate jamais (hérité)
            { level: 52, moveId: "plaquage" },
            { level: 58, moveId: "souffle_polaire" }, // + couverture GLACE (spéciale)
            { level: 62, moveId: "lance_flammes" },   // + couverture FEU (spéciale)
            { level: 66, moveId: "vol" },
            { level: 72, moveId: "reprise_ailes" },   // + SOIN (50% PV, sans sommeil)
            { level: 80, moveId: "ultralaser" },      // + capstone Normal dévastateur
        ],
        catchRate: 45, baseExp: 235, rarity: "RARE", growthRate: "medium_fast", role: "Normal/Vol — sweeper spécial polyvalent",
        description: "Seigneur souverain des tempêtes. Son cri fend les nuages ; glace et flammes obéissent à ses ailes.",
        sprite: "/yellow/sprites/dex/aquilord.png",
    },
    mimimoy: {
        id: "mimimoy", dexNo: 155, name: "Mimimoy", types: ["NORMAL"],
        // BST 300 « ultra nul » (l'échange du brocanteur de Cendreville l'exige) : rapide mais fragile et faiblard.
        // Compensé par un learnset qui apprend TRÈS TARD (niv 80) les plus grosses attaques Normal du jeu.
        baseStats: { hp: 65, atk: 45, def: 45, spe: 100, spc: 45 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 1, moveId: "hurlement" },
            { level: 8, moveId: "vive_attaque" },
            { level: 16, moveId: "elan" },
            { level: 24, moveId: "coup_d_boule" },
            { level: 34, moveId: "belier" },
            { level: 46, moveId: "plaquage" },
            { level: 58, moveId: "repos" },            // petit soin pour survivre (SANS ailes : reprise_ailes = signature Aquilord uniquement)
            { level: 70, moveId: "meteores" },         // gros STAB tardif qui ne rate jamais
            { level: 80, moveId: "ultralaser" },       // l'apothéose : le rayon ultime, pour compenser son BST nul
        ],
        catchRate: 150, baseExp: 90, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Normal — collector rôdeur (ultra faible)",
        description: "Créature timide et falote au regard perpétuellement inquiet. Insignifiante… mais introuvable, ce qui fait tout son prix.",
        sprite: "/yellow/sprites/dex/mimimoy.png",
        hiddenUntilCaught: true, // ne s'affiche au Pokédex qu'une fois capturé (effet surprise du roaming)
    },

    // --- Ligne ROCHE/SOL ---
    cailloutchi: {
        id: "cailloutchi", dexNo: 13, name: "Cailloutchi", types: ["ROCHE", "SOL"],
        baseStats: { hp: 40, atk: 75, def: 102, spe: 20, spc: 30 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 8, moveId: "jet_pierres" },
            { level: 16, moveId: "jet_de_sable" },
            { level: 23, moveId: "secousse" },
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
            { level: 27, moveId: "elan" },
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
            { level: 14, moveId: "focalisation" },
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
            { level: 13, moveId: "cage_eclair" },
            { level: 18, moveId: "vive_attaque" },
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
            { level: 11, moveId: "mur_de_fer" },
            { level: 20, moveId: "vive_attaque" },
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
            { level: 66, moveId: "blizzard" },        // capstone 65+ : gros STAB GLACE (spc 100)
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
            { level: 16, moveId: "flammeche" },
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
    // STADE 4 (base 4) — évolution SPÉCIALE de Magmator via l'offre du Prof CHEN au labo (run 3).
    // Perd la Roche au profit du MÉTAL : forteresse Feu/Métal à la Défense colossale, introduite avec le type.
    // hiddenUntilCaught : SURPRISE — absent du Pokédex tant qu'on n'en a pas obtenu un (comme Gékroc /
    // Goshendofy). Cf. evolveMagmatorWithChen().
    magnetor: {
        id: "magnetor", dexNo: 144, name: "Magnetor", types: ["FEU", "METAL"],
        // BST 480 (Sartay : on tape dans la Spéciale — c'est un TANK PHYSIQUE Métal, pas un attaquant spécial).
        baseStats: { hp: 95, atk: 122, def: 142, spe: 50, spc: 71 },
        learnset: [
            { level: 1, moveId: "griffe_acier" },     // STAB Métal de départ (40)
            { level: 1, moveId: "lance_flammes" },    // STAB Feu (spécial, couverture)
            { level: 1, moveId: "seisme" },           // couverture Sol
            { level: 1, moveId: "mur_de_fer" },       // set-up Déf
            { level: 50, moveId: "tete_de_fer" },     // STAB Métal (80) — dispo dès l'évolution (niv 50)
            { level: 58, moveId: "carapace_diamant" },// set-up Déf ++
            { level: 66, moveId: "lame_roche" },      // couverture Roche
            { level: 73, moveId: "poing_meteore" },   // STAB Métal capstone (90)
        ],
        catchRate: 45, baseExp: 280, rarity: "RARE", growthRate: "medium_fast", role: "Feu/Métal — forteresse en fusion", hiddenUntilCaught: true,
        description: "Magmator dont la roche a mué en un alliage indestructible. Un colosse de métal fondu que rien ne perce.",
        sprite: "/yellow/sprites/dex/magnetor.png",
    },

    // ═══════════════════════════════════════════════════════════════════════════════════════════
    // STARTERS DU RUN 3 (concours) — 3 lignées AU CHOIX, en triangle Métal › Fée › Combat › Métal.
    // BST + pools de puissance calqués EXACTEMENT sur les 3 starters run 1 (Eau/Plante/Feu). Learnsets
    // « propres » (chaque attaque tape sur la stat offensive du Daemon). hiddenUntilCaught : surprise run 3.
    // ═══════════════════════════════════════════════════════════════════════════════════════════

    // --- Lignée MÉTAL (éléphant-forteresse) : TANK défensif, BST calqués sur l'EAU (Gouttiny) ---
    elefer: {
        id: "elefer", dexNo: 145, name: "Éléfer", types: ["METAL"],
        baseStats: { hp: 46, atk: 52, def: 68, spe: 26, spc: 54 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 4, moveId: "griffe_acier" },  // STAB Métal
            { level: 8, moveId: "mur_de_fer" },     // set-up Déf (décalé de 1→8 : un starter n'a pas 3 moves au niv 5)
            // carapace_diamant (+2 Déf) RETIRÉ de la base : redondant avec mur_de_fer (+1 Déf) et inversé vs la
            // finale (Colosfer l'apprend à L42, sa vraie place). Une base qui évolue à 16 n'a pas 2 set-up Déf.
        ],
        evolution: { toId: "barrisfer", method: { kind: "LEVEL", level: 16 } },
        catchRate: 45, baseExp: 64, rarity: "RARE", growthRate: "medium_fast", role: "Starter Métal (run 3) — mur défensif", hiddenUntilCaught: true,
        description: "Éléphanteau à la peau de fer. Lourdaud et placide, il encaisse tout sans broncher.",
        sprite: "/yellow/sprites/dex/elefer.png",
    },
    barrisfer: {
        id: "barrisfer", dexNo: 146, name: "Barrisfer", types: ["METAL"],
        baseStats: { hp: 60, atk: 68, def: 88, spe: 36, spc: 66 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 1, moveId: "griffe_acier" },
            { level: 1, moveId: "mur_de_fer" },
            { level: 20, moveId: "tete_de_fer" },
            { level: 28, moveId: "repos" },
            { level: 36, moveId: "seisme" },
        ],
        evolution: { toId: "colosfer", method: { kind: "LEVEL", level: 36 } },
        catchRate: 45, baseExp: 141, rarity: "RARE", growthRate: "medium_fast", role: "Métal (run 3) — mur défensif", hiddenUntilCaught: true,
        description: "Éléphant cuirassé aux défenses d'acier. Son barrissement résonne comme un gong de guerre.",
        sprite: "/yellow/sprites/dex/barrisfer.png",
    },
    colosfer: {
        id: "colosfer", dexNo: 147, name: "Colosfer", types: ["METAL"],
        baseStats: { hp: 80, atk: 92, def: 118, spe: 44, spc: 90 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 1, moveId: "griffe_acier" },
            { level: 1, moveId: "tete_de_fer" },
            { level: 1, moveId: "seisme" },
            { level: 1, moveId: "mur_de_fer" },
            { level: 42, moveId: "carapace_diamant" },
            { level: 48, moveId: "repos" },
            { level: 54, moveId: "coup_de_boutoir" },
            { level: 66, moveId: "poing_meteore" },
        ],
        catchRate: 45, baseExp: 208, rarity: "RARE", growthRate: "medium_fast", role: "Métal (run 3) — forteresse ambulante", hiddenUntilCaught: true,
        description: "Mammouth-forteresse de métal massif. Rien ne le perce, rien ne le déplace contre son gré.",
        sprite: "/yellow/sprites/dex/colosfer.png",
    },

    // --- Lignée FÉE (licorne lunaire) : SWEEPER spécial, BST calqués sur la PLANTE (Feuillichot) ---
    cornaive: {
        id: "cornaive", dexNo: 148, name: "Cornaïve", types: ["FEE"],
        baseStats: { hp: 45, atk: 34, def: 46, spe: 58, spc: 62 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 4, moveId: "bourrasque_feerique" },
            { level: 11, moveId: "onde_folie" },
        ],
        evolution: { toId: "astracorne", method: { kind: "LEVEL", level: 16 } },
        catchRate: 45, baseExp: 64, rarity: "RARE", growthRate: "medium_fast", role: "Starter Fée (run 3) — sweeper spécial", hiddenUntilCaught: true,
        description: "Pouliche-licorne au pelage scintillant. Naïve, mais sa corne crépite déjà de magie lunaire.",
        sprite: "/yellow/sprites/dex/cornaive.png",
    },
    astracorne: {
        id: "astracorne", dexNo: 149, name: "Astracorne", types: ["FEE"],
        baseStats: { hp: 60, atk: 44, def: 58, spe: 76, spc: 84 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 1, moveId: "bourrasque_feerique" },
            { level: 1, moveId: "onde_folie" },
            { level: 18, moveId: "voile_feerique" },
            { level: 26, moveId: "focalisation" },
            { level: 32, moveId: "vague_mentale" },
        ],
        evolution: { toId: "lunarque", method: { kind: "LEVEL", level: 32 } },
        catchRate: 45, baseExp: 141, rarity: "RARE", growthRate: "medium_fast", role: "Fée (run 3) — sweeper spécial", hiddenUntilCaught: true,
        description: "Licorne à la crinière d'étoiles. Galope sur les rayons de lune, insaisissable.",
        sprite: "/yellow/sprites/dex/astracorne.png",
    },
    lunarque: {
        id: "lunarque", dexNo: 150, name: "Lunarque", types: ["FEE"],
        baseStats: { hp: 78, atk: 56, def: 74, spe: 105, spc: 122 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 1, moveId: "bourrasque_feerique" },
            { level: 1, moveId: "voile_feerique" },
            { level: 1, moveId: "onde_folie" },
            { level: 38, moveId: "eclat_lunaire" },
            { level: 46, moveId: "vague_mentale" },
            { level: 52, moveId: "repos" },
            { level: 58, moveId: "focalisation" },
            { level: 66, moveId: "cataclysme_lunaire" },
        ],
        catchRate: 45, baseExp: 208, rarity: "RARE", growthRate: "medium_fast", role: "Fée (run 3) — sweeper spécial", hiddenUntilCaught: true,
        description: "Souveraine lunaire. D'un coup de corne, elle abat un cataclysme d'argent sur ses ennemis.",
        sprite: "/yellow/sprites/dex/lunarque.png",
    },

    // --- Lignée COMBAT/INSECTE (coccinelle-boxeuse ♀) : CANON DE VERRE, BST calqués sur le FEU (Braisille) ---
    coccipoing: {
        id: "coccipoing", dexNo: 151, name: "Coccipoing", types: ["COMBAT", "INSECTE"],
        baseStats: { hp: 44, atk: 72, def: 38, spe: 66, spc: 34 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 4, moveId: "double_pied" },
            { level: 7, moveId: "vive_attaque" }, // décalé de 1→7 : un starter n'a pas 3 moves au niv 5
            { level: 9, moveId: "essaim_vorace" },
            { level: 15, moveId: "poing_karate" },
        ],
        evolution: { toId: "coccombat", method: { kind: "LEVEL", level: 16 } },
        catchRate: 45, baseExp: 64, rarity: "RARE", growthRate: "medium_fast", role: "Starter Combat/Insecte (run 3) — canon de verre", hiddenUntilCaught: true,
        description: "Petite coccinelle aux gantelets rouges. Teigneuse malgré sa taille, elle cogne vite et fort.",
        sprite: "/yellow/sprites/dex/coccipoing.png",
    },
    coccombat: {
        id: "coccombat", dexNo: 152, name: "Coccombat", types: ["COMBAT", "INSECTE"],
        baseStats: { hp: 56, atk: 96, def: 50, spe: 88, spc: 42 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 1, moveId: "vive_attaque" },
            { level: 1, moveId: "double_pied" },
            { level: 1, moveId: "essaim_vorace" },
            { level: 1, moveId: "poing_karate" },
            { level: 20, moveId: "morsure" },
            { level: 30, moveId: "dard_mortel" },
            { level: 36, moveId: "danse_lames" },
        ],
        evolution: { toId: "coccimperatrice", method: { kind: "LEVEL", level: 36 } },
        catchRate: 45, baseExp: 141, rarity: "RARE", growthRate: "medium_fast", role: "Combat/Insecte (run 3) — canon de verre", hiddenUntilCaught: true,
        description: "A largué ses élytres pour la vitesse. Guerrière déchaînée, elle enchaîne les frappes éclair.",
        sprite: "/yellow/sprites/dex/coccombat.png",
    },
    coccimperatrice: {
        id: "coccimperatrice", dexNo: 153, name: "Coccimpératrice", types: ["COMBAT", "INSECTE"],
        baseStats: { hp: 72, atk: 128, def: 66, spe: 124, spc: 56 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 1, moveId: "vive_attaque" },
            { level: 1, moveId: "poing_karate" },
            { level: 1, moveId: "essaim_vorace" },
            { level: 1, moveId: "morsure" },
            { level: 40, moveId: "crochet_maitre" },
            { level: 48, moveId: "dard_mortel" },
            { level: 56, moveId: "danse_lames" },
            { level: 66, moveId: "coup_de_boutoir" },
        ],
        catchRate: 45, baseExp: 208, rarity: "RARE", growthRate: "medium_fast", role: "Combat/Insecte (run 3) — canon de verre", hiddenUntilCaught: true,
        description: "Maîtresse à mains nues, souveraine des pois rouges. Ses frappes foudroyantes brisent les gardes.",
        sprite: "/yellow/sprites/dex/coccimperatrice.png",
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
            { level: 16, moveId: "vive_attaque" },
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
            { level: 66, moveId: "coup_de_boutoir" }, // capstone 65+ : STAB COMBAT physique (exploite atk 118)
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
            { level: 30, moveId: "tranche" },
            { level: 36, moveId: "belier" },
            { level: 40, moveId: "plaquage" },
            { level: 42, moveId: "danse_lames" },
            { level: 45, moveId: "ultralaser" },
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
            { level: 1, moveId: "coup_d_boule" }, // couverture Normal
            { level: 20, moveId: "tranche_feuille" },
            { level: 23, moveId: "vampigraine" },
            { level: 40, moveId: "belier" },
            { level: 45, moveId: "focalisation" },
            { level: 50, moveId: "tempete_verte" },
            { level: 70, moveId: "lance_soleil" },
            { level: 80, moveId: "repos" },
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
            { level: 1, moveId: "coup_d_givre" }, { level: 34, moveId: "souffle_polaire" }, // gaté (illégitime au niv 1)
            { level: 1, moveId: "vive_attaque" }, { level: 1, moveId: "coup_d_boule" },
            { level: 20, moveId: "mur_de_fer" }, { level: 40, moveId: "focalisation" }, { level: 55, moveId: "repos" }, { level: 66, moveId: "blizzard" },
        ],
        catchRate: 45, baseExp: 195, rarity: "RARE", growthRate: "medium_fast", role: "Glace — panthère (boss)",
        description: "Panthère de givre au pelage cristallin ; son souffle gèle l'air.",
        sprite: "/yellow/sprites/dex/panthegel.png",
    },
    pyropanthe: {
        id: "pyropanthe", dexNo: 70, name: "Pyropanthe", types: ["FEU"],
        baseStats: { hp: 72, atk: 78, def: 62, spe: 118, spc: 121 },
        learnset: [
            { level: 1, moveId: "flamme_ardente" }, { level: 36, moveId: "lance_flammes" }, // gaté (illégitime au niv 1)
            { level: 1, moveId: "vive_attaque" }, { level: 1, moveId: "coup_d_boule" },
            { level: 40, moveId: "focalisation" }, { level: 52, moveId: "pyrotechnie" }, { level: 66, moveId: "boutefeu" },
        ],
        catchRate: 45, baseExp: 200, rarity: "RARE", growthRate: "medium_fast", role: "Feu — panthère (boss)",
        description: "Panthère de braise ; file plus vite que la flamme qui la couronne.",
        sprite: "/yellow/sprites/dex/pyropanthe.png",
    },
    ombrapanthe: {
        id: "ombrapanthe", dexNo: 71, name: "Ombrapanthe", types: ["SPECTRE"],
        baseStats: { hp: 78, atk: 96, def: 70, spe: 113, spc: 98 },
        learnset: [
            { level: 32, moveId: "ball_ombre" }, { level: 1, moveId: "leche" }, // Ball'Ombre gaté (illégitime au niv 1)
            { level: 1, moveId: "morsure" }, { level: 1, moveId: "coup_d_boule" },
            { level: 30, moveId: "griffe_spectrale" }, { level: 45, moveId: "danse_lames" }, { level: 66, moveId: "frappe_audela" },
        ],
        catchRate: 45, baseExp: 200, rarity: "RARE", growthRate: "medium_fast", role: "Spectre (ténèbre) — panthère (boss)",
        description: "Panthère des ténèbres ; surgit de l'ombre avant qu'on la voie.",
        sprite: "/yellow/sprites/dex/ombrapanthe.png",
    },
    aquapanthe: {
        id: "aquapanthe", dexNo: 72, name: "Aquapanthe", types: ["EAU"],
        baseStats: { hp: 102, atk: 76, def: 92, spe: 80, spc: 95 },
        learnset: [
            { level: 1, moveId: "lame_eau" }, { level: 38, moveId: "hydrocanon" }, // Hydrocanon gaté (illégitime au niv 1)
            { level: 1, moveId: "vive_attaque" }, { level: 1, moveId: "coup_d_boule" },
            { level: 40, moveId: "deferlante" }, { level: 50, moveId: "focalisation" }, { level: 66, moveId: "repos" },
        ],
        catchRate: 45, baseExp: 195, rarity: "RARE", growthRate: "medium_fast", role: "Eau — panthère (boss)",
        description: "Panthère des torrents ; sa crinière ruisselle d'une eau vive.",
        sprite: "/yellow/sprites/dex/aquapanthe.png",
    },
    voltapanthe: {
        id: "voltapanthe", dexNo: 73, name: "Voltapanthe", types: ["ELEC"],
        baseStats: { hp: 76, atk: 88, def: 64, spe: 122, spc: 102 },
        learnset: [
            { level: 1, moveId: "etincelle" }, { level: 36, moveId: "fulgurance" }, // gaté (illégitime au niv 1)
            { level: 26, moveId: "cage_eclair" }, { level: 1, moveId: "vive_attaque" },
            { level: 40, moveId: "focalisation" }, { level: 66, moveId: "ultra_foudre" },
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
        learnset: [{ level: 1, moveId: "morsure" }, { level: 1, moveId: "eboulis" }, { level: 1, moveId: "fonce_bec" }, { level: 1, moveId: "lame_roche" }, { level: 40, moveId: "belier" }, { level: 44, moveId: "danse_lames" }, { level: 46, moveId: "pique_fatal" }, { level: 50, moveId: "seisme" }, { level: 66, moveId: "vol" }],
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
        learnset: [{ level: 1, moveId: "lame_roche" }, { level: 1, moveId: "seisme" }, { level: 1, moveId: "carapace_diamant" }, { level: 1, moveId: "danse_lames" }, { level: 1, moveId: "repos" }, { level: 44, moveId: "tir_boue" }, { level: 50, moveId: "belier" }, { level: 66, moveId: "roc_titanesque" }],
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
        learnset: [{ level: 1, moveId: "vague_mentale" }, { level: 1, moveId: "lame_roche" }, { level: 1, moveId: "eboulis" }, { level: 1, moveId: "choc_mental" }, { level: 40, moveId: "focalisation" }, { level: 44, moveId: "mur_de_fer" }, { level: 48, moveId: "repos" }, { level: 54, moveId: "onde_folie" }, { level: 66, moveId: "eveil_divin" }],
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
        learnset: [{ level: 1, moveId: "souffle_polaire" }, { level: 1, moveId: "lame_roche" }, { level: 1, moveId: "eboulis" }, { level: 1, moveId: "coup_d_givre" }, { level: 40, moveId: "belier" }, { level: 44, moveId: "danse_lames" }, { level: 52, moveId: "carapace_diamant" }, { level: 66, moveId: "blizzard" }],
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
        learnset: [{ level: 1, moveId: "lame_roche" }, { level: 1, moveId: "hydrocanon" }, { level: 1, moveId: "lame_eau" }, { level: 1, moveId: "belier" }, { level: 40, moveId: "eboulis" }, { level: 44, moveId: "danse_lames" }, { level: 52, moveId: "tranche" }, { level: 66, moveId: "seisme" }],
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
        learnset: [{ level: 1, moveId: "ball_ombre" }, { level: 1, moveId: "dard_mortel" }, { level: 1, moveId: "morsure" }, { level: 1, moveId: "ombre_furtive" }, { level: 40, moveId: "dard_nuee" }, { level: 46, moveId: "danse_lames" }, { level: 54, moveId: "dard_fatal" }, { level: 66, moveId: "detonation" }],
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
            { level: 48, moveId: "focalisation" }, { level: 66, moveId: "boutefeu" },
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
            { level: 46, moveId: "pyrotechnie" }, { level: 52, moveId: "focalisation" }, { level: 66, moveId: "boutefeu" },
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
            { level: 44, moveId: "carapace_diamant" }, { level: 52, moveId: "deferlante" }, { level: 66, moveId: "hydrocanon" },
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
            { level: 46, moveId: "danse_lames" }, { level: 54, moveId: "crocs_de_feu" }, { level: 66, moveId: "deluge_crochets" },
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
            { level: 36, moveId: "lance_flammes" }, { level: 40, moveId: "crocs_de_feu" }, { level: 44, moveId: "belier" },
            { level: 50, moveId: "tranche" }, { level: 54, moveId: "danse_lames" }, { level: 66, moveId: "ultralaser" },
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
            { level: 48, moveId: "cage_eclair" }, { level: 54, moveId: "focalisation" }, { level: 66, moveId: "surtension" },
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
            { level: 52, moveId: "onde_folie" }, { level: 70, moveId: "ultra_foudre" },
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
            { level: 48, moveId: "onde_folie" }, { level: 66, moveId: "frappe_audela" },
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
            { level: 52, moveId: "focalisation" }, { level: 66, moveId: "boutefeu" },
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
            { level: 48, moveId: "danse_lames" }, { level: 54, moveId: "seisme" }, { level: 66, moveId: "deluge_crochets" },
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
            { level: 54, moveId: "linceul" }, { level: 66, moveId: "toxik" },
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
            { level: 66, moveId: "detonation" },
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
            { level: 28, moveId: "draco_rage" },
            { level: 33, moveId: "repos" }, // récup : le colosse se régénère (soigne 50% PV, s'endort 1 tour) — remplace Bélier
            { level: 44, moveId: "seisme" },
            { level: 48, moveId: "focalisation" },
            { level: 55, moveId: "draco_charge" },
            { level: 95, moveId: "souffle_primordial" }, // capstone légendaire ultra-tardif (aussi CT-trophée du décuple champion)
        ],
        catchRate: 8, baseExp: 220, rarity: "LEGENDARY", growthRate: "slow", exclusive: true, role: "Légendaire DRAGON — apex des hautes herbes (capture gatée Ball+statut)",
        description: "Dragon primordial qui sommeille, camouflé, dans l'herbe la plus humble — là où nul ne songe à le chercher.",
        sprite: "/yellow/sprites/dex/goshendofy.png",
        hiddenUntilCaught: true, // SURPRISE : absent du Pokédex tant qu'on ne l'a pas capturé
    },
    // 🧚 UKOGNOS — LÉGENDAIRE mono-FÉE (dexNo 136, 1er Daemon Fée du jeu), alter-ego occulte de Goshendofy
    // (Dragon, 125) : la némésis-TYPE du colosse draconique (Fée = 2× Dragon + immunité Dragon). Attaquant
    // SPÉCIAL rapide et TANKY (spe 125 / spc 150 / pv 130 / déf 100), ATQ volontairement molle. En mono-Fée,
    // UNE SEULE faiblesse (Poison, physique → sur la DÉF). Masqué du Pokédex hors run 2 (hiddenUntilCaught) ;
    // le pop STATIQUE one-time réservé au NG+ se câble HORS species.ts (garde getActiveWorld()==="ngplus", façon Gékraise).
    ukognos: {
        id: "ukognos", dexNo: 136, name: "Ukognos", types: ["FEE"],
        baseStats: { hp: 130, atk: 50, def: 100, spe: 125, spc: 150 }, // BST 555 — nuke spécial rapide et robuste, ATQ inutile (assumée)
        learnset: [
            // MONO-FÉE strict, attaquant 100% SPÉCIAL. Couvertures TOUTES neutres/résistées vs Poison ET Insecte
            // (AUCUN Feu ni Psy) → il n'a AUCUN coup super-efficace sur MEROREM (Poison/Insecte) qui le HARD-COUNTER.
            //   • GLACE (Souffle Polaire) = anti-DRAGON → Ukognos > Goshendofy.
            //   • ÉLEC (Fulgurance) = couverture Eau/Vol (spéciale, 150 de Spé).
            //   • SPECTRE de STATUT (Voile d'Effroi) = utilitaire (Spectre offensif serait PHYSIQUE → gâché sur son ATQ 50).
            // Courbe calquée sur Goshendofy (STAB → setup → STAB → soin → utilitaire → couverture → couverture → capstone).
            { level: 1, moveId: "charge" },
            { level: 1, moveId: "voile_feerique" },       // STAB Fée d'entrée (miroir Draco-Souffle 60)
            { level: 22, moveId: "focalisation" },        // set-up SPÉ +1 (miroir Danse-Lames)
            { level: 28, moveId: "eclat_lunaire" },       // STAB signature Fée 85 +SpA (miroir Draco-Rage)
            { level: 33, moveId: "repos" },               // auto-soin 50% (miroir Repos)
            { level: 40, moveId: "voile_effroi" },        // SPECTRE (statut) : terreur -1 Atq/-1 Précision (n'aide PAS vs le Toxik de Merorem)
            { level: 48, moveId: "souffle_polaire" },     // GLACE 90 : couverture anti-DRAGON (miroir Séisme), neutre vs Merorem
            { level: 60, moveId: "fulgurance" },          // ÉLEC 90 : couverture Eau/Vol (spéciale), neutre vs Merorem — comble le trou
            { level: 90, moveId: "cataclysme_lunaire" },  // capstone Fée 115 (miroir Souffle Primordial niv 95)
        ],
        catchRate: 8, baseExp: 220, rarity: "LEGENDARY", growthRate: "slow", exclusive: true,
        role: "Légendaire FÉE — alter-ego de Goshendofy, révélé au run 2 (némésis-type du Dragon)",
        description: "Lutin-démon aux flammes violettes, écho féerique et maudit de Goshendofy. Ne se révèle qu'à ceux qui osent recommencer l'aventure.",
        sprite: "/yellow/sprites/dex/ukognos.png",
        hiddenUntilCaught: true, // absent du Pokédex tant qu'on ne l'a pas capturé (comme Goshendofy)
        runTwoOnly: true, // n'apparaît dans les dex qu'à partir du run 2 (une fois capturé)
    },
    // 🪨⚡ GÉKROC — mini-boss STATIQUE de la Centrale (gardien de la Pierre d'Évolution). Stats moyennes
    // mais COUTEAU-SUISSE : apprend TOUTES les CT (learnsAllCts). Capture dure (catchRate 10) mais ≠ légendaire.
    gekroc: {
        id: "gekroc", dexNo: 126, name: "Gékroc", types: ["SOL", "ELEC"],
        baseStats: { hp: 70, atk: 55, def: 120, spe: 50, spc: 115 }, // BST 410 — MUR SPÉCIAL (Déf+Spé extrêmes ; riposte ÉLEC, immunisé ÉLEC via SOL)
        learnset: [
            { level: 1, moveId: "vive_attaque" },
            { level: 1, moveId: "etincelle" },
            { level: 1, moveId: "tunnel" },
            { level: 1, moveId: "repos" },
            // Petite attaque physique SOL (STAB → exploite l'atk 92), DISPO DÈS N35 : le boss n'est plus
            // un simple staller. La factory prend les 4 DERNIÈRES attaques ≤ niveau (slice(-4)), donc à
            // N35 le kit devient [Étincelle, Tunnel, Repos, Secousse] (Vive-Attaque, la plus faible, sort).
            { level: 1, moveId: "secousse" },         // STAB SOL modeste (60), physique — sert l'atk 92
            // Profondeur POST-CAPTURE (niv >35). Identité golem SOL/ROCHE/ÉLEC.
            // PRE-65 = kit SOBRE (≤75 + contrôle) ; POST-65 = les grosses attaques (récompense long terme).
            { level: 48, moveId: "eboulis" },         // couverture ROCHE (peut apeurer)
            { level: 56, moveId: "cage_eclair" },     // contrôle ÉLEC : paralyse à coup sûr (0 dmg)
            // — Palier des grosses attaques (post niveau 65) —
            { level: 66, moveId: "lame_roche" },      // ROCHE 90 (fort crit)
            { level: 72, moveId: "seisme" },          // STAB SOL lourd (100)
            { level: 80, moveId: "ultra_foudre" },    // STAB ÉLEC lourd (110)
            { level: 88, moveId: "roc_titanesque" },  // capstone : nuke ROCHE (120, contrecoup)
        ],
        catchRate: 10, baseExp: 180, rarity: "RARE", growthRate: "medium_fast", exclusive: true,
        role: "Mini-boss SOL/ÉLEC — gardien de la Pierre, apprend TOUTES les CT",
        description: "Golem-taupe fossile incrusté d'une pierre d'évolution crépitante. Creuse des tunnels fulgurants et s'adapte à tout.",
        sprite: "/yellow/sprites/dex/gekroc.png",
        learnsAllCts: true,
        hiddenUntilCaught: true, // SURPRISE : absent du Pokédex tant qu'on ne l'a pas capturé
    },
    // 🪨🔥 GÉKRAISE — JUMEAU RUN 2 de Gékroc : mini-boss de la Centrale en New Game+, MÊME créature
    // (mêmes stats, mêmes attaques, learnsAllCts, capture dure) mais RE-TYPÉE ROCHE/FEU. Masqué du Pokédex.
    gekraise: {
        id: "gekraise", dexNo: 135, name: "Gékraise", types: ["ROCHE", "FEU"],
        baseStats: { hp: 110, atk: 125, def: 65, spe: 55, spc: 55 }, // BST 410 — JUGGERNAUT PHYSIQUE (Atk+HP extrêmes ; frappe fort, encaisse mal)
        learnset: [
            { level: 1, moveId: "vive_attaque" },
            { level: 1, moveId: "etincelle" },
            { level: 1, moveId: "tunnel" },
            { level: 1, moveId: "repos" },
            { level: 1, moveId: "secousse" },
            { level: 48, moveId: "eboulis" },         // ROCHE → STAB désormais
            { level: 56, moveId: "cage_eclair" },
            { level: 66, moveId: "lame_roche" },      // ROCHE → STAB
            { level: 72, moveId: "seisme" },
            { level: 80, moveId: "ultra_foudre" },
            { level: 88, moveId: "roc_titanesque" },  // ROCHE → STAB (capstone)
        ],
        catchRate: 10, baseExp: 180, rarity: "RARE", growthRate: "medium_fast", exclusive: true,
        role: "Mini-boss ROCHE/FEU (run 2) — jumeau de Gékroc, apprend TOUTES les CT",
        description: "Golem fossile jumeau de Gékroc, mais sa pierre couve un cœur de magma. Creuse des galeries brûlantes et s'adapte à tout.",
        sprite: "/yellow/sprites/dex/gekraise.png", // sprite fourni par Sartay (run 2)
        learnsAllCts: true,
        hiddenUntilCaught: true,
        runTwoOnly: true, // absent des dex tant que non capturé en run 2 (jumeau NG+ de Gékroc)
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
            { level: 30, moveId: "crocs_de_feu" },
            { level: 40, moveId: "pique_fatal" },
            { level: 46, moveId: "danse_lames" },
            { level: 52, moveId: "tranche" }, { level: 66, moveId: "griffe_draconique" },
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
            { level: 48, moveId: "danse_lames" }, { level: 54, moveId: "griffe_draconique" }, { level: 66, moveId: "blizzard" },
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
            { level: 66, moveId: "blizzard" },
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
            { level: 66, moveId: "seisme" },
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
            { level: 60, moveId: "vague_mentale" }, { level: 66, moveId: "eveil_divin" },
        ],
        catchRate: 30, baseExp: 220, rarity: "RARE", growthRate: "medium_fast", exclusive: true, role: "Normal — œuf-soigneur (mur spécial ; s'effondre au physique)",
        description: "Petit Daemon-œuf au cœur immense. Encaisse les pires assauts spéciaux sans broncher grâce à ses PV colossaux, mais le moindre coup physique le fait vaciller. Soigne et endort plus qu'il ne frappe.",
        sprite: "/yellow/sprites/dex/tonytony.png",
    },
    // 🦠 MEROREM — ALTER-EGO RUN 2 de Tonytony (dexNo 137), Poison/Insecte. Là où Tonytony SOIGNE, lui
    // PROPAGE la maladie : staller-pestilence qui empile poison grave/paralysie/sommeil/confusion + draine,
    // et frappe pour de vrai (ATQ 85, STAB physiques Poison/Insecte). Offert au casino en NG+ (1000⚡, SHINY à
    // 5000), comme Tonytony. Masqué des dex hors run 2 (runTwoOnly). Faible Psy/Feu/Vol/Roche ; résiste Fée.
    merorem: {
        id: "merorem", dexNo: 137, name: "Merorem", types: ["POISON", "INSECTE"],
        baseStats: { hp: 130, atk: 85, def: 100, spe: 40, spc: 90 }, // BST 445 — bruiser-staller lent et malsain
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 1, moveId: "crachat_acide" },   // chip Poison (peut baisser la DÉF)
            { level: 12, moveId: "toxik" },           // signature : poison GRAVE
            { level: 18, moveId: "cage_eclair" },     // paralysie garantie
            { level: 24, moveId: "vampigraine" },     // drain chaque tour (propage)
            { level: 30, moveId: "onde_folie" },      // confusion
            { level: 36, moveId: "dard_fatal" },      // STAB Insecte (peut empoisonner)
            { level: 42, moveId: "bombe_beurk" },     // gros STAB Poison (2× vs FÉE/Ukognos) — AVANCÉ 60→42 : Merorem
                                                       //   peut enfin punir tôt la faiblesse d'Ukognos (dès l'obtention casino)
            { level: 44, moveId: "berceuse" },        // sommeil
            { level: 52, moveId: "boul_pollen" },     // Insecte 85 + drain 50%
            { level: 66, moveId: "repos" },           // auto-soin (le staller se régénère)
            { level: 90, moveId: "miasme_corrosif" }, // capstone Poison tardif
        ],
        catchRate: 30, baseExp: 220, rarity: "RARE", growthRate: "medium_fast", exclusive: true,
        role: "Poison/Insecte — pestilence (staller à statut, alter-ego de Tonytony, run 2)",
        description: "Hydre-fléau aux tentacules suintantes. Ne soigne pas : il contamine. Chaque étreinte inocule une nouvelle plaie, et il se repaît de la déchéance qu'il répand.",
        sprite: "/yellow/sprites/dex/merorem.png",
        hiddenUntilCaught: true, // absent du Pokédex tant qu'on ne l'a pas capturé
        runTwoOnly: true,        // n'apparaît dans les dex qu'à partir du run 2 (une fois obtenu au casino NG+)
    },
    // 💋 MORROW — hommage à Lippoutou/Jynx (dexNo 138), Glace/Psy. Reçu UNIQUEMENT par ÉCHANGE contre un
    // Roctaur auprès du BROCANTEUR devant la maison hantée (Cendreville). CONTRÔLEUR spécial ultra-rapide
    // (VIT 125) : endort à l'Hypnose (fiable car rapide), embrouille (Onde Folie/Cérébrale) et grignote
    // Glace/Psy ; un seul gros coup (Vague Mentale 90). Le Souffle Polaire (Glace 90) reste dispo via CT13.
    morrow: {
        id: "morrow", dexNo: 138, name: "Morrow", types: ["GLACE", "PSY"],
        baseStats: { hp: 85, atk: 30, def: 65, spe: 125, spc: 135 }, // BST 440 — glass-cannon spécial ULTRA-rapide (VIT 125, top 3) ; ATQ dumpée (kit 100 % spécial) → Hypnose fiable
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 1, moveId: "onde_folie" },       // confusion — la charmeuse déboussole
            { level: 12, moveId: "choc_mental" },     // petit STAB Psy
            { level: 20, moveId: "hypnose" },          // sommeil hypnotique (Psy, STAB) — fiable car Morrow est rapide (speedScaledAcc)
            { level: 28, moveId: "coup_d_givre" },     // STAB Glace MODÉRÉ (65, peut geler) — le Souffle Polaire (90) reste dispo en CT13
            { level: 36, moveId: "focalisation" },     // set-up SPÉ +1
            { level: 44, moveId: "onde_cerebrale" },   // contrôle : Vit/Préc/Déf −1 garantis (disrupteur)
            { level: 52, moveId: "vague_mentale" },    // capstone : son SEUL gros coup (Psy 90)
        ],
        catchRate: 30, baseExp: 200, rarity: "RARE", growthRate: "medium_fast",
        role: "Glace/Psy — charmeuse-endormeuse (attaquant spécial rapide, obtenue par échange)",
        description: "Créature venue d'un autre monde, au sourire troublant. D'un baiser givré elle endort ses proies, puis les foudroie d'une vague mentale. Nul ne sait d'où elle vient — seulement qu'on l'échange, jamais qu'on la capture.",
        sprite: "/yellow/sprites/dex/morrow.png",
    },

    // ============================================================
    // CRÉATIONS DE JOUEUR CANONISÉES (post-Ligue). Conçues au Créateur de Daemon
    // après la Ligue, puis intronisées dans le registre officiel. `postLeague: true`
    // → ABSENTES des dex tant que le joueur n'est pas CHAMPION, puis rejoignent le
    // dex de TOUT LE MONDE. Non-exclusives → apparaissent aussi en Zone de Combat
    // (Battle Frontier) comme adversaires/locations. secretTalent conservé (fidèle
    // à la création d'origine). dexNo 139+.
    // ============================================================

    // --- Lignée GAVILLUS → CROCODAILLUS → ALIROCAILLUS (Vol/Roche) — création de Sartay ---
    // Croco-caméléon ailé : sweeper physique ULTRA-rapide (VIT 130 / ATQ 135), fragile en spécial.
    gavillus: {
        id: "gavillus", dexNo: 139, name: "Gavillus", types: ["VOL", "ROCHE"],
        baseStats: { hp: 48, atk: 92, def: 51, spe: 88, spc: 31 }, // BST 310
        learnset: [
            { level: 1, moveId: "picpic" },
            { level: 1, moveId: "jet_de_sable" },
            { level: 12, moveId: "jet_pierres" },
            { level: 18, moveId: "malediction" },
        ],
        evolution: { toId: "crocodaillus", method: { kind: "LEVEL", level: 22 } },
        catchRate: 45, baseExp: 70, rarity: "RARE", growthRate: "slow",
        secretTalent: "affinite_elem", postLeague: true,
        role: "Vol/Roche — vif (jeune crocodile étrange)",
        description: "Jeune crocodile à l'allure étrange, déjà d'une intelligence troublante. Des plaques de pierre affleurent sur son dos, de minuscules moignons pointent à ses épaules. — Création originale de Mools ©",
        sprite: "/yellow/sprites/dex/gavillus.png",
    },
    crocodaillus: {
        id: "crocodaillus", dexNo: 140, name: "Crocodaillus", types: ["VOL", "ROCHE"],
        baseStats: { hp: 62, atk: 119, def: 66, spe: 114, spc: 40 }, // BST 401
        learnset: [
            { level: 1, moveId: "picpic" },
            { level: 1, moveId: "jet_pierres" },
            { level: 1, moveId: "jet_de_sable" },
            { level: 24, moveId: "vive_attaque" },
            { level: 30, moveId: "hurlement" },
            { level: 36, moveId: "mur_de_fer" },
        ],
        evolution: { toId: "alirocaillus", method: { kind: "LEVEL", level: 40 } },
        catchRate: 45, baseExp: 150, rarity: "RARE", growthRate: "slow",
        secretTalent: "affinite_elem", postLeague: true,
        role: "Vol/Roche — attaquant rapide",
        description: "Mi-crocodile, mi-caméléon : ses yeux commencent à pivoter chacun de leur côté, et des ailes à demi formées percent sa carapace de pierre. — Création originale de Mools ©",
        sprite: "/yellow/sprites/dex/crocodaillus.png",
    },
    alirocaillus: {
        id: "alirocaillus", dexNo: 141, name: "Alirocaillus", types: ["VOL", "ROCHE"],
        baseStats: { hp: 70, atk: 135, def: 75, spe: 130, spc: 45 }, // BST 455 — sweeper physique très rapide
        learnset: [
            { level: 1, moveId: "jet_pierres" },
            { level: 1, moveId: "vive_attaque" },
            { level: 1, moveId: "mur_de_fer" },
            { level: 42, moveId: "lame_roche" },
            { level: 48, moveId: "berceuse" },
            { level: 54, moveId: "vol" },
            { level: 60, moveId: "meteores" },
        ],
        catchRate: 45, baseExp: 210, rarity: "RARE", growthRate: "slow",
        secretTalent: "affinite_elem", postLeague: true,
        role: "Vol/Roche — sweeper physique rapide (création canonisée)",
        description: "Caméléon de pierre aux larges ailes. Son cri porte loin et sa ruse n'a pas d'égale ; il fond du ciel avant qu'on l'ait vu bouger. — Création originale de Mools ©",
        sprite: "/yellow/sprites/dex/alirocaillus.png",
    },

    // --- Lignée GOATINY → MOUFLORAGE (Sol/Élec) — le contre naturel de Gavillus ---
    // Chèvre-mouflon d'orage : mur-attaquant SPÉCIAL (SPÉ 130). Le Sol l'ancre (résiste Vol+Roche de
    // Gavillus, immunise à l'Élec) — son arme est l'Élec spécial. Paralyse et débuffe avant de foudroyer.
    goatiny: {
        id: "goatiny", dexNo: 142, name: "Goatiny", types: ["SOL", "ELEC"],
        baseStats: { hp: 62, atk: 32, def: 51, spe: 37, spc: 81 }, // BST 263
        learnset: [
            { level: 1, moveId: "etincelle" },
            { level: 1, moveId: "jet_de_sable" },
            { level: 12, moveId: "secousse" },
            { level: 18, moveId: "charge" },
            { level: 24, moveId: "hurlement" },
        ],
        evolution: { toId: "mouflorage", method: { kind: "LEVEL", level: 30 } },
        catchRate: 45, baseExp: 65, rarity: "RARE", growthRate: "slow",
        secretTalent: "affinite_elem", postLeague: true,
        role: "Sol/Élec — chevreau (offensif spécial)",
        description: "Chevreau des hautes cimes dont le pelage grésille de statique. Ses cornes naissantes crépitent au moindre orage. — Némésis forgée par Mools pour contrer Gavillus ©",
        sprite: "/yellow/sprites/dex/goatiny.png",
    },
    mouflorage: {
        id: "mouflorage", dexNo: 143, name: "Mouflorage", types: ["SOL", "ELEC"],
        baseStats: { hp: 100, atk: 52, def: 82, spe: 60, spc: 130 }, // BST 424 — mur-attaquant spécial (paralyse puis foudroie)
        learnset: [
            { level: 1, moveId: "etincelle" },
            { level: 1, moveId: "secousse" },
            { level: 1, moveId: "hurlement" },
            { level: 30, moveId: "fulgurance" },
            { level: 36, moveId: "cage_eclair" },
            { level: 42, moveId: "tir_boue" },
            { level: 48, moveId: "repos" },
            { level: 54, moveId: "seisme" },
            { level: 60, moveId: "ultra_foudre" },
        ],
        catchRate: 45, baseExp: 200, rarity: "RARE", growthRate: "slow",
        secretTalent: "affinite_elem", postLeague: true,
        role: "Sol/Élec — mur-attaquant spécial (le contre de Gavillus)",
        description: "Mouflon d'orage aux cornes-bobines, ancré au roc. Froid et calculateur, il paralyse sa proie et lui vole sa vitesse avant de la foudroyer. On murmure qu'il fut façonné pour terrasser un certain caméléon ailé. — Némésis forgée par Mools pour contrer Gavillus ©",
        sprite: "/yellow/sprites/dex/mouflorage.png",
    },

    // ═══════════════ CENTRALE PSY — RUN 3 (dexNo 156-160, espèces INÉDITES) ═══════════════
    // 🪨🔮 GÉKOSMIC — 3e jumeau de Gékroc/Gékraise : mini-boss STATIQUE de la Centrale en RUN 3, MÊME créature
    // (mêmes stats BST 410, learnsAllCts, capture dure) mais RE-TYPÉE ROCHE/PSY. Learnset parallèle à Gékroc,
    // ses 3 moves ÉLEC échangés en PSY (STAB spécial réel). Masqué du Pokédex tant que non capturé.
    gekosmic: {
        id: "gekosmic", dexNo: 156, name: "Gékosmic", types: ["ROCHE", "PSY"],
        baseStats: { hp: 65, atk: 50, def: 55, spe: 115, spc: 125 }, // BST 410 — SWEEPER SPÉCIAL RAPIDE (Spé+Vit extrêmes ; verre-canon psychique)
        learnset: [
            { level: 1, moveId: "vive_attaque" },
            { level: 1, moveId: "choc_mental" },     // STAB PSY spécial (⇄ étincelle de Gékroc)
            { level: 1, moveId: "tunnel" },          // signature dig conservée
            { level: 1, moveId: "repos" },
            { level: 1, moveId: "secousse" },        // frappe physique (exploite atk 92)
            { level: 48, moveId: "eboulis" },        // STAB ROCHE physique
            { level: 56, moveId: "onde_folie" },     // contrôle PSY (confusion, ⇄ cage_eclair)
            { level: 66, moveId: "lame_roche" },     // STAB ROCHE
            { level: 72, moveId: "seisme" },         // couverture SOL lourde
            { level: 80, moveId: "vague_mentale" },  // gros STAB PSY spécial (⇄ ultra_foudre)
            { level: 88, moveId: "roc_titanesque" }, // capstone ROCHE
        ],
        catchRate: 10, baseExp: 180, rarity: "RARE", growthRate: "medium_fast", exclusive: true,
        role: "Mini-boss ROCHE/PSY (run 3) — jumeau de Gékroc, apprend TOUTES les CT",
        description: "Golem fossile jumeau de Gékroc, mais sa pierre irradie une énergie mentale : des éclairs psychiques parcourent sa carapace de roche et cristallisent sa queue. Creuse des galeries fulgurantes et s'adapte à tout.",
        sprite: "/yellow/sprites/dex/gekosmic.png",
        learnsAllCts: true,
        hiddenUntilCaught: true,
        runThreeOnly: true, // absent des dex tant que non capturé en run 3 (jumeau run-3 de Gékroc)
    },
    // 🪨🌑 GÉCKÈBRE — 4e membre de la famille Gek (clone de la GROTTE DU NEXUS). MÊME golem, RE-TYPÉ ROCHE/TÉNÈBRES,
    //   PERSONNALITÉ = MUR IMMUABLE (def 120, le plus lent). Masqué du dex jusqu'à capture. learnsAllCts.
    geckebre: {
        id: "geckebre", dexNo: 180, name: "Géckèbre", types: ["SOL", "TENEBRES"],
        baseStats: { hp: 120, atk: 60, def: 125, spe: 35, spc: 70 }, // BST 410 — MUR PHYSIQUE INCREVABLE (HP+Déf extrêmes, ultra-lent)
        learnset: [
            { level: 1, moveId: "vive_attaque" },
            { level: 1, moveId: "morsure_sombre" },   // STAB TÉNÈBRES physique
            { level: 1, moveId: "tunnel" },            // STAB SOL (creuse-invulnérable)
            { level: 1, moveId: "repos" },             // mur → auto-soin
            { level: 1, moveId: "secousse" },          // STAB SOL physique (dès le départ)
            { level: 48, moveId: "eboulis" },          // couverture ROCHE (apeure)
            { level: 56, moveId: "onde_obscure" },     // TÉNÈBRES (peut apeurer)
            { level: 66, moveId: "lame_roche" },       // couverture ROCHE
            { level: 72, moveId: "seisme" },           // gros STAB SOL
            { level: 80, moveId: "devoreur_ombres" },  // gros STAB TÉNÈBRES (siphon)
            { level: 88, moveId: "frappe_atlas" },     // capstone SOL : dégâts = NIVEAU (ignore son atk faible → parfait pour le mur)
        ],
        catchRate: 10, baseExp: 180, rarity: "RARE", growthRate: "medium_fast", exclusive: true,
        role: "Gek de la Grotte — SOL/TÉNÈBRES, mur immuable, apprend TOUTES les CT",
        description: "Golem fossile jumeau de Gékroc, mais sa pierre a viré à l'obsidienne : un cœur d'ombre bat sous sa carapace impénétrable. Rien ne semble pouvoir l'ébranler.",
        sprite: "/yellow/sprites/dex/geckebre.png",
        learnsAllCts: true,
        hiddenUntilCaught: true,
    },
    // 🪨💧 GEAUCKÉ — 5e membre de la famille Gek (clone de la GROTTE DU NEXUS). MÊME golem, RE-TYPÉ ROCHE/EAU,
    //   PERSONNALITÉ = VIF FRAGILE (vit 95, bulk en retrait). Masqué du dex jusqu'à capture. learnsAllCts.
    geaucke: {
        id: "geaucke", dexNo: 181, name: "Geaucké", types: ["ROCHE", "EAU"],
        baseStats: { hp: 60, atk: 115, def: 55, spe: 125, spc: 55 }, // BST 410 — SPRINTER PHYSIQUE (Vit+Atk extrêmes ; frappe vite, en papier)
        learnset: [
            { level: 1, moveId: "vive_attaque" },
            { level: 1, moveId: "pistolet_a_o" },      // STAB EAU spécial
            { level: 1, moveId: "tunnel" },
            { level: 1, moveId: "repos" },
            { level: 1, moveId: "secousse" },          // frappe ROCHE/SOL physique
            { level: 40, moveId: "osmose" },           // signature EAU vicieuse : draine des PV chaque tour (jumeau EAU de Vampigraine)
            { level: 48, moveId: "eboulis" },          // STAB ROCHE physique
            { level: 56, moveId: "jet_boueux" },       // baisse-vitesse GARANTI (−1 Vit) → le sprinter garde l'initiative
            { level: 66, moveId: "lame_roche" },       // STAB ROCHE
            { level: 72, moveId: "seisme" },
            { level: 80, moveId: "deferlante" },       // gros STAB EAU
            { level: 88, moveId: "roc_titanesque" },   // capstone ROCHE
        ],
        catchRate: 10, baseExp: 180, rarity: "RARE", growthRate: "medium_fast", exclusive: true,
        role: "Gek de la Grotte — ROCHE/EAU, sprinter fragile, apprend TOUTES les CT",
        description: "Golem fossile jumeau de Gékroc, mais sa pierre s'est muée en geyser : des jets d'eau propulsent sa carcasse rocheuse à une vitesse stupéfiante. Frappe vite, encaisse mal.",
        sprite: "/yellow/sprites/dex/geaucke.png",
        learnsAllCts: true,
        hiddenUntilCaught: true,
    },
    // 🦇⚡ BATCHU → SUPABATCHU — chauves-souris ÉLECTRIQUES : petits annoyers FULGURANTS & fragiles. BST volontairement
    //   BAS (sa force = Vitesse + statut, pas les chiffres). Évolution TARDIVE (niv 55) mais courbe RAPIDE (medium_fast).
    //   Kit : priorité, confusion, paralysie, poison grave, drain de vie. ÉLEC/VOL → IMMUNISÉ SOL (le VOL annule la faiblesse).
    batchu: {
        id: "batchu", dexNo: 182, name: "Batchu", types: ["ELEC", "VOL"],
        baseStats: { hp: 38, atk: 35, def: 32, spe: 90, spc: 50 }, // BST 245 — nabot fulgurant & FRÊLE (annoyer)
        learnset: [
            { level: 1, moveId: "vive_attaque" },   // PRIORITÉ (revenge / pioche)
            { level: 1, moveId: "etincelle" },       // STAB ÉLEC (peut paralyser)
            { level: 6, moveId: "onde_folie" },      // CONFUSION (rend fou)
            { level: 12, moveId: "vampelec" },       // signature : DRAIN 50 % (draine la vie)
            { level: 18, moveId: "toxik" },          // POISON GRAVE (empoisonne)
            { level: 26, moveId: "cage_eclair" },    // PARALYSIE garantie
            { level: 34, moveId: "fulgurance" },     // gros STAB ÉLEC (90)
            { level: 44, moveId: "fonce_bec" },      // STAB VOL (75)
        ],
        evolution: { toId: "supabatchu", method: { kind: "LEVEL", level: 55 } },
        catchRate: 90, baseExp: 55, rarity: "UNCOMMON", growthRate: "medium_fast",
        role: "ÉLEC/VOL — chauve-souris étincelle, annoyer fulgurant & frêle (base)",
        description: "Minuscule chauve-souris aux ailes crépitantes de statique. Frêle et nerveuse, elle file en zigzag et harcèle de décharges avant même qu'on la repère.",
        sprite: "/yellow/sprites/dex/batchu.png",
    },
    supabatchu: {
        id: "supabatchu", dexNo: 183, name: "Supabatchu", types: ["ELEC", "VOL"],
        baseStats: { hp: 62, atk: 48, def: 58, spe: 120, spc: 112 }, // BST 400 — TRÈS rapide (verre-canon annoyer)
        learnset: [
            { level: 1, moveId: "vive_attaque" },
            { level: 1, moveId: "etincelle" },
            { level: 1, moveId: "onde_folie" },
            { level: 1, moveId: "vampelec" },
            { level: 1, moveId: "toxik" },
            { level: 1, moveId: "cage_eclair" },
            { level: 1, moveId: "fulgurance" },
            { level: 1, moveId: "fonce_bec" },
            { level: 55, moveId: "ultrasons" },      // CONFUSION + −Précision (disrupteur d'entrée d'évo)
            { level: 64, moveId: "ultra_foudre" },   // gros STAB ÉLEC (110)
            { level: 74, moveId: "pique_fatal" },    // STAB VOL nuke (90, recul)
        ],
        catchRate: 45, baseExp: 158, rarity: "RARE", growthRate: "medium_fast",
        role: "ÉLEC/VOL — chauve-souris supersonique, très rapide (verre-canon annoyer)",
        description: "Chauve-souris supersonique dont les ailes fendent l'air en crépitant d'éclairs. Fulgurante et insaisissable : elle frappe, mord et disparaît avant la moindre riposte.",
        sprite: "/yellow/sprites/dex/supabatchu.png",
    },
    // 🔥👻 / 🌊🌑 CRÉATIONS CANONISÉES — Phoéchaud (création de GUILLAUME, FEU/SPECTRE) & sa némésis Léviabysse
    //   (EAU/TÉNÈBRES). Stats/learnsets/sprites finalisés avec Sartay. Léviabysse = HARD-COUNTER de Phoéchaud
    //   (cf. CANONICAL_NEMESIS) : résiste ses 2 STAB (×0.5), mur spécial (Spé 132), riposte ×2 (Eau/Feu, Ténèbres/Spectre).
    phoechaudi: {
        id: "phoechaudi", dexNo: 184, name: "Phoéchaudi", types: ["FEU","SPECTRE"],
        baseStats: { hp: 48, atk: 19, def: 43, spe: 66, spc: 75 }, // BST 251
        learnset: [ { level: 5, moveId: "charge" }, { level: 5, moveId: "jet_de_sable" }, { level: 12, moveId: "tison" }, { level: 18, moveId: "flammeche" }, { level: 24, moveId: "drain_ame" }, { level: 30, moveId: "hurlement" }, { level: 36, moveId: "ball_ombre" }, { level: 42, moveId: "lance_flammes" }, { level: 48, moveId: "cage_eclair" }, { level: 54, moveId: "boutefeu" } ],
        evolution: { toId: "phoechaudii", method: { kind: "LEVEL", level: 22 } },
        catchRate: 45, baseExp: 113, rarity: "RARE", growthRate: "slow", secretTalent: "sang_froid",
        role: "FEU/SPECTRE — offensif spécial (création)",
        description: "Un poussin de phoenix mauve, un peu lugubre (type spectre) — Condescendant — 🖋️ Création de Guillaume",
        sprite: "/yellow/sprites/dex/phoechaud1.png",
    },
    phoechaudii: {
        id: "phoechaudii", dexNo: 185, name: "Phoéchaudii", types: ["FEU","SPECTRE"],
        baseStats: { hp: 65, atk: 26, def: 58, spe: 89, spc: 102 }, // BST 340
        learnset: [ { level: 5, moveId: "charge" }, { level: 5, moveId: "jet_de_sable" }, { level: 12, moveId: "tison" }, { level: 18, moveId: "flammeche" }, { level: 24, moveId: "drain_ame" }, { level: 30, moveId: "hurlement" }, { level: 36, moveId: "ball_ombre" }, { level: 42, moveId: "lance_flammes" }, { level: 48, moveId: "cage_eclair" }, { level: 54, moveId: "boutefeu" } ],
        evolution: { toId: "phoechaudiii", method: { kind: "LEVEL", level: 40 } },
        catchRate: 45, baseExp: 153, rarity: "RARE", growthRate: "slow", secretTalent: "sang_froid",
        role: "FEU/SPECTRE — offensif spécial (création)",
        description: "Un poussin de phoenix mauve, un peu lugubre (type spectre) — Condescendant — 🖋️ Création de Guillaume",
        sprite: "/yellow/sprites/dex/phoechaud2.png",
    },
    phoechaudiii: {
        id: "phoechaudiii", dexNo: 186, name: "Phoéchaudiii", types: ["FEU","SPECTRE"],
        baseStats: { hp: 85, atk: 34, def: 75, spe: 115, spc: 132 }, // BST 441
        learnset: [ { level: 5, moveId: "charge" }, { level: 5, moveId: "jet_de_sable" }, { level: 12, moveId: "tison" }, { level: 18, moveId: "flammeche" }, { level: 24, moveId: "drain_ame" }, { level: 30, moveId: "hurlement" }, { level: 36, moveId: "ball_ombre" }, { level: 42, moveId: "lance_flammes" }, { level: 48, moveId: "cage_eclair" }, { level: 54, moveId: "boutefeu" } ],
        catchRate: 45, baseExp: 198, rarity: "RARE", growthRate: "slow", secretTalent: "sang_froid",
        role: "FEU/SPECTRE — offensif spécial (création)",
        description: "Un phoenix mauve/noir, avec autour des flammes type spectre. Il doit être lugubre. — Condescendant — 🖋️ Création de Guillaume",
        sprite: "/yellow/sprites/dex/phoechaud3.png",
    },
    obscurene: {
        id: "obscurene", dexNo: 187, name: "Obscurène", types: ["EAU","TENEBRES"],
        baseStats: { hp: 63, atk: 23, def: 75, spe: 6, spc: 75 }, // BST 242
        learnset: [ { level: 5, moveId: "pistolet_a_o" }, { level: 5, moveId: "morsure_sombre" }, { level: 12, moveId: "onde_obscure" }, { level: 18, moveId: "carapace_diamant" }, { level: 24, moveId: "lame_eau" }, { level: 30, moveId: "osmose" }, { level: 36, moveId: "deferlante" }, { level: 42, moveId: "devoreur_ombres" }, { level: 48, moveId: "ultralaser" }, { level: 54, moveId: "hydrocanon" } ],
        evolution: { toId: "abyssombre", method: { kind: "LEVEL", level: 22 } },
        catchRate: 45, baseExp: 109, rarity: "RARE", growthRate: "slow", secretTalent: "sang_froid",
        role: "EAU/TENEBRES — défensif spécial (création)",
        description: "Une murène des abysses tapie dans l'eau noire, l'œil luisant. — froid, patient, implacable",
        sprite: "/yellow/sprites/dex/obscurene.png",
    },
    abyssombre: {
        id: "abyssombre", dexNo: 188, name: "Abyssombre", types: ["EAU","TENEBRES"],
        baseStats: { hp: 85, atk: 31, def: 102, spe: 8, spc: 102 }, // BST 328
        learnset: [ { level: 5, moveId: "pistolet_a_o" }, { level: 5, moveId: "morsure_sombre" }, { level: 12, moveId: "onde_obscure" }, { level: 18, moveId: "carapace_diamant" }, { level: 24, moveId: "lame_eau" }, { level: 30, moveId: "osmose" }, { level: 36, moveId: "deferlante" }, { level: 42, moveId: "devoreur_ombres" }, { level: 48, moveId: "ultralaser" }, { level: 54, moveId: "hydrocanon" } ],
        evolution: { toId: "leviabysse", method: { kind: "LEVEL", level: 40 } },
        catchRate: 45, baseExp: 148, rarity: "RARE", growthRate: "slow", secretTalent: "sang_froid",
        role: "EAU/TENEBRES — défensif spécial (création)",
        description: "Une murène des abysses tapie dans l'eau noire, l'œil luisant. — froid, patient, implacable",
        sprite: "/yellow/sprites/dex/abyssombre.png",
    },
    leviabysse: {
        id: "leviabysse", dexNo: 189, name: "Léviabysse", types: ["EAU","TENEBRES"],
        baseStats: { hp: 110, atk: 40, def: 132, spe: 10, spc: 132 }, // BST 424
        learnset: [ { level: 5, moveId: "pistolet_a_o" }, { level: 5, moveId: "morsure_sombre" }, { level: 12, moveId: "onde_obscure" }, { level: 18, moveId: "carapace_diamant" }, { level: 24, moveId: "lame_eau" }, { level: 30, moveId: "osmose" }, { level: 36, moveId: "deferlante" }, { level: 42, moveId: "devoreur_ombres" }, { level: 48, moveId: "ultralaser" }, { level: 54, moveId: "hydrocanon" } ],
        catchRate: 45, baseExp: 191, rarity: "RARE", growthRate: "slow", secretTalent: "sang_froid",
        role: "EAU/TENEBRES — défensif spécial (création)",
        description: "Léviathan des abysses : il noie les flammes et engloutit les âmes. Le chasseur né du phénix maudit. — froid, patient, implacable",
        sprite: "/yellow/sprites/dex/leviabysse.png",
    },
    // ═══════════════ LIGNE TÉNÈBRES — Joeyrrant → Wallabisan → Kangoudead (dexNo 200-202, run 3) ═══════════════
    // CANON d'une CRÉATION de joueur (Jacanon, post-Ligue run 1) : larve-crevette noire → wallaby mort-vivant à bras
    // d'os → kangourou squelettique sans mâchoire. « Ce sont SES Daemons » → TOUT porté FIDÈLEMENT (buildCustomSpecies) :
    // stats (BST 198/300/440), learnset PARTAGÉ (identique aux 3 stades), éclosion tardive (courbe `slow`, évo 22/40),
    // talent caché « chair_coriace ». Tank offensif mixte (atk 110 = spc 110, énorme PV 132). Le TYPE change : le stade 1
    // est TÉNÈBRES/FEU puis la lignée devient TÉNÈBRES/GLACE dès le stade 2 (souffle_polaire = STAB Glace niv 42).
    joeyrrant: {
        id: "joeyrrant", dexNo: 200, name: "Joeyrrant", types: ["TENEBRES", "FEU"],
        baseStats: { hp: 59, atk: 50, def: 19, spe: 20, spc: 50 }, // BST 198
        learnset: [
            { level: 5, moveId: "morsure_sombre" }, { level: 5, moveId: "ultrasons" },
            { level: 12, moveId: "charge" }, { level: 18, moveId: "vive_attaque" },
            { level: 24, moveId: "onde_obscure" }, { level: 30, moveId: "jet_de_sable" },
            { level: 36, moveId: "toxik" }, { level: 42, moveId: "souffle_polaire" },
            { level: 48, moveId: "berceuse" }, { level: 54, moveId: "devoreur_ombres" },
        ],
        evolution: { toId: "wallabisan", method: { kind: "LEVEL", level: 22 } },
        catchRate: 45, baseExp: 89, rarity: "RARE", growthRate: "slow", secretTalent: "chair_coriace",
        role: "Ténèbres/Feu — tank offensif (éclosion tardive)",
        description: "Larve-crevette noire, sans yeux, qui s'accroche à sa mère pour ne pas lâcher la vie. — Timide et rancunier — 🖋️ Création de Jacanon",
        sprite: "/yellow/sprites/dex/joeyrrant.png",
    },
    wallabisan: {
        id: "wallabisan", dexNo: 201, name: "Wallabisan", types: ["TENEBRES", "GLACE"],
        baseStats: { hp: 90, atk: 75, def: 29, spe: 31, spc: 75 }, // BST 300
        learnset: [
            { level: 5, moveId: "morsure_sombre" }, { level: 5, moveId: "ultrasons" },
            { level: 12, moveId: "charge" }, { level: 18, moveId: "vive_attaque" },
            { level: 24, moveId: "onde_obscure" }, { level: 30, moveId: "jet_de_sable" },
            { level: 36, moveId: "toxik" }, { level: 42, moveId: "souffle_polaire" },
            { level: 48, moveId: "berceuse" }, { level: 54, moveId: "devoreur_ombres" },
        ],
        evolution: { toId: "kangoudead", method: { kind: "LEVEL", level: 40 } },
        catchRate: 45, baseExp: 135, rarity: "RARE", growthRate: "slow", secretTalent: "chair_coriace",
        role: "Ténèbres/Glace — tank offensif",
        description: "Petit wallaby noir dont un bras n'est plus que de l'os : à mi-chemin du mort-vivant. — Timide et rancunier — 🖋️ Création de Jacanon",
        sprite: "/yellow/sprites/dex/wallabisan.png",
    },
    kangoudead: {
        id: "kangoudead", dexNo: 202, name: "Kangoudead", types: ["TENEBRES", "GLACE"],
        baseStats: { hp: 132, atk: 110, def: 43, spe: 45, spc: 110 }, // BST 440 — tank offensif mixte (atk=spc=110)
        learnset: [
            { level: 5, moveId: "morsure_sombre" }, { level: 5, moveId: "ultrasons" },
            { level: 12, moveId: "charge" }, { level: 18, moveId: "vive_attaque" },
            { level: 24, moveId: "onde_obscure" }, { level: 30, moveId: "jet_de_sable" },
            { level: 36, moveId: "toxik" }, { level: 42, moveId: "souffle_polaire" },
            { level: 48, moveId: "berceuse" }, { level: 54, moveId: "devoreur_ombres" },
        ],
        catchRate: 45, baseExp: 198, rarity: "RARE", growthRate: "slow", secretTalent: "chair_coriace",
        role: "Ténèbres/Glace — tank offensif (mort-vivant)",
        description: "Kangourou noir mort-vivant, sans mâchoire inférieure : tout son flanc droit n'est plus qu'un squelette. — Timide et rancunier — 🖋️ Création de Jacanon",
        sprite: "/yellow/sprites/dex/kangoudead.png",
    },
    // ═══════ 🐉🪨 MÉGAMONARX — 3ᵉ LÉGENDAIRE (« fusion infinie » à l'identité propre) ═══════
    //   Obtenu UNIQUEMENT en remportant la Ligue de Fusion avec un Dracolithe (Draconarque×Megalithe) niv 100 dans
    //   l'équipe → il se matérialise en vrai Daemon officiel gardable (cf. grantMegamonarx / battleStore). Secret :
    //   hiddenUntilCaught → « N°203 · ??? » jusqu'à obtention. Stats boostées au rang légendaire depuis ses 2 sources
    //   (mur Megalithe hp/def + offense Draconarque atk) ; TRÈS lent (vit 55) pour laisser l'adversaire agir.
    megamonarx: {
        id: "megamonarx", dexNo: 203, name: "MégamonarX", types: ["DRAGON", "ROCHE"],
        baseStats: { hp: 205, atk: 175, def: 170, spe: 55, spc: 145 }, // BST 750 — colosse ultra-lent (Megalithe × Draconarque, boosté légendaire)
        learnset: [
            { level: 1, moveId: "jet_pierres" }, { level: 1, moveId: "draco_souffle" },
            { level: 30, moveId: "lame_roche" }, { level: 44, moveId: "danse_lames" },
            { level: 55, moveId: "griffe_draconique" }, { level: 66, moveId: "roc_titanesque" },
            { level: 80, moveId: "souffle_primordial" },
        ],
        catchRate: 3, baseExp: 300, rarity: "LEGENDARY", growthRate: "slow", hiddenUntilCaught: true, exclusive: true,
        role: "Dragon/Roche — LÉGENDAIRE (fusion infinie, mur-cogneur ultra-lent)",
        description: "MégamonarX — l'apogée absolue de la fusion. Quand un Dracolithe atteint la perfection et triomphe de la Ligue, la roche et le dragon ne font plus qu'un : un colosse de pierre vivante hérissé de cristaux, dont chaque pas fait trembler le Nexus. On le dit immortel.",
        sprite: "/yellow/sprites/dex/megamonarx.png",
    },
    // ═══════ 🐈‍⬛ GALIJAH — 4ᵉ et DERNIER LÉGENDAIRE (paisible, façon Mew) ═══════
    //   Apparaît au niveau moyen de l'équipe ~3-4 pas après la 150ᵉ capture du jour (capture méthode légendaire) ;
    //   à défaut, OFFERT au 200ᵉ Daemon différent du Pokédex. Apprend les CT de TOUS les types SAUF Ténèbres
    //   (learnsAllCts + learnsAllCtsExcept). Secret : hiddenUntilCaught → « N°204 · ??? » jusqu'à obtention.
    galijah: {
        id: "galijah", dexNo: 204, name: "Galijah", types: ["FEE", "SPECTRE"],
        baseStats: { hp: 120, atk: 100, def: 105, spe: 125, spc: 150 }, // BST 600 — polyvalent rapide/spécial (façon Mew)
        learnset: [
            { level: 1, moveId: "leche" }, { level: 1, moveId: "bourrasque_feerique" }, { level: 1, moveId: "choc_mental" },
            { level: 12, moveId: "onde_folie" }, { level: 18, moveId: "drain_ame" }, { level: 24, moveId: "voile_feerique" },
            { level: 30, moveId: "griffe_spectrale" }, { level: 38, moveId: "eveil_divin" }, { level: 46, moveId: "eclat_lunaire" },
            { level: 54, moveId: "ball_ombre" }, { level: 62, moveId: "vague_mentale" }, { level: 72, moveId: "cataclysme_lunaire" },
        ],
        catchRate: 3, baseExp: 280, rarity: "LEGENDARY", growthRate: "slow", hiddenUntilCaught: true, exclusive: true,
        learnsAllCts: true, learnsAllCtsExcept: ["TENEBRES"], // façon Mew : apprend TOUS les types sauf Ténèbres
        role: "Fée/Spectre — LÉGENDAIRE polyvalent (façon Mew)",
        description: "Galijah — créature paisible et joueuse que l'on croyait légende. On raconte qu'elle porte en elle l'empreinte de tous les Daemons : elle imite n'importe quelle technique (hormis les ténèbres, qu'elle fuit). Elle n'apparaît qu'aux dresseurs les plus assidus, un jour de grande chasse.",
        sprite: "/yellow/sprites/dex/galijah.png",
    },
    // 🐊🪨 CROCAVERN — EXCLUSIF de la Grotte du Nexus (échange PNJ 6 + ultra-rare dans les bancs de sable). Colosse
    //   ROCHE/PLANTE : lent, défense solide, ATTAQUE monstrueuse. Mono-stade (pas d'évolution). Courbe RAPIDE.
    //   ROCHE = physique (son arme, ATQ 128) ; PLANTE = spécial → thématique/défensif (Vampigraine, drains).
    crocavern: {
        id: "crocavern", dexNo: 190, name: "Crocavern", types: ["SOL"],
        baseStats: { hp: 90, atk: 128, def: 102, spe: 40, spc: 62 }, // BST 422
        learnset: [
            { level: 1, moveId: "charge" }, { level: 1, moveId: "secousse" },        // STAB SOL dès le départ
            { level: 6, moveId: "tir_boue" },                                        // SOL (peut baisser la précision)
            { level: 12, moveId: "jet_de_sable" },                                   // SOL statut : baisse la précision de la cible (utilitaire)
            { level: 18, moveId: "carapace_diamant" },                              // Déf+2 (encaisse)
            { level: 24, moveId: "faille_sismique" },                              // SOL 90, Déf+1
            { level: 30, moveId: "danse_lames" },                                  // Atk+2 (setup)
            { level: 36, moveId: "seisme" },                                        // gros STAB SOL
            { level: 44, moveId: "sables_voraces" },                              // ★ SIGNATURE 1 : drain SOL PHYSIQUE (longévité, ex-type PLANTE)
            { level: 52, moveId: "repos" },                                        // soin
            { level: 62, moveId: "fracas_colosse" },                              // ★ SIGNATURE 2 : SOL 105, 25% de fissurer AU HASARD 1 stat de la cible
            { level: 74, moveId: "frappe_atlas" },                                // capstone SOL (dégâts = niveau)
        ],
        catchRate: 5, baseExp: 185, rarity: "RARE", growthRate: "fast", secretTalent: "sang_froid", postLeague: true,
        role: "SOL — colosse physique lent, drain tellurique (exclusif Grotte du Nexus)",
        description: "Un crocodile des sables, tapi dans les bancs de terre depuis des âges oubliés. Lent, mais d'une force qui engloutit ses proies sous le sol pour s'en repaître.",
        sprite: "/yellow/sprites/dex/crocavern.png",
    },
    // 🦛🔮 HYPNOPPO → TÉLÉPPO → OMNHIPPO — lignée mono-PSY inédite du run 3 (l'ENDORMEUR : hypnose → contrôle → sweep).
    hypnoppo: {
        id: "hypnoppo", dexNo: 157, name: "Hypnoppo", types: ["PSY"],
        baseStats: { hp: 70, atk: 32, def: 52, spe: 48, spc: 66 }, // BST 268
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 4, moveId: "vive_attaque" },
            { level: 7, moveId: "choc_mental" },     // 1er STAB PSY
            { level: 11, moveId: "hypnose" },        // signature : endort tôt
            { level: 14, moveId: "visee" },          // fiabilise l'hypnose
        ],
        evolution: { toId: "teleppo", method: { kind: "LEVEL", level: 16 } },
        catchRate: 45, baseExp: 62, rarity: "UNCOMMON", growthRate: "medium_fast",
        role: "Psy — hippo hypnotiseur frêle (base)",
        description: "Hippopotame trapu au regard lourd et somnolent. D'un lent battement de paupières, il plonge ses proies dans un demi-sommeil avant même de les toucher. Son vrai pouvoir est mental, pas physique.",
        sprite: "/yellow/sprites/dex/hypnoppo.png",
    },
    teleppo: {
        id: "teleppo", dexNo: 158, name: "Téléppo", types: ["PSY"],
        baseStats: { hp: 84, atk: 42, def: 62, spe: 80, spc: 86 }, // BST 354
        learnset: [
            { level: 1, moveId: "choc_mental" },
            { level: 1, moveId: "hypnose" },
            { level: 1, moveId: "vive_attaque" },
            { level: 18, moveId: "onde_folie" },     // confusion
            { level: 22, moveId: "elan" },           // +Vitesse (téléporteur)
            { level: 26, moveId: "focalisation" },   // +Spé (set-up)
            { level: 30, moveId: "onde_cerebrale" }, // signature télépathe (débuff)
        ],
        evolution: { toId: "omnhippo", method: { kind: "LEVEL", level: 34 } },
        catchRate: 45, baseExp: 120, rarity: "RARE", growthRate: "medium_fast",
        role: "Psy — hippo télépathe/téléporteur (mid)",
        description: "Hippo télépathe dont le troisième œil clignote sans cesse. Il se dématérialise et resurgit à l'autre bout du réacteur en un souffle. Déjà un attaquant spécial, mais bridé tant qu'il n'a pas atteint sa forme ultime.",
        sprite: "/yellow/sprites/dex/teleppo.png",
    },
    omnhippo: {
        id: "omnhippo", dexNo: 159, name: "Omnhippo", types: ["PSY"],
        baseStats: { hp: 100, atk: 50, def: 75, spe: 100, spc: 110 }, // BST 435
        learnset: [
            { level: 1, moveId: "choc_mental" },
            { level: 1, moveId: "hypnose" },
            { level: 1, moveId: "onde_folie" },
            { level: 1, moveId: "focalisation" },
            { level: 1, moveId: "onde_cerebrale" },
            { level: 1, moveId: "vive_attaque" },
            { level: 38, moveId: "vague_mentale" },  // gros STAB PSY
            { level: 44, moveId: "repos" },          // soin on-type
            { level: 52, moveId: "mirage" },         // +2 esquive
            { level: 66, moveId: "eveil_divin" },    // capstone snowball (+Spé/coup)
        ],
        catchRate: 30, baseExp: 180, rarity: "RARE", growthRate: "medium_fast",
        role: "Psy — sweeper spécial endurant (pépite du couvoir)",
        description: "Colosse psychique auréolé d'ailes d'énergie, aux yeux multiples ouverts sur tout. Il perçoit chaque pensée du réacteur et frappe avant même que l'adversaire ait décidé d'attaquer : offensive écrasante, mais un mastodonte increvable plutôt qu'un dieu de verre.",
        sprite: "/yellow/sprites/dex/omnhippo.png",
    },
    // 🌿🔮 KARMAKI — moine-plante en méditation (PLANTE/PSY, double STAB spécial). Pivot défensif « de l'Équilibre »
    // (vampigraine + brume_sporale reset + drain + soin) qui devient le « Sage Karmique » avec focalisation + Patience
    // (rétribution ∝ PV encaissés). Mono-stade, grande fourchette de niveau en sauvage.
    karmaki: {
        id: "karmaki", dexNo: 160, name: "Karmaki", types: ["PLANTE", "PSY"],
        baseStats: { hp: 103, atk: 50, def: 102, spe: 60, spc: 115 }, // BST 430 — mur-mage patient (ATQ/VIT dumpées)
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 5, moveId: "fouet_lianes" },    // STAB Plante
            { level: 10, moveId: "choc_mental" },    // STAB Psy
            { level: 15, moveId: "vampigraine" },    // SEEDED — chip karmique
            { level: 18, moveId: "mega_sangsue" },   // drain-soin
            { level: 25, moveId: "brume_sporale" },  // ÉGALISEUR — annule tous les boosts
            { level: 30, moveId: "tranche_feuille" },// STAB Plante (highCrit)
            { level: 36, moveId: "vague_mentale" },  // gros STAB Psy
            { level: 44, moveId: "repos" },          // survie
            { level: 58, moveId: "focalisation" },   // +Spé (bascule Sage Karmique)
            { level: 66, moveId: "patience" },       // signature : rétribution ∝ PV encaissés
        ],
        catchRate: 45, baseExp: 170, rarity: "RARE", growthRate: "medium_fast",
        role: "Plante/Psy — moine de l'Équilibre → sage karmique (pivot défensif)",
        description: "Moine-plante en méditation perpétuelle, flottant en position du lotus, une liane-fleur enroulée sous lui. Il cherche l'équilibre : il annule les excès, draine ce qu'on lui inflige, et rend le karma — plus il a enduré, plus sa Patience frappe fort.",
        sprite: "/yellow/sprites/dex/karmaki.png",
    },

    // ═══════════════ MAISON COMBAT + GROTTE — RUN 3 (dexNo 161-164, espèces INÉDITES) ═══════════════
    // 🐸 LIGNÉE GRENOUILLE-NINJA Otama → Gamaruto → Uzumaro (COMBAT/EAU) : tank-sétuppeur MIXTE à croissance LENTE
    //    (très faible tôt, très fort tard). Peu de PV mais gros murs (DÉF/SPÉ) + kit de boosts (esquive/vit/for/spé)
    //    + baisse de précision + multi-coups. Évos tardives (25/45). Peuple la Maison Hantée re-typée Combat.
    otama: {
        id: "otama", dexNo: 161, name: "Otama", types: ["COMBAT", "EAU"],
        baseStats: { hp: 45, atk: 42, def: 48, spe: 40, spc: 45 }, // BST 220 — têtard frêle (croissance lente)
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 1, moveId: "jet_de_sable" },   // baisse la précision adverse
            { level: 6, moveId: "mirage" },          // +2 esquive
            { level: 12, moveId: "poing_karate" },   // STAB Combat (crit)
            { level: 18, moveId: "pistolet_a_o" },   // STAB Eau
            { level: 24, moveId: "double_pied" },    // multi-coups ×2
        ],
        evolution: { toId: "gamaruto", method: { kind: "LEVEL", level: 25 } },
        catchRate: 45, baseExp: 60, rarity: "UNCOMMON", growthRate: "slow",
        role: "Combat/Eau — têtard frêle (base, éclosion tardive)",
        description: "Petit têtard tout rond au sourire benêt, coiffé d'un origami. Frêle et lent à mûrir, mais on murmure qu'il couve un guerrier des eaux.",
        sprite: "/yellow/sprites/dex/otama.png",
    },
    gamaruto: {
        id: "gamaruto", dexNo: 162, name: "Gamaruto", types: ["COMBAT", "EAU"],
        baseStats: { hp: 58, atk: 74, def: 76, spe: 64, spc: 72 }, // BST 344
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 1, moveId: "jet_de_sable" },
            { level: 1, moveId: "mirage" },
            { level: 1, moveId: "poing_karate" },
            { level: 1, moveId: "pistolet_a_o" },
            { level: 1, moveId: "double_pied" },
            { level: 25, moveId: "elan" },           // +1 Vitesse
            { level: 30, moveId: "lame_eau" },        // STAB Eau (peut −Vit)
            { level: 36, moveId: "mur_de_fer" },      // +1 Défense
            { level: 42, moveId: "balayage" },        // Combat (peut apeurer)
        ],
        evolution: { toId: "uzumaro", method: { kind: "LEVEL", level: 45 } },
        catchRate: 45, baseExp: 120, rarity: "RARE", growthRate: "slow",
        role: "Combat/Eau — grenouille-ninja agile (mid)",
        description: "Grenouille-ninja au regard perçant, un jutsu d'eau au creux de la main. Vive et rusée, elle esquive et harcèle — le stade que le Collectionneur veut voir.",
        sprite: "/yellow/sprites/dex/gamaruto.png",
    },
    uzumaro: {
        id: "uzumaro", dexNo: 163, name: "Uzumaro", types: ["COMBAT", "EAU"],
        baseStats: { hp: 68, atk: 112, def: 106, spe: 84, spc: 110 }, // BST 480 — tank-sétuppeur MIXTE (peu de PV, gros murs)
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 1, moveId: "jet_de_sable" },
            { level: 1, moveId: "mirage" },
            { level: 1, moveId: "poing_karate" },
            { level: 1, moveId: "pistolet_a_o" },
            { level: 1, moveId: "double_pied" },
            { level: 1, moveId: "elan" },
            { level: 1, moveId: "lame_eau" },
            { level: 45, moveId: "crochet_maitre" },   // STAB Combat (crit)
            { level: 50, moveId: "deferlante" },        // gros STAB Eau (95)
            { level: 55, moveId: "danse_lames" },       // +2 Attaque
            { level: 60, moveId: "focalisation" },      // +1 Spé
            { level: 66, moveId: "deluge_crochets" },   // multi-coups ×2-5 (chance)
            { level: 72, moveId: "carapace_diamant" },  // +2 Défense
            { level: 80, moveId: "hydrocanon" },        // capstone Eau (110)
        ],
        catchRate: 45, baseExp: 190, rarity: "RARE", growthRate: "slow",
        role: "Combat/Eau — sage-crapaud tank-sétuppeur mixte (final)",
        description: "Crapaud-sage massif aux bras croisés, marqué de motifs de guerre. Peu de PV mais une garde de fer : il encaisse en empilant les boosts, puis balaie de ses poings ET de ses raz-de-marée.",
        sprite: "/yellow/sprites/dex/uzumaro.png",
    },
    // 🌳👻 WISTREE — SPECTRE/PLANTE, mono, rare & mystérieux. Rôle INÉDIT : « le Voleur d'Éclat » — il siphonne les
    //    boosts positifs de la cible (signature Vol d'Éclat) puis frappe. Mur-disrupteur spécial. Spawn rare de la Grotte.
    wistree: {
        id: "wistree", dexNo: 164, name: "Wistree", types: ["SPECTRE", "PLANTE"],
        baseStats: { hp: 90, atk: 73, def: 95, spe: 72, spc: 100 }, // BST 430 — voleur d'éclat MIXTE (Spectre phys + Plante spé)
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 1, moveId: "fouet_lianes" },   // STAB Plante
            { level: 7, moveId: "malediction" },    // Spectre : +DÉF self / −VIT cible
            { level: 14, moveId: "onde_folie" },    // confusion
            { level: 22, moveId: "focalisation" },  // +1 Spé
            { level: 30, moveId: "ball_ombre" },    // STAB Spectre physique (base ATQ 73) — paie surtout combiné à vol_d_eclat (L48), qui SIPHONNE l'ATQ boostée de l'adversaire
            { level: 38, moveId: "tempete_verte" }, // gros STAB Plante (90)
            { level: 48, moveId: "vol_d_eclat" },   // SIGNATURE : vole les boosts adverses
            { level: 66, moveId: "lance_soleil" },  // capstone Plante (120)
        ],
        catchRate: 30, baseExp: 175, rarity: "RARE", growthRate: "medium_fast",
        role: "Spectre/Plante — voleur d'éclat (mur-disrupteur spécial)",
        description: "Esprit sylvestre gris et éthéré, couronné de fleurs et de baies, aux yeux luisants. Rare et cryptique, il flotte en silence… puis siphonne la puissance de quiconque ose se renforcer devant lui.",
        sprite: "/yellow/sprites/dex/wistree.png",
    },

    // ═══════════════ LIGNE EAU/GLACE — Guizer → Dalugazer → Moby D (dexNo 165-167, run 3) ═══════════════
    // CANON d'une CRÉATION de joueur (Task1, post-Ligue) : béluga kawaï → orque albinos ailée « Moby Dick ».
    // « Ce sont SES Daemons » → TOUT porté FIDÈLEMENT du créateur : stats (BST 200/301/442), learnset PARTAGÉ
    // (identique aux 3 stades, comme buildCustomSpecies), éclosion tardive (courbe `slow`, évo 22/40) et talent
    // caché « zèle » (STAB ×1,55). Attaquant SPÉCIAL : les 2 STAB (Eau+Glace) sont spéciaux (SpA 132). Météores/
    // Dard-Nuée sont physiques (off-stat) mais ce sont ses choix — conservés tels quels. Run 3 + Zone de Combat.
    guizer: {
        id: "guizer", dexNo: 165, name: "Guizer", types: ["EAU", "GLACE"],
        baseStats: { hp: 41, atk: 32, def: 36, spe: 32, spc: 59 }, // BST 200
        learnset: [
            { level: 5, moveId: "pistolet_a_o" }, { level: 5, moveId: "hurlement" },
            { level: 12, moveId: "jet_de_sable" }, { level: 18, moveId: "dard_nuee" },
            { level: 24, moveId: "coup_d_givre" }, { level: 30, moveId: "onde_folie" },
            { level: 36, moveId: "meteores" }, { level: 42, moveId: "deferlante" },
            { level: 48, moveId: "hydrocanon" }, { level: 54, moveId: "souffle_polaire" },
        ],
        evolution: { toId: "dalugazer", method: { kind: "LEVEL", level: 22 } },
        catchRate: 45, baseExp: 90, rarity: "RARE", growthRate: "slow", secretTalent: "zele",
        role: "Eau/Glace — attaquant spécial (éclosion tardive)",
        description: "Un petit béluga blanc hyper kawaï. — Colérique et rancunier",
        sprite: "/yellow/sprites/dex/guizer.png",
    },
    dalugazer: {
        id: "dalugazer", dexNo: 166, name: "Dalugazer", types: ["EAU", "GLACE"],
        baseStats: { hp: 61, atk: 48, def: 54, spe: 48, spc: 90 }, // BST 301
        learnset: [
            { level: 5, moveId: "pistolet_a_o" }, { level: 5, moveId: "hurlement" },
            { level: 12, moveId: "jet_de_sable" }, { level: 18, moveId: "dard_nuee" },
            { level: 24, moveId: "coup_d_givre" }, { level: 30, moveId: "onde_folie" },
            { level: 36, moveId: "meteores" }, { level: 42, moveId: "deferlante" },
            { level: 48, moveId: "hydrocanon" }, { level: 54, moveId: "souffle_polaire" },
        ],
        evolution: { toId: "mobyd", method: { kind: "LEVEL", level: 40 } },
        catchRate: 45, baseExp: 135, rarity: "RARE", growthRate: "slow", secretTalent: "zele",
        role: "Eau/Glace — attaquant spécial",
        description: "Un petit béluga blanc hyper kawaï. — Colérique et rancunier",
        sprite: "/yellow/sprites/dex/dalugazer.png",
    },
    mobyd: {
        id: "mobyd", dexNo: 167, name: "Moby D", types: ["EAU", "GLACE"],
        baseStats: { hp: 90, atk: 70, def: 80, spe: 70, spc: 132 }, // BST 442 — attaquant spécial (STAB Eau+Glace = spé)
        learnset: [
            { level: 5, moveId: "pistolet_a_o" }, { level: 5, moveId: "hurlement" },
            { level: 12, moveId: "jet_de_sable" }, { level: 18, moveId: "dard_nuee" },
            { level: 24, moveId: "coup_d_givre" }, { level: 30, moveId: "onde_folie" },
            { level: 36, moveId: "meteores" }, { level: 42, moveId: "deferlante" },
            { level: 48, moveId: "hydrocanon" }, { level: 54, moveId: "souffle_polaire" },
        ],
        catchRate: 45, baseExp: 199, rarity: "RARE", growthRate: "slow", secretTalent: "zele",
        role: "Eau/Glace — attaquant spécial (aura mythique)",
        description: "Une orque albinos ailée et menaçante, inspirée de Moby Dick. Son aura dégage quelque chose d'oppressant et de mythique. — Colérique et rancunier",
        sprite: "/yellow/sprites/dex/mobyd.png",
    },
    // ── Shady → Shade → Shadow (création canonisée de FRANSS) : félin spectral, sweeper physique rapide (crit). ──
    //    Learnset/stats/talent FIDÈLES à sa création. NORMAL/SPECTRE : aucune faiblesse de type (→ némésis TÉNÈBRES).
    shady: {
        id: "shady", dexNo: 168, name: "Shady", types: ["NORMAL", "SPECTRE"],
        baseStats: { hp: 41, atk: 59, def: 34, spe: 59, spc: 13 }, // BST 206
        learnset: [
            { level: 5, moveId: "charge" }, { level: 5, moveId: "jet_de_sable" },
            { level: 12, moveId: "vive_attaque" }, { level: 18, moveId: "ombre_furtive" },
            { level: 24, moveId: "griffe_spectrale" }, { level: 30, moveId: "danse_lames" },
            { level: 36, moveId: "crochet_maitre" }, { level: 42, moveId: "tranche" },
            { level: 48, moveId: "hypnose" }, { level: 54, moveId: "plaquage" },
        ],
        evolution: { toId: "shade", method: { kind: "LEVEL", level: 22 } },
        catchRate: 45, baseExp: 62, rarity: "RARE", growthRate: "slow", secretTalent: "reflexes",
        role: "Normal/Spectre — sweeper physique rapide (crit)",
        description: "Petit félin spectral translucide, flammèche fantomatique au bout de la queue. File déjà comme une ombre. — Création de Franss",
        sprite: "/yellow/sprites/dex/shady.png",
    },
    shade: {
        id: "shade", dexNo: 169, name: "Shade", types: ["NORMAL", "SPECTRE"],
        baseStats: { hp: 61, atk: 88, def: 51, spe: 88, spc: 19 }, // BST 307
        learnset: [
            { level: 5, moveId: "charge" }, { level: 5, moveId: "jet_de_sable" },
            { level: 12, moveId: "vive_attaque" }, { level: 18, moveId: "ombre_furtive" },
            { level: 24, moveId: "griffe_spectrale" }, { level: 30, moveId: "danse_lames" },
            { level: 38, moveId: "crochet_maitre" }, { level: 46, moveId: "tranche" },
            { level: 54, moveId: "hypnose" }, { level: 62, moveId: "plaquage" },
        ],
        evolution: { toId: "shadow", method: { kind: "LEVEL", level: 40 } },
        catchRate: 45, baseExp: 141, rarity: "RARE", growthRate: "slow", secretTalent: "reflexes",
        role: "Normal/Spectre — félin spectral hérissé (crit)",
        description: "Un félin-fantôme adolescent, plus grand et plus vif : ses griffes phosphorescentes crépitent d'énergie spectrale.",
        sprite: "/yellow/sprites/dex/shade.png",
    },
    shadow: {
        id: "shadow", dexNo: 170, name: "Shadow", types: ["NORMAL", "SPECTRE"],
        baseStats: { hp: 90, atk: 130, def: 75, spe: 130, spc: 28 }, // BST 453
        learnset: [
            { level: 5, moveId: "charge" }, { level: 5, moveId: "jet_de_sable" },
            { level: 12, moveId: "vive_attaque" }, { level: 18, moveId: "ombre_furtive" },
            { level: 24, moveId: "griffe_spectrale" }, { level: 30, moveId: "danse_lames" },
            { level: 40, moveId: "crochet_maitre" }, { level: 50, moveId: "tranche" },
            { level: 60, moveId: "hypnose" }, { level: 70, moveId: "plaquage" },
        ],
        catchRate: 45, baseExp: 208, rarity: "RARE", growthRate: "slow", secretTalent: "reflexes",
        role: "Normal/Spectre — prédateur spectral ultra-rapide (crit)",
        description: "Grand félin-fantôme élancé et musclé, nimbé d'une aura d'ombre. Prédateur qui frappe à la vitesse de l'éclair et disparaît.",
        sprite: "/yellow/sprites/dex/shadow.png",
    },
    // ── NÉMÉSIS de Shady : Caninombre → Lycanfer → Ténèbrir (loup ténébreux TÉNÈBRES/SPECTRE, attaquant SPÉCIAL). ──
    //    Shady (NORMAL/SPECTRE) n'a aucune faiblesse → SEUL le type TÉNÈBRES perce sa moitié Spectre (×2), et un
    //    coup SPÉCIAL frappe sa Spé-déf catastrophique (28). Immunisé à l'offense de Shady (Normal/Combat/priorité
    //    = ×0 via Spectre), plus RAPIDE que Shadow → il le pulvérise avant Danse-Lames. Sprites à générer (Sartay).
    caninombre: {
        id: "caninombre", dexNo: 171, name: "Caninombre", types: ["TENEBRES", "SPECTRE"],
        // Conçu pour DÉTRUIRE Shady (Vit 59) : Vit 64 (outspeed) + Spé 72 (le nuke), fragile physiquement (peu importe :
        // il est immunisé à l'offense de Shady). BST 244 (~= Shady 206, un cran au-dessus car némésis dédié).
        baseStats: { hp: 42, atk: 22, def: 44, spe: 64, spc: 72 }, // BST 244
        learnset: [
            { level: 5, moveId: "flammeche" }, { level: 5, moveId: "ombre_furtive" },
            { level: 12, moveId: "morsure_sombre" }, { level: 18, moveId: "onde_folie" },
            { level: 24, moveId: "onde_obscure" }, { level: 30, moveId: "vague_mentale" },
            { level: 36, moveId: "hypnose" }, { level: 44, moveId: "linceul" },
            { level: 52, moveId: "devoreur_ombres" }, { level: 60, moveId: "lance_flammes" },
        ],
        evolution: { toId: "lycanfer", method: { kind: "LEVEL", level: 20 } },
        catchRate: 45, baseExp: 68, rarity: "RARE", growthRate: "medium_slow", secretTalent: "reflexes",
        role: "Ténèbres/Spectre — louveteau furtif (némésis de Shady)", hiddenUntilCaught: true,
        description: "Louveteau (lupus + ombre) dont le pelage sombre semble absorber la lumière. Furtif, il se tapit dans les recoins obscurs et n'attaque que par surprise. Forgé par ACE pour traquer une certaine ombre féline.",
        sprite: "/yellow/sprites/dex/caninombre.png",
    },
    lycanfer: {
        id: "lycanfer", dexNo: 172, name: "Lycanfer", types: ["TENEBRES", "SPECTRE"],
        // vs Shade (Vit 88) : Vit 96 (outspeed) + Spé 104. BST 350 (~= Shade 307).
        baseStats: { hp: 62, atk: 30, def: 58, spe: 96, spc: 104 }, // BST 350
        learnset: [
            { level: 5, moveId: "flammeche" }, { level: 5, moveId: "ombre_furtive" },
            { level: 12, moveId: "morsure_sombre" }, { level: 18, moveId: "onde_folie" },
            { level: 24, moveId: "onde_obscure" }, { level: 32, moveId: "vague_mentale" },
            { level: 40, moveId: "hypnose" }, { level: 48, moveId: "linceul" },
            { level: 56, moveId: "devoreur_ombres" }, { level: 64, moveId: "lance_flammes" },
        ],
        evolution: { toId: "tenebrir", method: { kind: "LEVEL", level: 42 } },
        catchRate: 45, baseExp: 141, rarity: "RARE", growthRate: "medium_slow", secretTalent: "reflexes",
        role: "Ténèbres/Spectre — lycanthrope infernal (spécial)", hiddenUntilCaught: true,
        description: "Le loup (lycanthrope + enfer) se dresse sur ses pattes arrière, crocs allongés. Une aura rougeoyante émane de sa fourrure : des flammes froides issues des abysses.",
        sprite: "/yellow/sprites/dex/lycanfer.png",
    },
    tenebrir: {
        id: "tenebrir", dexNo: 173, name: "Ténèbrir", types: ["TENEBRES", "SPECTRE"],
        // BOURREAU de Shadow (Vit 130) : Vit 138 (outspeed garanti) + Spé 140 (OHKO au coup Ténèbres ×2 sur sa
        // Spé-déf 28). NERF (16/08) : −5 PV / −5 Déf → survie réduite (Ténè-iwat plus facile à revenge-KO), offense INTACTE.
        baseStats: { hp: 75, atk: 38, def: 65, spe: 138, spc: 140 }, // BST 456 (ex-466 : −5 PV/−5 Déf, rétroactif car stats calculées à la volée)
        learnset: [
            { level: 5, moveId: "flammeche" }, { level: 5, moveId: "ombre_furtive" },
            { level: 12, moveId: "morsure_sombre" }, { level: 18, moveId: "onde_folie" },
            { level: 24, moveId: "onde_obscure" }, { level: 34, moveId: "vague_mentale" },
            { level: 44, moveId: "hypnose" }, { level: 54, moveId: "linceul" },
            { level: 64, moveId: "devoreur_ombres" }, { level: 74, moveId: "lance_flammes" },
        ],
        catchRate: 45, baseExp: 210, rarity: "RARE", growthRate: "medium_slow", secretTalent: "reflexes",
        role: "Ténèbres/Spectre — apex loup infernal (spécial, ultra-rapide)", hiddenUntilCaught: true,
        description: "L'apex : un loup démoniaque colossal, cornu, zébré de lave, dont le hurlement éteint toute lumière. Plus rapide que sa proie, il consume l'ombre féline avant qu'elle ne se dresse. Némésis parfait de Shadow.",
        sprite: "/yellow/sprites/dex/tenebrir.png",
    },
    // ── NÉMÉSIS de Bidouzen (création d'Embi, PSY/COMBAT) : les VAUTOURS DES TÉNÈBRES (TÉNÈBRES/VOL). Sweepers
    //    PHYSIQUES immunisés à l'arme n°1 de Karatame (PSY ×0) et qui le brisent en STAB VOL physique ×2 sur sa DÉF 70.
    //    Ténèbres = spéciale dans le moteur → sert la DÉFENSE (immunité psy) + le statut ; l'offense passe par VOL. ──
    sepulcru: {
        id: "sepulcru", dexNo: 174, name: "Sépulcru", types: ["TENEBRES", "VOL"],
        // Fragile (peu importe : l'offense psy de Bidouzen ne le touche pas). BST 237.
        baseStats: { hp: 45, atk: 58, def: 40, spe: 62, spc: 32 }, // BST 237
        learnset: [
            { level: 5, moveId: "picpic" }, { level: 5, moveId: "morsure_sombre" },
            { level: 12, moveId: "tornade" }, { level: 18, moveId: "danse_lames" },
            { level: 24, moveId: "fonce_bec" }, { level: 30, moveId: "onde_obscure" },
            { level: 36, moveId: "elan" }, { level: 44, moveId: "devoreur_ombres" },
            { level: 52, moveId: "serres_aube" }, { level: 60, moveId: "vol" },
        ],
        evolution: { toId: "macabour", method: { kind: "LEVEL", level: 20 } },
        catchRate: 45, baseExp: 64, rarity: "RARE", growthRate: "medium_slow", secretTalent: "reflexes",
        role: "Ténèbres/Vol — urubu charognard (némésis de Bidouzen)", hiddenUntilCaught: true,
        description: "Petit urubu déplumé (sépulcre + cru), duvet gris-cendre et noir de suie, tête chauve et fripée de charognard miniature. Deux grands yeux d'un violet luminescent, trop gros pour son crâne ; il traîne déjà une fine volute d'ombre à ses serres. Forgé par ACE pour fondre sur une certaine ombre féline qui vole trop haut.",
        sprite: "/yellow/sprites/dex/sepulcru.png",
    },
    macabour: {
        id: "macabour", dexNo: 175, name: "Macabour", types: ["TENEBRES", "VOL"],
        // Le sweeper monte en régime : Vit qui dépasse Medisciple + ATK physique VOL ×2. BST 328.
        baseStats: { hp: 62, atk: 88, def: 54, spe: 82, spc: 42 }, // BST 328
        learnset: [
            { level: 5, moveId: "picpic" }, { level: 5, moveId: "morsure_sombre" },
            { level: 12, moveId: "tornade" }, { level: 18, moveId: "danse_lames" },
            { level: 24, moveId: "fonce_bec" }, { level: 32, moveId: "onde_obscure" },
            { level: 40, moveId: "elan" }, { level: 48, moveId: "devoreur_ombres" },
            { level: 56, moveId: "serres_aube" }, { level: 64, moveId: "vol" },
        ],
        evolution: { toId: "condombre", method: { kind: "LEVEL", level: 42 } },
        catchRate: 45, baseExp: 141, rarity: "RARE", growthRate: "medium_slow", secretTalent: "reflexes",
        role: "Ténèbres/Vol — vautour macabre (sweeper physique)", hiddenUntilCaught: true,
        description: "Vautour d'envergure (macabre + vautour), plumage noir-encre aux reflets violacés, large collerette hérissée autour d'un cou nu et gris. Un premier fragment d'os blanchi s'incruste à son poitrail comme une amorce de plastron ; le regard s'est durci en deux fentes pourpres. Il plane bas, patient — la mort qui prend son temps.",
        sprite: "/yellow/sprites/dex/macabour.png",
    },
    condombre: {
        id: "condombre", dexNo: 176, name: "Condombre", types: ["TENEBRES", "VOL"],
        // BOURREAU de Karatame (PSY/COMBAT, Vit 90) : Vit 104 (le dépasse) + ATK 122 → STAB VOL physique ×2 sur sa
        // DÉF 70. Immunisé à ses nukes PSY (×0). Seule ouverture pour Karatame : sa CT cage_éclair (ELEC ×2). BST 424.
        baseStats: { hp: 78, atk: 122, def: 68, spe: 104, spc: 52 }, // BST 424
        learnset: [
            { level: 5, moveId: "picpic" }, { level: 5, moveId: "morsure_sombre" },
            { level: 12, moveId: "tornade" }, { level: 18, moveId: "danse_lames" },
            { level: 24, moveId: "fonce_bec" }, { level: 34, moveId: "onde_obscure" },
            { level: 44, moveId: "elan" }, { level: 54, moveId: "devoreur_ombres" },
            { level: 64, moveId: "serres_aube" }, { level: 74, moveId: "vol" },
        ],
        catchRate: 45, baseExp: 208, rarity: "RARE", growthRate: "medium_slow", secretTalent: "reflexes",
        role: "Ténèbres/Vol — apex condor des crânes (bourreau de Karatame)", hiddenUntilCaught: true,
        description: "L'apex : un colossal condor des ténèbres (condor + ombre), envergure qui avale la lumière, plumage d'obsidienne strié de veines violettes. Son visage disparaît derrière un MASQUE de crânes soudés — trophées de ses proies — d'où percent deux braises pourpres. Faucheuse ailée qui règne sur le ciel : le prédateur né pour chasser les félins qui lévitent. Némésis parfait de Karatame.",
        sprite: "/yellow/sprites/dex/condombre.png",
    },
    // ── CRÉATION CANONISÉE d'Embi : Bidouzen → Medisciple → Karatame (chat kung-fu psychique). Stats/learnset FIDÈLES
    //    à ce qu'Embi joue (buildCustomSpecies). NORMAL/PSY → gagne COMBAT au stade 3. Attaquant SPÉCIAL (spc 130). ──
    bidouzen: {
        id: "bidouzen", dexNo: 177, name: "Bidouzen", types: ["NORMAL", "PSY"],
        baseStats: { hp: 43, atk: 28, def: 40, spe: 51, spc: 74 }, // BST 236
        learnset: [
            { level: 5, moveId: "charge" }, { level: 5, moveId: "jet_de_sable" },
            { level: 12, moveId: "balayage" }, { level: 18, moveId: "choc_mental" },
            { level: 24, moveId: "coup_d_boule" }, { level: 30, moveId: "hurlement" },
            { level: 36, moveId: "vague_mentale" }, { level: 42, moveId: "coup_de_boutoir" },
            { level: 48, moveId: "cage_eclair" }, { level: 54, moveId: "eveil_divin" },
        ],
        evolution: { toId: "medisciple", method: { kind: "LEVEL", level: 16 } },
        catchRate: 45, baseExp: 106, rarity: "RARE", growthRate: "medium_slow", secretTalent: "studieux",
        role: "Normal/Psy — chaton kung-fu (offensif spécial, création)",
        description: "Un bipède mauve-gris, genre kung-fu panda version chat, malicieux et mystérieux. Ses moustaches frémissent d'une énergie psychique naissante. — 🖋️ Création d'Embi",
        sprite: "/yellow/sprites/dex/bidouzen.png",
    },
    medisciple: {
        id: "medisciple", dexNo: 178, name: "Medisciple", types: ["NORMAL", "PSY"],
        baseStats: { hp: 58, atk: 38, def: 54, spe: 69, spc: 100 }, // BST 319
        learnset: [
            { level: 5, moveId: "charge" }, { level: 5, moveId: "jet_de_sable" },
            { level: 12, moveId: "balayage" }, { level: 18, moveId: "choc_mental" },
            { level: 24, moveId: "coup_d_boule" }, { level: 30, moveId: "hurlement" },
            { level: 36, moveId: "vague_mentale" }, { level: 42, moveId: "coup_de_boutoir" },
            { level: 48, moveId: "cage_eclair" }, { level: 54, moveId: "eveil_divin" },
        ],
        evolution: { toId: "karatame", method: { kind: "LEVEL", level: 34 } },
        catchRate: 45, baseExp: 144, rarity: "RARE", growthRate: "medium_slow", secretTalent: "studieux",
        role: "Normal/Psy — chat-moine studieux (offensif spécial)",
        description: "Le disciple s'est musclé : un chat-moine en posture de combat, l'aura psychique désormais éveillée autour de ses poings. Méditation et discipline martiale.",
        sprite: "/yellow/sprites/dex/medisciple.png",
    },
    karatame: {
        id: "karatame", dexNo: 179, name: "Karatame", types: ["PSY", "COMBAT"],
        baseStats: { hp: 75, atk: 49, def: 70, spe: 90, spc: 130 }, // BST 414
        learnset: [
            { level: 5, moveId: "charge" }, { level: 5, moveId: "jet_de_sable" },
            { level: 12, moveId: "balayage" }, { level: 18, moveId: "choc_mental" },
            { level: 24, moveId: "coup_d_boule" }, { level: 30, moveId: "hurlement" },
            { level: 36, moveId: "vague_mentale" }, { level: 42, moveId: "coup_de_boutoir" },
            { level: 48, moveId: "cage_eclair" }, { level: 54, moveId: "eveil_divin" },
        ],
        catchRate: 45, baseExp: 186, rarity: "RARE", growthRate: "medium_slow", secretTalent: "studieux",
        role: "Psy/Combat — maître du kung-fu psychique (offensif spécial)",
        description: "Un chat stylé en lévitation, musclé de façon athlétique — genre Beerus en moins maigre. Maître du kung-fu psychique : il frappe l'esprit autant que le corps. — 🖋️ Création d'Embi",
        sprite: "/yellow/sprites/dex/karatame.png",
    },

    // ═══════════════ GROS LATE BLOOMERS — créatures TRÈS ANCIENNES de la Grotte du Nexus B2F (dexNo 191-199) ═══════════════
    // Pop niv 5-90, courbe SLOW (montée lente), règle d'EV durcie (lateBloomerEv : capturé tôt +20 % / tard −20 %).
    // Chaque lignée a un RÔLE distinct. Poppent après la 1re victoire à la Ligue de Fusion (gate côté encounters/gameStore).

    // ── Dragon/Fée (2 st.) — SWEEPER SPÉCIAL (Dragon ET Fée = spécial) ──
    rosdrakis: {
        id: "rosdrakis", dexNo: 191, name: "Rosdrakis", types: ["DRAGON", "FEE"],
        baseStats: { hp: 45, atk: 38, def: 42, spe: 55, spc: 70 }, // BST 250
        learnset: [
            { level: 5, moveId: "charge" }, { level: 5, moveId: "draco_souffle" },
            { level: 12, moveId: "bourrasque_feerique" }, { level: 20, moveId: "vive_attaque" }, { level: 28, moveId: "draco_charge" },
        ],
        evolution: { toId: "dracosidhe", method: { kind: "LEVEL", level: 34 } },
        catchRate: 30, baseExp: 113, rarity: "RARE", growthRate: "slow", lateBloomerEv: true,
        role: "Dragon/Fée — dragonnet rose des origines (sweeper spécial en devenir)",
        description: "Un petit dragon rose recroquevillé, aux écailles féeriques. On dit qu'il dort depuis des ères, attendant de renaître en colosse.",
        sprite: "/yellow/sprites/dex/rosdrakis.png",
    },
    dracosidhe: {
        id: "dracosidhe", dexNo: 192, name: "Dracosidhe", types: ["DRAGON", "FEE"],
        baseStats: { hp: 72, atk: 60, def: 68, spe: 105, spc: 127 }, // BST 432 — sweeper spécial rapide
        learnset: [
            { level: 5, moveId: "charge" }, { level: 5, moveId: "draco_souffle" },
            { level: 12, moveId: "bourrasque_feerique" }, { level: 20, moveId: "draco_charge" },
            { level: 30, moveId: "eclat_lunaire" }, { level: 42, moveId: "griffe_draconique" },
            { level: 54, moveId: "repos" }, { level: 68, moveId: "cataclysme_lunaire" },
        ],
        catchRate: 20, baseExp: 194, rarity: "RARE", growthRate: "slow", lateBloomerEv: true,
        role: "Dragon/Fée — dragon-fée primordial (sweeper spécial : gros Spécial + Vitesse)",
        description: "Le dragon des origines déployé : une crête épineuse magenta, des ailes de flammes féeriques. Sa puissance spéciale fend le ciel comme aux premiers âges.",
        sprite: "/yellow/sprites/dex/dracosidhe.png",
    },

    // ── Vol/Fée (2 st.) — ATTAQUANT PHYSIQUE RAPIDE (Vol = physique) ──
    archeoptix: {
        id: "archeoptix", dexNo: 193, name: "Archéoptix", types: ["VOL", "FEE"],
        baseStats: { hp: 45, atk: 60, def: 40, spe: 70, spc: 35 }, // BST 250
        learnset: [
            { level: 5, moveId: "picpic" }, { level: 5, moveId: "charge" },
            { level: 12, moveId: "tornade" }, { level: 20, moveId: "bourrasque_feerique" }, { level: 28, moveId: "fonce_bec" },
        ],
        evolution: { toId: "pterosidhe", method: { kind: "LEVEL", level: 34 } },
        catchRate: 30, baseExp: 113, rarity: "RARE", growthRate: "slow", lateBloomerEv: true,
        role: "Vol/Fée — archæoptéryx ancestral (attaquant physique rapide en devenir)",
        description: "Un oiseau-dinosaure à plumes bleues et griffes rouges, tout droit sorti de l'aube du monde. Vif et curieux, il connaît des chemins de vent oubliés.",
        sprite: "/yellow/sprites/dex/archeoptix.png",
    },
    pterosidhe: {
        id: "pterosidhe", dexNo: 194, name: "Ptérosidhe", types: ["VOL", "FEE"],
        baseStats: { hp: 70, atk: 110, def: 62, spe: 118, spc: 72 }, // BST 432 — attaquant physique très rapide
        learnset: [
            { level: 5, moveId: "picpic" }, { level: 5, moveId: "tornade" },
            { level: 16, moveId: "fonce_bec" }, { level: 24, moveId: "vive_attaque" },
            { level: 34, moveId: "bourrasque_feerique" }, { level: 44, moveId: "pique_fatal" },
            { level: 56, moveId: "danse_lames" }, { level: 70, moveId: "serres_aube" },
        ],
        catchRate: 20, baseExp: 194, rarity: "RARE", growthRate: "slow", lateBloomerEv: true,
        role: "Vol/Fée — ptérosaure féerique (attaquant physique rapide : gros Attaque + Vitesse)",
        description: "Le seigneur des cieux anciens : une envergure immense, un vol silencieux et fulgurant. Il fond sur sa proie avant même qu'elle l'entende.",
        sprite: "/yellow/sprites/dex/pterosidhe.png",
    },

    // ── Électrik (1 st.) — CANON DE VERRE SPÉCIAL (Élec = spécial) ──
    fulguror: {
        id: "fulguror", dexNo: 195, name: "Fulguror", types: ["ELEC"],
        baseStats: { hp: 60, atk: 50, def: 50, spe: 120, spc: 150 }, // BST 430 — canon de verre spécial
        learnset: [
            { level: 5, moveId: "etincelle" }, { level: 5, moveId: "charge" },
            { level: 14, moveId: "cage_eclair" }, { level: 24, moveId: "vive_attaque" },
            { level: 36, moveId: "fulgurance" }, { level: 50, moveId: "morsure" },
            { level: 68, moveId: "ultra_foudre" },
        ],
        catchRate: 25, baseExp: 194, rarity: "RARE", growthRate: "slow", lateBloomerEv: true,
        role: "Électrik — dino-foudre ancestral (canon de verre spécial : Spécial + Vitesse énormes, fragile)",
        description: "Un dinosaure jaune parcouru d'arcs électriques. Rapide et surpuissant, mais son corps fossile est fragile — il frappe le premier ou meurt.",
        sprite: "/yellow/sprites/dex/fulguror.png",
    },

    // ── Roche (1 st.) — MUR PHYSIQUE (Roche = physique) ──
    rocosaure: {
        id: "rocosaure", dexNo: 196, name: "Rocosaure", types: ["ROCHE"],
        baseStats: { hp: 100, atk: 100, def: 120, spe: 45, spc: 75 }, // BST 440 — mur physique lourd
        learnset: [
            { level: 5, moveId: "charge" }, { level: 5, moveId: "jet_pierres" },
            { level: 14, moveId: "morsure" }, { level: 24, moveId: "eboulis" },
            { level: 34, moveId: "mur_de_fer" }, { level: 46, moveId: "lame_roche" },
            { level: 60, moveId: "seisme" }, { level: 78, moveId: "roc_titanesque" },
        ],
        catchRate: 25, baseExp: 198, rarity: "RARE", growthRate: "slow", lateBloomerEv: true,
        role: "Roche — colosse fossile (mur physique : Défense + PV énormes, lent, tape fort)",
        description: "Un titan brun-roche cuirassé d'écailles millénaires, hérissé de pointes. Lent et immuable comme la montagne, il encaisse tout et riposte comme un séisme.",
        sprite: "/yellow/sprites/dex/rocosaure.png",
    },

    // ── Vol/Glace (1 st.) — ÉQUILIBRÉ / POLYVALENT ──
    givroptere: {
        id: "givroptere", dexNo: 197, name: "Givroptère", types: ["VOL", "GLACE"],
        baseStats: { hp: 85, atk: 88, def: 82, spe: 92, spc: 88 }, // BST 435 — équilibré (touche-à-tout)
        learnset: [
            { level: 5, moveId: "picpic" }, { level: 5, moveId: "coup_d_givre" },
            { level: 14, moveId: "tornade" }, { level: 24, moveId: "souffle_polaire" },
            { level: 36, moveId: "fonce_bec" }, { level: 48, moveId: "danse_lames" },
            { level: 62, moveId: "blizzard" }, { level: 78, moveId: "pique_fatal" },
        ],
        catchRate: 25, baseExp: 196, rarity: "RARE", growthRate: "slow", lateBloomerEv: true,
        role: "Vol/Glace — ptérosaure des glaces (équilibré : stats homogènes, offensif phys ET spé)",
        description: "Un ptérosaure spectral aux ailes de givre, blanc comme le blizzard éternel. Ni le plus fort ni le plus rapide, mais bon en tout — un survivant des âges gelés.",
        sprite: "/yellow/sprites/dex/givroptere.png",
    },

    // ── Fée/Poison (2 st.) — MUR DÉFENSIF / STALLER (Poison = physique, Fée = spécial) ──
    toxyrm: {
        id: "toxyrm", dexNo: 198, name: "Toxyrm", types: ["FEE", "POISON"],
        baseStats: { hp: 60, atk: 45, def: 58, spe: 40, spc: 52 }, // BST 255
        learnset: [
            { level: 5, moveId: "dard_venin" }, { level: 5, moveId: "charge" },
            { level: 12, moveId: "crachat_acide" }, { level: 20, moveId: "bourrasque_feerique" }, { level: 28, moveId: "morsure" },
        ],
        evolution: { toId: "wyvortal", method: { kind: "LEVEL", level: 34 } },
        catchRate: 30, baseExp: 115, rarity: "RARE", growthRate: "slow", lateBloomerEv: true,
        role: "Fée/Poison — wyverne toxique naissante (mur défensif en devenir)",
        description: "Un petit saurien à tête mauve et ventre crème, aux glandes déjà venimeuses. Trapu et boudeur, il tient bon là où d'autres cèdent.",
        sprite: "/yellow/sprites/dex/toxyrm.png",
    },
    wyvortal: {
        id: "wyvortal", dexNo: 199, name: "Wyvortal", types: ["FEE", "POISON"],
        baseStats: { hp: 100, atk: 72, def: 105, spe: 60, spc: 95 }, // BST 432 — mur défensif / staller
        learnset: [
            { level: 5, moveId: "dard_venin" }, { level: 5, moveId: "crachat_acide" },
            { level: 16, moveId: "bourrasque_feerique" }, { level: 24, moveId: "toxik" },
            { level: 34, moveId: "bombe_beurk" }, { level: 46, moveId: "eclat_lunaire" },
            { level: 60, moveId: "repos" }, { level: 74, moveId: "miasme_corrosif" },
        ],
        catchRate: 20, baseExp: 194, rarity: "RARE", growthRate: "slow", lateBloomerEv: true,
        role: "Fée/Poison — wyverne-fée toxique (mur défensif/staller : Défense + PV, Toxik + Repos)",
        description: "Une wyverne mauve et corail aux ailes membraneuses, exhalant des vapeurs féeriques toxiques. Patiente et increvable, elle use l'adversaire par le poison.",
        sprite: "/yellow/sprites/dex/wyvortal.png",
    },
}

// ── REGISTRE RUNTIME des Daemons CUSTOM (créés par les joueurs, post-Ligue). Fusionné à la LECTURE seulement :
//    jamais écrit dans SPECIES, jamais compté dans le dex numéroté. Vide par défaut → zéro impact sur le jeu
//    existant. Rempli via registerCustomSpecies au chargement de la save (ids préfixés « custom_… », pas de collision). ──
const CUSTOM_SPECIES = new Map<string, SpeciesData>()
/** Enregistre une lignée custom (SpeciesData[]) pour qu'elle soit résolvable en combat (getSpecies/speciesOf). */
export function registerCustomSpecies(chain: SpeciesData[]): void {
    for (const s of chain) CUSTOM_SPECIES.set(s.id, s)
}
export function unregisterCustomSpecies(ids: string[]): void { for (const id of ids) CUSTOM_SPECIES.delete(id) }
export function isCustomSpeciesId(id: string): boolean { return CUSTOM_SPECIES.has(id) }
export function customSpeciesCount(): number { return CUSTOM_SPECIES.size }

// ALIAS des créations CANONISÉES : un joueur qui possède l'ANCIEN Daemon custom (id `custom_<batch>_<nom>_sN`, créé
//   AVANT la canonisation de sa lignée) → on le résout vers l'espèce CANONIQUE finale. Repli utilisé quand l'espèce
//   custom n'est PAS enregistrée : côté SERVEUR (ex. génération de sprite de fusion → fin du `unknown-species`) et
//   pour les SPECTATEURS qui n'ont pas les customDaemons du joueur. Côté client owner, CUSTOM_SPECIES prime (même
//   créature). Les 5 stades finaux (_s3) réellement présents dans les saves (cf. scan) ; extensible si besoin.
export const CANONIZED_CUSTOM_ALIAS: Record<string, string> = {
    custom_cmsat15v80001wvy_joeyrrant_s3: "kangoudead",   // Jacanon
    custom_cmq950jkh000071u_phoechaud_s3: "phoechaudiii", // Guillaume
    custom_cmpgu4uq5000069d_shady_s3: "shadow",           // Franss
    custom_cmml4dogn00005n1_bidouzen_s3: "karatame",      // Embi
    custom_cmq5gbo5g0000g6m_guizer_s3: "mobyd",           // Task1
}

export function getSpecies(id: string): SpeciesData | null {
    return SPECIES[id] ?? CUSTOM_SPECIES.get(id) ?? SPECIES[CANONIZED_CUSTOM_ALIAS[id] ?? ""] ?? null // statique → custom runtime → alias canonisé (repli serveur/spectateur)
}

/** LÉGENDAIRES ULTRA-SECRETS : ne se révèlent au Pokédex QUE par CAPTURE RÉELLE — JAMAIS par « vu », ni par le
 *  déverrouillage post-run 3, ni par accès URL à la fiche. Leur carte reste « N°XXX · ??? » (silhouette noire) et
 *  leur fiche scellée tant qu'ils ne sont pas capturés. Obtention hors-normes → secret préservé même en fin de jeu. */
export const DEX_ULTRA_SECRET: ReadonlySet<string> = new Set(["megamonarx", "galijah"])

// RUN 3 — les 10 espèces du run 3 (Magnetor + les 9 starters du triangle) ne sont visibles dans le DEX qu'à
// partir du run 3 (dex tiéré par run). Marquées runThreeOnly ici, en un seul endroit, pour éviter d'éparpiller
// le flag dans 10 littéraux. (Le POKÉDEX reste cumulatif — cf. isDexHidden / le caract. global des captures.)
for (const id of ["magnetor", "elefer", "barrisfer", "colosfer", "cornaive", "astracorne", "lunarque", "coccipoing", "coccombat", "coccimperatrice",
    "hypnoppo", "teleppo", "omnhippo", "karmaki",           // lignée Centrale Psy run 3 (Gékosmic a le flag inline)
    "otama", "gamaruto", "uzumaro", "wistree",              // Maison Combat (grenouilles) + Grotte (Wistree) run 3
    "guizer", "dalugazer", "mobyd",                        // création canonisée (Task1) — Grotte/Route Nord run 3
    "shady", "shade", "shadow",                            // création canonisée (Franss) — Grotte du Nexus run 3
    "caninombre", "lycanfer", "tenebrir",                   // némésis (loup ténébreux) TÉNÈBRES/SPECTRE de Shady, forgé par ACE
    "sepulcru", "macabour", "condombre",                    // némésis (vautours des ténèbres) TÉNÈBRES/VOL de Bidouzen, forgé par ACE
    "bidouzen", "medisciple", "karatame",                   // création canonisée (Embi) — chat kung-fu psychique NORMAL/PSY→PSY/COMBAT
    "phoechaudi", "phoechaudii", "phoechaudiii",            // création canonisée (Guillaume) — phénix maudit FEU/SPECTRE, Grotte run 3
    "obscurene", "abyssombre", "leviabysse",                // némésis (serpent des abysses) EAU/TÉNÈBRES de Phoéchaud, forgé par ACE
    "joeyrrant", "wallabisan", "kangoudead"]) {             // création canonisée (Jacanon) — kangourou mort-vivant TÉNÈBRES/FEU→TÉNÈBRES/GLACE, run 3
    if (SPECIES[id]) SPECIES[id].runThreeOnly = true
}

// GROS LATE BLOOMERS de la Grotte du Nexus B2F (créatures très anciennes) : ENDGAME (post-Ligue Fusion) → marquées
//   postLeague pour être exclues du dex run 1 (révélées au sacre, comme les créations canonisées).
for (const id of ["rosdrakis", "dracosidhe", "archeoptix", "pterosidhe", "fulguror", "rocosaure", "givroptere", "toxyrm", "wyvortal"]) {
    if (SPECIES[id]) SPECIES[id].postLeague = true
}

export const SPECIES_IDS = Object.keys(SPECIES)
export const DEX_COUNT = SPECIES_IDS.length

/** Espèces VISIBLES dans les dex (Pokédex in-game + dex de référence). Sont masquées (invisibles :
 *  pas même une case « ??? » ni un point de compteur) :
 *   - les `runTwoOnly` (Gékraise/Ukognos/Merorem) NON capturées — révélées seulement au run 2 une fois obtenues ;
 *   - les `postLeague` (créations canonisées) tant que le joueur n'est pas `isChampion` — révélées après le sacre,
 *     et dès lors pour TOUT LE MONDE.
 *  `caught` = Pokédex du monde courant (une espèce possédée reste visible dans tous les cas). Ordre = insertion. */
/** SOURCE UNIQUE du gate : une espèce est-elle MASQUÉE des dex pour cet état de jeu ? Utilisé par
 *  visibleDexSpecies ET par le masquage des stades scellés dans la chaîne d'évolution.
 *  - `runTwoOnly` (Gékraise/Ukognos/Merorem) : masqués SAUF en run 2 (`isRun2`) ou une fois possédés.
 *  - `postLeague` (créations canonisées Gavillus/Goatiny) : masquées SAUF si Champion, en run 2 (le joueur
 *    y est un ex-champion : il a forcément battu la Ligue au run 1), ou une fois possédées. */
export function isDexHidden(sp: SpeciesData, caught: readonly string[] = [], isChampion = false, isRun2 = false, isRun3 = false, dexFullUnlock = false, seen: readonly string[] = []): boolean {
    // POST-RUN 3 (fusion faite → run3Used) : le catalogue est DÉBLOQUÉ À 100% — le joueur a traversé tous les
    // tiers, plus AUCUN masquage. dexFullUnlock court-circuite tout le tiérage ci-dessous.
    if (dexFullUnlock) return false
    // DEX TIÉRÉ PAR RUN : run 1 → Daemons run 1 ; run 2 → run 1+2 ; run 3 → TOUS. Ne masque que les espèces
    // d'un tier SUPÉRIEUR et NON CAPTURÉES → pas de spoiler de ce qu'on ne peut pas encore obtenir. Une fois
    // CAPTURÉE, une espèce reste visible (POKÉDEX cumulatif : le set `caught` est global/persistant).
    // « VU » débloque aussi (règle némésis) : un Daemon run-3 fieldé par l'ACE en run 2 est marqué vu (syncPokedex,
    // non-hiddenUntilCaught) → sa lignée apparaît dès qu'on l'a AFFRONTÉ. Ce n'est plus un spoiler : on l'a vu.
    if (sp.runThreeOnly && !isRun3 && !caught.includes(sp.id) && !seen.includes(sp.id)) return true
    if (sp.runTwoOnly && !isRun2 && !isRun3 && !caught.includes(sp.id)) return true  // run-2 : visible en run 2/3 (ou si capturée)
    if (sp.postLeague && !isChampion && !isRun2 && !isRun3 && !caught.includes(sp.id)) return true
    return false
}

export function visibleDexSpecies(caught: readonly string[] = [], isChampion = false, isRun2 = false, isRun3 = false, dexFullUnlock = false, seen: readonly string[] = []): SpeciesData[] {
    return Object.values(SPECIES).filter((sp) => !isDexHidden(sp, caught, isChampion, isRun2, isRun3, dexFullUnlock, seen))
}

export function speciesByDexNo(dexNo: number): SpeciesData | null {
    return Object.values(SPECIES).find((s) => s.dexNo === dexNo) ?? null
}

/** NÉMÉSIS CANONIQUE : une lignée-starter CANONISÉE → sa contre-lignée dédiée qu'ACE field en run 2 (au lieu
 *  d'un némésis auto-généré par buildNemesis). Clé = n'importe quel stade du starter. Ex. Gavillus (création
 *  du joueur, canonisée) → Goatiny/Mouflorage (Sol/Élec, forgé pour le contrer). Les Daemons CUSTOM (créés au
 *  wizard) gardent leur némésis auto-généré ; seuls les starters canoniques listés ici ont un contre figé. */
export const CANONICAL_NEMESIS: Record<string, string> = {
    gavillus: "goatiny", crocodaillus: "goatiny", alirocaillus: "goatiny",
    // Guizer (création Task1 canonisée, EAU/GLACE) → lignée OTAMA (Otama→Gamaruto→Uzumaro, COMBAT/EAU) = le
    // HARD-COUNTER : résiste ses 2 STAB (Eau 0,5× / Glace 0,5×) et le brise en Combat physique (×2 dans sa DÉF 80).
    guizer: "otama", dalugazer: "otama", mobyd: "otama",
    // Override CIBLÉ Task1 : son équipe joue encore son Guizer CUSTOM (pas le canonique) → on mappe ses ids custom
    // pour que SON ACE field bien Uzumaro. (À terme généralisé par le protocole némésis, cf. _nemesis-architect.)
    custom_cmq5gbo5g0000g6m_guizer_s1: "otama", custom_cmq5gbo5g0000g6m_guizer_s2: "otama", custom_cmq5gbo5g0000g6m_guizer_s3: "otama",
    // Shady (création Franss canonisée, NORMAL/SPECTRE) → lignée CANINOMBRE (Caninombre→Lycanfer→Ténèbrir, loup
    // ténébreux TÉNÈBRES/SPECTRE) = le HARD-COUNTER : immunisé à toute son offense (Normal/Combat/priorité ×0), plus
    // rapide, et l'OHKO au coup SPÉCIAL Ténèbres ×2 sur sa Spé-déf 28. Seule réponse possible (Shady sans faiblesse hors Ténèbres).
    shady: "caninombre", shade: "caninombre", shadow: "caninombre",
    // Override CIBLÉ Franss : son équipe joue son Shady CUSTOM → on mappe ses ids custom pour que SON ACE field Ténèbrir.
    custom_cmpgu4uq5000069d_shady_s1: "caninombre", custom_cmpgu4uq5000069d_shady_s2: "caninombre", custom_cmpgu4uq5000069d_shady_s3: "caninombre",
    // Bidouzen (création Embi, PSY/COMBAT, désormais CANONISÉE) → lignée SÉPULCRU (Sépulcru→Macabour→Condombre,
    // vautours TÉNÈBRES/VOL) = le HARD-COUNTER : immunisé à ses nukes PSY (×0), plus rapide, et le brise en STAB VOL
    // physique ×2 sur sa DÉF 70. Formes canoniques + ids custom (l'équipe d'Embi joue son Bidouzen custom → SON ACE field Condombre).
    bidouzen: "sepulcru", medisciple: "sepulcru", karatame: "sepulcru",
    custom_cmml4dogn00005n1_bidouzen_s1: "sepulcru", custom_cmml4dogn00005n1_bidouzen_s2: "sepulcru", custom_cmml4dogn00005n1_bidouzen_s3: "sepulcru",
    // Phoéchaud (création GUILLAUME, canonisée, FEU/SPECTRE) → lignée OBSCURÈNE (Obscurène→Abyssombre→Léviabysse,
    // EAU/TÉNÈBRES) = le HARD-COUNTER : résiste ses 2 STAB (Eau 0,5× Feu / Ténèbres 0,5× Spectre), mur spécial (Spé 132),
    // riposte ×2 des deux côtés. Formes canoniques + ids custom (l'équipe de Guillaume joue son Phoéchaud custom → SON ACE field Léviabysse).
    phoechaudi: "obscurene", phoechaudii: "obscurene", phoechaudiii: "obscurene",
    custom_cmq950jkh000071u_phoechaud_s1: "obscurene", custom_cmq950jkh000071u_phoechaud_s2: "obscurene", custom_cmq950jkh000071u_phoechaud_s3: "obscurene",
    // Joeyrrant (création JACANON, canonisée, TÉNÈBRES/FEU→TÉNÈBRES/GLACE) → lignée TAURICENDRE (Brasicow→Tauricendre,
    // FEU/COMBAT) = le HARD-COUNTER : Combat ×4 sur Kangoudead (Ténèbres+Glace) ET Feu ×2 fait fondre sa Glace, sans être
    // faible à son STAB Glace (neutre). Choix de Sartay : on réutilise une lignée existante (pas de création dédiée).
    // Formes canoniques + ids custom (l'équipe de Jacanon joue son Joeyrrant custom → SON ACE field Tauricendre).
    joeyrrant: "brasicow", wallabisan: "brasicow", kangoudead: "brasicow",
    custom_cmsat15v80001wvy_joeyrrant_s1: "brasicow", custom_cmsat15v80001wvy_joeyrrant_s2: "brasicow", custom_cmsat15v80001wvy_joeyrrant_s3: "brasicow",
}
