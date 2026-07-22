// src/lib/gamebook/yellow/data/fusionSprite.ts
//
// Chemins de sprite des fusions — module PUR (aucune dépendance) pour éviter les cycles d'import.
// Convention : le PNG d'une fusion OFFICIELLE vit dans public/yellow/sprites/dex/fusion/<slug>.png,
// où <slug> = le nom de la fusion en minuscules SANS accents (Panthyéti→panthyeti, Mégasylve→megasylve…).
// Une fusion SANS sprite dédié (combo joueur non-officiel) retombe sur MissingNo.

/** Nom → slug de fichier : minuscules, accents retirés (NFD), non-alphanum → rien. */
export function fusionSlug(name: string): string {
    return name
        .normalize("NFD").replace(/[̀-ͯ]/g, "") // retire les accents combinants (é→e, î→i, à→a…)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "")
}

/** Chemin du sprite dédié d'une fusion (existe pour les 27 fusions curées + variantes câblées). */
export function fusionSpritePath(name: string): string {
    return `/yellow/sprites/dex/fusion/${fusionSlug(name)}.png`
}

/** Sprite de repli quand une fusion n'a PAS de sprite dédié (règle Sartay : sinon → MissingNo). */
export const MISSINGNO_SPRITE = "/yellow/sprites/dex/missingno.png"
