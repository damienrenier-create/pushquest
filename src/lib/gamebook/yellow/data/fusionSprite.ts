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

// ─────────── QUELS SPRITES MAISON EXISTENT VRAIMENT ───────────
//
// ⚠️ `fusionSpritePath()` FABRIQUE un chemin : il ne dit pas si le fichier est là. Le code des équipes curées
// faisait `p.sprite ?? fusionSpritePath(p.name)` — donc TOUJOURS une valeur — et court-circuitait la suite de
// la chaîne de résolution de buildFusion (`opts.sprite ?? généré ?? MissingNo`). Résultat : une fusion sans
// PNG maison pointait vers une image inexistante, et le SPRITE GÉNÉRÉ (Vercel Blob), pourtant demandé et
// parfois déjà prêt, n'était JAMAIS consulté. C'est ce qui laissait les 5 chimères d'ACE en composite.
//
// Cette liste est le reflet EXACT du dossier public/yellow/sprites/dex/fusion (vérifié par un test qui relit
// le disque). Y ajouter un PNG ? Le test échouera tant que le nom n'est pas ici — c'est voulu : mieux vaut
// un test rouge qu'un sprite silencieusement ignoré.
export const HOUSE_FUSION_SLUGS: ReadonlySet<string> = new Set([
    "abyssathonn", "alicocci", "aquendofy", "aquidruide", "aquilathonn", "aquilwatt", "aquizenc", "archibrook",
    "aurobyd", "bouhdruide", "cerforem", "chronobyd", "chronosidhe", "coccikara", "condozenc", "cryotony",
    "cryoviathan", "divinaquil", "divinliane", "dracakoss", "dracarnarque", "dracolithe", "draconroc", "dracorex",
    "druidumaro", "flamaree", "gamabunta", "geckang", "geckombre", "glacyran", "gloutamaki", "gloutante",
    "goshendarque", "hebultaure", "hippofer", "imperafer", "jerbibouh", "kangonarque", "karabouh", "karmindz",
    "lunagron", "lunarwatt", "magnebrir", "magnepanthe", "maitreclume", "maitrelmin", "megasylve", "merodead",
    "merokara", "merolopendre", "merotony", "merovortal", "morcaline", "morrinpate", "mycecorbe", "naianoir",
    "necrozeus", "omnantaur", "orochitachi", "panthyeti", "pyromaree", "pyrovolt", "regnadruide", "rocholithe",
    "rockator", "shadopanthe", "shadowatt", "supacorbe", "sylvaroc", "tenepanthe", "thundaloup", "thundebre",
    "tonyront", "ukognofy", "ukoviathonn", "vipecan", "zappadrak",
])

/** Chemin du sprite MAISON d'une fusion, ou `undefined` s'il n'y en a pas — auquel cas l'appelant doit
 *  laisser buildFusion résoudre (sprite GÉNÉRÉ, puis placeholder). Ne jamais remplacer par fusionSpritePath :
 *  c'est exactement le raccourci qui masquait les sprites générés. */
export function houseFusionSpritePath(name: string): string | undefined {
    return HOUSE_FUSION_SLUGS.has(fusionSlug(name)) ? fusionSpritePath(name) : undefined
}
