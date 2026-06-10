// Nexus II "jaune éclair" — accès au Chapitre 2.
//
// CHAPITRE 1 RETIRÉ (juin 2026) : le Nexus II est désormais OUVERT À TOUS les joueurs
// connectés. Plus de condition d'évolution / de Daemon éveillé : tout le monde est aspiré
// directement dans le Chapitre 2 (cf. /gamebook/page.tsx qui redirige vers /gamebook/yellow).
// On garde la fonction (utilisée par la page yellow + d'éventuelles routes) mais elle
// renvoie simplement "vrai dès qu'on est connecté".

export async function isNexusYellowEnabled(userId: string | null | undefined): Promise<boolean> {
    return !!userId
}

export const YELLOW_CHAPTER_ID = "yellow"
export const YELLOW_ENTRANCE_MAP_ID = "yellow_entrance"
