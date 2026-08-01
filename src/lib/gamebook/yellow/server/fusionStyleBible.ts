// src/lib/gamebook/yellow/server/fusionStyleBible.ts
//
// BIBLE DE STYLE (v1) du générateur de sprites de fusion. FICHIER TEXTE À AFFINER PAR SARTAY — modifie librement
// STYLE_BIBLE (le ton/rendu voulu) et STYLE_ANCHORS (2-3 speciesId de sprites existants qui incarnent le mieux
// le style maison). Changer la bible → penser à bumper `promptVersion` dans le générateur pour distinguer les
// générations. ⚠️ v1 = brouillon déduit des sprites existants, À VALIDER par Sartay avant d'activer la génération.

/** Ancrages de style : 2 à 3 speciesId dont les sprites `_norm` servent de référence de rendu au modèle. À REMPLIR. */
export const STYLE_ANCHORS: string[] = [
    // ex. "draconarque", "regnantaur", "mycedruide" — mets ici 2-3 Daemons FINALS au rendu représentatif.
]

export const STYLE_BIBLE = `Tu génères le sprite d'une créature « Daemon » pour un jeu type Pokémon Gen-1/3.
STYLE MAISON : illustration de créature façon sprite de Pokédex, couleurs franches et lisibles, contour net,
volumes simples, rendu peint-numérique propre (ni photo, ni 3D réaliste, ni cel-shading extrême).
Cadrage : sujet ENTIER, centré, occupant ~80% du cadre, vu de 3/4 face.
Interdits ABSOLUS : fond (doit être 100% transparent), texte, watermark visible, cadre/bordure, ombre portée au sol,
collage/split-screen, deux créatures distinctes. Le résultat est UNE seule créature cohérente, pas un assemblage.`
