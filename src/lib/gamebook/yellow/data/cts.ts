// src/lib/gamebook/yellow/data/cts.ts
//
// Nexus Jaune Éclair — catalogue des CT (Capsules Techniques).
// Une CT enseigne une attaque du pool à un Daemon compatible (passe par
// l'écran d'apprentissage si les 4 slots sont pleins). Payées en reps.
//
// GATING : certaines CT ne sont vendues qu'une fois le badge de la salle
// correspondante obtenu (arène : Feu / Plante / Eau). Les CT "champion" ne
// se débloquent qu'avec les 3 badges. Les CT utilitaires sont dispo dès le départ.
//
// ⚠️ La BOUTIQUE de CT (UI) et les BADGES ne sont pas encore codés : ce fichier
// est la SOURCE DE VÉRITÉ de la liste à mettre en place. Réutilisera resolveLearn().

import { getMove } from "./moves"
import type { SpeciesData, PokeType } from "../battle/types"

/** Badge requis pour acheter une CT (aligné sur les salles de l'arène). */
export type BadgeId = "feu" | "plante" | "eau" | "roche" | "elec"

export interface CtData {
    id: string          // "ct01"
    label: string       // "CT01"
    moveId: string      // attaque enseignée (cf. moves.ts)
    price: number       // coût en reps
    /** Badge requis pour l'acheter (absent = disponible dès le départ). */
    badge?: BadgeId
    /** Requiert les 3 badges (CT de fin, vendues au champion / hub). */
    champion?: boolean
    /** CADEAU : remise gratuitement par un boss, JAMAIS en vente (trophée). */
    gift?: boolean
    /** Enseignable à N'IMPORTE QUEL Daemon (moves de stat/utilité), sinon compat de type. */
    universal?: boolean
    /** TYPES SUPPLÉMENTAIRES autorisés à apprendre la CT (en plus du type de l'attaque) — façon Gen 1,
     *  où les grosses TM (Laser Glace, Séisme…) s'apprenaient bien au-delà de leur type. */
    alsoTypes?: PokeType[]
    /** EXCLUSIVE AU LABO : jamais en boutique. S'obtient UNIQUEMENT en réussissant le défi CT du labo. */
    labOnly?: boolean
    /** Nb de badges MINIMUM pour l'acheter (CT fortes débloquées au fil de la progression). 0/absent = dès le départ. */
    minBadges?: number
}
// NB : TOUTE CT est un « achat unique » (cf. purchasableCts + boughtCts) — Gen 1, une TM = un usage.

