
/**
 * Regroupe les événements d'activité identiques (même joueur, même badge, même type)
 * survenant dans une fenêtre de temps réduite (5 minutes).
 * Permet de réduire le spam visuel sans supprimer de données en base.
 */
export function groupRecentEvents(events: any[]) {
    if (!events || events.length === 0) return [];

    const grouped: any[] = [];

    events.forEach((event) => {
        if (grouped.length === 0) {
            grouped.push({ ...event, displayCount: 1 });
            return;
        }

        const last = grouped[grouped.length - 1];

        // Critères de regroupement :
        // 1. Même utilisateur bénéficiaire
        // 2. Même badge (si applicable)
        // 3. Même type d'événement (STEAL, CLAIM, LEVEL_UP, etc.)
        // 4. Proximité temporelle (< 5 minutes)
        
        const isSameUser = last.toUserId === event.toUserId;
        const isSameBadge = (last.badgeKey && event.badgeKey) ? (last.badgeKey === event.badgeKey) : (last.badge?.key === event.badge?.key);
        const isSameType = last.eventType === event.eventType;
        
        const lastDate = new Date(last.createdAt).getTime();
        const eventDate = new Date(event.createdAt).getTime();
        const isCloseTime = Math.abs(lastDate - eventDate) < 5 * 60 * 1000;

        if (isSameUser && isSameType && isCloseTime && (isSameBadge || (last.eventType === 'LEVEL_UP'))) {
            // On incrémente le compteur du groupe existant
            last.displayCount = (last.displayCount || 1) + 1;
            // On garde la valeur la plus récente (si les events sont triés par date DESC, c'est 'last')
            // On pourrait aussi vouloir mettre à jour last.createdAt si on veut le temps du dernier event du groupe
        } else {
            grouped.push({ ...event, displayCount: 1 });
        }
    });

    return grouped;
}
