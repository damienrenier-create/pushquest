
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

const COLORS = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(msg, color = COLORS.reset) {
    console.log(`${color}${msg}${COLORS.reset}`);
}

function checkFile(filePath, patterns) {
    const fullPath = path.join(ROOT, filePath);
    if (!fs.existsSync(fullPath)) {
        log(`❌ Fichier manquant: ${filePath}`, COLORS.red);
        return false;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    let allOk = true;

    log(`\n🔍 Vérification de ${filePath}...`, COLORS.bold);

    for (const p of patterns) {
        if (p.regex.test(content)) {
            log(`  ✅ ${p.label}`, COLORS.green);
        } else {
            log(`  ❌ ${p.label}`, p.critical ? COLORS.red : COLORS.yellow);
            if (p.critical) allOk = false;
        }
    }
    return allOk;
}

function runAudit() {
    log('🚀 LANCEMENT DU FILET DE SÉCURITÉ LOGIQUE (Final Polish Edition)\n', COLORS.blue + COLORS.bold);

    let success = true;

    // 1. Logique XP
    const xpOk = checkFile('src/lib/xp.ts', [
        { regex: /Math\.floor\(k \/ 5\)/, label: "Calcul Gainage (1 XP / 5s)", critical: true },
        { regex: /u \* \(isMarvinDay \? 6 : 3\)/, label: "Multiplicateur Tractions (3 XP)", critical: true },
        { regex: /dayXP = 200[\s\S]*Jour parfait/, label: "Bonus Jour Parfait (+200 XP)", critical: true }
    ]);
    if (!xpOk) success = false;

    // 2. FAQ
    const faqOk = checkFile('src/app/faq/page.tsx', [
        { regex: /Quota du jour/, label: "Section Quota", critical: true },
        { regex: /Le Flex/, label: "Section Flex", critical: true },
        { regex: /5s Gainage[\s\S]*1 XP/, label: "Mention XP Gainage", critical: true }
    ]);
    if (!faqOk) success = false;

    // 3. UI Dashboard
    const uiDashboardOk = checkFile('src/components/dashboard/StatCards.tsx', [
        { regex: /Points/, label: "Unité Points", critical: true },
        { regex: /Bonus \+50% XP si badge/, label: "Hint Featured Badge", critical: true },
        { regex: /isVeteran[\s\S]*Couvert \(Buyout\)/, label: "Protection Buyout", critical: true }
    ]);
    if (!uiDashboardOk) success = false;

    // 4. UI Entry
    const uiEntryOk = checkFile('src/components/dashboard/WorkoutEntry.tsx', [
        { regex: /Traction = 3 Pts/, label: "Légende Tractions (Pts)", critical: true },
        { regex: /5s Gainage = 1 Pt/, label: "Légende Gainage (Pt)", critical: true }
    ]);
    if (!uiEntryOk) success = false;

    log('\n--- RESULTAT FINAL ---', COLORS.bold);
    if (success) {
        log('✅ COHÉRENCE GLOBALE VALIDÉE.', COLORS.green + COLORS.bold);
        process.exit(0);
    } else {
        log('❌ RÉGRESSION DÉTECTÉE.', COLORS.red + COLORS.bold);
        process.exit(1);
    }
}

try {
    runAudit();
} catch (err) {
    console.error(err);
    process.exit(1);
}
