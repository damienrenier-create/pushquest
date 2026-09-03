// src/lib/gamebook/yellow/data/dexMensurations.ts
//
// Nexus Jaune Éclair — MENSURATIONS DYNAMIQUES (taille & poids) dérivées des IV d'un individu.
// Chaque espèce définit une FOURCHETTE logique de taille (m) et de poids (kg). La valeur RÉELLE d'un Daemon
// capturé est calculée à la volée depuis ses IV (aucun stockage save → zéro risque). Mécanique fun :
//   • TAILLE  ∝ moyenne des IV  → un grand spécimen est (presque toujours) un très bon spécimen.
//   • POIDS   = LE TWIST tactique, selon l'archétype (dérivé des stats de base) :
//        - archétype PHYSIQUE (tanks/cogneurs : PV+Atk+Déf dominants) → plus les IV(PV,Atk,Déf) sont hauts,
//          plus la bête est LOURDE (montagne de muscle/armure).
//        - archétype RAPIDE/SPÉCIAL (mages/vitesse : Vit+Spé dominants) → plus les IV(Vit,Spé) sont hauts,
//          plus la bête est LÉGÈRE (énergie pure, aérodynamique, pas un gramme de trop).
// Échelle globale : ~10 cm (minuscules) à ~20 m, exceptions jusqu'à ~50 m (colosses / dragons légendaires).
// Le champ `quip` = petit commentaire comique / comparaison (objet réel ou autre créature), affiché en fiche.
// Purement éditorial + calcul pur → JAMAIS lu par le moteur de combat.

import type { StatKey } from "../battle/types"

export interface DexSize {
    /** Fourchette de TAILLE en MÈTRES [min, max]. */
    size: [number, number]
    /** Fourchette de POIDS en KILOS [min, max]. */
    weight: [number, number]
    /** Commentaire comique / comparaison affiché dans la fiche. */
    quip: string
    /** Sens du POIDS quand la donnée éditoriale prime sur les stats de base (ex. un speedster à haute Atk qui devrait
     *  quand même être « léger »). Absent → dérivé des stats de base (isPhysicalWeight). */
    weightMode?: "physical" | "special"
}

