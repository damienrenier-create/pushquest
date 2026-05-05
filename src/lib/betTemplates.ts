/**
 * betTemplates.ts — Usine à création de paris PushQuest
 * Génère automatiquement le metadata JSON (statsConfig) selon un template.
 * Usage : passer le résultat de generateBetData() dans le champ metadata du Bet.
 */

// ─── RÉFÉRENTIEL DES JOUEURS ─────────────────────────────────────────────────

export const PLAYERS = {
    xa:     { id: "cmml1xpeu001lk6aau4s8e70t", nickname: "Xa",           emoji: "🟢" },
    neuneu: { id: "cmml1wvc00006k6aaxjjfsfv0", nickname: "Neuneu",        emoji: "🔴" },
    mools:  { id: "cmml1r6um0000pto29d129npd", nickname: "Mools",         emoji: "🟡" },
    embi:   { id: "cmml4dogn00005n1setjnfikl", nickname: "Embi",          emoji: "🔵" },
    milka:  { id: "cmml1yb61000fpto2bxd8i6fc", nickname: "Milkardashian", emoji: "🐱" },
    gg:     { id: "cmopr0pw6000a5ubrn11oedxk", nickname: "Gg",            emoji: "🦎" },
    oracle: { id: "cmosfbguk0000ct1vqkjwf6sx", nickname: "Oracle",        emoji: "🔮" },
} as const;

export type PlayerKey = keyof typeof PLAYERS;

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type TemplateType =
    | "MULTIPLAYER_RACE"
    | "BINARY_YES_NO"
    | "DUEL_TWO_PLAYERS"
    | "COLLECTIVE_THRESHOLD";

export type StatType =
    | "torch_count_30d"
    | "completion_rate_30d"
    | "total_pushups_30d"
    | "total_pullups_30d"
    | "total_squats_30d"
    | "total_reps_30d"
    | "current_streak"
    | "current_xp";

export interface BetTemplateInput {
    templateType: TemplateType;
    statType: StatType;
    players: PlayerKey[];          // liste des clés joueurs impliqués
    note?: string;                 // note admin optionnelle
    resolveInstructions?: string;  // instructions de résolution
    // Pour COLLECTIVE_THRESHOLD uniquement :
    thresholdOptions?: Array<{ key: string; label: string }>; // ex: ["0", "1-2", "3-4", "5+"]
}

export interface GeneratedBetMetadata {
    note: string;
    resolveInstructions: string;
    statsConfig: Array<{
        key: string;
        label: string;
        statType: StatType;
        userId: string;
        isInverse?: boolean;
    }>;
}

export interface GeneratedBetData {
    type: "PRONOSTIC" | "DUEL";
    subType: "BINARY" | "MULTI" | "PLAYER_RACE";
    options: Array<{ key: string; label: string }>;
    metadata: string; // JSON stringifié
    targetUserId?: string; // pour DUEL uniquement
}

// ─── FACTORY FUNCTION ────────────────────────────────────────────────────────

/**
 * Génère toutes les données nécessaires à la création d'un Bet.
 * Retourne options[] et metadata JSON prêts à être passés à prisma.bet.create().
 *
 * Usage :
 *   const betData = generateBetData({
 *     templateType: "MULTIPLAYER_RACE",
 *     statType: "torch_count_30d",
 *     players: ["xa", "neuneu", "mools", "embi", "milka", "gg"],
 *     note: "Qui aura le plus de flambeaux ?"
 *   });
 *   await prisma.bet.create({ data: { ...betData, title: "...", closeAt: ..., createdByUserId: PLAYERS.oracle.id } });
 */
