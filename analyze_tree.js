const fs = require('fs');

const file = './src/data/chapters/ch1_caravane.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const nodes = data.nodes;

const report = [];
const deadEnds = [];
const monsterInBody = [];
const nodeChains = [];

// Track incoming links to detect orphans (optional, but good for completeness)
const incomingLinks = {};
Object.keys(nodes).forEach(n => incomingLinks[n] = 0);

function traverse(nodeId, depth = 0, path = []) {
    const node = nodes[nodeId];
    const prefix = '  '.repeat(depth);
    
    if (!node) {
        report.push(`${prefix}❌ [MISSING NODE] ${nodeId}`);
        deadEnds.push(`Lien mort vers '${nodeId}' (depuis ${path[path.length - 1]})`);
        return;
    }

    // Check for "Monstre" in body
    if (node.body && (node.body.includes("Monstre apparaît") || node.body.includes("Monstre flotte") || node.body.includes("Monstre observe") || node.body.includes("Monstre sourit") || node.body.includes("Le Monstre "))) {
        monsterInBody.push(`Nœud '${nodeId}' contient du texte du Monstre codé en dur dans son \`body\`.`);
    }

    report.push(`${prefix}📦 ${nodeId} (${node.kind})`);
    
    if (!node.choices || node.choices.length === 0) {
        report.push(`${prefix}  ⚠️ [DEAD END] Aucun choix.`);
        deadEnds.push(`Cul-de-sac à '${nodeId}' (aucun choix).`);
        return;
    }

    // Detect chains of single choices (lenteur des clics)
    if (node.choices.length === 1 && node.kind === 'tampon') {
        nodeChains.push(nodeId);
    }

    node.choices.forEach(c => {
        let condStr = c.condition ? ` [Cond: ${c.condition.flag}=${c.condition.expected}]` : '';
        let target = c.nextNodeId;
        
        report.push(`${prefix}  👉 [${c.id}] "${c.text}"${condStr} -> ${target}`);
        
        if (target) {
            if (incomingLinks[target] !== undefined) incomingLinks[target]++;
            // Avoid infinite loops in traversal output
            if (!path.includes(target)) {
                // To keep the report readable, we won't fully recurse here, we'll just build a flat index of relationships 
                // or a structured tree for main scenes.
            }
        } else {
            report.push(`${prefix}    ❌ [MISSING TARGET]`);
            deadEnds.push(`Choix '${c.id}' dans '${nodeId}' n'a pas de nextNodeId.`);
        }
    });
}

// Build a clean tree starting from main scenes
const mainScenes = Object.keys(nodes).filter(k => nodes[k].kind === 'scene_porte' || k === data.entryNodeId);
mainScenes.forEach(sc => {
    report.push(`\n=== SCÈNE PRINCIPALE : ${sc} ===`);
    traverse(sc, 0, [sc]);
});

// Write to a temporary JSON file to read it from model
const analysis = {
    deadEnds,
    monsterInBody,
    singleChoiceTampons: nodeChains,
    tree: report
};

fs.writeFileSync('audit_results.json', JSON.stringify(analysis, null, 2));
console.log('Analysis complete. Results written to audit_results.json.');