export const CTS: CtData[] = [
    // --- Utilitaires : disponibles dès le départ (boutique principale) ---
    { id: "ct01", label: "CT01", moveId: "danse_lames", price: 280, universal: true },
    { id: "ct02", label: "CT02", moveId: "mur_de_fer", price: 240, universal: true },
    { id: "ct03", label: "CT03", moveId: "repos", price: 320, universal: true },
    { id: "ct04", label: "CT04", moveId: "elan", price: 210, universal: true },
    { id: "ct05", label: "CT05", moveId: "toxik", price: 280, universal: true },
    { id: "ct06", label: "CT06", moveId: "onde_folie", price: 240, universal: true },
    { id: "ct07", label: "CT07", moveId: "vive_attaque", price: 210, universal: true },

    // --- Débloquées par le BADGE FEU ---
    { id: "ct08", label: "CT08", moveId: "lance_flammes", price: 490, badge: "feu", alsoTypes: ["DRAGON", "NORMAL"] },
    { id: "ct09", label: "CT09", moveId: "flamme_ardente", price: 350, badge: "feu" },

    // --- Débloquées par le BADGE PLANTE ---
    { id: "ct10", label: "CT10", moveId: "tempete_verte", price: 490, badge: "plante" },
    { id: "ct11", label: "CT11", moveId: "vampigraine", price: 320, badge: "plante" },

    // --- Débloquées par le BADGE EAU ---
    { id: "ct12", label: "CT12", moveId: "hydrocanon", price: 530, badge: "eau", alsoTypes: ["GLACE", "SOL", "DRAGON", "NORMAL"] },
    { id: "ct13", label: "CT13", moveId: "souffle_polaire", price: 420, badge: "eau", alsoTypes: ["EAU", "VOL", "DRAGON", "NORMAL", "SOL"] },

    // --- CT "champion" : nécessitent les 3 badges ---
    { id: "ct14", label: "CT14", moveId: "seisme", price: 630, champion: true, alsoTypes: ["ROCHE", "DRAGON", "NORMAL"] },
    { id: "ct15", label: "CT15", moveId: "draco_charge", price: 630, champion: true, alsoTypes: ["VOL", "EAU", "NORMAL"] },
    { id: "ct16", label: "CT16", moveId: "vague_mentale", price: 560, champion: true, alsoTypes: ["NORMAL", "SPECTRE", "POISON"] },

    // --- CT signature : CADEAU du Druide (jamais en vente, gratuite à enseigner) ---
    { id: "ct17", label: "CT17", moveId: "etreinte_sylvestre", price: 0, gift: true },

    // --- Utilitaire set-up : boost de Spé, apprenable par TOUS (dispo dès le départ) ---
    { id: "ct18", label: "CT18", moveId: "focalisation", price: 320, universal: true },

    // --- CT signature ROCHE : CADEAU du boss d'arène Roche (jamais en vente) ---
    { id: "ct19", label: "CT19", moveId: "faille_sismique", price: 0, gift: true },
    // --- CT Roche en vente (débloquée par le badge roche) ---
    { id: "ct20", label: "CT20", moveId: "lame_roche", price: 490, badge: "roche", alsoTypes: ["SOL", "COMBAT", "NORMAL"] },

    // --- CT signature FEU : CADEAU de la boss PYRA (Arène Feu, jamais en vente) ---
    { id: "ct21", label: "CT21", moveId: "pyrotechnie", price: 0, gift: true },

    // --- CT signature ÉLEC : CADEAU du boss VOLTA (Tour Hertz, jamais en vente) ---
    { id: "ct22", label: "CT22", moveId: "surtension", price: 0, gift: true },
    // --- CT Élec en vente (débloquées par le badge elec) ---
    { id: "ct23", label: "CT23", moveId: "etincelle", price: 350, badge: "elec", alsoTypes: ["NORMAL", "DRAGON"] },
    { id: "ct24", label: "CT24", moveId: "fulgurance", price: 530, badge: "elec", alsoTypes: ["NORMAL", "DRAGON"] },
    // Mirage : esquive cumulable, puissante → CADEAU EXCLUSIF de la revanche de VOLTA
    // (jamais en vente, comme Surtension). Remise avec ct22 à la victoire du rematch boss.
    { id: "ct25", label: "CT25", moveId: "mirage", price: 0, gift: true, universal: true }, // Mirage = utilitaire d'esquive → apprenable par TOUS
    // CADEAU SPECTRE : récompense du PNJ "collectionneur de spectres" de Cendreville (montre 3 spectres
    // différents + bats-le 3×). Premier gros move SPECTRE enseignable par CT.
    { id: "ct26", label: "CT26", moveId: "frappe_audela", price: 0, gift: true },
    { id: "ct27", label: "CT27", moveId: "deferlante", price: 0, gift: true },
    // --- CT COMBAT (Champion, 3 badges) : « Crochet du Maître » multi-coups (2-5×). Seule CT de type Combat. ---
    { id: "ct28", label: "CT28", moveId: "deluge_crochets", price: 630, champion: true },
    // --- CT NORMAL forte « Plaquage » (Body Slam : 85 + paralysie) : apprenable par TOUT LE MONDE (universal). ---
    { id: "ct29", label: "CT29", moveId: "plaquage", price: 450, universal: true, minBadges: 2 },
    // --- CT INSECTE « Boul'Pollen » (85 + drain 50%) : 1re CT Insecte ; aussi pour les Plante (pollen). ---
    { id: "ct30", label: "CT30", moveId: "boul_pollen", price: 390, alsoTypes: ["PLANTE"] },
    // --- CT NORMAL « Météores » (ne rate JAMAIS) : la + chère. Apprenable par tous (Normal). ---
    { id: "ct31", label: "CT31", moveId: "meteores", price: 1050, universal: true, minBadges: 4 },
    // === 4 nouvelles CT (refonte movesets lignées core) ===
    // Miasme Corrosif (Poison spé) : STAB spécial pour les Poison ; aussi pour les Spectre spéciaux.
    { id: "ct32", label: "CT32", moveId: "miasme_corrosif", price: 450, alsoTypes: ["SPECTRE"] },
    // Vol (2-temps aérien) : pour les Vol ; aussi dragons & oiseaux Normal.
    { id: "ct33", label: "CT33", moveId: "vol", price: 420, alsoTypes: ["DRAGON", "NORMAL"] },
    // Dard Fatal (Insecte phys) : STAB Insecte fort, longtemps absent.
    { id: "ct34", label: "CT34", moveId: "dard_fatal", price: 420 },
    // Brume Sporale (Plante, anti-set-up) : reset des stats des 2 camps.
    { id: "ct35", label: "CT35", moveId: "brume_sporale", price: 300 },
    // Draco-Rage (Dragon, dégâts fixes 40 — façon Gen 1) : type-lock DRAGON (seuls les Dragons l'apprennent).
    { id: "ct36", label: "CT36", moveId: "draco_rage", price: 380 },
    // CT-TROPHÉE : Souffle Primordial (Dragon spé, le + puissant). JAMAIS en vente — débloquée
    // UNIQUEMENT pour le DÉCUPLE détenteur de la Ligue (10 victoires, cf. hall-of-fame). Type-lock DRAGON.
    { id: "ct37", label: "CT37", moveId: "souffle_primordial", price: 0, gift: true },
    // CADEAU du SBIRE (6e combat du jour, UNE seule fois) : Fouet de Nouilles, universel & modeste.
    { id: "ct38", label: "CT38", moveId: "fouet_de_nouilles", price: 0, gift: true, universal: true },
    // CT39 : Coup de Boutoir (COMBAT, type-lock) — palier fort du défi CT Combat du labo.
    { id: "ct39", label: "CT39", moveId: "coup_de_boutoir", price: 530 },

    // === CT EXCLUSIVES AU LABO (labOnly : jamais en boutique, gagnées seulement au défi CT) ===
    // Donnent une 2e (voire 3e) CT atteignable aux types qui en manquaient. Seuil = puissance × 100.
    // -- VOL (en plus de ct33 vol) --
    { id: "ct40", label: "CT40", moveId: "fonce_bec", price: 0, labOnly: true },        // 75 → 7 500
    { id: "ct41", label: "CT41", moveId: "pique_fatal", price: 0, labOnly: true },       // 90 → 9 000
    // -- GLACE (en plus de ct13 souffle_polaire) --
    { id: "ct42", label: "CT42", moveId: "coup_d_givre", price: 0, labOnly: true },      // 65 → 6 500
    { id: "ct43", label: "CT43", moveId: "blizzard", price: 0, labOnly: true },          // 110 → 11 000
    // -- ROCHE (en plus de ct20 lame_roche) --
    { id: "ct44", label: "CT44", moveId: "eboulis", price: 0, labOnly: true },           // 75 → 7 500
    { id: "ct45", label: "CT45", moveId: "roc_titanesque", price: 0, labOnly: true },    // 120 → 12 000
    // -- DRAGON (en plus de ct15 draco_charge) --
    { id: "ct46", label: "CT46", moveId: "draco_souffle", price: 0, labOnly: true },     // 60 → 6 000
    { id: "ct47", label: "CT47", moveId: "griffe_draconique", price: 0, labOnly: true }, // 80 (physique) → 8 000
    // -- POISON (en plus de ct32 miasme_corrosif) --
    { id: "ct48", label: "CT48", moveId: "crachat_acide", price: 0, labOnly: true },     // 40 → 4 000
    { id: "ct49", label: "CT49", moveId: "bombe_beurk", price: 0, labOnly: true },       // 90 → 9 000
    // -- PSY (en plus de ct16 vague_mentale) ; eveil_divin laissé en signature de Divinpâte --
    { id: "ct50", label: "CT50", moveId: "choc_mental", price: 0, labOnly: true },       // 50 → 5 000
    // -- SPECTRE (en plus de ct26 frappe_audela 85, un cadeau de boss) : 2e tier distinct --
    { id: "ct51", label: "CT51", moveId: "griffe_spectrale", price: 0, labOnly: true },  // 70 → 7 000
    // CT-TROPHÉE BLACKJACK « Apothéose » : attaque adaptative (type du Daemon + meilleure stat offensive,
    // STAB garanti). JAMAIS en vente — débloquée UNIQUEMENT à 1000 ⚡ nets gagnés au blackjack (cf. BLACKJACK_CT_TARGET).
    // universal : enseignable à TOUS (le moteur recale le type/catégorie sur le porteur via adaptiveStab).
    { id: "ct52", label: "CT52", moveId: "apotheose", price: 0, gift: true, universal: true },

    // === CT-CADEAUX EXCLUSIVES AU RUN 2 (New Game+) : offertes par les boss d'arène re-typés, JAMAIS en
    //     vente ni ailleurs. Seul moyen de les apprendre → valorise le run 2. Octroi = victoire du boss en ngplus. ===
    { id: "ct53", label: "CT53", moveId: "serres_aube", price: 0, gift: true, alsoTypes: ["DRAGON", "NORMAL"] },   // Druide/Vol
    { id: "ct54", label: "CT54", moveId: "onde_cerebrale", price: 0, gift: true, alsoTypes: ["SPECTRE"] },        // Granit/Psy
    { id: "ct55", label: "CT55", moveId: "danse_fauve", price: 0, gift: true, universal: true },                 // Pyra/éclectique (set-up universel)
    { id: "ct56", label: "CT56", moveId: "essaim_vorace", price: 0, gift: true, alsoTypes: ["SPECTRE"] },         // Volta/Insecte (les spectres l'apprennent aussi)
    { id: "ct57", label: "CT57", moveId: "frappe_atlas", price: 0, gift: true, alsoTypes: ["ROCHE", "NORMAL"] }, // Ondine/Sol
    // CT COMBAT SIGNATURE « Mitra-Poing » (Focus Punch, la + puissante) — CADEAU du Collectionneur (Maison Combat
    //   run 3) si le joueur a un GAMARUTO en équipe. JAMAIS en vente (gift). Type-lock COMBAT (via canLearnCt).
    { id: "ct58", label: "CT58", moveId: "mitra_poing", price: 0, gift: true },
    // CT59 : Aromathérapie (utilitaire de SOIN d'équipe) — soigne TOUS les statuts de l'ÉQUIPE entière. Apprenable
    // par TOUS (universal), comme Repos/ct03. Distincte de Brume Sporale (ct35, reset des stats, inchangée).
    { id: "ct59", label: "CT59", moveId: "aromatherapie", price: 400, universal: true },
    // CT60 : Reflet Fatal (TÉNÈBRES, spécial 85 + 20% -Spé) — comble le SEUL type sans CT (Ténèbres). INÉDITE :
    //   drop 5% en battant le reflet d'un autre joueur (jamais en vente : gift). Apprenable Ténèbres + Spectre/Psy.
    { id: "ct60", label: "CT60", moveId: "reflet_fatal", price: 0, gift: true, alsoTypes: ["SPECTRE", "PSY"] },
    { id: "ct61", label: "CT61", moveId: "voile_de_givre", price: 0, gift: true, alsoTypes: ["EAU"] }, // récompense des 5 frères Glaçon (Grotte Gelée) — exclusive
]

