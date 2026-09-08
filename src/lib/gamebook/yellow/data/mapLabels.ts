// src/lib/gamebook/yellow/data/mapLabels.ts
//
// Libellé lisible d'une zone à partir de son mapId (pour le filtre « par zone » du journal des messages, etc.).
// Curaté pour les cartes principales ; repli = joli formatage du mapId (retire le préfixe « yellow_ », remplace les
// « _ » par des espaces, capitalise). Pur, sans dépendance (pas de cycle avec maps.ts).

const MAP_LABELS: Record<string, string> = {
    yellow_entrance: "Ville Jaune",
    yellow_route_nord: "Route Nord",
    yellow_grotte: "Grotte Rocheuse",
    yellow_grotte_gelee: "Grotte Gelée",
    yellow_plage: "Plage",
    yellow_centrale: "Centrale",
    yellow_maison_hantee: "Maison Hantée",
    yellow_cendreville: "Cendreville",
    yellow_ile_emeraude: "Île Émeraude",
    yellow_infirmary: "Centre Pokémon",
    yellow_arena: "Arène (Plante)",
    yellow_arena_roche: "Arène Roche",
    yellow_arena_feu: "Arène Feu",
    yellow_arena_elec: "Arène Élec",
    yellow_arena_eau: "Arène Eau",
    yellow_grotte_nexus: "Grotte du Nexus (1F)",
    yellow_grotte_nexus_b1f: "Grotte du Nexus (B1F)",
    yellow_grotte_nexus_b2f: "Grotte du Nexus (B2F)",
    yellow_dome: "Zone de Combat",
    yellow_sbire: "Chapelle de Nouillon",
}

/** Repli : « yellow_route_nord » → « Route Nord ». */
function prettify(mapId: string): string {
    const base = mapId.replace(/^yellow_/, "").replace(/_/g, " ").trim()
    if (!base) return mapId
    return base.split(" ").map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(" ")
}

/** Libellé lisible d'une zone (mapId). Repli sur un joli formatage si la carte n'est pas curée. */
export function mapLabel(mapId: string): string {
    return MAP_LABELS[mapId] ?? prettify(mapId)
}
