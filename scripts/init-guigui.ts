// scripts/init-guigui.ts
//
// v3.32 — Crée le compte test "GUIGUI" (isSystem + isTester).
//
// Usage : npx tsx scripts/init-guigui.ts
//
// Idempotent : si GUIGUI existe déjà, met juste à jour ses flags.
// GUIGUI est :
//   - isSystem = true   (invisible dashboard/classement/map)
//   - isTester = true   (reset à chaque login, pas de bootstrap creator)
//   - onboardingStartedAt = null (joueur jour 144+, ratio = 1.0)
//   - mot de passe = n'importe quel code ≥ 3 caractères (auth design)
//
// Connexion en local uniquement : nécessite GUIGUI_LOGIN_ENABLED=true dans .env.local.
// En prod, cette variable est absente → login refusé.

import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

const TARGET_XP = 20000  // ~level 18 = Faucon pèlerin 🦅

async function main() {
    console.log("→ Init compte GUIGUI...")

    let userId: string

    const existing = await prisma.user.findUnique({ where: { nickname: "GUIGUI" } })

    if (existing) {
        console.log("  GUIGUI existe déjà, mise à jour des flags via SQL brut (évite regen client)...")
        await prisma.$executeRawUnsafe(`
            UPDATE "User"
            SET "isSystem" = true,
                "isTester" = true,
                "onboardingStartedAt" = NULL
            WHERE "id" = '${existing.id}'
        `)
        userId = existing.id
        console.log("  ✓ flags mis à jour.")
    } else {
        console.log("  Création de GUIGUI via SQL brut (évite regen client)...")
        const newId = "guigui_" + Math.random().toString(36).slice(2, 12)
        await prisma.$executeRawUnsafe(`
            INSERT INTO "User" ("id", "email", "nickname", "password", "isSystem", "isTester", "league", "onboardingStartedAt", "createdAt", "updatedAt")
            VALUES ('${newId}', 'guigui@local.test', 'GUIGUI', 'test_account_no_hash_check', true, true, 'POMPES', NULL, NOW(), NOW())
        `)
        userId = newId
        console.log("  ✓ compte créé.")
    }

    // Ajout XpAdjustment de 20000 (= level ~18, animal Faucon pèlerin).
    // On replace les anciens ajustements GUIGUI pour éviter l'accumulation.
    console.log(`→ Force XP à ${TARGET_XP} (level ~18)...`)
    await prisma.$executeRawUnsafe(`
        DELETE FROM "XpAdjustment"
        WHERE "userId" = '${userId}' AND "reason" LIKE '%[GUIGUI-INIT]%'
    `)
    const today = new Date().toISOString().slice(0, 10)
    const adjId = "guigui_xp_" + Math.random().toString(36).slice(2, 12)
    await prisma.$executeRawUnsafe(`
        INSERT INTO "XpAdjustment" ("id", "amount", "reason", "userId", "date", "createdAt")
        VALUES ('${adjId}', ${TARGET_XP}, '[GUIGUI-INIT] Compte test — XP forcé pour animal niveau ~18.', '${userId}', '${today}', NOW())
    `)
    console.log("  ✓ XP ajusté.")

    console.log("")
    console.log("============================================================")
    console.log("Connexion :")
    console.log("  1. Ajoute GUIGUI_LOGIN_ENABLED=true dans .env.local")
    console.log("  2. Redémarre 'npm run dev'")
    console.log("  3. Va sur /login")
    console.log("  4. Identifiant : 'GUIGUI'  |  Code : n'importe quel mot ≥ 3 caractères")
    console.log("")
    console.log(`Level prévu : ~18 (Faucon pèlerin 🦅) — après ${TARGET_XP} XP.`)
    console.log("============================================================")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
