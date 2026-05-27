// src/lib/gamebook/attacks.ts
//
// v4.0 Phase 2.A — Catalogue d'attaques pour les combats Pokémon-style.
//
// Aucune dépendance Prisma / React. Lib pure, réutilisable serveur + client.
//
// Convention :
//   - `power`        : puissance de base (utilisée dans la formule dégâts Gen 1)
//   - `accuracy`     : 0..100 (% de toucher avant modifs)
//   - `energyCost`   : reps consommés à l'utilisation (l'Intelligence réduit ce coût)
//   - `isPhysical`   : true → utilise FORCE pour l'attaquant + DÉFENSE pour le défenseur
//                     false → utilise INTELLIGENCE pour les deux (catégorie spéciale)
//   - `morphology`   : si défini, l'attaque n'est disponible que pour cette morpho
//                     (variantes propres à chaque animal : Morsure pour crocs, Picpic pour bec, etc.)
//   - `special`      : flags spéciaux ("recoil25" = 25% des dégâts infligés en retour)
//
// Le catalogue est volontairement modeste (Phase 2.A) ; on étendra au fur et à mesure
// (attaques boss, attaques de type rares, etc.).

import type { DaemonType, Morphology } from "./daemon"

export interface Attack {
    key: string
    name: string
    type: DaemonType
    power: number          // 0 = pas de dégâts (status move)
    accuracy: number       // 0..100
    energyCost: number     // reps
    isPhysical: boolean
    morphology?: Morphology
    special?: "recoil25"
    /** v4.0 Phase 9.D — Status à infliger si l'attaque touche.
     *  Si la cible a déjà un status, l'attaque rate son effet (mais peut faire ses dégâts). */
    inflictStatus?: "poison" | "paralysis"
    description?: string
}

// ============================================================
// Attaque de secours "Lutte" — toujours disponible si plus d'énergie
// ============================================================
export const STRUGGLE: Attack = {
    key: "lutte",
    name: "Lutte",
    type: "Normal",
    power: 50,
    accuracy: 100,
    energyCost: 0,
    isPhysical: true,
    special: "recoil25",
    description: "Le Daemon se jette à corps perdu. 25% des dégâts infligés en retour.",
}

