// src/app/api/gamebook/pastagone/orphan-choose/route.ts
//
// v4.0 Phase 8 — POST : le joueur choisit UN orphelin animal après la défaite
// du DOBERMAN ALPHA. L'orphelin rejoint l'équipe (slot libre 2..6, ou
// remplace BOLOGNION si équipe pleine — pas implémenté ici).
//
// 3 choix exclusifs :
//   - "anguillzap" : Électrique
//   - "faucotron"  : Vol
//   - "octopsy"    : Psy
//
// Body : { orphan: "anguillzap" | "faucotron" | "octopsy" }
//
// Effets :
//   - pastagoneOrphanChosen = <orphan>
//   - Crée Daemon dans slot libre, niveau 1, unlockedAt=now.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { computeDaemonBaseStats, computeMaxHp, type DaemonType, type Morphology } from "@/lib/gamebook/daemon"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

interface OrphanDef {
    key: string
    name: string
    type: DaemonType
    morphology: Morphology
    speciesLevel: number
    attacks: string[]
    statsMult: { force: number; vitesse: number; defense: number; intelligence: number; endurance: number }
}

const ORPHANS: Record<string, OrphanDef> = {
    anguillzap: {
        key: "anguillzap", name: "ANGUILLZAP",
        type: "Electrique", morphology: "ecailles",
        speciesLevel: 65,
        attacks: ["etincelle", "charge"],
        statsMult: { force: 0.9, vitesse: 1.3, defense: 0.8, intelligence: 1.1, endurance: 0.9 },
    },
    faucotron: {
        key: "faucotron", name: "FAUCOTRON",
        type: "Vol", morphology: "bec",
        speciesLevel: 22,
        attacks: ["picpic", "tornade"],
        statsMult: { force: 1.1, vitesse: 1.2, defense: 0.8, intelligence: 1.0, endurance: 0.9 },
    },
    octopsy: {
        key: "octopsy", name: "OCTOPSY",
        type: "Psy", morphology: "ecailles",
        speciesLevel: 73,
        attacks: ["confusion", "charge"],
        statsMult: { force: 0.8, vitesse: 1.0, defense: 1.0, intelligence: 1.4, endurance: 1.0 },
    },
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    let body: { orphan?: string }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    const orphanKey = body.orphan ?? ""
    const orphan = ORPHANS[orphanKey]
    if (!orphan) {
        return NextResponse.json({ ok: false, reason: "orphan doit être anguillzap | faucotron | octopsy" }, { status: 400 })
    }

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })
    if (progress.pastagoneBossBeaten !== true) {
        return NextResponse.json({ ok: false, reason: "Pas encore vaincu Doberman Alpha." }, { status: 403 })
    }
    if (progress.pastagoneOrphanChosen) {
        return NextResponse.json({ ok: false, reason: `Tu as déjà choisi ${progress.pastagoneOrphanChosen}.` }, { status: 400 })
    }

    // Slot libre
    const existing = await (prisma as any).daemon.findMany({
        where: { userId },
        orderBy: { slotIndex: "asc" },
    })
    const used = new Set(existing.map((d: { slotIndex: number }) => d.slotIndex))
    let slot = -1
    for (let s = 2; s <= 6; s++) {
        if (!used.has(s)) { slot = s; break }
    }
    if (slot === -1) {
        return NextResponse.json({
            ok: false,
            reason: "Équipe pleine (6/6). Range ou échange avant de choisir un orphelin.",
        }, { status: 400 })
    }

    const base = await computeDaemonBaseStats(userId)
    const m = orphan.statsMult
    const stats = {
        force: Math.max(25, Math.min(100, Math.round(base.force * m.force))),
        vitesse: Math.max(25, Math.min(100, Math.round(base.vitesse * m.vitesse))),
        defense: Math.max(25, Math.min(100, Math.round(base.defense * m.defense))),
        intelligence: Math.max(25, Math.min(100, Math.round(base.intelligence * m.intelligence))),
        endurance: Math.max(25, Math.min(100, Math.round(base.endurance * m.endurance))),
    }

    await (prisma as any).daemon.create({
        data: {
            userId,
            slotIndex: slot,
            name: orphan.name,
            speciesLevel: orphan.speciesLevel,
            type: orphan.type,
            morphology: orphan.morphology,
            combatLevel: 1,
            combatXp: 0,
            baseFor: stats.force, baseVit: stats.vitesse, baseDef: stats.defense,
            baseInt: stats.intelligence, baseEnd: stats.endurance,
            currentHp: computeMaxHp(stats.endurance, 1, 0),
            happiness: 50,
            attacksKnown: orphan.attacks,
            attacksEquipped: orphan.attacks,
            origin: `pastagone_boss_${orphan.key}`,
            unlockedAt: new Date(),
        },
    })

    // v4.0 — Triangulation CAPOLINO 4ᵉ rencontre :
    //   Joueur prend ÉLEC → CAPOLINO vole un Combat
    //   Joueur prend VOL  → CAPOLINO vole un Roche
    //   Joueur prend PSY  → CAPOLINO vole un Vol
    const capolinoTypeStolen =
        orphan.key === "anguillzap" ? "Combat"
            : orphan.key === "faucotron" ? "Roche"
                : "Vol"

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            pastagoneOrphanChosen: orphan.key,
            pastagoneCapolinoFleeShown: true,
        },
    })

    return NextResponse.json({
        ok: true,
        orphan: orphan.key,
        slot,
        message: `${orphan.name} te suit. (${orphan.type}, slot ${slot}.) Le combat avec le boss l'a laissé orphelin — il a choisi de te faire confiance.`,
        // v4.0 — Données cinématique post-boss CAPOLINO (4ᵉ rencontre)
        capolinoFlee: {
            stolenType: capolinoTypeStolen,
            lines: [
                "*Une voix résonne derrière toi.*",
                "« Eh bien, dresseur ! Tu pensais avoir gagné ? »",
                "*CAPOLINO surgit, son Daemon " + capolinoTypeStolen + " grognant à ses côtés.*",
                "« Tu prends celui-là ? Je prends son contraire. »",
                `*Il s'empare d'un Daemon de type ${capolinoTypeStolen} dans l'ombre.*`,
                "« On se retrouvera, dresseur. Et cette fois, c'est toi qui dispatch des fleurs. »",
                "*Il s'enfuit par le nord, son rire résonnant dans les couloirs.*",
            ],
        },
    })
}
