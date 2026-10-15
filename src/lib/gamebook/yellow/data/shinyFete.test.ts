import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { frenzyFromFlags, shinyFeteSuppressed, freshShinyFrenzy } from "./shinyFrenzy"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// 🤫 LE SECRET DE LA FRÉNÉSIE (15/10/2026). Jacanon, 50 % de shiny pour son anniversaire : en dix minutes, 40 shinies
// croisés → 40 fêtes communautaires → 1 800 lignes ShinyGift, 40 annonces « Jacanon a croisé un shiny » et 2 000⚡
// pour chacun des 45 joueurs. Règle de Sartay : c'est un secret, aucune annonce. La garde vit côté SERVEUR (lecture de
// la save du déclarant → agit même sur un onglet déjà ouvert) et côté client (économie de requête).
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

const NOW = 1_792_100_000_000

describe("frenzyFromFlags : lecture tolérante des flags bruts", () => {
    it("état valide → repris tel quel", () => {
        expect(frenzyFromFlags({ shinyFrenzy: { until: NOW + 1000, left: 3 } })).toEqual({ until: NOW + 1000, left: 3 })
    })
    it("absent / nul / malformé → null, jamais d'exception", () => {
        expect(frenzyFromFlags(null)).toBeNull()
        expect(frenzyFromFlags(undefined)).toBeNull()
        expect(frenzyFromFlags({})).toBeNull()
        expect(frenzyFromFlags({ shinyFrenzy: null })).toBeNull()
        expect(frenzyFromFlags({ shinyFrenzy: "oui" })).toBeNull()
        expect(frenzyFromFlags({ shinyFrenzy: { until: "demain", left: 3 } })).toBeNull()
        expect(frenzyFromFlags({ shinyFrenzy: { until: NOW, left: NaN } })).toBeNull()
        expect(frenzyFromFlags("n'importe quoi")).toBeNull()
    })
})

describe("shinyFeteSuppressed : la fête se tait exactement quand la frénésie est active", () => {
    it("frénésie fraîche (24 h, 3 captures) → supprimée", () => {
        expect(shinyFeteSuppressed({ shinyFrenzy: freshShinyFrenzy(NOW) }, NOW + 60_000)).toBe(true)
    })
    it("état réel de Jacanon ({left:3, until:…}) → supprimée tant que until n'est pas passé", () => {
        const flags = { pc: [], team: [], shinyFrenzy: { left: 3, until: 1_792_181_640_792 } }
        expect(shinyFeteSuppressed(flags, 1_792_181_640_792 - 1)).toBe(true)
        expect(shinyFeteSuppressed(flags, 1_792_181_640_792 + 1)).toBe(false)
    })
    it("3 captures faites (left 0) → la fête reprend ; pas de frénésie → fête normale", () => {
        expect(shinyFeteSuppressed({ shinyFrenzy: { until: NOW + 3_600_000, left: 0 } }, NOW)).toBe(false)
        expect(shinyFeteSuppressed({ pc: [] }, NOW)).toBe(false)
        expect(shinyFeteSuppressed(null, NOW)).toBe(false)
    })
})

describe("garde-fous structurels : la garde est bien posée aux deux endroits", () => {
    const route = fs.readFileSync(path.join(process.cwd(), "src/app/api/gamebook/yellow/shiny-gift/route.ts"), "utf8")
    const client = fs.readFileSync(path.join(process.cwd(), "src/lib/gamebook/yellow/shinyGift.ts"), "utf8")

    it("⚠️ route POST : shinyFeteSuppressed(…) est évalué AVANT toute création (fête, clan, parrainage)", () => {
        const guard = route.indexOf("shinyFeteSuppressed(")
        const firstCreate = route.indexOf("createMany(")
        const sponsor = route.indexOf("fanOutSponsorGift(prisma")
        expect(guard).toBeGreaterThan(0)
        expect(guard).toBeLessThan(firstCreate)
        expect(guard).toBeLessThan(sponsor)
        expect(route).toContain('skipped: "frenzy"')
    })

    it("⚠️ client reportShiny : ne POSTe pas pendant la frénésie", () => {
        const guard = client.indexOf("shinyFrenzyActive(getShinyFrenzy()")
        expect(guard).toBeGreaterThan(0)
        expect(guard).toBeLessThan(client.indexOf("fetch("))
    })
})
