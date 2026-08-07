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
STYLE — VRAI PIXEL ART, c'est le point le PLUS IMPORTANT : l'image DOIT être du pixel art authentique, composée de
PIXELS CARRÉS VISIBLES alignés sur une grille nette. PAS une illustration numérique, PAS une peinture digitale, PAS
un rendu 3D/vectoriel, PAS de style « airbrush » lissé. Pixel art DÉTAILLÉ et haute résolution façon RPG rétro
GBA/NDS (monstres de type Pokémon), mais PAS du 8/16-bit grossier ni du 32×32 : beaucoup de pixels, très détaillé.
RÈGLES DURES : contour net et sombre de 1 pixel (style « cel »), bords en ESCALIER de pixels francs, AUCUN lissage /
flou / anti-aliasing / dégradé lissé. L'ombrage et les volumes se font par BANDES de couleurs distinctes et par
DITHERING (motifs de pixels en damier) — JAMAIS par fondu/blur continu. Chaque pixel est assumé et visible.
Rendu riche malgré tout : volumes travaillés, ombrage marqué, reflets et effets élémentaires (lueur, lave, givre,
éclairs, écume…) cohérents avec les types, rendus EN PIXELS.
Palette colorée mais MAÎTRISÉE et lisible (nombre LIMITÉ de teintes par couleur, façon indexée), dominée par les couleurs des types.
CADRAGE : créature ENTIÈRE, centrée, vue de 3/4, occupant ~85% du cadre, posture dynamique.
FOND : une seule couleur UNIE et VIVE, MAGENTA pur (#FF00FF), remplissant tout l'arrière-plan (il sera détouré automatiquement). Aucun texte, watermark, cadre, bordure, décor, ni ombre portée au sol. Le sujet ne contient PAS de magenta pur.
FUSION : UNE seule créature cohérente (JAMAIS un collage ni un split-screen). Gabarit/silhouette DOMINÉS par le
parent A ; couleurs et éléments distinctifs du parent B intégrés naturellement dans cette silhouette.
RÉFÉRENCES : imite le NIVEAU DE DÉTAIL, le GRAIN DE PIXEL (grille visible, dithering) et la finition pixel art des
images d'ancrage de style fournies — sans copier leur contenu.`
