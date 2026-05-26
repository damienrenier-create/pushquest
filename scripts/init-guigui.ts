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

async function main() {
    console.log("→ Init compte GUIGUI...")

    const existing = await prisma.user.findUnique({ where: { nickname: "GUIGUI" } })

    if (existing) {
        console.log("  GUIGUI existe déjà, mise à jour des flags...")
        await prisma.user.update({
            where: { id: existing.id },
            data: {
                isSystem: true,
                isTester: true,
                onboardingStartedAt: null,
            } as any,
        })
        console.log("  ✓ flags mis à jour.")
    } else {
        console.log("  Création de GUIGUI...")
        await prisma.user.create({
            data: {
                email: "guigui@local.test",
                nickname: "GUIGUI",
                password: "test_account_no_hash_check",
                isSystem: true,
                isTester: true,
                onboardingStartedAt: null,
                league: "POMPES",
            } as any,
        })
        console.log("  ✓ compte créé.")
    }

    console.log("")
    console.log("Connexion : utilise 'GUIGUI' comme identifiant + un code ≥ 3 caractères.")
    console.log("Active la variable d'env GUIGUI_LOGIN_ENABLED=true dans .env.local pour autoriser le login.")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
