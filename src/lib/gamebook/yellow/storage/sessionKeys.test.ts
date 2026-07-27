import { describe, it, expect, afterEach } from "vitest"
import { BATTLE_LS_KEY, FRONTIER_LS_KEY, RUN2_SCORES_LS_KEY, SESSION_LS_KEYS, clearRunSessionStorage } from "./sessionKeys"

/** localStorage minimal (l'environnement de test est "node" → pas de window). */
function fakeWindow(store: Record<string, string>, opts: { throws?: boolean } = {}) {
    return {
        localStorage: {
            getItem: (k: string) => store[k] ?? null,
            setItem: (k: string, v: string) => { store[k] = v },
            removeItem: (k: string) => {
                if (opts.throws) throw new Error("SecurityError") // navigation privée / quota
                delete store[k]
            },
        },
    }
}

afterEach(() => { delete (globalThis as { window?: unknown }).window })

describe("clearRunSessionStorage", () => {
    it("purge l'instantané de combat et la série Frontier (sortie du combat en cours)", () => {
        const store: Record<string, string> = {
            [BATTLE_LS_KEY]: '{"v":1,"battle":{}}',
            [FRONTIER_LS_KEY]: '{"run":{"status":"active"}}',
            [RUN2_SCORES_LS_KEY]: "{}",
            autre_cle: "à conserver",
        }
        ;(globalThis as { window?: unknown }).window = fakeWindow(store)
        clearRunSessionStorage()
        for (const k of SESSION_LS_KEYS) expect(store[k]).toBeUndefined()
        expect(store.autre_cle).toBe("à conserver") // ne touche QUE les clés de session
    })

    it("est idempotent et ne casse pas si les clés sont déjà absentes", () => {
        const store: Record<string, string> = {}
        ;(globalThis as { window?: unknown }).window = fakeWindow(store)
        expect(() => { clearRunSessionStorage(); clearRunSessionStorage() }).not.toThrow()
    })

    it("tolère un localStorage indisponible (mode privé) sans lever", () => {
        const store: Record<string, string> = { [BATTLE_LS_KEY]: "x" }
        ;(globalThis as { window?: unknown }).window = fakeWindow(store, { throws: true })
        expect(() => clearRunSessionStorage()).not.toThrow()
    })

    it("no-op hors navigateur (SSR)", () => {
        expect((globalThis as { window?: unknown }).window).toBeUndefined()
        expect(() => clearRunSessionStorage()).not.toThrow()
    })

    it("les clés restent alignées sur celles utilisées par le jeu", () => {
        // Si une de ces chaînes change côté jeu, la purge cesse silencieusement de fonctionner.
        expect(BATTLE_LS_KEY).toBe("pq_yellow_battle_v1")
        expect(FRONTIER_LS_KEY).toBe("pq_yellow_frontier_v1")
        expect(RUN2_SCORES_LS_KEY).toBe("pq_yellow_run2scores_v1")
        expect(SESSION_LS_KEYS).toHaveLength(3)
    })
})