/** CT-cadeaux EXCLUSIVES au run 2 (boss d'arène en New Game+). Invariant : JAMAIS obtenables autrement —
 *  ni en boutique (gift), ni au défi CT du labo (CT_DEFI_EXCLUDED), ni en Zone de Combat/Usine
 *  (ctRewardOptions). Seul octroi = victoire du boss en ngplus (cf. NGPLUS_BOSS_GIFTS). Source unique. */
export const NGPLUS_EXCLUSIVE_CT_IDS: readonly string[] = ["ct53", "ct54", "ct55", "ct56", "ct57"]

export function getCt(id: string): CtData | null {
    return CTS.find((c) => c.id === id) ?? null
}

/**
 * Un Daemon peut-il apprendre cette CT ?
 * - CT universelle (stat/utilité) → tout le monde.
 * - sinon : type de l'attaque parmi les types du Daemon, OU un des alsoTypes (élargissement Gen 1),
 *   OU attaque NORMAL.
 */
export function canLearnCt(species: SpeciesData, ct: CtData): boolean {
    if (species.learnsAllCts) { // GÉKROC : couteau-suisse, apprend TOUTES les CT (tous types)
        const t = getMove(ct.moveId)?.type // GALIJAH : sauf les types exclus (ex. Ténèbres → bloque l'unique CT Ténèbres ct60)
        return !(t && species.learnsAllCtsExcept?.includes(t))
    }
    if (ct.universal) return true
    const move = getMove(ct.moveId)
    if (!move) return false
    if (move.type === "NORMAL") return true
    if (species.types.includes(move.type)) return true
    return !!ct.alsoTypes?.some((t) => species.types.includes(t)) // types supplémentaires (façon Gen 1)
}

