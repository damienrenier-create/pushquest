// src/lib/gamebook/yellow/data/dexLore.ts
//
// Nexus Jaune Éclair — LORE de bestiaire « premium ». Trois champs éditoriaux par espèce, affichés dans la fiche
// Pokédex/Dex. JAMAIS lus par le moteur de combat (comme `role`/`description`) → aucun impact gameplay.
// Clé = species.id (stable). Chaque fiche est VÉRIFIÉE vis-à-vis du sprite (public/yellow/sprites/dex/<id>.png).
//   • ecology : Biologie & Écologie — traits physiques RÉELS (conformes au sprite), mœurs (solitaire/groupe,
//               diurne/nocturne, reproduction), biotope préféré.
//   • dicton  : Le Dicton — petit proverbe lié au TYPE ou aux STATS de la créature.
//   • note    : Note de l'explorateur — remarque humoristique et personnalisée.
// Une espèce sans entrée retombe proprement sur `description` (species.ts) → zéro régression pendant la refonte.

export interface DexLore {
    /** Biologie & Écologie — physique (sprite), mœurs, reproduction, biotope. */
    ecology: string
    /** Le Dicton — proverbe court lié au type / aux stats. */
    dicton: string
    /** Note de l'explorateur — description humoristique et personnalisée. */
    note: string
}

