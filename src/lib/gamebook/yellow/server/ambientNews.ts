// 📰 ACTUALITÉS DU NEXUS — génération côté serveur (cf. data/ambientNews pour la règle et la cadence).
//
// À la connexion, on peut annoncer au joueur qu'un pote vient de décrocher un sacre de Ligue (1×/semaine) ou de
// battre un reflet (1×/jour), et lui verser la part d'énergie correspondante. Trois règles non négociables :
//
//   1. LE PSEUDO CITÉ A VRAIMENT FAIT L'EXPLOIT. On ne tire que parmi les joueurs qui l'ont réellement accompli
//      (une ligne LeagueChampion pour la Ligue, une vraie consolation envoyée pour le reflet). Seule la DATE est
//      romancée : si le joueur va demander « t'as battu la Ligue ? », la réponse est oui.
//   2. JAMAIS SOI-MÊME, jamais un compte système.
//   3. AUCUNE ÉCRITURE DANS LES DONNÉES DE PRESTIGE. On n'insère que dans les registres de CADEAUX
//      (LeagueEnergyGrant / DuelGift), qui n'alimentent aucun score, aucun palmarès, aucun haut fait. Les lignes
//      générées portent `ambient: true` → auditables, et exclues du vivier pour qu'un faux n'en engendre pas d'autres.
//
// Tout est best-effort : la moindre erreur base laisse la connexion intacte (ces annonces sont un bonus, pas un dû).

import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"
import { isoWeekKey, pickCandidate, MIRROR_GIFT_ENERGY } from "../data/ambientNews"

interface Candidate { userId: string; nickname: string }

/** Sentinelle du cadeau d'anniversaire (cf. duel-gift/route) : ce n'est pas un vainqueur de reflet. */
const BDAY_SENTINEL = "__BDAY36__"

/** Réserve le créneau de la période de façon ATOMIQUE. `true` au plus une fois par période et par joueur, même
 *  sous rafale de F5 ou deux onglets : c'est l'écriture conditionnelle elle-même qui arbitre, pas une lecture
 *  suivie d'une écriture. On réserve AVANT d'insérer le cadeau — au pire un créneau est consommé sans cadeau
 *  (aucune énergie en trop), jamais l'inverse. */
async function claimSlot(userId: string, field: "ambientLeagueWeek" | "ambientMirrorDay", key: string): Promise<boolean> {
    const fp = (prisma as any).frontierProfile
    await fp.upsert({ where: { userId }, create: { userId }, update: {} }) // le profil n'existe pas forcément
    const res = await fp.updateMany({
        where: { userId, OR: [{ [field]: null }, { [field]: { not: key } }] },
        data: { [field]: key },
    })
    return res.count === 1
}

/** Retire les comptes système du vivier (ils jouent, mais ne « comptent » pas comme des potes). */
async function withoutSystemAccounts(pool: Candidate[]): Promise<Candidate[]> {
    if (pool.length === 0) return []
    const ok = await prisma.user.findMany({
        where: { id: { in: pool.map((c) => c.userId) }, isSystem: false },
        select: { id: true },
    })
    const allowed = new Set(ok.map((u) => u.id))
    return pool.filter((c) => allowed.has(c.userId))
}

/** Vivier LIGUE : les joueurs qui ont DÉJÀ été sacrés au moins une fois. On écarte aussi ceux dont un don n'est
 *  pas encore réclamé par ce joueur — c'est la règle anti-empilement du vrai sacre, on ne s'en affranchit pas. */
async function leagueCandidates(userId: string): Promise<Candidate[]> {
    const champs = (await (prisma as any).leagueChampion.findMany({
        where: { userId: { not: userId } },
        select: { userId: true, nickname: true },
        distinct: ["userId"],
        take: 50,
    })) as Candidate[]
    const pending = (await (prisma as any).leagueEnergyGrant.findMany({
        where: { toUserId: userId, claimed: false },
        select: { fromUserId: true },
    })) as { fromUserId: string }[]
    const blocked = new Set(pending.map((p) => p.fromUserId))
    return withoutSystemAccounts(champs.filter((c) => !blocked.has(c.userId)))
}

/** Vivier REFLET : les joueurs qui ont VRAIMENT battu le reflet de quelqu'un (donc envoyé une consolation).
 *  On exclut les lignes `ambient` — sans quoi une fausse annonce ferait entrer son propre figurant dans le
 *  vivier et le mécanisme s'auto-alimenterait — ainsi que la sentinelle d'anniversaire. */
async function mirrorCandidates(userId: string): Promise<Candidate[]> {
    const rows = (await (prisma as any).duelGift.findMany({
        where: { fromUserId: { not: userId }, ambient: false, fromNickname: { not: BDAY_SENTINEL } },
        select: { fromUserId: true, fromNickname: true },
        distinct: ["fromUserId"],
        take: 50,
    })) as { fromUserId: string; fromNickname: string }[]
    return withoutSystemAccounts(rows.map((r) => ({ userId: r.fromUserId, nickname: r.fromNickname })))
}

/** Génère les actualités dues à ce joueur, s'il y en a. Renvoie les pseudos utilisés (diagnostic / journal).
 *  Ne lève jamais : une annonce ratée ne doit pas gâcher une connexion. */
export async function generateAmbientNews(userId: string): Promise<{ league: string | null; mirror: string | null }> {
    const out: { league: string | null; mirror: string | null } = { league: null, mirror: null }

    // ── SACRE DE LA LIGUE — 1×/semaine ──
    try {
        const pool = await leagueCandidates(userId)
        const pick = pickCandidate(pool)
        // On ne réserve le créneau QUE si on a un pseudo crédible : un vivier vide ne doit pas griller la semaine.
        if (pick && await claimSlot(userId, "ambientLeagueWeek", isoWeekKey(new Date()))) {
            await (prisma as any).leagueEnergyGrant.create({
                data: { toUserId: userId, fromUserId: pick.userId, fromNickname: pick.nickname, ambient: true },
            })
            out.league = pick.nickname
        }
    } catch { /* best-effort : pas d'annonce, connexion intacte */ }

    // ── REFLET BATTU — 1×/jour ──
    try {
        const pool = await mirrorCandidates(userId)
        const pick = pickCandidate(pool)
        if (pick && await claimSlot(userId, "ambientMirrorDay", getTodayISO())) {
            await (prisma as any).duelGift.create({
                data: {
                    toUserId: userId, fromUserId: pick.userId, fromNickname: pick.nickname,
                    energy: MIRROR_GIFT_ENERGY, ambient: true,
                },
            })
            out.mirror = pick.nickname
        }
    } catch { /* best-effort */ }

    return out
}
