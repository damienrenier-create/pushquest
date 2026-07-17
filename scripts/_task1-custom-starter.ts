// LECTURE SEULE — extrait le STARTER CUSTOM créé par Task1 (créateur post-Ligue, entre run 1 et run 2)
// + sa NÉMÉSIS. Sort une fiche complète pour dessiner les sprites (nom/type/stats/description par stade).
import { PrismaClient } from "@prisma/client"
import { buildCustomSpecies, buildNemesis } from "../src/lib/gamebook/yellow/create/customSpecies"
import type { StoredCustomDaemon, CustomSpec } from "../src/lib/gamebook/yellow/create/customSpecies"

const prisma = new PrismaClient()
const BST = (s: any) => (["hp", "atk", "def", "spe", "spc"] as const).reduce((a, k) => a + (s[k] ?? 0), 0)

function dumpLine(spec: CustomSpec, ownerId: string, label: string) {
    console.log(`\n${"═".repeat(70)}\n  ${label}\n${"═".repeat(70)}`)
    console.log(`  DA (base)   : ${spec.da ?? "—"}`)
    if (spec.daFinal) console.log(`  DA (final)  : ${spec.daFinal}`)
    console.log(`  Caractère   : ${spec.character ?? "—"}`)
    console.log(`  Rôle        : ${spec.role}   ·   Stades : ${spec.stages}   ·   Bloomer : ${spec.bloomer}   ·   Courbe : ${spec.curve}`)
    if (spec.attributes?.length) console.log(`  Attributs   : ${spec.attributes.join(", ")}`)
    if (spec.secretTalent) console.log(`  Talent caché: ${spec.secretTalent}`)
    if (spec.ultimateMove) console.log(`  Carotte ult.: ${spec.ultimateMove}`)
    const stages = buildCustomSpecies(spec, ownerId)
    for (const st of stages) {
        console.log(`\n  ── STADE ${st.id.endsWith("_s1") ? 1 : st.id.endsWith("_s2") ? 2 : 3} : ${st.name}  (id ${st.id})`)
        console.log(`     Types    : ${st.types.join(" / ")}`)
        const bs: any = st.baseStats
        console.log(`     Stats    : PV ${bs.hp} · ATQ ${bs.atk} · DÉF ${bs.def} · VIT ${bs.spe} · SPÉ ${bs.spc}   (BST ${BST(bs)})`)
        if ((st as any).evolvesTo) console.log(`     Évolue   : → ${(st as any).evolvesTo} au niv ${(st as any).evolveLevel ?? "?"}`)
        console.log(`     Desc     : ${st.description ?? "—"}`)
        const ls = (st.learnset ?? []).map((l: any) => `${l.level}:${l.moveId}`).join("  ")
        console.log(`     Learnset : ${ls || "—"}`)
    }
}

async function main() {
    const user = await prisma.user.findFirst({ where: { nickname: { equals: "Task1", mode: "insensitive" } }, select: { id: true, nickname: true } })
    if (!user) { console.log("User 'Task1' introuvable dans la table User."); return }
    const task1 = await prisma.gamebookProgress.findFirst({ where: { chapterId: "yellow", userId: user.id }, select: { userId: true, flags: true } })
    if (!task1) { console.log(`Save yellow de ${user.nickname} (${user.id}) introuvable.`); return }
    const f: any = task1.flags
    console.log(`${user.nickname} · userId ${task1.userId} · run3StarterBase="${f.run3StarterBase ?? ""}" · ngplusUsed=${f.ngplusUsed} · run3Used=${f.run3Used}`)
    const customs: StoredCustomDaemon[] = Array.isArray(f.customDaemons) ? f.customDaemons : []
    if (customs.length === 0) { console.log("\n⚠️ AUCUN customDaemon dans la save de Task1 (il n'a pas encore créé son starter, ou pas persisté)."); return }
    for (const c of customs) {
        dumpLine(c.spec, c.ownerId, `STARTER CRÉÉ PAR TASK1 — « ${c.spec.name} »`)
        try {
            const nem = buildNemesis(c.spec)
            dumpLine(nem, c.ownerId + "_nemesis", `NÉMÉSIS (contre-starter posé par l'ACE) — « ${nem.name} »`)
        } catch (e) { console.log("\n(némésis non générable : " + (e as Error).message + ")") }
    }
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect() })
