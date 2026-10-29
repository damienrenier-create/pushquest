import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { presenceChannelFor, isMapPresenceChannel, MAP_PRESENCE_CHANNELS, SOCIAL_PRESENCE_MAPS } from "./presenceMaps"
import { YELLOW_MAPS } from "../maps"
import { hasEncounters } from "../data/encounters"

// Sartay, 29/10/2026 : « dans le casino et le dôme on peut voir les autres joueurs. Qu'est-ce que ça coûterait
// d'étendre cette fonction à plusieurs maps ? », puis « go option 2 » (les 7 lieux sociaux, on s'y voit seulement).
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")

describe("présence en direct : les lieux sociaux", () => {
    it("casino et salle de fusion gardent leurs canaux ; les 7 lieux sociaux ont le leur ; ailleurs, personne", () => {
        expect(presenceChannelFor("yellow_casino")).toBe("yellow_casino")
        expect(presenceChannelFor("yellow_combat_autel")).toBe("yellow_autel")
        expect(presenceChannelFor("yellow_entrance")).toBe("yellow_p_entrance")
        expect(presenceChannelFor("yellow_cendreville")).toBe("yellow_p_cendreville")
        expect(presenceChannelFor("yellow_zone_combat")).toBe("yellow_p_zone_combat")
        expect(presenceChannelFor("yellow_sbire")).toBe("yellow_p_sbire")
        for (const id of ["yellow_route_nord", "yellow_grotte_nexus", "yellow_arena", "yellow_ligue_glace", "yellow_combat_dome", "yellow_ukognofy_chamber"]) expect(presenceChannelFor(id)).toBeNull()
    })
    it("Centre, Labo et boutique : un canal par ville d'entrée (ville inconnue → Ville Jaune)", () => {
        expect(presenceChannelFor("yellow_shop", "yellow_entrance")).toBe("yellow_p_shop@entrance")
        expect(presenceChannelFor("yellow_shop", "yellow_cendreville")).toBe("yellow_p_shop@cendreville")
        expect(presenceChannelFor("yellow_infirmary", null)).toBe("yellow_p_infirmary@entrance")
        expect(presenceChannelFor("yellow_infirmary_2e", "yellow_cendreville")).toBe("yellow_p_infirmary_2e@cendreville")
        expect(presenceChannelFor("yellow_shop", "yellow_casino")).toBe("yellow_p_shop@entrance")
    })
    it("liste blanche exacte de la route : 4 lieux + 3 intérieurs × 2 villes, noms acceptés par Pusher", () => {
        expect(MAP_PRESENCE_CHANNELS.size).toBe(10)
        for (const ch of MAP_PRESENCE_CHANNELS) {
            expect(ch).toMatch(/^[A-Za-z0-9_\-=@,.;]+$/)
            expect(`gamebook-${ch}`.length).toBeLessThanOrEqual(164)
            expect(isMapPresenceChannel(ch)).toBe(true)
        }
        // Les canaux PARTAGÉS (chat, défi, échange) ne sont jamais traités comme des canaux de carte : jamais désabonnés.
        for (const ch of ["yellow_casino", "yellow_autel", "yellow_nexus", "yellow_p_route_nord", "yellow_p_shop"]) expect(isMapPresenceChannel(ch)).toBe(false)
    })
    it("les 7 lieux existent et sont sans sauvages (un combat ferait disparaître le joueur des écrans)", () => {
        expect(SOCIAL_PRESENCE_MAPS).toHaveLength(7)
        for (const id of SOCIAL_PRESENCE_MAPS) {
            const m = YELLOW_MAPS[id]
            expect(m, id).toBeTruthy()
            expect(!hasEncounters(id) || !!m.encountersPaused, id).toBe(true)
        }
    })
    it("câblage du relai : présence seule sur ces canaux, throttle par canal, pas de copie à l'émetteur, pseudo en cache", () => {
        const route = read("src/app/api/gamebook/yellow/broadcast/route.ts")
        expect(route).toContain("if (isMapPresenceChannel(channel) && !PRESENCE_TYPES.has(type)) return NextResponse.json({ error: \"Invalid type\" }, { status: 400 })")
        expect(route).toContain("const key = `${userId}:${channel}:${type}`")
        expect(route).toContain("await pusher.trigger(`gamebook-${channel}`, type, payload, { socket_id: socketId })")
        expect(route).toContain("const nickname = await nicknameOf(userId, PRESENCE_TYPES.has(type))")
        expect(route).toContain("const NICK_TTL_MS = 60 * 1000")
    })
    it("câblage du hook : quitte un canal de carte, se retire quand l'onglet est caché, pas regroupés, canal fun sans message à chaque pas", () => {
        const hook = read("src/lib/gamebook/yellow/multiplayer/useCasinoPresence.ts")
        expect(hook).toContain("if (isMapPresenceChannel(channel)) client.unsubscribe(channelName)")
        expect(hook).toContain("if (!active || countOnly) return")
        expect(hook).toContain("if (document.hidden) { stopMoves(); post({ type: \"player:away\" }, true); return }")
        expect(hook).toContain("if (document.hidden) return // onglet caché : je me suis retiré, je ne réapparais pas pour l'arrivant")
        expect(hook).toContain("if (document.hidden || trailRef.current) return")
        expect(hook).toContain("if (r.status === 429 && gen === genRef.current && !trailRef.current) trailRef.current = setTimeout(fire, MOVE_GAP_MS)")
        expect(hook.match(/type: "player:move"/g)?.length).toBe(1) // un seul envoyeur de positions (regroupé)
        expect(hook).toContain("const socketId = getPusherClient()?.connection?.socket_id")
    })
    it("un onglet caché n'est PAS un départ : les échanges du casino n'écoutent que player:disconnect (jamais player:away)", () => {
        for (const f of ["useCasinoTrade.ts", "useCasinoCtTrade.ts", "useCasinoChallenge.ts", "useCasinoBattle.ts"]) {
            expect(read(`src/lib/gamebook/yellow/multiplayer/${f}`), f).not.toContain("player:away")
        }
        const hook = read("src/lib/gamebook/yellow/multiplayer/useCasinoPresence.ts")
        expect(hook.match(/type: "player:disconnect"/g)?.length).toBe(2) // départ réel seulement : sortie de carte et fermeture d'onglet
        // Page quittée avec un échange ouvert : annulé des deux côtés (retour « Précédent » sans échange à moitié fait).
        expect(read("src/lib/gamebook/yellow/multiplayer/useCasinoTrade.ts")).toContain("window.addEventListener(\"pagehide\", onPageHide)")
        expect(read("src/lib/gamebook/yellow/multiplayer/useCasinoCtTrade.ts")).toContain("window.addEventListener(\"pagehide\", onPageHide)")
    })
    it("câblage du client : présence par lieu après chargement de la position, défi réservé au casino et à la salle de fusion, bulles du chat au casino seulement", () => {
        const ydc = read("src/app/gamebook/yellow/YellowDevClient.tsx")
        expect(ydc).toContain("const presenceChannel = presenceChannelFor(mapPlayer.mapId, interiorReturn?.mapId)")
        expect(ydc).toContain("active: hydrated && !whiteout && !!presenceChannel && !battle && !showIntro && !!userId,")
        expect(ydc).toContain("const mpActive = (inCasino || inAutel) && !battle && !showIntro && !!userId")
        expect(ydc).toContain("active: mpActive && !kartOpen,")
        expect(ydc).toContain("countOnly: true,")
        expect(ydc).toContain("chatBubbles={inCasino ? chat.bubbles : undefined}")
    })
})
