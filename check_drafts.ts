import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const drafts = await (prisma as any).bet.findMany({
    where: { status: 'DRAFT' },
    select: { id: true, title: true, type: true, subType: true, closeAt: true, createdAt: true, options: true }
  });
  if (drafts.length === 0) {
    console.log('Aucun pari en brouillon (DRAFT).');
    return;
  }
  for (const b of drafts) {
    const options = typeof b.options === 'string' ? JSON.parse(b.options) : b.options;
    console.log(`\n📋 ${b.title}`);
    console.log(`   ID      : ${b.id}`);
    console.log(`   Type    : ${b.type} / ${b.subType}`);
    console.log(`   Clôture : ${b.closeAt ? new Date(b.closeAt).toLocaleString('fr-FR') : 'non définie'}`);
    console.log(`   Créé le : ${new Date(b.createdAt).toLocaleString('fr-FR')}`);
    console.log(`   Options : ${options.map((o: any) => o.label).join(' | ')}`);
  }
  console.log(`\nTotal : ${drafts.length} paris en brouillon.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
