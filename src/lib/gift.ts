/**
 * gift.ts — Cadeau de reps à Milkardashian (cadeau de naissance).
 * Les autres joueurs peuvent offrir des reps à Milka entre le 12/06 et le 12/08 2026.
 * Ces reps comptent dans le volume/XP du donneur mais remplissent le quota de Milka
 * (capé à son quota du jour) pour lui éviter les amendes pendant son congé paternité.
 */

// Bénéficiaire du cadeau : Milkardashian
export const GIFT_RECIPIENT_ID = "cmml1yb61000fpto2bxd8i6fc";

// Fenêtre d'ouverture (incluse)
export const GIFT_START_ISO = "2026-06-12";
export const GIFT_END_ISO = "2026-08-12";

// INTERRUPTEUR MAÎTRE du cadeau de naissance. Mis à false le 29/07/2026 (cadeau terminé) →
// masque les 2 encarts (Saisie "offrir des reps" + Générosité). Repasser à true pour réactiver
// (ex. prochaine naissance), en ajustant GIFT_START_ISO/GIFT_END_ISO au besoin.
export const GIFT_ACTIVE = false;

/** true si une date YYYY-MM-DD est dans la fenêtre du cadeau (et le cadeau actif). */
export function isGiftDateAllowed(dateISO: string): boolean {
    return GIFT_ACTIVE && dateISO >= GIFT_START_ISO && dateISO <= GIFT_END_ISO;
}

/** true si le cadeau est actif aujourd'hui (pour afficher l'onglet). */
export function isGiftWindowOpen(todayISO: string): boolean {
    return isGiftDateAllowed(todayISO);
}
