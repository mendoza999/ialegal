import { prisma } from '../server/db';

async function main() {
  console.log('[Migration] Starting ramas migration...');

  try {
    // 1. Add column to chat_sessions if not exists
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "chat_sessions" 
      ADD COLUMN IF NOT EXISTS "ramaId" TEXT;
    `);
    console.log('[Migration] Column ramaId checked/added to chat_sessions');

    // 2. Add column to tax_documents if not exists
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "tax_documents" 
      ADD COLUMN IF NOT EXISTS "ramaId" TEXT;
    `);
    console.log('[Migration] Column ramaId checked/added to tax_documents');

    // 3. Assign default rama (Derecho Tributario) to existing sessions without ramaId
    const tributarioId = 'f5fa96ce-2733-44df-914a-c298aab14215';
    const updatedSessions = await prisma.$executeRawUnsafe(`
      UPDATE "chat_sessions" 
      SET "ramaId" = '${tributarioId}' 
      WHERE "ramaId" IS NULL;
    `);
    console.log(`[Migration] Updated ${updatedSessions} chat_sessions to Derecho Tributario`);

    // 4. Assign default rama to existing tax_documents without ramaId
    const updatedDocs = await prisma.$executeRawUnsafe(`
      UPDATE "tax_documents" 
      SET "ramaId" = '${tributarioId}' 
      WHERE "ramaId" IS NULL;
    `);
    console.log(`[Migration] Updated ${updatedDocs} tax_documents to Derecho Tributario`);

    // 5. Query and display current ramas
    const ramas: any = await prisma.$queryRawUnsafe(`
      SELECT * FROM "ramasDelDerecho" ORDER BY "nombre" ASC;
    `);
    console.log('[Migration] Available Ramas del Derecho in DB:', ramas);

    console.log('[Migration] Successfully completed!');
  } catch (err) {
    console.error('[Migration] Error executing migration:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