// ⚠️ Rempli par lots (fourchettes cohérentes avec la nature de chaque bête). Espèce absente → pas de mensurations affichées.
export const DEX_SIZE: Record<string, DexSize> = {
    // ── LOT 0 — ÉCHANTILLON DE VALIDATION (8 espèces) ──
    feuillichot: { size: [0.20, 0.35], weight: [1.5, 4], quip: "À peine plus lourd qu'un chou pommé — et deux fois plus susceptible." },
    couperin: { size: [0.35, 0.55], weight: [4, 8], quip: "La taille d'un chat, l'ego d'un champion poids lourd." },
    glaceer: { size: [0.85, 1.25], weight: [22, 42], quip: "Un husky tout ce qu'il y a de plus normal… jusqu'à ce qu'il se couche sur vos pieds et les congèle." },
    ombrapanthe: { size: [1.10, 1.60], weight: [38, 70], weightMode: "special", quip: "Grande comme une vraie panthère, mais si légère qu'elle ne fait plier ni l'herbe ni les alarmes." },
    pyrozly: { size: [2.2, 3.0], weight: [260, 450], quip: "Pèse le poids d'un petit piano — un petit piano qui grogne et prend feu." },
    guizer: { size: [0.40, 0.70], weight: [8, 18], quip: "Format peluche de bain, humeur de vieux loup de mer." },
    megamonarx: { size: [15, 22], weight: [9000, 16000], quip: "Plus haut qu'un immeuble de sept étages ; ne rentre ni dans un Pokédex, ni dans un canton." },
    mottelave: { size: [0.35, 0.60], weight: [40, 90], quip: "Petit comme un ballon de plage, lourd comme une enclume. Ne jamais le laisser tomber sur son pied." },

    // ── LOTS 1-2 — bestiaire complet (236 espèces) ──
    // 002 · Broubouc (PLANTE)
    broutame: { size: [0.65, 0.95], weight: [14, 27], quip: "Pèse autant qu'un jeune labrador, sauf qu'il porte sa propre salade en écharpe et rumine sa mauvaise humeur." },
    // 003 · Cerfeuillu (PLANTE)
    sylvapuce: { size: [1.7, 2.15], weight: [140, 235], quip: "Un cerf si digne qu'il trimballe un bouquet de mariée à l'année — pour le poids d'un frigo américain bien rempli." },
    // 004 · Gouttiny (EAU)
    gouttiny: { size: [0.12, 0.28], weight: [0.8, 3], quip: "Plus léger qu'une bouteille d'eau et deux fois plus trouillard : un simple remous et il file se planquer sous un galet." },
    // 005 · Ondulo (EAU)
    ondulo: { size: [0.8, 1.15], weight: [14, 28], quip: "Un triton hérissé qui pèse comme un gros chien mouillé — et qui pique bien plus quand on le ramasse." },
    // 006 · Razmarée (EAU)
    razmaree: { size: [1.5, 2.2], weight: [160, 320], quip: "Roulé en boule, on dirait un oursin de la taille d'un canapé : à éviter absolument comme siège d'appoint." },
    // 007 · Braisille (FEU)
    braisille: { size: [0.4, 0.62], weight: [5, 9], weightMode: "special", quip: "Léger comme un chat de gouttière, sauf que sa queue met le feu au canapé dès qu'il s'excite." },
    // 008 · Flamkure (FEU)
    flamkure: { size: [0.9, 1.3], weight: [28, 55], weightMode: "special", quip: "File plus vite qu'un scooter et laisse derrière lui une nette odeur de barbecue." },
    // 009 · Pyrokoss (FEU)
    pyrokoss: { size: [1.8, 2.5], weight: [160, 290], weightMode: "special", quip: "Un lion de la taille d'un cheval avec un volcan en guise de crinière : ne surtout pas caresser dans le sens du poil." },
    // 010 · Plumiot (NORMAL/VOL)
    plumiot: { size: [0.2, 0.38], weight: [0.4, 1.5], weightMode: "special", quip: "Une boule de duvet à peine plus lourde qu'un croissant, joyau du front compris." },
    // 011 · Faukon (NORMAL/VOL)
    faukon: { size: [0.5, 0.8], weight: [1.2, 3.5], weightMode: "special", quip: "Léger comme un ballon de foot, mais il fond du ciel plus vite qu'un livreur en retard." },
    // 012 · Aquilothan (NORMAL/VOL)
    aquilothan: { size: [1.1, 1.9], weight: [7, 16], weightMode: "special", quip: "Roi des cieux à l'envergure d'aile-delta, mais il pèse à peine plus qu'un gros matou : tout est dans les plumes." },
    // 013 · Cailloutchi (ROCHE/SOL)
    cailloutchi: { size: [0.4, 0.7], weight: [30, 55], quip: "Un tas de galets qui se prend pour une chèvre : lourd comme une brouette pleine, véloce comme un menhir." },
    // 014 · Roctaur (ROCHE/SOL)
    roctaur: { size: [1.2, 1.7], weight: [240, 420], quip: "Un bélier de ferme pèse cent kilos ; celui-ci, taillé dans le muret du potager, en fait quatre fois plus et ne demande jamais la permission d'enfoncer le portail." },
    // 015 · Rochison (ROCHE/SOL)
    rochison: { size: [2.4, 3.2], weight: [1400, 2600], quip: "Un bison des plaines pèse déjà une tonne ; empilez-lui des dalles sur l'échine et il vous faudra un pont autoroutier rien que pour le laisser traverser." },
    // 017 · Frappard (COMBAT)
    frappard: { size: [0.9, 1.25], weight: [16, 30], weightMode: "special", quip: "Frappe comme un poids lourd mais pèse comme un poids plume : un fennec qui a clairement vu trop de films d'arts martiaux." },
    // 018 · Maîtrezenc (COMBAT)
    maitrezenc: { size: [1.15, 1.55], weight: [28, 46], weightMode: "special", quip: "Combat les yeux fermés et pèse à peine plus qu'un gros sac de riz : l'illumination, visiblement, ça ne fait pas prendre un gramme." },
    // 019 · Électroatiss (ELEC)
    electroatiss: { size: [0.4, 0.6], weight: [3, 7], weightMode: "special", quip: "Un coati ordinaire fouille les poubelles ; celui-ci les fait d'abord disjoncter, puis repart avec le grille-pain." },
    // 020 · Couranti (ELEC)
    couranti: { size: [0.8, 1.1], weight: [12, 24], weightMode: "special", quip: "Léger comme un chat mais nerveux comme une multiprise en surcharge : à ne surtout pas caresser à rebrousse-poil." },
    // 021 · Zappeuréal (ELEC)
    zappeureal: { size: [1.1, 1.5], weight: [26, 46], weightMode: "special", quip: "Se déplace plus vite que le tonnerre qui le suit et arrive systématiquement avant sa propre facture d'électricité." },
    // 022 · Auroruff (GLACE)
    auroruff: { size: [0.4, 0.65], weight: [8, 18], quip: "Un chiot husky vous fait déjà fondre le cœur ; celui-ci vous gèle les orteils dans la même léchouille." },
    // 024 · Auroraur (GLACE)
    auroraur: { size: [1.3, 1.85], weight: [55, 95], quip: "Un loup arctique pèse déjà soixante kilos ; ajoutez-lui une armure de givre et une crinière de cristaux, et prévoyez le traîneau." },
    // 025 · Ruffiant (INSECTE)
    ruffiant: { size: [0.2, 0.4], weight: [2, 5], quip: "Grignote en un jour plus de feuilles qu'une chèvre en une semaine, et ne s'en plaint jamais : l'employé du mois, tous les mois." },
    // 026 · Formiguer (INSECTE)
    formiguer: { size: [0.85, 1.2], weight: [18, 34], quip: "Plus disciplinée qu'un régiment entier et deux fois mieux blindée : même le paillasson se met au garde-à-vous quand elle monte la garde." },
    // 027 · Regnantaur (INSECTE/PSY)
    regnantaur: { size: [1.3, 1.8], weight: [30, 55], weightMode: "special", quip: "Dirige toute une colonie rien qu'en y pensant, tout en portant une robe de cour lestée d'œufs d'ambre : le multitâche à l'état royal." },
    // 028 · Lavapetit (ROCHE/FEU)
    lavapetit: { size: [0.25, 0.45], weight: [8, 18], quip: "À peine plus gros qu'un pavé de basalte, mais bien plus chaud à ramasser — et deux fois plus feignant." },
    // 029 · Fissuralave (ROCHE/FEU)
    fissuralave: { size: [2, 2.8], weight: [260, 460], quip: "Un four à pizza ambulant qui pèse le poids d'un menhir et ronronne quand il a chaud." },
    // 030 · Magmator (ROCHE/FEU)
    magmator: { size: [3.6, 5], weight: [700, 1300], quip: "Il trimballe son propre volcan de poche sur l'épaule — préviens les pompiers avant de lui serrer la main." },
    // 031 · Nouillon (PSY)
    nouillon: { size: [0.3, 0.5], weight: [2, 5], weightMode: "special", quip: "Une assiette de spaghettis qui a pris conscience d'elle-même — et refuse catégoriquement la fourchette." },
    // 032 · Vermisaint (PSY)
    vermisaint: { size: [0.6, 1], weight: [5, 12], weightMode: "special", quip: "Des nouilles télékinésistes qui jonglent avec des cailloux : le stress d'un chef pâtissier en pleine crise existentielle." },
    // 033 · Divinpâte (PSY)
    divinpate: { size: [1.5, 2.2], weight: [13, 30], weightMode: "special", quip: "Un plat de pâtes divinisé qui plane au-dessus du commun des mortels — on n'ose même plus l'assaisonner." },
    // 034 · Piouflot (VOL/EAU)
    piouflot: { size: [0.2, 0.35], weight: [0.3, 1], weightMode: "special", quip: "Une houppette de plumes qui pèse moins qu'un oreiller et vous emboîte le pas en pépiant." },
    // 035 · Hérondée (VOL/EAU)
    herondee: { size: [1, 1.4], weight: [2, 4.5], weightMode: "special", quip: "Grande comme un parapluie déplié, mais si légère qu'une brise la ferait décoller — au grand dam des poissons." },
    // 036 · Oragron (VOL/ELEC)
    oragron: { size: [1.6, 2.2], weight: [8, 18], weightMode: "special", quip: "Une cigogne d'orage qui livre la foudre au lieu des bébés — signez vite avant qu'elle reparte." },
    // 037 · Broussours (COMBAT/PLANTE)
    broussours: { size: [0.7, 1.1], weight: [20, 45], quip: "Un ourson qui a roulé dans un buisson et refuse d'en sortir, grognon comme un réveil un lundi." },
    // 038 · Sylvours (COMBAT/PLANTE)
    sylvours: { size: [1.8, 2.5], weight: [150, 300], quip: "Un grizzly qui a fait un câlin à un vieux chêne et ne s'en est jamais vraiment remis." },
    // 039 · Druidours (COMBAT/PLANTE)
    druidours: { size: [2.6, 3.6], weight: [360, 650], quip: "Un ours qui a avalé une forêt entière — et fait désormais la loi dessus, pavois de bois compris." },
    // 040 · Pampousse (PLANTE)
    pampousse: { size: [0.3, 0.45], weight: [3.5, 7], quip: "Aussi rondelet qu'un chou de Bruxelles à pattes, et tout aussi pressé de retourner faire la sieste au soleil." },
    // 041 · Féliane (PLANTE)
    feliane: { size: [0.75, 1.05], weight: [11, 19], weightMode: "special", quip: "Un ocelot qui aurait poussé au potager — se déplace sans un bruit, mais laisse tomber sa cerise à chaque bond." },
    // 042 · Silviliane (PLANTE)
    cerfeuillu: { size: [1.8, 2.4], weight: [130, 240], quip: "Un cerf royal haut comme une porte cochère, avec une haie fleurie greffée sur le dos et l'humeur d'un vieux propriétaire terrien." },
    // 043 · Loutrille (EAU)
    loutrille: { size: [0.4, 0.6], weight: [3, 6.5], weightMode: "special", quip: "Une loutre de poche qui dort en vous tenant la main — ne confondez pas l'attendrissement avec une prise de judo." },
    // 044 · Ondaloutre (EAU)
    ondaloutre: { size: [0.9, 1.25], weight: [12, 22], weightMode: "special", quip: "Une torpille à moustaches : file plus vite dans l'eau qu'un gamin sur un toboggan mouillé." },
    // 045 · Naïadrak (EAU)
    naiadrak: { size: [1.8, 2.6], weight: [42, 78], weightMode: "special", quip: "Un cerf de cristal liquide dont la queue-cascade pèse bien moins qu'elle n'en a l'air — sublime, jusqu'à ce qu'on lui marche sur la traîne." },
    // 046 · Fennaise (FEU)
    fennaise: { size: [0.35, 0.55], weight: [3, 6], weightMode: "special", quip: "Deux oreilles de radar montées sur un renardeau — capte le froissement d'un biscuit à trois kilomètres." },
    // 047 · Pyrenard (FEU)
    pyrenard: { size: [0.75, 1.05], weight: [12, 20], weightMode: "special", quip: "Un renard qui court si vite que sa queue prend feu par friction — enfin, presque." },
    // 048 · Loupyre (FEU)
    loupyre: { size: [1.3, 1.8], weight: [55, 95], quip: "Un loup bâti comme un poêle à bois — armure de charbon comprise, mais lui, il chauffe même éteint." },
    // 049 · Forgeotin (COMBAT)
    forgeotin: { size: [0.6, 0.9], weight: [9, 17], quip: "Un ouistiti qui trimballe son marteau comme un doudou — méfiez-vous des doigts, il vise encore de travers." },
    // 050 · Marteloutan (COMBAT)
    marteloutan: { size: [1.4, 1.9], weight: [60, 100], quip: "Un forgeron velu qui confond enclume et punching-ball, et cogne des deux du crépuscule à l'aube." },
    // 051 · Enclumind (COMBAT/PSY)
    enclumind: { size: [2, 2.8], weight: [180, 320], quip: "Un gorille en armure d'enclume qui médite entre deux coups de masse : il pense lentement mais frappe comme une avalanche." },
    // 052 · Trolystrik (COMBAT/ELEC)
    trolystrik: { size: [0.6, 0.9], weight: [14, 24], quip: "Un nain de jardin qui aurait pris des cours de boxe et jeté le chapeau pointu." },
    // 053 · Brutetrik (COMBAT/ELEC)
    brutetrik: { size: [1.35, 1.75], weight: [55, 90], quip: "Sa masse de pierre pèse déjà une enclume ; le troll accroché au manche, n'en parlons pas." },
    // 054 · Hébulmin (COMBAT/ELEC)
    hebulmin: { size: [2.1, 2.7], weight: [180, 310], quip: "Quand il se redresse, même les balances font semblant de n'avoir rien vu." },
    // 055 · Draclet (VOL/DRAGON)
    draclet: { size: [0.5, 0.8], weight: [6, 14], weightMode: "special", quip: "Un dragon de la taille d'un gros chat, persuadé d'avoir l'envergure d'un 747." },
    // 056 · Wyverion (VOL/DRAGON)
    wyverion: { size: [1.5, 2.2], weight: [38, 72], weightMode: "special", quip: "Plus léger qu'il n'en a l'air : tout en ailes, en nerfs et en frime d'adolescent." },
    // 057 · Draconarque (VOL/DRAGON)
    draconarque: { size: [2.6, 3.8], weight: [150, 310], weightMode: "special", quip: "Il plane si haut et si droit qu'on le prendrait pour un cerf-volant royal — un cerf-volant qui vous toise." },
    // 058 · Cornaissant (VOL/POISON)
    cornaissant: { size: [0.15, 0.3], weight: [0.4, 1.4], weightMode: "special", quip: "Pèse moins qu'un œuf à la coque — coquille comprise, qu'il traîne d'ailleurs encore partout." },
    // 059 · Corvenin (VOL/POISON)
    corvenin: { size: [0.45, 0.75], weight: [1.5, 4], weightMode: "special", quip: "Un corbeau ordinaire, sauf qu'il repart avec vos clés avant que vous ayez fini de cligner." },
    // 060 · Nécrocorbe (VOL/POISON)
    necrocorbe: { size: [1.05, 1.55], weight: [8, 18], weightMode: "special", quip: "Grand comme un aigle de mauvais augure ; là où il se pose, les baromètres virent au funeste." },
    // 061 · Sporbéo (SPECTRE/POISON)
    sporbeo: { size: [0.2, 0.4], weight: [1, 3], weightMode: "special", quip: "Un champignon de Paris qui aurait appris à léviter et à faire la tête." },
    // 062 · Lampignon (SPECTRE/POISON)
    lampignon: { size: [0.5, 0.9], weight: [2, 6], weightMode: "special", quip: "Aussi léger qu'une lanterne de papier, et à peu près aussi fiable pour vous ramener chez vous." },
    // 063 · Mycédruide (SPECTRE/POISON)
    mycedruide: { size: [1.4, 2], weight: [28, 55], weightMode: "special", quip: "Vieux comme une souche, sage comme un grimoire, et à peu près aussi pressé qu'un champignon qui pousse." },
    // 064 · Tamanpousse (PLANTE)
    tamanpousse: { size: [0.35, 0.55], weight: [4, 9], quip: "Pèse à peine plus qu'un sac de terreau, et fouille l'humus avec exactement le même enthousiasme." },
    // 065 · Fourmilierre (PLANTE)
    fourmilierre: { size: [1.7, 2.2], weight: [50, 85], quip: "Un tamanoir qui a confondu son dos avec un tronc d'arbre — le lierre est fourni d'office." },
    // 066 · Gloutanoir (PLANTE)
    gloutanoir: { size: [2.6, 3.6], weight: [360, 700], quip: "Une armoire en chêne massif qui aurait pris goût à la sieste — et à votre potager." },
    // 067 · Panthéon (NORMAL)
    pantheon: { size: [0.5, 0.8], weight: [6, 13], quip: "Se prend pour un fauve redoutable, pèse autant qu'un gros chat qui aurait sauté le petit-déj." },
    // 068 · Florapanthe (PLANTE)
    florapanthe: { size: [1.3, 1.85], weight: [44, 80], weightMode: "special", quip: "Une panthère qui a poussé au potager : silencieuse, féline, et certifiée bio." },
    // 069 · Panthégel (GLACE)
    panthegel: { size: [1.3, 1.85], weight: [55, 95], weightMode: "special", quip: "Ronronne à moins quarante degrés et laisse des empreintes qu'on peut mettre dans son verre." },
    // 070 · Pyropanthe (FEU)
    pyropanthe: { size: [1.4, 1.95], weight: [42, 78], quip: "Court si vite que l'herbe qu'il a roussie a déjà refroidi quand vous arrivez." },
    // 072 · Aquapanthe (EAU)
    aquapanthe: { size: [1.4, 1.95], weight: [65, 118], quip: "Une panthère qui a pris l'eau — au sens propre — et n'a jamais pensé à en ressortir." },
    // 073 · Voltapanthe (ELEC)
    voltapanthe: { size: [1.2, 1.65], weight: [30, 55], weightMode: "special", quip: "La version speedée du chat : griffe la prise de courant et repart avant le disjoncteur." },
    // 074 · Rembodo (ROCHE/VOL)
    rembodo: { size: [1, 1.45], weight: [20, 42], weightMode: "special", quip: "Ne vole pas, ne réfléchit pas, mais détale comme s'il avait un loyer en retard." },
    // 075 · Rétroraptor (ROCHE/VOL)
    retroraptor: { size: [1.2, 1.8], weight: [25, 52], weightMode: "special", quip: "Un poulet préhistorique qui n'a lu du manuel du prédateur que le chapitre embuscade." },
    // 076 · Chronorex (ROCHE/VOL)
    chronorex: { size: [4, 6], weight: [460, 950], quip: "Assomme d'un simple revers de patte ; le sol vous prévient de son arrivée trois secondes trop tard." },
    // 077 · Mottoche (ROCHE/SOL)
    mottoche: { size: [0.25, 0.45], weight: [15, 35], quip: "Ressemble à s'y méprendre à un caillou du chemin — jusqu'à ce que le caillou cligne des yeux et vous ignore poliment." },
    // 078 · Dumotte (ROCHE/SOL)
    dumotte: { size: [0.35, 0.55], weight: [30, 60], quip: "Deux cailloux inséparables qui se chamaillent en permanence pour savoir lequel des deux a le droit de faire la sieste." },
    // 079 · Quadroc (ROCHE/SOL)
    quadroc: { size: [0.45, 0.7], weight: [55, 105], quip: "Un empilement de galets qui tient par pur entêtement — un cairn de randonnée doté d'un fichu caractère de cochon." },
    // 080 · Octoroc (ROCHE/SOL)
    octoroc: { size: [0.55, 0.85], weight: [90, 170], quip: "Huit cailloux qui roulent en chœur : imaginez un boulier qui aurait décidé de prendre tout son temps." },
    // 081 · Hexaroc (ROCHE/SOL)
    hexaroc: { size: [0.7, 1.1], weight: [150, 290], quip: "Un tas de gravier qui a pris ses fonctions de muret porteur beaucoup trop au sérieux." },
    // 082 · Diamantine (ROCHE/SOL)
    diamantine: { size: [0.9, 1.4], weight: [250, 460], quip: "Un tas de cailloux pris d'une soudaine ambition : devenir une vitrine de bijouterie." },
    // 083 · Amadiam (ROCHE/SOL)
    amadiam: { size: [1.1, 1.6], weight: [360, 620], quip: "Aussi dur qu'un vrai diamant et à peu près aussi facile à déplacer qu'une banquise." },
    // 084 · Golémini (ROCHE/SOL)
    golemini: { size: [1.2, 1.75], weight: [420, 720], quip: "Un coffre-fort à qui il aurait poussé des bras — et la combinaison, c'est de la patience." },
    // 085 · Mégalithe (ROCHE)
    megalithe: { size: [2.5, 4.5], weight: [2200, 4200], quip: "Plus proche du menhir que de l'animal : on l'a longtemps confondu avec un monument classé." },
    // 086 · Limaroche (ROCHE/PSY)
    limaroche: { size: [0.35, 0.6], weight: [12, 30], quip: "Une limace qui a troqué sa coquille contre un bloc de granit — forcément, ça ne l'aide pas à accélérer." },
    // 087 · Escargyle (ROCHE/PSY)
    escaroche: { size: [0.65, 1.05], weight: [40, 85], quip: "Si lent qu'on a le temps de déchiffrer toutes les runes de sa coquille avant qu'il n'ait changé de pierre." },
    // 088 · Tortoracle (ROCHE/PSY)
    torturoche: { size: [1.3, 1.9], weight: [190, 380], quip: "Aussi vieille et lourde qu'un menhir, elle rend ses oracles à la vitesse exacte où pousse la mousse." },
    // 089 · Marmoterre (ROCHE/GLACE)
    marmoterre: { size: [0.35, 0.55], weight: [8, 16], quip: "Douce en apparence, mais ses galets gelés lui pèsent aux pattes comme deux presse-papiers accrochés à une peluche." },
    // 090 · Iorours (ROCHE/GLACE)
    iorours: { size: [2.2, 2.8], weight: [300, 480], quip: "Un ours polaire qui aurait enfilé une armure de gravier : les câlins sont vivement déconseillés." },
    // 091 · Yétiroche (ROCHE/GLACE)
    yetiroche: { size: [2.5, 3.2], weight: [350, 560], quip: "King Kong version banquise, avec des gants de pierre qui n'ont jamais entendu parler du mot délicatesse." },
    // 092 · Têtardoc (ROCHE/EAU)
    tetardoc: { size: [0.25, 0.45], weight: [2, 6], quip: "Un têtard lesté comme un caillou : il coule bien mieux qu'il ne nage." },
    // 093 · Grenarc (ROCHE/EAU)
    grenarc: { size: [1.1, 1.4], weight: [30, 55], quip: "Robin des Bois en version batracien — il vise juste, mais il sent nettement la vase." },
    // 094 · Crapôtaure (ROCHE/EAU)
    crapotaure: { size: [1.9, 2.5], weight: [120, 220], quip: "Un crapaud bâti comme un catcheur qui aurait troqué le ring pour le tir à l'arc olympique." },
    // 095 · Revemante (INSECTE/SPECTRE)
    revemante: { size: [0.6, 0.9], weight: [1, 4], weightMode: "special", quip: "Aussi grande qu'une raquette de tennis, mais si vaporeuse qu'un simple courant d'air la fait dériver." },
    // 096 · Nécarabée (INSECTE/SPECTRE)
    necarabee: { size: [0.4, 0.7], weight: [3, 8], quip: "Un scarabée-cerf de la taille d'un drone… qui vole à peu près aussi gracieusement qu'un frigo lancé du balcon." },
    // 097 · Nécrolopendre (INSECTE/SPECTRE)
    necrolopendre: { size: [2.5, 4.5], weight: [40, 90], quip: "Longue comme un tuyau d'arrosage, avec bien plus de pattes et infiniment moins d'amis." },
    // 098 · Colibraise (VOL/FEU)
    colibraise: { size: [0.1, 0.18], weight: [0.1, 0.4], quip: "Plus léger qu'une plume et propulsé par sa propre veilleuse : un briquet à ressort qui aurait pris son envol." },
    // 099 · Arardent (VOL/FEU)
    arardent: { size: [0.5, 0.9], weight: [1, 2.5], quip: "Un ara qui a mis le feu à ses propres plumes et continue de jacasser comme si de rien n'était." },
    // 100 · Toucanyon (VOL/FEU)
    toucanyon: { size: [0.6, 1], weight: [1.5, 3.5], quip: "Un toucan dont le bec pèse presque plus lourd que le reste — heureusement qu'il vole plus vite qu'il ne réfléchit." },
    // 101 · Blaziper (PSY/FEU)
    blaziper: { size: [0.5, 0.9], weight: [1.5, 4], weightMode: "special", quip: "Un serpenteau qui écoute aux portes avec des oreilles de chauve-souris et s'éclaire tout seul du bout de la queue — pratique dans les couloirs sombres, catastrophique pour la discrétion." },
    // 102 · Flamaspic (PSY/FEU)
    flamaspic: { size: [1.2, 2], weight: [8, 18], weightMode: "special", quip: "Elle préchauffe la pierre où elle dort comme d'autres préchauffent leur lit — sauf que sa bouillotte crache du feu rien qu'en y pensant." },
    // 103 · Vipember (PSY/FEU)
    vipember: { size: [3.5, 5], weight: [16, 32], weightMode: "special", quip: "Se dresse plus haut qu'un lampadaire pour te toiser, et lit déjà dans ton esprit que tu as très envie de partir." },
    // 104 · Braisécaille (FEU/EAU)
    braisecaille: { size: [0.4, 0.7], weight: [6, 15], quip: "Une tortue qui fume par le toit comme une petite cheminée ambulante : adorable, mais évitez de la laisser somnoler à l'intérieur." },
    // 105 · Caldéront (FEU/EAU)
    calderont: { size: [2.6, 4], weight: [400, 850], quip: "Trimballe un volcan sur le dos et refuse obstinément de bouger : c'est moins un Daemon qu'une île qu'on aurait oublié de reporter sur la carte." },
    // 106 · Brasicow (FEU/COMBAT)
    brasicow: { size: [1.2, 1.6], weight: [50, 90], quip: "Croise les bras et te défie du regard avec le sérieux d'un videur de boîte, pour à peine la carrure d'un ado turbulent." },
    // 107 · Tauricendre (FEU/COMBAT)
    tauricendre: { size: [2.2, 3], weight: [520, 920], quip: "Pèse le poids d'une petite citadine et te charge dans un nuage de cendres — mieux vaut t'écarter avant de compter les cornes." },
    // 109 · Bélunode (EAU/ELEC)
    belunode: { size: [0.6, 1], weight: [20, 45], quip: "Aussi rond qu'un ballon de plage avec une pile qui grésille sur le front : tout mignon, jusqu'au câlin électrique." },
    // 110 · Sonarque (EAU/ELEC)
    sonarque: { size: [3.5, 5.5], weight: [500, 1100], quip: "Chante au sonar plus fort qu'une corne de brume et balise les abysses à coups d'éclairs : le GPS des océans, en version très bruyante." },
    // 111 · Léviathonn (EAU/ELEC)
    leviathonn: { size: [12, 18], weight: [4000, 9000], quip: "Si lent et si vaste qu'on a failli y planter un drapeau en le prenant pour une nouvelle terre émergée." },
    // 112 · Jerbiwat (PSY/ELEC)
    jerbiwat: { size: [0.25, 0.45], weight: [0.5, 2], quip: "Plus léger qu'une pomme et plus rapide que le tonnerre : le temps de prononcer son nom, il a déjà changé de canton." },
    // 113 · Namicha (SPECTRE/ELEC)
    namicha: { size: [0.25, 0.42], weight: [1.5, 4], weightMode: "special", quip: "Un chaton fantôme qui te pique tes clés sans un bruit et se recharge en te faisant un poil électrostatique — introuvable et sans le moindre remords." },
    // 114 · Namizeus (SPECTRE/ELEC)
    namizeus: { size: [1, 1.4], weight: [12, 24], weightMode: "special", quip: "Pèse moins qu'un chat de gouttière, mais lui, il faut carrément un orage pour le faire sortir de sa cachette." },
    // 115 · Boltah (FEU/ELEC)
    boltah: { size: [0.4, 0.65], weight: [5, 10], weightMode: "special", quip: "Un chaton de guépard survolté : impossible à peser correctement, il n'arrête pas de gigoter sur la balance." },
    // 116 · Heatah (FEU/ELEC)
    heatah: { size: [1.05, 1.45], weight: [26, 46], weightMode: "special", quip: "Léger comme un lévrier de course — tout en pattes, en nerfs et en carburant." },
    // 117 · Thundah (FEU/ELEC)
    thundah: { size: [1.2, 1.6], weight: [32, 55], quip: "Aussi vif qu'une moto lâchée à pleins gaz, et deux fois moins lourd qu'on ne l'imagine." },
    // 118 · Bouh (SPECTRE)
    bouh: { size: [1.2, 1.6], weight: [55, 100], quip: "Un pouf vivant en chewing-gum : c'est mou, ça colle, c'est lourd, et surtout c'est parfaitement increvable." },
    // 119 · Bouhbou (COMBAT/SPECTRE)
    bouhbou: { size: [1.85, 2.4], weight: [95, 160], quip: "La même guimauve rose, mais passée à la salle de muscu — désormais plus lourde qu'un frigo américain." },
    // 120 · Brook (SPECTRE)
    brook: { size: [0.4, 0.8], weight: [0.5, 3], weightMode: "special", quip: "Plus léger que la fumée qu'il imite, petit haut-de-forme compris." },
    // 121 · Brookhanté (SPECTRE)
    brookhante: { size: [1.5, 2.2], weight: [2, 9], weightMode: "special", quip: "Immense et impressionnant, mais si vaporeux qu'un simple ventilateur suffit à le déménager." },
    // 122 · Hibouh (SPECTRE)
    hibouh: { size: [0.2, 0.35], weight: [0.2, 0.6], weightMode: "special", quip: "Une boule de plumes bleu nuit qui pèse moins qu'une pomme — un courant d'air et il décolle tout seul." },
    // 123 · Chouhanté (PSY/SPECTRE)
    chouhante: { size: [0.45, 0.75], weight: [0.9, 2.6], quip: "Léger comme un cerf-volant de plumes, il glisse dans la nuit sans faire ployer la moindre branche." },
    // 124 · Archibouh (PSY/SPECTRE)
    archibouh: { size: [0.85, 1.3], weight: [3, 8], quip: "Sous son grand manteau de chaman, il ne pèse guère plus qu'un bon oreiller de plumes." },
    // 125 · Goshendofy (DRAGON)
    goshendofy: { size: [14, 22], weight: [180, 420], weightMode: "special", quip: "Long comme un dragon de défilé du Nouvel An, mais assez léger pour flotter sur un simple courant d'air." },
    // 126 · Gékroc (SOL/ELEC)
    gekroc: { size: [1.4, 1.9], weight: [200, 350], quip: "Un crocodile qui aurait mué en muret de pierre — et qui se recharge à peu près à la vitesse d'une vieille pile de 1990." },
    // 127 · Carlinou (FEU/DRAGON)
    carlinou: { size: [0.2, 0.35], weight: [2, 5], quip: "Un carlin qui ronfle si fort qu'il risque un jour de s'auto-incendier le coussin." },
    // 128 · Carlembre (FEU/DRAGON)
    carlembre: { size: [0.45, 0.7], weight: [8, 16], quip: "Un carlin sous vitamines qui s'est trouvé des ailes mais a gardé son bide de gouttière." },
    // 129 · Dracarlin (FEU/DRAGON)
    dracarlin: { size: [1.6, 2.3], weight: [90, 180], quip: "Le carlin de la famille est devenu plus lourd que le canapé sur lequel il faisait la sieste." },
    // 130 · Glacirex (DRAGON/GLACE)
    glacirex: { size: [0.9, 1.4], weight: [25, 55], quip: "Un bébé T-rex qui prend absolument tout ce qui traîne pour un bâtonnet glacé à mordiller." },
    // 131 · Cryotyran (DRAGON/GLACE)
    cryotyran: { size: [3.5, 5], weight: [450, 900], quip: "Un T-rex passé au congélateur : aussi rassurant qu'un iceberg pourvu de crocs." },
    // 132 · Orcaline (GLACE/EAU)
    orcaline: { size: [2, 2.8], weight: [180, 450], weightMode: "special", quip: "Une orque qui a troqué l'océan pour la station debout — deux fois plus vive et toujours aussi peu fréquentable au bassin." },
    // 133 · Sylvebarbe (SOL/PLANTE)
    sylvebarbe: { size: [6, 12], weight: [2500, 6000], quip: "Un chêne millénaire qui a appris à marcher, mais qui met une saison entière à traverser sa propre clairière." },
    // 134 · Tonytony (NORMAL)
    tonytony: { size: [0.5, 0.75], weight: [5, 15], weightMode: "special", quip: "Une guimauve ailée bourrée de points de vie : rigoureusement increvable, à condition qu'on ne la touche jamais." },
    // 135 · Gékraise (ROCHE/FEU)
    gekraise: { size: [1.4, 1.9], weight: [220, 380], quip: "Le jumeau de Gékroc qui a laissé traîner une patte dans la lave — même gabarit, deux fois plus soupe au lait." },
    // 136 · Ukognos (FEE)
    ukognos: { size: [0.6, 1], weight: [5, 14], weightMode: "special", quip: "Léger comme un feu follet et deux fois plus fourbe : impossible à peser, il flotte juste au-dessus de la balance en ricanant." },
    // 137 · Merorem (POISON/INSECTE)
    merorem: { size: [1.5, 2.4], weight: [60, 140], quip: "Un enchevêtrement de tentacules qui ne prend même pas la peine de vous frapper : il attend tranquillement que le poison signe le contrat." },
    // 138 · Morrow (GLACE/PSY)
    morrow: { size: [1.3, 1.65], weight: [34, 52], quip: "Vous l'applaudissez, elle salue, et vous vous réveillez trois heures plus tard sans vos gants — ni votre portefeuille." },
    // 139 · Gavillus (VOL/ROCHE)
    gavillus: { size: [0.6, 0.9], weight: [12, 22], quip: "Un lézard qui bronze pour muscler ses écailles : la salle de sport la plus radine du monde." },
    // 140 · Crocodaillus (VOL/ROCHE)
    crocodaillus: { size: [2.2, 3], weight: [85, 165], quip: "Un crocodile qui a appris à voler : la seule bonne nouvelle, c'est qu'il ne nage plus derrière vous." },
    // 141 · Alirocaillus (VOL/ROCHE)
    alirocaillus: { size: [4, 5.8], weight: [260, 520], quip: "Si lourd qu'il jalouse jusqu'à sa propre ombre — qui, elle au moins, sait rester discrète." },
    // 142 · Goatiny (SOL/ELEC)
    goatiny: { size: [0.4, 0.62], weight: [8, 16], quip: "Une pile AA sur sabots qui prend vos mollets pour un interrupteur." },
    // 143 · Mouflorage (SOL/ELEC)
    mouflorage: { size: [1.2, 1.6], weight: [62, 120], quip: "Un pull en laine chargé de statique, sauf que le pull pèse 90 kilos et vise la tête." },
    // 144 · Magnetor (FEU/METAL)
    magnetor: { size: [3.6, 5], weight: [1800, 3600], quip: "Plus lourd qu'un château fort, et à peu près aussi pressé de changer de place." },
    // 145 · Éléfer (METAL)
    elefer: { size: [0.7, 1.05], weight: [80, 175], quip: "Mignon comme un éléphanteau, lourd comme une enclume : ne le laissez jamais s'asseoir sur vos genoux." },
    // 146 · Barrisfer (METAL)
    barrisfer: { size: [1.5, 2.2], weight: [480, 900], quip: "Il ne barre pas le passage par méchanceté : il l'a simplement choisi comme domicile." },
    // 147 · Colosfer (METAL)
    colosfer: { size: [3, 4.2], weight: [1500, 3000], quip: "Un mammouth en fonte : il ne contourne pas les rochers, il les persuade de s'écarter." },
    // 148 · Cornaïve (FEE)
    cornaive: { size: [0.7, 1], weight: [20, 40], weightMode: "special", quip: "Assez mignon pour désarmer un huissier, assez léger pour s'endormir sur un pissenlit." },
    // 149 · Astracorne (FEE)
    astracorne: { size: [1.3, 1.7], weight: [40, 68], weightMode: "special", quip: "Elle ne galope pas, elle valse — et vous laisse une facture d'étincelles à balayer." },
    // 150 · Lunarque (FEE)
    lunarque: { size: [1.5, 1.9], weight: [80, 150], quip: "Aussi légère qu'un rêve de pleine lune, et à peu près aussi facile à mettre en licol." },
    // 151 · Coccipoing (COMBAT/INSECTE)
    coccipoing: { size: [0.3, 0.5], weight: [2.5, 7], quip: "Une bestiole plus légère qu'une pomme, dont les gants de boxe pèsent presque plus lourd qu'elle." },
    // 152 · Coccombat (COMBAT/INSECTE)
    coccombat: { size: [0.9, 1.3], weight: [22, 40], quip: "Une coccinelle qui a troqué le porte-bonheur contre un bon crochet du gauche." },
    // 153 · Coccimpératrice (COMBAT/INSECTE)
    coccimperatrice: { size: [1.3, 1.7], weight: [28, 52], quip: "Quatre poings pour le prix d'un : le seul insecte capable de vous mettre KO par ordre alphabétique." },
    // 154 · Aquilord (VOL/NORMAL)
    aquilord: { size: [1, 1.5], weight: [9, 20], weightMode: "special", quip: "Une envergure de tapis de salon pour le poids d'un gros matou : merci les os creux." },
    // 155 · Mimimoy (NORMAL)
    mimimoy: { size: [0.3, 0.5], weight: [2.5, 6], weightMode: "special", quip: "Collectionne tout ce qui brille et détale plus vite que vous ne dites « rends-moi mes clés »." },
    // 156 · Gékosmic (ROCHE/PSY)
    gekosmic: { size: [0.6, 1], weight: [18, 35], quip: "Un lézard de poche qui a lu toute la notice de combat pendant que les autres révisaient encore les bases." },
    // 157 · Hypnoppo (PSY)
    hypnoppo: { size: [0.6, 0.9], weight: [35, 65], quip: "Un bébé hippo tout rond qui vous endort surtout pour pouvoir finir sa sieste tranquille." },
    // 158 · Téléppo (PSY)
    teleppo: { size: [1, 1.4], weight: [90, 160], weightMode: "special", quip: "Vous vous penchez pour le caresser, il réapparaît trois mètres plus loin, l'air de rien." },
    // 159 · Omnhippo (PSY)
    omnhippo: { size: [1.5, 2], weight: [60, 120], weightMode: "special", quip: "Un hippopotame qui lévite : la seule chose censée couler et qui flotte quand même." },
    // 160 · Karmaki (PLANTE/PSY)
    karmaki: { size: [1.2, 1.7], weight: [24, 50], weightMode: "special", quip: "Médite en lotus depuis si longtemps qu'il a fini par prendre racine, littéralement." },
    // 161 · Otama (COMBAT/EAU)
    otama: { size: [0.2, 0.4], weight: [2, 6], quip: "Rond comme une balle anti-stress, sauf que celle-ci vous rend vos coups." },
    // 162 · Gamaruto (COMBAT/EAU)
    gamaruto: { size: [0.85, 1.25], weight: [22, 42], quip: "Un ninja qui pétrit son eau comme une boule de mochi — sauf qu'il vous la lance en pleine figure." },
    // 163 · Uzumaro (COMBAT/EAU)
    uzumaro: { size: [1.5, 2.2], weight: [90, 185], quip: "Assis en tailleur, il pèse le poids d'un frigo bien rempli et médite deux fois plus lentement qu'il ne bouge." },
    // 164 · Wistree (SPECTRE/PLANTE)
    wistree: { size: [0.4, 0.7], weight: [3, 8], weightMode: "special", quip: "Un bonsaï hanté si léger qu'un simple courant d'air le fait déménager sans lui demander son avis." },
    // 166 · Dalugazer (EAU/GLACE)
    dalugazer: { size: [1.2, 2], weight: [45, 95], quip: "Un requin qui a trop traîné au congélateur : le poids d'un gros chien, et le double de mauvaise humeur." },
    // 167 · Moby D (EAU/GLACE)
    mobyd: { size: [5, 11], weight: [150, 420], weightMode: "special", quip: "Baptisé d'après une baleine, il tient plutôt du cerf-volant géant qui aurait avalé un iceberg." },
    // 168 · Shady (NORMAL/SPECTRE)
    shady: { size: [0.22, 0.38], weight: [1.5, 3.5], weightMode: "special", quip: "Plus léger qu'un chausson et à moitié transparent : impossible de dire s'il est sur vos genoux ou déjà reparti." },
    // 169 · Shade (NORMAL/SPECTRE)
    shade: { size: [0.55, 0.85], weight: [7, 15], weightMode: "special", quip: "Un chat de gouttière qui s'est mis à la haute tension : le poids d'un gros matou, le double d'électricité statique." },
    // 170 · Shadow (NORMAL/SPECTRE)
    shadow: { size: [1.15, 1.7], weight: [38, 72], weightMode: "special", quip: "Grand comme un loup, mais si furtif qu'il vous double sans faire plier un brin d'herbe ni déclencher la moindre alarme." },
    // 210-212 · Possyl / Possombre / Nécrossum (NORMAL→NORMAL/SPECTRE) — création canonisée de Zyran, mur physique possédé
    possyl: { size: [0.3, 0.5], weight: [3, 8], quip: "Une ombre grosse comme un chat qui pèse à peine plus qu'un coussin — mais qu'on ne déloge JAMAIS du fauteuil qu'elle a élu." },
    possombre: { size: [0.75, 1.1], weight: [16, 32], quip: "Trapu et voûté comme un molosse : on le pousse, il ne bouge pas ; on insiste, on se fatigue avant lui." },
    necrossum: { size: [1.6, 2.2], weight: [62, 110], quip: "Deux mètres de mur spectral qui encaisse un rocher sans ciller. Le déplacer relève du terrassement, pas du dressage." },
    // 171 · Caninombre (TENEBRES/SPECTRE)
    caninombre: { size: [0.22, 0.38], weight: [1.8, 4.5], quip: "Un chaton-braise qui tient dans une main, à condition d'accepter qu'il vous chauffe la paume comme une bouillotte fêlée." },
    // 172 · Lycanfer (TENEBRES/SPECTRE)
    lycanfer: { size: [0.9, 1.35], weight: [28, 52], quip: "Un loup passé par la fournaise : à peine plus lourd qu'un berger allemand, mais qui laisse des traces de roussi sur le parquet." },
    // 173 · Ténèbrir (TENEBRES/SPECTRE)
    tenebrir: { size: [1.8, 2.6], weight: [85, 165], quip: "Deux mètres et demi de chien des enfers qui court plus vite que sa propre ombre, et reste étrangement léger pour un tel colosse cornu." },
    // 207-209 · Charolyx / Bubolyx / Pestilyx (TENEBRES/POISON) — némésis-lynx charognard de Possyl
    charolyx: { size: [0.35, 0.55], weight: [3, 7], quip: "Un chaton galeux qui empeste la charogne à trois mètres ; adorable tant qu'on ne respire pas par le nez." },
    bubolyx: { size: [0.7, 1.05], weight: [12, 24], quip: "Taille d'un vrai lynx, mais constellé de bubons qui éclatent quand on le caresse. On ne le caresse pas deux fois." },
    pestilyx: { size: [1.3, 1.9], weight: [40, 78], quip: "Presque deux mètres de fauve pestilentiel qui pèse moins qu'il n'en a l'air — la pourriture, ça se creuse de l'intérieur." },
    // ── LIGNÉES SIGNATURES DES 3 CLANS (Chapelle de Nouillon) — 213-221 ──
    pivinci: { size: [0.25, 0.4], weight: [0.4, 1.4], quip: "Un plumeau à ressort qui tape plus vite que ton œil ne suit." },
    vengbec: { size: [0.35, 0.55], weight: [1, 3], quip: "Sa crête pèse plus lourd que sa rancune — et c'est peu dire." },
    picassault: { size: [0.6, 0.95], weight: [3, 7], quip: "Léger comme une esquisse, tranchant comme un trait — bon courage pour le viser." },
    lapifrappe: { size: [0.4, 0.6], weight: [4, 9], quip: "Deux kilos de peluche, huit de coup de patte." },
    lapunch: { size: [0.9, 1.3], weight: [25, 45], quip: "Moitié boxeur, moitié poney : le pire des deux pour ta mâchoire." },
    lievrocogne: { size: [1.6, 2.05], weight: [70, 112], quip: "Tout le poids est dans le poing ; le reste, c'est du carton bouilli qui galope." },
    fujipanda: { size: [0.5, 0.8], weight: [16, 34], quip: "Une enclume duveteuse. Ne roule jamais dans une pente vers un Fujipanda." },
    kilipanda: { size: [1.1, 1.6], weight: [90, 160], quip: "Il mâche du bambou pétrifié. Ça t'informe sur ses dents… et ta mâchoire." },
    pandapurna: { size: [2.0, 2.8], weight: [300, 520], quip: "On l'a longtemps pris pour un sommet. Puis le sommet a bâillé." },
    varovental: { size: [1.5, 2.1], weight: [26, 52], quip: "Long, sec et beaucoup trop rapide : le temps de sentir l'odeur de venin, il t'a déjà lu les pensées et détalé." },
    cerebium: { size: [1.1, 1.5], weight: [95, 190], quip: "Petit pour son poids : c'est le noyau de cristal, dense comme une enclume, qui plombe la balance — pas la carcasse." },
    onirail: { size: [3.6, 6.2], weight: [120, 340], weightMode: "special", quip: "On ne le mesure pas, on le regarde passer : un convoi de rêve qui s'étire sur l'eau dormante avant de s'évaporer." },
    flamarokto: { size: [1.9, 2.7], weight: [58, 128], quip: "Léger comme une comète et deux fois plus pressé : quand tu l'as vu, il est déjà de l'autre côté du champ." },
    // 174 · Sépulcru (TENEBRES/VOL)
    sepulcru: { size: [0.4, 0.62], weight: [2.5, 5.5], weightMode: "special", quip: "Un vieux vautour drapé dans un imper trop grand, si léger qu'on le prendrait pour un tas de plumes oublié sur une branche." },
    // 175 · Macabour (TENEBRES/VOL)
    macabour: { size: [0.7, 1.05], weight: [4, 9], weightMode: "special", quip: "Un vautour qui attend si patiemment, perché des heures, qu'on finit par vérifier discrètement son propre pouls." },
    // 176 · Condombre (TENEBRES/VOL)
    condombre: { size: [1.3, 1.85], weight: [9, 16], weightMode: "special", quip: "Envergure de deltaplane et face de tête de mort : difficile de savoir s'il vous survole ou s'il vous réserve déjà une place à la morgue." },
    // 177 · Bidouzen (NORMAL/PSY)
    bidouzen: { size: [0.25, 0.42], weight: [2, 5], quip: "Un chaton en kimono qui prend la garde du grand maître avant de repartir en trombe chasser une pelote de laine." },
    // 178 · Medisciple (NORMAL/PSY)
    medisciple: { size: [0.6, 0.9], weight: [8, 15], quip: "A troqué la pelote de laine contre le sac de frappe, mais ronronne encore de contentement entre deux katas." },
    // 179 · Karatame (PSY/COMBAT)
    karatame: { size: [1.3, 1.7], weight: [34, 55], quip: "Léger comme un danseur, sérieux comme un moine : il vous corrige la posture avant de vous corriger tout court." },
    // 180 · Géckèbre (SOL/TENEBRES)
    geckebre: { size: [2.5, 4], weight: [420, 950], quip: "On l'a pris pour un rocher pendant trois ans ; le rocher, vexé, l'a pris pour un rival en concours d'immobilité." },
    // 181 · Geaucké (ROCHE/EAU)
    geaucke: { size: [0.9, 1.45], weight: [28, 70], weightMode: "special", quip: "Taillé dans la pierre mais filant comme un galet ricoché : foudroyant à l'attaque, catastrophique dès qu'on lui rend la monnaie." },
    // 182 · Batchu (ELEC/VOL)
    batchu: { size: [0.12, 0.24], weight: [0.3, 1.4], quip: "Une boule de duvet grésillante, plus proche du pompon électrostatique que d'une vraie chauve-souris." },
    // 183 · Supabatchu (ELEC/VOL)
    supabatchu: { size: [0.35, 0.62], weight: [1.5, 4], quip: "Passe le mur du son avant même que vous ayez fini de prononcer le mot 'chauve'." },
    // 184 · Phoéchaudi (FEU/SPECTRE)
    phoechaudi: { size: [0.2, 0.36], weight: [0.8, 2.5], quip: "Un poussin boudeur qui couve une flamme si froide qu'elle ne réchauffe même pas sa propre mauvaise humeur." },
    // 185 · Phoéchaudii (FEU/SPECTRE)
    phoechaudii: { size: [0.5, 0.9], weight: [2, 5], quip: "Plane avec le dédain d'un aristocrate et laisse dans son sillage un courant d'air… glacé, évidemment." },
    // 186 · Phoéchaudiii (FEU/SPECTRE)
    phoechaudiii: { size: [1.2, 2], weight: [4, 11], quip: "Un phénix grand comme un aigle royal mais léger comme sa propre fumée : tout le spectacle, zéro le poids." },
    // 187 · Obscurène (EAU/TENEBRES)
    obscurene: { size: [0.4, 0.7], weight: [1.5, 5], quip: "Longue comme une baguette de pain et à peu près aussi remuante qu'elle." },
    // 188 · Abyssombre (EAU/TENEBRES)
    abyssombre: { size: [2.5, 4.5], weight: [40, 120], quip: "Un néon vivant qui préfère faire la sieste enroulé autour d'un rocher plutôt que de nager : le tube fluorescent le plus fainéant des abysses." },
    // 189 · Léviabysse (EAU/TENEBRES)
    leviabysse: { size: [12, 20], weight: [2000, 6000], quip: "Un serpent de mer si long qu'on le prend pour une chaîne de montagnes engloutie, jusqu'à ce que la montagne bâille." },
    // 190 · Crocavern (SOL)
    crocavern: { size: [4, 8], weight: [3000, 10000], quip: "On l'a escaladé des années durant en le prenant pour une paroi, jusqu'au jour où la paroi a réclamé un péage." },
    // 191 · Rosdrakis (DRAGON/FEE)
    rosdrakis: { size: [0.25, 0.45], weight: [2, 6], weightMode: "special", quip: "Un porte-clés dragon en peluche rose, sauf que celui-ci a peur de son propre porte-clés." },
    // 192 · Dracosidhe (DRAGON/FEE)
    dracosidhe: { size: [1.8, 2.8], weight: [30, 70], quip: "Des ailes plus grandes que lui, un ego encore plus grand : un cerf-volant cramoisi qui se prend pour un empereur." },
    // 193 · Archéoptix (VOL/FEE)
    archeoptix: { size: [0.35, 0.55], weight: [0.8, 3], weightMode: "special", quip: "La taille d'une pie fossilisée qui aurait raté son évolution vers le vol, et qui court partout pour s'en excuser." },
    // 194 · Ptérosidhe (VOL/FEE)
    pterosidhe: { size: [1.8, 3.5], weight: [12, 35], weightMode: "special", quip: "Une envergure de deltaplane pour le poids d'un gros dindon : la nature a triché sur la balance." },
    // 195 · Fulguror (ELEC)
    fulguror: { size: [1.2, 1.8], weight: [20, 45], quip: "Un vélociraptor branché sur secteur, incapable de tenir en place plus longtemps qu'un grille-pain qui vient de sauter." },
    // 196 · Rocosaure (ROCHE)
    rocosaure: { size: [3, 5], weight: [800, 2500], quip: "Un dinosaure taillé dans le granit avec un casque plat sur le crâne : livré avec sa propre enclume intégrée." },
    // 197 · Givroptère (VOL/GLACE)
    givroptere: { size: [2, 3.5], weight: [25, 55], weightMode: "special", quip: "Un planeur de givre si léger qu'il ne fait même pas plier l'air, mais laisse quand même une traînée de buée cristalline derrière lui." },
    // 198 · Toxyrm (FEE/POISON)
    toxyrm: { size: [0.5, 0.9], weight: [5, 12], quip: "Une petite wyverne avec un casque de scooter violet vissé sur le crâne, prudente au point de ne jamais dépasser la deuxième vitesse." },
    // 199 · Wyvortal (FEE/POISON)
    wyvortal: { size: [2.4, 3.6], weight: [85, 160], quip: "Une wyverne pot-au-feu qui préfère digérer ses toxines en sieste : lourde comme une petite moto, et à peu près aussi câline qu'un cactus enrhumé." },
    // 200 · Joeyrrant (TENEBRES/FEU)
    joeyrrant: { size: [0.15, 0.28], weight: [1.5, 4], quip: "Un bébé kangourou encore en veille prolongée : à peine plus lourd qu'un marron chaud, et tout aussi pressé de bouger." },
    // 201 · Wallabisan (TENEBRES/GLACE)
    wallabisan: { size: [0.7, 1.05], weight: [8, 16], weightMode: "special", quip: "Un wallaby qui a sauté la case « chair » : côtes à l'air et flamme froide au bout de la queue, il pèse bien moins qu'un revenant en a l'air." },
    // 202 · Kangoudead (TENEBRES/GLACE)
    kangoudead: { size: [1.8, 2.5], weight: [42, 85], weightMode: "special", quip: "Un boxeur poids lourd… au squelette poids plume : il cogne comme un déménageur mais craque comme une brindille gelée." },
    // 204 · Galijah (FEE/SPECTRE)
    galijah: { size: [0.35, 0.55], weight: [2, 6], weightMode: "special", quip: "Aussi léger qu'un vœu et deux fois plus farceur : ce chat légendaire flotte sans jamais faire ployer un seul brin d'herbe." },
    // 205 · Osquille (INSECTE/EAU)
    osquille: { size: [0.3, 0.6], weight: [2, 7], quip: "Une crevette au crochet d'acier : son poing part si vite qu'il fendrait la vitre d'un aquarium avant même le « plop »." },
    // 206 · Rô (SOL/EAU)
    ro: { size: [2, 3.8], weight: [14, 42], weightMode: "special", quip: "Une anguille longue comme un tuyau d'arrosage qui, au lieu de vous mouiller, vous endort d'un simple regard." },
    // 501 · Nouiflot (EAU/PSY)
    nouiflot: { size: [0.15, 0.28], weight: [0.5, 1.8], weightMode: "special", quip: "Un poussin-nuage si moelleux qu'on le confondrait avec une boule de coton oubliée au fond de son nid." },
    // 502 · Sporémante (SPECTRE/POISON)
    sporemante: { size: [0.4, 0.75], weight: [2, 6], weightMode: "special", quip: "Une mante coiffée d'un champignon : elle vous salue poliment de ses faux… puis vous éternue une purée de spores." },
    // 503 · Ruffardoc (INSECTE/ROCHE)
    ruffardoc: { size: [0.25, 0.45], weight: [5, 14], quip: "Une chenille qui a troqué son sac à dos contre une géode : placide, pas pressée, et beaucoup trop lourde pour un si petit ver." },
    // 504 · Dractriss (ELEC/DRAGON)
    dractriss: { size: [0.3, 0.55], weight: [3, 9], weightMode: "special", quip: "Un dragonneau tout dodu qui grésille comme une prise mal branchée dès qu'on le caresse à rebrousse-écaille." },
    // 510 · Voltaile (ELEC/VOL)
    voltaile: { size: [0.15, 0.32], weight: [0.3, 1.4], weightMode: "special", quip: "Une plume sous tension : incapable de tenir en place plus d'une seconde, et à peine plus lourde qu'un courant d'air électrisé." },
    // 511 · Abyssvolt (EAU/ELEC)
    abyssvolt: { size: [1.1, 2.1], weight: [6, 20], weightMode: "special", quip: "Une anguille-lampe de poche qui nage si mal qu'elle finit surtout par éclairer ses propres ratés." },
    // 512 · Oniridrak (PSY/DRAGON)
    oniridrak: { size: [0.55, 0.9], weight: [9, 22], weightMode: "special", quip: "Un oreiller vivant en forme d'hippo : le regarder trop longtemps, c'est déjà commencer à bâiller." },
    // 514 · Nécrospore (SPECTRE/POISON)
    necrospore: { size: [0.5, 0.9], weight: [2, 9], weightMode: "special", quip: "Un champignon qui a squatté un chien fantôme — plus léger qu'une bouffée de brume, et deux fois moins ragoûtant." },
    // 515 · Ombrepsy (NORMAL/PSY)
    ombrepsy: { size: [0.4, 0.75], weight: [3, 8], weightMode: "special", quip: "Un chat en guimauve aux pattes-spaghettis : impossible à réveiller, encore plus dur à ramasser d'un seul bloc." },
    // 516 · Rocaptère (ROCHE/VOL)
    rocaptere: { size: [1.4, 2.3], weight: [85, 190], quip: "Un croco de grès qui claque des mâchoires avant de réfléchir — et qui sonne creux quand on toque dessus." },
    // 517 · Givrasol (SOL/GLACE)
    givrasol: { size: [0.45, 0.75], weight: [16, 36], quip: "Un chevreau sorti tout droit du congélateur : moitié béluga, moitié glaçon sur pattes." },
    // 518 · Fissuraillus (ROCHE/VOL)
    fissuraillus: { size: [2.8, 4.5], weight: [650, 1500], quip: "Un rocher furieux muni d'ailes bien trop petites : il rugit qu'il va s'envoler, puis retombe comme une enclume." },
    // 519 · Magmaillus (ROCHE/VOL)
    magmaillus: { size: [6, 9], weight: [1800, 4200], quip: "Un volcan qui a appris à voler : sublime dans le ciel, catastrophique pour l'assurance incendie." },
    // 520 · Scoriève (ROCHE/FEU)
    scorieve: { size: [0.5, 0.9], weight: [45, 115], quip: "Une briquette de barbecue géante qui refroidit au soleil : patience obligatoire, elle roule plus qu'elle ne marche." },
    // 521 · Basaltor (ROCHE/FEU)
    basaltor: { size: [3, 4.5], weight: [2200, 5200], quip: "La Chaussée des Géants en une seule pièce : posez-le, oubliez-le, il sera devenu falaise avant votre retour." },
    // 522 · Sidérobloc (ROCHE/METAL)
    siderobloc: { size: [4, 6], weight: [4200, 9500], quip: "Une enclume ambulante : chaque pas sonne le glas, et un semi-remorque garé à côté a l'air d'un jouet." },
    // 523 · Sidéralithe (ROCHE/METAL)
    sideralithe: { size: [6, 9], weight: [9500, 18000], quip: "Un éclat de météorite qui médite : aussi dense qu'un noyau de planète, aussi bavard qu'une statue." },
    // 524 · Nouïbrume (EAU/PSY)
    nouibrume: { size: [0.4, 0.6], weight: [3, 6], weightMode: "special", quip: "Un piaf gonflé à la vapeur : on le croirait lourd, mais c'est surtout du bouillon dans les plumes." },
    // 525 · Oniromouille (EAU/PSY)
    oniromouille: { size: [0.8, 1.3], weight: [2, 5], quip: "Pèse moins lourd que le rêve dont vous vous réveillez, et file encore plus vite dès que vous tentez de l'attraper." },
    // 526 · Spectrelame (SPECTRE/POISON)
    spectrelame: { size: [0.8, 1.2], weight: [4, 9], weightMode: "special", quip: "Une mante fantôme coiffée d'un champignon : à mi-chemin entre le samouraï et la garniture de pizza." },
    // 527 · Nécromante (SPECTRE/POISON)
    necromante: { size: [1.5, 2], weight: [6, 13], weightMode: "special", quip: "La Faucheuse en version insecte : deux faux, un chapeau de champignon, et pas un gramme de superflu sur les os." },
    // 528 · Carapoing (INSECTE/ROCHE)
    carapoing: { size: [0.6, 0.9], weight: [20, 45], quip: "Une fourmi qui a troqué ses gants de boxe contre deux vrais pavés, et qui cogne avant de lire le règlement." },
    // 529 · Roctobrute (INSECTE/ROCHE)
    roctobrute: { size: [2, 3], weight: [300, 700], quip: "Aussi lourd qu'un petit rocher ambulant : là où il passe, l'éboulis trépasse." },
    // 530 · Voltriss (ELEC/DRAGON)
    voltriss: { size: [1.5, 2.2], weight: [40, 80], weightMode: "special", quip: "Un tigre qui aurait avalé un orage et poussé des ailes : rayé, électrique, et jamais à l'arrêt." },
    // 531 · Draconvolt (ELEC/DRAGON)
    draconvolt: { size: [2.5, 3.5], weight: [120, 260], weightMode: "special", quip: "Un orage entier condensé en dragon : plus il rugit fort, plus il file léger comme la foudre." },
    // 532 · Éolectre (ELEC/VOL)
    eolectre: { size: [0.5, 0.9], weight: [3, 8], quip: "Mi-chauve-souris mi-dragonnet : une pile électrique en peluche qui refuse catégoriquement de tenir en place." },
    // 533 · Stratévolt (ELEC/VOL)
    stratevolt: { size: [2, 3], weight: [40, 90], quip: "Un cumulonimbus qui aurait poussé des ailes : immense, mais léger comme le nuage dont il descend." },
    // 534 · Abyssonde (EAU/ELEC)
    abyssonde: { size: [2, 3.5], weight: [30, 80], quip: "Une anguille qui a lesté ses flancs pour encaisser les coups : un câble haute tension tapi au fond de l'océan." },
    // 535 · Maréfoudre (EAU/ELEC)
    marefoudre: { size: [8, 15], weight: [800, 2500], quip: "Un mur d'eau électrifié que la marée elle-même préfère contourner : imaginez un immeuble qui aurait appris à nager." },
    // 536 · Oniragon (PSY/DRAGON)
    oniragon: { size: [1.3, 2], weight: [110, 240], quip: "Un hippopotame qui a appris à planer mais jamais à maigrir : il vole bas, très bas, surtout après le déjeuner." },
    // 537 · Songedrak (PSY/DRAGON)
    songedrak: { size: [3.5, 5], weight: [320, 560], quip: "Assez massif pour écrouler un lac sous son ombre, assez rêveur pour vous endormir avant même de vous toucher." },
    // 538 · Sporcrypte (SPECTRE/POISON)
    sporcrypte: { size: [0.8, 1.2], weight: [6, 15], quip: "Un renard fantôme coiffé d'un champignon : ni la balance ni le détecteur de fumée ne savent trop quoi en penser." },
    // 539 · Miasmort (SPECTRE/POISON)
    miasmort: { size: [1.3, 1.9], weight: [9, 22], quip: "Il pèse à peine plus que le nuage qu'il est, mais vous rattrape avant que vous ayez fini de crier." },
    // 540 · Ombrelin (NORMAL/PSY)
    ombrelin: { size: [0.3, 0.48], weight: [3, 6.5], weightMode: "special", quip: "Un chaton dont les moustaches ressemblent à des nouilles tièdes — impossible de le prendre au sérieux, surtout à table." },
    // 541 · Psychombre (NORMAL/PSY)
    psychombre: { size: [0.95, 1.35], weight: [28, 52], weightMode: "special", quip: "Assez rapide pour battre sa propre ombre à la course, et assez nerveux pour fouetter tout ce qui bouge, nouilles comprises." },
    // 542 · Givrèbre (SOL/GLACE)
    givrebre: { size: [1.2, 1.8], weight: [160, 340], quip: "Une chèvre qui a avalé une baleine : aussi câline qu'un iceberg et deux fois plus lente à se lever." },
    // 543 · Cryolithe (SOL/GLACE)
    cryolithe: { size: [3.2, 4.8], weight: [2200, 4800], quip: "Un menhir qui rumine : les glaciers avancent plus vite que lui, et fondent avant qu'il n'ait décidé de bouger." },

}

