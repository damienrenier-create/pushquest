// src/lib/gamebook/yellow/multiplayer/presenceMaps.ts
//
// Nexus Jaune Éclair — OÙ L'ON VOIT LES AUTRES JOUEURS EN DIRECT (Sartay, 29/10/2026 : « go option 2 »).
// Avant : le casino et la salle de fusion seulement. Désormais aussi les 7 LIEUX SOCIAUX (passages obligés, sans
// sauvages, à fonds peints) : Ville Jaune, Cendreville, le hub de la Zone de Combat, le Centre, le Labo, la boutique
// et la Chapelle de Nouillon. On s'y VOIT seulement : défi, échange et chat restent au casino (et le défi de fusion
// à la salle de fusion).
//
// Un canal Pusher PAR CARTE (les coordonnées sont propres à une carte). Les intérieurs PARTAGÉS entre les deux villes
// (Centre, Labo, boutique) ont un canal PAR VILLE : celui qui entre depuis Cendreville ne voit pas la boutique de la
// Ville Jaune. Le casino et la salle de fusion gardent leurs canaux historiques (partagés avec chat, défi, échange).
//
// Module NEUTRE (aucun import) : lu par le client (YellowDevClient) ET par la route de relai (liste blanche).

/** Les 7 lieux sociaux à présence (option 2). */
export const SOCIAL_PRESENCE_MAPS: readonly string[] = [
    "yellow_entrance", "yellow_cendreville", "yellow_zone_combat",
    "yellow_infirmary", "yellow_infirmary_2e", "yellow_shop", "yellow_sbire",
]
/** Intérieurs partagés par les deux villes : un canal par ville (cf. gameStore.interiorReturn). */
const SHARED_INTERIORS: readonly string[] = ["yellow_infirmary", "yellow_infirmary_2e", "yellow_shop"]
const CITIES: readonly string[] = ["yellow_entrance", "yellow_cendreville"]

/** Préfixe des canaux de présence par carte (≠ yellow_casino / yellow_autel / yellow_nexus, partagés avec d'autres hooks). */
export const MAP_PRESENCE_PREFIX = "yellow_p_"
const short = (mapId: string) => mapId.replace(/^yellow_/, "")

/** Canal de présence de la carte où se tient le joueur, ou null si on n'y voit personne.
 *  `interiorCity` = la ville d'entrée d'un intérieur partagé (interiorReturn.mapId) ; inconnue → Ville Jaune. */
export function presenceChannelFor(mapId: string, interiorCity?: string | null): string | null {
    if (mapId === "yellow_casino") return "yellow_casino"
    if (mapId === "yellow_combat_autel") return "yellow_autel"
    if (!SOCIAL_PRESENCE_MAPS.includes(mapId)) return null
    if (SHARED_INTERIORS.includes(mapId)) {
        const city = interiorCity && CITIES.includes(interiorCity) ? interiorCity : "yellow_entrance"
        return `${MAP_PRESENCE_PREFIX}${short(mapId)}@${short(city)}`
    }
    return `${MAP_PRESENCE_PREFIX}${short(mapId)}`
}

/** Tous les canaux de présence par carte possibles (liste blanche exacte de la route de relai). */
export const MAP_PRESENCE_CHANNELS: ReadonlySet<string> = new Set(
    SOCIAL_PRESENCE_MAPS.flatMap((m) => (SHARED_INTERIORS.includes(m) ? CITIES.map((c) => presenceChannelFor(m, c)) : [presenceChannelFor(m)]))
        .filter((c): c is string => !!c),
)

/** Un canal de présence PAR CARTE (n'accepte que les messages de présence, se désabonne en quittant la carte). */
export function isMapPresenceChannel(ch: string): boolean {
    return MAP_PRESENCE_CHANNELS.has(ch)
}
