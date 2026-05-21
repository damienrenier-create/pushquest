const fs = require('fs');
const file = './src/data/chapters/ch1_caravane.json';
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

// 1. Ajouter le Sceau de la Guilde manquant dans la Scène 6
if (data.nodes["t_s6_A1_climax"]) {
    data.nodes["t_s6_A1_climax"].flags = data.nodes["t_s6_A1_climax"].flags || {};
    data.nodes["t_s6_A1_climax"].flags["sceau_guilde"] = true;
}

// 2. Supprimer le placeholder S10 et le remplacer
delete data.nodes["s10_foire_placeholder"];

// Rediriger le funnel S9 vers la vraie s10_foire
if (data.nodes["t_s9_funnel"]) {
    data.nodes["t_s9_funnel"].choices[0].nextNodeId = "s10_foire";
}

const scene10 = {
    "s10_foire": {
      "kind": "scene_porte",
      "axis": "E/I",
      "body": "Les portes massives de Risoletto se referment derrière vous. La ville est en ébullition : c'est la Nuit des Masques. Des acrobates crachent du feu, les tavernes débordent de chants et de vin épicé. La caravane est garée en sécurité, la mission est terminée. Penne (s'il est encore là) soupire de soulagement. Il est temps de toucher votre prime et de célébrer... ou pas.",
      "choices": [
        {
          "id": "A1",
          "text": "Payer une tournée générale dans la taverne la plus bruyante.",
          "tag": "bold",
          "nextNodeId": "t_s10_A1",
          "monsterComment": "L'Extraverti absolu. Tu as soif de bruit et de reconnaissance.",
          "mbti": { "E": 2 },
          "temperaments": { "courage": 0.5, "compassion": 0.5 }
        },
        {
          "id": "A2",
          "text": "Partager un dernier repas calme avec la caravane, puis partir.",
          "tag": "neutral",
          "nextNodeId": "t_s10_A2",
          "monsterComment": "La sociabilité mesurée. C'est propre, c'est pro.",
          "mbti": { "E": 1 },
          "temperaments": {}
        },
        {
          "id": "B2",
          "text": "Prendre votre or et vous éclipser seul dans les ruelles sombres.",
          "tag": "safe",
          "nextNodeId": "t_s10_B2",
          "monsterComment": "L'Introverti. La foule t'épuise, la mission est faite.",
          "mbti": { "I": 2 },
          "temperaments": {}
        },
        {
          "id": "B1_sceau",
          "text": "[Sceau de Linguini] Utiliser le passe-droit pour enquêter sur la marchandise maudite.",
          "tag": "clever",
          "nextNodeId": "t_s10_B1_sceau",
          "monsterComment": "La soif de vérité l'emporte sur la fête. Inspecteur {nickname}.",
          "condition": { "flag": "sceau_guilde", "expected": true },
          "mbti": { "I": 1 },
          "temperaments": { "malice": 1 }
        },
        {
          "id": "B1_medaillon",
          "text": "[Médaillon de la Veuve] Offrir le talisman à Cannella pour apaiser ses peurs.",
          "tag": "safe",
          "nextNodeId": "t_s10_B1_medaillon",
          "monsterComment": "Un geste d'une pureté absolue pour clore ce voyage.",
          "condition": { "flag": "medaillon_veuve", "expected": true },
          "mbti": { "E": 1 },
          "temperaments": { "compassion": 2 }
        }
      ]
    },
    "t_s10_A1": {
      "kind": "tampon",
      "body": "Vous montez sur une table et hurlez votre joie. Les marchands vous acclament, l'alcool coule à flots. C'est une nuit de gloire éphémère qui résonnera longtemps dans les mémoires de Risoletto.",
      "choices": [ { "id": "c1", "text": "Sortir prendre l'air", "tag": "neutral", "nextNodeId": "s10_verdict" } ]
    },
    "t_s10_A2": {
      "kind": "tampon",
      "body": "Autour d'un ragoût chaud, vous échangez de discrets hochements de tête avec ceux qui ont survécu à la route. Une conclusion digne et sereine.",
      "choices": [ { "id": "c1", "text": "Aller vous coucher", "tag": "neutral", "nextNodeId": "s10_verdict" } ]
    },
    "t_s10_B2": {
      "kind": "tampon",
      "body": "Vous glissez dans l'ombre, laissant les cris de joie derrière vous. Le silence d'une ruelle isolée est votre seule récompense. Et elle vous suffit amplement.",
      "choices": [ { "id": "c1", "text": "S'asseoir dans l'ombre", "tag": "neutral", "nextNodeId": "s10_verdict" } ]
    },
    "t_s10_B1_sceau": {
      "kind": "tampon",
      "body": "Le sceau vous ouvre les portes de l'entrepôt douanier. Vous découvrez que les 'soieries' de Cannella cachaient des armes de contrebande. Brodo avait raison, le danger venait de l'intérieur. Vous gardez ce lourd secret pour vous.",
      "choices": [ { "id": "c1", "text": "Se retirer dans la nuit", "tag": "neutral", "nextNodeId": "s10_verdict" } ]
    },
    "t_s10_B1_medaillon": {
      "kind": "tampon",
      "body": "Cannella, tremblante, accepte le médaillon en bois. Son visage durci par la paranoïa se détend enfin. Elle vous remercie d'une voix brisée, libérée d'un fardeau invisible. Vous venez de sauver une âme.",
      "choices": [ { "id": "c1", "text": "Sourire et vous éloigner", "tag": "neutral", "nextNodeId": "s10_verdict" } ]
    },
    "s10_verdict": {
      "kind": "scene_porte",
      "body": "La nuit s'apaise. Vous vous retrouvez seul, face à vous-même, dans le calme d'une petite chambre louée pour la nuit. Une présence froide envahit la pièce. Le Monstre apparaît, sans sarcasme cette fois. Il vous observe intensément, évaluant tout ce que vous avez accompli depuis Bagolio.",
      "choices": [
        {
          "id": "v1_chaos",
          "text": "[Écouter le Verdict du Chaos]",
          "tag": "bold",
          "nextNodeId": "t_s10_end_chaos",
          "condition": { "flag": "grogno_dead", "expected": true },
          "monsterComment": "Tu as laissé des cadavres sur la route. Tu as brisé des vies pour avancer."
        },
        {
          "id": "v2_order",
          "text": "[Écouter le Verdict de l'Ordre]",
          "tag": "clever",
          "nextNodeId": "t_s10_end_order",
          "condition": { "flag": "linguini_left", "expected": false },
          "monsterComment": "La méthode et la procédure t'ont maintenu en vie, mais à quel prix émotionnel ?"
        },
        {
          "id": "v3_standard",
          "text": "[Écouter le Verdict du Survivant]",
          "tag": "safe",
          "nextNodeId": "t_s10_end_standard",
          "monsterComment": "Tu as survécu. C'est déjà plus que beaucoup d'autres."
        }
      ]
    },
    "t_s10_end_chaos": {
      "kind": "tampon",
      "body": "« La route t'a révélé, {nickname}. Tu es une tempête. Partout où tu passes, les structures s'effondrent. C'est fascinant et terrifiant. » Le Monstre s'incline respectueusement. « Repose-toi. Le Chapitre 2 sera bien plus... exigeant. »\n\n(FIN DU CHAPITRE 1)",
      "choices": [ { "id": "c1", "text": "Boucler la boucle (Reset)", "tag": "neutral", "nextNodeId": "g1_eveil", "action": "reset" } ]
    },
    "t_s10_end_order": {
      "kind": "tampon",
      "body": "« L'architecte... Tu penses que tout peut être calculé, pesé, prévu. Tu as gardé la cohésion par la force de ta rationalité. Mais l'imprévu te rattrapera. » Le Monstre sourit lentement. « Repose-toi. Le Chapitre 2 brisera tes certitudes. »\n\n(FIN DU CHAPITRE 1)",
      "choices": [ { "id": "c1", "text": "Boucler la boucle (Reset)", "tag": "neutral", "nextNodeId": "g1_eveil", "action": "reset" } ]
    },
    "t_s10_end_standard": {
      "kind": "tampon",
      "body": "« Tu as marché sur la ligne, essayant de faire de ton mieux. Ni un tyran, ni un poète. Juste un convoyeur essayant de survivre. C'est noble, à défaut d'être grandiose. » Le Monstre s'efface dans l'ombre. « Repose-toi. Le Chapitre 2 t'attend. »\n\n(FIN DU CHAPITRE 1)",
      "choices": [ { "id": "c1", "text": "Boucler la boucle (Reset)", "tag": "neutral", "nextNodeId": "g1_eveil", "action": "reset" } ]
    }
};

Object.assign(data.nodes, scene10);

// Assign IDs where missing
for (const [id, node] of Object.entries(data.nodes)) {
    if (!node.id) {
        node.id = id;
    }
}

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Scène 10 appliquée avec succès.');
