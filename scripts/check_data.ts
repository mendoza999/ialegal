import { prisma } from '../server/db';

async function main() {
  try {
    const docs = await prisma.taxDocument.findMany({ take: 5 });
    console.log('Sample TaxDocuments:', docs);

    const categories = await prisma.taxDocument.groupBy({
      by: ['category', 'categoryLabel'],
      _count: { id: true }
    });
    console.log('TaxDocument categories:', categories);

    const sessions = await prisma.chatSession.findMany({ take: 5 });
    console.log('Sample ChatSessions:', sessions);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
