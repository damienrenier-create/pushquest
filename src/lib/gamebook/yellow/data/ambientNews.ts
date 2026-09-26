// 📰 LES ACTUALITÉS DU NEXUS — la vie du groupe, entretenue à la connexion.
//
// À chaque connexion, le Nexus peut annoncer au joueur qu'un de ses potes vient d'accomplir quelque chose, et lui
// verser la part d'énergie que cet exploit lui rapporte. L'exploit n'a pas eu lieu à CET instant : le joueur cité
// l'a réellement accompli AVANT (on ne tire que parmi ceux qui l'ont fait pour de vrai), c'est la date qui est
// romancée. Deux cadences, décidées par Sartay :
//   • SACRE DE LA LIGUE  → au plus 1 fois par SEMAINE  (récompense : +⅓ du plafond du receveur, cf. hall-of-fame/energy)
//   • REFLET BATTU       → au plus 1 fois par JOUR     (récompense : 30⚡ + coup de pouce + 1 Super Nexus-Ball)
//
// Rien n'est inventé côté récompense : on insère une vraie ligne dans les registres de cadeaux existants
// (LeagueEnergyGrant / DuelGift), et ce sont les chemins de réclamation HABITUELS qui créditent et annoncent.
// Aucun sacre, aucun haut fait, aucun score n'est écrit : ces deux tables ne servent qu'à offrir de l'énergie.
//
// Ici : uniquement le PUR (clés de période, tirage). Les accès base vivent dans server/ambientNews.

/** Énergie d'une consolation de reflet. Source de vérité, importée aussi par la route duel-gift. */
export const MIRROR_GIFT_ENERGY = 30

/** Clé de JOUR (Europe/Paris est déjà géré par l'appelant via getTodayISO). */
export type PeriodKey = string

/** Clé de SEMAINE ISO 8601 — « 2026-W39 ». La semaine commence le lundi, et appartient à l'année de son jeudi
 *  (c'est ce détail qui évite qu'un 1er janvier tombant un dimanche ouvre une « semaine 1 » de deux jours). */
export function isoWeekKey(d: Date): PeriodKey {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    const day = t.getUTCDay() || 7                 // lundi = 1 … dimanche = 7
    t.setUTCDate(t.getUTCDate() + 4 - day)         // on se place sur le jeudi de la même semaine ISO
    const year = t.getUTCFullYear()
    const jan1 = Date.UTC(year, 0, 1)
    const week = Math.ceil(((t.getTime() - jan1) / 86_400_000 + 1) / 7)
    return `${year}-W${String(week).padStart(2, "0")}`
}

/** Le créneau est-il libre ? (aucune période servie, ou une période PLUS ANCIENNE). Une clé identique = déjà servi
 *  → on ne ré-annonce pas, ce qui rend la fonctionnalité insensible aux rechargements en rafale. */
export function slotIsOpen(lastServed: string | null | undefined, now: PeriodKey): boolean {
    return !lastServed || lastServed !== now
}

/** Tire un candidat au hasard. Vivier vide → null (on n'annonce RIEN plutôt que d'inventer un pseudo). */
export function pickCandidate<T>(pool: readonly T[], rng: () => number = Math.random): T | null {
    if (pool.length === 0) return null
    // ⚠️ Math.max(0, NaN) vaut NaN — les bornes ne protègent PAS d'un rng défaillant, et pool[NaN] rend undefined
    //   alors que la signature promet T | null. On replie donc explicitement toute valeur non finie sur le 1er.
    const raw = Math.floor(rng() * pool.length)
    const i = Number.isFinite(raw) ? Math.min(pool.length - 1, Math.max(0, raw)) : 0
    return pool[i]
}
