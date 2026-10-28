import { describe, it, expect, vi } from "vitest"
import { emptySave } from "../storage/save"

// Chargement de la page et cadeaux hors save (28/10/2026, « un vœu n'arrive qu'une fois ») : un faux serveur minimal rejoue
// les deux situations où un lot d'effets en attente (FrontierProfile.pendingEffects) était versé DEUX fois :
//  • deux loadYellowSave concurrents (rechargement en Ligue de Fusion : deux effets de montage) ;
//  • un acquittement perdu après une persistance réussie (réseau coupé, onglet fermé).

interface Server { save: unknown; ctx: { energyGrantPending?: number; pendingEffects?: string }; failAcks: number; getDelayMs: number }
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const resp = (data: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => JSON.parse(JSON.stringify(data)) })
function installServer(s: Server) {
    ;(globalThis as { fetch: unknown }).fetch = vi.fn(async (input: unknown, init?: { method?: string; body?: string }) => {
        const url = String(input), method = (init?.method ?? "GET").toUpperCase()
        const body = init?.body ? JSON.parse(init.body) : undefined
        if (url === "/api/gamebook/yellow/save" && method === "GET") { await sleep(s.getDelayMs); return resp({ ok: true, save: s.save }) }
        if (url === "/api/gamebook/yellow/save" && method === "POST") { s.save = body.save; return resp({ ok: true }) }
        if (url === "/api/gamebook/yellow/player-stats") return resp({ ctx: { ...s.ctx } })
        if (url === "/api/gamebook/yellow/energy-grant" && method === "POST") {
            if (s.failAcks > 0) { s.failAcks--; throw new TypeError("Failed to fetch") }
            if (body?.amount > 0 && s.ctx.energyGrantPending === body.amount) s.ctx.energyGrantPending = 0
            if (body?.effects && s.ctx.pendingEffects === body.effects) delete s.ctx.pendingEffects
            return resp({ ok: true })
        }
        return resp({ ok: true })
    })
}
/** Nouveau chargement de page : modules (donc stores singletons) neufs. */
async function freshPage() {
    vi.resetModules()
    const sm = await import("./saveManager")
    const ps = await import("./playerStore")
    return { sm, ps }
}
const FX = JSON.stringify([{ kind: "energy", amount: 2000 }, { kind: "item", id: "hyper_ball", qty: 3 }])
const baseSave = () => ({ ...emptySave(), activeWorld: "live" as const, introSeen: true, reps: 100, repsCap: 1000, welcomeGift: true, spagGift: true, items: {} })

describe("cadeaux hors save : versés une seule fois", () => {
    it("deux chargements CONCURRENTS de la page partagent le même chargement : cadeau d'énergie et lot d'effets versés une fois", async () => {
        const s: Server = { save: baseSave(), ctx: { energyGrantPending: 5000, pendingEffects: FX }, failAcks: 0, getDelayMs: 30 }
        installServer(s)
        const { sm, ps } = await freshPage()
        const a = sm.loadYellowSave()
        await sleep(5)
        const b = sm.loadYellowSave()
        await Promise.all([a, b])
        expect(ps.getPlayer().reps).toBe(100 + 5000 + 2000)
        expect(ps.getPlayer().items.hyper_ball).toBe(3)
        await sleep(1200) // laisse partir la sauvegarde différée de CETTE page avant que le test suivant installe son faux serveur
    }, 20_000)

    it("acquittement perdu après la persistance : au chargement suivant, le lot est ré-acquitté sans être reversé", async () => {
        const s: Server = { save: baseSave(), ctx: { pendingEffects: FX }, failAcks: 1, getDelayMs: 0 }
        installServer(s)
        let page = await freshPage()
        await page.sm.loadYellowSave()
        expect(page.ps.getPlayer().reps).toBe(2100)
        expect(s.ctx.pendingEffects).toBe(FX) // acquittement perdu : le serveur le propose encore
        page = await freshPage()
        await page.sm.loadYellowSave()
        expect(page.ps.getPlayer().reps).toBe(2100) // pas de 2e versement
        expect(page.ps.getPlayer().items.hyper_ball).toBe(3)
        expect(s.ctx.pendingEffects).toBeUndefined() // enfin acquitté
    }, 20_000)
})
