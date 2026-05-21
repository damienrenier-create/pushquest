const fs = require('fs');
const file = './src/data/chapters/ch1_caravane.json';
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

const scene3Nodes = [
    "s3_confidence",
    "t_s3_A1",
    "t_s3_A2",
    "t_s3_B2",
    "t_s3_B1",
    "t_s3_nuit1"
];

let result = {};
scene3Nodes.forEach(id => {
    if (data.nodes[id]) result[id] = data.nodes[id];
});

fs.writeFileSync('scene3_extract.json', JSON.stringify(result, null, 2));
