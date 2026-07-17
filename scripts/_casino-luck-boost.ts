// ÉCRITURE PROD — coup de pouce DISCRET Task1 & Embi : AUCUN don direct. On seede seulement des roulettes
// TRUQUÉES gagnantes (rouletteLuck luckMax) → en re-misant leurs gains, ils grimpent (boule de neige). La
// sécurité anti-jackpot (net ≤ cap) borne chaque gain et fait s'arrêter le truquage quand leur mise dépasse le cap.
// Réversible (il suffit de vider rouletteLuck). Ne touche NI reps NI rien d'autre.
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

const TARGETS = ["Task1", "Embi"]
// 6 spins gagnants truqués, chacun plafonné à 600 net → boule de neige depuis leur pactole actuel vers ~1000,
// puis le truquage s'auto-stoppe (une mise > 600 dépasse le cap → plus de rig). Aucune énergie offerte.
const LUCK = Array.from({ length: 6 }, () => ({ kind: "luckMax" as const, cap: 600 }))

async function main() {
    const rows = await prisma.gamebookProgress.findMany({ where: { chapterId: "yellow" }, select: { id: true, userId: true, flags: true } })
    for (const r of rows) {
        const f: any = r.flags ?? {}
        const nick = f?.nickname ?? (await prisma.user.findUnique({ where: { id: r.userId }, select: { nickname: true } }))?.nickname ?? "?"
        if (!TARGETS.includes(String(nick))) continue

        const reps = Math.round(f?.reps ?? 0)
        const beforeLuck = Array.isArray(f?.labDefi?.rouletteLuck) ? f.labDefi.rouletteLuck.length : 0
        const existingLuck = Array.isArray(f?.labDefi?.rouletteLuck) ? f.labDefi.rouletteLuck : []
        const newFlags = {
            ...f,
            // reps INCHANGÉ (aucun don). Seul labDefi.rouletteLuck est enrichi.
            labDefi: { ...(f.labDefi ?? {}), rouletteLuck: [...existingLuck, ...LUCK].slice(-8) },
        }
        await prisma.gamebookProgress.update({ where: { id: r.id }, data: { flags: newFlags } })
        console.log(`${String(nick).padEnd(8)} · reps INCHANGÉ (${reps}) · rouletteLuck ${beforeLuck} → ${newFlags.labDefi.rouletteLuck.length} (+6 luckMax cap 600)`)
    }
    console.log("\n✅ Truquage posé. Leurs prochaines roulettes gagnent (net ≤ 600) ; en re-misant, ils grimpent vers ~1000 puis ça s'arrête. Zéro énergie offerte.")
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
