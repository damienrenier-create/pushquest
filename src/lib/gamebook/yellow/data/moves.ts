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
    plaquage: { id: "plaquage", name: "Plaquage", type: "NORMAL", power: 85, accuracy: 100, pp: 15, effect: { chance: 30, inflictStatus: "PARALYSIS" }, description: "Le lanceur écrase l'ennemi de tout son poids ; peut paralyser (30%). Apprenable par presque tout le monde." },
    berceuse: { id: "berceuse", name: "Berceuse", type: "NORMAL", power: 0, accuracy: 55, pp: 15, costPower: 70, effect: { inflictStatus: "SLEEP" }, description: "Une mélodie apaisante qui endort la cible (précision faible). Version Normal du sommeil (≠ Spores Dodo, Plante)." },
    // NE RATE JAMAIS : accuracy 0 → ignore précision/esquive/mirage ; sureHit → touche même une cible sous terre
    // (Tunnel) ou en vol. Le seul coup vraiment infaillible du jeu.
    meteores: { id: "meteores", name: "Météores", type: "NORMAL", power: 60, accuracy: 0, pp: 20, effect: { sureHit: true }, description: "Projette une nuée d'étoiles téléguidées : NE RATE JAMAIS — ni esquive, ni mirage, ni cible sous terre ou en vol n'y échappent." },
    // SNOWBALL : grosse frappe Psy qui élève le Spécial du lanceur à CHAQUE coup (offense + mur spécial enflent).
    eveil_divin: { id: "eveil_divin", name: "Éveil Divin", type: "PSY", power: 90, accuracy: 100, pp: 10, effect: { statChanges: [{ target: "self", stat: "spc", stages: 1 }] }, description: "Frappe psychique transcendante : inflige de lourds dégâts ET élève le Spécial du lanceur (+1, cumulable). Plus le combat dure, plus il devient irrésistible." },

    flammeche: { id: "flammeche", name: "Flammèche", type: "FEU", power: 40, accuracy: 100, pp: 25, effect: { chance: 10, inflictStatus: "BURN" }, description: "Peut brûler." },
    lance_flammes: { id: "lance_flammes", name: "Lance-Flammes", type: "FEU", power: 95, accuracy: 100, pp: 15, effect: { chance: 10, inflictStatus: "BURN" }, description: "Forte, peut brûler." },

    pistolet_a_o: { id: "pistolet_a_o", name: "Pistolet à O", type: "EAU", power: 40, accuracy: 100, pp: 25, description: "Un jet d'eau." },
    hydrocanon: { id: "hydrocanon", name: "Hydrocanon", type: "EAU", power: 110, accuracy: 80, pp: 5, description: "Déluge surpuissant." },

    fouet_lianes: { id: "fouet_lianes", name: "Fouet Lianes", type: "PLANTE", power: 45, accuracy: 100, pp: 25, description: "Cingle avec des lianes." },
    tempete_verte: { id: "tempete_verte", name: "Tempête Verte", type: "PLANTE", power: 90, accuracy: 100, pp: 10, description: "Rafale de feuilles." },
    // LA plus forte attaque Plante : se charge un tour (absorbe la lumière) puis libère un rayon dévastateur.
    lance_soleil: { id: "lance_soleil", name: "Lance-Soleil", type: "PLANTE", power: 120, accuracy: 100, pp: 10, effect: { twoTurn: true }, description: "Tour 1 : absorbe la lumière. Tour 2 : libère un rayon solaire dévastateur (120). La plus puissante des attaques Plante." },
    vampigraine: { id: "vampigraine", name: "Vampigraine", type: "PLANTE", power: 0, accuracy: 90, pp: 10, effect: { inflictVolatile: "SEEDED" }, description: "Draine des PV chaque tour." },
    mega_sangsue: { id: "mega_sangsue", name: "Méga-Sangsue", type: "PLANTE", power: 40, accuracy: 100, pp: 15, effect: { drainPct: 50 }, description: "Rend 50% des dégâts en PV." },

    etincelle: { id: "etincelle", name: "Étincelle", type: "ELEC", power: 65, accuracy: 100, pp: 20, effect: { chance: 30, inflictStatus: "PARALYSIS" }, description: "Peut paralyser." },
    cage_eclair: { id: "cage_eclair", name: "Cage-Éclair", type: "ELEC", power: 0, accuracy: 100, pp: 20, costPower: 50, effect: { inflictStatus: "PARALYSIS" }, description: "Paralyse à coup sûr." },
    surtension: { id: "surtension", name: "Surtension", type: "ELEC", power: 40, accuracy: 100, pp: 10, effect: { twoTurn: true, statChanges: [{ target: "target", stat: "spe", stages: -2 }] }, description: "Signature de VOLTA — décharge en 2 temps. Tour 1 : charge (40) qui RALENTIT fort (-2 Vitesse, cumulable). Tour 2 : se libère AUTOMATIQUEMENT et frappe fort (100)." },
    mirage: { id: "mirage", name: "Mirage", type: "NORMAL", power: 0, accuracy: 0, pp: 20, costPower: 50, effect: { statChanges: [{ target: "self", stat: "eva", stages: 2 }] }, description: "Le corps vacille et se dédouble comme un mirage : +2 Esquive (cumulable). Difficile à toucher." },
    apotheose: { id: "apotheose", name: "Apothéose", type: "NORMAL", power: 85, accuracy: 100, pp: 10, effect: { adaptiveStab: true }, description: "Attaque ULTIME et adaptative : elle prend le TYPE de ton Daemon (donc TOUJOURS le STAB ×1.5) et frappe sur ta MEILLEURE stat offensive (Attaque ou Spécial). Un Feu costaud en Attaque tape enfin du Feu… au physique." },

    coup_d_givre: { id: "coup_d_givre", name: "Coup d'Givre", type: "GLACE", power: 65, accuracy: 100, pp: 20, effect: { chance: 10, inflictStatus: "FREEZE" }, description: "Peut geler." },

    double_pied: { id: "double_pied", name: "Double-Pied", type: "COMBAT", power: 30, accuracy: 100, pp: 30, effect: { multiHit: [2, 2] }, description: "Frappe deux fois." },
    poing_karate: { id: "poing_karate", name: "Poing-Karaté", type: "COMBAT", power: 50, accuracy: 100, pp: 25, effect: { highCrit: true }, description: "Taux de critique élevé." },

    dard_venin: { id: "dard_venin", name: "Dard-Venin", type: "POISON", power: 15, accuracy: 100, pp: 35, effect: { chance: 30, inflictStatus: "POISON" }, description: "Peut empoisonner." },
    toxik: { id: "toxik", name: "Toxik", type: "POISON", power: 0, accuracy: 90, pp: 10, costPower: 50, effect: { inflictStatus: "TOXIC" }, description: "Empoisonne gravement." },

    jet_de_sable: { id: "jet_de_sable", name: "Jet de Sable", type: "SOL", power: 0, accuracy: 100, pp: 15, effect: { statChanges: [{ target: "target", stat: "acc", stages: -1 }] }, description: "Baisse la Précision adverse." },
    seisme: { id: "seisme", name: "Séisme", type: "SOL", power: 100, accuracy: 100, pp: 10, description: "Secousse dévastatrice." },
    tunnel: { id: "tunnel", name: "Tunnel", type: "SOL", power: 50, accuracy: 100, pp: 10, effect: { dig: true }, description: "Signature de GÉKROC : tour 1, creuse et disparaît sous terre (INVULNÉRABLE) ; tour 2, jaillit et frappe (50)." },

    tornade: { id: "tornade", name: "Tornade", type: "VOL", power: 60, accuracy: 100, pp: 20, description: "Bourrasque tranchante." },
    picpic: { id: "picpic", name: "Picpic", type: "VOL", power: 35, accuracy: 100, pp: 35, description: "Coups de bec rapides." },

    choc_mental: { id: "choc_mental", name: "Choc Mental", type: "PSY", power: 50, accuracy: 100, pp: 25, effect: { chance: 10, statChanges: [{ target: "target", stat: "spc", stages: -1 }] }, description: "Peut baisser le Spécial." },
    onde_folie: { id: "onde_folie", name: "Onde Folie", type: "PSY", power: 0, accuracy: 100, pp: 10, effect: { inflictVolatile: "CONFUSION" }, description: "Rend confus." },
    hypnose: { id: "hypnose", name: "Hypnose", type: "PSY", power: 0, accuracy: 40, pp: 20, costPower: 70, effect: { inflictStatus: "SLEEP", speedScaledAcc: true }, description: "Sommeil hypnotique : 40% de base (ignore l'esquive), d'autant plus sûr que le lanceur est rapide face à la cible." },
    repos: { id: "repos", name: "Repos", type: "PSY", power: 0, accuracy: 0, pp: 10, costPower: 100, effect: { healPct: 50, restSleep: true }, description: "Restaure la moitié des PV mais endort le lanceur 1 tour. Coûte le maximum d'énergie." },

    dard_nuee: { id: "dard_nuee", name: "Dard-Nuée", type: "INSECTE", power: 14, accuracy: 85, pp: 20, effect: { multiHit: [2, 5] }, description: "Frappe 2 à 5 fois." },
    // Boul'Pollen : boule de pollen explosive. Le pollen NUTRITIF rend au lanceur 50% des dégâts (drain) —
    // version codable du soin (en combat 1v1 il n'y a pas d'allié sur le terrain à cibler, cf. note).
    boul_pollen: { id: "boul_pollen", name: "Boul'Pollen", type: "INSECTE", power: 85, accuracy: 100, pp: 10, effect: { drainPct: 50 }, description: "Envoie une boule de pollen explosive ; le pollen nutritif rend au lanceur 50% des dégâts infligés en PV." },

    jet_pierres: { id: "jet_pierres", name: "Jet-Pierres", type: "ROCHE", power: 50, accuracy: 90, pp: 15, description: "Lance des rochers." },

    leche: { id: "leche", name: "Léchouille", type: "SPECTRE", power: 30, accuracy: 100, pp: 30, effect: { chance: 30, inflictStatus: "PARALYSIS" }, description: "Peut paralyser." },

    draco_souffle: { id: "draco_souffle", name: "Draco-Souffle", type: "DRAGON", power: 60, accuracy: 100, pp: 25, description: "Souffle draconique." },
    draco_rage: { id: "draco_rage", name: "Draco-Rage", type: "DRAGON", power: 0, accuracy: 100, pp: 10, costPower: 40, effect: { fixedDamage: 40 }, description: "Onde de rage draconique : inflige TOUJOURS 40 PV, quels que soient les stats ou le type de la cible (façon Gen 1)." },

    // Moves de statut purs (boosts/baisses)
    danse_lames: { id: "danse_lames", name: "Danse-Lames", type: "NORMAL", power: 0, accuracy: 0, pp: 20, costPower: 50, effect: { statChanges: [{ target: "self", stat: "atk", stages: 2 }] }, description: "Augmente fortement l'Attaque." },
    hurlement: { id: "hurlement", name: "Hurlement", type: "NORMAL", power: 0, accuracy: 100, pp: 40, costPower: 20, effect: { statChanges: [{ target: "target", stat: "atk", stages: -1 }] }, description: "Baisse l'Attaque adverse." },
    mur_de_fer: { id: "mur_de_fer", name: "Mur de Fer", type: "NORMAL", power: 0, accuracy: 0, pp: 30, costPower: 20, effect: { statChanges: [{ target: "self", stat: "def", stages: 1 }] }, description: "Augmente la Défense." },

    // === Ajouts pool maison (20) : moves de rôle + paliers mid/gros par type ===
    elan: { id: "elan", name: "Élan", type: "NORMAL", power: 0, accuracy: 0, pp: 30, costPower: 20, effect: { statChanges: [{ target: "self", stat: "spe", stages: 1 }] }, description: "Augmente la Vitesse." },
    focalisation: { id: "focalisation", name: "Focalisation", type: "PSY", power: 0, accuracy: 0, pp: 20, effect: { statChanges: [{ target: "self", stat: "spc", stages: 1 }] }, description: "Augmente le Spécial." },
    flamme_ardente: { id: "flamme_ardente", name: "Flamme Ardente", type: "FEU", power: 65, accuracy: 100, pp: 20, effect: { chance: 10, inflictStatus: "BURN" }, description: "Move Feu intermédiaire ; peut brûler." },
    lame_eau: { id: "lame_eau", name: "Lame d'Eau", type: "EAU", power: 65, accuracy: 100, pp: 20, effect: { chance: 10, statChanges: [{ target: "target", stat: "spe", stages: -1 }] }, description: "Peut baisser la Vitesse." },
    deferlante: { id: "deferlante", name: "Déferlante", type: "EAU", power: 95, accuracy: 100, pp: 10, effect: { chance: 30, statChanges: [{ target: "target", stat: "def", stages: -1 }] }, description: "Signature d'ONDINE : une vague titanesque qui peut briser la garde adverse (-Défense)." },
    tranche_feuille: { id: "tranche_feuille", name: "Tranche-Feuille", type: "PLANTE", power: 55, accuracy: 95, pp: 25, effect: { highCrit: true }, description: "Taux de critique élevé." },
    tranche: { id: "tranche", name: "Tranche", type: "NORMAL", power: 90, accuracy: 80, pp: 15, effect: { highCrit: true }, description: "Entaille fauchante : puissante et à fort taux de critique, mais peu précise." },
    spores_dodo: { id: "spores_dodo", name: "Spores Dodo", type: "PLANTE", power: 0, accuracy: 75, pp: 15, costPower: 70, effect: { inflictStatus: "SLEEP" }, description: "Endort la cible." },
    etreinte_sylvestre: { id: "etreinte_sylvestre", name: "Étreinte Sylvestre", type: "PLANTE", power: 75, accuracy: 100, pp: 10, effect: { drainPct: 50 }, description: "Signature du Druide : des racines enserrent la cible et drainent sa vigueur (rend 50% des dégâts)." },
    fulgurance: { id: "fulgurance", name: "Fulgurance", type: "ELEC", power: 90, accuracy: 100, pp: 15, effect: { chance: 10, inflictStatus: "PARALYSIS" }, description: "Gros move Élec ; peut paralyser." },
    souffle_polaire: { id: "souffle_polaire", name: "Souffle Polaire", type: "GLACE", power: 90, accuracy: 100, pp: 10, effect: { chance: 10, inflictStatus: "FREEZE" }, description: "Gros move Glace ; peut geler." },
    balayage: { id: "balayage", name: "Balayage", type: "COMBAT", power: 60, accuracy: 100, pp: 20, effect: { chance: 10, flinch: true }, description: "Peut apeurer." },
    crochet_maitre: { id: "crochet_maitre", name: "Crochet du Maître", type: "COMBAT", power: 80, accuracy: 90, pp: 10, effect: { highCrit: true }, description: "Crochet à fort taux de critique." },
    coup_de_boutoir: { id: "coup_de_boutoir", name: "Coup de Boutoir", type: "COMBAT", power: 100, accuracy: 100, pp: 10, effect: { recoilPct: 25 }, description: "Le colosse charge tête baissée comme un bélier dévastateur ; énorme impact, au prix d'un léger contrecoup." },
    // CT28 (Champion) : nouveau move COMBAT multi-coups — frappe 2 à 5 fois (20/coup), distribution uniforme
    // du moteur (≈3,5 coups en moyenne → 40 à 100 dégâts). Distinct du « Crochet du Maître » simple (intact).
    deluge_crochets: { id: "deluge_crochets", name: "Rafale de Crochets", type: "COMBAT", power: 20, accuracy: 95, pp: 10, effect: { multiHit: [2, 5] }, description: "Déluge de crochets : frappe 2 à 5 fois (20 par coup)." },
    mitra_poing: { id: "mitra_poing", name: "Mitra-Poing", type: "COMBAT", power: 150, accuracy: 100, pp: 5, effect: { focusCharge: true }, description: "La capacité Combat la plus PUISSANTE. Le lanceur concentre son énergie un tour entier : s'il est touché pendant ce temps il est déconcentré et rate ; sinon il libère un coup dévastateur au tour suivant." },
    vol_d_eclat: { id: "vol_d_eclat", name: "Vol d'Éclat", type: "PLANTE", power: 60, accuracy: 100, pp: 10, effect: { stealBoosts: true }, description: "L'esprit SIPHONNE tous les gains de stats de la cible (elle les perd, le lanceur se les approprie) AVANT de frapper de ses ronces spectrales." },
    crachat_acide: { id: "crachat_acide", name: "Crachat Acide", type: "POISON", power: 40, accuracy: 100, pp: 30, effect: { chance: 10, statChanges: [{ target: "target", stat: "def", stages: -1 }] }, description: "Peut baisser la Défense." },
    tir_boue: { id: "tir_boue", name: "Tir de Boue", type: "SOL", power: 55, accuracy: 95, pp: 15, effect: { chance: 10, statChanges: [{ target: "target", stat: "acc", stages: -1 }] }, description: "Peut baisser la Précision." },
    fonce_bec: { id: "fonce_bec", name: "Fonce-Bec", type: "VOL", power: 75, accuracy: 100, pp: 20, description: "Charge aérienne fiable." },
    pique_fatal: { id: "pique_fatal", name: "Piqué Fatal", type: "VOL", power: 90, accuracy: 100, pp: 15, effect: { recoilPct: 25 }, description: "Piqué puissant, cause du recul." },
    vague_mentale: { id: "vague_mentale", name: "Vague Mentale", type: "PSY", power: 90, accuracy: 100, pp: 10, effect: { chance: 10, statChanges: [{ target: "target", stat: "spc", stages: -1 }] }, description: "Gros move Psy ; peut baisser le Spécial." },
    patience: { id: "patience", name: "Patience", type: "PSY", power: 40, accuracy: 100, pp: 5, effect: { dynamicPower: "lowHp" }, description: "Rétribution karmique : plus le lanceur a encaissé de dégâts (PV bas), plus la frappe psychique est puissante (40 à pleins PV → 150 quasi K.O.). Le karma rend ce qu'il a subi." },
    morsure: { id: "morsure", name: "Morsure", type: "INSECTE", power: 60, accuracy: 100, pp: 20, description: "Morsure intermédiaire." },
    dard_mortel: { id: "dard_mortel", name: "Dard Mortel", type: "INSECTE", power: 70, accuracy: 100, pp: 15, description: "Gros move Insecte." },
    ball_ombre: { id: "ball_ombre", name: "Ball'Ombre", type: "SPECTRE", power: 85, accuracy: 100, pp: 15, description: "Grosse attaque spectrale." },
    // === Pool SPECTRE étendu (maison hantée) : soin/drain/statut/signature qui manquaient au type ===
    malediction: { id: "malediction", name: "Malédiction", type: "SPECTRE", power: 0, accuracy: 100, pp: 10, effect: { statChanges: [{ target: "self", stat: "def", stages: 1 }, { target: "target", stat: "spe", stages: -1 }] }, description: "Le spectre se barricade (+1 Défense) en jetant un sort qui ralentit la cible (-1 Vitesse)." },
    drain_ame: { id: "drain_ame", name: "Drain d'Âme", type: "SPECTRE", power: 60, accuracy: 100, pp: 10, effect: { drainPct: 50 }, description: "Aspire la force vitale : rend 50% des dégâts en PV." },
    linceul: { id: "linceul", name: "Linceul", type: "SPECTRE", power: 0, accuracy: 0, pp: 10, costPower: 50, effect: { healPct: 50 }, description: "Le spectre se drape dans un linceul régénérant : restaure la moitié des PV." },
    voile_effroi: { id: "voile_effroi", name: "Voile d'Effroi", type: "SPECTRE", power: 0, accuracy: 100, pp: 15, effect: { statChanges: [{ target: "target", stat: "atk", stages: -1 }, { target: "target", stat: "acc", stages: -1 }] }, description: "La peur fige la cible : -1 Attaque ET -1 Précision." },
    griffe_spectrale: { id: "griffe_spectrale", name: "Griffe Spectrale", type: "SPECTRE", power: 70, accuracy: 100, pp: 15, effect: { highCrit: true }, description: "Lacération d'outre-tombe à fort taux de critique." },
    frappe_audela: { id: "frappe_audela", name: "Frappe de l'Au-delà", type: "SPECTRE", power: 85, accuracy: 100, pp: 10, effect: { chance: 20, statChanges: [{ target: "target", stat: "def", stages: -1 }] }, description: "Gros coup spectral ; peut briser la Défense adverse (-1)." },
    detonation: { id: "detonation", name: "Détonation", type: "SPECTRE", power: 170, accuracy: 100, pp: 5, effect: { selfHpToOne: true }, description: "Déflagration kamikaze : dégâts colossaux, mais l'attaquant se disloque et ne garde plus qu'1 PV (il ne s'auto-K.O. PAS)." },
    lame_roche: { id: "lame_roche", name: "Lame de Roche", type: "ROCHE", power: 90, accuracy: 90, pp: 10, effect: { highCrit: true }, description: "Gros move Roche ; fort taux de critique." },
    // === 6 nouveaux moves (refonte movesets lignées core) ===
    boutefeu: { id: "boutefeu", name: "Boutefeu", type: "FEU", power: 95, accuracy: 95, pp: 10, effect: { recoilPct: 33, chance: 10, inflictStatus: "BURN" }, description: "Charge enflammée tête baissée : gros dégâts, fort recul, peut brûler. Signature de Loupyre." },
    miasme_corrosif: { id: "miasme_corrosif", name: "Miasme Corrosif", type: "POISON", power: 85, accuracy: 100, pp: 10, effect: { chance: 20, inflictStatus: "POISON" }, description: "Nuage toxique SPÉCIAL ; peut empoisonner." },
    vol: { id: "vol", name: "Vol", type: "VOL", power: 90, accuracy: 95, pp: 15, effect: { fly: true }, description: "En 2 temps : tour 1 s'envole (intouchable sauf coup sûr, ex. Météores), tour 2 fond du ciel et frappe." },
    brume_sporale: { id: "brume_sporale", name: "Brume Sporale", type: "PLANTE", power: 0, accuracy: 0, pp: 10, costPower: 30, effect: { resetStats: true }, description: "Un voile de spores dissipe TOUS les changements de stats des deux camps (façon Buée Noire)." },
    aromatherapie: { id: "aromatherapie", name: "Aromathérapie", type: "PLANTE", power: 0, accuracy: 0, pp: 5, costPower: 40, effect: { healTeamStatus: true }, description: "Un parfum apaisant soigne TOUS les statuts (brûlure, gel, paralysie, poison, sommeil) de l'ÉQUIPE entière, banc compris (façon Glas de Soin)." },
    dard_fatal: { id: "dard_fatal", name: "Dard Fatal", type: "INSECTE", power: 90, accuracy: 100, pp: 10, effect: { chance: 15, inflictStatus: "POISON" }, description: "Dard perforant ; peut empoisonner." },
    ultra_foudre: { id: "ultra_foudre", name: "Ultra-Foudre", type: "ELEC", power: 110, accuracy: 80, pp: 5, effect: { chance: 45, inflictStatus: "PARALYSIS" }, description: "Déflagration électrique colossale à la précision incertaine ; paralyse très souvent." },
    carapace_diamant: { id: "carapace_diamant", name: "Carapace Diamant", type: "ROCHE", power: 0, accuracy: 0, pp: 10, costPower: 50, effect: { statChanges: [{ target: "self", stat: "def", stages: 2 }] }, description: "Augmente BEAUCOUP la Défense." },
    // ── MÉTAL (introduit au run 3, STAB de Magnetor) ──
    griffe_acier: { id: "griffe_acier", name: "Griffe d'Acier", type: "METAL", power: 40, accuracy: 100, pp: 35, description: "Lacère la cible de griffes d'acier tranchant. STAB Métal de départ." },
    tete_de_fer: { id: "tete_de_fer", name: "Tête de Fer", type: "METAL", power: 80, accuracy: 100, pp: 15, effect: { chance: 30, flinch: true }, description: "Charge d'un crâne d'acier ; peut apeurer la cible." },
    poing_meteore: { id: "poing_meteore", name: "Poing Météore", type: "METAL", power: 90, accuracy: 90, pp: 10, effect: { chance: 20, statChanges: [{ target: "self", stat: "atk", stages: 1 }] }, description: "Poing de métal fondu d'une force sidérale ; peut galvaniser l'Attaque du lanceur." },
    faille_sismique: { id: "faille_sismique", name: "Faille Sismique", type: "SOL", power: 90, accuracy: 100, pp: 10, effect: { statChanges: [{ target: "self", stat: "def", stages: 1 }] }, description: "Signature : faille tellurique puissante (sans effet sur le Vol) qui renforce la Défense du lanceur (+1, cumulable)." },
    pyrotechnie: { id: "pyrotechnie", name: "Pyrotechnie", type: "FEU", power: 70, accuracy: 100, pp: 10, effect: { statChanges: [{ target: "target", stat: "spc", stages: -2 }] }, description: "Signature de PYRA : un feu façonné par l'esprit qui embrase la cible ET pulvérise sa concentration (-2 Spé, cumulable jusqu'à -6). Plus gros débuff du jeu." },
    bombe_beurk: { id: "bombe_beurk", name: "Bombe Beurk", type: "POISON", power: 90, accuracy: 100, pp: 10, effect: { chance: 30, inflictStatus: "POISON" }, description: "Gros move Poison ; peut empoisonner." },
    eboulis: { id: "eboulis", name: "Éboulis", type: "ROCHE", power: 75, accuracy: 90, pp: 10, effect: { chance: 30, flinch: true }, description: "Peut apeurer." },
    ombre_furtive: { id: "ombre_furtive", name: "Ombre Furtive", type: "SPECTRE", power: 40, accuracy: 100, pp: 30, priority: 1, description: "Frappe en priorité." },
    draco_charge: { id: "draco_charge", name: "Draco-Charge", type: "DRAGON", power: 90, accuracy: 100, pp: 10, description: "Gros move Dragon." },
    // === Moves-signature (refonte lignées 74-134) ===
    // Crocs de Feu / Griffe Draconique : FEU & DRAGON sont SPÉCIAUX par type ; on force `category: PHYSICAL`
    // pour donner un STAB sur l'ATQ aux familles atk-dominantes (Tauricendre/Pyrozly, Dracarlin/Cryotyran).
    crocs_de_feu: { id: "crocs_de_feu", name: "Crocs de Feu", type: "FEU", category: "PHYSICAL", power: 75, accuracy: 95, pp: 15, effect: { chance: 10, inflictStatus: "BURN" }, description: "Morsure incandescente : STAB Feu PHYSIQUE (frappe sur l'Attaque) ; peut brûler." },
    griffe_draconique: { id: "griffe_draconique", name: "Griffe Draconique", type: "DRAGON", category: "PHYSICAL", power: 80, accuracy: 100, pp: 15, description: "Lacération draconique : STAB Dragon PHYSIQUE (frappe sur l'Attaque)." },
    roc_titanesque: { id: "roc_titanesque", name: "Roc Titanesque", type: "ROCHE", power: 120, accuracy: 80, pp: 5, effect: { recoilPct: 33 }, description: "Le colosse projette un bloc titanesque : dégâts énormes mais contrecoup (et précision incertaine)." },
    blizzard: { id: "blizzard", name: "Blizzard", type: "GLACE", power: 110, accuracy: 70, pp: 5, effect: { chance: 30, inflictStatus: "FREEZE" }, description: "Tempête de glace dévastatrice à la précision incertaine ; gèle souvent (30%)." },
    souffle_primordial: { id: "souffle_primordial", name: "Souffle Primordial", type: "DRAGON", power: 120, accuracy: 100, pp: 5, description: "Souffle draconique des origines : la plus puissante attaque Dragon. Réservée aux légendes." },

    // === Type FÉE (SPÉCIAL — 1er type Fée du jeu, porté par le légendaire Ukognos du run 2) ===
    // Némésis-type du Dragon : super-efficace sur Combat/Dragon, résisté par Feu/Poison.
    bourrasque_feerique: { id: "bourrasque_feerique", name: "Bourrasque Féerique", type: "FEE", power: 40, accuracy: 100, pp: 30, description: "Un souffle de poussière féerique scintillante. STAB Fée de départ." },
    voile_feerique: { id: "voile_feerique", name: "Voile Féerique", type: "FEE", power: 60, accuracy: 100, pp: 20, effect: { chance: 15, inflictStatus: "POISON" }, description: "Nappe de lueurs enchantées : puissance modeste mais 15% d'empoisonner. Couverture utilitaire Fée." },
    eclat_lunaire: { id: "eclat_lunaire", name: "Éclat Lunaire", type: "FEE", power: 85, accuracy: 100, pp: 15, effect: { chance: 10, statChanges: [{ target: "self", stat: "spc", stages: 1 }] }, description: "Onde féerique scintillante : gros dégâts Spécial + 10% d'élever le Spécial du lanceur (+1, cumulable). STAB signature de la lignée Fée." },
    cataclysme_lunaire: { id: "cataclysme_lunaire", name: "Cataclysme Lunaire", type: "FEE", power: 115, accuracy: 95, pp: 5, description: "Déchaînement de flammes féeriques : la plus puissante attaque Fée. Réservée aux légendes — l'écho maudit du Souffle Primordial." },
    // === Petits moves de caractère (early-game core) ===
    visee: { id: "visee", name: "Visée", type: "NORMAL", power: 0, accuracy: 0, pp: 20, costPower: 20, effect: { statChanges: [{ target: "self", stat: "acc", stages: 1 }] }, description: "Le Daemon ajuste son tir : augmente sa Précision." },
    secousse: { id: "secousse", name: "Secousse", type: "SOL", power: 60, accuracy: 100, pp: 20, description: "Une secousse tellurique ébranle la cible." },
    tison: { id: "tison", name: "Tison", type: "FEU", power: 45, accuracy: 100, pp: 25, effect: { chance: 30, inflictStatus: "BURN" }, description: "Projette une braise : peu puissante mais brûle souvent (30%)." },
    fouet_de_nouilles: { id: "fouet_de_nouilles", name: "Fouet de Nouilles", type: "NORMAL", power: 50, accuracy: 100, pp: 20, effect: { chance: 30, statChanges: [{ target: "target", stat: "spe", stages: -1 }], critChanceForSpecies: { nouillon: 1, vermisaint: 0.8, divinpate: 0.6 } }, description: "Cingle l'ennemi de nouilles collantes (peut baisser la Vitesse, 30%). Critique pour la lignée Nouillon : Nouillon 100%, Vermisaint 80%, Divinpâte 60%." },

    // Attaque de SECOURS gratuite (anti soft-lock) : utilisable quand le joueur n'a
    // plus de reps pour aucune autre attaque. Faible et inflige du recul à soi-même.
    charge_desesperee: { id: "charge_desesperee", name: "Charge Désespérée", type: "NORMAL", power: 45, accuracy: 100, pp: 1, effect: { recoilPct: 70 }, description: "Dernier recours gratuit : frappe correctement mais se blesse gravement (le combat ne traîne pas)." },
    // ULTIME (Normal physique) : puissance colossale, mais le contrecoup épuise le lanceur (pas de mécanique
    // de « recharge » dans le moteur → le recul tient lieu de drawback). Apprise très tard (move de prestige).
    ultralaser: { id: "ultralaser", name: "Ultralaser", type: "NORMAL", power: 150, accuracy: 90, pp: 5, effect: { recoilPct: 25 }, description: "Le rayon ultime : des dégâts dévastateurs, mais le contrecoup blesse violemment le lanceur." },
    // Soin volant (Roost) — Normal pur, SANS sommeil (contrairement à Repos). Signature de soin d'Aquilord.
    reprise_ailes: { id: "reprise_ailes", name: "Reprise d'Ailes", type: "NORMAL", power: 0, accuracy: 0, pp: 10, costPower: 60, effect: { healPct: 50 }, description: "Le Daemon replie ses ailes et récupère : restaure la moitié de ses PV (sans s'endormir)." },

    // === 5 SIGNATURES EXCLUSIVES AU RUN 2 (ct53→ct57 — cadeaux des boss d'arène en New Game+) ===
    // Serres de l'Aube (Druide/Vol) : 1re PRIORITÉ STAB volante — frappe toujours en premier.
    serres_aube: { id: "serres_aube", name: "Serres de l'Aube", type: "VOL", power: 80, accuracy: 100, pp: 10, priority: 1, description: "Signature de l'arène volante : un piqué fulgurant qui fend l'air et frappe TOUJOURS en premier (priorité)." },
    // Onde Cérébrale (Granit/Psy) : chip minime mais TRIPLE affaiblissement garanti (Vit/Précision/Déf).
    onde_cerebrale: { id: "onde_cerebrale", name: "Onde Cérébrale", type: "PSY", power: 40, accuracy: 100, pp: 15, effect: { statChanges: [{ target: "target", stat: "spe", stages: -1 }, { target: "target", stat: "acc", stages: -1 }, { target: "target", stat: "def", stages: -1 }] }, description: "Onde psychique débilitante : peu de dégâts, mais brouille la cible — Vitesse −1, Précision −1 ET Défense −1 (garanti)." },
    // Danse du Fauve (Pyra/éclectique) : set-up universel Atq + Vit (façon Danse Draco), apprenable par tous.
    danse_fauve: { id: "danse_fauve", name: "Danse du Fauve", type: "NORMAL", power: 0, accuracy: 0, pp: 15, costPower: 40, effect: { statChanges: [{ target: "self", stat: "atk", stages: 1 }, { target: "self", stat: "spe", stages: 1 }] }, description: "Transe féline : le Daemon s'échauffe et gagne en furie — Attaque +1 ET Vitesse +1 (cumulable). Le seul set-up mixte apprenable par tous." },
    // Essaim Vorace (Volta/Insecte) : drain CROISSANT sur coups consécutifs (20→70% des dégâts) + Vitesse +1/coup.
    essaim_vorace: { id: "essaim_vorace", name: "Essaim Vorace", type: "INSECTE", power: 45, accuracy: 100, pp: 10, effect: { drainPct: 20, escalatingDrain: true, statChanges: [{ target: "self", stat: "spe", stages: 1 }] }, description: "L'essaim s'affame : chaque coup consécutif draine une part CROISSANTE des dégâts (20 → 30 → 40 → 50 → 60 → 70%) ET accélère le lanceur (Vitesse +1). Rater ou changer d'attaque réinitialise la frénésie." },
    // Frappe Atlas (Ondine/Sol) : dégâts FIXES égaux au niveau du lanceur (façon Frappe Atlas / Seismic Toss Gen 1).
    frappe_atlas: { id: "frappe_atlas", name: "Frappe Atlas", type: "SOL", power: 0, accuracy: 100, pp: 10, costPower: 45, effect: { fixedDamageLevel: true }, description: "Le titan pèse de tout son poids : inflige TOUJOURS des dégâts égaux à son NIVEAU, quels que soient les stats (seule l'immunité des Vol l'annule)." },
    // TÉNÈBRES (spécial) — introduits avec le type Ténèbres (némésis de Shady). Onde Obscure = STAB fiable (façon
    // Vibrobscur, peut apeurer) ; Dévoreur d'Ombres = signature du némésis (draine 50% : longévité + usure).
    onde_obscure: { id: "onde_obscure", name: "Onde Obscure", type: "TENEBRES", power: 85, accuracy: 100, pp: 15, effect: { chance: 20, flinch: true }, description: "Une onde de ténèbres pures submerge la cible : gros dégâts spéciaux, 20% de chance d'apeurer." },
    devoreur_ombres: { id: "devoreur_ombres", name: "Dévoreur d'Ombres", type: "TENEBRES", power: 90, accuracy: 100, pp: 10, effect: { drainPct: 50 }, description: "Le prédateur dévore l'ombre de sa proie : gros dégâts Ténèbres et récupère la moitié des dégâts infligés. Signature ténébreuse." },
}

export function getMove(id: string): MoveData | null {
    return MOVES[id] ?? null
}

export const MOVE_IDS = Object.keys(MOVES)

// Index nom d'affichage → attaque (reverse lookup). Utilisé par le Hall of Fame, qui ne stocke que les
// NOMS des attaques du champion figé (cf. ChampionMon.moves) et doit les retrouver pour reconstruire un combat.
const MOVE_BY_NAME: Record<string, MoveData> = Object.fromEntries(Object.values(MOVES).map((m) => [m.name, m]))
export function getMoveByName(name: string): MoveData | null {
    return MOVE_BY_NAME[name] ?? null
}
