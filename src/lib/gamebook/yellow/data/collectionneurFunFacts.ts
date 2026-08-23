// FUN FACTS de L'ARCHIVISTE — UNE anecdote par espèce (débitée à la rencontre + affichée sur la fiche du
//   dex quand elle est débloquée). Ton : collectionneur passionné, précis, amusant mais bref (1 phrase).
//   Source centralisée (évite d'éditer les littéraux SpeciesData). 206 espèces de base + 38 fusions fichées. FR.
//   Repli : si une espèce n'a pas d'entrée ici, archivisteFunFact génère une phrase générique.

export const FUN_FACTS: Record<string, string> = {
    "feuillichot": "Ce petit pousse-lapin verdit à vue d'œil quand son dresseur transpire, si bien qu'on mesure l'effort d'une séance à la nuance de son duvet.", // N°001
    "broutame": "Ce faon nommé Broubouc broute littéralement la lumière de l'aube, et ses bois bourgeonnent d'un cran chaque matin où le soleil se lève clair.", // N°002
    "sylvapuce": "Ce cerf-forêt centenaire porte tant de vie que là où il s'assoupit une nuit, les collectionneurs reviennent trouver une clairière en fleurs.", // N°003
    "gouttiny": "Simple goutte espiègle, ce Gouttiny rebondit sur tout ce qu'il croise et met une joie farceuse à éclabousser quiconque se penche sur lui.", // N°004
    "ondulo": "Cet amphibien crée ses propres vagues pour les surfer, esquivant les coups avec la nonchalance élégante d'un rider qui n'a jamais quitté l'eau.", // N°005
    "razmaree": "Gardien des marées, Razmarée fait reculer la mer de plusieurs mètres d'une seule inspiration, ce que les vieux pêcheurs prennent pour un présage.", // N°006
    "braisille": "Ce renardeau de braise crépite d'impatience et, chose triste pour un collectionneur négligent, ses flammes s'éteignent si on l'oublie trop longtemps.", // N°007
    "flamkure": "Jeune fauve de flammes, Flamkure voit sa fourrure rougir et brûler plus fort à mesure qu'il s'échauffe, comme un athlète qui monte en régime.", // N°008
    "pyrokoss": "Ce lion de lave laisse une empreinte de magma à chaque foulée, et l'on retrace parfois son passage à des kilomètres grâce aux traces figées.", // N°009
    "plumiot": "Cet oisillon tout ébouriffé tombe bien plus qu'il ne vole, mais son courage vaut pour deux et il se relève toujours d'un battement d'ailes têtu.", // N°010
    "faukon": "Vif comme l'éclair, ce faucon fond sur sa proie en piqué si rapide que l'œil ne voit qu'un trait, et les traqueurs jurent l'entendre siffler.", // N°011
    "aquilothan": "Empereur des cieux, Aquilothan déploie une envergure telle que son ombre glisse au sol comme celle d'un nuage, semant l'effroi chez les petits Daemons.", // N°012
    "cailloutchi": "Ce chevreau de pierre aux grands yeux ronds encaisse les coups sans broncher, quitte à mettre un temps fou avant de daigner riposter.", // N°013
    "roctaur": "Bélier de roche, Roctaur charge tête baissée en faisant trembler le sol, et les villages de montagne confondent parfois son galop avec un séisme.", // N°014
    "rochison": "Ce bison de roche reste si immobile qu'on l'a longtemps rangé parmi les menhirs, jusqu'au jour où un menhir a chargé un promeneur imprudent.", // N°015
    "couperin": "Ce renard méditatif garde toujours les poings bandés et s'entraîne sur le premier obstacle venu, du tronc d'arbre au rocher qui dépasse.", // N°016
    "frappard": "Combattant d'une discipline de fer, Frappard enchaîne ses séries de coups avec la régularité d'un athlète qui ne raterait jamais un entraînement.", // N°017
    "maitrezenc": "Sensei au calme olympien, Maîtrezenc peut fendre un bloc de pierre d'un seul crochet, mais préfère mille fois enseigner la patience à ses cadets.", // N°018
    "electroatiss": "Petit coati farceur au bandeau de bandit, Électroatiss laisse sa queue crépiter d'étincelles et adore électriser les poignées de porte.", // N°019
    "couranti": "Ce maraudeur électrique s'enveloppe d'une cape conductrice qui capte l'orage, si bien qu'on le repère de très loin les soirs de tempête.", // N°020
    "zappeureal": "Souverain de la foudre, Zappeuréal porte une couronne d'arcs électriques permanente, et sa seule présence fait grésiller l'air tout autour de lui.", // N°021
    "auroruff": "Adorable chiot des neiges, Auroruff mâchouille un os de givre qu'il ne lâche jamais, aussi fidèle à son dresseur qu'il est douillettement frileux.", // N°022
    "glaceer": "Élégant lévrier de gel, Glaceer trace une fine traînée de givre à chaque foulée, dessinant sur la neige des arabesques que les traqueurs adorent suivre.", // N°023
    "auroraur": "Majestueux molosse polaire, Auroraur arbore une cape ondoyante d'aurore boréale qui, dit-on, ne brille jamais deux nuits de la même couleur.", // N°024
    "ruffiant": "Fourmi-soldat des plus dégourdies, Ruffiant garde ses mandibules toujours prêtes et ne recule devant aucun intrus, fût-il dix fois plus grand qu'elle.", // N°025
    "formiguer": "Fourmi-guerrière à la carapace chitineuse renforcée, Formiguer encaisse les assauts en première ligne pour protéger les ouvrières de sa colonie.", // N°026
    "regnantaur": "J'ai vu cette reine-fourmi couronnée régenter mille ouvrières sans un bruit : tout l'ordre de la colonie transite par son seul esprit.", // N°027
    "lavapetit": "Ce petit caillou reste tiède au creux de la main, car il couve en son centre une braise discrète : la pièce préférée des collectionneurs frileux.", // N°028
    "fissuralave": "Chaque craquelure de ce golem laisse perler la lave ; je le manipule avec des gants épais, ses fissures brûlantes marquant le cuir en un clin d'œil.", // N°029
    "magmator": "Titan dont le cœur de magma ne s'est jamais refroidi depuis sa formation ; on dit qu'un seul de ses pas scelle une empreinte de roche fondue.", // N°030
    "nouillon": "Ce petit tas de nouilles vivantes dresse ses yeux au bout de fines tentacules pour scruter les alentours : l'un des plus attendrissants spécimens de mon dex.", // N°031
    "vermisaint": "Cet enchevêtrement de pâtes baigne dans une aura mystique si dense que je garde toujours une distance respectueuse en l'observant méditer.", // N°032
    "divinpate": "Divinité-spaghetti ailée et couronnée, elle bénit ses fidèles d'un simple contact de sa nouille sacrée ; posséder son effigie relève du miracle.", // N°033
    "piouflot": "Ce poussin duveteux patauge bien plus qu'il ne vole et trempe ses plumes à la moindre flaque : le plus maladroit petit trésor de ma volière aquatique.", // N°034
    "herondee": "Ce héron gracile ruisselle en permanence d'eau de pluie, comme s'il portait l'averse avec lui ; le voir en vol, c'est admirer danser une fontaine ailée.", // N°035
    "oragron": "Les ailes de ce héron sont des nuages d'orage vivants, zébrés d'éclairs qui grondent quand il fond du ciel ; je ne l'approche jamais sans paratonnerre.", // N°036
    "broussours": "Cet ourson a la fourrure si emmêlée de lierre qu'il se fond dans les fourrés ; il faut l'œil aiguisé d'un collectionneur pour le débusquer dans les broussailles.", // N°037
    "sylvours": "Cet ours dressé porte une vraie armure de feuilles qu'il renouvelle à chaque saison ; les anciennes, une fois tombées, font des marque-pages très prisés.", // N°038
    "druidours": "Ce colosse druidique abrite un cœur de sève luminescent qui éclaire les sous-bois la nuit ; les anciens jurent qu'il veille sur les forêts endormies.", // N°039
    "pampousse": "Ce chaton-pousse ne tient jamais en place et bondit de branche en branche ; on le repère aux petites feuilles qu'il sème dans son sillage joueur.", // N°040
    "feliane": "Ce félin sylvestre à la crinière de feuilles file si vite entre les troncs qu'on croit d'abord à une rafale de vent : un vrai régal pour l'œil averti.", // N°041
    "cerfeuillu": "Ce félin-cerf majestueux se pare de fruits mûrs et de fleurs qui repoussent au fil des saisons ; croiser un Silviliane fleuri est un privilège rare.", // N°042
    "loutrille": "Cette petite loutre espiègle ne tient pas en place une seconde et transforme chaque flaque en toboggan : le farceur adoré de tout mon vivier.", // N°043
    "ondaloutre": "Cette loutre élégante chevauche ses propres vagues avec l'aisance d'une surfeuse née ; je pourrais l'admirer glisser des heures durant sur l'onde.", // N°044
    "naiadrak": "Ce dragon d'eau couronné de corail veille sur les courants marins ; les pêcheurs jurent que ses passages ramènent les bancs de poissons égarés.", // N°045
    "fennaise": "Ce renardeau de feu aux immenses oreilles capte le moindre crépitement de flamme ; farceur invétéré, il adore surprendre les collectionneurs distraits.", // N°046
    "pyrenard": "La queue de ce renard de braise laisse dans la nuit une traînée d'étincelles qu'on suit comme une comète ; un spectacle que je ne me lasse pas de guetter.", // N°047
    "loupyre": "Ce loup de flammes porte une crinière incandescente qui rougeoie plus fort quand la meute chasse ; sa seule présence réchauffe une clairière entière.", // N°048
    "forgeotin": "Ce jeune orang-outan trimballe déjà partout son petit marteau et cogne tout ce qui résonne : apprenti forgeron, il apprend le métier en faisant du bruit.", // N°049
    "marteloutan": "Ceint de son tablier de cuir, ce singe forgeron abat des coups si secs qu'il sert lui-même d'enclume ; ses pièces martelées valent de l'or chez les experts.", // N°050
    "enclumind": "Sous son armure runique, ce maître-forgeron plie l'acier autant que l'esprit de ses rivaux ; on murmure que son marteau grave des pensées dans le métal.", // N°051
    "trolystrik": "Ce petit troll-lutin nerveux ne cesse de gigoter, et sa crête grésille d'électricité au moindre agacement : le farceur le plus survolté de ma ménagerie.", // N°052
    "brutetrik": "Ce troll bagarreur frotte ses poings avant l'assaut jusqu'à en tirer des arcs bleutés ; les dresseurs prudents gardent leurs bottes de caoutchouc à portée.", // N°053
    "hebulmin": "Sa crinière hérissée d'éclairs signale ce colosse à des lieues ; un seul de ses coups, dit-on, fait vibrer les gradins de l'arène tout entière.", // N°054
    "draclet": "Ce dragonnet blanc tout guilleret bat des ailes bien trop petites pour voler, alors il dévale les cimes en sautillant, pépiant de joie.", // N°055
    "wyverion": "Cette wyverne fonce en piqué depuis les nuages, ses ailes coriaces sifflant comme des lames ; nul rongeur des cimes ne lui échappe deux fois.", // N°056
    "draconarque": "Immense dragon blanc des sommets, son ombre à elle seule plonge une vallée entière dans la pénombre ; les bergers y lisent un présage d'orage.", // N°057
    "cornaissant": "À peine sorti de l'œuf, ce corbillat fourrage déjà dans les fioles des apothicaires, fasciné par tout flacon qui brille ou qui bouillonne.", // N°058
    "corvenin": "Ce corbeau alchimiste ne se sépare jamais de sa fiole de venin, qu'il serre dans ses serres et dose goutte à goutte sur ses proies étourdies.", // N°059
    "necrocorbe": "Drapé d'ossements cliquetants, ce corbeau-chamane psalmodie des incantations si corrosives qu'on les dit capables de ronger l'âme autant que la chair.", // N°060
    "sporbeo": "Ce petit champignon toujours souriant balance une flammèche bleutée qui ne brûle pas mais éclaire, dit-on, le chemin des esprits égarés.", // N°061
    "lampignon": "Cet esprit-champignon ailé promène sa lanterne d'âmes dans les sous-bois nocturnes ; suivre sa lueur mène rarement là où l'on croyait aller.", // N°062
    "mycedruide": "Sage-champignon millénaire, il couronne son chef d'un mycélium luminescent et relie, dit la légende, toute la forêt par un même fil souterrain.", // N°063
    "tamanpousse": "Ce bébé tamanoir feuillu plonge son museau dans les fourmilières non pour les fourmis mais pour leur sève sucrée, qu'il aspire d'une longue langue.", // N°064
    "fourmilierre": "Tout paré de lianes vivaces, ce tamanoir déploie une langue collante qui happe les nuisibles du potager ; les maraîchers l'adorent en secret.", // N°065
    "gloutanoir": "Ce tamanoir-titan à crinière de fougères vide lentement ses proies de leur vigueur, puis somnole des jours entiers pour digérer son festin vert.", // N°066
    "pantheon": "Ce panthéreau au pelage d'encre absorbe l'énergie de son environnement comme une éponge ; deux spécimens élevés ailleurs ne se ressemblent jamais.", // N°067
    "florapanthe": "Cette panthère sylvestre file entre les troncs en s'agrippant de lianes vives, bondissant d'arbre en arbre comme le lierre grimpe vers la lumière.", // N°068
    "panthegel": "Son pelage cristallin tinte à chaque foulée et son souffle givre l'air ; les traqueurs suivent la buée gelée qu'elle laisse flotter derrière elle.", // N°069
    "pyropanthe": "Couronnée de flammes, cette panthère de braise court si vite qu'elle devance son propre feu, laissant dans son sillage une pluie d'étincelles.", // N°070
    "ombrapanthe": "Cette panthère des ténèbres se fond dans la moindre flaque d'ombre et surgit avant qu'on l'aperçoive ; on la sent bien plus qu'on ne la voit.", // N°071
    "aquapanthe": "Panthère des torrents, sa crinière ruisselle sans cesse d'une eau vive et fraîche ; elle remonte les cascades d'un bond, à contre-courant.", // N°072
    "voltapanthe": "Véritable éclair sur pattes, cette panthère de foudre est la plus rapide de son antre ; on n'en perçoit qu'un grésillement et une traînée fugace.", // N°073
    "rembodo": "Ce dodo fossilisé aux grandes pattes détale à une vitesse folle, vestige d'un âge oublié qui semble courir à rebours des aiguilles du temps.", // N°074
    "retroraptor": "Ce rapace fossile arbore un incongru bec de dodo sur un corps de raptor ; les paléo-collectionneurs se disputent ses moindres plumes pétrifiées.", // N°075
    "chronorex": "Le plus ancien des fossiles connus : un T-Rex titanesque coiffé d'un bec de dodo, dont la mâchoire broie la pierre comme d'autres croquent une noix.", // N°076
    "mottoche": "Cette humble boule de terre roule si mollement qu'on la prend pour un caillou ; les vieux dresseurs murmurent pourtant de ne jamais la sous-estimer.", // N°077
    "dumotte": "Deux mottes de terre soudées bout à bout qui roulent de conserve ; les enfants du village aiment les faire dévaler les collines juste après la pluie.", // N°078
    "quadroc": "Quadroc n'est qu'une amitié de quatre galets roulant ensemble : sépare-les et ils reviennent toujours se recoller flanc contre flanc.", // N°079
    "octoroc": "Huit cailloux soudés forment Octoroc, et les collectionneurs jurent que son grondement sourd est celui de pierres qui se serrent les coudes.", // N°080
    "hexaroc": "Avec ses seize galets quasi indestructibles, Hexaroc sert de borne aux bergers de montagne, qui le confondent parfois avec un vieux muret.", // N°081
    "diamantine": "Diamantine aligne trente-deux cristaux d'un bleu si pur qu'on la piste au clair de lune, quand ses facettes renvoient les étoiles une à une.", // N°082
    "amadiam": "Amas de soixante-quatre diamants, Amadiam crisse en avançant, et les prospecteurs suivent ce chant de cristaux entrechoqués jusque dans les mines.", // N°083
    "golemini": "Compact golem taillé dans ses soixante-quatre diamants, Golémini se love en boule pour dormir et passe alors pour un vulgaire gros galet scintillant.", // N°084
    "megalithe": "Titan de diamant réputé infranchissable, Mégalithe dort debout comme un menhir, et bien des voyageurs ont pique-niqué contre lui sans le réveiller.", // N°085
    "limaroche": "Limaroche rampe si lentement qu'on la croit inerte, mais ses antennes minérales captent les pensées des passants bien avant qu'ils ne la voient.", // N°086
    "escaroche": "Escargyle porte une coquille de pierre où il se mure au moindre orage, imperturbable, laissant la grêle rebondir sur son toit minéral.", // N°087
    "torturoche": "Tortue ancestrale à carapace de roche, Tortoracle passe pour un oracle des cavernes : on vient murmurer ses questions contre son antique dôme.", // N°088
    "marmoterre": "Marmoterre creuse ses terriers à même la pierre des cimes gelées, et son sifflement d'alerte résonne d'un versant à l'autre comme un carillon.", // N°089
    "iorours": "Fière et indomptable, Iorours cuirasse sa fourrure polaire de plaques de roc et de glace, et nul chasseur n'ose croiser son regard deux fois.", // N°090
    "yetiroche": "Yéti légendaire des plus hauts sommets, Yétiroche frappe du poing autant qu'il souffle le givre, et ses empreintes nourrissent mille rumeurs.", // N°091
    "tetardoc": "Minuscule têtard coiffé d'une carapace de galet, Têtardoc s'entraîne déjà à cracher ses billes d'eau pile sur la feuille qu'il a choisie.", // N°092
    "grenarc": "Grenarc bande un arc de pierre né de ses propres membres et décoche ses traits avec une adresse dont s'enorgueillissent les archers de la mare.", // N°093
    "crapotaure": "Crapaud colossal armé d'un arc démesuré, Crapôtaure loge ses flèches de roche en pleine cible et reste, dit-on, le plus véloce de tous les Roche.", // N°094
    "revemante": "Mante religieuse revenante, Revemante surgit du néant sans un bruit, et l'on dit que la croiser en rêve annonce une bien longue insomnie.", // N°095
    "necarabee": "Nécarabée arbore une carapace translucide où flottent des lueurs pâles, et les entomologistes du crépuscule s'arrachent ses mues fantomatiques.", // N°096
    "necrolopendre": "Scolopendre spectrale aux anneaux sans fin, Nécrolopendre file, insaisissable, mais un seul coup au but suffit à briser son long corps de brume.", // N°097
    "colibraise": "Colibraise bat des ailes si vite qu'elles s'embrasent, et son vol immobile devant une fleur laisse dans l'air une fine traînée d'étincelles.", // N°098
    "arardent": "Ara au plumage incandescent, Arardent lance des cris qui font crépiter l'air chaud, et les orpailleurs y devinent l'approche des zones volcaniques.", // N°099
    "toucanyon": "Toucanyon niche au bord des cratères et se sert de son énorme bec rougeoyant comme d'une buse, crachant ses flammes sur des proies lointaines.", // N°100
    "blaziper": "Blaziper n'est qu'un serpenteau aux écailles à peine tièdes, mais son regard ardent suffit déjà à figer sur place le plus vif des rongeurs.", // N°101
    "flamaspic": "Quand Flamaspic se concentre, ses anneaux incandescents se mettent à fumer, et les guérisseurs récoltent cette fumée parfumée pour leurs onguents.", // N°102
    "vipember": "Vipère-braise que l'on dit millénaire, Vipember plie la volonté d'autrui par la seule chaleur de son esprit, et couve les cendres comme un trésor.", // N°103
    "braisecaille": "Sous sa carapace, Braisécaille cache une mare intérieure où couvent des braises, si bien qu'elle fume doucement chaque fois qu'elle plonge.", // N°104
    "calderont": "sa carapace abrite un volcan de poche où la lave côtoie une mare secrète, et le moindre choc le fait cracher un long panache de vapeur brûlante.", // N°105
    "brasicow": "ce petit veau râblé rumine sans cesse des braises de charbon ardent, et fonce tête baissée dès qu'on ose s'approcher de son pré fumant.", // N°106
    "tauricendre": "ses cornes en fusion rougeoient dans la nuit, et sa charge titanesque fait littéralement trembler le sol sous les sabots des imprudents.", // N°107
    "pyrozly": "ce grizzly au pelage éternellement fumant choisit d'hiberner tout au fond des cratères encore tièdes, roulé en boule sur la cendre chaude.", // N°108
    "belunode": "ce bébé béluga est constellé de petits nodes électriques qui se mettent à crépiter joyeusement dès qu'on ose le caresser sous le menton.", // N°109
    "sonarque": "il émet dans les abysses des clics de sonar électrifiés dont la décharge étourdit les proies bien avant qu'elles ne l'aperçoivent.", // N°110
    "leviathonn": "ce colosse tapi au fond des fosses lâche des décharges si puissantes que l'océan tout entier en tremble sur des kilomètres à la ronde.", // N°111
    "jerbiwat": "cette minuscule gerbille électrostatique met un temps fou à mûrir, mais patience: elle cache un canon psychique redoutable une fois adulte.", // N°112
    "namicha": "ce chaton tissé d'ombre et de statique se faufile entre deux éclairs, si furtif qu'on ne devine sa présence qu'au léger crépitement de l'air.", // N°113
    "namizeus": "félin spectral et foudroyant, il jaillit des ténèbres pour frapper sa cible bien avant que le grondement du tonnerre n'atteigne les oreilles.", // N°114
    "boltah": "ce guépardeau aux pattes déjà crépitantes court, dit-on, plus vite que sa propre ombre, qui peine à suivre ses foulées enflammées.", // N°115
    "heatah": "lancé à pleine course, il abandonne derrière lui une longue traînée de braises et d'étincelles qui trace sa route dans la poussière.", // N°116
    "thundah": "réputé le Daemon le plus rapide de tout le Nexus, ce n'est qu'un pur éclair de feu galopant sur quatre pattes, presque invisible à l'œil nu.", // N°117
    "bouh": "ce petit spectre boudeur se barricade au creux des ombres et se révèle, à qui le sous-estime, bien plus coriace qu'il n'en a l'air.", // N°118
    "bouhbou": "ce spectre grognon a troqué la bouderie contre les poings: il cogne, encaisse, puis surgit devant l'adversaire d'un coup furtif inattendu.", // N°119
    "brook": "gardien squelettique des vieilles tombes, il encaisse les assauts en silence tout en affaiblissant sournoisement quiconque s'approche trop.", // N°120
    "brookhante": "véritable colosse d'outre-tombe, sa carcasse encaisse l'inencaissable et draine la vie de ses assaillants pour tenir debout des siècles durant.", // N°121
    "hibouh": "hibou spectral aux grands yeux luminescents, il hulule longuement dans le noir avant de fondre sans le moindre bruit sur une proie tétanisée.", // N°122
    "chouhante": "son regard perçant sonde les esprits: perché entre deux mondes, il est devenu aussi psychique qu'il est spectral, énigme des collectionneurs.", // N°123
    "archibouh": "grand-duc surgi d'outre-tombe, son cri psychique foudroie l'esprit de sa proie avant même que l'ombre glacée n'achève tranquillement le travail.", // N°124
    "goshendofy": "ce dragon primordial sommeille, parfaitement camouflé, dans l'herbe la plus humble et la plus basse, là où nul chasseur ne songe à le chercher.", // N°125
    "gekroc": "golem-taupe fossile serti d'une pierre d'évolution crépitante, il creuse des tunnels fulgurants et s'adapte, dit-on, à absolument toutes les situations.", // N°126
    "carlinou": "ce bébé carlin-dragon ronfle paisiblement des petites volutes de fumée, tandis qu'une flammèche espiègle couve déjà au tout bout de sa queue.", // N°127
    "carlembre": "joufflu mais étonnamment vif, ses petites ailes le portent déjà dans les airs et la flamme au bout de sa queue ne s'éteint désormais plus jamais.", // N°128
    "dracarlin": "carlin-dragon altier au regard d'acier, il fond du ciel en piqué embrasé et frappe sa cible avant même qu'elle ait eu le temps de cligner des yeux.", // N°129
    "glacirex": "jeune tyrannosaure des banquises, sa gueule givrante referme une morsure bien plus glaçante et vigoureuse qu'on ne l'imaginerait d'un tel gabarit.", // N°130
    "cryotyran": "Perché sur les banquises, le Cryotyran hérisse des cristaux nés de son propre souffle ; son rugissement gèle l'air et fait trembler la roche alentour.", // N°131
    "orcaline": "Cette maligne orque polaire glisse sous la banquise puis jaillit d'un souffle glacé : on jure qu'elle traque exprès les dragons pour les figer.", // N°132
    "sylvebarbe": "Arbre-titan millénaire à l'écorce de pierre, le Sylvebarbe passe pour un rocher jusqu'à ce que ses racines fendent le sol sous vos pas.", // N°133
    "tonytony": "Ce Daemon-œuf au cœur démesuré préfère bercer et soigner que frapper ; il encaisse les pires sortilèges mais tremble au moindre horion bien placé.", // N°134
    "gekraise": "Ce golem fossile ressemble à s'y méprendre à Gékroc, mais sa pierre couve un cœur de magma : ses galeries brûlantes fument des jours durant.", // N°135
    "ukognos": "Lutin-démon nimbé de flammes violettes, l'Ukognos n'est qu'un écho féerique et maudit ; il ne paraît qu'à ceux assez fous pour recommencer l'aventure.", // N°136
    "merorem": "L'hydre-fléau qu'est le Merorem ne soigne jamais : chaque étreinte de ses tentacules suintantes inocule une plaie neuve dont il se repaît.", // N°137
    "morrow": "Venue d'un monde inconnu au sourire troublant, la Morrow endort d'un baiser givré avant de foudroyer ; on l'échange, dit-on, jamais on ne la capture.", // N°138
    "gavillus": "Ce jeune crocodile au regard déjà trop malin porte des plaques de pierre sur le dos et de minuscules moignons aux épaules, promesse d'ailes à venir.", // N°139
    "crocodaillus": "Mi-crocodile mi-caméléon, le Crocodaillus louche déjà de chaque œil tandis que des ailes à demi formées percent sa carapace de pierre.", // N°140
    "alirocaillus": "Caméléon de pierre aux larges ailes, l'Alirocaillus fond du ciel avant qu'on l'ait vu bouger ; sa ruse, murmure-t-on, n'a pas d'égale.", // N°141
    "goatiny": "Chevreau des hautes cimes, le Goatiny grésille de statique au moindre orage et ses cornes naissantes crépitent comme deux étincelles impatientes.", // N°142
    "mouflorage": "Froid et calculateur, le mouflon d'orage aux cornes-bobines paralyse sa proie et lui dérobe sa vitesse avant de la foudroyer, ancré au roc.", // N°143
    "magnetor": "La roche du Magnetor a mué en un alliage que rien ne perce ; ce colosse de métal en fusion avance comme une forteresse, lent mais inarrêtable.", // N°144
    "elefer": "Lourdaud et placide, l'Éléfer est un éléphanteau à la peau de fer qui encaisse coups et bourrasques sans même daigner ouvrir un œil.", // N°145
    "barrisfer": "L'éléphant cuirassé qu'est le Barrisfer pousse un barrissement qui résonne comme un gong de guerre ; ses flancs d'acier ignorent la brèche.", // N°146
    "colosfer": "Mammouth-forteresse taillé dans le métal massif, le Colosfer ne se laisse ni percer ni déplacer : autant vouloir pousser une montagne du doigt.", // N°147
    "cornaive": "Naïve mais déjà scintillante, cette pouliche-licorne sent sa corne crépiter d'une magie lunaire qu'elle maîtrise à peine, trésor pour l'œil averti.", // N°148
    "astracorne": "Licorne à la crinière d'étoiles, l'Astracorne galope sur les rayons de lune eux-mêmes et ne laisse derrière elle qu'une traînée d'argent.", // N°149
    "lunarque": "Souveraine lunaire au port altier, la Lunarque abat d'un simple coup de corne un cataclysme d'argent ; peu de dex peuvent abriter pareille lumière.", // N°150
    "coccipoing": "Ne vous fiez pas à sa taille : cette coccinelle aux gantelets rouges est une teigne qui cogne vite et fort, prête à défier bien plus gros qu'elle.", // N°151
    "coccombat": "Le Coccombat a largué ses élytres pour gagner en vitesse ; guerrière déchaînée, elle enchaîne les frappes éclair plus vite que l'œil ne suit.", // N°152
    "coccimperatrice": "Souveraine des pois rouges et maîtresse à mains nues, la Coccimpératrice brise les gardes d'une frappe foudroyante, avec un panache royal.", // N°153
    "aquilord": "Seigneur souverain des tempêtes, l'Aquilord fend les nuages d'un cri ; à ses ailes obéissent la glace mordante comme les flammes rugissantes.", // N°154
    "mimimoy": "Créature falote au regard perpétuellement inquiet, le Mimimoy paraît insignifiant ; mais parvenir à en dénicher un fait tout le prix du collectionneur.", // N°155
    "gekosmic": "Sosie fossile de Gékroc, le Gékosmic laisse courir des éclairs psychiques sur sa carapace de roche et sa queue cristallisée irradie l'esprit pur.", // N°156
    "hypnoppo": "sous ses paupières lourdes, cet hippo somnolent hypnotise ses proies d'un simple clignement, sans jamais avoir à les toucher — tout se joue dans son regard.", // N°157
    "teleppo": "son troisième œil ne cesse de clignoter tandis qu'il se dématérialise pour resurgir à l'autre bout du réacteur en un seul souffle, télépathe et insaisissable.", // N°158
    "omnhippo": "ce colosse aux yeux multiples perçoit chaque pensée du réacteur et riposte avant même que l'adversaire ait choisi d'attaquer — un mastodonte que rien n'étonne.", // N°159
    "karmaki": "ce moine-plante médite en lotus perpétuel, une liane-fleur enroulée sous lui ; il annule les excès d'autrui et rend, dit-on, exactement le karma qu'on lui inflige.", // N°160
    "otama": "ce petit têtard tout rond au sourire benêt se coiffe d'un origami plié avec soin ; frêle, on murmure pourtant qu'il couve un futur guerrier des eaux.", // N°161
    "gamaruto": "grenouille-ninja au regard perçant, elle façonne un jutsu d'eau au creux de la main et harcèle l'adversaire en esquivant chaque coup avec une ruse déconcertante.", // N°162
    "uzumaro": "crapaud-sage massif aux bras croisés et marqués de motifs de guerre, il encaisse derrière une garde de fer avant de balayer poings et raz-de-marée confondus.", // N°163
    "wistree": "esprit sylvestre couronné de fleurs et de baies, il flotte en silence puis siphonne sournoisement la puissance de quiconque ose se renforcer devant lui.", // N°164
    "guizer": "ne te fie pas à sa bouille : ce petit béluga blanc d'apparence adorable est en réalité colérique et rancunier, gardant en mémoire la moindre offense.", // N°165
    "dalugazer": "ce béluga blanc a grandi sans rien perdre de son tempérament : toujours aussi kawaï en surface, toujours aussi rancunier dès qu'on croise sa route glacée.", // N°166
    "mobyd": "orque albinos ailée inspirée du légendaire Moby Dick, elle dégage une aura oppressante et mythique — et son cœur reste, dit-on, aussi rancunier qu'au premier jour.", // N°167
    "shady": "petit félin spectral translucide, il porte une flammèche fantomatique au bout de la queue et file déjà comme une ombre — une création signée du dresseur Franss.", // N°168
    "shade": "félin-fantôme à l'âge ingrat, plus grand et bien plus vif : ses griffes phosphorescentes crépitent d'une énergie spectrale à chaque bond dans la pénombre.", // N°169
    "shadow": "grand félin-fantôme élancé et nimbé d'ombre, ce prédateur frappe à la vitesse de l'éclair puis s'évanouit avant même qu'on ait aperçu sa silhouette.", // N°170
    "caninombre": "louveteau au pelage si sombre qu'il semble avaler la lumière, il se tapit dans les recoins obscurs et ne frappe que par surprise — forgé par ACE pour traquer une ombre.", // N°171
    "lycanfer": "dressé sur ses pattes arrière, crocs allongés, ce lycanthrope exhale une aura rougeoyante : des flammes froides remontées tout droit des abysses les plus noirs.", // N°172
    "tenebrir": "loup démoniaque colossal, cornu et zébré de lave, dont le seul hurlement suffit, dit la légende, à éteindre toute lumière alentour et à glacer le sang des braves.", // N°173
    "sepulcru": "petit urubu déplumé au duvet gris-cendre et à la tête chauve, il fixe le monde de deux yeux violets trop grands pour son crâne et traîne déjà une volute d'ombre.", // N°174
    "macabour": "vautour d'envergure au plumage d'encre, il arbore un premier fragment d'os blanchi sur le poitrail et plane bas, patient : la mort qui prend tout son temps.", // N°175
    "condombre": "condor colossal d'obsidienne dont le visage disparaît derrière un masque de crânes soudés — les trophées de ses proies — d'où percent deux braises pourpres.", // N°176
    "bidouzen": "bipède mauve-gris à mi-chemin du chaton et du moine kung-fu, ses moustaches frémissent d'une énergie psychique encore naissante — une malicieuse création d'Embi.", // N°177
    "medisciple": "le disciple s'est musclé : ce chat-moine tient une posture de combat parfaite, l'aura psychique désormais éveillée autour de ses poings à force de méditation.", // N°178
    "karatame": "chat stylé et musclé en pleine lévitation, ce maître du kung-fu psychique frappe l'esprit autant que le corps — l'aboutissement d'une création signée Embi.", // N°179
    "geckebre": "golem fossile dont la pierre a viré à l'obsidienne : un cœur d'ombre bat sous sa carapace impénétrable, et rien, absolument rien, ne semble pouvoir l'ébranler.", // N°180
    "geaucke": "golem fossile dont la pierre s'est muée en geyser : des jets d'eau propulsent sa carcasse rocheuse à une vitesse stupéfiante, quitte à encaisser fort mal les coups.", // N°181
    "batchu": "minuscule chauve-souris aux ailes crépitantes de statique, frêle et nerveuse, elle file en zigzag et te harcèle de décharges bien avant que tu l'aies repérée.", // N°182
    "supabatchu": "Sa silhouette supersonique déchire l'air en gerbes d'étincelles, et on ne la voit jamais frapper : seul reste le grésillement qu'elle laisse derrière elle.", // N°183
    "phoechaudi": "Ce poussin de phénix mauve n'est encore qu'une braise enveloppée d'un linceul spectral, mais son air condescendant trahit déjà une âme de flamme lugubre.", // N°184
    "phoechaudii": "Toujours drapé de flammes fantômes, ce phénix mauve toise le monde de haut : sa suffisance grandit à mesure que son feu spectral prend de l'ampleur.", // N°185
    "phoechaudiii": "Phénix d'un noir mauve auréolé de flammes fantomatiques, il incarne le deuil fait oiseau : là où il se pose, l'air se refroidit et les ombres s'inclinent.", // N°186
    "obscurene": "Tapie dans l'eau noire des grands fonds, cette murène ne trahit sa présence que par l'éclat luisant d'un œil froid, patient, terriblement implacable.", // N°187
    "abyssombre": "Murène des abysses au corps d'encre, elle rôde là où la lumière renonce, attendant sans hâte que sa proie s'égare dans le noir pour l'engloutir.", // N°188
    "leviabysse": "Léviathan des abysses dit né pour traquer un phénix maudit, on murmure qu'il noie les flammes elles-mêmes et engloutit les âmes au fond des ténèbres liquides.", // N°189
    "crocavern": "Ce crocodile des sables sommeille dans les bancs de terre depuis des âges oubliés ; lent mais inexorable, il happe ses proies sous le sol pour s'en repaître.", // N°190
    "rosdrakis": "Petit dragon rose lové sur lui-même, ses écailles féeriques scintillent d'un vieux songe : on dit qu'il dort depuis des ères en attendant son heure.", // N°191
    "dracosidhe": "Ce dragon-fée des premiers âges déploie une crête magenta et des ailes de flammes féeriques dont l'éclat, dit-on, fend le ciel comme aux origines du monde.", // N°192
    "archeoptix": "Oiseau-dinosaure aux plumes bleues et aux griffes rouges, échappé de l'aube du monde, il file par des couloirs de vent que nul autre ne connaît plus.", // N°193
    "pterosidhe": "Seigneur des cieux anciens, son envergure voile le soleil et son vol reste si silencieux que la proie ne perçoit jamais l'ombre fondant sur elle.", // N°194
    "fulguror": "Dinosaure jaune parcouru d'arcs électriques, il foudroie tout ce qui bouge ; mais son corps fossile est si cassant qu'il doit vaincre au premier éclair.", // N°195
    "rocosaure": "Titan cuirassé d'écailles millénaires et hérissé de pointes, il se tient immuable comme une montagne, encaisse tout et rend chaque coup en véritable séisme.", // N°196
    "givroptere": "Ptérosaure spectral aux ailes de givre, blanc comme un blizzard sans fin, il n'excelle en rien mais survit à tout : dernier témoin des âges gelés.", // N°197
    "toxyrm": "Petit saurien trapu à la tête mauve et au ventre crème, boudeur mais déjà venimeux, il s'obstine et tient bon là où de plus grands abandonnent.", // N°198
    "wyvortal": "Wyverne mauve et corail aux ailes membraneuses, elle exhale des vapeurs féeriques empoisonnées et, patiente autant qu'increvable, use l'adversaire goutte à goutte.", // N°199
    "joeyrrant": "Larve-crevette d'un noir d'encre et privée d'yeux, elle s'agrippe à sa mère de toutes ses forces, timide et rancunière, refusant de lâcher la vie.", // N°200
    "wallabisan": "Ce petit wallaby noir a déjà un bras réduit à l'os, arrêté à mi-chemin de la mort ; timide et rancunier, il sursaute au moindre bruit puis vous en veut.", // N°201
    "kangoudead": "Kangourou mort-vivant au pelage noir, privé de mâchoire inférieure et le flanc droit à nu jusqu'à l'os, il traîne sa rancune glacée sans un cri.", // N°202
    "megamonarx": "Colosse de pierre vivante hérissé de cristaux, né de la fusion portée à son absolu, chacun de ses pas fait trembler le Nexus ; on le dit tout simplement immortel.", // N°203
    "galijah": "Créature paisible et joueuse tenue pour une légende, elle porte en elle l'empreinte de tous les Daemons et imite chaque technique, hormis les ténèbres qu'elle fuit.", // N°204
    "osquille": "Squille bariolée aux poings soniques : son coup fait imploser une bulle de cavitation qui claque comme la foudre, ravageuse mais fragile comme du verre.", // N°205
    "ro": "Raie sombre enfouie dans le sable des fonds à la nuit tombée, elle endort, empoisonne et enlise ses proies avant même qu'elles devinent d'où vient l'attaque.", // N°206
    "mottelave": "Mottelave scelle la pierre têtue de Mottoche à la braise de Lavapetit, si bien que sa carapace fissurée sue une lave brûlante à chaque pas.", // N°500
    "nouiflot": "Nouiflot mêle le ruban de pâte de Nouillon à l'âme d'oisillon de Piouflot, ondulant sur l'eau au gré d'un calme presque hypnotique.", // N°501
    "sporemante": "Sporémante greffe le voile fantomatique de Revemante au chapeau de Sporbéo, dispersant des spores empoisonnées qui plongent les proies en songes toxiques.", // N°502
    "ruffardoc": "Ruffardoc coule le têtard chitineux de Têtardoc dans la carapace insectoïde de Ruffiant, incrustée d'éclats de roche qui n'entament pas sa vivacité.", // N°503
    "dractriss": "Dractriss soude le sang draconique de Draclet aux décharges d'Électroatiss, ses ailerons crépitant d'arcs électriques avant même qu'on l'aperçoive.", // N°504
    "voltaile": "Voltaile unit la chauve-souris électrique Batchu au dragonnet volant Draclet, un éclair ailé qui zèbre le premier étage de la Grotte du Nexus.", // N°510
    "abyssvolt": "Abyssvolt entrelace le serpent abyssal d'Obscurène à l'énergie d'Électroatiss, un long ruban des profondeurs grésillant d'électricité statique.", // N°511
    "oniridrak": "Oniridrak fond la transe d'Hypnoppo dans l'écaille de Draclet, un dragon onirique dont le souffle glisse dans les rêves pour y endormir ses proies.", // N°512
    "necrospore": "Nécrospore fond l'ombre d'un molosse spectral dans un champignon vénéneux : ce SPECTRE/POISON exhale des spores nécrosantes nées de deux natures morbides.", // N°514
    "ombrepsy": "Ombrepsy tisse une silhouette d'ombre furtive autour d'un ruban de pâte vivante, et de ce mariage NORMAL/PSY naissent des pouvoirs psychiques troubles.", // N°515
    "rocaptere": "Rocaptère soude les ailes d'un reptile rocheux au cœur d'une braise de lave : ce ptérosaure ROCHE/VOL fend le ciel, carapace fumante et magmatique.", // N°516
    "givrasol": "Givrasol unit la force tellurique d'une bête de sol au souffle d'un geyser de glace : ce béhémoth SOL/GLACE, né de deux créations, piétine le givre.", // N°517
    "fissuraillus": "Fissuraillus épaissit l'alliage de roche et d'aile de sa lignée : ses membranes se déploient et la lave affleure, incandescente, au creux de ses fissures.", // N°518
    "magmaillus": "Magmaillus porte à son sommet l'hybride de roche et de vol : dragon volcanique majestueux, sa carcasse minérale irradie de lave à chaque battement d'ailes.", // N°519
    "scorieve": "Scoriève couve encore la fusion de roche et de lave de la lignée Mottelave : sa carapace ROCHE/FEU se hérisse de scories brûlantes et fissurées.", // N°520
    "basaltor": "Basaltor durcit l'héritage de roche et de feu de Mottelave en un rempart de basalte : ce colosse ROCHE/FEU oppose sa muraille refroidie à toute charge.", // N°521
    "siderobloc": "Sidérobloc voit la lave refroidie de son ascendance roche-et-feu se muer en fer : ce colosse ROCHE/MÉTAL cliquette d'un alliage minéral aimanté et massif.", // N°522
    "sideralithe": "Sidéralithe couronne la lignée née de la pierre et de la lave : titan ultime ROCHE/MÉTAL, sa carcasse magnétisée d'acier et de roc défie le temps.", // N°523
    "nouibrume": "Nouïbrume affine le mariage de la nouille vivante et de l'esprit d'oisillon : ce ruban EAU/PSY dérive dans une brume mentale, serein et insaisissable.", // N°524
    "oniromouille": "Oniromouille pousse à l'extrême l'alliance de la pâte aquatique et de l'âme onirique : ce EAU/PSY frêle tisse des songes liquides au mental déroutant.", // N°525
    "spectrelame": "Spectrelame marie la faux d'une mante fantôme aux spores vénéneuses d'un champignon : ses lames spectrales exhalent un poison qui glace le sang.", // N°526
    "necromante": "Nécromante, sorcier-mante des songes, mêle la nécromancie spectrale à la sève empoisonnée du champignon dont il tire ses funestes sortilèges.", // N°527
    "carapoing": "Carapoing serre dans ses poings de roche l'agilité d'un insecte et la cuirasse minérale d'un têtard : un cogneur né de deux mondes soudés.", // N°528
    "roctobrute": "Roctobrute écrase tout sous sa carapace d'insecte incrustée de roc : le têtard cuirassé et le brigand des nuées ne font plus qu'un colosse.", // N°529
    "voltriss": "Voltriss fait crépiter les écailles du dragonnet au rythme des décharges de son parent électrique : chaque battement d'aile claque comme la foudre.", // N°530
    "draconvolt": "Draconvolt, dragon de foudre pure, canalise le sang draconique et l'énergie électrique de ses aïeux en un orage qui gronde sous ses écailles.", // N°531
    "eolectre": "Éolectre plane sur des ailes de chauve-souris chargées d'orage, mariant l'électricité de la bestiole nocturne au vol vif du dragonnet.", // N°532
    "stratevolt": "Stratévolt fend la stratosphère comme un éclair : la chauve-souris foudroyante et le dragonnet ailé se sont fondus en un seul météore électrique.", // N°533
    "abyssonde": "Abyssonde ondule dans les eaux noires en diffusant l'électricité statique du serpent des abysses : chacune de ses ondes pique autant qu'elle mouille.", // N°534
    "marefoudre": "Maréfoudre soulève des marées électrifiées : le calme abyssal du serpent d'eau et la fureur des décharges s'unissent en une lame de fond grondante.", // N°535
    "oniragon": "Oniragon tisse des songes hypnotiques hérités de l'hippo dormeur tout en déployant les griffes du dragonnet : ses rêves peuvent vous engloutir.", // N°536
    "songedrak": "Songedrak, dragon des songes, endort d'un regard psychique et veille sur les rêveurs : l'hypnose de l'hippo et la force draconique n'en font qu'un.", // N°537
    "sporcrypte": "Sporcrypte hante les cryptes en répandant les spores nécrosantes du champignon, guidé par l'âme d'un chien d'ombre qui flaire les vivants.", // N°538
    "miasmort": "Miasmort exhale un miasme mortel où se mêlent le souffle spectral du chien des ombres et le venin fongique : rien ne survit à son passage brumeux.", // N°539
    "ombrelin": "Ombrelin se faufile telle une ombre élastique, alliant la nature insaisissable du farceur au flux psychique trouble de la nouille onduleuse.", // N°540
    "psychombre": "Psychombre frappe depuis l'ombre en un éclair mental : l'insaisissable farceur et l'esprit-nouille se sont noués en un prédateur psychique fulgurant.", // N°541
    "givrebre": "Givrèbre parcourt la toundra en soulevant terre et gel : la stabilité tellurique de la chèvre s'y noue au froid mordant du geyser glacé.", // N°542
    "cryolithe": "Cryolithe se dresse tel un menhir de glace éternelle : le socle terreux de la chèvre et le gel du geyser se sont pétrifiés en un rempart immuable.", // N°543
}

/** Anecdote d'une espèce (si fichée par L'Archiviste). */
export function funFactFor(speciesId: string): string | undefined {
    return FUN_FACTS[speciesId]
}
