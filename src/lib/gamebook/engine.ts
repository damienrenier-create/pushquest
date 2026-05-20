// src/lib/gamebook/engine.ts
//
// Moteur du Gamebook PushQuest. Fonctions pures, pas d'I/O.
// Utilisé côté serveur (API routes) et côté client (composants React).

export type Mood = "AMUSE" | "SARCASTIQUE" | "FIER" | "IMPATIENT" | "NEUTRE"
export type ChoiceTag = "bold" | "clever" | "wrong" | "safe" | "neutral"

export type MbtiScores = {
    E?: number
    I?: number
    S?: number
    N?: number
    T?: number
    F?: number
    J?: number
    P?: number
}

export type Temperaments = {
    courage?: number
    compassion?: number
    malice?: number
}

export type Flags = {
    addAllies?: string[]
    addRivals?: string[]
    discovered?: string[]
    knowsClans?: boolean
    brodoSpecialBond?: boolean
    [key: string]: unknown
}

export type GamebookProgressState = {
    chapterId: string
    currentNodeId: string
    mood: Mood
    mbtiScores: MbtiScores
    temperaments: Temperaments
    flags: Flags
    history: Array<{ nodeId: string; choiceId: string; at: string }>
    isCompleted: boolean
}

export type Choice = {
    id: string
    text: string
    tag: ChoiceTag
    mbti: MbtiScores
    temperaments: Temperaments
    monsterComment: string | null
    nextNodeId: string
}

export type ChapterNode = {
    kind: "genese" | "scene_porte" | "tampon" | "scene_porte_placeholder" | string
    body: string
    axis?: string
    flags?: Flags
    choices: Choice[]
}

export type Chapter = {
    chapterId: string
    title: string
    version: number
    entryNodeId: string
    description?: string
    nodes: Record<string, ChapterNode>
}

export type MonsterPhrases = Record<Mood, { intros: string[]; outros: string[] }>

// ---------------------------------------------------------------------------
// Mapping tag -> mood : voir conversation, validé avec l'utilisateur.
// ---------------------------------------------------------------------------
export function moodFromTag(tag: ChoiceTag): Mood {
    switch (tag) {
        case "bold":
            return "AMUSE"
        case "clever":
            return "FIER"
        case "wrong":
            return "SARCASTIQUE"
        case "safe":
            return "IMPATIENT"
        case "neutral":
        default:
            return "NEUTRE"
    }
}

// ---------------------------------------------------------------------------
// Génère l'état initial pour un chapitre donné.
// ---------------------------------------------------------------------------
export function initialState(chapter: Chapter): GamebookProgressState {
    return {
        chapterId: chapter.chapterId,
        currentNodeId: chapter.entryNodeId,
        mood: "NEUTRE",
        mbtiScores: {},
        temperaments: {},
        flags: {},
        history: [],
        isCompleted: false,
    }
}

// ---------------------------------------------------------------------------
// Applique un choix à l'état et retourne le nouvel état.
// Fonction pure : ne mute pas l'argument.
// ---------------------------------------------------------------------------
export function applyChoice(
    state: GamebookProgressState,
    currentNode: ChapterNode,
    choice: Choice,
    nextNode: ChapterNode | undefined
): GamebookProgressState {
    // Cumul MBTI
    const mbti: MbtiScores = { ...state.mbtiScores }
    for (const [k, v] of Object.entries(choice.mbti ?? {})) {
        const key = k as keyof MbtiScores
        mbti[key] = (mbti[key] ?? 0) + (v as number)
    }

    // Cumul tempéraments
    const temperaments: Temperaments = { ...state.temperaments }
    for (const [k, v] of Object.entries(choice.temperaments ?? {})) {
        const key = k as keyof Temperaments
        temperaments[key] = (temperaments[key] ?? 0) + (v as number)
    }

    // Fusion des flags (next node peut apporter ses propres flags)
    const flags: Flags = { ...state.flags }
    const incomingFlags = nextNode?.flags
    if (incomingFlags) {
        for (const [k, v] of Object.entries(incomingFlags)) {
            if (Array.isArray(v) && Array.isArray(flags[k])) {
                const existing = flags[k] as unknown[]
                flags[k] = Array.from(new Set([...existing, ...v]))
            } else {
                flags[k] = v
            }
        }
    }

    // Historique
    const history = [
        ...state.history,
        { nodeId: state.currentNodeId, choiceId: choice.id, at: new Date().toISOString() },
    ].slice(-100) // cap à 100 entrées pour ne pas exploser le JSONB

    // Humeur prochaine
    const mood = moodFromTag(choice.tag)

    return {
        ...state,
        currentNodeId: choice.nextNodeId,
        mood,
        mbtiScores: mbti,
        temperaments,
        flags,
        history,
        isCompleted: state.isCompleted,
    }
}

// ---------------------------------------------------------------------------
// Pioche une phrase d'intro ou d'outro selon l'humeur, déterministe par seed.
// On utilise une seed simple basée sur userId + nodeId pour qu'un même joueur
// au même nœud voie la même phrase (évite le clignotement).
// ---------------------------------------------------------------------------
export function pickPhrase(
    phrases: MonsterPhrases,
    mood: Mood,
    kind: "intros" | "outros",
    seed: string
): string {
    const pool = phrases[mood]?.[kind] ?? []
    if (pool.length === 0) return ""
    // Hash simple, déterministe
    let h = 0
    for (let i = 0; i < seed.length; i++) {
        h = (h * 31 + seed.charCodeAt(i)) | 0
    }
    const idx = Math.abs(h) % pool.length
    return pool[idx]
}

// ---------------------------------------------------------------------------
// Remplace les variables {nickname}, {rival}, etc. dans une chaîne.
// Si la variable n'est pas fournie, on remplace par un placeholder discret.
// ---------------------------------------------------------------------------
export type RenderContext = {
    nickname?: string
    rival?: string
    lastScore?: number | string
    lastExercise?: string
    streak?: number | string
    daysSinceLastWod?: number | string
    currentHour?: number | string
}

export function renderText(text: string, ctx: RenderContext): string {
    const safe = (v: unknown, fallback: string) =>
        v === undefined || v === null || v === "" ? fallback : String(v)
    return text
        .replaceAll("{nickname}", safe(ctx.nickname, "Aventurier"))
        .replaceAll("{rival}", safe(ctx.rival, "ton rival"))
        .replaceAll("{lastScore}", safe(ctx.lastScore, "—"))
        .replaceAll("{lastExercise}", safe(ctx.lastExercise, "ton dernier effort"))
        .replaceAll("{streak}", safe(ctx.streak, "0"))
        .replaceAll("{daysSinceLastWod}", safe(ctx.daysSinceLastWod, "quelques"))
        .replaceAll("{currentHour}", safe(ctx.currentHour, String(new Date().getHours())))
}
