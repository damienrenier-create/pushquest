// src/lib/gamebook/yellow/data/fusionBaseSpecies.ts
//
// FUSIONS DE BASE « stabilisées » (espèces PERMANENTES, un jour capturables) — les 5 lignées de fusion dont le
// sprite est fourni. Elles POPENT en sauvage dans la Grotte du Nexus 1F (base-1 uniquement, pas d'évolution pour
// l'instant), mais ne sont capturables QU'AVEC une Fusio-Ball. Types FIGÉS (ceux des sprites / de la bible) ;
// base stats = génétique de fusion appliquée aux BASE stats des parents (Spé collapsée en moyenne SpA/SpD) ;
// learnset INSPIRÉ des 2 parents puis étendu en STAB jusqu'au haut niveau (pour le jour où elles seront prises).
//
// ⚠️ ANTI-SPOILER (Sartay) : ces espèces ne doivent JAMAIS apparaître dans un doc en jeu (Pokédex) tant qu'elles
// n'ont pas été APERÇUES ET que le joueur est arrivé au Dôme Fusion. → Elles sont enregistrées comme espèces
// CUSTOM (playerStore.reregisterCustomDaemons) : résolvables en jeu (getSpecies/createMonInstance pour les
// rencontres) MAIS jamais dans SPECIES → visibleDexSpecies (qui n'itère que SPECIES) ne les montre JAMAIS. Le
// FUSIODEX (à part) les listera, gated (aperçue && arrivé au Dôme).

import type { SpeciesData } from "../battle/types"