export function generateBetData(input: BetTemplateInput): GeneratedBetData {
    const { templateType, statType, players, note, resolveInstructions, thresholdOptions } = input;

    // Valider que tous les joueurs existent
    players.forEach(p => {
        if (!PLAYERS[p]) throw new Error(`Joueur inconnu : ${p}`);
    });

    switch (templateType) {

        case "MULTIPLAYER_RACE": {
            // Course entre N joueurs — chacun a sa propre option
            if (players.length < 2) throw new Error("MULTIPLAYER_RACE nécessite au moins 2 joueurs");

            const options = players.map(p => ({
                key: p,
                label: `${PLAYERS[p].nickname} ${PLAYERS[p].emoji}`
            }));

            const statsConfig = players.map(p => ({
                key: p,
                label: `${PLAYERS[p].nickname} ${PLAYERS[p].emoji}`,
                statType,
                userId: PLAYERS[p].id,
                isInverse: false
            }));

            return {
                type: "PRONOSTIC",
                subType: players.length === 2 ? "BINARY" : "MULTI",
                options,
                metadata: JSON.stringify({
                    note: note || `Course ${statType} entre ${players.map(p => PLAYERS[p].nickname).join(", ")}`,
                    resolveInstructions: resolveInstructions || `Comparer les stats ${statType} des joueurs à la clôture`,
                    statsConfig
                })
            };
        }

        case "BINARY_YES_NO": {
            // Pari binaire Oui/Non sur un seul joueur
            if (players.length !== 1) throw new Error("BINARY_YES_NO nécessite exactement 1 joueur");
            const player = players[0];

            const options = [
                { key: "oui", label: "Oui 💪" },
                { key: "non", label: "Non 😬" }
            ];

            const statsConfig = [
                { key: "oui", label: "Oui 💪", statType, userId: PLAYERS[player].id, isInverse: false },
                { key: "non", label: "Non 😬", statType, userId: PLAYERS[player].id, isInverse: true }
            ];

            return {
                type: "PRONOSTIC",
                subType: "BINARY",
                options,
                metadata: JSON.stringify({
                    note: note || `Pari binaire sur ${PLAYERS[player].nickname} — stat : ${statType}`,
                    resolveInstructions: resolveInstructions || `Vérifier la stat ${statType} de ${PLAYERS[player].nickname} à la clôture`,
                    statsConfig
                })
            };
        }

        case "DUEL_TWO_PLAYERS": {
            // Duel direct entre exactement 2 joueurs
            if (players.length !== 2) throw new Error("DUEL_TWO_PLAYERS nécessite exactement 2 joueurs");
            const [p1, p2] = players;

            const options = [
                { key: p1, label: `${PLAYERS[p1].nickname} ${PLAYERS[p1].emoji}` },
                { key: p2, label: `${PLAYERS[p2].nickname} ${PLAYERS[p2].emoji}` }
            ];

            const statsConfig = [
                { key: p1, label: `${PLAYERS[p1].nickname} ${PLAYERS[p1].emoji}`, statType, userId: PLAYERS[p1].id, isInverse: false },
                { key: p2, label: `${PLAYERS[p2].nickname} ${PLAYERS[p2].emoji}`, statType, userId: PLAYERS[p2].id, isInverse: false }
            ];

            return {
                type: "DUEL",
                subType: "BINARY",
                options,
                targetUserId: PLAYERS[p2].id,
                metadata: JSON.stringify({
                    note: note || `Duel ${PLAYERS[p1].nickname} vs ${PLAYERS[p2].nickname} — stat : ${statType}`,
                    resolveInstructions: resolveInstructions || `Comparer ${statType} de ${PLAYERS[p1].nickname} et ${PLAYERS[p2].nickname} à la clôture`,
                    statsConfig
                })
            };
        }

        case "COLLECTIVE_THRESHOLD": {
            // Combien de joueurs atteignent un seuil ?
            if (!thresholdOptions || thresholdOptions.length < 2) {
                throw new Error("COLLECTIVE_THRESHOLD nécessite thresholdOptions avec au moins 2 options");
            }

            // Pas de statsConfig pour ce type — résolution manuelle
            return {
                type: "PRONOSTIC",
                subType: "MULTI",
                options: thresholdOptions,
                metadata: JSON.stringify({
                    note: note || `Seuil collectif — stat : ${statType} pour ${players.map(p => PLAYERS[p].nickname).join(", ")}`,
                    resolveInstructions: resolveInstructions || `Compter combien de joueurs ont atteint le seuil sur ${statType}`,
                    statsConfig: [] // résolution manuelle
                })
            };
        }

        default:
            throw new Error(`Template inconnu : ${templateType}`);
    }
}

// ─── EXEMPLES D'UTILISATION ──────────────────────────────────────────────────
// Ces exemples servent de documentation — ne pas exécuter directement

/*
// 1. Course au flambeau entre tous les joueurs
const flambeauRace = generateBetData({
    templateType: "MULTIPLAYER_RACE",
    statType: "torch_count_30d",
    players: ["xa", "neuneu", "mools", "embi", "milka", "gg"],
    note: "Qui aura le plus de flambeaux ce mois ?",
    resolveInstructions: "Comparer le nb de flambeaux sur les 30 derniers jours à la clôture"
});

// 2. Pari binaire sur Gg
const ggRegularite = generateBetData({
    templateType: "BINARY_YES_NO",
    statType: "completion_rate_30d",
    players: ["gg"],
    note: "Gg tiendra-t-il cette semaine ?",
    resolveInstructions: "Vérifier si Gg a validé son quota chaque jour"
});

// 3. Duel Xa vs Neuneu en pompes
const duelXaNeuneu = generateBetData({
    templateType: "DUEL_TWO_PLAYERS",
    statType: "total_pushups_30d",
    players: ["xa", "neuneu"],
    note: "Duel inaugural Xa vs Neuneu"
});

// 4. Carnage collectif
const carnage = generateBetData({
    templateType: "COLLECTIVE_THRESHOLD",
    statType: "completion_rate_30d",
    players: ["xa", "neuneu", "mools", "embi", "milka", "gg"],
    note: "Combien valideront 100% cette semaine ?",
    thresholdOptions: [
        { key: "zero",      label: "0 joueur 😭" },
        { key: "un_deux",   label: "1-2 joueurs 😅" },
        { key: "trois_quatre", label: "3-4 joueurs 💪" },
        { key: "cinq_plus", label: "5+ joueurs 🔥" }
    ]
});

// Usage avec Prisma :
await prisma.bet.create({
    data: {
        ...flambeauRace,           // type, subType, options (JSON), metadata (JSON)
        options: JSON.stringify(flambeauRace.options),
        title: "Qui aura le plus de flambeaux ce mois ?",
        closeAt: new Date("2026-05-31T21:00:00.000Z"),
        lockAt: new Date("2026-05-31T20:00:00.000Z"),
        createdByUserId: PLAYERS.oracle.id,
        status: "DRAFT"
    }
});
*/