// ============================================================
// Catalogue principal
// ============================================================
export const ATTACK_CATALOG: Record<string, Attack> = {
    // ---- Normal (universel) ----
    charge: {
        key: "charge", name: "Charge", type: "Normal",
        power: 10, accuracy: 100, energyCost: 5, isPhysical: true,
        description: "Une bourrade simple. Le minimum vital.",
    },
    griffe: {
        key: "griffe", name: "Griffe", type: "Normal",
        power: 20, accuracy: 100, energyCost: 6, isPhysical: true,
    },
    queue_de_fer: {
        key: "queue_de_fer", name: "Queue de Fer", type: "Normal",
        power: 50, accuracy: 90, energyCost: 10, isPhysical: true,
    },
    ultra_laser: {
        key: "ultra_laser", name: "Ultra-Laser", type: "Normal",
        power: 90, accuracy: 80, energyCost: 25, isPhysical: false,
        description: "Faisceau dévastateur. Cher en énergie.",
    },

    // ---- Crocs (loups, félins, renards...) ----
    morsure: {
        key: "morsure", name: "Morsure", type: "Normal",
        power: 40, accuracy: 100, energyCost: 8, isPhysical: true,
        morphology: "crocs",
    },
    croc_fatal: {
        key: "croc_fatal", name: "Croc-Fatal", type: "Combat",
        power: 60, accuracy: 90, energyCost: 12, isPhysical: true,
        morphology: "crocs",
    },

    // ---- Bec (oiseaux) ----
    picpic: {
        key: "picpic", name: "Picpic", type: "Vol",
        power: 35, accuracy: 100, energyCost: 7, isPhysical: true,
        morphology: "bec",
    },
    bec_vrille: {
        key: "bec_vrille", name: "Bec Vrille", type: "Vol",
        power: 55, accuracy: 90, energyCost: 11, isPhysical: true,
        morphology: "bec",
    },

    // ---- Insecte ----
    pince: {
        key: "pince", name: "Pince", type: "Normal",
        power: 30, accuracy: 100, energyCost: 6, isPhysical: true,
        morphology: "insecte",
    },
    cisaillement: {
        key: "cisaillement", name: "Cisaillement", type: "Combat",
        power: 50, accuracy: 85, energyCost: 10, isPhysical: true,
        morphology: "insecte",
    },

    // ---- Pattes (mammifères divers) ----
    coup_de_poing: {
        key: "coup_de_poing", name: "Coup de Poing", type: "Combat",
        power: 40, accuracy: 100, energyCost: 8, isPhysical: true,
        morphology: "pattes",
    },
    pilon: {
        key: "pilon", name: "Pilon", type: "Combat",
        power: 60, accuracy: 90, energyCost: 12, isPhysical: true,
        morphology: "pattes",
    },

    // ---- Écailles (reptiles, marins) ----
    roulade: {
        key: "roulade", name: "Roulade", type: "Normal",
        power: 35, accuracy: 100, energyCost: 7, isPhysical: true,
        morphology: "ecailles",
    },
    coup_d_ecaille: {
        key: "coup_d_ecaille", name: "Coup d'Écaille", type: "Roche",
        power: 50, accuracy: 95, energyCost: 10, isPhysical: true,
        morphology: "ecailles",
    },

    // ---- Élémentaires (type-spécifiques, débloqués par pierres/évolution) ----
    flammeche: {
        key: "flammeche", name: "Flammèche", type: "Feu",
        power: 40, accuracy: 100, energyCost: 8, isPhysical: false,
    },
    lance_flammes: {
        key: "lance_flammes", name: "Lance-Flammes", type: "Feu",
        power: 75, accuracy: 95, energyCost: 18, isPhysical: false,
    },
    pistolet_a_o: {
        key: "pistolet_a_o", name: "Pistolet à O", type: "Eau",
        power: 40, accuracy: 100, energyCost: 8, isPhysical: false,
    },
    hydro_pompe: {
        key: "hydro_pompe", name: "Hydro-Pompe", type: "Eau",
        power: 90, accuracy: 80, energyCost: 22, isPhysical: false,
    },
    feuille_acerée: {
        key: "feuille_acerée", name: "Feuille Acérée", type: "Plante",
        power: 55, accuracy: 95, energyCost: 11, isPhysical: true,
    },
    etincelle: {
        key: "etincelle", name: "Étincelle", type: "Electrique",
        power: 40, accuracy: 100, energyCost: 8, isPhysical: false,
    },
    tonnerre: {
        key: "tonnerre", name: "Tonnerre", type: "Electrique",
        power: 90, accuracy: 70, energyCost: 22, isPhysical: false,
    },
    tornade: {
        key: "tornade", name: "Tornade", type: "Vol",
        power: 35, accuracy: 100, energyCost: 7, isPhysical: false,
    },
    confusion: {
        key: "confusion", name: "Confusion", type: "Psy",
        power: 50, accuracy: 100, energyCost: 10, isPhysical: false,
    },
    psyko: {
        key: "psyko", name: "Psyko", type: "Psy",
        power: 90, accuracy: 100, energyCost: 24, isPhysical: false,
    },

    // ---- Pâte (Bolognion + futur arc scientifique) ----
    ravioli: {
        key: "ravioli", name: "Ravioli", type: "Pate",
        power: 45, accuracy: 100, energyCost: 9, isPhysical: true,
    },
    bombe_carbo: {
        key: "bombe_carbo", name: "Bombe Carbo", type: "Pate",
        power: 80, accuracy: 85, energyCost: 20, isPhysical: false,
    },

    // ---- Combat (chiens flics + rival CAPOLINO) ----
    prise_de_bec: {
        key: "prise_de_bec", name: "Prise de Bec", type: "Combat",
        power: 40, accuracy: 100, energyCost: 8, isPhysical: true,
    },
    ultime_uppercut: {
        key: "ultime_uppercut", name: "Ultime Uppercut", type: "Combat",
        power: 85, accuracy: 80, energyCost: 21, isPhysical: true,
    },

    // ---- Roche ----
    jet_de_pierre: {
        key: "jet_de_pierre", name: "Jet de Pierre", type: "Roche",
        power: 50, accuracy: 90, energyCost: 10, isPhysical: true,
    },
    lance_roc: {
        key: "lance_roc", name: "Lance-Roc", type: "Roche",
        power: 75, accuracy: 90, energyCost: 18, isPhysical: true,
    },
    // ---- Status moves (Phase 9.D) ----
    poudre_toxique: {
        key: "poudre_toxique", name: "Poudre Toxique", type: "Plante",
        power: 0, accuracy: 90, energyCost: 8, isPhysical: false,
        inflictStatus: "poison",
        description: "Empoisonne la cible (dégâts résiduels chaque tour).",
    },
    onde_paralysante: {
        key: "onde_paralysante", name: "Onde Paralysante", type: "Electrique",
        power: 0, accuracy: 95, energyCost: 8, isPhysical: false,
        inflictStatus: "paralysis",
        description: "Paralyse la cible : 25% de chance de sauter son tour.",
    },
}

export function getAttack(key: string): Attack | null {
    return ATTACK_CATALOG[key] ?? null
}

// ============================================================
// Filtre : quelles attaques sont apprenables par un Daemon
// (selon morpho + type compatible)
// ============================================================
export function isAttackAvailableFor(attack: Attack, daemonType: DaemonType, morphology: Morphology): boolean {
    // Morpho-locked → seul cet animal y a accès
    if (attack.morphology && attack.morphology !== morphology) return false
    // Type Normal → universel (toutes morphos peuvent l'apprendre)
    // Type spécifique → seul un Daemon de ce type peut l'apprendre (sauf "Normal" comme attaquant)
    if (attack.type !== "Normal" && daemonType !== attack.type) {
        // Exception : certaines attaques morpho ne sont pas type-restreintes (croc_fatal/Combat
        // est apprenable par les crocs même non-Combat → c'est la magie de la morpho)
        if (!attack.morphology) return false
    }
    return true
}
