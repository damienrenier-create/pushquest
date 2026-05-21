const fs = require('fs');
const file = './src/data/chapters/ch1_caravane.json';
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

const nuitText = "Le reste de la journée s'écoule dans un silence pesant, rythmé par le grincement des essieux. La caravane établit son premier campement sous un ciel sans lune. Au petit matin du deuxième jour, l'air est vif et le convoi se remet en marche.";

// 1. Fusionner la nuit dans A2 et B2 et router vers s4_traces
if (data.nodes["t_s3_A2"]) {
    data.nodes["t_s3_A2"].body = "Penne semble soulagé par cette solution concrète. Il retourne vers sa charrette avec une étincelle d'espoir.\n\n" + nuitText;
    data.nodes["t_s3_A2"].choices[0].nextNodeId = "s4_traces";
}

if (data.nodes["t_s3_B2"]) {
    data.nodes["t_s3_B2"].body = "Penne pleure un instant sur votre épaule. Le problème financier reste entier, mais il se sent moins seul.\n\n" + nuitText;
    data.nodes["t_s3_B2"].choices[0].nextNodeId = "s4_traces";
}

// 2. Restaurer le Monstre et router A1 et B1 vers s4_traces via le texte de nuit
if (data.nodes["t_s3_A1"]) {
    data.nodes["t_s3_A1"].body = "Penne vous regarde, sidéré par la froideur de votre logique mathématique. Il s'éloigne sans un mot, les poings serrés.\n\nAlors que Penne s'éloigne, le temps se fige. Le Monstre apparaît, un boulier imaginaire dans les mains.\n« Puisqu'on gère les émotions sur un tableur, qu'est-ce qu'on optimise d'autre aujourd'hui ? »";
    data.nodes["t_s3_A1"].choices.forEach(c => {
        c.nextNodeId = "t_s3_A1_nuit";
        c.monsterComment = ""; // Nettoyer l'ancien flag
    });
}

if (data.nodes["t_s3_B1"]) {
    data.nodes["t_s3_B1"].body = "Penne vous serre les mains, les larmes aux yeux. « Merci, convoyeur ! Je vous en devrai une toute ma vie ! »\n\nPenne repart en courant. Le temps se fige. Le Monstre flotte au-dessus de vous, l'air consterné.\n« C'est ça. Promets de sauver tout le monde. Tu veux que je te rajoute une auréole tout de suite ? Qui d'autre vas-tu sauver aujourd'hui ? »";
    data.nodes["t_s3_B1"].choices.forEach(c => {
        c.nextNodeId = "t_s3_B1_nuit";
        c.monsterComment = ""; // Nettoyer l'ancien flag
    });
}

// 3. Créer des tampons de nuit spécifiques pour A1 et B1 pour recevoir la réponse
data.nodes["t_s3_A1_nuit"] = {
    "kind": "tampon",
    "body": "Le Monstre lève les yeux au ciel et claque des doigts. Le temps reprend son cours.\n\n" + nuitText,
    "choices": [ { "id": "c1", "text": "Reprendre la route", "tag": "neutral", "nextNodeId": "s4_traces" } ],
    "id": "t_s3_A1_nuit"
};

data.nodes["t_s3_B1_nuit"] = {
    "kind": "tampon",
    "body": "Le Monstre lève les yeux au ciel et claque des doigts. Le temps reprend son cours.\n\n" + nuitText,
    "choices": [ { "id": "c1", "text": "Reprendre la route", "tag": "neutral", "nextNodeId": "s4_traces" } ],
    "id": "t_s3_B1_nuit"
};

// On peut supprimer le vieux t_s3_nuit1
delete data.nodes["t_s3_nuit1"];

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Correction Scène 3 appliquée.');
