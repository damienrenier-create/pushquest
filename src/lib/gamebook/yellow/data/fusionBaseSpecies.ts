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
}

/** La fusion de base dont {a,b} sont les 2 parents (n'importe quel ordre), ou null. Sert à la règle de pop Grotte. */
export function fusionForParents(a: string, b: string): string | null {
    for (const fus of Object.keys(FUSION_BASE_PARENTS)) {
        const [pa, pb] = FUSION_BASE_PARENTS[fus]
        if ((a === pa && b === pb) || (a === pb && b === pa)) return fus
    }
    return null
}
