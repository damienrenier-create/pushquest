// src/lib/gamebook/yellow/frontier/domeTrainers.ts
//
// DÔME — LE POOL DE 30 DRESSEURS à personnalité (source de vérité, data pure).
// 20 concepts du dev + 4 inventés + 6 hommages aux vrais joueurs. Chaque ace est une espèce RÉELLE
// (garde-fou : domeTrainers.test.ts). L'équipe est GÉNÉRÉE par match, scalée par le tier — seul l'ace
// est garanti (scriptedAce). Cf. artifact « Le Dôme » pour le design complet.

import type { DomeTrainer } from "./domeTypes"

export const DOME_TRAINERS: DomeTrainer[] = [
    // ── 20 concepts du dev ─────────────────────────────────────────────────────────────────────
    { id: "kevin", name: "Kevin", epithet: "Le Marchand de Sable", themeTypes: ["PLANTE", "PSY", "GLACE"],
      aceSpecies: "karmaki", scriptedAce: true, damageBias: "special", minTier: "OR",
      ai: { aggression: .5, switchAversion: .45, noiseSigma: .15, showmanship: .55 },
      constraint: { kind: "statusSynergy", status: ["sleep"], minCarriers: 2 },
      taunt: "Chhht… ferme les yeux. Mes spores font le reste. Tes Daemons vont dormir — et ne se réveilleront pas à temps." },

    { id: "maxime", name: "Maxime", epithet: "Le Flambeur", themeTypes: ["FEU", "DRAGON", "ROCHE", "ELEC", "EAU"],
      aceSpecies: "dracarlin", scriptedAce: true, damageBias: "mixed", minTier: "DIAMANT",
      ai: { aggression: .9, switchAversion: .6, noiseSigma: .28, showmanship: .75 },
      constraint: { kind: "movePreference", pref: "high-power-risky" },
      taunt: "Précision ? Prudence ? Très peu pour moi. Un coup, un K.O. — ou rien." },

    { id: "geraldine", name: "Géraldine", epithet: "La Dame de Givre", themeTypes: ["GLACE", "EAU", "DRAGON"], excludeTypes: ["FEU"],
      aceSpecies: "orcaline", scriptedAce: true, damageBias: "special", minTier: "OR",
      ai: { aggression: .45, switchAversion: .35, noiseSigma: .13, showmanship: .4 },
      constraint: { kind: "statusSynergy", status: ["freeze"], minCarriers: 2 },
      taunt: "Le feu ? Grossier. Regarde plutôt tes Daemons se figer un à un… et reste poli, la statue." },

    { id: "solene", name: "Solène", epithet: "La Foudroyeuse Spéciale", themeTypes: ["ELEC", "PSY", "FEE", "DRAGON", "GLACE"],
      aceSpecies: "jerbiwat", scriptedAce: true, damageBias: "special", minTier: "OR",
      ai: { aggression: .75, switchAversion: .3, noiseSigma: .1, showmanship: .85 },
      constraint: { kind: "statWeight", spe: 2, spc: 2 },
      taunt: "Tu bouges déjà trop lentement. Le temps que tu choisisses, mon équipe aura balayé la tienne." },

    { id: "noe", name: "Noé", epithet: "Le Bulldozer", themeTypes: ["ROCHE", "COMBAT", "NORMAL", "SOL", "INSECTE"],
      aceSpecies: "chronorex", scriptedAce: true, damageBias: "physical", minTier: "OR",
      ai: { aggression: .92, switchAversion: .85, noiseSigma: .2, showmanship: .45 },
      constraint: { kind: "movePreference", pref: "max-attack" },
      taunt: "Pas de ruse. Pas de recul. Juste mon poing dans ta face jusqu'à ce que tu tombes." },

    { id: "benus", name: "Benus", epithet: "Le Trigone Élémentaire", themeTypes: ["FEU", "ELEC", "PLANTE"],
      aceSpecies: "pyropanthe", scriptedAce: true, damageBias: "special", minTier: "OR",
      ai: { aggression: .6, switchAversion: .4, noiseSigma: .15, showmanship: .5 },
      constraint: { kind: "elementalTrio", types: ["FEU", "ELEC", "PLANTE"] },
      taunt: "Feu, Foudre, Feuille. Trois éléments, aucune faille. Trouve la couleur qui me bat — bonne chance." },

    { id: "aldo", name: "Aldo", epithet: "Le Poing d'Acier", themeTypes: ["COMBAT"],
      aceSpecies: "maitrezenc", scriptedAce: true, damageBias: "physical", minTier: "ARGENT",
      ai: { aggression: .78, switchAversion: .65, noiseSigma: .14, showmanship: .55 },
      constraint: { kind: "none" },
      taunt: "Salut à toi. Maintenant, garde ta garde haute — mes poings ne connaissent qu'une seule leçon." },

    { id: "fly", name: "Fly", epithet: "l'As du Ciel", themeTypes: ["VOL"],
      aceSpecies: "aquilothan", scriptedAce: true, damageBias: "physical", minTier: "ARGENT",
      ai: { aggression: .6, switchAversion: .4, noiseSigma: .12, showmanship: .7 },
      constraint: { kind: "statWeight", spe: 2 },
      taunt: "Le ciel n'appartient qu'à ceux qui savent voler. Toi, tu vas t'écraser." },

    { id: "itachi", name: "Itachi", epithet: "le Prodige Mental", themeTypes: ["PSY"],
      aceSpecies: "divinpate", scriptedAce: true, damageBias: "special", minTier: "DIAMANT",
      ai: { aggression: .5, switchAversion: .55, noiseSigma: .05, showmanship: .5 },
      constraint: { kind: "none" },
      taunt: "Tu es déjà pris dans mon illusion. Ce combat était joué avant de commencer." },

    { id: "naruto", name: "Naruto", epithet: "le Ninja au Crapaud", themeTypes: ["EAU", "COMBAT", "FEU", "PLANTE", "ELEC", "ROCHE"], includeSpecies: ["uzumaro"],
      aceSpecies: "uzumaro", scriptedAce: true, damageBias: "mixed", minTier: "DIAMANT",
      ai: { aggression: .6, switchAversion: .35, noiseSigma: .15, showmanship: .6 },
      constraint: { kind: "none" },
      taunt: "Mon crapaud et moi, on n'abandonne jamais ! Crois-y — ça, c'est mon nindo !" },

    { id: "saitama", name: "Saitama", epithet: "le Poing Unique", themeTypes: ["NORMAL"],
      aceSpecies: "mimimoy", scriptedAce: true, damageBias: "mixed", minTier: "MAITRE",
      ai: { aggression: 1, switchAversion: .9, noiseSigma: .1, showmanship: .1 },
      constraint: { kind: "lowBstMaxTraining" },
      taunt: "...Bon. On en finit en un coup, alors ?" },

    { id: "light", name: "Light", epithet: "le Tacticien Absolu", themeTypes: [],
      aceSpecies: "namizeus", scriptedAce: true, damageBias: "mixed", minTier: "MAITRE",
      ai: { aggression: .5, switchAversion: .2, noiseSigma: 0, showmanship: .4 },
      constraint: { kind: "counterPlayer", mode: "adaptive" },
      taunt: "J'ai déjà prévu chacun de tes coups. Tout se déroule exactement comme je l'ai écrit." },

    { id: "simon", name: "Simon", epithet: "le Foreur Téméraire", themeTypes: ["FEU", "COMBAT", "ELEC"],
      aceSpecies: "coccimperatrice", scriptedAce: true, damageBias: "physical", minTier: "OR",
      ai: { aggression: 1, switchAversion: .7, noiseSigma: .32, showmanship: .9 },
      constraint: { kind: "movePreference", pref: "high-power-risky" },
      taunt: "Qui crois-tu que je suis ?! Je fonce, quoi qu'il arrive — perce les cieux !" },

    { id: "matthew", name: "Matthew", epithet: "le Patient Venimeux", themeTypes: ["POISON", "SPECTRE", "GLACE"],
      aceSpecies: "mycedruide", scriptedAce: true, damageBias: "special", minTier: "ARGENT",
      ai: { aggression: .15, switchAversion: .3, noiseSigma: .08, showmanship: .15 },
      constraint: { kind: "statusSynergy", status: ["sleep", "poison"], minCarriers: 2 },
      taunt: "Prends ton temps... de toute façon, le poison fait déjà son œuvre." },

    { id: "axelle", name: "Axelle", epithet: "La Muraille", themeTypes: ["NORMAL", "ROCHE", "EAU"], includeSpecies: ["tonytony"],
      aceSpecies: "leviathonn", scriptedAce: true, damageBias: "special", minTier: "OR",
      ai: { aggression: .35, switchAversion: .85, noiseSigma: .12, showmanship: .2 },
      constraint: { kind: "statWeight", hp: 3 },
      taunt: "Frappe. Frappe encore. Tu seras fatigué bien avant mes Daemons." },

    { id: "jm", name: "JM", epithet: "Le Courant d'Air", themeTypes: ["VOL", "ELEC", "PSY"],
      aceSpecies: "thundah", scriptedAce: true, damageBias: "mixed", minTier: "OR",
      ai: { aggression: .5, switchAversion: .05, noiseSigma: .12, showmanship: .7 },
      constraint: { kind: "highSwitch" },
      taunt: "Tu vises où j'étais. Moi je suis déjà ailleurs." },

    { id: "guigui", name: "Guigui", epithet: "Le Parfait Contre", themeTypes: [],
      aceSpecies: "toucanyon", scriptedAce: true, damageBias: "mixed", minTier: "OR",
      ai: { aggression: .65, switchAversion: .7, noiseSigma: .2, showmanship: .4 },
      constraint: { kind: "counterPlayer", mode: "static" },
      taunt: "J'ai étudié ton équipe avant même que tu entres. Tout est déjà joué." },

    { id: "sphax", name: "Sphax", epithet: "Le Marteau", themeTypes: ["ROCHE", "COMBAT", "DRAGON"],
      aceSpecies: "alirocaillus", scriptedAce: true, damageBias: "physical", minTier: "DIAMANT",
      ai: { aggression: 1, switchAversion: .85, noiseSigma: .15, showmanship: .6 },
      constraint: { kind: "movePreference", pref: "max-attack" },
      taunt: "Défense ? Vitesse ? Astuces ? Moi j'ai la FORCE. Ça suffit." },

    { id: "cretchon", name: "Cretchon", epithet: "L'Outsider", themeTypes: [],
      aceSpecies: "merorem", scriptedAce: true, damageBias: "mixed", minTier: "MAITRE",
      ai: { aggression: .6, switchAversion: .4, noiseSigma: .08, showmanship: .3 },
      constraint: { kind: "lowBstMaxTraining", rare: true },
      taunt: "Personne ne les prend au sérieux. C'est exactement pour ça qu'ils gagnent." },

    { id: "vito", name: "Vito", epithet: "L'Enclume", themeTypes: ["ROCHE", "METAL", "EAU"],
      aceSpecies: "megalithe", scriptedAce: true, damageBias: "physical", minTier: "MAITRE",
      ai: { aggression: .3, switchAversion: .55, noiseSigma: .12, showmanship: .25 },
      constraint: { kind: "statWeight", def: 2, hp: 2, lowSpe: true },
      taunt: "Cogne tant que tu veux. L'enclume ne bouge pas — c'est le marteau qui casse." },

    // ── 4 dresseurs inventés (comblent DRAGON / SPECTRE / FÉE / MÉTAL) ──────────────────────────
    { id: "azrael", name: "Azraël", epithet: "Seigneur des Cieux", themeTypes: ["DRAGON", "VOL"],
      aceSpecies: "draconarque", scriptedAce: true, damageBias: "mixed", minTier: "MAITRE",
      ai: { aggression: .82, switchAversion: .55, noiseSigma: .05, showmanship: .85 },
      constraint: { kind: "movePreference", pref: "high-power-risky" },
      taunt: "Lève les yeux : là où je règne, tes Daemons ne sont que des points à l'horizon." },

    { id: "vespra", name: "Vespra", epithet: "Illusionniste des Ombres", themeTypes: ["SPECTRE"],
      aceSpecies: "ombrapanthe", scriptedAce: true, damageBias: "mixed", minTier: "OR",
      ai: { aggression: .45, switchAversion: .15, noiseSigma: .08, showmanship: .9 },
      constraint: { kind: "highSwitch" },
      taunt: "Tu frappes ? Je n'étais déjà plus là. Mes spectres dansent entre deux battements de cils. Hi hi…" },

    { id: "melusine", name: "Mélusine", epithet: "Enchanteresse Lunaire", themeTypes: ["FEE", "PSY"],
      aceSpecies: "lunarque", scriptedAce: true, damageBias: "special", minTier: "OR",
      ai: { aggression: .35, switchAversion: .4, noiseSigma: .1, showmanship: .7 },
      constraint: { kind: "statusSynergy", status: ["sleep"], minCarriers: 2 },
      taunt: "Sous ma lune, les colosses s'endorment et les monstres oublient jusqu'à leur propre rage." },

    { id: "torvald", name: "Torvald", epithet: "Rempart d'Acier", themeTypes: ["METAL", "ROCHE"],
      aceSpecies: "colosfer", scriptedAce: true, damageBias: "physical", minTier: "OR",
      ai: { aggression: .2, switchAversion: .95, noiseSigma: .1, showmanship: .15 },
      constraint: { kind: "statWeight", hp: 3 },
      taunt: "Frappe jusqu'à t'épuiser. Mon acier ne plie pas. Le premier à fatiguer, ce sera toi." },

    // ── 6 hommages aux vrais joueurs ────────────────────────────────────────────────────────────
    { id: "mools", name: "Mools", epithet: "Le Champion", themeTypes: ["DRAGON", "ROCHE", "EAU", "GLACE", "FEU", "COMBAT"],
      aceSpecies: "goshendofy", scriptedAce: true, damageBias: "mixed", minTier: "MAITRE",
      ai: { aggression: .55, switchAversion: .25, noiseSigma: .03, showmanship: .6 },
      constraint: { kind: "counterPlayer", mode: "adaptive" },
      taunt: "J'ai bouclé le Nexus trois fois. Tu crois vraiment me surprendre au quatrième ?" },

    { id: "xa", name: "Xa", epithet: "Le Colosse", themeTypes: ["SOL", "ROCHE", "PLANTE", "COMBAT"],
      aceSpecies: "sylvebarbe", scriptedAce: true, damageBias: "special", minTier: "MAITRE",
      ai: { aggression: .5, switchAversion: .85, noiseSigma: .05, showmanship: .35 },
      constraint: { kind: "statWeight", hp: 2, def: 2 },
      taunt: "Mes Daemons sont des montagnes, gamin. Tu ne les renverseras pas — tu vas juste t'épuiser à essayer." },

    { id: "embi", name: "Embi", epithet: "Le Collectionneur", themeTypes: ["NORMAL", "VOL", "METAL", "FEE", "DRAGON", "SPECTRE", "COMBAT"],
      aceSpecies: "aquilord", scriptedAce: true, damageBias: "special", minTier: "DIAMANT",
      ai: { aggression: .45, switchAversion: .2, noiseSigma: .12, showmanship: .55 },
      constraint: { kind: "highSwitch" },
      taunt: "J'ai capturé un Daemon de chaque type. Devine lequel je sors pour t'éteindre ?" },

    { id: "neuneu", name: "Neuneu", epithet: "L'Assaut", themeTypes: ["VOL", "ROCHE", "COMBAT", "FEU", "ELEC"],
      aceSpecies: "hebulmin", scriptedAce: true, damageBias: "physical", minTier: "OR",
      ai: { aggression: .95, switchAversion: .85, noiseSigma: .22, showmanship: .9 },
      constraint: { kind: "movePreference", pref: "max-attack" },
      taunt: "Défense ? Switch ? Connais pas. Je frappe, tu tombes. Prépare-toi." },

    { id: "gg", name: "Gg", epithet: "L'Opportuniste", themeTypes: ["INSECTE", "POISON", "PSY", "SPECTRE"],
      aceSpecies: "regnantaur", scriptedAce: true, damageBias: "physical", minTier: "OR",
      ai: { aggression: .35, switchAversion: .35, noiseSigma: .07, showmanship: .5 },
      constraint: { kind: "statusSynergy", status: ["sleep", "poison"], minCarriers: 2 },
      taunt: "Pendant que tu réfléchis, ton Daemon dort déjà — et ma ruche l'encercle. Malin, non ?" },

    { id: "frans", name: "Frans", epithet: "Le Roc Tenace", themeTypes: ["EAU", "COMBAT", "ROCHE", "FEU"],
      aceSpecies: "calderont", scriptedAce: true, damageBias: "special", minTier: "OR",
      ai: { aggression: .55, switchAversion: .65, noiseSigma: .08, showmanship: .3 },
      constraint: { kind: "statWeight", hp: 3 },
      taunt: "Tu peux cogner tant que tu veux. Mes murs frappent en retour, et eux ne tombent pas." },
]

/** Accès par id (nullable). */
export function getDomeTrainer(id: string): DomeTrainer | null {
    return DOME_TRAINERS.find((t) => t.id === id) ?? null
}