/** Fourchette de mensurations d'une espèce, ou null si pas encore définie. */
export function dexSize(speciesId: string): DexSize | null {
    return DEX_SIZE[speciesId] ?? null
}

const clampIv = (v?: number) => Math.max(0, Math.min(15, v ?? 0))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Archétype de POIDS dérivé des stats de BASE : PHYSIQUE (PV+Atk+Déf ≥ Vit+Spé → lourd quand fort) sinon
 *  RAPIDE/SPÉCIAL (léger quand fort). Pas de donnée en plus à saisir : c'est le profil de stats qui décide. */
export function isPhysicalWeight(baseStats: Record<StatKey, number>): boolean {
    return (baseStats.hp + baseStats.atk + baseStats.def) >= (baseStats.spe + baseStats.spc)
}

/** Sens du poids EFFECTIF : override éditorial `weightMode` si présent, sinon dérivé des stats de base. */
export function weightModeOf(range: DexSize, baseStats: Record<StatKey, number>): "physical" | "special" {
    return range.weightMode ?? (isPhysicalWeight(baseStats) ? "physical" : "special")
}

export interface Mensuration { sizeM: number; weightKg: number; physical: boolean }

/** MENSURATIONS d'un individu : taille (m) & poids (kg), dérivées de ses IV + de la fourchette d'espèce.
 *  Déterministe (les IV sont figés à la capture) → recalculable partout, sans stockage. */
