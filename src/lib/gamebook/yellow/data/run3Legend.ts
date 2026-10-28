// src/lib/gamebook/yellow/data/run3Legend.ts
//
// FLAMAROKTO — le légendaire du RUN 3 (Glace/Feu, plaine des Hautes Herbes, zénith 11h-15h après la confidence du gamin).
// Décisions Sartay du 26/10/2026 : « quasi inattrapable vu le nombre de Balls nécessaires » →
//   • CAPTURE GARANTIE à l'Hyper Nexus-Ball (ou mieux) dès qu'il est SOUS 60 % de ses PV OU sous un statut majeur ;
//   • le GAMIN de la plaine (celui qui révèle le légendaire du run) annonce cette règle ;
//   • une fois sa confidence entendue, le taux de pop est multiplié (×2 aux runs 1 et 2), « tellement le run 3 est
//     hardcore » : ×5 au départ, ramené à ×2,5 le 28/10/2026 (« 1/20 c'est un peu trop fréquent… 1/40 ça serait mieux ») →
//     au meilleur endroit (ligne la plus basse des carrés du bas), 1 rencontre sur 40.
// Module PUR, sans import — lu par le moteur de capture (engine), les rencontres (encounters) et le guide du Daemomaniaque.

export const FLAMAROKTO_ID = "flamarokto"
/** Sous cette fraction de PV, l'Hyper Nexus-Ball le capture à coup sûr. */
export const FLAMAROKTO_GUARANTEE_HP_FRAC = 0.6
/** Bonus de Ball minimal pour la garantie : 4 = Hyper Nexus-Ball (Hyper +, Super Méga… font mieux). */
export const FLAMAROKTO_GUARANTEE_MIN_BALL_BONUS = 4
/** Multiplicateur du DÉNOMINATEUR de pop du légendaire du run 3 après la confidence du gamin (0,4 = chances ×2,5). */
export const RUN3_LEGEND_HINT_DENOM_MULT = 0.4

export function flamaroktoGuaranteed(speciesId: string, ballBonus: number, hpFrac: number, status: string): boolean {
    if (speciesId !== FLAMAROKTO_ID) return false
    if (ballBonus < FLAMAROKTO_GUARANTEE_MIN_BALL_BONUS) return false
    return hpFrac < FLAMAROKTO_GUARANTEE_HP_FRAC || status !== "NONE"
}

/** Ligne du guide de capture (Daemomaniaque) : remplace les verrous génériques « statut requis / Ball puissante ». */
export const FLAMAROKTO_GUIDE_LINE = "Légendaire du concours : sous 60 % de ses PV OU sous un statut, une HYPER Nexus-Ball le capture À COUP SÛR (le gamin de la plaine le confie à midi — et ses pops sont alors ×2,5)."
