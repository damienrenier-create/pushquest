// src/lib/gamebook/yellow/data/shinyFx.ts
//
// Effet visuel « CHROMATIQUE » (shiny) — PARTAGÉ par tous les rendus (HUD de combat, fiche, écran de capture)
// pour rester COHÉRENT partout. Choix de design : PAS de hue-rotate (l'ancien effet faisait pivoter TOUTES les
// teintes → un Daemon jaune comme Thundah virait au vert). On garde donc les VRAIES couleurs du Daemon et on
// signale le shiny par un HALO DORÉ double (proche = crème, large = or) + un léger boost de saturation/luminosité
// (« un peu plus que parfait »). Les ✨ scintillantes complètent l'effet.

/** Filtre CSS appliqué au sprite d'un Daemon shiny (aura dorée, sans recolorer l'image). */
export const SHINY_FILTER =
    "brightness(1.12) saturate(1.35) drop-shadow(0 0 3px #fff2a8) drop-shadow(0 0 8px rgba(255,196,60,0.75))"
