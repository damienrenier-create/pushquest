// src/lib/gamebook/yellow/data/run3ArenaNpcs.ts
//
// RUN 3 (concours) — les PNJ des 5 arènes re-thémées : NOM + répliques des 20 GARDIENS (Glace, Combat, Spectre, Dragon,
// Multi). Signalement Sartay du 26/10/2026 : en run 3, l'arène avait le fond et les équipes du nouveau thème, mais les
// gardiens gardaient leur NOM et leurs DIALOGUES du run 1 (« Garde Ronce », le Bosquet…), et MapView dessinait encore
// leurs sprites du run 1 PAR-DESSUS les PNJ peints dans le fond de l'arène (visible à l'arène 2).
//   • Les PNJ du run 3 sont PEINTS dans l'image de chaque arène (arena_*_r3.png) aux cases run3X/run3Y → aucun sprite ni
//     portrait du run 1 ne doit se superposer (cf. `hideSprite` posé par activeNpcs, et DialogueBox).
//   • Les BOSS gardent le nom du CHAMPION dont l'équipe est figée (run3BossIntroLines) : rien ici pour eux, sauf le
//     masquage de leur sprite/portrait du run 1.
// Module PUR — testé dans run3ArenaNpcs.test.ts. Aucune allusion à l'effort réel (lu aussi par les joueurs fun).

export interface Run3ArenaNpc { name: string; intro: string[]; defeat: string[] }

