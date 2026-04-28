export type DailyCarouselSlide = {
    emoji: string;
    title: string;
    text: string;
    cta: string;
};

export type DailyCarousel = {
    id: string;
    day: number;
    theme: string;
    priority: "high" | "medium" | "low";
    area: string;
    href?: string;
    slides: DailyCarouselSlide[];
};

export const priorityDailyCarousels: DailyCarousel[] = [
    {
        id: "flambeau",
        day: 1,
        theme: "Le Flambeau",
        priority: "high",
        area: "Place publique",
        href: "/wall",
        slides: [
            {
                emoji: "🚩",
                title: "Le premier validé prend le Flambeau",
                text: "Le premier joueur qui valide son quota du jour devient le Porteur du Flambeau.",
                cta: "Va à la Place publique",
            },
            {
                emoji: "🔥",
                title: "Chaque Flambeau vaut +100 XP",
                text: "Dans le calcul XP, chaque jour où tu prends le Flambeau ajoute +100 XP.",
                cta: "Valide avant les autres",
            },
            {
                emoji: "🛡️",
                title: "Le Gardien garde la trace",
                text: "Le badge Gardien du Flambeau affiche le record de jours consécutifs avec le Flambeau.",
                cta: "Construis ta série",
            },
        ],
    },
    {
        id: "game-changers-xp",
        day: 2,
        theme: "Les game changers XP",
        priority: "high",
        area: "FAQ / Profil / Place publique",
        href: "/faq",
        slides: [
            {
                emoji: "⚡",
                title: "L’XP ne vient pas que des reps",
                text: "Pompes et squats valent 1 XP, tractions 3 XP, et 5 sec de gainage valent 1 XP.",
                cta: "Mixe tes efforts",
            },
            {
                emoji: "🎯",
                title: "Valider juste rapporte plus",
                text: "Un jour validé donne +100 XP, mais un jour parfait donne +200 XP.",
                cta: "Vise la cible exacte",
            },
            {
                emoji: "👑",
                title: "Les records changent tout",
                text: "Premier du jour : +250 XP. Premier du mois : +1000. Premier de l’année : +2500.",
                cta: "Prends un record",
            },
        ],
    },
    {
        id: "types-de-badges",
        day: 3,
        theme: "Les types de badges",
        priority: "high",
        area: "FAQ / Catalogue",
        href: "/faq?tab=catalogue",
        slides: [
            {
                emoji: "🎖️",
                title: "Tous les badges ne se ressemblent pas",
                text: "Le jeu distingue les trophées compétitifs, les milestones, les events et les légendaires.",
                cta: "Ouvre le catalogue",
            },
            {
                emoji: "🏆",
                title: "Les compétitifs se défendent",
                text: "Un badge COMPETITIVE appartient au meilleur joueur actuel… jusqu’au prochain vol.",
                cta: "Vise un détenteur",
            },
            {
                emoji: "🧱",
                title: "Les milestones restent à toi",
                text: "Les MILESTONE marquent ton parcours personnel : volume, régularité ou exploits cumulés.",
                cta: "Débloque tes paliers",
            },
        ],
    },
    {
        id: "guerre-des-trones",
        day: 4,
        theme: "Guerre des Trônes",
        priority: "high",
        area: "Panthéon",
        href: "/pantheon#thrones",
        slides: [
            {
                emoji: "👑",
                title: "Chaque trône a son roi",
                text: "La Guerre des Trônes montre qui détient les trophées compétitifs du royaume.",
                cta: "Ouvre le Panthéon",
            },
            {
                emoji: "⚔️",
                title: "Chaque roi a son poursuivant",
                text: "Tu vois le challenger le plus proche, sa valeur et l’écart exact à combler.",
                cta: "Cherche une faille",
            },
            {
                emoji: "🔥",
                title: "Les trônes chauds sont signalés",
                text: "Les badges peuvent apparaître en DANGER, DISTANCE ou À REPRENDRE.",
                cta: "Attaque le bon badge",
            },
        ],
    },
    {
        id: "cibles-prioritaires",
        day: 5,
        theme: "Cibles Prioritaires",
        priority: "high",
        area: "Panthéon",
        href: "/pantheon#targets",
        slides: [
            {
                emoji: "🎯",
                title: "Tes cibles sont calculées pour toi",
                text: "Le Panthéon peut afficher les trophées où tu es déjà le challenger le plus proche.",
                cta: "Va aux cibles",
            },
            {
                emoji: "🧭",
                title: "C’est ton raccourci stratégique",
                text: "Les Cibles Prioritaires montrent où ton prochain coup peut payer.",
                cta: "Choisis ton combat",
            },
            {
                emoji: "🏹",
                title: "Petit écart, grosse prise",
                text: "Certaines cibles se jouent à quelques reps, secondes ou séries seulement.",
                cta: "Termine le travail",
            },
        ],
    },
    {
        id: "vitrine-des-concurrents",
        day: 6,
        theme: "Vitrine des concurrents",
        priority: "high",
        area: "Panthéon",
        href: "/pantheon#vitrine",
        slides: [
            {
                emoji: "🕵️",
                title: "La vitrine sert à espionner",
                text: "Dans le Panthéon, chaque concurrent a une carte avec niveau, XP, titres et badges.",
                cta: "Clique un rival",
            },
            {
                emoji: "📊",
                title: "Chaque profil raconte une stratégie",
                text: "En ouvrant une fiche, tu peux lire ses efforts, graphiques, badges et progression.",
                cta: "Compare les joueurs",
            },
            {
                emoji: "🚑",
                title: "Même l’état de service compte",
                text: "Les profils peuvent aussi afficher amendes, blessures et certificats médicaux.",
                cta: "Inspecte la fiche",
            },
        ],
    },
    {
        id: "fins-de-mois",
        day: 7,
        theme: "Les fins de mois",
        priority: "high",
        area: "Dashboard / Panthéon / Défis",
        href: "/pantheon",
        slides: [
            {
                emoji: "📆",
                title: "La fin du mois change tout",
                text: "Certaines trophées mensuels se jouent sur le volume ou la plus grosse série du mois.",
                cta: "Vérifie tes records",
            },
            {
                emoji: "🎶",
                title: "Sally arrive le dernier jour",
                text: "Bring Sally Up apparaît seulement le dernier jour du mois sur le dashboard.",
                cta: "Garde des forces",
            },
            {
                emoji: "🏆",
                title: "Sally peut rapporter gros",
                text: "Participation : +250 XP. Première place du podium : +1000 XP.",
                cta: "Vise le podium",
            },
        ],
    },
    {
        id: "badge-a-lhonneur",
        day: 8,
        theme: "Badge à l’honneur",
        priority: "high",
        area: "Place publique",
        href: "/wall",
        slides: [
            {
                emoji: "💎",
                title: "Le badge à l’honneur est boosté",
                text: "Si tu décroches le badge affiché, son XP reçoit un bonus de +50%.",
                cta: "Va à la Place publique",
            },
            {
                emoji: "⏳",
                title: "Il tourne tous les 7 jours",
                text: "La carte affiche le temps restant avant rotation ou changement du badge.",
                cta: "Surveille le compteur",
            },
            {
                emoji: "🏹",
                title: "Les chasseurs sont récompensés",
                text: "Décrocher des badges à l’honneur fait monter les badges Chasseur jusqu’à 8000 XP.",
                cta: "Chasse le badge",
            },
        ],
    },
    {
        id: "defis-a-la-carte",
        day: 9,
        theme: "Défis à la carte",
        priority: "high",
        area: "Panthéon",
        href: "/pantheon",
        slides: [
            {
                emoji: "🏋️",
                title: "Les défis sont des raids chronométrés",
                text: "Les Défis à la carte se jouent au temps, avec XP bonus et Hall of Fame.",
                cta: "Ouvre les défis",
            },
            {
                emoji: "🏛️",
                title: "Les pyramides ont leur barème",
                text: "Khéops Pompes 750 XP, Squats 700, Tractions 900, Gainage 650, Full Body 1000.",
                cta: "Choisis ta pyramide",
            },
            {
                emoji: "⚠️",
                title: "Le défi ne suffit pas toujours",
                text: "Pour ton quota du jour, pense aussi à encoder tes efforts dans le dashboard.",
                cta: "Encode après le raid",
            },
        ],
    },
    {
        id: "profil-infirmerie",
        day: 10,
        theme: "Profil + infirmerie",
        priority: "high",
        area: "Profil",
        href: "/profile",
        slides: [
            {
                emoji: "👤",
                title: "Ton profil est ton dossier joueur",
                text: "Tu peux y gérer ton surnom, ton état et retrouver tes informations personnelles.",
                cta: "Ouvre ton profil",
            },
            {
                emoji: "🚑",
                title: "L’infirmerie suspend les amendes",
                text: "Une absence médicale déclarée peut couvrir une période et éviter les amendes.",
                cta: "Déclare si besoin",
            },
            {
                emoji: "🕊️",
                title: "Le buyout existe aussi",
                text: "Pour 50 €, le buyout stoppe les amendes futures. Les anciennes restent dues.",
                cta: "Lis ton état",
            },
        ],
    },
];

export const dailyCarousels = priorityDailyCarousels;
