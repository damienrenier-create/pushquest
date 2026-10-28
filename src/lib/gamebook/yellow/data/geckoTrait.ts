// src/lib/gamebook/yellow/data/geckoTrait.ts
//
// 🦎 CARAPACE FOSSILE — trait des 5 GÉCKOS (Gékroc, Gékraise, Gékosmic, Géckèbre, Geaucké). Sartay, 28/10/2026 : « les
// géckos sont trop faibles : à l'état sauvage, ne pas se faire one-shoter mais survivre si l'attaque est un one hit KO ;
// une fois capturés, 10 % du temps ». Depuis PV PLEINS, un coup qui devrait les mettre K.O. les laisse à 1 PV : TOUJOURS
// à l'état sauvage (camp adverse d'un combat sauvage), 1 fois sur 10 sinon (Daemon du joueur, dresseur, PvP).
// Porté par l'ESPÈCE → vaut pour les géckos déjà capturés comme pour ceux à venir, sans toucher aux saves. Ce n'est pas un
// talent du créateur (TALENTS) : il ne doit jamais pouvoir être tiré pour une création. Module PUR, sans import.

export const GECKO_SPECIES_IDS: readonly string[] = ["gekroc", "gekraise", "gekosmic", "geckebre", "geaucke"]
/** % de survie à 1 PV d'un gécko SAUVAGE frappé à PV pleins par un coup fatal. */
export const GECKO_SURVIVE_WILD_PCT = 100
/** % de survie à 1 PV d'un gécko CAPTURÉ (ou chez un dresseur, ou en PvP). */
export const GECKO_SURVIVE_OWNED_PCT = 10

export function isGecko(speciesId: string | undefined): boolean {
    return !!speciesId && GECKO_SPECIES_IDS.includes(speciesId)
}
/** % de survie du trait (0 hors géckos) ; `wild` = le gécko est le camp adverse d'un combat sauvage. */
export function geckoSurvivePct(speciesId: string | undefined, wild: boolean): number {
    if (!isGecko(speciesId)) return 0
    return wild ? GECKO_SURVIVE_WILD_PCT : GECKO_SURVIVE_OWNED_PCT
}
