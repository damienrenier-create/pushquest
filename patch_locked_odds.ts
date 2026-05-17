import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * PATCH lockedOdd pour les deux paris actifs
 *
 * Pari 1 — L'écart XP (cmosxevv20001kpdm25e1uzd4) :
 *   - Mools   → reduire → cote base 1.65 × Early Bird 1.5 = 2.47 (arrondi 2 dec)
 *   - Neuneu  → creuser → cote base 2.02 × Early Bird 1.5 = 3.03
 *
 * Pari 2 — Milkardashian (cmosxew100003kpdmxy1b5p6n) :
 *   - Mools 27.27 est aberrant sur option "non" (même option que Neuneu à 1.67)
 *   - Les deux ont misé dans les 24h → Early Bird ×1.5
 *   - Cote base bookmaker pour "non" à l'ouverture : ~1.67 / 1.5 = 1.11 base
 *   - On aligne Mools sur la même cote que Neuneu : 1.67 (cohérent Early Bird ×1.5 sur cote base ~1.11)
 */

const PATCHES = [
  // Pari 1 - Mools (userId cmml1r6um0000pto29d129npd) sur betId cmosxevv20001kpdm25e1uzd4
  {
    betId: 'cmosxevv20001kpdm25e1uzd4',
    userId: 'cmml1r6um0000pto29d129npd',
    newLockedOdd: 2.47,
    label: 'Pari1 / Mools / reduire',
    reason: 'Patch: lockedOdd was null. Reconstructed from base odds 1.65 × Early Bird 1.5 (placed 0.9h after open)'
  },
  // Pari 1 - Neuneu (userId cmml1wvc00006k6aaxjjfsfv0) sur betId cmosxevv20001kpdm25e1uzd4
  {
    betId: 'cmosxevv20001kpdm25e1uzd4',
    userId: 'cmml1wvc00006k6aaxjjfsfv0',
    newLockedOdd: 3.03,
    label: 'Pari1 / Neuneu / creuser',
    reason: 'Patch: lockedOdd was null. Reconstructed from base odds 2.02 × Early Bird 1.5 (placed 1.4h after open)'
  },
  // Pari 2 - Mools : correction 27.27 → 1.67 (alignement sur Neuneu, même option non)
  {
    betId: 'cmosxew100003kpdmxy1b5p6n',
    userId: 'cmml1r6um0000pto29d129npd',
    newLockedOdd: 1.67,
    label: 'Pari2 / Mools / non',
    reason: 'Patch: lockedOdd 27.27 was aberrant (same option "non" as Neuneu at 1.67). Corrected to 1.67 (base ~1.11 × Early Bird 1.5)'
  },
];

async function main() {
  console.log('🔍 Vérification pre-patch...\n');

  for (const p of PATCHES) {
    const entry = await (prisma as any).betEntry.findFirst({
      where: { betId: p.betId, userId: p.userId, withdrawn: false },
      include: { user: { select: { nickname: true } } }
    });

    if (!entry) {
      console.log(`❌ INTROUVABLE : ${p.label}`);
      continue;
    }

    console.log(`📌 ${p.label}`);
    console.log(`   lockedOdd actuel : ${entry.lockedOdd ?? 'NULL'} → nouveau : ${p.newLockedOdd}`);
    console.log(`   Gain garanti si victoire : ${Math.floor(entry.xpStaked * p.newLockedOdd)} XP (mise: ${entry.xpStaked} XP)`);
  }

  console.log('\n⚡ Application des patches...\n');

  for (const p of PATCHES) {
    const entry = await (prisma as any).betEntry.findFirst({
      where: { betId: p.betId, userId: p.userId, withdrawn: false }
    });

    if (!entry) {
      console.log(`❌ SKIP : ${p.label} (entrée introuvable)`);
      continue;
    }

    await (prisma as any).betEntry.update({
      where: { id: entry.id },
      data: { lockedOdd: p.newLockedOdd }
    });

    console.log(`✅ PATCHÉ : ${p.label} → lockedOdd = ${p.newLockedOdd}`);
  }

  console.log('\n🔍 Vérification post-patch...\n');

  for (const p of PATCHES) {
    const entry = await (prisma as any).betEntry.findFirst({
      where: { betId: p.betId, userId: p.userId, withdrawn: false },
      include: { user: { select: { nickname: true } } }
    });

    if (!entry) continue;
    const status = entry.lockedOdd === p.newLockedOdd ? '✅' : '❌';
    console.log(`${status} ${p.label} : lockedOdd = ${entry.lockedOdd}`);
  }

  console.log('\nDone.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
