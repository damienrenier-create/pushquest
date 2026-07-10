// src/lib/gamebook/yellow/data/run3Bosses.ts
//
// Nexus Jaune Éclair — RUN 3 : CURATION FIGÉE des 5 boss d'arène. 5 vraies équipes de joueurs (une par arène,
// des potes différents), extraites une fois de la table ArenaChampion et GELÉES ici → IDENTIQUES POUR TOUS
// les concurrents (indispensable : le score = Σ des niveaux des Pokémon vaincus, donc tout le monde doit
// affronter exactement les mêmes boss). Format = ChampionMon (comme le Hall of Fame) → fielded pareil.
// GÉNÉRÉ par scripts/_gen-run3-bosses.ts — ne pas éditer à la main.
import type { ChampionMon } from "../storage/save"

export interface Run3Boss { nickname: string; team: ChampionMon[] }

/** Boss FIGÉ de chaque arène, par slot badge (plante=arène1 … eau=arène5). */
export const RUN3_BOSS_TEAMS: Record<string, Run3Boss> = {
    "plante": {
        "nickname": "Mools",
        "team": [
            {
                "speciesId": "jerbiwat",
                "level": 17,
                "stats": {
                    "hp": 53,
                    "atk": 27,
                    "def": 28,
                    "spe": 49,
                    "spc": 61
                },
                "moves": [
                    "Charge",
                    "Choc Mental",
                    "Étincelle"
                ]
            },
            {
                "speciesId": "bouh",
                "level": 21,
                "stats": {
                    "hp": 66,
                    "atk": 43,
                    "def": 46,
                    "spe": 22,
                    "spc": 37
                },
                "moves": [
                    "Léchouille",
                    "Griffe Spectrale",
                    "Malédiction",
                    "Voile d'Effroi"
                ]
            },
            {
                "speciesId": "crocodaillus",
                "level": 23,
                "stats": {
                    "hp": 65,
                    "atk": 81,
                    "def": 42,
                    "spe": 71,
                    "spc": 27
                },
                "moves": [
                    "Picpic",
                    "Jet de Sable",
                    "Jet-Pierres",
                    "Malédiction"
                ]
            },
            {
                "speciesId": "cailloutchi",
                "level": 12,
                "stats": {
                    "hp": 33,
                    "atk": 25,
                    "def": 31,
                    "spe": 18,
                    "spc": 13
                },
                "moves": [
                    "Charge",
                    "Jet-Pierres"
                ]
            },
            {
                "speciesId": "carlinou",
                "level": 15,
                "stats": {
                    "hp": 40,
                    "atk": 24,
                    "def": 20,
                    "spe": 25,
                    "spc": 28
                },
                "moves": [
                    "Charge",
                    "Flamme Ardente",
                    "Draco-Souffle"
                ]
            },
            {
                "speciesId": "glacirex",
                "level": 13,
                "stats": {
                    "hp": 40,
                    "atk": 27,
                    "def": 21,
                    "spe": 20,
                    "spc": 28
                },
                "moves": [
                    "Coup d'Givre",
                    "Charge",
                    "Fouet de Nouilles"
                ]
            }
        ]
    },
    "roche": {
        "nickname": "Task1",
        "team": [
            {
                "speciesId": "ondaloutre",
                "level": 22,
                "stats": {
                    "hp": 63,
                    "atk": 31,
                    "def": 34,
                    "spe": 36,
                    "spc": 42
                },
                "moves": [
                    "Pistolet à O",
                    "Lame d'Eau"
                ]
            },
            {
                "speciesId": "octoroc",
                "level": 24,
                "stats": {
                    "hp": 76,
                    "atk": 26,
                    "def": 52,
                    "spe": 17,
                    "spc": 29
                },
                "moves": [
                    "Éboulis",
                    "Jet-Pierres",
                    "Mur de Fer",
                    "Tir de Boue"
                ]
            },
            {
                "speciesId": "lampignon",
                "nickname": "Damzer",
                "level": 32,
                "stats": {
                    "hp": 89,
                    "atk": 44,
                    "def": 50,
                    "spe": 45,
                    "spc": 66
                },
                "moves": [
                    "Charge",
                    "Léchouille",
                    "Toxik",
                    "Crachat Acide"
                ]
            },
            {
                "speciesId": "broutame",
                "level": 19,
                "stats": {
                    "hp": 55,
                    "atk": 30,
                    "def": 35,
                    "spe": 27,
                    "spc": 40
                },
                "moves": [
                    "Charge",
                    "Fouet Lianes",
                    "Vampigraine",
                    "Méga-Sangsue"
                ]
            },
            {
                "speciesId": "vermisaint",
                "level": 23,
                "stats": {
                    "hp": 63,
                    "atk": 28,
                    "def": 35,
                    "spe": 30,
                    "spc": 45
                },
                "moves": [
                    "Charge",
                    "Choc Mental",
                    "Onde Folie"
                ]
            },
            {
                "speciesId": "wyverion",
                "level": 25,
                "stats": {
                    "hp": 72,
                    "atk": 47,
                    "def": 38,
                    "spe": 44,
                    "spc": 40
                },
                "moves": [
                    "Charge",
                    "Picpic",
                    "Draco-Souffle"
                ]
            }
        ]
    },
    "feu": {
        "nickname": "Neuneu",
        "team": [
            {
                "speciesId": "oragron",
                "level": 37,
                "stats": {
                    "hp": 124,
                    "atk": 73,
                    "def": 64,
                    "spe": 94,
                    "spc": 85
                },
                "moves": [
                    "Étincelle",
                    "Picpic",
                    "Lame d'Eau",
                    "Tornade"
                ]
            },
            {
                "speciesId": "flamkure",
                "level": 30,
                "stats": {
                    "hp": 85,
                    "atk": 56,
                    "def": 44,
                    "spe": 70,
                    "spc": 70
                },
                "moves": [
                    "Charge",
                    "Flammèche",
                    "Lance-Flammes"
                ]
            },
            {
                "speciesId": "flamaspic",
                "level": 27,
                "stats": {
                    "hp": 81,
                    "atk": 41,
                    "def": 48,
                    "spe": 47,
                    "spc": 65
                },
                "moves": [
                    "Flammèche",
                    "Choc Mental",
                    "Flamme Ardente",
                    "Onde Folie"
                ]
            },
            {
                "speciesId": "fissuralave",
                "level": 34,
                "stats": {
                    "hp": 107,
                    "atk": 77,
                    "def": 79,
                    "spe": 41,
                    "spc": 56
                },
                "moves": [
                    "Charge",
                    "Jet-Pierres",
                    "Flammèche",
                    "Séisme"
                ]
            },
            {
                "speciesId": "necarabee",
                "level": 27,
                "stats": {
                    "hp": 87,
                    "atk": 62,
                    "def": 41,
                    "spe": 60,
                    "spc": 45
                },
                "moves": [
                    "Léchouille",
                    "Dard-Nuée",
                    "Ombre Furtive",
                    "Morsure"
                ]
            },
            {
                "speciesId": "sylvours",
                "level": 32,
                "stats": {
                    "hp": 122,
                    "atk": 77,
                    "def": 62,
                    "spe": 47,
                    "spc": 57
                },
                "moves": [
                    "Plaquage",
                    "Poing-Karaté",
                    "Étreinte Sylvestre",
                    "Fouet Lianes"
                ]
            }
        ]
    },
    "elec": {
        "nickname": "Embi",
        "team": [
            {
                "speciesId": "jerbiwat",
                "level": 33,
                "stats": {
                    "hp": 94,
                    "atk": 45,
                    "def": 48,
                    "spe": 89,
                    "spc": 95
                },
                "moves": [
                    "Charge",
                    "Choc Mental",
                    "Étincelle",
                    "Focalisation"
                ]
            },
            {
                "speciesId": "oragron",
                "level": 53,
                "stats": {
                    "hp": 164,
                    "atk": 106,
                    "def": 106,
                    "spe": 132,
                    "spc": 150
                },
                "moves": [
                    "Tornade",
                    "Focalisation",
                    "Étincelle",
                    "Lame d'Eau"
                ]
            },
            {
                "speciesId": "druidours",
                "level": 45,
                "stats": {
                    "hp": 155,
                    "atk": 133,
                    "def": 106,
                    "spe": 63,
                    "spc": 72
                },
                "moves": [
                    "Méga-Sangsue",
                    "Séisme",
                    "Tempête Verte",
                    "Crochet du Maître"
                ]
            },
            {
                "speciesId": "hebulmin",
                "level": 38,
                "stats": {
                    "hp": 129,
                    "atk": 106,
                    "def": 74,
                    "spe": 63,
                    "spc": 72
                },
                "moves": [
                    "Crochet du Maître",
                    "Étincelle",
                    "Balayage",
                    "Fulgurance"
                ]
            },
            {
                "speciesId": "gloutanoir",
                "level": 48,
                "stats": {
                    "hp": 167,
                    "atk": 80,
                    "def": 103,
                    "spe": 59,
                    "spc": 116
                },
                "moves": [
                    "Morsure",
                    "Jet de Sable",
                    "Tempête Verte",
                    "Tranche"
                ]
            },
            {
                "speciesId": "namizeus",
                "level": 37,
                "stats": {
                    "hp": 98,
                    "atk": 64,
                    "def": 54,
                    "spe": 90,
                    "spc": 78
                },
                "moves": [
                    "Léchouille",
                    "Vive-Attaque",
                    "Mirage",
                    "Ombre Furtive"
                ]
            }
        ]
    },
    "eau": {
        "nickname": "Franss",
        "team": [
            {
                "speciesId": "jerbiwat",
                "level": 49,
                "stats": {
                    "hp": 134,
                    "atk": 67,
                    "def": 72,
                    "spe": 142,
                    "spc": 159
                },
                "moves": [
                    "Surtension",
                    "Vague Mentale",
                    "Étincelle",
                    "Focalisation"
                ]
            },
            {
                "speciesId": "rochison",
                "level": 62,
                "stats": {
                    "hp": 203,
                    "atk": 192,
                    "def": 193,
                    "spe": 118,
                    "spc": 91
                },
                "moves": [
                    "Éboulis",
                    "Faille Sismique",
                    "Séisme",
                    "Bélier"
                ]
            },
            {
                "speciesId": "flamaspic",
                "level": 30,
                "stats": {
                    "hp": 82,
                    "atk": 45,
                    "def": 52,
                    "spe": 51,
                    "spc": 67
                },
                "moves": [
                    "Lance-Flammes",
                    "Choc Mental",
                    "Flamme Ardente",
                    "Onde Folie"
                ]
            },
            {
                "speciesId": "naiadrak",
                "level": 53,
                "stats": {
                    "hp": 166,
                    "atk": 92,
                    "def": 108,
                    "spe": 101,
                    "spc": 153
                },
                "moves": [
                    "Coup d'Givre",
                    "Hydrocanon",
                    "Focalisation",
                    "Plaquage"
                ]
            },
            {
                "speciesId": "pyrokoss",
                "level": 45,
                "stats": {
                    "hp": 135,
                    "atk": 122,
                    "def": 84,
                    "spe": 131,
                    "spc": 109
                },
                "moves": [
                    "Séisme",
                    "Flamme Ardente",
                    "Lance-Flammes",
                    "Danse-Lames"
                ]
            },
            {
                "speciesId": "druidours",
                "level": 46,
                "stats": {
                    "hp": 159,
                    "atk": 122,
                    "def": 113,
                    "spe": 80,
                    "spc": 94
                },
                "moves": [
                    "Crochet du Maître",
                    "Bélier",
                    "Étreinte Sylvestre",
                    "Tempête Verte"
                ]
            }
        ]
    }
}

