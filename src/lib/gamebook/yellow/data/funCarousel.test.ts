import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"

describe("joueurs fun : pas de carrousel PushQuest (Sartay 19/10/2026)", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "src/components/DailyDiscoveryCarousel.tsx"), "utf8")
    it("rien sur la page d'inscription du lien fun, rien pour un compte fun", () => {
        expect(src).toContain("invite\") === \"nexus-fun-2026\"")
        expect(src).toContain("me?.gameMode !== \"fun\"")
        expect(src).toContain("if (isFunSignupPage()) return;")
    })
    it("le même code que la page d'inscription", () => {
        const reg = fs.readFileSync(path.join(process.cwd(), "src/app/register/page.tsx"), "utf8")
        expect(reg).toContain("invite === \"nexus-fun-2026\"")
    })
    it("le profil n'est lu que si un carrousel est en attente", () => {
        expect(src.indexOf("if (!hasPendingCarousel()) return;")).toBeLessThan(src.indexOf("fetch(\"/api/user/me\")"))
    })
})
