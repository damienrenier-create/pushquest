// src/lib/gamebook/yellow/data/sylvebarbeBlock.ts
//
// SYLVEBARBE ENDORMI — bloque la sortie SUD de Ville Jaune (cols 22-25, rows 38-39) tant qu'il dort.
// Réveil par la DAEMONFLÛTE : remise par le scientifique du labo au sacre (Champion), puis utilisée sur
// Sylvebarbe (combat unique → markSylvebarbeAwake quand on le bat ou le capture) → la voie sud s'ouvre.

export const SYLVEBARBE_BLOCK_MAP = "yellow_entrance"
// COLLISION : seule la RANGÉE 39 (les cases de sortie vers la Zone de Combat) est murée tant que Sylvebarbe garde
//   la route. La rangée 38 (le HAUT du sprite = « empreinte ») reste MARCHABLE → on peut s'approcher du colosse
//   endormi, et une fois battu la case (23,38) est libre PAR CONSTRUCTION (plus aucun rectangle ni PNJ ne la touche).
export const SYLVEBARBE_BLOCK = { x0: 22, x1: 25, y0: 39, y1: 39 } as const
// VISUEL SEUL : le sprite du colosse endormi couvre 2 rangées (38-39), indépendamment de la collision ci-dessus.
export const SYLVEBARBE_SPRITE_RECT = { x0: 22, x1: 25, y0: 38, y1: 39 } as const
export const SYLVEBARBE_SLEEP_SPRITE = "/yellow/sprites/sylvebarbe_endormi.png"

/** Une case (x,y) est-elle dans le rectangle bloqué par le Sylvebarbe endormi ? */
export function inSylvebarbeBlock(x: number, y: number): boolean {
    return x >= SYLVEBARBE_BLOCK.x0 && x <= SYLVEBARBE_BLOCK.x1 && y >= SYLVEBARBE_BLOCK.y0 && y <= SYLVEBARBE_BLOCK.y1
}

// ── GATE DE RUN — le SUD (Zone de Combat → Grotte du Nexus → Ligue de Fusion) est le POST-GAME, ouvert aux
//    CHAMPIONS. En quête principale (monde LIVE) c'est Sylvebarbe qui garde la porte. En NG+ (run 2), concours
//    (run 3) ou rejeu, il faut d'abord RE-TERMINER cette run (battre sa Ligue = devenir champion de CE monde) :
//    tant que ce n'est pas fait, le Dieu Spaghetti barre le passage — MÊME si un flag Sylvebarbe traînait d'un
//    autre monde (garde-fou anti-fuite). Une fois champion de la run, on passe (puis la logique Sylvebarbe reprend). ──
export const SUD_GATE_NPC = "spaghetti_sud_gate"
export const SUD_GATE_NPC_NAME = "DIEU SPAGHETTI"
export const SUD_GATE_WRONG_RUN_LINES = [
    "*Une volute de sauce tomate jaillit du sol et prend la forme du DIEU SPAGHETTI.*",
    "🍝 « Halte-là ! La ZONE DE COMBAT et la LIGUE DE FUSION ne s'ouvrent qu'aux CHAMPIONS de CETTE aventure. »",
    "« Tu as recommencé une nouvelle quête ici — termine-la d'abord : bats la LIGUE de cette run. »",
    "« Reviens me voir une fois sacré, et le Sud de la Ville Jaune s'ouvrira. »",
]

/** Le passage SUD (endgame) est-il barré par le gate de RUN ? → vrai si, HORS de la quête principale (monde ≠ "live"),
 *  on n'est PAS encore champion de cette run et qu'on tente d'entrer dans le rectangle sud. En LIVE, ou une fois
 *  champion de la run en cours, ce gate ne s'applique pas (la logique Sylvebarbe/Daemonflûte prend le relais). */
export function sudGateBlockedByRun(activeWorld: string, isChampion: boolean, x: number, y: number): boolean {
    return activeWorld !== "live" && !isChampion && inSylvebarbeBlock(x, y)
}
