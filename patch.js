const fs = require('fs');
const file = './src/data/chapters/ch1_caravane.json';
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

// 1. Axes MBTI
if (data.nodes['s2_planification']) data.nodes['s2_planification'].axis = 'J/P';
if (data.nodes['s3_confidence']) data.nodes['s3_confidence'].axis = 'T/F';
if (data.nodes['s4_traces']) data.nodes['s4_traces'].axis = 'S/N';

// 2. Tempéraments
if (data.nodes['s2_planification']) {
    data.nodes['s2_planification'].choices.find(c => c.id === 'A1').temperaments = { malice: 0.5 };
    data.nodes['s2_planification'].choices.find(c => c.id === 'B2').temperaments = { courage: 0.5 };
    data.nodes['s2_planification'].choices.find(c => c.id === 'B1').temperaments = { courage: -0.5 };
}

if (data.nodes['s3_confidence']) {
    data.nodes['s3_confidence'].choices.find(c => c.id === 'B1').temperaments = { compassion: 1, malice: -0.5 };
    data.nodes['s3_confidence'].choices.find(c => c.id === 'A1').temperaments = { compassion: -1 };
    data.nodes['s3_confidence'].choices.find(c => c.id === 'B2').temperaments = { compassion: 0.5 };
}

if (data.nodes['s4_traces']) {
    data.nodes['s4_traces'].choices.find(c => c.id === 'B1').temperaments = { courage: -0.5 };
    data.nodes['s4_traces'].choices.find(c => c.id === 'B2').temperaments = { courage: 1, compassion: 0.5 };
}

// 3. Tags d'humeur
if (data.nodes['t_s3_A1_inter1']) data.nodes['t_s3_A1_inter1'].choices.forEach(c => c.tag = 'wrong');
if (data.nodes['t_s4_A1_inter1']) data.nodes['t_s4_A1_inter1'].choices.forEach(c => c.tag = 'wrong');
if (data.nodes['t_s4_B1_inter1']) data.nodes['t_s4_B1_inter1'].choices.forEach(c => c.tag = 'wrong');
if (data.nodes['t_s4_A2_inter2']) data.nodes['t_s4_A2_inter2'].choices[0].tag = 'wrong';

// 4. Variables contextuelles
if (data.nodes['s2_planification']) {
    data.nodes['s2_planification'].body = data.nodes['s2_planification'].body.replace("sur la cour de l'auberge.", "sur la cour de l'auberge, il est environ {currentHour}h.");
}
if (data.nodes['t_s4_B2']) {
    data.nodes['t_s4_B2'].choices[1].monsterComment = "Tu t'enfonces dans les ténèbres, {nickname}. Très bien.";
}

// 5. Nettoyage des clés ID dupliquées
for (const key in data.nodes) {
    if (data.nodes[key].id === key) {
        delete data.nodes[key].id;
    }
}

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Done');