/** Les 5 fusions de base (parents indiqués). dexNo 500+ = plage « Fusiodex » (hors dex principal). */
export const FUSION_BASE_SPECIES: SpeciesData[] = [
    {
        // MOTTELAVE = Mottoche + Lavapetit — mur de roche en fusion (défense).
        id: "mottelave", dexNo: 500, name: "Mottelave", types: ["ROCHE", "FEU"],
        baseStats: { hp: 48, atk: 38, def: 68, spe: 17, spc: 37 },
        learnset: [
            { level: 1, moveId: "charge" }, { level: 1, moveId: "jet_pierres" },
            { level: 6, moveId: "flammeche" }, { level: 12, moveId: "mur_de_fer" }, { level: 18, moveId: "tison" },
            { level: 24, moveId: "eboulis" }, { level: 32, moveId: "flamme_ardente" }, { level: 42, moveId: "secousse" },
            { level: 52, moveId: "lame_roche" }, { level: 64, moveId: "lance_flammes" }, { level: 78, moveId: "seisme" },
            { level: 92, moveId: "roc_titanesque" },
        ],
        catchRate: 3, baseExp: 90, rarity: "RARE", growthRate: "medium_fast",
        description: "Deux fragments de roche soudés par une veine de lave. Sa carapace fissurée irradie une chaleur sourde.",
        sprite: "/yellow/sprites/dex/mottelave.png",
    },
    {
        // NOUIFLOT = Nouillon + Piouflot — nouille-oiseau des ruisseaux (mur spécial).
        id: "nouiflot", dexNo: 501, name: "Nouiflot", types: ["EAU", "PSY"],
        baseStats: { hp: 57, atk: 27, def: 51, spe: 48, spc: 58 },
        learnset: [
            { level: 1, moveId: "charge" }, { level: 1, moveId: "pistolet_a_o" },
            { level: 7, moveId: "choc_mental" }, { level: 14, moveId: "onde_folie" }, { level: 20, moveId: "lame_eau" },
            { level: 28, moveId: "repos" }, { level: 36, moveId: "onde_cerebrale" }, { level: 46, moveId: "deferlante" },
            { level: 58, moveId: "vague_mentale" }, { level: 72, moveId: "eveil_divin" }, { level: 88, moveId: "hydrocanon" },
        ],
        catchRate: 3, baseExp: 90, rarity: "RARE", growthRate: "medium_fast",
        description: "Un ruban de pâte vivante flottant sur l'eau, guidé par un petit esprit d'oisillon. Étrangement serein.",
        sprite: "/yellow/sprites/dex/nouiflot.png",
    },
    {
        // SPORÉMANTE = Revemante + Sporbéo — mante-champignon des rêves.
        id: "sporemante", dexNo: 502, name: "Sporémante", types: ["SPECTRE", "POISON"],
        baseStats: { hp: 49, atk: 51, def: 45, spe: 58, spc: 56 },
        learnset: [
            { level: 1, moveId: "leche" }, { level: 1, moveId: "dard_venin" },
            { level: 8, moveId: "ombre_furtive" }, { level: 14, moveId: "crachat_acide" }, { level: 22, moveId: "mega_sangsue" },
            { level: 30, moveId: "drain_ame" }, { level: 40, moveId: "toxik" }, { level: 50, moveId: "griffe_spectrale" },
            { level: 62, moveId: "miasme_corrosif" }, { level: 76, moveId: "ball_ombre" }, { level: 90, moveId: "bombe_beurk" },
        ],
        catchRate: 3, baseExp: 90, rarity: "RARE", growthRate: "medium_fast",
        description: "Une mante spectrale coiffée d'un chapeau de champignon. Ses spores provoquent des songes toxiques.",
        sprite: "/yellow/sprites/dex/sporemante.png",
    },
    {
        // RUFFARDOC = Ruffiant + Têtardoc — insecte-têtard cuirassé.
        id: "ruffardoc", dexNo: 503, name: "Ruffardoc", types: ["INSECTE", "ROCHE"],
        baseStats: { hp: 36, atk: 52, def: 64, spe: 57, spc: 38 },
        learnset: [
            { level: 1, moveId: "charge" }, { level: 1, moveId: "dard_nuee" },
            { level: 6, moveId: "jet_pierres" }, { level: 12, moveId: "vive_attaque" }, { level: 18, moveId: "morsure" },
            { level: 26, moveId: "eboulis" }, { level: 34, moveId: "dard_mortel" }, { level: 44, moveId: "lame_roche" },
            { level: 56, moveId: "dard_fatal" }, { level: 70, moveId: "seisme" }, { level: 84, moveId: "roc_titanesque" },
        ],
        catchRate: 3, baseExp: 90, rarity: "RARE", growthRate: "medium_fast",
        description: "Un têtard à la peau chitineuse, incrusté d'éclats de roche. Rapide malgré sa cuirasse minérale.",
        sprite: "/yellow/sprites/dex/ruffardoc.png",
    },
    {
        // DRACTRISS = Draclet + Électroatiss — dragonnet foudroyant (rapide).
        id: "dractriss", dexNo: 504, name: "Dractriss", types: ["ELEC", "DRAGON"],
        baseStats: { hp: 35, atk: 60, def: 33, spe: 71, spc: 53 },
        learnset: [
            { level: 1, moveId: "charge" }, { level: 1, moveId: "etincelle" },
            { level: 6, moveId: "picpic" }, { level: 13, moveId: "draco_souffle" }, { level: 20, moveId: "surtension" },
            { level: 28, moveId: "cage_eclair" }, { level: 36, moveId: "griffe_draconique" }, { level: 46, moveId: "fulgurance" },
            { level: 58, moveId: "draco_charge" }, { level: 72, moveId: "ultra_foudre" }, { level: 88, moveId: "souffle_primordial" },
        ],
        catchRate: 3, baseExp: 90, rarity: "RARE", growthRate: "medium_fast",
        description: "Un dragonnet nerveux dont les ailerons crépitent d'arcs électriques. Frappe avant qu'on le voie.",
        sprite: "/yellow/sprites/dex/dractriss.png",
    },

    // ═══════ 8 FUSIONS EXCLUSIVES DE ZONE (Grotte du Nexus) — 1 par zone (parent = l'espèce exclusive de la zone) ═══════
    //   Stats auto-normalisées (BST ~215), learnset dérivé du moveset fusionné. Sprites MissingNo (placeholders à générer).
    {   // Voltaile = batchu + draclet (zone 1F)
        id: "voltaile", dexNo: 510, name: "Voltaile", types: ["ELEC", "VOL"],
        baseStats: { hp: 76, atk: 32, def: 24, spe: 48, spc: 35 }, // BST 215
        learnset: [{ level: 1, moveId: "etincelle" }, { level: 1, moveId: "picpic" }, { level: 12, moveId: "tornade" }, { level: 22, moveId: "cage_eclair" }, { level: 34, moveId: "fonce_bec" }, { level: 48, moveId: "fulgurance" }, { level: 64, moveId: "pique_fatal" }, { level: 84, moveId: "ultra_foudre" }],
        catchRate: 42, baseExp: 90, rarity: "RARE", growthRate: "medium_fast",
        description: "Fusion exclusive du 1er étage : la chauve-souris électrique et le dragonnet volant réunis.",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Abyssvolt = obscurene + electroatiss (zone B1F-1)
        id: "abyssvolt", dexNo: 511, name: "Abyssvolt", types: ["EAU", "ELEC"],
        baseStats: { hp: 82, atk: 22, def: 40, spe: 32, spc: 38 }, // BST 214
        learnset: [{ level: 1, moveId: "pistolet_a_o" }, { level: 1, moveId: "etincelle" }, { level: 12, moveId: "lame_eau" }, { level: 24, moveId: "cage_eclair" }, { level: 38, moveId: "deferlante" }, { level: 52, moveId: "fulgurance" }, { level: 68, moveId: "hydrocanon" }, { level: 84, moveId: "ultra_foudre" }],
        catchRate: 42, baseExp: 90, rarity: "RARE", growthRate: "medium_fast",
        description: "Fusion exclusive du couloir d'Obscurène : un serpent abyssal chargé d'électricité statique.",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Oniridrak = hypnoppo + draclet (zone B1F-2)
        id: "oniridrak", dexNo: 512, name: "Oniridrak", types: ["PSY", "DRAGON"],
        baseStats: { hp: 86, atk: 31, def: 34, spe: 28, spc: 35 }, // BST 214
        learnset: [{ level: 1, moveId: "choc_mental" }, { level: 1, moveId: "draco_souffle" }, { level: 14, moveId: "draco_charge" }, { level: 28, moveId: "vague_mentale" }, { level: 44, moveId: "griffe_draconique" }, { level: 60, moveId: "eveil_divin" }, { level: 84, moveId: "repos" }],
        catchRate: 42, baseExp: 90, rarity: "RARE", growthRate: "medium_fast",
        description: "Fusion exclusive du couloir d'Hypnoppo : un dragon onirique qui endort ses proies.",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    // (Sylvaroc = wistree + tetardoc, ex zone B1F-3 : ABANDONNÉ 23/07 — biotope Wistree sans exclusive.)
    {   // Nécrospore = caninombre + sporbeo (zone B1F-4)
        id: "necrospore", dexNo: 514, name: "Nécrospore", types: ["SPECTRE", "POISON"],
        baseStats: { hp: 77, atk: 20, def: 33, spe: 38, spc: 47 }, // BST 215
        learnset: [{ level: 1, moveId: "ombre_furtive" }, { level: 1, moveId: "dard_venin" }, { level: 14, moveId: "crachat_acide" }, { level: 28, moveId: "griffe_spectrale" }, { level: 44, moveId: "bombe_beurk" }, { level: 60, moveId: "ball_ombre" }, { level: 84, moveId: "miasme_corrosif" }],
        catchRate: 42, baseExp: 90, rarity: "RARE", growthRate: "medium_fast",
        description: "Fusion exclusive du couloir de Caninombre : un spectre-champignon aux spores nécrosantes.",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Ombrepsy = shady + nouillon (zone B1F-5)
        id: "ombrepsy", dexNo: 515, name: "Ombrepsy", types: ["NORMAL", "PSY"],
        baseStats: { hp: 90, atk: 29, def: 38, spe: 41, spc: 18 }, // BST 216
        learnset: [{ level: 1, moveId: "charge" }, { level: 1, moveId: "choc_mental" }, { level: 14, moveId: "vive_attaque" }, { level: 28, moveId: "vague_mentale" }, { level: 46, moveId: "coup_de_boutoir" }, { level: 84, moveId: "eveil_divin" }],
        catchRate: 42, baseExp: 90, rarity: "RARE", growthRate: "medium_fast",
        description: "Fusion exclusive du couloir de Shady : une ombre-nouille aux pouvoirs psychiques troubles.",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // ★ Rocaptère = gavillus + lavapetit (zone B1F-6) — STADE 1 de la SEULE lignée de fusion ÉVOLUTIVE du jeu.
        //   Stats/learnset = calcul-moteur de la fusion des stades de BASE des 2 lignées parentes (fuseStats/fuseTypes).
        //   Learnset = UNION des learnsets de gavillus + lavapetit (la lignée cumule tout via l'évolution). Évolue niv 20
        //   (= moyenne des évos parentes : lavapetit→fissuralave niv17 & gavillus→crocodaillus niv22). Stades ≥2 = SECRETS
        //   (aucun pop Grotte, uniquement par évolution) → cf. fissuraillus/magmaillus plus bas.
        id: "rocaptere", dexNo: 516, name: "Rocaptère", types: ["ROCHE", "VOL"],
        baseStats: { hp: 41, atk: 88, def: 70, spe: 65, spc: 42 }, // BST 306 (fusion base×base : gavillus × lavapetit)
        learnset: [{ level: 1, moveId: "charge" }, { level: 1, moveId: "picpic" }, { level: 1, moveId: "jet_de_sable" }, { level: 8, moveId: "jet_pierres" }, { level: 16, moveId: "flammeche" }, { level: 18, moveId: "malediction" }, { level: 28, moveId: "mur_de_fer" }],
        evolution: { toId: "fissuraillus", method: { kind: "LEVEL", level: 20 } },
        catchRate: 42, baseExp: 90, rarity: "RARE", growthRate: "medium_fast",
        description: "Fusion exclusive du couloir de Gavillus : un ptérosaure de roche magmatique — et l'aube d'une lignée insoupçonnée.",
        sprite: "/yellow/sprites/dex/rocaptere.png", hiddenUntilCaught: true,
    },
    {   // Givrasol = goatiny + guizer (zone B2F)
        id: "givrasol", dexNo: 517, name: "Givrasol", types: ["SOL", "GLACE"],
        baseStats: { hp: 82, atk: 20, def: 39, spe: 21, spc: 52 }, // BST 214
        learnset: [{ level: 1, moveId: "secousse" }, { level: 1, moveId: "coup_d_givre" }, { level: 16, moveId: "tir_boue" }, { level: 30, moveId: "souffle_polaire" }, { level: 46, moveId: "seisme" }, { level: 84, moveId: "blizzard" }],
        catchRate: 42, baseExp: 90, rarity: "RARE", growthRate: "medium_fast",
        description: "Fusion exclusive du Sanctuaire B2F : un béhémoth de sol gelé né de deux créations.",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },

    // ═══════ LIGNÉE ÉVOLUTIVE SECRÈTE (1re fusion qui évolue) — Rocaptère(516) → Fissuraillus → Magmaillus ═══════
    //   Fusion « stade par stade » des 2 lignées Roche/Feu (lavapetit→fissuralave→magmator) et Vol/Roche
    //   (gavillus→crocodaillus→alirocaillus). Stats/types = calcul-moteur (fuseStats/fuseTypes) sur les stats de BASE
    //   des paires correspondantes ; learnset = UNION des 2 parents (l'évolution conserve les acquis → la lignée
    //   apprend ÉNORMÉMENT d'attaques). Stades 2/3 = ULTRA SECRETS : AUCUN pop Grotte, AUCUNE paire dans
    //   FUSION_BASE_PARENTS → obtenables UNIQUEMENT en faisant évoluer Rocaptère, et catalogués seulement au Fusiodex.
    {   // Fissuraillus = fissuralave × crocodaillus (stade 2) — évolue de Rocaptère niv 20, évolue niv 39 (= moy 37 & 40).
        id: "fissuraillus", dexNo: 518, name: "Fissuraillus", types: ["ROCHE", "VOL"],
        baseStats: { hp: 66, atk: 119, def: 96, spe: 86, spc: 47 }, // BST 414 (fusion base×base : fissuralave × crocodaillus)
        learnset: [{ level: 1, moveId: "jet_pierres" }, { level: 1, moveId: "flammeche" }, { level: 1, moveId: "picpic" }, { level: 1, moveId: "jet_de_sable" }, { level: 24, moveId: "vive_attaque" }, { level: 30, moveId: "seisme" }, { level: 30, moveId: "hurlement" }, { level: 36, moveId: "lance_flammes" }, { level: 36, moveId: "mur_de_fer" }],
        evolution: { toId: "magmaillus", method: { kind: "LEVEL", level: 39 } },
        catchRate: 3, baseExp: 155, rarity: "RARE", growthRate: "medium_fast",
        description: "Stade 2 secret : le ptérosaure de roche déploie des ailes membraneuses et laisse la lave suinter de ses fissures.",
        sprite: "/yellow/sprites/dex/fissuraillus.png", hiddenUntilCaught: true,
    },
    {   // Magmaillus = magmator × alirocaillus (stade 3, final) — évolue de Fissuraillus niv 39.
        id: "magmaillus", dexNo: 519, name: "Magmaillus", types: ["ROCHE", "VOL"],
        baseStats: { hp: 68, atk: 148, def: 105, spe: 101, spc: 69 }, // BST 491 (fusion base×base : magmator × alirocaillus)
        learnset: [{ level: 1, moveId: "seisme" }, { level: 1, moveId: "lance_flammes" }, { level: 1, moveId: "jet_pierres" }, { level: 1, moveId: "mur_de_fer" }, { level: 1, moveId: "vive_attaque" }, { level: 42, moveId: "lame_roche" }, { level: 44, moveId: "belier" }, { level: 48, moveId: "carapace_diamant" }, { level: 48, moveId: "berceuse" }, { level: 54, moveId: "vol" }, { level: 60, moveId: "meteores" }],
        catchRate: 3, baseExp: 240, rarity: "RARE", growthRate: "medium_fast",
        description: "Stade 3 secret : un dragon volcanique majestueux dont la roche en fusion irradie à chaque battement d'ailes.",
        sprite: "/yellow/sprites/dex/magmaillus.png", hiddenUntilCaught: true,
    },

    // ═══════ ÉVOLUTIONS DES 11 FUSIONS CAPTURABLES (S2→S5) — Claude 19/08. Stades ≥2 = ULTRA SECRETS (aucun pop
    //   Grotte, hors FUSION_BASE_PARENTS) : obtenables UNIQUEMENT par évolution, catalogués au seul Fusiodex.
    //   Stats finales polarisées (fidèles aux parents), Spé≤150. Sprites = placeholder (auto-gen au 1er capture).
    //   ⚠️ Mottelave→…→Sidérobloc(S4 Roche/Métal)→Sidéralithe(S5, niv 100). Sidérobloc via niv 50 (⏳ à passer sur
    //   le Noyau de Métal quand le moteur gèrera l évolution par objet). ═══════
    {   // Scoriève (dex 520)
        id: "scorieve", dexNo: 520, name: "Scoriève", types: ["ROCHE", "FEU"],
        baseStats: { hp: 74, atk: 58, def: 92, spe: 25, spc: 49 },
        learnset: [{ level: 1, moveId: "charge" }, { level: 1, moveId: "jet_pierres" }, { level: 6, moveId: "flammeche" }, { level: 12, moveId: "mur_de_fer" }, { level: 18, moveId: "tison" }, { level: 24, moveId: "eboulis" }, { level: 32, moveId: "flamme_ardente" }, { level: 42, moveId: "secousse" }, { level: 52, moveId: "lame_roche" }, { level: 64, moveId: "lance_flammes" }, { level: 78, moveId: "seisme" }, { level: 92, moveId: "roc_titanesque" }],
        evolution: { toId: "basaltor", method: { kind: "LEVEL", level: 25 } },
        catchRate: 3, baseExp: 160, rarity: "RARE", growthRate: "medium_fast",
        description: "Scoriève — stade 2 (secret) de la lignee Mottelave. Evolue de Mottelave.",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Basaltor (dex 521)
        id: "basaltor", dexNo: 521, name: "Basaltor", types: ["ROCHE", "FEU"],
        baseStats: { hp: 105, atk: 55, def: 130, spe: 32, spc: 47 },
        learnset: [{ level: 1, moveId: "charge" }, { level: 1, moveId: "jet_pierres" }, { level: 6, moveId: "flammeche" }, { level: 12, moveId: "mur_de_fer" }, { level: 18, moveId: "tison" }, { level: 24, moveId: "eboulis" }, { level: 32, moveId: "flamme_ardente" }, { level: 42, moveId: "secousse" }, { level: 52, moveId: "lame_roche" }, { level: 64, moveId: "lance_flammes" }, { level: 78, moveId: "seisme" }, { level: 92, moveId: "roc_titanesque" }],
        evolution: { toId: "siderobloc", method: { kind: "LEVEL", level: 50 } },
        catchRate: 3, baseExp: 230, rarity: "RARE", growthRate: "medium_fast",
        description: "Basaltor — stade 3 de la lignee Mottelave (Mur physique).",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Sidérobloc (dex 522)
        id: "siderobloc", dexNo: 522, name: "Sidérobloc", types: ["ROCHE", "METAL"],
        baseStats: { hp: 115, atk: 125, def: 152, spe: 43, spc: 100 },
        learnset: [{ level: 1, moveId: "charge" }, { level: 1, moveId: "jet_pierres" }, { level: 12, moveId: "mur_de_fer" }, { level: 24, moveId: "eboulis" }, { level: 34, moveId: "tete_de_fer" }, { level: 40, moveId: "carapace_diamant" }, { level: 42, moveId: "secousse" }, { level: 52, moveId: "lame_roche" }, { level: 56, moveId: "plaquage" }, { level: 70, moveId: "poing_meteore" }, { level: 78, moveId: "seisme" }, { level: 92, moveId: "roc_titanesque" }],
        evolution: { toId: "sideralithe", method: { kind: "LEVEL", level: 100 } },
        catchRate: 3, baseExp: 300, rarity: "RARE", growthRate: "medium_fast",
        description: "Sidérobloc — la lave refroidie de la lignée Mottelave s a mue en un colosse de fer et de roche.",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Sidéralithe (dex 523)
        id: "sideralithe", dexNo: 523, name: "Sidéralithe", types: ["ROCHE", "METAL"],
        baseStats: { hp: 120, atk: 135, def: 158, spe: 45, spc: 112 },
        learnset: [{ level: 1, moveId: "charge" }, { level: 1, moveId: "jet_pierres" }, { level: 12, moveId: "mur_de_fer" }, { level: 24, moveId: "eboulis" }, { level: 34, moveId: "tete_de_fer" }, { level: 40, moveId: "carapace_diamant" }, { level: 42, moveId: "secousse" }, { level: 52, moveId: "lame_roche" }, { level: 56, moveId: "plaquage" }, { level: 70, moveId: "poing_meteore" }, { level: 78, moveId: "seisme" }, { level: 92, moveId: "roc_titanesque" }],
        catchRate: 3, baseExp: 340, rarity: "RARE", growthRate: "medium_fast",
        description: "Sidéralithe — titan ultime de roche et de metal magnetise, aboutissement de la lignee Mottoche.",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Nouïbrume (dex 524)
        id: "nouibrume", dexNo: 524, name: "Nouïbrume", types: ["EAU", "PSY"],
        baseStats: { hp: 74, atk: 45, def: 59, spe: 69, spc: 94 },
        learnset: [{ level: 1, moveId: "charge" }, { level: 1, moveId: "pistolet_a_o" }, { level: 7, moveId: "choc_mental" }, { level: 14, moveId: "onde_folie" }, { level: 20, moveId: "lame_eau" }, { level: 24, moveId: "osmose" }, { level: 28, moveId: "repos" }, { level: 30, moveId: "focalisation" }, { level: 36, moveId: "onde_cerebrale" }, { level: 46, moveId: "deferlante" }, { level: 58, moveId: "vague_mentale" }, { level: 72, moveId: "eveil_divin" }, { level: 88, moveId: "hydrocanon" }],
        evolution: { toId: "oniromouille", method: { kind: "LEVEL", level: 35 } },
        catchRate: 3, baseExp: 160, rarity: "RARE", growthRate: "medium_fast",
        description: "Nouïbrume — stade 2 (secret) de la lignee Nouiflot. Evolue de Nouiflot.",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Oniromouille (dex 525)
        id: "oniromouille", dexNo: 525, name: "Oniromouille", types: ["EAU", "PSY"],
        baseStats: { hp: 91, atk: 45, def: 45, spe: 124, spc: 150 },
        learnset: [{ level: 1, moveId: "charge" }, { level: 1, moveId: "pistolet_a_o" }, { level: 7, moveId: "choc_mental" }, { level: 14, moveId: "onde_folie" }, { level: 20, moveId: "lame_eau" }, { level: 24, moveId: "osmose" }, { level: 28, moveId: "repos" }, { level: 30, moveId: "focalisation" }, { level: 36, moveId: "onde_cerebrale" }, { level: 46, moveId: "deferlante" }, { level: 58, moveId: "vague_mentale" }, { level: 72, moveId: "eveil_divin" }, { level: 88, moveId: "hydrocanon" }],
        catchRate: 3, baseExp: 245, rarity: "RARE", growthRate: "medium_fast",
        description: "Oniromouille — forme finale de la lignee Nouiflot (Attaquant spé frêle).",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Spectrelame (dex 526)
        id: "spectrelame", dexNo: 526, name: "Spectrelame", types: ["SPECTRE", "POISON"],
        baseStats: { hp: 68, atk: 72, def: 62, spe: 75, spc: 91 },
        learnset: [{ level: 1, moveId: "leche" }, { level: 1, moveId: "dard_venin" }, { level: 8, moveId: "ombre_furtive" }, { level: 14, moveId: "crachat_acide" }, { level: 22, moveId: "mega_sangsue" }, { level: 30, moveId: "drain_ame" }, { level: 40, moveId: "toxik" }, { level: 40, moveId: "plaquage" }, { level: 46, moveId: "focalisation" }, { level: 50, moveId: "griffe_spectrale" }, { level: 62, moveId: "miasme_corrosif" }, { level: 76, moveId: "ball_ombre" }, { level: 90, moveId: "bombe_beurk" }],
        evolution: { toId: "necromante", method: { kind: "LEVEL", level: 36 } },
        catchRate: 3, baseExp: 160, rarity: "RARE", growthRate: "medium_fast",
        description: "Spectrelame — stade 2 (secret) de la lignee Sporémante. Evolue de Sporémante.",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Nécromante (dex 527)
        id: "necromante", dexNo: 527, name: "Nécromante", types: ["SPECTRE", "POISON"],
        baseStats: { hp: 60, atk: 121, def: 49, spe: 87, spc: 141 },
        learnset: [{ level: 1, moveId: "leche" }, { level: 1, moveId: "dard_venin" }, { level: 8, moveId: "ombre_furtive" }, { level: 14, moveId: "crachat_acide" }, { level: 22, moveId: "mega_sangsue" }, { level: 30, moveId: "drain_ame" }, { level: 40, moveId: "toxik" }, { level: 40, moveId: "plaquage" }, { level: 46, moveId: "focalisation" }, { level: 50, moveId: "griffe_spectrale" }, { level: 62, moveId: "miasme_corrosif" }, { level: 76, moveId: "ball_ombre" }, { level: 90, moveId: "bombe_beurk" }],
        catchRate: 3, baseExp: 245, rarity: "RARE", growthRate: "medium_fast",
        description: "Nécromante — forme finale de la lignee Sporémante (Attaquant mixte).",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Carapoing (dex 528)
        id: "carapoing", dexNo: 528, name: "Carapoing", types: ["INSECTE", "ROCHE"],
        baseStats: { hp: 66, atk: 90, def: 73, spe: 91, spc: 45 },
        learnset: [{ level: 1, moveId: "charge" }, { level: 1, moveId: "dard_nuee" }, { level: 6, moveId: "jet_pierres" }, { level: 12, moveId: "vive_attaque" }, { level: 18, moveId: "morsure" }, { level: 26, moveId: "eboulis" }, { level: 34, moveId: "dard_mortel" }, { level: 36, moveId: "danse_lames" }, { level: 44, moveId: "lame_roche" }, { level: 44, moveId: "carapace_diamant" }, { level: 56, moveId: "dard_fatal" }, { level: 70, moveId: "seisme" }, { level: 84, moveId: "roc_titanesque" }],
        evolution: { toId: "roctobrute", method: { kind: "LEVEL", level: 35 } },
        catchRate: 3, baseExp: 160, rarity: "RARE", growthRate: "medium_fast",
        description: "Carapoing — stade 2 (secret) de la lignee Ruffardoc. Evolue de Ruffardoc.",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Roctobrute (dex 529)
        id: "roctobrute", dexNo: 529, name: "Roctobrute", types: ["INSECTE", "ROCHE"],
        baseStats: { hp: 86, atk: 150, def: 114, spe: 76, spc: 54 },
        learnset: [{ level: 1, moveId: "charge" }, { level: 1, moveId: "dard_nuee" }, { level: 6, moveId: "jet_pierres" }, { level: 12, moveId: "vive_attaque" }, { level: 18, moveId: "morsure" }, { level: 26, moveId: "eboulis" }, { level: 34, moveId: "dard_mortel" }, { level: 36, moveId: "danse_lames" }, { level: 44, moveId: "lame_roche" }, { level: 44, moveId: "carapace_diamant" }, { level: 56, moveId: "dard_fatal" }, { level: 70, moveId: "seisme" }, { level: 84, moveId: "roc_titanesque" }],
        catchRate: 3, baseExp: 245, rarity: "RARE", growthRate: "medium_fast",
        description: "Roctobrute — forme finale de la lignee Ruffardoc (Bruiser phys costaud).",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Voltriss (dex 530)
        id: "voltriss", dexNo: 530, name: "Voltriss", types: ["ELEC", "DRAGON"],
        baseStats: { hp: 67, atk: 85, def: 52, spe: 98, spc: 73 },
        learnset: [{ level: 1, moveId: "charge" }, { level: 1, moveId: "etincelle" }, { level: 6, moveId: "picpic" }, { level: 12, moveId: "vive_attaque" }, { level: 13, moveId: "draco_souffle" }, { level: 20, moveId: "surtension" }, { level: 28, moveId: "cage_eclair" }, { level: 36, moveId: "griffe_draconique" }, { level: 40, moveId: "danse_lames" }, { level: 46, moveId: "fulgurance" }, { level: 58, moveId: "draco_charge" }, { level: 72, moveId: "ultra_foudre" }, { level: 88, moveId: "souffle_primordial" }],
        evolution: { toId: "draconvolt", method: { kind: "LEVEL", level: 38 } },
        catchRate: 3, baseExp: 160, rarity: "RARE", growthRate: "medium_fast",
        description: "Voltriss — stade 2 (secret) de la lignee Dractriss. Evolue de Dractriss.",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Draconvolt (dex 531)
        id: "draconvolt", dexNo: 531, name: "Draconvolt", types: ["ELEC", "DRAGON"],
        baseStats: { hp: 90, atk: 142, def: 58, spe: 140, spc: 74 },
        learnset: [{ level: 1, moveId: "charge" }, { level: 1, moveId: "etincelle" }, { level: 6, moveId: "picpic" }, { level: 12, moveId: "vive_attaque" }, { level: 13, moveId: "draco_souffle" }, { level: 20, moveId: "surtension" }, { level: 28, moveId: "cage_eclair" }, { level: 36, moveId: "griffe_draconique" }, { level: 40, moveId: "danse_lames" }, { level: 46, moveId: "fulgurance" }, { level: 58, moveId: "draco_charge" }, { level: 72, moveId: "ultra_foudre" }, { level: 88, moveId: "souffle_primordial" }],
        catchRate: 3, baseExp: 245, rarity: "RARE", growthRate: "medium_fast",
        description: "Draconvolt — forme finale de la lignee Dractriss (Sweeper physique).",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Éolectre (dex 532)
        id: "eolectre", dexNo: 532, name: "Éolectre", types: ["ELEC", "VOL"],
        baseStats: { hp: 78, atk: 68, def: 56, spe: 116, spc: 98 },
        learnset: [{ level: 1, moveId: "etincelle" }, { level: 1, moveId: "picpic" }, { level: 10, moveId: "vive_attaque" }, { level: 12, moveId: "tornade" }, { level: 22, moveId: "cage_eclair" }, { level: 34, moveId: "fonce_bec" }, { level: 34, moveId: "focalisation" }, { level: 48, moveId: "fulgurance" }, { level: 64, moveId: "pique_fatal" }, { level: 84, moveId: "ultra_foudre" }],
        evolution: { toId: "stratevolt", method: { kind: "LEVEL", level: 48 } },
        catchRate: 3, baseExp: 160, rarity: "RARE", growthRate: "medium_fast",
        description: "Éolectre — stade 2 (secret) de la lignee Voltaile. Evolue de Voltaile.",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Stratévolt (dex 533)
        id: "stratevolt", dexNo: 533, name: "Stratévolt", types: ["ELEC", "VOL"],
        baseStats: { hp: 91, atk: 66, def: 54, spe: 140, spc: 134 },
        learnset: [{ level: 1, moveId: "etincelle" }, { level: 1, moveId: "picpic" }, { level: 10, moveId: "vive_attaque" }, { level: 12, moveId: "tornade" }, { level: 22, moveId: "cage_eclair" }, { level: 34, moveId: "fonce_bec" }, { level: 34, moveId: "focalisation" }, { level: 48, moveId: "fulgurance" }, { level: 64, moveId: "pique_fatal" }, { level: 84, moveId: "ultra_foudre" }],
        catchRate: 3, baseExp: 245, rarity: "RARE", growthRate: "medium_fast",
        description: "Stratévolt — forme finale de la lignee Voltaile (Sweeper spé rapide).",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Abyssonde (dex 534)
        id: "abyssonde", dexNo: 534, name: "Abyssonde", types: ["EAU", "ELEC"],
        baseStats: { hp: 77, atk: 52, def: 84, spe: 58, spc: 103 },
        learnset: [{ level: 1, moveId: "pistolet_a_o" }, { level: 1, moveId: "etincelle" }, { level: 12, moveId: "lame_eau" }, { level: 24, moveId: "cage_eclair" }, { level: 26, moveId: "osmose" }, { level: 30, moveId: "repos" }, { level: 38, moveId: "deferlante" }, { level: 52, moveId: "fulgurance" }, { level: 68, moveId: "hydrocanon" }, { level: 84, moveId: "ultra_foudre" }],
        evolution: { toId: "marefoudre", method: { kind: "LEVEL", level: 38 } },
        catchRate: 3, baseExp: 160, rarity: "RARE", growthRate: "medium_fast",
        description: "Abyssonde — stade 2 (secret) de la lignee Abyssvolt. Evolue de Abyssvolt.",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Maréfoudre (dex 535)
        id: "marefoudre", dexNo: 535, name: "Maréfoudre", types: ["EAU", "ELEC"],
        baseStats: { hp: 102, atk: 45, def: 121, spe: 74, spc: 150 },
        learnset: [{ level: 1, moveId: "pistolet_a_o" }, { level: 1, moveId: "etincelle" }, { level: 12, moveId: "lame_eau" }, { level: 24, moveId: "cage_eclair" }, { level: 26, moveId: "osmose" }, { level: 30, moveId: "repos" }, { level: 38, moveId: "deferlante" }, { level: 52, moveId: "fulgurance" }, { level: 68, moveId: "hydrocanon" }, { level: 84, moveId: "ultra_foudre" }],
        catchRate: 3, baseExp: 245, rarity: "RARE", growthRate: "medium_fast",
        description: "Maréfoudre — forme finale de la lignee Abyssvolt (Tank spécial).",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Oniragon (dex 536)
        id: "oniragon", dexNo: 536, name: "Oniragon", types: ["PSY", "DRAGON"],
        baseStats: { hp: 91, atk: 66, def: 58, spe: 92, spc: 82 },
        learnset: [{ level: 1, moveId: "choc_mental" }, { level: 1, moveId: "draco_souffle" }, { level: 14, moveId: "draco_charge" }, { level: 28, moveId: "vague_mentale" }, { level: 38, moveId: "plaquage" }, { level: 44, moveId: "griffe_draconique" }, { level: 44, moveId: "focalisation" }, { level: 60, moveId: "eveil_divin" }, { level: 84, moveId: "repos" }],
        evolution: { toId: "songedrak", method: { kind: "LEVEL", level: 37 } },
        catchRate: 3, baseExp: 160, rarity: "RARE", growthRate: "medium_fast",
        description: "Oniragon — stade 2 (secret) de la lignee Oniridrak. Evolue de Oniridrak.",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Songedrak (dex 537)
        id: "songedrak", dexNo: 537, name: "Songedrak", types: ["PSY", "DRAGON"],
        baseStats: { hp: 121, atk: 63, def: 99, spe: 94, spc: 126 },
        learnset: [{ level: 1, moveId: "choc_mental" }, { level: 1, moveId: "draco_souffle" }, { level: 14, moveId: "draco_charge" }, { level: 28, moveId: "vague_mentale" }, { level: 38, moveId: "plaquage" }, { level: 44, moveId: "griffe_draconique" }, { level: 44, moveId: "focalisation" }, { level: 60, moveId: "eveil_divin" }, { level: 84, moveId: "repos" }],
        catchRate: 3, baseExp: 245, rarity: "RARE", growthRate: "medium_fast",
        description: "Songedrak — forme finale de la lignee Oniridrak (Pivot spé encaisseur).",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Sporcrypte (dex 538)
        id: "sporcrypte", dexNo: 538, name: "Sporcrypte", types: ["SPECTRE", "POISON"],
        baseStats: { hp: 77, atk: 38, def: 65, spe: 81, spc: 114 },
        learnset: [{ level: 1, moveId: "ombre_furtive" }, { level: 1, moveId: "dard_venin" }, { level: 14, moveId: "crachat_acide" }, { level: 22, moveId: "toxik" }, { level: 28, moveId: "griffe_spectrale" }, { level: 40, moveId: "focalisation" }, { level: 44, moveId: "bombe_beurk" }, { level: 60, moveId: "ball_ombre" }, { level: 84, moveId: "miasme_corrosif" }],
        evolution: { toId: "miasmort", method: { kind: "LEVEL", level: 38 } },
        catchRate: 3, baseExp: 160, rarity: "RARE", growthRate: "medium_fast",
        description: "Sporcrypte — stade 2 (secret) de la lignee Nécrospore. Evolue de Nécrospore.",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Miasmort (dex 539)
        id: "miasmort", dexNo: 539, name: "Miasmort", types: ["SPECTRE", "POISON"],
        baseStats: { hp: 92, atk: 50, def: 67, spe: 136, spc: 150 },
        learnset: [{ level: 1, moveId: "ombre_furtive" }, { level: 1, moveId: "dard_venin" }, { level: 14, moveId: "crachat_acide" }, { level: 22, moveId: "toxik" }, { level: 28, moveId: "griffe_spectrale" }, { level: 40, moveId: "focalisation" }, { level: 44, moveId: "bombe_beurk" }, { level: 60, moveId: "ball_ombre" }, { level: 84, moveId: "miasme_corrosif" }],
        catchRate: 3, baseExp: 245, rarity: "RARE", growthRate: "medium_fast",
        description: "Miasmort — forme finale de la lignee Nécrospore (Glass-cannon spé).",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Ombrelin (dex 540)
        id: "ombrelin", dexNo: 540, name: "Ombrelin", types: ["NORMAL", "PSY"],
        baseStats: { hp: 76, atk: 73, def: 59, spe: 76, spc: 61 },
        learnset: [{ level: 1, moveId: "charge" }, { level: 1, moveId: "choc_mental" }, { level: 14, moveId: "vive_attaque" }, { level: 28, moveId: "vague_mentale" }, { level: 30, moveId: "plaquage" }, { level: 42, moveId: "danse_lames" }, { level: 46, moveId: "coup_de_boutoir" }, { level: 84, moveId: "eveil_divin" }],
        evolution: { toId: "psychombre", method: { kind: "LEVEL", level: 37 } },
        catchRate: 3, baseExp: 160, rarity: "RARE", growthRate: "medium_fast",
        description: "Ombrelin — stade 2 (secret) de la lignee Ombrepsy. Evolue de Ombrepsy.",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Psychombre (dex 541)
        id: "psychombre", dexNo: 541, name: "Psychombre", types: ["NORMAL", "PSY"],
        baseStats: { hp: 71, atk: 134, def: 45, spe: 133, spc: 98 },
        learnset: [{ level: 1, moveId: "charge" }, { level: 1, moveId: "choc_mental" }, { level: 14, moveId: "vive_attaque" }, { level: 28, moveId: "vague_mentale" }, { level: 30, moveId: "plaquage" }, { level: 42, moveId: "danse_lames" }, { level: 46, moveId: "coup_de_boutoir" }, { level: 84, moveId: "eveil_divin" }],
        catchRate: 3, baseExp: 245, rarity: "RARE", growthRate: "medium_fast",
        description: "Psychombre — forme finale de la lignee Ombrepsy (Attaquant mixte rapide).",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Givrèbre (dex 542)
        id: "givrebre", dexNo: 542, name: "Givrèbre", types: ["SOL", "GLACE"],
        baseStats: { hp: 97, atk: 45, def: 82, spe: 49, spc: 132 },
        learnset: [{ level: 1, moveId: "secousse" }, { level: 1, moveId: "coup_d_givre" }, { level: 16, moveId: "tir_boue" }, { level: 30, moveId: "souffle_polaire" }, { level: 36, moveId: "repos" }, { level: 46, moveId: "seisme" }, { level: 48, moveId: "focalisation" }, { level: 84, moveId: "blizzard" }],
        evolution: { toId: "cryolithe", method: { kind: "LEVEL", level: 35 } },
        catchRate: 3, baseExp: 160, rarity: "RARE", growthRate: "medium_fast",
        description: "Givrèbre — stade 2 (secret) de la lignee Givrasol. Evolue de Givrasol.",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Cryolithe (dex 543)
        id: "cryolithe", dexNo: 543, name: "Cryolithe", types: ["SOL", "GLACE"],
        baseStats: { hp: 124, atk: 45, def: 130, spe: 33, spc: 150 },
        learnset: [{ level: 1, moveId: "secousse" }, { level: 1, moveId: "coup_d_givre" }, { level: 16, moveId: "tir_boue" }, { level: 30, moveId: "souffle_polaire" }, { level: 36, moveId: "repos" }, { level: 46, moveId: "seisme" }, { level: 48, moveId: "focalisation" }, { level: 84, moveId: "blizzard" }],
        catchRate: 3, baseExp: 245, rarity: "RARE", growthRate: "medium_fast",
        description: "Cryolithe — forme finale de la lignee Givrasol (Mur spécial (très lent)).",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
]

/** Ids des 5 fusions de base (utile pour les pools/pop de la Grotte + le Fusiodex). */
export const FUSION_BASE_IDS = FUSION_BASE_SPECIES.map((s) => s.id)

/** Liens d'évolution S1→S2 des 11 fusions capturables (posés sur les entrées de base ci-dessus). Placés ici pour
 *  garder les entrées de base lisibles. La cible (S2) DOIT être une entrée FUSION_BASE_SPECIES (résolue getSpecies). */
const FUSION_S1_EVOLUTIONS: Record<string, { toId: string; level: number }> = {
    mottelave: {
        "toId": "scorieve",
        level: 13
    },
    nouiflot: {
        "toId": "nouibrume",
        level: 17
    },
    sporemante: {
        "toId": "spectrelame",
        level: 18
    },
    ruffardoc: {
        "toId": "carapoing",
        level: 17
    },
    dractriss: {
        "toId": "voltriss",
        level: 18
    },
    voltaile: {
        "toId": "eolectre",
        level: 38
    },
    abyssvolt: {
        "toId": "abyssonde",
        level: 19
    },
    oniridrak: {
        "toId": "oniragon",
        level: 18
    },
    necrospore: {
        "toId": "sporcrypte",
        level: 18
    },
    ombrepsy: {
        "toId": "ombrelin",
        level: 19
    },
    givrasol: {
        "toId": "givrebre",
        level: 26
    }
}
for (const _s of FUSION_BASE_SPECIES) { const _e = FUSION_S1_EVOLUTIONS[_s.id]; if (_e && !_s.evolution) _s.evolution = { toId: _e.toId, method: { kind: "LEVEL", level: _e.level } } }


/** Paires de parents → fusion de base (pour la règle « pop après les 2 parents consécutifs » dans la Grotte). */
export const FUSION_BASE_PARENTS: Record<string, [string, string]> = {
    mottelave: ["mottoche", "lavapetit"],
    nouiflot: ["nouillon", "piouflot"],
    sporemante: ["revemante", "sporbeo"],
    ruffardoc: ["ruffiant", "tetardoc"],
    dractriss: ["draclet", "electroatiss"],
    // Fusions EXCLUSIVES de zone (Grotte du Nexus) — le parent gauche est l'espèce exclusive de la zone → garantit l'exclusivité.
    voltaile: ["batchu", "draclet"],           // 1F
    abyssvolt: ["obscurene", "electroatiss"],  // B1F-1
    oniridrak: ["hypnoppo", "draclet"],        // B1F-2
    // (sylvaroc = wistree + tetardoc, ex B1F-3 : ABANDONNÉ 23/07)
    necrospore: ["caninombre", "sporbeo"],     // B1F-4
    ombrepsy: ["shady", "nouillon"],           // B1F-5
    rocaptere: ["gavillus", "lavapetit"],      // B1F-6
    givrasol: ["goatiny", "guizer"],           // B2F
}

/** La fusion de base dont {a,b} sont les 2 parents (n'importe quel ordre), ou null. Sert à la règle de pop Grotte. */
export function fusionForParents(a: string, b: string): string | null {
    for (const fus of Object.keys(FUSION_BASE_PARENTS)) {
        const [pa, pb] = FUSION_BASE_PARENTS[fus]
        if ((a === pa && b === pb) || (a === pb && b === pa)) return fus
    }
    return null
}