/** Boss figé d'une arène (par slot badge), ou null. */
export function run3BossFor(badge: string): Run3Boss | null {
    return RUN3_BOSS_TEAMS[badge] ?? null
}

/** Somme des niveaux de tous les Daemons d'un boss (contribution max au score si on le vainc en entier). */
export function run3BossLevelSum(badge: string): number {
    return (RUN3_BOSS_TEAMS[badge]?.team ?? []).reduce((a, m) => a + (m.level ?? 0), 0)
}

// TAILLE du boss par arène (ordre de jeu) : ramp façon run 1 (arène 1 courte → arène 5 = équipe complète).
// L'énergie du run 3 est limitée (500 au départ) → un boss de 6 Daemons dès l'arène 1 est infaisable.
const RUN3_BOSS_SIZE: Record<string, number> = { plante: 3, roche: 4, feu: 4, elec: 5, eau: 6 }
// Niveau CIBLE par arène (≈ le boss d'origine du run 1/2). On garde les Daemons les plus PROCHES de ce niveau
// (Sartay : « pas trop faible, se rapprocher le plus possible du boss original ») → ni les plus faibles, ni les plus forts.
const RUN3_BOSS_TARGET_LVL: Record<string, number> = { plante: 16, roche: 20, feu: 28, elec: 37, eau: 51 }

/** Équipe FIGÉE du boss d'une arène run 3, TRONQUÉE à la taille de l'arène : on garde les N Daemons dont le
 *  niveau est le plus proche du boss d'origine (calibrage de difficulté), puis on les ordonne par niveau
 *  croissant (l'ACE/le plus fort en dernier). MÊME résultat pour tous les joueurs → score comparable. */
export function run3ArenaBossTeam(badge: string): ChampionMon[] {
    const team = RUN3_BOSS_TEAMS[badge]?.team ?? []
    if (team.length === 0) return []
    const n = RUN3_BOSS_SIZE[badge] ?? team.length
    const target = RUN3_BOSS_TARGET_LVL[badge] ?? 0
    return [...team]
        .sort((a, b) => Math.abs((a.level ?? 0) - target) - Math.abs((b.level ?? 0) - target)) // plus proches de la cible d'abord
        .slice(0, n)
        .sort((a, b) => (a.level ?? 0) - (b.level ?? 0)) // fielded du plus faible au plus fort
}
