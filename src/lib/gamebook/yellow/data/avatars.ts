// src/lib/gamebook/yellow/data/avatars.ts
//
// FASHION VICTIM — PNJ excentrique de la Grotte du Nexus (1F) qui propose au joueur de CHANGER D'AVATAR.
// L'avatar choisi est PARTAGÉ (rendu local + présence temps réel → les autres joueurs qui te croisent le voient),
// réutilisant l'infra `PLAYER_GEN3_SPRITE` existante. Planches Gen3 760×160 (comme les PNJ/potes).

/** Les 8 avatars sélectionnables par le joueur (planches Gen3, fournies par Sartay). */
export const FASHION_AVATARS: string[] = Array.from({ length: 8 }, (_, i) => `/yellow/sprites/avatar_${i + 1}_gen3.png`)

/** Les 6 « looks » que le PNJ Fashion Victim arbore lui-même (tirés au hasard à chaque pop). */
export const FASHION_VICTIM_SPRITES: string[] = Array.from({ length: 6 }, (_, i) => `/yellow/sprites/fashionvictim_${i + 1}_gen3.png`)

/** Un chemin d'avatar est-il l'un des 8 avatars VALIDES ? Garde-fou : la présence est éphémère/non-fiable
 *  (payload d'un autre client) → on ne rend jamais un chemin arbitraire, seulement un avatar connu. */
export function isValidAvatar(p?: string | null): p is string {
    return typeof p === "string" && FASHION_AVATARS.includes(p)
}

export const FASHION_VICTIM_NPC_ID = "y_fashion_victim"
export const FASHION_VICTIM_MAP = "yellow_grotte_nexus"

/** Pseudos (en minuscule) autorisés à voir le PNJ « pour le moment » (Mools). Extensible → ouvrir à tous plus tard. */
export const FASHION_VICTIM_WHITELIST = new Set(["mools"])
export function fashionVictimVisibleFor(nickname: string): boolean {
    return FASHION_VICTIM_WHITELIST.has((nickname ?? "").normalize("NFC").trim().toLowerCase())
}

/** Spots walkable de la Grotte 1F (près de l'entrée 18,39). ⚠️ à vérifier en jeu (placement approximatif). */
export const FASHION_SPOTS: ReadonlyArray<readonly [number, number]> = [
    [18, 38], [18, 37], [17, 39], [19, 39], [18, 36], [17, 38],
]

export const FASHION_VICTIM_LINES = [
    "*Un personnage excentrique t'accoste — il change de tenue à chaque clignement d'œil.*",
    "« Oh là là, CHÉRI… ce look ! Enfin… ce NON-look. On ne peut PAS te laisser te balader comme ça. »",
    "« Laisse la Fashion Victim s'occuper de toi : un nouveau look, un VRAI. Et crois-moi — TOUT LE MONDE le verra. »",
]

/** Réplique-cadeau : jouée UNE fois, quand la Fashion Victim vient de te relooker (elle t'offre la canne à pêche). */
export const FASHION_ROD_GIFT_LINES = [
    "« Haha wouaw, trop SLAY ton outfit ! On dirait un cheur-pé, hahah ! »",
    "« Tiens, un p'tit accessoire pour aller avec… une CANNE À PÊCHE ! »",
    "*Tu reçois la Canne à pêche ! (Sac → 🎣 Pêche. À utiliser face à un plan d'eau !)*",
]
