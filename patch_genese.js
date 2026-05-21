const fs = require('fs');
const file = './src/data/chapters/ch1_caravane.json';
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

// g1_eveil
if (data.nodes["g1_eveil"]) {
    data.nodes["g1_eveil"].choices = [
        {
            "id": "c_g1_avance",
            "text": "Tu te lèves et tu avances vers la lumière.",
            "tag": "neutral",
            "mbti": {},
            "temperaments": {},
            "monsterComment": null,
            "nextNodeId": "g2_rencontre"
        },
        {
            "id": "c_g1_reste",
            "text": "Tu restes assis dans le noir en espérant que ça passe.",
            "tag": "neutral",
            "mbti": {},
            "temperaments": {},
            "monsterComment": "Tu peux rester assis aussi longtemps que tu veux, mais la lumière ne viendra pas à toi.",
            "nextNodeId": "g2_rencontre"
        }
    ];
}

// g2_rencontre
if (data.nodes["g2_rencontre"]) {
    data.nodes["g2_rencontre"].choices = [
        {
            "id": "c_g2_de_quoi",
            "text": "« De quoi parles-tu ? »",
            "tag": "neutral",
            "mbti": {},
            "temperaments": {},
            "monsterComment": null,
            "nextNodeId": "g3_briefing"
        },
        {
            "id": "c_g2_dieu",
            "text": "« Tu es... une divinité de la gastronomie ? »",
            "tag": "neutral",
            "mbti": {},
            "temperaments": {},
            "monsterComment": "Une divinité ? Moi ? Non. Je suis bien plus que ça. Mais passons.",
            "nextNodeId": "g3_briefing"
        }
    ];
}

// g3_briefing
if (data.nodes["g3_briefing"]) {
    data.nodes["g3_briefing"].choices = [
        {
            "id": "c_g3_refuser",
            "text": "« Et si je refuse ? »",
            "tag": "neutral",
            "mbti": {},
            "temperaments": {},
            "monsterComment": null,
            "nextNodeId": "g4_faux_choix"
        },
        {
            "id": "c_g3_pourquoi",
            "text": "« Pourquoi moi ? »",
            "tag": "neutral",
            "mbti": {},
            "temperaments": {},
            "monsterComment": null,
            "nextNodeId": "g4_faux_choix"
        }
    ];
}

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Faux choix Genèse ajoutés avec succès.');
