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
    {   // Rocaptère = gavillus + lavapetit (zone B1F-6)
        id: "rocaptere", dexNo: 516, name: "Rocaptère", types: ["ROCHE", "VOL"],
        baseStats: { hp: 74, atk: 47, def: 39, spe: 31, spc: 24 }, // BST 215
        learnset: [{ level: 1, moveId: "jet_pierres" }, { level: 1, moveId: "picpic" }, { level: 14, moveId: "tornade" }, { level: 28, moveId: "eboulis" }, { level: 44, moveId: "fonce_bec" }, { level: 60, moveId: "lame_roche" }, { level: 84, moveId: "roc_titanesque" }],
        catchRate: 42, baseExp: 90, rarity: "RARE", growthRate: "medium_fast",
        description: "Fusion exclusive du couloir de Gavillus : un ptérosaure de roche magmatique.",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
    {   // Givrasol = goatiny + guizer (zone B2F)
        id: "givrasol", dexNo: 517, name: "Givrasol", types: ["SOL", "GLACE"],
        baseStats: { hp: 82, atk: 20, def: 39, spe: 21, spc: 52 }, // BST 214
        learnset: [{ level: 1, moveId: "secousse" }, { level: 1, moveId: "coup_d_givre" }, { level: 16, moveId: "tir_boue" }, { level: 30, moveId: "souffle_polaire" }, { level: 46, moveId: "seisme" }, { level: 84, moveId: "blizzard" }],
        catchRate: 42, baseExp: 90, rarity: "RARE", growthRate: "medium_fast",
        description: "Fusion exclusive du Sanctuaire B2F : un béhémoth de sol gelé né de deux créations.",
        sprite: "/yellow/sprites/dex/missingno.png", hiddenUntilCaught: true,
    },
]

/** Ids des 5 fusions de base (utile pour les pools/pop de la Grotte + le Fusiodex). */
export const FUSION_BASE_IDS = FUSION_BASE_SPECIES.map((s) => s.id)

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
