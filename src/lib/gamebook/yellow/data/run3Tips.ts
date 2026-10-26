// src/lib/gamebook/yellow/data/run3Tips.ts
//
// RUN 3 (concours) — RAPPELS DES RÈGLES par le Dieu Spaghetti, et l'offre de NOUVEAU DÉPART.
// Signalement Sartay du 26/10/2026 : Kingme (et d'autres avant lui) n'avait pas compris que sa réserve remonterait à 500 ⚡
// après la 1re arène — il a épuisé son énergie sur les sauvages (63 ⚡ restants, aucun badge : arène 1 injouable, la
// simulation avec le moteur du jeu demande 556 à 1328 ⚡). D'où :
//   • un rappel à la 1re CAPTURE sauvage du concours (marqueur per-monde, une fois) ;
//   • un rappel à la 1re ENTRÉE en BOUTIQUE du concours (marqueur per-monde, une fois) ;
//   • pour les joueurs listés (décision Sartay : Kingme), une offre de RECOMMENCER le run 3 tant qu'il est perdu d'avance
//     (aucun badge, réserve sous le seuil). Nouveau starter, 500 ⚡, Pokédex conservé.
// Aucune allusion à l'effort réel : ces textes sont lus aussi par les joueurs fun (énergie ⚡ uniquement).

export const RUN3_TIP_CAPTURE_MARKER = "run3_tip_capture"
export const RUN3_TIP_SHOP_MARKER = "run3_tip_shop"

export const RUN3_TIP_CAPTURE_LINES: readonly string[] = [
    "*Le Dieu Spaghetti surgit dans un nuage de semoule.* « Première capture du concours ! Un mot avant que tu ne files… »",
    "« Ta réserve d'énergie est TOUT ce que tu possèdes ici. Chaque attaque en brûle une part, contre un sauvage comme contre un gardien. Rien ne la remplit… sauf les arènes. »",
    "« Bats la 1re arène et ta réserve REMONTE à 500 ⚡ (puis 600, 700, 800, 900 et 1000 pour les suivantes). Mais si tu tombes à ZÉRO avant, le concours s'arrête net. »",
    "« Alors ne t'épuise pas dans les hautes herbes : garde tes forces pour le GYM de la Ville Jaune. 🍝 »",
]

export const RUN3_TIP_SHOP_LINES: readonly string[] = [
    "*Le Dieu Spaghetti se matérialise entre deux rayons.* « Bienvenue dans la boutique du concours, concurrent ! »",
    "« Ici, pas d'énergie à vendre : chaque Ball, chaque potion se paie avec TA réserve — la même qui sert à attaquer. »",
    "« Dépense avec discernement : la 1re arène te RECHARGE à 500 ⚡, mais seulement si tu l'emportes avant de tomber à zéro. À 0, le concours s'arrête. »",
    "« Mon conseil : quelques Balls, rien de superflu, et droit au GYM. 🍝 »",
]

// ── NOUVEAU DÉPART (offre ciblée) ─────────────────────────────────────────────────────────────────────────────────
/** Pseudos (minuscules) à qui le Dieu Spaghetti propose de recommencer le run 3 — décision Sartay du 26/10/2026. */
export const RUN3_RESTART_OFFER_NICKS: ReadonlySet<string> = new Set(["kingme"])
/** L'offre n'apparaît que si le concours est perdu d'avance : AUCUN badge et une réserve au plus égale à ce seuil. */
export const RUN3_RESTART_MAX_ENERGY = 150

export function run3RestartOfferAllowed(nickname: string, activeWorld: string, badges: readonly string[], reps: number): boolean {
    return activeWorld === "run3" && RUN3_RESTART_OFFER_NICKS.has(nickname.trim().toLowerCase()) && badges.length === 0 && reps <= RUN3_RESTART_MAX_ENERGY
}

export function run3RestartOfferLines(energy: number): string[] {
    return [
        `« Concurrent… j'ai regardé tes réserves : ${energy} ⚡, aucun badge, et une équipe encore tendre. Même en jouant parfaitement, la 1re arène te coûterait plusieurs centaines d'énergies. Ce concours-ci est perdu d'avance. »`,
        "« Je te propose une FAVEUR rare : tout recommencer. Nouveau starter, 500 ⚡ pleines, et les règles bien en tête cette fois. »",
        "« Ton Pokédex reste acquis. Ton équipe et tes captures de CE concours, elles, s'effacent. À toi de voir. »",
    ]
}