export function computeMensuration(range: DexSize, ivs: Partial<Record<StatKey, number>>, baseStats: Record<StatKey, number>): Mensuration {
    const iv = (k: StatKey) => clampIv(ivs[k])
    const avg = (iv("hp") + iv("atk") + iv("def") + iv("spe") + iv("spc")) / 75 // 0..1
    const sizeM = lerp(range.size[0], range.size[1], avg)
    const physical = weightModeOf(range, baseStats) === "physical"
    // PHYSIQUE : poids ∝ IV(PV,Atk,Déf). RAPIDE/SPÉ : poids ∝ INVERSE des IV(Vit,Spé) → le mage parfait est le + léger.
    const t = physical ? (iv("hp") + iv("atk") + iv("def")) / 45 : (iv("spe") + iv("spc")) / 30
    const weightKg = physical ? lerp(range.weight[0], range.weight[1], t) : lerp(range.weight[1], range.weight[0], t)
    return { sizeM, weightKg, physical }
}

/** Taille formatée : cm sous 1 m ; m sinon (1 décimale dès 10 m). */
export function formatSize(m: number): string {
    if (m < 1) return `${Math.round(m * 100)} cm`
    return `${m.toFixed(m >= 10 ? 1 : 2)} m`
}
/** Poids formaté : g sous 1 kg ; kg ; t au-delà de 1000 kg. */
export function formatWeight(kg: number): string {
    if (kg < 1) return `${Math.round(kg * 1000)} g`
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`
    return `${kg.toFixed(kg < 100 ? 1 : 0)} kg`
}
export function formatSizeRange(r: DexSize): string { return `${formatSize(r.size[0])} – ${formatSize(r.size[1])}` }
export function formatWeightRange(r: DexSize): string { return `${formatWeight(r.weight[0])} – ${formatWeight(r.weight[1])}` }

/** Petit qualificatif fun selon la place de la taille dans la fourchette (feedback « beau spécimen »). */
export function sizeTag(sizeM: number, r: DexSize): string {
    const span = r.size[1] - r.size[0]
    if (span <= 0) return ""
    const p = (sizeM - r.size[0]) / span
    if (p >= 0.85) return "🌟 spécimen d'exception"
    if (p >= 0.6) return "beau spécimen"
    if (p <= 0.15) return "format de poche"
    return ""
}