/** Univers de choix de la RÉCOMPENSE UNIQUE du blackjack en run 2 : N'IMPORTE QUELLE CT du jeu — magasin
 *  (universal/badge/champion), cadeaux et exclusives labo confondus, SANS filtre de badge — SAUF les 5
 *  CT-signatures réservées aux boss d'arène (ct53-57) et la CT-trophée « Apothéose » (ct52, propre au run 1). */
export function run2BlackjackCtPool(): string[] {
    const excluded = new Set<string>([...NGPLUS_EXCLUSIVE_CT_IDS, "ct52", "ct58", "ct61"]) // signatures de boss + Apothéose + Mitra-Poing (run 3) + Voile de Givre (frères Glaçon)
    return CTS.filter((c) => !excluded.has(c.id)).map((c) => c.id)
}

/** CT effectivement achetables selon les badges possédés. TOUTE CT est un ACHAT UNIQUE : une fois achetée
 *  (présente dans `bought`), elle est retirée du shop pour de bon. */
export function purchasableCts(badges: BadgeId[], bought: string[] = []): CtData[] {
    const has3 = (["feu", "plante", "eau"] as BadgeId[]).every((b) => badges.includes(b))
    return CTS.filter((c) => {
        if (c.gift) return false // jamais en vente : obtenue uniquement en cadeau
        if (c.labOnly) return false // exclusive au labo : obtenue uniquement au défi CT, jamais en boutique
        if (bought.includes(c.id)) return false // achat unique déjà effectué → retirée du shop
        if (c.minBadges && badges.length < c.minBadges) return false // CT forte : débloquée à N badges
        if (c.champion) return has3
        if (c.badge) return badges.includes(c.badge)
        return true
    })
}
