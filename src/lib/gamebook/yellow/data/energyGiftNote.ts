// 🍝 LE PETIT MOT DU DIEU SPAGHETTI — le texte qui accompagne un don d'énergie du créateur.
//
// Le mot vit dans FrontierProfile.energyGrantNote, à côté du montant (energyGrantPending) : HORS de la save, donc
// un autosave client ne peut pas l'effacer. Le serveur le sert dans le ctx au chargement, le client l'affiche, puis
// le consomme par COMPARE-AND-SWAP sur le texte EXACT (jamais sur une version retravaillée) → on n'efface jamais un
// mot plus RÉCENT posé entre-temps, et deux onglets ne peuvent pas se marcher dessus.
//
// Ce module ne contient que la logique PURE : découpage en répliques, et la décision « puis-je parler maintenant ? ».

/** Le PNJ qui porte le mot : même sprite et même voix que le drip des hauts faits. */
export const GIFT_NOTE_NPC = "y_dome_spaghetti"
export const GIFT_NOTE_NAME = "DIEU SPAGHETTI"
/** Garde-fou d'affichage : au-delà, la boîte de dialogue devient un mur de texte. */
export const GIFT_NOTE_MAX_LINES = 8

/** Découpe le mot en répliques (une par ligne), en jetant les lignes vides. Tolère null/undefined/non-chaîne. */
export function giftNoteLines(note: unknown): string[] {
    if (typeof note !== "string") return []
    return note
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .slice(0, GIFT_NOTE_MAX_LINES)
}

/** Où placer le mot, sachant que showDialogue ÉCRASE la réplique en cours :
 *  - `show`   : personne ne parle → on affiche le mot seul ;
 *  - `append` : le Dieu Spaghetti parle déjà (drip des hauts faits) → même personnage, on AJOUTE à sa réplique ;
 *  - `defer`  : un AUTRE PNJ parle (le génie, le parrainage) → on refuse de lui couper la parole. Le mot n'est alors
 *               PAS consommé côté serveur : il revient au prochain chargement. Un cadeau ne se perd pas. */
export function giftNotePlacement(currentNpcId: string | null | undefined): "show" | "append" | "defer" {
    if (!currentNpcId) return "show"
    return currentNpcId === GIFT_NOTE_NPC ? "append" : "defer"
}