// ⚠️ Refonte en cours : les entrées sont ajoutées par lots (sprite-vérifiés). Les espèces absentes affichent
//    encore leur `description` historique jusqu'à leur passage.
export const DEX_LORE: Record<string, DexLore> = {
    // ── LOT 0 — ÉCHANTILLON DE VALIDATION (8 fiches, sprites vérifiés) ──
    feuillichot: {
        ecology: "Petit bulbe-lapin vert à deux grandes feuilles-oreilles qui captent la lumière comme des panneaux solaires. Photosynthèse le jour, se roule en boule la nuit sous un tapis de mousse. Vit en portées joueuses dans les sous-bois humides ; bourgeonne au printemps — une nouvelle pousse pour chaque « oreille » tombée.",
        dicton: "Plante bien arrosée d'efforts pousse deux fois plus vite.",
        note: "Verdit à vue d'œil les jours où je m'entraîne, et jaunit dès que je fais la sieste. Un détecteur de flemme sur pattes : culpabilisant, mais adorable.",
    },
    couperin: {
        ecology: "Renardeau roux aux grandes oreilles de fennec, les poings soigneusement bandés et un bandeau de combat vissé au front. Frêle mais increvablement discipliné : il médite à l'aube sur sa natte, puis s'entraîne sur tout ce qui dépasse jusqu'au crépuscule. Vit en dojo (fratries d'entraînement) et compte ses pompes à voix haute — même endormi.",
        dicton: "Poing léger, cœur vaillant : la vitesse vaut la force.",
        note: "M'a défié pour une brindille que je venais de ramasser. Il a perdu, m'a resalué poliment, puis a exigé une revanche. On en est à la douzième. Respect total.",
    },
    glaceer: {
        ecology: "Husky de gel au double pelage et à la collerette de cristaux : sa fourrure emprisonne l'air glacé comme un igloo ambulant, et sa grande queue touffue lui sert de couverture. Chasse en MEUTE sur les crêtes enneigées, à l'aube ; dort roulé en boule, museau sous la queue, jusqu'à −40°. La femelle met bas dans une tanière de névé, chiots aux yeux déjà bleu-glace.",
        dicton: "Qui court sur la glace apprend l'équilibre avant la vitesse.",
        note: "Contrairement à ce que jurait mon vieux carnet, ce n'est PAS un lévrier — c'est un gros husky pelucheux. J'ai voulu le caresser : doigts gelés. Adorable quand même. Recommencerais (avec des gants).",
    },
    ombrapanthe: {
        ecology: "Panthère spectrale au pelage d'encre nappé de fumée violette, les yeux d'un vert phosphorescent. Chasseuse nocturne et solitaire : elle traverse les murs comme une brume et frappe avant même qu'on l'ait vue, sans laisser trace ni odeur. Nul ne sait comment elle se reproduit — on croit seulement voir son ombre se dédoubler.",
        dicton: "L'ombre la plus rapide arrive avant la lumière.",
        note: "Je l'ai croquée de dos, de profil, de face… et sur chaque dessin, elle avait déjà bougé. Ses yeux verts, eux, sont restés braqués sur moi toute la nuit. Pas fermé l'œil.",
    },
    pyrozly: {
        ecology: "Grizzly massif au pelage brun fumant, crinière et échine embrasées, griffes rougies à blanc. Solitaire et territorial, il hiberne au fond des cratères encore tièdes et se réveille d'une humeur… volcanique. Pêche dans les rivières de lave ; la mère élève seule un ourson par portée, au chaud sous la cendre.",
        dicton: "Ours qui couve sous la cendre se réveille en éruption.",
        note: "Réveiller un grizzly : mauvaise idée. Réveiller un grizzly EN FEU : très mauvaise idée. J'ai appris les deux le même matin. Mes sourcils repoussent doucement.",
    },
    guizer: {
        ecology: "Béluga miniature d'un blanc bleuté, front bombé et éternel air renfrogné. Nage seul dans les eaux glaciales côtières, boude les bancs de poissons comme ses congénères. Chétif et lent à grandir, il compense par une rancune tenace. Pond dans les grottes gelées — le petit sort déjà en train de râler.",
        dicton: "Petite vague aujourd'hui, raz-de-marée demain.",
        note: "« Hyper kawaï », prétendait la légende. J'ai tenté un câlin. Il m'a mordu. Deux fois. Colérique ET rancunier, confirmé. Mais patiente jusqu'à son évolution : là, ça vaut carrément le coup.",
    },
    megamonarx: {
        ecology: "Colosse dragonique de pierre vivante : ailes membraneuses gréseuses, échine hérissée de cristaux turquoise qui affleurent jusqu'au bout des ailes et de la queue. Il ne se nourrit pas — il absorbe les minéraux du Nexus. Solitaire absolu, éveillé une fois par ère. Il ne se reproduit pas : il se FORGE, quand un Dracolithe parfait triomphe de la Ligue.",
        dicton: "Le plus lent des colosses frappe le plus fort — attends-le, il arrive.",
        note: "Chaque pas fait trembler mon encrier ; il m'a fallu trois pages rien que pour une aile. On le dit immortel ; moi je dis surtout increvable, et absolument pas pressé.",
    },
    mottelave: {
        ecology: "Boule de roche brune parcourue de veines de lave incandescente, coiffée d'un petit dôme fumant façon mini-volcan. Deux fragments soudés par la coulée : increvablement solide, mais d'une lenteur abyssale. Reste immobile des jours sur les coulées refroidies ; « bourgeonne » un caillou brûlant qui roule au loin jusqu'à durcir.",
        dicton: "La pierre ne se presse jamais : elle attend que le feu vienne à elle.",
        note: "Je l'ai pris pour un rocher. Je me suis assis dessus. Le rocher a souri — et j'ai eu le fond du pantalon roussi. Depuis, je vérifie toujours si les cailloux ont des yeux.",
    },

    // ── LOTS 1-2 — bestiaire complet (236 fiches, sprites vérifiés) ──
    // 002 · Broubouc (PLANTE)
    broutame: {
        ecology: "Jeune bouquetin sylvestre aux longues cornes brunes recourbées en spirale et à l'épaisse collerette de feuilles vertes qui lui ceint le cou. Son pelage brun est constellé de mousse et ses sabots virent au braise. Herbivore paisible, il broute en petites hardes le jour et rumine à l'ombre des futaies claires.",
        dicton: "L'herbe broutée repousse toujours : rien ne lasse qui sait durer.",
        note: "Il a entrepris de brouter le bord de mon chapeau de paille en me fixant droit dans les yeux, sans la moindre honte. J'ai gardé le chapeau, lui a gardé l'appétit.",
    },
    // 003 · Cerfeuillu (PLANTE)
    sylvapuce: {
        ecology: "Cerf sylvestre imposant portant de grands bois brun-écorce ramifiés comme de vieilles branches. Sa fourrure vert-mousse s'orne d'un collier de fleurs sauvages — violettes, bleues, blanches — épanouies sur son poitrail. Solitaire et digne, il arpente les futaies anciennes de jour et veille jalousement sur sa clairière.",
        dicton: "Le grand cerf plie sous l'orage mais ne rompt jamais.",
        note: "J'ai voulu cueillir une fleur de son poitrail pour mon herbier. Il a incliné ses bois d'un air si digne que j'ai fait mine de le saluer et poursuivi bien vite mon chemin.",
    },
    // 004 · Gouttiny (EAU)
    gouttiny: {
        ecology: "Minuscule larve aquatique bleu ciel, tout en rondeurs, avec deux touffes de branchies plumeuses roses dressées de part et d'autre de la tête. Ses grands yeux, ses menus bras et sa queue frangée trahissent un stade encore juvénile. Craintif, il flotte en petit groupe dans les eaux dormantes et se tapit au moindre remous.",
        dicton: "L'eau qui dort n'en est pas moins profonde.",
        note: "Ses branchies roses se sont hérissées quand j'ai tendu la main : je l'ai cru furieux — il bâillait, tout simplement. Impossible d'en vouloir à une bouille pareille.",
    },
    // 005 · Ondulo (EAU)
    ondulo: {
        ecology: "Triton bipède au corps bleu vif, dressé sur ses pattes arrière, le dos et le crâne hérissés de crêtes épineuses translucides. Son ventre bleu pâle et sa gueule toujours entrouverte lui donnent un air remuant. Semi-aquatique, il patauge sur les berges le jour et hérisse ses piquants dès qu'on l'approche de trop près.",
        dicton: "Rivière tranquille, dos hérissé : on regarde, on ne caresse pas.",
        note: "Il s'est cambré pour paraître plus grand, tout hérissé de bravoure. Très impressionnant — jusqu'à ce que je pose un doigt distrait sur ses piquants.",
    },
    // 006 · Razmarée (EAU)
    razmaree: {
        ecology: "Mastodonte aquatique à quatre pattes dont l'échine disparaît sous une forêt de piquants bleu glacier, dressés comme une houle pétrifiée. Ses petits yeux orange couvent une humeur farouche. Solitaire et territorial, il patrouille les côtes rocheuses et roule en boule hérissée face au danger, laissant les assauts se briser sur son armure.",
        dicton: "Contre le dos hérissé, la vague vient toujours mourir.",
        note: "Je me suis mis en tête de compter ses piquants pour mon carnet. Arrivé à trente-sept, je saignais de deux doigts ; j'ai renoncé et lui ai accordé le bénéfice du doute.",
    },
    // 007 · Braisille (FEU)
    braisille: {
        ecology: "Renardeau au pelage orange flamboyant, doté de grandes oreilles pointues et d'une queue touffue dont la pointe brûle d'une flammèche bien réelle. Son ventre et ses pattes tirent sur le crème. Vif, curieux et joueur, il trottine seul à la lisière des terres chaudes et sèches, sa flamme s'avivant dès qu'il s'excite.",
        dicton: "Petite étincelle court plus vite que grand brasier.",
        note: "D'un simple frétillement joyeux de la queue, il m'a roussi toute une manche. Il ne l'a pas fait exprès… enfin, c'est ce que jure son air innocent.",
    },
    // 008 · Flamkure (FEU)
    flamkure: {
        ecology: "Jeune lion à la crinière ondoyante comme un feu de broussaille, le corps rouge-orangé zébré de motifs incandescents et la queue couronnée d'un panache ardent. Musculature déliée, il file plus qu'il ne marche. Fougueux et impatient, il traque sa proie à la course sur les étendues sèches, laissant une traînée de chaleur dans son sillage.",
        dicton: "Crinière au vent, la flamme rattrape l'ombre avant la nuit.",
        note: "Impossible de le croquer sur le vif : dès qu'il bondit, le courant d'air brûlant de sa crinière m'arrache la page des mains.",
    },
    // 009 · Pyrokoss (FEU)
    pyrokoss: {
        ecology: "Lion colossal à l'échine de braise : sa crinière est un incendie vivant et son corps sombre, presque calciné, se craquelle de veines de lave palpitantes comme de la roche en fusion. Sa queue s'achève en torche. Souverain solitaire, il règne sur les terres volcaniques et ne tolère aucun rival sur son territoire fumant.",
        dicton: "Quand le brasier bondit, nul n'a le temps de crier au feu.",
        note: "Je me suis penché pour vérifier si les fissures de son flanc chauffaient pour de bon. Réponse : oui, franchement. Mes sourcils s'en souviennent encore.",
    },
    // 010 · Plumiot (NORMAL/VOL)
    plumiot: {
        ecology: "Oisillon duveteux évoquant un jeune hibou, tout en plumes brunes et crème, avec deux aigrettes dressées, de grands yeux noirs et un petit bec jaune. Une gemme dorée orne son front. Encore malhabile en vol, il sautille sur ses pattes écailleuses orange et guette l'aube, hululant du haut des vieilles branches.",
        dicton: "L'oiseau matinal happe le ver avant tous les autres.",
        note: "J'ai pris ses deux aigrettes pour des cornes et l'ai noté ainsi. Il a hululé, franchement vexé, comme si la bévue venait de moi et non de mon crayon.",
    },
    // 011 · Faukon (NORMAL/VOL)
    faukon: {
        ecology: "Rapace élancé aux ailes déployées, vêtu d'un plumage brun et fauve moucheté d'or sur le poitrail. Son œil jaune perçant, son bec crochu et ses serres puissantes ne laissent aucun doute sur ses intentions. Chasseur solitaire, il fond du haut du ciel en piqués fulgurants et repère sa proie à des lieues à la ronde.",
        dicton: "Le faucon fond du ciel avant que son ombre ne touche le sol.",
        note: "Il m'a fauché mon quignon de pain des mains en plein piqué. Je n'ai pas même vu passer l'ombre — juste entendu le froissement des plumes et mon estomac protester.",
    },
    // 012 · Aquilothan (NORMAL/VOL)
    aquilothan: {
        ecology: "Aigle souverain aux ailes immenses, paré d'un plumage doré aux reflets métalliques et de gemmes bleues serties au front, au poitrail et aux épaules. Une couronne de plumes dorées ceint sa tête altière. Roi solitaire des cieux, il plane à des hauteurs vertigineuses au-dessus des plus hauts sommets et fond sur qui ose empiéter sur son domaine.",
        dicton: "Nul ne dispute les cimes à qui fend le ciel le plus vite.",
        note: "Du haut de son perchoir, il m'a toisé avec une superbe si écrasante que je me suis surpris à m'incliner. Devant un oiseau. Je n'en suis toujours pas tout à fait remis.",
    },
    // 013 · Cailloutchi (ROCHE/SOL)
    cailloutchi: {
        ecology: "Chevreau minéral dont le corps rondouillard est un empilement de galets brun-ocre, surmonté de deux petites cornes de pierre et de grands yeux noirs curieux. Ses pattes courtes et trapues peinent à porter tout ce poids. Placide et terriblement lent, il broute les lichens des éboulis et se fige, immobile comme un tas de cailloux, dès qu'on l'observe.",
        dicton: "Caillou qui ne roule pas ne se laisse jamais renverser.",
        note: "J'ai voulu le soulever pour le mettre à l'ombre. J'ai vite renoncé — et c'est finalement mon dos qui a dû aller se reposer à l'ombre.",
    },
    // 014 · Roctaur (ROCHE/SOL)
    roctaur: {
        ecology: "Bélier de pierre au corps fait de blocs rocheux imbriqués comme un muret, coiffé d'énormes cornes en spirale striées qui lui servent de bélier et de bouclier. Quadrupède lent et pesant, il charge tête baissée sur les pentes caillouteuses. Solitaire et territorial, il broute lichens et mousses, puis se fige à la moindre alerte pour se faire passer pour un rocher.",
        dicton: "La corne s'use, le roc demeure : patience vaut cuirasse.",
        note: "J'ai cru buter sur un éboulis pour y poser mon sac — l'éboulis s'est levé et m'a fixé. J'ai récupéré mon sac très, très lentement.",
    },
    // 015 · Rochison (ROCHE/SOL)
    rochison: {
        ecology: "Bison de roche colossal, la bosse d'épaule bardée de dalles empilées et les cornes recourbées vers l'avant ; une fissure incandescente court le long de son flanc, comme si un feu couvait sous la pierre. Ses yeux jaunes trahissent une colère lente. Il vit en petit troupeau, martèle le sol de ses sabots et, une fois lancé, charge en avalanche sans jamais dévier.",
        dicton: "Peu bouger pour tout encaisser, peser lourd pour tout renverser.",
        note: "J'ai voulu mesurer la fissure lumineuse de son flanc : ma règle a fondu. Un bison qui grogne, apparemment, n'aime pas qu'on lui prenne la température.",
    },
    // 017 · Frappard (COMBAT)
    frappard: {
        ecology: "Renard fennec au pelage fauve et aux immenses oreilles, vêtu d'un kimono blanc ceint d'une ceinture rouge, bandeau noir au front et poings bandés. Vif et sec, il enchaîne les frappes plus vite qu'on ne les voit, mais sa fine carrure ne tient pas les longs échanges. Diurne, il s'entraîne seul sur les rochers et salue chaque adversaire avant de le corriger.",
        dicton: "Deux poings vifs valent mieux qu'une lourde garde.",
        note: "Il m'a salué, m'a collé trois pichenettes à la vitesse de l'éclair, puis s'est rassis pour méditer. J'ai applaudi ; il a rougi sous les poils.",
    },
    // 018 · Maîtrezenc (COMBAT)
    maitrezenc: {
        ecology: "Maître fennec parvenu à la sérénité : il combat les yeux clos, drapé d'une robe bleu nuit brodée d'or et d'un plastron de cuir usé, ceinture noire à la taille. Poings et pieds bandés, il lit l'adversaire au souffle plutôt qu'au regard et frappe de la paume avec une précision rare. Sage et solitaire, il ne transmet sa discipline qu'à qui sait attendre en silence.",
        dicton: "Main calme, coup sûr : la maîtrise vaut mille assauts.",
        note: "Je lui ai demandé son secret ; il a répondu par un long silence, puis une paume dans le plexus. J'ai saisi la leçon, faute de pouvoir encore respirer.",
    },
    // 019 · Électroatiss (ELEC)
    electroatiss: {
        ecology: "Petit coati au museau allongé et à la queue annelée, la fourrure crème parcourue de statique ; deux éclairs jaunes lui poussent sur le crâne et une collerette d'étincelles crépite à son cou. Le bout de sa queue s'achève en flammèche électrique. Curieux et remuant, il fouine le nez au sol, lâche une bourrade quand on le surprend, puis détale.",
        dicton: "Petite bête, grosse étincelle : la vivacité passe avant la carrure.",
        note: "Adorable — jusqu'à ce que je le caresse à rebrousse-poil. Mes cheveux tiennent encore droit trois jours plus tard, et je crois entendre grésiller mon carnet.",
    },
    // 020 · Couranti (ELEC)
    couranti: {
        ecology: "Coati dressé sur ses pattes arrière, la fourrure brune traversée d'arcs bleutés, un bandeau noir au front d'où jaillissent des cornes d'éclairs. Il porte un manteau doré gravé de circuits qui s'illuminent quand il accélère, et sa queue annelée se termine en fourches électriques. Rapide et nerveux, il patrouille au pas de charge, l'orage canalisé dans sa cape.",
        dicton: "L'éclair ne prévient pas — il est déjà passé.",
        note: "Je l'ai pris en photo ; le cliché n'a saisi qu'une traînée bleue et un bandeau qui flotte. Rapide, le bougre — et un brin frimeur avec sa cape dorée.",
    },
    // 021 · Zappeuréal (ELEC)
    zappeureal: {
        ecology: "Souverain coati couronné d'un diadème d'or hérissé de bois électriques, un halo de foudre blanc-bleu tournoyant sans fin autour de sa tête. Son armure ouvragée, sertie d'émeraudes, gaine un corps traversé d'un courant permanent, et un lourd gantelet concentre sa puissance. Il se déplace par éclairs, plus vite que le tonnerre qui le suit, et impose partout sa présence de monarque.",
        dicton: "Le tonnerre gronde après l'éclair : la vitesse règne, le bruit suit.",
        note: "Il a daigné me toiser une demi-seconde avant de disparaître dans un flash. J'ai salué la couronne déjà vide : avec un roi aussi rapide, tout le protocole tient dans un clignement d'yeux.",
    },
    // 022 · Auroruff (GLACE)
    auroruff: {
        ecology: "Chiot husky au pelage bleu givré et blanc neige, si duveteux qu'on dirait un flocon sur pattes ; de vrais cristaux de glace parsèment sa fourrure et ses grands yeux bleus brillent comme deux billes de gel. Encore maladroit, il trottine en meute, s'ébroue pour saupoudrer de neige tout ce qui l'entoure et lève la patte pour réclamer des câlins — glacés.",
        dicton: "Petit flocon deviendra tempête.",
        note: "Il m'a tendu la patte, tout mignon ; je l'ai serrée avec joie. Depuis, mon gant est un glaçon et mon cœur, complètement fondu.",
    },
    // 024 · Auroraur (GLACE)
    auroraur: {
        ecology: "Loup de glace adulte à la crinière de cristal dressée en éclats tranchants, le corps bleu givre hérissé de piques gelées le long de l'échine et des pattes. Ses yeux blancs luisent d'un froid polaire et son souffle givre l'air alentour. Fier et endurant, il hurle pour lever le blizzard, domine les crêtes glacées et n'abandonne jamais un affrontement.",
        dicton: "La glace ne cède pas ; elle attend que l'ardeur s'épuise.",
        note: "Sublime et glacial. J'ai voulu immortaliser son hurlement : l'objectif de mon appareil a gelé net. Un loup qui pose gratuitement mais facture en engelures.",
    },
    // 025 · Ruffiant (INSECTE)
    ruffiant: {
        ecology: "Petite larve segmentée à la carapace brun-miel et aux grands yeux noirs luisants ; deux courtes antennes frémissent au moindre courant d'air et une feuille verte nouée au cou lui sert d'écharpe. Infatigable ouvrière, elle avance en file, grignote feuilles et racines à longueur de journée et rapporte tout à la colonie sans jamais se plaindre.",
        dicton: "Petite ouvrière, grand chantier : la constance nourrit la colonie.",
        note: "Elle m'a suivi trois kilomètres, persuadée que mon lacet était une brindille de choix. Je le lui ai offert : un tel dévouement, ça se récompense.",
    },
    // 026 · Formiguer (INSECTE)
    formiguer: {
        ecology: "Fourmi-soldat dressée sur ses pattes arrière, cuirassée de chitine brune aux plaques d'épaule saillantes ; ses mandibules cisaillent, ses griffes tranchent et son abdomen segmenté se recourbe en aiguillon. Disciplinée jusqu'à l'os, elle monte la garde par escouades, obéit au moindre signal de phéromone et défend les galeries au prix de sa vie.",
        dicton: "Un soldat tient la ligne ; mille soldats tiennent la colonie.",
        note: "Je me suis approché du nid en sifflotant ; six d'entre elles se sont figées au garde-à-vous, mandibules ouvertes. J'ai battu en retraite en sifflotant plus fort, l'air de rien.",
    },
    // 027 · Regnantaur (INSECTE/PSY)
    regnantaur: {
        ecology: "Reine-fourmi altière au corps de chitine dorée, coiffée d'une crête en couronne d'où partent deux longues antennes ; ses quatre ailes irisées se déploient et son abdomen s'évase en robe de cour piquée d'œufs d'ambre. Elle règne par la pensée autant que par la force, dirige la colonie d'une volonté de fer et ne quitte sa chambre royale que pour défendre son trône.",
        dicton: "La reine commande d'un regard ce que mille bras exécutent.",
        note: "Je me suis incliné par prudence ; j'aurais juré qu'elle m'a répondu... à l'intérieur de mon crâne. Depuis, j'obéis vaguement à une envie pressante de ranger mes affaires en rang.",
    },
    // 028 · Lavapetit (ROCHE/FEU)
    lavapetit: {
        ecology: "Petit galet de basalte trapu, au corps brun fissuré couvant une braise interne, surmonté d'une touffe d'herbe sèche qui grésille comme une mèche. Ses menus bras de pierre peinent à le mouvoir : il roule plus qu'il ne marche. Créature solitaire et pantouflarde, elle somnole sur les pierrailles tièdes et ne s'éveille vraiment qu'à la chaleur du plein jour.",
        dicton: "La braise sous la pierre ne se presse jamais : elle attend son heure pour flamber.",
        note: "J'ai cru ramasser un caillou pour caler ma tente — le caillou a bâillé, puis m'a roussi le pouce. Depuis, je vérifie que mes cailloux respirent avant de les toucher.",
    },
    // 029 · Fissuralave (ROCHE/FEU)
    fissuralave: {
        ecology: "Colosse de roche bardé de plaques basaltiques, parcouru de fissures d'où sourd une lave incandescente ; son torse abrite un cœur de magma qui rougeoie à chaque respiration. Lourd et voûté, il avance d'un pas caverneux. Bête solitaire au sang brûlant, elle fend le sol de ses gros poings pour se réchauffer aux entrailles de la terre.",
        dicton: "Pierre qui craque laisse voir le feu : la lenteur d'un mur cache une fournaise.",
        note: "Je me suis abrité de la pluie contre ce que je prenais pour un rocher. Il s'est redressé, et j'ai compris que mon 'rocher' avait des yeux — et une nette envie que je déguerpisse.",
    },
    // 030 · Magmator (ROCHE/FEU)
    magmator: {
        ecology: "Golem titanesque à l'armure de roche noire veinée de coulées ardentes, dont les épaules portent un véritable volcan miniature crachant fumée et lave. Ses yeux flamboient, ses poings pèsent le poids d'une falaise. Territorial et colérique, il patrouille les terres volcaniques et fait trembler le sol à chaque enjambée.",
        dicton: "Quand le volcan marche, la montagne s'écarte : sa poigne fait plier le roc.",
        note: "On m'avait parlé d'une 'colline qui fume'. La colline s'est mise à marcher vers moi. J'ai battu un record personnel de sprint, catégorie 'explorateur qui tient à ses sourcils'.",
    },
    // 031 · Nouillon (PSY)
    nouillon: {
        ecology: "Amas de filaments dorés enroulés en boule, piqueté de deux boulettes brunes et coiffé de deux yeux montés sur pédoncules qui pivotent en tous sens. Molle et dépourvue d'ossature, la créature ondule plus qu'elle ne se déplace et flotte à quelques centimètres du sol par simple volonté. Grégaire et curieuse, elle se love dans les recoins tièdes.",
        dicton: "Nul besoin de bras quand l'esprit soulève : la pensée noue ce que la main ne peut.",
        note: "J'avais faim, et j'ai eu un moment de doute très sérieux devant ce plat de pâtes vivant. Il a cligné de ses deux yeux. J'ai rangé ma fourchette, un peu honteux.",
    },
    // 032 · Vermisaint (PSY)
    vermisaint: {
        ecology: "Enchevêtrement de nouilles dorées d'où jaillissent de longues volutes tentaculaires, certaines lestées de billes de pierre qu'il fait tournoyer par télékinésie. Ses deux boulettes s'ornent d'un sceau psychique pourpre et une aura violine crépite autour de lui. Être méditatif et sans repos, il lévite en marmonnant des litanies que nul ne comprend.",
        dicton: "Le fil de la pensée est plus long que le bras : l'esprit atteint ce que le corps ignore.",
        note: "Il a fait valser trois cailloux autour de sa tête pendant que je prenais des notes, comme pour frimer. Franchement, ça marchait : j'ai oublié ce que j'écrivais.",
    },
    // 033 · Divinpâte (PSY)
    divinpate: {
        ecology: "Apothéose de pâte élevée au rang de divinité : ses boulettes sacrées s'enchâssent dans une orfèvrerie d'or sertie d'améthystes, un diadème à l'œil unique la couronne, et un halo flotte au-dessus de ses vastes ailes irisées. De ses volutes pend un voile de nouilles ondoyant. Solitaire et vénérée, elle plane, drapée d'une aura psychique éblouissante.",
        dicton: "Un dieu qui prend son élan ne s'arrête plus : chaque prière nourrit sa puissance.",
        note: "Je me suis surpris à m'incliner devant un plat de spaghettis auréolé. Ma dignité d'explorateur en a pris un coup ; mon carnet, lui, jure que ça en valait la peine.",
    },
    // 034 · Piouflot (VOL/EAU)
    piouflot: {
        ecology: "Poussin duveteux formant une boule de plumes blanches nuancées de bleu ciel, si moelleuse qu'on la croirait faite de nuage. Ses ailerons encore courts battent en vain, mais ses pattes palmées grises en font déjà un bon nageur. Maladroit et grégaire, il pépie sans cesse et emboîte le pas au premier être qui bouge, une patte dans l'eau, la tête dans les airs.",
        dicton: "Entre le nuage et la vague, le petit apprend à nager avant de voler.",
        note: "Il m'a suivi tout un après-midi en me prenant pour sa mère. J'ai fini par lui apprendre à barboter ; il a fini par me tremper de la tête aux pieds. Match nul.",
    },
    // 035 · Hérondée (VOL/EAU)
    herondee: {
        ecology: "Échassier élancé au long cou sinueux et aux pattes fines comme des joncs, vêtu d'un plumage blanc glacé rehaussé d'une aigrette élégante à l'arrière du crâne. Son bec effilé à pointe dorée harponne poissons et insectes d'un geste vif. Solitaire et posée, elle guette immobile au bord de l'eau puis déploie ses ailes en un envol parfaitement silencieux.",
        dicton: "Patience de l'eau, vivacité de l'air : le héron frappe entre deux battements.",
        note: "J'ai passé une heure à l'imiter, une jambe repliée au bord de la mare, pour gagner sa confiance. Résultat : un torticolis, un pied trempé et zéro photo. Elle, elle avait déjà dîné.",
    },
    // 036 · Oragron (VOL/ELEC)
    oragron: {
        ecology: "Grand échassier de tempête aux ailes déployées comme deux voiles d'orage, plumage bleu givré d'où jaillissent des éclairs jaunes qui grésillent le long de son cou et de son bec. Un blason triangulaire d'or luit sur son poitrail. Fier et solitaire, il chevauche les fronts orageux et fond sur sa proie à la vitesse de la foudre.",
        dicton: "Nul n'esquive l'éclair : quand le ciel se déchire, la vitesse fait loi.",
        note: "Il a chargé juste devant moi et tous les poils de mon bras se sont dressés. J'ai pris ça pour un salut électrisant. Mon appareil photo, lui, ne s'est jamais rallumé.",
    },
    // 037 · Broussours (COMBAT/PLANTE)
    broussours: {
        ecology: "Jeune fauve trapu à la fourrure brune hérissée, marchant bas sur quatre pattes robustes et déjà armé de crocs qu'il montre volontiers. De la mousse verdit son échine et une collerette de feuilles piquée de baies rouges lui ceint le cou, tandis que des lianes s'enroulent à ses pattes avant. Hargneux et solitaire, il défend son taillis avec une fougue disproportionnée.",
        dicton: "Petites pattes, grande hargne : dans la ronce, la force pousse en silence.",
        note: "Je lui ai tendu une baie de sa collerette pour l'amadouer. Il l'a prise, l'a mangée, puis a grogné pour en réclamer une autre. J'ai nourri un petit tyran, apparemment.",
    },
    // 038 · Sylvours (COMBAT/PLANTE)
    sylvours: {
        ecology: "Ours dressé sur ses pattes arrière, carrure massive vêtue d'un manteau de feuillage vert et hérissée d'épines de bois qui saillent de ses épaules comme une armure d'écorce. Des lianes courent sur ses bras noueux, ses yeux luisent d'un vert végétal et ses griffes labourent le tronc comme la chair. Colosse territorial, il se dresse pour paraître plus grand encore et rugit à qui approche.",
        dicton: "L'arbre qui apprend à cogner ne plie plus sous l'orage.",
        note: "Il s'est dressé de toute sa hauteur pour m'impressionner. Ça a parfaitement fonctionné. J'ai reculé en applaudissant poliment, ce qui, avec le recul, était sans doute ridicule.",
    },
    // 039 · Druidours (COMBAT/PLANTE)
    druidours: {
        ecology: "Ours-druide monumental, drapé d'un manteau de feuilles et couronné de frondaisons ; ses épaules s'arment de vastes épines de bois pareilles à des pavois, et un cœur d'émeraude irradie au centre de son poitrail. Ses longs crocs recourbés et ses yeux vert-jade trahissent une puissance ancienne. Gardien solitaire et lent, il veille sur les bois millénaires et pèse chaque intrus du regard.",
        dicton: "La forêt ne se hâte pas : le vieux chêne encaisse tout, puis foudroie d'un seul coup.",
        note: "Je l'ai salué comme on salue un ancien. Il a incliné la tête, lentement, très lentement, et la gemme de son torse a pulsé. J'ai décidé que c'était un oui, et je suis reparti sur la pointe des pieds.",
    },
    // 040 · Pampousse (PLANTE)
    pampousse: {
        ecology: "Petite créature potelée au pelage vert mousse, au ventre jaune tendre et aux pattes brunes trapues. Deux jeunes pousses jaillissent de son crâne comme des antennes, tandis qu'une nervure foliacée court le long de son dos rebondi. Herbivore diurne et grégaire, elle somnole au soleil pour se gorger de lumière et détale en couinant au moindre bruissement.",
        dicton: "Jeune pousse plie au vent mais ne rompt jamais.",
        note: "Je l'ai prise pour un coussin de mousse et j'ai failli m'asseoir dessus. Elle a couiné, les deux pousses toutes dressées — depuis, je vérifie toujours si mon fauteuil a des yeux.",
    },
    // 041 · Féliane (PLANTE)
    feliane: {
        ecology: "Félin élancé au corps fauve et au poitrail doré, coiffé de deux cornes sombres et paré d'une collerette de feuilles vertes qui lui fait crinière végétale. Sa longue queue souple se termine par un fruit rouge et mûr qui se balance à chaque foulée. Prédatrice agile et solitaire, elle chasse à l'aube en bondissant de branche en branche.",
        dicton: "Le fruit mûr tombe vite ; la panthère verte, plus vite encore.",
        note: "Ce fruit au bout de sa queue m'a mis l'eau à la bouche. J'ai tendu la main : un coup de griffe plus tard, j'ai compris que le véritable appât, c'était moi.",
    },
    // 042 · Silviliane (PLANTE)
    cerfeuillu: {
        ecology: "Grand cervidé forestier aux bois bruns majestueux, drapé d'une crinière de feuilles où éclosent des fleurs écarlates. Son flanc et sa queue-liane s'ornent de vrilles fleuries portant baies et un orbe doré nourricier. Gardien territorial et diurne, il arpente les sous-bois d'un pas lent et royal, faisant reverdir la mousse sous ses sabots.",
        dicton: "Sous les bois du grand cerf, tout fleurit — la force comme l'élan.",
        note: "J'ai cueilli une baie de sa queue pour mon herbier. Il m'a fixé de ses yeux verts jusqu'à ce que je la remette en place. On ne pille pas un jardin qui vous regarde.",
    },
    // 043 · Loutrille (EAU)
    loutrille: {
        ecology: "Petite loutre au pelage bleu vif, museau et ventre crème, grands yeux ronds emplis de curiosité. Sa courte queue s'achève par une touffe turquoise en forme de nageoire ondulante qui goutte sans cesse. Joueuse et grégaire, elle glisse en bandes sur les berges boueuses, plonge à la moindre étincelle et dort en se tenant les pattes.",
        dicton: "Petite goutte roule toujours vers la rivière.",
        note: "Elle m'a chipé mon savon en le prenant pour un jouet, puis m'a observé me savonner à l'eau claire d'un air navré. La plus mignonne des voleuses.",
    },
    // 044 · Ondaloutre (EAU)
    ondaloutre: {
        ecology: "Loutre élancée au corps fuselé bleu et au ventre crème, taillée pour filer sous l'eau. Sa longue queue se déploie en une gerbe d'écume turquoise qu'elle claque à la surface pour se propulser. Semi-nocturne et sociable, elle façonne des toboggans de vase, chasse en duo et communique par sifflements aigus au ras des flots.",
        dicton: "Rivière qui coule sans bruit finit par creuser la pierre.",
        note: "Je l'ai vue enchaîner trois loopings dans un rapide juste pour le plaisir. Puis elle m'a éclaboussé, pile au moment où j'avais sorti mon carnet. Coïncidence ? J'en doute fort.",
    },
    // 045 · Naïadrak (EAU)
    naiadrak: {
        ecology: "Dragon-cerf gracile au corps turquoise moiré, à la tête fine ornée de bois coralliens aux pointes rose vif et de branchies écarlates le long des joues. Sa queue démesurée se déroule en d'immenses volutes d'eau vive, aussi somptueuse que fragile de constitution. Créature solitaire et cérémonieuse, elle danse sur les eaux calmes au crépuscule.",
        dicton: "Belle est la vague qui frappe fort ; brève, celle qui se brise.",
        note: "Sa queue dessinait une vague si parfaite que j'ai voulu l'immortaliser. Elle a bougé, la vague m'est tombée dessus, et mon carnet a coulé à pic. L'art a toujours un prix.",
    },
    // 046 · Fennaise (FEU)
    fennaise: {
        ecology: "Renardeau des sables au pelage orange chaud et à l'immense paire d'oreilles de fennec striées de rouge braise. De petites flammèches jaillissent de ses joues et le bout de sa queue touffue brûle d'un feu doux. Nocturne et vif, il détale par bonds nerveux, dort roulé en boule le jour à l'ombre et dresse les oreilles au moindre crépitement.",
        dicton: "Petite braise court plus vite que le grand brasier.",
        note: "J'ai voulu compter ses moustaches ; il a éternué une gerbe d'étincelles et grillé le coin de ma page. Désormais je le croque de loin — au fusain, prudence oblige.",
    },
    // 047 · Pyrenard (FEU)
    pyrenard: {
        ecology: "Renard adulte au pelage flamboyant, dont les oreilles et la crinière se hérissent de véritables flammes rouge et or. Sa queue somptueuse ondule comme un brasier vivant, et ses pattes fines et sombres le rendent redoutablement leste. Chasseur crépusculaire et solitaire, il rabat ses proies en cercles de feu et marque son territoire de traînées roussies.",
        dicton: "Qui joue avec le renard de feu se brûle avant même de le voir passer.",
        note: "Magnifique de dos, ce panache de flammes. Je me suis approché pour l'admirer ; il a agité la queue et m'a roussi les sourcils. On m'appelle depuis l'explorateur perpétuellement étonné.",
    },
    // 048 · Loupyre (FEU)
    loupyre: {
        ecology: "Loup de guerre au pelage orange strié de plaques sombres évoquant une armure de charbon. Une crinière de flammes lui dévore l'échine, ses crocs découverts luisent et ses yeux magenta brûlent d'ardeur au combat. Prédateur nocturne chassant en meute soudée, il embrase les broussailles pour rabattre le gibier et rugit à faire trembler les cendres.",
        dicton: "Le croc en feu tranche avant même que la flamme ne chauffe.",
        note: "J'ai cru sa crinière purement décorative jusqu'à ce qu'il bâille : un souffle de fournaise, et ma gourde a bouilli toute seule. Je prends mes notes à distance respectueuse.",
    },
    // 049 · Forgeotin (COMBAT)
    forgeotin: {
        ecology: "Jeune singe roux au pelage cuivré et au visage poupin, grands yeux violets pétillants de curiosité. Il serre dans sa patte un petit marteau de pierre au manche de bois, qu'il traîne partout comme un doudou. Diurne et grégaire, il imite sans relâche les gestes des aînés, martelant cailloux et racines en apprenti maladroit mais opiniâtre.",
        dicton: "À force de frapper, l'apprenti finit toujours forgeron.",
        note: "Il a voulu ferrer ma botte pendant que je dormais. Bilan : trois clous de travers et un orteil endolori. Zéro pour la technique, dix pour l'enthousiasme.",
    },
    // 050 · Marteloutan (COMBAT)
    marteloutan: {
        ecology: "Grand singe roux musculeux vêtu d'une salopette de cuir tanné, torse bombé et regard concentré. Il manie un lourd maillet de pierre gravé de runes bleues, façonné de ses propres mains. Solitaire et méthodique, il installe sa forge près des coulées volcaniques, martèle du crépuscule à l'aube et cogne aussi sec qu'il travaille le métal.",
        dicton: "Le bon forgeron frappe lentement, mais chacun de ses coups compte.",
        note: "Je lui ai demandé de réparer la boucle de mon sac. Il a soupiré, tapé une seule fois, et me l'a soudée à même le ceinturon. Solide, indéniablement. Détachable, plus du tout.",
    },
    // 051 · Enclumind (COMBAT/PSY)
    enclumind: {
        ecology: "Colosse simiesque bardé d'une armure de plaques d'acier gravées de runes bleues, sa crinière rousse débordant du heaume. Il brandit un maillet de guerre massif dont les glyphes s'illuminent quand sa volonté s'échauffe. Solitaire et taciturne, ce forgeron-guerrier concentre son esprit avant chaque coup, mêlant force brute et calcul patient.",
        dicton: "Bras d'acier, esprit d'enclume : lent à s'ébranler, terrible à l'impact.",
        note: "Il a médité dix bonnes minutes devant un rocher avant de le pulvériser d'un seul coup. J'ai applaudi ; il m'a tendu le caillou réduit en gravier, l'air de dire : à toi d'essayer maintenant.",
    },
    // 052 · Trolystrik (COMBAT/ELEC)
    trolystrik: {
        ecology: "Petit troll trapu à la peau rouge brique, aux oreilles pointues d'elfe et aux petites défenses. Sa crête n'est pas faite de cheveux mais d'une flamme orange tordue en zigzag d'éclair qui grésille sans arrêt. Musclé pour sa taille, il n'a pour tout habit qu'un pagne et un brassard de cuir. Turbulent et bagarreur, il rôde en petites bandes et cherche la castagne dès l'aube.",
        dicton: "Petit poing, grande étincelle : la vitesse allume la mêlée.",
        note: "Je l'ai pris pour un lutin inoffensif jusqu'à ce qu'il me pince le mollet façon prise de courant. Adorable, oui, mais ça mord ET ça grésille.",
    },
    // 053 · Brutetrik (COMBAT/ELEC)
    brutetrik: {
        ecology: "Version adulte et bâtie du petit troll : carrure épaisse, défenses saillantes, crinière de flammes orange rabattue par le vent. Des arcs de foudre jaunes et violets crépitent autour de ses poings serrés et de ses brassards de cuir. Il traîne sur l'épaule un lourd maillet de pierre. Solitaire et coléreux, il cogne d'abord et grogne ensuite.",
        dicton: "Le marteau frappe fort, l'éclair frappe vite : gare à qui a les deux.",
        note: "Il a levé son maillet, la foudre lui est montée aux poings, et je me suis soudain découvert un rendez-vous urgent à l'autre bout de la vallée.",
    },
    // 054 · Hébulmin (COMBAT/ELEC)
    hebulmin: {
        ecology: "Colosse tout en muscles à la peau rouge sombre, ramassé sur ses jambes comme un ressort prêt à bondir. Sa crinière hérissée de flammes orange irradie des éclairs jaunes et violets. Il porte un collier tribal de crocs et de griffes, ainsi que d'épais gantelets de pierre fendus de veines incandescentes. Massif et territorial, il impose le silence rien qu'en se redressant.",
        dicton: "Quand le colosse tonne, la montagne retient son souffle.",
        note: "J'ai voulu jauger son biceps du regard : j'ai renoncé, il faisait la taille de mon buste. Le collier de crocs n'aidait pas à me rassurer.",
    },
    // 055 · Draclet (VOL/DRAGON)
    draclet: {
        ecology: "Bébé dragon dodu aux écailles bleu ciel presque blanches, avec de grands yeux jaunes curieux, de petites cornes et une collerette de piquants encore tendres. Ses ailes de chauve-souris sont minuscules, à peine bonnes à planer. Maladroit sur ses quatre pattes, il agite sans cesse une petite queue. Joueur et téméraire, il tente de voler bien avant d'en avoir la force.",
        dicton: "Petit dragon deviendra grand, à qui sait attendre le vent.",
        note: "Il a battu des ailes de toutes ses forces pour décoller… et a fait un bond de dix centimètres. J'ai applaudi quand même, il avait l'air si fier.",
    },
    // 056 · Wyverion (VOL/DRAGON)
    wyverion: {
        ecology: "Dragon adolescent élancé, dressé sur ses pattes arrière à la manière d'une wyverne. Écailles argentées aux reflets bleutés, yeux jaunes vifs, petites cornes et collerette de pointes. Ses grandes ailes membraneuses sont désormais fonctionnelles, et sa longue queue s'achève en fer de flèche. Nerveux et agile, il pique et vire dans les airs avec une aisance toute neuve.",
        dicton: "Aile agile fend le ciel avant même que l'orage n'y pense.",
        note: "Impossible de le croquer : à peine posé, il repartait. J'ai fini avec trois pages de traits flous et un solide torticolis.",
    },
    // 057 · Draconarque (VOL/DRAGON)
    draconarque: {
        ecology: "Dragon majestueux aux écailles blanc argenté, membres puissants et vastes ailes déployées. Des cornes en couronne encadrent ses yeux jaunes perçants. Il arbore un pectoral d'or serti d'ambre et tient dans sa griffe un sceptre de bois couronné d'un cristal jaune lumineux. Souverain et posé, il règne sur les hauteurs avec la gravité d'un monarque plutôt que la fureur d'une bête.",
        dicton: "Le monarque des cieux ne baisse jamais les ailes.",
        note: "Il m'a toisé depuis son perchoir comme un roi jauge un manant. J'ai esquissé une révérence maladroite ; il a hoché la tête. Je crois que j'ai passé l'examen.",
    },
    // 058 · Cornaissant (VOL/POISON)
    cornaissant: {
        ecology: "Oisillon corvidé à peine sorti d'un œuf mauve tacheté de vert, dont il porte encore la coquille en guise de nid. Duvet noir violacé, minuscule bec, ailerons impuissants et grands yeux orange en forme d'étoile. Une touffe de spores vertes lui garnit le poitrail, et un filet de gaz toxique s'échappe déjà de son croupion. Fragile et geignard, il réclame la becquée sans relâche.",
        dicton: "À peine éclos, déjà le venin perle au bord du nid.",
        note: "Il piaillait si mignonnement que je me suis penché… puis j'ai pris une bouffée de gaz vert en pleine figure. On ne m'y reprendra plus à roucouler devant un œuf.",
    },
    // 059 · Corvenin (VOL/POISON)
    corvenin: {
        ecology: "Corbeau élancé au plumage noir aux reflets violets, ailes largement déployées. Des mouchetures vertes en forme de gouttes ornent son poitrail et le bout de ses ailes ; son bec et ses serres virent au vert acide. De sa queue s'échappe une traîne de fumée verte toxique. Rapide et rusé, il fond en piqué sur tout ce qui brille et disparaît avant qu'on ait crié.",
        dicton: "Plume rapide, venin plus vif encore.",
        note: "Il m'a chipé un bouton de cuivre sous le nez à une vitesse indécente, en laissant derrière lui une odeur âcre. Radin ET empoisonné, le bougre.",
    },
    // 060 · Nécrocorbe (VOL/POISON)
    necrocorbe: {
        ecology: "Grand corbeau d'aspect funeste au plumage noir violacé, aux vastes ailes hérissées d'éclats de cristal vert toxique sur les épaules et les rémiges. Son œil unique luit d'un orange nécrotique barré d'une pupille en croix, et sa traîne se dissout en volutes de brume verte. Solennel et inquiétant, il plane en silence, semant autour de lui une aura de mauvais présage.",
        dicton: "Sous l'œil du corbeau, le poison se change en sortilège.",
        note: "Son regard en croix m'a suivi de branche en branche sans qu'il batte une seule fois des ailes. J'ai rangé mon carnet et je suis parti d'un pas très, très naturel.",
    },
    // 061 · Sporbéo (SPECTRE/POISON)
    sporbeo: {
        ecology: "Minuscule esprit-champignon au corps crème rondouillard, doté de petits bras et de jambes potelées. Son chapeau rouge vif moucheté de crème coiffe une frimousse toute simple : deux yeux points, un sourire timide et des joues roses. Au-dessus flotte une petite flamme follette aux teintes pastel. Frêle et craintif, il diffuse ses spores en dérivant au ras du sol.",
        dicton: "Petite spore, grand fantôme.",
        note: "Il m'a souri, j'ai souri, tout allait bien — jusqu'à ce que j'inhale ses spores et éternue pendant une heure. Adorable arnaqueur duveteux.",
    },
    // 062 · Lampignon (SPECTRE/POISON)
    lampignon: {
        ecology: "Esprit-champignon au corps vert menthe translucide et au grand chapeau rouge moucheté de crème. Yeux plissés de bonheur, bouche rieuse et joues roses, il tient une petite lanterne elle aussi coiffée d'un chapeau, où danse une flamme chaleureuse. De larges ailes irisées aux couleurs d'arc-en-ciel palpitent dans son dos. Joyeux mais trompeur, il éclaire les sentiers… surtout les mauvais.",
        dicton: "La lanterne des brumes éclaire surtout ceux qu'elle égare.",
        note: "J'ai suivi sa jolie petite lumière en toute confiance et me suis retrouvé jusqu'aux genoux dans une mare. Il souriait toujours. Évidemment.",
    },
    // 063 · Mycédruide (SPECTRE/POISON)
    mycedruide: {
        ecology: "Vénérable druide-champignon coiffé d'un large chapeau lavande ceint d'une couronne de feuillage et d'une gemme violette. Son visage d'écorce ridée porte une longue barbe de cristal mentholé, et sa robe moussue est piquetée de feuilles et de petits champignons. Il brandit un bâton couronné d'un cristal irisé, tandis que des flammes spectrales arc-en-ciel ondoient autour de lui. Immobile et patient, il veille des siècles durant.",
        dicton: "Le vieux champignon pousse lentement, mais jamais ne rompt.",
        note: "Je lui ai posé une question ; il a mis si longtemps à répondre que j'ai eu le temps de déjeuner. La réponse valait l'attente, cela dit.",
    },
    // 064 · Tamanpousse (PLANTE)
    tamanpousse: {
        ecology: "Bébé tamanoir végétal au museau effilé et à la peau vert tendre mouchetée de taches sombres, joues rosées et queue terminée par une jeune pousse feuillue. Fragile et pataud sur ses courtes pattes, il fouille lentement l'humus en quête d'insectes et de sève, puis somnole au pied des troncs. Solitaire et craintif, il ne s'éloigne jamais de la lisière ombragée qui l'a vu germer.",
        dicton: "Petite pousse boit peu, mais la sève finit par nourrir le géant.",
        note: "J'ai cru voir une brindille bouger : c'était lui, occupé à me téter le lacet en pensant y trouver de la sève. Adorable, mais mon soulier ne s'en est jamais remis.",
    },
    // 065 · Fourmilierre (PLANTE)
    fourmilierre: {
        ecology: "Tamanoir cuirassé de plaques d'écorce et de feuillage vert, dont l'immense queue s'enroule en une arche de lianes et de laurier. Ses membres bruns et ligneux griffent le sol pendant que sa langue happe fourmis et pucerons dont il draine les sucs. Diurne et méthodique, il arpente son territoire d'un pas lent, s'habillant du lierre qu'il arrache au passage.",
        dicton: "Le lierre ne se presse jamais : il monte, et finit par tenir le mur.",
        note: "Il m'a laissé approcher, l'air placide, puis a entrepris de m'enrouler la cheville de lierre 'par politesse'. J'ai mis dix minutes à me déficeler, lui toujours aussi serein.",
    },
    // 066 · Gloutanoir (PLANTE)
    gloutanoir: {
        ecology: "Colosse quadrupède au corps de bois sombre, noyé sous une crinière et une queue en immense panache de feuilles vertes. Griffes épaisses, échine hérissée de frondes, regard mauvais : ce glouton draine la sève de tout ce qu'il enlace et digère des jours durant. Placide mais têtu, il défend son coin d'ombre humide contre qui ose y grignoter une feuille.",
        dicton: "Qui digère lentement tient longtemps : la patience est un mur.",
        note: "J'ai partagé mon casse-croûte avec lui par courtoisie ; il a englouti le sac, la sangle et deux de mes crayons. Un mur, oui — un mur qui a faim.",
    },
    // 067 · Panthéon (NORMAL)
    pantheon: {
        ecology: "Adorable panthereau au pelage fauve semé de rosettes sombres, aux grands yeux bleu-vert curieux et aux oreilles encore trop rondes pour sa tête. Pattes maladroites, longue queue battant sans cesse : joueur et téméraire, il feule pour se donner un genre puis réclame aussitôt des câlins, et suit tout ce qui bouge, persuadé d'être déjà un grand fauve.",
        dicton: "Le chaton qui feule aujourd'hui rugira demain.",
        note: "Il m'a mordillé le pouce en grognant façon fauve redoutable, puis s'est endormi dans mon capuchon. Difficile de le prendre au sérieux — et pourtant, ces petites griffes promettent.",
    },
    // 068 · Florapanthe (PLANTE)
    florapanthe: {
        ecology: "Panthère élancée au pelage vert profond, flancs gravés d'arabesques de lianes plus sombres, couronne de feuilles ceignant son front et collerette de frondes sur les épaules. Ses yeux dorés luisent, ses pattes s'assombrissent en bois. Chasseuse silencieuse et solitaire, elle se fond dans les fourrés, immobile des heures avant de bondir sans un froissement.",
        dicton: "Nul ne fuit la forêt : la forêt marche déjà à ses côtés.",
        note: "Je l'ai prise pour un buisson pendant une heure entière — jusqu'à ce que le buisson cligne des yeux. Je n'ai jamais rangé mon carnet aussi vite de ma vie.",
    },
    // 069 · Panthégel (GLACE)
    panthegel: {
        ecology: "Panthère au pelage blanc argenté zébré de gris pâle, hérissée d'une crinière de cristaux bleutés qui court de la tête aux épaules et pointe le bout de sa queue. Ses yeux de givre percent la brume et son souffle fume. Chasseuse patiente et feutrée, elle rôde à pas silencieux en laissant des empreintes gelées, indifférente au froid le plus mordant.",
        dicton: "Le silence de la glace tue plus sûrement que le cri.",
        note: "J'ai voulu la photographier ; l'objectif a gelé net sur place. Elle, elle m'a fixé sans un frisson, l'air de trouver que c'était bien fait pour moi.",
    },
    // 070 · Pyropanthe (FEU)
    pyropanthe: {
        ecology: "Grand félin au pelage orange braise viré au rouge sur l'échine, coiffé d'une crinière de flammes vives qui ondule, la queue s'achevant en torche crépitante. Regard incandescent, babines retroussées : tempérament vif s'il en est. Fougueux et impatient, il bondit avant de réfléchir et laisse derrière lui l'herbe roussie et l'air surchauffé.",
        dicton: "La flamme la plus rapide brûle avant qu'on l'ait vue venir.",
        note: "Je l'ai approché pour me réchauffer les mains : excellente idée, jusqu'à ce qu'il éternue. J'ai désormais des sourcils asymétriques et un profond respect.",
    },
    // 072 · Aquapanthe (EAU)
    aquapanthe: {
        ecology: "Panthère d'un bleu profond parcourue de veines cyan luminescentes, ornée de nageoires translucides aux joues et d'une queue s'évasant en aileron. Sa fourrure semble ruisseler sans fin. Calme et souple, elle glisse dans les courants comme sur la terre ferme, chasse en apnée avec une patience infinie et n'attaque jamais avant d'être sûre de son coup.",
        dicton: "Eau tranquille creuse la pierre : la patience use tout.",
        note: "Je l'ai crue endormie au bord de la mare ; en réalité elle m'observait depuis un quart d'heure sous la surface. Mes chaussettes ne s'en sont pas remises.",
    },
    // 073 · Voltapanthe (ELEC)
    voltapanthe: {
        ecology: "Félin svelte au pelage jaune vif rayé de noir façon tigre, yeux dorés fendus, dont le corps grésille d'arcs électriques bleutés jusqu'au bout de la queue. Plus léger et nerveux que ses cousins, il ne tient pas en place : hyperactif et curieux, il hérisse ses poils chargés et bondit d'un point à l'autre plus vite que l'œil ne suit.",
        dicton: "Plus prompt que l'éclair : quand le tonnerre gronde, il est déjà loin.",
        note: "Je l'ai caressé une fois. UNE. Mes cheveux tiennent encore droit trois jours plus tard et ma montre affiche vaguement l'an 3000.",
    },
    // 074 · Rembodo (ROCHE/VOL)
    rembodo: {
        ecology: "Grand oiseau inapte au vol évoquant un dodo préhistorique : plumage vert et brun terne, houppe fauve dressée en crête, gros bec noir crochu et ridicules ailerons bien trop petits pour décoller. Juché sur deux longues pattes nues et musclées, il détale à toute allure. Peureux et grégaire, il fuit au moindre bruit en piaillant, jamais loin de sa nichée.",
        dicton: "À défaut d'ailes pour voler, mieux vaut des pattes pour fuir.",
        note: "Il a un type Vol et n'a jamais quitté le sol de sa vie. Je l'ai poursuivi pour vérifier : impossible à rattraper, mais il a failli mourir de trouille. On est deux.",
    },
    // 075 · Rétroraptor (ROCHE/VOL)
    retroraptor: {
        ecology: "Raptor emplumé au corps vert écailleux couvert de plumes brun doré, arborant une crête ébouriffée, un œil rouge perçant et un bec crochu. Sa longue queue s'ouvre en éventail de plumes rigides qui l'équilibre en pleine course. Griffes acérées aux mains comme aux pieds : chasseur agile et vif, il traque en petites bandes et fond sur sa proie par surprise.",
        dicton: "La plume trompe l'œil, la griffe fait le reste.",
        note: "Il m'a tourné autour, éventail déployé, l'air de parader — j'ai applaudi. C'était en réalité un encerclement. Je ne referai pas l'erreur du critique d'art.",
    },
    // 076 · Chronorex (ROCHE/VOL)
    chronorex: {
        ecology: "Prédateur bipède massif, torse et bras hypertrophiés couverts d'écailles vertes, coiffé d'une crête de plumes brunes hérissée façon crinière. Bec crochu redoutable, queue emplumée dressée en balancier ; chaque pas fait trembler le sol. Solitaire et territorial, il assomme ses proies d'un seul coup de patte et ne recule devant aucun adversaire.",
        dicton: "Peu importe la lenteur du bras quand un seul coup suffit.",
        note: "J'ai noté 'lent' dans mon carnet. Il l'a lu par-dessus mon épaule — oui, par-dessus — et a réduit un rocher en gravier d'un revers. J'ai ajouté 'mais on s'en fiche'.",
    },
    // 077 · Mottoche (ROCHE/SOL)
    mottoche: {
        ecology: "Petite motte de terre compactée et de roche lisse, d'un brun chaud, dépourvue du moindre membre : deux points noirs en guise d'yeux et une bouche minuscule composent toute son anatomie. Presque immobile, elle passe ses journées à demi enfouie et se déplace en basculant maladroitement. Solitaire et pataude, elle affectionne les sols meubles et bien ensoleillés.",
        dicton: "Pierre qui ne roule jamais finit par voir le monde venir à elle.",
        note: "J'ai failli la ramasser pour caler ma tente : elle a cligné des yeux, et j'ai lâché un cri qui a réveillé tout le campement. Une motte qui vous fixe, ça ne s'oublie pas.",
    },
    // 078 · Dumotte (ROCHE/SOL)
    dumotte: {
        ecology: "Deux mottes brunes soudées flanc contre flanc, chacune avec ses petits yeux ronds et sa bouche timide, formant un duo inséparable. Toujours de guingois, elles roulent de concert sans jamais se lâcher. Il y en a presque toujours une qui somnole pendant que l'autre veille ; lentes et casanières, elles restent groupées dans la terre tiède.",
        dicton: "À deux, on tient debout ce qu'un seul laisserait rouler.",
        note: "Impossible de savoir laquelle des deux têtes commande. J'ai posé une question : celle de gauche m'a regardé, celle de droite a bâillé. J'attends toujours la réponse.",
    },
    // 079 · Quadroc (ROCHE/SOL)
    quadroc: {
        ecology: "Quatre cailloux brun-gris empilés en petite pyramide bancale, chacun coiffé d'une frimousse — l'un sourit, un autre boude en permanence. L'ensemble tient par pur entêtement collectif et encaisse les chocs bien mieux qu'il ne les rend. Lent et défensif, ce petit tas trapu se cale entre les racines et refuse obstinément de bouger.",
        dicton: "Empilés bien serrés, quatre galets valent mieux qu'un mur.",
        note: "J'ai recompté trois fois : il y a bien quatre visages, et il y en a toujours un pour me faire la tête. Vexé, j'ai fini par lui rendre son regard noir.",
    },
    // 080 · Octoroc (ROCHE/SOL)
    octoroc: {
        ecology: "Amas de huit cailloux brun clair agglutinés en tas roulant, une ribambelle de bouilles souriantes serrées les unes contre les autres. La masse gagne en assise ce qu'elle perd en souplesse : elle encaisse, tangue, mais n'avance qu'à grand-peine. Grégaire et paisible, ce petit troupeau minéral se love dans les creux de terrain.",
        dicton: "Huit dos serrés font une carapace qu'aucun vent ne renverse.",
        note: "J'ai voulu les compter pour mon carnet : à chaque fois j'en oublie un, et à chaque fois c'est un nouveau qui me sourit. Je crois qu'ils le font exprès.",
    },
    // 081 · Hexaroc (ROCHE/SOL)
    hexaroc: {
        ecology: "Gros monticule d'une quinzaine de cailloux gris-brun tassés en dôme, hérissé de petites figures qui pointent dans toutes les directions. Sa cohésion en fait un rempart vivant, lourd et patient, qui préfère absorber les coups plutôt que les rendre. Très lent, il s'installe en tas compact et ne bronche plus une fois posé.",
        dicton: "Plus le tas grossit, plus la patience devient une armure.",
        note: "En m'appuyant dessus pour souffler, j'ai senti une dizaine de regards converger sur moi. On ne s'assied pas sur un Hexaroc : on lui demande d'abord la permission.",
    },
    // 082 · Diamantine (ROCHE/SOL)
    diamantine: {
        ecology: "Butte de pierres en pleine mue cristalline : à la base, de vieux galets ternes ; plus haut, des blocs d'un bleu limpide déjà facettés en gemmes. Une trentaine de frimousses scintillent dans cette masse dure et glacée. Lente mais solidement campée, elle affectionne les affleurements minéraux et les sols riches en cristaux.",
        dicton: "Le diamant ne se presse pas : il durcit, tout simplement.",
        note: "J'ai cru décrocher le pactole et bourré mes poches de 'gemmes'. Elles ont toutes ouvert les yeux en même temps. J'ai tout reposé, très, très poliment.",
    },
    // 083 · Amadiam (ROCHE/SOL)
    amadiam: {
        ecology: "Amas dense de cristaux de diamant bleu taillés en pointe, dressés en épis serrés comme un bouquet de glace éternelle. Chaque gemme facettée porte sa petite bouille et renvoie la lumière en éclats froids. D'une dureté redoutable, la masse encaisse presque tout. Lente et compacte, elle se fige dans les veines minérales des reliefs rocheux.",
        dicton: "Ce que le diamant a mis mille ans à durcir, nul coup ne le fend.",
        note: "Soixante-quatre pointes, soixante-quatre sourires, et une seule envie de me piquer les doigts. J'ai vite appris à admirer Amadiam les mains dans le dos.",
    },
    // 084 · Golémini (ROCHE/SOL)
    golemini: {
        ecology: "Les diamants se sont enfin ordonnés en créature : un petit golem trapu de cristal bleu, doté de bras massifs et d'une démarche pesante, dont le corps entier scintille de facettes constellées de frimousses. Sous cette carapace de gemmes, il encaisse comme un coffre-fort. Lent mais tenace, il patrouille les éboulis cristallins d'un pas lourd.",
        dicton: "Quand les cailloux s'unissent, ils apprennent à marcher — lentement.",
        note: "Premier de la lignée à avoir des bras : il m'a tendu la 'main' pour un caillou, puis a refusé de me le rendre. Un golem, ça négocie dur.",
    },
    // 085 · Mégalithe (ROCHE)
    megalithe: {
        ecology: "Colosse de diamant bleu dressé en tour cristalline, bien plus imposant que ses cadets : un corps massif hérissé de gemmes facettées où s'alignent des dizaines de visages. Sa carapace minérale renvoie tous les assauts et le rend quasi inébranlable. Extrêmement lent, ce rempart vivant se poste sur les hauteurs rocheuses et n'en redescend plus.",
        dicton: "Un mur de diamant ne recule jamais : c'est au monde de le contourner.",
        note: "J'ai voulu mesurer sa taille et j'ai renoncé à mi-hauteur. Mégalithe m'a laissé faire avec la patience d'une montagne — ce qu'il est d'ailleurs presque devenu.",
    },
    // 086 · Limaroche (ROCHE/PSY)
    limaroche: {
        ecology: "Limace au corps mauve pâle et à la tête brun clair fendue d'un sourire placide, surmontée d'un unique pédoncule à pommeau. Sur son dos, une coquille de pierre enroulée en spirale et gravée de volutes fossilisées lui sert d'armure autant que d'ancre. D'une lenteur exaspérante, elle laisse un sillage luisant sur les pierres humides.",
        dicton: "L'esprit va loin quand le corps, lui, ne va nulle part.",
        note: "Je l'ai suivie une heure pour voir où elle allait : elle a franchi deux dalles. Le plus troublant, c'est qu'elle avait l'air de savoir exactement où.",
    },
    // 087 · Escargyle (ROCHE/PSY)
    escaroche: {
        ecology: "Escargot au pied mauve et brun, portant une vaste coquille de pierre spiralée couverte de runes gravées. Ses deux pédoncules se terminent par des yeux en cercles concentriques, comme deux cibles hypnotiques qui semblent lire dans les pensées. Lent et bien blindé, il glisse posément sur les rochers moussus, parfaitement indifférent au tumulte.",
        dicton: "Qui avance lentement voit tout ; qui voit tout n'a plus à courir.",
        note: "Ses deux yeux en spirale m'ont fixé si longtemps que j'ai oublié pourquoi j'étais venu. Je crois qu'il avait lu ma liste de courses avant moi.",
    },
    // 088 · Tortoracle (ROCHE/PSY)
    torturoche: {
        ecology: "Vénérable tortue mauve à la lourde carapace bombée, faite de plaques hexagonales de pierre gravées de runes anciennes. Ses pattes trapues soutiennent une masse considérable, et de sa tête jaillissent des pédoncules coiffés d'yeux en cercles concentriques, au regard d'oracle. Solitaire et méditative, elle avance à pas comptés en ruminant d'obscurs présages.",
        dicton: "L'oracle ne se hâte pas : l'avenir attendra bien qu'il l'ait vu.",
        note: "Je lui ai demandé mon avenir. Elle a cligné lentement de ses yeux en spirale, puis plus rien. Soit elle n'a rien vu, soit c'était trop triste pour le dire.",
    },
    // 089 · Marmoterre (ROCHE/GLACE)
    marmoterre: {
        ecology: "Marmotte trapue au pelage bleu givré, aux joues rondes et aux longues incisives proéminentes. Ses pattes avant et le bout de sa queue s'alourdissent de galets gelés qui cliquettent quand elle trotte. Rongeuse diurne et grégaire, elle hiberne roulée en boule tout l'hiver et siffle pour alerter sa colonie au moindre danger.",
        dicton: "Pierre et givre savent attendre : rien ne presse celui qui hiberne.",
        note: "J'ai cru pouvoir la réveiller pour la peser. Elle a bâillé, resserré sa boule de galets, et s'est rendormie sur mon carnet. J'ai attendu deux heures avant d'oser le récupérer.",
    },
    // 090 · Iorours (ROCHE/GLACE)
    iorours: {
        ecology: "Ourse polaire dressée sur ses pattes, à l'épaisse fourrure bleu pâle et aux plaques de roche grise soudées sur ses épaules et ses avant-bras comme une armure. Ses griffes sombres fendent la glace. Solitaire et territoriale, elle rôde surtout de nuit et défend farouchement son antre contre les intrus.",
        dicton: "Sous la fourrure de givre, un cœur de pierre ne recule jamais.",
        note: "Je l'ai prise pour un rocher enneigé et j'ai posé mon sac dessus. Le rocher s'est levé, m'a dévisagé, puis a poussé un grognement qui m'a coûté mon petit-déjeuner et ma dignité.",
    },
    // 091 · Yétiroche (ROCHE/GLACE)
    yetiroche: {
        ecology: "Colosse simiesque à la crinière bleu glacé hérissée, aux sourcils froncés et aux crocs saillants. Deux cornes de pierre se courbent au-dessus de sa tête, d'énormes gantelets rocheux prolongent ses poings et des pointes de glace saillent de ses épaules. Bourru et solitaire, il martèle les parois gelées pour marquer son domaine.",
        dicton: "Poing de roche et souffle de givre : mieux vaut fuir que défier le géant.",
        note: "Il m'a lancé un bloc de glace en guise de bonjour. J'ai souri poliment, pris trois notes, et reculé très, très lentement jusqu'à disparaître de son champ de vision.",
    },
    // 092 · Têtardoc (ROCHE/EAU)
    tetardoc: {
        ecology: "Têtard grassouillet à la peau grise et rugueuse comme un caillou humide, doté de grands yeux jaunes ronds et d'une longue queue translucide bleutée qui le fait filer sous l'eau. Encore larvaire, il reste en petits groupes près des berges pierreuses et broute les algues accrochées aux galets.",
        dicton: "Petit têtard sur son galet deviendra grand s'il tient bon le courant.",
        note: "Tenter d'en attraper un à mains nues, c'est vouloir saisir un savon dans un torrent. J'ai fini trempé, bredouille, et vaguement applaudi par le reste de la mare.",
    },
    // 093 · Grenarc (ROCHE/EAU)
    grenarc: {
        ecology: "Batracien dressé sur deux pattes, à la peau gris-vert verruqueuse et musculeuse, aux yeux jaunes perçants. Il manie un arc courbe dont la corde et la flèche crépitent d'une énergie bleue liquide. Chasseur patient et solitaire, il se poste immobile sur un rocher avant de décocher son trait sans le moindre tremblement.",
        dicton: "L'archer qui vise juste frappe avant que la vague ne retombe.",
        note: "Il a transpercé une pomme que j'avais posée à trente pas, puis a hoché la tête comme pour dire « à toi ». Je n'avais qu'une pomme. J'ai préféré partir.",
    },
    // 094 · Crapôtaure (ROCHE/EAU)
    crapotaure: {
        ecology: "Colosse batracien-saurien à la carapace de plaques bleu acier, aux muscles saillants et aux yeux jaunes fendus. Il bande un arc immense taillé dans des branches de glace-eau cristalline, dont la corde luit d'un bleu vif. Prédateur étonnamment véloce et solitaire, il enchaîne des salves foudroyantes malgré sa masse imposante.",
        dicton: "Même taillé dans la pierre, on peut voler plus vite que la flèche.",
        note: "On m'avait juré qu'un truc en pierre, ça bouge lentement. Celui-ci a rechargé son arc trois fois avant que je pense seulement à cligner des yeux.",
    },
    // 095 · Revemante (INSECTE/SPECTRE)
    revemante: {
        ecology: "Mante religieuse spectrale d'un violet diaphane, aux grands yeux jaunes vides et aux antennes recourbées. Ses ailes translucides mêlent le mauve et le vert veiné, et ses pattes-faux effilées semblent à peine effleurer le sol tant elle flotte. Nocturne et silencieuse, elle plane sans un bruit entre les tiges et fond sur ses proies.",
        dicton: "Le spectre qui frappe vite ne laisse jamais l'ombre d'un adieu.",
        note: "Je l'ai observée prier dans la brume, parfaitement immobile. Puis elle a disparu entre deux battements de cils. Mon thermos aussi. Coïncidence ? J'en doute fort.",
    },
    // 096 · Nécarabée (INSECTE/SPECTRE)
    necarabee: {
        ecology: "Scarabée-cerf au thorax vert luisant et à l'énorme mandibule cornue recourbée. Sous ses élytres se déploient des ailes translucides rosées, et une aura violette nécrotique nimbe tout son corps. Ses yeux jaunes fixes ne cillent pas. Il vole lourdement de nuit, attiré par la sève fermentée et les carcasses oubliées.",
        dicton: "Corne du scarabée, souffle d'outre-tombe : qui l'entend bourdonner a déjà perdu.",
        note: "Sa corne a fendu la branche sur laquelle je m'appuyais. Il ne semblait même pas m'avoir remarqué. C'est ça, l'humiliation : n'être qu'un obstacle en travers de son vol.",
    },
    // 097 · Nécrolopendre (INSECTE/SPECTRE)
    necrolopendre: {
        ecology: "Immense scolopendre enroulée en S, au corps violet cuirassé de plaques vertes segmentées et parcouru d'innombrables pattes. Des flammes spectrales roses lèchent son dos, et sa tête cornue de démon aux traits verdâtres luit dans l'obscurité. Prédatrice nocturne, elle ondule sans un bruit avant de fondre sur sa proie.",
        dicton: "Qui frappe le premier n'a pas à craindre le second coup.",
        note: "Cent pattes, zéro pitié. Je l'ai vue traverser une clairière avant que le mot « fuir » ne remonte jusqu'à mon cerveau. Mon croquis est flou : mes mains tremblaient encore.",
    },
    // 098 · Colibraise (VOL/FEU)
    colibraise: {
        ecology: "Petit oiseau rond et pelucheux au plumage écarlate, à la bavette crème et au fin bec noir pointu. En guise de queue, une gerbe de flammes orange et jaune palpite et le propulse d'un point à un autre. Vif et curieux, il volette sans cesse et se révèle incapable de tenir en place plus d'un instant.",
        dicton: "Petite braise ailée : ce qui brûle vite s'envole plus vite encore.",
        note: "Impossible à photographier : il était déjà trois fleurs plus loin. J'ai fini par renoncer et simplement profiter de la petite comète rouge tant qu'elle voletait autour de moi.",
    },
    // 099 · Arardent (VOL/FEU)
    arardent: {
        ecology: "Ara flamboyant au corps écarlate et au visage crème, doté d'un solide bec noir crochu. Ses ailes déployées flamboient d'un dégradé de rouge, d'orange, de jaune et de vert, et sa longue queue s'effile en plumes de feu. Bavard et grégaire, il jacasse en plein vol et se perche en bandes bruyantes du matin au soir.",
        dicton: "Aile ardente ne connaît ni la brume ni la lenteur.",
        note: "Il a répété mon juron trois fois, très fort, devant toute sa bande. Ils ont ri. Enfin, je crois que c'était un rire — difficile à dire avec des perroquets.",
    },
    // 100 · Toucanyon (VOL/FEU)
    toucanyon: {
        ecology: "Toucan au plumage rouge et orange, arborant un immense bec rayé de jaune et d'orange au-dessus d'une poitrine crème. Ses ailes et sa queue ne sont que flammes vives, et ses serres acérées fendent l'air. Au regard féroce, il fond en piqué à une vitesse fulgurante, laissant derrière lui une traînée d'étincelles.",
        dicton: "Le feu qui vole vite ne laisse pas le temps d'en sentir la chaleur.",
        note: "J'ai entendu un bang, senti une bouffée d'air brûlant, et perdu mon chapeau. Le temps de lever les yeux, il n'était plus qu'un point rougeoyant à l'horizon.",
    },
    // 101 · Blaziper (PSY/FEU)
    blaziper: {
        ecology: "Serpenteau au corps mince couleur ambre et miel, coiffé de deux grandes oreilles pointues d'un violet sombre qui lui donnent un air de chauve-souris rampante. Sa queue s'achève sur une flamme vive qu'il tient dressée comme une torche. Diurne et solitaire, il chasse à l'affût : il fige sa proie d'un regard doré avant de la saisir, puis se love sur les pierres tièdes pour digérer au soleil.",
        dicton: "Un regard qui brûle vaut mieux qu'un croc qui mord.",
        note: "J'ai pris la flammèche de sa queue pour une bougie oubliée et j'ai voulu l'éteindre d'un souffle. Il m'a rendu la politesse — mes sourcils s'en souviennent encore.",
    },
    // 102 · Flamaspic (PSY/FEU)
    flamaspic: {
        ecology: "Vipère de braise au corps écarlate luisant, flanquée d'immenses oreilles-membranes noires qui frémissent au moindre remous mental. Des flammèches s'échappent de ses écailles quand on la dérange. Nocturne et très territoriale, elle se love en spirale autour d'une roche chaude et fond sur l'intrus d'un jet de feu qu'elle guide par la pensée avant même de siffler.",
        dicton: "Chaleur du corps, feu de l'esprit : deux façons de mordre.",
        note: "Je l'avais rangée dans mon carnet comme une couleuvre assoupie. Erreur : elle m'a fixé, ma gourde s'est mise à bouillir toute seule, et j'ai battu en retraite très, très poliment.",
    },
    // 103 · Vipember (PSY/FEU)
    vipember: {
        ecology: "Cobra royal au capuchon rouge frangé d'or et au long corps violet strié de losanges dorés. Sa tête porte une marque en couronne, et sa queue s'achève en grelot qui vibre d'ondes psychiques juste avant de frapper. Impérieuse et solitaire, elle dresse fièrement le tiers de son corps pour toiser son domaine et n'attaque jamais sans avoir d'abord sondé l'esprit de l'adversaire.",
        dicton: "Qui maîtrise son esprit règne sans jamais dégainer ses crocs.",
        note: "Elle m'a toisé du haut de son capuchon comme un roturier mal peigné. J'ai salué, reculé, et noté en gros dans mon carnet : ne JAMAIS fixer une reine droit dans les yeux.",
    },
    // 104 · Braisécaille (FEU/EAU)
    braisecaille: {
        ecology: "Petite tortue-otarie au corps brun-roux, aux nageoires souples ourlées de bleu givré et à la bouche toujours grande ouverte sur un air réjoui. Sa carapace grise, facettée comme un galet volcanique et sertie de gemmes colorées, laisse filer un mince panache de fumée par son sommet. Joviale et maladroite, elle barbote le jour dans les eaux tièdes et somnole sur les rochers.",
        dicton: "Braise au cœur, écume sur l'écaille : la carapace ne cède pas.",
        note: "Je lui ai gratté la carapace en croyant la rafraîchir ; elle a soufflé un jet de vapeur ravi en pleine figure. Adorable, mais je sens encore le hammam.",
    },
    // 105 · Caldéront (FEU/EAU)
    calderont: {
        ecology: "Colosse-tortue dont la carapace pâle s'élève en un cône volcanique sombre coiffé d'une caldeira fumante. Ses membres écarlates, cuirassés et facettés comme des pinces de crustacé, s'ancrent au sol tel un récif que rien ne déloge. Placide à l'extrême, il somnole des jours entiers au bord de l'eau, réchauffant ses flancs à sa propre lave sans presque jamais bouger.",
        dicton: "Patience de pierre, cœur de lave : rien ne fait plier le récif.",
        note: "J'ai voulu m'asseoir à l'ombre de son joli 'rocher'. Le rocher a grondé, recraché une bouffée de cendre tiède, et je me suis souvenu qu'un volcan, ça respire.",
    },
    // 106 · Brasicow (FEU/COMBAT)
    brasicow: {
        ecology: "Jeune taurillon bipède au pelage brun et au torse musculeux couleur braise, ceinturé de mèches de poils flamboyants qui lui battent les flancs. Deux petites cornes dorées pointent sous sa tignasse ébouriffée, au-dessus d'un mufle rose. Fanfaron et bagarreur, il croise les bras et provoque du regard tout ce qui bouge, s'entraînant sans relâche pour durcir ses poings.",
        dicton: "Bras croisés et poings chauds, le veau rêve déjà d'être taureau.",
        note: "Il a croisé les bras pile au moment où je sortais mon carnet, comme pour la photo. Puis il m'a offert un coup de tête 'amical' qui m'a expédié dans les orties. Charmant garnement.",
    },
    // 107 · Tauricendre (FEU/COMBAT)
    tauricendre: {
        ecology: "Taureau massif à la crinière de cendre noire et au corps rouge braise, dont les pattes se couronnent de flammes rousses. Ses cornes dorées, segmentées et recourbées vers l'avant, pèsent leur poids de tronc et fument sous l'effort. Colérique et solitaire, il charge en soulevant un nuage de cendres, et le sol tremble sous ses lourds sabots à chacun de ses pas.",
        dicton: "Rien ne reste debout devant qui charge tête baissée.",
        note: "Je lui ai barré la route pour un beau cliché. Il a soufflé deux jets de cendre par les naseaux — traduction universelle de 'pousse-toi'. Je me suis poussé. Vite.",
    },
    // 109 · Bélunode (EAU/ELEC)
    belunode: {
        ecology: "Bébé béluga tout rond au corps beige et lisse, aux petits yeux curieux qui sourient. Une étincelle jaune crépite en permanence au-dessus de son front, telle une antenne d'orage miniature. Grégaire et joueur, il nage en petites bandes près de la surface et pépie des cliquetis électriques pour appeler les siens, sursautant dès qu'une ombre passe au-dessus de l'eau.",
        dicton: "Petite étincelle attend patiemment son grand orage.",
        note: "Il m'a suivi le long de la berge en pépiant, puis m'a 'fait un bisou' électrique sur la main. Mignon, mais mes cheveux sont restés dressés une bonne heure.",
    },
    // 110 · Sonarque (EAU/ELEC)
    sonarque: {
        ecology: "Cétacé au dos doré et aux nageoires vert d'eau, le regard barré d'un bandeau sombre. Son évent projette un geyser d'éclairs jaunes qui lui sert à sonder les fonds par échos électriques. Migrateur et sociable, il chante des salves de sonar audibles à des lieues, guide les plus jeunes dans les courants et cartographie l'obscurité des profondeurs à l'oreille.",
        dicton: "Qui sait écouter l'écho voit clair dans le noir.",
        note: "J'ai entrechoqué deux cailloux sous l'eau pour l'imiter ; il m'a répondu d'un jet d'étincelles si joyeux que ma montre s'est arrêtée net. Depuis, je lui parle par gestes.",
    },
    // 111 · Léviathonn (EAU/ELEC)
    leviathonn: {
        ecology: "Léviathan des abysses au corps immense couleur d'or terni, la tête casquée de plaques sombres surmontées de cornes dorées. De son dos jaillissent des arcs de foudre bleutée qui zèbrent l'eau alentour. Solitaire et d'une lenteur imperturbable, il patrouille les grands fonds tel un continent vivant, sans jamais presser l'allure ni dévier de sa route.",
        dicton: "L'océan ne se presse jamais, et pourtant il use la montagne.",
        note: "Vu de loin, je l'ai pris pour un îlot et j'ai failli y accoster mon radeau. L'îlot a cligné d'un œil gros comme ma tête ; j'ai ramé dans l'autre sens sans discuter.",
    },
    // 112 · Jerbiwat (PSY/ELEC)
    jerbiwat: {
        ecology: "Petite gerboise bleue perchée sur deux longues pattes crème faites pour bondir, oreilles immenses et front barré d'un éclair. Ses joues jaunes emmagasinent une charge qu'elle libère en un clin d'œil, et sa queue interminable fouette l'air comme un paratonnerre. Vive et nerveuse, elle sursaute au moindre bruit et détale plus vite qu'un coup de tonnerre.",
        dicton: "L'éclair met du temps à naître, mais nul ne le rattrape.",
        note: "J'ai tenté de la mesurer : trois bonds, une pirouette, et elle avait zappé mon mètre-ruban. Je l'ai retrouvé fondu. Bilan du carnet : très rapide, très chargée, pas patiente.",
    },
    // 113 · Namicha (SPECTRE/ELEC)
    namicha: {
        ecology: "Chaton spectral au pelage roux flamboyant, le museau masqué de violet comme un petit voleur, la collerette et la queue touffues d'un blanc crémeux. Ses pattes sombres se posent sans le moindre bruit. Nocturne et farceur, il se faufile entre les ombres pour chaparder les babioles brillantes, qu'il recharge d'une caresse statique avant de s'évanouir dans le noir.",
        dicton: "L'ombre ne prévient pas, et l'étincelle encore moins.",
        note: "Il m'a subtilisé un bouton de cuivre sous le nez, m'a nargué d'un petit 'zap' sur le bout du doigt, puis s'est volatilisé. Chapardeur électrique : dossier officiellement ouvert.",
    },
    // 114 · Namizeus (SPECTRE/ELEC)
    namizeus: {
        ecology: "Félin spectral dressé sur ses pattes arrière, museau crème et masque violet, moulé dans une combinaison sombre. Il brandit un sceptre en zigzag qui aimante la foudre des nuages d'orage d'où il surgit. Solitaire et strictement nocturne, il ne se matérialise qu'au fracas du tonnerre et se dissipe dès la première éclaircie.",
        dicton: "L'éclair ne prévient jamais : il frappe déjà quand on l'entend.",
        note: "J'ai voulu photographier son sceptre : le flash a répondu par un flash. Mon appareil sent encore le grillé, et lui avait l'air franchement ravi de son coup.",
    },
    // 115 · Boltah (FEU/ELEC)
    boltah: {
        ecology: "Petit guépardeau au pelage jaune vif et à la bouille ronde, une mèche orange en flammèche sur le crâne et une queue terminée par un éclair noir strié de feu. Turbulent et joueur, il gambade en fratrie dès le lever du jour, incapable de tenir en place plus de quelques secondes d'affilée.",
        dicton: "Petite étincelle court déjà plus vite que grande flamme.",
        note: "Impossible d'en garder un dans le cadre : le temps d'appuyer, il avait fait trois fois le tour de mes jambes. J'ai surtout de très belles photos de mes chaussures.",
    },
    // 116 · Heatah (FEU/ELEC)
    heatah: {
        ecology: "Guépard élancé au pelage jaune moucheté de brun sombre, la silhouette affinée pour la course et la queue coiffée d'une flamme. Plus posé que le chiot qu'il fut, il chasse au sprint sur de longues foulées et préfère l'aube ou le crépuscule, quand l'air reste assez frais pour ses poumons.",
        dicton: "Qui veut brûler la piste apprend d'abord à ne pas s'essouffler.",
        note: "J'ai tenté de le chronométrer : ma montre affichait encore le départ qu'il coupait déjà l'arrivée. Là d'où je viens, on appelle poliment ça de la triche.",
    },
    // 117 · Thundah (FEU/ELEC)
    thundah: {
        ecology: "Guépard adulte au pelage doré strié de noir, une crinière de flammes rousses embrasant son cou et son échine. Bâti tout entier pour l'accélération, c'est le plus rapide de sa lignée : il fond sur sa proie dans une traînée d'étincelles avant même qu'elle n'ait bronché. Territorial, il chasse seul.",
        dicton: "Le plus rapide n'a pas d'ombre : elle n'arrive jamais à suivre.",
        note: "On m'avait promis un félin ; je n'ai vu qu'un trait de lumière et senti une odeur de roussi. J'ai coché la case « aperçu » en y ajoutant un gros point d'interrogation.",
    },
    // 118 · Bouh (SPECTRE)
    bouh: {
        ecology: "Grosse bouille rose tout en rondeurs, coiffée d'une antenne charnue qui s'enroule au-dessus du crâne, deux petits yeux plissés et une bouche gourmande qui bave. Sous son air débonnaire, sa chair élastique encaisse les coups sans broncher. Lent et placide, il passe ses journées à somnoler et à mâchonner.",
        dicton: "Chair molle plie sous le poing mais ne rompt jamais.",
        note: "J'ai donné un petit coup de bâton dedans, pour la science : rebond immédiat, bâton perdu, et un rot en guise de remerciement. Étonnamment rancunier, pour un coussin.",
    },
    // 119 · Bouhbou (COMBAT/SPECTRE)
    bouhbou: {
        ecology: "Version musclée et affûtée du bonhomme rose : torse sculpté, poings énormes, regard rouge et rictus carnassier, sanglé dans un pantalon bouffant à ceinture dorée. Sa longue queue-antenne s'achève par une boule qu'il fait claquer comme un fouet. Solitaire et querelleur, il cherche la bagarre plus qu'il ne la fuit.",
        dicton: "Un poing fantôme traverse même les murs les plus épais.",
        note: "Il m'a proposé un bras de fer « entre amis ». J'ai encore l'épaule de travers, et lui riait déjà en cherchant l'adversaire suivant. Entre amis, qu'il disait.",
    },
    // 120 · Brook (SPECTRE)
    brook: {
        ecology: "Petit spectre fait d'une nuée violette cotonneuse sur laquelle flotte une frimousse de crâne blanc, le tout coiffé d'un minuscule haut-de-forme. Sa queue vaporeuse s'enroule en volute sous lui. Timide et casanier, il hante les recoins tranquilles et se dilue dans la pénombre au moindre bruit suspect.",
        dicton: "Fantôme sans hâte hante plus longtemps que vif trépas.",
        note: "Il a soulevé son petit chapeau pour me saluer, très poliment, avant de me chiper mon crayon et de s'évaporer avec. Un gentleman, mais un gentleman voleur.",
    },
    // 121 · Brookhanté (SPECTRE)
    brookhante: {
        ecology: "Grand spectre squelettique surmonté d'une tignasse violette hérissée en afro, le visage réduit à un crâne blanc grimaçant. Ses longs bras diaphanes se figent en givre bleuté et son corps se change en flammes spectrales pâles vers le sol. Imperturbable, il flotte des nuits entières sans jamais toucher terre.",
        dicton: "Les vieux os sont ceux qui résistent le mieux aux tempêtes.",
        note: "Je lui ai demandé son âge, par politesse ; il a répondu par un éclat de rire qui a duré trois bonnes minutes et m'a glacé jusqu'aux miens. Je n'ai pas insisté.",
    },
    // 122 · Hibouh (SPECTRE)
    hibouh: {
        ecology: "Petit hibou tout rond au plumage bleu nuit, le disque facial lavande éclairé par deux grands yeux verts où luit un croissant. De courtes aigrettes pointent sur sa tête et de menues serres violettes le portent maladroitement. Frêle et craintif, il veille perché en solitaire, du crépuscule jusqu'à l'aube.",
        dicton: "Petit hibou voit dans le noir ce que le grand jour dissimule.",
        note: "Il m'a fixé sans ciller un bon quart d'heure, la tête inclinée, l'air de me juger jusqu'au fond de l'âme. J'ai fini par m'excuser sans même savoir de quoi.",
    },
    // 123 · Chouhanté (PSY/SPECTRE)
    chouhante: {
        ecology: "Hibou lunaire au plumage indigo constellé de points pâles, un croissant turquoise gravé sur le front et un autre luisant sur le poitrail. Ses yeux phosphorescents percent l'obscurité comme deux petites lunes. Créature nocturne et méditative, il tournoie en silence sous le ciel étoilé, discret comme une ombre.",
        dicton: "Sous la lune, l'esprit vole plus vite que l'aile.",
        note: "J'aurais juré l'avoir vu à deux endroits en même temps ; il paraît que c'est sa spécialité. Ou alors j'avais trop veillé. Les deux, très probablement.",
    },
    // 124 · Archibouh (PSY/SPECTRE)
    archibouh: {
        ecology: "Hibou-chaman drapé d'un manteau cérémoniel et coiffé d'un masque ouvragé couvert de glyphes turquoise. Ses yeux irradient une lueur froide et ses serres crochues trahissent un chasseur autant qu'un mystique. Solitaire et hiératique, il officie de nuit, tissant sommeil et illusions autour de quiconque croise son regard.",
        dicton: "Frappe vite, endors plus vite, et disparais avant la riposte.",
        note: "Il a marmonné trois syllabes et je me suis réveillé deux heures plus tard, le carnet rempli de gribouillis que je ne me souviens absolument pas d'avoir tracés. Charmant.",
    },
    // 125 · Goshendofy (DRAGON)
    goshendofy: {
        ecology: "Immense dragon serpentin aux écailles d'argent rehaussées d'or, le corps interminable lové en une double boucle sans fin. Des bois dorés couronnent sa tête, une crinière blanche ondoie autour de son mufle et de longues moustaches fendent l'air. Être quasi mythique, il plane sans ailes au gré des courants et ne se montre qu'à de très rares élus.",
        dicton: "Le vrai dragon ne se chasse pas : c'est lui qui décide de vous voir.",
        note: "On m'avait dit « légende locale, sûrement de la brume et beaucoup d'imagination ». J'ai croisé son regard rouge une demi-seconde, puis refermé mon carnet : certaines lignes, on ne les écrit pas, on les respecte.",
    },
    // 126 · Gékroc (SOL/ELEC)
    gekroc: {
        ecology: "Grand saurien de pierre au corps trapu, cuirassé de plaques rocheuses et hérissé d'éclats minéraux gris-brun. Des veines de foudre jaune parcourent son dos jusqu'au bout de sa longue queue, qui s'achève en une touffe électrique crépitante. Ses yeux d'ambre restent quasi immobiles ; solitaire et sédentaire, il se tapit sous les strates et n'accumule sa charge que très lentement.",
        dicton: "La pierre encaisse tout et la foudre attend son heure : rien ne presse le rocher.",
        note: "J'ai voulu vérifier si sa queue chatouillait. Verdict : mes sourcils repoussent doucement, et j'ai ajouté au carnet la règle 'ne jamais tripoter le lézard qui grésille'.",
    },
    // 127 · Carlinou (FEU/DRAGON)
    carlinou: {
        ecology: "Bébé carlin à la bouille fripée et au corps beige tout rond, presque toujours roulé en boule à dormir. Sa minuscule flamme intérieure ne demande qu'à s'éveiller : pour l'heure, il ronfle paisiblement près d'une feuille tombée, une petite baie rougeoyante au bout de la queue. Frêle et câlin, il ne s'éloigne jamais de son coin de sieste.",
        dicton: "Même le plus petit dragon rêve de flammes avant de savoir marcher.",
        note: "Impossible de le réveiller pour poser. J'ai fini par croquer ses ronflements : c'est le portrait le plus paisible, et de loin le plus baveux, de tout mon carnet.",
    },
    // 128 · Carlembre (FEU/DRAGON)
    carlembre: {
        ecology: "Le carlinou a grandi en petite boule d'énergie : toujours dodu et fripé, il se dresse fièrement sur son arrière-train, deux cornes pointant du crâne et une paire d'ailes de dragon vertes déployées. Sa queue écailleuse orangée, ourlée d'épines, se termine par une flammèche vive. Vif et espiègle, il volette encore maladroitement en cherchant l'affrontement.",
        dicton: "Petites ailes, grand feu : la fougue vaut déjà les crocs.",
        note: "Il a voulu m'impressionner en crachant du feu ; il n'a produit qu'un rot fumant et trois étincelles. Je l'ai applaudi quand même, il était bien trop content de lui.",
    },
    // 129 · Dracarlin (FEU/DRAGON)
    dracarlin: {
        ecology: "Carlin devenu colosse ailé : crinière fournie, grandes cornes de bélier brunes enroulées et regard turquoise perçant. Son échine et sa queue se sont couvertes d'écailles orangées, tandis que d'immenses ailes pourpres se déploient dans son dos. Massif mais étonnamment prompt, il charge tête baissée et frappe comme la foudre avant de rugir.",
        dicton: "Qui frappe vite et fort n'a pas besoin de rugir deux fois.",
        note: "Le chiot baveur d'hier me dépasse aujourd'hui d'une tête et me renifle de haut. Je garde une friandise en poche, au cas où il se souviendrait du bon vieux temps.",
    },
    // 130 · Glacirex (DRAGON/GLACE)
    glacirex: {
        ecology: "Petit saurien bipède aux écailles bleu glacier, silhouette de tyrannosaure juvénile. De courtes collerettes de givre blanc hérissent sa nuque, sa mâchoire semble prise dans la glace et ses yeux rouges brillent d'un appétit précoce. Ses bras sont menus mais ses pattes déjà solides ; joueur et vorace, il mordille tout ce qui gèle sous sa dent.",
        dicton: "Jeune croc de givre finira bien par mordre les dragons.",
        note: "Adorable, jusqu'à ce qu'il tente de congeler ma gourde — et ma main avec. Petit, mais il a déjà le regard de quelqu'un qui compte grandir.",
    },
    // 131 · Cryotyran (DRAGON/GLACE)
    cryotyran: {
        ecology: "Colosse glaciaire à l'allure de tyrannosaure, cuirassé d'écailles bleu acier et bardé d'une crête d'épines de glace blanche courant de la nuque à la queue. Ses crocs et ses griffes sont taillés dans le givre, ses yeux rouges luisent d'une froide fureur. Solitaire et territorial, il règne sur les étendues gelées et exhale un souffle qui pétrifie l'air.",
        dicton: "Le froid ne pardonne pas, et la mâchoire du géant encore moins.",
        note: "J'ai cru retrouver son petit cousin joueur ; grave erreur. Ce mastodonte a soufflé une bourrasque qui a changé mon encrier en glaçon. Croquis terminé de mémoire, au coin du feu.",
    },
    // 132 · Orcaline (GLACE/EAU)
    orcaline: {
        ecology: "Orque dressée sur deux pattes, à la livrée noir et blanc caractéristique du tueur des mers, rehaussée d'éperons de glace cristalline aux épaules, aux bras et le long de la queue. Ses yeux bleus sont vifs, sa silhouette fuselée et gracile. Rapide et rusée, elle file dans les eaux glacées et frappe d'un jet d'écume gelée avant qu'on la voie venir.",
        dicton: "L'orque n'a pas besoin de force : la vitesse et le froid coulent les plus gros.",
        note: "Elle a enchaîné un salto avant de m'éclabousser d'eau à zéro degré, l'air terriblement fière. Je jurerais qu'elle m'a nargué — et, honnêtement, elle l'avait bien mérité.",
    },
    // 133 · Sylvebarbe (SOL/PLANTE)
    sylvebarbe: {
        ecology: "Ancien colosse de bois à la carrure d'arbre millénaire : tronc gris crevassé, longues cornes de bois flotté recourbées et vaste ramure de feuillage vert lui tenant lieu de barbe et de crinière. Son visage de vieille chouette de bois fixe le monde de deux yeux d'or lumineux. Immensément lent et patient, il s'enracine des saisons durant, mur vivant contre vents et marées.",
        dicton: "Le vieux chêne ne court pas ; il attend simplement que l'orage se lasse.",
        note: "Je l'ai pris pour un arbre mort et je me suis assis dessus pour déjeuner. Il a cligné des yeux. J'ai présenté les excuses les plus plates de toute ma carrière d'explorateur.",
    },
    // 134 · Tonytony (NORMAL)
    tonytony: {
        ecology: "Petite créature tout en fourrure brune ébouriffée, au corps rond et moelleux, ornée d'une paire d'ailes duveteuses roses dignes d'un angelot. Ses grands yeux brillants, ses joues roses et son museau bleuté respirent la douceur. Réservoir de vitalité ambulant, elle soigne et réconforte les siens, mais son corps tout mou s'effondre au moindre coup un peu vif.",
        dicton: "Grand cœur, peau tendre : on encaisse mieux les peines que les gifles.",
        note: "Elle m'a soigné une cheville foulée à force de câlins. Très efficace, mais j'ai dû jurer de ne raconter à personne que je me suis fait dorloter par une peluche ailée. C'est raté.",
    },
    // 135 · Gékraise (ROCHE/FEU)
    gekraise: {
        ecology: "Jumeau incandescent du saurien de pierre : même corps rocheux trapu et cuirassé de plaques, mais parcouru cette fois de fissures de lave orange vif qui rougeoient sous l'écaille. Sa longue queue s'embrase pour de bon d'une flamme dansante. L'œil d'or luit comme une braise ; brûlant et brutal, il fend la roche d'un coup de patte pour cracher son magma.",
        dicton: "Roche fendue, feu craché : mieux vaut frapper le premier que finir grillé.",
        note: "Son frère se contente de grésiller ; lui carbonise. J'ai posé mon carnet trop près : il me reste la couverture et une belle leçon sur la distance de sécurité.",
    },
    // 136 · Ukognos (FEE)
    ukognos: {
        ecology: "Lutin espiègle au corps sombre et élancé, vêtu d'une tunique rouge, arborant un large sourire carnassier et des yeux malicieux. Une couronne de flammes féeriques rose et magenta danse autour de sa tête et de ses mains, tandis qu'une longue queue sombre ondule derrière lui. Insaisissable et farceur, il flotte au-dessus du sol et jette ses feux enchantés en ricanant.",
        dicton: "Feu follet, esprit vif : on n'attrape pas la flamme qui rit.",
        note: "Il m'a subtilisé mon crayon, l'a fait flotter hors de portée, puis me l'a rendu... raccourci de moitié. J'ignore comment on négocie avec un feu follet, mais lui trouvait ça hilarant.",
    },
    // 137 · Merorem (POISON/INSECTE)
    merorem: {
        ecology: "Entité pestilentielle au corps humanoïde vert sombre, prolongé d'une multitude de longs tentacules segmentés qui s'étalent comme des racines vénéneuses. Une carapace en dôme coiffe sa tête aux yeux pâles et luisants, et un étrange organe circulaire orne son épaule. Lente et implacable, elle diffuse ses miasmes en silence et laisse le poison faire tout le travail.",
        dicton: "Le poison n'a jamais besoin de courir : le temps est déjà de son côté.",
        note: "Elle n'a pas bougé d'un tentacule pendant que je l'observais — jusqu'à ce que je remarque l'odeur, et que mes plantes d'herbier virent au noir. J'ai plié bagage sans demander mon reste.",
    },
    // 138 · Morrow (GLACE/PSY)
    morrow: {
        ecology: "Illusionniste humanoïde à la crinière rose vif hérissée et au maillot sombre marqué de symboles de cartes à jouer. Ses longs bras fuselés et sa démarche théâtrale bercent quiconque croise son regard : elle mène ses proies dans un ballet lent avant de les endormir d'un souffle glacé. Solitaire et cabotine, elle se produit au crépuscule et s'éclipse dès qu'on l'applaudit.",
        dicton: "Le rêve court plus vite que le poing : endors ton rival avant qu'il ne lève la main.",
        note: "M'a proposé un tour de cartes ; je me suis réveillé trois heures plus tard, sans provisions et une écharpe tricotée nouée au cou. Beau spectacle, ceci dit.",
    },
    // 139 · Gavillus (VOL/ROCHE)
    gavillus: {
        ecology: "Jeune saurien gris-bleu à l'œil orange vif et au ventre crème, hérissé de plaques rocheuses fauves le long du dos et de la queue. Vif et mordant malgré sa taille, il court bien plus qu'il ne vole encore, et ses écailles minérales durcissent au soleil. Turbulent et solitaire, il grimpe sur les promontoires secs pour guetter à découvert.",
        dicton: "Petite mâchoire, grande morsure : mieux vaut être vif que lourd.",
        note: "Il m'a arraché un lacet en croyant chasser un lézard. Je l'ai laissé gagner — on ne discute pas avec un bébé qui mord aussi fort.",
    },
    // 140 · Crocodaillus (VOL/ROCHE)
    crocodaillus: {
        ecology: "Crocodile ailé au corps gris ardoise constellé de nodules rocheux dorés, désormais pourvu de membranes coriaces vert-de-gris tendues sur des doigts osseux. Il plane bas, fond en piqué et referme ses mâchoires avant même d'avoir frôlé le sol. Chasseur diurne et impatient, il niche sur les corniches battues par le vent.",
        dicton: "Qui vole vite frappe deux fois avant qu'on ait songé à riposter.",
        note: "J'ai vu son ombre passer, puis mon chapeau a disparu. Il paraît qu'il collectionne les couvre-chefs des explorateurs distraits.",
    },
    // 141 · Alirocaillus (VOL/ROCHE)
    alirocaillus: {
        ecology: "Colosse saurien blindé de plaques minérales piquetées d'or, aux immenses ailes vert-bronze nervurées comme du cuivre. Sa queue barbelée fouette l'air quand il fond du ciel, griffes en avant. Prédateur souverain et solitaire, il domine les cimes rocailleuses et n'y tolère aucun rival, pas même son ombre.",
        dicton: "Aile de pierre, griffe de foudre : la vitesse est déjà à moitié la victoire.",
        note: "Impossible à esquiver, impossible à amadouer : j'ai troqué mon dernier sandwich contre le droit de le croquer de loin. Marché honnête, vu la taille des griffes.",
    },
    // 142 · Goatiny (SOL/ELEC)
    goatiny: {
        ecology: "Chevreau au pelage beige taché de brun, coiffé de petits bourgeons de cornes dorées comme une couronne naissante. Sa queue en éclair jaune crépite dès qu'il s'excite, et ses sabots puisent l'électricité dans le sol. Joueur et grégaire, il gambade en petites hardes et bute tout ce qui bouge, sans grande vitesse mais débordant d'énergie.",
        dicton: "L'orage patient gronde sous les sabots bien avant d'éclater.",
        note: "M'a foncé dessus tête baissée pour un trognon de pomme, puis m'a électrisé les doigts en le dévorant. Rancunier, le petit.",
    },
    // 143 · Mouflorage (SOL/ELEC)
    mouflorage: {
        ecology: "Mouflon massif à la toison brune striée de crème, couronné de deux grandes cornes spiralées couleur d'or. Sa queue en zigzag emmagasine des décharges qu'il libère d'un coup de tête tonnant. Territorial et endurant, il tient les hauteurs pierreuses et charge quiconque empiète sur son pâturage.",
        dicton: "Corne solide et foudre en réserve : on ne bouscule pas la montagne qui gronde.",
        note: "Je me suis appuyé à ce que je prenais pour un rocher tiède. C'était lui. J'ai décollé de trois mètres, poliment.",
    },
    // 144 · Magnetor (FEU/METAL)
    magnetor: {
        ecology: "Golem d'acier noirci portant une forteresse crénelée sur le dos, cheminée fumante crachant une colonne de suie. Des veines de lave incandescente courent entre ses plaques rivetées, et ses poings blindés s'embrasent à chaque coup. Colosse quasi immobile, il avance comme un donjon en marche : il n'a besoin d'aucun abri, il EST l'abri.",
        dicton: "Mur de fer et cœur de braise : on ne renverse pas un château qui frappe.",
        note: "J'ai tenté de m'abriter de la pluie sous ses remparts. Erreur : à l'intérieur aussi, il pleuvait des étincelles.",
    },
    // 145 · Éléfer (METAL)
    elefer: {
        ecology: "Éléphanteau de fer poli, assis sur son arrière-train, trompe encore maladroite et grandes oreilles tôlées qui claquent au moindre bruit. Sa peau d'acier rivetée le rend lourd et lent, mais quasi imperméable aux coups. Craintif et casanier, il reste blotti près des siens et se recroqueville en boule métallique au premier danger.",
        dicton: "Peau d'acier, cœur tranquille : rien ne presse celui qu'on ne peut entamer.",
        note: "Lourd comme une enclume et deux fois plus câlin. Il s'est endormi contre ma botte ; j'ai dû camper sur place jusqu'au matin.",
    },
    // 146 · Barrisfer (METAL)
    barrisfer: {
        ecology: "Éléphant d'acier trapu à la trompe enroulée et aux yeux orange incandescents, désormais campé sur quatre pattes-colonnes. Des rainures rougeoyantes chauffent le long de ses flancs blindés, signe de la fournaise qui gronde sous sa carapace. Placide mais inébranlable, il barre les passages étroits et refuse tout simplement de bouger quand on le pousse.",
        dicton: "Ce qui ne recule jamais n'a pas besoin de savoir courir.",
        note: "J'ai voulu le contourner sur le sentier. Il s'est décalé pile pour rester devant moi. Je crois qu'il trouvait ça drôle.",
    },
    // 147 · Colosfer (METAL)
    colosfer: {
        ecology: "Mammouth de métal cuirassé, front hérissé d'une corne d'acier et flancs zébrés de veines rougeoyantes. Ses défenses recourbées labourent la pierre et ses plaques rivetées encaissent l'avalanche sans broncher. Solitaire et souverain, ce rempart ambulant trace sa route en ligne droite : ce sont les obstacles qui s'écartent.",
        dicton: "Forteresse qui marche n'a jamais eu à apprendre à fuir.",
        note: "Il a traversé un éboulis comme moi une flaque. J'ai renoncé à mesurer ses défenses : mon mètre ruban n'y a pas survécu.",
    },
    // 148 · Cornaïve (FEE)
    cornaive: {
        ecology: "Poulain-licorne au pelage crème et à la crinière rose pastel, coiffé d'une petite corne spiralée dorée. Ses grands yeux brillants et ses joues roses désarment jusqu'aux plus grognons, tandis que sa corne diffuse une lueur féerique tiède. Timide et joueur, il s'endort volontiers pelotonné dans les clairières fleuries, en petit groupe rassuré.",
        dicton: "Charme léger et pas léger : la grâce va plus loin que la force.",
        note: "Trop mignon pour être honnête : pendant que je fondais devant ses grands yeux, il a englouti la moitié de mon herbier.",
    },
    // 149 · Astracorne (FEE)
    astracorne: {
        ecology: "Licorne élancée au corps crème et à la longue crinière rose flottante, sa corne spiralée dorée fendant l'air à chaque bond. Plus vive et gracile que le poulain qu'elle était, elle danse plus qu'elle ne galope et projette des étincelles féeriques d'un simple mouvement de tête. Élégante et un brin capricieuse, elle rôde à l'aube dans les prés étoilés de rosée.",
        dicton: "Corne d'étoile et sabot léger : qui danse vite frappe sans qu'on la voie.",
        note: "Elle m'a laissé approcher, m'a laissé tendre la main… puis a détalé en riant presque. Je jure qu'elle savait exactement ce qu'elle faisait.",
    },
    // 150 · Lunarque (FEE)
    lunarque: {
        ecology: "Alicorne à la robe crème et à la crinière rose vaporeuse, coiffée d'une corne torsadée d'or et dotée de petites ailes emplumées rose pâle. Créature solitaire et gracile, active surtout la nuit, elle galope sans bruit sur les hauteurs baignées de lune et ne se laisse guère approcher qu'aux premières lueurs de l'aube.",
        dicton: "Le clair de lune court plus vite que l'ombre qui le suit.",
        note: "J'ai cru voir un simple poney échappé d'un manège… jusqu'à ce qu'il déploie ses ailes et s'évanouisse dans un rayon de lune, me laissant planté là comme un piquet.",
    },
    // 151 · Coccipoing (COMBAT/INSECTE)
    coccipoing: {
        ecology: "Larve de coccinelle joufflue aux immenses yeux brillants, au corps gris argenté et à l'élytre rouge moucheté de noir. Elle enfile déjà des gants de boxe rouges frappés d'une étoile ardente et s'entraîne sans relâche, malgré une carapace encore bien tendre. Vit en petites bandes turbulentes et diurnes.",
        dicton: "Frappe la première, car ta carapace, elle, ne pardonne rien.",
        note: "Haute comme trois pommes et déjà persuadée de pouvoir m'aligner. Un crochet dans le tibia plus tard, j'avoue qu'elle a du répondant.",
    },
    // 152 · Coccombat (COMBAT/INSECTE)
    coccombat: {
        ecology: "Coccinelle anthropomorphe et musclée, au corps gris cuirassé, coiffée d'un bandeau de guerrier et gardant sur le dos une élytre rouge à pois noirs en guise de bouclier. Ses gants de boxe rouges, dont l'un marqué d'une étoile, ne quittent jamais ses poings. Duelliste solitaire au sourire narquois, elle défie quiconque croise son regard.",
        dicton: "Un bon poing vaut mieux que dix carapaces.",
        note: "M'a salué d'un signe de tête très courtois avant de m'expliquer, gant à l'appui, que je gênais son entraînement.",
    },
    // 153 · Coccimpératrice (COMBAT/INSECTE)
    coccimperatrice: {
        ecology: "Impératrice coccinelle à quatre bras, dressée sur ses pattes, arborant une vaste élytre rouge et orangé mouchetée de noir déployée telle une cape. Une fine couronne ceint son front gris, et ses quatre poings frappent avec une vélocité redoutable. Souveraine altière et diurne, elle ne tolère aucun rival à sa hauteur.",
        dicton: "Quatre poings frappent toujours plus vite que la peur.",
        note: "J'ai compté ses bras deux fois pour être bien sûr. Résultat : quatre directs encaissés avant même d'avoir sorti mon carnet.",
    },
    // 154 · Aquilord (VOL/NORMAL)
    aquilord: {
        ecology: "Rapace majestueux au plumage d'or brun, hérissé de gemmes turquoise sur la crête, le poitrail et le bout des ailes qu'il déploie en une envergure impressionnante. Serres acérées, œil de braise : ce souverain solitaire fend les hauts vents en plein jour et ne pose ses griffes que sur les pics les plus inaccessibles.",
        dicton: "Le roi du ciel ne baisse jamais les yeux.",
        note: "Ses plumes scintillent tellement qu'on le repère à des lieues ; lui, en revanche, m'avait repéré bien avant que je songe seulement à lever la tête.",
    },
    // 155 · Mimimoy (NORMAL)
    mimimoy: {
        ecology: "Petit marsupial brun au ventre rondelet, dressé sur ses pattes arrière, avec de grands yeux sombres et un sourire perpétuel. Il pare son oreille d'une fleur rose et porte un collier fleuri autour du cou, une baie serrée entre les pattes. Curieux et grégaire, actif le jour, il collectionne tout ce qui brille.",
        dicton: "Vif comme le vent, mais le sourire n'a jamais musclé personne.",
        note: "Adorable jusqu'au moment où j'ai constaté qu'il m'avait chipé un bouton doré pour l'ajouter à sa petite collection.",
    },
    // 156 · Gékosmic (ROCHE/PSY)
    gekosmic: {
        ecology: "Gecko à la peau rocailleuse gris-brun, hérissée d'arêtes minérales, dont la longue queue s'achève en cristaux violets. Le long de son échine court une foudre magenta d'énergie psychique. Malgré sa carapace de pierre, il file à une vitesse déconcertante ; gardien solitaire, il semble avoir assimilé le savoir de toutes les capacités.",
        dicton: "Même la pierre peut penser plus vite que toi.",
        note: "J'ai voulu le contourner par la ruse. Il avait déjà anticipé mes trois prochains pas et changé de rocher avant que je bouge.",
    },
    // 157 · Hypnoppo (PSY)
    hypnoppo: {
        ecology: "Bébé hippopotame potelé au cuir lavande, gros crâne et joues roses, qui tient contre son ventre une orbe rose tourbillonnante aux reflets hypnotiques. Fragile et somnolent, il passe le plus clair du jour à faire la sieste en petits groupes et n'endort les curieux que pour mieux poursuivre son propre rêve.",
        dicton: "Un seul regard endort le plus vaillant des veilleurs.",
        note: "Je m'étais juré de ne pas m'assoupir. Je me suis réveillé deux heures plus tard, l'orbe tournoyant encore tranquillement sous mes yeux.",
    },
    // 158 · Téléppo (PSY)
    teleppo: {
        ecology: "Hippopotame violet trapu sur ses quatre pattes, canines saillantes, dont les flancs sont marqués de spirales psychiques. Télépathe et téléporteur, il apparaît et s'évanouit sans prévenir. Semi-grégaire et diurne, il patrouille tranquillement son domaine, bien plus prompt à disparaître qu'à combattre.",
        dicton: "Cligne des yeux, et l'hippo n'est déjà plus là.",
        note: "Je le tenais au bout de mon crayon ; le temps de tailler la mine, il était derrière moi à me fixer d'un air parfaitement blasé.",
    },
    // 159 · Omnhippo (PSY)
    omnhippo: {
        ecology: "Hippopotame violet ascensionné, dressé debout, le corps gravé de runes cosmiques rose vif et les yeux nimbés de blanc. De grandes ailes iridescentes, mi-papillon mi-mirage, se déploient dans son dos. Sage solitaire d'une endurance remarquable, il médite en lévitant loin des regards indiscrets.",
        dicton: "L'esprit qui s'élève emporte le corps avec lui.",
        note: "Voir une tonne d'hippopotame flotter paisiblement à hauteur de mes yeux remet sérieusement en question tout ce que je croyais savoir sur la gravité.",
    },
    // 160 · Karmaki (PLANTE/PSY)
    karmaki: {
        ecology: "Moine végétal élancé à la peau verte, coiffé d'une couronne de feuilles, qui médite en lotus au-dessus d'une longue tige enroulée s'achevant en bouton de lotus pourpre. Le bas de son corps se pare de teintes sombres et ses paumes s'ouvrent en signe d'apaisement. Ascète solitaire au calme imperturbable.",
        dicton: "La patience du sage enracine plus sûrement que la force ne renverse.",
        note: "Je lui ai posé trois questions. Il a répondu par un silence si serein que j'ai fini par trouver mes réponses tout seul.",
    },
    // 161 · Otama (COMBAT/EAU)
    otama: {
        ecology: "Têtard tout rond au corps orange vif, arborant un sourire aux yeux plissés et des spirales sur les joues. Un bandeau ceint son front, surmonté d'une crête jaune en éventail, et deux petites pattes bleues dépassent sous son ventre. Fragile et lent à éclore, ce petit combattant grandit en bancs joyeux dans les eaux peu profondes.",
        dicton: "Petit têtard patient deviendra grand poing.",
        note: "Il a pris sa pose de combat, bandeau bien serré, face à un caillou trois fois plus gros que lui. Le caillou n'a pas bougé ; sa fierté non plus.",
    },
    // 162 · Gamaruto (COMBAT/EAU)
    gamaruto: {
        ecology: "Batracien bipède à la peau brun-fauve et au ventre plus clair, coiffé d'une cagoule noire dont pendent deux lanières. Poings et chevilles bandés, il pétrit entre ses palmes une sphère d'eau tourbillonnante. Discipliné et solitaire, il s'entraîne de nuit au bord des mares et médite les yeux mi-clos avant chaque frappe.",
        dicton: "Le poing qui frappe comme l'onde ne laisse jamais d'écho.",
        note: "Je l'ai vu répéter le même enchaînement mille fois sur un tronc sans jamais souffler. Moi, j'étais essoufflé rien qu'en le regardant.",
    },
    // 163 · Uzumaro (COMBAT/EAU)
    uzumaro: {
        ecology: "Crapaud-sage massif au ventre orange strié de motifs rouges façon kimono, bras croisés en signe de calme. Sa tête s'orne d'oreilles sombres et de longues tresses noires qui traînent au sol, un chapelet de perles au cou. Sédentaire et méditatif, il siège des heures immobile et n'entre en action qu'une fois certain de vaincre.",
        dicton: "La patience du crapaud pèse plus lourd que la fureur du torrent.",
        note: "Il a attendu que je finisse ma phrase, mon repas ET ma sieste avant de daigner bouger. Puis il a réglé le combat en un seul geste.",
    },
    // 164 · Wistree (SPECTRE/PLANTE)
    wistree: {
        ecology: "Petit esprit sylvestre à l'écorce grise, flottant sans jamais toucher terre. Une couronne de fleurs dorées coiffe son crâne ; grappes de baies violettes et feuilles vertes s'enroulent à ses bras grêles, et ses yeux luisent d'un bleu-violet spectral. Discret, il dérive dans les sous-bois et absorbe l'éclat des couleurs alentour.",
        dicton: "La forêt ne vole rien : elle emprunte, puis reprend tout.",
        note: "Ma boussole en laiton a perdu son brillant après son passage, ternie comme une vieille cuillère. Coquette, la plante.",
    },
    // 166 · Dalugazer (EAU/GLACE)
    dalugazer: {
        ecology: "Requin trapu au dos bleu nuit et au ventre blanc, hérissé de courtes nageoires dorsales pointues. Ses grandes pectorales palmées se bordent de givre translucide, comme taillées dans la glace. Le regard mauvais et la mâchoire garnie, il patrouille seul les eaux les plus froides et fond sur sa proie sans le moindre remous.",
        dicton: "En eaux froides, le chasseur ne fait aucun bruit.",
        note: "Je l'ai pris pour un dauphin joueur jusqu'à ce qu'il montre les dents. J'ai ramé plus vite que jamais de toute ma vie.",
    },
    // 167 · Moby D (EAU/GLACE)
    mobyd: {
        ecology: "Serpent de mer immaculé aux écailles blanc nacré, au corps sinueux lové sur lui-même. Deux vastes ailes membraneuses d'un bleu glacé se déploient dans son dos, et de fines cornes couronnent sa tête altière. Créature rare et solitaire, il émane une aura froide qui fait scintiller l'air ; les anciens le disent presque mythique.",
        dicton: "Les légendes dorment au fond ; malheur à qui les réveille.",
        note: "On m'avait juré qu'il n'existait pas. J'ai baissé mon carnet deux secondes, il avait déjà disparu, et l'eau autour de moi était gelée.",
    },
    // 168 · Shady (NORMAL/SPECTRE)
    shady: {
        ecology: "Chaton élancé au pelage bleu-violet et aux grands yeux verts. Sa queue fine se termine par une petite houppe orangée qui vacille comme une flammèche. Vif et joueur, il bondit sans prévenir et disparaît aussi vite ; on le croise surtout au crépuscule, quand la lumière brouille ses contours et le rend presque translucide.",
        dicton: "Chat de l'ombre porte chance à qui griffe au bon moment.",
        note: "Impossible de le prendre en croquis : dès que je lève le crayon, il est déjà trois pas plus loin, l'air de rien.",
    },
    // 169 · Shade (NORMAL/SPECTRE)
    shade: {
        ecology: "Félin d'un bleu-violet plus soutenu, au poil hérissé le long de l'échine comme sous une décharge. Ses yeux verts perçants et ses griffes luisant d'un vert spectral trahissent l'agressivité. Toujours tapi, prêt à détaler ou à fondre, il rôde en marge des sentiers et laisse au sol des traces qui s'effacent au matin.",
        dicton: "Griffe rapide vaut mieux que deux coups hésitants.",
        note: "Il a lacéré mon sac à dos par pur principe, sans rien voler dedans. Un critique d'art, à sa façon.",
    },
    // 170 · Shadow (NORMAL/SPECTRE)
    shadow: {
        ecology: "Grand prédateur mi-félin mi-loup, à la fourrure bleu-violet marbrée de plaques bleu nuit. Une crinière ébouriffée cerne sa gueule, ses griffes rayonnent d'un vert spectral et sa queue touffue fouette l'air. Ultra-rapide et silencieux, il chasse seul dès la tombée de la nuit et fond sur sa proie avant même qu'elle n'ait senti sa présence.",
        dicton: "Le prédateur ne poursuit pas : il est déjà devant la proie.",
        note: "Je n'ai jamais vu Shadow arriver, seulement les empreintes vertes déjà refroidies derrière moi. J'ai décidé de camper ailleurs.",
    },
    // 210 · Possyl (NORMAL) — création canonisée de Zyran
    possyl: {
        ecology: "Petite ombre possédée vaguement féline, au pelage terne gris-sombre qui semble boire la lumière alentour. Deux yeux ternes flottent dans sa silhouette floue. Lente et discrète, elle s'installe dans les recoins tièdes et refuse obstinément d'en être délogée, comme accrochée au lieu qu'elle a choisi de hanter.",
        dicton: "Ce n'est pas la vitesse qui use l'adversaire : c'est de ne jamais pouvoir s'en débarrasser.",
        note: "Posée sur mon sac trois heures durant. J'ai fini par contourner le sac. Elle avait gagné, et elle le savait.",
    },
    // 211 · Possombre (NORMAL)
    possombre: {
        ecology: "L'ombre s'est densifiée en une silhouette trapue et voûtée, aux épaules basses et lourdes, ceinte d'une aura froide de possession. Elle ne bondit pas et ne fuit pas : elle s'ancre, encaisse tout ce qui vient et rend chaque coup avec une patience implacable.",
        dicton: "Frappe-la tant que tu veux. Elle a tout son temps ; toi, non.",
        note: "J'ai voulu la faire reculer d'un pas pour la mesurer. C'est moi qui ai reculé. Deux fois.",
    },
    // 212 · Nécrossum (NORMAL/SPECTRE)
    necrossum: {
        ecology: "L'apex de la possession : un colosse spectral au pelage d'ombre dense, carrure de mur et regard éteint. Presque immobile, il absorbe les assauts les plus violents sans broncher puis répond d'un coup lourd et définitif. Ni faille de type marquée ni vitesse — rien qu'une endurance qui use tout ce qui s'y frotte.",
        dicton: "On ne bat pas Nécrossum. On abandonne avant lui.",
        note: "Le seul Daemon dont j'ai renoncé à noter le poids : ma balance a rendu l'âme, et lui n'avait même pas fini de s'asseoir dessus.",
    },
    // 171 · Caninombre (TENEBRES/SPECTRE)
    caninombre: {
        ecology: "Chaton au pelage noir de suie parcouru de fissures incandescentes orange-rouge, comme si des braises couvaient sous sa peau. Ses yeux rougeoient et sa queue s'achève sur une petite flamme dansante. Furtif et nocturne, il se love dans les recoins sombres et ne trahit sa présence que par la lueur suintant de ses craquelures.",
        dicton: "Petite braise dans le noir : on ne la voit qu'une fois brûlé.",
        note: "Adorable en boule au coin d'un mur, jusqu'à ce que je tende la main et récupère un doigt légèrement grillé. Câlin déconseillé.",
    },
    // 172 · Lycanfer (TENEBRES/SPECTRE)
    lycanfer: {
        ecology: "Loup infernal au pelage noir zébré de coulées de lave rougeoyantes. Une crête de piques enflammées court sur son échine et sa queue se termine en une longue flamme ondulante. Gueule retroussée sur des crocs luisants, il rôde bas sur pattes, nerveux et rapide, et hante les lieux calcinés où sa lueur se confond avec les dernières braises.",
        dicton: "Feu qui court dans la nuit ne demande pas la permission de mordre.",
        note: "Son seul grognement a fait fondre le givre sur mes bottes. J'ai poliment reculé jusqu'à ne plus l'entendre grogner.",
    },
    // 173 · Ténèbrir (TENEBRES/SPECTRE)
    tenebrir: {
        ecology: "Colosse canin des enfers, coiffé d'énormes cornes de bélier enroulées et vêtu d'une fourrure brun-noir fendue de lave ardente. Des flammes jaillissent de ses épaules et sa gueule béante dévoile une rangée de crocs. Malgré sa masse, il se déplace avec une vélocité effroyable ; apex de sa lignée, il ne connaît ni meute ni égal.",
        dicton: "Quand l'enfer se met à courir, l'ombre elle-même reste en arrière.",
        note: "J'ai voulu noter la taille de ses cornes ; il a bâillé, et la chaleur a roussi la page. Estimation finale reportée : 'très grandes'.",
    },
    // 207 · Charolyx (TENEBRES/POISON)
    charolyx: {
        ecology: "Petit lynx efflanqué au pelage gris-violacé terne, zébré d'ombres, oreilles déchirées et yeux jaunes fiévreux. Charognard des marges du Nexus, il rôde autour des dépouilles et renifle la mort ; déjà, de petites spores fétides s'échappent de son souffle. Nocturne et solitaire, il ne chasse pas — il attend.",
        dicton: "Là où le charognard s'assoit, quelque chose finit toujours par tomber.",
        note: "Il a suivi mon groupe deux jours à distance, sans jamais approcher. Le troisième matin, ma gourde sentait le tombeau. J'ai changé d'itinéraire.",
    },
    // 208 · Bubolyx (TENEBRES/POISON)
    bubolyx: {
        ecology: "Le lynx a mûri : son échine s'est hérissée et son corps s'est constellé de bubons suintants d'un venin verdâtre. Ses crocs en dégouttent, et un halo de spores toxiques l'entoure en permanence. Il ne bondit pas sur ses proies — il les contamine d'un souffle, puis patiente pendant que le poison fait son œuvre.",
        dicton: "Sa morsure ne tue pas. C'est l'attente, après, qui tue.",
        note: "Un bubon a crevé quand je l'ai croqué à l'aquarelle. J'ai brûlé le carnet, les pinceaux, et la table. Par précaution.",
    },
    // 209 · Pestilyx (TENEBRES/POISON)
    pestilyx: {
        ecology: "L'apex : un grand lynx au pelage d'encre d'où s'élève une pestilence tenace qui affaiblit tout ce qui l'approche. Immunisé à sa propre pourriture, quasi increvable, il n'a besoin ni de force ni de vitesse : il exhale ses miasmes, sape ses proies, et les regarde se putréfier avant de les dévorer sans hâte.",
        dicton: "Le fort tue vite ; le charognard, lui, a tout son temps.",
        note: "Aucune blessure sur les carcasses qu'il laisse. Juste… le temps, accéléré. C'est la chose la plus patiente et la plus révoltante que j'aie répertoriée.",
    },
    // ── LIGNÉES SIGNATURES DES 3 CLANS (Chapelle de Nouillon) — 213-221 ──
    pivinci: {
        ecology: "Petit pivert vif au bec toujours taché de sèves colorées qu'il picore sur les écorces. Il tambourine les troncs en rythme, moins pour se nourrir que pour marquer le monde de sa cadence, comme un artiste esquissant ses premiers traits.",
        dicton: "On reconnaît un Pivinci au silence qu'il laisse quand il s'arrête de cogner.",
        note: "Il a martelé le même arbre trois heures durant. Le lendemain, l'écorce dessinait un motif. Coïncidence, sûrement.",
    },
    vengbec: {
        ecology: "La huppe déploie sa crête en éventail bariolé et fond en piqués secs, vindicatifs. Chaque coup de bec est placé au millimètre : ce n'est plus du martèlement, c'est du trait de fusain, net et rageur.",
        dicton: "Sa crête se lève avant sa colère — le temps de fuir, si tu es malin.",
        note: "Territorial jusqu'à l'obsession. Il m'a chassé de la clairière à coups de piqués, puis a lissé ses plumes, satisfait.",
    },
    picassault: {
        ecology: "L'apex des piafs : un oiseau-fauve au plumage éclatant qui zèbre le ciel de fulgurances imprévisibles. Insaisissable, il enchaîne ses assauts comme on compose une œuvre — chaque passage un coup de pinceau, chaque piqué une signature.",
        dicton: "On ne voit jamais Picassault frapper. On voit seulement l'endroit où il n'est déjà plus.",
        note: "Impossible à photographier net : il bouge à chaque déclenchement. Mes clichés ne montrent que des traînées de couleur.",
    },
    lapifrappe: {
        ecology: "Un lapin-poulain aux pattes démesurées et aux petits poings bandés, qui s'entraîne à cogner tout ce qui dépasse. La technique laisse à désirer, mais l'ardeur et les ruades compensent largement.",
        dicton: "Petit lapin, grand coup de patte.",
        note: "Il a mis KO un tronc mort à force de le frapper, puis s'est incliné devant lui, très sérieux. J'ai applaudi.",
    },
    lapunch: {
        ecology: "Le torse se dresse, la forme centaure s'affirme : arrière-train puissant, garde haute, directs enchaînés entre deux ruades. Un boxeur qui galope, encore fougueux mais déjà redoutable.",
        dicton: "Il frappe des poings ET des sabots — choisis ton côté pour tomber.",
        note: "Sparring impressionnant : il alterne coups de face et ruades arrière sans jamais s'exposer deux fois pareil.",
    },
    lievrocogne: {
        ecology: "Le maître lièvre-centaure : poings-marteaux, sabots dévastateurs, vitesse foudroyante. Il frappe le premier et le plus fort — mais son corps de fauve encaisse mal : chaque échange est un quitte ou double.",
        dicton: "Livre ta garde une seconde à Lievrocogne, et c'est déjà fini.",
        note: "La plus grosse frappe que j'aie mesurée sur un mustélidé. Aussi, le plus fragile des trois maîtres : tout dans l'attaque.",
    },
    fujipanda: {
        ecology: "Un ourson panda dodu, pelage couleur granit, qui roupille sur les rochers tièdes du matin. Rien ne le réveille : ni le vacarme, ni la pluie, ni la terre qui tremble sous lui — il ronronne, imperturbable.",
        dicton: "Un Fujipanda qui dort vaut mieux qu'un mur : au moins, le mur ne t'écrase pas s'il roule.",
        note: "J'ai voulu le déplacer d'un sentier. Autant pousser une enclume duveteuse. Il a bâillé.",
    },
    kilipanda: {
        ecology: "Un panda de pierre massif qui mâche lentement du bambou pétrifié. Sa carapace minérale encaisse tout — le poing comme le sortilège — et son calme est celui des sommets qui ont vu passer les âges.",
        dicton: "Frappe fort, frappe malin : Kilipanda, lui, se contente de durer.",
        note: "Aucune de mes attaques-test, physiques ou mentales, n'a laissé plus qu'une éraflure. Rassurant et un peu vexant.",
    },
    pandapurna: {
        ecology: "Le monolithe vivant : un panda-montagne imperturbable qui ressent chaque séisme jusque dans ses os. Rien ne le fait plier ; mieux, l'énergie qui le frappe, il la cristallise et la retourne en vigueur. Un mur qui se soigne de ce qui l'assaille.",
        dicton: "Les tempêtes passent. Pandapurna reste.",
        note: "Je l'ai vu absorber une déferlante d'énergie et en ressortir… plus dispos qu'avant. La montagne se nourrit de l'orage.",
    },
    varovental: {
        ecology: "Varan spectral au cuir sombre veiné de mauve, dont la queue exhale des volutes toxiques irisées de psi. Frêle et nerveux, il tapisse les hautes herbes de spores empoisonnées puis lit l'esprit de ses proies pour esquiver avant même leur geste. Il frappe le corps ET la pensée en une fraction de seconde — et s'effondre au premier contre encaissé.",
        dicton: "Frappe l'esprit avant le corps, et disparais avant la riposte.",
        note: "J'ai à peine vu une ombre et senti une odeur d'amande amère. Mon carnet manquait une page — arrachée, pas volée. Il lit avant de mordre, ce bougre.",
    },
    cerebium: {
        ecology: "Un jeune noyau de cristal psychique enchâssé dans une carcasse de fer encore tendre. Son esprit court plus vite que son corps ne grandit : il maîtrise des dons mentaux dès l'éclosion, mais son alliage se fige tôt — passé un cap, il ne grandit plus. On ne le trouve que là où la terre a été retournée par de grands combats, dans les hautes herbes qui repoussent après Sylvebarbe.",
        dicton: "L'esprit forge le métal, jamais l'inverse.",
        note: "Impossible à cueillir intact : il faut l'égratigner pour qu'il daigne se laisser approcher — un prodige orgueilleux qui ne respecte que ce qui l'a touché.",
    },
    onirail: {
        ecology: "Créature-train onirique aux wagons d'écume et de nacre féerique, qui glisse sans bruit sur les eaux dormantes. On ne la ferre qu'à Cendreville, quand le brouillard du concours confond le rêve et le reflet : elle mord l'hameçon comme on entre dans un songe, puis tire vers le fond ceux qui s'accrochent trop fort.",
        dicton: "Monte à bord, mais ne t'endors pas : le terminus est au fond de l'eau.",
        note: "Je l'ai vue une seule fois, à l'aube, filant sur la brume. Ma canne a plié, mon carnet s'est ouvert tout seul à une page blanche — et j'ai rêvé de rails toute la nuit.",
    },
    flamarokto: {
        ecology: "Comète vivante de glace et de flammes, troisième et plus insaisissable gardien des Hautes Herbes. Là où Goshendofy sommeille et Ukognos hante, Flamarokto FILE : nul n'est plus rapide, et son souffle gèle et embrase dans le même éclat contradictoire. On ne le croise qu'au concours, camouflé dans l'herbe la plus humble, et il faut l'affaiblir ET l'entraver d'un statut pour espérer le retenir.",
        dicton: "Le gel et le feu ne s'opposent que pour ceux qui sont trop lents pour voir qu'ils dansent.",
        note: "Une traînée bleue et rouge, un courant d'air brûlant-glacé, et plus rien. Le sol fumait et gelait à la fois. J'ai compris pourquoi le gamin en parlait à voix basse.",
    },
    // 174 · Sépulcru (TENEBRES/VOL)
    sepulcru: {
        ecology: "Petit urubu voûté drapé dans un plumage gris-brun ébouriffé qui pend comme une cape élimée. Sa tête chauve, d'un rose violacé, porte deux yeux luisant d'un violet spectral. Charognard patient, il se perche immobile des heures durant, guettant ce qui ne bouge plus, et ne bat des ailes qu'à contrecœur pour gagner le prochain festin.",
        dicton: "Le charognard ne se presse pas : tout finit par tomber.",
        note: "Il m'a fixé pendant tout mon déjeuner avec un optimisme franchement vexant. Je lui ai laissé la croûte, par pure superstition.",
    },
    // 175 · Macabour (TENEBRES/VOL)
    macabour: {
        ecology: "Vautour au plumage violet nuit et à la tête grise déplumée, l'œil rouge sang enfoncé sous un lourd bec crochu. Sa gorge s'orne d'un motif d'os couleur ivoire, comme une cage thoracique portée à même les plumes, et une crête ébouriffée hérisse sa nuque. Charognard patient et solitaire, il veille perché des heures, épaules voûtées, avant de fondre sur ce qui ne bouge plus.",
        dicton: "Patience de charognard : la nuit finit toujours par rabattre le gibier sous ses serres.",
        note: "J'ai cru qu'il dormait sur sa branche. Il m'a fixé vingt minutes sans ciller, puis a lorgné mon sandwich comme s'il attendait simplement que je trépasse dessus.",
    },
    // 176 · Condombre (TENEBRES/VOL)
    condombre: {
        ecology: "Condor immense au plumage d'encre, ailes déployées en voûte au-dessus des cimes. Sa face décharnée forme un véritable masque de crâne blanchâtre d'où percent deux yeux écarlates. Rapace apex, solitaire et territorial, il plane d'un vol lourd puis fond en piqué, serres tendues, sur tout ce qui remue en contrebas.",
        dicton: "Quand l'ombre tombe des nuages, mieux vaut n'être déjà plus là.",
        note: "Le masque de crâne, j'ai d'abord cru à un déguisement. Non : c'est bien sa tête. J'ai rangé mon carnet et pris mes jambes à mon cou, dans cet ordre précis.",
    },
    // 177 · Bidouzen (NORMAL/PSY)
    bidouzen: {
        ecology: "Chaton mauve dressé sur ses pattes arrière, engoncé dans un petit karategi crème serré d'une ceinture jaune. La patte levée en garde et le minois sûr de lui, il imite les postures martiales avec un sérieux désarmant. Joueur et grégaire, il s'entraîne en fratrie et canalise déjà une petite étincelle mentale sous ses airs de peluche.",
        dicton: "Petite patte aujourd'hui, grand maître demain : tout commence par une garde bien tenue.",
        note: "Il m'a lancé un 'kiya' suraigu et a tenté une prise sur mon lacet. J'ai fait mine d'être vaincu ; il a hoché la tête, satisfait, comme si l'honneur du dojo était sauf.",
    },
    // 178 · Medisciple (NORMAL/PSY)
    medisciple: {
        ecology: "Chat élancé au pelage gris-violet, campé sur ses deux pattes dans une robe de combat écarlate. Les poings fermés et le regard concentré, il a troqué l'insouciance du chaton pour la rigueur du disciple. Studieux et discipliné, il répète ses katas des heures durant et affûte autant son mental que ses griffes.",
        dicton: "L'esprit qui répète mille fois le même geste finit par frapper sans y penser.",
        note: "Impossible de lui tirer un miaulement pendant sa méditation. Je me suis assis à côté pour l'imiter ; au bout de trois minutes j'avais une crampe et lui n'avait pas bougé d'un poil.",
    },
    // 179 · Karatame (PSY/COMBAT)
    karatame: {
        ecology: "Félin humanoïde à la musculature sèche et au pelage gris-mauve, torse nu ceint d'une écharpe violette nouée bas. Maître accompli : ses poings crépitent d'une aura psychique dorée et pourpre qu'il modèle à volonté, oreilles dressées et longue queue fouettant l'air. Solitaire et exigeant, il ne combat qu'à parité et voit chaque duel comme une leçon à transmettre.",
        dicton: "Le poing brise l'os, mais c'est l'esprit qui guide le poing.",
        note: "Il m'a proposé un duel 'amical'. J'ai décliné poliment en désignant mes bras de gringalet ; il a acquiescé, presque déçu, et a pulvérisé un rocher à ma place pour la démonstration.",
    },
    // 180 · Géckèbre (SOL/TENEBRES)
    geckebre: {
        ecology: "Grand saurien des profondeurs à la peau de roche noire, craquelée de veines pourpres phosphorescentes. Ses yeux rouges luisent dans l'obscurité, et sa queue s'achève en grappe de cristaux violets. Trapu, lent, quasi inamovible, il reste tapi contre le sol des heures durant ; ce colosse minéral encaisse tout sans broncher.",
        dicton: "La pierre ne court pas : elle attend simplement que l'orage se fatigue.",
        note: "J'ai poussé, tiré, poussé encore : autant vouloir déplacer une colline. Il a cligné une paupière rouge, agacé, et je crois que c'est tout ce que j'obtiendrai de lui aujourd'hui.",
    },
    // 181 · Geaucké (ROCHE/EAU)
    geaucke: {
        ecology: "Jumeau minéral au corps de pierre ocre, parcouru de volutes turquoise lumineuses comme des ruisseaux gravés dans le roc. Ses yeux cyan brillent et sa queue crache une gerbe d'eau cristalline. Contrairement à son sombre cousin, il est vif et nerveux : bâti tout en légèreté, il détale d'un rocher à l'autre en trombe, quitte à encaisser très mal le moindre choc.",
        dicton: "Torrent de montagne : frappe vite, car il ne passe jamais deux fois au même endroit.",
        note: "J'ai voulu le mesurer au décamètre. Il était déjà trois rochers plus loin avant que je déroule le ruban. Sprinter, oui ; patient, jamais.",
    },
    // 182 · Batchu (ELEC/VOL)
    batchu: {
        ecology: "Minuscule chauve-souris en boule de duvet crème, aux grandes oreilles bleu nuit repliées comme des cornets. Ses petites ailes sombres battent à toute vitesse et ses joues rosies grésillent d'électricité statique. Nocturne, curieuse et pot de colle, elle voltige en essaims joueurs et décoche de brèves étincelles bien plus agaçantes que dangereuses.",
        dicton: "Petite étincelle, grand chatouillis : ce n'est pas la taille qui fait piquer.",
        note: "Elle s'est posée sur mon chapeau et a refusé d'en descendre. Chaque fois que je bougeais, une petite décharge me rappelait gentiment qui commandait. Adorable despote.",
    },
    // 183 · Supabatchu (ELEC/VOL)
    supabatchu: {
        ecology: "Chauve-souris électrique au pelage jaune vif hérissé d'une collerette en broussaille et zébré d'éclairs. Les ailes noires largement déployées et le regard féroce, elle fend la nuit à une vitesse supersonique en semant des arcs de foudre. Nerveuse et solitaire, elle frappe par salves fulgurantes puis disparaît avant qu'on ait compris ce qui grésillait.",
        dicton: "La foudre ne prévient pas : quand tu l'entends, elle est déjà repartie.",
        note: "J'ai enfin réussi à la prendre en photo. Enfin, un flou jaune sur fond noir, avec un cheveu d'éclair au milieu. Le musée saura apprécier l'intention artistique.",
    },
    // 184 · Phoéchaudi (FEU/SPECTRE)
    phoechaudi: {
        ecology: "Oisillon dodu au duvet mauve terne, si rondouillard qu'il tient à peine sur ses courtes pattes. De sa houppette et du bout de sa queue s'échappent de petites flammes violettes et spectrales, froides à l'œil et sans la moindre fumée. Boudeur et casanier, il couve sa braise fantôme en somnolant, l'air perpétuellement contrarié d'avoir été réveillé.",
        dicton: "Même la plus pâle des braises cache un feu qui ne demande qu'à hanter.",
        note: "Je lui ai tendu une brindille pour raviver sa flamme. Il l'a regardée, m'a regardé, puis s'est rendormi. On respecte l'artiste incompris, même quand il est rond comme une balle.",
    },
    // 185 · Phoéchaudii (FEU/SPECTRE)
    phoechaudii: {
        ecology: "Le poussin s'est étiré en un oiseau élancé au plumage prune sombre lustré de reflets bordeaux, coiffé d'une aigrette fière. Des langues de feu spectral violet ondoient le long de son corps sans jamais le brûler. Plus assuré et bien plus vif, il plane avec dédain et laisse dans son sillage une traînée de flammes froides qui donnent le frisson.",
        dicton: "La flamme qui grandit apprend d'abord à choisir qui elle réchauffe et qui elle glace.",
        note: "Il a pris la pose dès qu'il m'a vu sortir le carnet. Trois profils différents, un soupir excédé, puis il est parti. Un vrai mannequin, ce volatile.",
    },
    // 186 · Phoéchaudiii (FEU/SPECTRE)
    phoechaudiii: {
        ecology: "Phénix accompli aux ailes grand ouvertes, le corps noir-pourpre s'embrasant en dégradé jusqu'à des rémiges et une longue traîne de feu rouge et or. Chaque plume de sa queue s'achève en flamme vive, mi-brasier mi-spectre. Majestueux et solitaire, il s'élève dans les hauteurs et déchaîne des tempêtes de feu fantôme d'une puissance ardente.",
        dicton: "Le vrai feu ne meurt jamais : il renaît de l'autre côté pour brûler encore.",
        note: "Le petit boudeur rondouillard est devenu ça. J'ai relu mes premières notes en rougissant : j'avais écrit 'ballon grognon sans avenir'. Je retire officiellement chaque mot.",
    },
    // 187 · Obscurène (EAU/TENEBRES)
    obscurene: {
        ecology: "Petite murène des abysses au corps bleu-nuit presque noir, parsemé de mouchetures cyan qui luisent faiblement dans l'obscurité. Un œil turquoise phosphorescent éclaire sa mâchoire garnie de crocs blancs, qu'elle tient volontiers entrouverte. Créature solitaire et léthargique, elle ondule à peine et se tapit dans les anfractuosités sombres, chassant à l'affût plutôt qu'à la nage.",
        dicton: "Dans l'eau noire, mieux vaut attendre sa proie que la poursuivre.",
        note: "J'ai cru voir un simple bout de tuyau flotter près de moi ; il m'a montré ses dents. Depuis, je vérifie deux fois avant de plonger la main dans l'eau trouble.",
    },
    // 188 · Abyssombre (EAU/TENEBRES)
    abyssombre: {
        ecology: "Grande anguille-dragon au corps d'ébène lové en S, strié de veines cyan et violettes qui pulsent comme des néons sous-marins. Deux fines cornes-nageoires ornent sa tête aux yeux turquoise. Solitaire et nocturne, elle dérive avec lenteur dans les eaux profondes, préférant se draper autour d'un rocher que de nager en pleine eau.",
        dicton: "L'ombre des profondeurs ne se hâte jamais : elle enveloppe.",
        note: "Ses reflets fluo m'ont d'abord fait penser à l'enseigne d'un bar sous-marin. J'ai failli commander un verre avant de comprendre que l'enseigne me fixait.",
    },
    // 189 · Léviabysse (EAU/TENEBRES)
    leviabysse: {
        ecology: "Colosse abyssal aux anneaux innombrables et aux écailles bleu-acier, couronné d'une crinière de piques bleu-violet hérissées. Son œil cyan perce les ténèbres et ses mâchoires béantes révèlent des crocs de squale. Créature solitaire et quasi immobile, elle sommeille roulée sur elle-même des jours durant, et l'onde de son réveil suffit à trahir sa présence.",
        dicton: "Le léviathan ne bouge qu'une fois par siècle, mais l'océan entier le sent.",
        note: "Impossible de dire où finit son corps : j'ai suivi ses anneaux pendant dix minutes avant de réaliser que je tournais en rond autour du même.",
    },
    // 190 · Crocavern (SOL)
    crocavern: {
        ecology: "Masse de pierre vivante grande comme un pan de galerie, la roche grise tavelée de mousse verte et hérissée de stalactites en guise de crocs. Un œil rougeoie sous son front minéral tandis que l'autre reste clos et éteint. Sédentaire à l'extrême, ce colosse se confond avec la paroi et draine lentement les minéraux du sol pour se régénérer ; on le prendrait pour un éboulis jusqu'à ce qu'il ouvre la gueule.",
        dicton: "La montagne frappe rarement, mais quand elle tombe, on ne s'en relève pas.",
        note: "Je me suis assis sur ce que je croyais être un rocher moussu pour déjeuner. Le rocher a grogné. Je n'ai pas fini mon sandwich.",
    },
    // 191 · Rosdrakis (DRAGON/FEE)
    rosdrakis: {
        ecology: "Minuscule dragonnet rose bonbon lové en croissant, timide au point de se rouler sur sa propre queue effilée. De courtes cornes sombres et de fines membranes alaires magenta ornent son corps duveteux ; son grand œil bordé de cils trahit une nature craintive. Diurne et grégaire, il vit blotti en portées auprès de ses semblables et détale au moindre bruit.",
        dicton: "Petit dragon rose deviendra grand : chaque écaille attend son heure.",
        note: "Tellement mignon que j'ai failli oublier que c'est un dragon. Il m'a soufflé une étincelle rose sur le bout du nez, histoire de me le rappeler poliment.",
    },
    // 192 · Dracosidhe (DRAGON/FEE)
    dracosidhe: {
        ecology: "Dragon-fée primordial au corps cramoisi et au ventre crème, coiffé d'une couronne de cornes noires recourbées. Ses vastes ailes magenta, frangées comme des flammes de plumes, se déploient plus larges que lui. Fier et solitaire, il plane à l'aube en décrivant de longues spirales et défend farouchement le territoire où il a éclos.",
        dicton: "Aile de fée, souffle de dragon : la grâce va plus vite que la rage.",
        note: "Il a toisé mon carnet, jugé mon écriture d'un reniflement dédaigneux, puis s'est envolé. Un dragon critique littéraire, il fallait oser.",
    },
    // 193 · Archéoptix (VOL/FEE)
    archeoptix: {
        ecology: "Oiseau-lézard ancestral à mi-chemin du rapace et du reptile : tête bleue coiffée d'une huppe ébouriffée, œil jaune cerclé de rouge, bec sombre. Son poitrail crème duveteux contraste avec ses ailes bleu profond terminées de griffes rouges, et sa longue queue emplumée bat l'air à chaque bond. Diurne et vif, il court plus qu'il ne vole, fouillant le sol de ses serres.",
        dicton: "Avant de maîtriser le ciel, l'aile apprend d'abord à courir.",
        note: "Il vole comme une poule lancée dans un escalier : beaucoup de conviction, très peu d'altitude. Mais quelles griffes, tout de même !",
    },
    // 194 · Ptérosidhe (VOL/FEE)
    pterosidhe: {
        ecology: "Ptérosaure féerique au long crâne prolongé d'une crête effilée, œil jaune souligné de rouge et bec garni de dents fines. Sa gorge fauve descend vers un corps svelte, mais ce sont ses immenses ailes rose-mauve, tendues sur des bras bleus, qui frappent d'abord le regard. Chasseur diurne, il fond sur ses proies en piqué à une vitesse foudroyante.",
        dicton: "Qui frappe du haut du ciel n'a pas besoin de frapper deux fois.",
        note: "Sa membrane rose bonbon prête à sourire, jusqu'à ce qu'il passe en rase-mottes à trois centimètres de votre chapeau. On ne sourit plus du tout.",
    },
    // 195 · Fulguror (ELEC)
    fulguror: {
        ecology: "Raptor ancestral au corps écaillé orange vif zébré de turquoise, le ventre rose pâle et la gueule hérissée de crocs blancs. Un œil bleu électrique fixe sa cible tandis que sa crête dorsale se dresse, saturée de statique. Prédateur diurne et nerveux, il fond sur tout ce qui bouge dans un éclair et ne tient jamais en place plus de quelques secondes.",
        dicton: "La foudre ne demande pas la permission : elle frappe, puis disparaît.",
        note: "Impossible de le prendre en photo : chaque cliché ne montre qu'une traînée orange et un nuage de poussière. Trois pellicules gâchées, aucun regret côté fauve.",
    },
    // 196 · Rocosaure (ROCHE)
    rocosaure: {
        ecology: "Colosse fossile trapu bardé d'une carapace de roche brune, le crâne surmonté d'un large casque minéral plat comme une enclume. Des crêtes rocheuses hérissent son dos et son échine, et ses pattes massives s'achèvent par des griffes de pierre claire. Placide mais territorial, il avance à pas lents et pesants, imprimant des empreintes profondes dans le sol.",
        dicton: "Le roc ne recule pas : c'est aux autres de le contourner.",
        note: "Je lui ai lancé un caillou pour tester ses réflexes. Il a incliné son casque, le caillou a ricoché, et j'ai décidé que la science pouvait attendre.",
    },
    // 197 · Givroptère (VOL/GLACE)
    givroptere: {
        ecology: "Ptérosaure des glaces au corps blanc argenté, presque translucide, dont les vastes ailes semblent taillées dans le givre. De discrètes touches bleu glacier marquent ses articulations et son crâne effilé. Créature des hauteurs froides, elle plane sans effort dans les courants gelés et ne bat des ailes qu'à peine, laissant une buée de cristaux dans son sillage.",
        dicton: "Ni trop haut, ni trop bas : le vol de givre trouve toujours son équilibre.",
        note: "On dirait un cerf-volant assemblé à partir de stalactites. Superbe à contre-jour ; nettement moins recommandé juste au-dessus de soi au moment du dégel.",
    },
    // 198 · Toxyrm (FEE/POISON)
    toxyrm: {
        ecology: "Petite wyverne toxique au corps corail et au ventre crème, coiffée d'un large casque violet lisse qui lui couvre tout le sommet du crâne. Son œil vert perçant tranche avec ses teintes tendres, et sa queue s'achève par une palette violette. Placide et prudente, elle se déplace peu et compte sur sa carapace naissante plutôt que sur la fuite.",
        dicton: "Le venin se distille lentement : mieux vaut endurer que se précipiter.",
        note: "Avec sa petite taille et son casque violet, elle a des airs de champignon grognon. Adorable, jusqu'à ce qu'on croise le regard vert qui vous jauge tranquillement.",
    },
    // 199 · Wyvortal (FEE/POISON)
    wyvortal: {
        ecology: "Wyverne à la tête pourpre hérissée d'épines et coiffée de cornes, l'œil bleu perçant. Corps rose-rouge, ventre crème, grandes ailes membraneuses et pattes griffues violettes. Solitaire au vol lourd mais endurant, elle darde un venin féerique et somnole longuement, repliée sur elle-même pour digérer ses toxines.",
        dicton: "Cuirasse épaisse et poison lent : rien ne presse celle qui encaisse tout.",
        note: "J'ai attendu qu'elle attaque pendant vingt minutes. Elle a bâillé, s'est rendormie, et c'est MOI qui ai fini par abandonner.",
    },
    // 200 · Joeyrrant (TENEBRES/FEU)
    joeyrrant: {
        ecology: "Créature fœtale roulée en boule sombre, corps gris-noir aux membres frêles repliés contre le ventre, deux grands yeux pâles luisant dans la pénombre. Cette larve de marsupial à l'éclosion tardive couve une braise intérieure sous sa coque ténébreuse ; elle reste immobile des jours durant, blottie dans le noir, à attendre son heure.",
        dicton: "Sous la cendre froide dort toujours une braise qui n'attend que son heure.",
        note: "Je l'ai prise pour un caillou noir et j'ai failli m'asseoir dessus. Les deux yeux qui se sont ouverts m'ont vite corrigé.",
    },
    // 201 · Wallabisan (TENEBRES/GLACE)
    wallabisan: {
        ecology: "Wallaby au pelage noir de suie dont la poitrine laisse voir une cage thoracique blanche à nu, tel un squelette porté à même la fourrure. Ses yeux brûlent d'un orange spectral et une flamme bleue et froide danse au bout de sa longue queue annelée. Bondissant et nocturne, ce marsupial mi-vivant mi-revenant chasse en silence dans le froid.",
        dicton: "Flamme bleue et cœur de givre : c'est le froid qui brûle le plus fort.",
        note: "Sa flamme de queue est bleue, alors j'ai tendu la main en croyant qu'elle chauffait. Grave erreur : j'ai eu les doigts gelés.",
    },
    // 202 · Kangoudead (TENEBRES/GLACE)
    kangoudead: {
        ecology: "Kangourou mort-vivant dressé sur ses pattes, crâne blanc décharné et côtes saillantes exposées sur un corps noir squelettique. Une rangée de piques de glace bleutées hérisse son échine comme une crête, et ses orbites luisent d'un bleu glacial. Colosse revenant au coup redoutable mais aux os fragiles, il erre seul dans les nuits les plus mortes et les plus froides.",
        dicton: "Grand coup, gros cœur, mais des os qui craquent : la puissance n'est pas l'armure.",
        note: "Je voulais compter ses côtes pour mon carnet. À la troisième, il a levé le poing, et j'ai décidé que l'anatomie attendrait.",
    },
    // 204 · Galijah (FEE/SPECTRE)
    galijah: {
        ecology: "Petit félin légendaire au corps violet piqueté de taches vert et or, aux immenses yeux jaune-vert et longues oreilles pointues. Une crinière flamboyante orange-vert-doré ondule autour de sa tête comme un feuillage vivant, et sa longue queue s'effiloche en volutes spectrales. Insaisissable et flottant, il n'apparaît qu'à de très rares élus, aussi joueur qu'immatériel.",
        dicton: "L'esprit qui sait tout faire ne se laisse saisir par rien.",
        note: "Je jure l'avoir vu trois fois du coin de l'œil et zéro fois en face. Mon croquis n'est qu'une tache violette et une crinière — c'est déjà un miracle.",
    },
    // 205 · Osquille (INSECTE/EAU)
    osquille: {
        ecology: "Squille aux couleurs éclatantes : carapace turquoise veinée de rouge, grands yeux composés juchés sur des pédoncules mobiles. Ses appendices ravisseurs repliés frappent à une vitesse fulgurante, capables de fendre une coquille d'un seul coup. Vive et diurne, cette crevette-mante solitaire jaillit de son terrier pour assommer ses proies d'un éclair.",
        dicton: "Frappe la première, frappe fort : la seconde chance est pour les lents.",
        note: "On m'avait dit de ne jamais approcher le doigt de ses pinces. J'ai écouté. Mon voisin, non — il compte désormais sur neuf doigts.",
    },
    // 206 · Rô (SOL/EAU)
    ro: {
        ecology: "Longue anguille-serpent au corps fuselé gris-violet, lovée en boucle. Sa tête draconique fend l'eau d'un œil cyan luminescent ; des lignes bioluminescentes courent le long de ses flancs et de ses nageoires jusqu'à une queue en zigzag. Nocturne et furtive, elle glisse dans les fonds vaseux et endort ses proies d'une brume hypnotique.",
        dicton: "La nuit appartient à qui sait s'y fondre sans bruit.",
        note: "Je l'ai croquée à la lampe frontale, persuadé qu'elle dormait. Ses lignes bleues se sont allumées d'un coup — et c'est moi qui ai fait un cauchemar cette nuit-là.",
    },
    // 501 · Nouiflot (EAU/PSY)
    nouiflot: {
        ecology: "Oisillon dodu au duvet bleu pâle et blanc, petit bec orange et grands yeux sombres, une bouclette dressée en houppe sur le crâne. Une collerette de plumes cotonneuses lui gonfle le cou ; il repose au creux d'un nid en spirale, doux comme un nuage. Nouveau-né rêveur et grégaire, il pépie de faibles ondes mentales et quitte rarement la tiédeur de son berceau.",
        dicton: "Petit duvet, grands songes : tout oisillon rêve avant de voler.",
        note: "Je l'ai trouvé si mignon que j'ai voulu le prendre. Il m'a envoyé une image mentale de sa maman en colère, et j'ai reculé très poliment.",
    },
    // 502 · Sporémante (SPECTRE/POISON)
    sporemante: {
        ecology: "Mante-champignon coiffée d'un large chapeau magenta moucheté de vert, d'où monte une volute de spores violettes. Corps grêle et pourpre sur de fines pattes d'insecte, bras ravisseurs repliés, yeux luisant d'un rose spectral. Son abdomen ploie sous une grappe de champignons vénéneux. Discrète et nocturne, elle sème ses spores toxiques au moindre frôlement.",
        dicton: "Frôle le chapeau, respire le poison : la curiosité a un goût de spore.",
        note: "J'ai éternué en la croquant. Trois champignons ont poussé sur mon carnet pendant la nuit — je les ai laissés, ça décore.",
    },
    // 503 · Ruffardoc (INSECTE/ROCHE)
    ruffardoc: {
        ecology: "Chenille brune aux segments trapus, portant à l'arrière une carapace de pierre grise incrustée de cristaux bleus, telle une géode montée sur pattes. Ses yeux jaunes ronds et ses courtes antennes lui donnent un air placide ; une feuille verte nouée au cou lui sert d'écharpe. Lente et paisible, cette larve minérale broute les mousses et se recroqueville sous sa coque au moindre danger.",
        dicton: "Coque de pierre, cœur tranquille : qui s'abrite bien vit longtemps.",
        note: "J'ai toqué sur sa carapace pour voir si c'était vraiment de la roche. Ça sonnait creux, elle a rentré la tête, et je me suis senti très impoli.",
    },
    // 504 · Dractriss (ELEC/DRAGON)
    dractriss: {
        ecology: "Dragonneau potelé au corps blanc laiteux, l'œil jaune vif, coiffé de deux petites cornes en forme d'éclairs dorés. Une collerette de piquants jaunes crépite à son cou comme une décharge figée ; ses ailes de chauve-souris gris-bleu restent minuscules et sa queue rayée de bleu se love près de lui. Jeune et joueur, il grésille dès qu'on le caresse à rebrousse-écaille.",
        dicton: "Petit dragon, grande étincelle : l'orage se moque de la taille.",
        note: "Adorable, jusqu'à ce que je le gratte sous le menton. J'ai les cheveux dressés depuis, et mon peigne a rendu l'âme.",
    },
    // 510 · Voltaile (ELEC/VOL)
    voltaile: {
        ecology: "Petite créature ailée chargée d'électricité, au corps léger et frêle porté par des ailes vives qui claquent comme des étincelles. Son plumage crépitant se hérisse au moindre courant d'air et diffuse de menues décharges. Grégaire et agitée, elle voltige sans repos, incapable de tenir en place, et se recharge en frôlant les cimes battues par les vents.",
        dicton: "Léger comme le vent, prompt comme la foudre : mieux vaut voler que tomber.",
        note: "Impossible de la croquer : elle ne s'immobilise jamais plus d'une seconde. Mon carnet ne garde qu'un trait jaune flou et une odeur d'ozone.",
    },
    // 511 · Abyssvolt (EAU/ELEC)
    abyssvolt: {
        ecology: "Anguille abyssale au corps bleu nuit constellé de taches bioluminescentes qui grésillent d'électricité statique. Ses larges mâchoires garnies de crocs contrastent avec une nage étonnamment pataude : elle préfère dériver dans le noir, lanterne vivante attirant ses proies. Solitaire et nocturne, elle pond dans les eaux les plus profondes et les plus froides.",
        dicton: "L'anguille ne court pas après l'orage : elle attend qu'il vienne la mordre.",
        note: "Je l'ai éclairée avec ma lampe : elle m'a répondu par une décharge dans le poignet. Depuis, je la salue de loin — on n'apprivoise pas une prise de courant qui nage.",
    },
    // 512 · Oniridrak (PSY/DRAGON)
    oniridrak: {
        ecology: "Petit dragon joufflu à la peau lilas, mi-hippopotame mi-saurien, coiffé de fines collerettes draconiques. Il passe le plus clair de son temps assoupi, une brume onirique flottant autour de son mufle ; d'un simple regard, il endort qui l'approche de trop près. Placide et casanier, il somnole en petits groupes au bord des eaux tièdes.",
        dicton: "Qui rêve tout le jour n'a jamais besoin de courir.",
        note: "Je voulais le mesurer ; il m'a fixé, et je me suis réveillé deux heures plus tard, mon carnet en guise d'oreiller. Aucune note prise, mais un excellent somme.",
    },
    // 514 · Nécrospore (SPECTRE/POISON)
    necrospore: {
        ecology: "Champignon spectral greffé sur une carcasse de canidé fantôme : son chapeau moucheté exhale sans répit des spores nécrosées et un feu follet blafard. Créature vaporeuse et silencieuse, elle flotte au ras du sol la nuit et colonise tout ce qui pourrit. Elle essaime seule, sans jamais s'accoupler.",
        dicton: "Le poison ne se presse jamais : il finit toujours par avoir raison.",
        note: "J'ai cru cueillir un champignon pour ma soupe. Il a cligné d'un œil que je ne lui connaissais pas. Je jeûne, désormais, dès que la brume sent le moisi.",
    },
    // 515 · Ombrepsy (NORMAL/PSY)
    ombrepsy: {
        ecology: "Matou avachi au pelage pâle et aux membres élastiques comme des nouilles, surmonté de gros yeux ronds montés sur pédoncules souples. Placide jusqu'à la mollesse, il se love partout où il reste un peu de place et absorbe le moindre remous mental alentour. Grand dormeur solitaire, il n'attaque jamais le premier : il n'en a tout bonnement pas l'énergie.",
        dicton: "Gros coffre, petit poing : mieux vaut encaisser que cogner.",
        note: "Je l'ai poussé pour dégager mon sac ; il s'est reformé en flaque ronronnante de l'autre côté. Increvable, inoffensif, et un coussin de sieste absolument imbattable.",
    },
    // 516 · Rocaptère (ROCHE/VOL)
    rocaptere: {
        ecology: "Théropode de pierre à la longue gueule de crocodile et au dos hérissé d'une voile d'écailles orange vif, couronné d'une touffe d'épines olive. Sa peau grise et minérale sonne comme du grès sous les coups. Vif et bagarreur malgré ses petits bras, il chasse seul à découvert et claque des mâchoires avant de réfléchir.",
        dicton: "Mâchoire de fer, coquille de sable : frappe avant qu'on te frappe.",
        note: "Ses petits bras m'ont fait sourire — jusqu'à ce que sa gueule referme mon mètre-ruban en deux. J'ai noté « ne pas rire du prédateur », puis j'ai couru.",
    },
    // 517 · Givrasol (SOL/GLACE)
    givrasol: {
        ecology: "Chevreau trapu à la peau lisse et bleutée de béluga, couvert d'une fine pellicule de givre ; ses cornes naissantes ressemblent à deux stalactites. Lent et frileux, il broute la mousse gelée et souffle un air polaire par les naseaux. Grégaire, il se serre en petits troupeaux pour garder le froid comme d'autres gardent la chaleur.",
        dicton: "Le givre avance à petits pas, mais il fige tout sur son passage.",
        note: "Je lui ai tendu la main pour le caresser ; elle est ressortie couverte de givre et je ne sens plus mon pouce. Adorable, mais je réclame des moufles au prochain équipement.",
    },
    // 518 · Fissuraillus (ROCHE/VOL)
    fissuraillus: {
        ecology: "Colosse reptilien cuirassé de plaques de roche brune fendillées, dont chaque fissure laisse suinter une lave incandescente. Un œil de braise, une épaule en rocher massif et deux ailes coriaces encore trop petites pour le porter vraiment. Territorial et rageur, il pilonne le sol de ses poings de pierre et rugit dès qu'une ombre le survole.",
        dicton: "Sous la pierre qui craque, c'est le feu qui décide.",
        note: "J'ai posé la main sur son flanc pour vérifier la texture ; la roche était brûlante entre les fentes. Deux cloques et une leçon : on n'inspecte pas un volcan à mains nues.",
    },
    // 519 · Magmaillus (ROCHE/VOL)
    magmaillus: {
        ecology: "Dragon volcanique aux écailles de charbon parcourues de coulées de magma incandescent, portant sur le dos un véritable cratère en éruption qui crache lave et fumée à chaque battement d'ailes. Ses vastes ailes grises sont veinées de feu et sa queue laisse une traînée de braises. Solitaire et souverain, il ne partage son ciel avec personne.",
        dicton: "Quand la montagne prend son envol, on ne discute pas le passage.",
        note: "Il a décollé à trois mètres de moi ; le souffle a roussi mon chapeau et fait fondre l'encre de ma page. Meilleur croquis de ma carrière, cuit à point.",
    },
    // 520 · Scoriève (ROCHE/FEU)
    scorieve: {
        ecology: "Amas de scories volcaniques agglomérées en une créature trapue, sa carapace poreuse et noircie encore striée de veines de lave rougeoyante. D'une lenteur exaspérante, elle roule plus qu'elle ne marche et encaisse les chocs sans broncher. Placide, elle passe des journées entières à refroidir au soleil, immobile comme un rocher oublié.",
        dicton: "Roche patiente, braise tenace : le temps ne l'entame pas.",
        note: "Je me suis assis dessus pour déjeuner, persuadé que c'était un caillou. Le « caillou » a soupiré et s'est décalé de trois centimètres. J'ai fini mon sandwich debout.",
    },
    // 521 · Basaltor (ROCHE/FEU)
    basaltor: {
        ecology: "Colosse bâti de colonnes de basalte hexagonales soudées les unes aux autres, ses jointures rougeoyant d'une lave qui ne s'éteint jamais tout à fait. Presque aussi large que haut, il oppose une carapace quasi inébranlable à qui ose le pousser. Sédentaire et solitaire, il s'ancre au sol et devient, avec les années, indiscernable d'une falaise.",
        dicton: "On ne déplace pas une falaise à coups d'épaule.",
        note: "J'ai voulu contourner ce que je prenais pour un affleurement rocheux ; il a tourné la tête pour me suivre du regard. Depuis, je toque avant de m'appuyer sur quoi que ce soit.",
    },
    // 522 · Sidérobloc (ROCHE/METAL)
    siderobloc: {
        ecology: "Titan de pierre dont la lave, en refroidissant, s'est muée en fer brut : plaques métalliques rivées à un cœur de roche, le tout d'un gris sombre aux reflets sidérés. Chaque pas résonne comme une enclume. Colossalement lourd et d'une force tranquille, il ne craint presque rien — et n'a donc presque jamais besoin de se défendre.",
        dicton: "Fer et roche mêlés : le mur qui frappe aussi fort qu'il tient.",
        note: "Mon aimant de poche a bondi de ma sacoche pour se coller à son flanc. J'ai dû négocier trois bonnes minutes avant de récupérer mon matériel — et un peu de ma dignité.",
    },
    // 523 · Sidéralithe (ROCHE/METAL)
    sideralithe: {
        ecology: "Apogée de la lignée : un géant de fer météorique et de roche dont la surface luit de veines pâles évoquant un ciel étoilé pris dans le métal. Aussi dur que le noyau d'une planète, il concentre une puissance colossale sous un calme absolu. On le dit centenaire, et jamais tout à fait endormi : il médite, immobile, sous les astres.",
        dicton: "Ce que les étoiles ont forgé, nul poing ne le brise.",
        note: "Je l'ai croqué toute une nuit sans qu'il bouge d'un cil ; à l'aube, j'aurais juré que ses veines avaient suivi la course des étoiles. Ou alors j'avais grand besoin de dormir.",
    },
    // 524 · Nouïbrume (EAU/PSY)
    nouibrume: {
        ecology: "Oisillon dodu au plumage crème et à la petite collerette bleu pâle, désormais nimbé de longues volutes de brume qui s'échappent de ses plumes comme des nouilles vaporeuses. Son bec orange s'est affiné et ses yeux luisent d'un éclat mental. Créature paisible et diurne des cours d'eau embrumés, il flotte davantage qu'il ne vole, en solitaire.",
        dicton: "Esprit clair et eau calme : la brume voit là où les yeux se perdent.",
        note: "J'ai voulu le croquer, mais chaque fois que je clignais des yeux sa silhouette avait glissé dans la brume. Mon dessin final ressemble à un nuage avec un bec.",
    },
    // 525 · Oniromouille (EAU/PSY)
    oniromouille: {
        ecology: "Oiseau onirique au corps gracile et à demi translucide, traînant de longues plumes-nouilles qui ondulent comme des rêves liquides. Son plumage crème et bleu paraît tissé de vapeur, et son regard hypnotique flotte dans un halo mental. Filiforme et très fragile, il se déplace à une vitesse fulgurante, insaisissable comme un songe.",
        dicton: "Vif comme un songe, fragile comme la rosée : frappe avant le réveil ou tout s'efface.",
        note: "Je jure l'avoir rêvé avant de le voir. Il a survolé l'eau en trois battements, m'a fixé, puis s'est dissous dans la brume — mon carnet, lui, est resté bien réel et bien vide.",
    },
    // 526 · Spectrelame (SPECTRE/POISON)
    spectrelame: {
        ecology: "Mante spectrale d'un violet sombre, coiffée d'un large chapeau de champignon magenta piqueté de vert d'où s'élève une flammèche fantomatique. Ses avant-bras se sont mués en faux tranchantes suintant de spores, et ses yeux roses phosphorescents ne clignent jamais. Prédateur nocturne et silencieux, il découpe ses proies dans un nuage toxique.",
        dicton: "Lame d'ombre et souffle de spores : ce qui ne tranche pas empoisonne.",
        note: "Je l'ai pris pour un champignon oublié sur une souche. Le champignon a dégainé deux faux et m'a salué d'un hochement de chapeau. J'ai reculé, très poliment.",
    },
    // 527 · Nécromante (SPECTRE/POISON)
    necromante: {
        ecology: "Grande mante nécrotique au chapeau de champignon pourpre évasé, nimbée d'une aura spectrale et de volutes de spores mortelles. Ses faux se sont allongées en lames d'ombre et ses yeux magenta brûlent d'une lueur affamée. Corps décharné et fragile, mais d'une puissance redoutable ; elle règne en solitaire sur les recoins où pourrit la lumière.",
        dicton: "Frappe fort qui n'encaisse rien : la faucheuse ne connaît que l'attaque.",
        note: "Elle m'a fixé pendant que je notais, puis a fait pivoter son chapeau comme pour saluer. Charmante — jusqu'à ce que l'air autour d'elle se mette à sentir le tombeau.",
    },
    // 528 · Carapoing (INSECTE/ROCHE)
    carapoing: {
        ecology: "Insecte trapu à la tête de fourmi brune casquée, antennes dressées et foulard de feuille, dont l'arrière-train s'est bardé de plaques rocheuses bleu-gris. Ses pattes avant se sont épaissies en poings minéraux qu'il cogne l'un contre l'autre. Vif et bagarreur, il patrouille en petites colonies et frappe d'abord, réfléchit ensuite.",
        dicton: "Carapace de pierre, poing véloce : mieux vaut cogner vite que cogner tard.",
        note: "Il a testé la solidité de mon sac à coups de poing 'juste pour voir'. Le sac a perdu. Moi aussi, un peu, quand il a voulu tester mon genou ensuite.",
    },
    // 529 · Roctobrute (INSECTE/ROCHE)
    roctobrute: {
        ecology: "Colosse insectoïde cuirassé de blocs de roche bleu-gris, tête de fourmi massive aux mandibules épaisses et poings de pierre gros comme des rochers. Sa carapace dorsale forme un rempart minéral hérissé. Lourd et solitaire, il déblaie les éboulis d'un revers de poing et ne recule devant aucun obstacle qu'il ne puisse pulvériser.",
        dicton: "Le roc ne se presse pas : il attend son heure, puis brise tout d'un seul coup.",
        note: "J'ai voulu mesurer son poing. Il a mesuré mon carnet en le réduisant en confettis. Conclusion scientifique rigoureuse : très costaud, zéro délicatesse.",
    },
    // 530 · Voltriss (ELEC/DRAGON)
    voltriss: {
        ecology: "Dragon élancé au corps crème rayé de bleu nuit comme un tigre, coiffé de deux cornes en éclairs dorés et d'un masque facial blanc marqué de bleu. Ses larges ailes sombres sont parcourues de veines cyan et jaunes qui grésillent, et sa longue queue serpentine s'achève sur une flamme de cristal électrique. Chasseur diurne et solitaire des courants d'orage.",
        dicton: "L'éclair ne prévient jamais deux fois : au dragon rapide, la première frappe suffit.",
        note: "Je l'ai vu fondre depuis un nuage avant même que mon crayon touche le papier. J'ai juste eu le temps de noter 'rayé, brillant, TRÈS pressé' avant qu'il ne reparte.",
    },
    // 531 · Draconvolt (ELEC/DRAGON)
    draconvolt: {
        ecology: "Dragon massif au poitrail crème strié de bleu nuit, dont la tête disparaît sous une crinière de flammes dorées en dents de foudre. Ses yeux rouges flambent, sa gueule rugit, et sa queue se termine par une lame en éclair d'or. Bras musculeux griffus, ailes noires nervurées d'or : un prédateur de tempête, territorial et farouchement solitaire.",
        dicton: "Vitesse et force réunies : quand le tonnerre frappe, il ne reste plus rien à foudroyer.",
        note: "Sa crinière dorée m'a d'abord fait croire à un lion. Puis il a rugi, décollé, et pulvérisé le rocher où j'étais assis une seconde plus tôt. Note à moi-même : admirer de bien plus loin.",
    },
    // 532 · Éolectre (ELEC/VOL)
    eolectre: {
        ecology: "Créature ailée au corps pâle et duveteux, mi-chauve-souris mi-dragonnet, aux grandes oreilles pointues et aux ailes membraneuses sombres qui crépitent d'arcs électriques. Ses yeux jaunes vifs et ses petites cornes trahissent son sang draconique. Nerveux et remuant, il file entre les courants ascendants en semant des étincelles.",
        dicton: "Aile légère et vent chargé : qui court avec l'orage n'est jamais rattrapé.",
        note: "Impossible à croquer : il zigzague comme un éclair contrarié. J'ai finalement dessiné les traces lumineuses qu'il laisse dans l'air, faute de mieux.",
    },
    // 533 · Stratévolt (ELEC/VOL)
    stratevolt: {
        ecology: "Dragon-chauve-souris des hautes altitudes au pelage blanc nuageux et aux immenses ailes membraneuses zébrées d'éclairs. Ses oreilles se sont allongées en antennes captant l'électricité de l'air, et une aura orageuse l'enveloppe en permanence. Solitaire, il vit là où grondent les cumulonimbus et fond sur ses proies à la vitesse de la foudre.",
        dicton: "Plus haut que l'orage, plus rapide que l'éclair : nul ne voit venir la foudre du ciel.",
        note: "Je l'ai entendu avant de le voir : un roulement de tonnerre par ciel bleu. Le temps de lever la tête, il était déjà trois nuages plus loin.",
    },
    // 534 · Abyssonde (EAU/ELEC)
    abyssonde: {
        ecology: "Longue anguille abyssale au corps bleu nuit robuste, marquée de motifs cyan luminescents qui pulsent doucement dans le noir. Sa mâchoire garnie de crocs s'ouvre sur une gorge lumineuse, et des décharges électriques courent le long de ses flancs épaissis. Créature nocturne des profondeurs, patiente et endurante, elle encaisse bien plus qu'elle n'attaque.",
        dicton: "L'eau profonde encaisse en silence, puis rend la foudre au centuple.",
        note: "Ses taches bleues clignotaient dans le noir comme un tableau de bord. J'ai suivi la lueur d'un peu trop près et récolté une pichenette électrique en guise d'avertissement.",
    },
    // 535 · Maréfoudre (EAU/ELEC)
    marefoudre: {
        ecology: "Colosse serpentin des abysses au corps bleu nuit massif et blindé, sillonné de veines cyan crépitant d'électricité. Sa gueule caverneuse hérissée de crocs projette une lueur froide, et son sillage soulève des remous chargés d'orage. Immense et lent à s'émouvoir, ce gardien des grands fonds règne par sa seule présence, mur vivant que la marée elle-même contourne.",
        dicton: "La marée ne cogne pas : elle submerge, encaisse, et foudroie qui s'attarde.",
        note: "Un mur d'écailles bleues surgi des profondeurs, si vaste que mon carnet n'a pas suffi. J'ai renoncé au portrait et noté simplement : 'ne pas nager ici'.",
    },
    // 536 · Oniragon (PSY/DRAGON)
    oniragon: {
        ecology: "Dragon trapu à la peau violine héritée du grand hippopotame onirique, aux yeux d'or et à de courtes ailes membraneuses translucides. Une gemme rose pulse sur son poitrail, d'où sourdent ses songes. Créature crépusculaire et solitaire, elle somnole le jour et plane à basse altitude la nuit, au-dessus des marais brumeux et des eaux dormantes.",
        dicton: "Un dragon qui rêve éveillé frappe deux fois : par l'écaille et par l'esprit.",
        note: "Je l'ai réveillé par mégarde ; il m'a fixé, la gemme du ventre s'est mise à briller, et j'ai rêvé de mon petit-déjeuner pendant tout le combat. Match nul, disons.",
    },
    // 537 · Songedrak (PSY/DRAGON)
    songedrak: {
        ecology: "Grand dragon-songe à la robe pourpre profonde et aux longues ailes voilées de brume ; sa gemme frontale, large comme un poing, irradie une lueur rose apaisante. Placide et endurant, il vit en solitaire, dérive au ras des lacs à l'aube et tisse autour de lui un halo de rêves où le temps paraît ralentir.",
        dicton: "Qui dort d'un œil et veille de l'esprit ne tombe jamais vraiment.",
        note: "Impossible de le faire fuir : il encaisse, bâille, encaisse encore. Au bout d'une heure, c'est MOI qui me suis endormi contre son flanc tiède. Réveil très reposant, cela dit.",
    },
    // 538 · Sporcrypte (SPECTRE/POISON)
    sporcrypte: {
        ecology: "Quadrupède spectral au pelage noir fumée parcouru de veines phosphorescentes vert-poison, coiffé d'un chapeau de champignon tacheté d'où s'échappent des volutes de spores. Sa silhouette à demi translucide flotte plus qu'elle ne marche. Charognard nocturne et solitaire, il hante les sous-bois humides et les cavités moisies.",
        dicton: "Le poison ne crie pas : il attend, patient comme une spore dans l'ombre.",
        note: "J'ai voulu savoir si son chapeau était comestible. Il a lâché un nuage de spores violettes et j'ai passé la nuit à tenir conversation avec ma gourde. Verdict : PAS comestible.",
    },
    // 539 · Miasmort (SPECTRE/POISON)
    miasmort: {
        ecology: "Fauve fantôme décharné dont le corps de fumée noire s'effiloche à chaque bond ; un vaste chapeau nécrosé lui couronne l'échine et exhale sans répit un miasme mauve. Ses yeux luisent d'un vert toxique. Prédateur nocturne fulgurant et strictement solitaire, il rôde dans les marécages putrides et les charniers embrumés.",
        dicton: "Le miasme frappe avant l'ombre : vif à tuer, léger à mourir.",
        note: "Il est passé si vite que je n'ai vu qu'un voile violet et senti une odeur de vieux fromage oublié. Mes notes sur son allure tiennent en un mot griffonné à la hâte : « BEURK ».",
    },
    // 540 · Ombrelin (NORMAL/PSY)
    ombrelin: {
        ecology: "Petit félin agile au pelage bleu ardoise, dont la queue et les moustaches se prolongent en filaments souples qui ondulent comme des nouilles psychiques. Deux grands yeux verts surmontent un museau curieux. Joueur, diurne et plutôt grégaire, il chasse en fratrie les insectes des prairies et des lisières ensoleillées.",
        dicton: "Chat vif d'esprit retombe toujours sur ses pattes… et sur les tiennes.",
        note: "Il a « lu » ma prochaine caresse et l'a esquivée, l'air suffisant. Puis il est revenu la réclamer quand même. Un chat, quoi — mais un chat qui triche par télépathie.",
    },
    // 541 · Psychombre (NORMAL/PSY)
    psychombre: {
        ecology: "Félin longiligne et musculeux à la fourrure bleu nuit striée de marques psychiques luisantes ; ses filaments-nouilles se sont mués en fouets d'énergie qui claquent au moindre bond. Œil perçant, foulée silencieuse. Prédateur crépusculaire solitaire, il file à travers plaines et broussailles à une vitesse qui défie le regard.",
        dicton: "Plus rapide que ta pensée, plus dur que ton doute.",
        note: "J'ai cligné des yeux une seconde. Quand je les ai rouverts, il était derrière moi, mon sandwich entre les crocs et l'air parfaitement innocent. On n'attrape pas un tricheur télépathe la main dans le sac.",
    },
    // 542 · Givrèbre (SOL/GLACE)
    givrebre: {
        ecology: "Quadrupède râblé à la carrure de chèvre et au lard bleu-glace de cétacé, dont la fourrure givrée craque de cristaux à chaque mouvement. Ses pattes trapues, couvertes de terre gelée, portent une masse tranquille, et deux cornes émoussées ourlent son front. Placide, lent et solitaire, il rumine sur les hauteurs enneigées et les éboulis battus par le vent.",
        dicton: "La montagne ne court pas : elle attend que le gel fasse le travail.",
        note: "Je l'ai poussé pour qu'il se pousse. Il ne s'est pas poussé. J'ai fini par contourner les trois cents kilos de chèvre-glaçon en m'excusant très poliment.",
    },
    // 543 · Cryolithe (SOL/GLACE)
    cryolithe: {
        ecology: "Colosse glaciaire mi-chèvre mi-cétacé dont le corps massif mêle roche gelée et blocs de glace vive ; d'imposantes cornes recourbées et une carapace de givre le rendent presque immobile, tandis qu'un souffle blanc s'échappe sans cesse de ses naseaux. Solitaire et quasi statique, il trône des saisons durant sur les moraines et les plateaux glacés, immobile comme un menhir.",
        dicton: "Le roc ne se hâte pas ; c'est au monde de s'user contre lui.",
        note: "Trois jours d'observation. Il a bougé une oreille. Une seule. J'ai noté l'événement en gras dans mon carnet, avec l'heure exacte. Le reste de la page est resté désespérément vide.",
    },

}

/** Lore éditorial « premium » d'une espèce, ou null si pas encore rédigé (→ repli sur `description`). */
export function dexLore(speciesId: string): DexLore | null {
    return DEX_LORE[speciesId] ?? null
}

/** Une espèce a-t-elle sa fiche premium complète ? (utile pour le suivi de la refonte). */
export function hasDexLore(speciesId: string): boolean {
    return speciesId in DEX_LORE
}
