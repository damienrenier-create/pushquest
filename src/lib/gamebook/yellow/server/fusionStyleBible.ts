// src/lib/gamebook/yellow/server/fusionStyleBible.ts
//
// BIBLE DE STYLE (v2) du générateur de sprites de fusion. Dérivée des VRAIES chimères faites main de Sartay
// (dracorex, pyromaree, aquilwatt…) : pixel art DÉTAILLÉ et haute résolution — PAS du 32×32. Modifie librement
// STYLE_BIBLE (le rendu voulu) et STYLE_ANCHORS (chemins des sprites de référence). ⚠️ Si tu changes la bible,
// pense à bumper PROMPT_VERSION dans fusionSpriteGen.ts pour distinguer les générations.

/** Ancres de style : CHEMINS (relatifs à public/yellow/sprites/dex/) de sprites existants au rendu représentatif.
 *  Le générateur FETCH le sprite ORIGINAL et le normalise à la volée pour servir de référence de RENDU (pas de contenu).
 *  Ici = 3 chimères faites main, silhouettes + palettes variées (dragon / félin feu-glace / oiseau élec). */
export const STYLE_ANCHORS: string[] = [
    "fusion/dracorex.png",   // dragon quadrupède ailé — terreux/feu
    "fusion/pyromaree.png",  // félin — feu + glace (contraste chaud/froid)
    "fusion/aquilwatt.png",  // aviaire/griffon — élec/vol (bleu-or)
]

export const STYLE_BIBLE = `Tu génères le sprite d'une créature « Daemon » (fakemon) dans le STYLE MAISON de PushQuest.
STYLE : pixel art DÉTAILLÉ et haute résolution (PAS du 8/16-bit grossier, PAS du 32×32). Contours francs et nets,
pixels assumés, AUCUN lissage / flou / anti-aliasing sur les bords. Rendu riche : volumes travaillés, ombrage
marqué, reflets et effets élémentaires (lueur, lave, givre, éclairs, écume…) cohérents avec les types.
Palette colorée mais MAÎTRISÉE et lisible, dominée par les couleurs des types.
CADRAGE : créature ENTIÈRE, centrée, vue de 3/4, occupant ~85% du cadre, posture dynamique.
FOND : 100% TRANSPARENT. Aucun texte, watermark visible, cadre, bordure, décor, ni ombre portée au sol.
FUSION : UNE seule créature cohérente (JAMAIS un collage ni un split-screen). Gabarit/silhouette DOMINÉS par le
parent A ; couleurs et éléments distinctifs du parent B intégrés naturellement dans cette silhouette.
RÉFÉRENCES : imite le NIVEAU DE DÉTAIL, le grain de pixel et la finition des images d'ancrage de style fournies —
sans copier leur contenu.`
