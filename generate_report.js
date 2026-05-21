const fs = require('fs');

const file = './src/data/chapters/ch1_caravane.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const nodes = data.nodes;

const reportLines = [];
reportLines.push("# Rapport Exhaustif de l'Arborescence du Gamebook\n");

function getMonsterInBody(body) {
    if (!body) return null;
    const match = body.match(/(?:Le Monstre|Le monstre)[^:«"”]*[:«"”]\s*([^\n]+)/);
    if (match) return match[0];
    return null;
}

function traverse(nodeId, depth = 0, path = []) {
    const node = nodes[nodeId];
    const indent = '  '.repeat(depth);
    
    if (!node) {
        reportLines.push(`${indent}❌ [ERREUR: CUL-DE-SAC] Le nœud '${nodeId}' n'existe pas !`);
        return;
    }

    const monsterBody = getMonsterInBody(node.body);
    let warnings = [];
    if (monsterBody) {
        warnings.push(`⚠️ MONSTRE DANS LE BODY : "${monsterBody}"`);
    }

    reportLines.push(`${indent}📦 NŒUD : ${nodeId} (${node.kind})`);
    if (warnings.length > 0) {
        warnings.forEach(w => reportLines.push(`${indent}  ${w}`));
    }

    if (!node.choices || node.choices.length === 0) {
        reportLines.push(`${indent}  ❌ [ERREUR: CUL-DE-SAC] Aucun choix pour sortir de ce nœud.`);
        return;
    }

    node.choices.forEach(c => {
        let cond = c.condition ? ` [Cond: ${c.condition.flag}=${c.condition.expected}]` : '';
        let comment = c.monsterComment ? `\n${indent}      👁️ Monstre (bandeau): "${c.monsterComment}"` : '';
        reportLines.push(`${indent}  👉 Choix : "${c.text}"${cond} -> ${c.nextNodeId}${comment}`);
        
        // Follow the tree if it's a tampon (internal node)
        // If it points to a scene_porte, we just print the reference and don't recurse (to keep scenes separate).
        if (nodes[c.nextNodeId]) {
            if (nodes[c.nextNodeId].kind !== 'scene_porte' && !path.includes(c.nextNodeId)) {
                traverse(c.nextNodeId, depth + 2, [...path, c.nextNodeId]);
            } else {
                reportLines.push(`${indent}      (Rejoint la scène : ${c.nextNodeId})`);
            }
        } else {
             reportLines.push(`${indent}      ❌ [ERREUR: CUL-DE-SAC] Le nœud cible '${c.nextNodeId}' n'existe pas !`);
        }
    });
}

const mainScenes = [
    data.entryNodeId,
    "s1_bagolio",
    "s2_planification",
    "s3_confidence",
    "s4_traces",
    "s5_pont_effondre",
    "s6_conflit",
    "s7_cuisinier",
    "s8_philosophie",
    "s8_course",
    "s9_veuve",
    "s10_foire_placeholder"
];

mainScenes.forEach(sc => {
    reportLines.push(`\n=========================================================`);
    reportLines.push(`🎬 SCÈNE PRINCIPALE : ${sc}`);
    reportLines.push(`=========================================================`);
    traverse(sc, 0, [sc]);
});

fs.writeFileSync('audit_exhaustif.md', reportLines.join('\n'));
console.log('Rapport exhaustif généré dans audit_exhaustif.md.');
