// src/lib/gamebook/yellow/data/moves.ts
//
// Nexus Jaune Éclair — registre des attaques (STRICT Gen 1, data-driven, ORIGINAL).
// Pas de champ "category" : physique/spécial est déduit du TYPE (cf. typeChart).
// Un move de STATUT = power 0. Noms/effets maison (pas le movedex officiel).

import type { MoveData } from "../battle/types"

export const MOVES: Record<string, MoveData> = {
    charge: { id: "charge", name: "Charge", type: "NORMAL", power: 40, accuracy: 100, pp: 35, description: "Une charge basique." },
    vive_attaque: { id: "vive_attaque", name: "Vive-Attaque", type: "NORMAL", power: 40, accuracy: 100, pp: 30, priority: 1, description: "Frappe en priorité." },
    coup_d_boule: { id: "coup_d_boule", name: "Coup d'Boule", type: "NORMAL", power: 70, accuracy: 100, pp: 15, effect: { chance: 30, flinch: true }, description: "Peut apeurer." },
    belier: { id: "belier", name: "Bélier", type: "NORMAL", power: 90, accuracy: 85, pp: 20, effect: { recoilPct: 25 }, description: "Puissant, cause du recul." },

    flammeche: { id: "flammeche", name: "Flammèche", type: "FEU", power: 40, accuracy: 100, pp: 25, effect: { chance: 10, inflictStatus: "BURN" }, description: "Peut brûler." },
    lance_flammes: { id: "lance_flammes", name: "Lance-Flammes", type: "FEU", power: 95, accuracy: 100, pp: 15, effect: { chance: 10, inflictStatus: "BURN" }, description: "Forte, peut brûler." },

    pistolet_a_o: { id: "pistolet_a_o", name: "Pistolet à O", type: "EAU", power: 40, accuracy: 100, pp: 25, description: "Un jet d'eau." },
    hydrocanon: { id: "hydrocanon", name: "Hydrocanon", type: "EAU", power: 110, accuracy: 80, pp: 5, description: "Déluge surpuissant." },

    fouet_lianes: { id: "fouet_lianes", name: "Fouet Lianes", type: "PLANTE", power: 45, accuracy: 100, pp: 25, description: "Cingle avec des lianes." },
    tempete_verte: { id: "tempete_verte", name: "Tempête Verte", type: "PLANTE", power: 90, accuracy: 100, pp: 10, description: "Rafale de feuilles." },
    vampigraine: { id: "vampigraine", name: "Vampigraine", type: "PLANTE", power: 0, accuracy: 90, pp: 10, effect: { inflictVolatile: "SEEDED" }, description: "Draine des PV chaque tour." },
    mega_sangsue: { id: "mega_sangsue", name: "Méga-Sangsue", type: "PLANTE", power: 40, accuracy: 100, pp: 15, effect: { drainPct: 50 }, description: "Rend 50% des dégâts en PV." },

    etincelle: { id: "etincelle", name: "Étincelle", type: "ELEC", power: 65, accuracy: 100, pp: 20, effect: { chance: 30, inflictStatus: "PARALYSIS" }, description: "Peut paralyser." },
    cage_eclair: { id: "cage_eclair", name: "Cage-Éclair", type: "ELEC", power: 0, accuracy: 100, pp: 20, effect: { inflictStatus: "PARALYSIS" }, description: "Paralyse à coup sûr." },
    surtension: { id: "surtension", name: "Surtension", type: "ELEC", power: 20, accuracy: 100, pp: 10, effect: { twoTurn: true, statChanges: [{ target: "target", stat: "spe", stages: -2 }] }, description: "Signature de VOLTA — décharge en 2 temps. Tour 1 : faible (20) mais RALENTIT fort (-2 Vitesse, cumulable). Tour 2 : se libère AUTOMATIQUEMENT, frappe à 60 avec un très haut taux de coup critique." },
    mirage: { id: "mirage", name: "Mirage", type: "ELEC", power: 0, accuracy: 0, pp: 20, effect: { statChanges: [{ target: "self", stat: "eva", stages: 2 }] }, description: "Le corps grésille et se brouille de statique : +2 Esquive (cumulable). Difficile à toucher." },

    coup_d_givre: { id: "coup_d_givre", name: "Coup d'Givre", type: "GLACE", power: 65, accuracy: 100, pp: 20, effect: { chance: 10, inflictStatus: "FREEZE" }, description: "Peut geler." },

    double_pied: { id: "double_pied", name: "Double-Pied", type: "COMBAT", power: 30, accuracy: 100, pp: 30, effect: { multiHit: [2, 2] }, description: "Frappe deux fois." },
    poing_karate: { id: "poing_karate", name: "Poing-Karaté", type: "COMBAT", power: 50, accuracy: 100, pp: 25, effect: { highCrit: true }, description: "Taux de critique élevé." },

    dard_venin: { id: "dard_venin", name: "Dard-Venin", type: "POISON", power: 15, accuracy: 100, pp: 35, effect: { chance: 30, inflictStatus: "POISON" }, description: "Peut empoisonner." },
    toxik: { id: "toxik", name: "Toxik", type: "POISON", power: 0, accuracy: 90, pp: 10, effect: { inflictStatus: "TOXIC" }, description: "Empoisonne gravement." },

    jet_de_sable: { id: "jet_de_sable", name: "Jet de Sable", type: "SOL", power: 0, accuracy: 100, pp: 15, effect: { statChanges: [{ target: "target", stat: "acc", stages: -1 }] }, description: "Baisse la Précision adverse." },
    seisme: { id: "seisme", name: "Séisme", type: "SOL", power: 100, accuracy: 100, pp: 10, description: "Secousse dévastatrice." },
    tunnel: { id: "tunnel", name: "Tunnel", type: "SOL", power: 50, accuracy: 100, pp: 10, effect: { dig: true }, description: "Signature de GÉKROC : tour 1, creuse et disparaît sous terre (INVULNÉRABLE) ; tour 2, jaillit et frappe (50)." },

    tornade: { id: "tornade", name: "Tornade", type: "VOL", power: 60, accuracy: 100, pp: 20, description: "Bourrasque tranchante." },
    picpic: { id: "picpic", name: "Picpic", type: "VOL", power: 35, accuracy: 100, pp: 35, description: "Coups de bec rapides." },

    choc_mental: { id: "choc_mental", name: "Choc Mental", type: "PSY", power: 50, accuracy: 100, pp: 25, effect: { chance: 10, statChanges: [{ target: "target", stat: "spc", stages: -1 }] }, description: "Peut baisser le Spécial." },
    onde_folie: { id: "onde_folie", name: "Onde Folie", type: "PSY", power: 0, accuracy: 100, pp: 10, effect: { inflictVolatile: "CONFUSION" }, description: "Rend confus." },
    repos: { id: "repos", name: "Repos", type: "PSY", power: 0, accuracy: 0, pp: 10, effect: { healPct: 50 }, description: "Restaure la moitié des PV." },

    dard_nuee: { id: "dard_nuee", name: "Dard-Nuée", type: "INSECTE", power: 14, accuracy: 85, pp: 20, effect: { multiHit: [2, 5] }, description: "Frappe 2 à 5 fois." },

    jet_pierres: { id: "jet_pierres", name: "Jet-Pierres", type: "ROCHE", power: 50, accuracy: 90, pp: 15, description: "Lance des rochers." },

    leche: { id: "leche", name: "Léchouille", type: "SPECTRE", power: 30, accuracy: 100, pp: 30, effect: { chance: 30, inflictStatus: "PARALYSIS" }, description: "Peut paralyser." },

    draco_souffle: { id: "draco_souffle", name: "Draco-Souffle", type: "DRAGON", power: 60, accuracy: 100, pp: 25, description: "Souffle draconique." },

    // Moves de statut purs (boosts/baisses)
    danse_lames: { id: "danse_lames", name: "Danse-Lames", type: "NORMAL", power: 0, accuracy: 0, pp: 20, effect: { statChanges: [{ target: "self", stat: "atk", stages: 2 }] }, description: "Augmente fortement l'Attaque." },
    hurlement: { id: "hurlement", name: "Hurlement", type: "NORMAL", power: 0, accuracy: 100, pp: 40, effect: { statChanges: [{ target: "target", stat: "atk", stages: -1 }] }, description: "Baisse l'Attaque adverse." },
    mur_de_fer: { id: "mur_de_fer", name: "Mur de Fer", type: "NORMAL", power: 0, accuracy: 0, pp: 30, effect: { statChanges: [{ target: "self", stat: "def", stages: 1 }] }, description: "Augmente la Défense." },

    // === Ajouts pool maison (20) : moves de rôle + paliers mid/gros par type ===
    elan: { id: "elan", name: "Élan", type: "NORMAL", power: 0, accuracy: 0, pp: 30, effect: { statChanges: [{ target: "self", stat: "spe", stages: 1 }] }, description: "Augmente la Vitesse." },
    focalisation: { id: "focalisation", name: "Focalisation", type: "PSY", power: 0, accuracy: 0, pp: 20, effect: { statChanges: [{ target: "self", stat: "spc", stages: 1 }] }, description: "Augmente le Spécial." },
    flamme_ardente: { id: "flamme_ardente", name: "Flamme Ardente", type: "FEU", power: 65, accuracy: 100, pp: 20, effect: { chance: 10, inflictStatus: "BURN" }, description: "Move Feu intermédiaire ; peut brûler." },
    lame_eau: { id: "lame_eau", name: "Lame d'Eau", type: "EAU", power: 65, accuracy: 100, pp: 20, effect: { chance: 10, statChanges: [{ target: "target", stat: "spe", stages: -1 }] }, description: "Peut baisser la Vitesse." },
    tranche_feuille: { id: "tranche_feuille", name: "Tranche-Feuille", type: "PLANTE", power: 55, accuracy: 95, pp: 25, effect: { highCrit: true }, description: "Taux de critique élevé." },
    spores_dodo: { id: "spores_dodo", name: "Spores Dodo", type: "PLANTE", power: 0, accuracy: 75, pp: 15, effect: { inflictStatus: "SLEEP" }, description: "Endort la cible." },
    etreinte_sylvestre: { id: "etreinte_sylvestre", name: "Étreinte Sylvestre", type: "PLANTE", power: 75, accuracy: 100, pp: 10, effect: { drainPct: 50 }, description: "Signature du Druide : des racines enserrent la cible et drainent sa vigueur (rend 50% des dégâts)." },
    fulgurance: { id: "fulgurance", name: "Fulgurance", type: "ELEC", power: 90, accuracy: 100, pp: 15, effect: { chance: 10, inflictStatus: "PARALYSIS" }, description: "Gros move Élec ; peut paralyser." },
    souffle_polaire: { id: "souffle_polaire", name: "Souffle Polaire", type: "GLACE", power: 90, accuracy: 100, pp: 10, effect: { chance: 10, inflictStatus: "FREEZE" }, description: "Gros move Glace ; peut geler." },
    balayage: { id: "balayage", name: "Balayage", type: "COMBAT", power: 60, accuracy: 100, pp: 20, effect: { chance: 10, flinch: true }, description: "Peut apeurer." },
    crochet_maitre: { id: "crochet_maitre", name: "Crochet du Maître", type: "COMBAT", power: 80, accuracy: 90, pp: 10, effect: { highCrit: true }, description: "Crochet à fort taux de critique." },
    crachat_acide: { id: "crachat_acide", name: "Crachat Acide", type: "POISON", power: 40, accuracy: 100, pp: 30, effect: { chance: 10, statChanges: [{ target: "target", stat: "def", stages: -1 }] }, description: "Peut baisser la Défense." },
    tir_boue: { id: "tir_boue", name: "Tir de Boue", type: "SOL", power: 55, accuracy: 95, pp: 15, effect: { chance: 10, statChanges: [{ target: "target", stat: "acc", stages: -1 }] }, description: "Peut baisser la Précision." },
    fonce_bec: { id: "fonce_bec", name: "Fonce-Bec", type: "VOL", power: 75, accuracy: 100, pp: 20, description: "Charge aérienne fiable." },
    pique_fatal: { id: "pique_fatal", name: "Piqué Fatal", type: "VOL", power: 90, accuracy: 100, pp: 15, effect: { recoilPct: 25 }, description: "Piqué puissant, cause du recul." },
    vague_mentale: { id: "vague_mentale", name: "Vague Mentale", type: "PSY", power: 90, accuracy: 100, pp: 10, effect: { chance: 10, statChanges: [{ target: "target", stat: "spc", stages: -1 }] }, description: "Gros move Psy ; peut baisser le Spécial." },
    morsure: { id: "morsure", name: "Morsure", type: "INSECTE", power: 60, accuracy: 100, pp: 20, description: "Morsure intermédiaire." },
    dard_mortel: { id: "dard_mortel", name: "Dard Mortel", type: "INSECTE", power: 70, accuracy: 100, pp: 15, description: "Gros move Insecte." },
    ball_ombre: { id: "ball_ombre", name: "Ball'Ombre", type: "SPECTRE", power: 85, accuracy: 100, pp: 15, description: "Grosse attaque spectrale." },
    // === Pool SPECTRE étendu (maison hantée) : soin/drain/statut/signature qui manquaient au type ===
    malediction: { id: "malediction", name: "Malédiction", type: "SPECTRE", power: 0, accuracy: 100, pp: 10, effect: { statChanges: [{ target: "self", stat: "def", stages: 1 }, { target: "target", stat: "spe", stages: -1 }] }, description: "Le spectre se barricade (+1 Défense) en jetant un sort qui ralentit la cible (-1 Vitesse)." },
    drain_ame: { id: "drain_ame", name: "Drain d'Âme", type: "SPECTRE", power: 60, accuracy: 100, pp: 10, effect: { drainPct: 50 }, description: "Aspire la force vitale : rend 50% des dégâts en PV." },
    linceul: { id: "linceul", name: "Linceul", type: "SPECTRE", power: 0, accuracy: 0, pp: 10, effect: { healPct: 50 }, description: "Le spectre se drape dans un linceul régénérant : restaure la moitié des PV." },
    voile_effroi: { id: "voile_effroi", name: "Voile d'Effroi", type: "SPECTRE", power: 0, accuracy: 100, pp: 15, effect: { statChanges: [{ target: "target", stat: "atk", stages: -1 }, { target: "target", stat: "acc", stages: -1 }] }, description: "La peur fige la cible : -1 Attaque ET -1 Précision." },
    griffe_spectrale: { id: "griffe_spectrale", name: "Griffe Spectrale", type: "SPECTRE", power: 70, accuracy: 100, pp: 15, effect: { highCrit: true }, description: "Lacération d'outre-tombe à fort taux de critique." },
    frappe_audela: { id: "frappe_audela", name: "Frappe de l'Au-delà", type: "SPECTRE", power: 85, accuracy: 100, pp: 10, effect: { chance: 20, statChanges: [{ target: "target", stat: "def", stages: -1 }] }, description: "Gros coup spectral ; peut briser la Défense adverse (-1)." },
    detonation: { id: "detonation", name: "Détonation", type: "SPECTRE", power: 170, accuracy: 100, pp: 5, effect: { selfHpToOne: true }, description: "Déflagration kamikaze : dégâts colossaux, mais l'attaquant se disloque et ne garde plus qu'1 PV (il ne s'auto-K.O. PAS)." },
    lame_roche: { id: "lame_roche", name: "Lame de Roche", type: "ROCHE", power: 90, accuracy: 90, pp: 10, effect: { highCrit: true }, description: "Gros move Roche ; fort taux de critique." },
    carapace_diamant: { id: "carapace_diamant", name: "Carapace Diamant", type: "ROCHE", power: 0, accuracy: 0, pp: 10, effect: { statChanges: [{ target: "self", stat: "def", stages: 2 }] }, description: "Augmente BEAUCOUP la Défense." },
    faille_sismique: { id: "faille_sismique", name: "Faille Sismique", type: "SOL", power: 90, accuracy: 100, pp: 10, effect: { statChanges: [{ target: "self", stat: "def", stages: 1 }] }, description: "Signature : faille tellurique puissante (sans effet sur le Vol) qui renforce la Défense du lanceur (+1, cumulable)." },
    pyrotechnie: { id: "pyrotechnie", name: "Pyrotechnie", type: "FEU", power: 70, accuracy: 100, pp: 10, effect: { statChanges: [{ target: "target", stat: "spc", stages: -2 }] }, description: "Signature de PYRA : un feu façonné par l'esprit qui embrase la cible ET pulvérise sa concentration (-2 Spé, cumulable jusqu'à -6). Plus gros débuff du jeu." },
    bombe_beurk: { id: "bombe_beurk", name: "Bombe Beurk", type: "POISON", power: 90, accuracy: 100, pp: 10, effect: { chance: 30, inflictStatus: "POISON" }, description: "Gros move Poison ; peut empoisonner." },
    eboulis: { id: "eboulis", name: "Éboulis", type: "ROCHE", power: 75, accuracy: 90, pp: 10, effect: { chance: 30, flinch: true }, description: "Peut apeurer." },
    ombre_furtive: { id: "ombre_furtive", name: "Ombre Furtive", type: "SPECTRE", power: 40, accuracy: 100, pp: 30, priority: 1, description: "Frappe en priorité." },
    draco_charge: { id: "draco_charge", name: "Draco-Charge", type: "DRAGON", power: 90, accuracy: 100, pp: 10, description: "Gros move Dragon." },

    // Attaque de SECOURS gratuite (anti soft-lock) : utilisable quand le joueur n'a
    // plus de reps pour aucune autre attaque. Faible et inflige du recul à soi-même.
    charge_desesperee: { id: "charge_desesperee", name: "Charge Désespérée", type: "NORMAL", power: 45, accuracy: 100, pp: 1, effect: { recoilPct: 70 }, description: "Dernier recours gratuit : frappe correctement mais se blesse gravement (le combat ne traîne pas)." },
}

export function getMove(id: string): MoveData | null {
    return MOVES[id] ?? null
}

export const MOVE_IDS = Object.keys(MOVES)
