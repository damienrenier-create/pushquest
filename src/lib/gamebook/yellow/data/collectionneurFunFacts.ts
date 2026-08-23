// FUN FACTS de L'ARCHIVISTE — UNE anecdote par espèce (débitée à la rencontre + affichée sur la fiche du
//   dex quand elle est débloquée). Ton : collectionneur passionné, précis, amusant mais bref (1 phrase).
//   Source centralisée (évite d'éditer les littéraux SpeciesData). 206 espèces de base + 38 fusions fichées. FR.
//   Repli : si une espèce n'a pas d'entrée ici, archivisteFunFact génère une phrase générique.

export const FUN_FACTS: Record<string, string> = {
    "feuillichot": "Chez les Feuillichot, plus le dresseur sue à l'entraînement, plus leur pelage vire au vert bouteille : un vrai thermomètre à chlorophylle.", // N°001
    "broutame": "Il paraît qu'un Broubouc récolte plus de rosée sur ses bois au lever du jour qu'un pré entier, et refuse de brouter passé midi par pur snobisme.", // N°002
    "sylvapuce": "Cerfeuillu détient le record de siestes fleuries : partout où ce cerf centenaire pose ses bois pour un somme, une clairière éclôt sans prévenir.", // N°003
    "gouttiny": "Méfie-toi : un Gouttiny adore rebondir pile au-dessus de ta nuque pour t'offrir la seule éclaboussure que personne ne réclame jamais.", // N°004
    "ondulo": "Un vieux dresseur jure qu'un Ondulo peut surfer sur une vague qu'il a lui-même créée, la relançant à l'infini plutôt que d'admettre qu'il est tombé.", // N°005
    "razmaree": "Les naturalistes ont calculé qu'une seule inspiration de Razmarée fait reculer la mer de trois barques et d'un pêcheur médusé.", // N°006
    "braisille": "Personne ne sait pourquoi un Braisille refuse de dormir seul, sauf lui : négligé une nuit, ce renardeau boude et laisse sa braise virer au tiède.", // N°007
    "flamkure": "Flamkure serait le seul Daemon à s'enflammer davantage à l'échauffement qu'au combat : ce fauve prend son jogging matinal beaucoup trop au sérieux.", // N°008
    "pyrokoss": "Chez les Pyrokoss, chaque pas imprime une empreinte de magma : on cartographie leurs promenades des mois plus tard, aux pâquerettes carbonisées.", // N°009
    "plumiot": "Il paraît qu'un Plumiot compte plus d'atterrissages ratés que de plumes, mais qu'il redécolle chaque fois avec un courage bien trop grand pour sa taille.", // N°010
    "faukon": "Faukon détient le record du piqué le plus vaniteux : ce faucon vise sa proie, freine à la dernière seconde et vérifie d'abord si on l'a bien regardé.", // N°011
    "aquilothan": "Un vieux dresseur jure qu'un Aquilothan déploie une ombre si vaste que les villageois rentrent leur linge, persuadés qu'un orage arrive.", // N°012
    "cailloutchi": "Personne ne sait pourquoi un Cailloutchi refuse de bouger avant midi, sauf les géologues : ce chevreau de pierre confond obstination et sieste minérale.", // N°013
    "roctaur": "Les naturalistes ont calculé qu'une charge de Roctaur fait tinter la vaisselle à deux villages de là, ce que ce bélier rocheux prend pour un compliment.", // N°014
    "rochison": "Rochison serait le seul Daemon à figurer sur d'anciennes cartes comme point de repère : on l'y avait dessiné en menhir, avant qu'il ne décide de s'en aller.", // N°015
    "couperin": "Méfie-toi : un Couperin adore transformer le moindre poteau ou passant immobile en partenaire d'entraînement, ses poings bandés ignorant le repos.", // N°016
    "frappard": "Il paraît qu'un Frappard enchaîne plus de répétitions avant le petit-déjeuner que la plupart des dresseurs en un mois, et compte tout haut pour être sûr.", // N°017
    "maitrezenc": "Un vieux dresseur jure qu'un Maîtrezenc peut fendre un rocher d'un seul crochet, puis s'excuser platement auprès du rocher pour l'avoir dérangé.", // N°018
    "electroatiss": "Chez les Électroatiss, le bandeau n'est pas un déguisement de farceur : à force de frotter sa queue crépitante, ce coati électrise tout ce qu'il frôle.", // N°019
    "couranti": "Couranti détient le record du vol de goûter le plus électrisant : ce maraudeur drape sa cape conductrice sur sa proie avant qu'elle ait le temps de crier aïe.", // N°020
    "zappeureal": "Personne ne sait pourquoi Zappeuréal refuse d'entrer sous un toit, sauf les paratonnerres : ce souverain de la foudre tient à ce que sa couronne d'arcs reste visible.", // N°021
    "auroruff": "Les naturalistes ont calculé qu'un Auroruff passe plus de temps à réchauffer son propre os givré qu'à le ronger, ce chiot des neiges étant paradoxalement frileux.", // N°022
    "glaceer": "Glaceer serait le seul Daemon à signer ses courses : ce lévrier de gel laisse une traînée si nette qu'on suit sa foulée comme un pointillé argenté.", // N°023
    "auroraur": "Un vieux dresseur jure qu'un Auroraur déclenche une aurore boréale rien qu'en s'ébrouant, ce molosse polaire trouvant que le ciel manquait de panache.", // N°024
    "ruffiant": "Méfie-toi : un Ruffiant adore réorganiser ton pique-nique en file indienne, cette fourmi-soldat jugeant tes miettes bien trop mal rangées à son goût.", // N°025
    "formiguer": "Il paraît qu'un Formiguer porte sur son dos plus que son poids en brindilles, uniquement pour épater les ouvrières et frimer avec sa carapace renforcée.", // N°026
    "regnantaur": "Chez les Regnantaur, on raconte que la reine gouverne mille ouvrières par télépathie, mais oublie chaque matin où elle a posé sa couronne.", // N°027
    "lavapetit": "Les naturalistes ont mesuré qu'un Lavapetit reste tiède pile ce qu'il faut pour réchauffer un thé, mais jamais assez pour le faire bouillir.", // N°028
    "fissuralave": "Un vieux dresseur jure qu'un Fissuralave laisse dans son sillage des empreintes de lave qui servent, une fois refroidies, de dalles de jardin.", // N°029
    "magmator": "Magmator détient le record de la sieste la plus brûlante : son cœur de magma ne s'éteint jamais, même quand tout le reste ronfle.", // N°030
    "nouillon": "Il paraît qu'un Nouillon possède plus d'yeux au bout de ses tentacules que d'idées claires, ce qui explique ses trajectoires en tire-bouchon.", // N°031
    "vermisaint": "Personne ne sait pourquoi un Vermisaint refuse qu'on le démêle, sauf les moines qui y voient un nœud sacré à ne surtout pas dénouer.", // N°032
    "divinpate": "Chez les Divinpâte, on bénit les fidèles d'un léger coup de nouille sur le front, geste qu'on dit porteur de chance et de sauce tomate.", // N°033
    "piouflot": "Méfie-toi : un Piouflot adore imiter le grand vol plané des aînés, avant de s'écraser dans la première flaque venue en éclaboussant tout le monde.", // N°034
    "herondee": "Hérondée serait le seul Daemon à sécher plus lentement qu'il ne se mouille, si bien qu'un héron parfaitement sec passe pour une légende vivante.", // N°035
    "oragron": "Les naturalistes ont noté qu'un Oragron déclenche un mini-orage rien qu'en s'ébrouant, au grand désespoir des pique-niques de la région.", // N°036
    "broussours": "Un Broussours passe ses journées à confondre lutte et câlin, si bien que ses adversaires ne savent jamais s'ils ont perdu le combat ou gagné un ami.", // N°037
    "sylvours": "Chez les Sylvours, l'armure de feuilles se renouvelle à l'automne : un guerrier qui perd sa cuirasse attend patiemment le printemps suivant pour se rhabiller.", // N°038
    "druidours": "Druidours détient le record de la révérence la plus lente : saluer un ancien de la forêt lui prend, dit-on, une saison entière, sève comprise.", // N°039
    "pampousse": "Un vieux dresseur jure qu'un Pampousse peut s'endormir au sommet d'une branche et se réveiller trois arbres plus loin sans jamais toucher le sol.", // N°040
    "feliane": "Les naturalistes ont calculé qu'une Féliane lancée à pleine vitesse laisse un sillage de feuilles qui met dix bonnes minutes à retomber.", // N°041
    "cerfeuillu": "Il paraît qu'un Silviliane porte plus de fruits sur ses bois qu'un verger entier, et que les oiseaux s'y installent comme dans un arbre officiel.", // N°042
    "loutrille": "Personne ne sait pourquoi un Loutrille refuse de rester immobile plus de trois secondes, sauf quand il fait mine de dormir pour mieux piquer ton goûter.", // N°043
    "ondaloutre": "Ondaloutre détient le record de la plus longue glissade sur vague personnelle, un exploit qu'elle refait fièrement dès qu'un public la regarde.", // N°044
    "naiadrak": "Chez les Naïadrak, la couronne de corail pousse d'un rameau par courant maîtrisé, si bien qu'un vieux gardien porte une véritable forêt sur la tête.", // N°045
    "fennaise": "Méfie-toi : un Fennaise adore tendre ses grandes oreilles aux ragots du campement, puis répandre la nouvelle avant même que tu aies fini ta phrase.", // N°046
    "pyrenard": "Les naturalistes ont calculé qu'un Pyrenard sème assez d'étincelles pour rallumer un feu de camp éteint, mais jamais assez pour retrouver son propre chemin.", // N°047
    "loupyre": "Loupyre serait le seul Daemon à hurler à la lune en projetant une gerbe d'étincelles, spectacle qui lui vaut le surnom de comète des nuits froides.", // N°048
    "forgeotin": "Chez les Forgeotin, chaque petit reçoit un marteau avant même de savoir marcher, et tape sur tout ce qui traîne en croyant déjà forger des chefs-d'œuvre.", // N°049
    "marteloutan": "Il paraît qu'un Marteloutan use plus de tabliers de cuir que de marteaux, tant il met d'ardeur à cogner tout ce qui ressemble de près à une enclume.", // N°050
    "enclumind": "Un vieux dresseur jure qu'un Enclumind redresse une pensée tordue d'un coup de marteau, ce qui explique qu'on le consulte avant les grandes décisions.", // N°051
    "trolystrik": "Trolystrik détient le record des cheveux dressés d'un coup : sa crête grésille tant qu'il sert volontiers de briquet ambulant à toute la bande.", // N°052
    "brutetrik": "Un vieux dresseur jure qu'un Brutetrik recharge sa lampe torche d'un seul coup de poing crépitant, puis la fait fondre neuf fois sur dix.", // N°053
    "hebulmin": "Hébulmin détient le record du plus long silence après une gifle : la crinière grésille, l'arène tremble, et personne n'ose applaudir.", // N°054
    "draclet": "Chez les Draclet, on a remarqué qu'ils s'essoufflent à battre des ailes pour décoller de trois centimètres, puis boudent tout l'après-midi.", // N°055
    "wyverion": "Il paraît qu'un Wyverion accumule plus de piqués ratés dans les buissons que de proies attrapées, mais jure que c'était « pour l'entraînement ».", // N°056
    "draconarque": "Les naturalistes ont calculé qu'à midi l'ombre d'un Draconarque plonge une vallée entière dans la nuit ; les fermiers en profitent pour une sieste.", // N°057
    "cornaissant": "Méfie-toi : un Cornaissant à peine éclos goûtera toute potion laissée sans surveillance, et recrachera dignement celles qui ne pétillent pas.", // N°058
    "corvenin": "Personne ne sait pourquoi un Corvenin refuse de voler sans sa petite fiole de venin sous l'aile, sauf peut-être par pure coquetterie d'alchimiste.", // N°059
    "necrocorbe": "Nécrocorbe serait le seul Daemon à réciter ses incantations à l'envers quand il boude, ce qui, dit-on, ravive les âmes au lieu de les ronger.", // N°060
    "sporbeo": "Chez les Sporbéo, garder le sourire est une religion : flammèche spectrale éteinte, un simple éternuement de spores suffit à la rallumer.", // N°061
    "lampignon": "Il paraît qu'un Lampignon range les âmes égarées dans sa lanterne comme d'autres collectionnent les lucioles, et les libère quand il s'ennuie la nuit.", // N°062
    "mycedruide": "Les naturalistes ont calculé qu'un Mycédruide médite si longtemps que le mycélium de sa couronne relie, dit-on, une forêt entière en un seul réseau.", // N°063
    "tamanpousse": "Méfie-toi : un Tamanpousse plante sa langue-liane dans la première fourmilière venue et en sirote la sève des heures, oreilles frétillantes de plaisir.", // N°064
    "fourmilierre": "Fourmilierre détient le record de la langue la plus longue du sous-bois : d'un claquement, elle happe un nuisible à trois mètres sans bouger de l'ombre.", // N°065
    "gloutanoir": "On raconte qu'un Gloutanoir rassasié laisse ses proies non pas blessées, mais simplement trop fatiguées pour lui en vouloir, avachies sous sa crinière.", // N°066
    "pantheon": "Personne ne sait de quelle humeur se réveillera un Panthéon : selon l'énergie frôlée la veille, son pelage tire vers le givre, la braise ou l'orage.", // N°067
    "florapanthe": "Chez les Florapanthe, on a remarqué qu'elles s'élancent de liane en liane sans jamais toucher terre, et tiennent le fait de marcher pour une vulgarité.", // N°068
    "panthegel": "Il paraît qu'un Panthégel éternue de vrais flocons et refuse de dormir ailleurs que sur un carreau gelé, qu'il polit d'abord d'un souffle glacial.", // N°069
    "pyropanthe": "Les naturalistes ont calculé qu'un Pyropanthe au galop distance sa propre flamme, si bien qu'on le surprend parfois à courir après sa couronne éteinte.", // N°070
    "ombrapanthe": "Ombrapanthe serait le seul Daemon capable de se tapir dans sa propre ombre, ce qui explique qu'on ne l'ait jamais pris en photo de face.", // N°071
    "aquapanthe": "Un vieux dresseur jure qu'un Aquapanthe endormi bruisse comme un ruisseau, et que sa crinière ruisselante ne s'assèche pas même en plein désert.", // N°072
    "voltapanthe": "On dit qu'un Voltapanthe change de pièce plus vite que sa moustache ne finit de grésiller ; les autres panthères ont renoncé depuis à la course.", // N°073
    "rembodo": "Chez les Rembodo, courir plus vite qu'on ne réfléchit est un art : ce dodo fonce droit dans les murs qu'il avait pourtant contournés la veille.", // N°074
    "retroraptor": "Méfie-toi : un Rétroraptor picore ta montre pour « gagner du temps », persuadé qu'avec son bec de dodo il fera reculer les aiguilles du cadran.", // N°075
    "chronorex": "Chronorex détient le record du plus vieux fossile jamais réveillé, et reste vexé qu'un T-Rex de sa carrure ait hérité d'un ridicule petit bec de dodo.", // N°076
    "mottoche": "Personne ne sait pourquoi un Mottoche refuse obstinément de rouler en descente, sauf peut-être qu'une motte de terre a, elle aussi, sa fierté.", // N°077
    "dumotte": "Il paraît qu'un Dumotte passe ses journées à se chamailler avec lui-même, ses deux mottes soudées n'étant jamais d'accord sur la direction à prendre.", // N°078
    "quadroc": "Il paraît qu'un Quadroc a plus d'angles morts que de côtés : ses quatre cailloux se chamaillent pour savoir lequel touchera le sol en premier.", // N°079
    "octoroc": "Chez les Octoroc, on raconte que huit cailloux valent mieux que quatre : le neuvième, jaloux, roule toujours à part en boudant.", // N°080
    "hexaroc": "Hexaroc détient le record du plus grand nombre de cailloux capables de tenir un conciliabule sans qu'aucun des seize ne se fende jamais.", // N°081
    "diamantine": "Les naturalistes ont calculé qu'un Diamantine renvoie exactement trente-deux reflets bleutés, un par cristal, de quoi éblouir un dresseur distrait.", // N°082
    "amadiam": "Personne ne sait pourquoi un Amadiam refuse de compter ses propres diamants, sauf les joailliers, qui préfèrent ne jamais recompter les soixante-quatre.", // N°083
    "golemini": "Un vieux dresseur jure qu'un Golémini, taillé dans soixante-quatre diamants, marche en cliquetant comme un lustre pris de panique.", // N°084
    "megalithe": "Méfie-toi : un Mégalithe adore poser pour l'éternité, et les grimpeurs qui l'ont pris pour une falaise attendent encore qu'il daigne bouger.", // N°085
    "limaroche": "Il paraît qu'une Limaroche met plus de temps à traverser une flaque qu'à lire dans vos pensées : ses antennes télépathes n'attendent pas ses pieds.", // N°086
    "escaroche": "Chez les Escargyle, la moindre bousculade se règle par un long silence de pierre : leur coquille est si imperturbable qu'ils y méditent parfois une saison entière.", // N°087
    "torturoche": "Tortoracle serait le seul Daemon à prédire l'avenir depuis sa carapace de roche, mais son oracle arrive toujours avec une lenteur de tortue millénaire.", // N°088
    "marmoterre": "Un vieux dresseur jure qu'une Marmoterre creuse la pierre gelée si vite qu'elle réveille l'hiver avant que l'automne ait fini de tomber.", // N°089
    "iorours": "Méfie-toi : une Iorours porte sa cuirasse de glace et de roc avec tant de fierté qu'elle refuse de saluer quiconque n'a pas gravi un sommet.", // N°090
    "yetiroche": "Il paraît qu'un Yétiroche laisse plus d'empreintes que de témoins : entre son poing de roc et son souffle glacé, personne ne reste debout pour raconter.", // N°091
    "tetardoc": "Chez les Têtardoc, on apprend à viser avant même de savoir nager : la petite carapace de galet fait un abri commode entre deux tirs d'essai.", // N°092
    "grenarc": "Un vieux dresseur jure qu'un Grenarc décoche ses flèches de pierre les yeux fermés, et que son arc coasse un petit « touché » à chaque mouche embrochée.", // N°093
    "crapotaure": "Crapôtaure détient le record de flèches de roche tirées avant qu'un autre Roche ait seulement décidé de bouger : le plus vif de sa famille, et le plus fanfaron.", // N°094
    "revemante": "Personne ne sait pourquoi une Revemante refuse d'apparaître de face, sauf ceux qui l'ont vue surgir du néant : ils ne s'en souviennent plus.", // N°095
    "necarabee": "Les naturalistes ont calculé qu'à travers la carapace translucide d'un Nécarabée on peut lire l'heure de sa dernière hantise, mais jamais celle de la prochaine.", // N°096
    "necrolopendre": "Méfie-toi : un Nécrolopendre adore frôler ta nuque dans le noir ; long, insaisissable, il file sans un bruit — mais un coup bien placé le brise net.", // N°097
    "colibraise": "Chez les Colibraise, battre des ailes plus vite que l'œil ne suit finit toujours en petites étincelles : ils sont les seuls oiseaux à s'éclairer eux-mêmes en volant.", // N°098
    "arardent": "Un vieux dresseur jure qu'un Arardent au plumage incandescent fait crépiter l'air d'un seul cri, et que sa cage réchauffe la maison mieux qu'un poêle.", // N°099
    "toucanyon": "Il paraît qu'un Toucanyon a plus de flammes au bout du bec que de plumes sur le dos : ce toucan-volcan grille ses cibles avant même de les survoler.", // N°100
    "blaziper": "Blaziper serait le seul serpenteau à endormir une proie d'un simple regard tiède, quitte à somnoler juste après, hypnotisé par sa propre chaleur.", // N°101
    "flamaspic": "Chez les Flamaspic, on mesure la concentration à la fumée : plus les anneaux incandescents fument, plus l'aspic est sur le point de trouver une idée brûlante.", // N°102
    "vipember": "Un vieux dresseur jure qu'une Vipember millénaire n'a jamais mordu personne : son esprit brûlant plie déjà les volontés bien avant que ses crocs n'y songent.", // N°103
    "braisecaille": "Personne ne sait comment une Braisécaille garde des braises au sec sous la mare cachée dans sa carapace, sauf peut-être la tortue, qui n'en dit jamais rien.", // N°104
    "calderont": "Les naturalistes ont calculé qu'un Caldéront met trois siècles à refroidir sa carapace-volcan : officiellement la tortue la moins pressée du Nexus.", // N°105
    "brasicow": "Chez les Brasicow, on a remarqué que ruminer du charbon ardent donne un lait crémeux et légèrement fumé, très prisé des dresseurs gourmands.", // N°106
    "tauricendre": "Tauricendre détient le record de la plus longue trace de brûlé laissée par une charge : on jure que le sillon fume encore trois jours plus tard.", // N°107
    "pyrozly": "Personne ne sait pourquoi Pyrozly refuse d'hiberner ailleurs que dans un cratère tiède, sauf qu'un grizzly au pelage fumant déteste avoir froid aux pattes.", // N°108
    "belunode": "Méfie-toi : un Bélunode adore qu'on le caresse, mais chaque câlin le fait crépiter, si bien qu'on le chouchoute désormais avec des gants isolants.", // N°109
    "sonarque": "Un vieux dresseur jure qu'un Sonarque peut retrouver une pièce tombée au fond des abysses rien qu'en l'appelant par son cliquetis électrique.", // N°110
    "leviathonn": "Il paraît qu'un Léviathonn a plus de kilomètres de courant dans une seule décharge que la plupart des fleuves n'en ont de cours entier.", // N°111
    "jerbiwat": "Jerbiwat serait le seul Daemon à faire crépiter sa roue au point d'éclairer tout son terrier lorsqu'il court après ses propres pensées.", // N°112
    "namicha": "Caresser un Namicha revient à toucher à la fois une ombre et une pile : on ressort avec les doigts glacés ET les cheveux dressés sur la tête.", // N°113
    "namizeus": "Personne ne sait comment Namizeus arrive avant son propre coup de tonnerre, sauf que ce félin spectral trouve terriblement grossier d'attendre son signal.", // N°114
    "boltah": "Les naturalistes ont calculé qu'un Boltah dépasse sa propre ombre de deux bonnes foulées, ce qui explique pourquoi il a toujours l'air de courir seul.", // N°115
    "heatah": "Méfie-toi : un Heatah adore piquer un sprint dans les herbes sèches, laissant une traînée de braises que les pompiers du Nexus connaissent trop bien.", // N°116
    "thundah": "Thundah détient le record de vitesse du Nexus : on raconte qu'il franchit la ligne d'arrivée avant même d'avoir décidé de participer à la course.", // N°117
    "bouh": "Chez les Bouh, on a remarqué qu'un petit spectre boudeur encaisse bien mieux les coups que les remarques sur son air perpétuellement renfrogné.", // N°118
    "bouhbou": "Un vieux dresseur jure qu'un Bouhbou range ses poings dans l'ombre et les ressort exactement là où on ne les attend pas, boudeur mais redoutable.", // N°119
    "brook": "Brook serait le seul Daemon à monter la garde d'une tombe pendant des siècles sans jamais réclamer ni relève, ni prime, ni même une pause déjeuner.", // N°120
    "brookhante": "Les naturalistes ont calculé qu'il faudrait empiler dix enclumes sur un Brookhanté avant qu'il ne daigne enfin reculer d'un timide demi-pas.", // N°121
    "hibouh": "Personne ne sait pourquoi Hibouh hulule toujours trois fois avant de fondre sur sa proie, sauf que ce petit spectre trouve l'effet dramatique très réussi.", // N°122
    "chouhante": "Il paraît qu'un Chouhanté lit vos pensées d'un œil et scrute l'au-delà de l'autre, ce qui rend toute partie de cache-cache perdue d'avance.", // N°123
    "archibouh": "Méfie-toi : un Archibouh commence par te foudroyer l'esprit d'un hululement, si bien que tu ne vois même pas venir l'ombre qui achève le travail.", // N°124
    "goshendofy": "Goshendofy détient le record du légendaire le mieux planqué : un dragon primordial qui dort dans l'herbe la plus banale, là où nul n'ose regarder.", // N°125
    "gekroc": "Un vieux dresseur jure qu'un Gékroc apprend n'importe quelle technique en une nuit, puis creuse un tunnel fulgurant rien que pour aller frimer ailleurs.", // N°126
    "carlinou": "Chez les Carlinou, on a remarqué que leurs ronflements dessinent de petites volutes de fumée en forme de cœur, au grand désespoir des voisins.", // N°127
    "carlembre": "Il paraît qu'un Carlembre a plus de joues que d'envergure, et pourtant ses petites ailes tiennent bon, sa queue de feu refusant désormais de s'éteindre.", // N°128
    "dracarlin": "Dracarlin serait le seul carlin à toiser les nuages de haut avant de fondre en piqué embrasé, plus vite qu'un simple battement de cils.", // N°129
    "glacirex": "Les naturalistes ont calculé qu'une morsure de Glacirex givre son casse-croûte à l'instant même, ce qui lui vaut le surnom de petit roi du surgelé.", // N°130
    "cryotyran": "Chez les Cryotyran, éternuer est fort mal vu : un seul reniflement de ce tyran des banquises transforme la mare du voisinage en patinoire pour la saison.", // N°131
    "orcaline": "Il paraît qu'une Orcaline a figé plus de dragons d'un seul souffle glacé qu'elle n'a jamais avalé de poissons, un régime qu'aucun naturaliste ne s'explique.", // N°132
    "sylvebarbe": "Sylvebarbe serait le seul Daemon à mettre trois automnes pour se retourner, si bien que les oiseaux le prennent pour une colline et y bâtissent des villages.", // N°133
    "tonytony": "Un vieux dresseur jure qu'un Tonytony a bercé toute une infirmerie d'un seul fredon, avant de s'évanouir parce qu'un papillon avait effleuré sa coquille.", // N°134
    "gekraise": "Les naturalistes ont calculé qu'un Gékraise apprend une technique plus vite qu'il ne refroidit, c'est-à-dire jamais, vu le magma qui lui tient lieu de cœur.", // N°135
    "ukognos": "Personne ne sait pourquoi Ukognos n'apparaît qu'à ceux qui refont tout depuis le début, sauf peut-être lui, qui ricane en flammes violettes sans rien expliquer.", // N°136
    "merorem": "Méfie-toi : un Merorem adore serrer la main, et chacune de ses étreintes suintantes t'offre gracieusement une maladie que tu n'avais jamais réclamée.", // N°137
    "morrow": "Morrow détient le record du baiser le plus frais : d'un effleurement givré elle endort sa proie, puis nie farouchement avoir jamais quitté son monde.", // N°138
    "gavillus": "Chez les Gavillus, le nourrisson résout l'énigme du dîner avant les adultes, ce qui explique pourquoi ses parents rangent désormais les biscuits tout en haut.", // N°139
    "crocodaillus": "Il paraît qu'un Crocodaillus peut lire deux livres à la fois, un œil par page, puis se disputer tout seul sur la meilleure des deux fins.", // N°140
    "alirocaillus": "Un vieux dresseur jure qu'un Alirocaillus lui a chipé son chapeau en plein vol, l'a repeint façon rocher, puis le lui a rendu contre un pourboire.", // N°141
    "goatiny": "Méfie-toi : un Goatiny adore se frotter aux inconnus, et sa laine grésillante de statique transforme le moindre câlin en petite décharge surprise.", // N°142
    "mouflorage": "Mouflorage serait le seul Daemon à prendre rendez-vous avec sa proie : il la paralyse poliment, consulte ses cornes-bobines, puis la foudroie à l'heure dite.", // N°143
    "magnetor": "Les naturalistes ont calculé qu'un Magnetor met neuf hivers à tiédir, si bien que les villageois l'invitent chaque décembre à faire office de radiateur.", // N°144
    "elefer": "Chez les Éléfer, la sieste est un sport de haut niveau : ce lourdaud de fer s'endort si profondément qu'on l'a déjà confondu avec une enclume oubliée.", // N°145
    "barrisfer": "Il paraît qu'un Barrisfer a annulé un concert d'un seul barrissement, le public ayant pris son cri de gong pour l'annonce d'un entracte prolongé.", // N°146
    "colosfer": "Colosfer détient le record du déménagement le plus lent : refusant qu'on le pousse, ce mammouth de métal a mis un an à changer de pièce, par pur principe.", // N°147
    "cornaive": "Un vieux dresseur jure qu'une Cornaïve a voulu décrocher la lune avec sa corne, l'a manquée trois fois, puis a boudé en illuminant tout le pré de dépit.", // N°148
    "astracorne": "Personne ne sait comment Astracorne galope sur les rayons de lune sans glisser, sauf les nuits sans étoiles, où on l'entend pester tout bas dans le noir.", // N°149
    "lunarque": "Les naturalistes ont calculé qu'un coup de corne de Lunarque éclaire une nuit entière, ce qui fait d'elle l'unique souveraine à facturer le clair de lune.", // N°150
    "coccipoing": "Méfie-toi : une Coccipoing adore provoquer trois fois sa taille, et ses petits gantelets rouges cognent avant même que l'adversaire ait fini de sourire.", // N°151
    "coccombat": "Chez les Coccombat, on largue ses élytres comme d'autres jettent leur manteau, persuadées que rien ne doit ralentir une bonne raclée bien menée.", // N°152
    "coccimperatrice": "Il paraît qu'une Coccimpératrice compte ses pois rouges comme des victoires, et qu'aucune garde n'a jamais tenu le temps qu'elle finisse de compter.", // N°153
    "aquilord": "Aquilord détient le record du bulletin météo le plus capricieux : d'un battement d'ailes il livre grêle puis canicule, au gré du seigneur des cieux.", // N°154
    "mimimoy": "Mimimoy serait le seul Daemon dont la grande prouesse est de rester introuvable, si banal que les collectionneurs se ruinent juste pour prouver qu'il existe.", // N°155
    "gekosmic": "Un vieux dresseur jure qu'un Gékosmic a deviné sa question avant qu'il n'ouvre la bouche, puis a répondu d'un éclair psychique jailli de sa carapace de roche.", // N°156
    "hypnoppo": "Chez les Hypnoppo, on a remarqué que bâiller à table est un signe de respect : ça signifie qu'on aime assez son voisin pour l'endormir avant lui.", // N°157
    "teleppo": "Un Téléppo peut arriver en retard à un rendez-vous tout en étant déjà reparti : son troisième œil, lui, vit trois secondes dans le futur.", // N°158
    "omnhippo": "Un vieux dresseur jure qu'un Omnhippo a esquivé une gifle qu'il n'avait pas même décidé de donner : tous ses yeux l'avaient vue venir avant lui.", // N°159
    "karmaki": "Les naturalistes ont calculé qu'un Karmaki rend très exactement ce qu'il reçoit : lui marcher sur une liane revient à se marcher soi-même sur le pied.", // N°160
    "otama": "Personne ne sait pourquoi Otama refuse d'ôter son origami, même pour dormir, sauf lui, qui se prend déjà pour un grand guerrier plié en quatre.", // N°161
    "gamaruto": "Méfie-toi : un Gamaruto adore te tendre la patte façon poignée de main, juste pour te noyer d'un jutsu d'eau au moment où tu la serres.", // N°162
    "uzumaro": "Uzumaro détient le record du combat gagné sans un geste : bras croisés, il a laissé l'orage et l'adversaire s'épuiser avant de lever le petit doigt.", // N°163
    "wistree": "Wistree serait le seul Daemon à t'applaudir poliment quand tu te renforces devant lui, juste avant de t'aspirer toute ta belle énergie neuve.", // N°164
    "guizer": "Ne te fie pas à sa bouille de peluche : Guizer tient une liste noire de tous ceux qui ont osé lui pincer la joue, et n'oublie jamais un nom.", // N°165
    "dalugazer": "Il paraît qu'un Dalugazer garde plus de rancunes en réserve que de glaçons dans sa banquise, et compte bien les régler toutes, une par une.", // N°166
    "mobyd": "Les marins racontent qu'apercevoir un Moby D porte malheur, surtout au marin : l'orque blanche ailée n'a jamais pardonné qu'on écrive des romans sur elle.", // N°167
    "shady": "Chez les Shady, on a remarqué que renverser un vase puis filer à travers le mur est le passe-temps préféré : c'est toujours le chat d'à côté qu'on accuse.", // N°168
    "shade": "Un Shade aiguise ses griffes phosphorescentes contre le mur à trois heures du matin, non par cruauté, mais purement pour l'ambiance lumineuse.", // N°169
    "shadow": "Shadow détient le record de la disparition la plus vexante : il a déjà croqué un goûter et filé avant même que l'ombre du dresseur ait touché le sol.", // N°170
    "caninombre": "Les naturalistes ont calculé qu'un Caninombre absorbe tant de lumière qu'on en a déjà égaré un dans une pièce pourtant parfaitement éclairée.", // N°171
    "lycanfer": "Un vieux dresseur jure qu'un Lycanfer crache des flammes si froides qu'elles gèlent au lieu de brûler, et qu'il s'en sert surtout pour rafraîchir sa gamelle.", // N°172
    "tenebrir": "Ténèbrir serait le seul Daemon dont le hurlement éteint tous les lampadaires du quartier, ce qui lui vaut une facture d'électricité étonnamment basse.", // N°173
    "sepulcru": "Avec sa tête chauve bien trop grande pour ses deux yeux violets, Sépulcru passe ses journées à répéter son regard menaçant dans les flaques, sans grand succès.", // N°174
    "macabour": "Méfie-toi : un Macabour adore planer très bas et très lentement au-dessus de toi, histoire de te rappeler qu'il a tout son temps, et toi beaucoup moins.", // N°175
    "condombre": "Condombre détient le record du masque le plus glaçant : une mosaïque de crânes soudés qu'il astique chaque matin comme d'autres cirent leurs chaussures.", // N°176
    "bidouzen": "Chez les Bidouzen, on a remarqué que les moustaches frémissent juste avant chaque bêtise : c'est leur seul détecteur de mauvaise idée, et il sonne sans arrêt.", // N°177
    "medisciple": "Personne ne sait pourquoi Medisciple médite toujours les poings serrés, sauf son maître, qui sait qu'un chat bien discipliné reste un chat prêt à griffer.", // N°178
    "karatame": "Karatame lévite en permanence, non par flemme de marcher, mais parce qu'un vrai maître du kung-fu psychique juge que le sol, franchement, c'est pour les amateurs.", // N°179
    "geckebre": "Géckèbre serait le seul Daemon qu'on ait confondu avec un rocher si longtemps qu'une mousse a eu le temps d'y pousser avant qu'il ne daigne enfin bouger.", // N°180
    "geaucke": "Il paraît qu'un Geaucké gaspille plus d'eau à foncer qu'une cascade entière, ce qui explique pourquoi il freine toujours contre un mur trop tard.", // N°181
    "batchu": "Méfie-toi : un Batchu adore te tourner autour en zigzag crépitant, et tu ne repères la petite chauve-souris qu'à l'instant où elle t'a déjà chatouillé.", // N°182
    "supabatchu": "Les naturalistes ont calculé qu'un Supabatchu bat des ailes si vite qu'il grille trois moustiques par éclair — et s'excuse rarement pour le bruit.", // N°183
    "phoechaudi": "Chez les Phoéchaudi, le premier cri n'est pas un pépiement mais un soupir condescendant : ce poussin de phénix mauve trouve déjà les flammes des autres trop tièdes.", // N°184
    "phoechaudii": "Il paraît qu'un Phoéchaudii passe plus de temps à lisser ses plumes mauves fantômes qu'à voler, persuadé qu'un phénix se doit d'être impeccable même en hantant.", // N°185
    "phoechaudiii": "Un vieux dresseur jure qu'un Phoéchaudiii ne renaît de ses cendres que lorsque personne ne regarde, jugeant le spectacle indigne d'un public aussi banal.", // N°186
    "obscurene": "Personne ne sait pourquoi l'Obscurène refuse de nager en eau claire, sauf peut-être qu'un œil aussi luisant préfère rester la seule lumière des abysses.", // N°187
    "abyssombre": "Méfie-toi : un Abyssombre adore imiter le rocher noir pendant des heures, immobile et patient, juste pour le plaisir de voir une proie changer d'avis trop tard.", // N°188
    "leviabysse": "Léviabysse détient le record de la plus longue apnée du Nexus : il resterait tapi dans le noir des siècles entiers rien que pour éteindre une seule flamme oubliée.", // N°189
    "crocavern": "Crocavern serait le seul Daemon à confondre volontairement sieste et embuscade : enfoui dans le sable, il engloutit ce qui passe sans jamais vraiment se réveiller.", // N°190
    "rosdrakis": "Chez les Rosdrakis, on a remarqué que ce dragonnet rose dort si profondément qu'il ronfle en écailles féeriques, rêvant du colosse qu'il jure devenir un jour.", // N°191
    "dracosidhe": "Déployer ses ailes de flammes féeriques prend à Dracosidhe une seconde à peine ; ranger correctement sa crête magenta, en revanche, lui prend toute la matinée.", // N°192
    "archeoptix": "Un vieux dresseur jure qu'un Archéoptix, curieux jusqu'au bout des griffes rouges, apprend un chemin de vent inédit chaque fois qu'il se perd — c'est-à-dire souvent.", // N°193
    "pterosidhe": "Ptérosidhe détient le record du plané le plus silencieux : sa proie n'apprend qu'elle est chassée qu'au moment où l'ombre de ses ailes féeriques lui tombe dessus.", // N°194
    "fulguror": "Méfie-toi : un Fulguror adore frapper en premier, non par stratégie mais parce que son corps fossile risque de se fissurer s'il attend son tour trop poliment.", // N°195
    "rocosaure": "Il paraît qu'un Rocosaure bouge moins en une année qu'une montagne en un siècle : on en aurait pris trois pour des collines avant qu'ils ne ripostent en séisme.", // N°196
    "givroptere": "Chez les Givroptère, on répète qu'il vaut mieux être bon partout que génial nulle part : ce ptérosaure de givre a traversé tous les âges gelés rien qu'en restant polyvalent.", // N°197
    "toxyrm": "Toxyrm serait le seul Daemon à bouder son adversaire plutôt qu'à l'attaquer, comptant sur ses glandes déjà venimeuses pour rendre chaque câlin franchement regrettable.", // N°198
    "wyvortal": "Les naturalistes ont calculé qu'un Wyvortal gagne la plupart de ses duels sans lever une aile : il lui suffit d'empoisonner l'air et d'attendre, increvable et serein.", // N°199
    "joeyrrant": "Sans yeux mais rancunier jusqu'à la moelle, Joeyrrant s'accroche à sa mère pour ne rien lâcher de la vie — et surtout pour n'oublier aucun affront.", // N°200
    "wallabisan": "Personne ne sait pourquoi Wallabisan garde son bras d'os toujours du même côté, sauf qu'un demi-mort-vivant aussi timide n'ose sans doute pas demander de retouches.", // N°201
    "kangoudead": "Il paraît qu'un Kangoudead range encore un petit dans sa poche fantôme, alors qu'il n'a même plus de mâchoire pour lui raconter la moindre histoire au coucher.", // N°202
    "megamonarx": "MégamonarX détient le record du pas le plus lourd du Nexus : la légende dit qu'un seul de ses déplacements a redessiné trois vallées et fâché tous les géologues.", // N°203
    "galijah": "Un vieux dresseur jure qu'un Galijah copie n'importe quelle technique après l'avoir vue une fois — sauf les ténèbres, qu'il fuit en gloussant comme un enfant taquin.", // N°204
    "osquille": "Méfie-toi : un Osquille adore saluer d'un coup de poing sonique qui implose l'eau en coup de tonnerre — spectacle magnifique, jusqu'à ce que tu réalises que c'était pour toi.", // N°205
    "ro": "Chez les Rô, on a remarqué que rien ne bouge à leur approche nocturne : la proie s'endort, s'empoisonne et s'enlise dans le sable avant d'avoir compris qu'il faisait nuit.", // N°206
    "mottelave": "Les naturalistes ont calculé qu'un Mottelave met neuf siècles à refroidir : mi-caillou mi-braise, c'est le pire partenaire de câlin jamais recensé.", // N°500
    "nouiflot": "Il paraît qu'un Nouiflot a plus de pensées philosophiques que de calories, ce ruban de pâte flottant sur l'eau sous la garde d'un oisillon rêveur.", // N°501
    "sporemante": "Chez les Sporémante, on a remarqué qu'ils infusent leurs cauchemars tel un thé : un coup de chapeau-champignon, une bouffée de spores, et bonne nuit spectrale.", // N°502
    "ruffardoc": "Ruffardoc détient le record du sprint en armure : ce têtard bardé d'éclats de roche court plus vite qu'un galet ricoché, sans jamais perdre une écaille.", // N°503
    "dractriss": "Un vieux dresseur jure qu'un Dractriss a grillé son réveil avant que l'alarme sonne : ce dragonnet aux ailerons crépitants frappe toujours une seconde trop tôt.", // N°504
    "voltaile": "Méfie-toi : un Voltaile adore recharger ses ailes sur les lignes à haute tension, car ce croisé de chauve-souris et de dragonnet prend la foudre pour un hamac.", // N°510
    "abyssvolt": "Personne ne sait pourquoi Abyssvolt refuse de nager en surface, sauf qu'un serpent des abysses gorgé d'électricité préfère garder ses courts-circuits au frais.", // N°511
    "oniridrak": "Oniridrak serait le seul Daemon à bâiller pour attaquer : ce dragon des songes endort ses proies d'un souffle et les pourchasse jusque dans leurs rêves.", // N°512
    "necrospore": "Les naturalistes ont calculé qu'un Nécrospore relâche par éternuement de quoi champignonner tout un cimetière, aboiements d'outre-tombe compris.", // N°514
    "ombrepsy": "Il paraît qu'un Ombrepsy compte plus de nœuds dans son ombre de pâte molle que de pensées claires dans sa tête embrumée de psychisme.", // N°515
    "rocaptere": "Un vieux dresseur jure qu'un Rocaptère peut planer trois jours d'affilée sans battre de l'aile, réchauffé par la lave qui suinte de sa carcasse rocheuse.", // N°516
    "givrasol": "Givrasol détient le record du rot le plus froid jamais mesuré : un geyser de givre capable de figer la terre labourée par ses propres sabots.", // N°517
    "fissuraillus": "Chez les Fissuraillus, on a remarqué que chaque battement d'ailes membraneuses ravive la lave endormie dans leurs fissures, façon soufflet de forge ailé.", // N°518
    "magmaillus": "Personne ne sait pourquoi Magmaillus refuse de se poser près de l'eau, sauf les volcanologues : ce dragon de roche en fusion tient trop à ses ailes rougeoyantes.", // N°519
    "scorieve": "Méfie-toi : un Scoriève adore se rouler dans les braises pour durcir sa carapace de scorie, quitte à transformer ton feu de camp en bloc de roche fumante.", // N°520
    "basaltor": "Basaltor serait le seul Daemon à se fissurer en colonnes de basalte encore tièdes lorsqu'il boude, se reformant en mur plus têtu dès qu'on ose le contrarier.", // N°521
    "siderobloc": "Il paraît qu'un Sidérobloc contient plus de fer dans sa carcasse que d'idées dans son crâne de roche, sa lave d'antan ayant durci en un blindage grinçant.", // N°522
    "sideralithe": "Les naturalistes ont calculé qu'un Sidéralithe affole les boussoles à cent pas, son titan de fer et de roche déviant même les étoiles filantes égarées.", // N°523
    "nouibrume": "Chez les Nouïbrume, on raconte que chaque ruban de pâte flotte dans sa propre brume mentale, si bien qu'un oisillon perdu s'y assoupit avant d'y comprendre goutte.", // N°524
    "oniromouille": "Un vieux dresseur jure qu'un Oniromouille file plus vite que le songe qu'il t'expédie, filant sur l'eau pour éclabousser tes rêves avant que tu te saches trempé.", // N°525
    "spectrelame": "Chez les Spectrelame, on jure que leurs lames spectrales taillent les cauchemars en rondelles avant d'y saupoudrer une pincée de spores empoisonnées.", // N°526
    "necromante": "Il paraît qu'un Nécromante récolte plus d'âmes égarées que de vraies proies, et pourtant ses spores et ses cauchemars moisissent gaiement côte à côte.", // N°527
    "carapoing": "Carapoing serait le seul Daemon à cogner d'un poing minéral tout en grommelant des injures d'insecte : sa cuirasse de têtard n'a rien perdu de son sale caractère.", // N°528
    "roctobrute": "Un vieux dresseur jure qu'un Roctobrute peut aplatir un rocher d'un uppercut de têtard bodybuildé, sans jamais fêler sa carapace d'insecte cuirassé.", // N°529
    "voltriss": "Les naturalistes ont calculé qu'un Voltriss crépite à chaque battement d'ailerons, comme si un dragonnet avait avalé un orage entier par pure gourmandise.", // N°530
    "draconvolt": "Draconvolt détient le record de la charge la plus rapide jamais mesurée : un éclair à écailles qui frappe bien avant que son rugissement de dragon ne t'atteigne.", // N°531
    "eolectre": "Personne ne sait pourquoi Éolectre refuse de se poser par temps calme, sauf les vieux marins : sans vent ni orage, ce croisement de chauve-souris et de dragonnet s'ennuie ferme.", // N°532
    "stratevolt": "Méfie-toi : un Stratévolt adore piquer depuis les nuages pour te roussir les cheveux d'une décharge, puis remonter en ricanant vers la stratosphère.", // N°533
    "abyssonde": "Chez les Abyssonde, on raconte que ce serpent des grands fonds a gobé tant d'anguilles électriques qu'il éclaire désormais les abysses comme une enseigne de bar.", // N°534
    "marefoudre": "Il paraît qu'un Maréfoudre encaisse plus de vagues et de courts-circuits qu'un phare en pleine tempête, sans jamais éteindre l'étincelle qui grésille sous ses écailles.", // N°535
    "oniragon": "Oniragon serait le seul Daemon à endormir sa proie d'un regard hypnotique puis à la border d'un souffle draconique, histoire de faire les choses proprement.", // N°536
    "songedrak": "Un vieux dresseur jure qu'un Songedrak peut absorber tes rêves toute une nuit sans broncher, ce dragon placide encaissant les cauchemars comme un oreiller à écailles.", // N°537
    "sporcrypte": "Les naturalistes ont calculé qu'un Sporcrypte sème assez de spores nécrosantes derrière lui pour changer une crypte entière en champ de champignons hantés.", // N°538
    "miasmort": "Miasmort détient le record du miasme le plus expéditif : ce spectre-champignon crache un nuage mortel puis s'évapore, fragile comme un vieux chapeau de bolet.", // N°539
    "ombrelin": "Personne ne sait pourquoi Ombrelin refuse de tenir en place, sauf les cuisiniers : cette ombre en forme de nouille glisse partout et lit tes pensées entre deux plis.", // N°540
    "psychombre": "Méfie-toi : un Psychombre adore filer dans ton dos telle une ombre élastique, puis te souffler une pensée gênante à l'oreille juste avant de frapper.", // N°541
    "givrebre": "Chez les Givrèbre, on a remarqué que cette chèvre de pierre gelée broute le givre du sol et rumine des glaçons, semant des empreintes cristallines derrière elle.", // N°542
    "cryolithe": "Il paraît qu'un Cryolithe a plus de patience qu'un glacier : ce béhémoth de roche et de glace met une saison à se retourner, mais rien ne fissure sa carapace polaire.", // N°543
}

/** Anecdote d'une espèce (si fichée par L'Archiviste). */
export function funFactFor(speciesId: string): string | undefined {
    return FUN_FACTS[speciesId]
}