export const RUN3_ARENA_NPCS: Record<string, Run3ArenaNpc> = {
    // ── ARÈNE 1 — GLACE (Auroruff, Marmoterre, Panthégel, Glaceer) ──
    y_arena_g1: {
        name: "GARDE GIVRE",
        intro: ["*Un souffle glacé traverse la salle.*", "Bienvenue dans l'ARÈNE DE GLACE, concurrent. Ici, chaque coup te coûte de l'énergie : vise juste !"],
        defeat: ["Brrr… tu as fait fondre ma garde. Les autres t'attendent."],
    },
    y_arena_g2: {
        name: "GARDE VERGLAS",
        intro: ["Attention où tu mets les pieds : ici le sol glisse, et les erreurs se paient en énergie.", "Montre-moi un concurrent qui ne tremble pas !"],
        defeat: ["Glissé, tombé… bien joué."],
    },
    y_arena_g3: {
        name: "GARDE BLIZZARD",
        intro: ["*Des cristaux de givre tourbillonnent autour de lui.*", "Mon Marmoterre encaisse tout. Et toi, combien de coups peux-tu te permettre ?"],
        defeat: ["Le blizzard se calme… Le champion t'attend sur l'estrade."],
    },
    y_arena_g4: {
        name: "GARDE BANQUISE",
        intro: ["Dernière garde avant l'estrade. Mon Glaceer ne laisse passer personne sans une morsure de froid.", "En garde !"],
        defeat: ["La banquise craque… Va affronter l'équipe du champion."],
    },
    // ── ARÈNE 2 — COMBAT (dojo : Couperin, Forgeotin, Trolystrik, Broussours, Brasicow) ──
    y_rocharena_g1: {
        name: "ÉLÈVE CROCHET",
        intro: ["*Il salue, poings serrés.*", "Ce dojo forme les gardiens de la Ligue. Première leçon : un coup inutile est une énergie perdue."],
        defeat: ["Belle garde. Monte d'un cran."],
    },
    y_rocharena_g2: {
        name: "ÉLÈVE UPPERCUT",
        intro: ["Mes poings parlent pour moi. Voyons si tes Daemons tiennent la distance !"],
        defeat: ["K.O. debout… respect."],
    },
    y_rocharena_g3: {
        name: "CEINTURE NOIRE",
        intro: ["*Elle noue sa ceinture sans te quitter des yeux.*", "La force brute ne suffit pas : il faut frapper là où ça fait mal, et une seule fois."],
        defeat: ["Technique impeccable. Le sensei t'observe."],
    },
    y_rocharena_g4: {
        name: "SENSEI KATA",
        intro: ["Dernier palier avant le champion. Mon Brasicow a brisé plus de boucliers que tu n'as livré de combats.", "Approche !"],
        defeat: ["Kata parfait… L'estrade est à toi."],
    },
    // ── ARÈNE 3 — POISON / SPECTRE (Lampignon, Corvenin, Hibouh, Rêvemante, Brook, Namicha) ──
    y_feuarena_g1: {
        name: "NOVICE BRUME",
        intro: ["*Une brume violette rampe sur le sol.*", "Tu entres dans l'ARÈNE SPECTRALE. Ici, ce qui ne se voit pas frappe quand même."],
        defeat: ["La brume se dissipe… pour l'instant."],
    },
    y_feuarena_g2: {
        name: "PRÊTRESSE VENIN",
        intro: ["Mes Daemons empoisonnent tout ce qu'ils touchent. Chaque tour de plus te coûtera cher.", "Finis vite, ou finis mal."],
        defeat: ["Le venin n'a pas pris. Continue."],
    },
    y_feuarena_g3: {
        name: "MÉDIUM LINCEUL",
        intro: ["*Des murmures montent des ombres.*", "Les esprits de cette arène ne craignent ni la force ni le courage. Seulement le bon type."],
        defeat: ["Les esprits se taisent. Avance."],
    },
    y_feuarena_g4: {
        name: "GARDIENNE MIASME",
        intro: ["Dernière gardienne. Au-delà de moi, l'équipe d'un champion dort dans l'ombre.", "Réveille-la si tu l'oses."],
        defeat: ["Le miasme se lève… Le champion t'attend."],
    },
    // ── ARÈNE 4 — DRAGON (Draclet, Wyverion, Carlembre, Dracarlin, Glacirex, Cryotyran) ──
    y_elecarena_g1: {
        name: "ÉCUYER ÉCAILLE",
        intro: ["*Un rugissement fait vibrer les murs.*", "Bienvenue dans l'ARÈNE DRAGON. Nos Daemons ne craignent que la glace, le dragon… et la fée."],
        defeat: ["Mon dragonnet s'incline. Les chevaliers t'attendent."],
    },
    y_elecarena_g2: {
        name: "DOMPTEUSE GRIFFE",
        intro: ["Mon Dracarlin a grandi dans la tempête. Tes attaques ordinaires glisseront sur ses écailles.", "Montre-moi mieux !"],
        defeat: ["Griffes rentrées… Passe."],
    },
    y_elecarena_g3: {
        name: "CHEVALIER WYVERNE",
        intro: ["*Il abaisse sa visière.*", "Un chevalier ne recule jamais. Mais un concurrent avisé choisit ses combats : celui-ci sera long."],
        defeat: ["Désarçonné… Honneur à toi."],
    },
    y_elecarena_g4: {
        name: "SENTINELLE DRACO",
        intro: ["Dernière sentinelle avant l'estrade. Mon Cryotyran gèle ce qu'il ne déchire pas.", "Prépare ton meilleur coup."],
        defeat: ["La sentinelle tombe. Le champion t'attend là-haut."],
    },
    // ── ARÈNE 5 — MULTI (Cendreville : formes finales de tous types) ──
    y_eauarena_g1: {
        name: "GARDE PRISME",
        intro: ["*La lumière se brise en mille couleurs sur son armure.*", "Dernière arène du concours : ici, tous les types se répondent. Aucune faiblesse ne te sauvera deux fois."],
        defeat: ["Une facette de moins. Continue."],
    },
    y_eauarena_g2: {
        name: "GARDE MOSAÏQUE",
        intro: ["Chaque Daemon de mon équipe est d'un type différent. Devine lequel sort en premier !"],
        defeat: ["Ma mosaïque se fissure…"],
    },
    y_eauarena_g3: {
        name: "GARDE KALÉIDO",
        intro: ["*Il fait tourner un kaléidoscope entre ses doigts.*", "Tu es arrivé loin, concurrent. Mais l'énergie qu'il te reste décidera de tout."],
        defeat: ["Tout tourne… et tu restes debout."],
    },
    y_eauarena_g4: {
        name: "SENTINELLE CHROMA",
        intro: ["Dernière sentinelle du concours. Après moi, l'équipe d'un champion, puis la Ligue.", "Que tes réserves te suffisent !"],
        defeat: ["Les couleurs s'éteignent. L'estrade est à toi."],
    },
}

/** Les 5 BOSS d'arène : en run 3 ce sont les équipes figées de champions (nom = le champion, cf. run3BossIntroLines). */
export const RUN3_ARENA_BOSS_IDS: readonly string[] = ["y_arena_druide", "y_rocharena_boss", "y_feuarena_boss", "y_elecarena_boss", "y_eauarena_boss"]

/** Gardien OU boss d'une arène : en run 3, son sprite et son portrait du run 1 ne doivent jamais apparaître. */
export function isRun3ArenaNpc(id: string): boolean { return id in RUN3_ARENA_NPCS || RUN3_ARENA_BOSS_IDS.includes(id) }
export function run3ArenaName(id: string): string | null { return RUN3_ARENA_NPCS[id]?.name ?? null }
export function run3ArenaIntro(id: string): string[] | null { const n = RUN3_ARENA_NPCS[id]; return n ? [...n.intro] : null }
export function run3ArenaDefeat(id: string): string[] | null { const n = RUN3_ARENA_NPCS[id]; return n ? [...n.defeat] : null }
