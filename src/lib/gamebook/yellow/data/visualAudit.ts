// src/lib/gamebook/yellow/data/visualAudit.ts
//
// GARDE-FOU « PLUS JAMAIS DE MISSINGNO » (22/10/2026, après « Caros », la némésis de Kingme : espèce introuvable après
// rechargement, placeholder MissingNo, aucune fiche). Pour UNE save, vérifie que chaque Daemon POSSÉDÉ (équipe + PC, dans
// tous les mondes) se résout en une espèce connue avec un VRAI sprite. Les espèces sont reconstruites comme le fait le
// jeu au chargement : espèces officielles, permanentes hors-Dex, fiches de la Ligue de Fusion, créations du joueur et
// leurs anciennes némésis. Un sprite GÉNÉRÉ et prêt (table FusionSprite, `generatedReady`) compte comme un vrai sprite.
// Module PUR → testé (visualAudit.test.ts) et appelé par le dashboard admin, qui ALERTE Sartay dès qu'un cas apparaît.

import type { SpeciesData } from "../battle/types"
import { getSpecies, PERMANENT_OFF_DEX_SPECIES } from "./species"
import { leagueFusionSpecies } from "./leagueFusionDex"
import { buildCustomSpecies, buildNemesis, type StoredCustomDaemon } from "../create/customSpecies"

export interface VisualProblem { speciesId: string; name: string; where: string; reason: "espèce introuvable" | "sans sprite" }

export const isPlaceholderSprite = (sprite?: string | null): boolean => !sprite || sprite.includes("missingno")

/** Espèces que le jeu sait construire pour CETTE save (en plus des espèces officielles). */
export function saveSpeciesMap(flags: unknown): Map<string, SpeciesData> {
    const map = new Map<string, SpeciesData>()
    for (const s of [...PERMANENT_OFF_DEX_SPECIES, ...leagueFusionSpecies()]) map.set(s.id, s)
    const customs = ((flags as { customDaemons?: StoredCustomDaemon[] } | null)?.customDaemons ?? [])
    for (const d of customs) {
        try { for (const s of buildCustomSpecies(d.spec, d.ownerId)) map.set(s.id, s) } catch { /* création corrompue : signalée via ses Daemons */ }
        try { for (const s of buildCustomSpecies(buildNemesis(d.spec), `nem_${d.ownerId}`)) map.set(s.id, s) } catch { /* idem */ }
    }
    return map
}

/** Problèmes d'affichage de la save : Daemons dont l'espèce est introuvable, ou sans vrai sprite. Dédupliqués. */
export function auditSaveVisuals(flags: unknown, generatedReady: ReadonlySet<string> = new Set()): VisualProblem[] {
    const f = (flags ?? {}) as Record<string, unknown>
    const local = saveSpeciesMap(flags)
    const resolve = (id: string): SpeciesData | null => local.get(id) ?? getSpecies(id)
    const worlds: [string, unknown][] = [["run 1", f], ["run 2", f.ngplusWorld], ["run 3", f.run3World], ["rejeu", f.replayWorld]]
    const out: VisualProblem[] = []
    const seen = new Set<string>()
    for (const [world, w] of worlds) {
        if (!w || typeof w !== "object") continue
        for (const [box, list] of [["équipe", (w as { team?: unknown }).team], ["PC", (w as { pc?: unknown }).pc]] as const) {
            if (!Array.isArray(list)) continue
            for (const m of list) {
                const id = (m as { speciesId?: unknown } | null)?.speciesId
                if (typeof id !== "string" || !id) continue
                const where = `${world}, ${box}`
                const key = `${id}|${where}`
                if (seen.has(key)) continue
                const sp = resolve(id)
                if (!sp) { seen.add(key); out.push({ speciesId: id, name: id, where, reason: "espèce introuvable" }); continue }
                if (isPlaceholderSprite(sp.sprite) && !generatedReady.has(id)) { seen.add(key); out.push({ speciesId: id, name: sp.name, where, reason: "sans sprite" }) }
            }
        }
    }
    return out
}

/** Ids d'espèces ayant un sprite GÉNÉRÉ prêt, depuis les clés de la table FusionSprite (`fusevo:<id>`, `custom:<id>`). */
export function generatedReadyIds(pairKeys: readonly string[]): Set<string> {
    const out = new Set<string>()
    for (const k of pairKeys) {
        const m = /^(?:fusevo|custom):(.+)$/.exec(k)
        if (m) out.add(m[1])
    }
    return out
}
