// src/lib/gamebook/yellow/data/sylvebarbeBlock.ts
//
// SYLVEBARBE ENDORMI — bloque la sortie SUD de Ville Jaune (cols 22-25, rows 38-39) tant qu'il dort.
// Réveil par la DAEMONFLÛTE : remise par le scientifique du labo au sacre (Champion), puis utilisée sur
// Sylvebarbe (combat unique → markSylvebarbeAwake quand on le bat ou le capture) → la voie sud s'ouvre.

export const SYLVEBARBE_BLOCK_MAP = "yellow_entrance"
export const SYLVEBARBE_BLOCK = { x0: 22, x1: 25, y0: 38, y1: 39 } as const
export const SYLVEBARBE_SLEEP_SPRITE = "/yellow/sprites/sylvebarbe_endormi.png"

/** Une case (x,y) est-elle dans le rectangle bloqué par le Sylvebarbe endormi ? */
export function inSylvebarbeBlock(x: number, y: number): boolean {
    return x >= SYLVEBARBE_BLOCK.x0 && x <= SYLVEBARBE_BLOCK.x1 && y >= SYLVEBARBE_BLOCK.y0 && y <= SYLVEBARBE_BLOCK.y1
}
