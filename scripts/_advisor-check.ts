// LECTURE SEULE — questions du Conseiller (AdvisorQuestion). Liste d'abord les NON RÉPONDUES.
//   npx tsx scripts/_advisor-check.ts
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
    const rows = await prisma.advisorQuestion.findMany({
        select: { question: true, answer: true, createdAt: true, answeredAt: true, user: { select: { nickname: true } } },
        orderBy: { createdAt: "desc" },
    })
    const pending = rows.filter((r) => r.answer == null)
    const answered = rows.filter((r) => r.answer != null)
    console.log(`TOTAL ${rows.length} question(s) · ${pending.length} EN ATTENTE · ${answered.length} répondue(s)\n`)

    console.log(`=== EN ATTENTE (answer = null) ===`)
    if (!pending.length) console.log("  (aucune)")
    for (const r of pending) {
        const who = (r.user?.nickname ?? "?").padEnd(12)
        const when = new Date(r.createdAt).toISOString().slice(0, 16).replace("T", " ")
        console.log(`  ${when}  ${who}  « ${r.question} »`)
    }

    console.log(`\n=== DÉJÀ RÉPONDUES (rappel) ===`)
    for (const r of answered) {
        const who = (r.user?.nickname ?? "?").padEnd(12)
        const when = new Date(r.createdAt).toISOString().slice(0, 16).replace("T", " ")
        console.log(`  ${when}  ${who}  « ${r.question} »  → ${r.answer?.slice(0, 60) ?? ""}`)
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
