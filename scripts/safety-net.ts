
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

const COLORS = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(msg: string, color = COLORS.reset) {
    console.log(`${color}${msg}${COLORS.reset}`);
}

function checkFile(filePath: string, patterns: { regex: RegExp; label: string; critical?: boolean }[]) {
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

async function runAudit() {
    log('🚀 LANCEMENT DU FILET DE SÉCURITÉ LOGIQUE\n', COLORS.blue + COLORS.bold);

    let success = true;

    // 1. Logique XP
    const xpOk = checkFile('src/lib/xp.ts', [
        { regex: /Math\.floor\(k \/ 5\)/, label: "Calcul Gainage (1 XP / 5s)", critical: true },
        { regex: /u \* \(isMarvinDay \? 6 : 3\)/, label: "Multiplicateur Tractions (3 XP)", critical: true },
        { regex: /dayXP = 200.*Jour parfait/, label: "Bonus Jour Parfait (+200 XP)", critical: true },
        { regex: /dayXP = 100.*Jour validé/, label: "Bonus Jour Validé (+100 XP)", critical: true },
        { regex: /featuredBadgeKey === b\.badgeKey.*0\.5/, label: "Bonus Badge à l'honneur (+50%)", critical: true }
    ]);
    if (!xpOk) success = false;

    // 2. FAQ Factuelle
    const faqOk = checkFile('src/app/faq/page.tsx', [
        { regex: /"Quota du jour"/, label: "Section Quota", critical: true },
        { regex: /"Le Flex"/, label: "Section Flex", critical: true },
        { regex: /"traction = 3 XP"/, label: "Mention XP Tractions", critical: true },
        { regex: /"gainage = 1 XP \/ 5 sec"/, label: "Mention XP Gainage", critical: true }
    ]);
    if (!faqOk) success = false;

    // 3. UI Aide Contextuelle (Dashboard)
    const uiDashboardOk = checkFile('src/components/dashboard/StatCards.tsx', [
        { regex: /Pile poil = \+200 XP/, label: "Hint Quota (+200 XP)", critical: true },
        { regex: /Bonus \+50% XP sur le badge gagné/, label: "Hint Featured Badge", critical: true },
        { regex: /1er à valider = \+100 XP/, label: "Hint Flambeau", critical: true },
        { regex: /isVeteran.*Couvert \(Buyout\)/, label: "Protection Buyout", critical: true },
        { regex: /isInjured.*Protégé \(Certificat\)/, label: "Protection Médicale", critical: true }
    ]);
    if (!uiDashboardOk) success = false;

    // 4. UI Aide Saisie
    const uiEntryOk = checkFile('src/components/dashboard/WorkoutEntry.tsx', [
        { regex: /1 traction = 3 XP/, label: "Légende Tractions", critical: true },
        { regex: /5 sec = 1 XP/, label: "Légende Gainage", critical: true }
    ]);
    if (!uiEntryOk) success = false;

    // 5. Actionnabilité Compétitive
    const uiCompetitiveOk = checkFile('src/components/dashboard/TrophySection.tsx', [
        { regex: /\+ \$\{d\.diff\} \$\{d\.unit\} pour voler/, label: "Wording Actionnable (Trophy)", critical: true },
        { regex: /⚠️ Imminent/, label: "Badge Urgence Imminent", critical: true }
    ]);
    if (!uiCompetitiveOk) success = false;

    // 6. Sécurité API (Basique)
    log('\n🛡️ Audit Sécurité API...', COLORS.bold);
    const apiFiles = fs.readdirSync(path.join(ROOT, 'src/app/api'), { recursive: true })
        .filter(f => typeof f === 'string' && (f.endsWith('route.ts') || f.endsWith('route.js')));
    
    let apiSuccess = true;
    for (const file of apiFiles) {
        const content = fs.readFileSync(path.join(ROOT, 'src/app/api', file as string), 'utf8');
        if (content.includes('export async function POST') || content.includes('export async function GET')) {
            if (!content.includes('getServerSession') && !file.toString().includes('auth')) {
                log(`  ⚠️  Protection manquante dans src/app/api/${file}? (Pas de getServerSession)`, COLORS.yellow);
                // Non critique pour le script mais à signaler
            }
        }
    }

    log('\n--- RESULTAT FINAL ---', COLORS.bold);
    if (success) {
        log('✅ TOUTES LES RÈGLES CRITIQUES SONT BIEN EN PLACE.', COLORS.green + COLORS.bold);
        process.exit(0);
    } else {
        log('❌ RÉGRESSION DÉTECTÉE DANS LA LOGIQUE OU L\'UI.', COLORS.red + COLORS.bold);
        process.exit(1);
    }
}

runAudit().catch(err => {
    console.error(err);
    process.exit(1);
});
